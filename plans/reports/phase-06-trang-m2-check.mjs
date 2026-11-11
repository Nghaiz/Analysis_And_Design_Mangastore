// Kiểm lane 6C (phase 6): kịch bản ch.2 2.2 + từng dòng bảng M2 của phase-06-integration.md §6.1, HTTP thuần qua
// scripts/smoke/lib/{http,e2e-db}.mjs. Cần stack E2E riêng của lane và hai trang TẠM không commit:
// src/main/webapp/dev/lane6c-login.jsp (tạo minhanh, ghi client vào session) và ClientHomeView.jsp (trang thật của 6B).
// Chạy từ gốc worktree:
//   SMOKE_COMPOSE_PROJECT=tiemtruyen-6c LANE6C_BASE_URL=http://127.0.0.1:8083 node plans/reports/phase-06-trang-m2-check.mjs
// In PASS/FAIL từng dòng; exit 0 khi mọi dòng PASS, 1 khi có FAIL.
const WT = new URL('../../scripts/smoke/lib/', import.meta.url).href;
const { Session, messagesOf, valueOf, textOf, tableRows, buttonValues, hasId, clean } = await import(WT + 'http.mjs');
const db = await import(WT + 'e2e-db.mjs');
const BASE = process.env.LANE6C_BASE_URL ?? 'http://127.0.0.1:8083';

const M = {
  BOOK_NOT_FOUND: 'Không tìm thấy thông tin phù hợp.',
  Q5: 'Số lượng vượt quá số quyển hiện có (hiện còn 5 quyển).',
  Q4: 'Số lượng vượt quá số quyển hiện có (hiện còn 4 quyển).',
  Q0: 'Số lượng vượt quá số quyển hiện có (hiện còn 0 quyển).',
  DAYS: 'Số ngày thuê phải lớn hơn hoặc bằng 1.',
  PICKUP: 'Ngày giờ đến nhận phải sau thời điểm hiện tại.',
  NOT_ENOUGH: 'Không còn đủ quyển truyện, vui lòng chọn lại.',
  CREATED: 'Tạo phiếu mượn thành công! Vui lòng đến quầy vào ngày giờ đã hẹn để đặt cọc và nhận truyện.',
  CONFIRM: 'Bạn có chắc chắn muốn huỷ phiếu mượn này?',
  CANCEL_OK: 'Huỷ phiếu mượn thành công!',
  CANCELLED: 'Phiếu mượn đã bị huỷ, không thể xử lí.',
  PROCESSED: 'Phiếu mượn này đã được xử lí và đã giao truyện.',
  QTY_INVALID: 'Số lượng phải là số nguyên lớn hơn hoặc bằng 1.',
  NOT_CHOSEN: 'Vui lòng chọn đầu truyện.',
  TOO_LONG: 'Nội dung nhập quá dài, vui lòng rút gọn.',
  REASON_REQUIRED: 'Vui lòng nhập lí do huỷ.',
  DAYS_TOO_LONG: 'Số ngày thuê tối đa là 30 ngày.',
};

let pass = 0;
let fail = 0;
const results = [];
function check(label, ok, detail = '') {
  if (ok) pass++; else fail++;
  const line = `${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ` → ${detail}`}`;
  results.push(line);
  console.log(line);
}
const msgs = (p) => messagesOf(p.html);
const hasMsg = (p, m) => msgs(p).includes(m);
const tagOf = (html, id) => (html.match(new RegExp(`<[a-z]+\\b[^>]*\\sid="${id}"[^>]*>`, 'i')) ?? [''])[0];
const invalid = (html, id) => /aria-invalid="true"/.test(tagOf(html, id));
const col = (rows, i) => rows.map((r) => r[i]);
const no500 = (p) => p.status < 500;
const q = (s) => db.sql(s);
const billCount = () => Number(q('SELECT COUNT(*) FROM tblRentalBill;'));
const cartLines = (user) => Number(q(`SELECT COUNT(*) FROM tblSelectedBook sb JOIN tblCart c ON c.id = sb.cartId JOIN tblUser u ON u.id = c.clientId WHERE u.username='${user}';`));

const isoLocal = db.isoLocal;
const today = db.vnToday();
const pickup = db.addDays(today, 2);

async function login(user, pass_) {
  const s = new Session(BASE);
  const p = await s.get(`/dev/lane6c-login.jsp?u=${user}&p=${encodeURIComponent(pass_)}`);
  if (!p.html.includes('login=ok')) throw new Error(`đăng nhập ${user} hỏng: ${p.html.slice(0, 200)}`);
  return s;
}

// ---------- chuẩn bị ----------
db.resetChapter2();
q("DELETE FROM tblRentalBill WHERE id >= 200;");
let s = await login('minhanh', 'Anh@2003');
db.seedChapter22Bills('minhanh');

