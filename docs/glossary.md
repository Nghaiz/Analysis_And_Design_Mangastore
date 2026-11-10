# Từ điển Việt - Anh

<!-- updated 261111 -->

Tên tiếng Anh là tên dùng trong code (lớp, bảng, cột, field form, thuộc tính session); chữ tiếng Việt là chữ trên giao diện và trong báo cáo. Định nghĩa nghiệp vụ đầy đủ: [`docs/contracts.md`](contracts.md). Chính tả theo báo cáo: "kí", "lí", "huỷ" (Đăng kí, Quản lí, xử lí, Huỷ phiếu).

## 1. Thực thể

| Tiếng Việt | Lớp | Bảng | Ghi chú |
|---|---|---|---|
| Người dùng | `User` | `tblUser` | Lớp cha của Client và Staff |
| Khách hàng (khách hàng thành viên) | `Client` | `tblClient` | Kế thừa User |
| Nhân viên | `Staff` | `tblStaff` | Kế thừa User; `position` là chức vụ |
| Đầu truyện | `Book` | `tblBook` | Một tập truyện cụ thể, ví dụ "Thám tử lừng danh Conan tập 1" |
| Quyển truyện | `BookCopy` | `tblBookCopy` | Một quyển vật lí của đầu truyện, có mã vạch riêng |
| Lỗi (loại lỗi) | `Damage` | `tblDamage` | Ví dụ "Rách bìa", "Ố vàng" |
| Loại tài sản cọc (loại tài sản thế chấp) | `Collateral` | `tblCollateral` | Ví dụ "Căn cước công dân", "Tiền mặt" |
| Giỏ truyện | `Cart` | `tblCart` | Mỗi khách một giỏ |
| Truyện đã chọn (một dòng giỏ) | `SelectedBook` | `tblSelectedBook` | Một dòng là **một quyển**, không có số lượng |
| Phiếu mượn | `RentalBill` | `tblRentalBill` | |
| Quyển đã giao (một dòng phiếu) | `RentedBook` | `tblRentedBook` | Quyển thực giao, giữ giá chốt `rentalPrice` |
| Lỗi của quyển đã giao | `RentedDamage` | `tblRentedDamage` | Lỗi ghi nhận cho một quyển khi giao |
| Khoản cọc (khoản đặt cọc) | `RentalCollateral` | `tblRentalCollateral` | Một tài sản khách để lại khi nhận truyện |

Không có DAO cho `SelectedBook`, `RentedBook`, `RentedDamage`, `RentalCollateral` (lớp trung gian phụ thuộc): thao tác qua `CartDAO.updateCart`, `RentalBillDAO.updateRentalBill`.

## 2. Thuộc tính

| Tiếng Việt (nhãn trên giao diện) | Tên trong code | Thuộc |
|---|---|---|
| Họ và tên | `fullName` | User |
| Tên đăng nhập | `username` | User |
| Mật khẩu | `password` | User (chuỗi băm Argon2id) |
| Ngày sinh | `dob` | Client |
| Số CCCD | `idCard` | Client |
| Số điện thoại | `phone` | Client |
| Email | `email` | Client |
| Địa chỉ | `address` | Client |
| Chức vụ | `position` | Staff |
| Mã đầu truyện | `DT` + `id` 3 chữ số (chỉ hiển thị) | Book |
| Tên đầu truyện | `name` | Book |
| Tác giả | `author` | Book |
| Nhà xuất bản | `publisher` | Book |
| Năm xuất bản | `publishYear` | Book |
| Thể loại | `category` | Book |
| Mô tả | `description` | Book, Damage, Collateral |
| Giá thuê theo ngày | `rentalPrice` | Book; RentedBook (giá chốt) |
| Mã vạch | `barcode` | BookCopy (lưu thật, ví dụ `DT001-03`) |
| Mã phiếu mượn | `PM` + `id` 4 chữ số (chỉ hiển thị) | RentalBill |
| Ngày giờ tạo phiếu | `createdAt` | RentalBill |
| Ngày giờ dự kiến đến nhận | `expectedPickupAt` | RentalBill |
| Số ngày thuê dự kiến | `expectedDays` | RentalBill |
| Ngày mượn | `borrowDate` | RentalBill |
| Ngày hẹn trả | `dueDate` | RentalBill |
| Giảm giá | `discount` | RentalBill |
| Ghi chú | `note` | RentalBill, RentedDamage, RentalCollateral |
| Trạng thái | `status` | RentalBill |
| Lí do huỷ | `cancelReason` | RentalBill |
| Nhân viên xử lí | `staff` (cột `staffId`) | RentalBill |
| Tình trạng khi giao (ghi chú tình trạng) | `conditionNote` | RentedBook |
| Giá trị (của khoản cọc) | `value` | RentalCollateral |
| Số lượng, Tổng số quyển, Tổng tiền, Tổng tiền thuê, Số lượng hiện có | không lưu, tính lúc hiển thị | |

## 3. Giá trị trạng thái và hằng chuỗi

Chuỗi trong DB và code đúng từng kí tự theo `docs/contracts.md` mục 4. Cột tiếng Anh chỉ để giải nghĩa, không dùng làm giá trị.

