// Helper riêng của lane 8A2 (e2e-chon), ch.2 mục 2.2 "Khách hàng tìm và chọn truyện trực tuyến".
//
// Khách minhanh phải đăng nhập được bằng Anh@2003. Mật khẩu là băm Argon2id (D1) nên không chèn được bằng SQL thuần;
// helper đăng kí minhanh qua chính trang RegisterView → doRegister.jsp (đường thật của 2.1 bước 5–6) bằng một
// APIRequestContext riêng: không đi qua `page`, nên không chiếm thời gian vẽ trang và không lẫn console của test.
import { request, type Locator, type Page } from '@playwright/test';
import {
  BASE_URL, addDays, expect, isoDate, resetChapter2, seedChapter22Bills, sql, vnToday,
} from './test';

/** Câu mong đợi gõ tay từ docs/contracts.md §10.1 và §10.3 (không đọc Messages.java, để test còn đỏ được). */
export const M = {
  LOGIN_FAILED: 'Đăng nhập thất bại, vui lòng thử lại.',
  REGISTER_SUCCESS: 'Đăng kí tài khoản thành công!',
  BOOK_NOT_FOUND: 'Không tìm thấy thông tin phù hợp.',
  QUANTITY_EXCEEDED_5: 'Số lượng vượt quá số quyển hiện có (hiện còn 5 quyển).',
  EXPECTED_DAYS_INVALID: 'Số ngày thuê phải lớn hơn hoặc bằng 1.',
  PICKUP_TIME_INVALID: 'Ngày giờ đến nhận phải sau thời điểm hiện tại.',
  RENTAL_BILL_CREATED: 'Tạo phiếu mượn thành công! Vui lòng đến quầy vào ngày giờ đã hẹn để đặt cọc và nhận truyện.',
  CANCEL_CONFIRM: 'Bạn có chắc chắn muốn huỷ phiếu mượn này?',
  CANCEL_SUCCESS: 'Huỷ phiếu mượn thành công!',
  // §10.3 (ngoài báo cáo, chủ dự án duyệt 11/11/2026).
  QUANTITY_INVALID: 'Số lượng phải là số nguyên lớn hơn hoặc bằng 1.',
  BOOK_NOT_CHOSEN: 'Vui lòng chọn đầu truyện.',
  CANCEL_REASON_REQUIRED: 'Vui lòng nhập lí do huỷ.',
  EXPECTED_DAYS_TOO_LONG: 'Số ngày thuê tối đa là 30 ngày.',
} as const;

/** Khách của ch.2 2.1 bước 5. */
export const ANH = {
  txtFullName: 'Trần Minh Anh', txtDob: '2003-08-15', txtIdCard: '001203012345', txtPhone: '0912345678',
  txtEmail: 'minhanh.tran@gmail.com', txtAddress: 'Số 12 Trần Phú, Hà Đông, Hà Nội', txtUsername: 'minhanh',
  txtPassword: 'Anh@2003', txtConfirmPassword: 'Anh@2003',
} as const;

/** Đăng kí minhanh qua RegisterView/doRegister (có CSRF thật); ném lỗi nếu trang không báo REGISTER_SUCCESS. */
export async function registerMinhAnh(): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    const form = await ctx.get('/RegisterView.jsp');
    const csrf = /name="csrf" value="([^"]*)"/.exec(await form.text())?.[1];
    if (!csrf) throw new Error('RegisterView.jsp không có ô csrf → kiểm <t:csrf/> (docs/contracts.md §8)');
    const res = await ctx.post('/doRegister.jsp', { form: { csrf, ...ANH, btnRegister: '' } });
    const html = await res.text();
    if (!html.includes(M.REGISTER_SUCCESS)) {
      throw new Error(`đăng kí minhanh không thành công (HTTP ${res.status()}) → kiểm resetChapter2 đã xoá minhanh chưa`);
    }
  } finally {
    await ctx.dispose();
  }
}