// ---------- ch.2 2.2 ----------
let page = await s.get('/SearchBookView.jsp');
check('2.2 b4 ô tìm, nút Tìm, nút Tạo phiếu', ['txtKeyword', 'btnSearch', 'btnCreateRentalBill', 'tblBook', 'tblSelectedBook'].every((id) => hasId(page.html, id)));
check('2.2 b4 giỏ rỗng', buttonValues(page.html, 'lnkDeleteSelectedBook').length === 0);
check('2.2 b4 props SelectedStack rỗng', textOf(page.html, 'selected-stack-props') === '{"rows":[],"focusBookId":null}', textOf(page.html, 'selected-stack-props'));
page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Thần đồng đất Việt', btnSearch: '' }, { page });
check('2.2 ng.lệ 5 BOOK_NOT_FOUND, bảng rỗng', hasMsg(page, M.BOOK_NOT_FOUND) && buttonValues(page.html, 'lnkChooseBook').length === 0, msgs(page));
page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Doraemon', btnSearch: '' }, { page });
let rows = tableRows(page.html, 'tblBook');
check('2.2 b6 Doraemon: DT001 5, DT002 4, DT015 2', JSON.stringify(rows.map((r) => [r[0], r[5]])) === '[["DT001","5"],["DT002","4"],["DT015","2"]]', JSON.stringify(rows));
check('2.2 b6 dòng DT001 đủ cột', JSON.stringify(rows[0]) === JSON.stringify(['DT001', 'Doraemon - Tập 1', 'Fujiko F. Fujio', 'Thiếu nhi', '3.000đ', '5']), JSON.stringify(rows[0]));
page = await s.post('/SearchBookView.jsp', { lnkChooseBook: '1' }, { page });
check('2.2 b8 Chi tiết đầu truyện', page.url.endsWith('/BookDetailView.jsp') && ['Chi tiết đầu truyện', 'DT001', 'Doraemon - Tập 1', 'Kim Đồng', '2023', 'Thiếu nhi', '3.000đ', 'Chú mèo máy Doraemon'].every((t) => clean(page.html).includes(t)) && textOf(page.html, 'availableCopies') === '5', page.url);
let detail = page;
page = await s.post('/doAddSelectedBook.jsp', { txtQuantity: '6', btnAddToSelectedList: '' }, { page });
check('§9.2 số lượng 6 > 5 → QUANTITY_EXCEEDED (hiện còn 5 quyển), aria-invalid, giữ 6', hasMsg(page, M.Q5) && invalid(page.html, 'txtQuantity') && valueOf(page.html, 'txtQuantity') === '6', msgs(page));
page = await s.post('/doAddSelectedBook.jsp', { txtQuantity: '1', btnAddToSelectedList: '' }, { page });
rows = tableRows(page.html, 'tblSelectedBook');
check('2.2 b10 khung: Doraemon - Tập 1, 1 (302 về SearchBookView)', page.url.endsWith('/SearchBookView.jsp') && JSON.stringify(rows) === '[["","Doraemon - Tập 1","1","Xoá"]]', `${page.url} ${JSON.stringify(rows)}`);
check('2.2 b10 props focusBookId=1', textOf(page.html, 'selected-stack-props') === '{"rows":[{"bookId":1,"bookCode":"DT001","name":"Doraemon - Tập 1","author":"Fujiko F. Fujio","quantity":1,"checked":false}],"focusBookId":1}', textOf(page.html, 'selected-stack-props'));
page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Conan', btnSearch: '' }, { page });
rows = tableRows(page.html, 'tblBook');
check('2.2 b12 Conan: DT020 3, DT021 2', JSON.stringify(rows.map((r) => [r[0], r[5]])) === '[["DT020","3"],["DT021","2"]]', JSON.stringify(rows));
page = await s.post('/SearchBookView.jsp', { lnkChooseBook: '20' }, { page });
check('2.2 b14 chi tiết DT020: Gosho Aoyama, 3 quyển', clean(page.html).includes('Gosho Aoyama') && textOf(page.html, 'availableCopies') === '3');
page = await s.post('/doAddSelectedBook.jsp', { txtQuantity: '1', btnAddToSelectedList: '' }, { page });
rows = tableRows(page.html, 'tblSelectedBook');
check('2.2 b16 khung hai dòng', JSON.stringify(col(rows, 1)) === '["Doraemon - Tập 1","Thám tử lừng danh Conan - Tập 1"]' && JSON.stringify(col(rows, 2)) === '["1","1"]', JSON.stringify(rows));
let form = new URLSearchParams({ btnCreateRentalBill: '' });
form.append('chkSelectedBook', '1');
form.append('chkSelectedBook', '20');
page = await s.postParams('/SearchBookView.jsp', form, { page });
rows = tableRows(page.html, 'tblRentedBook');
check('2.2 b18 Xác nhận phiếu mượn: khách, 2 dòng, 2 quyển, 0đ, tổng "…"',
  page.url.endsWith('/ConfirmRentalBillView.jsp') && ['PHIẾU MƯỢN', 'Trần Minh Anh', '0912345678', '001203012345', 'minhanh.tran@gmail.com'].every((t) => clean(page.html).includes(t))
  && JSON.stringify(rows) === JSON.stringify([['Doraemon - Tập 1', 'Fujiko F. Fujio', '3.000đ', '1', '…'], ['Thám tử lừng danh Conan - Tập 1', 'Gosho Aoyama', '3.000đ', '1', '…']])
  && textOf(page.html, 'totalCopies') === '2' && textOf(page.html, 'discount') === '0đ' && textOf(page.html, 'totalRentalPrice') === '…', `${page.url} ${JSON.stringify(rows)}`);
check('C3 ô số ngày có data-submit-on-change, nút Tính lại trong noscript', /data-submit-on-change/.test(tagOf(page.html, 'txtExpectedDays')) && /<noscript>[\s\S]*id="btnRecalculate"[\s\S]*<\/noscript>/.test(page.html));
const confirmFields = { txtExpectedDays: '7', txtExpectedPickupAt: isoLocal(pickup, '09:00'), txtNote: '' };
page = await s.post('/ConfirmRentalBillView.jsp', { ...confirmFields, btnRecalculate: '' }, { page });
rows = tableRows(page.html, 'tblRentedBook');
check('2.2 b20 7 ngày → 21.000đ mỗi dòng, 42.000đ, giữ ô', JSON.stringify(col(rows, 4)) === '["21.000đ","21.000đ"]' && textOf(page.html, 'totalRentalPrice') === '42.000đ' && valueOf(page.html, 'txtExpectedDays') === '7' && valueOf(page.html, 'txtExpectedPickupAt') === confirmFields.txtExpectedPickupAt, JSON.stringify(rows));
const confirmPage = page;

