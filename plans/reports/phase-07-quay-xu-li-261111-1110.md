# Phase 7, lane 7A `quay-xu-li`: báo cáo

Nhánh `lane/07-chuc-nang-3/quay-xu-li`, worktree `D:/Coding/mangastore-wt/07-quay-xu-li`. Đã merge theo lệnh orchestrator: `a96abb6` (hợp đồng phase 6), `cfeb542`, `e30f33d` (edge case, smoke M3), `bfc467e` (island ProcessBillDesk, 8 câu ngoài báo cáo, C14–C19).

**Trạng thái: DONE_WITH_CONCERNS.** Sáu trang viết xong, JspC biên dịch không lỗi. Chưa đi được trên HTTP hay trình duyệt vì Docker Desktop trả 500 cho mọi API (mục 4).

## 1. File

| File | Loại | Ghi chú |
|---|---|---|
| `src/main/webapp/nhan-vien/LoginView.jsp` | xem, tự gửi | `StaffDAO.checkLogin`; chỉ xử lí khi POST + REQUEST + `btnLogin`; `changeSessionId`, W `staff` (không mật khẩu), 302 StaffHome; sai → `LOGIN_FAILED`, giữ `txtUsername`; GET `expired=1` → `SESSION_EXPIRED` kind info (C16) |
| `src/main/webapp/nhan-vien/StaffHomeView.jsp` | xem | họ tên, chức vụ, `lnkProcessRentalBill`; "Quản lí" thấy `lnkManageBook` → `quan-tri/ManageBookView.jsp` (C12, ghi ngoài báo cáo); `btnLogout` form POST + csrf, `formaction` `/doLogout.jsp` (C14) |
| `src/main/webapp/nhan-vien/SearchRentalBillView.jsp` | xem, tự gửi | `searchRentalBill`; bảng `<table id="tblRentalBill">`; chọn dòng: hai câu D9 hoặc C7 + 302 Process |
| `src/main/webapp/nhan-vien/ProcessRentalBillView.jsp` | xem, tự gửi | khung phiếu, bàn quầy (fallback + island), hộp huỷ |
| `src/main/webapp/nhan-vien/doUpdateRentalBill.jsp` | xử lí | thứ tự kiểm §3.1, bốn điều kiện, giảm giá, PRG sang Print, D9 |
| `src/main/webapp/nhan-vien/PrintRentalBillView.jsp` | xem | `ui:ticket` A5 qua `print.css`, gộp theo đầu truyện, `btnPrint` (`data-print`) POST tới StaffHome (C2) |

Mọi form đều có `action` tường minh (`contextPath + /nhan-vien/…`) vì doXxx forward về. Nút sang trang khác dùng `formaction` tường minh. Từ trang xem sang trang xem thì dùng `sendRedirect` (Search → Process, Process → AddCondition). Không có `style=`, `<style>` hay `<script>` thực thi; props ở `<script type="application/json">` qua `JsonUtil.toScriptJson`. Chữ của người dùng in ra qua `<c:out>`. Tiền và ngày qua `Display`, mã qua `Codes`, câu báo qua `Messages`.

## 2. Lệnh kiểm

| Lệnh | Kết quả |
|---|---|
| `node scripts/dev/mvnw.mjs -B -q compile` (JDK 25) | exit 0 |
| JspC 11.0.27 trên toàn webapp: `java -cp <cp maven>;target/classes;tomcat-embed-{jasper,core,el}-11.0.27;ant-1.10.15;ecj-3.46.100 org.apache.jasper.JspC -webapp src/main/webapp -d <scratch> -threadCount 1 -compile` | `Generation completed with [0] errors`; có lớp cho cả 6 trang |
| Làm đỏ có chủ đích: một JSP thử gọi `Messages.NOPE_CONSTANT` | JspC báo `NOPE_CONSTANT cannot be resolved` (cách kiểm này bắt được lỗi; file thử đã xoá) |
| `node scripts/dev/mvnw.mjs -B verify` | **chưa chạy**: Docker hỏng, Testcontainers cần Docker; orchestrator dặn chờ |
| `docker compose -p tiemtruyen-7a …` (stack riêng 8084) | **không dựng được**: `request returned 500 Internal Server Error … dockerDesktopLinuxEngine` |
| `grep 'style=\|<style\|<script' nhan-vien/*.jsp` | chỉ có một dòng `<script type="application/json" id="process-bill-props">` |

