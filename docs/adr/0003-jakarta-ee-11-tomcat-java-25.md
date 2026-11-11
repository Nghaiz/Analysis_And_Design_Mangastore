# ADR-0003: Jakarta EE 11 trên Tomcat 11.0.27, Java 25, và bảng phiên bản đã ghim

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm §5; `plans/reports/researcher-261111-stack-versions.md`; `pom.xml`, `.mvn/wrapper/maven-wrapper.properties`, `frontend/package.json`, `docker/*/Dockerfile`, `compose.yaml`

## Bối cảnh

Brief gợi ý "Java 21, Jakarta EE 10 trên Tomcat 11". Hai ý đó lệch nhau: EE 10 thuộc Tomcat 10.1, còn Tomcat 11 cài đặt các đặc tả web của **Jakarta EE 11** (Servlet 6.1, Pages 4.0, EL 6.0, cần Java ≥ 17). Brief cũng yêu cầu chọn bản mới và tốt nhất, ghi rõ phiên bản và lí do.

## Quyết định

- Container: **Tomcat 11.0.27**, API Jakarta EE 11 (`jakarta.servlet-api` 6.1.0, `jakarta.servlet.jsp-api` 4.0.0, `jakarta.el-api` 6.0.1, cả ba `provided`). JSTL đóng trong WAR: API 3.0.2 + bản cài đặt Glassfish 3.0.1 (3.1 mới ở M2).
- Java: **25 LTS** (hỗ trợ tới 2030), `maven.compiler.release=25`. Tomcat 11 đã được thử trên JDK 25 RC nhưng chưa ghi chứng nhận chính thức; dự phòng là Java 21 LTS nếu một thư viện vỡ.
- Ghim cứng mọi phiên bản (không dùng dải `^`, `~`, `LATEST`): bảng dưới.

### Bảng phiên bản

Cột "Tra bởi": **R** = researcher, `plans/reports/researcher-261111-stack-versions.md`; **O** = orchestrator tra lại trên `repo1.maven.org` (`maven-metadata.xml`), `registry.npmjs.org`, `hub.docker.com`; **L** = lane phase 1 tra lúc ghim (ghi ở đầu `pom.xml`, `docker/*/Dockerfile` và báo cáo `plans/reports/phase-01-*.md`). Mọi lần tra ngày 2026-11-11; mọi URL dưới đây trả HTTP 200 ngày 2026-11-11.

**Chạy và ảnh Docker**

| Thành phần | Phiên bản | Ghim ở | Nguồn | Tra bởi |
|---|---|---|---|---|
| JDK (Temurin) | 25.0.5 | máy dev (winget), ảnh `app` | https://endoflife.date/oracle-jdk | R |
| Tomcat | 11.0.27 | `docker/app/Dockerfile` | https://tomcat.apache.org/whichversion.html · https://repo1.maven.org/maven2/org/apache/tomcat/tomcat-catalina/maven-metadata.xml | R |
| Ảnh runtime app | `tomcat:11.0.27-jre25-temurin-noble` | `docker/app/Dockerfile` | https://hub.docker.com/_/tomcat | O |
| Ảnh build WAR | `maven:3.9.16-eclipse-temurin-25-noble` (tag có thật, `docker manifest inspect` ngày 2026-11-11: amd64, arm64) | `docker/app/Dockerfile` | https://hub.docker.com/_/maven | O, L |
| Ảnh build frontend | `node:24.22.2-bookworm-slim` | `docker/app/Dockerfile` | https://hub.docker.com/_/node | L |
| MySQL | `mysql:8.4.13` | `compose.yaml` | https://hub.docker.com/_/mysql · https://dev.mysql.com/doc/relnotes/mysql/8.4/en/ | O, R |
| Redis | `redis:8.10.3` | `compose.yaml` | https://hub.docker.com/_/redis · https://github.com/redis/redis/releases | O, R |
| Nginx | `nginx:1.30.6` (ghim digest `sha256:42c68eab…`), module brotli từ pkg-oss tag 1.30.6-1 | `docker/nginx/Dockerfile` | https://hub.docker.com/_/nginx | O, L |
| Node | ≥ 24 | `frontend/package.json` (`engines`) | (dùng chung ảnh node ở trên) | L |