// ---- ngoại lệ trước khi xác nhận (bảng M2) ----
for (const [bad, want] of [['', M.DAYS], ['abc', M.DAYS], ['1.5', M.DAYS], ['0', M.DAYS], ['-3', M.DAYS], ['31', M.DAYS_TOO_LONG], ['99999999999', M.DAYS_TOO_LONG]]) {
  const p = await s.post('/doAddRentalBill.jsp', { ...confirmFields, txtExpectedDays: bad, btnConfirm: '' }, { page: confirmPage });
  check(`M2 txtExpectedDays "${bad}" → ${want === M.DAYS ? 'EXPECTED_DAYS_INVALID' : 'EXPECTED_DAYS_TOO_LONG'}, aria-invalid, giữ ô`, hasMsg(p, want) && invalid(p.html, 'txtExpectedDays') && valueOf(p.html, 'txtExpectedDays') === bad && valueOf(p.html, 'txtExpectedPickupAt') === confirmFields.txtExpectedPickupAt, `${p.status} ${msgs(p)}`);
}
const nowLocal = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(' ', 'T');
for (const bad of ['', 'xyz', '2026-02-31T09:00', isoLocal(db.addDays(today, -1), '09:00'), nowLocal]) {
  const p = await s.post('/doAddRentalBill.jsp', { ...confirmFields, txtExpectedPickupAt: bad, btnConfirm: '' }, { page: confirmPage });
  check(`M2 txtExpectedPickupAt "${bad}" → PICKUP_TIME_INVALID, aria-invalid`, hasMsg(p, M.PICKUP) && invalid(p.html, 'txtExpectedPickupAt'), `${p.status} ${msgs(p)}`);
}
const long256 = 'ă'.repeat(256);
let p = await s.post('/doAddRentalBill.jsp', { ...confirmFields, txtNote: long256, btnConfirm: '' }, { page: confirmPage });
check('M2 txtNote 256 kí tự → INPUT_TOO_LONG, aria-invalid, giữ chữ, không tạo phiếu', hasMsg(p, M.TOO_LONG) && invalid(p.html, 'txtNote') && valueOf(p.html, 'txtNote') === long256 && billCount() === 2, `${msgs(p)} ${billCount()}`);
p = await s.post('/ConfirmRentalBillView.jsp', { ...confirmFields, txtExpectedDays: '31', btnRecalculate: '' }, { page: confirmPage });
check('C15 tính lại với 31 ngày → EXPECTED_DAYS_TOO_LONG, tổng "…"', hasMsg(p, M.DAYS_TOO_LONG) && invalid(p.html, 'txtExpectedDays') && textOf(p.html, 'totalRentalPrice') === '…', msgs(p));
p = await s.post('/ConfirmRentalBillView.jsp', { ...confirmFields, txtExpectedDays: '30', btnRecalculate: '' }, { page: confirmPage });
check('C15 30 ngày hợp lệ → 180.000đ', msgs(p).length === 0 && textOf(p.html, 'totalRentalPrice') === '180.000đ', textOf(p.html, 'totalRentalPrice'));
p = await s.post('/ConfirmRentalBillView.jsp', { ...confirmFields, txtNote: '<b>x</b>"\'', btnRecalculate: '' }, { page: confirmPage });
check('§6.1 Chung: txtNote điền lại được escape', !p.html.includes('<b>x</b>') && valueOf(p.html, 'txtNote') === '<b>x</b>"\'');

// ---- xác nhận ----
page = await s.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page: confirmPage });
check('2.2 b22 RENTAL_BILL_CREATED → ClientHomeView', hasMsg(page, M.CREATED) && hasId(page.html, 'lnkViewRentalBill'), msgs(page));
const bill125 = db.billState(125);
check('2.2 b22 DB PM0125 Chờ nhận giữ DT001-03, DT020-02', JSON.stringify(bill125) === '{"status":"Chờ nhận","cancelReason":"","barcodes":["DT001-03","DT020-02"]}', JSON.stringify(bill125));
check('2.2 b22 giỏ DB không còn dòng tự do (2 dòng thuộc PM0125)', cartLines('minhanh') === 2);
p = await s.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page: confirmPage, follow: false });
check('M2 F5/bấm lần hai doAddRentalBill → 302 ClientHomeView, không phiếu thứ hai', p.status === 302 && /\/ClientHomeView\.jsp$/.test(p.location) && billCount() === 3, `${p.status} ${p.location} ${billCount()}`);

