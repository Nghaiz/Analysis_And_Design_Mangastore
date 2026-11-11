---
name: tiem-add-dao-duplicate-check
description: Dùng khi viết hoặc sửa hàm DAO (addClient, addDamage, addCollateral, addBook, updateCart, updateRentalBill): false khi trùng UNIQUE, không getById, transaction, K1.
effort: medium
---

# Viết hàm DAO có kiểm trùng

Hàm `addX` trả `false` khi vướng ràng buộc UNIQUE, để trang chọn câu báo (`REGISTER_DUPLICATE`, `DAMAGE_EXISTS`, `COLLATERAL_EXISTS`). Mọi chữ kí, luật và khoá nằm ở `docs/contracts.md` §5, §6; skill này là cách cài đặt.

## Đọc trước

- `docs/contracts.md` §2 (cột UNIQUE từng bảng), §3 (model), §5.1 luật DAO, §5.2 vòng đời Connection, §5.3 chữ kí, §6 K1 / chọn quyển / D9, §14 C9, C12, C13.
- `.claude/rules/tiem-dao-rules.md`.

## Các bước

1. **Hàm phải có trong §5.3.** Không thêm hàm public, DAO mới hay tham số mới. Thiếu hàm → dừng, ghi đề xuất cho orchestrator. Helper `private` trong chính DAO chủ thì được.
2. **Đúng lớp:** tám DAO (`UserDAO`, `ClientDAO`, `StaffDAO`, `BookDAO`, `CartDAO`, `RentalBillDAO`, `DamageDAO`, `CollateralDAO`) trong `vn.tiemtruyen.dao`, kế thừa `DAO` (`implements AutoCloseable`; kết nối là `private final Connection con`, lớp con đọc qua `protected final Connection con()` vì Checkstyle đặt `VisibilityModifier protectedAllowed=false`). Mỗi DAO con có đúng cặp constructor `public XxxDAO() throws SQLException { super(); }` (trang, mượn từ pool) và `protected XxxDAO(Connection con) { super(con); }` (test cùng package). Lớp trung gian (`SelectedBook`, `RentedBook`, `RentedDamage`, `RentalCollateral`) không có DAO: ghi qua `CartDAO.updateCart(cart)` hoặc `RentalBillDAO.updateRentalBill(rentalBill)`.
3. **Kiểm trùng bằng ràng buộc của DB, không bằng SELECT trước.** SELECT rồi INSERT có khe tranh chấp; UNIQUE trong `V1__schema.sql` là nguồn thật. Bắt lỗi trùng đúng mã MySQL 1062 (`ER_DUP_ENTRY`), trả `false`; lỗi khác ném tiếp.
4. **Khuôn transaction cho hàm ghi** (§5.2): bọc toàn bộ thân trong helper `protected final boolean inWriteTransaction(Callable<Boolean> work)` của `DAO` (tắt autocommit, `READ_COMMITTED`; `true` → commit, `false` → rollback; ngoại lệ → rollback rồi ném lại; trả autocommit và mức cô lập cũ). Không tự viết `setAutoCommit` / `commit` / `rollback` trong DAO con:

```java
public boolean addDamage(Damage damage) throws SQLException {
    int[] newId = new int[1];
    boolean saved = inWriteTransaction(() -> {
        try (PreparedStatement ps = con().prepareStatement(
                "INSERT INTO tblDamage (name, description) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, damage.getName());
            ps.setString(2, damage.getDescription());
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                newId[0] = keys.getInt(1);
            }
            return true;
        } catch (SQLException e) {
            if (e.getErrorCode() == MYSQL_DUPLICATE_ENTRY) {   // hằng có tên, = 1062
                return false;                                  // helper rollback
            }
            throw e;                                           // lỗi không lường trước: helper rollback rồi ném
        }
    });
    if (saved) {
        damage.setId(newId[0]);   // chỉ gán id sau commit
    }
    return saved;
}
```

5. **Hàm ghi nhiều bảng chạy trong một transaction:** `addClient` ghi `tblUser` (mật khẩu băm bằng `util/Passwords`, Argon2id) → `tblClient` → `tblCart` (§1: giỏ tạo cùng tài khoản). Trùng ở bất kì bảng nào thì rollback cả ba, trả `false`; không để sót dòng `tblUser` mồ côi. `addBook` lưu `Book` cùng `listBookCopy` (barcode `DT001-03`, D8).
6. **Đồng bộ lớp trung gian qua DAO chủ:**
   - `updateCart(cart)`: thêm dòng `id = 0`, xoá dòng không còn trong `cart`, không đụng dòng đã thuộc phiếu chưa huỷ; không khoá quyển.
   - `updateRentalBill(rentalBill)`: khoá dòng phiếu `SELECT status FROM tblRentalBill WHERE id = ? FOR UPDATE`, chỉ ghi khi DB vẫn "Chờ nhận" (D9, §6.3); đồng bộ `tblRentedBook`, `tblRentedDamage`, `tblRentalCollateral` theo đối tượng; quyển mới thêm đi qua K1.
