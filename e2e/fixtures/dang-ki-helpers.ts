// Helper riêng của lane 8A1 e2e-dang-ki (phase-08-integration.md §2: tiền tố dang-ki-). Chỉ 01-dang-ki.spec.ts dùng.
//
// Câu mong đợi chép tay từ docs/contracts.md §10.1 và §10.3 (không sinh từ Messages.java, để test đỏ được khi app
// đổi chữ). Dữ liệu khách lấy nguyên văn ch.2 mục 2.1 bước 5 (trang in 5); giá trị không có trong ch.2 ghi rõ.
import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** docs/contracts.md §10.1, §10.3: nguyên câu, NFC. */
export const MSG = {
  REGISTER_SUCCESS: 'Đăng kí tài khoản thành công!',
  REGISTER_DUPLICATE: 'Tên đăng nhập, số CCCD, số điện thoại hoặc email đã được sử dụng, vui lòng kiểm tra lại.',
  REGISTER_INVALID: 'Thông tin không hợp lệ, vui lòng kiểm tra lại.',
  REGISTER_PASSWORD_MISMATCH: 'Mật khẩu nhập lại không khớp, vui lòng nhập lại.',
  LOGIN_FAILED: 'Đăng nhập thất bại, vui lòng thử lại.',
} as const;

/** 9 ô của RegisterView theo thứ tự ch.2 bước 4 (docs/contracts.md §9.2 RegisterView). */
export const REGISTER_FIELDS = [
  'txtFullName', 'txtDob', 'txtIdCard', 'txtPhone', 'txtEmail', 'txtAddress', 'txtUsername', 'txtPassword',
  'txtConfirmPassword',
] as const;
export type RegisterForm = Record<(typeof REGISTER_FIELDS)[number], string>;

/** Khách Trần Minh Anh, ch.2 2.1 bước 5. txtDob gửi dạng yyyy-MM-dd (input type=date, phase-06-integration.md §3). */
export const ANH: RegisterForm = {
  txtFullName: 'Trần Minh Anh',
  txtDob: '2003-08-15',
  txtIdCard: '001203012345',
  txtPhone: '0912345678',
  txtEmail: 'minhanh.tran@gmail.com',
  txtAddress: 'Số 12 Trần Phú, Hà Đông, Hà Nội',
  txtUsername: 'minhanh',
  txtPassword: 'Anh@2003',
  txtConfirmPassword: 'Anh@2003',
};

/**
 * "Một khách hàng khác" đã giữ tên đăng nhập minhanh (ch.2 2.1 ngoại lệ 6). ch.2 không ghi thông tin người này:
 * giá trị thử của test, khác Anh ở CCCD, điện thoại, email để ngoại lệ 6.3 chỉ đổi tên đăng nhập là thành công.
 */
export const OTHER_MINHANH: RegisterForm = {
  ...ANH,
  txtFullName: 'Lê Minh Anh',
  txtDob: '1999-01-20',
  txtIdCard: '001199099999',
  txtPhone: '0987000111',
  txtEmail: 'le.minhanh@gmail.com',
  txtAddress: 'Số 3 Láng Hạ, Đống Đa, Hà Nội',
  txtPassword: 'Khac@1999',
  txtConfirmPassword: 'Khac@1999',
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Hộp thông báo hiện đúng NGUYÊN câu (docs/contracts.md §8). Loader gắn nút "OK" vào trong hộp
 * (frontend/src/loader/message-ok.ts) nên chữ của hộp là "<câu>OK": regex neo hai đầu, phần chữ là nguyên câu.
 */
export async function expectMessage(page: Page, sentence: string) {
  const box = page.locator('.tt-message-box');
  await expect(box).toHaveCount(1);
  await expect(box).toHaveText(new RegExp(`^${escapeRe(sentence)}\\s*OK$`));
}

/** Bấm "OK" của hộp thông báo (ch.2 bước 7, 6.1, 10.1): hộp ẩn đi. */
export async function pressOk(page: Page) {
  const box = page.locator('.tt-message-box');
  await box.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(box).toBeHidden();
}

/** Điền 9 ô của RegisterView (ô ngày nhận yyyy-MM-dd). */
export async function fillRegister(page: Page, form: RegisterForm) {
  for (const id of REGISTER_FIELDS) await page.locator(`#${id}`).fill(form[id]);
}

/** Giao diện "Đăng kí tài khoản" (ch.2 bước 4): tiêu đề, 9 ô, nút "Đăng kí". */
export async function expectRegisterView(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Đăng kí tài khoản');
  for (const id of REGISTER_FIELDS) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator('#btnRegister')).toHaveText('Đăng kí');
}

/** Giao diện "Đăng nhập" (ch.2 bước 8): tiêu đề, ô tên đăng nhập, mật khẩu, nút "Đăng nhập". */
export async function expectLoginView(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Đăng nhập');
  await expect(page.locator('#txtUsername')).toBeVisible();
  await expect(page.locator('#txtPassword')).toBeVisible();
  await expect(page.locator('#btnLogin')).toHaveText('Đăng nhập');
}

/** Giao diện chính của khách (ch.2 bước 10): "Họ và tên: …", nút "Tìm và thuê truyện", "Phiếu mượn của tôi". */
export async function expectClientHome(page: Page, fullName: string) {
  await expect(page).toHaveURL(/\/ClientHomeView\.jsp$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trang chủ khách hàng');
  await expect(page.getByText(/^Họ và tên:/)).toHaveText(`Họ và tên: ${fullName}`);
  await expect(page.locator('#lnkSearchBook')).toHaveText('Tìm và thuê truyện');
  await expect(page.locator('#lnkViewRentalBill')).toHaveText('Phiếu mượn của tôi');
}

/** Đăng nhập trên giao diện đang mở (không goto, đúng ch.2 bước 9 / 10.3). */
export async function submitLogin(page: Page, username: string, password: string) {
  await page.locator('#txtUsername').fill(username);
  await page.locator('#txtPassword').fill(password);
  await page.locator('#btnLogin').click();
}

/**
 * Đăng kí một tài khoản bằng HTTP (điều kiện trước của test, không phải bước đang kiểm): GET RegisterView lấy token
 * CSRF rồi POST doRegister. Dùng APIRequestContext riêng (cookie riêng), không đụng trang đang canh console.
 */
export async function registerViaHttp(request: APIRequestContext, form: RegisterForm) {
  const view = await request.get('/RegisterView.jsp');
  expect(view.status()).toBe(200);
  const csrf = /name="csrf" value="([^"]+)"/.exec(await view.text())?.[1];
  expect(csrf, 'RegisterView có input ẩn csrf').toBeTruthy();
  const res = await request.post('/doRegister.jsp', { form: { ...form, csrf: csrf!, btnRegister: '' } });
  expect(res.status()).toBe(200);
  expect(await res.text(), `đăng kí ${form.txtUsername} để dựng điều kiện trước`).toContain(MSG.REGISTER_SUCCESS);
}