/** Trạng thái DB trước ch.2 2.2: reset, minhanh đã đăng kí, PM0110 + PM0117 có sẵn, bộ đếm phiếu 125. */
export async function prepareChapter22(): Promise<void> {
  resetChapter2();
  await registerMinhAnh();
  seedChapter22Bills('minhanh');
}

/** Ngày giờ hẹn đến nhận của ch.2 bước 19 (09:00 25/09/2026 khi "hôm nay" là 23/09/2026) = hôm nay + 2. */
export const pickupDay = () => addDays(vnToday(), 2);

/**
 * PM0125 đúng như ch.2 bước 22–24.3 cho các ngoại lệ bước 24 (không phụ thuộc test kịch bản chuẩn): tạo 20:15 hôm nay,
 * hẹn 09:00 hôm nay + 2, 7 ngày, giữ DT001-03 và DT020-02 (giá chốt 3.000đ), sinh từ hai dòng giỏ của minhanh.
 * Kịch bản chuẩn thì tạo PM0125 bằng giao diện; ở đây chèn SQL để mỗi test bước 24 tự dựng trạng thái của nó.
 */
export function seedPM0125(): void {
  const t = vnToday();
  const copy = (b: string) => `(SELECT id FROM tblBookCopy WHERE barcode = '${b}')`;
  sql(`
SET @c = (SELECT id FROM tblUser WHERE username = 'minhanh');
SET @cart = (SELECT id FROM tblCart WHERE clientId = @c);
INSERT INTO tblSelectedBook (cartId, bookCopyId) VALUES (@cart, ${copy('DT001-03')});
SET @s1 = LAST_INSERT_ID();
INSERT INTO tblSelectedBook (cartId, bookCopyId) VALUES (@cart, ${copy('DT020-02')});
SET @s2 = LAST_INSERT_ID();
INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, borrowDate, dueDate, discount, note, status,
    cancelReason, clientId, staffId) VALUES
  (125, '${isoDate(t)} 20:15:00', '${isoDate(addDays(t, 2))} 09:00:00', 7, NULL, NULL, 0, NULL, 'Chờ nhận', NULL, @c, NULL);
INSERT INTO tblRentedBook (rentalPrice, conditionNote, rentalBillId, bookCopyId, selectedBookId) VALUES
  (3000, NULL, 125, ${copy('DT001-03')}, @s1),
  (3000, NULL, 125, ${copy('DT020-02')}, @s2);
`);
}

/** Dòng (tbody) đang hiển thị của bảng `tableId`. */
export const rows = (page: Page, tableId: string): Locator => page.locator(`#${tableId} > tbody > tr`);

/** Chữ của từng ô một dòng (đã gom khoảng trắng). Gọi sau một expect có chờ, vì hàm này không tự chờ. */
export async function cellTexts(row: Locator): Promise<string[]> {
  return (await row.locator('td').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
}

/** Dòng của khung "Truyện đã chọn" đang hiển thị (island SelectedStack, hoặc bản HTML khi island chưa gắn). */
export const selectedRows = (page: Page): Locator => page.locator('#frmSelectedBook tbody tr:visible');

/** Hộp thông báo của trang (ui:message-box, role alert hoặc status). */
export const messageBox = (page: Page): Locator => page.locator('.tt-message-box');

/**
 * Hộp thông báo đang hiện có đúng nguyên câu `text` (so cả câu, không một mẩu). Loader gắn nút "OK" vào trong hộp
 * (frontend/src/loader/message-ok.ts) nên so phần chữ ngoài nút; rồi bấm "OK" như ch.2 ("bấm nút OK của thông báo").
 */
export async function expectMessage(page: Page, text: string, { dismiss = true } = {}): Promise<void> {
  const box = messageBox(page).filter({ visible: true }).first();
  await expect.poll(() => box.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-message-ok]').forEach((b) => b.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
  }), { message: `hộp thông báo phải là nguyên câu "${text}"` }).toBe(text);
  if (!dismiss) return;
  await box.getByRole('button', { name: 'OK' }).click();
  await expect(box).toBeHidden();
}

