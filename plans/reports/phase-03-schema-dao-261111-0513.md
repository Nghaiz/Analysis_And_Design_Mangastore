# Phase 3: Schema, DAO và test (báo cáo phase)

Ngày 11/11/2026. Nhánh `phase/03-schema-dao`. Orchestrator: phiên cook thứ 3. Trạng thái: **DONE**.

## 1. Accept

`node scripts/accept/phase-03.mjs` → `[accept] ALL PASS` (log `plans/reports/accept-phase-03-261111-0505.log`, bị ignore):

| Bước | Kết quả |
|---|---|
| 1 `mvnw -B clean verify` (Testcontainers `mysql:8.4.13`, Checkstyle) | PASS, 23 lớp test, 246 test, 0 hỏng |
| 3 compose khởi động lại, `MigrationListener` chạy Flyway, `/health.jsp` | PASS, 200, `tblDamage = 8` |
| 4 Accept phase 1, phase 2 | PASS cả hai |

## 2. Tiêu chí hoàn thành

| # | Tiêu chí | Bằng chứng |
|---|---|---|
| 1 | `verify` xanh: Flyway V1, V2 (và V10 e2e), mọi test DAO, 4 test tranh chấp, `SchemaConformanceTest`, `ArchitectureTest`, `MessagesTest`, `SerializationTest` | Accept bước 1; script đòi đủ năm lớp và `RentalBillConcurrencyTest` ≥ 4 test |
| 2 | Làm đỏ có chủ đích | Mục 3 |
| 3 | Compose khởi động lại sạch | Accept bước 3 |
| 4 | Accept phase 1, 2 xanh | Accept bước 4 |

## 3. Làm đỏ có chủ đích (không commit bản lỗi)

| Sửa tạm | Kết quả | Ai |
|---|---|---|
| Bỏ `FOR UPDATE` ở bước (1) của K1 | 50/63 lượt tranh chấp đỏ: (1) 25/25 cả hai luồng cùng giữ quyển cuối, (2) 15/15 có 10 phiếu thắng thay vì 7, (3) 10/10 hai luồng cùng nhận DT001-01; ca (4) vẫn xanh vì khoá dòng phiếu của D9 che | 3C |
| Thêm `getBookById`, `updateBookCopy`, lớp lồng `RentedBookDAO`, một lớp `extends HttpServlet` có chuỗi Spring | `ArchitectureTest` 6 đỏ, nêu đúng tên hàm và lớp | 3D |
| Đổi kiểu, thêm cột trong V1; sửa NULL trong `docs/schema.md` | `SchemaConformanceTest` 3 đỏ, nêu đúng bảng và cột; 8 đột biến V1 được giữ hẳn trong bộ test | 3D |
| Đổi một chữ của `Messages.DAMAGE_EXISTS` | `MessagesTest` đỏ | 3A |
| Lật điều kiện `status <> 'Đã huỷ'` trong `BookDAO.SEARCH` | `copiesHeldByUncancelledBillAreNotAvailable` đỏ | 3B |
| Bỏ thoát `%`, `_`, `\` trong `DAO.containsPattern` | `DamageDAOTest.wildcardCharactersInKeywordAreLiteral` đỏ | orchestrator |

## 4. Lane

| Lane | Báo cáo | Trạng thái |
|---|---|---|
| 3A `model-util` | `phase-03-model-util-261111-0426.md` | DONE |
| 3B `dao-user-book` | `phase-03-dao-user-book-261111-0438.md` | DONE |
| 3C `dao-cart-bill` | `phase-03-dao-cart-bill-261111-0450.md` | DONE_WITH_CONCERNS, đã xử lí ở mục 5 |
| 3D `kiem-kien-truc` | `phase-03-kiem-kien-truc-261111-0442.md` | DONE_WITH_CONCERNS, đã xử lí ở mục 5 |
| 3.6 Workbench | `phase-03-workbench-261111-0506.md` | Khớp ERD thiết kế |

## 5. Quyết định của orchestrator

- **Kết nối trong `DAO`**: trường `private final Connection con` đọc qua `protected final con()`, vì Checkstyle cấm trường `protected`. Skill `tiem-add-dao-duplicate-check` đã theo khuôn này (commit `fcad765` trên `main`).
- **Hàm ghi**: bọc trong `inWriteTransaction(Callable<Boolean>)` (READ COMMITTED, `true` commit, `false` rollback, lỗi thì rollback rồi ném).
- **Gom trùng lặp**: mã 1062 lặp ở bốn DAO chuyển thành `DAO.isDuplicateEntry`; thoát kí tự đại diện của LIKE thành `DAO.containsPattern`, dùng cho `searchBook`, `searchDamage`, `searchCollateral`, `searchRentalBill` (trước đây chỉ `searchRentalBill` thoát).
- **`RentalBillDAO` đọc bằng `JSON_OBJECT`/`JSON_ARRAYAGG` + Jackson**: chấp nhận đề xuất của 3C. Vẫn là `PreparedStatement`, không cột dẫn xuất, file 299 dòng, nằm trong luật `FileLength 300` mà không phải nới. Ánh xạ `ResultSet` tay dài 469 dòng.
- **`docs/contracts.md`**: §5.3 `updateCart` trả `false` duy nhất khi dòng mới trùng quyển đã có trong giỏ, và gỡ `selectedBookId` của phiếu đã huỷ trước khi xoá dòng giỏ; §6.1 K1 chọn quyển theo từng dòng, quyển đã có trong chính phiếu tính là bận.
- **Tài khoản mẫu V2**: mật khẩu `<tên đăng nhập>@123` đúng `docs/dev-accounts.md` của `main`, băm lại bằng `Passwords`.
- **Accept** chạy `clean verify` vì `ArchitectureTest` đọc `target/classes` (bỏ `.class` cũ của lần chạy làm đỏ). Hỏng thì nêu tên test và lệnh chạy lại riêng test đó (AX-05).

## 6. Rủi ro đã đóng

- Flyway 13.12.1 chạy được với MySQL 8.4.13, cả Testcontainers lẫn compose.
- Không gặp deadlock trong 63 lượt tranh chấp; thứ tự khoá dòng phiếu rồi tới đầu truyện tăng dần.
- Testcontainers trên Windows nối được Docker Desktop.

## 7. Nợ còn lại

Không có cho phase 3. Ghi cho phase sau: trang (phase 6, 7) đọc trạng thái phiếu bằng `getRentalBillList` khi `updateRentalBill` trả `false` (D9), đúng `docs/contracts.md` §6.3.
