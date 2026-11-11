# Phase 7, lane 7B `tinh-trang-coc`: báo cáo

Worktree `D:/Coding/mangastore-wt/07-tinh-trang-coc`, nhánh `lane/07-chuc-nang-3/tinh-trang-coc`. Agent `t1k-web-core-developer`, 11/11/2026.
Trạng thái: **DONE_WITH_CONCERNS** (mục 6).

## 1. Đã làm

Chín trang trong `src/main/webapp/nhan-vien/`, theo `docs/contracts.md` §9.2, `phase-06-integration.md` §3, `phase-07-edge-cases.md` §3.1–3.3:
`EditRentedBookListView.jsp`, `AddRentedBookView.jsp`, `doUpdateRentedBookList.jsp`, `AddConditionView.jsp`, `AddDamageView.jsp`, `doAddDamage.jsp`, `AddRentalCollateralView.jsp`, `AddCollateralView.jsp`, `doAddCollateral.jsp`.

Đã merge vào nhánh lane theo lời nhắn của orchestrator: `a96abb6` (hợp đồng phase 6), `cfeb542`, `e30f33d` (edge case, smoke M3), `bfc467e` (island CollateralDrawer, 5 câu mới trong `Messages`).

Commit của lane: `f7d422e` (chín trang), `730028f` (edge case), `05550da` (quy ước gắn island), cộng commit báo cáo này.

Quy ước chung của chín trang:
- Mọi form `method="post"` có `<t:csrf/>`, `action` tường minh trỏ về chính trang (vì `doXxx.jsp` forward tới), input ẩn `rentalBillId`; nút sang trang khác dùng `formaction`; "Quay lại", "Thêm truyện", "Thêm lỗi mới", "Thêm loại tài sản mới" là `<a href>` có `id` đúng tên.
- Trang xem chỉ xử lí khi POST + `DispatcherType.REQUEST`, nhận việc bằng tên nút. View → view sau khi tự gửi dùng `sendRedirect` (PRG); `doXxx.jsp` trả 405 khi không phải POST, kết thúc bằng forward kèm request attribute `message`.
- Câu báo chỉ qua `Messages.*` (kể cả `Messages.quantityExceeded`), hiện bằng `<ui:message-box>`; tiền qua `Display.money`, mã qua `Codes`.
- Bảng dùng `<table id="tbl…" class="tt-ledger-table">` + `caption.tt-ledger-table__caption` (cây lớp của `ledger-table.tag`; tag không nhận `id` mà smoke đọc bảng theo `id`, xem mục 5).
- Không `<style>`, `style=`, `<script>` chạy được; chỉ `<script type="application/json" id="collateral-drawer-props">` sinh bằng `JsonUtil.toScriptJson` từ DTO đúng §11.3 (`index`, `collateralId`, `collateralName`, `collateralDescription`, `value`, `note`).
- Island CollateralDrawer theo `plans/reports/phase-07-islands-m3-261111-1057.md` §4: bảng "Các khoản cọc", `btnSave`, `lnkBack` nằm trong `<div data-island-fallback="CollateralDrawer">` (div không có lớp display để thuộc tính `hidden` có tác dụng); `lnkBack` có `data-island-slot="CollateralDrawer:back"`; `<div data-island="CollateralDrawer" data-props="collateral-drawer-props"></div>` đứng sau khối fallback, trong form (`AddRentalCollateralView.jsp:239–265`). Không trang nào khác của lane có island.

## 2. Lệnh kiểm

| Lệnh | Kết quả |
|---|---|
| `node scripts/dev/mvnw.mjs -B verify` (trước edge case, sau merge `a96abb6`) | BUILD SUCCESS, 265 test, 0 lỗi |
| `node scripts/dev/mvnw.mjs -B verify` (đầu nhánh lane sau `05550da`) | BUILD FAILURE do hạ tầng: 171 test chạy, 0 failure, 16 error đều là `initializationError` của test Testcontainers (Docker Desktop trả `500 Internal Server Error` cho mọi API, `docker ps` cũng hỏng). Không có test nào đỏ vì code; cần chạy lại khi Docker hồi lại |
| JspC (`org.apache.jasper.JspC` của tomcat-embed-jasper 11.0.27, JDK 25, `-threadCount 1`, đầu ra ở scratchpad) trên toàn webapp sau `bfc467e` | `Generation completed with [0] errors`; có lớp cho cả 9 trang |
| `grep` `style=`, `<style`, `<script>` trong `nhan-vien/` | không có |