/** Đăng nhập minhanh ở /LoginView.jsp rồi chờ giao diện chính của khách. */
export async function loginAnh(page: Page): Promise<void> {
  await page.goto('/LoginView.jsp');
  await page.locator('#txtUsername').fill('minhanh');
  await page.locator('#txtPassword').fill('Anh@2003');
  await page.locator('#btnLogin').click();
  await expect(page).toHaveURL(/\/ClientHomeView\.jsp$/);
}

/** Từ giao diện bất kì: mở "Tìm truyện" qua ClientHomeView (để SearchBookView tạo cart và rentalBill, §9.2). */
export async function openSearch(page: Page): Promise<void> {
  await page.goto('/ClientHomeView.jsp');
  await page.locator('#lnkSearchBook').click();
  await expect(page).toHaveURL(/\/SearchBookView\.jsp$/);
}

/**
 * Làm `action` (bấm nút gửi form, rời ô có data-submit-on-change…) và chờ trang mới nạp xong. Trang JSP tự gửi về
 * chính nó nên URL không đổi: chờ sự kiện điều hướng của khung chính, không chờ URL.
 */
export async function submitVia(page: Page, action: () => Promise<void>): Promise<void> {
  const navigated = page.waitForEvent('framenavigated', { predicate: (f) => f === page.mainFrame() });
  await action();
  await navigated;
  await page.waitForLoadState('load');
}

export async function search(page: Page, keyword: string): Promise<void> {
  await page.locator('#txtKeyword').fill(keyword);
  await submitVia(page, () => page.locator('#btnSearch').click());
}

/** Nhập "Số ngày thuê dự kiến" rồi rời ô: trang tự gửi lại để tính tiền (C3, data-submit-on-change). */
export async function setExpectedDays(page: Page, days: string): Promise<void> {
  const box = page.locator('#txtExpectedDays');
  if ((await box.inputValue()) === days) return;
  await box.fill(days);
  await submitVia(page, () => box.press('Tab'));
}

/** Bấm tên đầu truyện trên dòng tìm được → Chi tiết đầu truyện. */
export async function chooseBook(page: Page, bookId: number): Promise<void> {
  await page.locator(`button[name="lnkChooseBook"][value="${bookId}"]`).click();
  await expect(page).toHaveURL(/\/BookDetailView\.jsp$/);
}

/** Nhập số lượng ở Chi tiết đầu truyện và bấm "Thêm vào truyện đã chọn". */
export async function addQuantity(page: Page, quantity: string): Promise<void> {
  await page.locator('#txtQuantity').fill(quantity);
  await submitVia(page, () => page.locator('#btnAddToSelectedList').click());
}

/** Khung "Truyện đã chọn" có Doraemon - Tập 1 và Conan - Tập 1, mỗi đầu 1 quyển (ch.2 bước 6–16). */
export async function fillCartAsChapter2(page: Page): Promise<void> {
  await openSearch(page);
  await search(page, 'Doraemon');
  await chooseBook(page, 1);
  await addQuantity(page, '1');
  await expect(page).toHaveURL(/\/SearchBookView\.jsp$/);
  await search(page, 'Conan');
  await chooseBook(page, 20);
  await addQuantity(page, '1');
  await expect(page).toHaveURL(/\/SearchBookView\.jsp$/);
  await expect(selectedRows(page)).toHaveCount(2);
}

/** Tích các đầu truyện trong khung "Truyện đã chọn" rồi bấm "Tạo phiếu mượn". */
export async function createBillFromCart(page: Page, names: string[]): Promise<void> {
  const frame = page.locator('#frmSelectedBook');
  for (const name of names) await frame.getByRole('checkbox', { name: `Chọn ${name}` }).check();
  await submitVia(page, () => page.getByRole('button', { name: 'Tạo phiếu mượn' }).click());
}

/** Mở "Phiếu mượn của tôi" từ giao diện chính của khách. */
export async function openBillList(page: Page): Promise<void> {
  await page.goto('/ClientHomeView.jsp');
  await page.locator('#lnkViewRentalBill').click();
  await expect(page).toHaveURL(/\/RentalBillListView\.jsp$/);
}