page = await s.get('/RentalBillListView.jsp');
rows = tableRows(page.html, 'tblRentalBill');
check('2.2 b24.1 thứ tự PM0125, PM0117, PM0110', JSON.stringify(col(rows, 0)) === '["PM0125","PM0117","PM0110"]', JSON.stringify(rows));
check('2.2 b24.1 PM0125: hẹn, 2, 42.000đ, Chờ nhận', JSON.stringify(rows[0].slice(2, 6)) === JSON.stringify([db.viDateTime(pickup, '09:00'), '2', '42.000đ', 'Chờ nhận']) && rows[0][1].endsWith(db.viDate(today)), JSON.stringify(rows[0]));
check('2.2 b24.1 PM0117: 1, 21.000đ, Chờ nhận', JSON.stringify(rows[1].slice(1, 6)) === JSON.stringify([db.viDateTime(db.addDays(today, -1), '10:30'), db.viDateTime(db.addDays(today, 1), '18:00'), '1', '21.000đ', 'Chờ nhận']), JSON.stringify(rows[1]));
check('2.2 b24.1 PM0110: 2, 60.000đ, Đang cho thuê', JSON.stringify(rows[2].slice(1, 6)) === JSON.stringify([db.viDateTime(db.addDays(today, -9), '19:00'), db.viDateTime(db.addDays(today, -8), '10:00'), '2', '60.000đ', 'Đang cho thuê']), JSON.stringify(rows[2]));
check('2.2 b24.1 nút Huỷ phiếu chỉ ở Chờ nhận', JSON.stringify(buttonValues(page.html, 'lnkCancelRentalBill')) === '["125","117"]');
check('2.2 b24.1 nút Xem chi tiết', JSON.stringify(buttonValues(page.html, 'lnkViewDetail')) === '["125","117","110"]');
page = await s.post('/RentalBillListView.jsp', { lnkViewDetail: '125' }, { page });
rows = tableRows(page.html, 'tblRentedBook');
check('2.2 b24.3 Chi tiết PM0125', page.url.endsWith('/RentalBillDetailView.jsp') && ['PHIẾU MƯỢN PM0125', 'Trần Minh Anh', db.viDateTime(pickup, '09:00'), 'Chờ nhận', 'Số ngày thuê dự kiến: 7'].every((t) => clean(page.html).includes(t))
  && JSON.stringify(rows) === JSON.stringify([['DT001-03', 'Doraemon - Tập 1', '3.000đ', '1', '21.000đ'], ['DT020-02', 'Thám tử lừng danh Conan - Tập 1', '3.000đ', '1', '21.000đ']])
  && textOf(page.html, 'totalCopies') === '2' && textOf(page.html, 'discount') === '0đ' && textOf(page.html, 'totalRentalPrice') === '42.000đ' && !hasId(page.html, 'tblRentalCollateral'), JSON.stringify(rows));
page = await s.post('/RentalBillListView.jsp', { lnkViewDetail: '110' }, { page: await s.get('/RentalBillListView.jsp') });
rows = tableRows(page.html, 'tblRentedBook');
check('§9.2 Chi tiết PM0110 Đang cho thuê: ngày mượn, nhân viên, tình trạng gộp, khoản cọc, 60.000đ', clean(page.html).includes('Nguyễn Thu Hà') && clean(page.html).includes(db.viDate(db.addDays(today, -8)))
  && JSON.stringify(rows) === JSON.stringify([['DT001-01 DT001-02', 'Doraemon - Tập 1', '3.000đ', '2', 'Không có lỗi Không có lỗi', '60.000đ']])
  && JSON.stringify(tableRows(page.html, 'tblRentalCollateral')) === '[["1","Căn cước công dân","001203012345"]]' && textOf(page.html, 'totalRentalPrice') === '60.000đ', JSON.stringify(rows));
page = await s.get('/RentalBillListView.jsp');
check('2.2 b24.4 quay lại: danh sách từ session', JSON.stringify(col(tableRows(page.html, 'tblRentalBill'), 0)) === '["PM0125","PM0117","PM0110"]');
page = await s.post('/RentalBillListView.jsp', { lnkCancelRentalBill: '117' }, { page });
check('2.2 b24.6 hộp huỷ: câu, txtCancelReason, from=client, Xác nhận, Huỷ', clean(page.html).includes(M.CONFIRM) && ['txtCancelReason', 'btnConfirmCancel', 'btnCloseCancel'].every((id) => hasId(page.html, id)) && /name="from" value="client"/.test(page.html));
p = await s.post('/RentalBillListView.jsp', { btnCloseCancel: '' }, { page });
check('2.2 nút "Huỷ" của hộp đóng hộp', !hasId(p.html, 'txtCancelReason') && hasId(p.html, 'tblRentalBill'));
page = await s.post('/RentalBillListView.jsp', { lnkCancelRentalBill: '117' }, { page: p });
p = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: long256, from: 'client', btnConfirmCancel: '' }, { page });
check('M2 txtCancelReason 256 kí tự → INPUT_TOO_LONG: hộp mở lại, aria-invalid, giữ chữ, DB không đổi', hasMsg(p, M.TOO_LONG) && invalid(p.html, 'txtCancelReason') && valueOf(p.html, 'txtCancelReason') === long256 && db.billState(117).status === 'Chờ nhận', `${msgs(p)} ${db.billState(117).status}`);
p = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: '   ', from: 'client', btnConfirmCancel: '' }, { page: p });
check('C17 lí do chỉ dấu cách → CANCEL_REASON_REQUIRED, hộp mở, aria-invalid, DB không đổi', hasMsg(p, M.REASON_REQUIRED) && hasId(p.html, 'txtCancelReason') && invalid(p.html, 'txtCancelReason') && db.billState(117).status === 'Chờ nhận', msgs(p));
page = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: 'Đổi ý, chưa cần thuê nữa', from: 'client', btnConfirmCancel: '' }, { page: p });
check('2.2 b24.8 CANCEL_SUCCESS', hasMsg(page, M.CANCEL_OK), msgs(page));
check('2.2 b24.8 DB PM0117 Đã huỷ, lí do', JSON.stringify(db.billState(117)) === '{"status":"Đã huỷ","cancelReason":"Đổi ý, chưa cần thuê nữa","barcodes":["DT020-01"]}', JSON.stringify(db.billState(117)));
rows = tableRows(page.html, 'tblRentalBill');
check('2.2 b24.9 danh sách cập nhật', JSON.stringify(col(rows, 5)) === '["Chờ nhận","Đã huỷ","Đang cho thuê"]' && JSON.stringify(buttonValues(page.html, 'lnkCancelRentalBill')) === '["125"]', JSON.stringify(rows));
p = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: 'lần hai', from: 'client', btnConfirmCancel: '' }, { page });
check('M2 huỷ lần hai cùng phiếu → D9 RENTAL_BILL_CANCELLED, lí do không đổi', hasMsg(p, M.CANCELLED) && db.billState(117).cancelReason === 'Đổi ý, chưa cần thuê nữa', msgs(p));
p = await s.get('/RentalBillDetailView.jsp', { follow: false });
check('M2 D9 bỏ rentalBill → RentalBillDetailView 302 về RentalBillListView', p.status === 302 && /\/RentalBillListView\.jsp$/.test(p.location), `${p.status} ${p.location}`);
page = await s.get('/ClientHomeView.jsp');
page = await s.get('/SearchBookView.jsp');
page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Doraemon', btnSearch: '' }, { page });
check('2.2 sau huỷ DT001 còn 4', tableRows(page.html, 'tblBook')[0][5] === '4');
page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Conan', btnSearch: '' }, { page });
check('2.2 sau huỷ DT020 còn 3 (DT020-01 trả lại)', tableRows(page.html, 'tblBook')[0][5] === '3');