## 3. Bảng edge case → chỗ xử lí

"Kiểm" = đã đọc lại code và JspC biên dịch được; "HTTP" = đã đi thật trên stack riêng 8085 (chỉ bản trước edge case, mục 4). Chưa kiểm nào bằng trình duyệt (để lane 7E).

### 3.1 Session, điều hướng, bấm lặp

| Trường hợp | Trang | Xử lí ở | Kiểm |
|---|---|---|---|
| Thiếu `rentalBill` → 302 Search | Edit, AddRented, AddRentalCollateral, AddCollateral, doUpdateRentedBookList (và AddCondition, AddDamage, doAddDamage, doAddCollateral vì cần đọc) | `EditRentedBookListView.jsp:68`, `AddRentedBookView.jsp:64`, `AddRentalCollateralView.jsp:73`, `AddCollateralView.jsp:29`, `doUpdateRentedBookList.jsp:34`, `AddConditionView.jsp:63`, `AddDamageView.jsp:28`, `doAddDamage.jsp:36`, `doAddCollateral.jsp:35` | Kiểm |
| Thiếu `rentedBook` → 302 Process | AddCondition, AddDamage, doAddDamage | `AddConditionView.jsp:68`, `AddDamageView.jsp:32`, `doAddDamage.jsp:41` | Kiểm |
| Thiếu `listRentedBook` → 302 Edit | AddRented, doUpdateRentedBookList | `AddRentedBookView.jsp:71`, `doUpdateRentedBookList.jsp:40` | Kiểm |
| `doAddCollateral` không có `listRentalCollateral` → tạo mới | doAddCollateral | `doAddCollateral.jsp` cuối trang (`current == null ? new ArrayList<>()`) | Kiểm; HTTP (bản đầu) |
| `rentalBill` không còn "Chờ nhận" (cả GET) → forward Search kèm câu D9, không ghi | cả 9 trang | `billGuard` (`EditRentedBookListView.jsp:28`, `AddRentedBookView.jsp:32`, `AddConditionView.jsp:35`, `AddRentalCollateralView.jsp:40`); `AddDamageView.jsp:35`, `AddCollateralView.jsp:32`, `doAddDamage.jsp:44`, `doAddCollateral.jsp:38`, `doUpdateRentedBookList.jsp:43` | Kiểm |
| POST thiếu hoặc sai `rentalBillId` → forward Process kèm `RENTAL_BILL_CHANGED` | 7 trang có form tự gửi hoặc trang xử lí | `billGuard` dòng `formId == null ||` (`Edit:34`, `AddRented:38`, `AddCondition:41`, `AddRentalCollateral:46`); `doUpdateRentedBookList.jsp:49`, `doAddDamage.jsp:51`, `doAddCollateral.jsp:45`. Input ẩn: `Edit:116`, `AddRented:187`, `AddCondition:205`, `AddRentalCollateral:216`, `AddDamage:57`, `AddCollateral:54` | Kiểm |
| Hai nhân viên cùng sửa danh sách; quyển vừa thêm bị phiếu khác giữ | doUpdateRentedBookList | `updateRentalBill` (K1, D9) ở `doUpdateRentedBookList.jsp:64`; `false` → `searchRentalBill("PM"+id)` `:76`, vẫn "Chờ nhận" → `NOT_ENOUGH_COPIES` `:90` (rentalBill giữ danh sách cũ), đã đổi → câu D9, bỏ `rentalBill` | Kiểm; script K1/D9 viết sẵn (mục 4) nhưng chưa chạy |
| Session hết hạn khi POST | mọi trang | filter (6A), trang không làm gì thêm | không thuộc lane |

### 3.2 Dữ liệu nhập

