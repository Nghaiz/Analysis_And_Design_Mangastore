# Brainstorm: web "Tiệm thuê truyện tuổi thơ"

Ngày: 11/11/2026. Trạng thái: **ĐÃ DUYỆT** (11/11/2026), chuyển sang `/t1k:plan`. Chưa viết code.
Brief: `prompt-web-tiem-thue-truyen.md`. Nguồn chính: `B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf` (bản sao trong repo, đã đọc đủ 11 chương).

---

## 0. Nguồn đã đọc (mục 1 của brief)

| Nguồn | Đã đọc | Ghi chú |
|---|---|---|
| Báo cáo, 116 trang, 11 chương | Đủ ch.1 đến ch.11 | Bản text trích bằng PyMuPDF; hình đọc từ `images/svg` |
| Memory `d--PTTK/memory/` (2 file) | Đủ | `feedback-pttk-analysis-deliverables.md` là nguồn quyết định |
| `D:\PTTK\vpauto\NOTE_*.md` | `NOTE_sequence_loop_session.md` | Đã chốt "loop mọi danh sách", không ảnh hưởng code |
| `images/svg/design_entity_pa5.svg`, `design_database.svg` | Đủ | Cột và kiểu lấy từ đây (mục 3) |
| `images/svg/ui_m1..m3*.svg` (24 màn hình) | Đủ | Thành phần và thứ tự từng màn hình |
| `*.jsonl` lịch sử | Không đọc | Brief bảo chỉ tra khi cần lí do; chưa cần |

`D:\PTTK` chỉ đọc, không sửa gì.

---

## 1. Quyết định đã chốt trong phiên này

| # | Câu hỏi | Chọn | Hệ quả |
|---|---|---|---|
| D1 | `tblUser.password varchar(50)` không chứa nổi chuỗi băm | **ĐỔI THIẾT KẾ**: nới thành `varchar(255)` | Ghi ADR-0002. Argon2id. Tên cột, bảng, khoá giữ nguyên |
| D2 | tblBook không có cột ảnh | Đường dẫn suy từ id, không đổi schema | `/covers/{bookId}/cover-{w}.webp`; ảnh gáy hoặc ảnh phụ (nếu nguồn có) là `extra-{n}-{w}.webp`; thiếu thì hiện bìa giấy vẽ sẵn. Nginx phục vụ thư mục này với cache dài |
| D3 | "Thần đồng đất Việt" ở ngoại lệ 5 | Bộ dữ liệu E2E riêng | Kho thật có bộ này; seed E2E dựng y hệt chương 2 và không có bộ này |
| D4 | Quy mô | 300 đến 500 **Book** (tập) | Khoảng 20 đến 40 bộ |
| D5 | Đăng nhập nhân viên | Hai thư mục, cùng tên trang | `/LoginView.jsp` gọi ClientDAO, `/nhan-vien/LoginView.jsp` gọi StaffDAO |
| D6 | Trang quản trị | Chỉ Staff có `position = "Quản lí"` | Thêm `BookDAO.addBook(book)`, `BookDAO.updateBook(book)` (quyển đi qua Book chủ). Ghi là **phần ngoài báo cáo** |
| D7 | Redis | Session và chặn đăng nhập sai | Cache chỉ cho phần tĩnh của đầu truyện; số quyển trống luôn đọc từ MySQL |
| D8 | Mã hiển thị | `DT` + id đủ 3 chữ số, `PM` + id đủ 4 chữ số, chỉ định dạng lúc hiển thị | `barcode` lưu thật dạng `DT001-03`. Tìm "PM0125" thì tách lấy id 125 |
| D9 | Phiếu bị đổi trạng thái giữa chừng (khách huỷ đúng lúc nhân viên đang xử lí, hoặc ngược lại) | Dùng lại câu có sẵn, chọn theo trạng thái mới | `updateRentalBill` khoá dòng phiếu và kiểm trạng thái trong DB vẫn là "Chờ nhận" rồi mới ghi. Nếu đã thành "Đã huỷ" thì báo "Phiếu mượn đã bị huỷ, không thể xử lí."; nếu đã thành "Đang cho thuê" thì báo "Phiếu mượn này đã được xử lí và đã giao truyện." Nhân viên quay về SearchRentalBillView, khách quay về RentalBillListView. Trang bỏ danh sách cũ khỏi session để lần sau đọc lại bằng hàm danh sách đã có (không getById). Cách báo tín hiệu từ DAO lên trang mà vẫn giữ kiểu trả về `boolean` sẽ chốt trong `docs/contracts.md` |
| D10 | Bấm gáy truyện trên kệ 3D ở HomeView | Như nút "Đăng nhập" | Rút quyển xuống rồi mở LoginView; đăng nhập xong về ClientHomeView đúng ch.9. Không thêm luồng mới |
| D11 | Bản quyền dữ liệu crawl | Kim Đồng + Tiki, nội dung ngoài git | Chỉ dùng riêng, không công khai. Mô tả, ảnh và file SQL dữ liệu nằm ở `data/` (bị ignore) và volume. Repo chỉ có script và manifest |

---

## 2. Hợp đồng nghiệp vụ (bất biến, không thiết kế lại)

Giữ nguyên mục 3 của brief. Chỉ ghi phần **bổ sung từ báo cáo** mà brief chưa liệt kê, để `docs/` và `CLAUDE.md` chép đủ.

### 2.1 Bảng và cột (ch.8 + ERD)

