# Hợp đồng nghiệp vụ và tích hợp (SSOT)

<!-- updated 261111 -->

Owner: orchestrator. Lane 2A tạo lần đầu (11/11/2026); từ khi orchestrator duyệt và commit, chỉ orchestrator sửa (`plans/261111-tiem-thue-truyen/contract.md` §8). Lane cần đổi thì ghi đề xuất vào báo cáo của lane.
Kiểm bằng: `scripts/check/contracts-doc.test.mjs` (phase 2), `MessagesTest`, `SchemaConformanceTest`, `ArchitectureTest` (phase 3), agent `tiem-contract-guard`.

Phạm vi: nghiệp vụ và tích hợp trang (thực thể, bảng, DAO, khoá, session, trang, field form, thông báo, props island, phân quyền, hiển thị). Hạ tầng (cổng, biến môi trường, build, cây thư mục) nằm ở `plans/261111-tiem-thue-truyen/contract.md`. Hai file nói khác nhau về nghiệp vụ thì file này thắng; về hạ tầng thì `contract.md` thắng.

Nguồn, theo thứ tự ưu tiên: brief `prompt-web-tiem-thue-truyen.md` §3 (thầy đã duyệt) → quyết định D1–D11 của `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` → `plans/261111-tiem-thue-truyen/plan.md` mục "Deferred decisions" → báo cáo PDF ch.2, ch.8, ch.9, ch.10. Chỗ nào nguồn không trả lời thì theo mục 14 (C1–C13, đã chốt); điểm mới chưa có ở đó thì dừng và hỏi chủ dự án, không tự đặt luật nghiệp vụ mới.

Kí hiệu: `(ch.9 tr.62)` là trang in của báo cáo; `(C3)` trỏ tới điểm số 3 ở mục 14.

## 1. Thực thể và quan hệ

13 thực thể: User, Client, Staff (Client và Staff kế thừa User), Book, BookCopy, Damage, Collateral, Cart, SelectedBook, RentalBill, RentedBook, RentedDamage, RentalCollateral.

| Quan hệ | Ý nghĩa |
|---|---|
| Client 1 — 1 Cart | Mỗi khách một giỏ, tạo cùng lúc với tài khoản (`addClient`) |
| Cart ◆ SelectedBook ◇ BookCopy | Một dòng giỏ là **một quyển**, không có cột số lượng. Số lượng hiển thị = số dòng cùng đầu truyện |
| Book ◆ BookCopy | Đầu truyện chứa các quyển; quyển có `barcode` riêng |
| RentalBill ◆ RentedBook ◇ BookCopy | Dòng phiếu trỏ quyển **thực giao**, có thể khác quyển trong giỏ |
| RentedBook ◇ SelectedBook 0..1 | Dòng giỏ đã sinh ra dòng phiếu; để trống khi nhân viên thêm tại quầy |
| RentedBook ◆ RentedDamage ◇ Damage | Lỗi ghi nhận cho từng quyển khi giao |
| RentalBill ◆ RentalCollateral ◇ Collateral | Khoản đặt cọc của phiếu |
| Client 1 — n RentalBill, Staff 0..1 — n RentalBill | Phiếu thuộc một khách; nhân viên xử lí để trống tới khi giao |

Phiếu mượn chỉ giữ **một** danh sách quyển: `listRentedBook` (cộng danh sách khoản cọc `listRentalCollateral`).

Quyển truyện **không có cột trạng thái**. Một quyển "bận" khi có `tblRentedBook` của một phiếu chưa huỷ (`status <> 'Đã huỷ'`) trỏ vào nó; ngược lại là "đang sẵn sàng". Dòng giỏ không giữ quyển.

## 2. Bảng MySQL

Tên bảng, cột, khoá ngoại đúng ch.8 (tr.53–55) và ERD `images/svg/design_database.svg`. Khác báo cáo duy nhất: `tblUser.password varchar(255)` (D1, ADR-0002). Kiểu ghi theo cú pháp MySQL; `Null` là `NULL` hoặc `NOT NULL`. Không có cột dẫn xuất (số lượng hiện có, số lượng muốn thuê, trạng thái quyển, tổng số quyển, tổng tiền: ch.8 bước 5). Engine InnoDB, `utf8mb4`, collation `utf8mb4_0900_ai_ci` (so sánh không phân biệt hoa thường và dấu). Khoá chính `id` là `AUTO_INCREMENT`, trừ `tblClient` và `tblStaff` lấy `userId` làm khoá chính.

### tblUser

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| username | varchar(50) | NOT NULL | UNIQUE |
| password | varchar(255) | NOT NULL | |
| fullName | varchar(100) | NOT NULL | |

`password` chứa chuỗi băm Argon2id (Password4j), không bao giờ là mật khẩu thô (D1).

### tblClient

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| userId | int | NOT NULL | PK, FK→tblUser.id |
| dob | date | NOT NULL | |
| idCard | varchar(12) | NOT NULL | UNIQUE |
| phone | varchar(10) | NOT NULL | UNIQUE |
| email | varchar(100) | NOT NULL | UNIQUE |
| address | varchar(255) | NOT NULL | |

### tblStaff

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| userId | int | NOT NULL | PK, FK→tblUser.id |
| position | varchar(50) | NOT NULL | |

Giá trị `position` dùng trong code: `Nhân viên bán hàng` (ch.2 2.3), `Quản lí` (D6, mở trang quản trị).

### tblBook

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| name | varchar(255) | NOT NULL | |
| author | varchar(100) | NOT NULL | |
| publisher | varchar(100) | NOT NULL | |
| publishYear | int | NULL | |
| category | varchar(50) | NOT NULL | |
| description | varchar(255) | NULL | |
| rentalPrice | float | NOT NULL | |

`publishYear` cho phép NULL vì pipeline không bịa năm (brainstorm §6). `description` cho phép NULL vì nguồn có thể thiếu mô tả; pipeline cắt mô tả ở 255 kí tự theo ranh giới câu. Index `name`, `author`. `rentalPrice` là giá thuê theo ngày (đồng).

### tblBookCopy

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| barcode | varchar(20) | NOT NULL | UNIQUE |
| bookId | int | NOT NULL | FK→tblBook.id |

`barcode` lưu thật dạng `DT001-03` (D8): `DT` + id đầu truyện đủ 3 chữ số + `-` + số thứ tự quyển đủ 2 chữ số.

### tblDamage

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| name | varchar(100) | NOT NULL | UNIQUE |
| description | varchar(255) | NULL | |

### tblCollateral

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| name | varchar(100) | NOT NULL | UNIQUE |
| description | varchar(255) | NULL | |

### tblCart

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| clientId | int | NOT NULL | FK→tblClient.userId, UNIQUE |

`clientId` UNIQUE: quan hệ 1-1 của ch.8 bước 3.

### tblSelectedBook

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| cartId | int | NOT NULL | FK→tblCart.id |
| bookCopyId | int | NOT NULL | FK→tblBookCopy.id |

### tblRentalBill

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| createdAt | timestamp | NOT NULL | |
| expectedPickupAt | timestamp | NOT NULL | |
| expectedDays | int | NOT NULL | |
| borrowDate | date | NULL | |
| dueDate | date | NULL | |
| discount | float | NOT NULL | |
| note | varchar(255) | NULL | |
| status | varchar(20) | NOT NULL | |
| cancelReason | varchar(255) | NULL | |
| clientId | int | NOT NULL | FK→tblClient.userId |
| staffId | int | NULL | FK→tblStaff.userId |

