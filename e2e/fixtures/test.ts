// Fixture chung của bộ E2E (file dùng chung, chỉ orchestrator sửa; helper riêng của lane đặt ở e2e/fixtures/<lane>-*.ts).
//
// - `test` tự gắn bộ canh console/network: console error/warning, pageerror, requestfailed, response ≥ 400 làm test
//   thất bại ở cuối test kèm danh sách. Ngoại lệ có chủ đích khai trong chính test: `guard.allow(/http 403: POST .*doX/)`.
// - Seed ch.2 dùng lại scripts/smoke/lib/e2e-db.mjs (SSOT, cùng dữ liệu với smoke): resetChapter2, seedChapter22Bills,
//   billState, sql, ngày tương đối. Stack chọn bằng SMOKE_COMPOSE_PROJECT, mặc định tiemtruyen-e2e.
import { test as base, expect, type Page } from '@playwright/test';

export {
  PROJECT, BASE_URL, sql, resetChapter2, seedChapter22Bills, billState, vnToday, addDays, isoDate, viDate, viDateTime,
  isoLocal, SCENARIO_USERNAMES,
} from '../../scripts/smoke/lib/e2e-db.mjs';

export { expect };

export type Guard = {
  /** Bỏ qua một dòng sự cố khớp regex (dạng dòng: `console.error: …`, `pageerror: …`, `requestfailed: GET url …`, `http 403: POST url`). */
  allow(re: RegExp): void;
};

export const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ page }, use) => {
      const issues: string[] = [];
      const allowed: RegExp[] = [];
      const note = (line: string) => {
        if (!allowed.some((re) => re.test(line))) issues.push(line);
      };
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') note(`console.${m.type()}: ${m.text()}`);
      });
      page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) => {
        const err = r.failure()?.errorText ?? '';
        // Điều hướng mới huỷ request đang tải dở của trang cũ (ảnh, font): không phải request hỏng.
        if (err === 'net::ERR_ABORTED' && r.frame() === page.mainFrame() && r.resourceType() !== 'document') return;
        note(`requestfailed: ${r.method()} ${r.url()} ${err}`);
      });
      page.on('response', (r) => {
        if (r.status() >= 400) note(`http ${r.status()}: ${r.request().method()} ${r.url()}`);
      });
      await use({ allow: (re) => allowed.push(re) });
      expect(issues, 'console và network phải sạch (docs CLAUDE.md §2)').toEqual([]);
    },
    { auto: true },
  ],
});

/** Đăng nhập khách ở /LoginView.jsp (docs/contracts.md §9.2: txtUsername, txtPassword, btnLogin). */
export async function loginClient(page: Page, username: string, password: string) {
  await page.goto('/LoginView.jsp');
  await page.locator('#txtUsername').fill(username);
  await page.locator('#txtPassword').fill(password);
  await page.locator('#btnLogin').click();
}

/** Đăng nhập nhân viên ở /nhan-vien/LoginView.jsp (D5). */
export async function loginStaff(page: Page, username = 'hant', password = 'hant@123') {
  await page.goto('/nhan-vien/LoginView.jsp');
  await page.locator('#txtUsername').fill(username);
  await page.locator('#txtPassword').fill(password);
  await page.locator('#btnLogin').click();
}

/** "In phiếu" gọi window.print() qua loader: thay bằng hàm rỗng trước khi trang nạp. */
export async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    window.print = () => {};
  });
}