| Bảng | Cột (kiểu theo ERD) | Khoá ngoại |
|---|---|---|
| tblUser | id int PK, username varchar(50), password **varchar(255)** (D1), fullName varchar(100) | |
| tblClient | userId int PK+FK, dob date, idCard varchar(12), phone varchar(10), email varchar(100), address varchar(255) | userId → tblUser |
| tblStaff | userId int PK+FK, position varchar(50) | userId → tblUser |
| tblBook | id, name varchar(255), author varchar(100), publisher varchar(100), publishYear int, category varchar(50), description varchar(255), rentalPrice float | |
| tblBookCopy | id, barcode varchar(20), bookId | bookId → tblBook |
| tblDamage | id, name varchar(100), description varchar(255) | |
| tblCollateral | id, name varchar(100), description varchar(255) | |
| tblCart | id, clientId | clientId → tblClient (1-1) |
| tblSelectedBook | id, cartId, bookCopyId | |
| tblRentalBill | id, createdAt timestamp, expectedPickupAt timestamp, expectedDays int, borrowDate date, dueDate date, discount float, note varchar(255), status varchar(20), cancelReason varchar(255), clientId, staffId (null tới khi giao) | |
| tblRentedBook | id, rentalPrice float, conditionNote varchar(255), rentalBillId, bookCopyId, selectedBookId (null = thêm tại quầy) | |
| tblRentedDamage | id, note varchar(255), rentedBookId, damageId | |
| tblRentalCollateral | id, value varchar(100), note varchar(255), rentalBillId, collateralId | |

Ràng buộc UNIQUE suy ra từ nghiệp vụ (không thêm cột): `tblUser.username`, `tblClient.idCard/phone/email`, `tblCart.clientId`, `tblBookCopy.barcode`, `tblDamage.name`, `tblCollateral.name`. Index cho tra cứu: `tblRentedBook(bookCopyId)`, `tblRentalBill(status)`, `tblBook(name)`, `tblBook(author)`.
Cảnh báo: `description varchar(255)` ngắn so với mô tả crawl về; pipeline phải cắt ở 255 kí tự theo ranh giới câu (không đổi schema).

### 2.2 Thông báo nguyên văn (đủ, từ ch.2, 4, 9)

Brief liệt kê 5 câu, báo cáo có 28 câu. Tất cả đều là hằng số trong một lớp `Messages` duy nhất và có test so từng chữ.

| Nơi | Câu |
|---|---|
| Đăng kí | "Đăng kí tài khoản thành công!" · "Tên đăng nhập, số CCCD, số điện thoại hoặc email đã được sử dụng, vui lòng kiểm tra lại." · "Thông tin không hợp lệ, vui lòng kiểm tra lại." · "Mật khẩu nhập lại không khớp, vui lòng nhập lại." |
| Đăng nhập | "Đăng nhập thất bại, vui lòng thử lại." |
| Tìm truyện | "Không tìm thấy thông tin phù hợp." · "Số lượng vượt quá số quyển hiện có (hiện còn N quyển)." |
| Lập phiếu | "Số ngày thuê phải lớn hơn hoặc bằng 1." · "Ngày giờ đến nhận phải sau thời điểm hiện tại." · "Không còn đủ quyển truyện, vui lòng chọn lại." · "Tạo phiếu mượn thành công! Vui lòng đến quầy vào ngày giờ đã hẹn để đặt cọc và nhận truyện." |
| Huỷ | "Bạn có chắc chắn muốn huỷ phiếu mượn này?" · "Huỷ phiếu mượn thành công!" |
| Tìm phiếu | "Không tìm thấy phiếu mượn phù hợp." · "Phiếu mượn đã bị huỷ, không thể xử lí." · "Phiếu mượn này đã được xử lí và đã giao truyện." |
| Xử lí phiếu | "Ngày hẹn trả phải sau ngày mượn." · "Chưa chọn quyển truyện nào để giao cho khách hàng." · "Vui lòng ghi nhận tình trạng cho tất cả các quyển truyện được giao." · "Phiếu mượn chưa có khoản đặt cọc, vui lòng thêm khoản đặt cọc." |
| Tình trạng | "Không tìm thấy loại lỗi phù hợp." · "Lỗi này đã được ghi nhận cho quyển truyện." · "Vui lòng nhập tên lỗi." · "Loại lỗi đã tồn tại." |
| Đặt cọc | "Không tìm thấy loại tài sản phù hợp." · "Vui lòng nhập giá trị cho tất cả các khoản cọc." · "Vui lòng nhập tên loại tài sản." · "Loại tài sản đã tồn tại." |

Bốn điều kiện xác nhận (doUpdateRentalBill, ch.4/5/9/10): có quyển tích "Nhận"; mọi quyển tích đã có tình trạng; đã có khoản cọc; ngày hẹn trả sau ngày mượn. Giữ đủ bốn, kể cả điều kiện thứ tư dù luồng thường không chạm.

### 2.3 Hàm DAO (ch.9, đủ, không gộp)

| DAO | Hàm |
|---|---|
| DAO | `con: Connection` (lấy từ HikariCP) |
| UserDAO | `checkLogin(user): User` |
| ClientDAO extends UserDAO | `checkLogin(user): Client`, `addClient(client): boolean` (tạo luôn giỏ) |
| StaffDAO extends UserDAO | `checkLogin(user): Staff` |
| BookDAO | `searchBook(keyword): Book[]` (kèm quyển đang sẵn sàng) · **ngoài báo cáo (D6):** `addBook(book)`, `updateBook(book)` |
| CartDAO | `getCart(client): Cart` (dòng chưa thuộc phiếu chưa huỷ), `updateCart(cart): boolean` |
| RentalBillDAO | `addRentalBill`, `getRentalBillList(client)`, `searchRentalBill(keyword)`, `updateRentalBill(rentalBill)` |
| DamageDAO | `searchDamage`, `addDamage` |
| CollateralDAO | `searchCollateral`, `addCollateral` |

Tên thuộc tính session (ch.9/10): `client`, `staff`, `cart`, `rentalBill`, `listBook`, `book`, `listRentalBill`, `rentedBook`, `listRentedBook`, `listDamage`, `listCollateral`, `listRentalCollateral`. Tên field form theo ch.9 (`txtUsername`, `txtKeyword`, `txtQuantity`, `txtExpectedDays`, `txtExpectedPickupAt`, `txtNote`, `txtCancelReason`, `txtBorrowDate`, `txtDueDate`, `txtDiscount`, `txtConditionNote`, `txtName`, `txtDescription`, ...). Sẽ chốt đầy đủ trong `docs/contracts.md` trước khi chia lane.

---

## 3. Nối JSP với React island (so 3 cách)

