# Phase 6: Chức năng 1 và 2 (M1, M2)

Lane: serial
Depends-on: 4, 5
Effort: L
Owns: `src/main/java/vn/tiemtruyen/filter/**`, `src/test/java/vn/tiemtruyen/filter/**`, `src/main/webapp/WEB-INF/tags/csrf.tag`, `src/main/webapp/WEB-INF/web.xml`, `src/main/webapp/HomeView.jsp`, `src/main/webapp/RegisterView.jsp`, `src/main/webapp/doRegister.jsp`, `src/main/webapp/LoginView.jsp`, `src/main/webapp/ClientHomeView.jsp`, `src/main/webapp/SearchBookView.jsp`, `src/main/webapp/BookDetailView.jsp`, `src/main/webapp/doAddSelectedBook.jsp`, `src/main/webapp/doDeleteSelectedBook.jsp`, `src/main/webapp/ConfirmRentalBillView.jsp`, `src/main/webapp/doAddRentalBill.jsp`, `src/main/webapp/RentalBillListView.jsp`, `src/main/webapp/RentalBillDetailView.jsp`, `src/main/webapp/doCancelRentalBill.jsp`, `src/main/webapp/error/**`, `frontend/src/islands/SelectedStack/**`, `compose.e2e.yaml`
Creates: `scripts/accept/phase-06.mjs`, `scripts/smoke/flow-m1-m2.mjs`, `compose.e2e.yaml`, `src/main/java/vn/tiemtruyen/filter/CsrfFilter.java`, `frontend/src/islands/SelectedStack/index.tsx`, `frontend/src/islands/SelectedStack/SelectedStack.test.tsx`
AX: AX-04 và AX-05 cho `scripts/smoke/flow-m1-m2.mjs` và `scripts/accept/phase-06.mjs` (exit 1 kèm bước kịch bản ch.2 hỏng, trang, câu chờ và câu nhận); AX-07 không hỏi tương tác
Accept: `node scripts/accept/phase-06.mjs`

## Mục tiêu

Mọi trang M1 và M2 của ch.9 chạy thật trên JSP-DAO: đăng kí, đăng nhập khách, trang chính khách, tìm và chọn truyện, "Truyện đã chọn" (island `SelectedStack`), xác nhận phiếu, danh sách và chi tiết phiếu, huỷ phiếu. Cùng các filter dùng chung (UTF-8, security headers, CSRF, đăng nhập và phân quyền, giới hạn đăng nhập sai). Giữ đúng thành phần và thứ tự màn hình (`images/svg/ui_m1_*.svg`, `ui_m2_*.svg`), luật trang và session, thông báo nguyên văn.

