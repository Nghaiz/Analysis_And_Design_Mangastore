---
paths: ["src/main/java/**", "src/test/java/**", "src/main/resources/db/**", "src/main/webapp/**/*.jsp"]
---
# Tiệm truyện: luật DAO

SSOT: `docs/contracts.md` §5 (DAO), §6 (K1, chọn quyển, D9). Rule trỏ, không chép bảng.

## Rule

- **Luật của thầy** (§5.1): lớp cha `DAO` giữ `Connection`; đúng tám DAO; không DAO cho SelectedBook, RentedBook, RentedDamage, RentalCollateral (đi qua `CartDAO.updateCart`, `RentalBillDAO.updateRentalBill`); mỗi đối tượng gốc một hàm cập nhật; **cấm getById** và mọi biến thể (`getBookById`…); không gộp các cặp hàm trông giống nhau của ch.9.
- **Chỉ các hàm ở §5.3**, đúng chữ kí (`T[]` là `List<T>`, trả danh sách rỗng chứ không `null`). Thêm hàm là đổi hợp đồng: dừng, báo orchestrator.
- **Vòng đời Connection** (§5.2): `DAO implements AutoCloseable`, mượn từ HikariCP qua `util/Db`; trang dùng try-with-resources; không giữ DAO trong session hay field tĩnh. Hàm đọc chạy autocommit; hàm ghi tự mở transaction READ COMMITTED, rollback khi lỗi hoặc khi trả `false`, rồi trả autocommit như cũ. Lỗi SQL không lường trước: ném, không nuốt, không đổi thành `false`.
- **SQL** chỉ `PreparedStatement`, không nối chuỗi; so từ khoá `LIKE '%…%'` có tham số; từ khoá trống thì không gọi DAO (C9).
- **K1** (§6.1) cho mọi đường tạo `tblRentedBook` (`addRentalBill`, nhánh thêm quyển của `updateRentalBill`), trong một transaction: khoá `tblBook` theo id tăng dần `FOR UPDATE`; đọc lại quyển trống bằng `NOT EXISTS`; quyển bận thì đổi sang quyển trống cùng đầu truyện; không đủ thì rollback, trả `false`; ghi quyển thực giao lại vào `RentedBook.bookCopy`. Không tin `book.listBookCopy` trong session. Huỷ phiếu, bỏ quyển, `updateCart` không khoá.
- **Chọn quyển** (§6.2): quyển trống có `tblBookCopy.id` nhỏ nhất, chưa có trong giỏ hay phiếu đang sửa.
- **D9** (§6.3): `updateRentalBill` khoá dòng phiếu `FOR UPDATE`, chỉ ghi khi trong DB vẫn "Chờ nhận", ngược lại trả `false`. Trang đọc lại bằng `searchRentalBill("PM" + id)` (nhân viên) hoặc `getRentalBillList(client)` (khách), không thêm hàm, không đọc theo id, rồi chọn câu theo trạng thái mới.
- Test K1 và D9 bắt buộc bằng Testcontainers, danh sách ở §6.1.

Kiểm bằng: `ArchitectureTest`, `SchemaConformanceTest`, test DAO Testcontainers (phase 3), agent `tiem-contract-guard`.
