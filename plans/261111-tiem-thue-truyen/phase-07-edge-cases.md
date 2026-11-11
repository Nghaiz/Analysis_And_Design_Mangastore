# Phase 7: edge case của chức năng 3 (M3) và trang quản trị D6

Owner: orchestrator phase 7 (phiên 93), lập 11/11/2026 theo yêu cầu của chủ dự án: bao quát mọi ngoại lệ của ch.2 mục 2.3 và thêm các trường hợp hay gặp ở quầy mà báo cáo không có. Bổ sung cho `docs/contracts.md` (thắng về nghiệp vụ), `phase-07-chuc-nang-3.md` và `phase-06-integration.md` §6.1 (mục "Chung" áp cho mọi trang M3: session hết hạn, không 500, escape, trim + NFC, bấm hai lần, id sửa tay). Lane thấy thiếu hay mâu thuẫn: dừng, ghi vào báo cáo.

**Không trường hợp nào được ra trang 500, stack trace, hay ghi DB sai.**

## 1. Quyết định của chủ dự án (11/11/2026)

- Thêm 5 câu báo **ngoài báo cáo** (hằng trong `vn.tiemtruyen.util.Messages`; phiên phase 6 ghi vào `docs/contracts.md` §10 và `MessagesTest`, phase 7 merge SHA đó rồi mới dùng hằng):

| Hằng | Câu |
|---|---|
| `DISCOUNT_INVALID` | Giảm giá không hợp lệ, vui lòng nhập lại. |
| `QUANTITY_INVALID` | Số lượng phải là số nguyên lớn hơn hoặc bằng 1. |
| `BOOK_NOT_CHOSEN` | Vui lòng chọn đầu truyện. |
| `INPUT_TOO_LONG` | Nội dung nhập quá dài, vui lòng rút gọn. |
| `RENTAL_BILL_CHANGED` | Phiếu mượn đang mở đã thay đổi, vui lòng chọn lại phiếu. |

  C10 đổi: lỗi nhập có câu riêng thì hiện câu đó và đặt `aria-invalid="true"` trên ô, giữ giá trị cũ trong session.
- Phiếu "Chờ nhận" đã quá giờ hẹn: **không** xử lí riêng (không nhãn, không tự huỷ); nhân viên xử lí hoặc huỷ như phiếu thường.

## 2. Ngoại lệ của ch.2 mục 2.3 (đủ, smoke `scripts/smoke/flow-m3.mjs`)

| Ngoại lệ | Nội dung | Ở smoke |
|---|---|---|
| 2 | Đăng nhập sai rồi đúng | có |
| 6 | Tìm PM0152 không thấy, tìm theo CCCD ra PM0125, PM0117, PM0110 | có |
| 11 | Sửa danh sách: bỏ quyển, thêm Doraemon - Tập 2 (DT002-01), "Lưu" giữ quyển mới | có (trên PM0126) |
| 12 | Huỷ phiếu tại quầy kèm lí do | có (trên PM0126) |
| 19 | Tìm "Ố vàng" không thấy, thêm lỗi mới, ghi chú | có |
| 37 | Tìm "Thẻ sinh viên" không thấy, thêm loại tài sản mới, nhập giá trị | có |
| D9 | Chọn phiếu đã huỷ / đã giao; phiên khác lưu phiếu vừa bị giao / huỷ | có |
| Bốn điều kiện xác nhận | lần lượt từng điều kiện sai | có |

## 3. Trường hợp ngoài báo cáo

### 3.1 Session, điều hướng, bấm lặp (lane 7A, 7B theo trang mình sở hữu)

Thứ tự kiểm ở đầu mỗi trang M3 (trước mọi xử lí nút): (1) session thiếu thuộc tính cần đọc → chuyển trang; (2) `rentalBill` không còn "Chờ nhận" → câu D9 (áp cả khi mở trang bằng GET); (3) `rentalBillId` gửi lên thiếu hoặc khác id của `rentalBill` → `RENTAL_BILL_CHANGED`.

