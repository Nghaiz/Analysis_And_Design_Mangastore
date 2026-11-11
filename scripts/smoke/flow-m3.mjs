#!/usr/bin/env node
// Smoke chức năng 3 (phase-07-chuc-nang-3.md bước 7.0): ch.2 mục 2.3 "Khách hàng đến nhận truyện tại quầy"
// bằng HTTP thuần trên stack E2E, sau scripts/smoke/flow-m1-m2.mjs (lượt đó để lại PM0125 "Chờ nhận" gồm
// DT001-03, DT020-02, PM0117 "Đã huỷ", PM0110 "Đang cho thuê" của khách minhanh).
//
// Chạy: node scripts/smoke/flow-m3.mjs
//   SMOKE_BASE_URL (mặc định http://127.0.0.1:8080), SMOKE_COMPOSE_PROJECT (mặc định tiemtruyen-e2e).
// Exit 0 khi mọi bước PASS; 1 khi một bước hỏng (in bước ch.2, trang, câu chờ, câu nhận); 2 khi thiếu Docker
// hoặc stack chưa chạy. Không hỏi tương tác.
//
// Dữ liệu (SQL qua sql() của lib/e2e-db.mjs, chỉ trên DB E2E; không gọi lại resetChapter2):
// - "Ố vàng", "Thẻ sinh viên" đã bị resetChapter2() của flow-m1-m2 bỏ (ngoại lệ 19, 37 ra câu "không tìm thấy").
// - Chèn PM0126 "Chờ nhận" của khach01 (quyển DT021-01) cho ngoại lệ 11 (sửa danh sách truyện), 12 (huỷ
//   tại quầy) và D9 "đã huỷ"; luồng chính trên PM0125 giữ đúng DT001-03, DT020-02 của ch.2.
import { Session, StepError, assertEq, buttonValues, clean, hasId, messageOf, tableRows, valueOf } from './lib/http.mjs';
import { BASE_URL as BASE, MissingStackError, addDays, isoDate, sql, vnToday } from './lib/e2e-db.mjs';

const NV = '/nhan-vien';

// Câu nguyên văn: docs/contracts.md §10.1 (MessagesTest giữ bản trong Java khớp từng kí tự).
const M = {
  LOGIN_FAILED: 'Đăng nhập thất bại, vui lòng thử lại.',
  QUANTITY_EXCEEDED_4: 'Số lượng vượt quá số quyển hiện có (hiện còn 4 quyển).',
  NOT_FOUND_BILL: 'Không tìm thấy phiếu mượn phù hợp.',
  CANCELLED: 'Phiếu mượn đã bị huỷ, không thể xử lí.',
  PROCESSED: 'Phiếu mượn này đã được xử lí và đã giao truyện.',
  DUE_DATE_INVALID: 'Ngày hẹn trả phải sau ngày mượn.',
  NO_COPY: 'Chưa chọn quyển truyện nào để giao cho khách hàng.',
  CONDITION_MISSING: 'Vui lòng ghi nhận tình trạng cho tất cả các quyển truyện được giao.',
  COLLATERAL_MISSING: 'Phiếu mượn chưa có khoản đặt cọc, vui lòng thêm khoản đặt cọc.',
  DAMAGE_NOT_FOUND: 'Không tìm thấy loại lỗi phù hợp.',
  DAMAGE_RECORDED: 'Lỗi này đã được ghi nhận cho quyển truyện.',
  DAMAGE_NAME_REQUIRED: 'Vui lòng nhập tên lỗi.',
  DAMAGE_EXISTS: 'Loại lỗi đã tồn tại.',
  COLLATERAL_NOT_FOUND: 'Không tìm thấy loại tài sản phù hợp.',
  COLLATERAL_VALUE_REQUIRED: 'Vui lòng nhập giá trị cho tất cả các khoản cọc.',
  COLLATERAL_NAME_REQUIRED: 'Vui lòng nhập tên loại tài sản.',
  COLLATERAL_EXISTS: 'Loại tài sản đã tồn tại.',
  CANCEL_CONFIRM: 'Bạn có chắc chắn muốn huỷ phiếu mượn này?',
  CANCEL_SUCCESS: 'Huỷ phiếu mượn thành công!',
  NO_COPY_IN_LIST: 'Chưa chọn quyển truyện nào để giao cho khách hàng.',
  // Ngoài báo cáo, chủ dự án duyệt 11/11/2026 (phase-07-edge-cases.md §1)
  DISCOUNT_INVALID: 'Giảm giá không hợp lệ, vui lòng nhập lại.',
  QUANTITY_INVALID: 'Số lượng phải là số nguyên lớn hơn hoặc bằng 1.',
  BOOK_NOT_CHOSEN: 'Vui lòng chọn đầu truyện.',
  INPUT_TOO_LONG: 'Nội dung nhập quá dài, vui lòng rút gọn.',
  RENTAL_BILL_CHANGED: 'Phiếu mượn đang mở đã thay đổi, vui lòng chọn lại phiếu.',
};
const LONG_255 = 'x'.repeat(256);
const LONG_100 = 'x'.repeat(101);

