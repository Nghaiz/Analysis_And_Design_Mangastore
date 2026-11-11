# Phase 6: hợp đồng tích hợp giữa các lane

Owner: orchestrator (chốt 11/11/2026, bước 6.0, trước khi chia lane). Bổ sung cho `docs/contracts.md` (thắng về nghiệp vụ) và `phase-06-chuc-nang-1-2.md`; chỉ ghi những gì hai lane phải cùng hiểu. Lane thấy thiếu hay mâu thuẫn: dừng, ghi vào báo cáo, không tự đặt.

## 1. Owns bổ sung và file orchestrator đã tạo

| Lane | Thêm vào Owns ngoài dòng Owns của file phase | Ghi chú |
|---|---|---|
| 6A | 5 file khung `src/main/java/vn/tiemtruyen/filter/*Filter.java`, `WEB-INF/tags/csrf.tag` | Orchestrator tạo ở 6.0: filter cho qua, `csrf.tag` đã là bản thật. 6A viết đè. |
| 6B | `frontend/src/islands/ShelfScene/**`, `frontend/public/img/shelf/**`, `src/main/webapp/dev/HomePreviewView.jsp` | Ảnh tĩnh khung hẹp và trường `posterNarrowSrc` (`docs/contracts.md` §11.4). |
| 6C, 6D | không | |

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
- Thành công: `request.changeSessionId()`, ghi `client` / `staff` (không mật khẩu), `response.sendRedirect(contextPath + "/ClientHomeView.jsp")` (nhân viên: `/nhan-vien/StaffHomeView.jsp`).
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

**Header bảo mật** (`SecurityHeadersFilter`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`, `Cache-Control: no-store` cho `*.jsp`. CSP do nginx đặt (`contract.md` §10), filter không đặt lại.

## 3. Quy ước trang (thêm vào `docs/contracts.md` §8)

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
