// E2E ch.2 mục 2.1 "Khách hàng đăng kí" (báo cáo trang in 5–6; skill tiem-write-e2e-chapter2; lane 8A1).
// Một test cho kịch bản chuẩn, một test cho TỪNG ngoại lệ (6, 10), cộng các trường hợp M1 ngoài báo cáo của
// plans/261111-tiem-thue-truyen/phase-06-integration.md §6.1. Mỗi test tự đặt lại DB (resetChapter2) trong beforeEach.
// Console và network sạch do fixture guard canh (e2e/fixtures/test.ts).
import { test, expect, resetChapter2, sql, vnToday, addDays, isoDate } from '../fixtures/test';
import {
  ANH, OTHER_MINHANH, MSG, REGISTER_FIELDS, expectMessage, pressOk, fillRegister, expectRegisterView, expectLoginView,
  expectClientHome, submitLogin, registerViaHttp, type RegisterForm,
} from '../fixtures/dang-ki-helpers';

/** Tài khoản khách trong DB theo tên đăng nhập (TSV: fullName, dob, idCard, phone, email, address); không có → ''. */
const clientRow = (username: string) => sql(`SELECT u.fullName, c.dob, c.idCard, c.phone, c.email, c.address
FROM tblUser u JOIN tblClient c ON c.userId = u.id WHERE u.username = '${username}';`);
const countUser = (username: string) => Number(sql(`SELECT COUNT(*) FROM tblUser WHERE username = '${username}';`));

test.beforeEach(() => {
  resetChapter2();
});