Mặc định: `createdAt DEFAULT CURRENT_TIMESTAMP`, `discount DEFAULT 0`. `borrowDate`, `dueDate`, `staffId` để NULL tới khi giao; `cancelReason` chỉ có khi huỷ. Index `status`. Seed E2E đặt `AUTO_INCREMENT = 125` để phiếu mới là PM0125 (Deferred #15).

### tblRentedBook

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| rentalPrice | float | NOT NULL | |
| conditionNote | varchar(255) | NULL | |
| rentalBillId | int | NOT NULL | FK→tblRentalBill.id |
| bookCopyId | int | NOT NULL | FK→tblBookCopy.id |
| selectedBookId | int | NULL | FK→tblSelectedBook.id |

`rentalPrice` là giá chốt lúc lập dòng phiếu, giữ lại dù `tblBook.rentalPrice` đổi sau (ch.8 bước 5). `selectedBookId` NULL khi nhân viên thêm quyển tại quầy. `conditionNote` NULL nghĩa là chưa ghi nhận tình trạng (C7). Index `bookCopyId`.

### tblRentedDamage

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| note | varchar(255) | NULL | |
| rentedBookId | int | NOT NULL | FK→tblRentedBook.id |
| damageId | int | NOT NULL | FK→tblDamage.id |

### tblRentalCollateral

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| value | varchar(100) | NOT NULL | |
| note | varchar(255) | NULL | |
| rentalBillId | int | NOT NULL | FK→tblRentalBill.id |
| collateralId | int | NOT NULL | FK→tblCollateral.id |

`value` là chuỗi tự do do nhân viên nhập (ví dụ `001203012345`, `100.000đ`: ch.2 bước 35, 39).

## 3. Lớp model (`vn.tiemtruyen.model`)

Thuộc tính theo biểu đồ lớp ch.9 (tr.61, 71, 86). Mọi lớp `implements Serializable` (session trong Redis, D7). Không thêm thuộc tính dẫn xuất (không `availableCount`, `total`, `quantity`, `copyStatus`).

| Lớp | Thuộc tính |
|---|---|
| User | `id: int`, `username: String`, `password: String`, `fullName: String` |
| Client extends User | `dob: LocalDate`, `idCard: String`, `phone: String`, `email: String`, `address: String` |
| Staff extends User | `position: String` |
| Book | `id: int`, `name: String`, `author: String`, `publisher: String`, `publishYear: Integer` (null được), `category: String`, `description: String`, `rentalPrice: float`, `listBookCopy: List<BookCopy>` |
| BookCopy | `id: int`, `barcode: String`, `book: Book` |
| Damage | `id: int`, `name: String`, `description: String` |
| Collateral | `id: int`, `name: String`, `description: String` |
| Cart | `id: int`, `client: Client`, `listSelectedBook: List<SelectedBook>` |
| SelectedBook | `id: int`, `bookCopy: BookCopy` |
| RentalBill | `id: int`, `createdAt: LocalDateTime`, `expectedPickupAt: LocalDateTime`, `expectedDays: int`, `borrowDate: LocalDate`, `dueDate: LocalDate`, `discount: float`, `note: String`, `status: String`, `cancelReason: String`, `client: Client`, `staff: Staff`, `listRentedBook: List<RentedBook>`, `listRentalCollateral: List<RentalCollateral>` |
| RentedBook | `id: int`, `rentalPrice: float`, `conditionNote: String`, `bookCopy: BookCopy`, `selectedBook: SelectedBook`, `listRentedDamage: List<RentedDamage>` |
| RentedDamage | `id: int`, `note: String`, `damage: Damage` |
| RentalCollateral | `id: int`, `value: String`, `note: String`, `collateral: Collateral` |

- Kiểu mảng `T[]` của ch.9 là `List<T>` trong Java; hàm DAO trả danh sách rỗng chứ không trả `null`.
- `id = 0` nghĩa là đối tượng chưa lưu.
- `Book.listBookCopy` đọc từ `searchBook` chỉ gồm quyển **đang sẵn sàng**; số lượng hiện có = `listBookCopy.size()`, tính lúc hiển thị.
- `BookCopy.book` và `Book.listBookCopy` trỏ vòng: khi sinh JSON cho island chỉ dùng DTO của mục 11, không đưa thẳng model vào `JsonUtil`.

## 4. Hằng chuỗi nghiệp vụ

| Loại | Giá trị (đúng từng kí tự, Unicode NFC) |
|---|---|
| `RentalBill.status` | `Chờ nhận` · `Đang cho thuê` · `Đã huỷ` |
| `Staff.position` | `Nhân viên bán hàng` · `Quản lí` |
| Dấu trạng thái trên giao diện | `CHỜ NHẬN` · `ĐANG CHO THUÊ` · `ĐÃ HUỶ` (chỉ hiển thị, luôn kèm chữ, không chỉ dựa vào màu) |

Ba trạng thái là hằng số trong `RentalBill` (hoặc một lớp hằng duy nhất trong `model`); không gõ lại chuỗi ở trang.

## 5. DAO

### 5.1 Luật DAO (của thầy, brief §3)

- Lớp cha `DAO` giữ `Connection`. Tám DAO: UserDAO, ClientDAO, StaffDAO, BookDAO, CartDAO, RentalBillDAO, DamageDAO, CollateralDAO. Không có DAO nào khác.
- Lớp trung gian phụ thuộc không có DAO riêng: không có SelectedBookDAO, RentedBookDAO, RentedDamageDAO, RentalCollateralDAO. Mọi thao tác đi qua DAO của đối tượng chủ: `CartDAO.updateCart(cart)`, `RentalBillDAO.updateRentalBill(rentalBill)`.
- Mỗi đối tượng gốc chỉ có **một** hàm cập nhật. Trang gán giá trị vào đối tượng, hàm lưu.
- Không có hàm đọc theo id (getById hay biến thể như getBookById đều bị cấm). Đăng nhập trả về Client hoặc Staff đủ thông tin; danh sách đọc lên kèm con; trang chọn dòng theo id **trong danh sách đã có trong session**.
- Hàm lấy đúng ch.9, không gộp các cặp trông giống nhau (ví dụ `getRentalBillList(client)` và `searchRentalBill(keyword)` là hai hàm riêng; `ClientDAO.checkLogin` và `StaffDAO.checkLogin` riêng).
- Không tin dữ liệu đã đọc trước đó cho việc giữ quyển: kiểm lại trong transaction có khoá (mục 6).

### 5.2 Vòng đời Connection (Deferred #12)

- `DAO implements AutoCloseable`. Constructor mượn một `Connection` từ HikariCP (qua `util/Db`); `close()` trả kết nối về pool.
- Trang dùng try-with-resources: `try (RentalBillDAO dao = new RentalBillDAO()) { ... }`. Không giữ DAO trong session hay field tĩnh.
- Hàm đọc chạy autocommit. Hàm ghi tự mở transaction: `setAutoCommit(false)`, `TRANSACTION_READ_COMMITTED`, commit khi xong, rollback khi lỗi hoặc khi trả `false`, rồi trả autocommit về như cũ.
- `ClientDAO`, `StaffDAO` kế thừa `UserDAO` nên dùng chung kết nối của đối tượng đó khi gọi `super.checkLogin(user)`.
- Lỗi SQL không lường trước: ném ngoại lệ (không nuốt, không trả `false` thay); trang lỗi chung xử lí.

### 5.3 Chữ kí hàm

Tham số và kiểu trả về theo ký hiệu UML của ch.9 (`T[]` = `List<T>`).

| Lớp | Chữ kí | Ghi chú (ch.9) |
|---|---|---|
| DAO (lớp cha) | `con: Connection` | Mượn từ HikariCP; mọi DAO kế thừa |
| UserDAO extends DAO | `checkLogin(user: User): User` | User có tên đăng nhập và mật khẩu khớp, `null` nếu sai (tr.60) |
| ClientDAO extends UserDAO | `checkLogin(user: User): Client` | Gọi `UserDAO.checkLogin` rồi lấy phần riêng của khách; `null` nếu sai hoặc không phải khách (tr.60) |
| ClientDAO extends UserDAO | `addClient(client: Client): boolean` | Lưu tài khoản (băm mật khẩu) **và tạo giỏ**; `false` nếu tên đăng nhập, CCCD, điện thoại hoặc email đã dùng (tr.60) |
| StaffDAO extends UserDAO | `checkLogin(user: User): Staff` | Như ClientDAO, lấy `position`; `null` nếu sai hoặc không phải nhân viên (tr.84–85) |
| BookDAO extends DAO | `searchBook(keyword: String): Book[]` | Đầu truyện có tên hoặc tác giả chứa từ khoá, mỗi đầu truyện kèm các quyển **đang sẵn sàng** (tr.70) |
| BookDAO extends DAO | `addBook(book: Book): boolean` | Ngoài báo cáo (D6). Lưu đầu truyện cùng `listBookCopy` |
| BookDAO extends DAO | `updateBook(book: Book): boolean` | Ngoài báo cáo (D6). Hàm cập nhật duy nhất của Book; quyển đi qua Book chủ (C12). Quyển mới (`id = 0`) nhận mã `DTxxx-NN` với `NN` = số thứ tự lớn nhất đang có của mã cùng tiền tố (không phân biệt hoa thường) cộng 1, không theo số dòng, nên mã lạc số không sinh mã trùng |
| CartDAO extends DAO | `getCart(client: Client): Cart` | Giỏ cùng các dòng **chưa thuộc phiếu mượn nào, trừ phiếu đã huỷ**, mỗi dòng kèm quyển và đầu truyện; danh sách rỗng nếu giỏ trống (tr.69) |
| CartDAO extends DAO | `updateCart(cart: Cart): boolean` | Trong một giao dịch: thêm dòng mới (`id = 0`), xoá dòng bị bỏ; không đụng dòng đã thuộc phiếu chưa huỷ (tr.70). Không khoá quyển. Trả `false` (rollback) duy nhất khi một dòng mới trỏ vào quyển đã có trong giỏ (bất biến mục 6.2). Xoá dòng từng thuộc phiếu **đã huỷ** thì gỡ `tblRentedBook.selectedBookId` của phiếu huỷ đó về NULL trước (khoá ngoại); quyển thực giao của phiếu huỷ giữ nguyên |
| RentalBillDAO extends DAO | `addRentalBill(rentalBill: RentalBill): boolean` | Trong một giao dịch, khoá K1: kiểm quyển vẫn sẵn sàng, quyển đã bị phiếu khác giữ thì đổi sang quyển khác cùng đầu truyện, lưu phiếu "Chờ nhận" cùng các dòng; `false` nếu không còn đủ quyển (tr.70) |
| RentalBillDAO extends DAO | `getRentalBillList(client: Client): RentalBill[]` | Phiếu của khách kèm quyển (cùng lỗi) và khoản cọc (tr.70) |
| RentalBillDAO extends DAO | `searchRentalBill(keyword: String): RentalBill[]` | Phiếu có mã phiếu, tên khách hoặc số CCCD khớp từ khoá, kèm thông tin khách và quyển (tr.85; cách khớp: C9) |
| RentalBillDAO extends DAO | `updateRentalBill(rentalBill: RentalBill): boolean` | Trong một giao dịch: lưu thông tin và trạng thái, đồng bộ dòng phiếu cùng tình trạng khi giao, lỗi và khoản cọc theo `rentalBill`, kiểm quyển mới thêm còn sẵn sàng (K1); khoá dòng phiếu và kiểm trạng thái trong DB vẫn "Chờ nhận" (D9); `false` nếu không còn đủ quyển hoặc trạng thái đã đổi (tr.70, 85). Lỗi (`tblRentedDamage`) và khoản cọc (`tblRentalCollateral`) được ghi lại toàn bộ theo `rentalBill`, nên id của các dòng này đổi sau mỗi lần gọi: không bảng nào có khoá ngoại tới chúng, và trang không giữ id này qua một lần lưu |
| DamageDAO extends DAO | `searchDamage(keyword: String): Damage[]` | Loại lỗi có tên chứa từ khoá (tr.85) |
| DamageDAO extends DAO | `addDamage(damage: Damage): boolean` | Gán `damage.id` khi thành công; `false` nếu tên lỗi đã tồn tại (tr.85) |
| CollateralDAO extends DAO | `searchCollateral(keyword: String): Collateral[]` | Loại tài sản có tên chứa từ khoá (tr.85) |
| CollateralDAO extends DAO | `addCollateral(collateral: Collateral): boolean` | Gán `collateral.id` khi thành công; `false` nếu tên đã tồn tại (tr.85) |

Không có hàm DAO nào ngoài bảng này. Thêm hàm mới là đổi hợp đồng: báo orchestrator.

So khớp từ khoá dùng `LIKE '%…%'` có tham số (`PreparedStatement`, không nối chuỗi SQL); collation `ai_ci` nên không phân biệt hoa thường và dấu.

## 6. Giữ quyển: khoá K1, chọn quyển, D9

### 6.1 Khoá K1 (brainstorm §4)

Áp cho mọi đường tạo `tblRentedBook`: `addRentalBill` và nhánh "thêm quyển mới" của `updateRentalBill`. Trong cùng transaction (READ COMMITTED, autocommit tắt):

1. Khoá các đầu truyện liên quan theo id tăng dần: `SELECT id FROM tblBook WHERE id IN (…) ORDER BY id FOR UPDATE`.
   Ngay sau đó (C21) khoá các dòng `tblSelectedBook` mà các dòng phiếu trỏ tới, theo id tăng dần (`FOR UPDATE`), rồi đếm lại bằng một lệnh đọc riêng (không gộp vào lệnh khoá: subquery trong lệnh `FOR UPDATE` đọc ảnh chụp trước lúc chờ khoá) rằng mỗi dòng còn tồn tại, thuộc giỏ của client của phiếu, không có `tblRentedBook` của phiếu chưa huỷ trỏ vào và không bị hai dòng phiếu cùng trỏ; sai thì rollback, trả `false`. Hàm khoá là hàm nội bộ package-private của `CartDAO`, không phải hàm DAO của §5.3.
2. Với từng dòng, theo thứ tự danh sách, đọc lại quyển còn trống: `NOT EXISTS` dòng `tblRentedBook` của phiếu chưa huỷ trỏ vào quyển đó. Dòng còn lại và dòng vừa ghi của chính phiếu này cũng tính là bận, nên một quyển không vào phiếu hai lần.
3. Quyển đã bận thì đổi sang quyển trống id nhỏ nhất cùng đầu truyện (mục 6.2, ch.9 tr.66); không đủ thì rollback và trả `false`. Chọn theo từng dòng nên dòng nào nhận quyển nào có thể khác cách chọn hai lượt; tập quyển thực giao như nhau (cùng đầu truyện, cùng giá).
4. Ghi phiếu và dòng, commit. Quyển thực giao (sau khi đổi) được ghi lại vào `RentedBook.bookCopy` của đối tượng truyền vào để trang hiển thị đúng mã vạch.

Huỷ phiếu và bỏ quyển không cần khoá (chỉ giải phóng). `updateCart` không giữ quyển nên không khoá quyển hay đầu truyện; nó chỉ khoá các dòng của chính giỏ theo id tăng dần trước khi đọc dòng tự do (C21), cùng thứ tự với bước 1 nên không deadlock với `addRentalBill`, và không xoá dòng vừa thuộc phiếu thiết bị khác mới xác nhận (tránh lỗi khoá ngoại 1451). Không tin `book.listBookCopy` trong session.

Test bắt buộc (Testcontainers, phase 3): hai luồng tranh quyển cuối, đúng một thành công; N luồng tranh M quyển, tổng quyển được giữ bằng M; đổi quyển khi quyển đã chọn bị giữ; huỷ đúng lúc xác nhận (D9).

### 6.2 Chọn quyển cụ thể (Deferred #10)

Mọi chỗ "lấy quyển đang sẵn sàng" (doAddSelectedBook, AddRentedBookView, bước 3 của K1) lấy quyển có `tblBookCopy.id` **nhỏ nhất** còn trống của đầu truyện đó và chưa có trong giỏ hoặc trong phiếu đang sửa. Xác định được, để seed E2E tái tạo đúng DT001-03, DT020-02, DT002-01 của ch.2.

### 6.3 Phiếu đổi trạng thái giữa chừng (D9, Deferred #11)

Ba trang gọi `updateRentalBill` (doCancelRentalBill, doUpdateRentedBookList, doUpdateRentalBill) đều xuất phát từ phiếu "Chờ nhận". Hàm khoá dòng phiếu (`SELECT status FROM tblRentalBill WHERE id = ? FOR UPDATE`), chỉ ghi khi trạng thái trong DB vẫn là "Chờ nhận", ngược lại trả `false`.

Khi nhận `false`, trang đọc lại trạng thái bằng hàm danh sách đã có, không thêm hàm DAO và không đọc theo id:

| Vai | Hàm đọc lại | Ghi vào session |
|---|---|---|
| Nhân viên | `searchRentalBill("PM" + id)` | `listRentalBill` = kết quả |
| Khách | `getRentalBillList(client)` | `listRentalBill` = kết quả |

Chọn câu theo trạng thái mới: "Đã huỷ" → `RENTAL_BILL_CANCELLED`; "Đang cho thuê" → `RENTAL_BILL_ALREADY_PROCESSED`; vẫn "Chờ nhận" → `NOT_ENOUGH_COPIES` (thiếu quyển). Hai trường hợp đầu: nhân viên về `/nhan-vien/SearchRentalBillView.jsp`, khách về `RentalBillListView.jsp`, và trang bỏ `rentalBill` khỏi session.

## 7. Thuộc tính session

Đúng 12 thuộc tính nghiệp vụ (ch.9, ch.10). Không thêm thuộc tính nghiệp vụ khác; thuộc tính kĩ thuật (token CSRF `csrfToken`, `uncheckedBarcodes` của C20, `probeCount` của trang dev) không thuộc danh sách này.

| Thuộc tính | Kiểu | Ghi bởi | Đọc bởi | Bỏ bởi |
|---|---|---|---|---|
| `client` | Client | doRegister (bản đang đăng kí, C5), LoginView (gốc) | RegisterView, ClientHomeView, SearchBookView, BookDetailView, RentalBillListView, AuthFilter | doRegister khi thành công (C5) |
| `staff` | Staff | `/nhan-vien/LoginView.jsp` | StaffHomeView, SearchRentalBillView, ProcessRentalBillView, doUpdateRentalBill, doCancelRentalBill, AuthFilter | |
| `cart` | Cart | SearchBookView (lần mở đầu, `getCart`), doAddSelectedBook, doDeleteSelectedBook | SearchBookView, doAddSelectedBook, doDeleteSelectedBook, doAddRentalBill | doAddRentalBill khi thành công |
| `rentalBill` | RentalBill | SearchBookView (tạo mới khi chưa có `cart`; điền dòng khi "Tạo phiếu mượn"), RentalBillListView, SearchRentalBillView, ProcessRentalBillView, AddConditionView, AddRentalCollateralView, doUpdateRentedBookList, doUpdateRentalBill, doCancelRentalBill | ConfirmRentalBillView, doAddRentalBill, RentalBillDetailView, doCancelRentalBill, ProcessRentalBillView, EditRentedBookListView, doUpdateRentedBookList, AddRentalCollateralView, doUpdateRentalBill, PrintRentalBillView | doAddRentalBill khi thành công; trang D9 (mục 6.3) |
| `listBook` | Book[] | SearchBookView, AddRentedBookView (tìm); quan-tri/doAddBook (= [đầu truyện vừa thêm]), quan-tri/doUpdateBook (thay phần tử cùng id) (D6) | SearchBookView, AddRentedBookView | |
| `book` | Book | SearchBookView (chọn dòng, bấm Xoá); quan-tri/AddBookView (nháp id 0), quan-tri/doAddBook, quan-tri/doUpdateBook (D6; bỏ sau khi lưu) | BookDetailView, doAddSelectedBook, doDeleteSelectedBook | |
| `listRentalBill` | RentalBill[] | RentalBillListView (`getRentalBillList`), SearchRentalBillView (`searchRentalBill`), trang D9, nhan-vien/doUpdateRentalBill | RentalBillListView, SearchRentalBillView | ClientHomeView (C6) |
| `rentedBook` | RentedBook (bản sao) | ProcessRentalBillView (bấm "Thêm tình trạng"), AddConditionView, doAddDamage | AddConditionView, doAddDamage | AddConditionView khi "Lưu tình trạng" hoặc "Quay lại" |
| `listRentedBook` | RentedBook[] | EditRentedBookListView (chép từ `rentalBill` khi mở), AddRentedBookView | EditRentedBookListView, AddRentedBookView, doUpdateRentedBookList | doUpdateRentedBookList khi thành công; ProcessRentalBillView (C6) |
| `listDamage` | Damage[] | AddConditionView (tìm) | AddConditionView | |
| `listCollateral` | Collateral[] | AddRentalCollateralView (tìm) | AddRentalCollateralView | |
| `listRentalCollateral` | RentalCollateral[] | AddRentalCollateralView (chọn loại, lần đầu thì tạo), doAddCollateral | AddRentalCollateralView, doAddCollateral | AddRentalCollateralView khi "Lưu" hoặc "Quay lại" (C6) |

Luật chung:
- Session chỉ giữ `cart` và `rentalBill` trong lúc khách đang chọn; doAddRentalBill bỏ cả hai.
- Dòng được chọn trong danh sách (mọi nút trên dòng, kể cả "Xem chi tiết") do **trang chứa danh sách** lưu vào session; trang sau chỉ đọc.
- Bản sao `rentedBook` và `listRentedBook` là bản riêng: sửa trên bản sao, chỉ thay vào `rentalBill` khi "Lưu".
- Session nằm trong Redis nên mỗi thuộc tính được tuần tự hoá riêng: `rentalBill` và phần tử tương ứng trong `listRentalBill` **không** cùng một đối tượng. Trang sửa `rentalBill` mà danh sách vẫn được hiển thị lại (doCancelRentalBill) phải thay cả phần tử cùng id trong `listRentalBill`.
- Không giữ mật khẩu trong session: `client` của doRegister và `user` của LoginView xoá trường `password` trước khi lưu hoặc sau khi dùng (C5).

## 8. Quy ước trang

- Thư mục: trang khách (M1, M2) và `doCancelRentalBill.jsp` ở gốc `src/main/webapp/`; trang nhân viên (M3) và `LoginView.jsp` của nhân viên ở `nhan-vien/` (D5); trang quản trị D6 ở `nhan-vien/quan-tri/`; trang công cụ ở `dev/`.
- Mỗi lần ghi DB đi qua một trang `doXxx.jsp` không có giao diện. Trang `XxxView.jsp` chỉ gọi hàm DAO đọc (tìm, đăng nhập, lấy danh sách) và tự gửi về chính nó khi tìm, đăng nhập, sửa bản sao trong session.
- Mọi `<form>` là `method="post"`, có `<t:csrf/>` (input ẩn `name="csrf"`). `CsrfFilter` chặn POST tới `*.jsp` thiếu hoặc sai token bằng 403. Token đổi sau đăng nhập.
- Tên field form đúng ch.9 (`name` và `id` trùng nhau). Nút trên từng dòng và ô trên từng dòng mà ch.9 không đặt tên: theo bảng ở C1.
- Nút gửi tới trang khác (`doXxx.jsp`) dùng `formaction`; nút không có `formaction` gửi về chính trang. Nút "Quay lại" và link sang trang xem không mang dữ liệu là `<a href>` (GET).
- Thông báo: trang đặt câu (hằng của `Messages`) vào request attribute `message` rồi forward; trang xem hiện thông báo dạng hộp có nút "OK" (ch.2). Câu hỏi xác nhận huỷ là hộp riêng có ô "Lí do huỷ" (C2).
- Không có JavaScript thì form HTML vẫn gửi được (island chỉ làm đẹp và hiện số tạm; mục 11).
- Bìa thật chỉ hiện ở kết quả tìm, chi tiết đầu truyện và phiếu mượn; URL `${APP_COVERS_BASE_URL}/{bookId}/cover-{w}.webp` (D2, `contract.md` §6).

## 9. Trang

### 9.1 Danh mục

28 trang ch.9 (tên đúng brief §3), cộng bản `LoginView.jsp` thứ hai của nhân viên (D5) và 5 trang quản trị D6 (Deferred #14).

Ngoài danh mục (không phải trang nghiệp vụ, không gọi DAO): trang lỗi `/error/403.jsp`, `404.jsp`, `405.jsp`, `500.jsp`, `error.jsp` (web.xml `<error-page>`, mở cho mọi người theo §12), trang lỗi tĩnh 400/413/414 của nginx (`docker/nginx/errors/`), `health.jsp` và các trang `/dev/*`.

| # | Trang | Đường dẫn | Loại | Vai | DAO gọi |
|---|---|---|---|---|---|
| 1 | `HomeView.jsp` | `/HomeView.jsp` | xem | mọi người | không |
| 2 | `RegisterView.jsp` | `/RegisterView.jsp` | xem | mọi người | không |
| 3 | `doRegister.jsp` | `/doRegister.jsp` | xử lí | mọi người | `ClientDAO.addClient` |
| 4 | `LoginView.jsp` | `/LoginView.jsp` (khách), `/nhan-vien/LoginView.jsp` (nhân viên) | xem, tự gửi | mọi người | `ClientDAO.checkLogin` / `StaffDAO.checkLogin` |
| 5 | `ClientHomeView.jsp` | `/ClientHomeView.jsp` | xem | khách | không |
| 6 | `StaffHomeView.jsp` | `/nhan-vien/StaffHomeView.jsp` | xem | nhân viên | không |
| 7 | `SearchBookView.jsp` | `/SearchBookView.jsp` | xem, tự gửi | khách | `CartDAO.getCart`, `BookDAO.searchBook` |
| 8 | `BookDetailView.jsp` | `/BookDetailView.jsp` | xem | khách | không |
| 9 | `doAddSelectedBook.jsp` | `/doAddSelectedBook.jsp` | xử lí | khách | `CartDAO.updateCart` |
| 10 | `doDeleteSelectedBook.jsp` | `/doDeleteSelectedBook.jsp` | xử lí | khách | `CartDAO.updateCart` |
| 11 | `ConfirmRentalBillView.jsp` | `/ConfirmRentalBillView.jsp` | xem, tự gửi | khách | không |
| 12 | `doAddRentalBill.jsp` | `/doAddRentalBill.jsp` | xử lí | khách | `RentalBillDAO.addRentalBill` |
| 13 | `RentalBillListView.jsp` | `/RentalBillListView.jsp` | xem, tự gửi | khách | `RentalBillDAO.getRentalBillList` |
| 14 | `RentalBillDetailView.jsp` | `/RentalBillDetailView.jsp` | xem | khách | không |
| 15 | `doCancelRentalBill.jsp` | `/doCancelRentalBill.jsp` (dùng chung, Deferred #13) | xử lí | khách hoặc nhân viên | `RentalBillDAO.updateRentalBill` (+ hàm đọc lại D9) |
| 16 | `SearchRentalBillView.jsp` | `/nhan-vien/SearchRentalBillView.jsp` | xem, tự gửi | nhân viên | `RentalBillDAO.searchRentalBill` |
| 17 | `ProcessRentalBillView.jsp` | `/nhan-vien/ProcessRentalBillView.jsp` | xem, tự gửi | nhân viên | không |
| 18 | `EditRentedBookListView.jsp` | `/nhan-vien/EditRentedBookListView.jsp` | xem, tự gửi | nhân viên | không |
| 19 | `AddRentedBookView.jsp` | `/nhan-vien/AddRentedBookView.jsp` | xem, tự gửi | nhân viên | `BookDAO.searchBook` |
| 20 | `doUpdateRentedBookList.jsp` | `/nhan-vien/doUpdateRentedBookList.jsp` | xử lí | nhân viên | `RentalBillDAO.updateRentalBill` (+ D9) |
| 21 | `AddConditionView.jsp` | `/nhan-vien/AddConditionView.jsp` | xem, tự gửi | nhân viên | `DamageDAO.searchDamage` |
| 22 | `AddDamageView.jsp` | `/nhan-vien/AddDamageView.jsp` | xem | nhân viên | không |
| 23 | `doAddDamage.jsp` | `/nhan-vien/doAddDamage.jsp` | xử lí | nhân viên | `DamageDAO.addDamage` |
| 24 | `AddRentalCollateralView.jsp` | `/nhan-vien/AddRentalCollateralView.jsp` | xem, tự gửi | nhân viên | `CollateralDAO.searchCollateral` |
| 25 | `AddCollateralView.jsp` | `/nhan-vien/AddCollateralView.jsp` | xem | nhân viên | không |
| 26 | `doAddCollateral.jsp` | `/nhan-vien/doAddCollateral.jsp` | xử lí | nhân viên | `CollateralDAO.addCollateral` |
| 27 | `doUpdateRentalBill.jsp` | `/nhan-vien/doUpdateRentalBill.jsp` | xử lí | nhân viên | `RentalBillDAO.updateRentalBill` (+ D9) |
| 28 | `PrintRentalBillView.jsp` | `/nhan-vien/PrintRentalBillView.jsp` | xem | nhân viên | không |
| C14 | `doLogout.jsp` | `/doLogout.jsp` (dùng chung, ngoài báo cáo) | xử lí | khách hoặc nhân viên | không |
| D6 | `ManageBookView.jsp` | `/nhan-vien/quan-tri/ManageBookView.jsp` | xem, tự gửi | quản lí | `BookDAO.searchBook` |
| D6 | `AddBookView.jsp` | `/nhan-vien/quan-tri/AddBookView.jsp` | xem | quản lí | không |
| D6 | `doAddBook.jsp` | `/nhan-vien/quan-tri/doAddBook.jsp` | xử lí | quản lí | `BookDAO.addBook` |
| D6 | `EditBookView.jsp` | `/nhan-vien/quan-tri/EditBookView.jsp` | xem | quản lí | không |
| D6 | `doUpdateBook.jsp` | `/nhan-vien/quan-tri/doUpdateBook.jsp` | xử lí | quản lí | `BookDAO.updateBook` |

Trang công cụ (không thuộc nghiệp vụ, `contract.md` §2, Deferred #18): `/health.jsp`, `/dev/StyleGuideView.jsp`, `/dev/HomePreviewView.jsp`, `/dev/session-probe.jsp`.

### 9.2 Chi tiết từng trang

Mỗi trang: thành phần theo đúng thứ tự (ch.9 và SVG `images/svg/ui_m*_*.svg`), field, session đọc (R) và ghi (W), xử lí, trang gửi tới (→) và trang quay về (←). Nhãn trong ngoặc kép là chữ hiển thị đúng ch.2/ch.9.

#### `HomeView.jsp` (ch.9 tr.56)

- Thành phần: tiêu đề "Trang chủ"; lời chào "Chào mừng bạn đến với cửa hàng cho thuê truyện!"; nút "Đăng nhập", nút "Đăng kí". Cảnh kệ 3D là island `ShelfScene` (mục 11.4) nằm cùng trang.
- Field: `lnkLogin` (link "Đăng nhập" → `LoginView.jsp`), `lnkRegister` (link "Đăng kí" → `RegisterView.jsp`).
- Session: không. DAO: không.
- Bấm gáy truyện trên kệ 3D: rút quyển xuống rồi đi như `lnkLogin` (D10).

#### `RegisterView.jsp` (ch.9 tr.57)

- Thành phần: tiêu đề "Đăng kí tài khoản"; các ô "Họ và tên", "Ngày sinh", "Số CCCD", "Số điện thoại", "Email", "Địa chỉ", "Tên đăng nhập", "Mật khẩu", "Nhập lại mật khẩu"; nút "Đăng kí".
- Field: `txtFullName`, `txtDob`, `txtIdCard`, `txtPhone`, `txtEmail`, `txtAddress`, `txtUsername`, `txtPassword`, `txtConfirmPassword`, `btnRegister` (submit, `formaction="doRegister.jsp"`).
- Session R: `client` (điền lại các ô khi doRegister trả về vì đăng kí không thành công; hai ô mật khẩu luôn để trống).
- → `doRegister.jsp`. Hiện thông báo do doRegister đặt.

#### `doRegister.jsp` (ch.9 tr.57–58)

- Field đọc: 9 field `txt*` của RegisterView.
- Session W: `client` (gán trước khi kiểm, để RegisterView điền lại; không chứa mật khẩu, C5).
- Xử lí theo thứ tự: ô trống hoặc sai định dạng (email, điện thoại, CCCD, ngày sinh; quy tắc ở C4) → `REGISTER_INVALID`, ← `RegisterView.jsp`; mật khẩu nhập lại không khớp → `REGISTER_PASSWORD_MISMATCH`, ← `RegisterView.jsp`; `ClientDAO.addClient(client)` trả `false` → `REGISTER_DUPLICATE`, ← `RegisterView.jsp`; trả `true` → bỏ `client` khỏi session, `REGISTER_SUCCESS`, → `LoginView.jsp`.

#### `LoginView.jsp` (ch.9 tr.58; nhân viên tr.71–72; D5)

- Thành phần: tiêu đề "Đăng nhập"; ô "Tên đăng nhập", ô "Mật khẩu"; nút "Đăng nhập".
- Field: `txtUsername`, `txtPassword`, `btnLogin` (submit, gửi về chính trang).
- Biến trang: `user: User` (tên đăng nhập và mật khẩu vừa nhập), không lưu session.
- `/LoginView.jsp`: `ClientDAO.checkLogin(user)`; khác `null` → session W `client`, → `ClientHomeView.jsp`; `null` → `LOGIN_FAILED`, hiện lại trang.
- `/nhan-vien/LoginView.jsp`: `StaffDAO.checkLogin(user)`; khác `null` → session W `staff`, → `/nhan-vien/StaffHomeView.jsp`; `null` → `LOGIN_FAILED`.
- Chặn đăng nhập sai (Deferred #23): 5 lần sai trong 15 phút theo tên đăng nhập + IP thì chặn 15 phút, ngưỡng lấy từ `LOGIN_RATE_*`; câu báo vẫn là `LOGIN_FAILED`. Đăng nhập thành công thì đổi session id.

#### `ClientHomeView.jsp` (ch.9 tr.59)

- Thành phần: tiêu đề "Trang chủ khách hàng"; "Họ và tên: …"; nút "Tìm và thuê truyện", nút "Phiếu mượn của tôi".
- Field: `lnkSearchBook` (→ `SearchBookView.jsp`), `lnkViewRentalBill` (→ `RentalBillListView.jsp`).
- Session R: `client` (lấy `fullName`). DAO: không. Dọn `listRentalBill` (C6).

#### `SearchBookView.jsp` (ch.9 tr.62–63)

- Thành phần: tiêu đề "Tìm truyện"; ô tìm (gợi ý "Nhập tên đầu truyện hoặc tên tác giả…") và nút "Tìm"; bảng đầu truyện (Mã đầu truyện, Tên đầu truyện là link, Tác giả, Thể loại, Giá thuê theo ngày, Số lượng hiện có; kèm bìa thật); khung "Truyện đã chọn" (Chọn, Tên đầu truyện, Số lượng, Thao tác: nút "Xoá"), là island `SelectedStack`; nút "Tạo phiếu mượn".
- Field: `txtKeyword`, `btnSearch`, `tblBook`, `lnkChooseBook` (nút trên dòng, value = id đầu truyện), `tblSelectedBook`, `chkSelectedBook` (ô "Chọn", value = id đầu truyện, C1), `lnkDeleteSelectedBook` (nút "Xoá" trên dòng, value = id đầu truyện), `btnCreateRentalBill`.
- Session R: `client`, `cart`, `rentalBill`, `listBook`.
- Mở trang khi session chưa có `cart` (vừa từ ClientHomeView): `CartDAO.getCart(client)` → W `cart`; tạo `RentalBill` mới gồm `client` → W `rentalBill`. Đã có `cart` thì không đọc lại DB.
- "Tìm": `BookDAO.searchBook(txtKeyword)` → W `listBook`; rỗng → `BOOK_NOT_FOUND`. Số lượng hiện có = số quyển đang sẵn sàng đi kèm đầu truyện.
- Bấm dòng đầu truyện: lấy đầu truyện từ `listBook` theo id → W `book`, → `BookDetailView.jsp`.
- "Xoá" trên dòng giỏ: lấy đầu truyện của dòng đó (từ `cart`) → W `book`, → `doDeleteSelectedBook.jsp`.
- Tích chọn rồi "Tạo phiếu mượn": với mỗi dòng giỏ của các đầu truyện đã tích, tạo một `RentedBook` (`selectedBook` = dòng giỏ, `bookCopy` = quyển của dòng, `rentalPrice` = giá thuê theo ngày hiện tại); danh sách này **thay** `rentalBill.listRentedBook` → W `rentalBill`, → `ConfirmRentalBillView.jsp`. Không tích dòng nào: C10.
- Khung "Truyện đã chọn" gộp các dòng cùng đầu truyện thành một dòng, "Số lượng" = số dòng được gộp.

#### `BookDetailView.jsp` (ch.9 tr.63–64)

- Thành phần: tiêu đề "Chi tiết đầu truyện"; Mã đầu truyện, Tên đầu truyện, Tác giả, Nhà xuất bản, Năm xuất bản, Thể loại, Giá thuê theo ngày, Số quyển đang có, Mô tả (kèm bìa thật); ô "Số lượng muốn thuê"; nút "Thêm vào truyện đã chọn", nút "Quay lại".
- Field: `txtQuantity`, `btnAddToSelectedList` (submit, `formaction="doAddSelectedBook.jsp"`), `lnkBack` (← `SearchBookView.jsp`).
- Session R: `client`, `book`. DAO: không. Số quyển đang có = số quyển đang sẵn sàng của `book`.
- Hiện `QUANTITY_EXCEEDED` do doAddSelectedBook đặt. `publishYear` hay `description` NULL: C11.

#### `doAddSelectedBook.jsp` (ch.9 tr.64)

- Field đọc: `txtQuantity`. Session R: `book`, `cart`. Biến trang: `selectedBook: SelectedBook`.
- Số lượng vượt quá số quyển đang sẵn sàng của `book` mà chưa có trong giỏ → `QUANTITY_EXCEEDED` (N = số quyển đó), ← `BookDetailView.jsp`. Số lượng không phải số nguyên dương: C10.
- Hợp lệ: lấy từng quyển theo mục 6.2, mỗi quyển một `SelectedBook` mới, đưa vào `cart`, gọi `CartDAO.updateCart(cart)` **một lần** → W `cart`, → `SearchBookView.jsp`.

#### `doDeleteSelectedBook.jsp` (ch.9 tr.63)

- Session R: `book`, `cart`.
- Bỏ mọi dòng của đầu truyện `book` khỏi `cart`, `CartDAO.updateCart(cart)` → W `cart`, → `SearchBookView.jsp`.

#### `ConfirmRentalBillView.jsp` (ch.9 tr.65–66)

- Thành phần: tiêu đề "Xác nhận phiếu mượn"; khung "PHIẾU MƯỢN": Họ và tên, Số điện thoại, Số CCCD, Email; "Danh sách các đầu truyện đã chọn:" (Tên đầu truyện, Tác giả, Giá thuê theo ngày, Số lượng, Tổng tiền; gộp theo đầu truyện); ô "Số ngày thuê dự kiến", "Ngày giờ dự kiến đến nhận", "Ghi chú"; Tổng số quyển, Giảm giá (luôn 0đ, giảm giá do nhân viên nhập tại quầy), Tổng tiền thuê; nút "Xác nhận", nút "Quay lại".
- Field: `tblRentedBook`, `txtExpectedDays`, `txtExpectedPickupAt`, `txtNote`, `btnConfirm` (submit, `formaction="doAddRentalBill.jsp"`), `lnkBack` (← `SearchBookView.jsp`).
- Session R: `rentalBill`. DAO: không.
- Nhập số ngày thuê dự kiến: trang gửi về chính nó, đọc `txtExpectedDays`, tính và hiện lại tổng tiền (ch.10); không ghi session (C3).
- Hiện `EXPECTED_DAYS_INVALID`, `PICKUP_TIME_INVALID`, `NOT_ENOUGH_COPIES` do doAddRentalBill đặt, giữ nguyên các ô đã nhập.

#### `doAddRentalBill.jsp` (ch.9 tr.66)

- Field đọc: `txtExpectedDays`, `txtExpectedPickupAt`, `txtNote`. Session R: `rentalBill`, `cart`.
- `txtExpectedDays` < 1 hoặc không phải số nguyên → `EXPECTED_DAYS_INVALID`; `txtExpectedPickupAt` không sau thời điểm hiện tại → `PICKUP_TIME_INVALID`; cả hai ← `ConfirmRentalBillView.jsp`.
- Gán `expectedDays`, `expectedPickupAt`, `note`, `status = "Chờ nhận"` cho `rentalBill`, gọi `RentalBillDAO.addRentalBill(rentalBill)` (K1). `false` → `NOT_ENOUGH_COPIES`, ← `ConfirmRentalBillView.jsp`. `true` → bỏ `cart` và `rentalBill` khỏi session, `RENTAL_BILL_CREATED`, → `ClientHomeView.jsp`.

#### `RentalBillListView.jsp` (ch.9 tr.66–67)

- Thành phần: tiêu đề "Danh sách phiếu mượn"; bảng (Mã phiếu mượn, Ngày giờ tạo phiếu, Ngày giờ dự kiến đến nhận, Số quyển, Tổng tiền thuê, Trạng thái, Thao tác: "Xem chi tiết", "Huỷ phiếu"); hộp "Xác nhận huỷ phiếu mượn" (câu `CANCEL_CONFIRM`, ô "Lí do huỷ", nút "Xác nhận", nút "Huỷ").
- Nút "Huỷ phiếu" chỉ có ở phiếu "Chờ nhận" (ch.2 2.2 bước 24.1). Thứ tự dòng: phiếu mới nhất trước (ch.2 bước 24.1: PM0125, PM0117, PM0110).
- Field: `tblRentalBill`, `lnkViewDetail` (nút trên dòng, value = id phiếu), `lnkCancelRentalBill` (nút trên dòng, value = id phiếu), `txtCancelReason`; nút trong hộp: C1.
- Session R: `client`, `listRentalBill`. Mở khi chưa có `listRentalBill`: `RentalBillDAO.getRentalBillList(client)` → W `listRentalBill`. Quay lại từ RentalBillDetailView hoặc doCancelRentalBill: hiện `listRentalBill` trong session, không đọc lại DB.
- "Xem chi tiết": lấy phiếu từ `listRentalBill` theo id → W `rentalBill`, → `RentalBillDetailView.jsp`.
- "Huỷ phiếu": lấy phiếu theo id → W `rentalBill`, hiện hộp xác nhận. "Xác nhận" gửi `txtCancelReason` → `doCancelRentalBill.jsp`; "Huỷ" đóng hộp, hiện lại trang.

#### `RentalBillDetailView.jsp` (ch.9 tr.68–69)

- Thành phần: tiêu đề "Chi tiết phiếu mượn"; khung "PHIẾU MƯỢN PMxxxx": cột trái Tên khách hàng, Ngày giờ tạo phiếu, Ngày giờ dự kiến đến nhận, Số ngày thuê dự kiến, Trạng thái; cột phải Ngày mượn, Ngày hẹn trả, Nhân viên xử lí, Ghi chú, Lí do huỷ; "Các quyển truyện được giữ chỗ:" (Mã vạch, Tên đầu truyện, Giá thuê theo ngày, Số lượng, Tình trạng khi giao, Tổng tiền); "Các khoản đặt cọc:" (STT, Loại tài sản, Giá trị); Tổng số quyển, Giảm giá, Tổng tiền thuê; nút "Quay lại".
- Field: `tblRentedBook`, `tblRentalCollateral`, `lnkBack` (← `RentalBillListView.jsp`).
- Session R: `rentalBill`. DAO: không.
- Dòng cùng đầu truyện gộp một dòng; "Mã vạch" liệt kê mã của các quyển, "Số lượng" = số quyển.
- Luôn hiện Ghi chú và Giảm giá. Phiếu "Đang cho thuê" hiện thêm Ngày mượn, Ngày hẹn trả, Nhân viên xử lí, Tình trạng khi giao và các khoản đặt cọc. Phiếu "Đã huỷ" hiện thêm Lí do huỷ.

#### `doCancelRentalBill.jsp` (ch.9 tr.67, tr.83–84; Deferred #13)

- Một file ở gốc web, khách và nhân viên cùng gọi.
- Field đọc: `txtCancelReason`. Session R: `rentalBill`.
- Gán `cancelReason`, `status = "Đã huỷ"`, gọi `RentalBillDAO.updateRentalBill(rentalBill)`. Các dòng phiếu không đổi; quyển của phiếu tự trở lại sẵn sàng.
- `true` → W `rentalBill` (và phần tử cùng id trong `listRentalBill`, mục 7), `CANCEL_SUCCESS`; khách ← `RentalBillListView.jsp`, nhân viên ← `/nhan-vien/SearchRentalBillView.jsp`.
- `false` → D9 (mục 6.3).
- Biết ai gọi: C8.

#### `StaffHomeView.jsp` (ch.9 tr.72)

- Thành phần: tiêu đề "Trang chủ nhân viên"; "Họ và tên: …", "Chức vụ: …"; nút "Xử lí phiếu mượn".
- Field: `lnkProcessRentalBill` (→ `SearchRentalBillView.jsp`).
- Session R: `staff`. DAO: không. Lối vào trang quản trị cho "Quản lí": C12.

#### `SearchRentalBillView.jsp` (ch.9 tr.72–73)

- Thành phần: tiêu đề "Tìm phiếu mượn"; ô tìm (gợi ý "Nhập mã phiếu mượn, tên khách hàng hoặc số CCCD…") và nút "Tìm"; bảng (Mã phiếu mượn là link, Tên khách hàng, Số điện thoại, Ngày giờ dự kiến đến nhận, Số quyển, Trạng thái).
- Field: `txtKeyword`, `btnSearch`, `tblRentalBill`, `lnkChooseRentalBill` (nút trên dòng, value = id phiếu).
- Session R: `staff`, `listRentalBill`. "Tìm": `RentalBillDAO.searchRentalBill(txtKeyword)` → W `listRentalBill`; rỗng → `RENTAL_BILL_NOT_FOUND`.
- Bấm dòng: lấy phiếu từ `listRentalBill` theo id. "Đã huỷ" → `RENTAL_BILL_CANCELLED`; "Đang cho thuê" → `RENTAL_BILL_ALREADY_PROCESSED`; cả hai giữ nguyên trang. "Chờ nhận" → W `rentalBill`, → `ProcessRentalBillView.jsp` (giá trị mặc định của ngày mượn, ngày hẹn trả: C7).

#### `ProcessRentalBillView.jsp` (ch.9 tr.73–75)

- Thành phần: tiêu đề "Xử lí phiếu mượn"; khung "PHIẾU MƯỢN PMxxxx": Họ và tên, Số CCCD, Số điện thoại; "Danh sách các quyển truyện khách hàng muốn thuê:" (Mã vạch, Tên đầu truyện, Giá thuê theo ngày, Số lượng, Tình trạng khi giao, Tổng tiền, Nhận, Thao tác: "Thêm tình trạng"); nút "Chỉnh sửa danh sách truyện"; ô "Ngày mượn", "Ngày hẹn trả"; "Các khoản đặt cọc:" (STT, Loại tài sản, Giá trị, Ghi chú, Thao tác: "Xoá"); nút "Thêm khoản cọc"; ô "Giảm giá", "Ghi chú"; Tổng số quyển thuê, Tổng tiền thuê; nút "Xác nhận và in phiếu mượn", nút "Huỷ phiếu mượn"; hộp "Xác nhận huỷ phiếu mượn". Phần bảng quyển và khoản cọc là island `ProcessBillDesk`.
- Bảng quyển gộp các quyển cùng đầu truyện thành một dòng; trong dòng đó mã vạch, tình trạng khi giao, ô "Nhận" và nút "Thêm tình trạng" tách theo từng quyển. Khi mở, mọi quyển được tích sẵn ô "Nhận" (ch.2 2.3 bước 10).
- Field: `tblRentedBook`, `chkReceived` (ô "Nhận", value = mã vạch, C1), `lnkAddCondition` (nút trên quyển, value = mã vạch), `lnkEditRentedBookList` (→ `EditRentedBookListView.jsp`), `txtBorrowDate`, `txtDueDate`, `tblRentalCollateral`, `lnkDeleteRentalCollateral` (nút trên dòng, value = STT), `lnkAddRentalCollateral` (→ `AddRentalCollateralView.jsp`), `txtDiscount`, `txtNote`, `btnConfirm` (submit, `formaction="doUpdateRentalBill.jsp"`), `btnCancel` (mở hộp huỷ), `txtCancelReason` (trong hộp, "Xác nhận" → `doCancelRentalBill.jsp`).
- Session R: `staff`, `rentalBill`. DAO: không.
- Bỏ tích hoặc tích lại "Nhận", xoá một khoản cọc, sửa ngày hẹn trả, nhập giảm giá: trang gửi về chính nó, cập nhật `rentalBill` → W `rentalBill`, tính lại tổng số quyển thuê và tổng tiền thuê (C3). Ngày hẹn trả không sau ngày mượn → `DUE_DATE_INVALID`, giữ ngày hẹn trả cũ trong session.
- "Thêm tình trạng": lấy quyển từ `rentalBill` theo mã vạch, lưu **bản sao** → W `rentedBook`, → `AddConditionView.jsp`.
- Hiện thông báo của doUpdateRentalBill (`NO_COPY_RECEIVED`, `CONDITION_MISSING`, `COLLATERAL_MISSING`, `DUE_DATE_INVALID`, `NOT_ENOUGH_COPIES`).
- Tổng tiền thuê = tổng tiền các quyển được tích "Nhận" trừ giảm giá (mục 13).

#### `EditRentedBookListView.jsp` (ch.9 tr.75)

- Thành phần: tiêu đề "Chỉnh sửa danh sách truyện"; bảng (Mã vạch, Tên đầu truyện, Giá thuê theo ngày, Số lượng, Tình trạng khi giao, Tổng tiền, Thao tác: "Xoá"), mỗi quyển một dòng (ch.2 2.3 bước 11.2); nút "Thêm truyện"; nút "Lưu", nút "Quay lại".
- Field: `tblRentedBook`, `lnkDeleteRentedBook` (nút trên dòng, value = mã vạch), `lnkAddBook` (→ `AddRentedBookView.jsp`), `btnSave` (submit, `formaction="doUpdateRentedBookList.jsp"`), `lnkBack` (← `ProcessRentalBillView.jsp`, không lưu).
- Session R: `rentalBill`, `listRentedBook`. Mở từ ProcessRentalBillView (chưa có `listRentedBook`): chép danh sách quyển của `rentalBill` → W `listRentedBook`. Quay lại từ AddRentedBookView hoặc doUpdateRentedBookList: hiện `listRentedBook`.
- "Xoá": gửi về chính trang, bỏ dòng khỏi `listRentedBook` → W `listRentedBook`.
- Hiện `NOT_ENOUGH_COPIES` do doUpdateRentedBookList đặt.

#### `AddRentedBookView.jsp` (ch.9 tr.76)

- Thành phần: tiêu đề "Thêm truyện vào phiếu mượn"; ô tìm (gợi ý "Nhập tên đầu truyện hoặc tên tác giả…") và nút "Tìm"; bảng đầu truyện (Mã đầu truyện, Tên đầu truyện là link, Tác giả, Thể loại, Giá thuê theo ngày, Số lượng hiện có); ô "Số lượng"; nút "Thêm vào phiếu mượn", nút "Quay lại".
- Field: `txtKeyword`, `btnSearch`, `tblBook`, `lnkChooseBook` (chọn một dòng đầu truyện; gửi cùng form, value = id đầu truyện, C1), `txtQuantity`, `btnAddToRentalBill` (submit, gửi về chính trang), `lnkBack` (← `EditRentedBookListView.jsp`).
- Session R: `listBook`, `listRentedBook`. "Tìm": `BookDAO.searchBook(txtKeyword)` → W `listBook`; rỗng → `BOOK_NOT_FOUND`.
- "Thêm vào phiếu mượn": số lượng vượt quá số quyển đang sẵn sàng của đầu truyện mà chưa có trong `listRentedBook` → `QUANTITY_EXCEEDED` (N = số quyển đó), hiện lại trang. Hợp lệ: lấy quyển theo mục 6.2 từ đầu truyện trong `listBook`, mỗi quyển một `RentedBook` mới (`rentalPrice` = giá hiện tại, `selectedBook = null`) → W `listRentedBook`, → `EditRentedBookListView.jsp`.

#### `doUpdateRentedBookList.jsp` (ch.9 tr.77)

- Session R: `rentalBill`, `listRentedBook`.
- Gọi `RentalBillDAO.updateRentalBill` với phiếu mang danh sách quyển mới `listRentedBook` (K1 cho quyển mới thêm).
- `true` → đặt `listRentedBook` làm danh sách quyển của `rentalBill` → W `rentalBill`, bỏ `listRentedBook`, → `ProcessRentalBillView.jsp`.
- `false` và phiếu vẫn "Chờ nhận" → `rentalBill` giữ danh sách cũ, `NOT_ENOUGH_COPIES`, ← `EditRentedBookListView.jsp`. Trạng thái đã đổi → D9 (mục 6.3).

#### `AddConditionView.jsp` (ch.9 tr.77–78)

- Thành phần: tiêu đề "Thêm tình trạng truyện"; "Mã vạch: …", "Tên đầu truyện: …"; ô tìm (gợi ý "Nhập tên lỗi…") và nút "Tìm"; bảng loại lỗi (Tên lỗi là link, Mô tả); nút "Thêm lỗi mới"; "Các lỗi đã ghi nhận" (Tên lỗi, Mô tả, Ghi chú là ô nhập, Thao tác: "Xoá"); ô "Ghi chú tình trạng"; nút "Lưu tình trạng", nút "Quay lại".
- Field: `txtKeyword`, `btnSearch`, `tblDamage`, `lnkChooseDamage` (nút trên dòng, value = id loại lỗi), `lnkAddDamage` (→ `AddDamageView.jsp`), `tblRentedDamage`, `txtDamageNote` (ô ghi chú mỗi dòng, C1), `lnkDeleteRentedDamage` (nút trên dòng, value = id loại lỗi), `txtConditionNote`, `btnSave` (submit, gửi về chính trang), `lnkBack`.
- Session R: `rentedBook` (bản sao do ProcessRentalBillView lưu; mọi thay đổi chỉ làm trên bản sao), `listDamage`.
- "Tìm": `DamageDAO.searchDamage(txtKeyword)` → W `listDamage`; rỗng → `DAMAGE_NOT_FOUND`.
- Bấm loại lỗi: thêm vào "Các lỗi đã ghi nhận" của `rentedBook`; đã có → `DAMAGE_ALREADY_RECORDED`. "Xoá": bỏ lỗi khỏi bảng. Cả hai W `rentedBook`. Ghi chú đang nhập trên các dòng được giữ qua mọi lần gửi về (C1).
- "Lưu tình trạng": lưu các ghi chú (`txtDamageNote`, `txtConditionNote`) vào `rentedBook`, thay quyển cùng mã vạch trong `rentalBill` bằng `rentedBook` → W `rentalBill`, bỏ `rentedBook`, ← `ProcessRentalBillView.jsp`. Tình trạng được ghi vào DB khi xác nhận phiếu.
- "Quay lại": bỏ bản sao `rentedBook`, ← `ProcessRentalBillView.jsp`, không lưu.

#### `AddDamageView.jsp` (ch.9 tr.78–79)

- Thành phần: tiêu đề "Thêm lỗi mới"; ô "Tên lỗi", "Mô tả"; nút "Lưu", nút "Quay lại".
- Field: `txtName`, `txtDescription`, `btnSave` (submit, `formaction="doAddDamage.jsp"`), `lnkBack` (← `AddConditionView.jsp`).
- Session: không đọc (giữ nguyên `rentedBook`). DAO: không. Hiện `DAMAGE_NAME_REQUIRED`, `DAMAGE_EXISTS`.

#### `doAddDamage.jsp` (ch.9 tr.79)

- Field đọc: `txtName`, `txtDescription`. Biến trang: `damage: Damage`. Session R: `rentedBook`.
- Tên lỗi trống (sau khi bỏ khoảng trắng hai đầu) → `DAMAGE_NAME_REQUIRED`, ← `AddDamageView.jsp`.
- `DamageDAO.addDamage(damage)` `false` → `DAMAGE_EXISTS`, ← `AddDamageView.jsp`; `true` → thêm loại lỗi vừa lưu vào "Các lỗi đã ghi nhận" của `rentedBook` → W `rentedBook`, ← `AddConditionView.jsp`.

#### `AddRentalCollateralView.jsp` (ch.9 tr.80–81)

- Thành phần: tiêu đề "Thêm khoản đặt cọc"; ô tìm (gợi ý "Nhập tên loại tài sản thế chấp…") và nút "Tìm"; bảng loại tài sản (Tên loại tài sản là link, Mô tả); nút "Thêm loại tài sản mới"; "Các khoản cọc" (STT, Loại tài sản, Giá trị là ô nhập, Ghi chú là ô nhập, Thao tác: "Xoá"), là island `CollateralDrawer`; nút "Lưu", nút "Quay lại".
- Field: `txtKeyword`, `btnSearch`, `tblCollateral`, `lnkChooseCollateral` (nút trên dòng, value = id loại tài sản), `lnkAddCollateral` (→ `AddCollateralView.jsp`), `tblRentalCollateral`, `txtCollateralValue` và `txtCollateralNote` (ô mỗi dòng, theo thứ tự STT, C1), `lnkDeleteRentalCollateral` (nút trên dòng, value = STT), `btnSave` (submit, gửi về chính trang), `lnkBack`.
- Session R: `rentalBill`, `listCollateral`, `listRentalCollateral`.
- "Tìm": `CollateralDAO.searchCollateral(txtKeyword)` → W `listCollateral`; rỗng → `COLLATERAL_NOT_FOUND`.
- Bấm loại tài sản: thêm một dòng `RentalCollateral` vào `listRentalCollateral` (lần đầu thì tạo danh sách) → W `listRentalCollateral`. "Xoá": bỏ dòng. Giá trị và ghi chú đang nhập được giữ qua mọi lần gửi về (C1).
- "Lưu": còn dòng chưa có giá trị → `COLLATERAL_VALUE_REQUIRED`, hiện lại trang; đủ → thêm các khoản cọc trong `listRentalCollateral` vào `rentalBill` → W `rentalBill`, ← `ProcessRentalBillView.jsp`.
- "Quay lại": ← `ProcessRentalBillView.jsp`, không thêm khoản cọc nào.

#### `AddCollateralView.jsp` (ch.9 tr.81)

- Thành phần: tiêu đề "Thêm loại tài sản mới"; ô "Tên loại tài sản", "Mô tả"; nút "Lưu", nút "Quay lại".
- Field: `txtName`, `txtDescription`, `btnSave` (submit, `formaction="doAddCollateral.jsp"`), `lnkBack` (← `AddRentalCollateralView.jsp`).
- Session: không đọc. DAO: không. Hiện `COLLATERAL_NAME_REQUIRED`, `COLLATERAL_EXISTS`.

#### `doAddCollateral.jsp` (ch.9 tr.81–82)

- Field đọc: `txtName`, `txtDescription`. Biến trang: `collateral: Collateral`. Session R: `listRentalCollateral`.
- Tên trống → `COLLATERAL_NAME_REQUIRED`, ← `AddCollateralView.jsp`.
- `CollateralDAO.addCollateral(collateral)` `false` → `COLLATERAL_EXISTS`, ← `AddCollateralView.jsp`; `true` → thêm một dòng với loại tài sản vừa lưu vào `listRentalCollateral` (tạo nếu chưa có) → W `listRentalCollateral`, ← `AddRentalCollateralView.jsp`.

#### `doUpdateRentalBill.jsp` (ch.9 tr.82; ch.10)

- Field đọc: `chkReceived` (các quyển được tích "Nhận"), `txtNote`. Session R: `staff`, `rentalBill`.
- Kiểm bốn điều kiện theo thứ tự (mục 10.2); điều kiện đầu tiên sai → câu tương ứng, ← `ProcessRentalBillView.jsp`.
- Hợp lệ: bỏ các quyển không tích "Nhận" khỏi `rentalBill`, gán `note`, `staff`, `status = "Đang cho thuê"` → gọi `RentalBillDAO.updateRentalBill(rentalBill)`. `true` → W `rentalBill`, → `PrintRentalBillView.jsp`. `false` → D9 (mục 6.3).

#### `PrintRentalBillView.jsp` (ch.9 tr.83)

- Thành phần: tiêu đề "Xác nhận phiếu mượn"; khung "PHIẾU MƯỢN PMxxxx": cột trái Mã phiếu mượn, Tên khách hàng, Số điện thoại, Số CCCD; cột phải Ngày mượn, Ngày hẹn trả, Nhân viên xử lí, Ghi chú; "Các quyển truyện đã nhận:" (Mã vạch, Tên đầu truyện, Giá thuê theo ngày, Số lượng, Tình trạng khi giao, Tổng tiền); "Các khoản đặt cọc:" (STT, Loại tài sản, Giá trị, Ghi chú); Tổng số quyển thuê, Giảm giá, Tổng tiền thuê; nút "In phiếu".
- Field: `tblRentedBook`, `tblRentalCollateral`, `btnPrint`.
- Session R: `rentalBill`. DAO: không. Bảng quyển gộp theo đầu truyện; mã vạch và tình trạng khi giao tách theo từng quyển.
- "In phiếu": in phiếu (CSS in thật, `@page { size: A5 }`) rồi → `StaffHomeView.jsp` (cách nối in với chuyển trang: C2).

#### Trang quản trị D6 (Deferred #14; ngoài báo cáo)

Chỉ Staff có `position = "Quản lí"`. Tên trang, hàm DAO, thành phần và field theo bảng dưới, đã chốt ở C12 (mục 14).

| Trang | Đề xuất |
|---|---|
| `ManageBookView.jsp` | Ô tìm `txtKeyword`, `btnSearch` → `BookDAO.searchBook` → W `listBook`; bảng đầu truyện; nút "Thêm đầu truyện" (→ `AddBookView.jsp`); nút "Sửa" trên dòng (`lnkEditBook`, value = id) → W `book`, → `EditBookView.jsp` |
| `AddBookView.jsp` | `txtName`, `txtAuthor`, `txtPublisher`, `txtPublishYear`, `txtCategory`, `txtDescription`, `txtRentalPrice`, `txtCopyCount` (số quyển tạo kèm), `btnSave` → `doAddBook.jsp`, `lnkBack` |
| `doAddBook.jsp` | Kiểm ô bắt buộc; tạo `Book` cùng `listBookCopy` (barcode theo D8) → `BookDAO.addBook(book)` → ← `ManageBookView.jsp` |
| `EditBookView.jsp` | Như AddBookView, điền từ `book`; `txtCopyCount` là số quyển thêm mới |
| `doUpdateBook.jsp` | Gán giá trị vào `book`, thêm quyển mới → `BookDAO.updateBook(book)` → ← `ManageBookView.jsp` |

## 10. Thông báo nguyên văn

### 10.1 28 câu

Mọi câu là hằng số trong một lớp duy nhất `vn.tiemtruyen.util.Messages` (tên hằng đúng cột trái), có `MessagesTest` so từng kí tự với bảng này. Không sửa, không viết lại, không thêm câu mới khi chưa có chủ dự án duyệt.

| Hằng số | Câu |
|---|---|
| REGISTER_SUCCESS | Đăng kí tài khoản thành công! |
| REGISTER_DUPLICATE | Tên đăng nhập, số CCCD, số điện thoại hoặc email đã được sử dụng, vui lòng kiểm tra lại. |
| REGISTER_INVALID | Thông tin không hợp lệ, vui lòng kiểm tra lại. |
| REGISTER_PASSWORD_MISMATCH | Mật khẩu nhập lại không khớp, vui lòng nhập lại. |
| LOGIN_FAILED | Đăng nhập thất bại, vui lòng thử lại. |
| BOOK_NOT_FOUND | Không tìm thấy thông tin phù hợp. |
| QUANTITY_EXCEEDED | Số lượng vượt quá số quyển hiện có (hiện còn N quyển). |
| EXPECTED_DAYS_INVALID | Số ngày thuê phải lớn hơn hoặc bằng 1. |
| PICKUP_TIME_INVALID | Ngày giờ đến nhận phải sau thời điểm hiện tại. |
| NOT_ENOUGH_COPIES | Không còn đủ quyển truyện, vui lòng chọn lại. |
| RENTAL_BILL_CREATED | Tạo phiếu mượn thành công! Vui lòng đến quầy vào ngày giờ đã hẹn để đặt cọc và nhận truyện. |
| CANCEL_CONFIRM | Bạn có chắc chắn muốn huỷ phiếu mượn này? |
| CANCEL_SUCCESS | Huỷ phiếu mượn thành công! |
| RENTAL_BILL_NOT_FOUND | Không tìm thấy phiếu mượn phù hợp. |
| RENTAL_BILL_CANCELLED | Phiếu mượn đã bị huỷ, không thể xử lí. |
| RENTAL_BILL_ALREADY_PROCESSED | Phiếu mượn này đã được xử lí và đã giao truyện. |
| DUE_DATE_INVALID | Ngày hẹn trả phải sau ngày mượn. |
| NO_COPY_RECEIVED | Chưa chọn quyển truyện nào để giao cho khách hàng. |
| CONDITION_MISSING | Vui lòng ghi nhận tình trạng cho tất cả các quyển truyện được giao. |
| COLLATERAL_MISSING | Phiếu mượn chưa có khoản đặt cọc, vui lòng thêm khoản đặt cọc. |
| DAMAGE_NOT_FOUND | Không tìm thấy loại lỗi phù hợp. |
| DAMAGE_ALREADY_RECORDED | Lỗi này đã được ghi nhận cho quyển truyện. |
| DAMAGE_NAME_REQUIRED | Vui lòng nhập tên lỗi. |
| DAMAGE_EXISTS | Loại lỗi đã tồn tại. |
| COLLATERAL_NOT_FOUND | Không tìm thấy loại tài sản phù hợp. |
| COLLATERAL_VALUE_REQUIRED | Vui lòng nhập giá trị cho tất cả các khoản cọc. |
| COLLATERAL_NAME_REQUIRED | Vui lòng nhập tên loại tài sản. |
| COLLATERAL_EXISTS | Loại tài sản đã tồn tại. |

Ghi chú:
- `QUANTITY_EXCEEDED` chứa chữ `N` theo đúng báo cáo. Lúc chạy, trang thay **đúng một** kí tự `N` trong "(hiện còn N quyển)" bằng số quyển đang sẵn sàng chưa có trong giỏ (doAddSelectedBook) hoặc chưa có trong `listRentedBook` (AddRentedBookView), viết bằng chữ số, không đệm (ví dụ "(hiện còn 4 quyển)"). Hằng số trong `Messages` giữ nguyên chữ `N`; dùng một hàm định dạng riêng, không ghép chuỗi tay ở trang.
- `CANCEL_CONFIRM` là câu hỏi trong hộp xác nhận huỷ (kèm ô "Lí do huỷ", nút "Xác nhận", "Huỷ"), không phải thông báo kết quả.
- Đăng nhập bị chặn vì sai nhiều lần vẫn dùng `LOGIN_FAILED` (Deferred #23).

### 10.2 Bốn điều kiện xác nhận phiếu (ch.4, 5, 9, 10)

doUpdateRentalBill kiểm đủ bốn, kể cả điều kiện thứ tư dù luồng thường không chạm (ProcessRentalBillView đã chặn khi sửa ngày):

| Thứ tự | Điều kiện | Sai thì |
|---|---|---|
| 1 | Có ít nhất một quyển được tích "Nhận" | `NO_COPY_RECEIVED` |
| 2 | Mọi quyển được tích đã có tình trạng khi giao | `CONDITION_MISSING` |
| 3 | Phiếu đã có ít nhất một khoản đặt cọc | `COLLATERAL_MISSING` |
| 4 | Ngày hẹn trả sau ngày mượn | `DUE_DATE_INVALID` |

### 10.3 Câu ngoài báo cáo (chủ dự án duyệt 11/11/2026)

Báo cáo không có câu cho các trường hợp dưới đây; chủ dự án duyệt thêm (phiên cook phase 6 và phase 7, cùng ngày). Cùng luật với §10.1: hằng của `Messages`, `MessagesTest` so từng kí tự, không sửa khi chưa duyệt. Bảng tách riêng để §10.1 giữ đúng 28 câu của báo cáo. Hai câu đề xuất của phiên phase 6 trùng ý với câu đã duyệt ở phiên phase 7 nên dùng chung (`BOOK_NOT_CHOSEN`, `QUANTITY_INVALID`).

| Hằng số (ngoài báo cáo) | Câu | Dùng ở |
|---|---|---|
| DISCOUNT_INVALID | Giảm giá không hợp lệ, vui lòng nhập lại. | ProcessRentalBillView (`txtDiscount` trống, không phải số, âm, lớn hơn tổng) |
| QUANTITY_INVALID | Số lượng phải là số nguyên lớn hơn hoặc bằng 1. | doAddSelectedBook, AddRentedBookView (`txtQuantity` không phải số nguyên ≥ 1) |
| BOOK_NOT_CHOSEN | Vui lòng chọn đầu truyện. | SearchBookView ("Tạo phiếu mượn" khi không tích dòng nào), AddRentedBookView (chưa chọn đầu truyện) |
| INPUT_TOO_LONG | Nội dung nhập quá dài, vui lòng rút gọn. | mọi ô ghi chú, lí do huỷ, giá trị cọc, từ khoá vượt độ dài cột (§2) hoặc 100 kí tự với từ khoá |
| RENTAL_BILL_CHANGED | Phiếu mượn đang mở đã thay đổi, vui lòng chọn lại phiếu. | trang M3 khi phiếu trong session không còn khớp DB (phase 7) |
| SESSION_EXPIRED | Phiên làm việc đã hết hạn, vui lòng đăng nhập lại. | LoginView (cả hai) khi bị chuyển về vì session hết hạn (C16) |
| CANCEL_REASON_REQUIRED | Vui lòng nhập lí do huỷ. | doCancelRentalBill khi `txtCancelReason` trống (C17) |
| EXPECTED_DAYS_TOO_LONG | Số ngày thuê tối đa là 30 ngày. | doAddRentalBill khi `txtExpectedDays` > `RentalBill.MAX_EXPECTED_DAYS` (C15) |
| SELECTED_BOOKS_CHANGED | Truyện đã chọn đã thay đổi, vui lòng kiểm tra lại. | doAddRentalBill khi `addRentalBill` trả `false` vì dòng giỏ của phiếu đã bị xoá hoặc đã thuộc phiếu chưa huỷ khác (C21) |

## 11. React island (cách B)

Luật chung (brainstorm §3, `contract.md` §5):
- JSP render `<form method="post">` thật có `<t:csrf/>` và mọi field đúng tên mục 9. Island mount vào `<div data-island="<Tên>" data-props="<id>">` nằm **trong** form; props đọc từ `<script type="application/json" id="<id>">` do `JsonUtil.toScriptJson()` sinh (escape `<`, `>`, `&`, U+2028, U+2029).
- Island chỉ đổi giá trị input thật có `name` đúng mục 9 rồi gọi `form.requestSubmit(submitter)`. Không `fetch`, không `XMLHttpRequest`, không endpoint JSON, không tự sửa session.
- Không có JS hoặc island hỏng thì bảng, ô tích, nút HTML do JSP render vẫn gửi được.
- Island được hiện số tạm (tổng tiền) ngay khi người dùng đổi giá trị, nhưng giá trị trong session chỉ đổi qua lần gửi về trang.
- Props: field camelCase; giá trị có thể trống ghi rõ `| null`, không dùng `?:`; tiền là `number` (đồng, chưa định dạng); ngày là chuỗi ISO `yyyy-MM-dd`; island tự định dạng theo mục 13.
- Gắn island (chốt 11/11/2026 theo lane 7C, `plans/reports/phase-07-islands-m3-261111-1057.md` §4; áp cho cả bốn island): mọi input, nút có `name` nằm **ngoài** div `data-island` (React xoá nội dung div khi gắn). Bản HTML không JS mà island thay thế bọc trong phần tử `data-island-fallback="<Tên>"`: island gắn thì đặt `hidden` (input ẩn vẫn trong form nên vẫn gửi), gỡ ra hay hỏng thì hiện lại; phần tử fallback **không** chứa div `data-island`. Phần tử JSP island không điều khiển nhưng phải đứng giữa phần island vẽ (giữ thứ tự §9.2) mang `data-island-slot="<Tên>:<chỗ>"`; island chuyển nó vào đúng chỗ, gỡ ra thì trả về.
- `data-submit-on-change` (C3) của loader chỉ gửi form khi sự kiện do người dùng tạo (`event.isTrusted`); sự kiện island tự phát (`isTrusted === false`) bị bỏ qua, để island đã tự `requestSubmit` thì form không gửi hai lần.

### 11.1 SelectedStack

Trang `SearchBookView.jsp`, khung "Truyện đã chọn" (chồng truyện buộc dây). Props id: `selected-stack-props`.

```ts
interface SelectedStackProps {
  rows: SelectedStackRow[]; // gộp theo đầu truyện, thứ tự như trong cart
  focusBookId: number | null; // đầu truyện vừa thao tác (lấy từ `book` trong session), để đặt lại focus; không có thì null
}

interface SelectedStackRow {
  bookId: number;
  bookCode: string; // "DT001"
  name: string;
  author: string;
  quantity: number; // số dòng giỏ của đầu truyện này
  checked: boolean; // ô "Chọn" đang tích (mặc định false)
}
```

Input island được đổi: `chkSelectedBook` (checkbox, value = `bookId`, thuộc tính `checked`). Nút island bấm: `lnkDeleteSelectedBook` (value = `bookId`), `btnCreateRentalBill`.

### 11.2 ProcessBillDesk

Trang `ProcessRentalBillView.jsp`, bàn quầy: bảng quyển, tem tình trạng, khoản cọc, tổng tạm. Props id: `process-bill-props`.

```ts
interface ProcessBillDeskProps {
  rentalBillCode: string; // "PM0125"
  rows: BillDeskBookRow[]; // gộp theo đầu truyện
  borrowDate: string | null; // ISO yyyy-MM-dd
  dueDate: string | null; // ISO yyyy-MM-dd
  expectedDays: number;
  discount: number; // đồng
  note: string | null;
  collaterals: BillDeskCollateralRow[];
}

interface BillDeskBookRow {
  bookId: number;
  name: string;
  rentalPrice: number; // giá chốt của dòng phiếu, đồng/ngày
  copies: BillDeskCopy[];
}

interface BillDeskCopy {
  barcode: string; // "DT001-03"
  received: boolean; // ô "Nhận" đang tích
  conditionText: string | null; // "Rách bìa, Vết bẩn, viết vẽ" | "Không có lỗi"; null = "(chưa ghi nhận)"
}

interface BillDeskCollateralRow {
  index: number; // STT, từ 1
  collateralName: string;
  value: string;
  note: string | null;
}
```

Input island được đổi: `chkReceived` (checkbox, value = `barcode`), `txtDueDate`, `txtDiscount`; sau mỗi lần đổi gọi `form.requestSubmit()` không kèm submitter (gửi về chính trang để cập nhật `rentalBill`). Nút island bấm: `lnkAddCondition` (value = `barcode`), `lnkDeleteRentalCollateral` (value = `index`), `btnConfirm`, `btnCancel`. Island không đổi `txtBorrowDate`, `txtNote`, `txtCancelReason`.

### 11.3 CollateralDrawer

Trang `AddRentalCollateralView.jsp`, ngăn kéo đồ cọc: bảng "Các khoản cọc". Props id: `collateral-drawer-props`.

```ts
interface CollateralDrawerProps {
  rows: CollateralDrawerRow[]; // thứ tự = listRentalCollateral
}

interface CollateralDrawerRow {
  index: number; // STT, từ 1
  collateralId: number;
  collateralName: string;
  collateralDescription: string | null;
  value: string | null; // null khi chưa nhập
  note: string | null;
}
```

Input island được đổi: `txtCollateralValue`, `txtCollateralNote` (mỗi dòng một cặp, theo thứ tự `index`). Nút island bấm: `lnkDeleteRentalCollateral` (value = `index`), `btnSave`. Phần tìm loại tài sản do JSP render, island không đụng.

### 11.4 ShelfScene

Trang `HomeView.jsp`, kệ gỗ 3D có đèn vàng và quạt trần, gáy truyện **tự vẽ** (không dùng bìa crawl, logo NXB, nhân vật có bản quyền). Props id: `shelf-scene-props`.

```ts
interface ShelfSceneProps {
  loginHref: string; // "LoginView.jsp"; bấm gáy truyện = bấm lnkLogin (D10)
  posterSrc: string; // ảnh tĩnh của kệ, hiện trước và làm bản dự phòng
  posterSrcSet: string | null; // null khi ảnh tĩnh chỉ có một cỡ
  posterNarrowSrc: string | null; // ảnh tĩnh cho khung hẹp (chỉ tủ kệ, khớp góc máy 3D khi kệ hẹp hơn 560 px); null thì dùng posterSrc mọi cỡ
  posterAlt: string;
  categories: string[]; // nhãn thể loại đánh máy trên gáy, từ pipeline/config/categories.json
}
```

Ảnh tĩnh khung hẹp (phase 6, chủ dự án chọn 11/11/2026): cùng tỉ lệ 3:2 và cùng `width`/`height` với `posterSrc` để bố cục không xê dịch khi cảnh 3D phủ lên. JSP và island render cùng một cây `<picture>`: `<source media="(max-width: 599.98px)" srcset="posterNarrowSrc">` rồi `<img src="posterSrc">` (khung hẹp của cảnh 3D là `COMPACT_MAX_WIDTH_PX` = 560 px bề rộng kệ; trang chủ có lề nên ngưỡng viewport là 600 px). `posterNarrowSrc` là `null` thì không có `<source>`.

Input island được đổi: không có (HomeView không có form). Bấm gáy truyện: island chạy hoạt cảnh rút quyển rồi gọi `.click()` trên link thật `#lnkLogin`; không tạo luồng mới. Không WebGL, giảm chuyển động hoặc máy yếu thì giữ ảnh tĩnh (Deferred #16).

## 12. Ma trận phân quyền (filter)

`AuthFilter` áp theo đường dẫn (Deferred #28: dự án chỉ chạy localhost).

| Đường dẫn | Ai được vào | Chưa đủ quyền thì |
|---|---|---|
| `/HomeView.jsp`, `/RegisterView.jsp`, `/doRegister.jsp`, `/LoginView.jsp` | mọi người | |
| `/nhan-vien/LoginView.jsp` | mọi người | |
| `/doCancelRentalBill.jsp` | khách đã đăng nhập **hoặc** nhân viên đã đăng nhập (Deferred #13) | về `/LoginView.jsp` |
| `/doLogout.jsp` | mọi người (C14; chưa đăng nhập thì chỉ chuyển về trang chủ) | |
| Mọi trang khác ở gốc (`/*.jsp` ngoài các dòng trên) | khách: session có `client` với `id > 0` | về `/LoginView.jsp` |
| `/nhan-vien/*` (trừ `LoginView.jsp`) | nhân viên: session có `staff` | về `/nhan-vien/LoginView.jsp` |
| `/nhan-vien/quan-tri/*` | nhân viên có `staff.position = "Quản lí"` | 403 |
| `/dev/*` | luôn mở (chỉ localhost) | |
| `/health.jsp`, `/static/*`, `/error/*` | luôn mở | |

`client` đặt bởi doRegister (bản đang đăng kí, `id = 0`) **không** tính là đã đăng nhập. Nhân viên không vào được trang khách và ngược lại (trừ doCancelRentalBill); có test chặn chéo ở phase 8.

## 13. Hiển thị

| Thứ | Quy tắc | Ví dụ |
|---|---|---|
| Mã đầu truyện (D8) | `DT` + id đủ 3 chữ số, chỉ lúc hiển thị | id 1 → `DT001` |
| Mã phiếu mượn (D8) | `PM` + id đủ 4 chữ số, chỉ lúc hiển thị; tìm "PM0125" thì tách lấy id 125 | id 125 → `PM0125` |
| Mã vạch | Lưu thật trong `tblBookCopy.barcode`, hiện nguyên | `DT001-03` |
| Tiền | Làm tròn tới đồng, nhóm ba chữ số bằng dấu chấm, hậu tố `đ` liền sau | `3.000đ`, `42.000đ`, `0đ` |
| Ngày | `dd/MM/yyyy` | `25/09/2026` |
| Ngày giờ | `HH:mm dd/MM/yyyy` | `09:00 25/09/2026` |
| Tình trạng khi giao | Tên các lỗi nối bằng `, ` theo thứ tự ghi nhận; đã ghi nhận mà không có lỗi → `Không có lỗi`; chưa ghi nhận → `(chưa ghi nhận)` (ch.2 2.3 bước 10, 24, 28) | `Rách bìa, Vết bẩn, viết vẽ` |
| Số lượng (giỏ, phiếu) | Số dòng cùng đầu truyện, tính lúc hiển thị | |
| Tổng tiền một dòng | giá thuê theo ngày của dòng × số quyển × số ngày (C3) | 3.000đ × 1 × 7 = `21.000đ` |
| Tổng tiền thuê | tổng tiền các dòng − giảm giá (ch.9 tr.74) | `42.000đ` |

Mọi tổng tính lúc hiển thị, không lưu (ch.8 bước 5). Chữ trên giao diện toàn tiếng Việt.

## 14. Điểm báo cáo không trả lời (đã chốt 11/11/2026)

Báo cáo và các quyết định D1–D11 không trả lời các điểm dưới đây. **Đã chốt ngày 11/11/2026** bởi orchestrator phiên cook phase 1–2, theo uỷ quyền của chủ dự án trong phiên đó ("tự chọn phương án khuyến nghị"): lấy đúng cột "Tạm lấy". Lí do chung: không thêm thông báo, bảng hay cột ngoài báo cáo; mọi lựa chọn chạy được không cần JS. Ghi ở `plans/261111-tiem-thue-truyen/plan.md`, Deferred #29. Muốn đổi điểm nào thì sửa dòng đó trước phase ở cột "Chốt trước" và báo các phase đang chạy.

| # | Điểm | Tạm lấy (đã chốt 11/11/2026) | Chốt trước |
|---|---|---|---|
| C1 | Tên `name` cho phần tử ch.9 không đặt tên: ô tích và ô nhập trên từng dòng, giá trị của nút trên dòng, nút trong hộp xác nhận huỷ | Nút trên dòng là `<button type="submit" name="<tên ch.9>" value="<id hoặc mã vạch hoặc STT>">`. Ô mới: `chkSelectedBook` (SearchBookView), `chkReceived` (ProcessRentalBillView), `txtDamageNote` (AddConditionView, mỗi dòng một ô theo thứ tự bảng), `txtCollateralValue` và `txtCollateralNote` (AddRentalCollateralView). Hộp huỷ: `btnConfirmCancel` ("Xác nhận", `formaction="doCancelRentalBill.jsp"`), `btnCloseCancel` ("Huỷ"). `lnkChooseBook` ở AddRentedBookView là ô chọn một (radio). Mọi lần gửi về của AddConditionView và AddRentalCollateralView đọc lại các ô trên dòng vào bản sao trước khi xử lí nút (để ghi chú, giá trị đã nhập không mất, đúng ch.2 bước 17–22, 35–40) | phase 6 |
| C2 | Cơ chế kĩ thuật của trang: thông báo qua forward hay redirect; trang `doXxx` có nhận GET không; hộp xác nhận huỷ mở bằng gửi về trang hay bằng JS; nút "In phiếu" | Forward kèm request attribute `message` (không thêm thuộc tính session); `doXxx.jsp` chỉ nhận POST (GET trả 405); hộp huỷ mở bằng gửi về chính trang (chạy được không cần JS), loader chỉ làm đẹp; "In phiếu" gọi `window.print()` qua loader rồi sang StaffHomeView, không có JS thì nút gửi thẳng sang StaffHomeView | phase 6 |
| C3 | Số ngày để tính tổng tiền; lúc ConfirmRentalBillView tính lại có ghi session không; cách gửi về trang khi đổi ô mà không có island | Số ngày = `expectedDays` khi phiếu chưa có `borrowDate` hoặc `dueDate`; có cả hai thì = số ngày từ `borrowDate` tới `dueDate` (sửa ngày hẹn trả làm đổi tổng: ch.10; ch.2 cho 7 = 7). ConfirmRentalBillView không ghi session, giữ các ô bằng giá trị vừa gửi. Đổi ô thì loader gửi form (thuộc tính `data-submit-on-change`); không có JS thì có nút "Tính lại" trong `<noscript>` | phase 6 |
| C4 | Quy tắc "đúng định dạng" của doRegister | Họ tên, địa chỉ không trống; ngày sinh là ngày hợp lệ trước hôm nay; CCCD đúng 12 chữ số; điện thoại 10 chữ số bắt đầu bằng 0; email có dạng `x@y.z`; tên đăng nhập 1–50 kí tự không có khoảng trắng; độ dài không vượt cột của mục 2. Mật khẩu: không trống (báo cáo không đặt độ dài tối thiểu) | phase 6 |
| C5 | `client` trong session lúc đăng kí làm lộ mật khẩu và có thể bị filter coi là đã đăng nhập | Bản `client` của doRegister không chứa mật khẩu, có `id = 0`, filter chỉ coi `id > 0` là đã đăng nhập, doRegister bỏ `client` khi thành công | phase 6 |
| C6 | Khi nào làm mới danh sách tạm (ch.10 chỉ nói "mở từ trang X thì đọc lại, quay lại thì dùng session") | Trang đầu mối dọn thuộc tính tạm của luồng con: ClientHomeView bỏ `listRentalBill`; ProcessRentalBillView bỏ `listRentedBook`, `listRentalCollateral`, `rentedBook` mỗi lần hiển thị; AddRentalCollateralView bỏ `listRentalCollateral` khi "Lưu" hoặc "Quay lại"; doAddRentalBill bỏ `listRentalBill` | phase 6 |
| C7 | Định nghĩa "đã có tình trạng khi giao"; giá trị mặc định của ngày mượn, ngày hẹn trả khi mở ProcessRentalBillView; ô ngày mượn có sửa được không | Đã có tình trạng khi `conditionNote` khác NULL (bấm "Lưu tình trạng" ghi chuỗi đã nhập, kể cả chuỗi rỗng). Khi SearchRentalBillView đưa phiếu "Chờ nhận" vào session: `borrowDate` = hôm nay, `dueDate` = hôm nay + `expectedDays` (ch.2 2.3 bước 10 hiện sẵn 25/09/2026 và 02/10/2026). `txtBorrowDate` hiển thị, chỉ đọc (ch.10 chỉ nhắc sửa ngày hẹn trả và giảm giá) | phase 7 |
| C8 | doCancelRentalBill biết ai gọi để chọn trang quay về | Form gửi input ẩn `from` với một trong hai giá trị `client` hoặc `staff`; trang chỉ nhận giá trị khớp thuộc tính đang có trong session (`client` hoặc `staff`), không khớp thì 403 | phase 6 |
| C9 | Cách `searchRentalBill` khớp từ khoá; tìm với từ khoá trống | Từ khoá dạng `PM` + số (không phân biệt hoa thường) → khớp id; ngược lại khớp tên khách chứa từ khoá hoặc CCCD bằng từ khoá. Từ khoá trống (cả `searchBook`, `searchDamage`, `searchCollateral`, `searchRentalBill`) → không gọi DAO, hiện câu "không tìm thấy" của trang | phase 3 |
| C10 | Đầu vào không có câu báo trong báo cáo: "Tạo phiếu mượn" khi không tích dòng nào; `txtQuantity` không phải số nguyên dương; `txtDiscount` âm, không phải số hoặc lớn hơn tổng; `updateCart` trả `false`; trang quản trị nhập sai | **Đổi 11/11/2026 (chủ dự án duyệt câu mới, §10.3):** lỗi nhập có câu riêng ở §10.3 thì hiện câu đó, đánh dấu ô bằng `aria-invalid="true"` và giữ giá trị cũ trong session (`QUANTITY_INVALID`, `DISCOUNT_INVALID`, `BOOK_NOT_CHOSEN`, `INPUT_TOO_LONG`). Trường hợp chưa có câu (`updateCart` trả `false`, trang quản trị) vẫn chỉ `aria-invalid` và hiện lại trang | phase 6 |
| C11 | Hiển thị `publishYear` và `description` NULL | Ô để trống (không bịa chữ) | phase 6 |
| C12 | Trang quản trị D6: thành phần, field, lối vào, sửa quyển | Như bảng ở mục 9.2. Lối vào: nút "Quản lí đầu truyện" ở StaffHomeView chỉ hiện với "Quản lí" (ghi rõ là phần ngoài báo cáo). `searchBook` chỉ trả quyển đang sẵn sàng nên `updateBook` chỉ **thêm** quyển mới (`id = 0`) và sửa cột của Book, không xoá quyển. Field tự đặt (ch.9 không có): `lnkAddBook`, `lnkBack` (ManageBookView), input ẩn `bookId` (EditBookView). Luật nhập: `txtPublisher` không bắt buộc (trống lưu chuỗi rỗng); số quyển 0 được nhận ở AddBookView; giá tối đa 2^24 đồng (16.777.216đ) | phase 7 |
| C13 | Kiểu Java của mảng và tiền | `List<T>` cho mọi `T[]`; tiền giữ `float` như ch.9 (không đổi sang `BigDecimal` vì đó là đổi thiết kế) | phase 3 |
| C14 | Đăng xuất (báo cáo không có; chủ dự án duyệt thêm 11/11/2026) | Một trang `doLogout.jsp` ở gốc, khách và nhân viên dùng chung, chỉ nhận POST có CSRF: `session.invalidate()` rồi 302 về `HomeView.jsp` (khách) hoặc `/nhan-vien/LoginView.jsp` (nhân viên, đọc vai trước khi huỷ). Nút `btnLogout` "Đăng xuất" (form `method="post"` + `<t:csrf/>`, `formaction` tới `doLogout.jsp`) ở đầu trang chung (`WEB-INF/tags/layout.tag`) trên mọi trang đã đăng nhập, gồm ClientHomeView và StaffHomeView, ghi rõ là phần ngoài báo cáo | phase 6 (trang, nút khách), phase 7 (nút nhân viên) |
| C15 | Giới hạn số ngày thuê (chủ dự án chọn 11/11/2026) | `txtExpectedDays` từ 1 tới `RentalBill.MAX_EXPECTED_DAYS` = 30; lớn hơn thì `EXPECTED_DAYS_TOO_LONG`, nhỏ hơn 1 hay không phải số nguyên thì `EXPECTED_DAYS_INVALID`. Phía quầy **không** giới hạn 30 ngày: ngày hẹn trả chỉ cần sau ngày mượn (`DUE_DATE_INVALID`; chủ dự án chốt ở phiên phase 7). Không giới hạn ngày hẹn nhận, số phiếu "Chờ nhận" mỗi khách, độ dài tối thiểu của mật khẩu (chủ dự án không chọn) | phase 6 |
| C16 | Session hết hạn giữa chừng | `AuthFilter`: trang cần đăng nhập mà request mang session id không còn hợp lệ (`getRequestedSessionId() != null && !isRequestedSessionIdValid()`) thì 302 về LoginView của vai kèm `?expired=1`; `CsrfFilter`: POST tới trang cần đăng nhập mà session không có token cũng vậy (không ghi gì). LoginView thấy `expired=1` ở GET thì hiện `SESSION_EXPIRED` (kind info). Trang công khai (đăng kí) chỉ hiện lại form với token mới, không câu báo | phase 6 |
| C17 | Lí do huỷ trống (báo cáo không nói; ch.2 2.2 bước 24.7 khách có nhập) | `txtCancelReason` sau `trim()` trống thì `CANCEL_REASON_REQUIRED`, hộp xác nhận vẫn mở, ô `aria-invalid`; dài quá 255 thì `INPUT_TOO_LONG`. Áp cho khách và nhân viên | phase 6, phase 7 |
| C18 | Phiếu "Chờ nhận" quá ngày giờ hẹn mà khách không đến | Không làm gì (chủ dự án chọn 11/11/2026): không nhãn, không tự huỷ; nhân viên huỷ tay như ch.2 | |
| C19 | Edge case kĩ thuật ngoài báo cáo (dữ liệu nhập lạ, bấm hai lần, F5, Back, URL trực tiếp, session thiếu thuộc tính, id sửa tay, hai tab) | Theo `plans/261111-tiem-thue-truyen/phase-06-integration.md` §6.1: không trang nào ra 500 hay ghi đôi; thiếu thuộc tính session thì 302 về trang đầu mối; id không có trong danh sách của session thì bỏ qua | phase 6, phase 7 |
| C20 | Trạng thái ô "Nhận" của ProcessRentalBillView khi quay về từ AddConditionView, EditRentedBookListView, AddRentalCollateralView (model không có chỗ giữ; chủ dự án chốt 11/11/2026 ở phiên phase 7, chọn thuộc tính kĩ thuật thay vì đổi model) | Thuộc tính session kĩ thuật `uncheckedBarcodes: ArrayList<String>` = mã vạch nhân viên đã bỏ tích "Nhận" của phiếu đang mở. ProcessRentalBillView ghi khi đổi ô `chkReceived`; SearchRentalBillView bỏ khi đưa phiếu "Chờ nhận" vào session; doUpdateRentalBill bỏ khi thành công. Không phải thuộc tính nghiệp vụ của §7 | phase 7 |
| C21 | Khách mở hai thiết bị: một thiết bị xoá dòng "Truyện đã chọn" hoặc đã xác nhận phiếu từ cùng các dòng giỏ, thiết bị kia bấm "Xác nhận" với `rentalBill` cũ trong session (chủ dự án yêu cầu xử lí mọi edge case thực tế, 11/11/2026) | `RentalBillDAO.addRentalBill` trong cùng transaction K1, sau khi khoá dòng `tblBook`, khoá các dòng `tblSelectedBook` của phiếu theo id tăng dần (`FOR UPDATE`) và kiểm mỗi dòng còn tồn tại, thuộc giỏ của client của phiếu, không có `tblRentedBook` của phiếu chưa huỷ trỏ vào; sai một dòng thì rollback, trả `false` (không lỗi khoá ngoại, không 500). doAddRentalBill khi `false`: đọc lại giỏ bằng `CartDAO.getCart`; dòng của phiếu không còn là dòng tự do thì thay `cart` trong session bằng giỏ mới, bỏ `rentalBill`, báo `SELECTED_BOOKS_CHANGED` ở trang "Truyện đã chọn"; ngược lại `NOT_ENOUGH_COPIES` như cũ | phase 6 |
| C22 | Kết quả tìm cũ còn hiện khi mở lại "Tìm truyện"; trang trống lúc mới mở (chủ dự án yêu cầu 11/11/2026) | Mở mới = `SearchBookView.jsp?moi=1` (link `lnkSearchBook` của ClientHomeView và mục "Tìm truyện" ở đầu trang): GET có `moi` thì bỏ `listBook`; ClientHomeView cũng bỏ `listBook` (trang đầu mối, C6). "Quay lại" từ BookDetailView và forward từ doAddSelectedBook giữ kết quả. Chưa có kết quả thì hiện kệ truyện cuộn ngang: đọc cả kho bằng `BookDAO.searchBook("")` (không thêm hàm DAO; ô tìm vẫn theo C9), gộp theo tên bộ (bỏ đuôi "- Tập N"), mỗi bộ một bìa và số tập; bấm một bộ gửi form `frmShelf` (`txtKeyword` = tên bộ, `btnSearch`) nên trang tìm và điền tên bộ vào ô tìm | 09-ui |
