# Phase 6, lane 6H `xac-minh-con-lai`: kiểm nốt bằng Playwright MCP

Ngày 11/11/2026, 12:00–12:15. Stack `tiemtruyen-m2`, http://127.0.0.1:8083 (không đụng 8080). Lane không sửa code, không commit.
Dữ liệu: `resetChapter2()` → đăng kí `minhanh` qua web ở khổ 390 (giá trị của `scripts/smoke/flow-m1-m2.mjs`) → `seedChapter22Bills()`.
Mọi bước chạy bằng `browser_run_code_unsafe`, mỗi lần nghe `console` (error, warning), `response` (≥ 400) và `requestfailed`.

**Trạng thái: DONE_WITH_CONCERNS.** A, B, C, D (luồng), F, G PASS. E FAIL vì stack 8083 build trước bản sửa. D phát hiện bảng ở khổ 390 bị ngắt chữ giữa từ (lỗi 2).

## Bảng mục × khổ × JS

| Mục | Bước | Khổ | JS | Kết quả | Bằng chứng |
|---|---|---|---|---|---|
| A | SearchBookView: island không gắn, 2 phần tử `data-island-fallback` hiện, bảng `tblSelectedBook` HTML | 1440 | tắt (giả lập, ghi chú 1) | PASS | `m2/SearchBookView-truyen-da-chon-1440-nojs.png` |
| A | Tìm "Doraemon", chọn DT001, thêm 2 quyển; thêm DT020 ×1 → bảng: "Doraemon - Tập 1 · 2", "Conan - Tập 1 · 1", mỗi dòng có `chkSelectedBook` và nút `lnkDeleteSelectedBook` "Xoá" | 1440 | tắt | PASS | như trên |
| A | Đúng **một** nút "Tạo phiếu mượn" nhìn thấy | 1440 | tắt | PASS | đếm phần tử nhìn thấy = 1 |
| A | "Xoá" dòng Conan → còn 1 dòng Doraemon; tích dòng Doraemon, "Tạo phiếu mượn" → ConfirmRentalBillView | 1440 | tắt | PASS | |
| A | `btnRecalculate` "Tính lại" (trong `<noscript>`) hiện; 3 ngày → dòng 18.000đ, tổng 18.000đ; đổi 5 ngày → 30.000đ; giữ ngày giờ hẹn `2026-11-12T09:00` | 1440 | tắt | PASS | `m2/ConfirmRentalBillView-mac-dinh-1440-nojs.png`, `m2/ConfirmRentalBillView-tinh-lai-3-ngay-1440-nojs.png` |
| A | "Xác nhận" → "Tạo phiếu mượn thành công! Vui lòng đến quầy vào ngày giờ đã hẹn để đặt cọc và nhận truyện." (không có nút OK khi tắt JS, đúng thiết kế); DB: PM0126 "Chờ nhận", 5 ngày, giữ DT001-04, DT001-05 | 1440 | tắt | PASS | `m2/ClientHomeView-RENTAL_BILL_CREATED-1440-nojs.png`, `billState(126)` |
| B | C21: tab 1 tới ConfirmRentalBillView (DT002 + DT020, 7 ngày, 42.000đ); tab 2 (cùng cookie) mở SearchBookView, "Xoá" dòng Conan của island; tab 1 "Xác nhận" → trang "Tìm truyện" có "Truyện đã chọn đã thay đổi, vui lòng kiểm tra lại.", POST `doAddRentalBill.jsp` 200 (không 500); "Truyện đã chọn" còn đúng dòng DT002 | 1440 | bật | PASS | `m2/SearchBookView-tab2-da-xoa-Conan-1440.png`, `m2/SearchBookView-C21-SELECTED_BOOKS_CHANGED-1440.png` |
| B | DB sau C21: chỉ 110, 117, 125, 126 (không thêm phiếu), không `tblRentedBook` lạ; log `app` 10 phút không có exception | n/a | n/a | PASS | `sql(...)`, `docker logs` |
| C | RentalBillListView: PM0126, PM0125, PM0117, PM0110 (mới nhất trước); nút "Huỷ phiếu" chỉ ở 126, 125, 117 | 1440 | bật | PASS | `m2/RentalBillListView-4-phieu-1440.png` |
| C | RentalBillDetailView PM0126: DT001-04, DT001-05, tổng 30.000đ; "Quay lại" → danh sách 4 dòng | 1440 | bật | PASS | `m2/RentalBillDetailView-PM0126-1440.png` |
| C | Huỷ PM0117: hộp có `txtCancelReason`, `btnConfirmCancel`, `btnCloseCancel` | 1440 | bật | PASS | `m2/RentalBillListView-hop-huy-PM0117-1440.png` |
| C | C17 lí do trống → "Vui lòng nhập lí do huỷ.", hộp vẫn mở, ô `aria-invalid="true"`; OK → focus `txtCancelReason` | 1440 | bật | PASS | `m2/RentalBillListView-C17-CANCEL_REASON_REQUIRED-1440.png` |
| C | Lí do "Đổi ý, chưa cần thuê nữa" → "Huỷ phiếu mượn thành công!", PM0117 "Đã huỷ", chỉ 126, 125 còn nút huỷ; DB status "Đã huỷ", cancelReason đúng chuỗi, barcodes DT020-01 | 1440 | bật | PASS | `m2/RentalBillListView-CANCEL_SUCCESS-1440.png` |
| D | 2.1: HomeView → "Đăng kí" → RegisterView → đăng kí minhanh → "Đăng kí tài khoản thành công!" ở LoginView → đăng nhập → ClientHomeView "Trần Minh Anh" → Đăng xuất → HomeView; `scrollWidth` = 390 ở mọi trang | 390 | bật | PASS | `m1/HomeView-mac-dinh-390.png`, `m1/RegisterView-trong-390.png`, `m1/LoginView-REGISTER_SUCCESS-390.png`, `m1/ClientHomeView-dang-nhap-390.png`, `m1/HomeView-sau-dang-xuat-390.png` |
| D | 2.2: SearchBookView trống, tìm Doraemon, BookDetailView DT001, thêm DT001 ×1 và DT020 ×1, island 2 dòng (fallback `hidden`), tích 2 dòng đổi `chkSelectedBook` 1, 20 thành checked, một nút "Tạo phiếu mượn", Confirm, Xác nhận → RENTAL_BILL_CREATED nguyên văn, danh sách PM0125/PM0117/PM0110, chi tiết PM0125 (DT001-03, DT020-02, 42.000đ); `scrollWidth` = 390 ở mọi trang | 390 | bật | PASS (không tràn ngang) | `m2/SearchBookView-*-390.png`, `m2/BookDetailView-DT001-390.png`, `m2/ConfirmRentalBillView-mac-dinh-390.png`, `m2/RentalBillListView-3-phieu-390.png`, `m2/RentalBillDetailView-PM0125-390.png` |
| D | Gõ phím thật "2" rồi Tab ở ô số ngày → trang tự tính lại 6.000đ, giữ ngày giờ hẹn | 390 | bật | PASS | `m2/ConfirmRentalBillView-2-ngay-390.png` |
| D | Đọc được nội dung bảng | 390 | bật | **FAIL** (lỗi 2) | `m2/RentalBillListView-sau-huy-390.png`, `m2/ConfirmRentalBillView-7-ngay-390.png` |
| D | Ảnh ClientHomeView sau RENTAL_BILL_CREATED | 390 | bật | thiếu ảnh (screenshot quá 20 s; câu báo đã đọc đúng) | |
| E | LoginView minhanh / `anh@2003` → "Đăng nhập thất bại, vui lòng thử lại."; bấm OK → hộp ẩn nhưng focus **không** về `txtUsername` (vẫn ở nút OK đã ẩn) | 1440 | bật | **FAIL** (lỗi 1) | `m1/LoginView-LOGIN_FAILED-sau-OK-1440.png` |
| E | RegisterView gửi trống → "Thông tin không hợp lệ, vui lòng kiểm tra lại."; OK → focus `BODY`, không về `txtFullName` | 1440 | bật | **FAIL** (lỗi 1) | `m1/RegisterView-REGISTER_INVALID-sau-OK-1440.png` |
| F | SearchBookView có JS: phần tử có chữ "Truyện đã chọn" = `H3` của trang (nhìn thấy), `CAPTION` của fallback (trong `[data-island-fallback][hidden]`), `CAPTION` của island (lớp `sr-only`). Mắt chỉ thấy **một** tiêu đề | 1440, 390 | bật | PASS, không phải lỗi | `m2/SearchBookView-island-2-dong-1440.png`, `m2/SearchBookView-island-2-dong-390.png` |
| G | `reducedMotion: reduce`: island `data-motion="reduced"`, các `tr[data-book-id]` không có lớp nào, `transition-duration` 1e-05s, `animation-name: none`, `transform: none`, trước và sau khi tích. Đối chứng `no-preference`: `data-motion="full"`, lớp `motion-safe:transition … duration-300 … translate-x-2`, `transition-duration: 0.3s` (phép kiểm có đi đỏ được) | 1440 | bật | PASS | `m2/SearchBookView-island-reduced-motion-1440.png` |