// ---------- bảng M2: session thiếu thuộc tính ----------
let s2 = await login('khach02', 'khach02@123');
let lp = await s2.get('/RentalBillListView.jsp');
for (const [path, target, method] of [
  ['/BookDetailView.jsp', '/SearchBookView.jsp', 'GET'], ['/doAddSelectedBook.jsp', '/SearchBookView.jsp', 'POST'],
  ['/doDeleteSelectedBook.jsp', '/SearchBookView.jsp', 'POST'], ['/ConfirmRentalBillView.jsp', '/SearchBookView.jsp', 'GET'],
  ['/doAddRentalBill.jsp', '/ClientHomeView.jsp', 'POST'], ['/RentalBillDetailView.jsp', '/RentalBillListView.jsp', 'GET'],
  ['/doCancelRentalBill.jsp', '/RentalBillListView.jsp', 'POST']]) {
  const r = method === 'GET' ? await s2.get(path, { follow: false })
    : await s2.post(path, { txtQuantity: '1', txtExpectedDays: '7', from: 'client' }, { page: lp, follow: false });
  check(`M2 ${path} thiếu thuộc tính session → 302 ${target}`, r.status === 302 && r.location?.endsWith(target), `${r.status} ${r.location}`);
}
lp = await s2.get('/SearchBookView.jsp');
let r = await s2.get('/ConfirmRentalBillView.jsp', { follow: false });
check('M2 ConfirmRentalBillView khi listRentedBook rỗng → 302 SearchBookView', r.status === 302 && r.location.endsWith('/SearchBookView.jsp'), `${r.status} ${r.location}`);
for (const path of ['/doAddSelectedBook.jsp', '/doDeleteSelectedBook.jsp', '/doAddRentalBill.jsp', '/doCancelRentalBill.jsp']) {
  r = await s2.get(path, { follow: false });
  check(`C2 GET ${path} → 405`, r.status === 405, r.status);
}
r = await s2.post('/doCancelRentalBill.jsp', { from: 'staff' }, { page: lp, follow: false });
check('C8 from=staff khi không có staff → 403', r.status === 403, r.status);
r = await s2.post('/doCancelRentalBill.jsp', {}, { page: lp, follow: false });
check('C8 thiếu from → 403', r.status === 403, r.status);

