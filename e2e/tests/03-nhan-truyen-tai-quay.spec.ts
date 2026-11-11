// Ch.2 mục 2.3 "Khách hàng đến nhận truyện tại quầy" (báo cáo trang in 11–19): kịch bản chuẩn và từng ngoại lệ
// (2, 6, 11, 12, 19, 37), bốn điều kiện xác nhận (docs/contracts.md §10.2), D9 (§6.3). Skill tiem-write-e2e-chapter2.
// Câu mong đợi chép tay từ docs/contracts.md §10.1, §10.3 (không sinh từ Messages.java). Ngày tương đối (Deferred #15):
// ngày mượn = hôm nay, ngày hẹn trả = hôm nay + 7 (C7). Mỗi test tự đặt DB bằng seedChapter23() (e2e/fixtures/quay-seed.ts).
import { test, expect, addDays, isoDate, loginStaff, stubPrint, vnToday, viDate, viDateTime } from '../fixtures/test';
import { rows, seedChapter23 } from '../fixtures/quay-seed';
import {
  chooseCollateral, chooseDamage, collateralField, damageNote, desk, deskBarcodes, drawerRows, expectMessage, firstCells,
  openBill, openCollateral, openCondition, searchBill, searchDamage, setDueDate,
} from '../fixtures/quay-pages';

const M = {
  LOGIN_FAILED: 'Đăng nhập thất bại, vui lòng thử lại.',
  RENTAL_BILL_NOT_FOUND: 'Không tìm thấy phiếu mượn phù hợp.',
  RENTAL_BILL_CANCELLED: 'Phiếu mượn đã bị huỷ, không thể xử lí.',
  RENTAL_BILL_ALREADY_PROCESSED: 'Phiếu mượn này đã được xử lí và đã giao truyện.',
  DUE_DATE_INVALID: 'Ngày hẹn trả phải sau ngày mượn.',
  NO_COPY_RECEIVED: 'Chưa chọn quyển truyện nào để giao cho khách hàng.',
  CONDITION_MISSING: 'Vui lòng ghi nhận tình trạng cho tất cả các quyển truyện được giao.',
  COLLATERAL_MISSING: 'Phiếu mượn chưa có khoản đặt cọc, vui lòng thêm khoản đặt cọc.',
  DAMAGE_NOT_FOUND: 'Không tìm thấy loại lỗi phù hợp.',
  DAMAGE_ALREADY_RECORDED: 'Lỗi này đã được ghi nhận cho quyển truyện.',
  DAMAGE_NAME_REQUIRED: 'Vui lòng nhập tên lỗi.',
  DAMAGE_EXISTS: 'Loại lỗi đã tồn tại.',
  COLLATERAL_NOT_FOUND: 'Không tìm thấy loại tài sản phù hợp.',
  COLLATERAL_VALUE_REQUIRED: 'Vui lòng nhập giá trị cho tất cả các khoản cọc.',
  COLLATERAL_NAME_REQUIRED: 'Vui lòng nhập tên loại tài sản.',
  COLLATERAL_EXISTS: 'Loại tài sản đã tồn tại.',
  CANCEL_CONFIRM: 'Bạn có chắc chắn muốn huỷ phiếu mượn này?',
  CANCEL_SUCCESS: 'Huỷ phiếu mượn thành công!',
  QUANTITY_EXCEEDED_4: 'Số lượng vượt quá số quyển hiện có (hiện còn 4 quyển).',
  // §10.3 (ngoài báo cáo, chủ dự án duyệt 11/11/2026)
  QUANTITY_INVALID: 'Số lượng phải là số nguyên lớn hơn hoặc bằng 1.',
  BOOK_NOT_CHOSEN: 'Vui lòng chọn đầu truyện.',
  DISCOUNT_INVALID: 'Giảm giá không hợp lệ, vui lòng nhập lại.',
};

const today = () => vnToday();
const due7 = () => addDays(vnToday(), 7);

