# Phase 3, lane 3A `model-util`: báo cáo

Nhánh `lane/03-schema-dao/model-util`, worktree `D:/Coding/mangastore-wt/03-model-util`. Trạng thái: **DONE_WITH_CONCERNS** (một chỗ lệch brief do Checkstyle, mục 2.1).

## 1. Kết quả

`./mvnw -B -ntp verify` (JDK 25.0.5) xanh: Checkstyle 0 vi phạm, javac 0 cảnh báo, 133 test, 0 hỏng (trước lane là 61 test của phase 1).

| Test mới | Số ca | Kiểm |
|---|---|---|
| `util/MessagesTest` | 4 | Đọc bảng §10.1 của `docs/contracts.md` lúc chạy, so map tên → câu cả hai chiều (đủ 28, không thừa); mọi câu NFC; `quantityExceeded` |
| `util/PasswordsTest` | 10 | Argon2id, độ dài ≤ 255, đúng/sai, muối ngẫu nhiên, chuỗi không phải Argon2id ném lỗi, 5 chuỗi băm mẫu khớp mật khẩu gốc |
| `util/CodesTest` | 37 | DT/PM/mã vạch, tách `PM0125` không phân biệt hoa thường, từ khoá không phải mã |
| `util/JsonUtilTest` | 4 | Escape `<` `>` `&` U+2028 U+2029, đọc lại ra đúng giá trị, ngày ISO, `null` |
| `util/SerializationTest` | 3 | Đồ thị Cart (client, listSelectedBook → bookCopy → book, vòng Book ↔ BookCopy) và RentalBill (client, staff, listRentedBook → listRentedDamage, listRentalCollateral) |
| `util/ModelContractTest` | 3 | Gói `model` có đúng 13 lớp của §3; lớp cha, tên, kiểu, thứ tự thuộc tính đúng §3 (đọc bảng lúc chạy); hằng trạng thái và chức vụ đúng §4 |
| `util/MigrationListenerTest` | 6 | Flyway trên `mysql:8.4.13` (mục 3) |
| `util/DaoTransactionTest` | 5 | Helper transaction của `DAO` (commit, rollback, ngoại lệ, không lồng, trả autocommit và mức cô lập) |

Làm đỏ có chủ đích: đổi "tồn tại" thành "tồn tai" trong `DAMAGE_EXISTS` thì `MessagesTest` đỏ (`constantsMatchContractTableExactlyInBothDirections`); trả lại thì xanh.

## 2. Quy ước cho lane 3B, 3C, 3D

### 2.1 `dao/DAO.java`

- `public abstract class DAO implements AutoCloseable`. Hai constructor: `public DAO() throws SQLException` mượn kết nối qua `Db.getConnection()`; `protected DAO(Connection con)` cho test.
- **Lệch brief:** kết nối là `private final Connection con` đọc qua `protected final Connection con()`, không phải trường `protected Connection con`. Lí do: `config/checkstyle/checkstyle.xml` đặt `VisibilityModifier protectedAllowed=false`, nên một trường `protected` làm `verify` đỏ, và lane không được sửa file đó. Đề xuất ở mục 5.
- Mỗi DAO con khai báo:
  ```java
  public UserDAO() throws SQLException { super(); }
  protected UserDAO(Connection con) { super(con); }
  ```
  Test cùng package `vn.tiemtruyen.dao` gọi `new UserDAO(db.connection())`. `ClientDAO`, `StaffDAO` kế thừa `UserDAO` và khai báo cặp constructor giống vậy.
