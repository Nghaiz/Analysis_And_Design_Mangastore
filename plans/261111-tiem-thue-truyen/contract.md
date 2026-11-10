# Hợp đồng kế hoạch: tiệm thuê truyện tuổi thơ

Owner: orchestrator (phiên chính của phiên cook). Lane không sửa file này; cần đổi thì báo lên, orchestrator sửa, commit rồi brief lại các lane bị ảnh hưởng.
Kiểm bằng: `scripts/check/plan-contract.test.mjs` (tạo ở bước 1.0, chạy bằng `node --test scripts/check/` trong mọi script Accept).

Phạm vi: phần hạ tầng, build, cây thư mục, ranh giới giữa các phase và giữa phase 4 ↔ 5. Hợp đồng nghiệp vụ và tích hợp trang (tên trang, field form, thuộc tính session, chữ kí DAO, props island, 28 thông báo) là SSOT riêng ở `docs/contracts.md`, do phase 2 tạo. Khi hai file nói khác nhau về nghiệp vụ, `docs/contracts.md` thắng; về hạ tầng, file này thắng.

## 1. Spawn

- Mọi spawn: `model: "opus"`, `effort: "<CLAUDE_EFFORT>"` (đọc biến môi trường lúc spawn), `run_in_background: true`.
- Tối đa 3 subagent cùng lúc trên toàn phiên. Subagent không spawn agent. Việc thứ 4 trở đi xếp hàng trong `agent-map.md`.
- Brief ngắn: việc, ràng buộc quyết định, đường dẫn file phase và hợp đồng, danh sách Owns. Không dán nội dung file.
- Kết quả chi tiết ghi `plans/reports/<phase>-<lane>-<yymmdd-hhmm>.md`; trả về orchestrator tóm tắt ≤ 15 dòng kèm đường dẫn và trạng thái DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT.

