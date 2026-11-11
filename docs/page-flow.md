# Luồng trang

<!-- updated 261111 -->

Luồng giữa các trang JSP của ba chức năng, theo ch.9 và ch.10. Tên trang, field, thuộc tính session và thông báo là của [`docs/contracts.md`](contracts.md) mục 9 (chi tiết từng trang) và mục 10 (tên hằng thông báo); sơ đồ chỉ tóm tắt đường đi, không thay hợp đồng. Hai file lệch nhau thì `contracts.md` thắng.

Module theo tên ảnh màn hình `images/svg/ui_m*_*.svg`: **M1** đăng kí, **M2** tìm và chọn truyện trực tuyến, **M3** nhận truyện tại quầy.

Kí hiệu:

- Hình chữ nhật: trang xem `XxxView.jsp`. Hình viên thuốc: trang xử lí `doXxx.jsp` (không giao diện, mọi lần ghi DB).
- Nhãn cạnh là field được bấm (`lnk…`, `btn…`) hoặc kết quả; chữ in hoa là hằng thông báo của `Messages`.
- Vòng về chính trang: trang gửi về chính nó (tìm, đăng nhập, sửa bản sao trong session).
- Đường dẫn: trang M1, M2 ở gốc web; trang M3 ở `/nhan-vien/`; `doCancelRentalBill.jsp` một file ở gốc, khách và nhân viên dùng chung (Deferred #13).

## M1. Khách hàng đăng kí

```mermaid
flowchart TD
    HV["HomeView.jsp"]
    RV["RegisterView.jsp"]
    DR(["doRegister.jsp"])
    LV["LoginView.jsp"]
    CH["ClientHomeView.jsp"]

    HV -->|"lnkRegister"| RV
    HV -->|"lnkLogin, gáy truyện trên kệ 3D (D10)"| LV
    RV -->|"btnRegister"| DR
    DR -->|"REGISTER_INVALID, REGISTER_PASSWORD_MISMATCH, REGISTER_DUPLICATE"| RV
    DR -->|"addClient true: REGISTER_SUCCESS"| LV
    LV -->|"btnLogin, checkLogin null: LOGIN_FAILED"| LV
    LV -->|"btnLogin, ClientDAO.checkLogin trả Client"| CH
```

- doRegister ghi `client` (không có mật khẩu, `id = 0`) để RegisterView điền lại khi lỗi; thành công thì bỏ `client` (C5).
- Đăng nhập sai nhiều lần bị chặn vẫn báo `LOGIN_FAILED` (Deferred #23).

## M2. Khách hàng tìm và chọn truyện muốn thuê trực tuyến

```mermaid
flowchart TD
    CH["ClientHomeView.jsp"]
    SB["SearchBookView.jsp"]
    BD["BookDetailView.jsp"]
    DAS(["doAddSelectedBook.jsp"])
    DDS(["doDeleteSelectedBook.jsp"])
    CR["ConfirmRentalBillView.jsp"]
    DAR(["doAddRentalBill.jsp"])
    RL["RentalBillListView.jsp"]
    RD["RentalBillDetailView.jsp"]
    DC(["doCancelRentalBill.jsp"])

    CH -->|"lnkSearchBook (lần đầu: getCart, tạo rentalBill)"| SB
    SB -->|"btnSearch: searchBook, rỗng thì BOOK_NOT_FOUND"| SB
    SB -->|"lnkChooseBook: ghi book"| BD
    BD -->|"lnkBack"| SB
    BD -->|"btnAddToSelectedList"| DAS
    DAS -->|"QUANTITY_EXCEEDED"| BD
    DAS -->|"updateCart"| SB
    SB -->|"lnkDeleteSelectedBook: ghi book"| DDS
    DDS -->|"updateCart"| SB
    SB -->|"btnCreateRentalBill: điền rentalBill"| CR
    CR -->|"txtExpectedDays: tính lại tổng"| CR
    CR -->|"lnkBack"| SB
    CR -->|"btnConfirm"| DAR
    DAR -->|"EXPECTED_DAYS_INVALID, PICKUP_TIME_INVALID, NOT_ENOUGH_COPIES"| CR
    DAR -->|"addRentalBill true: RENTAL_BILL_CREATED"| CH

    CH -->|"lnkViewRentalBill"| RL
    RL -->|"lần đầu: getRentalBillList"| RL
    RL -->|"lnkViewDetail: ghi rentalBill"| RD
    RD -->|"lnkBack"| RL
    RL -->|"lnkCancelRentalBill: hộp CANCEL_CONFIRM"| RL
    RL -->|"btnConfirmCancel"| DC
    DC -->|"true: CANCEL_SUCCESS"| RL
    DC -->|"false (D9): RENTAL_BILL_CANCELLED, RENTAL_BILL_ALREADY_PROCESSED"| RL
```

- Session chỉ giữ `cart` và `rentalBill` trong lúc khách đang chọn; doAddRentalBill bỏ cả hai khi thành công.
- Nút "Huỷ phiếu" chỉ có ở phiếu "Chờ nhận"; quay lại RentalBillListView từ trang con thì hiện `listRentalBill` trong session, không đọc lại DB.

## M3. Khách hàng đến nhận truyện tại quầy

```mermaid
flowchart TD
    SL["LoginView.jsp (chung, C23)"]
    SH["StaffHomeView.jsp"]
    SR["SearchRentalBillView.jsp"]
    PR["ProcessRentalBillView.jsp"]
    ER["EditRentedBookListView.jsp"]
    AR["AddRentedBookView.jsp"]
    DUL(["doUpdateRentedBookList.jsp"])
    AC["AddConditionView.jsp"]
    AD["AddDamageView.jsp"]
    DAD(["doAddDamage.jsp"])
    ARC["AddRentalCollateralView.jsp"]
    ACO["AddCollateralView.jsp"]
    DACO(["doAddCollateral.jsp"])
    DUR(["doUpdateRentalBill.jsp"])
    PP["PrintRentalBillView.jsp"]
    DC(["doCancelRentalBill.jsp"])

    SL -->|"btnLogin, checkLogin null: LOGIN_FAILED"| SL
    SL -->|"btnLogin, StaffDAO.checkLogin trả Staff"| SH
    SH -->|"lnkProcessRentalBill"| SR
    SR -->|"btnSearch: searchRentalBill, rỗng thì RENTAL_BILL_NOT_FOUND"| SR
    SR -->|"lnkChooseRentalBill, phiếu đã huỷ hoặc đã giao: RENTAL_BILL_CANCELLED, RENTAL_BILL_ALREADY_PROCESSED"| SR
    SR -->|"lnkChooseRentalBill, phiếu Chờ nhận: ghi rentalBill"| PR

    PR -->|"chkReceived, txtDueDate, txtDiscount, lnkDeleteRentalCollateral: tính lại; DUE_DATE_INVALID"| PR
    PR -->|"lnkEditRentedBookList: chép listRentedBook"| ER
    ER -->|"lnkDeleteRentedBook"| ER
    ER -->|"lnkAddBook"| AR
    AR -->|"btnSearch: BOOK_NOT_FOUND; btnAddToRentalBill: QUANTITY_EXCEEDED"| AR
    AR -->|"btnAddToRentalBill hợp lệ, lnkBack"| ER
    ER -->|"lnkBack (không lưu)"| PR
    ER -->|"btnSave"| DUL
    DUL -->|"true"| PR
    DUL -->|"false, phiếu vẫn Chờ nhận: NOT_ENOUGH_COPIES"| ER
    DUL -->|"false (D9)"| SR

    PR -->|"lnkAddCondition: ghi bản sao rentedBook"| AC
    AC -->|"btnSearch: DAMAGE_NOT_FOUND; lnkChooseDamage: DAMAGE_ALREADY_RECORDED; lnkDeleteRentedDamage"| AC
    AC -->|"btnSave (Lưu tình trạng), lnkBack"| PR
    AC -->|"lnkAddDamage"| AD
    AD -->|"lnkBack"| AC
    AD -->|"btnSave"| DAD
    DAD -->|"DAMAGE_NAME_REQUIRED, DAMAGE_EXISTS"| AD
    DAD -->|"addDamage true"| AC

    PR -->|"lnkAddRentalCollateral"| ARC
    ARC -->|"btnSearch: COLLATERAL_NOT_FOUND; lnkChooseCollateral; lnkDeleteRentalCollateral; btnSave: COLLATERAL_VALUE_REQUIRED"| ARC
    ARC -->|"btnSave đủ giá trị, lnkBack"| PR
    ARC -->|"lnkAddCollateral"| ACO
    ACO -->|"lnkBack"| ARC
    ACO -->|"btnSave"| DACO
    DACO -->|"COLLATERAL_NAME_REQUIRED, COLLATERAL_EXISTS"| ACO
    DACO -->|"addCollateral true"| ARC

    PR -->|"btnConfirm (Xác nhận và in phiếu mượn)"| DUR
    DUR -->|"NO_COPY_RECEIVED, CONDITION_MISSING, COLLATERAL_MISSING, DUE_DATE_INVALID, NOT_ENOUGH_COPIES"| PR
    DUR -->|"updateRentalBill true"| PP
    DUR -->|"false (D9)"| SR
    PP -->|"btnPrint"| SH

    PR -->|"btnCancel: hộp CANCEL_CONFIRM"| PR
    PR -->|"btnConfirmCancel"| DC
    DC -->|"true: CANCEL_SUCCESS; false (D9)"| SR
```

- doUpdateRentalBill kiểm bốn điều kiện theo đúng thứ tự `docs/contracts.md` mục 10.2.
- Ba trang gọi `updateRentalBill` (doCancelRentalBill, doUpdateRentedBookList, doUpdateRentalBill) đều chặn D9: phiếu đã đổi trạng thái thì báo theo trạng thái mới và về SearchRentalBillView (`docs/contracts.md` mục 6.3).
- ProcessRentalBillView bỏ `listRentedBook`, `listRentalCollateral`, `rentedBook` mỗi lần hiển thị (C6).

## Trang quản trị D6 (ngoài báo cáo)

Chỉ nhân viên có `position = "Quản lí"`, ở `/nhan-vien/quan-tri/`. Tên trang và hàm DAO đã chốt; thành phần, field và lối vào là đề xuất C12, chốt trước phase 7.

```mermaid
flowchart TD
    SH["StaffHomeView.jsp"]
    MB["ManageBookView.jsp"]
    AB["AddBookView.jsp"]
    DAB(["doAddBook.jsp"])
    EB["EditBookView.jsp"]
    DUB(["doUpdateBook.jsp"])

    SH -->|"nút Quản lí đầu truyện (chỉ Quản lí, C12)"| MB
    MB -->|"btnSearch: searchBook"| MB
    MB -->|"nút Thêm đầu truyện"| AB
    AB -->|"btnSave"| DAB
    AB -->|"lnkBack"| MB
    DAB -->|"addBook"| MB
    MB -->|"lnkEditBook: ghi book"| EB
    EB -->|"btnSave"| DUB
    EB -->|"lnkBack"| MB
    DUB -->|"updateBook"| MB
```