- `close()` đóng `con` (trả về pool, hoặc đóng kết nối test đã đưa vào).
- Hàm ghi: `protected final boolean inWriteTransaction(Callable<Boolean> work) throws SQLException`. Tắt autocommit, `READ_COMMITTED`; `work` trả `true` thì commit, `false` thì rollback; `SQLException` hoặc `RuntimeException` thì rollback rồi ném lại; ngoại lệ kiểm tra khác thì bọc trong `SQLException`; `work` trả `null` thì ném `IllegalStateException`. Sau cùng trả autocommit (bật) và mức cô lập cũ. Gọi lồng (autocommit đang tắt) thì ném `IllegalStateException`. Gán id vào đối tượng **sau** khi helper trả `true` (Javadoc của `DAO` có khuôn `addDamage` mẫu, bắt mã 1062).
- Hàm đọc chạy autocommit, không dùng helper.
- `DAO.java` không có lớp lồng hay interface lồng: thư mục `dao` đã biên dịch chỉ có lớp DAO. **3D:** hàm public mà `DAO` thêm vào mọi lớp con là `close()` (từ `AutoCloseable`); danh sách hàm public cho phép của `ArchitectureTest` cần có `close`. `con()` và `inWriteTransaction` là `protected`.

### 2.2 `src/test/java/vn/tiemtruyen/support/`

| Lớp | Dùng để |
|---|---|
| `SharedMySql` | Một container `mysql:8.4.13` cho cả JVM, khởi lười ở lần dùng đầu (holder tĩnh), Ryuk dọn khi JVM thoát; không dùng testcontainers-junit-jupiter. Server và URL dùng múi giờ `Asia/Ho_Chi_Minh`, URL cùng tham số `.env.example` (`characterEncoding=UTF-8&connectionTimeZone=Asia/Ho_Chi_Minh`, thêm `sslMode=DISABLED&allowPublicKeyRetrieval=true`). Tài khoản root. |
| `TestDatabase` | `createMigrated()`: `CREATE DATABASE t_<uuid>` (utf8mb4, `utf8mb4_0900_ai_ci`) rồi `MigrationListener.migrate(ds, "classpath:db/e2e")` nên có V1 + V2 + V10 e2e. `createEmpty()`: database rỗng. `connection()`: mỗi lần gọi một kết nối khác từ pool HikariCP riêng (tối đa `MAX_CONNECTIONS = 20`, chờ 10 giây), nên mỗi luồng của test tranh chấp lấy một kết nối riêng. `dataSource()`, `name()`. `close()` đóng pool và `DROP DATABASE`. |
| `ContractsDoc` | `tableUnder("<tiêu đề nguyên văn>")` trả các dòng dữ liệu của bảng Markdown đầu tiên dưới tiêu đề đó trong `docs/contracts.md`. 3D dùng được để đọc bảng §5.3 cho `ArchitectureTest`. |

Khuôn lớp test DAO:

```java
private static TestDatabase db;

@BeforeAll
static void createDatabase() {
    db = TestDatabase.createMigrated();
}

@AfterAll
static void dropDatabase() {
    db.close();
}
```

Database dùng chung cho mọi hàm test của lớp. Test cần dữ liệu sạch thì gọi `createMigrated()` riêng (khoảng 1,5 giây mỗi lần). Lần đầu trong JVM thêm thời gian khởi container (khoảng 20 giây trên máy này).

### 2.3 Model và util