Gotcha JspC: chạy theo danh sách file thì lỗi `org.apache.jsp.tag.web.layout_tag cannot be resolved` (lớp tag chưa có trên classpath). Chạy `-webapp` toàn bộ với `-threadCount 1` thì qua.

## 3. Bảng edge case → chỗ xử lí

"Kiểm" nghĩa là đã đọc lại code và JspC biên dịch được. Chưa trường hợp nào được đi trên HTTP hay trình duyệt (mục 4).

### 3.1 Session, điều hướng, bấm lặp (phase-07-edge-cases.md)

| Trường hợp | Xử lí ở | Kiểm |
|---|---|---|
| Không có `rentalBill` → 302 Search | `ProcessRentalBillView.jsp:145`, `doUpdateRentalBill.jsp:84`, `PrintRentalBillView.jsp:52` | Kiểm |
| `rentalBill` không còn "Chờ nhận" (cả GET) → forward Search kèm câu D9, không ghi | `ProcessRentalBillView.jsp:149`, `doUpdateRentalBill.jsp:88` | Kiểm |
| Print khi phiếu chưa "Đang cho thuê" → 302 Process | `PrintRentalBillView.jsp:56` | Kiểm |
| POST thiếu hoặc lệch `rentalBillId` → `RENTAL_BILL_CHANGED`, không ghi | `ProcessRentalBillView.jsp:155-162` (hiện phiếu trong session, tích sẵn mọi quyển); `doUpdateRentalBill.jsp:95-99` (forward Process); input ẩn `ProcessRentalBillView.jsp:363` | Kiểm |
| Xác nhận hai lần, F5 sau khi xác nhận | `doUpdateRentalBill.jsp:162` `sendRedirect` Print (PRG); lần gửi lại ra nhánh "không còn Chờ nhận" `:88` → `RENTAL_BILL_ALREADY_PROCESSED` | Kiểm |
| "In phiếu" hai lần | Print không ghi DB; StaffHome chỉ hiển thị | Kiểm |
| Hai nhân viên cùng xác nhận / huỷ chen ngang (D9) | `doUpdateRentalBill.jsp:148` `searchRentalBill("PM"+id)` → W `listRentalBill`, câu theo trạng thái, bỏ `rentalBill` `:182`, `:186`; vẫn "Chờ nhận" → `NOT_ENOUGH_COPIES`, trả `rentalBill` về như trước | Kiểm |
| Session hết hạn khi POST | do filter (phase 6, §6.1); trang không làm gì thêm | không thuộc lane |
| Staff mất khỏi session (filter khung cho qua) | `ProcessRentalBillView.jsp:138`, `doUpdateRentalBill.jsp:78`, `StaffHomeView.jsp:16` → 302 LoginView nhân viên | Kiểm |

### 3.2 Dữ liệu nhập