**Build Java**

| Thành phần | Phiên bản | Ghim ở | Nguồn | Tra bởi |
|---|---|---|---|---|
| Maven | 3.9.16 | `.mvn/wrapper/maven-wrapper.properties` (kèm SHA-256) | https://repo1.maven.org/maven2/org/apache/maven/maven-core/maven-metadata.xml | R |
| Maven Wrapper | 3.3.4 (`only-script`) | `.mvn/wrapper/maven-wrapper.properties` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-wrapper-plugin/maven-metadata.xml | O |
| maven-compiler-plugin | 3.16.0 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-compiler-plugin/maven-metadata.xml | O |
| maven-surefire-plugin | 3.6.1 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml | O |
| maven-enforcer-plugin | 3.7.0 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-enforcer-plugin/maven-metadata.xml | O |
| maven-war-plugin | 3.5.1 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-war-plugin/maven-metadata.xml | R |
| maven-checkstyle-plugin | 3.6.0 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-checkstyle-plugin/maven-metadata.xml | O |
| Checkstyle | 14.4.0 | `pom.xml` | https://repo1.maven.org/maven2/com/puppycrawl/tools/checkstyle/maven-metadata.xml | O |
| maven-resources-plugin | 3.5.0 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-resources-plugin/maven-metadata.xml | L |
| maven-clean-plugin | 3.5.0 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-clean-plugin/maven-metadata.xml | L |
| maven-install-plugin | 3.2.0 | `pom.xml` | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-install-plugin/maven-metadata.xml | L |
| maven-dependency-plugin | 3.11.0 | `docker/app/Dockerfile` (tải jar Redisson) | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-dependency-plugin/maven-metadata.xml | L |

**Thư viện Java**

| Thành phần | Phiên bản | Ghim ở | Nguồn | Tra bởi |
|---|---|---|---|---|
| `jakarta.servlet:jakarta.servlet-api` (provided) | 6.1.0 | `pom.xml` | https://repo1.maven.org/maven2/jakarta/servlet/jakarta.servlet-api/maven-metadata.xml | O |
| `jakarta.servlet.jsp:jakarta.servlet.jsp-api` (provided) | 4.0.0 | `pom.xml` | https://repo1.maven.org/maven2/jakarta/servlet/jsp/jakarta.servlet.jsp-api/maven-metadata.xml | O |
| `jakarta.el:jakarta.el-api` (provided) | 6.0.1 | `pom.xml` | https://repo1.maven.org/maven2/jakarta/el/jakarta.el-api/maven-metadata.xml | O, R |
| `jakarta.servlet.jsp.jstl:jakarta.servlet.jsp.jstl-api` | 3.0.2 | `pom.xml` | https://repo1.maven.org/maven2/jakarta/servlet/jsp/jstl/jakarta.servlet.jsp.jstl-api/maven-metadata.xml | R |
| `org.glassfish.web:jakarta.servlet.jsp.jstl` | 3.0.1 | `pom.xml` | https://repo1.maven.org/maven2/org/glassfish/web/jakarta.servlet.jsp.jstl/maven-metadata.xml | R |
| `com.zaxxer:HikariCP` | 7.1.0 | `pom.xml` | https://repo1.maven.org/maven2/com/zaxxer/HikariCP/maven-metadata.xml | R |
| `com.mysql:mysql-connector-j` | 26.10.0 | `pom.xml` | https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/maven-metadata.xml | R |
| `org.slf4j:slf4j-jdk14` | 2.0.20 | `pom.xml` | https://repo1.maven.org/maven2/org/slf4j/slf4j-jdk14/maven-metadata.xml | O |
| `org.junit:junit-bom` (test) | 6.1.3 | `pom.xml` | https://repo1.maven.org/maven2/org/junit/junit-bom/maven-metadata.xml | R |
| `org.redisson:redisson-all`, `redisson-tomcat-11` | 4.8.0 (SHA-256 ghim) | `docker/app/Dockerfile` (vào `$CATALINA_HOME/lib`) | https://repo1.maven.org/maven2/org/redisson/redisson-tomcat-11/maven-metadata.xml | R |