- 13 lớp trong `vn.tiemtruyen.model`, JavaBean (constructor rỗng, getter/setter), `implements Serializable` (Client, Staff qua User), `serialVersionUID = 1L`. Danh sách con khởi là `ArrayList` rỗng; setter danh sách từ chối `null`.
- Hằng: `RentalBill.STATUS_PENDING = "Chờ nhận"`, `STATUS_RENTING = "Đang cho thuê"`, `STATUS_CANCELLED = "Đã huỷ"`; `Staff.POSITION_SALES = "Nhân viên bán hàng"`, `POSITION_MANAGER = "Quản lí"`.
- `Messages`: 28 hằng; `Messages.quantityExceeded(int available)` thay "(hiện còn N quyển)", số âm ném lỗi.
- `Passwords.hash(CharSequence)`, `Passwords.verify(CharSequence, String)`. Tham số Argon2id: m = 19456 KiB, t = 2, p = 1, muối 16 byte, đầu ra 32 byte; chuỗi 97 kí tự. `verify` đọc tham số từ chính chuỗi băm (`Argon2Function.getInstanceFromHash`, vì `HashChecker.withArgon2()` của Password4j 1.8.4 dùng tham số mặc định chứ không đọc từ chuỗi). Chuỗi không bắt đầu bằng `$argon2id$` (ví dụ `@@HASH:hant@@` còn trong V2) thì ném `IllegalArgumentException`, không trả `false`.
- `Codes.bookCode(int)` → `DT001`, `Codes.rentalBillCode(int)` → `PM0125`, `Codes.barcode(bookId, copyNumber)` → `DT001-03`, `Codes.parseRentalBillId(String)` → `OptionalInt` (bỏ khoảng trắng hai đầu, `PM` + 1–9 chữ số ASCII, không phân biệt hoa thường). Id < 1 ném `IllegalArgumentException`.
- `JsonUtil.toScriptJson(Object)`: Jackson 3.3.0 (`tools.jackson.databind.json.JsonMapper`), escape sau khi sinh JSON; ngày `java.time` ra chuỗi ISO.
- `MigrationListener`: `@WebListener`; `public static MigrateResult migrate(DataSource, String dataLocation)` dùng chung cho app và test. Location đọc qua `AppConfig.get().optional("FLYWAY_DATA_LOCATION", "filesystem:/flyway/data")` (AppConfig có sẵn `optional`, không cần đọc `System.getenv` trực tiếp). Đặt `failOnMissingLocations(true)`, xem mục 4.

## 3. Flyway 13.12.1 trên MySQL 8.4.13

Chạy được. `MigrationListenerTest` trên Testcontainers `mysql:8.4.13`:

- Database rỗng → 3 migration (V1 schema, V2 catalog seed, V10 e2e catalog), phiên bản đích `10`, `flyway_schema_history` có `1, 2, 10`; `SELECT VERSION()` bắt đầu bằng `8.4.13`; đúng 13 bảng; `tblDamage` có dòng; `tblUser` 5 dòng; `tblBook` có id 1.
- Chạy lần hai: 0 migration, không lỗi.
- Location catalog rỗng (thư mục có, không file): chỉ V1, V2.
- Location không tồn tại: `FlywayException`.
- Schema không rỗng mà chưa có bảng lịch sử: `FlywayException` (listener ném, app không lên).

Log Flyway ghi `Database: jdbc:mysql:******** (MySQL 8.4)`, không có cảnh báo phiên bản chưa hỗ trợ.

## 4. Chuỗi băm Argon2id cho V2

Sinh bằng `vn.tiemtruyen.util.Passwords.hash`; `PasswordsTest.pregeneratedDevAccountHashesVerify` kiểm từng chuỗi (hằng ở `src/test/java/vn/tiemtruyen/util/DevAccountHashes.java`). Orchestrator chép vào `V2__catalog_seed.sql` thay `@@HASH:<user>@@`.

| Placeholder | Mật khẩu gốc | Chuỗi |
|---|---|---|
| `@@HASH:hant@@` | `hant@123` | `$argon2id$v=19$m=19456,t=2,p=1$Z7/ga5InHhW9wZ1E0Nwo2g$6OHItTnti86VDbCM3ZI9PqzZZPkQfllb9oYdM2EpeQc` |
| `@@HASH:quanli@@` | `Quanli@123` | `$argon2id$v=19$m=19456,t=2,p=1$WsKuqJ2Jb0qcqNNwbZR39w$7NtBlGWwDTKTeCpfFOMQjJF6QonuXxP8gVoJhxIilcM` |
| `@@HASH:khach01@@` | `Khach01@123` | `$argon2id$v=19$m=19456,t=2,p=1$gdrTiFlWIsrtIXCgO3arpQ$m7eD1URB+sOant0IbjBlnN8GdYVR+ROvGN1jPqVv6Y8` |
| `@@HASH:khach02@@` | `Khach02@123` | `$argon2id$v=19$m=19456,t=2,p=1$x2BL8YwmgrEsyfrA1BkqQQ$TaMxzVYriJjvujQDEniQiKdpL8bMy/TQafZLXVdswYA` |
| `@@HASH:khach03@@` | `Khach03@123` | `$argon2id$v=19$m=19456,t=2,p=1$qiUpoXh7tG+GFctny1Qp3w$NIo7Dc1E6R/oJz967vGc2hqXcSZFiNMjYrypLo7lKi4` |