| Ô | Trường hợp | Xử lí ở | Kiểm |
|---|---|---|---|
| `txtKeyword` (Search) | trống, chỉ dấu cách → không gọi DAO, `RENTAL_BILL_NOT_FOUND` | `SearchRentalBillView.jsp:49` | Kiểm |
| | quá 100 → cắt; trim + NFC; ô `maxlength="100"` | `:40-44`, `:124` | Kiểm |
| | `pm0125`, ` PM0125 `, `PM125`, không dấu | `RentalBillDAO.searchRentalBill` + `Codes.parseRentalBillId` (C9, collation) | Kiểm (đọc code DAO) |
| `txtDiscount` | trống = 0; `2.000`, `2000đ`, `2 000` | `parseMoney` `ProcessRentalBillView.jsp:94` | Kiểm |
| | chữ, âm, lẻ đồng, lớn hơn tổng các quyển đang tích → `DISCOUNT_INVALID`, `aria-invalid`, giữ cũ | `:207-215` | Kiểm |
| | bỏ tích làm tổng < giảm giá | tự gửi `:210` báo trên ô; `doUpdateRentalBill.jsp:127-130` kiểm sau bốn điều kiện | Kiểm |
| | ô là `type="text" inputmode="numeric"` (ô `number` của trình duyệt gửi chuỗi rỗng khi gõ `2000đ`, sẽ bị hiểu là 0) | `:478` | Kiểm |
| `txtDueDate` | trống, sai dạng, `2026-02-30`, không sau ngày mượn → `DUE_DATE_INVALID`, giữ ngày cũ | `parseDate` `:84`, `:188-197` | Kiểm |
| | không giới hạn 30 ngày ở quầy (quyết định chủ dự án) | không có kiểm trên | Kiểm |
| `txtBorrowDate` | gửi giá trị khác → bỏ qua | trang không đọc ô này để ghi (chỉ dùng để nhận ra form bàn quầy) | Kiểm |
| `chkReceived` | mã vạch không có trong phiếu → bỏ | `ProcessRentalBillView.jsp:177` (`retainAll`); doUpdate chỉ lấy dòng của phiếu `doUpdateRentalBill.jsp:118-123` | Kiểm |
| `txtNote` | quá 255 → `INPUT_TOO_LONG`, `aria-invalid`, giữ chữ đã nhập, không lưu; `maxlength="255"`; trim + NFC | Process `:217-225`, `:248`, `:484`; doUpdate `:102-110` | Kiểm |
| `txtCancelReason` | `maxlength="255"`; doCancelRentalBill (phase 6) forward về kèm `CANCEL_REASON_REQUIRED` / `INPUT_TOO_LONG` → mở lại hộp, giữ chữ, `aria-invalid` (C17) | `ProcessRentalBillView.jsp:242-252`, `:516` | Kiểm (chưa có doCancelRentalBill để thử) |
| `lnkChooseRentalBill` | không phải số, không có trong `listRentalBill` → bỏ qua | `SearchRentalBillView.jsp:58-70` | Kiểm |
| `lnkAddCondition` | mã vạch lạ → bỏ qua, hiện lại trang | `ProcessRentalBillView.jsp:231-240` | Kiểm |
| `lnkDeleteRentalCollateral` | không phải số, ngoài khoảng → bỏ qua | `positiveIntOrZero` `:106`, `:198-206` | Kiểm |
| `txtUsername` (Login) | trim + NFC | `LoginView.jsp:27` | Kiểm |

### 3.3 Nghiệp vụ tại quầy

| Trường hợp | Xử lí ở | Kiểm |
|---|---|---|
| Quyển bỏ tích đã có tình trạng → bỏ cả quyển và lỗi khi xác nhận | `doUpdateRentalBill.jsp` gán `receivedRows`; `RentalBillDAO.saveBill` xoá dòng không còn cùng lỗi | Kiểm (đọc code DAO) |
| Xoá hết khoản cọc rồi xác nhận → `COLLATERAL_MISSING` | `firstViolation` `doUpdateRentalBill.jsp:51` | Kiểm |
| "Quản lí" xử lí phiếu như nhân viên bán hàng | không phân biệt vai trong 6 trang | Kiểm |
| Bốn điều kiện đúng thứ tự §10.2 | `doUpdateRentalBill.jsp:40-60` | Kiểm |

## 4. Chưa kiểm được

- Docker Desktop hỏng (mọi lệnh trả `500 Internal Server Error … dockerDesktopLinuxEngine`). Vì vậy chưa có: `mvnw -B verify`, stack riêng 8084, `node scripts/smoke/flow-m3.mjs`, Playwright MCP ở 390×844 và 1440×900, kiểm CSP build, xem trước bản in A5, thử khi tắt JS. Tôi đã đọc lại code với từng bước của `flow-m3.mjs` (e30f33d, bfc467e) nhưng chưa chạy smoke.
- Island ProcessBillDesk (7C) chưa được gắn thử trên trang thật. Phía trang đã theo `plans/reports/phase-07-islands-m3-261111-1057.md` §4, §5: fallback `ProcessRentalBillView.jsp:377`, các chỗ `edit-list` `:425`, `add-collateral` `:471`, `note` `:482`, div island `:504`, props `:505`. Tổng của một dòng chỉ tính quyển đang tích. `txtDiscount` ban đầu là số đồng chưa định dạng.

## 5. Quyết định và lưu ý (không đổi hợp đồng)