| Giá trị | Nghĩa | Dấu trên giao diện |
|---|---|---|
| `Chờ nhận` | Phiếu đã tạo, chờ khách đến quầy (pending pickup) | `CHỜ NHẬN` |
| `Đang cho thuê` | Đã giao truyện (on rent) | `ĐANG CHO THUÊ` |
| `Đã huỷ` | Khách hoặc nhân viên đã huỷ (cancelled) | `ĐÃ HUỶ` |
| `Nhân viên bán hàng` | Chức vụ nhân viên quầy (sales staff) | |
| `Quản lí` | Chức vụ được vào trang quản trị D6 (manager) | |

Trạng thái của quyển **không lưu**: "đang sẵn sàng" (available) là chưa có dòng phiếu chưa huỷ nào trỏ vào; "bận" (held) là ngược lại.

## 4. Chữ trên giao diện

| Chữ | Tên field | Trang |
|---|---|---|
| Đăng kí | `lnkRegister`, `btnRegister` | HomeView, RegisterView |
| Đăng nhập | `lnkLogin`, `btnLogin` | HomeView, LoginView |
| Tìm | `btnSearch` (ô `txtKeyword`) | SearchBookView, SearchRentalBillView, AddRentedBookView, AddConditionView, AddRentalCollateralView |
| Tìm và thuê truyện | `lnkSearchBook` | ClientHomeView |
| Phiếu mượn của tôi | `lnkViewRentalBill` | ClientHomeView |
| Thêm vào truyện đã chọn | `btnAddToSelectedList` (ô `txtQuantity`) | BookDetailView |
| Chọn (ô tích) | `chkSelectedBook` | SearchBookView |
| Xoá | `lnkDeleteSelectedBook`, `lnkDeleteRentedBook`, `lnkDeleteRentedDamage`, `lnkDeleteRentalCollateral` | nhiều trang |
| Tạo phiếu mượn | `btnCreateRentalBill` | SearchBookView |
| Xác nhận | `btnConfirm`; trong hộp huỷ `btnConfirmCancel` | ConfirmRentalBillView; hộp huỷ |
| Huỷ (đóng hộp) | `btnCloseCancel` | hộp xác nhận huỷ |
| Quay lại | `lnkBack` | nhiều trang |
| Xem chi tiết | `lnkViewDetail` | RentalBillListView |
| Huỷ phiếu, Huỷ phiếu mượn | `lnkCancelRentalBill`, `btnCancel` (ô `txtCancelReason`) | RentalBillListView, ProcessRentalBillView |
| Xử lí phiếu mượn | `lnkProcessRentalBill` | StaffHomeView |
| Nhận (ô tích) | `chkReceived` | ProcessRentalBillView |
| Thêm tình trạng | `lnkAddCondition` | ProcessRentalBillView |
| Chỉnh sửa danh sách truyện | `lnkEditRentedBookList` | ProcessRentalBillView |
| Thêm khoản cọc | `lnkAddRentalCollateral` | ProcessRentalBillView |
| Xác nhận và in phiếu mượn | `btnConfirm` | ProcessRentalBillView |
| Thêm truyện | `lnkAddBook` | EditRentedBookListView |
| Thêm vào phiếu mượn | `btnAddToRentalBill` | AddRentedBookView |
| Lưu, Lưu tình trạng | `btnSave` | EditRentedBookListView, AddConditionView, AddDamageView, AddRentalCollateralView, AddCollateralView |
| Thêm lỗi mới | `lnkAddDamage` | AddConditionView |
| Thêm loại tài sản mới | `lnkAddCollateral` | AddRentalCollateralView |
| In phiếu | `btnPrint` | PrintRentalBillView |
| OK | nút đóng hộp thông báo | mọi trang xem |

Danh sách đủ field từng trang: `docs/contracts.md` mục 9.2; tên ch.9 không đặt: mục 14, C1.

## 5. Thuật ngữ kĩ thuật của dự án

| Thuật ngữ | Nghĩa |
|---|---|
| Trang xem (`XxxView.jsp`) | Trang có giao diện, chỉ gọi DAO đọc |
| Trang xử lí (`doXxx.jsp`) | Trang không giao diện, mọi lần ghi DB |
| Gửi về chính trang | Form không có `formaction`, trang tự xử lí (tìm, đăng nhập, sửa bản sao trong session) |
| Thuộc tính session | Một trong 12 tên ở `docs/contracts.md` mục 7 |
| Bản sao (`rentedBook`, `listRentedBook`) | Bản riêng trong session, chỉ thay vào `rentalBill` khi bấm "Lưu" |
| Island | Khối React mount trong form JSP, chỉ đổi input thật ([ADR-0004](adr/0004-island-cach-b.md)) |
| K1 | Khoá dòng `tblBook` khi giữ quyển ([ADR-0005](adr/0005-khoa-k1-dong-dau-truyen.md)) |
| D9 | Phiếu đổi trạng thái giữa chừng; `updateRentalBill` trả `false` |
| D1–D11 | Quyết định của brainstorm (`plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` §1) |
| Deferred #N | Quyết định ở `plans/261111-tiem-thue-truyen/plan.md` mục Deferred decisions |
| C1–C13 | Điểm báo cáo không trả lời, đã chốt ở `docs/contracts.md` mục 14 |
| Seed E2E | Dữ liệu `db/e2e` dựng y hệt ch.2 (D3), khác kho crawl |
| Tiền tố field | `txt` ô nhập, `btn` nút gửi, `lnk` link hoặc nút trên dòng, `tbl` bảng, `chk` ô tích |