| Trường hợp | Xử lí |
|---|---|
| Mở `ProcessRentalBillView`, `EditRentedBookListView`, `AddRentedBookView`, `AddRentalCollateralView`, `AddCollateralView`, `PrintRentalBillView` hay `doUpdateRentalBill`, `doUpdateRentedBookList` khi session không có `rentalBill` | 302 về `SearchRentalBillView.jsp` |
| Mở `AddConditionView`, `AddDamageView`, `doAddDamage` khi không có `rentedBook` | 302 về `ProcessRentalBillView.jsp` (không có `rentalBill` thì về `SearchRentalBillView.jsp`) |
| Mở `AddRentedBookView`, `doUpdateRentedBookList` khi không có `listRentedBook` | 302 về `EditRentedBookListView.jsp` (trang đó chép lại từ `rentalBill`) |
| `doAddCollateral` khi không có `listRentalCollateral` | tạo danh sách mới (§9.2), không 500 |
| `rentalBill` trong session không còn "Chờ nhận" (Back sau khi xác nhận hoặc huỷ, rồi gửi lại form của Process, Edit, AddCondition, AddRentalCollateral) | không ghi gì; forward tới `SearchRentalBillView.jsp` kèm request attribute `message` = câu D9 theo trạng thái (`RENTAL_BILL_ALREADY_PROCESSED` / `RENTAL_BILL_CANCELLED`); request forward chỉ hiển thị (`phase-06-integration.md` §3) |
| `PrintRentalBillView` khi `rentalBill` chưa "Đang cho thuê" | 302 về `ProcessRentalBillView.jsp` |
| Bấm "Xác nhận và in phiếu mượn" hai lần, F5 trên kết quả | `doUpdateRentalBill` kết thúc bằng `sendRedirect` sang `PrintRentalBillView.jsp` (PRG, không forward) nên F5 chỉ tải lại trang in; lần gửi thứ hai (Back rồi gửi) ra nhánh D9 `RENTAL_BILL_ALREADY_PROCESSED`, DB không đổi |
| Bấm "In phiếu" hai lần | trang in không ghi DB; lần hai chỉ mở lại StaffHomeView |
| Hai thẻ trình duyệt cùng phiên nhân viên mở hai phiếu khác nhau (session chỉ giữ một `rentalBill`) | mọi form của Process, Edit, AddRentedBook, AddCondition, AddDamage, AddRentalCollateral, AddCollateral có input ẩn `rentalBillId`; khác id của `rentalBill` trong session → không ghi gì, forward tới `ProcessRentalBillView.jsp` kèm `message` = `RENTAL_BILL_CHANGED` (trang hiện phiếu đang có trong session) |
| Hai nhân viên cùng sửa danh sách quyển của một phiếu | `updateRentalBill` khoá dòng phiếu (D9) và K1: lần lưu sau vẫn đúng hoặc `NOT_ENOUGH_COPIES`; không 500, không giữ một quyển cho hai phiếu |
| Quyển vừa thêm tại quầy bị phiếu khác giữ trước khi "Lưu" | K1 đổi quyển cùng đầu truyện; không đủ thì `NOT_ENOUGH_COPIES`, `rentalBill` giữ danh sách cũ |
| Session hết hạn khi đang xử lí (POST) | `phase-06-integration.md` §6.1: 302 về `/nhan-vien/LoginView.jsp`, không ghi gì |

### 3.2 Dữ liệu nhập

| Ô | Trường hợp | Xử lí |
|---|---|---|
| `txtKeyword` (Search, AddRentedBook, AddCondition, AddRentalCollateral) | trống hoặc chỉ dấu cách | C9: câu "không tìm thấy" của trang, không gọi DAO |
| | dài quá 100 kí tự | cắt còn 100 |
| | `pm0125`, ` PM0125 `, `PM125` | C9 (khớp id, không phân biệt hoa thường; trim) |
| | không dấu, khác hoa thường (`ran bia`, `TIEN MAT`) | khớp như có dấu (collation `utf8mb4_0900_ai_ci`) |
| `txtDiscount` | trống | coi là 0 |
| | chữ, âm, thập phân lẻ đồng, lớn hơn tổng tiền các quyển đang tích | `DISCOUNT_INVALID`, `aria-invalid`, giữ giảm giá cũ |
| | `2.000`, `2000đ`, `2 000` | bỏ dấu chấm, dấu cách và hậu tố `đ` rồi đọc số |
| | bỏ tích làm tổng nhỏ hơn giảm giá đang có | lần gửi về đó vẫn nhận ô tích, hiện `DISCOUNT_INVALID` trên ô giảm giá; `doUpdateRentalBill` kiểm thêm giảm giá ≤ tổng **sau** bốn điều kiện (thứ tự của chúng không đổi), sai thì `DISCOUNT_INVALID`, không ghi |
| `txtDueDate` | trống, sai dạng, ngày không có (`2026-02-30`) | `DUE_DATE_INVALID`, giữ ngày cũ |
| | bằng hoặc trước ngày mượn | `DUE_DATE_INVALID` (§9.2) |
| `txtBorrowDate` | gửi giá trị khác (sửa HTML) | bỏ qua, ngày mượn không sửa được (C7) |
| `chkReceived` | mã vạch không có trong phiếu | bỏ qua mã đó |
| `txtNote`, `txtCancelReason`, `txtConditionNote`, `txtDamageNote`, `txtCollateralNote`, `txtDescription` | dài quá 255 | `INPUT_TOO_LONG`, `aria-invalid`, giữ chữ đã nhập; ô có `maxlength="255"` |
| `txtCollateralValue` | trống hoặc chỉ dấu cách | `COLLATERAL_VALUE_REQUIRED` |
| | dài quá 100 | `INPUT_TOO_LONG`; ô có `maxlength="100"` |
| `txtName` (AddDamage, AddCollateral) | chỉ dấu cách | `DAMAGE_NAME_REQUIRED` / `COLLATERAL_NAME_REQUIRED` |
| | dài quá 100 | `INPUT_TOO_LONG`; `maxlength="100"` |
| | trùng khi khác hoa thường hay dấu (`rach bia`), hai nhân viên thêm cùng lúc | UNIQUE + collation: `DAMAGE_EXISTS` / `COLLATERAL_EXISTS` |
| `txtQuantity` (AddRentedBook) | trống, 0, âm, thập phân, chữ, quá `int` | `QUANTITY_INVALID`, `aria-invalid` |
| | vượt số quyển sẵn sàng chưa có trong `listRentedBook` (kể cả 0) | `QUANTITY_EXCEEDED` "(hiện còn N quyển)" |
| `lnkChooseBook` (AddRentedBook) | không chọn dòng nào khi "Thêm vào phiếu mượn" | `BOOK_NOT_CHOSEN` |
| | id không có trong `listBook` | bỏ qua, hiện lại trang |
| `lnkChooseDamage`, `lnkDeleteRentedDamage`, `lnkChooseCollateral`, `lnkDeleteRentalCollateral`, `lnkAddCondition`, `lnkDeleteRentedBook`, `lnkChooseRentalBill` | không phải số / không có trong danh sách của session | bỏ qua, hiện lại trang (không đọc phiếu ngoài `listRentalBill`) |
| Số ô `txtDamageNote`, `txtCollateralValue`, `txtCollateralNote` khác số dòng | thiếu thì coi là trống, thừa thì bỏ |