- **Ô "Nhận" không nằm trong model** (không có thuộc tính trong `RentedBook`/`RentalBill`, §3 không cho thêm). Trạng thái tích chỉ đi theo request: mở mới, hoặc quay về từ AddCondition, Edit, AddRentalCollateral, thì tích sẵn mọi quyển (ch.2 bước 10). Tự gửi, hoặc doUpdate/doCancel forward về, thì tích theo `chkReceived` đã gửi. Hệ quả là quầy bỏ tích rồi sang "Thêm tình trạng" thì lúc quay về mọi quyển lại được tích. Nếu chủ dự án muốn giữ lâu hơn thì phải đổi hợp đồng: NEEDS_CONTEXT cho orchestrator, lane không tự thêm thuộc tính.
- doUpdateRentalBill chỉ đọc `chkReceived`, `txtNote` (§9.2). Ngày hẹn trả và giảm giá lấy từ `rentalBill` trong session. Khi không có JS, ngày hay giảm giá gõ vào mà chưa bấm "Tính lại" thì không được tính.
- Khi lưu thành công, doUpdateRentalBill thay phần tử cùng id trong `listRentalBill` (§7, cùng cách doCancelRentalBill làm), để bảng Tìm phiếu không còn hiện "Chờ nhận" cũ.
- Nút mặc định ẩn (`sr-only`, không tên) đứng đầu form Process. Nhờ vậy Enter trong một ô chỉ tính lại, không bấm nhầm "Thêm tình trạng" của dòng đầu.
- Hộp huỷ nằm trong form chính. "Xác nhận" gửi cả `rentalBillId`, `from=staff`, `txtCancelReason` (C8) cùng các ô bàn quầy tới `/doCancelRentalBill.jsp`.
- doUpdateRentalBill trả lại `listRentedBook`, `staff`, `status` cũ khi lưu không được. Lí do: session không phải Redis (test, chạy trong bộ nhớ) dùng chung đối tượng.

## 6. Đề xuất ngoài Owns (cho orchestrator)

1. `WEB-INF/tags/ui/ledger-table.tag`: thêm thuộc tính `id`. Smoke dùng `tableRows` nên đòi `id` nằm trên thẻ `<table>`. Hiện ba trang tự in `<table id="…" class="tt-ledger-table">` + `caption.tt-ledger-table__caption`, chép lại cây lớp của tag.
2. `util/Display`: thêm `condition(RentedBook)` (chữ tình trạng §13) và `rentalDays(RentalBill)` (C3). Hiện hai hàm này được chép ở `ProcessRentalBillView.jsp`, `PrintRentalBillView.jsp`, `doUpdateRentalBill.jsp`, và 7B, phase 6 cũng cần.
3. Loader (`frontend/src/loader/`): C2, C3 nhắc hai việc mà loader chưa làm. Một là `data-submit-on-change` (trang đặt thuộc tính này trên `chkReceived`, `txtDueDate`, `txtDiscount` của bản fallback). Hai là gọi `window.print()` trước khi gửi nút "In phiếu"; trang đặt `data-print` trên `btnPrint`, tên thuộc tính này chưa có trong hợp đồng.
4. `docs/contracts.md` §9.2: ghi các id mới `lnkManageBook` (C12), `rentalBillId`, và việc ô "Nhận" chỉ sống trong request (mục 5).
5. RentedBook do AddRentedBookView (7B) thêm phải có `bookCopy.book` (tên, id). Process và Print ném `IllegalStateException` khi thiếu, thay vì in dòng trống.

## 7. Bổ sung sau khi bàn giao (11/11/2026)

- Đã merge `5eae7b9` (lane 7B, phase 6 `a0bc269`).
- `LoginView.jsp`: khi đăng nhập thành công thì `invalidate()` session cũ rồi `getSession(true)` mới ghi `staff`, thay cho `changeSessionId()` (máy quầy dùng chung). Commit `6e58f1a`.
- Ô "Nhận" giờ nằm ở thuộc tính session kĩ thuật `uncheckedBarcodes` (`ArrayList<String>`), theo quyết định của chủ dự án. Vì vậy mối lo ở mục 5 đã hết. `ProcessRentalBillView` ghi thuộc tính này từ `chkReceived` khi request mang field bàn quầy, còn những lúc khác thì render ô tích theo nó; mã vạch không còn trong phiếu bị bỏ. `SearchRentalBillView` bỏ thuộc tính khi mở một phiếu "Chờ nhận", `doUpdateRentalBill` bỏ khi lưu xong. Commit `336de14`.
- Kiểm: `mvnw -B -q compile` qua; JspC trên toàn webapp báo 0 lỗi. `mvnw -B verify` và stack 8084 đã khởi chạy nhưng bị dừng giữa chừng theo lệnh orchestrator (Docker treo lại), nên **verify chưa có kết quả** và chưa chạy smoke.
