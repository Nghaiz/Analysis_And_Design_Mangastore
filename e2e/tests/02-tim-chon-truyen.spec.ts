// Ch.2 mục 2.2 "Khách hàng tìm và chọn truyện trực tuyến" (báo cáo trang in 7–11): kịch bản chuẩn và từng ngoại lệ,
// mỗi cái một test, chạy ở cả project mobile (390×844) và desktop (1440×900). Skill tiem-write-e2e-chapter2.
// Trạng thái DB: mỗi test tự dựng trong beforeEach (resetChapter2, đăng kí minhanh, PM0110 + PM0117, bộ đếm 125).
// Ngày tương đối (Deferred #15): "hôm nay" = ngày chạy ở Asia/Ho_Chi_Minh, giữ giờ trong ngày của ch.2.
// Mục "ngoài báo cáo" ở cuối là edge case M2 của phase-06-integration.md §6 (câu §10.3).
import { addDays, billState, expect, isoLocal, test, viDate, viDateTime, vnToday } from '../fixtures/test';
import {
  ANH, M, addQuantity, expectMessage, cellTexts, chooseBook, createBillFromCart, fillCartAsChapter2, loginAnh, messageBox,
  openBillList, openSearch, pickupDay, prepareChapter22, rows, search, seedPM0125, selectedRows, setExpectedDays, submitVia,
} from '../fixtures/chon-setup';

const DORAEMON_1 = 'Doraemon - Tập 1';
const CONAN_1 = 'Thám tử lừng danh Conan - Tập 1';

