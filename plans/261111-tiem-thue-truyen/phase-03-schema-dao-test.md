# Phase 3: Schema, DAO và test DAO

Lane: serial
Depends-on: 2
Effort: L
Owns: `src/main/resources/db/migration/**`, `src/main/resources/db/e2e/**`, `src/main/java/vn/tiemtruyen/model/**`, `src/main/java/vn/tiemtruyen/dao/**`, `src/main/java/vn/tiemtruyen/util/Messages.java`, `src/main/java/vn/tiemtruyen/util/Passwords.java`, `src/main/java/vn/tiemtruyen/util/Codes.java`, `src/main/java/vn/tiemtruyen/util/JsonUtil.java`, `src/main/java/vn/tiemtruyen/util/MigrationListener.java`, `src/test/java/vn/tiemtruyen/**`, `pom.xml`
Creates: `scripts/accept/phase-03.mjs`, `src/main/resources/db/migration/V1__schema.sql`, `src/main/resources/db/migration/V2__catalog_seed.sql`, `src/main/resources/db/e2e/V10__e2e_catalog.sql`, `src/test/java/vn/tiemtruyen/dao/RentalBillConcurrencyTest.java`, `src/test/java/vn/tiemtruyen/schema/SchemaConformanceTest.java`, `src/test/java/vn/tiemtruyen/arch/ArchitectureTest.java`, `src/test/java/vn/tiemtruyen/util/MessagesTest.java`
AX: AX-04 và AX-05 cho `scripts/accept/phase-03.mjs` (exit xác định, mỗi FAIL nêu test hỏng và lệnh chạy lại riêng test đó), AX-07 không hỏi tương tác
Accept: `node scripts/accept/phase-03.mjs`

## Mục tiêu

Schema 13 bảng qua Flyway đúng ch.8 (trừ D1), dữ liệu mẫu V2, catalog E2E theo D3; mọi DAO của ch.9 cộng `BookDAO.addBook` và `updateBook` (D6); khoá K1 khi giữ quyển (brainstorm §4); chặn trạng thái D9 trong `updateRentalBill`; test Testcontainers trên `mysql:8.4.13`, gồm test tranh chấp; test kiến trúc và test so schema với tài liệu.

