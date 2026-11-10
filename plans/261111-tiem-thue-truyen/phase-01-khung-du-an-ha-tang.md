# Phase 1: Khung dự án và hạ tầng

Lane: serial
Depends-on: none
Effort: M
Owns: `pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/**`, `config/checkstyle/**`, `src/main/java/vn/tiemtruyen/util/**`, `src/main/webapp/**`, `src/test/java/vn/tiemtruyen/util/**`, `frontend/**`, `docker/**`, `compose.yaml`, `scripts/dev/**`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.env.example`
Creates: `scripts/accept/phase-01.mjs`, `scripts/check/plan-contract.test.mjs`, `scripts/dev/make-env.mjs`, `docker/app/Dockerfile`, `docker/nginx/Dockerfile`, `src/main/webapp/WEB-INF/web.xml`, `src/main/webapp/WEB-INF/tags/assets.tag`, `src/main/webapp/health.jsp`, `src/main/webapp/dev/session-probe.jsp`, `frontend/src/loader/island-loader.ts`
AX: AX-04 exit 0/1/2 xác định, AX-05 mỗi FAIL nêu việc cần làm, AX-07 không hỏi tương tác, AX-08 không màu khi không có TTY; `make-env.mjs` theo AX-18 không in bí mật ra màn hình
Accept: `node scripts/accept/phase-01.mjs`

## Mục tiêu

Dựng khung chạy được: WAR rỗng trên Tomcat 11.0.27 / Java 25, frontend Vite build ra manifest mà JSP đọc được, Docker Compose 4 service (app, db MySQL 8.4.13, redis 8.10.3, nginx có brotli) đều healthy, named volume, một cấu hình chạy tại máy (chỉ localhost, không có prod, Deferred #28), `.env.example`, `.editorconfig`. Git, remote, `.gitignore` và `.gitattributes` đã có từ commit gốc ngày 11/11/2026 (`contract.md` §9). Chưa có trang nghiệp vụ nào.

Hợp đồng của phase này: `plans/261111-tiem-thue-truyen/contract.md` (cây thư mục, cổng, biến môi trường, quy ước Accept, file dùng chung). Brief mọi lane trỏ tới file đó.

## Chuẩn bị (trước bước 1.0)

- [x] Cài JDK 25 (chủ dự án cho phép ngày 11/11/2026): orchestrator chạy nền `winget install --id EclipseAdoptium.Temurin.25.JDK -e --accept-package-agreements --accept-source-agreements`; Windows có thể hiện hộp UAC, chủ dự án bấm Yes. Kiểm `java -version` của bản vừa cài in 25.x. JDK 24.0.2 giữ nguyên; script của dự án (`scripts/accept/*`, lệnh trong `AGENTS.md`) đặt `JAVA_HOME` tới bản 25 cho tiến trình con, không đổi biến môi trường của hệ thống. Cài hỏng thì dừng và báo chủ dự án.
- [x] Git: `git fetch origin`; đang ở `main`, `git status` sạch, `main` khớp `origin/main`.
- [x] Docker chạy được (`docker info`). Đã đo 11/11/2026: Docker 29.6.2, Node 24.22.1, Maven 3.9.11 (dự án dùng Maven Wrapper 3.9.16 nên không phụ thuộc bản cài máy).
- [x] Kiểm Playwright MCP đã nạp trong phiên (cần ở bước 1.5). Chưa nạp thì báo chủ dự án khởi động lại.

## Các bước

- [x] **1.0 Orchestrator, tuần tự (hợp đồng trước khi chia lane).**
  - Tạo nhánh `phase/01-khung` từ `origin/main`.
  - `.gitignore` và `.gitattributes` đã có từ commit gốc; viết `.editorconfig` (UTF-8, LF, thụt lề khớp bộ luật Checkstyle của dự án); thêm vào `.gitignore` đường dẫn mới nếu cần.
  - Ghim phiên bản theo brainstorm §5 vào file dùng chung. Các mục đánh dấu R (chỉ có nguồn researcher) và các bản chưa tra (`jakarta.servlet-api` 6.1.x, `jakarta.servlet.jsp-api` 4.0.x, Checkstyle, thẻ ảnh `tomcat:11.0.27-jdk25-*`) tra lại ở Maven Central, npm registry, Docker Hub hoặc context7 trước khi ghim; ghi nguồn và ngày tra vào ADR-0003 ở phase 2.
  - Viết `pom.xml` (packaging war, finalName ROOT, release 25, JUnit 6.1.3 BOM, Checkstyle chạy ở `validate`), `frontend/package.json` (React 19.3.1 ghim `<19.4`, Vite 8.3.7, Tailwind 4.3.5, `@tailwindcss/vite` 4.3.5, Vitest 5.1.0, TypeScript, ESLint) rồi chạy `npm install` để có lockfile.
  - Viết `compose.yaml` (một file cho lần chạy tại máy, cổng chỉ mở trên 127.0.0.1) đúng bảng `contract.md` §3 (healthcheck mỗi service, `depends_on: condition: service_healthy`, named volume), `.env.example` đúng §4, `src/main/webapp/WEB-INF/web.xml` (Jakarta EE 11, `<request-character-encoding>UTF-8</request-character-encoding>`, chưa có filter).
  - Viết `scripts/check/plan-contract.test.mjs` (kiểm cây thư mục tối thiểu, tên service, cổng, volume trong compose, tên biến trong `.env.example` khớp `contract.md`) và `scripts/accept/phase-01.mjs`.
  - Commit hợp đồng và file dùng chung trước khi spawn.
- [x] **1.1 Lane 1A `java-khung`** (song song với 1B, 1C).
- [x] **1.2 Lane 1B `frontend-khung`** (song song).
- [x] **1.3 Lane 1C `ha-tang`** (song song).
- [x] **1.4 Orchestrator, tuần tự:** merge ba lane vào nhánh phase; chủ dự án chạy `node scripts/dev/make-env.mjs` (bước người dùng); chạy nền `docker compose up --build -d --wait`.
- [x] **1.5 Lane 1D `xac-minh`** (sau 1.4): Playwright MCP mở `http://localhost:8080/HomeView.jsp` (trang tạm) và `/health.jsp`, khổ 390×844 và 1440×900, đọc console và network; chụp vào `plans/reports/screens/phase-01/`; ghi `plans/reports/phase-01-xac-minh-<ts>.md`.
- [x] **1.6 Orchestrator:** chạy Accept, ghi kết quả vào file này, push nhánh phase, mở PR vào `main` và merge bằng merge commit (`contract.md` §9).

## Lane trong phase

Tối đa 3 lane cùng lúc: 1A, 1B, 1C chạy song song; 1D chạy sau khi ba lane đã merge (tuần tự).

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 1A `java-khung` | Maven Wrapper 3.9.16; `util/AppConfig` (đọc biến môi trường, báo lỗi rõ khi thiếu, không giá trị mặc định ngầm cho bí mật); `util/Db` (HikariCP DataSource một thể hiện); `util/ViteManifest` (đọc `/static/.vite/manifest.json`, đi đệ quy `imports` và `css`); tag `assets.tag`; `health.jsp` (ping DB); `HomeView.jsp` tạm ("Tiệm đang dựng", phase 6 thay); `dev/session-probe.jsp` (đếm số lần trong session); `docker/app/**` (Dockerfile nhiều tầng: node build frontend → Maven package → Tomcat 11.0.27 Java 25; `context.xml` với `RedissonSessionManager`; `redisson.yaml`); test `AppConfigTest`, `ViteManifestTest` | `t1k-web-core-developer` (có context7 `query-docs` để tra Tomcat, Redisson) | `.mvn/**`, `mvnw`, `mvnw.cmd`, `config/checkstyle/**`, `src/main/java/vn/tiemtruyen/util/**`, `src/main/webapp/**` trừ `WEB-INF/web.xml`, `src/test/java/vn/tiemtruyen/util/**`, `docker/app/**` | 1.0 |
| 1B `frontend-khung` | `vite.config.ts` theo `contract.md` §5; `tsconfig*.json`; `eslint.config.js`; `components.json` (shadcn init, chưa thêm component); `src/styles/app.css` (`@import "tailwindcss";`); `src/loader/island-loader.ts` (bản khung: quét `[data-island]`, chưa có island); `src/loader/island-loader.test.ts` | `t1k-web-core-developer` | `frontend/**` trừ `package.json`, `package-lock.json` | 1.0 |
| 1C `ha-tang` | `docker/nginx/**` (Dockerfile build brotli theo `nginx/docker-nginx/modules`, `nginx.conf` gzip + brotli, `conf.d/app.conf` proxy tới `app:8080`, cache dài cho `/static/`, `location /covers/` theo `contract.md` §6, `/nginx-health`, `snippets/security-headers.conf`: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`); `docker/mysql/conf.d/utf8mb4.cnf` (utf8mb4, `utf8mb4_0900_ai_ci`, `time_zone`); `docker/redis/redis.conf` (requirepass từ biến, AOF); `scripts/dev/make-env.mjs` (sinh `.env` từ `.env.example`, mật khẩu ngẫu nhiên, không in ra, từ chối ghi đè `.env` đã có) | `t1k-web-core-developer` | `docker/nginx/**`, `docker/mysql/**`, `docker/redis/**`, `scripts/dev/**` | 1.0 |
| 1D `xac-minh` | Kiểm bằng Playwright MCP như bước 1.5, chỉ đọc | `t1k-web-testing-tester` | chỉ ghi `plans/reports/` | 1.4 |

Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent.

## Tiêu chí hoàn thành

1. `mvnw -B verify` xanh trên JDK 25 (Checkstyle + test util).
2. `npm --prefix frontend run lint`, `run test`, `run build` xanh; `src/main/webapp/static/.vite/manifest.json` tồn tại và có entry `src/loader/island-loader.ts`.
3. `docker compose ... up -d --wait` đưa cả 4 service về `healthy`; `docker volume ls` có đủ `db_data`, `redis_data`, `covers_data`, `catalog_data`.
4. Qua nginx: `/health.jsp` trả 200 và `ok`; một file trong `/static/` trả `content-encoding: br` khi gửi `Accept-Encoding: br`; mọi phản hồi có đủ security headers.
5. Session Redis: gọi `/dev/session-probe.jsp` hai lần, khởi động lại container `app`, lần thứ ba vẫn đếm tiếp (Redisson giữ session).
6. Phiên bản thực tế trong container: Java 25.x, Tomcat 11.0.27, MySQL 8.4.13, Redis 8.10.3.
7. `git check-ignore .env data/ .claude/.t1k.json .claude/agents/planner.md .claude/rules/code-conventions-web.md` đều khớp (bộ kit bị ignore); `git check-ignore` không khớp `.claude/rules/tiem-x.md`, `.claude/skills/tiem-x/SKILL.md`, `.claude/agents/tiem-x.md`; `git ls-files` không chứa `.env`.
8. `node --test scripts/check/` xanh.
9. Playwright MCP: console sạch, không request hỏng, có ảnh cả hai khổ.

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-01.mjs` chạy lần lượt tiêu chí 1–8 và in PASS/FAIL từng bước. Tiêu chí 9 do lane 1D ghi trong báo cáo. Bước làm đỏ có chủ đích khi viết script: dừng container `redis` thì bước 5 phải FAIL.

## Playwright MCP

Áp dụng: kiểm trang tạm và `/health.jsp` ở bước 1.5 (chưa có trang nghiệp vụ).

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Không có thẻ ảnh Tomcat 11.0.27 cho Java 25 | medium | medium | Tra Docker Hub ở bước 1.0; không có thì cài Tomcat 11.0.27 lên ảnh `eclipse-temurin:25-jre` trong Dockerfile; Java 21 là dự phòng cuối, ghi ADR |
| Redisson 4.8.0 lệch với Tomcat 11.0.27 hoặc Java 25 | medium | high | Kiểm tiêu chí 5 ngay trong phase này; hỏng thì báo chủ dự án trước khi đi tiếp (đổi phương án session là đổi D7) |
| Cổng 3306 trùng MySQL của máy | high | low | Đã đo, dùng 127.0.0.1:3307 |
| Ảnh nginx brotli build lâu hoặc hỏng | medium | low | Build nền; ghim bản nginx stable 1.30.6 theo researcher |
| Script Bash trong ảnh hỏng vì CRLF trên Windows | medium | medium | `.gitattributes` ép LF ngay commit gốc |

## Rollback

Phase đầu: xoá nhánh `phase/01-khung` và commit tạm; volume Docker giữ nguyên, chỉ xoá khi chủ dự án đồng ý.

## Ước lượng

Effort M: khoảng 3–5 giờ agent (ESTIMATED: 3 lane song song khoảng 1,5 giờ, build ảnh lần đầu và kiểm khoảng 1 giờ, tích hợp khoảng 1 giờ).

## Kết quả (11/11/2026)

Trạng thái: **ĐẠT**. `node scripts/accept/phase-01.mjs` exit 0, 8/8 bước PASS (log `plans/reports/accept-phase-01-261111-0358.log`, bị ignore vì `*.log`).

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| 1 `mvnw -B verify` trên JDK 25 | PASS: 0 lỗi Checkstyle, 61 test | Accept bước 1; `plans/reports/phase-01-java-khung-261111-0351.md` |
| 2 lint, test, build frontend; manifest có entry loader | PASS: 14 test Vitest; entry `src/loader/island-loader.ts` và `src/styles/app.css` có `isEntry: true` | Accept bước 2; `plans/reports/phase-01-frontend-khung-261111-0342.md` |
| 3 4 service healthy, 4 named volume | PASS | Accept bước 3 |
| 4 nginx: `/health.jsp` ok, `/static/` có `content-encoding: br`, đủ security headers | PASS; thêm kiểm `/favicon.ico` trả 200 | Accept bước 4 |
| 5 Session Redis còn sau khi restart app | PASS: đếm 1, 2 → restart → 3 | Accept bước 5 |
| 6 Java 25.0.5, Tomcat 11.0.27, MySQL 8.4.13, Redis 8.10.3 | PASS; thêm kiểm MySQL thật sự nạp `+07:00`, utf8mb4, utf8mb4_0900_ai_ci | Accept bước 6 |
| 7 `git check-ignore` bí mật, dữ liệu, bộ kit | PASS | Accept bước 7 |
| 8 `node --test "scripts/check/*.test.mjs"` | PASS: 11 test (hợp đồng hạ tầng + make-env) | Accept bước 8 |
| 9 Playwright MCP: console sạch, không request hỏng, ảnh hai khổ | Xem `plans/reports/phase-01-xac-minh-261111-0356.md` PASS: lần 1 FAIL do `/favicon.ico` 404 ở trang text/plain, đã sửa; lần 2 (Playwright MCP) và lần 3 (Chrome profile trống qua CDP) sạch | Ảnh ở `plans/reports/screens/phase-01/` (bị ignore) |

Làm đỏ có chủ đích: dừng container `redis` thì bước 5 FAIL ("session-probe trả 500"); bật lại thì PASS (log `accept-phase-01-261111-0354.log`, `-0355.log`). Lane 1C làm đỏ test `make-env` (in bí mật, ghi đè) và lane 1A làm đỏ `ViteManifestTest` (import vòng về entry), `Dockerfile` (SHA-256 Redisson sai).

Lệch so với kế hoạch, đã ghi vào hợp đồng:
- Nhánh lane là `lane/0N-<slug>/<lane>`: git không cho nhánh `phase/01-khung` và `phase/01-khung/<lane>` cùng tồn tại (`contract.md` §9).
- `node --test scripts/check/` của Node 24 không nhận thư mục trần; dùng `node --test "scripts/check/*.test.mjs"` (`contract.md` §10).
- MySQL trên Docker Desktop Windows bỏ qua file `.cnf` world-writable (0777): compose chép file với mode 0644 trước entrypoint. Redis đi qua `docker-entrypoint.sh` để không chạy bằng root.
- Thêm ngoài danh sách: `scripts/dev/mvnw.mjs` (chạy mvnw với JDK 25 cho riêng tiến trình con), `scripts/accept/_lib.mjs` (thư viện chung của Accept, có `--only`), `frontend/public/img/cover-fallback.svg` và `favicon.svg` (tự vẽ, phase 5 có thể vẽ lại), `util/JsonReader` (đọc manifest khi pom chưa có thư viện JSON; phase 3 thêm Jackson thì thay), `util/DbShutdownListener`.
- JDK 25.0.5 (Temurin) cài bằng winget; JDK 24.0.2 giữ nguyên.

Việc để phase sau: `lucide-react` và `radix-ui` (lane 1B đề xuất, phase 5 ghim); `npm audit` báo 2 lỗi mức moderate chỉ ở devDependencies (deepmerge qua shadcn, minimatch qua eslint 10), không `audit fix --force` vì sẽ hạ major.