/** Bước 13–28: tình trạng DT001-03 (Rách bìa, Vết bẩn, viết vẽ) và DT020-02 (không lỗi), như ch.2. */
async function recordConditions(page: import('@playwright/test').Page) {
  await openCondition(page, 'DT001-03');
  await expect(page.locator('#bookName')).toHaveText('Doraemon - Tập 1');
  await searchDamage(page, 'Rách');
  await expect(firstCells(page, 'tblDamage')).toHaveText(['Rách bìa', 'Rách trang']);
  await chooseDamage(page, 'Rách bìa');
  await damageNote(page, 'Rách bìa').fill('Rách nhẹ góc bìa trước');
  await searchDamage(page, 'Vết bẩn');
  await expect(firstCells(page, 'tblDamage')).toHaveText(['Vết bẩn, viết vẽ']);
  await chooseDamage(page, 'Vết bẩn, viết vẽ');
  await damageNote(page, 'Vết bẩn, viết vẽ').fill('Vết bút chì ở trang 12');
  await expect(firstCells(page, 'tblRentedDamage')).toHaveText(['Rách bìa', 'Vết bẩn, viết vẽ']);
  await expect(damageNote(page, 'Rách bìa')).toHaveValue('Rách nhẹ góc bìa trước');
  await page.locator('#btnSave').click();
  await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
  await expect(desk(page).locator('tr[data-barcode="DT001-03"] td').nth(4)).toHaveText('Rách bìa, Vết bẩn, viết vẽ');

  await openCondition(page, 'DT020-02');
  await expect(page.locator('#tblRentedDamage tbody tr')).toHaveCount(0);
  await page.locator('#txtConditionNote').fill('Truyện còn mới, không có lỗi');
  await page.locator('#btnSave').click();
  await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
  await expect(desk(page).locator('tr[data-barcode="DT020-02"] td').nth(4)).toHaveText('Không có lỗi');
}

/** Bước 31–42: Căn cước công dân 001203012345 "Giữ bản gốc", Tiền mặt 100.000đ "Cọc tiền mặt". */
async function recordCollaterals(page: import('@playwright/test').Page) {
  await openCollateral(page);
  await chooseCollateral(page, 'Căn cước', 'Căn cước công dân');
  await collateralField(page, 'Giá trị', 1).fill('001203012345');
  await collateralField(page, 'Ghi chú', 1).fill('Giữ bản gốc');
  await chooseCollateral(page, 'Tiền mặt', 'Tiền mặt');
  await collateralField(page, 'Giá trị', 2).fill('100.000đ');
  await collateralField(page, 'Ghi chú', 2).fill('Cọc tiền mặt');
  expect(await drawerRows(page)).toEqual([['1', 'Căn cước công dân'], ['2', 'Tiền mặt']]);
  await expect(collateralField(page, 'Giá trị', 1)).toHaveValue('001203012345');
  await page.getByRole('region', { name: 'Ngăn kéo đồ cọc' }).getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
}

