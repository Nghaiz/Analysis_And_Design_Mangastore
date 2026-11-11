#!/usr/bin/env node
// Smoke chức năng 1 và 2 (phase 6): HTTP thuần với cookie jar, đi kịch bản ch.2 mục 2.1 và 2.2 trên seed E2E,
// so thông báo từng chữ (docs/contracts.md §10.1), mã, giá, tổng (§13). Cần stack E2E đang chạy:
//   docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml up --build -d --wait
// Biến: SMOKE_BASE_URL (mặc định http://127.0.0.1:8080), SMOKE_COMPOSE_PROJECT (mặc định tiemtruyen-e2e).
// In mỗi bước [smoke] PASS <bước>; hỏng thì [smoke] FAIL <bước> | trang | chờ | nhận, exit 1; thiếu stack exit 2.
// Cuối lượt DB còn PM0125 "Chờ nhận" (DT001-03, DT020-02), PM0117 "Đã huỷ", PM0110 "Đang cho thuê": flow-m3.mjs
// của phase 7 chạy tiếp từ đây. Không hỏi tương tác.
import { Session, StepError, assertEq, buttonValues, clean, hasId, messagesOf, tableRows, textOf, valueOf } from './lib/http.mjs';
import {
  BASE_URL, MissingStackError, addDays, billState, isoDate, isoLocal, resetChapter2, seedChapter22Bills, viDate,
  viDateTime, vnToday,
} from './lib/e2e-db.mjs';

// Câu mong đợi gõ tay từ docs/contracts.md §10.1 (không đọc từ Messages.java, để test còn đỏ được).
const M = {
  REGISTER_SUCCESS: 'Đăng kí tài khoản thành công!',
  REGISTER_DUPLICATE: 'Tên đăng nhập, số CCCD, số điện thoại hoặc email đã được sử dụng, vui lòng kiểm tra lại.',
  REGISTER_INVALID: 'Thông tin không hợp lệ, vui lòng kiểm tra lại.',
  REGISTER_PASSWORD_MISMATCH: 'Mật khẩu nhập lại không khớp, vui lòng nhập lại.',
  LOGIN_FAILED: 'Đăng nhập thất bại, vui lòng thử lại.',
  BOOK_NOT_FOUND: 'Không tìm thấy thông tin phù hợp.',
  QUANTITY_EXCEEDED_5: 'Số lượng vượt quá số quyển hiện có (hiện còn 5 quyển).',
  RENTAL_BILL_CREATED: 'Tạo phiếu mượn thành công! Vui lòng đến quầy vào ngày giờ đã hẹn để đặt cọc và nhận truyện.',
  CANCEL_CONFIRM: 'Bạn có chắc chắn muốn huỷ phiếu mượn này?',
  CANCEL_SUCCESS: 'Huỷ phiếu mượn thành công!',
  EXPECTED_DAYS_INVALID: 'Số ngày thuê phải lớn hơn hoặc bằng 1.',
  PICKUP_TIME_INVALID: 'Ngày giờ đến nhận phải sau thời điểm hiện tại.',
  // §10.3: câu ngoài báo cáo, chủ dự án duyệt 11/11/2026.
  QUANTITY_INVALID: 'Số lượng phải là số nguyên lớn hơn hoặc bằng 1.',
  BOOK_NOT_CHOSEN: 'Vui lòng chọn đầu truyện.',
  INPUT_TOO_LONG: 'Nội dung nhập quá dài, vui lòng rút gọn.',
  SESSION_EXPIRED: 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.',
  CANCEL_REASON_REQUIRED: 'Vui lòng nhập lí do huỷ.',
  EXPECTED_DAYS_TOO_LONG: 'Số ngày thuê tối đa là 30 ngày.',
};

function expectRedirect(stepName, page, pathRe) {
  const target = page.location ? new URL(page.location, BASE_URL) : null;
  const where = target ? `${target.pathname}${target.search}` : '';
  if (page.status !== 302 || !pathRe.test(where)) {
    throw new StepError(stepName, page.url, `302 → ${pathRe}`, `${page.status} → ${where || '(không có Location)'}`);
  }
}

