---
name: tiem-add-jsp-page
description: Dùng khi thêm hoặc sửa trang JSP (XxxView.jsp, doXxx.jsp, nhan-vien/, quan-tri/): tên trang, field form, session, CSRF, <t:assets/>, trang quay về.
effort: medium
---

# Thêm hoặc sửa một trang JSP

Trang JSP là tầng điều khiển (JSP-DAO, không Servlet, không Spring). Mọi tên, field, thuộc tính session và câu báo lấy từ `docs/contracts.md`; skill này chỉ nói cách làm, không chép bảng.

## Đọc trước

- `docs/contracts.md` §9.1 (dòng của trang: đường dẫn, loại, vai, DAO), §9.2 (mục riêng của trang), §8 (quy ước trang), §7 (session), §10 (câu báo), §12 (phân quyền), §13 (hiển thị), §14 C1, C2, C3, C6, C8, C10.
- `.claude/rules/tiem-session-rules.md` và `.claude/rules/tiem-business-contract.md`.
- Màn hình gốc: `images/svg/ui_m*_<Tên trang>.svg`; chi tiết: PDF ch.9 (trang in 56–86, số trang PDF = trang in + 2).

## Các bước

1. **Tìm trang trong §9.1.** Tên file, thư mục và hàm DAO phải đúng bảng. Trang không có trong bảng (kể cả trang "tiện thêm") → dừng, ghi đề xuất vào báo cáo lane, không tạo.
2. **Đặt đúng thư mục:** trang khách và `doCancelRentalBill.jsp` ở `src/main/webapp/`; trang nhân viên và `LoginView.jsp` thứ hai ở `src/main/webapp/nhan-vien/`; trang D6 ở `src/main/webapp/nhan-vien/quan-tri/`; trang công cụ ở `src/main/webapp/dev/`.
3. **Chọn loại trang:**
   - `XxxView.jsp`: có giao diện; chỉ gọi hàm DAO **đọc** ghi ở §9.1 (tìm, đăng nhập, lấy danh sách); tự gửi về chính nó khi tìm, đăng nhập, sửa bản sao trong session.
   - `doXxx.jsp`: không giao diện; chỉ nhận POST (GET trả 405, C2); đọc field + session, gán vào model, gọi đúng một hàm DAO **ghi**, đặt câu vào request attribute `message`, rồi `forward` tới trang kế.
4. **Viết form:** `<form method="post">`, có `<t:csrf/>` (có từ phase 6) ngay trong form. `name` và `id` của mỗi field trùng nhau, đúng §9.2. Nút trên dòng: `<button type="submit" name="lnkXxx" value="<id | mã vạch | STT>">` (C1). Nút sang `doXxx.jsp` dùng `formaction`; nút không `formaction` gửi về chính trang. "Quay lại" và link sang trang xem không mang dữ liệu là `<a href>`.
5. **Session:** chỉ dùng 12 thuộc tính của §7, đúng cột "Ghi bởi / Đọc bởi / Bỏ bởi" của trang. Dòng được chọn do **trang chứa danh sách** lưu vào session (lấy phần tử theo id trong danh sách đã có trong session); trang sau chỉ đọc. Sửa trên bản sao (`rentedBook`, `listRentedBook`), chỉ thay vào `rentalBill` khi "Lưu".
6. **Gọi DAO bằng try-with-resources:** `try (RentalBillDAO dao = new RentalBillDAO()) { ... }`. Không giữ DAO trong session hay field. Không có hàm đọc theo id: cần trạng thái mới thì gọi hàm danh sách đã có (§6.3).
7. **Câu báo:** chỉ dùng hằng `vn.tiemtruyen.util.Messages.*` (tên hằng ở §10.1), không gõ lại chuỗi ở trang. `QUANTITY_EXCEEDED` đi qua hàm định dạng thay `N`, không ghép chuỗi tay.
8. **`<head>`:** nạp CSS/JS bằng đúng một tag `<t:assets/>` (`WEB-INF/tags/assets.tag`, khai `<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>`). Từ phase 5 dùng khung `<t:layout>` (`WEB-INF/tags/layout.tag`, có từ phase 5), tag này đã gọi `<t:assets/>`.
9. **Hiển thị theo §13:** mã `DT`/`PM` qua `util/Codes`, tiền `3.000đ`, ngày `dd/MM/yyyy`, ngày giờ `HH:mm dd/MM/yyyy`; số lượng và mọi tổng tính lúc hiển thị, không lưu. Bìa thật chỉ ở kết quả tìm, chi tiết đầu truyện và phiếu mượn (§8).
10. **Island (nếu §9.2 có):** đặt chỗ gắn trong form, sau bản HTML đầy đủ; làm theo skill `tiem-create-react-island`. Trang phải chạy hết luồng khi tắt JS.

Khung tối thiểu của một trang xem tự gửi:

