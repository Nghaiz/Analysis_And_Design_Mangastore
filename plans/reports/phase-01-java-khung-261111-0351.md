# Báo cáo lane 1A `java-khung` (phase 1)

Nhánh: `lane/01-khung/java-khung`, worktree `D:/Coding/mangastore-wt/01-java-khung`. Chỉ commit tại máy, chưa push.
Commit: `7c0b2946d6a85958c8fce2f1c162243815ba9581` (mã), `694367c5223760f6bf0047480dc8ab18b9a864ed` (bit thực thi của `mvnw`), cộng commit của báo cáo này.

Trạng thái: **DONE**.

## 1. Đã làm

| File | Nội dung |
|---|---|
| `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` | Maven Wrapper 3.3.4, kiểu `only-script` (không có jar), ghim Maven 3.9.16. Thêm `distributionSha256Sum=5af3b743…a56e1d89ce`: tính từ zip trên Central, zip đó khớp file `.sha512` của cả Maven Central lẫn downloads.apache.org. `mvnw` có mode 100755 trong git. |
| `config/checkstyle/checkstyle.xml` | Checkstyle 14.4: 4 dấu cách (`Indentation`), không tab, 120 cột, LF, dòng trống cuối file, không khoảng trắng cuối dòng; import, đặt tên (`vn.tiemtruyen.*`), ngoặc, khoảng trắng, lỗi hay gặp (EqualsHashCode, MissingSwitchDefault, InnerAssignment, IllegalCatch Throwable/Error, MagicNumber…), thiết kế lớp (FinalClass, HideUtilityClassConstructor, VisibilityModifier), độ dài/độ phức tạp, Javadoc cho kiểu public. Miễn trừ duy nhất (MagicNumber, MissingJavadocType, MethodLength) cho `src/test/java` qua `SuppressionSingleFilter` trong cùng file. |
| `util/AppConfig` | Đọc biến môi trường lười. `require()` ném `IllegalStateException` nêu tên biến khi thiếu/rỗng; bí mật (`APP_DB_PASSWORD`) không có mặc định. Mặc định chỉ cho biến hợp đồng ghi có mặc định (`APP_DB_POOL_SIZE`=10, `APP_VITE_DEV`=false, `APP_COVERS_BASE_URL`=/covers). Cờ chỉ nhận `true`/`false`; pool 1..100; `APP_VITE_DEV_ORIGIN` phải là origin thuần `http(s)://host[:port]` (in thẳng vào HTML/JS). |
| `util/Db` | Một `HikariDataSource` duy nhất, tạo lười (double-checked, `volatile`), `initializationFailTimeout=-1` nên DB chưa lên thì lần sau tự nối lại; `connectionTimeout` 3 s (dưới timeout 5 s của healthcheck). `ping()` dùng `Connection.isValid(2)`, lỗi ghi log (không bí mật) rồi trả `false`. |
| `util/DbShutdownListener` | `@WebListener`: khi webapp dừng thì đóng pool, gỡ driver MySQL của webapp, dừng `AbandonedConnectionCleanupThread`. Trước khi có nó Tomcat cảnh báo rò bộ nhớ ở mỗi lần restart container. |
| `util/JsonReader` | Bộ đọc JSON nhỏ, chặt (RFC 8259) để đọc manifest; pom chưa có thư viện JSON (xem §5). |
| `util/ViteManifest` | Đọc `/static/.vite/manifest.json` qua `ServletContext.getResourceAsStream`, cache trong thuộc tính `ServletContext`. `resolve(entries)`: entry CSS in chính `file` của nó; entry JS in `css` của nó và của mọi chunk trong `imports` (đệ quy, tập đã thăm dùng chung, entry được đánh dấu đã thăm trước khi đi để chunk import ngược về entry không lặp); `dynamicImports` không preload; thứ tự stylesheet → script → modulepreload, không trùng. Thiếu manifest, thiếu entry, import treo đều ném lỗi kèm việc cần làm. |
| `util/AssetTags` | Sinh HTML cho tag. Build: `<link rel="stylesheet">`, `<script type="module">`, `<link rel="modulepreload">` với tiền tố `contextPath + /static/`, escape thuộc tính. Dev (`APP_VITE_DEV=true`): preamble React Refresh import `${origin}/static/@react-refresh`, rồi `${origin}/static/@vite/client`, rồi entry (`.css` bằng `<link>`, còn lại bằng `<script type="module">`). Entry mặc định `src/styles/app.css`, `src/loader/island-loader.ts`. |
| `WEB-INF/tags/assets.tag` | `<t:assets/>` (thuộc tính tuỳ chọn `entries="a,b"`), gọi `AssetTags.render(application, …)`. |
| `health.jsp` | `session="false"`, `Cache-Control: no-store`; khoẻ 200 + `ok`, hỏng 503 + `db-loi` (không chứa `ok`). |
| `dev/session-probe.jsp` | Tăng `probeCount` (`Integer`) trong session, in `count=<n>\n`, `text/plain; charset=UTF-8`, `no-store`. |
| `HomeView.jsp` | Trang tạm "Tiệm đang dựng", `lang="vi"`, `session="false"`, `<t:assets/>`, `<link rel="icon" href="data:,">` để trình duyệt không gọi `/favicon.ico` (404 sẽ làm hỏng tiêu chí 9 của lane 1D). Không có style/script inline (CSP phase 1). |
| `docker/app/Dockerfile` | 4 tầng: `frontend` (node:24.22.2-bookworm-slim, `npm ci` rồi `npm run build`, kiểm có manifest) → `war` (maven:3.9.16-eclipse-temurin-25, `mvn -B -ntp -C package -DskipTests`, Checkstyle vẫn chạy) → `session-libs` (`maven-dependency-plugin:3.11.0:copy` cho `redisson-all` và `redisson-tomcat-11` 4.8.0, `-C` kiểm checksum Central, rồi `sha256sum -c` với SHA-256 ghim trong `ARG`) → `runtime` (tomcat:11.0.27-jre25-temurin-noble, cài `curl`, xoá `webapps`/`webapps.dist`, jar vào `lib/`, `context.xml` + `redisson.yaml` vào `conf/`, `ROOT.war`, chạy bằng user `tiemtruyen` uid 10001). Cache npm và `.m2` bằng BuildKit cache mount. |
| `docker/app/Dockerfile.dockerignore` | Loại đủ danh sách §10 (`.git`, `.claude`, `**/node_modules`, `target`, `data`, `images`, `**/*.pdf`, `plans`, `src/main/webapp/static`) cộng `.env*`, log, IDE, `e2e`, `docs`, `scripts`, `.github`, `docker/{nginx,mysql,redis}`. Không loại `pipeline/` vì phase 5 có thể để Vite đọc `pipeline/config/categories.json`. |
| `docker/app/context.xml` | Ba `WatchedResource` mặc định của Tomcat 11.0.27 + `RedissonSessionManager` (`configPath=${catalina.base}/conf/redisson.yaml`, `readMode=REDIS`, `updateMode=DEFAULT`, `broadcastSessionEvents=false`, `keyPrefix=tiemtruyen:`). |
| `docker/app/redisson.yaml` | `singleServerConfig.address: "${APP_REDIS_ADDRESS}"`, `password: "${REDIS_PASSWORD}"` ở mức gốc (vị trí mới trong tài liệu Redisson; `Config.setPassword` có trong jar 4.8.0), không giá trị mặc định. |
| Test | `AppConfigTest` (26), `ViteManifestTest` (14, gồm manifest thật Vite 8 của lane 1B và ca import ngược về entry), `JsonReaderTest` (21). |

