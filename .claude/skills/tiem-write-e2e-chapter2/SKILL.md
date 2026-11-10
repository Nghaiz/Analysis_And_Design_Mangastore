---
name: tiem-write-e2e-chapter2
description: Dùng khi viết test Playwright E2E theo kịch bản ch.2 (đăng kí, tìm chọn truyện, nhận truyện tại quầy): ngày tương đối, thông báo nguyên văn, 390×844 và 1440×900, console sạch.
effort: high
---

# Viết E2E theo kịch bản chương 2

Bộ Playwright ở `e2e/` đi hết 3 kịch bản chuẩn và mọi ngoại lệ của ch.2 báo cáo trên seed E2E, so thông báo từng chữ, so mã, giá, tổng. Đây là cổng của phase 8 (có từ phase 8; seed và stack E2E có từ phase 6).

## Đọc trước

- Báo cáo PDF ch.2 (trang in 5–19 = trang PDF 7–21, đọc bằng `Read` với `pages`): mục 2.1 đăng kí, 2.2 tìm và chọn truyện, 2.3 nhận truyện tại quầy.
- `docs/contracts.md` §10.1 (28 câu), §10.2 (bốn điều kiện), §9.2 (field của từng trang), §13 (định dạng), §12 (phân quyền), §14 C1, C7.
- `plans/261111-tiem-thue-truyen/phase-08-e2e-ci-hoan-thien.md` lane 8A; `plan.md` Deferred #10, #15, #23.

## Các bước

