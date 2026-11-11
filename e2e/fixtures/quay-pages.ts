// Thao tác trang M3 dùng chung cho e2e/tests/03-nhan-truyen-tai-quay.spec.ts (lane 8A3).
// Định vị: id hợp đồng (docs/contracts.md §9.2) cho mọi phần JSP render; phần island ProcessBillDesk,
// CollateralDrawer vẽ (§11.2, §11.3) không mang id (input thật có id nằm trong fallback bị ẩn), nên định vị
// bằng aria-label island đặt theo mã vạch / STT.
import { expect, loginStaff, type Page } from './test';

export const NV = '/nhan-vien';

/** Hộp thông báo câu nguyên văn (`<ui:message-box>`). */
export const messageBox = (page: Page) => page.locator('.tt-message-box');

/**
 * So nguyên câu của hộp thông báo. Loader gắn thêm nút "OK" (`[data-message-ok]`, frontend/src/loader/message-ok.ts)
 * vào trong hộp nên textContent là "câu" + "OK": so phần chữ của hộp (bỏ nút) bằng đúng câu, và có đúng một nút OK.
 */
export async function expectMessage(page: Page, sentence: string) {
  const box = messageBox(page);
  await expect(box).toHaveCount(1);
  await expect(box.locator('[data-message-ok]')).toHaveText('OK');
  await expect
    .poll(() => box.evaluate((el) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[data-message-ok]').forEach((b) => b.remove());
      return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
    }))
    .toBe(sentence);
}

/** Bàn quầy của island ProcessBillDesk. */
export const desk = (page: Page) => page.getByRole('region', { name: /^Bàn quầy xử lí phiếu PM\d{4}$/ });

/** Đăng nhập hant, tìm theo từ khoá, chọn phiếu `id` → ProcessRentalBillView (bước 1–10). */
export async function openBill(page: Page, keyword: string, id: number) {
  await loginStaff(page);
  await expect(page.locator('h1')).toHaveText('Trang chủ nhân viên');
  await page.locator('#lnkProcessRentalBill').click();
  await searchBill(page, keyword);
  await page.locator(`button[name="lnkChooseRentalBill"][value="${id}"]`).click();
  await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
  await expect(desk(page)).toBeVisible();
}

export async function searchBill(page: Page, keyword: string) {
  await expect(page.locator('h1')).toHaveText('Tìm phiếu mượn');
  await page.locator('#txtKeyword').fill(keyword);
  await page.locator('#btnSearch').click();
}

/** Mã vạch các dòng trên bàn quầy, theo thứ tự. */
export async function deskBarcodes(page: Page) {
  return desk(page).locator('tr[data-barcode]').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-barcode')));
}

/** Cột đầu của các dòng bảng `tableId` (bảng do JSP render). */
export function firstCells(page: Page, tableId: string) {
  return page.locator(`#${tableId} tbody tr td:first-child`);
}

/** Bước 13–28: mở Thêm tình trạng của quyển `barcode` từ bàn quầy. */
export async function openCondition(page: Page, barcode: string) {
  await desk(page).getByRole('button', { name: `Thêm tình trạng ${barcode}` }).click();
  await expect(page.locator('h1')).toHaveText('Thêm tình trạng truyện');
  await expect(page.locator('#barcode')).toHaveText(barcode);
}

export async function searchDamage(page: Page, keyword: string) {
  await page.locator('#txtKeyword').fill(keyword);
  await page.locator('#btnSearch').click();
}

/** Chọn dòng loại lỗi trong "Danh sách loại lỗi" theo tên. */
export async function chooseDamage(page: Page, name: string) {
  await page.locator('#tblDamage button[name="lnkChooseDamage"]', { hasText: name }).click();
}

/** Ô ghi chú của lỗi `name` trong "Các lỗi đã ghi nhận". */
export const damageNote = (page: Page, name: string) => page.getByRole('textbox', { name: `Ghi chú cho lỗi ${name}` });

/** Bước 31–42: mở Thêm khoản đặt cọc từ bàn quầy. */
export async function openCollateral(page: Page) {
  await desk(page).getByRole('link', { name: 'Thêm khoản cọc' }).click();
  await expect(page.locator('h1')).toHaveText('Thêm khoản đặt cọc');
}

export async function chooseCollateral(page: Page, keyword: string, name: string) {
  await page.locator('#txtKeyword').fill(keyword);
  await page.locator('#btnSearch').click();
  await page.locator('#tblCollateral button[name="lnkChooseCollateral"]', { hasText: name }).click();
}

/** Ô của ngăn kéo đồ cọc (island CollateralDrawer), STT từ 1. */
export const collateralField = (page: Page, field: 'Giá trị' | 'Ghi chú', index: number) =>
  page.getByRole('textbox', { name: `${field} khoản cọc ${index}`, exact: true });

/** Dòng "Các khoản cọc" của ngăn kéo: [STT, loại tài sản] theo thứ tự. */
export async function drawerRows(page: Page) {
  return page.getByRole('region', { name: 'Ngăn kéo đồ cọc' }).locator('tbody tr').evaluateAll((rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].slice(0, 2).map((td) => ((td.querySelector('span') ?? td).textContent ?? '').trim())));
}

/** Đặt ngày hẹn trả trên bàn quầy rồi chốt (Enter gửi form về chính trang, §11.2). */
export async function setDueDate(page: Page, iso: string) {
  const box = desk(page).getByRole('textbox', { name: 'Ngày hẹn trả:' });
  await box.fill(iso);
  await box.press('Enter');
}
