# AGENTS.md: Tiệm thuê truyện tuổi thơ

<!-- updated 261111 -->

Hướng dẫn cho mọi agent (Claude, Codex, …) làm việc trong repo này. Claude đọc thêm `CLAUDE.md`. Viết bằng tiếng Việt; toàn bộ chữ trên giao diện cũng bằng tiếng Việt.

## 1. Tổng quan

Web thật của hệ thống quản lí cửa hàng cho thuê truyện mà nhóm đã phân tích và thiết kế trong môn PTTK (báo cáo `B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf`, thầy đã duyệt). Làm đúng 3 chức năng của module M1:

1. Khách hàng đăng kí.
2. Khách hàng tìm và chọn truyện muốn thuê trực tuyến (đăng nhập, tìm đầu truyện, "Truyện đã chọn", tạo và xác nhận phiếu mượn, xem và huỷ phiếu của mình).
3. Khách hàng đến nhận truyện tại quầy (nhân viên tìm phiếu, sửa danh sách truyện, ghi tình trạng và lỗi, thêm khoản đặt cọc, xác nhận và in phiếu).

Cộng phần lõi: kho 300–500 tập truyện thật crawl về, dữ liệu mẫu, trang quản trị đơn giản cho "Quản lí" (D6). **Ngoài phạm vi:** trả truyện, phí phạt, thống kê, deploy. Dự án chỉ chạy localhost, không có prod (Deferred #28).

Công nghệ bắt buộc: **JSP + DAO + MySQL**, kiến trúc JSP-DAO như báo cáo. Phiên bản đã ghim: Java 25, Tomcat 11.0.27 (Jakarta EE 11), MySQL 8.4.13, Redis 8.10.3 (session qua Redisson), HikariCP, Flyway, Password4j Argon2id, Vite 8 + React 19.3 + Tailwind 4 + shadcn/ui cho island, three/r3f cho cảnh 3D, Motion cho chuyển động; nguồn và lí do: `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` §5, `docs/adr/`.

## 2. Đọc gì trước (nguồn sự thật nằm trên đĩa)

| Cần biết | File |
|---|---|
| Hợp đồng nghiệp vụ và tích hợp: bảng, model, DAO, khoá K1, session, 28 trang, field form, 28 thông báo của báo cáo cộng 9 câu ngoài báo cáo (§10.3), props island, phân quyền, hiển thị, mục 14 (điểm báo cáo không trả lời, đã chốt) | `docs/contracts.md` (SSOT, thắng mọi file khác về nghiệp vụ) |
| Hạ tầng: cây thư mục, service, cổng, biến môi trường, build, Accept, file dùng chung, git | `plans/261111-tiem-thue-truyen/contract.md` (thắng về hạ tầng) |
| Kế hoạch, phase, quyết định Deferred | `plans/261111-tiem-thue-truyen/plan.md`, `phase-0N-*.md` |
| Ai đang làm lane nào | `plans/261111-tiem-thue-truyen/agent-map.md` |
| Lí do của quyết định D1–D11 | `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` |
| Brief gốc của chủ dự án | `prompt-web-tiem-thue-truyen.md` (chỉ đọc) |
| Chi tiết từng màn hình | báo cáo PDF ch.9 (trang in 56–86 = trang PDF 58–88; đọc bằng `Read` với `pages`, tối đa 20 trang mỗi lần), ch.2 (kịch bản), ch.10 (luồng); ảnh `images/svg/ui_m*_*.svg` |
| Kiến trúc, từ điển Việt - Anh, ERD, luồng trang, token giao diện, ADR | `docs/architecture.md`, `docs/glossary.md`, `docs/schema.md`, `docs/page-flow.md`, `docs/design-tokens.md`, `docs/adr/` |

Không suy đoán nghiệp vụ. Chỗ nào nguồn không trả lời thì xem `docs/contracts.md` mục 14 (điểm báo cáo không trả lời, đã chốt); điểm mới thì dừng và báo orchestrator, không tự đặt luật.

## 3. Lệnh chạy

Chạy từ gốc repo. Cột "Có từ" là phase đầu tiên mà lệnh chạy được. Lệnh lâu (Maven, compose, test, crawl) chạy nền.

| Việc | Lệnh | Có từ |
|---|---|---|
| Tạo `.env` thật từ `.env.example` (mật khẩu ngẫu nhiên, không in ra) | `node scripts/dev/make-env.mjs` | phase 1 |
| Cài gói frontend | `npm --prefix frontend ci` | phase 1 |
| Lint frontend (ESLint) | `npm --prefix frontend run lint` | phase 1 |
| Test frontend (Vitest) | `npm --prefix frontend run test` | phase 1 |
| Kiểm kiểu TypeScript | `npm --prefix frontend run typecheck` | phase 1 |
| Build frontend (ra `src/main/webapp/static/`) | `npm --prefix frontend run build` | phase 1 |
| Vite dev server (cổng 5173); bật trang dev bằng `APP_VITE_DEV=true docker compose up --build -d --wait` (không sửa `.env`), mở `http://localhost:8080` | `npm --prefix frontend run dev` | phase 1 |
| Kiểm CSP và nguồn nạp của một trang (`--mode dev` khi đang bật Vite dev) | `node scripts/check/csp-page-check.mjs --mode build` | phase 4 |
| Build và test Java (Checkstyle, JUnit, Testcontainers) bằng JDK 25, không đổi env hệ thống | `node scripts/dev/mvnw.mjs -B verify` | phase 1 |
| Build WAR, bỏ test | `node scripts/dev/mvnw.mjs -B package -DskipTests` | phase 1 |
| Dựng và chạy stack (app, db, redis, nginx), chờ healthy | `docker compose up --build -d --wait` | phase 1 |
| Xem trạng thái service | `docker compose ps` | phase 1 |
| Xem log một service | `docker compose logs app` | phase 1 |
| Dừng stack, **giữ** volume (không bao giờ thêm `-v` khi chủ dự án chưa đồng ý) | `docker compose down` | phase 1 |
| Kiểm app qua nginx | `curl -fsS http://127.0.0.1:8080/health.jsp` | phase 1 |
| Mở MySQL trong container | `docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" tiemtruyen'` | phase 1 |
| Test các script kiểm của repo | `node --test "scripts/check/*.test.mjs"` | phase 1 |
| Accept phase 1 | `node scripts/accept/phase-01.mjs` | phase 1 |
| So khối brief §10 giữa `AGENTS.md`, rule và brief (từng byte) | `node scripts/check/section10-sync.mjs` | phase 2 |
| Accept phase 2 | `node scripts/accept/phase-02.mjs` | phase 2 |
| Accept phase 3 (migration, DAO, test tranh chấp, kiến trúc) | `node scripts/accept/phase-03.mjs` | phase 3 |
| Cài gói pipeline dữ liệu | `npm --prefix pipeline ci` | phase 4 |
| Test pipeline (Vitest, không gọi mạng) | `npm --prefix pipeline test` | phase 4 |
| Đếm ứng viên từng bộ truyện (≤ 40 request) | `node pipeline/cli.mjs census` | phase 4 |
| Chạy thử 10 đầu truyện (HARD STOP: chủ dự án duyệt rồi mới chạy hết) | `node pipeline/cli.mjs run --limit 10` | phase 4 |
| Crawl và xử lí đầy đủ | `node pipeline/cli.mjs run` | phase 4 |
| Chạy lại toàn bộ từ cache, không gọi mạng | `node pipeline/cli.mjs run --offline` | phase 4 |
| Báo cáo validate dữ liệu | `node pipeline/cli.mjs validate --json` | phase 4 |
| Nạp dữ liệu và ảnh vào volume | `node pipeline/cli.mjs publish` | phase 4 |
| Accept phase 4 | `node scripts/accept/phase-04.mjs` | phase 4 |
| Accept phase 5 (token, font, tương phản, ngân sách JS, kệ 3D) | `node scripts/accept/phase-05.mjs` | phase 5 |
| Dựng stack E2E (project riêng, volume riêng, seed E2E) | `docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml up --build -d --wait` | phase 6 |
| Dừng stack E2E, giữ volume | `docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml down` | phase 6 |
| Smoke luồng chức năng 1 và 2 | `node scripts/smoke/flow-m1-m2.mjs` | phase 6 |
| Accept phase 6 | `node scripts/accept/phase-06.mjs` | phase 6 |
| Smoke luồng chức năng 3 | `node scripts/smoke/flow-m3.mjs` | phase 7 |
| Accept phase 7 | `node scripts/accept/phase-07.mjs` | phase 7 |
| Cài gói E2E | `npm --prefix e2e ci` | phase 8 |
| Chạy Playwright E2E (3 kịch bản ch.2, bảo mật, axe) trên stack E2E | `cd e2e && npx playwright test` | phase 8 |
| Accept phase 8 (E2E, actionlint, Lighthouse) | `node scripts/accept/phase-08.mjs` | phase 8 |

Script Accept in `[accept] PASS …` / `[accept] FAIL … → <việc cần làm>`, exit 0 khi mọi bước PASS, 1 khi có bước FAIL, 2 khi thiếu công cụ (`contract.md` §7). `node --test` của Node 24 không nhận thư mục trần nên luôn truyền glob trong ngoặc kép.

Mọi worktree dùng chung compose project `tiemtruyen` (một bộ volume). `docker compose up` từ một worktree khác tạo lại `db` và `redis` vì mount bind trỏ thư mục khác; `app` khởi động đúng lúc đó thì `MigrationListener` không nối được DB. Chữa: `docker compose up --build -d --wait` lại từ cùng một worktree. Mỗi lúc chỉ một phiên dùng stack; phiên khác đang chạy thì báo trước khi `up`. Không bao giờ `down -v`.

## 4. Cây thư mục

SSOT ở `plans/261111-tiem-thue-truyen/contract.md` §2; chép lại để tra nhanh.

```
/
├─ AGENTS.md  CLAUDE.md  README.md
├─ pom.xml  mvnw  mvnw.cmd  .mvn/wrapper/
├─ compose.yaml  compose.e2e.yaml
├─ .env.example  .gitignore  .gitattributes  .editorconfig
├─ config/checkstyle/checkstyle.xml
├─ src/main/java/vn/tiemtruyen/{dao,model,filter,util}/
├─ src/main/resources/db/migration/        V1__schema.sql, V2__catalog_seed.sql (danh mục và tài khoản mẫu)
├─ src/main/resources/db/e2e/              V10__e2e_catalog.sql (chỉ lần chạy E2E)
├─ src/main/webapp/                        trang M1, M2, doCancelRentalBill.jsp, health.jsp
├─ src/main/webapp/nhan-vien/              trang M3, LoginView.jsp của nhân viên (D5)
├─ src/main/webapp/nhan-vien/quan-tri/     trang quản trị D6
├─ src/main/webapp/dev/                    StyleGuideView.jsp, HomePreviewView.jsp, session-probe.jsp
├─ src/main/webapp/WEB-INF/{web.xml, tags/, tags/ui/}
├─ src/main/webapp/static/                 đầu ra Vite (bị ignore)
├─ src/test/java/vn/tiemtruyen/{dao,util,filter,arch,schema}/
├─ frontend/{package.json, vite.config.ts, tsconfig*.json, eslint.config.js, components.json}
├─ frontend/src/{loader,islands,components/ui,components/nostalgia,hooks,styles,three,lib}/
├─ frontend/public/img/                    hình trang trí tự vẽ, ảnh tĩnh của kệ, bìa dự phòng
├─ pipeline/{package.json, cli.mjs, manifest.jsonl}
├─ pipeline/{src/fetch,src/sources,src/steps,src/lib,config,schema,test}/
├─ data/                                   bị ignore: cache, raw, clean, images, export, reports
├─ docker/{app,nginx,mysql,redis}/
├─ e2e/{package.json, playwright.config.ts, tests/, fixtures/, lighthouse/}
├─ scripts/{accept,check,dev,smoke}/
├─ docs/  docs/adr/
├─ .github/workflows/
├─ .claude/rules/tiem-*.md  .claude/skills/tiem-*/  .claude/agents/tiem-*.md   (file của dự án; mọi file khác trong .claude/ là của kit, bị ignore)
├─ images/  prompt-web-tiem-thue-truyen.md  B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf   (tài liệu gốc, chỉ đọc)
└─ plans/  plans/reports/
```

## 5. Kiến trúc JSP-DAO

```
Trình duyệt ──POST form (csrf)──▶ Filter (UTF-8, Auth, CSRF, SecurityHeaders, LoginRateLimit)
                                     │
                     ┌───────────────┴────────────────┐
              XxxView.jsp (giao diện)          doXxx.jsp (không giao diện)
              đọc session, gọi DAO đọc         đọc form + session, gán vào model,
              tự gửi về chính nó               gọi DAO ghi, forward tới trang kế
                     │                                │
                     └──────────▶ DAO (vn.tiemtruyen.dao) ◀────┘
                                  lớp cha DAO giữ Connection (HikariCP)
                                     │ JDBC thuần, PreparedStatement
                                  MySQL 8.4 (Flyway migrate lúc khởi động)
```

- Java chỉ có bốn package `dao`, `model`, `filter`, `util`. **Không** có lớp kế thừa `HttpServlet` làm controller, **không** Spring, không framework MVC. Trang JSP là tầng điều khiển, đúng báo cáo.
- `model`: 13 lớp thực thể, `Serializable` (session lưu trong Redis). `util`: `Db` (DataSource HikariCP), `AppConfig`, `Messages` (28 câu của báo cáo + 9 câu §10.3), `Passwords` (Argon2id), `Codes` (mã DT/PM), `JsonUtil`, `ViteManifest`, `MigrationListener` (Flyway Java API lúc khởi động).
- Giao diện: JSP + JSTL + tag file (`WEB-INF/tags/`), một tag `<t:assets/>` nạp CSS/JS từ manifest Vite. **React island cách B**: JSP render form HTML thật; island mount trong form, chỉ đổi input thật rồi `form.requestSubmit()`, không `fetch`. Bốn island: `SelectedStack`, `ProcessBillDesk`, `CollateralDrawer`, `ShelfScene`. Props: `docs/contracts.md` mục 11.
- Session Tomcat lưu trong Redis qua Redisson (cấu hình ở ảnh app, không ở code trang). Redis còn dùng để chặn đăng nhập sai. Số quyển trống luôn đọc từ MySQL.
- Ảnh bìa: nginx phục vụ `/covers/{bookId}/cover-{w}.webp` từ volume; thiếu ảnh trả bìa giấy vẽ sẵn (D2).

## 6. Hợp đồng nghiệp vụ

Nguyên văn brief §3 (thầy đã duyệt, **không thiết kế lại**; muốn đổi chỗ nào thì nói thẳng là đề xuất đổi thiết kế và hỏi chủ dự án):

<!-- BEGIN brief-section-3 -->
## 3. Hợp đồng nghiệp vụ (đã chốt, không thiết kế lại)

Thầy đã duyệt thiết kế này. Muốn đổi chỗ nào thì nói thẳng là đề xuất đổi thiết kế và hỏi tôi, đừng gói nó thành "tối ưu".

**13 thực thể:** User, Client, Staff (Client, Staff kế thừa User), Book, BookCopy, Damage, Collateral, Cart, SelectedBook, RentalBill, RentedBook, RentedDamage, RentalCollateral.

**Quan hệ chính:**
- Cart ◆ SelectedBook ◇ BookCopy. Một dòng giỏ là một quyển, không có cột số lượng. Số lượng hiển thị = số dòng cùng đầu truyện, màn hình gộp theo đầu truyện.
- RentalBill ◆ RentedBook ◇ BookCopy (quyển thực giao). RentedBook ◇ SelectedBook 0..1 (dòng giỏ nó sinh ra, để trống nếu nhân viên thêm tại quầy).
- RentedBook ◆ RentedDamage ◇ Damage. RentalBill ◆ RentalCollateral ◇ Collateral.
- Phiếu mượn chỉ giữ một danh sách: listRentedBook.

**Trạng thái phiếu:** "Chờ nhận", "Đang cho thuê", "Đã huỷ". BookCopy không có cột trạng thái: một quyển bận khi có RentedBook của phiếu chưa huỷ trỏ vào nó. Vì vậy phải kiểm tra quyển còn trống ngay trong transaction lưu phiếu (khoá dòng), không tin dữ liệu đã đọc trước đó.

**Bảng MySQL:** tblUser, tblClient, tblStaff (hai bảng này lấy userId làm khoá chính), tblBook, tblBookCopy, tblDamage, tblCollateral, tblCart, tblSelectedBook, tblRentalBill, tblRentedBook, tblRentedDamage, tblRentalCollateral. Cột và khoá ngoại lấy đúng chương 8. Không lưu thuộc tính dẫn xuất (số lượng, tổng tiền, trạng thái quyển). tblRentedBook.rentalPrice là giá chốt lúc lập phiếu, giữ lại.

**Quy tắc DAO (của thầy):**
- Lớp cha DAO giữ Connection. UserDAO, ClientDAO, StaffDAO, BookDAO, CartDAO, RentalBillDAO, DamageDAO, CollateralDAO.
- Không có DAO cho lớp trung gian phụ thuộc (SelectedBook, RentedBook, RentedDamage, RentalCollateral). Mọi thao tác đi qua DAO của đối tượng chủ: `CartDAO.updateCart(cart)`, `RentalBillDAO.updateRentalBill(rentalBill)`.
- Mỗi đối tượng gốc chỉ có một hàm cập nhật. Trang gán giá trị, hàm lưu.
- Không có getById. Đăng nhập trả về Client hoặc Staff đủ thông tin (`ClientDAO.checkLogin()` gọi `UserDAO.checkLogin()` rồi lấy thêm phần riêng). Danh sách đọc lên kèm con. Trang chọn theo id trong session.
- Danh sách hàm lấy đúng chương 9 (addClient, checkLogin, searchBook, getCart, updateCart, addRentalBill, updateRentalBill, getRentalBillList, searchRentalBill, searchDamage, addDamage, searchCollateral, addCollateral...). Những cặp trông giống nhau nhưng không thừa đã ghi trong file memory, đừng gộp.

**Quy tắc trang và session:**
- Mỗi lần ghi DB đi qua một trang `doXxx.jsp` không có giao diện. Trang tự tải lại chính nó khi tìm kiếm, đăng nhập, sửa bản sao trong session.
- Dòng được chọn trong danh sách (mọi nút trên dòng, cả "Xem chi tiết") do trang chứa danh sách lưu vào session, trang sau chỉ đọc.
- rentalBill được tạo khi mở "Tìm truyện". Session chỉ giữ cart và rentalBill trong lúc đang chọn. doAddRentalBill bỏ cả hai khỏi session.
- Xác nhận phiếu giữ đủ bốn điều kiện như chương 4, 5, 9, 10.

**Thông báo trích nguyên văn:**
- "Đăng nhập thất bại, vui lòng thử lại."
- "Đăng kí tài khoản thành công!"
- "Tên đăng nhập, số CCCD, số điện thoại hoặc email đã được sử dụng, vui lòng kiểm tra lại."
- "Không tìm thấy thông tin phù hợp."
- "Huỷ phiếu mượn thành công!"

**Trang JSP (tên lấy từ chương 9):** HomeView, RegisterView, doRegister, LoginView, ClientHomeView, StaffHomeView, SearchBookView, BookDetailView, doAddSelectedBook, doDeleteSelectedBook, ConfirmRentalBillView, doAddRentalBill, RentalBillListView, RentalBillDetailView, doCancelRentalBill, SearchRentalBillView, ProcessRentalBillView, EditRentedBookListView, AddRentedBookView, doUpdateRentedBookList, AddConditionView, AddDamageView, doAddDamage, AddRentalCollateralView, AddCollateralView, doAddCollateral, doUpdateRentalBill, PrintRentalBillView.

<!-- END brief-section-3 -->

Bổ sung đã chốt (bảng chi tiết ở `docs/contracts.md`, không chép lại ở đây):

| Điểm | Chốt | Chi tiết |
|---|---|---|
| D1 | `tblUser.password varchar(255)` (đổi thiết kế duy nhất, chứa băm Argon2id); tên bảng, cột, khoá giữ nguyên | `docs/contracts.md` mục 2 |
| Bảng | 13 bảng, kiểu và NULL theo ch.8 và ERD; `publishYear` cho phép NULL (pipeline không bịa năm) | mục 2 |
| DAO | 8 DAO, chữ kí đủ theo ch.9 cộng `BookDAO.addBook`, `updateBook` (D6, ngoài báo cáo); `DAO implements AutoCloseable`, try-with-resources, hàm ghi tự mở transaction READ COMMITTED (Deferred #12) | mục 5 |
| K1 | Mọi đường tạo `tblRentedBook` khoá dòng `tblBook` liên quan theo id tăng dần (`FOR UPDATE`), đọc lại quyển trống, đổi quyển cùng đầu truyện khi bị giữ, không đủ thì rollback và trả `false` | mục 6.1 |
| Chọn quyển | Quyển có `tblBookCopy.id` nhỏ nhất còn trống (Deferred #10) | mục 6.2 |
| D9 | `updateRentalBill` khoá dòng phiếu, chỉ ghi khi DB vẫn "Chờ nhận"; trả `false` thì trang đọc lại trạng thái bằng hàm danh sách đã có và báo "Phiếu mượn đã bị huỷ, không thể xử lí." hoặc "Phiếu mượn này đã được xử lí và đã giao truyện." (Deferred #11) | mục 6.3 |
| Session | Đúng 12 thuộc tính: `client`, `staff`, `cart`, `rentalBill`, `listBook`, `book`, `listRentalBill`, `rentedBook`, `listRentedBook`, `listDamage`, `listCollateral`, `listRentalCollateral` | mục 7 |
| Trang | 28 trang ch.9; `LoginView.jsp` ở cả gốc (ClientDAO) và `/nhan-vien/` (StaffDAO) (D5); `doCancelRentalBill.jsp` một file dùng chung (Deferred #13); 5 trang quản trị D6 ở `/nhan-vien/quan-tri/` (Deferred #14) | mục 9 |
| Thông báo | 28 câu nguyên văn (brief chỉ kể 5) cộng 9 câu ngoài báo cáo chủ dự án duyệt 11/11/2026 (§10.3), hằng số trong một lớp `Messages`, test so từng kí tự | mục 10 |
| Xác nhận phiếu | Đủ bốn điều kiện: có quyển tích "Nhận"; mọi quyển tích đã có tình trạng; đã có khoản cọc; ngày hẹn trả sau ngày mượn | mục 10.2 |
| Phân quyền | Khách: mọi trang gốc trừ Home, Register, doRegister, Login; nhân viên: `/nhan-vien/*`; quản lí: `/nhan-vien/quan-tri/*` (`position = "Quản lí"`); `/dev/*` luôn mở | mục 12 |
| Hiển thị | `DT` + id 3 chữ số, `PM` + id 4 chữ số chỉ lúc hiển thị; barcode lưu thật `DT001-03` (D8); tiền `3.000đ`; ngày `dd/MM/yyyy`; giờ `HH:mm dd/MM/yyyy` | mục 13 |
| Dữ liệu | Kim Đồng (chính) + Tiki (dự phòng); nội dung crawl ngoài git ở `data/` và volume, repo chỉ giữ script và `pipeline/manifest.jsonl` (D11); seed E2E riêng dựng y hệt ch.2 (D3) | `docs/data-pipeline.md` |

## 7. Quy ước đặt tên

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| Trang JSP | Đúng tên ch.9; trang giao diện `XxxView.jsp`, trang xử lí không giao diện `doXxx.jsp` | `SearchBookView.jsp`, `doAddSelectedBook.jsp` |
| Field form | Đúng tên ch.9: `txt…` ô nhập, `btn…` nút gửi, `lnk…` link hoặc nút trên dòng, `tbl…` bảng; phần ch.9 không đặt tên theo `docs/contracts.md` C1 | `txtKeyword`, `btnSearch`, `lnkChooseBook` |
| Thuộc tính session | Đúng 12 tên camelCase của ch.9 | `listRentedBook` |
| Bảng, cột | `tblXxx`, cột camelCase đúng ch.8 | `tblRentedBook.selectedBookId` |
| Java | Package `vn.tiemtruyen.{dao,model,filter,util}`; DAO `XxxDAO`; hằng `UPPER_SNAKE` | `RentalBillDAO`, `Messages.REGISTER_SUCCESS` |
| Island | PascalCase, một thư mục `frontend/src/islands/<Tên>/index.tsx`; props id kebab-case | `ProcessBillDesk`, `process-bill-props` |
| File của dự án trong `.claude/` | Tiền tố `tiem-` (kit dùng `t1k-`); chỉ file `tiem-*` vào git, mọi file kit bị ignore (Deferred #4) | `.claude/rules/tiem-dao-rules.md` |
| Báo cáo | `plans/reports/<phase>-<lane>-<yymmdd-hhmm>.md` | `plans/reports/phase-02-hop-dong-261111-0420.md` |
| Nhánh git | `phase/0N-<slug>`; lane: `lane/0N-<slug>/<lane>` | `phase/02-bo-cong-cu-ai` |

## 8. Git

Theo `plans/261111-tiem-thue-truyen/contract.md` §9:

- Repo `git@github.com:Nghaiz/Analysis_And_Design_Mangastore.git` (public, remote `origin`, SSH). Không commit thẳng lên `main`.
- Mỗi phase một nhánh `phase/0N-<slug>` tạo từ `origin/main` mới nhất (`git fetch origin` trước). Mỗi lane sửa code một worktree `D:/Coding/mangastore-wt/<0N>-<lane>` trên nhánh `lane/0N-<slug>/<lane>`, chỉ commit tại máy, **không push**, không tạo hay đổi nhánh.
- Cuối phase orchestrator merge các lane vào nhánh phase, chạy Accept. PASS thì push nhánh phase, mở PR vào `main` (`gh pr create --base main`), merge bằng merge commit (`gh pr merge <số> --merge --delete-branch`), rồi `git switch main && git pull --ff-only`. Phase 8 chờ thêm CI xanh.
- Quyền push, mở PR, merge trên repo này do chủ dự án cho ngày 11/11/2026 (Deferred #3). Không push lên đâu khác, không force-push; subagent không push.
- Commit dạng pathspec: file mới `git add <đường dẫn cụ thể>` rồi `git commit -m "..." -- <đường dẫn>`. Cấm `git add .`, `git add -A`, `git commit -a`.
- Thông điệp commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; mô tả PR kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- File dùng chung chỉ orchestrator sửa (`contract.md` §8): `pom.xml`, `mvnw*`, `.mvn/**`, các `package.json` và lockfile, `frontend/vite.config.ts` (từ phase 5), `web.xml`, `src/main/resources/db/**`, `compose*.yaml`, `.env.example`, `.gitignore`, `.gitattributes`, `AGENTS.md`, `CLAUDE.md`, `docs/contracts.md`, `scripts/accept/**`, `scripts/smoke/**`, `plans/261111-tiem-thue-truyen/**`. Lane cần đổi thì ghi đề xuất vào báo cáo.
- Bí mật: `.env` thật bị ignore, không commit; `.env.example` chỉ có giá trị giả. Ảnh, mô tả, file SQL crawl nằm ở `data/` (bị ignore).

## 9. Cách test

| Tầng | Công cụ | Ở đâu | Bắt buộc |
|---|---|---|---|
| DAO, migration | JUnit 6 + Testcontainers `mysql:8.4.13` | `src/test/java/vn/tiemtruyen/dao/` | Mọi hàm DAO; 4 test tranh chấp K1 và D9 (`RentalBillConcurrencyTest`) |
| Schema | `SchemaConformanceTest` (so `information_schema` với `docs/contracts.md` mục 2) | `src/test/java/vn/tiemtruyen/schema/` | Đủ 13 bảng, cột, kiểu, NULL, khoá |
| Kiến trúc | `ArchitectureTest` | `src/test/java/vn/tiemtruyen/arch/` | Không hàm đọc theo id, không DAO cho lớp trung gian, không lớp `HttpServlet`, không Spring, không cột dẫn xuất |
| Thông báo | `MessagesTest` | `src/test/java/vn/tiemtruyen/util/` | 28 câu §10.1 và 9 câu §10.3 khớp từng kí tự với `docs/contracts.md` mục 10 |
| Session | `SerializationTest` | `src/test/java/vn/tiemtruyen/` | Tuần tự hoá đủ graph Cart, RentalBill |
| Filter | JUnit | `src/test/java/vn/tiemtruyen/filter/` | POST thiếu CSRF → 403; phân quyền theo mục 12 |
| Island | Vitest + jsdom | `frontend/src/islands/*/*.test.tsx` | Island chỉ đổi input đúng tên và gọi `requestSubmit`; ESLint chặn `fetch`/`XMLHttpRequest` trong `islands/` |
| Luồng | Smoke script | `scripts/smoke/` | Đi hết M1–M2 (phase 6), M3 (phase 7) trên compose |
| E2E | Playwright 1.65, hai khổ 390×844 và 1440×900 | `e2e/tests/` | 3 kịch bản chuẩn và mọi ngoại lệ ch.2, so thông báo từng chữ, mã, giá, tổng; console sạch; axe AA |
| Hợp đồng tài liệu | `node --test` | `scripts/check/` | `contracts-doc.test.mjs`, `section10-sync.mjs`, `skills-frontmatter.test.mjs`, `plan-contract.test.mjs` |
| Kiểm tay bằng máy | Playwright MCP (xem `CLAUDE.md`, brief §10 bên dưới) | `plans/reports/` | Sau mỗi trang hay chức năng: console không error/warning, không request ≥ 400 hoặc hỏng |

Không tính là xong khi chưa chạy lệnh kiểm và đọc kết quả. Test đỏ thì sửa code, không sửa test cho xanh; thông báo nguyên văn chỉ đổi khi chủ dự án duyệt.

## 10. Điều cấm

- **Cấm getById**: không có hàm DAO đọc một đối tượng theo id (kể cả biến thể như `getBookById`). Trang chọn dòng theo id trong danh sách đã có trong session; cần trạng thái mới thì gọi hàm danh sách đã có (D9).
- **Cấm DAO cho lớp trung gian**: không có SelectedBookDAO, RentedBookDAO, RentedDamageDAO, RentalCollateralDAO. Thao tác đi qua `CartDAO.updateCart`, `RentalBillDAO.updateRentalBill`. Không thêm DAO hay hàm DAO ngoài `docs/contracts.md` mục 5.3.
- **Cấm gộp hàm** trông giống nhau của ch.9; mỗi đối tượng gốc chỉ một hàm cập nhật.
- **Cấm lưu thuộc tính dẫn xuất**: không cột hay field số lượng, tổng tiền, trạng thái quyển (`quantity`, `total`, `availableCount`, `copyStatus`…); tính lúc hiển thị. `tblRentedBook.rentalPrice` là giá chốt, không phải dẫn xuất.
- **Cấm sửa thông báo nguyên văn**: 28 câu §10.1 và 9 câu §10.3 ở `docs/contracts.md` mục 10 là hằng số; không viết lại, không thêm câu mới khi chủ dự án chưa duyệt.
- **Cấm Servlet điều khiển và Spring**: không lớp kế thừa `HttpServlet` làm controller, không Spring, không framework MVC, không endpoint JSON.
- **Cấm island gọi `fetch`** (hay `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`): island chỉ đổi input thật rồi `form.requestSubmit()`.
- Cấm ghi DB từ trang `XxxView.jsp`; mọi lần ghi qua một `doXxx.jsp`.
- Cấm tin dữ liệu quyển trong session khi giữ quyển: kiểm lại trong transaction có khoá K1.
- Cấm form không có `<t:csrf/>`; cấm nối chuỗi SQL (chỉ `PreparedStatement`).
- Cấm thiết kế lại hợp đồng brief §3 hay đoán nghiệp vụ; cấm sửa `D:\PTTK`, PDF, `images/`, brief.
- Cấm dùng bìa crawl, logo nhà xuất bản hay nhân vật có bản quyền cho phần trang trí (logo tiệm, cảnh 3D, minh hoạ); bìa thật chỉ ở chỗ hiển thị dữ liệu.
- Cấm `docker compose down -v`, `docker volume prune` khi chủ dự án chưa đồng ý.
- Cấm commit `.env`, bí mật, nội dung `data/`; cấm `git add .`; cấm push từ lane.

## 11. Điều phối agent (brief §10, nguyên văn)

Khối dưới đây là nguyên văn brief §10, so từng byte bằng `node scripts/check/section10-sync.mjs`. Không sửa tay khối này; brief đổi thì chép lại bằng script.

<!-- BEGIN brief-section-10 -->
## 10. Tự động hoá và điều phối agent

Ghi toàn bộ mục này vào `CLAUDE.md`, `AGENTS.md` và một rule riêng trong `.claude/rules/`, để mọi phiên cook sau đều làm theo, kể cả sau khi phiên bị compact.

**Công cụ tự động.** Việc gì máy làm được thì máy làm, không đẩy sang tôi.
- Playwright MCP: làm xong mỗi trang hay mỗi chức năng thì mở web thật, đi lại kịch bản chuẩn và các ngoại lệ của chương 2, chụp màn hình ở khổ điện thoại và máy tính, đọc console và network. Chỉ khi console sạch và không có request hỏng mới tính là xong. Bộ test Playwright trong repo vẫn chạy trong CI như mục 7.
- cua-driver MCP: dùng khi cần thao tác phần mềm có giao diện trên Windows, ví dụ mở MySQL Workbench để reverse engineer schema rồi so ERD với chương 8. Việc nào làm được bằng dòng lệnh (`mysql` trong container, Flyway) thì dùng dòng lệnh. Sau mỗi lần bấm phải kiểm lại bằng `verify_state`, lệnh bấm không báo lỗi chưa có nghĩa là đã xong.
- context7 MCP để tra tài liệu thư viện.
- MCP nào chưa nạp trong phiên thì báo tôi khởi động lại, không lặng lẽ đổi sang cách khác yếu hơn.

**Mô hình điều phối của mỗi phiên cook.**
- Phiên chính là orchestrator: chia việc, giao việc, gom kết quả, cập nhật kế hoạch. Phần đã giao cho subagent thì orchestrator không tự làm lại.
- Đầu phiên, orchestrator tạo hoặc đọc lại agent map của phase (ví dụ `plans/<plan>/agent-map.md`). Mỗi lane ghi: làm việc gì, subagent nào nhận, được sửa những file nào, phụ thuộc lane nào, trạng thái. Giao hay nhận việc xong là cập nhật file này.
- Subagent dùng cùng model và cùng effort với orchestrator. Mọi lần spawn đều truyền rõ `model` và `effort` (effort lấy theo biến môi trường `CLAUDE_EFFORT`), không để agent tự rơi về model rẻ hơn.
- Tối đa 3 subagent chạy cùng lúc, tính cả agent con: subagent không tự spawn thêm agent. Từ việc độc lập thứ 4 trở đi thì xếp hàng, xong một lane mới mở lane tiếp theo. Luật này đè lên mức song song mặc định của kit.
- Trước khi chia việc song song, chốt hợp đồng chung vào một file: tên trang, tên field form (txtUsername...), tên thuộc tính session, chữ kí hàm DAO, props của island. Brief của mọi subagent trỏ tới file đó.
- Các subagent cùng sửa code thì mỗi lane một git worktree, hoặc một danh sách file không chồng nhau ghi rõ trong brief. File dùng chung (`pom.xml`, `package.json`, `web.xml`, migration) chỉ orchestrator sửa.

**Giữ bối cảnh khi phiên bị compact.**
- Kế hoạch, agent map, hợp đồng và báo cáo nằm trên đĩa. Chúng là nguồn sự thật, trí nhớ của phiên thì không. Sau mỗi lần compact, việc đầu tiên là đọc lại `CLAUDE.md`, agent map và file phase đang làm.
- Brief của subagent ngắn: việc cần làm, ràng buộc quyết định, đường dẫn file để nó tự đọc. Không dán nguyên nội dung file hay lịch sử chat vào brief.
- Subagent ghi kết quả chi tiết vào `plans/reports/`, chỉ trả về orchestrator bản tóm tắt ngắn kèm đường dẫn.
- Xong bước nào thì đánh dấu ngay trong file phase. Context gần đầy thì commit, lưu handoff (`/t1k:handoff save`) rồi mới làm tiếp.

**Chạy nền, không ngồi chờ.**
- Subagent spawn ở chế độ nền. Lệnh chạy lâu (build Maven, `docker compose up --build`, bộ test, pipeline crawl) cũng chạy nền.
- Trong lúc chờ, orchestrator làm việc không phụ thuộc: đọc báo cáo vừa về, soạn brief cho lane sau, cập nhật kế hoạch. Không dùng sleep để hỏi trạng thái liên tục, đợi thông báo xong việc.

<!-- END brief-section-10 -->
