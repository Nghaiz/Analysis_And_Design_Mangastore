# Phase 3, lane 3D `kiem-kien-truc`: báo cáo

Nhánh `lane/03-schema-dao/kiem-kien-truc`, worktree `D:/Coding/mangastore-wt/03-kiem-kien-truc`, đã merge `phase/03-schema-dao` (có `docs/schema.md`, ô khoá `tblCart.clientId` = `FK→tblClient.userId, UNIQUE`). Trạng thái: **DONE_WITH_CONCERNS**: hai test của `ArchitectureTest` đỏ trong worktree này chỉ vì 8 lớp DAO của lane 3B, 3C chưa có (mục 3).

## 1. Kết quả

`./mvnw -B -ntp clean verify` (JDK 25.0.5) với 8 DAO rỗng tạm đúng chữ kí §5.3 (không commit): **xanh**, Checkstyle 0 vi phạm, 151 test, 0 hỏng (trước lane là 133).

| Test | Số ca | Kiểm |
|---|---|---|
| `schema/SchemaConformanceTest` | 4 | (1) contracts §2 có 13 tiêu đề `### tblX` (chặn đầu vào); (2) schema sau migration (V1, V2, V10 e2e trên `mysql:8.4.13`) khớp contracts §2; (3) `docs/schema.md` **bắt buộc có** và khớp contracts §2; (4) chạy một bản chép V1 bị sửa 8 chỗ và đòi báo cáo lệch nêu đúng từng chỗ |
| `schema/SchemaDocTest` | 4 | Bộ đọc tài liệu: ô khoá nhiều khoá cách bởi `, `; UNIQUE/DEFAULT/Index trong ghi chú; kiểu, khoá, cột ngoài quy ước thì ném lỗi |
| `arch/ArchitectureTest` | 10 | Mục 2.2 |

### 2.1 SchemaConformanceTest

- Đọc `information_schema` (TABLES, COLUMNS, TABLE_CONSTRAINTS ⋈ KEY_COLUMN_USAGE, STATISTICS) của database của `TestDatabase.createMigrated()`.
- So **hai chiều** với bảng của contracts §2: tập bảng (không bảng ngoài 13 bảng; bỏ bảng lịch sử Flyway, tên đọc từ `new FluentConfiguration().getTable()`), tập cột mỗi bảng (thiếu cột và thừa cột đều đỏ), kiểu (`COLUMN_TYPE` viết thường: `int`, `varchar(n)`, `date`, `timestamp`, `float`), NULL/NOT NULL, tập khoá mỗi cột (`PK`, `UNIQUE`, `FK→tblY.cột`). Ràng buộc nhiều cột trong DB thì đỏ (hợp đồng chỉ có khoá một cột).
- Ghi chú dưới bảng của contracts.md cũng được đọc: `` `cột DEFAULT giá trị` `` (so hai chiều với `COLUMN_DEFAULT`), `` Index `a`, `b` `` (DB phải có index bắt đầu bằng cột đó), câu có `UNIQUE` nhắc đúng một cột (nhắc 0 hoặc nhiều cột thì ném lỗi, chuyển vào ô Khoá). Sau merge, UNIQUE của `tblCart.clientId` đọc từ ô khoá; ghi chú `` `clientId` UNIQUE: … `` chỉ trùng lại, không đổi kết quả.
- Từ đoạn mở đầu §2 (`DocRules`): engine `InnoDB`, collation `utf8mb4_0900_ai_ci` của bảng và mọi cột chữ, cột tự tăng (`Khoá chính `id` là `AUTO_INCREMENT``: bảng có khoá chính đúng một cột `id` thì cột đó `auto_increment`, mọi cột khác không). Câu không còn trong tài liệu thì test ném lỗi nêu regex, không bỏ kiểm.
- `docs/schema.md` so với contracts.md ở mức bảng 4 cột (bảng, cột, kiểu, Null, khoá; cùng bộ đọc). Ghi chú văn xuôi của schema.md (mục 2) không so.
- Thông điệp lỗi một dòng mỗi chỗ lệch, có `bảng.cột`, ví dụ `tblClient.phone: kiểu DB varchar(11), docs/contracts.md varchar(10)`.

### 2.2 ArchitectureTest

Quét mọi `.class` dưới thư mục chứa `vn/tiemtruyen/dao/DAO.class` (`target/classes`) bằng `java.lang.classfile` của JDK 25, không thêm thư viện.

| Ca | Kiểm |
|---|---|
| `contractTableListsExactlyTheNineDaoClasses` | Cột Lớp của §5.3 đúng chín lớp của §5.1 |
| `daoPackageHasExactlyTheNineDaoClasses` | Lớp cấp cao nhất của gói `vn.tiemtruyen.dao` đúng 9 lớp; lớp lồng/cục bộ/ẩn danh (có thuộc tính `NestHost`) không tính |
| `daoHierarchyFollowsContract` | Lớp cha đúng `X extends Y` của §5.3; `DAO implements AutoCloseable` |
| `noDaoOutsideTheNineAndNoneForIntermediateClasses` | Không lớp nào (kể cả lớp lồng, ở gói bất kì) tên `*DAO` ngoài 9 lớp; bốn lớp trung gian của §5.1 là lớp model thật và §5.3 không có DAO của chúng |
| `noMethodReadsById` | Không hàm nào ở bất kì lớp main nào tên khớp `(get\|find).*ById` |
| `daoPublicMethodsAreListedInContract` | Hàm public khai báo trong mỗi DAO (bỏ constructor, hàm synthetic/bridge, hàm trùng chữ kí hàm public của `Object`) có **tên và descriptor** nằm trong §5.3 của lớp đó, cộng `close()V`. Đọc §5.3 lúc chạy qua `ContractsDoc.tableUnder`; `T[]` = `java/util/List`, kiểu tên lớp phải là lớp model đã biên dịch |
| `everyContractMethodIsDeclared` | Chiều ngược: mọi hàm của §5.3 được khai báo public đúng descriptor trong lớp của nó |
| `eachRootObjectHasOneUpdateMethod` | Mỗi DAO tối đa một hàm public tên `update*`; mỗi kiểu tham số (đối tượng gốc) tối đa một hàm `update*` trên mọi DAO |
| `noClassIsAServlet` | Không lớp main nào gán được cho `jakarta.servlet.http.HttpServlet` (nạp bằng `Class.forName(…, false, …)`, không khởi tạo) |
| `noClassReferencesSpring` | Không mục `Utf8` nào trong constant pool chứa `org/springframework` hoặc `org.springframework` |

