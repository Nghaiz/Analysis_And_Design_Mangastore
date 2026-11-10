# Phase 3, lane 3B `dao-user-book`: báo cáo

Nhánh `lane/03-schema-dao/dao-user-book`, worktree `D:/Coding/mangastore-wt/03-dao-user-book`. Trạng thái: **DONE_WITH_CONCERNS** (các đề xuất ở mục 4, không chặn).

## 1. Kết quả

Đã `git merge phase/03-schema-dao` (fast-forward tới `9c2c8b0`, mật khẩu mẫu `<username>@123`) trước lần verify cuối. `./mvnw -B -ntp verify` (JDK 25.0.5) xanh: Checkstyle 0 vi phạm, 153 test, 0 hỏng (trước lane là 133).

Làm đỏ có chủ đích: đổi điều kiện `r.status <> ?` trong `BookDAO.SEARCH` thành `r.status = ?` thì `copiesHeldByUncancelledBillAreNotAvailable` đỏ (`expected [6, 4, 0] but was [7, 4, 2]`); trả lại thì xanh.

| Test | Số ca | Kiểm |
|---|---|---|
| `UserDAOTest` | 3 | hant, khach01 đúng mật khẩu ra User (id, tên, họ tên, không mang chuỗi băm); sai mật khẩu, mật khẩu rỗng, tên không có, tên/mật khẩu `null` ra `null`; gõ chính chuỗi băm làm mật khẩu ra `null` |
| `ClientDAOTest` | 5 | khach01 ra Client đủ dob, CCCD, SĐT, email, địa chỉ; sai mật khẩu, hant (nhân viên) ra `null`; `addClient` gán id, thêm đúng 1 dòng mỗi bảng tblUser/tblClient/tblCart, cột password là Argon2id và đăng nhập lại được; trùng username (cả `KHACH01`), CCCD, SĐT, email → `false`, id vẫn 0, số dòng ba bảng không đổi, autocommit đã bật lại; `dob` null (lỗi 1048) → ném `SQLException`, không để dòng nào |
| `StaffDAOTest` | 2 | hant ra `Nhân viên bán hàng`, quanli ra `Quản lí`; sai mật khẩu, khach01 (khách) ra `null` |
| `BookDAOTest` | 6 | "Doraemon" trên V10 ra DT001, DT002, DT015 với 7/4/2 quyển, cột Book đúng, quyển sắp theo id, `bookCopy.book` trỏ về Book; tác giả, không dấu, hoa thường; phiếu "Chờ nhận" giữ DT001-01 và cả hai quyển DT015 → 6/4/0 (DT015 vẫn có, danh sách rỗng), "Đang cho thuê" vẫn giữ, "Đã huỷ" → 7/4/2 lại; `addBook` sinh mã vạch trống theo D8 theo thứ tự trong danh sách, giữ mã vạch nhập tay, gán id và `book`, NULL của publishYear/description đọc lại đúng, Book không quyển; trùng mã vạch → `false`, không dòng tblBook/tblBookCopy nào, đối tượng giữ nguyên; `updateBook` sửa cột, thêm DT001-08, DT001-09, quyển bỏ khỏi danh sách không bị xoá, trùng mã vạch → `false` và cả cột đã sửa cũng rollback, id không tồn tại → `false` |
| `DamageDAOTest` | 2 | "Rách" ra đúng "Rách bìa", "Rách trang" (theo id), "rach" cũng vậy; `addDamage` gán id; "Rách bìa", "rach bia", tên vừa thêm → `false`, id 0, số dòng không đổi |
| `CollateralDAOTest` | 2 | "Căn cước" ra "Căn cước công dân", "tien mat" ra "Tiền mặt"; `addCollateral` gán id; trùng (cả `TIEN MAT`) → `false` |

## 2. Cài đặt