Ràng buộc: mọi ghi DB qua `doXxx.jsp`; trang tự gửi về chính nó khi tìm, sửa bản sao trong session; không có API riêng.

| Tiêu chí | A. Mỗi trang một entry Vite | B. Một loader chung + chunk lười theo island | C. Web Components (custom element) |
|---|---|---|---|
| Cách nạp | JSP nạp `entries/process-bill.js` qua tag file đọc `manifest.json` | JSP luôn nạp `island-loader.js` (~2 KB); loader quét `[data-island]` và `import()` đúng chunk | `<tiem-cart>` đăng kí bằng `customElements.define` bọc React |
| Kích thước tải | Nhỏ, nhưng mỗi trang tự liệt kê CSS/JS, dễ quên preload | Nhỏ; chunk dùng chung (React, shadcn) tách tự động | Thêm lớp bọc; shadow DOM vướng Tailwind và shadcn |
| Cấu hình | N entry trong `vite.config`, thêm trang là sửa config (file dùng chung) | Một entry; thêm island chỉ thêm file vào `islands/` và registry tự sinh | Một entry |
| Truyền dữ liệu | `data-*` hoặc JSON nhúng | JSON nhúng `<script type="application/json" id="…">` | Thuộc tính chuỗi, phải parse |
| CSRF | Như B | Token nằm trong `<form>` do JSP render, island không tự gửi | Như B |
| Không có JS | Tuỳ cách viết | Form HTML vẫn chạy | Tuỳ |

**Khuyến nghị: B**, với quy tắc "**form của server giữ việc gửi, island giữ tương tác**":
- JSP render một `<form method="post" action="doXxx.jsp">` thật (hoặc `action` là chính trang), có `<input type="hidden" name="csrf">` do tag `<t:csrf/>` in ra và field đúng tên ch.9.
- Island mount vào một `<div data-island="ProcessBillDesk" data-props="process-bill-props">` nằm **trong** form; props đọc từ `<script type="application/json" id="process-bill-props">` do `JsonUtil.toScriptJson()` sinh (escape `<`, `>`, `&`, U+2028).
- Island chỉ đổi giá trị input thật (input ẩn có `name` đúng ch.9) rồi gọi `form.requestSubmit(submitter)`. Không `fetch`, không endpoint JSON.
- Không có JS hoặc island hỏng thì form HTML render sẵn vẫn gửi được (bảng, ô tích, nút đều có bản HTML). Đây cũng là bản dự phòng cho `prefers-reduced-motion` và Lighthouse.
- Filter CSRF kiểm token cho mọi POST tới `*.jsp`; token gắn với session và đổi sau đăng nhập.

Island dự kiến (đúng 3 khối brief nêu, cộng cảnh 3D):
1. `SelectedStack` ("Truyện đã chọn", SearchBookView): chồng truyện buộc dây, ô tích, nút Xoá.
2. `ProcessBillDesk` (ProcessRentalBillView): bàn quầy, ô "Nhận", tem tình trạng, tính lại tổng ngay khi tích hoặc nhập giảm giá rồi vẫn gửi về trang như ch.10.
3. `CollateralDrawer` (AddRentalCollateralView): ngăn kéo đồ cọc, nhập giá trị, ghi chú từng dòng.
4. `ShelfScene` (HomeView): kệ gỗ 3D, ảnh tĩnh dự phòng.

Lưu ý ch.10: "tính tổng tiền ngay trên trang khi nhập số ngày thuê" (ConfirmRentalBillView) và "tính lại tổng khi bỏ tích" (ProcessRentalBillView) đều là trang gửi về chính nó. Island được hiện số tạm ngay, nhưng giá trị trong session vẫn chỉ đổi qua lần gửi về trang. Không có chỗ nào island tự sửa session.

---

## 4. Khoá quyển truyện khi lưu phiếu (rủi ro lớn nhất)

Quyển bận khi có `tblRentedBook` trỏ vào nó mà phiếu chưa huỷ. Không có cột trạng thái để khoá, nên khoá phải đặt vào một dòng ổn định.

| Cách | Khoá gì | Ưu | Nhược |
|---|---|---|---|
| **K1. Khoá dòng đầu truyện** | `SELECT id FROM tblBook WHERE id IN (…) ORDER BY id FOR UPDATE` | Một khoá mỗi đầu truyện, dễ hiểu; đổi sang quyển khác cùng đầu truyện vẫn nằm trong khoá | Hai khách lập phiếu cùng đầu truyện thì chờ nhau vài ms |
| K2. Khoá dòng quyển | `SELECT … FROM tblBookCopy WHERE bookId IN (…) FOR UPDATE` | Hạt mịn hơn | Khoá nhiều dòng; vẫn phải khoá cả đầu truyện khi đổi quyển, nên phức tạp hơn mà không lợi |
| K3. SERIALIZABLE | Gap lock của InnoDB | Không cần nghĩ | Deadlock khó đoán, phải retry |
| K4. Cột sinh + UNIQUE | `activeCopyId` | Ràng buộc ở DB | **Đổi schema**, loại |

**Chọn K1**, áp cho mọi đường tạo `tblRentedBook`: `addRentalBill` và nhánh "thêm quyển mới" của `updateRentalBill`. Trong cùng transaction (READ COMMITTED, autocommit tắt):
1. Khoá các đầu truyện liên quan theo id tăng dần (tránh deadlock).
2. Với từng dòng, đọc lại quyển còn trống (`NOT EXISTS` phiếu chưa huỷ trỏ vào, trừ chính phiếu này).
3. Quyển đã bận thì đổi sang quyển trống khác cùng đầu truyện và chưa có trong phiếu (đúng ch.9); không đủ thì rollback, trả `false`, trang hiện "Không còn đủ quyển truyện, vui lòng chọn lại."
4. Ghi phiếu và dòng, commit.

Huỷ phiếu và bỏ quyển không cần khoá vì chỉ giải phóng. `updateCart` không giữ quyển nên không khoá. Không tin dữ liệu trong session (`book.listBookCopy` có thể đã cũ).
Test bắt buộc (Testcontainers): 2 luồng tranh quyển cuối, đúng 1 thành công; N luồng tranh M quyển, tổng quyển được giữ bằng M; luồng đổi quyển khi quyển đã chọn bị giữ.

