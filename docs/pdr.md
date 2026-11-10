# PDR: Tiệm thuê truyện tuổi thơ

<!-- updated 261111 -->

Tài liệu yêu cầu sản phẩm. Nguồn: brief `prompt-web-tiem-thue-truyen.md` §2–§7, brainstorm `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` (D1–D11, §10), kế hoạch `plans/261111-tiem-thue-truyen/plan.md`. Hợp đồng nghiệp vụ chi tiết: [`docs/contracts.md`](contracts.md). Phase 8 cập nhật file này theo những gì đã làm.

## 1. Mục tiêu

Dựng web thật của "Hệ thống quản lí cửa hàng cho thuê truyện" mà nhóm đã phân tích và thiết kế trong môn PTTK (báo cáo `B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf`, thầy đã duyệt). Web phải làm đúng thiết kế đã duyệt (tên trang, hàm DAO, bảng, thông báo) để đối chiếu được với báo cáo, đồng thời có giao diện riêng theo chủ đề tiệm truyện đầu ngõ Việt Nam cuối thập niên 90 và kho truyện thật.

## 2. Người dùng

| Vai | Ai | Làm gì |
|---|---|---|
| Khách vãng lai | Người chưa có tài khoản | Xem trang chủ, đăng kí, đăng nhập |
| Khách hàng thành viên (Client) | Người thuê truyện | Tìm đầu truyện, chọn truyện, tạo phiếu mượn, xem và huỷ phiếu của mình |
| Nhân viên bán hàng (Staff) | Nhân viên quầy | Tìm phiếu, sửa danh sách truyện, ghi tình trạng và lỗi, thêm khoản đặt cọc, xác nhận và in phiếu, huỷ phiếu |
| Quản lí (Staff, `position = "Quản lí"`) | Chủ tiệm | Như nhân viên, cộng trang quản trị thêm và sửa đầu truyện, thêm quyển (D6) |

## 3. Phạm vi

Ba chức năng của báo cáo, mỗi chức năng một module màn hình:

| Module | Chức năng | Trang (ch.9) |
|---|---|---|
| M1 | Khách hàng đăng kí | HomeView, RegisterView, doRegister, LoginView, ClientHomeView |
| M2 | Khách hàng tìm và chọn truyện muốn thuê trực tuyến | SearchBookView, BookDetailView, doAddSelectedBook, doDeleteSelectedBook, ConfirmRentalBillView, doAddRentalBill, RentalBillListView, RentalBillDetailView, doCancelRentalBill |
| M3 | Khách hàng đến nhận truyện tại quầy | StaffHomeView, SearchRentalBillView, ProcessRentalBillView, EditRentedBookListView, AddRentedBookView, doUpdateRentedBookList, AddConditionView, AddDamageView, doAddDamage, AddRentalCollateralView, AddCollateralView, doAddCollateral, doUpdateRentalBill, PrintRentalBillView (và LoginView, doCancelRentalBill dùng chung) |

Phần lõi thêm vào để web chạy thật:

- Kho 300–500 tập truyện thật crawl về (D4, D11), mỗi tập 1–5 quyển có mã vạch.
- Dữ liệu mẫu: loại lỗi, loại tài sản cọc, vài khách và nhân viên ([`docs/dev-accounts.md`](dev-accounts.md)).
- Trang quản trị đơn giản cho Quản lí (D6, **ngoài báo cáo**): `ManageBookView`, `AddBookView`, `doAddBook`, `EditBookView`, `doUpdateBook`.