const PAGE = {
  login: `${NV}/LoginView.jsp`,
  home: `${NV}/StaffHomeView.jsp`,
  search: `${NV}/SearchRentalBillView.jsp`,
  process: `${NV}/ProcessRentalBillView.jsp`,
  editList: `${NV}/EditRentedBookListView.jsp`,
  addBook: `${NV}/AddRentedBookView.jsp`,
  doList: `${NV}/doUpdateRentedBookList.jsp`,
  condition: `${NV}/AddConditionView.jsp`,
  addDamage: `${NV}/AddDamageView.jsp`,
  doDamage: `${NV}/doAddDamage.jsp`,
  collateral: `${NV}/AddRentalCollateralView.jsp`,
  addCollateral: `${NV}/AddCollateralView.jsp`,
  doCollateral: `${NV}/doAddCollateral.jsp`,
  doConfirm: `${NV}/doUpdateRentalBill.jsp`,
  print: `${NV}/PrintRentalBillView.jsp`,
  doCancel: '/doCancelRentalBill.jsp',
  admin: `${NV}/quan-tri/ManageBookView.jsp`,
};

// ---------- tiện ích trang ----------
const text = (page) => clean(page.html);
const stepOf = (no, what) => `ch.2 2.3 ${no}: ${what}`;

function expectMessage(no, what, page, path, expected) {
  assertEq(stepOf(no, what), path, expected, messageOf(page.html) ?? '(không có .tt-message-box)');
}

function expectText(no, what, page, path, needle) {
  const t = text(page);
  const ok = needle instanceof RegExp ? needle.test(t) : t.includes(needle);
  if (!ok) throw new StepError(stepOf(no, what), path, String(needle), t.slice(0, 240));
}

function expectStatus(no, what, page, path, status) {
  assertEq(stepOf(no, what), path, status, page.status);
}

/** Giá trị các input có name cho trước; `checkedOnly` cho checkbox/radio. */
function inputValues(html, name, { checkedOnly = false } = {}) {
  const out = [];
  for (const tag of html.match(/<input\b[^>]*>/gi) ?? []) {
    const n = /\sname\s*=\s*"([^"]*)"/i.exec(tag)?.[1];
    if (n !== name) continue;
    if (checkedOnly && !/\schecked\b/i.test(tag)) continue;
    out.push(clean(/\svalue\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? ''));
  }
  return out;
}

/** POST kèm token csrf của `page`; field là mảng thì gửi nhiều giá trị cùng tên (ô trên nhiều dòng). */
function send(s, page, action, fields, { withCsrf = true, follow = true } = {}) {
  const params = new URLSearchParams();
  // Form M3 mang input ẩn rentalBillId (chống hai thẻ, phase-07-edge-cases.md §3.1): gửi lại đúng giá trị trên trang.
  const billId = valueOf(page.html, 'rentalBillId');
  if (billId !== null && !('rentalBillId' in fields)) params.append('rentalBillId', billId);
  for (const [k, v] of Object.entries(fields)) {
    for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
  }
  return s.postParams(action, params, { page, withCsrf, follow });
}

/** Cột đầu (mã) của các dòng bảng. */
function firstColumn(html, tableId) {
  return (tableRows(html, tableId) ?? []).map((r) => r[0]).filter(Boolean);
}

/** Giá trị nút `name` trên dòng có chữ `rowText` (nút trên dòng theo thứ tự dòng, C1). */
function rowButton(html, tableId, name, rowText) {
  const rows = tableRows(html, tableId) ?? [];
  const values = buttonValues(html, name);
  const i = rows.findIndex((r) => r.some((c) => c === rowText));
  return i >= 0 ? values[i] ?? null : null;
}

async function login(s, username, password, no) {
  let page = await s.get(PAGE.login);
  expectStatus(no, 'mở LoginView nhân viên', page, PAGE.login, 200);
  page = await send(s, page, PAGE.login, { txtUsername: username, txtPassword: password, btnLogin: '' });
  return page;
}

async function openBill(s, keyword, id, no) {
  let page = await s.get(PAGE.search);
  page = await send(s, page, PAGE.search, { txtKeyword: keyword, btnSearch: '' });
  page = await send(s, page, PAGE.search, { lnkChooseRentalBill: String(id) });
  expectText(no, `mở Xử lí phiếu mượn PM0${id}`, page, PAGE.process, `PHIẾU MƯỢN PM0${id}`);
  return page;
}

/** Gửi bàn quầy về chính trang (không nút: cập nhật rentalBill từ các ô, C3). */
function deskUpdate(s, page, { received, dueDate, discount = '0', note = '', extra = {} }) {
  return send(s, page, PAGE.process, { chkReceived: received, txtDueDate: dueDate, txtDiscount: discount, txtNote: note, ...extra });
}

function expectRedirect(no, what, page, path, targets) {
  const ok = page.status === 302 && targets.some((t) => String(page.location ?? '').endsWith(t));
  if (!ok) throw new StepError(stepOf(no, what), path, `302 → ${targets.join(' | ')}`, `${page.status} → ${page.location}`);
}

function deskState(page) {
  return {
    received: inputValues(page.html, 'chkReceived', { checkedOnly: true }),
    borrowDate: valueOf(page.html, 'txtBorrowDate'),
    dueDate: valueOf(page.html, 'txtDueDate'),
  };
}