---

## 5. Kiến trúc và công nghệ

Nguồn đầy đủ (link chính thức, ngày tra): `researcher-261111-stack-versions.md`. Cột "Kiểm": ✓ = tôi tự đối chiếu lại với `maven-metadata.xml` của Maven Central, npm registry hoặc Google Fonts ngày 11/11/2026; R = chỉ có nguồn của researcher.

| Thành phần | Phiên bản | Kiểm | Lí do và lưu ý |
|---|---|---|---|
| Java | 25 LTS (25.0.5) | R | LTS mới nhất. Tomcat 11 chỉ đòi ≥ 17. Dự phòng: 21 LTS nếu có công cụ nào vỡ |
| Tomcat | 11.0.27 | ✓ | Servlet 6.1, JSP 4.0, EL 6.0, tức **Jakarta EE 11**. Brief gợi ý "EE 10 trên Tomcat 11" là lệch: EE 10 thuộc Tomcat 10.1. Chọn EE 11 cho đúng container |
| JSTL | API `jakarta.servlet.jsp.jstl-api` 3.0.2, impl `org.glassfish.web:jakarta.servlet.jsp.jstl` 3.0.1 | ✓ | Bản 3.1 mới ở M2, không dùng. Đóng gói trong WAR. EL do Tomcat cấp (`provided`) |
| Maven / war plugin | 3.9.16 / 3.5.1 | R | Maven 4 còn RC |
| MySQL | 8.4.13 LTS | R | dev.mysql.com chặn curl, researcher đọc qua đường khác |
| Connector/J | `com.mysql:mysql-connector-j` 26.10.0 | ✓ | Đã đổi sang đánh số năm.tháng |
| HikariCP | 7.1.0 | ✓ | |
| Flyway | `flyway-mysql` 13.12.1 | ✓ | Redgate chỉ ghi đã kiểm MySQL 5.7, 8.0, 9.4, không có 8.4, nên CI chạy migration trên đúng 8.4 bằng Testcontainers |
| Redis / session | Redis 8.10.3 (R), `redisson-tomcat-11` 4.8.0 (✓) | | Cấu hình trong `context.xml`, không đụng code trang |
| Băm mật khẩu | Password4j 1.8.4, Argon2id | ✓ | Chuỗi băm khoảng 97 kí tự, cần D1 |
| JSON cho props island | Jackson `tools.jackson.core:jackson-databind` 3.3.0 | ✓ | Chỉ dùng trong `JsonUtil.toScriptJson()` |
| Test Java | JUnit 6.1.3, `testcontainers-mysql` 2.0.5 | ✓ | Testcontainers 2 đã đổi tên artifact |
| Vite | 8.3.7 | ✓ | Manifest ở `.vite/manifest.json`, một tag file JSP đọc nó để in `<link>`, `<script>`, `modulepreload` |
| React | 19.3.1, **ghim < 19.4** | ✓ | `@react-three/fiber` 9.8.2 khai peer `react >=19 <19.4` |
| Tailwind | 4.3.5 + `@tailwindcss/vite` 4.3.5 | ✓ | |
| shadcn CLI | 4.23.0 | R | Dùng component thật, bọc lại theo chủ đề |
| 3D | three 0.187.0 (✓), drei 10.7.9 (R) | | Chuyển động 3D bằng `useFrame` và hàm easing của drei, không thêm thư viện |
| Chuyển động 2D | Motion 14.12.0 | R | Có `useReducedMotion`. Không dùng GSAP (miễn phí nhưng thừa khi đã có Motion), bớt một phụ thuộc |
| Test frontend | Vitest 5.1.0, Playwright 1.65.0 | R | |
| Nginx | image chính thức + module brotli | R | Image gốc không có brotli, build bằng `modules/Dockerfile` của repo docker-nginx với `ENABLED_MODULES="brotli"` |

Mọi phiên bản sẽ được ghim cứng trong `pom.xml`, `package.json` và Dockerfile ở phase 1, kèm ADR.

- JSP + JSTL + tag file, không Servlet điều khiển, không Spring. Java chỉ có `dao`, `model`, `filter`, `util`.
- `DAO` giữ `Connection` lấy từ `DataSource` HikariCP (JNDI hoặc singleton trong `util`), đóng khi trang xong (filter hoặc try-with-resources trong DAO).
- Filter: `Utf8Filter`, `AuthFilter` (khách: mọi trang trừ Home/Register/doRegister/Login; nhân viên: `/nhan-vien/*`; quản lí: `/nhan-vien/quan-tri/*`), `CsrfFilter`, `SecurityHeadersFilter`, `LoginRateLimitFilter` (Redis).
- Flyway: `V1__schema.sql` (13 bảng), `V2__catalog_seed.sql` (lỗi, loại tài sản, khách, nhân viên), dữ liệu crawl ở `db/data/` riêng; seed E2E ở `db/e2e/` (D3).
- Entity `implements Serializable` để session lưu được trong Redis (D7).

## 6. Pipeline dữ liệu

Chi tiết nguồn, truy vấn mẫu, trích robots.txt và điều khoản nằm trong `researcher-261111-data-sources.md`. Ngày 11/11/2026 tôi đã tự tải lại robots.txt của Kim Đồng và Tiki để kiểm các dòng được trích.