| Ô | Trường hợp | Xử lí ở | Kiểm |
|---|---|---|---|
| `txtKeyword` (AddRented, AddCondition, AddRentalCollateral) | trống/dấu cách → câu "không tìm thấy", không gọi DAO; > 100 → cắt; trim + NFC | `AddRentedBookView.jsp:89`, `AddConditionView.jsp:86`, `AddRentalCollateralView.jsp:94` (cắt); nhánh `keyword.isEmpty()` của mỗi trang; `maxlength="100"` | Kiểm; HTTP (từ khoá trống, bản đầu) |
| `txtConditionNote`, `txtDamageNote`, `txtCollateralNote`, `txtDescription` | > 255 → `INPUT_TOO_LONG`, `aria-invalid`, giữ chữ; `maxlength="255"` | `AddConditionView.jsp:105`, `AddRentalCollateralView.jsp:117`, `doAddDamage.jsp:63`, `doAddCollateral.jsp:57`; ô `AddCondition:239,248`, `AddRentalCollateral:252`, `AddDamage:64`, `AddCollateral:61` | Kiểm |
| `txtCollateralValue` | trống/dấu cách → `COLLATERAL_VALUE_REQUIRED` khi "Lưu"; > 100 → `INPUT_TOO_LONG`; `maxlength="100"` | `AddRentalCollateralView.jsp:103` (trim, rỗng = null), `:158`; ô `:251` | Kiểm; HTTP (giá trị dấu cách, bản đầu) |
| `txtName` (AddDamage, AddCollateral) | dấu cách → `*_NAME_REQUIRED`; > 100 → `INPUT_TOO_LONG`; trùng khác hoa thường/dấu → `*_EXISTS` (UNIQUE + collation) | `doAddDamage.jsp:61–78`, `doAddCollateral.jsp:55–72`; `aria-invalid` ở `AddDamageView.jsp`, `AddCollateralView.jsp` (biến `nameInvalid`, `descriptionInvalid`) | Kiểm; HTTP (trống, trùng, bản đầu) |
| `txtQuantity` | trống, 0, âm, thập phân, chữ, quá `int` → `QUANTITY_INVALID`; vượt (kể cả 0) → `QUANTITY_EXCEEDED` | `AddRentedBookView.jsp:51` (`positiveInt`), `:125`, `:139` | Kiểm; HTTP (vượt, chữ, bản đầu) |
| `lnkChooseBook` | không chọn → `BOOK_NOT_CHOSEN`; id không có trong `listBook` → bỏ qua | `AddRentedBookView.jsp:120`, nhánh `chosen == null` ngay sau | Kiểm |
| `lnkChooseDamage`, `lnkDeleteRentedDamage`, `lnkChooseCollateral`, `lnkDeleteRentalCollateral`, `lnkDeleteRentedBook` | không phải số / không có trong danh sách → bỏ qua | `idOf`/`numberOf` trả 0 không khớp dòng nào; `removeIf` ở `Edit:87`, `AddCondition:144`; khoảng STT ở `AddRentalCollateralView` | Kiểm |
| Số ô `txtDamageNote`, `txtCollateralValue`, `txtCollateralNote` khác số dòng | thiếu coi là trống, thừa bỏ | `AddConditionView.jsp:94`, `AddRentalCollateralView.jsp:103` (`cell`) | Kiểm |

### 3.3 Nghiệp vụ tại quầy

| Trường hợp | Xử lí ở | Kiểm |
|---|---|---|
| "Lưu" khi đã xoá hết quyển → `NO_COPY_RECEIVED`, không ghi DB | `doUpdateRentedBookList.jsp:55` | Kiểm |
| Thêm lại quyển vừa xoá | được; quyển chọn theo §6.2 trong các quyển `searchBook` còn trả (quyển vừa xoá vẫn bận trong DB tới khi "Lưu" nên lần thêm đó lấy quyển trống id nhỏ nhất kế tiếp) | Kiểm |
| Hai khoản cọc cùng loại | cho phép (`AddRentalCollateralView`, nhánh `lnkChooseCollateral`) | Kiểm |
| Loại lỗi đã ghi bị chọn lại → `DAMAGE_ALREADY_RECORDED` | `AddConditionView.jsp:136` | HTTP (bản đầu) |
| Lỗi mới tạo rồi "Quay lại" không lưu tình trạng | loại lỗi ở DB; chỉ bản sao `rentedBook` có lỗi đó, ProcessRentalBillView bỏ bản sao (C6) | Kiểm |