test.describe('2.1 Khách hàng đăng kí', () => {
  test('kịch bản chuẩn bước 1–10: Anh đăng kí minhanh rồi đăng nhập', async ({ page }) => {
    // Bước 1–2: Trang chủ có lời chào, nút "Đăng nhập", "Đăng kí".
    await page.goto('/HomeView.jsp');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trang chủ');
    await expect(page.getByText('Chào mừng bạn đến với cửa hàng cho thuê truyện!', { exact: true })).toBeVisible();
    await expect(page.locator('#lnkLogin')).toHaveText('Đăng nhập');
    await expect(page.locator('#lnkRegister')).toHaveText('Đăng kí');

    // Bước 3–4: bấm "Đăng kí" → giao diện "Đăng kí tài khoản", 9 ô ban đầu rỗng.
    await page.locator('#lnkRegister').click();
    await expect(page).toHaveURL(/\/RegisterView\.jsp$/);
    await expectRegisterView(page);
    for (const id of REGISTER_FIELDS) await expect(page.locator(`#${id}`)).toHaveValue('');

    // Bước 5–6: nhập thông tin của Anh, bấm "Đăng kí" → "Đăng kí tài khoản thành công!".
    await fillRegister(page, ANH);
    await page.locator('#btnRegister').click();
    await expectMessage(page, MSG.REGISTER_SUCCESS);
    expect(clientRow('minhanh')).toBe(
      'Trần Minh Anh\t2003-08-15\t001203012345\t0912345678\tminhanh.tran@gmail.com\tSố 12 Trần Phú, Hà Đông, Hà Nội',
    );
    // Mật khẩu lưu dạng băm Argon2id, không bao giờ là chuỗi thô (D1).
    expect(sql("SELECT password FROM tblUser WHERE username = 'minhanh';")).toMatch(/^\$argon2id\$/);

    // Bước 7–8: bấm "OK" → giao diện "Đăng nhập" (ô tên đăng nhập, mật khẩu, nút "Đăng nhập").
    await pressOk(page);
    await expectLoginView(page);

    // Bước 9–10: đăng nhập minhanh / Anh@2003 → giao diện chính "Họ và tên: Trần Minh Anh".
    await submitLogin(page, 'minhanh', 'Anh@2003');
    await expectClientHome(page, 'Trần Minh Anh');
  });

  test('ngoại lệ 6–6.4: minhanh đã có người dùng, giữ thông tin, đổi thành minhanh2003', async ({ page, request }) => {
    // Điều kiện: một khách hàng khác đã giữ tên đăng nhập minhanh.
    await registerViaHttp(request, OTHER_MINHANH);

    await page.goto('/HomeView.jsp');
    await page.locator('#lnkRegister').click();
    await expectRegisterView(page);
    await fillRegister(page, ANH);
    await page.locator('#btnRegister').click();

    // Ngoại lệ 6: thông báo trùng, không tạo tài khoản thứ hai.
    await expectMessage(page, MSG.REGISTER_DUPLICATE);
    expect(countUser('minhanh')).toBe(1);
    expect(clientRow('minhanh').split('\t')[0]).toBe('Lê Minh Anh');

    // 6.1–6.2: bấm "OK" → về "Đăng kí tài khoản", giữ nguyên các thông tin đã nhập. Hai ô mật khẩu luôn để trống
    // (docs/contracts.md §9.2 RegisterView, C5: không giữ mật khẩu trong session).
    await pressOk(page);
    await expectRegisterView(page);
    for (const id of REGISTER_FIELDS.filter((f) => f !== 'txtPassword' && f !== 'txtConfirmPassword')) {
      await expect(page.locator(`#${id}`)).toHaveValue(ANH[id]);
    }
    await expect(page.locator('#txtPassword')).toHaveValue('');
    await expect(page.locator('#txtConfirmPassword')).toHaveValue('');

    // 6.3: đổi tên đăng nhập thành minhanh2003 (gõ lại hai ô mật khẩu vì chúng trống), bấm "Đăng kí".
    await page.locator('#txtUsername').fill('minhanh2003');
    await page.locator('#txtPassword').fill(ANH.txtPassword);
    await page.locator('#txtConfirmPassword').fill(ANH.txtConfirmPassword);
    await page.locator('#btnRegister').click();

    // 6.4: lưu tài khoản, "Đăng kí tài khoản thành công!", đi tiếp từ bước 7 với minhanh2003.
    await expectMessage(page, MSG.REGISTER_SUCCESS);
    expect(clientRow('minhanh2003').split('\t')[0]).toBe('Trần Minh Anh');
    await pressOk(page);
    await expectLoginView(page);
    await submitLogin(page, 'minhanh2003', 'Anh@2003');
    await expectClientHome(page, 'Trần Minh Anh');
  });

  test('ngoại lệ 10–10.4: đăng nhập sai, bấm OK, đăng nhập lại đúng', async ({ page, request }) => {
    // Điều kiện: Anh đã đăng kí xong (bước 1–8).
    await registerViaHttp(request, ANH);
    await page.goto('/LoginView.jsp');
    await expectLoginView(page);

    // Ngoại lệ 10: sai username/password (ch.2 không ghi giá trị sai; test gõ sai hoa thường của mật khẩu).
    await submitLogin(page, 'minhanh', 'anh@2003');
    await expectMessage(page, MSG.LOGIN_FAILED);

    // 10.1–10.2: bấm "OK" → vẫn ở giao diện "Đăng nhập".
    await pressOk(page);
    await expectLoginView(page);
    await expect(page).not.toHaveURL(/ClientHomeView/);

    // 10.3–10.4: đăng nhập lại minhanh / Anh@2003 → giao diện chính của khách.
    await submitLogin(page, 'minhanh', 'Anh@2003');
    await expectClientHome(page, 'Trần Minh Anh');
  });
});