Console suốt lane: 0 error, 0 warning của trang. Các dòng `ERR_BLOCKED_BY_CLIENT` cho `island-loader-*.js` do chính giả lập tắt JS chặn script (mục A), không phải lỗi web. Một dòng **info** "Autofocus processing was blocked because a document already has a focused element" ở `doCancelRentalBill.jsp` (ghi chú 3). Network: 0 response ≥ 400, 0 request hỏng ở mọi lượt.

## Lỗi

1. **E: nút OK chưa đưa focus về ô nhập đầu, vì stack 8083 build trước bản sửa.** App và nginx của `tiemtruyen-m2` tạo lúc 11:56 (+07), commit sửa `258c6f5` lúc 12:03. `island-loader-D43DBsYd.js` đang phục vụ còn mã cũ: `dismissMessage` chỉ focus ô `[aria-invalid="true"]`, không có `FIRST_FIELD_SELECTOR`. Đây là kết quả trên bản build cũ, chưa phải bằng chứng bản sửa hỏng. Cần kiểm lại E trên stack có `258c6f5` (8080 sau khi build xong): mở `/LoginView.jsp`, đăng nhập sai, bấm OK, đọc `document.activeElement.id` (mong `txtUsername`); `/RegisterView.jsp` gửi trống, OK (mong `txtFullName`). Trong lúc chờ: C17 ở RentalBillListView (có `aria-invalid`) đã đưa focus về `txtCancelReason` đúng.
2. **Khổ 390: chữ trong bảng `tt-ledger-table` bị ngắt giữa từ, giữa số.** Không tràn ngang (`scrollWidth` = 390), nhưng bảng co về 358 px và cắt chữ: "PM / 012 / 6", "30. / 00 / 0đ", "Ch / ờ / nh / ận", "Fujik / o F.", tiêu đề "Tổ / ng / tiề / n". Gặp ở RentalBillListView, ConfirmRentalBillView (và các bảng cùng lớp). Nguyên nhân: `frontend/src/styles/components.css:219` đặt `overflow-wrap: anywhere` cho `.tt-ledger-table th, td`, làm min-content của ô gần bằng một kí tự nên bảng co lại thay vì cuộn trong `div.overflow-x-auto` bao ngoài. Tái hiện: khổ 390×844, đăng nhập minhanh, mở `/RentalBillListView.jsp`. Hướng sửa (lane UI quyết): bỏ `overflow-wrap: anywhere` khỏi ô mã, tiền, ngày giờ, trạng thái (`white-space: nowrap`) để bảng cuộn ngang trong khung, hoặc đổi bảng sang bố cục thẻ ở khổ hẹp.