## 2. Cây thư mục (chuẩn, ghi lại vào `docs/architecture.md` ở phase 2)

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
├─ src/main/webapp/dev/                    StyleGuideView.jsp, HomePreviewView.jsp, session-probe.jsp (trang công cụ; dự án chỉ chạy localhost)
├─ src/main/webapp/WEB-INF/{web.xml, tags/, tags/ui/}
├─ src/main/webapp/static/                 đầu ra Vite (bị ignore)
├─ src/test/java/vn/tiemtruyen/{dao,util,filter,arch,schema}/
├─ frontend/{package.json, vite.config.ts, tsconfig.json, tsconfig.app.json, eslint.config.js, components.json}
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
├─ .claude/rules/tiem-*.md  .claude/skills/tiem-*/  .claude/agents/tiem-*.md   (file của dự án do phase 2 tạo; mọi file khác trong .claude/ là của kit, bị ignore)
├─ images/  prompt-web-tiem-thue-truyen.md  B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf   (tài liệu gốc, chỉ đọc)
└─ plans/  plans/reports/
```

Java chỉ có bốn package `dao`, `model`, `filter`, `util`. Không có lớp kế thừa `HttpServlet`, không Spring.

## 3. Service, cổng, volume (compose)

| Service | Ảnh | Cổng trong mạng | Cổng trên máy (chỉ 127.0.0.1) | Healthcheck | Volume |
|---|---|---|---|---|---|
| `app` | build từ `docker/app/Dockerfile` (Tomcat 11.0.27, Java 25) | 8080 | không mở | `GET /health.jsp` trả 200 và chữ `ok` (kiểm cả DB) | `covers_data` (chỉ đọc), `catalog_data` (chỉ đọc, `/flyway/data`) |
| `db` | `mysql:8.4.13` | 3306 | `127.0.0.1:3307` | `mysqladmin ping` | `db_data` |
| `redis` | `redis:8.10.3` | 6379 | không mở | `redis-cli -a $REDIS_PASSWORD ping` | `redis_data` |
| `nginx` | build từ `docker/nginx/Dockerfile` (có brotli) | 80 | `127.0.0.1:8080` | `GET /nginx-health` | `covers_data` (chỉ đọc, `/srv/covers`) |

- Named volume: `db_data`, `redis_data`, `covers_data`, `catalog_data`. Không dùng volume ẩn danh cho dữ liệu.
- Chỉ chạy localhost, không có prod (chủ dự án chốt 11/11/2026, Deferred #28). `compose.yaml` là cấu hình duy nhất để chạy tại máy: cổng chỉ mở trên 127.0.0.1, `APP_VITE_DEV` lấy từ `.env`.
- `compose.e2e.yaml` chồng lên khi chạy E2E: `FLYWAY_DATA_LOCATION=classpath:db/e2e`, ngưỡng `LOGIN_RATE_*` cao hơn số lần sai của kịch bản. Chạy bằng compose project riêng (`docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml ...`) nên có volume riêng, không đụng dữ liệu thường; không chạy cùng lúc với stack thường vì dùng chung cổng trên máy.
- Mọi service có `TZ=Asia/Ho_Chi_Minh`.
- `docker compose down` không kèm `-v` nếu chủ dự án chưa đồng ý (xoá volume là thao tác phá huỷ).

## 4. Biến môi trường (chỉ tên; giá trị giả nằm trong `.env.example`, giá trị thật trong `.env` bị ignore)

`MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE` (mặc định `tiemtruyen`), `MYSQL_USER`, `MYSQL_PASSWORD`, `REDIS_PASSWORD`, `APP_DB_URL`, `APP_DB_USER`, `APP_DB_PASSWORD`, `APP_DB_POOL_SIZE`, `APP_REDIS_ADDRESS`, `APP_VITE_DEV` (`true` | `false`), `APP_VITE_DEV_ORIGIN`, `APP_COVERS_BASE_URL` (mặc định `/covers`), `FLYWAY_DATA_LOCATION`, `LOGIN_RATE_MAX_FAILS` (mặc định 5), `LOGIN_RATE_WINDOW_SECONDS` (mặc định 900), `NGINX_HTTP_PORT`, `TZ`.

Thêm biến mới: orchestrator sửa `.env.example` và bảng này trong cùng một commit.

## 5. Build và nạp dữ liệu

- WAR: `target/ROOT.war`, Maven Wrapper ghim Maven 3.9.16, `maven.compiler.release=25`.
- Vite: `root = frontend/`, `base = /static/`, `build.outDir = ../src/main/webapp/static`, `build.manifest = true` → `/static/.vite/manifest.json`. Entry: `src/loader/island-loader.ts` và `src/styles/app.css`.
- JSP nạp tài nguyên bằng một tag duy nhất `<t:assets/>` (`WEB-INF/tags/assets.tag`, đọc manifest qua `util/ViteManifest`, cache trong `ServletContext`). Khi `APP_VITE_DEV=true`: in `@vite/client` và preamble React refresh từ `APP_VITE_DEV_ORIGIN`.
- Island (cách B): `<div data-island="<Tên>" data-props="<id>">` nằm trong `<form>` do JSP render; props ở `<script type="application/json" id="<id>">` do `JsonUtil.toScriptJson()` sinh. Registry bằng `import.meta.glob('../islands/*/index.tsx')`. Tên island: `SelectedStack`, `ProcessBillDesk`, `CollateralDrawer`, `ShelfScene`. Island không `fetch`, chỉ đổi input thật rồi `form.requestSubmit()`.
- Flyway (Java API trong `util/MigrationListener`): `classpath:db/migration` + `${FLYWAY_DATA_LOCATION}` (mặc định `filesystem:/flyway/data`; lần chạy E2E đặt `classpath:db/e2e`). Không có profile: biến này là chỗ duy nhất khác nhau giữa lần chạy thường và E2E. Số phiên bản: V1 schema, V2 danh mục và tài khoản mẫu, V10 catalog (crawl hoặc e2e), V11 phiếu mẫu (chỉ crawl).

## 6. Ranh giới phase 4 ↔ phase 5 ↔ nginx (ảnh bìa, D2)

- File: `covers_data:/{bookId}/cover-{w}.webp` và `cover-{w}.avif` với `w ∈ {160, 320, 640}`; ảnh phụ `extra-{n}-{w}.webp`, `n` từ 1.
- URL: `${APP_COVERS_BASE_URL}/{bookId}/cover-{w}.webp`. Nginx phục vụ trực tiếp, `Cache-Control: public, max-age=31536000`; file không tồn tại thì trả ảnh bìa giấy vẽ sẵn `/static/img/cover-fallback.svg` với mã 200.
- Component bìa (phase 5) chỉ nhận `bookId`, `name`, `size`; tự dựng `srcset` từ ba cỡ, có `alt` là tên đầu truyện, `loading="lazy"` trừ ảnh đầu tiên trong màn hình.
- Thể loại: danh sách trong `pipeline/config/categories.json` (mảng chuỗi tiếng Việt). Phase 5 đọc cùng file để chọn màu gáy truyện trên kệ 3D; không tự thêm thể loại.
- Manifest nguồn: `pipeline/manifest.jsonl`, mỗi dòng một bản ghi `{ "kind": "book" | "image", "bookId", "source": "kimdong" | "tiki" | "wikidata", "sourceUrl", "fetchedAt", "winner", "sha256" }`; không chứa mô tả, tên tập hay ảnh.

## 7. Quy ước script Accept

- Mỗi phase một script `scripts/accept/phase-0N.mjs`, chạy bằng `node scripts/accept/phase-0N.mjs`, chỉ dùng module có sẵn của Node 24.
- In mỗi bước một dòng `[accept] PASS <bước>` hoặc `[accept] FAIL <bước>: <lí do> → <việc cần làm>`; không màu khi không có TTY hoặc có `NO_COLOR`; không hỏi tương tác.
- Exit 0 chỉ khi mọi bước PASS; exit 1 khi có bước FAIL; exit 2 khi thiếu công cụ (JDK 25, Docker, Node) và nói rõ thiếu gì.
- Ghi log đầy đủ vào `plans/reports/accept-phase-0N-<yymmdd-hhmm>.log`.
- Script của phase N chạy lại các kiểm quan trọng của phase trước (chống thoái lui), liệt kê ở file phase.
- Mỗi script có ít nhất một bước đã được làm đỏ có chủ đích một lần khi viết (ghi trong báo cáo của phase), để chắc nó bắt được lỗi.

## 8. File dùng chung (chỉ orchestrator sửa)

`pom.xml`, `mvnw*`, `.mvn/**`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts` (từ phase 5), `pipeline/package.json`, `pipeline/package-lock.json`, `e2e/package.json`, `e2e/package-lock.json`, `src/main/webapp/WEB-INF/web.xml`, `src/main/resources/db/**`, `compose*.yaml`, `.env.example`, `.gitignore`, `.gitattributes`, `AGENTS.md`, `CLAUDE.md`, `docs/contracts.md` (lane 2A tạo ở phase 2, từ đó chỉ orchestrator sửa), `scripts/accept/**`, `scripts/smoke/**`, `plans/261111-tiem-thue-truyen/**`. Lane cần sửa một file trong danh sách thì ghi đề xuất vào báo cáo; orchestrator áp dụng.

## 9. Git

- Repo: `git@github.com:Nghaiz/Analysis_And_Design_Mangastore.git` (public), remote `origin`, SSH. Commit gốc trên `main` ngày 11/11/2026: `.gitignore`, `.gitattributes`, `plans/`, brief, `images/`, PDF báo cáo. Sau commit gốc không commit thẳng lên `main`.
- Mỗi phase một nhánh `phase/0N-<slug>` tạo từ `origin/main` mới nhất (`git fetch origin` trước); mỗi lane sửa code một worktree `D:/Coding/mangastore-wt/<0N>-<lane>` trên nhánh `phase/0N-<slug>/<lane>`, chỉ commit tại máy, không push.
- Cuối phase, orchestrator merge các lane vào nhánh phase rồi chạy Accept. PASS thì push nhánh phase (`git push -u origin phase/0N-<slug>`), mở PR vào `main` (`gh pr create --base main`), merge bằng merge commit (`gh pr merge <số PR> --merge --delete-branch`), rồi `git switch main && git pull --ff-only`. Phase 8 chờ thêm CI trên PR xanh (Deferred #25).
- Quyền push, mở PR và merge trên repo này do chủ dự án cho ngày 11/11/2026 (Deferred #3). Không push lên đâu khác, không force-push, subagent không push.
- Commit dạng pathspec (`git commit -m "..." -- <đường dẫn>`), không `git add .`; file mới thì `git add <đường dẫn cụ thể>` trước.
- Thông điệp commit kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; mô tả PR kết thúc bằng dòng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- `.gitignore` ở gốc repo là SSOT. Tối thiểu: `.env` và `.env.*` (trừ `.env.example`), `data/`, `node_modules/`, `target/`, `src/main/webapp/static/`, `plans/reports/screens/`, và khối `.claude/`: ignore toàn bộ, chỉ whitelist `.claude/rules/tiem-*.md`, `.claude/skills/tiem-*/`, `.claude/agents/tiem-*.md` (Deferred #4).

## 10. Chi tiết tích hợp phase 1 (chốt 11/11/2026, trước khi chia lane 1A, 1B, 1C)

- **Healthcheck trong compose dùng `curl`:** ảnh `app` và `nginx` phải có `curl` (cài thêm nếu ảnh gốc thiếu). `app`: `curl -fsS http://127.0.0.1:8080/health.jsp | grep -q ok`; `nginx`: `curl -fsS http://127.0.0.1/nginx-health | grep -q ok` (nginx trả `ok`).
- **`/health.jsp`:** ping DB qua `util/Db` (ví dụ `Connection.isValid`); khoẻ thì mã 200, thân `ok`; hỏng thì mã 503 và thân không chứa từ `ok`. Không in chi tiết lỗi hay bí mật.
- **`/dev/session-probe.jsp`:** tăng một số nguyên trong session (thuộc tính `probeCount`, kiểu `Integer`) rồi in đúng một dòng `count=<n>` (`text/plain; charset=UTF-8`). Lần đầu trong session in `count=1`.
- **Session Redis:** Redisson `RedissonSessionManager` khai trong `conf/context.xml` của ảnh app (không trong WAR), file cấu hình `redisson.yaml` đọc `APP_REDIS_ADDRESS` và `REDIS_PASSWORD` qua placeholder `${...}` của Redisson. Jar `redisson-all` và `redisson-tomcat-11` 4.8.0 nằm ở `$CATALINA_HOME/lib`.
- **Build ảnh app:** context là gốc repo; file loại trừ là `docker/app/Dockerfile.dockerignore` (BuildKit đọc file cạnh Dockerfile), phải loại `.git`, `.claude`, `node_modules`, `target`, `data`, `images`, `*.pdf`, `plans`, `src/main/webapp/static`. Các tầng: Node 24 (`npm ci && npm run build` trong `frontend/`, ra `src/main/webapp/static`) → Maven 3.9.16 + Temurin 25 (`mvn -B package -DskipTests`, Checkstyle vẫn chạy) → `tomcat:11.0.27-jre25-temurin-noble`, WAR thành `webapps/ROOT.war`, xoá webapp mặc định của Tomcat.
- **`/static/`:** nginx proxy tới `app:8080` (không chép file tĩnh vào ảnh nginx), thêm `Cache-Control: public, max-age=31536000, immutable` cho `/static/assets/`; gzip và brotli bật cho JS, CSS, SVG, JSON, HTML (kể cả phản hồi proxy). Header bảo mật dùng `add_header ... always` qua `snippets/security-headers.conf`, include ở mọi `location` có `add_header` riêng.
- **CSP phase 1:** `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Trang dev Vite (`APP_VITE_DEV=true`) không đi qua nginx nên không vướng CSP này.
- **Vite manifest:** khoá entry đúng bằng đường dẫn nguồn tính từ `frontend/` (`src/loader/island-loader.ts`, `src/styles/app.css`), `isEntry: true`. `ViteManifest` đọc `/static/.vite/manifest.json` từ `ServletContext`; `<t:assets/>` in mọi `css` của entry và của chunk trong `imports` (đệ quy, không lặp), rồi `<script type="module" src="/static/<file>">`, rồi `<link rel="modulepreload">` cho chunk import.
- **Java:** Checkstyle 4 dấu cách, không tab, tối đa 120 kí tự mỗi dòng (khớp `.editorconfig`). `util/AppConfig` không có giá trị mặc định ngầm cho bí mật (`APP_DB_PASSWORD`, `REDIS_PASSWORD`): thiếu thì ném lỗi nêu tên biến.
- **Node:** `node --test` của Node 24 không nhận thư mục trần; mọi script và tài liệu chạy `node --test "scripts/check/*.test.mjs"` (cùng tập file với "`node --test scripts/check/`" trong file phase).