7. **K1 cho mọi đường tạo `tblRentedBook`** (`addRentalBill`, nhánh thêm quyển của `updateRentalBill`): làm đúng bốn bước của §6.1 (khoá `tblBook` theo id tăng dần `FOR UPDATE`, đọc lại quyển trống, đổi quyển id nhỏ nhất còn trống theo §6.2, không đủ thì rollback và `false`). Ghi quyển thực giao vào `RentedBook.bookCopy` của đối tượng truyền vào.
8. **Hàm đọc:** autocommit, `PreparedStatement` với `LIKE ?` và tham số `"%" + keyword + "%"` (không nối chuỗi SQL); trả danh sách rỗng chứ không `null`; đọc kèm con (phiếu kèm quyển, lỗi, khoản cọc). `searchBook` chỉ kèm quyển **đang sẵn sàng**.
9. **Test** (JUnit + Testcontainers `mysql:8.4.13`, `src/test/java/vn/tiemtruyen/dao/`): trùng từng cột UNIQUE trả `false` **và** số dòng các bảng không đổi; thành công gán `id`; lỗi FK ném ngoại lệ. Hàm có K1/D9 thêm test tranh chấp ở `RentalBillConcurrencyTest`.

## Gotchas

- Connector/J ném `SQLIntegrityConstraintViolationException` (SQLState `23000`) cho **cả** trùng UNIQUE (1062) lẫn vi phạm khoá ngoại (1452) và NOT NULL (1048). Chỉ 1062 là "trùng"; hai mã kia là bug, phải ném.
- Tự gọi `con().setAutoCommit(false)` / `commit()` / `rollback()` trong DAO con thay vì `inWriteTransaction` thì dễ quên rollback khi trả `false`: transaction treo giữ khoá tới khi kết nối về pool. `inWriteTransaction` không lồng được (gọi khi autocommit đang tắt thì ném `IllegalStateException`), nên hàm ghi nhiều bảng (`addClient`, `updateRentalBill`) làm mọi bước trong **một** lần gọi helper; helper `private` dùng chung thì nhận `Connection` hoặc chạy bên trong thân đó, không tự gọi helper lần nữa.
- Gán `id` trước commit rồi bị rollback → đối tượng mang id ma, trang tưởng đã lưu. Gán sau commit.
- `ClientDAO`, `StaffDAO` kế thừa `UserDAO`: `super.checkLogin(user)` dùng chung `con()`, không mở kết nối thứ hai. `checkLogin` tìm theo `username` rồi `Passwords.verify`; không so mật khẩu trong SQL.
- Cấm mọi hàm đọc một đối tượng theo id, kể cả `private` dùng làm "tiện": D9 đọc lại bằng `searchRentalBill("PM" + id)` hoặc `getRentalBillList(client)` ở **trang**, không ở DAO.
- Không tin `book.listBookCopy` trong session để giữ quyển; K1 luôn đọc lại trong transaction.
- Tiền là `float` như ch.9 (C13); không đổi sang `BigDecimal`. Kiểu mảng `T[]` là `List<T>`.
- Checkstyle `MagicNumber` bắt chỉ số tham số `PreparedStatement` từ 3 trở lên (`ps.setString(3, …)`). Dùng biến đếm: `int p = 1; ps.setString(p++, …); ps.setInt(p++, …);` thay cho hằng số hay `@SuppressWarnings`.
- Collation `utf8mb4_0900_ai_ci`: "doraemon" khớp "Doraemon", "huỷ" khớp "huy". UNIQUE cũng không phân biệt dấu: "Rách bìa" và "Rach bia" là trùng.
- Test Testcontainers cần Docker đang chạy; thiếu Docker là thiếu công cụ (Accept exit 2), không phải test đỏ.

## Lệnh kiểm

| Việc | Lệnh | Có từ |
|---|---|---|
| Build, Checkstyle, mọi test | `node scripts/dev/mvnw.mjs -B verify` | phase 1 |
| Chạy riêng một lớp test | `node scripts/dev/mvnw.mjs -B verify -Dtest=ClientDAOTest -Dsurefire.failIfNoSpecifiedTests=false` | phase 3 |
| Test tranh chấp K1, D9 | `node scripts/dev/mvnw.mjs -B verify -Dtest=RentalBillConcurrencyTest` | phase 3 |
| Test kiến trúc (không getById, không DAO trung gian) | `node scripts/dev/mvnw.mjs -B verify -Dtest=ArchitectureTest` | phase 3 |
| Accept phase 3 | `node scripts/accept/phase-03.mjs` | phase 3 |

## Danh sách kiểm tra

- [ ] Hàm, lớp, tham số, kiểu trả về đúng §5.3; không hàm public mới.
- [ ] Không hàm đọc theo id; không DAO cho lớp trung gian.
- [ ] Trùng UNIQUE (mã 1062) → rollback, `false`; lỗi khác → rollback, ném.
- [ ] Hàm ghi: autocommit tắt, READ COMMITTED, commit / rollback, trả autocommit cũ.
- [ ] Ghi nhiều bảng trong một transaction; không dòng mồ côi khi `false`.
- [ ] `id` gán sau commit.
- [ ] K1 cho mọi đường tạo `tblRentedBook`; D9 trong `updateRentalBill`.
- [ ] Chỉ `PreparedStatement`; hàm đọc trả danh sách rỗng, kèm con.
- [ ] Test trùng từng cột UNIQUE, kiểm số dòng không đổi; `verify` xanh.
