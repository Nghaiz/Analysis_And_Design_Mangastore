# Phase 6: hợp đồng tích hợp giữa các lane

Owner: orchestrator (chốt 11/11/2026, bước 6.0, trước khi chia lane). Bổ sung cho `docs/contracts.md` (thắng về nghiệp vụ) và `phase-06-chuc-nang-1-2.md`; chỉ ghi những gì hai lane phải cùng hiểu. Lane thấy thiếu hay mâu thuẫn: dừng, ghi vào báo cáo, không tự đặt.

## 1. Owns bổ sung và file orchestrator đã tạo

| Lane | Thêm vào Owns ngoài dòng Owns của file phase | Ghi chú |
|---|---|---|
| 6A | 5 file khung `src/main/java/vn/tiemtruyen/filter/*Filter.java`, `WEB-INF/tags/csrf.tag` | Orchestrator tạo ở 6.0: filter cho qua, `csrf.tag` đã là bản thật. 6A viết đè. |
| 6B | `frontend/src/islands/ShelfScene/**`, `frontend/public/img/shelf/**`, `src/main/webapp/dev/HomePreviewView.jsp` | Ảnh tĩnh khung hẹp và trường `posterNarrowSrc` (`docs/contracts.md` §11.4). |
| 6B | `src/main/webapp/doLogout.jsp` | C14 (đăng xuất), thêm 11/11/2026 |
| 6C | không | |
| 6D | `frontend/src/loader/submit-on-change.ts` (+ test) và đúng một dòng gọi nó trong `frontend/src/loader/mount-islands.ts` | `data-submit-on-change` của C3 (ConfirmRentalBillView); bỏ qua sự kiện `isTrusted === false` (`docs/contracts.md` §11) |

Chỉ orchestrator sửa: `web.xml`, `compose*.yaml`, `docs/contracts.md`, `src/main/java/vn/tiemtruyen/util/Display.java`, `scripts/**`. Định dạng hiển thị (§13) gọi `vn.tiemtruyen.util.Display` (`money`, `date`, `dateTime`) và `Codes` (`bookCode`, `rentalBillCode`); trang không tự định dạng tiền hay ngày.

## 2. Ranh giới trang ↔ filter

Thứ tự chuỗi (`web.xml`): Utf8 → SecurityHeaders → Csrf → Auth → LoginRateLimit, chỉ dispatcher `REQUEST`. Forward từ `doXxx.jsp` sang trang xem **không** đi lại qua filter.

**CSRF**
- Token ở thuộc tính session kĩ thuật `csrfToken` (chuỗi ngẫu nhiên ≥ 128 bit, base64url). `CsrfFilter` tạo session và token khi request tới một `*.jsp` mà session chưa có token, **trước** khi trang chạy.
- Form gửi token qua input ẩn `name="csrf"`; mọi form có `<t:csrf/>`. Mọi POST tới `*.jsp` thiếu hoặc sai token (so hằng thời gian) → `response.sendError(403)` (trang `error/403.jsp`).
- Đổi token sau đăng nhập: sau `chain.doFilter` của một POST tới `/LoginView.jsp` hoặc `/nhan-vien/LoginView.jsp`, nếu session lúc đó có `client` (id > 0) hoặc `staff` mà trước chain không có (hoặc khác id), filter thay `csrfToken` bằng token mới.
- Trang không đọc, không ghi `csrfToken`.

**Đăng nhập (LoginView, cả hai bản)**
- Trang chỉ xử lí đăng nhập khi `"POST".equals(request.getMethod())`, `request.getDispatcherType() == DispatcherType.REQUEST` và có tham số `btnLogin`. Mọi trường hợp khác chỉ hiển thị (kể cả khi doRegister forward sang kèm `REGISTER_SUCCESS`: request đó mang `txtUsername`, `txtPassword` của form đăng kí nhưng không được đăng nhập).
- Thành công: huỷ session cũ rồi tạo session mới (`session.invalidate()`, `request.getSession(true)`; đổi 11/11/2026 thay cho `changeSessionId()` để người đăng nhập sau không kế thừa `cart`, `rentalBill`, danh sách tạm của người trước trên máy dùng chung), ghi `client` / `staff` (không mật khẩu), `response.sendRedirect(contextPath + "/ClientHomeView.jsp")` (nhân viên: `/nhan-vien/StaffHomeView.jsp`). `CsrfFilter` sau chain đọc lại `request.getSession(false)` (session mới) và đặt token mới.
- Thất bại: request attribute `message` = `Messages.LOGIN_FAILED`, hiện lại trang (giữ `txtUsername`, bỏ trống `txtPassword`).