test.describe('ch.2 2.3 Khách hàng đến nhận truyện tại quầy', () => {
  test.beforeEach(() => {
    seedChapter23();
  });

  test('kịch bản chuẩn: bước 1–49, xác nhận và in phiếu PM0125', async ({ page }) => {
    await stubPrint(page);
    // Bước 1–2
    await loginStaff(page);
    await expect(page.locator('h1')).toHaveText('Trang chủ nhân viên');
    await expect(page.locator('main')).toContainText('Họ và tên: Nguyễn Thu Hà');
    await expect(page.locator('main')).toContainText('Chức vụ: Nhân viên bán hàng');
    // Bước 3–8
    await page.locator('#lnkProcessRentalBill').click();
    await searchBill(page, 'PM0125');
    await expect(firstCells(page, 'tblRentalBill')).toHaveText(['PM0125']);
    const row = page.locator('#tblRentalBill tbody tr').first().locator('td');
    await expect(row).toHaveText(['PM0125', 'Trần Minh Anh', '0912345678', viDateTime(addDays(today(), 2), '09:00'), '2', 'CHỜ NHẬN']);
    // Bước 9–10: khung phiếu
    await page.locator('button[name="lnkChooseRentalBill"][value="125"]').click();
    await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
    const ticket = page.locator('article').first();
    await expect(ticket.getByRole('heading', { level: 2 })).toHaveText('PHIẾU MƯỢN');
    await expect(ticket).toContainText('PM0125');
    await expect(ticket).toContainText('Họ và tên: Trần Minh Anh');
    await expect(ticket).toContainText('Số CCCD: 001203012345');
    await expect(ticket).toContainText('Số điện thoại: 0912345678');
    expect(await deskBarcodes(page)).toEqual(['DT001-03', 'DT020-02']);
    const bookRows = desk(page).locator('tr[data-barcode]');
    await expect(bookRows.nth(0).locator('td')).toHaveText(['DT001-03', 'Doraemon - Tập 1', '3.000đ', '1', '(chưa ghi nhận)', '21.000đ', '', 'Thêm tình trạng']);
    await expect(bookRows.nth(1).locator('td')).toHaveText(['DT020-02', 'Thám tử lừng danh Conan - Tập 1', '3.000đ', '1', '(chưa ghi nhận)', '21.000đ', '', 'Thêm tình trạng']);
    await expect(desk(page).getByRole('checkbox', { name: 'Nhận DT001-03' })).toBeChecked();
    await expect(desk(page).getByRole('checkbox', { name: 'Nhận DT020-02' })).toBeChecked();
    await expect(desk(page).getByTestId('borrow-date')).toHaveText(viDate(today()));
    await expect(desk(page).getByRole('textbox', { name: 'Ngày hẹn trả:' })).toHaveValue(isoDate(due7()));
    await expect(desk(page).getByTestId('total-copies')).toHaveText('2');
    await expect(desk(page).getByTestId('total-amount')).toHaveText('42.000đ');

    // Bước 11–28, 29–42
    await recordConditions(page);
    await recordCollaterals(page);
    const colRows = desk(page).locator('tbody tr').filter({ hasText: 'Giữ bản gốc' });
    await expect(colRows).toHaveCount(1);
    await expect(desk(page)).toContainText('100.000đ');
    await expect(desk(page).getByTestId('total-amount')).toHaveText('42.000đ');

    // Bước 43–46: giữ 7 ngày, giảm giá 0đ, ghi chú trống, xác nhận
    await desk(page).getByRole('button', { name: 'Xác nhận và in phiếu mượn' }).click();
    await expect(page.locator('h1')).toHaveText('Xác nhận phiếu mượn');
    const card = page.locator('article').first();
    for (const line of [
      'Mã phiếu mượn: PM0125', 'Tên khách hàng: Trần Minh Anh', 'Số điện thoại: 0912345678', 'Số CCCD: 001203012345',
      `Ngày mượn: ${viDate(today())}`, `Ngày hẹn trả: ${viDate(due7())}`, 'Nhân viên xử lí: Nguyễn Thu Hà',
      'Tổng số quyển thuê: 2', 'Giảm giá: 0đ', 'Tổng tiền thuê: 42.000đ',
    ]) {
      await expect(card).toContainText(line);
    }
    await expect(page.locator('#tblRentedBook tbody tr').nth(0).locator('td'))
      .toHaveText(['DT001-03', 'Doraemon - Tập 1', '3.000đ', '1', 'Rách bìa, Vết bẩn, viết vẽ', '21.000đ']);
    await expect(page.locator('#tblRentedBook tbody tr').nth(1).locator('td'))
      .toHaveText(['DT020-02', 'Thám tử lừng danh Conan - Tập 1', '3.000đ', '1', 'Không có lỗi', '21.000đ']);
    await expect(page.locator('#tblRentalCollateral tbody tr').nth(0).locator('td')).toHaveText(['1', 'Căn cước công dân', '001203012345', 'Giữ bản gốc']);
    await expect(page.locator('#tblRentalCollateral tbody tr').nth(1).locator('td')).toHaveText(['2', 'Tiền mặt', '100.000đ', 'Cọc tiền mặt']);
    // DB (bước 46): trạng thái, nhân viên, ngày, giảm giá, tình trạng, cọc
    expect(rows('SELECT b.status, u.fullName, b.borrowDate, b.dueDate, b.discount FROM tblRentalBill b JOIN tblUser u ON u.id = b.staffId WHERE b.id = 125;'))
      .toEqual([['Đang cho thuê', 'Nguyễn Thu Hà', isoDate(today()), isoDate(due7()), '0']]);
    expect(rows("SELECT c.barcode, (SELECT GROUP_CONCAT(d.name ORDER BY rd.id SEPARATOR ', ') FROM tblRentedDamage rd JOIN tblDamage d ON d.id = rd.damageId WHERE rd.rentedBookId = r.id) FROM tblRentedBook r JOIN tblBookCopy c ON c.id = r.bookCopyId WHERE r.rentalBillId = 125 ORDER BY c.barcode;"))
      .toEqual([['DT001-03', 'Rách bìa, Vết bẩn, viết vẽ'], ['DT020-02', 'NULL']]);
    expect(rows("SELECT rd.note FROM tblRentedDamage rd JOIN tblRentedBook r ON r.id = rd.rentedBookId WHERE r.rentalBillId = 125 ORDER BY rd.id;"))
      .toEqual([['Rách nhẹ góc bìa trước'], ['Vết bút chì ở trang 12']]);
    expect(rows('SELECT c.name, rc.value, rc.note FROM tblRentalCollateral rc JOIN tblCollateral c ON c.id = rc.collateralId WHERE rc.rentalBillId = 125 ORDER BY rc.id;'))
      .toEqual([['Căn cước công dân', '001203012345', 'Giữ bản gốc'], ['Tiền mặt', '100.000đ', 'Cọc tiền mặt']]);

    // Bước 47–48: In phiếu (window.print đã stub) → trang chính nhân viên
    await page.locator('#btnPrint').click();
    await expect(page.locator('h1')).toHaveText('Trang chủ nhân viên');
  });

  test('ngoại lệ 2: đăng nhập sai mật khẩu rồi đăng nhập lại', async ({ page }) => {
    await loginStaff(page, 'hant', 'sai-mat-khau');
    await expectMessage(page, M.LOGIN_FAILED);
    await expect(page.locator('#txtUsername')).toBeVisible();
    await loginStaff(page);
    await expect(page.locator('h1')).toHaveText('Trang chủ nhân viên');
    await expect(page.locator('#lnkProcessRentalBill')).toBeVisible();
  });

  test('ngoại lệ 6: tìm PM0152 không thấy, tìm theo CCCD rồi chọn PM0125', async ({ page }) => {
    await loginStaff(page);
    await page.locator('#lnkProcessRentalBill').click();
    await searchBill(page, 'PM0152');
    await expectMessage(page, M.RENTAL_BILL_NOT_FOUND);
    await searchBill(page, '001203012345');
    await expect(firstCells(page, 'tblRentalBill')).toHaveText(['PM0125', 'PM0117', 'PM0110']);
    const r = page.locator('#tblRentalBill tbody tr');
    await expect(r.nth(0).locator('td')).toHaveText(['PM0125', 'Trần Minh Anh', '0912345678', viDateTime(addDays(today(), 2), '09:00'), '2', 'CHỜ NHẬN']);
    await expect(r.nth(1).locator('td')).toHaveText(['PM0117', 'Trần Minh Anh', '0912345678', viDateTime(addDays(today(), 1), '18:00'), '1', 'ĐÃ HUỶ']);
    await expect(r.nth(2).locator('td')).toHaveText(['PM0110', 'Trần Minh Anh', '0912345678', viDateTime(addDays(today(), -8), '10:00'), '2', 'ĐANG CHO THUÊ']);
    await page.locator('button[name="lnkChooseRentalBill"][value="125"]').click();
    await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
    expect(await deskBarcodes(page)).toEqual(['DT001-03', 'DT020-02']);
  });

  test('D9: chọn PM0117 đã huỷ, PM0110 đang cho thuê', async ({ page }) => {
    await loginStaff(page);
    await page.locator('#lnkProcessRentalBill').click();
    await searchBill(page, '001203012345');
    await page.locator('button[name="lnkChooseRentalBill"][value="117"]').click();
    await expectMessage(page, M.RENTAL_BILL_CANCELLED);
    await page.locator('button[name="lnkChooseRentalBill"][value="110"]').click();
    await expectMessage(page, M.RENTAL_BILL_ALREADY_PROCESSED);
    await expect(page.locator('h1')).toHaveText('Tìm phiếu mượn');
  });

  test('ngoại lệ 11: bỏ Conan - Tập 1, thêm Doraemon - Tập 2', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    // 11.1–11.2
    await desk(page).getByRole('link', { name: 'Chỉnh sửa danh sách truyện' }).click();
    await expect(page.locator('h1')).toHaveText('Chỉnh sửa danh sách truyện');
    await expect(page.locator('#tblRentedBook tbody tr').nth(0).locator('td')).toHaveText(['DT001-03', 'Doraemon - Tập 1', '3.000đ', '1', '(chưa ghi nhận)', '21.000đ', 'Xoá']);
    await expect(page.locator('#tblRentedBook tbody tr').nth(1).locator('td')).toHaveText(['DT020-02', 'Thám tử lừng danh Conan - Tập 1', '3.000đ', '1', '(chưa ghi nhận)', '21.000đ', 'Xoá']);
    // 11.3–11.4
    await page.locator('#tblRentedBook tbody tr', { hasText: 'DT020-02' }).getByRole('button', { name: 'Xoá' }).click();
    await expect(firstCells(page, 'tblRentedBook')).toHaveText(['DT001-03']);
    // 11.5–11.8
    await page.locator('#lnkAddBook').click();
    await expect(page.locator('h1')).toHaveText('Thêm truyện vào phiếu mượn');
    await expect(page.locator('#tblBook tbody tr')).toHaveCount(0);
    await page.locator('#txtKeyword').fill('Doraemon');
    await page.locator('#btnSearch').click();
    const books = page.locator('#tblBook tbody tr');
    await expect(books).toHaveCount(3);
    for (const [i, [code, name, price, qty]] of [
      ['DT001', 'Doraemon - Tập 1', '3.000đ', '4'], ['DT002', 'Doraemon - Tập 2', '3.000đ', '4'],
      ['DT015', 'Doraemon: Nobita và lâu đài dưới đáy biển', '5.000đ', '2'],
    ].entries()) {
      await expect(books.nth(i)).toContainText(code);
      await expect(books.nth(i)).toContainText(name);
      await expect(books.nth(i)).toContainText(price);
      await expect(books.nth(i).locator('td').last()).toHaveText(qty);
    }
    // 11.9–11.10 (kèm câu số lượng vượt quá ch.9)
    await page.locator('#lnkChooseBook-2').check();
    await page.locator('#txtQuantity').fill('5');
    await page.locator('#btnAddToRentalBill').click();
    await expectMessage(page, M.QUANTITY_EXCEEDED_4);
    await page.locator('#lnkChooseBook-2').check();
    await page.locator('#txtQuantity').fill('1');
    await page.locator('#btnAddToRentalBill').click();
    await expect(page.locator('h1')).toHaveText('Chỉnh sửa danh sách truyện');
    await expect(page.locator('#tblRentedBook tbody tr').nth(1).locator('td')).toHaveText(['DT002-01', 'Doraemon - Tập 2', '3.000đ', '1', '(chưa ghi nhận)', '21.000đ', 'Xoá']);
    await expect(firstCells(page, 'tblRentedBook')).toHaveText(['DT001-03', 'DT002-01']);
    // 11.11–11.12
    await page.locator('#btnSave').click();
    await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
    expect(await deskBarcodes(page)).toEqual(['DT001-03', 'DT002-01']);
    await expect(desk(page).getByTestId('total-copies')).toHaveText('2');
    await expect(desk(page).getByTestId('total-amount')).toHaveText('42.000đ');
    expect(rows('SELECT c.barcode FROM tblRentedBook r JOIN tblBookCopy c ON c.id = r.bookCopyId WHERE r.rentalBillId = 125 ORDER BY c.barcode;'))
      .toEqual([['DT001-03'], ['DT002-01']]);
  });

  test('ngoại lệ 12: khách không đồng ý tình trạng, huỷ phiếu tại quầy', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    await desk(page).getByRole('button', { name: 'Huỷ phiếu mượn' }).click();
    await expect(page.locator('#cancelDialogTitle')).toHaveText('Xác nhận huỷ phiếu mượn');
    await expect(page.locator('#cancelDialogText')).toHaveText(M.CANCEL_CONFIRM);
    await page.locator('#txtCancelReason').fill('Khách không đồng ý với tình trạng quyển DT001-03');
    await page.locator('#btnConfirmCancel').click();
    await expectMessage(page, M.CANCEL_SUCCESS);
    await expect(page.locator('h1')).toHaveText('Tìm phiếu mượn');
    expect(rows('SELECT status, cancelReason FROM tblRentalBill WHERE id = 125;'))
      .toEqual([['Đã huỷ', 'Khách không đồng ý với tình trạng quyển DT001-03']]);
  });

  test('ngoại lệ 19: tìm "Ố vàng" không thấy, thêm lỗi mới', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    await openCondition(page, 'DT001-03');
    await searchDamage(page, 'Rách');
    await chooseDamage(page, 'Rách bìa');
    await damageNote(page, 'Rách bìa').fill('Rách nhẹ góc bìa trước');
    // Chọn lại lỗi đã có (ch.9)
    await chooseDamage(page, 'Rách bìa');
    await expectMessage(page, M.DAMAGE_ALREADY_RECORDED);
    await expect(damageNote(page, 'Rách bìa')).toHaveValue('Rách nhẹ góc bìa trước');
    // 19–19.1
    await searchDamage(page, 'Ố vàng');
    await expectMessage(page, M.DAMAGE_NOT_FOUND);
    // 19.2–19.3
    await page.locator('#lnkAddDamage').click();
    await expect(page.locator('h1')).toHaveText('Thêm lỗi mới');
    await page.locator('#btnSave').click();
    await expectMessage(page, M.DAMAGE_NAME_REQUIRED);
    await page.locator('#txtName').fill('Rách bìa');
    await page.locator('#btnSave').click();
    await expectMessage(page, M.DAMAGE_EXISTS);
    // 19.4–19.5
    await page.locator('#txtName').fill('Ố vàng');
    await page.locator('#txtDescription').fill('Giấy bị ố vàng do để lâu');
    await page.locator('#btnSave').click();
    await expect(page.locator('h1')).toHaveText('Thêm tình trạng truyện');
    await expect(firstCells(page, 'tblRentedDamage')).toHaveText(['Rách bìa', 'Ố vàng']);
    await expect(damageNote(page, 'Rách bìa')).toHaveValue('Rách nhẹ góc bìa trước');
    expect(rows("SELECT name, description FROM tblDamage WHERE name = 'Ố vàng';")).toEqual([['Ố vàng', 'Giấy bị ố vàng do để lâu']]);
    // 19.6: ghi chú cho Ố vàng, lưu tình trạng
    await damageNote(page, 'Ố vàng').fill('Ố nhẹ ở 5 trang cuối');
    await page.locator('#btnSave').click();
    await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
    await expect(desk(page).locator('tr[data-barcode="DT001-03"] td').nth(4)).toHaveText('Rách bìa, Ố vàng');
  });

  test('ngoại lệ 37: tìm "Thẻ sinh viên" không thấy, thêm loại tài sản mới', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    await openCollateral(page);
    await chooseCollateral(page, 'Căn cước', 'Căn cước công dân');
    // Bước 42 (ch.9): lưu khi chưa nhập giá trị
    await page.getByRole('region', { name: 'Ngăn kéo đồ cọc' }).getByRole('button', { name: 'Lưu' }).click();
    await expectMessage(page, M.COLLATERAL_VALUE_REQUIRED);
    await collateralField(page, 'Giá trị', 1).fill('001203012345');
    await collateralField(page, 'Ghi chú', 1).fill('Giữ bản gốc');
    await chooseCollateral(page, 'Tiền mặt', 'Tiền mặt');
    await collateralField(page, 'Giá trị', 2).fill('100.000đ');
    await collateralField(page, 'Ghi chú', 2).fill('Cọc tiền mặt');
    // 37–37.1
    await page.locator('#txtKeyword').fill('Thẻ sinh viên');
    await page.locator('#btnSearch').click();
    await expectMessage(page, M.COLLATERAL_NOT_FOUND);
    await expect(collateralField(page, 'Giá trị', 2)).toHaveValue('100.000đ');
    // 37.2–37.3
    await page.locator('#lnkAddCollateral').click();
    await expect(page.locator('h1')).toHaveText('Thêm loại tài sản mới');
    await page.locator('#btnSave').click();
    await expectMessage(page, M.COLLATERAL_NAME_REQUIRED);
    await page.locator('#txtName').fill('Tiền mặt');
    await page.locator('#btnSave').click();
    await expectMessage(page, M.COLLATERAL_EXISTS);
    // 37.4–37.5
    await page.locator('#txtName').fill('Thẻ sinh viên');
    await page.locator('#txtDescription').fill('Giữ bản gốc thẻ sinh viên còn hạn sử dụng');
    await page.locator('#btnSave').click();
    await expect(page.locator('h1')).toHaveText('Thêm khoản đặt cọc');
    expect(await drawerRows(page)).toEqual([['1', 'Căn cước công dân'], ['2', 'Tiền mặt'], ['3', 'Thẻ sinh viên']]);
    await expect(collateralField(page, 'Giá trị', 1)).toHaveValue('001203012345');
    // 37.6
    await collateralField(page, 'Giá trị', 3).fill('B23DCCN001');
    await collateralField(page, 'Ghi chú', 3).fill('Giữ thẻ bản gốc');
    await page.getByRole('region', { name: 'Ngăn kéo đồ cọc' }).getByRole('button', { name: 'Lưu' }).click();
    await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
    await expect(desk(page)).toContainText('Thẻ sinh viên');
    await expect(desk(page)).toContainText('B23DCCN001');
    expect(rows("SELECT name, description FROM tblCollateral WHERE name = 'Thẻ sinh viên';"))
      .toEqual([['Thẻ sinh viên', 'Giữ bản gốc thẻ sinh viên còn hạn sử dụng']]);
  });

  test('điều kiện 1: không quyển nào được tích "Nhận"', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    for (const barcode of ['DT001-03', 'DT020-02']) {
      await desk(page).getByRole('checkbox', { name: `Nhận ${barcode}` }).uncheck();
      await expect(page.locator('h1')).toHaveText('Xử lí phiếu mượn');
      await expect(desk(page).getByRole('checkbox', { name: `Nhận ${barcode}` })).not.toBeChecked();
    }
    await expect(desk(page).getByTestId('total-copies')).toHaveText('0');
    await desk(page).getByRole('button', { name: 'Xác nhận và in phiếu mượn' }).click();
    await expectMessage(page, M.NO_COPY_RECEIVED);
    expect(rows('SELECT status FROM tblRentalBill WHERE id = 125;')).toEqual([['Chờ nhận']]);
  });

  test('điều kiện 2: quyển được tích chưa có tình trạng', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    await desk(page).getByRole('button', { name: 'Xác nhận và in phiếu mượn' }).click();
    await expectMessage(page, M.CONDITION_MISSING);
    expect(rows('SELECT status FROM tblRentalBill WHERE id = 125;')).toEqual([['Chờ nhận']]);
  });

  test('điều kiện 3: phiếu chưa có khoản đặt cọc', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    await recordConditions(page);
    await desk(page).getByRole('button', { name: 'Xác nhận và in phiếu mượn' }).click();
    await expectMessage(page, M.COLLATERAL_MISSING);
    expect(rows('SELECT status FROM tblRentalBill WHERE id = 125;')).toEqual([['Chờ nhận']]);
  });

  test('điều kiện 4: ngày hẹn trả không sau ngày mượn', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    await setDueDate(page, isoDate(today()));
    await expectMessage(page, M.DUE_DATE_INVALID);
    await expect(desk(page).getByRole('textbox', { name: 'Ngày hẹn trả:' })).toHaveValue(isoDate(due7()));
    await setDueDate(page, isoDate(addDays(today(), -1)));
    await expectMessage(page, M.DUE_DATE_INVALID);
    expect(rows('SELECT status, IFNULL(dueDate, \'NULL\') FROM tblRentalBill WHERE id = 125;')).toEqual([['Chờ nhận', 'NULL']]);
  });

  test('ngoài báo cáo: giảm giá không hợp lệ, số lượng không hợp lệ, chưa chọn đầu truyện', async ({ page }) => {
    await openBill(page, 'PM0125', 125);
    const discount = desk(page).getByRole('textbox', { name: 'Giảm giá:' });
    await discount.fill('2000');
    await discount.press('Enter');
    await expect(desk(page).getByTestId('total-amount')).toHaveText('40.000đ');
    await expect(desk(page).getByRole('textbox', { name: 'Giảm giá:' })).toHaveValue('2000');
    await desk(page).getByRole('textbox', { name: 'Giảm giá:' }).fill('abc');
    await desk(page).getByRole('textbox', { name: 'Giảm giá:' }).press('Enter');
    await expectMessage(page, M.DISCOUNT_INVALID);
    await desk(page).getByRole('link', { name: 'Chỉnh sửa danh sách truyện' }).click();
    await page.locator('#lnkAddBook').click();
    await page.locator('#txtKeyword').fill('Doraemon');
    await page.locator('#btnSearch').click();
    await page.locator('#txtQuantity').fill('1');
    await page.locator('#btnAddToRentalBill').click();
    await expectMessage(page, M.BOOK_NOT_CHOSEN);
    await page.locator('#lnkChooseBook-2').check();
    await page.locator('#txtQuantity').fill('0');
    await page.locator('#btnAddToRentalBill').click();
    await expectMessage(page, M.QUANTITY_INVALID);
  });
});