test.describe('2.1 ngoài báo cáo (phase-06-integration.md §6.1 M1, docs/contracts.md §14 C4)', () => {
  const tomorrow = () => isoDate(addDays(vnToday(), 1));
  const today = () => isoDate(vnToday());
  // Mỗi dòng: một ô sai định dạng (C4) → REGISTER_INVALID, ở lại RegisterView, không tạo tài khoản.
  const invalidCases: { name: string; patch: () => Partial<RegisterForm> }[] = [
    { name: 'họ và tên trống', patch: () => ({ txtFullName: '   ' }) },
    { name: 'CCCD không đủ 12 chữ số', patch: () => ({ txtIdCard: '12345' }) },
    { name: 'điện thoại 9 chữ số', patch: () => ({ txtPhone: '091234567' }) },
    { name: 'điện thoại không bắt đầu bằng 0', patch: () => ({ txtPhone: '9912345678' }) },
    { name: 'email không có @', patch: () => ({ txtEmail: 'minhanh.tran.gmail.com' }) },
    { name: 'địa chỉ trống', patch: () => ({ txtAddress: '' }) },
    { name: 'tên đăng nhập có khoảng trắng', patch: () => ({ txtUsername: 'minh anh' }) },
    { name: 'tên đăng nhập dài quá 50 kí tự', patch: () => ({ txtUsername: 'a'.repeat(51) }) },
    { name: 'mật khẩu trống', patch: () => ({ txtPassword: '', txtConfirmPassword: '' }) },
    { name: 'mật khẩu dài quá 128 kí tự', patch: () => ({ txtPassword: 'A'.repeat(129), txtConfirmPassword: 'A'.repeat(129) }) },
    { name: 'ngày sinh ở tương lai', patch: () => ({ txtDob: tomorrow() }) },
    { name: 'ngày sinh là hôm nay', patch: () => ({ txtDob: today() }) },
    { name: 'ngày sinh trước 1900', patch: () => ({ txtDob: '1899-12-31' }) },
  ];
  for (const c of invalidCases) {
    test(`C4 ${c.name} → REGISTER_INVALID`, async ({ page }) => {
      await page.goto('/RegisterView.jsp');
      await fillRegister(page, { ...ANH, ...c.patch() });
      await page.locator('#btnRegister').click();
      await expectMessage(page, MSG.REGISTER_INVALID);
      await expectRegisterView(page);
      expect(countUser('minhanh')).toBe(0);
    });
  }

  test('C4 ngày sinh không có thật (31/02/2003) → REGISTER_INVALID', async ({ page }) => {
    await page.goto('/RegisterView.jsp');
    await fillRegister(page, ANH);
    // Ô type=date của trình duyệt không nhận ngày không có thật; gửi đúng chuỗi như một client không có lịch chọn ngày.
    await page.locator('#txtDob').evaluate((el: HTMLInputElement) => {
      el.type = 'text';
      el.value = '2003-02-31';
    });
    await page.locator('#btnRegister').click();
    await expectMessage(page, MSG.REGISTER_INVALID);
    expect(countUser('minhanh')).toBe(0);
  });

  test('§9.2 mật khẩu nhập lại không khớp → REGISTER_PASSWORD_MISMATCH', async ({ page }) => {
    await page.goto('/RegisterView.jsp');
    await fillRegister(page, { ...ANH, txtConfirmPassword: 'Anh@2004' });
    await page.locator('#btnRegister').click();
    await expectMessage(page, MSG.REGISTER_PASSWORD_MISMATCH);
    await expectRegisterView(page);
    await expect(page.locator('#txtFullName')).toHaveValue(ANH.txtFullName);
    expect(countUser('minhanh')).toBe(0);
  });

  test('§6.1 chữ nhập in lại được escape, không chèn được thẻ', async ({ page }) => {
    const evil = 'Tèo <b id="xss">đậm</b> "x" <script>window.__xss=1</script>';
    await page.goto('/RegisterView.jsp');
    await fillRegister(page, { ...ANH, txtFullName: evil, txtIdCard: '12345' });
    await page.locator('#btnRegister').click();
    await expectMessage(page, MSG.REGISTER_INVALID);
    await expect(page.locator('#txtFullName')).toHaveValue(evil);
    await expect(page.locator('#xss')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test('§6.1 điện thoại gõ kèm dấu cách, chấm, gạch và email hoa được chuẩn hoá rồi lưu', async ({ page }) => {
    await page.goto('/RegisterView.jsp');
    await fillRegister(page, {
      ...ANH, txtPhone: '0912 345.678', txtEmail: 'MinhAnh.Tran@Gmail.com', txtFullName: '  Trần Minh Anh  ',
    });
    await page.locator('#btnRegister').click();
    await expectMessage(page, MSG.REGISTER_SUCCESS);
    expect(clientRow('minhanh')).toBe(
      'Trần Minh Anh\t2003-08-15\t001203012345\t0912345678\tminhanh.tran@gmail.com\tSố 12 Trần Phú, Hà Đông, Hà Nội',
    );
  });

  test('§6.1 gửi lại đúng form đã đăng kí thành công → REGISTER_DUPLICATE, không tạo tài khoản thứ hai', async ({ page }) => {
    await page.goto('/RegisterView.jsp');
    await fillRegister(page, ANH);
    await page.locator('#btnRegister').click();
    await expectMessage(page, MSG.REGISTER_SUCCESS);
    await page.goto('/RegisterView.jsp');
    await fillRegister(page, ANH);
    await page.locator('#btnRegister').click();
    await expectMessage(page, MSG.REGISTER_DUPLICATE);
    expect(countUser('minhanh')).toBe(1);
  });

  test('§6.1 trùng riêng CCCD, điện thoại hoặc email → REGISTER_DUPLICATE', async ({ page, request }) => {
    await registerViaHttp(request, ANH);
    const others: Partial<RegisterForm>[] = [
      { txtIdCard: ANH.txtIdCard },
      { txtPhone: ANH.txtPhone },
      { txtEmail: ANH.txtEmail.toUpperCase() },
    ];
    for (const same of others) {
      await page.goto('/RegisterView.jsp');
      await fillRegister(page, { ...OTHER_MINHANH, txtUsername: 'nguoikhac', ...same });
      await page.locator('#btnRegister').click();
      await expectMessage(page, MSG.REGISTER_DUPLICATE);
    }
    expect(countUser('nguoikhac')).toBe(0);
  });

  test('§6.1 đăng nhập: tên đăng nhập trim và không phân biệt hoa thường; ô trống → LOGIN_FAILED', async ({ page, request }) => {
    await registerViaHttp(request, ANH);
    await page.goto('/LoginView.jsp');
    await submitLogin(page, '', '');
    await expectMessage(page, MSG.LOGIN_FAILED);
    await pressOk(page);
    await submitLogin(page, '  MinhAnh  ', 'Anh@2003');
    await expectClientHome(page, 'Trần Minh Anh');
  });

  test('§6.1 khách đã đăng nhập mở LoginView, RegisterView → về ClientHomeView', async ({ page, request }) => {
    await registerViaHttp(request, ANH);
    await page.goto('/LoginView.jsp');
    await submitLogin(page, 'minhanh', 'Anh@2003');
    await expectClientHome(page, 'Trần Minh Anh');
    await page.goto('/LoginView.jsp');
    await expectClientHome(page, 'Trần Minh Anh');
    await page.goto('/RegisterView.jsp');
    await expectClientHome(page, 'Trần Minh Anh');
  });

  test('C2 GET tới doRegister.jsp → 405, không tạo gì', async ({ page, guard }) => {
    // Hai dòng sự cố có chủ đích của chính request này: response 405 và dòng console Chrome ghi cho nó.
    guard.allow(/^http 405: GET .*\/doRegister\.jsp/);
    guard.allow(/^console\.error: Failed to load resource: the server responded with a status of 405 \(\)$/);
    const res = await page.goto('/doRegister.jsp');
    expect(res?.status()).toBe(405);
    // Trang lỗi tiếng Việt của app, không lộ trang lỗi Tomcat (phase-06-integration.md §6.1 Chung).
    await expect(page.locator('body')).not.toContainText(/Apache Tomcat|HTTP Status 405|Exception/);
    expect(countUser('minhanh')).toBe(0);
  });
});