```jsp
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><title>Tìm truyện</title><t:assets/></head>
<body>
<form method="post">
  <t:csrf/>
  <input type="text" name="txtKeyword" id="txtKeyword">
  <button type="submit" name="btnSearch" id="btnSearch">Tìm</button>
</form>
</body>
</html>
```

## Gotchas

- `LoginView.jsp` có hai bản: gốc gọi `ClientDAO.checkLogin`, `/nhan-vien/` gọi `StaffDAO.checkLogin`. Đăng nhập thành công thì đổi session id; câu sai luôn là `LOGIN_FAILED`, kể cả khi bị chặn vì sai nhiều lần.
- `client` do `doRegister.jsp` lưu có `id = 0` và **không** có mật khẩu (C5); filter không coi là đã đăng nhập. Không bao giờ để mật khẩu trong session.
- `doCancelRentalBill.jsp` là **một** file ở gốc cho cả hai vai; form gửi input ẩn `from` = `client` hoặc `staff`, không khớp session thì 403 (C8). Phải thay cả phần tử cùng id trong `listRentalBill` (§7).
- Session nằm trong Redis: `rentalBill` và phần tử cùng id trong `listRentalBill` là hai đối tượng khác nhau sau tuần tự hoá. Gán lại thuộc tính bằng `session.setAttribute` sau khi sửa, kể cả khi sửa tại chỗ.
- `ConfirmRentalBillView.jsp` gửi về chính nó để tính lại tổng nhưng **không** ghi session (C3).
- Từ khoá trống ở mọi trang tìm → không gọi DAO, hiện câu "không tìm thấy" của trang (C9).
- Đầu vào không có câu báo trong báo cáo (C10): không thêm câu mới; hiện lại trang, đánh dấu ô bằng `aria-invalid`.
- `doXxx.jsp` trả `false` ở ba trang gọi `updateRentalBill` → xử lí D9 theo §6.3 (đọc lại bằng hàm danh sách, chọn câu theo trạng thái mới).
- Không thêm thuộc tính session mới, kể cả "tạm"; thuộc tính kĩ thuật duy nhất được phép là token CSRF và `probeCount` của trang dev.
- CSP `script-src 'self'; style-src 'self'`: không `<script>` nội tuyến chạy được, không `onclick=`, không thuộc tính `style=` trong JSP. Props island là `<script type="application/json">` (không chạy nên không vướng CSP). CSP dev (`APP_VITE_DEV=true`) có `'unsafe-inline'` ở `style-src`, nên `style=` hay `<style>` lọt ở dev nhưng bị chặn ở build: trang chỉ tính là xong khi `node scripts/check/csp-page-check.mjs --mode build --url <trang>` qua.

## Lệnh kiểm

| Việc | Lệnh | Có từ |
|---|---|---|
| Build và test Java (Checkstyle, JUnit) | `node scripts/dev/mvnw.mjs -B verify` | phase 1 |
| Dựng stack, chờ healthy | `docker compose up --build -d --wait` | phase 1 |
| Kiểm app qua nginx | `curl -fsS http://127.0.0.1:8080/health.jsp` | phase 1 |
| POST thiếu CSRF phải 403 | `curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8080/doRegister.jsp` | phase 6 |
| Smoke luồng chức năng 1 và 2 | `node scripts/smoke/flow-m1-m2.mjs` | phase 6 |
| Smoke luồng chức năng 3 | `node scripts/smoke/flow-m3.mjs` | phase 7 |
| Kiểm hợp đồng trên diff | agent `tiem-contract-guard` với base là nhánh phase | phase 2 |

Sau mỗi trang: Playwright MCP mở trang thật ở 390×844 và 1440×900, đi kịch bản chuẩn và ngoại lệ ch.2; console không error/warning, không request ≥ 400 hay hỏng. Thử thêm một lần khi tắt JavaScript.

## Danh sách kiểm tra

- [ ] Tên file, thư mục, loại trang và hàm DAO đúng §9.1.
- [ ] Thành phần và thứ tự đúng §9.2 và SVG; chữ hiển thị tiếng Việt đúng ch.2/ch.9.
- [ ] Mọi `<form>` là POST, có `<t:csrf/>`; field `name` = `id` = tên §9.2 / C1.
- [ ] `XxxView.jsp` chỉ gọi DAO đọc; ghi DB chỉ qua `doXxx.jsp`; `doXxx.jsp` từ chối GET.
- [ ] Chỉ đọc, ghi, bỏ đúng các thuộc tính session của §7 cho trang này; dòng chọn lấy từ danh sách trong session.
- [ ] Câu báo lấy từ `Messages`, không chuỗi gõ tay; không câu mới.
- [ ] DAO mở bằng try-with-resources; không hàm đọc theo id.
- [ ] Mã, tiền, ngày theo §13; tổng tính lúc hiển thị.
- [ ] Trang chạy được khi tắt JS; island (nếu có) nằm trong form.
- [ ] Đã chạy lệnh kiểm và Playwright MCP, console và network sạch.