## Ghi chú

1. **Tắt JS là giả lập, không phải `javaScriptEnabled: false`.** Playwright MCP ở đây là "Extension-Bridge": `browser.newContext()` và `newCDPSession()` đều trả `Not allowed`; `require` và `import()` không dùng được. Cách đã dùng: `page.route` chặn mọi request script, viết lại tài liệu HTML (bỏ thẻ `<script>`, bỏ thẻ `<noscript>` giữ nội dung bên trong), để trình duyệt tự theo redirect; trang đến sau redirect thì `goto` lại để chắc đã viết lại (`noscriptLeft = 0` ở mọi bước có kiểm). Hiển thị tương đương trình duyệt tắt JS. Phase 8 vẫn nên có test E2E với `javaScriptEnabled: false` thật.
2. F: tiêu đề không lặp với người nhìn. Trình đọc màn hình nghe "Truyện đã chọn" hai lần (`h3` và `caption` `sr-only` của island); thừa nhẹ, không trái hợp đồng. Ảnh 1440: hình thoi trang trí ở đầu sợi chỉ của chồng truyện đè lên chữ "Chọn" của tiêu đề cột (`m2/SearchBookView-island-2-dong-1440.png`), lỗi thẩm mĩ nhỏ.
3. Hộp huỷ có `autofocus` (Chrome báo info vì loader đã đặt focus vào OK trước). Không ảnh hưởng: sau OK focus về ô lí do.
4. Session cũ trong Redis còn sống sau `resetChapter2()`: lúc bắt đầu, `/RegisterView.jsp` chuyển về ClientHomeView của tài khoản đã bị xoá khỏi DB. Do cách đặt lại dữ liệu test; đăng xuất là sạch. Smoke và E2E nên đăng xuất hoặc xoá cookie sau khi reset.
5. `fill()` + `dispatchEvent("change")` không làm trang tự tính lại; gõ phím thật rồi Tab thì có (1440 và 390). Test E2E nên dùng `pressSequentially` + Tab.
6. Chi tiết PM0126 hiện "Ghi chú:" trống; `258c6f5` đổi thành "(chưa ghi nhận)" nhưng 8083 chưa có bản đó.

## DB 8083 lúc dừng

PM0110 "Đang cho thuê", PM0117 "Đã huỷ", PM0125 "Chờ nhận" (DT001-03, DT020-02), PM0126 "Chờ nhận" (DT001-04, DT001-05); giỏ minhanh còn 1 dòng tự do DT002 (`tblSelectedBook.id` 10). Trình duyệt còn đăng nhập minhanh ở 8083.