1. **Cấu hình** `e2e/playwright.config.ts`: hai project `mobile` (viewport 390×844, `hasTouch: true`) và `desktop` (1440×900); `workers: 1`, `fullyParallel: false`; `baseURL` là nginx của stack E2E `http://127.0.0.1:8080`; `timezoneId: 'Asia/Ho_Chi_Minh'`, `locale: 'vi-VN'`.
2. **File test:** `e2e/tests/01-dang-ki.spec.ts` (2.1), `02-tim-chon-truyen.spec.ts` (2.2), `03-nhan-truyen-tai-quay.spec.ts` (2.3), `bao-mat.spec.ts`. Mỗi file một `test.describe` theo mục ch.2: một `test` cho kịch bản chuẩn, một `test` cho **từng** ngoại lệ (đặt tên theo số bước ch.2, ví dụ `bước 24.1: huỷ phiếu PM0125`).
3. **Đặt lại DB trước mỗi kịch bản** trong `e2e/fixtures/`: chạy SQL qua `docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml exec -T db mysql ...`. Trạng thái riêng từng kịch bản: khách `minhanh`, phiếu PM0110 và PM0117 cho 2.2, `AUTO_INCREMENT` của `tblRentalBill` = 125 (phiếu mới là PM0125), quyển 01, 02 của DT001 và quyển 01 của DT020 bị giữ để quyển được gán là DT001-03, DT020-02 (Deferred #10).
4. **Ngày tương đối (Deferred #15):** ch.2 dùng 23–25/09/2026, đã qua. Tính ngày theo lúc chạy, **giữ giờ trong ngày** của ch.2, ở múi `Asia/Ho_Chi_Minh`; một helper `e2e/fixtures/dates.ts` định dạng `dd/MM/yyyy` và `HH:mm dd/MM/yyyy` (§13). Ngày mượn = hôm nay, ngày hẹn trả = hôm nay + `expectedDays` (C7). Tên, mã, giá, tổng giữ nguyên văn ch.2.
5. **Thông báo nguyên văn:** gõ câu mong đợi trong test (chép từ `docs/contracts.md` §10.1), so bằng `toHaveText(câu)` nguyên câu, không `toContainText` một mẩu. `QUANTITY_EXCEEDED` thay đúng chữ `N` bằng số (ví dụ "(hiện còn 4 quyển)"). Không sinh câu mong đợi từ `Messages.java` (test sẽ không bao giờ đỏ).
6. **Định vị bằng `id` của hợp đồng** (`#txtUsername`, `#btnSearch`, `button[name="lnkChooseRentalBill"][value="125"]`): `id` = `name` = tên §9.2 / C1, ổn định hơn nhãn. Kiểm chữ hiển thị (tiêu đề, nhãn, mã `DT001`, `PM0125`, `3.000đ`) bằng `toHaveText`.
7. **Console và network sạch là điều kiện của mọi test:** fixture gắn `page.on('console')` (type `error`, `warning`), `page.on('pageerror')`, `page.on('requestfailed')`, `page.on('response')` (status ≥ 400) và làm test thất bại ở `afterEach` kèm danh sách. Ngoại lệ có chủ đích (ví dụ 403 của test CSRF) khai rõ trong chính test đó.
8. **`bao-mat.spec.ts`:** POST thiếu token CSRF → 403; khách vào `/nhan-vien/*` và nhân viên vào trang khách bị chặn (§12); `emulateMedia({ reducedMotion: 'reduce' })` không còn hoạt cảnh; `@axe-core/playwright` với tag `wcag2a`, `wcag2aa` trên mọi trang có giao diện, không vi phạm.
9. **Làm đỏ có chủ đích một lần:** đổi một chữ trong một câu mong đợi → bộ test phải đỏ; ghi kết quả vào báo cáo lane rồi trả lại.
10. Trước khi chạy bộ trong repo, đi lại một lượt mỗi kịch bản bằng Playwright MCP trên stack E2E để kiểm fixture.

## Gotchas

- Máy chạy test có thể ở UTC (CI); tính "hôm nay" ở `Asia/Ho_Chi_Minh`, nếu không gần nửa đêm ngày lệch một ngày và test chập chờn.
- "huỷ" (dấu trên y) là cách viết của dự án và báo cáo; chép câu từ `docs/contracts.md`, không gõ lại thành "hủy". Chữ chép từ PDF có thể là Unicode NFD: chuẩn hoá `normalize('NFC')` trước khi dán vào test.
- `toHaveText` với chuỗi so khớp sau khi gom khoảng trắng; vẫn phải là nguyên câu. Dùng regex thì neo `^...$`.
- Hộp "Xác nhận huỷ phiếu mượn" là HTML của trang (C2), không phải `window.confirm`; không dùng `page.on('dialog')`.
- "In phiếu" gọi `window.print()` qua loader; stub bằng `page.addInitScript(() => { window.print = () => {} })` rồi khẳng định trang chuyển sang StaffHomeView.
- DB dùng chung cho mọi test: giữ `workers: 1` và đặt lại DB trước mỗi kịch bản; không dựa vào thứ tự file.
- Đăng nhập sai nhiều lần bị chặn sau ngưỡng `LOGIN_RATE_*`; `compose.e2e.yaml` đặt ngưỡng cao hơn số lần sai của kịch bản. Câu khi bị chặn vẫn là `LOGIN_FAILED`.
- Stack E2E và stack thường dùng chung cổng trên máy: dừng stack thường trước (`docker compose down`, không `-v`).
- Danh sách phiếu xếp mới nhất trước (PM0125, PM0117, PM0110); so thứ tự dòng, không chỉ có mặt.

## Lệnh kiểm

| Việc | Lệnh | Có từ |
|---|---|---|
| Dựng stack E2E (seed E2E, volume riêng) | `docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml up --build -d --wait` | phase 6 |
| Cài gói E2E và trình duyệt | `npm --prefix e2e ci && npx --prefix e2e playwright install chromium` | phase 8 |
| Chạy toàn bộ E2E | `cd e2e && npx playwright test` | phase 8 |
| Chạy một file, một project | `cd e2e && npx playwright test tests/02-tim-chon-truyen.spec.ts --project=mobile` | phase 8 |
| Dừng stack E2E, giữ volume | `docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml down` | phase 6 |
| Accept phase 8 | `node scripts/accept/phase-08.mjs` | phase 8 |

## Danh sách kiểm tra

- [ ] Hai project 390×844 và 1440×900, `workers: 1`, múi giờ `Asia/Ho_Chi_Minh`.
- [ ] Kịch bản chuẩn và **mọi** ngoại lệ của 2.1, 2.2, 2.3, mỗi cái một test.
- [ ] DB đặt lại trước mỗi kịch bản; seed tái tạo PM0125, DT001-03, DT020-02.
- [ ] Ngày tương đối, giữ giờ trong ngày của ch.2, định dạng §13.
- [ ] Thông báo so nguyên câu với §10.1; mã, giá, tổng so đúng.
- [ ] Fixture làm đỏ khi có console error/warning, pageerror, request hỏng hay ≥ 400.
- [ ] `bao-mat.spec.ts`: CSRF 403, chặn chéo vai, giảm chuyển động, axe AA.
- [ ] Đã làm đỏ có chủ đích một lần; cả hai project xanh.