// ---------- bảng M2: số lượng ----------
let sp = await s2.post('/SearchBookView.jsp', { txtKeyword: 'Doraemon', btnSearch: '' }, { page: lp });
let dp = await s2.post('/SearchBookView.jsp', { lnkChooseBook: '1' }, { page: sp });
for (const bad of ['', '0', '-1', '1.5', 'abc', '99999999999']) {
  const before = cartLines('khach02');
  const x = await s2.post('/doAddSelectedBook.jsp', { txtQuantity: bad, btnAddToSelectedList: '' }, { page: dp });
  check(`M2 txtQuantity "${bad}" → QUANTITY_INVALID, aria-invalid, giỏ không đổi`, x.status === 200 && invalid(x.html, 'txtQuantity') && hasMsg(x, M.QTY_INVALID) && cartLines('khach02') === before && valueOf(x.html, 'txtQuantity') === bad, `${x.status} ${msgs(x)}`);
}
let x = await s2.post('/doAddSelectedBook.jsp', { txtQuantity: '1', btnAddToSelectedList: '' }, { page: dp });
dp = await s2.post('/SearchBookView.jsp', { lnkChooseBook: '1' }, { page: x });
x = await s2.post('/doAddSelectedBook.jsp', { txtQuantity: '5', btnAddToSelectedList: '' }, { page: dp });
check('M2 thêm đầu truyện đã có: vượt theo quyển chưa có trong giỏ → (hiện còn 3 quyển)', hasMsg(x, 'Số lượng vượt quá số quyển hiện có (hiện còn 3 quyển).'), msgs(x));
x = await s2.post('/doAddSelectedBook.jsp', { txtQuantity: '3', btnAddToSelectedList: '' }, { page: dp });
rows = tableRows(x.html, 'tblSelectedBook');
check('M2 cộng dồn: DT001 số lượng 4 (1 + 3), một dòng', JSON.stringify(rows) === '[["","Doraemon - Tập 1","4","Xoá"]]' && cartLines('khach02') === 4, JSON.stringify(rows));
const copiesBefore = q("SELECT GROUP_CONCAT(bc.barcode ORDER BY bc.id) FROM tblSelectedBook sb JOIN tblBookCopy bc ON bc.id = sb.bookCopyId JOIN tblCart c ON c.id = sb.cartId JOIN tblUser u ON u.id = c.clientId WHERE u.username='khach02';");
check('§6.2 quyển id nhỏ nhất còn trống: DT001-04..07', copiesBefore === 'DT001-04,DT001-05,DT001-06,DT001-07', copiesBefore);
// F5 sau khi thêm: doAddSelectedBook trả 302, F5 chỉ tải lại SearchBookView
r = await s2.post('/doAddSelectedBook.jsp', { txtQuantity: '1', btnAddToSelectedList: '' }, { page: dp, follow: false });
check('M2 thêm thành công trả 302 SearchBookView (F5 không gửi lại)', r.status === 302 && r.location.endsWith('/SearchBookView.jsp') || hasMsg(r, M.Q0), `${r.status} ${r.location}`);
x = await s2.get('/SearchBookView.jsp');
// xoá DT001
x = await s2.post('/SearchBookView.jsp', { lnkDeleteSelectedBook: '1' }, { page: x });
check('M2 Xoá dòng giỏ → khung rỗng, DB 0 dòng', JSON.stringify(tableRows(x.html, 'tblSelectedBook')) === '[]' && cartLines('khach02') === 0, JSON.stringify(tableRows(x.html, 'tblSelectedBook')));
x = await s2.post('/SearchBookView.jsp', { lnkDeleteSelectedBook: '1' }, { page: x });
check('M2 F5 Xoá (đầu truyện không còn trong giỏ) → hiện lại, không lỗi', x.status === 200 && cartLines('khach02') === 0, x.status);

// 0 quyển sẵn sàng: phiếu 200 (khach01) giữ cả hai quyển DT015
q(`INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, discount, status, clientId)
  VALUES (200, NOW(), NOW() + INTERVAL 1 DAY, 3, 0, 'Chờ nhận', (SELECT id FROM tblUser WHERE username='khach01'));
INSERT INTO tblRentedBook (rentalPrice, rentalBillId, bookCopyId) VALUES
  (5000, 200, (SELECT id FROM tblBookCopy WHERE barcode='DT015-01')), (5000, 200, (SELECT id FROM tblBookCopy WHERE barcode='DT015-02'));`);
x = await s2.post('/SearchBookView.jsp', { txtKeyword: 'lâu đài', btnSearch: '' }, { page: x });
check('M2 đầu truyện 0 quyển vẫn hiện với "0"', JSON.stringify(tableRows(x.html, 'tblBook').map((r2) => [r2[0], r2[5]])) === '[["DT015","0"]]');
dp = await s2.post('/SearchBookView.jsp', { lnkChooseBook: '15' }, { page: x });
x = await s2.post('/doAddSelectedBook.jsp', { txtQuantity: '1', btnAddToSelectedList: '' }, { page: dp });
check('M2 thêm đầu truyện 0 quyển → (hiện còn 0 quyển)', hasMsg(x, M.Q0), msgs(x));
q('DELETE FROM tblRentedBook WHERE rentalBillId = 200; DELETE FROM tblRentalBill WHERE id = 200;');

// ---------- bảng M2: từ khoá ----------
x = await s2.get('/SearchBookView.jsp');
r = await s2.post('/SearchBookView.jsp', { txtKeyword: '    ', btnSearch: '' }, { page: x });
check('C9 từ khoá chỉ dấu cách → BOOK_NOT_FOUND, bảng rỗng', hasMsg(r, M.BOOK_NOT_FOUND) && tableRows(r.html, 'tblBook').length === 0);
r = await s2.post('/SearchBookView.jsp', { txtKeyword: 'Doraemon' + 'x'.repeat(150), btnSearch: '' }, { page: x });
check('M2 từ khoá 158 kí tự → INPUT_TOO_LONG, aria-invalid, giữ chữ', hasMsg(r, M.TOO_LONG) && invalid(r.html, 'txtKeyword') && valueOf(r.html, 'txtKeyword').length === 158, msgs(r));
r = await s2.post('/SearchBookView.jsp', { txtKeyword: 'a'.repeat(100), btnSearch: '' }, { page: x });
check('M2 từ khoá đúng 100 kí tự → vẫn tìm (BOOK_NOT_FOUND)', hasMsg(r, M.BOOK_NOT_FOUND), msgs(r));
for (const k of ['%', '_', '\\', '%%Doraemon']) {
  r = await s2.post('/SearchBookView.jsp', { txtKeyword: k, btnSearch: '' }, { page: x });
  check(`M2 từ khoá "${k}" tìm đúng chữ → BOOK_NOT_FOUND`, hasMsg(r, M.BOOK_NOT_FOUND) && tableRows(r.html, 'tblBook').length === 0, JSON.stringify(tableRows(r.html, 'tblBook')));
}
for (const k of ['tham tu', 'CONAN', 'Thám tử'.normalize('NFD')]) {
  r = await s2.post('/SearchBookView.jsp', { txtKeyword: k, btnSearch: '' }, { page: x });
  check(`M2 từ khoá "${k}" (không dấu/hoa/NFD) → DT020, DT021`, JSON.stringify(col(tableRows(r.html, 'tblBook'), 0)) === '["DT020","DT021"]', JSON.stringify(tableRows(r.html, 'tblBook')));
}
r = await s2.post('/SearchBookView.jsp', { txtKeyword: '<script>alert(1)</script>', btnSearch: '' }, { page: x });
check('§6.1 Chung: từ khoá điền lại được escape', !r.html.includes('<script>alert(1)') && valueOf(r.html, 'txtKeyword') === '<script>alert(1)</script>');