Chuỗi không chứa `'` hay `\`, chép thẳng vào literal SQL được. Lưu ý V2 đổi thì checksum đổi: database đã nạp V2 cũ phải dùng database mới (`docs/dev-accounts.md`).

## 5. Đề xuất cho orchestrator

1. **Checkstyle ↔ brief `protected Connection con`.** Hai yêu cầu loại nhau. Lane chọn accessor `con()` để `verify` xanh. Nếu muốn đúng trường `protected con` của ch.9 thì cần sửa `checkstyle.xml` (ví dụ `protectedAllowed=true`, hoặc `SuppressWarningsHolder` + `SuppressWarningsFilter` để chỉ miễn `DAO.java`), rồi đổi `DAO` và mọi DAO con cùng lúc. Nên chốt trước khi mở 3B, 3C.
2. **`failOnMissingLocations(true)` trong `MigrationListener`.** Không có nó, Flyway lặng lẽ bỏ qua location không tồn tại (đã thử: `classpath:db/khong-co` chạy 2 migration, không cảnh báo), nên gõ sai `FLYWAY_DATA_LOCATION` làm mất catalog mà không ai biết. Compose luôn gắn volume `catalog_data` vào `/flyway/data` (thư mục có, có thể rỗng: hợp lệ), E2E dùng `classpath:db/e2e` có sẵn, nên cả hai đường đều chạy. Hệ quả: chạy WAR ngoài compose mà không đặt biến thì app không lên vì `/flyway/data` không có. Nếu không muốn vậy thì bỏ dòng đó và sửa `MigrationListenerTest.missingDataLocationFailsInsteadOfSkippingCatalog`.
3. **AppConfig:** chưa có getter riêng cho `FLYWAY_DATA_LOCATION`; lane dùng `AppConfig.optional(...)` có sẵn. Muốn đồng bộ với các biến khác thì thêm `flywayDataLocation()` vào `AppConfig` (file phase 1, ngoài Owns của lane).
4. **Skill `tiem-add-dao-duplicate-check`** (`.claude/skills/`, cây chính) có khuôn transaction viết tay với trường `con` và `oldAutoCommit`. Khuôn đó không còn khớp: trường là `con()`, và hàm ghi nên dùng `inWriteTransaction` (khuôn trong Javadoc của `DAO`). Nên sửa skill trước khi spawn 3B, 3C để brief không phải sửa tay.
5. **pom.xml:** không cần phụ thuộc mới. HikariCP (đã có, scope compile) được dùng cả cho pool của `TestDatabase`.

## 6. File của lane

- `src/main/java/vn/tiemtruyen/model/` (13 lớp)
- `src/main/java/vn/tiemtruyen/dao/DAO.java`
- `src/main/java/vn/tiemtruyen/util/{Messages,Passwords,Codes,JsonUtil,MigrationListener}.java`
- `src/test/java/vn/tiemtruyen/util/{MessagesTest,PasswordsTest,DevAccountHashes,CodesTest,JsonUtilTest,SerializationTest,ModelContractTest,MigrationListenerTest,DaoTransactionTest}.java`
- `src/test/java/vn/tiemtruyen/support/{SharedMySql,TestDatabase,ContractsDoc}.java`
- báo cáo này

Không sửa V1, V2, V10, `Db`, `AppConfig`, `pom.xml`, `checkstyle.xml`, `docs/**`. Không chạy `docker compose`.