function expectAriaInvalid(stepName, page, id) {
  const re = new RegExp(`<(input|textarea)\\b[^>]*\\sid\\s*=\\s*["']${id}["'][^>]*>`, 'i');
  const tag = (page.html.match(re) ?? [''])[0];
  if (!/aria-invalid\s*=\s*["']true["']/.test(tag)) {
    throw new StepError(stepName, page.url, `ô ${id} có aria-invalid="true"`, tag || '(không có ô)');
  }
}

// Khách của ch.2 2.1 bước 5.
const ANH = {
  txtFullName: 'Trần Minh Anh', txtDob: '2003-08-15', txtIdCard: '001203012345', txtPhone: '0912345678',
  txtEmail: 'minhanh.tran@gmail.com', txtAddress: 'Số 12 Trần Phú, Hà Đông, Hà Nội', txtUsername: 'minhanh',
  txtPassword: 'Anh@2003', txtConfirmPassword: 'Anh@2003',
};
// Ngoại lệ 6 của 2.1: "minhanh" đã có người dùng. Người đăng kí lần hai khác CCCD, điện thoại, email
// (giá trị thử của smoke, ch.2 không ghi) để bước 6.3 chỉ đổi tên đăng nhập là thành công.
const ANH_2003 = { ...ANH, txtIdCard: '001203099999', txtPhone: '0912345000', txtEmail: 'minhanh.2003@gmail.com' };

let passed = 0;
async function step(name, fn) {
  await fn();
  passed += 1;
  console.log(`[smoke] PASS ${name}`);
}

function expectMessage(stepName, page, expected) {
  const got = messagesOf(page.html);
  if (!got.includes(expected)) throw new StepError(stepName, page.url, expected, got.length ? got.join(' / ') : '(không có hộp thông báo)');
}

function expectStatus(stepName, page, status) {
  if (page.status !== status) throw new StepError(stepName, page.url, `HTTP ${status}`, `HTTP ${page.status}`);
}

function expectId(stepName, page, id) {
  if (!hasId(page.html, id)) throw new StepError(stepName, page.url, `có phần tử id="${id}"`, 'không có');
}

function expectText(stepName, page, fragment) {
  if (!clean(page.html).includes(fragment)) throw new StepError(stepName, page.url, `trang có chữ "${fragment}"`, 'không có');
}

/** Dòng của bảng có ô đầu tiên khớp `first` (hoặc chứa ô bằng `key` ở bất kì vị trí nào). */
function rowWith(stepName, page, tableId, key) {
  const rows = tableRows(page.html, tableId);
  if (!rows) throw new StepError(stepName, page.url, `bảng id="${tableId}"`, 'không có');
  const row = rows.find((r) => r.includes(key));
  if (!row) throw new StepError(stepName, page.url, `bảng ${tableId} có dòng "${key}"`, JSON.stringify(rows));
  return row;
}

function expectRow(stepName, page, tableId, key, cells) {
  const row = rowWith(stepName, page, tableId, key);
  for (const c of cells) {
    if (!row.includes(c)) throw new StepError(stepName, page.url, `dòng "${key}" có ô "${c}"`, JSON.stringify(row));
  }
  return row;
}

async function main() {
  const today = vnToday();
  const pickup = addDays(today, 2); // ch.2 2.2 bước 19: 09:00 25/09/2026 khi "hôm nay" là 23/09/2026

  await step('0 đặt lại DB E2E theo ch.2 (không phiếu, chưa có minhanh, bộ đếm phiếu 125)', () => resetChapter2());

  // ---------- Bảo mật và phân quyền ----------
  await step('S1 khách chưa đăng nhập vào ClientHomeView bị chuyển về /LoginView.jsp', async () => {
    const page = await new Session(BASE_URL).get('/ClientHomeView.jsp', { follow: false });
    if (page.status !== 302 || !/\/LoginView\.jsp$/.test(new URL(page.location ?? '', BASE_URL).pathname)) {
      throw new StepError('S1', '/ClientHomeView.jsp', '302 → /LoginView.jsp', `${page.status} → ${page.location}`);
    }
  });
  await step('S2 SearchBookView chưa đăng nhập bị chuyển về /LoginView.jsp', async () => {
    const page = await new Session(BASE_URL).get('/SearchBookView.jsp', { follow: false });
    if (page.status !== 302 || !/\/LoginView\.jsp$/.test(new URL(page.location ?? '', BASE_URL).pathname)) {
      throw new StepError('S2', '/SearchBookView.jsp', '302 → /LoginView.jsp', `${page.status} → ${page.location}`);
    }
  });
  await step('S3 POST thiếu token CSRF bị 403', async () => {
    const s = new Session(BASE_URL);
    await s.get('/RegisterView.jsp');
    const page = await s.post('/doRegister.jsp', { ...ANH, btnRegister: '' }, { withCsrf: false });
    expectStatus('S3', page, 403);
  });
  await step('S4 POST sai token CSRF bị 403', async () => {
    const s = new Session(BASE_URL);
    await s.get('/LoginView.jsp');
    const page = await s.request('/LoginView.jsp', { method: 'POST', form: { csrf: 'sai', txtUsername: 'x', txtPassword: 'y', btnLogin: '' } });
    expectStatus('S4', page, 403);
  });
  await step('S5 GET tới doRegister.jsp bị 405 (C2)', async () => {
    const page = await new Session(BASE_URL).get('/doRegister.jsp', { follow: false });
    expectStatus('S5', page, 405);
  });
  await step('S6 trang nhân viên chưa đăng nhập bị chuyển về /nhan-vien/LoginView.jsp', async () => {
    const page = await new Session(BASE_URL).get('/nhan-vien/StaffHomeView.jsp', { follow: false });
    if (page.status !== 302 || !/\/nhan-vien\/LoginView\.jsp$/.test(new URL(page.location ?? '', BASE_URL).pathname)) {
      throw new StepError('S6', '/nhan-vien/StaffHomeView.jsp', '302 → /nhan-vien/LoginView.jsp', `${page.status} → ${page.location}`);
    }
  });

  // ---------- 2.1 Khách hàng đăng kí ----------
  const s = new Session(BASE_URL);
  let page;
  await step('2.1 bước 2 Trang chủ: lời chào, nút Đăng nhập, Đăng kí', async () => {
    page = await s.get('/');
    expectStatus('2.1 bước 2', page, 200);
    expectText('2.1 bước 2', page, 'Chào mừng bạn đến với cửa hàng cho thuê truyện!');
    expectId('2.1 bước 2', page, 'lnkLogin');
    expectId('2.1 bước 2', page, 'lnkRegister');
  });
  await step('2.1 bước 4 Đăng kí tài khoản: 9 ô trống và nút Đăng kí', async () => {
    page = await s.get('/RegisterView.jsp');
    for (const id of Object.keys(ANH)) {
      expectId('2.1 bước 4', page, id);
      assertEq('2.1 bước 4', page.url, '', valueOf(page.html, id) ?? '');
    }
    expectId('2.1 bước 4', page, 'btnRegister');
  });
  await step('C4 ô sai định dạng → câu REGISTER_INVALID', async () => {
    page = await s.post('/doRegister.jsp', { ...ANH, txtIdCard: '12345', btnRegister: '' }, { page });
    expectMessage('C4', page, M.REGISTER_INVALID);
  });
  await step('§6.1 chữ nhập in lại được escape (họ tên chứa <b>, "), không chèn được thẻ', async () => {
    const evil = 'Tèo <b>đậm</b> "x"';
    page = await s.post('/doRegister.jsp', { ...ANH, txtFullName: evil, txtIdCard: '12345', btnRegister: '' }, { page });
    expectMessage('§6.1 escape', page, M.REGISTER_INVALID);
    if (page.html.includes('<b>đậm</b>')) throw new StepError('§6.1 escape', page.url, 'thẻ <b> bị escape', 'thẻ <b> nằm nguyên trong HTML');
    assertEq('§6.1 escape giữ đúng chữ', page.url, evil, valueOf(page.html, 'txtFullName'));
  });
  await step('C4 ngày sinh ở tương lai, ngày không có thật → REGISTER_INVALID', async () => {
    page = await s.post('/doRegister.jsp', { ...ANH, txtDob: isoDate(addDays(vnToday(), 1)), btnRegister: '' }, { page });
    expectMessage('C4 tương lai', page, M.REGISTER_INVALID);
    page = await s.post('/doRegister.jsp', { ...ANH, txtDob: '2003-02-31', btnRegister: '' }, { page });
    expectMessage('C4 31/02', page, M.REGISTER_INVALID);
  });
  await step('§9.2 mật khẩu nhập lại không khớp → REGISTER_PASSWORD_MISMATCH', async () => {
    page = await s.post('/doRegister.jsp', { ...ANH, txtConfirmPassword: 'Anh@2004', btnRegister: '' }, { page });
    expectMessage('§9.2', page, M.REGISTER_PASSWORD_MISMATCH);
  });
  await step('2.1 bước 6 đăng kí minhanh → "Đăng kí tài khoản thành công!" rồi giao diện Đăng nhập', async () => {
    page = await s.post('/doRegister.jsp', { ...ANH, btnRegister: '' }, { page });
    expectMessage('2.1 bước 6', page, M.REGISTER_SUCCESS);
    expectId('2.1 bước 8', page, 'txtUsername');
    expectId('2.1 bước 8', page, 'txtPassword');
    expectId('2.1 bước 8', page, 'btnLogin');
  });
  await step('2.1 ngoại lệ 6 tên đăng nhập "minhanh" đã dùng → REGISTER_DUPLICATE, giữ thông tin đã nhập', async () => {
    const s2 = new Session(BASE_URL);
    let p = await s2.get('/RegisterView.jsp');
    p = await s2.post('/doRegister.jsp', { ...ANH_2003, btnRegister: '' }, { page: p });
    expectMessage('2.1 ngoại lệ 6', p, M.REGISTER_DUPLICATE);
    for (const id of ['txtFullName', 'txtIdCard', 'txtPhone', 'txtEmail', 'txtAddress', 'txtUsername']) {
      assertEq(`2.1 ngoại lệ 6.2 giữ ${id}`, p.url, ANH_2003[id], valueOf(p.html, id));
    }
    assertEq('2.1 ngoại lệ 6.2 giữ txtDob', p.url, ANH_2003.txtDob, valueOf(p.html, 'txtDob'));
    assertEq('2.1 ngoại lệ 6.2 ô mật khẩu trống', p.url, '', valueOf(p.html, 'txtPassword') ?? '');
    p = await s2.post('/doRegister.jsp', { ...ANH_2003, txtUsername: 'minhanh2003', btnRegister: '' }, { page: p });
    expectMessage('2.1 ngoại lệ 6.4', p, M.REGISTER_SUCCESS);
  });
  await step('2.1 ngoại lệ 10 đăng nhập sai → LOGIN_FAILED, vẫn ở giao diện Đăng nhập', async () => {
    page = await s.post('/LoginView.jsp', { txtUsername: 'minhanh', txtPassword: 'anh@2003', btnLogin: '' }, { page });
    expectMessage('2.1 ngoại lệ 10', page, M.LOGIN_FAILED);
    expectId('2.1 ngoại lệ 10.2', page, 'btnLogin');
  });
  await step('2.1 bước 10 đăng nhập minhanh → giao diện chính của khách "Họ và tên: Trần Minh Anh"', async () => {
    page = await s.post('/LoginView.jsp', { txtUsername: 'minhanh', txtPassword: 'Anh@2003', btnLogin: '' }, { page });
    if (!/\/ClientHomeView\.jsp$/.test(new URL(page.url).pathname)) {
      throw new StepError('2.1 bước 10', page.url, '/ClientHomeView.jsp', new URL(page.url).pathname);
    }
    expectText('2.1 bước 10', page, 'Trần Minh Anh');
    expectId('2.1 bước 10', page, 'lnkSearchBook');
    expectId('2.1 bước 10', page, 'lnkViewRentalBill');
    expectId('C14 nút Đăng xuất', page, 'btnLogout');
  });
  await step('§6.1 khách đã đăng nhập mở LoginView, RegisterView → về ClientHomeView', async () => {
    expectRedirect('§6.1 LoginView', await s.get('/LoginView.jsp', { follow: false }), /\/ClientHomeView\.jsp$/);
    expectRedirect('§6.1 RegisterView', await s.get('/RegisterView.jsp', { follow: false }), /\/ClientHomeView\.jsp$/);
  });

  // ---------- 2.2 Khách hàng tìm và chọn truyện ----------
  await step('2.2 chuẩn bị: PM0110, PM0117 của minhanh có sẵn (bảng bước 24.1)', () => seedChapter22Bills('minhanh'));
  await step('2.2 ngoại lệ 2 đăng nhập sai rồi đúng (phiên mới)', async () => {
    const s3 = new Session(BASE_URL);
    let p = await s3.get('/LoginView.jsp');
    p = await s3.post('/LoginView.jsp', { txtUsername: 'minhanh', txtPassword: 'sai-mat-khau', btnLogin: '' }, { page: p });
    expectMessage('2.2 ngoại lệ 2', p, M.LOGIN_FAILED);
    p = await s3.post('/LoginView.jsp', { txtUsername: 'minhanh', txtPassword: 'Anh@2003', btnLogin: '' }, { page: p });
    expectText('2.2 ngoại lệ 2.4', p, 'Trần Minh Anh');
  });
  await step('2.2 bước 4 Tìm truyện: ô tìm, nút Tìm, khung Truyện đã chọn rỗng, nút Tạo phiếu mượn', async () => {
    page = await s.get('/SearchBookView.jsp');
    for (const id of ['txtKeyword', 'btnSearch', 'btnCreateRentalBill']) expectId('2.2 bước 4', page, id);
    assertEq('2.2 bước 4 giỏ rỗng', page.url, '[]', JSON.stringify(buttonValues(page.html, 'lnkDeleteSelectedBook')));
  });
  await step('2.2 ngoại lệ 5 tìm "Thần đồng đất Việt" → BOOK_NOT_FOUND', async () => {
    page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Thần đồng đất Việt', btnSearch: '' }, { page });
    expectMessage('2.2 ngoại lệ 5.1', page, M.BOOK_NOT_FOUND);
    assertEq('2.2 ngoại lệ 5.3 danh sách rỗng', page.url, '[]', JSON.stringify(buttonValues(page.html, 'lnkChooseBook')));
  });
  await step('§6.1 từ khoá > 100 kí tự → INPUT_TOO_LONG; "%" → không tìm thấy; "tham tu" không dấu → ra Conan', async () => {
    page = await s.post('/SearchBookView.jsp', { txtKeyword: 'a'.repeat(101), btnSearch: '' }, { page });
    expectMessage('§6.1 từ khoá dài', page, M.INPUT_TOO_LONG);
    page = await s.post('/SearchBookView.jsp', { txtKeyword: '%', btnSearch: '' }, { page });
    expectMessage('§6.1 từ khoá %', page, M.BOOK_NOT_FOUND);
    page = await s.post('/SearchBookView.jsp', { txtKeyword: 'tham tu', btnSearch: '' }, { page });
    rowWith('§6.1 không dấu', page, 'tblBook', 'DT020');
  });
  await step('§6.1 Tạo phiếu mượn khi chưa tích dòng nào → BOOK_NOT_CHOSEN', async () => {
    page = await s.post('/SearchBookView.jsp', { btnCreateRentalBill: '' }, { page });
    expectMessage('§6.1 không tích', page, M.BOOK_NOT_CHOSEN);
  });
  await step('§6.1 id đầu truyện sửa tay (không có trong kết quả tìm, hoặc là chữ) → bỏ qua, vẫn ở Tìm truyện', async () => {
    page = await s.post('/SearchBookView.jsp', { lnkChooseBook: '999' }, { page });
    expectStatus('§6.1 id lạ', page, 200);
    expectId('§6.1 id lạ', page, 'txtKeyword');
    page = await s.post('/SearchBookView.jsp', { lnkChooseBook: 'abc' }, { page });
    expectStatus('§6.1 id chữ', page, 200);
    expectId('§6.1 id chữ', page, 'txtKeyword');
  });
  await step('2.2 bước 6 tìm "Doraemon" → DT001 5 quyển, DT002 4, DT015 2', async () => {
    page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Doraemon', btnSearch: '' }, { page });
    const last = (row) => row[row.length - 1];
    const r1 = expectRow('2.2 bước 6', page, 'tblBook', 'DT001', ['Doraemon - Tập 1', 'Fujiko F. Fujio', 'Thiếu nhi', '3.000đ']);
    const r2 = expectRow('2.2 bước 6', page, 'tblBook', 'DT002', ['Doraemon - Tập 2', '3.000đ']);
    const r3 = expectRow('2.2 bước 6', page, 'tblBook', 'DT015', ['Doraemon: Nobita và lâu đài dưới đáy biển', 'Phiêu lưu', '5.000đ']);
    assertEq('2.2 bước 6 số lượng DT001', page.url, '5', last(r1));
    assertEq('2.2 bước 6 số lượng DT002', page.url, '4', last(r2));
    assertEq('2.2 bước 6 số lượng DT015', page.url, '2', last(r3));
  });
  await step('2.2 bước 8 chọn DT001 → Chi tiết đầu truyện', async () => {
    page = await s.post('/SearchBookView.jsp', { lnkChooseBook: '1' }, { page });
    for (const t of ['Chi tiết đầu truyện', 'DT001', 'Doraemon - Tập 1', 'Kim Đồng', '2023', 'Thiếu nhi', '3.000đ',
      'Chú mèo máy Doraemon đến từ thế kỉ 22 giúp đỡ cậu bé Nobita bằng những bảo bối thần kì.']) {
      expectText('2.2 bước 8', page, t);
    }
    expectId('2.2 bước 8', page, 'txtQuantity');
    expectId('2.2 bước 8', page, 'btnAddToSelectedList');
  });
  await step('§6.1 số lượng chữ, 0, âm, thập phân, trống → QUANTITY_INVALID, ô aria-invalid', async () => {
    for (const q of ['abc', '0', '-2', '1.5', '']) {
      page = await s.post('/doAddSelectedBook.jsp', { txtQuantity: q, btnAddToSelectedList: '' }, { page });
      expectMessage(`§6.1 số lượng "${q}"`, page, M.QUANTITY_INVALID);
      expectAriaInvalid(`§6.1 số lượng "${q}"`, page, 'txtQuantity');
    }
  });
  await step('§9.2 số lượng vượt quá → "Số lượng vượt quá số quyển hiện có (hiện còn 5 quyển)."', async () => {
    page = await s.post('/doAddSelectedBook.jsp', { txtQuantity: '6', btnAddToSelectedList: '' }, { page });
    expectMessage('§9.2 doAddSelectedBook', page, M.QUANTITY_EXCEEDED_5);
  });
  await step('2.2 bước 10 thêm 1 quyển DT001 → khung Truyện đã chọn: Doraemon - Tập 1, 1', async () => {
    page = await s.post('/doAddSelectedBook.jsp', { txtQuantity: '1', btnAddToSelectedList: '' }, { page });
    expectRow('2.2 bước 10', page, 'tblSelectedBook', 'Doraemon - Tập 1', ['1']);
  });
  await step('2.2 bước 12 tìm "Conan" → DT020 3 quyển, DT021 2', async () => {
    page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Conan', btnSearch: '' }, { page });
    const r1 = expectRow('2.2 bước 12', page, 'tblBook', 'DT020', ['Thám tử lừng danh Conan - Tập 1', 'Gosho Aoyama', 'Trinh thám', '3.000đ']);
    const r2 = expectRow('2.2 bước 12', page, 'tblBook', 'DT021', ['Thám tử lừng danh Conan - Tập 2']);
    assertEq('2.2 bước 12 số lượng DT020', page.url, '3', r1[r1.length - 1]);
    assertEq('2.2 bước 12 số lượng DT021', page.url, '2', r2[r2.length - 1]);
  });
  await step('2.2 bước 14–16 chọn DT020, thêm 1 quyển → khung có hai dòng', async () => {
    page = await s.post('/SearchBookView.jsp', { lnkChooseBook: '20' }, { page });
    expectText('2.2 bước 14', page, 'Gosho Aoyama');
    page = await s.post('/doAddSelectedBook.jsp', { txtQuantity: '1', btnAddToSelectedList: '' }, { page });
    expectRow('2.2 bước 16', page, 'tblSelectedBook', 'Doraemon - Tập 1', ['1']);
    expectRow('2.2 bước 16', page, 'tblSelectedBook', 'Thám tử lừng danh Conan - Tập 1', ['1']);
  });
  await step('2.2 bước 18 tích hai dòng, Tạo phiếu mượn → Xác nhận phiếu mượn', async () => {
    const form = new URLSearchParams({ btnCreateRentalBill: '' });
    form.append('chkSelectedBook', '1');
    form.append('chkSelectedBook', '20');
    page = await s.postParams('/SearchBookView.jsp', form, { page });
    for (const t of ['PHIẾU MƯỢN', 'Trần Minh Anh', '0912345678', '001203012345', 'minhanh.tran@gmail.com']) {
      expectText('2.2 bước 18', page, t);
    }
    expectRow('2.2 bước 18', page, 'tblRentedBook', 'Doraemon - Tập 1', ['Fujiko F. Fujio', '3.000đ', '1']);
    expectRow('2.2 bước 18', page, 'tblRentedBook', 'Thám tử lừng danh Conan - Tập 1', ['Gosho Aoyama', '3.000đ', '1']);
    assertEq('2.2 bước 18 tổng số quyển', page.url, '2', textOf(page.html, 'totalCopies'));
    assertEq('2.2 bước 18 giảm giá', page.url, '0đ', textOf(page.html, 'discount'));
  });
  const confirmFields = { txtExpectedDays: '7', txtExpectedPickupAt: isoLocal(pickup, '09:00'), txtNote: '' };
  await step('2.2 bước 20 nhập 7 ngày → mỗi đầu truyện 21.000đ, tổng tiền thuê 42.000đ', async () => {
    page = await s.post('/ConfirmRentalBillView.jsp', { ...confirmFields, btnRecalculate: '' }, { page });
    const rows = tableRows(page.html, 'tblRentedBook') ?? [];
    assertEq('2.2 bước 20 tổng từng dòng', page.url, '["21.000đ","21.000đ"]', JSON.stringify(rows.map((r) => r[r.length - 1])));
    assertEq('2.2 bước 20 tổng tiền thuê', page.url, '42.000đ', textOf(page.html, 'totalRentalPrice'));
    assertEq('C3 giữ ô số ngày', page.url, '7', valueOf(page.html, 'txtExpectedDays'));
  });
  await step('C15, §9.2: 31 ngày → EXPECTED_DAYS_TOO_LONG; 0 ngày → EXPECTED_DAYS_INVALID; hẹn quá khứ → PICKUP_TIME_INVALID; ghi chú > 255 → INPUT_TOO_LONG', async () => {
    page = await s.post('/doAddRentalBill.jsp', { ...confirmFields, txtExpectedDays: '31', btnConfirm: '' }, { page });
    expectMessage('C15', page, M.EXPECTED_DAYS_TOO_LONG);
    page = await s.post('/doAddRentalBill.jsp', { ...confirmFields, txtExpectedDays: '0', btnConfirm: '' }, { page });
    expectMessage('§9.2 số ngày 0', page, M.EXPECTED_DAYS_INVALID);
    page = await s.post('/doAddRentalBill.jsp', { ...confirmFields, txtExpectedPickupAt: isoLocal(addDays(today, -1), '09:00'), btnConfirm: '' }, { page });
    expectMessage('§9.2 hẹn quá khứ', page, M.PICKUP_TIME_INVALID);
    page = await s.post('/doAddRentalBill.jsp', { ...confirmFields, txtNote: 'x'.repeat(256), btnConfirm: '' }, { page });
    expectMessage('§6.1 ghi chú dài', page, M.INPUT_TOO_LONG);
    assertEq('§6.1 chưa có phiếu nào được tạo', '(DB)', 'null', JSON.stringify(billState(125)));
  });
  await step('2.2 bước 22 Xác nhận → PM0125 "Chờ nhận" giữ DT001-03, DT020-02, câu RENTAL_BILL_CREATED', async () => {
    page = await s.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page });
    expectMessage('2.2 bước 22', page, M.RENTAL_BILL_CREATED);
    expectId('2.2 bước 24', page, 'lnkViewRentalBill');
    const bill = billState(125);
    assertEq('2.2 bước 22 DB PM0125', '(DB)', '{"status":"Chờ nhận","cancelReason":"","barcodes":["DT001-03","DT020-02"]}', JSON.stringify(bill));
  });
  await step('§6.1 bấm Xác nhận lần hai (F5) → về ClientHomeView, không có PM0126', async () => {
    const again = await s.post('/doAddRentalBill.jsp', { ...confirmFields, btnConfirm: '' }, { page, follow: false });
    expectRedirect('§6.1 gửi lại', again, /\/ClientHomeView\.jsp$/);
    assertEq('§6.1 không ghi đôi', '(DB)', 'null', JSON.stringify(billState(126)));
  });
  await step('§6.1 mở ConfirmRentalBillView bằng URL khi session đã bỏ rentalBill → về Tìm truyện', async () => {
    expectRedirect('§6.1 Confirm trực tiếp', await s.get('/ConfirmRentalBillView.jsp', { follow: false }), /\/SearchBookView\.jsp$/);
  });
  await step('2.2 bước 24.1 Danh sách phiếu mượn: PM0125, PM0117, PM0110 (mới nhất trước)', async () => {
    page = await s.get('/RentalBillListView.jsp');
    const rows = tableRows(page.html, 'tblRentalBill') ?? [];
    assertEq('2.2 bước 24.1 thứ tự', page.url, '["PM0125","PM0117","PM0110"]', JSON.stringify(rows.map((r) => r[0])));
    const today25 = rows[0];
    if (!new RegExp(`^\\d\\d:\\d\\d ${viDate(today).replaceAll('/', '\\/')}$`).test(today25[1])) {
      throw new StepError('2.2 bước 24.1 ngày giờ tạo PM0125', page.url, `HH:mm ${viDate(today)}`, today25[1]);
    }
    assertEq('2.2 bước 24.1 PM0125', page.url, JSON.stringify([viDateTime(pickup, '09:00'), '2', '42.000đ', 'Chờ nhận']), JSON.stringify(rows[0].slice(2, 6)));
    assertEq('2.2 bước 24.1 PM0117', page.url, JSON.stringify([viDateTime(addDays(today, -1), '10:30'), viDateTime(addDays(today, 1), '18:00'), '1', '21.000đ', 'Chờ nhận']), JSON.stringify(rows[1].slice(1, 6)));
    assertEq('2.2 bước 24.1 PM0110', page.url, JSON.stringify([viDateTime(addDays(today, -9), '19:00'), viDateTime(addDays(today, -8), '10:00'), '2', '60.000đ', 'Đang cho thuê']), JSON.stringify(rows[2].slice(1, 6)));
    assertEq('2.2 bước 24.1 nút Huỷ phiếu chỉ ở phiếu Chờ nhận', page.url, '["125","117"]', JSON.stringify(buttonValues(page.html, 'lnkCancelRentalBill')));
    assertEq('2.2 bước 24.1 nút Xem chi tiết', page.url, '["125","117","110"]', JSON.stringify(buttonValues(page.html, 'lnkViewDetail')));
  });
  await step('2.2 bước 24.3 Chi tiết phiếu mượn PM0125', async () => {
    page = await s.post('/RentalBillListView.jsp', { lnkViewDetail: '125' }, { page });
    for (const t of ['PHIẾU MƯỢN PM0125', 'Trần Minh Anh', viDateTime(pickup, '09:00'), 'Chờ nhận']) expectText('2.2 bước 24.3', page, t);
    expectRow('2.2 bước 24.3', page, 'tblRentedBook', 'DT001-03', ['Doraemon - Tập 1', '3.000đ', '1', '21.000đ']);
    expectRow('2.2 bước 24.3', page, 'tblRentedBook', 'DT020-02', ['Thám tử lừng danh Conan - Tập 1', '3.000đ', '1', '21.000đ']);
    assertEq('2.2 bước 24.3 tổng số quyển', page.url, '2', textOf(page.html, 'totalCopies'));
    assertEq('2.2 bước 24.3 giảm giá', page.url, '0đ', textOf(page.html, 'discount'));
    assertEq('2.2 bước 24.3 tổng tiền thuê', page.url, '42.000đ', textOf(page.html, 'totalRentalPrice'));
  });
  await step('2.2 bước 24.4 Quay lại → Danh sách phiếu mượn (từ session)', async () => {
    page = await s.get('/RentalBillListView.jsp');
    assertEq('2.2 bước 24.4', page.url, '["PM0125","PM0117","PM0110"]', JSON.stringify((tableRows(page.html, 'tblRentalBill') ?? []).map((r) => r[0])));
  });
  await step('§6.1 id phiếu sửa tay → bỏ qua; "Huỷ phiếu" trên phiếu Đang cho thuê (sửa HTML) → không mở hộp huỷ', async () => {
    page = await s.post('/RentalBillListView.jsp', { lnkViewDetail: '999' }, { page });
    expectStatus('§6.1 phiếu lạ', page, 200);
    assertEq('§6.1 phiếu lạ', page.url, '["PM0125","PM0117","PM0110"]', JSON.stringify((tableRows(page.html, 'tblRentalBill') ?? []).map((r) => r[0])));
    page = await s.post('/RentalBillListView.jsp', { lnkCancelRentalBill: '110' }, { page });
    if (hasId(page.html, 'txtCancelReason')) throw new StepError('§6.1 huỷ phiếu đang cho thuê', page.url, 'không mở hộp huỷ cho PM0110', 'hộp huỷ mở');
  });
  await step('2.2 bước 24.6 Huỷ phiếu PM0117 → hộp xác nhận có câu, ô Lí do huỷ, Xác nhận, Huỷ', async () => {
    page = await s.post('/RentalBillListView.jsp', { lnkCancelRentalBill: '117' }, { page });
    expectText('2.2 bước 24.6', page, M.CANCEL_CONFIRM);
    for (const id of ['txtCancelReason', 'btnConfirmCancel', 'btnCloseCancel']) expectId('2.2 bước 24.6', page, id);
  });
  await step('C17 lí do huỷ chỉ có dấu cách → CANCEL_REASON_REQUIRED, hộp vẫn mở, PM0117 chưa đổi', async () => {
    page = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: '   ', from: 'client', btnConfirmCancel: '' }, { page });
    expectMessage('C17', page, M.CANCEL_REASON_REQUIRED);
    expectId('C17 hộp vẫn mở', page, 'txtCancelReason');
    assertEq('C17 DB', '(DB)', 'Chờ nhận', billState(117)?.status);
  });
  await step('2.2 bước 24.8 lí do "Đổi ý, chưa cần thuê nữa", Xác nhận → CANCEL_SUCCESS, PM0117 "Đã huỷ"', async () => {
    page = await s.post('/doCancelRentalBill.jsp', { txtCancelReason: 'Đổi ý, chưa cần thuê nữa', from: 'client', btnConfirmCancel: '' }, { page });
    expectMessage('2.2 bước 24.8', page, M.CANCEL_SUCCESS);
    const bill = billState(117);
    assertEq('2.2 bước 24.8 DB PM0117', '(DB)', '{"status":"Đã huỷ","cancelReason":"Đổi ý, chưa cần thuê nữa","barcodes":["DT020-01"]}', JSON.stringify(bill));
  });
  await step('2.2 bước 24.9 danh sách cập nhật: PM0117 "Đã huỷ", chỉ PM0125 còn nút Huỷ phiếu', async () => {
    if (!tableRows(page.html, 'tblRentalBill')) page = await s.get('/RentalBillListView.jsp');
    const rows = tableRows(page.html, 'tblRentalBill') ?? [];
    assertEq('2.2 bước 24.9 trạng thái', page.url, '["Chờ nhận","Đã huỷ","Đang cho thuê"]', JSON.stringify(rows.map((r) => r[5])));
    assertEq('2.2 bước 24.9 nút Huỷ phiếu', page.url, '["125"]', JSON.stringify(buttonValues(page.html, 'lnkCancelRentalBill')));
  });
  await step('2.2 sau huỷ: DT020-01 trở lại sẵn sàng, DT020 còn 3 quyển, DT001 còn 4 (như ch.2 2.3 ngoại lệ 11.8)', async () => {
    page = await s.get('/ClientHomeView.jsp');
    page = await s.get('/SearchBookView.jsp');
    page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Doraemon', btnSearch: '' }, { page });
    const r = rowWith('sau huỷ', page, 'tblBook', 'DT001');
    assertEq('sau huỷ số lượng DT001', page.url, '4', r[r.length - 1]);
    page = await s.post('/SearchBookView.jsp', { txtKeyword: 'Conan', btnSearch: '' }, { page });
    const c = rowWith('sau huỷ', page, 'tblBook', 'DT020');
    assertEq('sau huỷ số lượng DT020 (DT020-01 trả lại)', page.url, '3', c[c.length - 1]);
  });

  await step('C14 đăng xuất: GET doLogout 405; POST → trang chủ; sau đó ClientHomeView về LoginView', async () => {
    expectStatus('C14 GET', await s.get('/doLogout.jsp', { follow: false }), 405);
    page = await s.get('/ClientHomeView.jsp');
    const out = await s.post('/doLogout.jsp', { btnLogout: '' }, { page, follow: false });
    expectRedirect('C14 POST', out, /\/HomeView\.jsp$/);
    expectRedirect('C14 sau đăng xuất', await s.get('/ClientHomeView.jsp', { follow: false }), /\/LoginView\.jsp/);
  });
  await step('C16 session hết hạn (cookie phiên cũ) → LoginView?expired=1 có câu SESSION_EXPIRED', async () => {
    const s4 = new Session(BASE_URL);
    s4.cookies.set('JSESSIONID', 'het-han-0000000000000000');
    const r = await s4.get('/ClientHomeView.jsp', { follow: false });
    expectRedirect('C16', r, /\/LoginView\.jsp\?expired=1$/);
    const login = await s4.get(new URL(r.location, BASE_URL).pathname + '?expired=1');
    expectMessage('C16', login, M.SESSION_EXPIRED);
  });

  console.log(`[smoke] ALL PASS (${passed} bước, ${BASE_URL}, hôm nay ${isoDate(today)} Asia/Ho_Chi_Minh)`);
}

try {
  await main();
} catch (err) {
  if (err instanceof MissingStackError || err?.cause?.code === 'ECONNREFUSED') {
    console.log(`[smoke] FAIL stack E2E chưa sẵn sàng: ${err.message} → docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml up --build -d --wait`);
    process.exit(2);
  }
  console.log(`[smoke] FAIL ${err instanceof StepError ? err.message : err?.stack ?? err}`);
  process.exit(1);
}