Đã áp dụng bốn ghi chú tích hợp của orchestrator từ lane 1B (dev base `/static/`, entry CSS in `file` riêng, tập đã thăm chống import vòng, không preload `dynamicImports`).

## 2. Lệnh đã chạy và kết quả

Mọi lệnh Java chạy với `JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.5.8-hotspot"` cho riêng tiến trình đó.

| Lệnh | Kết quả |
|---|---|
| `mvn -N org.apache.maven.plugins:maven-wrapper-plugin:3.3.4:wrapper -Dmaven=3.9.16` | BUILD SUCCESS, sinh wrapper |
| `./mvnw -B -ntp clean verify` | 0 vi phạm Checkstyle; 61 test, 0 lỗi; BUILD SUCCESS |
| `.\mvnw.cmd -B -ntp -v` (cmd) | Apache Maven 3.9.16, Java 25.0.5 |
| Lần chạy đầu có `LineLength` 124 > 120 | BUILD FAILURE: bộ luật bắt lỗi thật, đã sửa |
| Làm đỏ có chủ đích: bỏ `seen.add(entry)` | `staticImportPointingBackToTheEntryTerminatesWithoutDuplicates` FAIL, khôi phục thì xanh |
| `docker build --target session-libs` (worktree thật) | `redisson-all-4.8.0.jar: OK`, `redisson-tomcat-11-4.8.0.jar: OK` |
| Làm đỏ: `--build-arg REDISSON_ALL_SHA256=000…` | `redisson-all-4.8.0.jar: FAILED`, build exit 1 |
| Build cả ảnh từ context tạm (file lane 1A + `frontend/` của lane 1B, đặt trong scratchpad, ngoài worktree) | Exit 0; manifest có; `You have 0 Checkstyle violations`; BUILD SUCCESS |
| Stack tạm (project `lane1a-test`: app + mysql:8.4.13 + redis:8.10.3, dữ liệu trên tmpfs, không volume) | 3 service healthy |
| `GET /health.jsp` | 200, thân đúng 2 byte `ok`, `Cache-Control: no-store` |
| `GET /` | 200, HTML `lang="vi"`, in `/static/assets/app-NTGTz7Ol.css` và `/static/assets/island-loader-DC99wicD.js`; file JS trả 200 `text/javascript` |
| `/dev/session-probe.jsp` ×2, `docker compose restart app`, lần 3 | `count=1`, `count=2`, sau restart `count=3` (Redisson giữ session); cookie `HttpOnly; SameSite=Lax` |
| `docker compose stop db` rồi `/health.jsp` | 503, thân `db-loi`, trả sau 3,0 s; bật lại db thì 200 `ok` |
| Trong container | `openjdk 25.0.5`, `Apache Tomcat/11.0.27`, `uid=10001(tiemtruyen)`, `lib/` có 2 jar Redisson, `webapps/` chỉ có `ROOT` |
| `APP_VITE_DEV=true` | `<head>` có preamble import `http://localhost:5173/static/@react-refresh`, `…/static/@vite/client`, `<link>` `…/static/src/styles/app.css`, script `…/static/src/loader/island-loader.ts` |
| Restart sau khi thêm `DbShutdownListener` | Không còn WARNING rò driver/luồng |
| Dọn | `docker compose down` stack tạm (0 volume), xoá 2 image thử; context tạm nằm trong scratchpad, không có file thừa trong worktree |