- Hàm public đúng §5.3 (cộng `close()` kế thừa và hai constructor theo quy ước 3A). Không getById, không lớp lồng trong `dao`.
- `UserDAO.checkLogin`: tìm theo `username`, so bằng `Passwords.verify`; User trả về không mang `password` (C5). Tên hoặc mật khẩu `null` → `null`. Chuỗi trong DB không phải Argon2id → `IllegalArgumentException` của `Passwords` bay ra (dữ liệu hỏng, không đổi thành "sai mật khẩu").
- `ClientDAO`/`StaffDAO.checkLogin`: override kiểu trả về hiệp biến (`Client`, `Staff`), gọi `super.checkLogin` trên cùng kết nối rồi đọc tblClient/tblStaff theo `userId`; không có dòng → `null`.
- `addClient`: băm mật khẩu **trước** khi mở transaction (Argon2id chậm, không giữ khoá lâu); ba INSERT trong `inWriteTransaction`, mã 1062 → `false`; id gán sau commit. Không xoá mật khẩu thô khỏi đối tượng (trang lo theo C5).
- `searchBook`: một câu `LEFT JOIN tblBookCopy ... AND NOT EXISTS (tblRentedBook JOIN tblRentalBill WHERE status <> ?)`, `ORDER BY b.id, c.id`; trạng thái huỷ truyền tham số từ `RentalBill.STATUS_CANCELLED`, không gõ lại chuỗi.
- `addBook`: Book và quyển phải chưa lưu (`id = 0`), không thì `IllegalArgumentException`. Mã vạch trống (null hoặc chỉ khoảng trắng) → `Codes.barcode(bookId, vị trí trong danh sách + 1)`.
- `updateBook`: `UPDATE tblBook` trước (khoá dòng đầu truyện), rồi `COUNT(*)` quyển hiện có, quyển `id = 0` có mã trống nhận số `count + i + 1`. Vì UPDATE đã khoá dòng, hai `updateBook` cùng đầu truyện chạy tuần tự nên không sinh trùng số. Quyển `id > 0` bỏ qua, không sửa, không xoá (C12). Không có dòng Book mang id → `false`. `id < 1` → `IllegalArgumentException`.
- `searchDamage`/`searchCollateral`: `name LIKE ?`, `ORDER BY id`.

## 3. Lệch hoặc điểm cần biết

- `LIKE` dùng `"%" + keyword + "%"` đúng §5.3, **không escape** `%` và `_` trong từ khoá: gõ `_` khớp mọi tên. Muốn khớp đúng chữ thì cần helper chung (mục 4.2).
- Số quyển sinh trong `updateBook` dựa trên `COUNT(*)`, đúng khi mọi quyển cũ theo dạng D8 liền số (V10 đúng vậy, và không có đường xoá quyển). Nếu sau này nhập tay mã vạch lạc số thì có thể trùng → `false`, không hỏng dữ liệu.
- Test `ClientDAOTest`, `BookDAOTest` dùng `dao.con()` (protected, cùng package) để kiểm autocommit đã bật lại sau `false`.

## 4. Đề xuất cho orchestrator

1. **Hằng `MYSQL_DUPLICATE_ENTRY = 1062`** đang lặp ở `ClientDAO`, `BookDAO`, `DamageDAO`, `CollateralDAO` (Javadoc của `DAO` dùng tên này như hằng của lớp con). Nên chuyển thành `protected static final int` trong `DAO.java` (file của 3A); Checkstyle `VisibilityModifier` cho phép hằng `static final`. 3C chắc cũng cần.
2. **Helper `LIKE`** (escape `\`, `%`, `_`) nếu muốn khớp chữ đúng nghĩa "chứa từ khoá": đặt `protected static String containsPattern(String)` trong `DAO.java`, ba hàm search của lane này và `searchRentalBill` của 3C dùng chung. Hiện không làm vì ngoài Owns và §5.3 không yêu cầu.
3. **Skill `tiem-add-dao-duplicate-check`** vẫn có khuôn transaction viết tay với trường `con` (cũ); khuôn đúng là `inWriteTransaction` + `con()` như Javadoc `DAO` (3A đã đề xuất, chưa sửa).
4. **Checkstyle `MagicNumber`**: chỉ số tham số `PreparedStatement` ≥ 3 bị bắt, lane dùng biến đếm `int p = 1; ps.setString(p++, ...)`. 3C gặp cùng chuyện.

## 5. File của lane

- `src/main/java/vn/tiemtruyen/dao/{UserDAO,ClientDAO,StaffDAO,BookDAO,DamageDAO,CollateralDAO}.java`
- `src/test/java/vn/tiemtruyen/dao/{UserDAOTest,ClientDAOTest,StaffDAOTest,BookDAOTest,DamageDAOTest,CollateralDAOTest}.java`
- báo cáo này

Không sửa `DAO.java`, model, util, support, V1/V2/V10, `pom.xml`, `checkstyle.xml`, `docs/**`. Không chạy `docker compose`, không push.