Covariant `ClientDAO.checkLogin(User): Client` sinh thêm hàm bridge `checkLogin(User): User`; hàm bridge bị bỏ qua nên không bị tính là hàm thừa.

## 3. Test đỏ trong worktree này chỉ vì thiếu DAO

Không có 8 DAO (trạng thái commit của lane), `./mvnw -B -ntp clean test -Dtest=ArchitectureTest`: 10 ca, **2 đỏ**, 8 xanh:

- `daoPackageHasExactlyTheNineDaoClasses`: gói chỉ có `[DAO]`.
- `everyContractMethodIsDeclared`: 17 hàm của §5.3 báo `(chưa có lớp)`.

Hai ca này sẽ xanh sau khi orchestrator merge 3B, 3C nếu DAO đúng §5.3. Các ca khác bỏ qua lớp chưa có, nên vẫn xanh. `SchemaConformanceTest` không phụ thuộc DAO.

## 4. Làm đỏ có chủ đích (không commit bản lỗi)

| Sửa tạm | Kết quả |
|---|---|
| Thêm `public Book getBookById(int)`, `public boolean updateBookCopy(Book)` và lớp lồng `public static final class RentedBookDAO` vào `BookDAO` tạm; thêm `web/TmpServlet extends HttpServlet` có hằng `"org.springframework.context"` | `ArchitectureTest` 6 đỏ: `noMethodReadsById` (`BookDAO.getBookById`), `daoPublicMethodsAreListedInContract` (hai hàm, kèm danh sách cho phép), `eachRootObjectHasOneUpdateMethod` (`BookDAO` hai hàm cập nhật), `noDaoOutsideTheNine…` (`BookDAO$RentedBookDAO`), `noClassIsAServlet`, `noClassReferencesSpring`. `daoPackageHasExactlyTheNineDaoClasses` vẫn xanh: lớp lồng không bị đếm |
| Trong V1: `phone VARCHAR(10)` → `VARCHAR(11)`, thêm cột `tblStaff.hiredAt DATE NULL`; trong `docs/schema.md`: `staffId` NULL → NOT NULL | `SchemaConformanceTest` 3 đỏ: `migratedSchemaMatchesContracts` (`tblClient.phone: kiểu DB varchar(11), docs/contracts.md varchar(10)`; `tblStaff.hiredAt: cột thừa trong DB`), `schemaDocMatchesContracts` (`tblRentalBill.staffId: Null docs/schema.md NOT NULL, docs/contracts.md NULL`), `checkReportsEveryDrift…` (đột biến `phone VARCHAR\(10\)` không còn khớp V1: chốt chặn để đột biến không âm thầm thành no-op) |

Trả lại các file thì xanh (`clean verify` ở mục 1). Ca `checkReportsEveryDriftInMutatedCopyOfV1` giữ việc làm đỏ này trong bộ test: 8 đột biến (đổi kiểu, thêm cột, bỏ cột, bỏ UNIQUE, đổi NULL, đổi DEFAULT, bỏ index, thêm bảng), mỗi đột biến phải ra đúng một dòng nêu tên bảng/cột.

## 5. Đề xuất cho orchestrator

1. **Chạy `clean` khi xoá lớp main.** `ArchitectureTest` đọc `target/classes`; lớp đã xoá khỏi `src` mà còn `.class` cũ thì test vẫn thấy nó. Lần chạy không DAO ở mục 3 dùng `clean test`. Accept script nên dùng `clean verify`.
2. **Hai danh sách tên trong `ArchitectureTest`** (chín DAO, bốn lớp trung gian) là luật §5.1 viết trong test; `contractTableListsExactlyTheNineDaoClasses` giữ chúng khớp §5.3. Danh sách hàm thì đọc từ §5.3, không chép.
3. **`DocRules` phụ thuộc ba câu của đoạn mở đầu contracts §2** (`Engine InnoDB`, ``collation `…` ``, ``Khoá chính `id` là `AUTO_INCREMENT` ``). Viết lại đoạn đó thì sửa regex cho khớp; test ném lỗi rõ, không im lặng bỏ kiểm.
4. Không cần đổi `support/`, main, `pom.xml` hay `checkstyle.xml`.

## 6. File của lane

- `src/test/java/vn/tiemtruyen/schema/{SchemaConformanceTest,SchemaDocTest,SchemaDoc,SchemaDiff,LiveSchema,DocRules,TableSpec}.java`
- `src/test/java/vn/tiemtruyen/arch/{ArchitectureTest,CompiledClasses,DaoContract}.java`
- báo cáo này

Không commit 8 DAO tạm. Không chạy `docker compose`.