**Frontend** (`frontend/package.json`, nguồn chung `https://registry.npmjs.org/<tên gói>`)

| Gói | Phiên bản | Tra bởi |
|---|---|---|
| `react`, `react-dom` | 19.3.1 (giữ < 19.4: `@react-three/fiber` 9.8.2 khai peer `react >=19 <19.4`) | R |
| `vite` | 8.3.7 | R |
| `@vitejs/plugin-react` | 6.3.0 | L |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.5 | R |
| `shadcn` (CLI) | 4.23.0 | R |
| `typescript` | 6.0.3 (không lên 7.x: `typescript-eslint` 8.72.2 khai peer `typescript >=4.8.4 <6.1.0`) | O |
| `typescript-eslint` | 8.72.2 | O |
| `eslint` | 10.14.0 | O |
| `@eslint/js` | 10.0.1 | L |
| `vitest` | 5.1.0 | R |
| `jsdom` | 31.0.0 | L |
| `class-variance-authority` 0.7.1 · `clsx` 2.1.1 · `tailwind-merge` 3.7.0 · `tw-animate-css` 1.4.0 | như cột trái | L |
| `globals` 17.14.0 · `eslint-plugin-react-hooks` 7.1.1 · `eslint-plugin-react-refresh` 0.5.7 | như cột trái | L |
| `@types/node` 24.19.2 · `@types/react` 19.3.0 · `@types/react-dom` 19.3.0 | như cột trái | L |

**Đã chọn nhưng chưa ghim** (phase sau thêm vào `pom.xml` hoặc `package.json`, tra lại lúc ghim rồi sửa bảng này)

| Thành phần | Phiên bản đã tra | Phase | Nguồn | Tra bởi |
|---|---|---|---|---|
| `org.flywaydb:flyway-core` + `flyway-mysql` | 13.12.1 | 3 | https://repo1.maven.org/maven2/org/flywaydb/flyway-mysql/maven-metadata.xml | R |
| `com.password4j:password4j` | 1.8.4 | 3 | https://repo1.maven.org/maven2/com/password4j/password4j/maven-metadata.xml | R |
| `tools.jackson.core:jackson-databind` | 3.3.0 | 3 | https://repo1.maven.org/maven2/tools/jackson/core/jackson-databind/maven-metadata.xml | brainstorm §5 |
| `org.testcontainers:testcontainers-mysql` | 2.0.5 | 3 | https://repo1.maven.org/maven2/org/testcontainers/testcontainers-mysql/maven-metadata.xml | R |
| `three` | 0.187.0 | 5 | https://registry.npmjs.org/three | R |
| `@react-three/fiber` | 9.8.2 | 5 | https://registry.npmjs.org/@react-three/fiber | R |
| `@react-three/drei` | 10.7.9 | 5 | https://registry.npmjs.org/@react-three/drei | R |
| `motion` | 14.12.0 | 5 | https://registry.npmjs.org/motion | R |
| `@playwright/test` | 1.65.0 | 8 | https://registry.npmjs.org/@playwright/test | R |

## Hệ quả

- `maven-enforcer-plugin` bắt JDK ≥ 25 và Maven [3.9.16, 4); máy chỉ có JDK khác thì chạy qua `node scripts/dev/mvnw.mjs` (đặt JDK 25 cho riêng tiến trình con).
- Flyway chưa ghi MySQL 8.4 trong danh sách đã kiểm, nên migration luôn được chạy thử trên `mysql:8.4.13` bằng Testcontainers ([ADR-0008](0008-flyway-qua-listener.md)).
- Đổi phiên bản là sửa file ghim (file dùng chung, chỉ orchestrator) **và** bảng này trong cùng một commit.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Jakarta EE 10 trên Tomcat 11 | Lệch container: EE 10 là Tomcat 10.1 |
| Tomcat 10.1 + EE 10 | Cũ hơn, không có lí do giữ |
| Java 21 LTS | Hỗ trợ ngắn hơn 25; giữ làm dự phòng |
| Maven 4 | Còn RC |
| JSTL 3.1, EL 6.1 | Mới ở milestone (M2) |
| TypeScript 7.x | Vỡ peer của `typescript-eslint` 8.72.2 |
