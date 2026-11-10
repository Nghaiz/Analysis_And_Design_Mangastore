# Phase 3, bước 3.6: Workbench reverse engineer so với ERD thiết kế

Ngày 11/11/2026. Người làm: orchestrator, qua cua-driver MCP. Không dùng script GUI tự viết.

## 1. Kết quả

**Khớp.** MySQL Workbench 8.0, Database → Reverse Engineer vào MySQL của compose (`127.0.0.1:3307`, tài khoản `tiemtruyen`, schema `tiemtruyen`) báo "14 tables from schema 'tiemtruyen'": 13 bảng nghiệp vụ cộng `flyway_schema_history` (bảng của Flyway, không thuộc ERD). Sơ đồ EER vẽ đủ 13 bảng và các đường khoá ngoại.

Ảnh chụp (bị ignore, chỉ có trên máy): `plans/reports/screens/phase-03-workbench-erd.png` (zoom 50%, toàn sơ đồ), `plans/reports/screens/phase-03-workbench-erd-raw.png` (zoom 100%, nửa trên).

## 2. Đối chiếu với `images/svg/design_database.svg`

Đọc chữ trong SVG (tên bảng, cột, kiểu) và so với `information_schema` của DB vừa reverse engineer.

| Bảng | Số cột SVG | Số cột DB | Khoá ngoại DB |
|---|---|---|---|
| tblUser | 4 | 4 | |
| tblClient | 6 | 6 | userId → tblUser.id |
| tblStaff | 2 | 2 | userId → tblUser.id |
| tblBook | 8 | 8 | |
| tblBookCopy | 3 | 3 | bookId → tblBook.id |
| tblDamage | 3 | 3 | |
| tblCollateral | 3 | 3 | |
| tblCart | 2 | 2 | clientId → tblClient.userId |
| tblSelectedBook | 3 | 3 | cartId → tblCart.id; bookCopyId → tblBookCopy.id |
| tblRentalBill | 12 | 12 | clientId → tblClient.userId; staffId → tblStaff.userId |
| tblRentedBook | 6 | 6 | rentalBillId → tblRentalBill.id; bookCopyId → tblBookCopy.id; selectedBookId → tblSelectedBook.id |
| tblRentedDamage | 4 | 4 | rentedBookId → tblRentedBook.id; damageId → tblDamage.id |
| tblRentalCollateral | 5 | 5 | rentalBillId → tblRentalBill.id; collateralId → tblCollateral.id |

- 15 cột khoá ngoại của SVG đều là khoá ngoại thật trong DB, không thừa không thiếu.
- Kiểu: `integer(10)` của SVG là `INT`, `float(10)` là `FLOAT`, `varchar(n)`, `date`, `timestamp` giữ nguyên.
- **Khác biệt duy nhất:** `tblUser.password` là `varchar(255)` thay vì `varchar(50)`, đúng D1 (chứa băm Argon2id, `docs/contracts.md` mục 2).
- Kiểm chi tiết từng cột, NULL, UNIQUE, index nằm ở `SchemaConformanceTest` (so với `docs/contracts.md` mục 2), chạy trong Accept bước 1.

## 3. Cách làm và trở ngại

- `launch_app` Workbench, `get_window_state` cửa sổ chính, mở Database → Reverse Engineer. `invoke_menu` hỏng (`InvokePattern ... Pattern not found`); bấm phần tử menu theo `element_token` thì mở được.
- Cửa sổ wizard là WinForms: cây UIA không trả lời trong 4 giây ở mọi lần gọi, kể cả khi giới hạn `max_elements`, `max_depth`. Nên không dùng được `element_token` và `verify_state` (cần cây UIA). Thay vào đó, sau **mỗi** lần bấm đều chụp lại cửa sổ bằng `get_window_state(include_accessibility_tree:false)` và đọc ảnh; hộp thoại mật khẩu mở ra thì chụp theo `window_id` của chính nó.
- Gửi ở nền (`background`) không tới cửa sổ: `type_text` trả `delivery_failed`. Chuyển sang `delivery_mode:"foreground"`.
- Workbench không nhận DPI: nội dung vẽ ở 2/3 khung chụp, toạ độ bấm thật bằng toạ độ trên ảnh nhân 1,5. Thử một kí tự, đọc lại ảnh, rồi mới điền.
- Mật khẩu DB đưa vào clipboard từ `.env` bằng lệnh shell rồi dán, không in ra và không gõ trong lệnh; xoá clipboard ngay sau khi kết nối. Không lưu mật khẩu vào vault của Workbench.
- Không phải UIPI: Workbench chạy cùng mức integrity, bấm foreground ăn ngay.
- Xong thì đóng Workbench, chọn "Don't Save" (mô hình tạm). `kill_app` bị từ chối vì runtime không chứng minh được nó tự mở tiến trình; đóng bằng nút X.

## 4. Việc cho sau

Không có. Bước này chỉ đối chiếu, không sửa schema.