Hợp đồng: `docs/contracts.md` (tên trang, field, session, DAO, props `SelectedStack`, ma trận phân quyền, Deferred #11, #13, #23). Kịch bản: báo cáo ch.2 mục 2.1, 2.2 (trang in 5–13). Chi tiết trang: ch.9 mục 9.1, 9.2 (trang in 56–70; số trang PDF = trang in + 2). Skill: `.claude/skills/tiem-add-jsp-page/SKILL.md`, `.claude/skills/tiem-create-react-island/SKILL.md`.

## Các bước

- [ ] **6.0 Orchestrator, tuần tự (file dùng chung, test trước):** `web.xml` khai thứ tự filter `Utf8Filter` → `SecurityHeadersFilter` → `CsrfFilter` → `AuthFilter` → `LoginRateLimitFilter` (chỉ POST tới hai trang `LoginView.jsp`), trang lỗi 403/404/500 tiếng Việt; `compose.e2e.yaml` (`FLYWAY_DATA_LOCATION=classpath:db/e2e`, ngưỡng `LOGIN_RATE_*` cao hơn, compose project riêng nên DB riêng; `contract.md` §3); `scripts/smoke/flow-m1-m2.mjs` (HTTP thuần với cookie jar: lấy token CSRF từ HTML, đi kịch bản ch.2 mục 2.1 và 2.2 trên seed e2e, so thông báo từng chữ, POST thiếu token phải 403); `scripts/accept/phase-06.mjs`. Commit; smoke đỏ ở thời điểm này là đúng.
- [ ] **6.1 Lane 6A `filter-chung`**, **6.2 Lane 6B `trang-m1`**, **6.3 Lane 6C `trang-m2`** song song (3 chỗ).
- [ ] **6.4 Lane 6D `island-selected-stack`** xếp hàng, mở khi lane đầu tiên trong 6A–6C xong.
- [ ] **6.5 Orchestrator:** merge 6A, 6B; chạy nền compose e2e; mở **6.6 Lane 6E `xac-minh-m1`**.
- [ ] **6.7 Orchestrator:** merge 6C, 6D; mở **6.8 Lane 6F `xac-minh-m2`**.
- [ ] **6.9 Orchestrator:** chạy `tiem-contract-guard` trên diff của phase (agent dự án, chỉ đọc); sửa vi phạm bằng cách brief lại lane sở hữu; chạy Accept, đánh dấu, push nhánh phase, mở PR vào `main` và merge bằng merge commit (`contract.md` §9).

## Lane trong phase

Tối đa 3 agent cùng lúc. Thứ tự: 6A, 6B, 6C chạy cùng lúc → 6D vào chỗ trống đầu tiên → 6E, 6F (kiểm) vào chỗ trống khi phần chúng kiểm đã merge.

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 6A `filter-chung` | `filter/Utf8Filter`, `SecurityHeadersFilter`, `CsrfFilter` (token gắn session, đổi sau đăng nhập, kiểm mọi POST tới `*.jsp`, thiếu hoặc sai thì 403), `AuthFilter` (ma trận của `docs/contracts.md`; chưa đăng nhập thì về đúng LoginView của vai), `LoginRateLimitFilter` (Redis qua Redisson, ngưỡng từ `LOGIN_RATE_*`, câu báo dùng lại nguyên văn theo Deferred #23); tag `WEB-INF/tags/csrf.tag`; trang `src/main/webapp/error/**`; test filter bằng request/response giả | `t1k-web-core-developer` | `filter/**`, `src/test/java/vn/tiemtruyen/filter/**`, `WEB-INF/tags/csrf.tag`, `src/main/webapp/error/**` | 6.0 |
| 6B `trang-m1` | `HomeView.jsp` thật (lời chào "Chào mừng bạn đến với cửa hàng cho thuê truyện!", nút "Đăng nhập", "Đăng kí", kệ `ShelfScene` theo D10, ảnh tĩnh khi không JS), `RegisterView.jsp` (9 ô theo ch.2, giữ giá trị đã nhập khi lỗi), `doRegister.jsp` (gọi `ClientDAO.addClient`; bốn câu của mục Đăng kí), `LoginView.jsp` của khách (tự gửi về chính nó, gọi `ClientDAO.checkLogin`, lưu `client` vào session), `ClientHomeView.jsp` (họ tên, nút "Tìm và thuê truyện", "Phiếu mượn của tôi") | `t1k-web-core-developer` | 5 trang M1 ở dòng Owns | 6.0 |
| 6C `trang-m2` | `SearchBookView.jsp` (tạo `rentalBill` khi mở, tìm theo tên hoặc tác giả qua `BookDAO.searchBook`, bảng 6 cột, khung "Truyện đã chọn" render HTML sẵn và chỗ gắn `SelectedStack`, nút "Tạo phiếu mượn"), `BookDetailView.jsp`, `doAddSelectedBook.jsp` (kiểm số lượng, câu "Số lượng vượt quá…"), `doDeleteSelectedBook.jsp`, `ConfirmRentalBillView.jsp` (tự gửi về chính nó để tính tổng khi nhập số ngày; tổng chỉ tính lúc hiển thị), `doAddRentalBill.jsp` (gọi `addRentalBill`, bỏ `cart` và `rentalBill` khỏi session, câu thành công nguyên văn), `RentalBillListView.jsp` (nút "Huỷ phiếu" chỉ ở phiếu "Chờ nhận", hộp xác nhận kèm ô "Lí do huỷ"), `RentalBillDetailView.jsp`, `doCancelRentalBill.jsp` (cả hai nhánh theo Deferred #13; D9 theo Deferred #11) | `t1k-web-core-developer` | 9 trang M2 ở dòng Owns | 6.0 |
| 6D `island-selected-stack` | `frontend/src/islands/SelectedStack/**`: chồng truyện buộc dây, ô tích, nút Xoá, gộp theo đầu truyện; chỉ đổi input thật trong form của `SearchBookView` rồi `requestSubmit`; giảm chuyển động thì không hiệu ứng; test Vitest (gộp dòng, tích chọn, xoá gửi đúng field, không gọi `fetch`) | `t1k-web-core-developer` | `frontend/src/islands/SelectedStack/**` | 6.0 |
| 6E `xac-minh-m1` | Playwright MCP đi kịch bản ch.2 mục 2.1 và hai ngoại lệ (bước 6, bước 10) trên seed e2e, khổ 390×844 và 1440×900; console sạch, không request hỏng; ảnh vào `plans/reports/screens/phase-06/m1/` | `t1k-web-testing-tester` | chỉ ghi `plans/reports/` | 6A, 6B đã merge |
| 6F `xac-minh-m2` | Playwright MCP đi kịch bản ch.2 mục 2.2 và mọi ngoại lệ (bước 2, bước 5 "Thần đồng đất Việt", bước 24 xem và huỷ phiếu), cả khi tắt JS (bản HTML của "Truyện đã chọn" vẫn dùng được); ảnh vào `plans/reports/screens/phase-06/m2/` | `t1k-web-testing-tester` | chỉ ghi `plans/reports/` | 6C, 6D đã merge |

Mang từ phase 1 (`plans/reports/phase-01-frontend-khung-261111-0342.md` mục 158, soát 11/11/2026): loader gọi `createRoot` với `onUncaughtError` để log có tên island, và gắn `data-island-state="mounted|failed"` lên khung island để E2E phase 8 chờ island mount thay cho chờ theo thời gian. Đã làm ở phase 5 (c3af339 trên `phase/05-he-thiet-ke-giao-dien`, hằng `STATE_ATTRIBUTE` ở `frontend/src/loader/mount-islands.ts`, 3 test): `mounted` khi lượt render đầu đã lên lịch, `failed` khi island bị loại, không nạp được hoặc crash (crash sau ghi đè `mounted`, không ngược lại), `console.error` đúng một lần kèm tên island. 6D chỉ kiểm lại trên island `SelectedStack`.

Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent. Trang dùng tag của phase 5 (`layout.tag`, `ui/*.tag`), không tự viết CSS riêng; cần component mới thì báo orchestrator. Mọi form gửi tới `doXxx.jsp` có `<t:csrf/>`. Mọi ghi DB đi qua `doXxx.jsp` không giao diện. Dòng được chọn trong danh sách do trang chứa danh sách lưu vào session.

## Tiêu chí hoàn thành

1. `mvnw -B verify` xanh (test filter, cộng toàn bộ test phase 3).
2. Test frontend xanh, có test của `SelectedStack`.
3. `scripts/smoke/flow-m1-m2.mjs` xanh trên compose e2e: đăng kí (thành công và trùng), đăng nhập (sai rồi đúng), tìm "Doraemon", "Conan", "Thần đồng đất Việt" (không thấy), chọn, xác nhận ra PM0125 với tổng 42.000đ, danh sách, chi tiết, huỷ PM0117; mọi câu khớp từng chữ; POST thiếu CSRF bị 403; trang khách chưa đăng nhập bị chuyển về LoginView.
4. Báo cáo của 6E và 6F: console sạch, không request hỏng, có ảnh hai khổ cho mỗi trang.
5. `tiem-contract-guard` không báo vi phạm nào còn mở.
6. Accept phase 3 (`mvnw verify` đã gồm), phase 5 (build và ba script kiểm) vẫn xanh.

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-06.mjs` chạy tiêu chí 1–3 và 6. Tiêu chí 4–5 ghi trong báo cáo. Bước làm đỏ có chủ đích: bỏ `<t:csrf/>` khỏi một form thì smoke phải FAIL.

## Playwright MCP

Áp dụng: sau mỗi chức năng (lane 6E cho M1, 6F cho M2), như luật chung trong `plan.md`.

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sót thành phần hoặc sai thứ tự so với màn hình ch.9 | medium | medium | Lane đối chiếu từng SVG; 6E, 6F chụp ảnh để so |
| Island tự sửa session hay gọi `fetch` | low | high | ESLint của phase 5, test `SelectedStack`, `tiem-contract-guard` |
| Trang tự tính và lưu tổng tiền (thuộc tính dẫn xuất) | medium | high | Tổng chỉ tính lúc hiển thị; ArchitectureTest và SchemaConformanceTest không cho cột mới |
| Ngày giờ hẹn đã qua làm hỏng kịch bản ch.2 | high | medium | Ngày tương đối theo Deferred #15 trong smoke và trong kiểm MCP |
| Chặn đăng nhập sai làm hỏng E2E | medium | low | Ngưỡng cấu hình qua biến; `compose.e2e.yaml` đặt ngưỡng cao hơn số lần sai của kịch bản |
| Kệ 3D trên điện thoại: ảnh tĩnh chụp cả căn phòng, cảnh 3D phóng vào kệ (để nhãn gáy đọc được), nên khung hình đổi trong 300 ms chuyển mờ (chủ dự án chọn làm ở phase 6, 11/11/2026; `plans/reports/phase-05-ke-3d-sua-261111-0847.md`) | high | low | Lane 6B thêm ảnh tĩnh thứ hai cho khung hẹp (chỉ kệ, khớp góc máy 3D) và trường ảnh tương ứng trong props `ShelfScene` (`docs/contracts.md` §11.4, orchestrator sửa trước khi chia lane); xem lại đề xuất `posterAvifSrcSet` của lane 5C cùng lúc |
| Việc phase 5 để lại cho trang thật | medium | low | Bảng `tt-ledger-table` chưa có khung cuộn ngang trên điện thoại: trang có nhiều cột bọc bảng trong khung cuộn; dialog shadcn chưa có hoạt cảnh (`tw-animate-css` không nằm trong entry CSS) (`plans/reports/phase-05-token-tag-261111-0812.md` §6) |

## Rollback

`git revert -m 1 <merge phase 6>`; schema và dữ liệu không đổi trong phase này.

## Ước lượng

Effort L: khoảng 8–12 giờ agent (ESTIMATED: 6A khoảng 2 giờ; 6B khoảng 2–3 giờ; 6C khoảng 4–5 giờ; 6D khoảng 2 giờ xếp hàng sau; hai lần kiểm MCP khoảng 1,5 giờ; tích hợp khoảng 1 giờ).