### 3.3 Nghiệp vụ tại quầy

| Trường hợp | Xử lí |
|---|---|
| "Lưu" danh sách truyện khi đã xoá hết quyển | `NO_COPY_RECEIVED`, hiện lại `EditRentedBookListView`, không ghi DB |
| Thêm lại đúng quyển vừa xoá khỏi danh sách | được; quyển chọn theo §6.2 (id nhỏ nhất còn trống) |
| Quyển bỏ tích "Nhận" đã có tình trạng | khi xác nhận bỏ cả quyển và các dòng lỗi của nó (§9.2 doUpdateRentalBill) |
| Xoá hết khoản cọc trên bàn quầy rồi xác nhận | `COLLATERAL_MISSING` |
| Hai khoản cọc cùng loại tài sản (hai lần "Tiền mặt") | cho phép (báo cáo không cấm) |
| Loại lỗi đã ghi rồi bị chọn lại | `DAMAGE_ALREADY_RECORDED` |
| Lỗi mới tạo ở AddDamageView mà nhân viên "Quay lại" không lưu tình trạng | loại lỗi vẫn ở DB (danh mục), quyển không có lỗi đó |
| Phiếu có nhiều đầu truyện làm bản in dài | `print.css` giảm cỡ chữ theo số dòng; vẫn một trang A5 (7E kiểm với phiếu 6 đầu truyện) |
| Nhân viên "Quản lí" xử lí phiếu | được, như nhân viên bán hàng |
| Nhân viên mở trang khách (`/SearchBookView.jsp`…) | 302 `/LoginView.jsp` (AuthFilter, hai vai tách) |

### 3.4 Trang quản trị D6 (lane 7D)

| Trường hợp | Xử lí |
|---|---|
| Nhân viên thường mở `/nhan-vien/quan-tri/*` | 403 |
| `txtName`, `txtAuthor`, `txtCategory`, `txtRentalPrice` trống | `aria-invalid` từng ô, không gọi DAO (C10; không có câu riêng) |
| `txtRentalPrice` âm, chữ, 0 | `aria-invalid` |
| `txtPublishYear` trống | NULL (C11); chữ, trước 1900, sau năm nay → `aria-invalid` |
| `txtCopyCount` trống | 0 quyển; âm, chữ, thập phân, > 99 → `QUANTITY_INVALID` (0 được ở EditBook nghĩa là không thêm) |
| Ô vượt độ dài cột (§2) | `INPUT_TOO_LONG` |
| Hai đầu truyện cùng tên | cho phép (tblBook không UNIQUE tên) |
| EditBookView khi không có `book` | 302 `ManageBookView.jsp` |
| Barcode quyển mới | D8: tiếp số lớn nhất hiện có của đầu truyện (`updateBook` đánh số, phase 4b) |