Hợp đồng: `docs/contracts.md` (chữ kí DAO, luật DAO, K1, D9, Deferred #10–#12) và `docs/schema.md` (bảng cột máy đọc được). Brief mọi lane trỏ tới hai file này và `plans/261111-tiem-thue-truyen/contract.md`.

## Các bước

- [x] **3.0 Orchestrator, tuần tự (file dùng chung):**
  - `V1__schema.sql`: 13 bảng InnoDB utf8mb4 theo brainstorm §2.1, tên bảng và cột đúng ch.8, `tblUser.password varchar(255)` (D1), `tblClient.userId` và `tblStaff.userId` là khoá chính kiêm khoá ngoại, `tblBook.publishYear` cho phép NULL; UNIQUE `tblUser.username`, `tblClient.idCard`, `tblClient.phone`, `tblClient.email`, `tblCart.clientId`, `tblBookCopy.barcode`, `tblDamage.name`, `tblCollateral.name`; index `tblRentedBook(bookCopyId)`, `tblRentalBill(status)`, `tblBook(name)`, `tblBook(author)`. Không cột dẫn xuất (không số lượng, tổng tiền, trạng thái quyển).
  - `V2__catalog_seed.sql`: loại lỗi (có "Rách bìa", "Rách trang", "Vết bẩn, viết vẽ" với mô tả đúng ch.2 và "Ố vàng"), loại tài sản cọc (có "Căn cước công dân", "Tiền mặt" với mô tả đúng ch.2), nhân viên Nguyễn Thu Hà (`hant`, chức vụ "Nhân viên bán hàng") và một nhân viên chức vụ "Quản lí", vài khách mẫu không trùng với khách của ch.2 (mỗi khách kèm một dòng `tblCart`, như `ClientDAO.addClient`); V2 nạp ở mọi lần chạy vì dự án chỉ chạy localhost (Deferred #26, #28); mật khẩu là chuỗi Argon2id sinh sẵn bằng `Passwords` (ghi mật khẩu gốc vào `docs/dev-accounts.md`).
  - `db/e2e/V10__e2e_catalog.sql`: đầu truyện của ch.2 với id khớp mã (DT001 Doraemon - Tập 1, DT002 Doraemon - Tập 2, DT015 Doraemon: Nobita và lâu đài dưới đáy biển, DT020 và DT021 Thám tử lừng danh Conan - Tập 1, 2), tác giả, thể loại, giá thuê đúng ch.2, nhà xuất bản Kim Đồng, năm 2023 cho DT001; không có "Thần đồng đất Việt" (D3); quyển truyện đủ để màn hình hiện đúng số lượng của ch.2 sau khi fixture của phase 8 giữ chỗ (DT001 cần quyển 01, 02 bị giữ để quyển được gán là DT001-03 theo Deferred #10; DT020 cần quyển 01 bị giữ để gán DT020-02).
  - Thêm phụ thuộc vào `pom.xml` nếu lane cần (Testcontainers 2.0.5 `testcontainers-mysql`, Connector/J 26.10.0, Flyway 13.12.1, HikariCP 7.1.0, Password4j 1.8.4, Jackson 3.3.0); `scripts/accept/phase-03.mjs`. Commit trước khi spawn.
- [x] **3.1 Lane 3A `model-util`, tuần tự (các lane DAO cần lớp model):** chạy migration lần đầu trên Testcontainers `mysql:8.4.13` để kiểm Flyway 13 với MySQL 8.4 sớm nhất.
- [x] **3.2 Lane 3B `dao-user-book`**, **3.3 Lane 3C `dao-cart-bill`**, **3.4 Lane 3D `kiem-kien-truc`** song song (3 chỗ).
- [x] **3.5 Orchestrator:** merge; chạy Accept.
- [x] **3.6 Orchestrator, phụ (Deferred #22):** dùng cua-driver mở MySQL Workbench 8.0, Database → Reverse Engineer vào MySQL của compose (127.0.0.1:3307), chụp ERD, đối chiếu với `images/svg/design_database.svg`; mỗi lần bấm kiểm lại bằng `verify_state`; nếu cửa sổ con mở ra thì `get_window_state` lại theo `window_id` của chính nó. Ghi `plans/reports/phase-03-workbench-<ts>.md`. Nếu cua-driver chưa nạp: báo chủ dự án khởi động lại. Nếu UIPI chặn: dừng bước này, báo chủ dự án, không lùi về script GUI.
- [x] **3.7 Orchestrator:** đánh dấu, push nhánh phase, mở PR vào `main` và merge bằng merge commit (`contract.md` §9).

## Luật khoá K1 và D9 (tóm tắt, bản đủ ở `docs/contracts.md`)

- Áp cho mọi đường tạo `tblRentedBook`: `addRentalBill` và nhánh thêm quyển của `updateRentalBill`. Transaction READ COMMITTED, autocommit tắt.
- (1) `SELECT id FROM tblBook WHERE id IN (…) ORDER BY id FOR UPDATE`; (2) với từng dòng đọc lại quyển còn trống (`NOT EXISTS` RentedBook của phiếu chưa huỷ trỏ vào, trừ chính phiếu này); (3) quyển đã bận thì đổi sang quyển trống có id nhỏ nhất cùng đầu truyện, chưa có trong phiếu; không đủ thì rollback và trả `false`; (4) ghi rồi commit. Không tin `book.listBookCopy` trong session.
- `updateRentalBill` (huỷ, sửa danh sách, xác nhận) khoá dòng phiếu (`SELECT status FROM tblRentalBill WHERE id = ? FOR UPDATE`) và chỉ ghi khi trạng thái trong DB vẫn là "Chờ nhận"; khác thì rollback và trả `false` (trang đọc lại trạng thái theo Deferred #11).
- Huỷ và bỏ quyển không cần khoá đầu truyện vì chỉ giải phóng. `updateCart` không giữ quyển nên không khoá.

## Lane trong phase

3A chạy một mình trước. Sau đó 3B, 3C, 3D song song (3 chỗ). Không có lane thứ 4.

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 3A `model-util` | 13 lớp model đúng tên thực thể, `implements Serializable`, quan hệ theo brief §3 (Cart có `listSelectedBook`, RentalBill có `listRentedBook` và `listRentalCollateral`, RentedBook có `listRentedDamage`); `dao/DAO.java` (lớp cha giữ `con`, `AutoCloseable`); `util/Messages` (28 hằng số đúng `docs/contracts.md`), `util/Passwords` (Argon2id, Password4j), `util/Codes` (định dạng và tách mã DT/PM theo D8), `util/JsonUtil.toScriptJson` (escape `<`, `>`, `&`, U+2028, U+2029), `util/MigrationListener` (location theo `contract.md` §5); test `MessagesTest` (so từng chữ với bảng trong `docs/contracts.md`), `PasswordsTest` (độ dài chuỗi băm ≤ 255), `CodesTest`, `JsonUtilTest`, `SerializationTest` (tuần tự hoá cả đồ thị Cart và RentalBill) | `t1k-web-core-developer` | `model/**`, `dao/DAO.java`, 5 file `util/` ở dòng Owns, `src/test/java/vn/tiemtruyen/util/**`, `src/test/java/vn/tiemtruyen/support/**` (lớp nền Testcontainers dùng chung, viết xong trước khi mở 3B–3D) | 3.0 |
| 3B `dao-user-book` | `UserDAO.checkLogin`, `ClientDAO.checkLogin` (gọi `UserDAO.checkLogin` rồi lấy phần riêng), `ClientDAO.addClient` (tạo luôn giỏ, trả `false` khi trùng username/CCCD/SĐT/email), `StaffDAO.checkLogin`, `BookDAO.searchBook` (theo tên hoặc tác giả, kèm quyển đang sẵn sàng), `BookDAO.addBook`, `BookDAO.updateBook` (quyển đi qua Book chủ, D6), `DamageDAO.searchDamage`/`addDamage`, `CollateralDAO.searchCollateral`/`addCollateral`; test từng hàm | `t1k-web-core-developer` | `dao/UserDAO.java`, `dao/ClientDAO.java`, `dao/StaffDAO.java`, `dao/BookDAO.java`, `dao/DamageDAO.java`, `dao/CollateralDAO.java`, test cùng tên trong `src/test/java/vn/tiemtruyen/dao/` | 3A |
| 3C `dao-cart-bill` | `CartDAO.getCart` (chỉ dòng chưa thuộc phiếu chưa huỷ), `CartDAO.updateCart`; `RentalBillDAO.addRentalBill` (K1), `getRentalBillList`, `searchRentalBill` (theo mã PM, tên khách, CCCD), `updateRentalBill` (K1 cho quyển thêm mới, D9, ghi RentedDamage và RentalCollateral qua đối tượng chủ); test từng hàm và `RentalBillConcurrencyTest`: 2 luồng tranh quyển cuối thì đúng 1 thành công; N luồng tranh M quyển thì tổng quyển được giữ bằng M; quyển đã chọn bị giữ thì đổi sang quyển khác; huỷ và xác nhận cùng lúc thì một bên thắng, bên kia nhận `false` | `t1k-web-core-developer` | `dao/CartDAO.java`, `dao/RentalBillDAO.java`, test cùng tên và `RentalBillConcurrencyTest.java` | 3A |
| 3D `kiem-kien-truc` | `SchemaConformanceTest` (đọc `information_schema` sau migration, so tên bảng, cột, kiểu, khoá chính, khoá ngoại, UNIQUE với bảng máy đọc được trong `docs/schema.md`; không cho cột ngoài danh sách); `ArchitectureTest` (quét lớp đã biên dịch: đúng 9 lớp trong `dao` là DAO, UserDAO, ClientDAO, StaffDAO, BookDAO, CartDAO, RentalBillDAO, DamageDAO, CollateralDAO; không DAO cho lớp trung gian; không hàm tên `get*ById`/`find*ById`; hàm public của mỗi DAO nằm trong danh sách của `docs/contracts.md`; mỗi đối tượng gốc chỉ một hàm cập nhật; không lớp nào kế thừa `HttpServlet`; không phụ thuộc gói `org.springframework`) | `t1k-web-core-developer` | `src/test/java/vn/tiemtruyen/schema/**`, `src/test/java/vn/tiemtruyen/arch/**` | 3A |

Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent. Lane cần thêm phụ thuộc Maven thì ghi đề xuất vào báo cáo, orchestrator sửa `pom.xml`. Lane cần đổi migration cũng vậy.

## Tiêu chí hoàn thành

1. `mvnw -B verify` xanh: Flyway migrate V1 và V2 (và V10 e2e trong test đặt `FLYWAY_DATA_LOCATION=classpath:db/e2e`) trên `mysql:8.4.13`, mọi test DAO, 4 test tranh chấp, `SchemaConformanceTest`, `ArchitectureTest`, `MessagesTest`, `SerializationTest`.
2. Làm đỏ có chủ đích một lần (lane 3C ghi báo cáo): bỏ `FOR UPDATE` của bước (1) thì ít nhất một test tranh chấp đỏ; thêm hàm `getBookById` vào `BookDAO` thì `ArchitectureTest` đỏ; sửa một chữ trong `Messages` thì `MessagesTest` đỏ.
3. Compose khởi động lại sạch: listener chạy migration, `/health.jsp` 200, `SELECT COUNT(*) FROM tblDamage` lớn hơn 0 qua `docker compose exec db mysql`.
4. Accept phase 1 và phase 2 vẫn xanh.

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-03.mjs` chạy tiêu chí 1, 3, 4. Tiêu chí 2 ghi trong báo cáo của lane 3C và 3D.

## Playwright MCP

Không áp dụng: phase này chưa có trang. Bước 3.6 dùng cua-driver, không dùng Playwright.

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Flyway 13 không chạy với MySQL 8.4 | low | high | Lane 3A chạy migration trên Testcontainers ngay đầu phase; hỏng thì báo chủ dự án trước khi đi tiếp |
| Deadlock trong test tranh chấp | medium | medium | Khoá đầu truyện theo id tăng dần; test đặt timeout; 3 lần sửa không xanh thì dừng (kill b) |
| Testcontainers trên Windows không nối được Docker | low | medium | Kiểm `docker info` trong Accept, báo exit 2 kèm việc cần làm |
| Lệch tên cột với ch.8 | medium | high | `SchemaConformanceTest` so với `docs/schema.md`; bước 3.6 đối chiếu ERD |
| Đồ thị session không tuần tự hoá được cho Redis | medium | medium | `SerializationTest` cho Cart và RentalBill đủ con |

## Rollback

`git revert -m 1 <merge phase 3>`. Muốn chạy migration lại từ đầu trên máy dev thì đổi `MYSQL_DATABASE` sang một database mới; volume `db_data` chỉ bị xoá khi chủ dự án đồng ý.

## Ước lượng

Effort L: khoảng 6–10 giờ agent (ESTIMATED: 3.0 khoảng 1,5 giờ; 3A khoảng 2 giờ; 3B–3D song song khoảng 2–4 giờ vì test tranh chấp; tích hợp khoảng 1 giờ; bước Workbench khoảng 30 phút).