## 3. Gotcha

1. **Ảnh `tomcat:11.0.27-jre25-temurin-noble` không có `curl` lẫn `wget`**: Dockerfile cài `curl` (healthcheck compose cần).
2. **Ảnh Tomcat chạy root mặc định**: Dockerfile tạo user `tiemtruyen` và chỉ chown `logs temp work webapps conf/Catalina`. `version.sh` vẫn chạy được (tiêu chí 6).
3. **`${config_loc}` không có trong maven-checkstyle-plugin** (đó là biến của Gradle) và không sửa được pom để thêm `propertyExpansion`, nên không dùng file suppressions riêng; miễn trừ test đặt bằng `SuppressionSingleFilter` trong `checkstyle.xml`.
4. **`git commit -- mvnw` không mang bit thực thi** khi `core.filemode=false` trên Windows: phải `git update-index --chmod=+x mvnw` rồi commit riêng thay đổi chỉ nằm ở index.
5. **Vite 8 dùng `input` cấp gốc / `rolldownOptions`**, không phải `build.rollupOptions.input`; thông báo lỗi của `ViteManifest` nói "kiểm input trong frontend/vite.config.ts".
6. **`REDIS_PASSWORD` rỗng**: Redisson thay `${REDIS_PASSWORD}` bằng chuỗi rỗng (biến có tồn tại), session manager không khởi động được nên webapp không lên (health 404, log SEVERE "session manager failed to start … Unable to connect"). Hỏng to, không âm thầm chạy session trong bộ nhớ, nhưng thông báo không nêu tên biến. Compose đã chặn trước bằng `${REDIS_PASSWORD:?…}`.
7. Đã kiểm qua context7 (Redisson web-session-management, configuration; Vite v8.3.5 backend-integration, base): tài liệu Redisson mới đặt `password` ở mức gốc của YAML; `javap` trên jar 4.8.0 xác nhận cả `Config.setPassword` và `BaseConfig.setPassword` đều có.
8. Không tự kiểm qua nginx (lane 1C) và chưa chạy `scripts/accept/phase-01.mjs`: việc của orchestrator ở bước 1.4 trong repo chính.

## 4. Gợi ý cho orchestrator khi tích hợp

- Healthcheck app trong `compose.yaml` (`start_period: 40s`) đủ: Tomcat lên và health xanh khoảng 10 giây sau khi db healthy.
- `HomeView.jsp` sẽ trả 500 nếu WAR đóng gói mà chưa build frontend (thông báo nêu `npm --prefix frontend run build`). Ảnh Docker luôn build frontend trước nên không gặp.
- CORS dev của lane 1B chỉ cho `http://localhost:8080`; preamble dev là script inline nên chỉ chạy khi trang không đi qua CSP của nginx (đúng như contract §10).

## 5. Đề xuất cho file của orchestrator (không tự sửa)

1. **Thư viện JSON (tuỳ chọn, không gấp).** Phase 1 tự đọc manifest bằng `util/JsonReader` vì `pom.xml` chưa có thư viện JSON. Khi phase sau thêm `JsonUtil.toScriptJson()` (contract §5), nếu orchestrator thêm một thư viện, ví dụ `com.fasterxml.jackson.core:jackson-databind` (tra bản mới nhất trên Central lúc ghim), thì nên cho `ViteManifest` dùng nó và xoá `JsonReader` + `JsonReaderTest` để không có hai bộ đọc JSON.
2. **`.gitattributes` (tuỳ chọn).** Thêm `mvnw text eol=lf` cho rõ ý (hiện `* text=auto eol=lf` đã đủ). Không bắt buộc.
3. Không cần đổi `pom.xml`, `compose.yaml`, `.env.example` hay `web.xml` cho lane này.