// ---------- bảng M2: id sửa tay ----------
q(`INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, discount, status, clientId)
  VALUES (201, NOW(), NOW() + INTERVAL 1 DAY, 3, 0, 'Chờ nhận', (SELECT id FROM tblUser WHERE username='khach01'));
INSERT INTO tblRentedBook (rentalPrice, rentalBillId, bookCopyId) VALUES (3000, 201, (SELECT id FROM tblBookCopy WHERE barcode='DT002-04'));`);
let lv = await s.get('/ClientHomeView.jsp');
lv = await s.get('/RentalBillListView.jsp');
for (const [name, value] of [['lnkViewDetail', 'abc'], ['lnkViewDetail', '201'], ['lnkCancelRentalBill', '201'], ['lnkCancelRentalBill', 'x'], ['lnkCancelRentalBill', '110']]) {
  r = await s.post('/RentalBillListView.jsp', { [name]: value }, { page: lv });
  check(`§6.1 ${name}="${value}" (không số / phiếu khách khác / không Chờ nhận) → hiện lại danh sách, không hộp`, r.status === 200 && r.url.endsWith('/RentalBillListView.jsp') && !hasId(r.html, 'txtCancelReason'), `${r.status} ${r.url}`);
}
r = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: 'x', from: 'client', btnConfirmCancel: '' }, { page: lv, follow: false });
check('§6.1 doCancel không có rentalBill (sau D9) → 302 danh sách, phiếu 201 không đổi', r.status === 302 && db.billState(201).status === 'Chờ nhận', `${r.status} ${db.billState(201).status}`);
x = await s2.get('/SearchBookView.jsp');
for (const [name, value] of [['lnkChooseBook', 'abc'], ['lnkChooseBook', '9999'], ['lnkDeleteSelectedBook', 'abc'], ['lnkDeleteSelectedBook', '20']]) {
  r = await s2.post('/SearchBookView.jsp', { [name]: value }, { page: x });
  check(`§6.1 ${name}="${value}" → hiện lại SearchBookView`, r.status === 200 && r.url.endsWith('/SearchBookView.jsp') && hasId(r.html, 'tblBook'), `${r.status} ${r.url}`);
}
form = new URLSearchParams({ btnCreateRentalBill: '' });
form.append('chkSelectedBook', 'abc');
r = await s2.postParams('/SearchBookView.jsp', form, { page: x });
check('§6.1 Tạo phiếu khi không tích (giá trị rác) → BOOK_NOT_CHOSEN', r.status === 200 && r.url.endsWith('/SearchBookView.jsp') && hasMsg(r, M.NOT_CHOSEN), msgs(r));
r = await s2.post('/SearchBookView.jsp', { btnCreateRentalBill: '' }, { page: x });
check('§6.1 Tạo phiếu khi không tích dòng nào → BOOK_NOT_CHOSEN', hasMsg(r, M.NOT_CHOSEN), msgs(r));

// ---------- bảng M2: tích một phần, hai tab, K1 ----------
async function addToCart(sess, bookId, qty, from) {
  let pg = await sess.post('/SearchBookView.jsp', { txtKeyword: 'a', btnSearch: '' }, { page: from });
  pg = await sess.post('/SearchBookView.jsp', { lnkChooseBook: String(bookId) }, { page: pg });
  return sess.post('/doAddSelectedBook.jsp', { txtQuantity: String(qty), btnAddToSelectedList: '' }, { page: pg });
}
x = await s2.get('/SearchBookView.jsp');
x = await addToCart(s2, 2, 1, x);
x = await addToCart(s2, 21, 1, x);
form = new URLSearchParams({ btnCreateRentalBill: '' });
form.append('chkSelectedBook', '21');
let cp = await s2.postParams('/SearchBookView.jsp', form, { page: x });
check('M2 tích một phần: phiếu chỉ có DT021', JSON.stringify(col(tableRows(cp.html, 'tblRentedBook'), 0)) === '["Thám tử lừng danh Conan - Tập 2"]');
// K1: DT021-01 (quyển trong giỏ) bị phiếu 202 của khách khác giữ → đổi sang DT021-02
q(`INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, discount, status, clientId)
  VALUES (202, NOW(), NOW() + INTERVAL 1 DAY, 3, 0, 'Chờ nhận', (SELECT id FROM tblUser WHERE username='khach01'));
INSERT INTO tblRentedBook (rentalPrice, rentalBillId, bookCopyId) VALUES (3000, 202, (SELECT id FROM tblBookCopy WHERE barcode='DT021-01'));`);
const countBefore = billCount();
r = await s2.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page: cp });
const newId = Number(q('SELECT MAX(id) FROM tblRentalBill WHERE id < 200;'));
check('M2 K1 quyển trong giỏ đã bị giữ → đổi quyển cùng đầu truyện (DT021-02)', hasMsg(r, M.CREATED) && billCount() === countBefore + 1 && JSON.stringify(db.billState(newId).barcodes) === '["DT021-02"]', `${msgs(r)} ${JSON.stringify(db.billState(newId))}`);
x = await s2.get('/SearchBookView.jsp');
check('M2 tích một phần: dòng DT002 không tích vẫn ở giỏ khi mở lại', JSON.stringify(col(tableRows(x.html, 'tblSelectedBook'), 1)) === '["Doraemon - Tập 2"]', JSON.stringify(tableRows(x.html, 'tblSelectedBook')));
// K1 không đủ: DT021 hết quyển → thêm DT020 rồi để phiếu 203 giữ mọi quyển DT020 còn trống
x = await addToCart(s2, 20, 1, x);
form = new URLSearchParams({ btnCreateRentalBill: '' });
form.append('chkSelectedBook', '20');
cp = await s2.postParams('/SearchBookView.jsp', form, { page: x });
q(`INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, discount, status, clientId)
  VALUES (203, NOW(), NOW() + INTERVAL 1 DAY, 3, 0, 'Chờ nhận', (SELECT id FROM tblUser WHERE username='khach01'));
INSERT INTO tblRentedBook (rentalPrice, rentalBillId, bookCopyId)
  SELECT 3000, 203, c.id FROM tblBookCopy c WHERE c.bookId = 20 AND NOT EXISTS (SELECT 1 FROM tblRentedBook rb JOIN tblRentalBill b ON b.id = rb.rentalBillId WHERE rb.bookCopyId = c.id AND b.status <> 'Đã huỷ');`);