test.describe('ch.2 2.2 Khách hàng tìm và chọn truyện trực tuyến', () => {
  test.beforeEach(async () => {
    await prepareChapter22();
  });

  test('kịch bản chuẩn bước 1–24: tìm, chọn DT001 và DT020, tạo phiếu PM0125', async ({ page }) => {
    const today = vnToday();

    // Bước 1–2: đăng nhập, giao diện chính của khách.
    await loginAnh(page);
    await expect(page.locator('main')).toContainText(`Họ và tên: ${ANH.txtFullName}`);
    await expect(page.locator('#lnkSearchBook')).toBeVisible();
    await expect(page.locator('#lnkViewRentalBill')).toBeVisible();

    // Bước 3–4: Tìm truyện, danh sách và khung Truyện đã chọn rỗng.
    await page.locator('#lnkSearchBook').click();
    await expect(page).toHaveURL(/\/SearchBookView\.jsp$/);
    await expect(page.locator('#txtKeyword')).toHaveValue('');
    await expect(rows(page, 'tblBook')).toHaveCount(0);
    await expect(selectedRows(page)).toHaveCount(0);

    // Bước 5–6: "Doraemon" → DT001 (5 quyển), DT002 (4), DT015 (2), đúng thứ tự.
    await search(page, 'Doraemon');
    await expect(rows(page, 'tblBook')).toHaveCount(3);
    const doraemon = rows(page, 'tblBook');
    expect((await cellTexts(doraemon.nth(0)))).toEqual(['DT001', DORAEMON_1, 'Fujiko F. Fujio', 'Thiếu nhi', '3.000đ', '5']);
    expect((await cellTexts(doraemon.nth(1)))).toEqual(['DT002', 'Doraemon - Tập 2', 'Fujiko F. Fujio', 'Thiếu nhi', '3.000đ', '4']);
    expect((await cellTexts(doraemon.nth(2)))).toEqual(
      ['DT015', 'Doraemon: Nobita và lâu đài dưới đáy biển', 'Fujiko F. Fujio', 'Phiêu lưu', '5.000đ', '2']);

    // Bước 7–8: Chi tiết đầu truyện DT001.
    await chooseBook(page, 1);
    await expect(page.locator('#bookCode')).toHaveText('DT001');
    await expect(page.locator('#bookName')).toHaveText(DORAEMON_1);
    await expect(page.locator('#rentalPrice')).toHaveText('3.000đ');
    await expect(page.locator('#availableCopies')).toHaveText('5');
    for (const t of ['Fujiko F. Fujio', 'Kim Đồng', '2023', 'Thiếu nhi']) await expect(page.locator('main')).toContainText(t);
    await expect(page.locator('#txtQuantity')).toBeVisible();
    await expect(page.locator('#lnkBack')).toBeVisible();

    // Bước 9–10: thêm 1 quyển → khung Truyện đã chọn: Doraemon - Tập 1, 1.
    await addQuantity(page, '1');
    await expect(page).toHaveURL(/\/SearchBookView\.jsp$/);
    await expect(selectedRows(page)).toHaveCount(1);
    await expect(selectedRows(page).nth(0)).toContainText(DORAEMON_1);
    await expect(page.getByTestId('quantity-1')).toHaveText('1');

    // Bước 11–12: "Conan" → DT020 (3), DT021 (2).
    await search(page, 'Conan');
    await expect(rows(page, 'tblBook')).toHaveCount(2);
    const conan = rows(page, 'tblBook');
    expect(await cellTexts(conan.nth(0))).toEqual(['DT020', CONAN_1, 'Gosho Aoyama', 'Trinh thám', '3.000đ', '3']);
    expect(await cellTexts(conan.nth(1))).toEqual(['DT021', 'Thám tử lừng danh Conan - Tập 2', 'Gosho Aoyama', 'Trinh thám', '3.000đ', '2']);

    // Bước 13–16: chọn DT020, thêm 1 → khung có hai dòng đúng thứ tự.
    await chooseBook(page, 20);
    await expect(page.locator('#bookCode')).toHaveText('DT020');
    await expect(page.locator('#availableCopies')).toHaveText('3');
    await expect(page.locator('main')).toContainText('Gosho Aoyama');
    await addQuantity(page, '1');
    await expect(page).toHaveURL(/\/SearchBookView\.jsp$/);
    await expect(selectedRows(page)).toHaveCount(2);
    await expect(selectedRows(page).nth(0)).toContainText(DORAEMON_1);
    await expect(selectedRows(page).nth(1)).toContainText(CONAN_1);
    await expect(page.getByTestId('quantity-1')).toHaveText('1');
    await expect(page.getByTestId('quantity-20')).toHaveText('1');

    // Bước 17–18: tích hai dòng, Tạo phiếu mượn → Xác nhận phiếu mượn.
    await createBillFromCart(page, [DORAEMON_1, CONAN_1]);
    await expect(page).toHaveURL(/\/ConfirmRentalBillView\.jsp$/);
    for (const t of ['PHIẾU MƯỢN', ANH.txtFullName, ANH.txtPhone, ANH.txtIdCard, ANH.txtEmail]) {
      await expect(page.locator('main')).toContainText(t);
    }
    await expect(rows(page, 'tblRentedBook')).toHaveCount(2);
    expect((await cellTexts(rows(page, 'tblRentedBook').nth(0))).slice(0, 4)).toEqual([DORAEMON_1, 'Fujiko F. Fujio', '3.000đ', '1']);
    expect((await cellTexts(rows(page, 'tblRentedBook').nth(1))).slice(0, 4)).toEqual([CONAN_1, 'Gosho Aoyama', '3.000đ', '1']);
    await expect(page.locator('#totalCopies')).toHaveText('2');
    await expect(page.locator('#discount')).toHaveText('0đ');

    // Bước 19–20: 7 ngày → mỗi đầu truyện 21.000đ, tổng 42.000đ (trang tự gửi lại khi đổi ô, C3).
    await setExpectedDays(page, '7');
    await expect(page.locator('#totalRentalPrice')).toHaveText('42.000đ');
    await expect(page.locator('#txtExpectedDays')).toHaveValue('7');
    expect((await cellTexts(rows(page, 'tblRentedBook').nth(0))).at(-1)).toBe('21.000đ');
    expect((await cellTexts(rows(page, 'tblRentedBook').nth(1))).at(-1)).toBe('21.000đ');
    await page.locator('#txtExpectedPickupAt').fill(isoLocal(pickupDay(), '09:00'));
    await expect(page.locator('#txtNote')).toHaveValue('');

    // Bước 21–24: Xác nhận → câu RENTAL_BILL_CREATED, giao diện chính; DB PM0125 Chờ nhận giữ DT001-03, DT020-02.
    await page.locator('#btnConfirm').click();
    await expectMessage(page, M.RENTAL_BILL_CREATED);
    await expect(page.locator('#lnkViewRentalBill')).toBeVisible();
    expect(billState(125)).toEqual({ status: 'Chờ nhận', cancelReason: '', barcodes: ['DT001-03', 'DT020-02'] });
    expect(billState(126)).toBeNull();

    // Phiếu mới đứng đầu danh sách: PM0125, giờ tạo hôm nay.
    await openBillList(page);
    const first = await cellTexts(rows(page, 'tblRentalBill').nth(0));
    expect(first[0]).toBe('PM0125');
    expect(first[1]).toMatch(new RegExp(`^\\d\\d:\\d\\d ${viDate(today).replaceAll('/', '\\/')}$`));
    expect(first.slice(2, 6)).toEqual([viDateTime(pickupDay(), '09:00'), '2', '42.000đ', 'Chờ nhận']);
  });

  test('ngoại lệ 2: sai mật khẩu → "Đăng nhập thất bại, vui lòng thử lại.", đăng nhập lại đúng', async ({ page }) => {
    await page.goto('/LoginView.jsp');
    await page.locator('#txtUsername').fill('minhanh');
    await page.locator('#txtPassword').fill('anh@2003');
    await page.locator('#btnLogin').click();
    // 2.1–2.2: thông báo, vẫn ở giao diện Đăng nhập.
    await expectMessage(page, M.LOGIN_FAILED);
    await expect(page).toHaveURL(/\/LoginView\.jsp$/);
    await expect(page.locator('#btnLogin')).toBeVisible();
    // 2.3–2.4: minhanh / Anh@2003 → giao diện chính của khách.
    await page.locator('#txtUsername').fill('minhanh');
    await page.locator('#txtPassword').fill('Anh@2003');
    await page.locator('#btnLogin').click();
    await expect(page).toHaveURL(/\/ClientHomeView\.jsp$/);
    await expect(page.locator('main')).toContainText(`Họ và tên: ${ANH.txtFullName}`);
  });

  test('ngoại lệ 5: "Thần đồng đất Việt" → "Không tìm thấy thông tin phù hợp.", tìm tiếp Doraemon', async ({ page }) => {
    await loginAnh(page);
    await openSearch(page);
    await search(page, 'Thần đồng đất Việt');
    // 5.1–5.3: thông báo, danh sách vẫn rỗng, vẫn ở Tìm truyện.
    await expectMessage(page, M.BOOK_NOT_FOUND);
    await expect(rows(page, 'tblBook')).toHaveCount(0);
    await expect(page.locator('#txtKeyword')).toBeVisible();
    // 5.4: tìm "Doraemon", tiếp từ bước 6.
    await search(page, 'Doraemon');
    await expect(messageBox(page)).toHaveCount(0);
    await expect(rows(page, 'tblBook')).toHaveCount(3);
    const codes = await rows(page, 'tblBook').locator('td:first-child').allInnerTexts();
    expect(codes.map((s) => s.trim())).toEqual(['DT001', 'DT002', 'DT015']);
  });

  test.describe('ngoại lệ 24 (PM0125 đã tạo như bước 22)', () => {
    test.beforeEach(() => {
      seedPM0125();
    });

    test('bước 24–24.1: Danh sách phiếu mượn PM0125, PM0117, PM0110; "Huỷ phiếu" chỉ ở phiếu Chờ nhận', async ({ page }) => {
      const t = vnToday();
      await loginAnh(page);
      await openBillList(page);
      await expect(rows(page, 'tblRentalBill')).toHaveCount(3);
      const r = rows(page, 'tblRentalBill');
      expect((await cellTexts(r.nth(0))).slice(0, 6)).toEqual(
        ['PM0125', viDateTime(t, '20:15'), viDateTime(addDays(t, 2), '09:00'), '2', '42.000đ', 'Chờ nhận']);
      expect((await cellTexts(r.nth(1))).slice(0, 6)).toEqual(
        ['PM0117', viDateTime(addDays(t, -1), '10:30'), viDateTime(addDays(t, 1), '18:00'), '1', '21.000đ', 'Chờ nhận']);
      expect((await cellTexts(r.nth(2))).slice(0, 6)).toEqual(
        ['PM0110', viDateTime(addDays(t, -9), '19:00'), viDateTime(addDays(t, -8), '10:00'), '2', '60.000đ', 'Đang cho thuê']);
      const values = (name: string) => page.locator(`button[name="${name}"]`).evaluateAll((els) => els.map((e) => (e as HTMLButtonElement).value));
      expect(await values('lnkViewDetail')).toEqual(['125', '117', '110']);
      expect(await values('lnkCancelRentalBill')).toEqual(['125', '117']);
    });

    test('bước 24.2–24.4: Xem chi tiết PM0125 rồi Quay lại danh sách', async ({ page }) => {
      const t = vnToday();
      await loginAnh(page);
      await openBillList(page);
      await page.locator('button[name="lnkViewDetail"][value="125"]').click();
      await expect(page).toHaveURL(/\/RentalBillDetailView\.jsp$/);
      // 24.3: khung phiếu mượn.
      const main = page.locator('main');
      await expect(main).toContainText(/PHIẾU MƯỢN\s*PM0125/);
      for (const text of [
        `Tên khách hàng: ${ANH.txtFullName}`, `Ngày giờ tạo phiếu: ${viDateTime(t, '20:15')}`,
        `Ngày giờ dự kiến đến nhận: ${viDateTime(addDays(t, 2), '09:00')}`, 'Số ngày thuê dự kiến: 7',
      ]) await expect(main).toContainText(text);
      await expect(page.locator('#status')).toHaveText('Chờ nhận');
      await expect(rows(page, 'tblRentedBook')).toHaveCount(2);
      expect(await cellTexts(rows(page, 'tblRentedBook').nth(0))).toEqual(['DT001-03', DORAEMON_1, '3.000đ', '1', '21.000đ']);
      expect(await cellTexts(rows(page, 'tblRentedBook').nth(1))).toEqual(['DT020-02', CONAN_1, '3.000đ', '1', '21.000đ']);
      await expect(page.locator('#totalCopies')).toHaveText('2');
      await expect(page.locator('#discount')).toHaveText('0đ');
      await expect(page.locator('#totalRentalPrice')).toHaveText('42.000đ');
      // 24.4: Quay lại → Danh sách phiếu mượn, đúng thứ tự.
      await page.locator('#lnkBack').click();
      await expect(page).toHaveURL(/\/RentalBillListView\.jsp$/);
      const codes = await rows(page, 'tblRentalBill').locator('td:first-child').allInnerTexts();
      expect(codes.map((s) => s.trim())).toEqual(['PM0125', 'PM0117', 'PM0110']);
    });

    test('bước 24.5–24.9: huỷ phiếu PM0117 với lí do "Đổi ý, chưa cần thuê nữa"', async ({ page }) => {
      await loginAnh(page);
      await openBillList(page);
      // 24.5–24.6: hộp xác nhận HTML (C2), không phải window.confirm.
      await page.locator('button[name="lnkCancelRentalBill"][value="117"]').click();
      await expect(page.locator('#cancelDialog')).toBeVisible();
      await expect(page.locator('#cancelDialogTitle')).toContainText('PM0117');
      await expect(page.locator('#cancelDialogText')).toHaveText(M.CANCEL_CONFIRM);
      await expect(page.locator('#btnConfirmCancel')).toHaveText('Xác nhận');
      await expect(page.locator('#btnCloseCancel')).toHaveText('Huỷ');
      // 24.7–24.8: lưu lí do, PM0117 "Đã huỷ", quyển DT020-01 không còn bị giữ.
      await page.locator('#txtCancelReason').fill('Đổi ý, chưa cần thuê nữa');
      await page.locator('#btnConfirmCancel').click();
      await expectMessage(page, M.CANCEL_SUCCESS);
      expect(billState(117)).toEqual({ status: 'Đã huỷ', cancelReason: 'Đổi ý, chưa cần thuê nữa', barcodes: ['DT020-01'] });
      // 24.9: danh sách cập nhật.
      await expect(page.locator('#cancelDialog')).toHaveCount(0);
      const r = rows(page, 'tblRentalBill');
      await expect(r).toHaveCount(3);
      const statuses = await r.locator('td:nth-child(6)').allInnerTexts();
      expect(statuses.map((s) => s.trim())).toEqual(['Chờ nhận', 'Đã huỷ', 'Đang cho thuê']);
      const cancelValues = await page.locator('button[name="lnkCancelRentalBill"]').evaluateAll((els) => els.map((e) => (e as HTMLButtonElement).value));
      expect(cancelValues).toEqual(['125']);
      await expect(page.locator('button[name="lnkViewDetail"]')).toHaveCount(3);
      // Quyển trả lại kho: Conan - Tập 1 còn 3 quyển (DT020-01 rảnh, DT020-02 vẫn thuộc PM0125), Doraemon - Tập 1 còn 4.
      await openSearch(page);
      await search(page, 'Conan');
      expect((await cellTexts(rows(page, 'tblBook').nth(0))).at(-1)).toBe('3');
      await search(page, 'Doraemon');
      expect((await cellTexts(rows(page, 'tblBook').nth(0))).at(-1)).toBe('4');
    });
  });

  test.describe('ngoài báo cáo (phase-06-integration.md §6, câu §10.3)', () => {
    test('Tạo phiếu mượn khi chưa tích dòng nào → "Vui lòng chọn đầu truyện."', async ({ page }) => {
      await loginAnh(page);
      await openSearch(page);
      await search(page, 'Doraemon');
      await chooseBook(page, 1);
      await addQuantity(page, '1');
      await page.getByRole('button', { name: 'Tạo phiếu mượn' }).click();
      await expectMessage(page, M.BOOK_NOT_CHOSEN);
      await expect(page).toHaveURL(/\/SearchBookView\.jsp$/);
    });

    test('số lượng không hợp lệ và vượt quá số quyển hiện có ở Chi tiết đầu truyện', async ({ page }) => {
      await loginAnh(page);
      await openSearch(page);
      await search(page, 'Doraemon');
      await chooseBook(page, 1);
      await addQuantity(page, '0');
      await expectMessage(page, M.QUANTITY_INVALID);
      await expect(page.locator('#txtQuantity')).toHaveAttribute('aria-invalid', 'true');
      await addQuantity(page, '6');
      await expectMessage(page, M.QUANTITY_EXCEEDED_5);
      await expect(selectedRows(page)).toHaveCount(0);
    });

    test('Xoá đầu truyện khỏi Truyện đã chọn', async ({ page }) => {
      await loginAnh(page);
      await fillCartAsChapter2(page);
      await page.locator('#frmSelectedBook').getByRole('button', { name: `Xoá ${DORAEMON_1} khỏi truyện đã chọn` }).click();
      await expect(selectedRows(page)).toHaveCount(1);
      await expect(selectedRows(page).nth(0)).toContainText(CONAN_1);
    });

    test('Xác nhận phiếu với số ngày 0, 31, hẹn đã qua → câu báo, không tạo phiếu', async ({ page }) => {
      await loginAnh(page);
      await fillCartAsChapter2(page);
      await createBillFromCart(page, [DORAEMON_1, CONAN_1]);
      await expect(page).toHaveURL(/\/ConfirmRentalBillView\.jsp$/);
      const pickup = page.locator('#txtExpectedPickupAt');
      const cases: Array<[string, string, string]> = [
        ['0', isoLocal(pickupDay(), '09:00'), M.EXPECTED_DAYS_INVALID],
        ['31', isoLocal(pickupDay(), '09:00'), M.EXPECTED_DAYS_TOO_LONG],
        ['7', isoLocal(addDays(vnToday(), -1), '09:00'), M.PICKUP_TIME_INVALID],
      ];
      for (const [days, at, message] of cases) {
        await setExpectedDays(page, days);
        await pickup.fill(at);
        await submitVia(page, () => page.locator('#btnConfirm').click());
        await expectMessage(page, message);
      }
      expect(billState(125)).toBeNull();
    });

    test('hộp huỷ: lí do trống → "Vui lòng nhập lí do huỷ.", nút Huỷ đóng hộp, phiếu giữ nguyên', async ({ page }) => {
      await loginAnh(page);
      await openBillList(page);
      await page.locator('button[name="lnkCancelRentalBill"][value="117"]').click();
      await page.locator('#txtCancelReason').fill('   ');
      await page.locator('#btnConfirmCancel').click();
      await expectMessage(page, M.CANCEL_REASON_REQUIRED);
      await expect(page.locator('#txtCancelReason')).toBeVisible();
      await page.locator('#btnCloseCancel').click();
      await expect(page.locator('#cancelDialog')).toHaveCount(0);
      expect(billState(117)?.status).toBe('Chờ nhận');
    });
  });
});
