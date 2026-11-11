# Phase 7 lane 7F `xac-minh-quan-tri`: kiểm trang quản trị D6 bằng Playwright MCP

Trạng thái: **DONE_WITH_CONCERNS**. Mọi kiểm đều PASS, không thấy lỗi. Còn thiếu ảnh khổ 390 của ManageBookView, AddBookView, EditBookView và ảnh 1440 của AddBookView, vì lệnh chụp của relay hay hết giờ (xem báo cáo 7E, mục "Ghi chú môi trường").

Stack `tiemtruyen-7e`, http://localhost:8087. Ảnh build lại lúc khoảng 12:14, có 5dade05. Kiểm sau 7E, cùng trình duyệt. Dùng `localhost` thay vì `127.0.0.1` để cookie không lẫn với phiên phase 6. Ảnh: `plans/reports/screens/phase-07/quan-tri/`.

| Bước | Trang | Khổ đã chụp | Kết quả |
|---|---|---|---|
| `hant` (Nhân viên bán hàng) mở thẳng `/nhan-vien/quan-tri/ManageBookView.jsp` | trang lỗi 403 "Không được vào trang này" | 390, 1440 (`01-hant-403-*`) | PASS: HTTP 403 (§12). Console có đúng 1 dòng "Failed to load resource: 403", đó là lỗi cố ý của kịch bản. StaffHomeView của `hant` không có lối vào quản trị (báo cáo 7E) |
| `quanli` / `quanli@123` đăng nhập | StaffHomeView | 390, 1440 (`02-quanli-home-*`) | PASS: "Họ và tên: Phạm Quốc Huy", "Chức vụ: Quản lí", khối "Quản trị" ghi "Phần thêm ngoài báo cáo (D6), chỉ dành cho Quản lí.", link "Quản lí đầu truyện" (C12) |
| Mở ManageBookView | `quan-tri/ManageBookView.jsp` | 1440 (`03-manage-1440`) | PASS: 200, ghi rõ phần ngoài báo cáo, ô tìm, "Thêm đầu truyện", "Quay lại", bảng 9 cột |
| "Lưu" với form trống | `doAddBook.jsp` | (không chụp) | PASS: `aria-invalid="true"` trên `txtName`, `txtAuthor`, `txtCategory`, `txtRentalPrice`; không có câu báo (C10, §3.4) |
| Thêm "Shin - Cậu bé bút chì - Tập 1", Yoshito Usui, Thiếu nhi, 2025, 3000, 2 quyển | `doAddBook.jsp` → ManageBookView | (`04-manage-sau-them-1440` hết giờ) | PASS: quay về danh sách với DT024, 3.000đ, 2 quyển sẵn sàng |
| "Sửa" DT024: thêm NXB "Kim Đồng", 1 quyển mới | `EditBookView.jsp` → `doUpdateBook.jsp` | 1440 (`05-edit-book-1440`) | PASS: trang ghi rõ phần ngoài báo cáo, "Quyển đang sẵn sàng (2): DT024-01, DT024-02". Sau "Lưu", danh sách hiện Kim Đồng và 3 quyển |

DB (đọc lại bằng `mysql` trong container): `tblBook` id 24 "Shin - Cậu bé bút chì - Tập 1", publisher "Kim Đồng", publishYear 2025, rentalPrice 3000; quyển DT024-01, DT024-02, DT024-03. Mã vạch theo D8, quyển mới nối tiếp số lớn nhất đang có.

Console: 0 error và 0 warning ngoài dòng 403 cố ý. Network: không request nào ≥ 400 ngoài GET 403 của `hant`.

Dữ liệu để lại trên DB E2E của `tiemtruyen-7e`: đầu truyện DT024 với 3 quyển. Seed M3 (`resetChapter2`) có dọn DT024 hay không thì chưa kiểm.

Chưa kiểm: các ô nhập sai còn lại của §3.4 (`txtRentalPrice` âm hay chữ, năm trước 1900, `txtCopyCount` > 99, vượt độ dài cột), hai đầu truyện cùng tên, EditBookView khi không có `book`. Probe HTTP `plans/reports/phase-07-quan-tri-probe.mjs` của orchestrator đã PASS các mục này.