**Ngoài phạm vi:** trả truyện, phí phạt, thống kê, deploy và cấu hình prod (Deferred #28).

## 4. Yêu cầu chức năng

Chi tiết từng trang (thành phần, field, session, DAO, trang kế, thông báo) là `docs/contracts.md` mục 9; luồng tóm tắt ở [`docs/page-flow.md`](page-flow.md). Ở mức sản phẩm:

| # | Yêu cầu | Hợp đồng |
|---|---|---|
| F1 | Khách đăng kí bằng họ tên, ngày sinh, CCCD, điện thoại, email, địa chỉ, tên đăng nhập, mật khẩu; trùng tên đăng nhập, CCCD, điện thoại hoặc email thì báo và giữ thông tin đã nhập; thành công thì tạo luôn giỏ truyện | mục 9.2 RegisterView, doRegister |
| F2 | Khách và nhân viên đăng nhập ở hai trang cùng tên `LoginView.jsp` (gốc và `/nhan-vien/`); sai nhiều lần bị chặn tạm (D5, Deferred #23) | mục 9.2 LoginView |
| F3 | Khách tìm đầu truyện theo tên hoặc tác giả, xem số quyển đang sẵn sàng và bìa thật, xem chi tiết | mục 9.2 SearchBookView, BookDetailView |
| F4 | Khách thêm số quyển muốn thuê vào "Truyện đã chọn", xoá đầu truyện khỏi đó; mỗi dòng giỏ là một quyển | mục 1, 9.2 doAddSelectedBook, doDeleteSelectedBook |
| F5 | Khách chọn các đầu truyện, nhập số ngày thuê và ngày giờ đến nhận, xác nhận phiếu mượn "Chờ nhận"; quyển được giữ cho khách, không hai khách giữ cùng một quyển | mục 6, 9.2 ConfirmRentalBillView, doAddRentalBill |
| F6 | Khách xem danh sách và chi tiết phiếu của mình, huỷ phiếu "Chờ nhận" kèm lí do | mục 9.2 RentalBillListView, RentalBillDetailView, doCancelRentalBill |
| F7 | Nhân viên tìm phiếu theo mã phiếu, tên khách hoặc CCCD; chỉ xử lí được phiếu "Chờ nhận" | mục 9.2 SearchRentalBillView |
| F8 | Nhân viên tích quyển khách nhận, sửa danh sách quyển (thêm, bỏ), ghi tình trạng và lỗi từng quyển, thêm loại lỗi mới | mục 9.2 ProcessRentalBillView, EditRentedBookListView, AddRentedBookView, AddConditionView, AddDamageView |
| F9 | Nhân viên thêm khoản đặt cọc (chọn hoặc thêm loại tài sản, nhập giá trị), nhập ngày hẹn trả, giảm giá, ghi chú | mục 9.2 AddRentalCollateralView, AddCollateralView, ProcessRentalBillView |
| F10 | Nhân viên xác nhận phiếu khi đủ bốn điều kiện, phiếu chuyển "Đang cho thuê", in phiếu khổ A5 | mục 10.2, 9.2 doUpdateRentalBill, PrintRentalBillView |
| F11 | Phiếu bị huỷ hoặc đã giao trong lúc bên kia đang thao tác thì báo theo trạng thái mới, không ghi đè (D9) | mục 6.3 |
| F12 | Quản lí thêm và sửa đầu truyện, thêm quyển (D6) | mục 9.2 "Trang quản trị D6", C12 |

Mọi câu thông báo lấy nguyên văn từ báo cáo (28 câu, `docs/contracts.md` mục 10); không thêm câu mới khi chủ dự án chưa duyệt.

## 5. Yêu cầu phi chức năng

| # | Yêu cầu | Đo bằng |
|---|---|---|
| N1 | Kiến trúc JSP-DAO như báo cáo: không Servlet điều khiển, không Spring, không getById, không DAO cho lớp trung gian, không cột dẫn xuất | `ArchitectureTest` ([ADR-0001](adr/0001-jsp-dao-khong-controller.md)) |
| N2 | Schema đúng ch.8, khác duy nhất `password varchar(255)` | `SchemaConformanceTest` ([`docs/schema.md`](schema.md), [ADR-0002](adr/0002-password-varchar-255.md)) |
| N3 | Không hai phiếu giữ cùng một quyển kể cả khi lập cùng lúc | Test tranh chấp Testcontainers ([ADR-0005](adr/0005-khoa-k1-dong-dau-truyen.md)) |
| N4 | Mọi POST thiếu token CSRF bị chặn 403; mật khẩu băm Argon2id; security header ở nginx | Test filter, Accept phase 1 bước 4 |
| N5 | Toàn bộ chữ giao diện bằng tiếng Việt, font hiển thị đúng dấu | Chụp màn hình chuỗi kiểm ở phase 5 ([ADR-0011](adr/0011-font-tu-host.md)) |
| N6 | Tương phản WCAG AA; có `prefers-reduced-motion`; cảnh 3D có bản tĩnh | axe, [`docs/design-tokens.md`](design-tokens.md) |
| N7 | Lighthouse cấu hình điện thoại ≥ 90 ở cả bốn hạng mục trên mọi trang có giao diện | Lighthouse (phase 8) |
| N8 | Chạy tốt ở khổ điện thoại 390×844 và máy tính 1440×900; console sạch, không request hỏng | Playwright |
| N9 | Form vẫn gửi được khi không có JavaScript | Island cách B ([ADR-0004](adr/0004-island-cach-b.md)) |
| N10 | Session sống qua lần khởi động lại app | Accept phase 1 bước 5 ([ADR-0006](adr/0006-session-redis-redisson.md)) |
| N11 | Pipeline dữ liệu tôn trọng `robots.txt` và điều khoản, giới hạn tốc độ, chạy lại được từ cache; nội dung crawl ngoài git | [`docs/data-pipeline.md`](data-pipeline.md) |
| N12 | Chỉ chạy localhost, mọi cổng mở trên `127.0.0.1` | `compose.yaml` ([ADR-0013](adr/0013-chi-chay-localhost.md)) |

## 6. Ràng buộc

- Công nghệ bắt buộc JSP + DAO + MySQL; phiên bản đã ghim ở [ADR-0003](adr/0003-jakarta-ee-11-tomcat-java-25.md).
- Không thiết kế lại hợp đồng của brief §3; muốn đổi thì nêu thẳng là đề xuất đổi thiết kế và hỏi chủ dự án.
- Giữ đúng thành phần và thứ tự từng màn hình của ch.2 và ch.9 (`images/svg/ui_m*_*.svg`); hình thức làm mới theo chủ đề.
- Bìa truyện thật chỉ ở chỗ hiển thị dữ liệu; phần trang trí tự vẽ, không logo nhà xuất bản hay nhân vật có bản quyền.
- Nội dung crawl chỉ dùng riêng, không công khai (D11).

## 7. Tiêu chí nghiệm thu

Theo brainstorm §10:

1. Ba kịch bản chuẩn và mọi ngoại lệ ở ch.2 chạy đúng trên Playwright, dùng seed E2E, cả khổ điện thoại lẫn máy tính, console sạch, không request hỏng.
2. 28 thông báo khớp từng chữ.
3. Schema qua Flyway khớp ch.8 (trừ D1), có test so cột với tài liệu.
4. Không có getById, không DAO cho SelectedBook, RentedBook, RentedDamage, RentalCollateral, không cột dẫn xuất (test kiến trúc).
5. Test tranh chấp quyển đều xanh.
6. Mọi POST thiếu token CSRF bị chặn 403.
7. Lighthouse điện thoại ≥ 90 cả bốn hạng mục; tương phản AA; có `prefers-reduced-motion`; cảnh 3D có bản tĩnh.
8. Kho 300–500 Book thật, có bìa, có manifest nguồn; báo cáo validate không lỗi chặn.
9. CI xanh: lint, build, unit, integration, E2E, quét image.

## 8. Lộ trình

| Phase | Nội dung | Trạng thái (11/11/2026) |
|---|---|---|
| 1 | Khung dự án và hạ tầng | Đạt (Accept 8/8) |
| 2 | Bộ công cụ AI: `AGENTS.md`, rule, skill, agent, `docs/` | Đang làm |
| 3 | Schema, DAO và test DAO | |
| 4 | Pipeline crawl và seed (dừng chờ chủ dự án sau chạy thử 10 đầu truyện) | |
| 5 | Hệ thiết kế giao diện (song song với phase 4) | |
| 6 | Chức năng 1 và 2 (M1, M2) | |
| 7 | Chức năng 3 (M3) và trang quản trị D6 | |
| 8 | E2E, CI và hoàn thiện | |

Chi tiết từng phase: `plans/261111-tiem-thue-truyen/phase-0N-*.md`.