**Chặn đăng nhập sai (`LoginRateLimitFilter`, Deferred #23)**
- Chỉ đếm POST có `btnLogin`. Khoá = vai (`client` / `staff`, theo đường dẫn) + tên đăng nhập viết thường (trim) + IP. IP: header `X-Real-IP` do nginx đặt (`docker/nginx/snippets/proxy-app.conf`), không có thì `getRemoteAddr()`.
- Bị chặn: không chạy phần đăng nhập của trang. Filter đặt request attribute `message` = `Messages.LOGIN_FAILED` rồi gọi chain với request bọc (`HttpServletRequestWrapper`) trả `getMethod()` = `"GET"`, nên trang chỉ hiển thị kèm câu báo. Câu báo không đổi (`LOGIN_FAILED`).
- Không bị chặn: sau chain, session có vai tương ứng → xoá bộ đếm; không có → tăng bộ đếm (TTL = `LOGIN_RATE_WINDOW_SECONDS`). Đủ `LOGIN_RATE_MAX_FAILS` thì chặn trong `LOGIN_RATE_WINDOW_SECONDS`.
- Redis qua Redisson, địa chỉ `APP_REDIS_ADDRESS`, mật khẩu `REDIS_PASSWORD` (cùng biến với session manager). Redis lỗi: không lặng lẽ cho qua; ghi log lỗi và trả 500 (lỗi hạ tầng, không phải sai mật khẩu).

**Phân quyền (`AuthFilter`, `docs/contracts.md` §12)**
- Chưa đủ quyền ở trang gốc: `response.sendRedirect(contextPath + "/LoginView.jsp")` (302), kể cả `doXxx.jsp`. `/nhan-vien/*` (trừ `LoginView.jsp`): 302 về `contextPath + "/nhan-vien/LoginView.jsp"`. `/nhan-vien/quan-tri/*` không phải "Quản lí": 403.
- Luôn mở: `/` (welcome → HomeView), `/HomeView.jsp`, `/RegisterView.jsp`, `/doRegister.jsp`, `/LoginView.jsp`, `/nhan-vien/LoginView.jsp`, `/health.jsp`, `/static/*`, `/error/*`, `/dev/*`, `/favicon.ico`. Đường dẫn không phải `.jsp` khác: cho qua (Tomcat trả 404).
- `/doCancelRentalBill.jsp`: khách (id > 0) hoặc nhân viên; kiểm thêm `from` (C8) do trang làm.

**Trang lỗi** `error/403.jsp`, `404.jsp`, `500.jsp`: tiếng Việt, dùng `<t:layout>`, có link về trang chủ, không lộ stack trace; giữ đúng mã trạng thái.

**Header bảo mật** (`SecurityHeadersFilter`): nginx là SSOT của header nó đã đặt (CSP, `Referrer-Policy: strict-origin-when-cross-origin`… theo `contract.md` §10); filter chỉ đặt những header nginx không đặt (`Cache-Control: no-store` cho `*.jsp` và các header nginx ẩn đi), để chạy thẳng Tomcat cũng an toàn mà qua nginx không ra hai giá trị khác nhau.

**Trang lỗi chung** `error/error.jsp` cho mọi mã không có trang riêng (400, 413, 414, 501…), giữ nguyên mã trạng thái (`web.xml` đã khai).

## 3. Quy ước trang (thêm vào `docs/contracts.md` §8)

- Mọi `<form>` ghi rõ `action="${pageContext.request.contextPath}/<Trang>.jsp"` (kể cả form gửi về chính trang): sau một forward, URL trình duyệt là `doXxx.jsp`, form không có `action` sẽ gửi nhầm về đó.
- Trang xem tự gửi về chính nó chỉ xử lí khi là POST, dispatcher `REQUEST`, và nhận ra việc bằng tên nút gửi (`btnSearch`, `lnkChooseBook`, `lnkDeleteSelectedBook`, `btnCreateRentalBill`, `lnkViewDetail`, `lnkCancelRentalBill`, `btnCloseCancel`…). Request forward tới (từ `doXxx.jsp`) chỉ hiển thị.
- `doXxx.jsp`: dòng đầu từ chối mọi method khác POST bằng `response.sendError(405)` (C2). Kết thúc bằng forward (`request.getRequestDispatcher("/XxxView.jsp").forward(...)`) kèm request attribute `message` khi có câu báo. Không ghi thuộc tính session ngoài §7.
- Câu báo hiện bằng `<ui:message-box kind="success|error|info" text="${message}"/>`; câu lấy từ `Messages`, không gõ lại.
- Kiểu ô: `txtDob` là `type="date"` (gửi `yyyy-MM-dd`); `txtExpectedDays`, `txtQuantity` là `type="number"`; `txtExpectedPickupAt` là `type="datetime-local"` (gửi `yyyy-MM-ddTHH:mm`, giờ máy chủ `Asia/Ho_Chi_Minh`). Smoke và E2E gửi đúng các dạng này.
- Hộp huỷ của RentalBillListView (C1, C2): bấm `lnkCancelRentalBill` (value = id) gửi về chính trang; trang ghi `rentalBill` rồi hiện hộp `CANCEL_CONFIRM` với `txtCancelReason`, input ẩn `from=client`, `btnConfirmCancel` (`formaction="doCancelRentalBill.jsp"`) và `btnCloseCancel`.
- Bìa thật: `AppConfig.get().coversBaseUrl() + "/" + bookId + "/cover-{w}.webp"`, bìa thiếu thì nginx trả bìa giấy (D2); dùng `<ui:book-cover>` của phase 5.
- Không `<style>`, không `style=`, không `<script>` thực thi trong trang (CSP); chỉ `<script type="application/json">` cho props. Không CSS riêng: dùng tag phase 5 và lớp đã có; cần component mới thì báo orchestrator.

## 4. Stack chạy thử của từng lane

Mỗi lane muốn mở trang thật thì dựng stack E2E **riêng** từ worktree của mình (project, cổng, tag ảnh riêng; seed E2E dựng y hệt ch.2). Không dùng project `tiemtruyen` hay `tiemtruyen-e2e` (của orchestrator); xong lane thì `down` (không `-v`).

| Lane | Lệnh (chạy từ gốc worktree, cần `.env`: chép từ repo chính) | Mở |
|---|---|---|
| 6A | `NGINX_HTTP_PORT=8081 DB_HOST_PORT=3381 APP_IMAGE_TAG=l6a docker compose -p tiemtruyen-6a -f compose.yaml -f compose.e2e.yaml up --build -d --wait` | `http://127.0.0.1:8081` |
| 6B | như trên với `8082`, `3382`, `l6b`, `-p tiemtruyen-6b` | `http://127.0.0.1:8082` |
| 6C | như trên với `8083`, `3383`, `l6c`, `-p tiemtruyen-6c` | `http://127.0.0.1:8083` |
| 6D | không cần stack (Vitest + jsdom) | |

Tài khoản trên seed: nhân viên `hant`, quản lí `quanli`, khách `khach01`, `khach02` (mật khẩu: `docs/dev-accounts.md`). Khách `minhanh` của ch.2 do kịch bản đăng kí tạo. Phase 7 chạy song song ở phiên khác dùng dải cổng 8084–8089 và 3384–3389.

## 5. Smoke

`scripts/smoke/flow-m1-m2.mjs` (orchestrator) đi kịch bản ch.2 mục 2.1, 2.2 trên `http://127.0.0.1:${SMOKE_BASE_PORT:-8080}` của stack `tiemtruyen-e2e`; helper HTTP dùng chung (cookie jar, lấy token `csrf` từ HTML, gửi form, đọc câu báo) ở `scripts/smoke/lib/http.mjs` để `flow-m3.mjs` của phase 7 dùng lại. Smoke đọc trang bằng `id` của hợp đồng (`id` = `name`) và lớp `.tt-message-box`; lane giữ đúng các `id` đó.

## 6. Edge case ngoài báo cáo (chủ dự án yêu cầu 11/11/2026: bao quát mọi ngoại lệ và mọi trường hợp hay gặp thực tế)

Mọi ngoại lệ của ch.2 mục 2.1 (bước 6, 10) và 2.2 (bước 2, 5, 24) phải chạy và có trong smoke. Ngoài ra, mọi trang xử lí đủ các trường hợp dưới đây. **Không trường hợp nào được ra trang 500, stack trace, hay ghi DB sai.** Câu báo dùng §10.1 và §10.3 của `docs/contracts.md` (8 câu ngoài báo cáo chủ dự án duyệt 11/11/2026); luật mới ở §14 C14–C19.

### 6.1 Làm ngay (mỗi trường hợp một test hoặc một bước kiểm trong báo cáo lane)

**Chung (6A, cộng mọi trang)**
- POST khi session đã hết hạn hoặc chưa có (không có `csrfToken` trong session, người dùng để form mở quá 60 phút): không ghi gì; trang khách/nhân viên chuyển 302 về LoginView của vai kèm `?expired=1` (LoginView hiện `SESSION_EXPIRED`, `docs/contracts.md` C16), trang công khai chuyển 302 về chính trang xem không câu báo (doRegister → RegisterView). GET tới trang cần đăng nhập mà session id gửi lên đã hết hạn: cũng `?expired=1`. Session còn sống mà thiếu hoặc sai token: vẫn 403.
- Trang lỗi thêm 405 (`error/405.jsp`) và mọi exception không bắt (`java.lang.Throwable` → `error/500.jsp`); không lộ stack trace. Tomcat không hiện trang lỗi tiếng Anh ở bất kì mã nào.
- Mọi chữ do người dùng nhập khi in ra trang đều escape (`<c:out>`, `fn:escapeXml`), kể cả giá trị điền lại vào ô, ghi chú, lí do huỷ, tên khách; props island qua `JsonUtil.toScriptJson`. Smoke thử đăng kí họ tên chứa `<script>`.
- Dữ liệu nhập: `trim()` và chuẩn hoá Unicode NFC (`java.text.Normalizer`) mọi ô chữ trước khi kiểm và lưu (bàn phím macOS và một số bộ gõ gửi NFD).
- Bấm hai lần, F5 sau khi gửi, Back rồi gửi lại, mở trang `doXxx` hay trang xem bằng URL trực tiếp khi session thiếu thuộc tính cần đọc: không 500, không tạo bản ghi thứ hai; chuyển về trang đầu mối hợp lí (bảng ở 6C).
- id trên nút dòng (`lnkChooseBook`, `lnkViewDetail`, `lnkCancelRentalBill`, `lnkDeleteSelectedBook`, `chkSelectedBook`) không phải số, hoặc không có trong danh sách đang ở session (sửa HTML, phiếu của khách khác): bỏ qua, hiện lại trang; không bao giờ đọc hay huỷ được phiếu ngoài `listRentalBill` của chính khách.

**M1 (6B)**
- Đăng kí: số điện thoại cho phép gõ kèm dấu cách, chấm, gạch (`0912 345 678`) rồi bỏ đi trước khi kiểm C4; email lưu chữ thường; ngày sinh không hợp lệ (`2003-02-31`), ở tương lai, hôm nay, trước 1900 → `REGISTER_INVALID`; mật khẩu dài quá 128 kí tự → `REGISTER_INVALID` (chặn băm chuỗi khổng lồ); mọi ô vượt độ dài cột → `REGISTER_INVALID`. Trùng do hai người đăng kí cùng lúc (UNIQUE) → `REGISTER_DUPLICATE`. Gửi lại form đăng kí đã thành công (F5) → `REGISTER_DUPLICATE`, không tạo tài khoản thứ hai.
- Đăng nhập: tên đăng nhập `trim()`, ô trống thì `LOGIN_FAILED` không gọi DAO; tên đăng nhập không phân biệt hoa thường (collation `_ai_ci`). Khách đã đăng nhập mở `/LoginView.jsp` hoặc `/RegisterView.jsp` → 302 về `ClientHomeView.jsp`. Nhân viên đã đăng nhập mở trang đăng nhập khách: vẫn hiện (hai vai tách nhau).

**M2 (6C)**
| Trường hợp | Xử lí |
|---|---|
| `BookDetailView`, `doAddSelectedBook`, `doDeleteSelectedBook` khi session không có `book` hoặc `cart` | 302 về `SearchBookView.jsp` |
| `ConfirmRentalBillView` khi không có `rentalBill` hoặc `listRentedBook` rỗng | 302 về `SearchBookView.jsp` |
| `doAddRentalBill` khi không có `rentalBill` (bấm "Xác nhận" hai lần, F5 sau khi tạo) | 302 về `ClientHomeView.jsp`, không tạo phiếu thứ hai |
| `RentalBillDetailView` khi không có `rentalBill` | 302 về `RentalBillListView.jsp` |
| `doCancelRentalBill` khi không có `rentalBill` | 302 về trang danh sách của vai |
| Huỷ lần hai cùng phiếu (bấm hai lần) | nhánh D9: `RENTAL_BILL_CANCELLED` |
| `txtQuantity` trống, 0, âm, số thập phân, chữ, số lớn quá `int` | `QUANTITY_INVALID` + `aria-invalid`, hiện lại BookDetailView, giỏ không đổi |
| "Tạo phiếu mượn" khi không tích dòng nào | `BOOK_NOT_CHOSEN`, hiện lại SearchBookView |
| Thêm đầu truyện đã có trong giỏ | cộng dồn; kiểm vượt theo số quyển sẵn sàng **chưa** có trong giỏ (§10.1 ghi chú) |
| Đầu truyện có 0 quyển sẵn sàng | vẫn hiện trong kết quả tìm với "0"; thêm thì `QUANTITY_EXCEEDED` "(hiện còn 0 quyển)" |
| `txtExpectedDays` trống, chữ, thập phân, nhỏ hơn 1 | `EXPECTED_DAYS_INVALID` |
| `txtExpectedDays` > 30 (`RentalBill.MAX_EXPECTED_DAYS`, C15), kể cả số lớn quá `int` | `EXPECTED_DAYS_TOO_LONG` |
| `txtExpectedPickupAt` trống, sai dạng, ở quá khứ, đúng bằng hiện tại | `PICKUP_TIME_INVALID` |
| `txtNote`, `txtCancelReason` dài quá 255 | `INPUT_TOO_LONG` + `aria-invalid`, giữ chữ đã nhập |
| `txtCancelReason` trống hoặc chỉ dấu cách | `CANCEL_REASON_REQUIRED`, hộp xác nhận vẫn mở (C17) |
| `txtKeyword` chỉ có dấu cách | C9: `BOOK_NOT_FOUND`, không gọi DAO |
| `txtKeyword` dài quá 100 kí tự | `INPUT_TOO_LONG`, không gọi DAO |
| Từ khoá có `%`, `_`, `\` | tìm đúng chữ đó (DAO đã thoát, `DAO.java:166`) |
| Từ khoá không dấu hay khác hoa thường (`tham tu`, `CONAN`) | ra kết quả như có dấu (collation `utf8mb4_0900_ai_ci`) |
| Tích một phần giỏ rồi tạo phiếu | dòng không tích ở lại giỏ trong DB; mở lại "Tìm truyện" thấy lại |
| Hai tab: tab B xoá dòng giỏ trong lúc tab A đang ở "Xác nhận" | tab A xác nhận → `NOT_ENOUGH_COPIES` hoặc tạo phiếu đúng theo K1, không 500 |
| Quyển trong giỏ đã bị phiếu khác giữ | K1 đổi quyển cùng đầu truyện; không đủ thì `NOT_ENOUGH_COPIES` |
| Nhân viên vừa xử lí hoặc huỷ phiếu trong lúc khách bấm huỷ | D9: câu theo trạng thái mới, danh sách cập nhật dòng đó |

### 6.2 Đã chốt với chủ dự án (11/11/2026)

`docs/contracts.md` §10.3 (8 câu ngoài báo cáo, hằng trong `Messages`) và §14 C14–C19: đăng xuất `doLogout.jsp` (C14, lane 6B làm trang và nút ở ClientHomeView; 6A mở đường dẫn trong `AuthFilter`), số ngày thuê ≤ 30 (C15), session hết hạn `?expired=1` (C16, 6A + 6B), lí do huỷ bắt buộc (C17, 6C), phiếu quá hạn nhận không làm gì (C18). Không giới hạn ngày hẹn nhận, số phiếu chờ mỗi khách, độ dài tối thiểu mật khẩu.