## 4. Chạy thật trên stack riêng (`-p tiemtruyen-7b`, cổng 8085)

Lượt đầu (trước edge case, filter khung cho qua): dựng stack xong; JSP harness ở scratchpad (`_7b-seed.jsp` đưa phiếu và bản sao `rentedBook` vào session thay 7A, stub `ProcessRentalBillView`/`SearchRentalBillView` in `message`) và hai script Node dùng `scripts/smoke/lib/http.mjs`. Do hết lượt, **chưa chạy** hai script này trên bản cuối; bản cuối đã dựng lại ảnh nhưng chưa đi qua HTTP. Phần kiểm trên trình duyệt và HTTP của bản cuối giao lane 7E và smoke `flow-m3.mjs` của orchestrator. Lệnh `docker compose -p tiemtruyen-7b -f compose.yaml -f compose.e2e.yaml down` (không `-v`) **không chạy được** vì Docker Desktop trả 500; stack `tiemtruyen-7b` (cổng 8085, 3385) có thể vẫn còn, cần `down` khi Docker hồi lại.

## 5. Đề xuất ngoài Owns (orchestrator)

1. `WEB-INF/tags/ui/ledger-table.tag`: thêm thuộc tính `id` (smoke đọc bảng theo `id`); khi đó chín trang chuyển về dùng tag.
2. `vn.tiemtruyen.util`: một chỗ cho ba hàm đang chép ở nhiều trang M3: tình trạng khi giao theo §13 (`EditRentedBookListView.jsp`, 7A cũng cần), số ngày tính tiền C3, `clean` (trim + NFC) và `billGuard` (thứ tự kiểm đầu trang §3.1). Chép ở 7 trang là nợ SSOT.
3. `docs/contracts.md` §11: ghi quy ước `data-island-fallback` / `data-island-slot` (báo cáo 7C §4).

## 6. Điểm cần orchestrator xem (DONE_WITH_CONCERNS)

1. `doUpdateRentedBookList` gọi `updateRentalBill` với cả phiếu trong session (đúng §9.2), nên lần "Lưu" danh sách cũng ghi xuống DB `borrowDate`, `dueDate` (mặc định C7 do SearchRentalBillView đặt), giảm giá, ghi chú, tình trạng và khoản cọc đang có trong session, khi phiếu vẫn "Chờ nhận". §2 nói `borrowDate`, `dueDate` NULL tới khi giao và §9.2 AddConditionView nói tình trạng ghi khi xác nhận. Hợp đồng không nói cách tránh; tôi theo đúng chữ §9.2. Nếu cần giữ DB sạch tới lúc giao thì phải chốt lại (ví dụ trang gửi một bản phiếu chỉ đổi danh sách).
2. `AddConditionView` "Lưu tình trạng" khi quyển của bản sao không còn trong `rentalBill` (danh sách vừa lưu ở thẻ khác): tôi forward ProcessRentalBillView kèm `RENTAL_BILL_CHANGED` thay vì 500 (`AddConditionView.jsp`, nhánh `index < 0`). Hợp đồng không có dòng cho trường hợp này.
3. `AddRentedBookView` luôn hiện `listBook` đang có trong session (kể cả kết quả tìm lần trước); ch.2 bước 11.6 nói bảng ban đầu rỗng, nhưng §7 không cho trang này bỏ `listBook`.
4. Mọi lần gửi về AddConditionView ghi `txtConditionNote` vào bản sao (theo lời nhắn orchestrator); bản sao chỉ vào `rentalBill` khi "Lưu tình trạng", nên "Quay lại" vẫn không lưu.
5. "Thêm lỗi mới" / "Thêm loại tài sản mới" là `<a href>` nên chữ vừa gõ trên dòng mà chưa gửi về trang sẽ mất khi bấm (ch.2 ngoại lệ 19, 37 có lần "Tìm" trước nên không mất).
