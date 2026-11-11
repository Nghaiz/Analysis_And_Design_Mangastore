# Tiệm thuê truyện tuổi thơ

<!-- updated 261111 -->

Web thật của hệ thống quản lí cửa hàng cho thuê truyện mà nhóm đã phân tích và thiết kế trong môn Phân tích và thiết kế hệ thống (PTTK). Thiết kế lấy nguyên từ báo cáo `B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf`, thầy đã duyệt: tên trang, hàm DAO, bảng MySQL và câu thông báo khớp báo cáo để đối chiếu được.

Web làm đúng 3 chức năng của module M1:

1. Khách hàng đăng kí.
2. Khách hàng tìm và chọn truyện muốn thuê trực tuyến: đăng nhập, tìm đầu truyện, "Truyện đã chọn", tạo phiếu mượn, xem và huỷ phiếu của mình.
3. Khách hàng đến nhận truyện tại quầy: nhân viên tìm phiếu, sửa danh sách truyện, ghi tình trạng và lỗi, thêm khoản đặt cọc, xác nhận và in phiếu.

Kèm theo: kho vài trăm tập truyện thật crawl về, dữ liệu mẫu, và trang quản trị đơn giản cho "Quản lí" (thêm, sửa đầu truyện, thêm quyển).

**Dự án chỉ chạy tại máy (localhost).** Không có môi trường prod, không VPS, không deploy ([ADR-0013](docs/adr/0013-chi-chay-localhost.md), Deferred #28 trong `plans/261111-tiem-thue-truyen/plan.md`).

## Công nghệ

Kiến trúc JSP-DAO như báo cáo: trang JSP là tầng điều khiển, không Servlet điều khiển, không Spring. Sơ đồ và giải thích: [`docs/architecture.md`](docs/architecture.md).

| Phần | Công nghệ (phiên bản ghim) |
|---|---|
| Ứng dụng | Java 25, Tomcat 11.0.27 (Jakarta EE 11), JSP + JSTL, JDBC thuần qua HikariCP |
| Dữ liệu | MySQL 8.4.13, migration bằng Flyway lúc app khởi động |
| Session | Redis 8.10.3 qua Redisson; mật khẩu băm Argon2id (Password4j) |
| Giao diện | Vite 8, React 19.3, Tailwind 4, shadcn/ui cho bốn React island; three/r3f cho kệ truyện 3D; Motion cho chuyển động |
| Cổng vào | nginx (brotli, security header, CSP, phục vụ ảnh bìa) |
| Kiểm | JUnit + Testcontainers, Vitest, Playwright 1.65, axe, Lighthouse |

Nguồn và lí do chọn phiên bản: `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` §5 và [`docs/adr/`](docs/adr/).

## Yêu cầu máy

- JDK 25. `scripts/dev/mvnw.mjs` tìm theo thứ tự `JAVA25_HOME`, `JAVA_HOME` (nếu là 25), rồi `C:/Program Files/Eclipse Adoptium/jdk-25*`; không cần đổi `JAVA_HOME` của hệ thống.
- Node 24 trở lên (các gói `frontend/`, `pipeline/`, `e2e/` đều ghi `engines.node >= 24`).
- Docker có Compose v2.
- Git. Repo: `git@github.com:Nghaiz/Analysis_And_Design_Mangastore.git`.

## Chạy tại máy

Chạy từ gốc repo.

```bash
node scripts/dev/make-env.mjs              # tạo .env thật từ .env.example, mật khẩu ngẫu nhiên
npm --prefix frontend ci
npm --prefix frontend run build            # ra src/main/webapp/static/
docker compose up --build -d --wait        # app, db, redis, nginx
curl -fsS http://127.0.0.1:8080/health.jsp
```

Mở `http://127.0.0.1:8080`. Trang nhân viên ở `/nhan-vien/LoginView.jsp`, trang quản trị ở `/nhan-vien/quan-tri/`.

- Tài khoản mẫu (khách, nhân viên, quản lí) và mật khẩu: [`docs/dev-accounts.md`](docs/dev-accounts.md). `.env` chỉ chứa mật khẩu của DB và Redis, không bao giờ commit.
- Dừng stack: `docker compose down`. **Không thêm `-v`**: lệnh đó xoá volume dữ liệu.
- Kho truyện thật do pipeline crawl và nạp vào volume, nội dung nằm ngoài git (`data/` bị ignore). Cách chạy: [`docs/data-pipeline.md`](docs/data-pipeline.md).
- Sửa giao diện có tải nóng: chạy `npm --prefix frontend run dev` (cổng 5173) và dựng stack bằng `APP_VITE_DEV=true docker compose up --build -d --wait`.

Bảng lệnh đầy đủ (log, MySQL trong container, pipeline, kiểm CSP): [`AGENTS.md`](AGENTS.md) §3.

## Test

| Tầng | Lệnh |
|---|---|
| Java: Checkstyle, JUnit, Testcontainers (DAO, schema, kiến trúc, filter, thông báo) | `node scripts/dev/mvnw.mjs -B verify` |
| Frontend: ESLint, kiểm kiểu, Vitest | `npm --prefix frontend run lint`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run test` |
| Pipeline (không gọi mạng) | `npm --prefix pipeline test` |
| Script kiểm của repo | `node --test "scripts/check/*.test.mjs"` |
| Smoke luồng chức năng 1, 2 và 3 trên compose | `node scripts/smoke/flow-m1-m2.mjs`, `node scripts/smoke/flow-m3.mjs` |

Bản đủ (test nào bắt buộc ở tầng nào): [`AGENTS.md`](AGENTS.md) §9.

## E2E

Bộ Playwright đi 3 kịch bản chuẩn và mọi ngoại lệ của ch.2, cộng bảo mật (CSRF, chặn chéo khách và nhân viên, giảm chuyển động, axe AA). Mỗi test chạy ở hai khổ: điện thoại 390×844 và máy tính 1440×900. Test đỏ khi console có error hoặc warning, hay có request hỏng.

Stack E2E dùng compose project riêng, volume riêng và seed dựng y hệt ch.2, nên không đụng dữ liệu thường.

```bash
npm --prefix e2e ci
cd e2e && npx playwright install chromium && cd ..
docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml up --build -d --wait
cd e2e && npx playwright test
```

- Stack thường cũng dùng cổng 8080. Dừng nó trước (`docker compose stop nginx`), hoặc dựng stack E2E ở cổng khác (`NGINX_HTTP_PORT=8081 DB_HOST_PORT=3381`) rồi chạy test với `SMOKE_BASE_URL=http://127.0.0.1:8081`.
- Lighthouse cấu hình điện thoại, mọi trang có giao diện, 3 lần mỗi trang lấy trung vị: `node e2e/lighthouse/run-lighthouse.mjs` (thêm `--json` để máy đọc). Exit 1 khi có trang dưới 90 ở một trong bốn hạng mục.
- Dừng stack E2E, giữ volume: `docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml down`.

## Accept

Mỗi phase có một script nghiệm thu, in `[accept] PASS …` hoặc `[accept] FAIL … → <việc cần làm>`. Exit 0 khi mọi bước PASS, 1 khi có bước FAIL, 2 khi thiếu công cụ.

```bash
node scripts/accept/phase-08.mjs
```

Script phase 8 chạy lại Accept phase 1–7 (chống thoái lui), rồi E2E, Lighthouse, actionlint, Trivy, kiểm tài liệu và kiểm cây git sạch. `--only 4,5` chạy riêng vài bước. Script các phase trước: `scripts/accept/phase-0N.mjs`.

## CI

<!-- 8E: đối chiếu ci.yml -->

Workflow `.github/workflows/ci.yml` chạy trên mọi pull request và mọi push vào `main`. Không có job deploy.

| Job | Việc | Giới hạn |
|---|---|---|
| lint | Checkstyle và ESLint | 5 phút |
| build và unit | Build Java và frontend, test đơn vị | 10 phút |
| integration | Test DAO và schema bằng Testcontainers | 20 phút |
| E2E | Dựng stack E2E bằng compose, chạy bộ Playwright | 45 phút |
| build image | Build ảnh `app` và `nginx` | 30 phút |
| Trivy | Quét lỗ hổng ảnh; đỏ khi có lỗ hổng HIGH/CRITICAL đã có bản sửa | 10 phút |
| kiểm tài liệu | `section10-sync.mjs` và `node --test "scripts/check/*.test.mjs"` | |

- PR mới huỷ lần chạy cũ của cùng nhánh (`concurrency`, `cancel-in-progress: true`). Không job nào lọc theo `paths:`.
- Phiên bản actionlint và Trivy ghim ở khối `env:` đầu `ci.yml`; Accept phase 8 chạy đúng hai ảnh Docker đó tại máy.
- Chạy lại tại máy: các lệnh ở mục Test và E2E chính là lệnh của từng job.

## Lỗ hổng image không có bản sửa

Trivy chỉ chặn lỗ hổng HIGH/CRITICAL **đã có bản sửa**. Lỗ hổng chưa có bản sửa từ nhà cung cấp ảnh nền được ghi ở đây để theo dõi, không chặn CI.

<!-- 8E: chờ số Trivy (ảnh, CVE, gói, mức, lí do chưa sửa) -->

| Ảnh | CVE | Gói | Mức | Ghi chú |
|---|---|---|---|---|

## Để sau, ngoài phạm vi

- Trả truyện và phí phạt.
- Thống kê.
- Deploy và cấu hình prod. Muốn có prod về sau phải thêm `compose.prod.yaml`, tách tài khoản mẫu ra khỏi migration chạy mọi lần, chặn `/dev/*`, và cần chủ dự án duyệt ([ADR-0013](docs/adr/0013-chi-chay-localhost.md)).

## Đọc tiếp

| Cần biết | File |
|---|---|
| Hướng dẫn cho agent, lệnh, cây thư mục, điều cấm | [`AGENTS.md`](AGENTS.md) |
| Hợp đồng nghiệp vụ: bảng, DAO, session, trang, thông báo | [`docs/contracts.md`](docs/contracts.md) |
| Yêu cầu sản phẩm và trạng thái | [`docs/pdr.md`](docs/pdr.md) |
| Kiến trúc | [`docs/architecture.md`](docs/architecture.md) |
| ERD, luồng trang, token giao diện, từ điển | [`docs/schema.md`](docs/schema.md), [`docs/page-flow.md`](docs/page-flow.md), [`docs/design-tokens.md`](docs/design-tokens.md), [`docs/glossary.md`](docs/glossary.md) |
| Quyết định kiến trúc | [`docs/adr/`](docs/adr/) |
| Kế hoạch và các phase | `plans/261111-tiem-thue-truyen/plan.md` |