const c2 = billCount();
r = await s2.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page: cp });
check('M2 K1 không còn quyển → NOT_ENOUGH_COPIES, giữ ô, không tạo phiếu', hasMsg(r, M.NOT_ENOUGH) && billCount() === c2 && valueOf(r.html, 'txtExpectedDays') === '7', `${r.status} ${msgs(r)}`);
q('DELETE FROM tblRentedBook WHERE rentalBillId = 203; DELETE FROM tblRentalBill WHERE id = 203;');
// hai tab: tab A ở Xác nhận (DT020), tab B xoá DT020 khỏi giỏ
let tabB = await s2.get('/SearchBookView.jsp');
tabB = await s2.post('/SearchBookView.jsp', { lnkDeleteSelectedBook: '20' }, { page: tabB });
const c3 = billCount();
r = await s2.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page: cp });
check('M2 hai tab: tab B xoá dòng giỏ, tab A xác nhận → NOT_ENOUGH_COPIES, không 500, không phiếu', r.status === 200 && hasMsg(r, M.NOT_ENOUGH) && billCount() === c3, `${r.status} ${msgs(r)}`);
// bấm "Xác nhận" hai lần đồng thời
x = await s2.get('/SearchBookView.jsp');
form = new URLSearchParams({ btnCreateRentalBill: '' });
form.append('chkSelectedBook', '2');
cp = await s2.postParams('/SearchBookView.jsp', form, { page: x });
const c4 = billCount();
const [a, b] = await Promise.all([
  s2.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page: cp, follow: false }),
  s2.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page: cp, follow: false }),
]);
check('M2 bấm Xác nhận hai lần cùng lúc → đúng một phiếu, một 200 + một 302', billCount() === c4 + 1 && [a.status, b.status].sort().join(',') === '200,302', `${a.status},${b.status} ${billCount() - c4}`);

// ---------- D9 khi khách huỷ ----------
lv = await s.get('/ClientHomeView.jsp');
lv = await s.get('/RentalBillListView.jsp');
lv = await s.post('/RentalBillListView.jsp', { lnkCancelRentalBill: '125' }, { page: lv });
q("UPDATE tblRentalBill SET status='Đang cho thuê', borrowDate=CURDATE(), dueDate=CURDATE() + INTERVAL 7 DAY, staffId=1 WHERE id=125;");
r = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: 'muộn', from: 'client', btnConfirmCancel: '' }, { page: lv });
rows = tableRows(r.html, 'tblRentalBill');
check('D9 nhân viên vừa xử lí khi khách huỷ → RENTAL_BILL_ALREADY_PROCESSED, dòng cập nhật, không nút huỷ', hasMsg(r, M.PROCESSED) && rows[0][5] === 'Đang cho thuê' && buttonValues(r.html, 'lnkCancelRentalBill').length === 0 && db.billState(125).status === 'Đang cho thuê', `${msgs(r)} ${JSON.stringify(rows[0])}`);
q("UPDATE tblRentalBill SET status='Chờ nhận', borrowDate=NULL, dueDate=NULL, staffId=NULL WHERE id=125;");
lv = await s.get('/ClientHomeView.jsp');
lv = await s.get('/RentalBillListView.jsp');
lv = await s.post('/RentalBillListView.jsp', { lnkCancelRentalBill: '125' }, { page: lv });
q("UPDATE tblRentalBill SET status='Đã huỷ', cancelReason='nhân viên huỷ' WHERE id=125;");
r = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: 'khách huỷ', from: 'client', btnConfirmCancel: '' }, { page: lv });
check('D9 nhân viên vừa huỷ khi khách huỷ → RENTAL_BILL_CANCELLED, lí do của nhân viên giữ nguyên', hasMsg(r, M.CANCELLED) && db.billState(125).cancelReason === 'nhân viên huỷ' && tableRows(r.html, 'tblRentalBill')[0][5] === 'Đã huỷ', msgs(r));

q('DELETE FROM tblRentedBook WHERE rentalBillId >= 200; DELETE FROM tblRentalBill WHERE id >= 200;');
console.log(`\n[lane6c] ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