| Nguồn | Vai trò | API | Độ phủ truyện tiếng Việt | robots.txt | Điều khoản |
|---|---|---|---|---|---|
| NXB Kim Đồng (cửa hàng Sapo) | **Chính** | JSON công khai `/products/<alias>.json`, liệt kê qua `sitemap.xml` (5.712 sản phẩm) | Tốt với bản in mới: ISBN, tác giả, bộ, mô tả, 2–3 ảnh (khoảng 800x1246). Bộ dài cũ (Doraemon 1–45, Dragon Ball 1–42) phần lớn bán dạng combo. Năm xuất bản thiếu nhiều | Không chặn `/products`, chặn `/search` nên phải đi qua sitemap. `User-agent: *` không có Crawl-Delay (các mức 10 giây và 1 giây chỉ áp cho AhrefsBot, MJ12bot, Pinterest) | Ghi bản quyền trên toàn bộ chữ và ảnh |
| Tiki | **Dự phòng**: lấp các tập Kim Đồng không bán lẻ; là nguồn duy nhất của Thần đồng Đất Việt (NXB Phan Thị) | `/api/v2/products?q=` và `/api/v2/products/<id>`, không có tài liệu, không cần key | Rộng nhất: NXB, ngày xuất bản, số trang, ảnh 900x900. Nhiều nhiễu do combo và nhiều người bán. Thường thiếu ISBN | Không chặn `/api/v2/products` | Không đọc được (trang chỉ chạy bằng JS); coi như cũng có điều khoản sở hữu nội dung |
| Wikidata | Bổ trợ ở cấp bộ (tên tác giả chuẩn) | SPARQL | Không có bản ghi tiếng Việt cho từng tập | | CC0 |
| Fahasa | **Loại** | | | | Điều khoản cấm bot (đã trích nguyên văn) |
| Open Library, Google Books | **Loại** | | Open Library trượt mọi truy vấn mẫu. Google Books không có key thì quota bằng 0 | | |

Làm đàng hoàng: một kết nối, cách nhau ít nhất 2 giây, lùi dần khi gặp 429 hoặc 5xx, User-Agent chung chung (không tên, không email), cache HTTP trên đĩa để chạy lại không gọi mạng. Ước tính 400 Book × (1 JSON + 2–3 ảnh) ≈ 1.500 request, tức khoảng 50–60 phút cho lần chạy đầu.

Nội dung crawl về (mô tả, ảnh, file SQL dữ liệu sinh ra) **không vào git**. Nó nằm ở `data/` (bị ignore) và trong volume Docker. Repo chỉ giữ script và `manifest.jsonl`; manifest ghi URL nguồn, ngày tải, nguồn nào thắng khi gộp và mã băm ảnh, không chép nội dung. Flyway nạp migration dữ liệu từ một `location` trỏ vào volume. CI không cần dữ liệu này vì E2E dùng seed riêng (D3).

Gộp trùng: trước hết theo ISBN-13 đã chuẩn hoá. Không có ISBN thì theo tên bộ (bỏ dấu, có bảng bí danh) + số tập + biến thể (tái bản, bản đặc biệt). Khi trùng, Kim Đồng thắng Tiki, Tiki thắng Wikidata. Bỏ mọi sản phẩm combo, bộ, trọn bộ, set. Không bịa trường thiếu: `publishYear` lấy từ "Ngày xuất bản" của Tiki hoặc "(Tái bản YYYY)" trong tên; nếu vẫn thiếu thì ghi vào báo cáo validate.

Giai đoạn, mỗi bước một script chạy lại được, đọc và ghi trong `data/` (bị ignore, trừ manifest):
`crawl` (cache HTTP trên đĩa, có giới hạn tốc độ, User-Agent chung) → `clean` (NFC, chuẩn hoá tên tác giả, gộp trùng theo ISBN rồi theo tên đã chuẩn hoá) → `images` (WebP 160/320/640, có AVIF) → `price` → `copies` (1 đến 5 quyển, phân bố cố định theo seed) → `validate` (báo cáo thiếu trường, ảnh lỗi, trùng tên; dừng nếu vượt ngưỡng) → `export` (migration Flyway dữ liệu) và `manifest.jsonl` (nguồn của từng bản ghi và từng ảnh).
Chạy thử 10 đầu truyện, đưa bạn xem báo cáo validate và ảnh rồi mới crawl hết (đúng mục 6 và luật preview-first).

Quy tắc `rentalPrice` đề xuất, khớp số liệu ch.2 (tập thường 3.000đ, truyện dài/tập đặc biệt như "Nobita và lâu đài dưới đáy biển" 5.000đ):
- Cơ bản 3.000đ/ngày.
- Truyện dài, tập đặc biệt hoặc trên 200 trang: 5.000đ.
- Hiếm (xuất bản trước 2005 hoặc chỉ có 1 quyển): cộng 1.000đ.
Ghi vào `docs/data-pipeline.md`.

## 7. Giao diện "tiệm truyện đầu ngõ"

Font (cả bốn đã kiểm có subset `vietnamese` trên Google Fonts ngày 11/11/2026; tự host file woff2 latin và vietnamese, không gọi Google Fonts lúc chạy):

| Vai trò | Font | Dùng cho |
|---|---|---|
| Chữ thân | Be Vietnam Pro 400/500/600 | Bảng, form, đoạn văn |
| Đánh máy | Xanh Mono | Số phiếu, mã vạch, tiêu đề phiếu, chữ trong dấu |
| Bút bi | Patrick Hand | Ghi chú tay, tình trạng truyện, chữ kí nhân viên |
| Biển hiệu | Fraunces (trục "soft") | Tên tiệm, tiêu đề lớn |

Loại: Special Elite (không có subset vietnamese). Chỉ preload Be Vietnam Pro và Xanh Mono, hai font còn lại nạp lười. Test chụp màn hình chuỗi "Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan" ở cả bốn font.

Bảng màu (tỉ lệ tương phản đã đo theo WCAG trên ba nền `paper` / `paper-deep` / `tape`). Ba màu dấu đã làm đậm hơn bản nháp để chữ cỡ thường cũng đạt AA 4.5:1 trên cả ba nền:

| Token | Giá trị | Tương phản | Dùng cho |
|---|---|---|---|
| `--paper` | `#F3E6C8` | | Nền giấy ố |
| `--paper-deep` | `#E4CF9F` | | Mép giấy, thẻ |
| `--tape` | `#E9DDB0` | | Băng dính giấy |
| `--ink` | `#2B2118` | 12.72 / 10.29 / 11.57 | Chữ chính |
| `--ink-soft` | `#5C4A36` | 6.82 / 5.52 / 6.20 | Chữ phụ |
| `--pen-blue` | `#1F3F8F` | 7.83 / 6.34 / 7.13 | Nét bút bi, link |
| `--stamp-red` | `#A3221B` | 6.05 / 4.90 / 5.51 | Dấu "ĐÃ HUỶ", lỗi |
| `--stamp-green` | `#2A6334` | 5.78 / 4.68 / 5.26 | Dấu "ĐANG CHO THUÊ" |
| `--stamp-amber` | `#7F4B00` | 5.83 / 4.72 / 5.31 | Dấu "CHỜ NHẬN" |
| `--wood` | `#6B4226` | 6.97 với chữ `paper` | Kệ, quầy |
| `--lamp` | `#F6C453` | 5.32 trên `wood` | Ánh đèn vàng (chỉ trang trí) |

Dấu trạng thái luôn kèm chữ, không chỉ dựa vào màu.

Spacing theo bậc 4px (`--s-1` 4 … `--s-8` 64), bo góc tối đa 2px (giấy không bo tròn), bóng đổ lệch kiểu giấy đặt trên bàn thay cho bóng mờ.
Mỗi màn hình giữ đúng thành phần và thứ tự của bảng giao diện ch.2 và ch.9 (đã đối chiếu SVG). Phiếu mượn là tờ phiếu xé từ sổ, số phiếu đánh máy, dấu trạng thái. PrintRentalBillView dùng `@page { size: A5 }`.
3D: r3f, nạp lười sau khi trang đã vẽ ảnh tĩnh; không WebGL, giảm chuyển động hoặc máy yếu thì giữ ảnh tĩnh. Gáy truyện trên kệ 3D là gáy **tự vẽ** (màu, hoa văn, nhãn thể loại đánh máy), không dùng bìa crawl, logo NXB hay nhân vật có bản quyền (mục 5 của brief). Bìa thật chỉ hiện ở kết quả tìm, chi tiết đầu truyện và phiếu mượn. Bấm gáy truyện: rút quyển xuống rồi mở LoginView, như nút "Đăng nhập" (D10).

## 8. Hạ tầng, CI, bộ công cụ AI

### 8.1 Hạ tầng (mục 7 của brief)