// ---------- kịch bản ----------
async function main() {
  // Chuẩn bị dữ liệu
  const pm125 = sql("SELECT status FROM tblRentalBill WHERE id = 125;");
  if (pm125[0]?.[0] !== 'Chờ nhận') {
    throw new StepError('tiền điều kiện 2.3', 'DB E2E', 'PM0125 "Chờ nhận" do flow-m1-m2.mjs để lại', pm125[0]?.[0] ?? 'không có PM0125');
  }
  sql([
    'DELETE FROM tblRentedBook WHERE rentalBillId = 126;',
    'DELETE FROM tblRentalBill WHERE id = 126;',
    "INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, discount, status, clientId)" +
      " SELECT 126, NOW(), NOW() + INTERVAL 1 DAY, 3, 0, 'Chờ nhận', userId FROM tblUser WHERE username = 'khach01';",
    "INSERT INTO tblRentedBook (rentalPrice, rentalBillId, bookCopyId) SELECT 3000, 126, id FROM tblBookCopy WHERE barcode = 'DT021-01';",
  ].join('\n'));

  const a = new Session(BASE);

  // Phân quyền: chưa đăng nhập → LoginView nhân viên
  let page = await a.get(PAGE.home, { follow: false });
  expectStatus('pre', 'StaffHomeView khi chưa đăng nhập', page, PAGE.home, 302);
  if (!String(page.location).endsWith(PAGE.login)) {
    throw new StepError(stepOf('pre', 'chuyển về LoginView nhân viên'), PAGE.home, PAGE.login, page.location);
  }

  // Ngoại lệ 2: sai mật khẩu; bước 1–2: đăng nhập đúng
  page = await login(a, 'hant', 'sai-mat-khau', '2');
  expectMessage('2', 'đăng nhập sai', page, PAGE.login, M.LOGIN_FAILED);
  page = await login(a, 'hant', 'hant@123', '1');
  expectText('2', 'trang chính nhân viên', page, PAGE.home, 'Nguyễn Thu Hà');
  expectText('2', 'chức vụ', page, PAGE.home, 'Nhân viên bán hàng');
  if (!hasId(page.html, 'lnkProcessRentalBill')) throw new StepError(stepOf('2', 'nút Xử lí phiếu mượn'), PAGE.home, 'id lnkProcessRentalBill', 'không có');
  if (page.html.includes('quan-tri/')) throw new StepError(stepOf('C12', 'nhân viên thường không thấy lối vào quản trị'), PAGE.home, 'không có link quan-tri/', 'có');
  const denied = await a.get(PAGE.admin, { follow: false });
  expectStatus('D6', 'nhân viên thường vào trang quản trị', denied, PAGE.admin, 403);

  // Bước 3–4, ngoại lệ 6: tìm PM0152 rồi theo CCCD
  page = await a.get(PAGE.search);
  expectText('4', 'giao diện Tìm phiếu mượn', page, PAGE.search, 'Tìm phiếu mượn');
  page = await send(a, page, PAGE.search, { txtKeyword: 'PM0152', btnSearch: '' });
  expectMessage('6.2', 'tìm PM0152', page, PAGE.search, M.NOT_FOUND_BILL);
  page = await send(a, page, PAGE.search, { txtKeyword: '001203012345', btnSearch: '' });
  assertEq(stepOf('6.5', 'danh sách theo CCCD'), PAGE.search, ['PM0125', 'PM0117', 'PM0110'], firstColumn(page.html, 'tblRentalBill'));
  const row125 = (tableRows(page.html, 'tblRentalBill') ?? [])[0] ?? [];
  for (const cell of ['Trần Minh Anh', '0912345678', '2', 'Chờ nhận']) {
    if (!row125.includes(cell)) throw new StepError(stepOf('6.5', 'dòng PM0125'), PAGE.search, cell, row125.join(' | '));
  }
  let pick = await send(a, page, PAGE.search, { lnkChooseRentalBill: '117' });
  expectMessage('D9', 'chọn PM0117 đã huỷ', pick, PAGE.search, M.CANCELLED);
  pick = await send(a, page, PAGE.search, { lnkChooseRentalBill: '110' });
  expectMessage('D9', 'chọn PM0110 đang cho thuê', pick, PAGE.search, M.PROCESSED);

  // Bước 9–10: mở PM0125
  page = await send(a, pick, PAGE.search, { lnkChooseRentalBill: '125' });
  expectText('10', 'khung phiếu', page, PAGE.process, 'PHIẾU MƯỢN PM0125');
  for (const t of ['Trần Minh Anh', '001203012345', '0912345678', '(chưa ghi nhận)', 'Tổng số quyển thuê: 2']) {
    expectText('10', 'khung phiếu', page, PAGE.process, t);
  }
  expectText('10', 'tổng tiền thuê', page, PAGE.process, /Tổng tiền thuê:? 42\.000đ/);
  assertEq(stepOf('10', 'các quyển tích sẵn "Nhận"'), PAGE.process, ['DT001-03', 'DT020-02'], deskState(page).received);
  const today = isoDate(vnToday());
  const due = isoDate(addDays(vnToday(), 7));
  assertEq(stepOf('10', 'ngày mượn mặc định (C7)'), PAGE.process, today, deskState(page).borrowDate);
  assertEq(stepOf('10', 'ngày hẹn trả mặc định (C7)'), PAGE.process, due, deskState(page).dueDate);

  // Phiên nhân viên thứ hai mở cùng PM0125 để thử D9 "đã giao" sau khi phiên A xác nhận
  const b = new Session(BASE);
  await login(b, 'hant', 'hant@123', 'D9');
  await openBill(b, 'PM0125', 125, 'D9');
  const bEdit = await b.get(PAGE.editList);

  // Tính lại tổng khi nhập giảm giá (C3); điều kiện 4 khi sửa ngày hẹn trả
  page = await deskUpdate(a, page, { received: ['DT001-03', 'DT020-02'], dueDate: due, discount: '2000' });
  expectText('C3', 'giảm giá 2.000đ', page, PAGE.process, /Tổng tiền thuê:? 40\.000đ/);
  page = await deskUpdate(a, page, { received: ['DT001-03', 'DT020-02'], dueDate: due, discount: '0' });
  expectText('C3', 'giảm giá về 0đ', page, PAGE.process, /Tổng tiền thuê:? 42\.000đ/);
  page = await deskUpdate(a, page, { received: ['DT001-03', 'DT020-02'], dueDate: today });
  expectMessage('đk 4', 'ngày hẹn trả không sau ngày mượn', page, PAGE.process, M.DUE_DATE_INVALID);
  assertEq(stepOf('đk 4', 'giữ ngày hẹn trả cũ'), PAGE.process, due, deskState(page).dueDate);

  // Ngoài báo cáo (phase-07-edge-cases.md §3): ô nhập sai, hai thẻ, mã vạch sửa tay, session thiếu phiếu
  const both = ['DT001-03', 'DT020-02'];
  page = await deskUpdate(a, page, { received: both, dueDate: due, discount: 'abc' });
  expectMessage('EC', 'giảm giá là chữ', page, PAGE.process, M.DISCOUNT_INVALID);
  expectText('EC', 'giữ giảm giá cũ', page, PAGE.process, /Tổng tiền thuê:? 42\.000đ/);
  page = await deskUpdate(a, page, { received: both, dueDate: due, discount: '-1000' });
  expectMessage('EC', 'giảm giá âm', page, PAGE.process, M.DISCOUNT_INVALID);
  page = await deskUpdate(a, page, { received: both, dueDate: due, discount: '50000' });
  expectMessage('EC', 'giảm giá lớn hơn tổng', page, PAGE.process, M.DISCOUNT_INVALID);
  page = await deskUpdate(a, page, { received: both, dueDate: due, discount: '2.000' });
  expectText('EC', 'giảm giá viết "2.000"', page, PAGE.process, /Tổng tiền thuê:? 40\.000đ/);
  page = await deskUpdate(a, page, { received: both, dueDate: due, discount: '' });
  expectText('EC', 'giảm giá trống = 0', page, PAGE.process, /Tổng tiền thuê:? 42\.000đ/);
  page = await deskUpdate(a, page, { received: both, dueDate: '2026-02-30' });
  expectMessage('EC', 'ngày hẹn trả không có thật', page, PAGE.process, M.DUE_DATE_INVALID);
  assertEq(stepOf('EC', 'giữ ngày hẹn trả cũ'), PAGE.process, due, deskState(page).dueDate);
  page = await deskUpdate(a, page, { received: both, dueDate: due, note: LONG_255 });
  expectMessage('EC', 'ghi chú quá 255 kí tự', page, PAGE.process, M.INPUT_TOO_LONG);
  page = await deskUpdate(a, page, { received: [...both, 'DT999-99'], dueDate: due });
  assertEq(stepOf('EC', 'mã vạch sửa tay bị bỏ qua'), PAGE.process, both, deskState(page).received);
  page = await deskUpdate(a, page, { received: both, dueDate: due, discount: '1000', extra: { rentalBillId: '126' } });
  expectMessage('EC', 'form của thẻ khác (rentalBillId lệch)', page, PAGE.process, M.RENTAL_BILL_CHANGED);
  expectText('EC', 'không ghi gì khi lệch phiếu', page, PAGE.process, /Tổng tiền thuê:? 42\.000đ/);
  const d = new Session(BASE);
  await login(d, 'hant', 'hant@123', 'EC');
  expectRedirect('EC', 'mở Xử lí phiếu khi session chưa có phiếu', await d.get(PAGE.process, { follow: false }), PAGE.process, [PAGE.search]);
  expectRedirect('EC', 'mở Thêm tình trạng khi session chưa có phiếu', await d.get(PAGE.condition, { follow: false }), PAGE.condition, [PAGE.search, PAGE.process]);
  expectRedirect('EC', 'mở trang in khi session chưa có phiếu', await d.get(PAGE.print, { follow: false }), PAGE.print, [PAGE.search]);
  const dHome = await d.get(PAGE.home);
  expectRedirect('EC', 'POST doUpdateRentalBill khi session chưa có phiếu', await send(d, dHome, PAGE.doConfirm, { btnConfirm: '' }, { follow: false }), PAGE.doConfirm, [PAGE.search]);

  // Điều kiện 1: bỏ tích mọi quyển rồi xác nhận
  page = await deskUpdate(a, page, { received: [], dueDate: due });
  assertEq(stepOf('đk 1', 'bỏ tích'), PAGE.process, [], deskState(page).received);
  let confirm = await send(a, page, PAGE.doConfirm, { txtNote: '', btnConfirm: '' });
  expectMessage('đk 1', 'xác nhận khi không quyển nào được tích', confirm, PAGE.doConfirm, M.NO_COPY);
  page = await deskUpdate(a, confirm, { received: ['DT001-03', 'DT020-02'], dueDate: due });

  // Điều kiện 2: chưa ghi nhận tình trạng
  confirm = await send(a, page, PAGE.doConfirm, { chkReceived: ['DT001-03', 'DT020-02'], txtNote: '', btnConfirm: '' });
  expectMessage('đk 2', 'xác nhận khi chưa có tình trạng', confirm, PAGE.doConfirm, M.CONDITION_MISSING);

  // Bước 13–24, ngoại lệ 19: tình trạng DT001-03
  page = await send(a, confirm, PAGE.process, { lnkAddCondition: 'DT001-03' });
  expectText('14', 'Thêm tình trạng truyện', page, PAGE.condition, 'Thêm tình trạng truyện');
  expectText('14', 'mã vạch', page, PAGE.condition, 'DT001-03');
  expectText('14', 'tên đầu truyện', page, PAGE.condition, 'Doraemon - Tập 1');
  page = await send(a, page, PAGE.condition, { txtKeyword: 'Rách', btnSearch: '', txtConditionNote: '' });
  assertEq(stepOf('16', 'loại lỗi chứa "Rách"'), PAGE.condition, ['Rách bìa', 'Rách trang'], firstColumn(page.html, 'tblDamage'));
  const tornCover = rowButton(page.html, 'tblDamage', 'lnkChooseDamage', 'Rách bìa');
  page = await send(a, page, PAGE.condition, { lnkChooseDamage: tornCover, txtConditionNote: '' });
  assertEq(stepOf('18', 'Các lỗi đã ghi nhận'), PAGE.condition, ['Rách bìa'], firstColumn(page.html, 'tblRentedDamage'));
  const note1 = 'Rách nhẹ góc bìa trước';
  page = await send(a, page, PAGE.condition, { lnkChooseDamage: tornCover, txtDamageNote: [note1], txtConditionNote: '' });
  expectMessage('18', 'chọn lại Rách bìa', page, PAGE.condition, M.DAMAGE_RECORDED);
  assertEq(stepOf('17', 'giữ ghi chú đã nhập (C1)'), PAGE.condition, [note1], inputValues(page.html, 'txtDamageNote'));
  page = await send(a, page, PAGE.condition, { txtKeyword: 'Ố vàng', btnSearch: '', txtDamageNote: [note1], txtConditionNote: '' });
  expectMessage('19.1', 'tìm "Ố vàng"', page, PAGE.condition, M.DAMAGE_NOT_FOUND);
  if (!hasId(page.html, 'lnkAddDamage')) throw new StepError(stepOf('19.2', 'nút Thêm lỗi mới'), PAGE.condition, 'id lnkAddDamage', 'không có');
  page = await a.get(PAGE.addDamage);
  expectText('19.3', 'Thêm lỗi mới', page, PAGE.addDamage, 'Thêm lỗi mới');
  let dmg = await send(a, page, PAGE.doDamage, { txtName: '  ', txtDescription: '', btnSave: '' });
  expectMessage('19.4', 'tên lỗi trống', dmg, PAGE.doDamage, M.DAMAGE_NAME_REQUIRED);
  dmg = await send(a, dmg, PAGE.doDamage, { txtName: 'Rách bìa', txtDescription: 'trùng', btnSave: '' });
  expectMessage('19.4', 'tên lỗi trùng', dmg, PAGE.doDamage, M.DAMAGE_EXISTS);
  dmg = await send(a, dmg, PAGE.doDamage, { txtName: 'rach bia', txtDescription: '', btnSave: '' });
  expectMessage('EC', 'tên lỗi trùng khi khác dấu, hoa thường', dmg, PAGE.doDamage, M.DAMAGE_EXISTS);
  dmg = await send(a, dmg, PAGE.doDamage, { txtName: LONG_100, txtDescription: '', btnSave: '' });
  expectMessage('EC', 'tên lỗi quá 100 kí tự', dmg, PAGE.doDamage, M.INPUT_TOO_LONG);
  page = await send(a, dmg, PAGE.doDamage, { txtName: 'Ố vàng', txtDescription: 'Giấy bị ố vàng do để lâu', btnSave: '' });
  assertEq(stepOf('19.5', 'lỗi mới vào bảng đã ghi nhận'), PAGE.condition, ['Rách bìa', 'Ố vàng'], firstColumn(page.html, 'tblRentedDamage'));
  assertEq(stepOf('19.5', 'ghi chú dòng cũ còn nguyên'), PAGE.condition, note1, inputValues(page.html, 'txtDamageNote')[0]);
  const yellowed = rowButton(page.html, 'tblRentedDamage', 'lnkDeleteRentedDamage', 'Ố vàng');
  page = await send(a, page, PAGE.condition, { lnkDeleteRentedDamage: yellowed, txtDamageNote: [note1, 'Ố nhẹ ở 5 trang cuối'], txtConditionNote: '' });
  assertEq(stepOf('22', 'xoá lỗi Ố vàng (giữ luồng chính)'), PAGE.condition, ['Rách bìa'], firstColumn(page.html, 'tblRentedDamage'));
  page = await send(a, page, PAGE.condition, { txtKeyword: 'Vết bẩn', btnSearch: '', txtDamageNote: [note1], txtConditionNote: '' });
  assertEq(stepOf('20', 'loại lỗi chứa "Vết bẩn"'), PAGE.condition, ['Vết bẩn, viết vẽ'], firstColumn(page.html, 'tblDamage'));
  const stain = rowButton(page.html, 'tblDamage', 'lnkChooseDamage', 'Vết bẩn, viết vẽ');
  page = await send(a, page, PAGE.condition, { lnkChooseDamage: stain, txtDamageNote: [note1], txtConditionNote: '' });
  const note2 = 'Vết bút chì ở trang 12';
  assertEq(stepOf('22', 'bảng Các lỗi đã ghi nhận'), PAGE.condition, ['Rách bìa', 'Vết bẩn, viết vẽ'], firstColumn(page.html, 'tblRentedDamage'));
  page = await send(a, page, PAGE.condition, { btnSave: '', txtDamageNote: [note1, note2], txtConditionNote: '' });
  expectText('24', 'tình trạng DT001-03', page, PAGE.process, 'Rách bìa, Vết bẩn, viết vẽ');

  // Bước 25–28: DT020-02 không có lỗi
  page = await send(a, page, PAGE.process, { lnkAddCondition: 'DT020-02' });
  assertEq(stepOf('26', 'bảng lỗi rỗng'), PAGE.condition, [], firstColumn(page.html, 'tblRentedDamage'));
  page = await send(a, page, PAGE.condition, { btnSave: '', txtConditionNote: LONG_255 });
  expectMessage('EC', 'ghi chú tình trạng quá 255 kí tự', page, PAGE.condition, M.INPUT_TOO_LONG);
  page = await send(a, page, PAGE.condition, { btnSave: '', txtConditionNote: 'Truyện còn mới, không có lỗi' });
  expectText('28', 'tình trạng DT020-02', page, PAGE.process, 'Không có lỗi');

  // Điều kiện 3: chưa có khoản cọc
  confirm = await send(a, page, PAGE.doConfirm, { chkReceived: ['DT001-03', 'DT020-02'], txtNote: '', btnConfirm: '' });
  expectMessage('đk 3', 'xác nhận khi chưa có khoản cọc', confirm, PAGE.doConfirm, M.COLLATERAL_MISSING);

  // Bước 31–42, ngoại lệ 37: khoản cọc
  page = await a.get(PAGE.collateral);
  expectText('32', 'Thêm khoản đặt cọc', page, PAGE.collateral, 'Thêm khoản đặt cọc');
  page = await send(a, page, PAGE.collateral, { txtKeyword: 'Căn cước', btnSearch: '' });
  assertEq(stepOf('34', 'loại tài sản chứa "Căn cước"'), PAGE.collateral, ['Căn cước công dân'], firstColumn(page.html, 'tblCollateral'));
  page = await send(a, page, PAGE.collateral, { lnkChooseCollateral: rowButton(page.html, 'tblCollateral', 'lnkChooseCollateral', 'Căn cước công dân') });
  let save = await send(a, page, PAGE.collateral, { btnSave: '', txtCollateralValue: [''], txtCollateralNote: [''] });
  expectMessage('42', 'lưu khi chưa nhập giá trị', save, PAGE.collateral, M.COLLATERAL_VALUE_REQUIRED);
  save = await send(a, save, PAGE.collateral, { btnSave: '', txtCollateralValue: ['   '], txtCollateralNote: [''] });
  expectMessage('EC', 'giá trị cọc toàn dấu cách', save, PAGE.collateral, M.COLLATERAL_VALUE_REQUIRED);
  save = await send(a, save, PAGE.collateral, { btnSave: '', txtCollateralValue: [LONG_100], txtCollateralNote: [''] });
  expectMessage('EC', 'giá trị cọc quá 100 kí tự', save, PAGE.collateral, M.INPUT_TOO_LONG);
  const v1 = ['001203012345'];
  const n1 = ['Giữ bản gốc'];
  page = await send(a, save, PAGE.collateral, { txtKeyword: 'Tiền mặt', btnSearch: '', txtCollateralValue: v1, txtCollateralNote: n1 });
  page = await send(a, page, PAGE.collateral, { lnkChooseCollateral: rowButton(page.html, 'tblCollateral', 'lnkChooseCollateral', 'Tiền mặt'), txtCollateralValue: v1, txtCollateralNote: n1 });
  const v2 = ['001203012345', '100.000đ'];
  const n2 = ['Giữ bản gốc', 'Cọc tiền mặt'];
  page = await send(a, page, PAGE.collateral, { txtKeyword: 'Thẻ sinh viên', btnSearch: '', txtCollateralValue: v2, txtCollateralNote: n2 });
  expectMessage('37.1', 'tìm "Thẻ sinh viên"', page, PAGE.collateral, M.COLLATERAL_NOT_FOUND);
  assertEq(stepOf('35', 'giữ giá trị đã nhập (C1)'), PAGE.collateral, v2, inputValues(page.html, 'txtCollateralValue'));
  page = await a.get(PAGE.addCollateral);
  expectText('37.3', 'Thêm loại tài sản mới', page, PAGE.addCollateral, 'Thêm loại tài sản mới');
  let col = await send(a, page, PAGE.doCollateral, { txtName: '', txtDescription: '', btnSave: '' });
  expectMessage('37.4', 'tên loại tài sản trống', col, PAGE.doCollateral, M.COLLATERAL_NAME_REQUIRED);
  col = await send(a, col, PAGE.doCollateral, { txtName: 'Tiền mặt', txtDescription: 'trùng', btnSave: '' });
  expectMessage('37.4', 'tên loại tài sản trùng', col, PAGE.doCollateral, M.COLLATERAL_EXISTS);
  page = await send(a, col, PAGE.doCollateral, { txtName: 'Thẻ sinh viên', txtDescription: 'Giữ bản gốc thẻ sinh viên còn hạn sử dụng', btnSave: '' });
  const rows3 = (tableRows(page.html, 'tblRentalCollateral') ?? []).map((r) => r[1]);
  assertEq(stepOf('37.5', 'ba khoản cọc'), PAGE.collateral, ['Căn cước công dân', 'Tiền mặt', 'Thẻ sinh viên'], rows3);
  page = await send(a, page, PAGE.collateral, { lnkDeleteRentalCollateral: '3', txtCollateralValue: [...v2, 'B23DCCN001'], txtCollateralNote: [...n2, 'Giữ thẻ bản gốc'] });
  assertEq(stepOf('40', 'bảng Các khoản cọc'), PAGE.collateral, v2, inputValues(page.html, 'txtCollateralValue'));
  page = await send(a, page, PAGE.collateral, { btnSave: '', txtCollateralValue: v2, txtCollateralNote: n2 });
  expectText('42', 'khoản cọc trên phiếu', page, PAGE.process, 'Căn cước công dân');
  expectText('42', 'khoản cọc trên phiếu', page, PAGE.process, '100.000đ');

  // CSRF và method (C2)
  const noToken = await send(a, page, PAGE.doConfirm, { chkReceived: ['DT001-03', 'DT020-02'], btnConfirm: '' }, { withCsrf: false, follow: false });
  expectStatus('CSRF', 'POST thiếu token', noToken, PAGE.doConfirm, 403);
  const viaGet = await a.get(PAGE.doConfirm, { follow: false });
  expectStatus('C2', 'GET doUpdateRentalBill', viaGet, PAGE.doConfirm, 405);

  // Bước 45–46: xác nhận và in
  page = await a.get(PAGE.process);
  page = await send(a, page, PAGE.doConfirm, { chkReceived: ['DT001-03', 'DT020-02'], txtNote: '', btnConfirm: '' });
  expectText('46', 'Xác nhận phiếu mượn', page, PAGE.print, 'PHIẾU MƯỢN PM0125');
  for (const t of ['Nhân viên xử lí: Nguyễn Thu Hà', 'Rách bìa, Vết bẩn, viết vẽ', 'Không có lỗi', 'Cọc tiền mặt', 'Giữ bản gốc', 'Tổng số quyển thuê: 2']) {
    expectText('46', 'phiếu đã hoàn thiện', page, PAGE.print, t);
  }
  expectText('46', 'giảm giá', page, PAGE.print, /Giảm giá:? 0đ/);
  expectText('46', 'tổng tiền thuê', page, PAGE.print, /Tổng tiền thuê:? 42\.000đ/);
  assertEq(stepOf('46', 'các quyển đã nhận'), PAGE.print, ['DT001-03', 'DT020-02'], (tableRows(page.html, 'tblRentedBook') ?? []).map((r) => r.find((c) => /^DT\d{3}-\d{2}$/.test(c))));
  if (!hasId(page.html, 'btnPrint')) throw new StepError(stepOf('46', 'nút In phiếu'), PAGE.print, 'id btnPrint', 'không có');
  const db = sql([
    "SELECT b.status, u.fullName, b.borrowDate, b.dueDate, b.discount FROM tblRentalBill b JOIN tblUser u ON u.id = b.staffId WHERE b.id = 125;",
  ].join('\n'))[0] ?? [];
  assertEq(stepOf('46', 'DB: trạng thái, nhân viên, ngày, giảm giá'), 'tblRentalBill', ['Đang cho thuê', 'Nguyễn Thu Hà', today, due, '0'], db);
  const conds = sql("SELECT c.barcode, r.conditionNote, (SELECT GROUP_CONCAT(d.name ORDER BY rd.id SEPARATOR ', ') FROM tblRentedDamage rd JOIN tblDamage d ON d.id = rd.damageId WHERE rd.rentedBookId = r.id) FROM tblRentedBook r JOIN tblBookCopy c ON c.id = r.bookCopyId WHERE r.rentalBillId = 125 ORDER BY c.barcode;");
  assertEq(stepOf('46', 'DB: tình trạng từng quyển'), 'tblRentedBook', [['DT001-03', '', 'Rách bìa, Vết bẩn, viết vẽ'], ['DT020-02', 'Truyện còn mới, không có lỗi', 'NULL']], conds);
  const cols = sql("SELECT c.name, rc.value, rc.note FROM tblRentalCollateral rc JOIN tblCollateral c ON c.id = rc.collateralId WHERE rc.rentalBillId = 125 ORDER BY rc.id;");
  assertEq(stepOf('46', 'DB: khoản cọc'), 'tblRentalCollateral', [['Căn cước công dân', '001203012345', 'Giữ bản gốc'], ['Tiền mặt', '100.000đ', 'Cọc tiền mặt']], cols);
  const again = await a.get(PAGE.print);
  expectText('EC', 'F5 trang in (PRG) không ghi lại', again, PAGE.print, 'PHIẾU MƯỢN PM0125');
  const resend = await send(a, page, PAGE.doConfirm, { chkReceived: ['DT001-03', 'DT020-02'], txtNote: '', btnConfirm: '', rentalBillId: '125' });
  expectMessage('EC', 'Back rồi gửi lại xác nhận', resend, PAGE.doConfirm, M.PROCESSED);
  const backView = await a.get(PAGE.process);
  expectMessage('EC', 'mở lại Xử lí phiếu đã giao', backView, PAGE.process, M.PROCESSED);
  const printed = await send(a, again, PAGE.home, { btnPrint: '' });
  expectText('48', '"In phiếu" về trang chính nhân viên (không JS)', printed, PAGE.home, 'Trang chủ nhân viên');

  // D9 "đã giao": phiên B vẫn giữ PM0125 "Chờ nhận" cũ, lưu danh sách truyện sau khi A đã giao
  const bSave = await send(b, bEdit, PAGE.doList, { btnSave: '' });
  expectMessage('D9', 'phiên khác lưu phiếu đã giao', bSave, PAGE.doList, M.PROCESSED);

  // Ngoại lệ 12 trên PM0126 và D9 "đã huỷ": phiên C mở PM0126 trước, A huỷ tại quầy
  const c = new Session(BASE);
  await login(c, 'hant', 'hant@123', 'D9');
  await openBill(c, 'PM0126', 126, 'D9');
  const cEdit = await c.get(PAGE.editList);
  page = await openBill(a, 'PM0126', 126, '11');

  // Ngoại lệ 11 (trên PM0126 để luồng chính PM0125 giữ DT001-03, DT020-02): bỏ quyển, thêm Doraemon tập 2
  page = await a.get(PAGE.editList);
  assertEq(stepOf('11.2', 'Chỉnh sửa danh sách truyện'), PAGE.editList, ['DT021-01'], firstColumn(page.html, 'tblRentedBook'));
  page = await send(a, page, PAGE.editList, { lnkDeleteRentedBook: 'DT021-01' });
  assertEq(stepOf('11.4', 'xoá DT021-01'), PAGE.editList, [], firstColumn(page.html, 'tblRentedBook'));
  const emptySave = await send(a, page, PAGE.doList, { btnSave: '' });
  expectMessage('EC', 'lưu danh sách rỗng', emptySave, PAGE.doList, M.NO_COPY_IN_LIST);
  page = await a.get(PAGE.addBook);
  expectText('11.6', 'Thêm truyện vào phiếu mượn', page, PAGE.addBook, 'Thêm truyện vào phiếu mượn');
  page = await send(a, page, PAGE.addBook, { txtKeyword: 'Doraemon', btnSearch: '' });
  const books = tableRows(page.html, 'tblBook') ?? [];
  assertEq(stepOf('11.8', 'mã đầu truyện tìm "Doraemon"'), PAGE.addBook, ['DT001', 'DT002', 'DT015'], books.map((r) => r.find((cell) => /^DT\d{3}$/.test(cell))));
  assertEq(stepOf('11.8', 'số lượng hiện có'), PAGE.addBook, ['4', '4', '2'], books.map((r) => r[r.length - 1]));
  let bad = await send(a, page, PAGE.addBook, { txtQuantity: '1', btnAddToRentalBill: '' });
  expectMessage('EC', 'chưa chọn đầu truyện', bad, PAGE.addBook, M.BOOK_NOT_CHOSEN);
  for (const q of ['0', '-1', '1.5', 'abc', '']) {
    bad = await send(a, bad, PAGE.addBook, { lnkChooseBook: '2', txtQuantity: q, btnAddToRentalBill: '' });
    expectMessage('EC', `số lượng "${q}"`, bad, PAGE.addBook, M.QUANTITY_INVALID);
  }
  const add = await send(a, bad, PAGE.addBook, { lnkChooseBook: '2', txtQuantity: '5', btnAddToRentalBill: '' });
  expectMessage('11.10', 'số lượng vượt quá', add, PAGE.addBook, M.QUANTITY_EXCEEDED_4);
  page = await send(a, add, PAGE.addBook, { lnkChooseBook: '2', txtQuantity: '1', btnAddToRentalBill: '' });
  assertEq(stepOf('11.10', 'gán DT002-01'), PAGE.editList, ['DT002-01'], firstColumn(page.html, 'tblRentedBook'));
  page = await send(a, page, PAGE.doList, { btnSave: '' });
  expectText('11.12', 'quay về Xử lí phiếu mượn', page, PAGE.process, 'PHIẾU MƯỢN PM0126');
  assertEq(stepOf('11.12', 'quyển của phiếu'), PAGE.process, ['DT002-01'], deskState(page).received);
  const held = sql("SELECT c.barcode FROM tblRentedBook r JOIN tblBookCopy c ON c.id = r.bookCopyId WHERE r.rentalBillId = 126;").map((r) => r[0]);
  assertEq(stepOf('11.12', 'DB giữ DT002-01, bỏ DT021-01'), 'tblRentedBook', ['DT002-01'], held);

  // Ngoại lệ 12: huỷ tại quầy
  page = await send(a, page, PAGE.process, { btnCancel: '', chkReceived: ['DT002-01'] });
  expectText('12.2', 'hộp xác nhận huỷ', page, PAGE.process, M.CANCEL_CONFIRM);
  assertEq(stepOf('12.2', 'input from=staff (C8)'), PAGE.process, 'staff', valueOf(page.html, 'from'));
  page = await send(a, page, PAGE.doCancel, { txtCancelReason: 'Khách không đồng ý với tình trạng quyển DT001-03', from: 'staff', btnConfirmCancel: '' });
  expectMessage('12.4', 'huỷ tại quầy', page, PAGE.doCancel, M.CANCEL_SUCCESS);
  expectText('12.5', 'quay về Tìm phiếu mượn', page, PAGE.search, 'Tìm phiếu mượn');
  const cancelled = sql("SELECT status, cancelReason FROM tblRentalBill WHERE id = 126;")[0] ?? [];
  assertEq(stepOf('12.4', 'DB: PM0126 đã huỷ kèm lí do'), 'tblRentalBill', ['Đã huỷ', 'Khách không đồng ý với tình trạng quyển DT001-03'], cancelled);
  const cSave = await send(c, cEdit, PAGE.doList, { btnSave: '' });
  expectMessage('D9', 'phiên khác lưu phiếu đã huỷ', cSave, PAGE.doList, M.CANCELLED);

  // D6: quản lí thấy lối vào và mở được trang quản trị
  const q = new Session(BASE);
  page = await login(q, 'quanli', 'quanli@123', 'D6');
  if (!page.html.includes('quan-tri/ManageBookView.jsp')) throw new StepError(stepOf('C12', 'lối vào quản trị của Quản lí'), PAGE.home, 'link quan-tri/ManageBookView.jsp', 'không có');
  const admin = await q.get(PAGE.admin);
  expectStatus('D6', 'Quản lí mở ManageBookView', admin, PAGE.admin, 200);

  return 'kịch bản 2.3, ngoại lệ 2, 6, 11, 12, 19, 37, bốn điều kiện, D9, D6, edge case §3';
}

try {
  const note = await main();
  console.log(`[smoke] PASS flow-m3 (${note})`);
  process.exit(0);
} catch (err) {
  if (err instanceof MissingStackError) {
    console.log(`[smoke] FAIL flow-m3: ${err.message}`);
    process.exit(2);
  }
  console.log(`[smoke] FAIL flow-m3: ${err instanceof StepError ? err.message : err?.stack ?? err}`);
  process.exit(1);
}
