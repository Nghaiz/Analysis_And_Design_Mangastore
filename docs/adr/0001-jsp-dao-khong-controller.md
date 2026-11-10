# ADR-0001: Kiến trúc JSP-DAO, không có Servlet điều khiển

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brief §3, §4; báo cáo ch.9; [`docs/contracts.md`](../contracts.md) mục 5, 8

## Bối cảnh

Brief bắt buộc **JSP + DAO + MySQL** và giữ kiến trúc JSP-DAO như báo cáo đã được thầy duyệt. Ch.9 thiết kế mỗi màn hình là một trang JSP gọi thẳng DAO; không có lớp điều khiển ở giữa.

## Quyết định

- Trang JSP là tầng điều khiển. Hai loại trang:
  - `XxxView.jsp`: có giao diện, chỉ gọi hàm DAO đọc (tìm, đăng nhập, lấy danh sách), tự gửi về chính nó khi tìm hoặc sửa bản sao trong session.
  - `doXxx.jsp`: không giao diện, mọi lần ghi DB đi qua đây, xong thì forward tới trang kế.
- Java chỉ có bốn package `vn.tiemtruyen.{dao,model,filter,util}`. Filter chỉ làm việc cắt ngang (UTF-8, đăng nhập và phân quyền, CSRF, security header, chặn đăng nhập sai), không điều khiển luồng nghiệp vụ.
- Không lớp nào kế thừa `HttpServlet` làm controller, không Spring, không framework MVC, không endpoint JSON.

## Hệ quả

- `ArchitectureTest` (phase 3) chặn lớp `HttpServlet`, gói `org.springframework`, hàm DAO ngoài danh sách.
- Kiểm hợp lệ form nằm trong trang `doXxx.jsp`; phần dùng lại được (định dạng tiền, mã DT/PM, thông báo) nằm ở `util`.
- React island không được gọi `fetch`; nó chỉ đổi input của form thật ([ADR-0004](0004-island-cach-b.md)).
- Trang JSP dài hơn kiến trúc MVC, đổi lại khớp từng trang với ch.9 để chấm.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Servlet điều khiển (MVC model 2) | Trái thiết kế ch.9 đã duyệt |
| Spring MVC hoặc Spring Boot | Brief cấm Spring |
| API JSON (JAX-RS) + giao diện SPA | Phá kiến trúc JSP-DAO, island thành API riêng |