- Compose: `app` (Tomcat 11, Java 25), `db` (MySQL 8.4), `redis`, `nginx` (reverse proxy, gzip và brotli, cache file tĩnh và `/covers`, security headers). Mỗi service có healthcheck. `db_data`, `redis_data`, `covers_data` là named volume.
- `compose.yaml` (chạy tại máy) + `compose.e2e.yaml` (E2E). Chủ dự án chốt ngày 11/11/2026: chỉ chạy localhost, không có prod (kế hoạch, Deferred #28). `.env.example` liệt kê mọi biến với giá trị giả; `.env` nằm trong `.gitignore`.
- GitHub Actions: lint (Java + frontend), build, unit, integration (Testcontainers), E2E Playwright chạy trên compose, build image, quét lỗ hổng image. Mỗi job có `timeout-minutes` (lint 5, unit 10, integration 20, E2E 45). Workflow PR có `concurrency` với `cancel-in-progress: true`. Không có cấu hình prod hay VPS (bỏ ngày 11/11/2026). Phiên bản action và image quét được tra lại ở phase 10.
- Cây thư mục (ghi vào `docs/architecture.md`): `src/main/java/.../{dao,model,filter,util}`, `src/main/webapp/{*.jsp, nhan-vien/, WEB-INF/{tags,web.xml}}`, `frontend/{islands,styles,three,lib}`, `src/main/resources/db/{migration,e2e}`, `pipeline/`, `docker/`, `nginx/`, `src/test/`, `e2e/`, `docs/`, `plans/`.

### 8.2 Bộ công cụ cho AI (mục 8 và 10 của brief; brief nói đây là phần cần làm kĩ nhất)

| Sản phẩm | Nội dung bắt buộc |
|---|---|
| `AGENTS.md` | Toàn văn: tổng quan, lệnh chạy, cây thư mục, kiến trúc JSP-DAO, toàn bộ hợp đồng nghiệp vụ (mục 2 ở trên), quy ước đặt tên, cách test, điều cấm (getById, DAO cho lớp trung gian, lưu thuộc tính dẫn xuất, sửa thông báo nguyên văn), và toàn văn mục 10 |
| `CLAUDE.md` | Nhập `@AGENTS.md` để không có hai bản lệch nhau, cộng phần chỉ Claude cần: MCP bắt buộc (Playwright, cua-driver, context7, và việc báo người dùng khởi động lại khi thiếu MCP), cách spawn với `model` và `effort` từ `CLAUDE_EFFORT`, và việc đọc lại sau compact |
| `.claude/rules/` | `tiem-business-contract.md`, `tiem-dao-rules.md`, `tiem-session-rules.md`, `tiem-ui-theme.md`, `tiem-cook-orchestration.md` (toàn văn mục 10) |
| `.claude/skills/` | `tiem-add-jsp-page`, `tiem-add-dao-duplicate-check`, `tiem-write-flyway-migration`, `tiem-add-crawl-source`, `tiem-create-react-island`, `tiem-create-nostalgia-component`, `tiem-write-e2e-chapter2`, `tiem-open-cook-session` (đọc agent map, giao lane, gom kết quả) |
| `.claude/agents/` | `tiem-contract-guard`: đọc diff, đối chiếu `docs/contracts.md`, báo vi phạm; chỉ đọc, không sửa code |
| `docs/` | `pdr.md`, `architecture.md`, `glossary.md` (từ điển Việt - Anh: phiếu mượn = RentalBill, giỏ truyện = Cart, quyển truyện = BookCopy...), `schema.md` (ERD bằng Mermaid), `page-flow.md` (luồng trang bằng Mermaid, theo ch.9 và ch.10), `contracts.md` (tên trang, field, thuộc tính session, chữ kí DAO, props của island), `design-tokens.md`, `data-pipeline.md`, `adr/` (mỗi lựa chọn công nghệ một ADR, có ADR-0002 cho D1) |

Chống lệch: toàn văn mục 10 xuất hiện ở cả `AGENTS.md` và `tiem-cook-orchestration.md` như brief yêu cầu, nên có một script kiểm hai khối trùng nhau từng byte, chạy trong CI.

Tên file của dự án trong `.claude/` mang tiền tố `tiem-` (chủ dự án chốt ngày 11/11/2026): repo public chỉ nhận file `tiem-*`, bộ kit trong `.claude/` bị ignore (kế hoạch, Deferred #4).

## 9. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Hai khách giữ cùng quyển | Cao | K1 và test tranh chấp (mục 4) |
| Island vô tình thành API riêng | Cao | Quy tắc mục 3, test ESLint chặn `fetch` trong `islands/` |
| Session cũ khi nhân viên và khách cùng thao tác một phiếu (khách huỷ đúng lúc nhân viên đang xử lí) | Trung bình | Cả ba trang gọi `updateRentalBill` (huỷ, sửa danh sách, xác nhận) đều xuất phát từ phiếu "Chờ nhận", nên trong transaction hàm khoá dòng phiếu và kiểm trạng thái trong DB vẫn là "Chờ nhận" rồi mới ghi. Thông báo theo trạng thái mới (D9) |
| Bản quyền nội dung crawl (Kim Đồng ghi bản quyền chữ và ảnh; chưa đọc được điều khoản của Tiki) | Cao | Chỉ dùng trong dự án riêng; nội dung không vào git; manifest ghi nguồn. Bạn đã chấp nhận rủi ro này (D11) |
| API của Tiki không có tài liệu nên có thể đổi hoặc bị chặn | Trung bình | Cache trên đĩa; pipeline báo lỗi rõ ràng chứ không lặng lẽ bỏ qua; Kim Đồng vẫn đủ phần lớn kho |
| Bộ dài cũ chỉ bán dạng combo, thiếu bìa từng tập | Trung bình | Lấy tập bán lẻ từ Tiki; tập nào thiếu bìa thì validate liệt kê, không ghép ảnh combo |
| `description varchar(255)` cắt mô tả | Thấp | Cắt theo câu |
| Redis session cần entity Serializable | Trung bình | Test serialize toàn bộ graph Cart, RentalBill |
| Lighthouse ≥ 90 với 3D | Trung bình | Ảnh tĩnh trước, 3D nạp lười, ngân sách JS |
| Font VN thiếu dấu | Trung bình | Chỉ dùng font có subset vietnamese, test chụp màn hình chữ "Đã huỷ, Ố vàng, Nguyễn Thu Hà" |

## 10. Tiêu chí nghiệm thu

1. 3 kịch bản chuẩn và mọi ngoại lệ ở ch.2 chạy đúng trên Playwright, dùng seed E2E, cả khổ điện thoại lẫn máy tính, console sạch, không request hỏng.
2. 28 thông báo khớp từng chữ.
3. Schema qua Flyway khớp ch.8 (trừ D1), có test so cột với tài liệu.
4. Không có `getById`, không có DAO cho SelectedBook/RentedBook/RentedDamage/RentalCollateral, không cột dẫn xuất (có test kiến trúc).
5. Test tranh chấp quyển đều xanh.
6. Mọi POST thiếu token CSRF bị chặn 403.
7. Lighthouse cấu hình điện thoại: cả bốn hạng mục ≥ 90 trên mọi trang có giao diện; tương phản AA; có `prefers-reduced-motion`; cảnh 3D có bản tĩnh.
8. Kho 300 đến 500 Book thật, có bìa, có manifest nguồn; báo cáo validate không lỗi chặn.
9. CI xanh: lint, build, unit, integration, E2E, quét image.

## 11. Để sau (ngoài phạm vi)

Trả truyện, phí phạt, thống kê. Không deploy: dự án chỉ chạy localhost (11/11/2026).

## 12. Thứ tự phase đề xuất cho `/t1k:plan`

**8 phase** (bạn yêu cầu ngày 11/11/2026, gộp từ 11 bước gợi ý ở mục 9 của brief, giữ thứ tự): (1) khung dự án và hạ tầng · (2) bộ công cụ AI · (3) schema, DAO và test DAO · (4) pipeline crawl và seed · (5) hệ thiết kế giao diện · (6) chức năng 1 và 2 · (7) chức năng 3 · (8) E2E, CI và hoàn thiện. Phase 4 và 5 độc lập với nhau nên chạy song song được. Mỗi phase ghi lane song song (tối đa 3) theo mục 10.

---

## Phụ lục A. Đối chiếu từng mục của brief

| Mục brief | Yêu cầu | Ở đâu |
|---|---|---|
| 1 | Đọc hết nguồn trước khi đề xuất; `D:\PTTK` chỉ đọc | Mục 0 |
| 2 | Đúng 3 chức năng M1 + phần lõi: dữ liệu crawl, dữ liệu mẫu (lỗi, loại tài sản, vài khách, nhân viên), trang quản trị | Mục 1 (D6), 5 (V2 seed), 6. Dữ liệu mẫu có thêm vài phiếu "Chờ nhận" và "Đang cho thuê" giữ hết quyển của một số đầu truyện, để màn hình có đủ cảnh hết truyện, còn ít, còn nhiều (mục 6 của brief) |
| 2 | Không làm trả truyện, phí phạt, thống kê | Mục 11 |
| 3 | 13 thực thể, quan hệ, trạng thái, bảng, cột, không lưu cột dẫn xuất, giữ rentalPrice chốt giá | Mục 2.1 |
| 3 | Kiểm quyển trống trong transaction có khoá dòng | Mục 4 |
| 3 | Luật DAO (cha giữ Connection, không DAO lớp trung gian, một hàm cập nhật, không getById, đăng nhập trả Client/Staff, danh sách kèm con, không gộp các cặp trông giống nhau) | Mục 2.3, tiêu chí 4 |
| 3 | Luật trang và session, bốn điều kiện xác nhận, 28 trang JSP đúng tên | Mục 2.2, 2.3; 28 tên trang chép nguyên vào `docs/contracts.md` |
| 3 | Thông báo nguyên văn | Mục 2.2 (đủ 28 câu, không chỉ 5 câu trong brief) |
| 4 | JSP + DAO + MySQL, không Servlet điều khiển, không Spring | Mục 5 |
| 4 | Phiên bản và lí do, tra từ nguồn chính thức | Mục 5. Lệch so với gợi ý của brief, là lựa chọn công nghệ chứ không phải nghiệp vụ: Jakarta EE 11 thay vì 10 (cho khớp Tomcat 11), Java 25 thay vì 21, JUnit 6 thay vì 5, Motion và không dùng GSAP |
| 4 | Filter UTF-8, phân quyền, CSRF, security headers; băm mật khẩu | Mục 5, D1 |
| 4 | Redis | D7 |
| 4 | React island dùng shadcn thật, Vite build Tailwind v4, so ít nhất 2 cách nối | Mục 3 (so 3 cách, chọn B) |
| 4 | Three.js (r3f) và GSAP hoặc Motion | Mục 5, 7 |
| 4 | JUnit + Testcontainers cho DAO, Vitest cho island, Playwright đi 3 kịch bản ch.2 | Mục 5, tiêu chí 1 |
| 5 | Giữ thành phần và thứ tự màn hình; hình thức mới theo chủ đề | Mục 7 |
| 5 | Cảnh 3D: kệ gỗ, đèn vàng, **quạt trần quay chậm**, rê chuột gáy nhô ra, bấm rút quyển | Mục 7; quạt trần đưa vào phase hệ thiết kế; bấm gáy truyện theo D10 |
| 5 | Chất liệu giấy ố, mép sờn, chữ đánh máy, bút bi xanh, dấu đỏ, băng dính giấy; chồng truyện buộc dây; phiếu xé từ sổ có dấu trạng thái; bàn quầy có sổ, ngăn kéo cọc, tem tình trạng | Mục 3 (các island), 7 |
| 5 | In phiếu khổ A5 bằng CSS in | Mục 7 |
| 5 | Bảng màu, font, spacing cụ thể; font có subset vietnamese; chữ toàn tiếng Việt; tránh giao diện AI rập khuôn | Mục 7 |
| 5 | Bìa thật chỉ ở chỗ hiện dữ liệu; trang trí tự vẽ | Mục 7 |
| 5 | Giảm chuyển động, 3D có bản tĩnh, điện thoại, AA, Lighthouse ≥ 90 | Mục 7, tiêu chí 7 |
| 6 | Dữ liệu thật, 300–500 Book, đủ cột tblBook, ảnh bìa và ảnh phụ, quy tắc rentalPrice ghi docs, mỗi Book 1–5 BookCopy | Mục 6, D2, D4 |
| 6 | So nguồn, ưu tiên API, robots.txt và điều khoản, giới hạn tốc độ, UA chung chung, cache | Mục 6 |
| 6 | Pipeline tách bước, chạy lại được; NFC, gộp trùng, sửa tên tác giả; WebP/AVIF nhiều cỡ; xuất migration riêng; manifest; ảnh ngoài git; Nginx cache dài | Mục 6, D2 |
| 6 | Bước validate in báo cáo; chạy thử 10 đầu truyện, cho xem rồi mới crawl hết | Mục 6 |
| 7 | Compose 4 service, healthcheck, named volume, dev/prod, `.env.example`, Actions đủ job, timeout, concurrency, cấu hình VPS chưa deploy, cây thư mục | Mục 8.1. Chủ dự án bỏ dev/prod và cấu hình VPS ngày 11/11/2026, chỉ chạy localhost (kế hoạch, Deferred #28) |
| 8 | CLAUDE.md, AGENTS.md, rules, skills, agents, docs | Mục 8.2 |
| 9 | Hỏi bằng câu hỏi lựa chọn; báo cáo brainstorm; sau khi duyệt chạy `/t1k:plan`, mỗi phase một file có mục tiêu, file sẽ tạo, tiêu chí xong, lệnh kiểm, lane | Mục 1, file này, mục 12 |
| 10 | Playwright MCP sau mỗi trang (kịch bản và ngoại lệ ch.2, ảnh khổ điện thoại và máy tính, console và network sạch) | Ghi vào `tiem-cook-orchestration.md`; ba MCP đều đã nạp trong phiên này |
| 10 | cua-driver cho phần mềm có giao diện (ví dụ MySQL Workbench reverse engineer schema rồi so ERD ch.8), dòng lệnh trước, `verify_state` sau mỗi lần bấm | Phase schema. Chưa kiểm máy đã cài MySQL Workbench chưa, sẽ kiểm ở phase đó |
| 10 | context7; MCP thiếu thì báo khởi động lại | `CLAUDE.md` |
| 10 | Orchestrator, agent map, model và effort truyền rõ, tối đa 3 agent cùng lúc, agent con không spawn, chốt hợp đồng trước khi chia song song, worktree hoặc danh sách file riêng, file dùng chung chỉ orchestrator sửa | `tiem-cook-orchestration.md`, `AGENTS.md`, `CLAUDE.md` |
| 10 | Giữ bối cảnh khi compact, brief ngắn, kết quả chi tiết ghi vào `plans/reports/`, đánh dấu trong file phase, handoff | Như trên |
| 10 | Chạy nền, không ngồi chờ, không sleep để hỏi trạng thái | Như trên |
| 11 | Không publish lên cloud, không Artifact hay Claude Doc | Mọi sản phẩm là file cục bộ |
| 11 | Git remote SSH, chỉ push khi bạn bảo | Theo lời bạn ngày 11/11/2026: repo public `Nghaiz/Analysis_And_Design_Mangastore`, commit gốc đã push; quyền push nhánh phase, mở PR và merge sau Accept ghi ở kế hoạch (Deferred #3) |
| 11 | Không đoán nghiệp vụ | Mục 1: 11 quyết định D1–D11, tất cả đều hỏi bạn |
| 11 | Phiên bản tra từ context7 hoặc trang chính thức | Mục 5; công cụ tra tài liệu của context7 không chạy được trong agent nghiên cứu, nên mọi số liệu lấy từ trang chính thức và registry |
