# Research Report: Stack versions for JSP + DAO + MySQL (no Servlet controller, no Spring)

Retrieved 2026-11-11. Every version below was read from a live source today. Maven versions come from `repo1.maven.org/.../maven-metadata.xml` (`<release>` / version list), which is authoritative. The search.maven.org Solr index was **stale** (it reported Connector/J 9.3.0 and HikariCP 6.3.0) and was not used. npm versions come from `registry.npmjs.org/<pkg>` (`dist-tags.latest` + `time`).

## Summary

Java 25 LTS on Tomcat 11.0.27 (Servlet 6.1 / Pages 4.0 / EL 6.0, the Jakarta EE 11 web specs; not a full EE or Web Profile server) is the current baseline. JSTL must be the Jakarta-namespace pair `jakarta.servlet.jsp.jstl-api 3.0.2` + `org.glassfish.web:jakarta.servlet.jsp.jstl 3.0.1`. JSTL 3.1 is listed by Eclipse but is only at M2 on Maven Central. A `varchar(50)` password column is too small for BCrypt (60 chars) and for Argon2id (~97+ chars); use `VARCHAR(255)`. Flyway does not list MySQL 8.4 among its verified versions. It most likely works, but you must test it.

## 1. Java runtime / container

| Item | Version | Source URL | Notes |
|---|---|---|---|
| Java 21 LTS | GA 2023-09-19, latest 21.0.13 (2026-10-24) | https://endoflife.date/oracle-jdk | Oracle Premier support to 2028-09-30 |
| **Java 25 LTS** | GA 2025-09-16, latest 25.0.5 (2026-10-24) | https://endoflife.date/oracle-jdk | Latest LTS. Premier support to 2030-09-30. Oracle roadmap page returns 200 to HEAD but 403 to fetch |
| Tomcat 11 | **11.0.27** | https://tomcat.apache.org/whichversion.html · https://repo1.maven.org/maven2/org/apache/tomcat/tomcat-catalina/maven-metadata.xml | Servlet **6.1**, Pages (JSP) **4.0**, EL **6.0**, WebSocket 2.2, Authentication 3.1, Annotation 3.0, min Java **17**. No Tomcat 12 on the supported list |
| Tomcat 11 on Java 25 | supported (Java 17+) | https://tomcat.apache.org/tomcat-11.0-doc/setup.html | Docs say "Java 17 or later" only. There is no explicit Java 25 statement. The 11.0.11 release vote tested JDK 25 RC (mail-archive), so 25 is tested but not formally certified. Pick 25, with 21 as a fallback if a library misbehaves |
| Jakarta EL | provided by Tomcat (EL 6.0) | https://repo1.maven.org/maven2/jakarta/el/jakarta.el-api/maven-metadata.xml | Do **not** bundle EL. If you need it to compile, add `jakarta.el-api 6.0.1` `provided`. 6.1.0 is only at M2 |
| JSTL API | **3.0.2** (stable). 3.1.0-M2 is a milestone | https://repo1.maven.org/maven2/jakarta/servlet/jsp/jstl/jakarta.servlet.jsp.jstl-api/maven-metadata.xml · https://projects.eclipse.org/projects/ee4j.jstl | The Eclipse project page lists 3.1.0 (2026-06-30), but no final 3.1.0 is on Central. Use 3.0.2 |
| JSTL impl | **org.glassfish.web:jakarta.servlet.jsp.jstl 3.0.1** | https://repo1.maven.org/maven2/org/glassfish/web/jakarta.servlet.jsp.jstl/maven-metadata.xml | Bundle it in `WEB-INF/lib` (Tomcat ships no JSTL). Taglib URI: `jakarta.tags.core`. The Apache Standard Taglib is JSTL 1.2 / `javax`, which is retired and incompatible (https://tomcat.apache.org/taglibs.html) |
| Servlet/JSP API (compile) | `jakarta.servlet-api 6.1.x` / `jakarta.servlet.jsp-api 4.0.x`, `provided` | (matches whichversion table) | Exact patch versions were not fetched. Look them up on Central at pin time |

## 2. Build / data / session / security

| Item | Version | Source URL | Notes |
|---|---|---|---|
| Maven | **3.9.16** (stable). 4.0.0-rc-7 is the latest RC | https://repo1.maven.org/maven2/org/apache/maven/maven-core/maven-metadata.xml | Stay on 3.9.x. 4.0 is not GA |
| maven-war-plugin | **3.5.1** (2025-11) | https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-war-plugin/maven-metadata.xml | |
| MySQL Connector/J | **26.10.0** (2026-10-21) | https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/maven-metadata.xml · https://dev.mysql.com/doc/relnotes/connector-j/en/ | **New numbering**: 9.7.0 was followed by 26.7.0 and then 26.10.0 (year.month). The 8.4 server compatibility statement was not found on the release-notes index. Check the Developer Guide. dev.mysql.com returns 403 to curl HEAD, but the content was read via WebFetch |
| HikariCP | **7.1.0** (2026-06) | https://repo1.maven.org/maven2/com/zaxxer/HikariCP/maven-metadata.xml | 7.x is a major bump from 6.x. The Java baseline was not verified |
| Flyway | **13.12.1** (2026-11-05). Artifacts: `org.flywaydb:flyway-core` + **`org.flywaydb:flyway-mysql`** | https://repo1.maven.org/maven2/org/flywaydb/flyway-mysql/maven-metadata.xml · https://documentation.red-gate.com/fd/mysql-277579322.html | The community (`org.flywaydb`) artifact is still published. Redgate lists **"Verified Versions: 5.7, 8.0, 9.4"**, and **8.4 is not listed**. A Redgate community thread reports the same gap (https://productsupport.red-gate.com/hc/en-us/community/posts/38029489360029-Flyway-MySQL-8-4). Since v10 no license is required for older DB versions. **Action: run migrations against MySQL 8.4 in Testcontainers in CI** |
| MySQL 8.4 LTS | **8.4.13** (2026-10-20) | https://dev.mysql.com/doc/relnotes/mysql/8.4/en/ | Returns 403 to curl HEAD, but the content was read via WebFetch. 8.4.13.1 is listed as "not yet released" |
| Redis | **8.10.3** (2026-10-26, marked Latest). 8.12 is at RC2 | https://github.com/redis/redis/releases | 8.8.4 and 8.6.8 were patched the same day |
| Redisson Tomcat session | **redisson-tomcat-11 4.8.0** (2026-10-02) | https://repo1.maven.org/maven2/org/redisson/redisson-tomcat-11/maven-metadata.xml · https://redisson.pro/docs/web-session-management/ · https://github.com/redisson/redisson/tree/master/redisson-tomcat | Docs: "Supports Apache Tomcat versions 7.x up to 11.x". Put `redisson-all-<v>.jar` + `redisson-tomcat-11-<v>.jar` in `TOMCAT_BASE/lib`. In `context.xml` add `<Manager className="org.redisson.tomcat.RedissonSessionManager" readMode="REDIS\|MEMORY" updateMode="DEFAULT\|AFTER_REQUEST" broadcastSessionEvents="false" keyPrefix="..." configPath="..."/>`. The docs page does not say Community vs PRO. The artifact is on Maven Central under the open-source repo, so it is usable without PRO (inference) |
| Session alternatives | Tomcat `DeltaManager`/`BackupManager` (built-in clustering, no Redis), or sticky sessions on Nginx | — | Spring Session is excluded (no Spring) |
| Password4j | **1.8.4** (2025-06) | https://repo1.maven.org/maven2/com/password4j/password4j/maven-metadata.xml · https://github.com/Password4j/password4j/wiki/Argon2 | BCrypt, Argon2, scrypt, PBKDF2 in one library with no native deps. Its example Argon2id string is ~90 chars **with an 8-byte salt**. Its no-arg `addRandomSalt()` uses a 64-byte salt, which gives ~150+ chars |
| spring-security-crypto (standalone) | **7.1.2** (stable). 7.2.0-RC1 is an RC | https://repo1.maven.org/maven2/org/springframework/security/spring-security-crypto/maven-metadata.xml | `BCryptPasswordEncoder` works without the Spring context. `Argon2PasswordEncoder` needs BouncyCastle (`bcprov-jdk18on` 1.86) |
| argon2-jvm | **2.12** (2025-03) | https://repo1.maven.org/maven2/de/mkammerer/argon2-jvm/maven-metadata.xml | JNA + native libargon2, so it needs a native build per platform |
| at.favre.lib:bcrypt | 0.10.2 (2023-02) | https://repo1.maven.org/maven2/at/favre/lib/bcrypt/maven-metadata.xml | Stale since 2023 |
| **Hash length vs `varchar(50)`** | BCrypt = **60** chars fixed (`$2a$10$` + 22 salt + 31 hash). Argon2id OWASP params (m=19456,t=2,p=1, 16-byte salt, 32-byte hash) ≈ **97** chars | derived from the PHC encoded format shown on the Password4j wiki | **`varchar(50)` truncates both.** Use `VARCHAR(255)`. The BCrypt length is from the format definition, not from a fetched page. Confirm with one unit test |

## 3. Frontend & testing

| Item | Version | Source URL | Notes |
|---|---|---|---|
| Vite | **8.3.7** (2026-11-09) | https://registry.npmjs.org/vite | Node `^20.19 \|\| >=22.12` |
| React / react-dom | **19.3.1** (2026-10-14) | https://registry.npmjs.org/react | |
| tailwindcss / @tailwindcss/vite | **4.3.5** (2026-11-06) | https://registry.npmjs.org/@tailwindcss/vite | Plugin peer is `vite ^5.2 \|\| 6 \|\| 7 \|\| 8`. CSS: `@import "tailwindcss";` |
| shadcn CLI | **4.23.0** (2026-10-27) | https://ui.shadcn.com/docs/installation/vite | Plain-Vite steps: `create vite` (React+TS), then add `tailwindcss @tailwindcss/vite`, then add `baseUrl` + `"@/*": ["./src/*"]` to **both** `tsconfig.json` and `tsconfig.app.json`, then `@types/node` + `resolve.alias {"@": path.resolve(__dirname,"./src")}` in vite.config, then `npx shadcn@latest init`, then `npx shadcn@latest add button` |
| @react-three/fiber | **9.8.2** (2026-10-14) | https://registry.npmjs.org/@react-three/fiber | Peer `react >=19 <19.4`, `three >=0.156`. React 19.3.1 is OK. **Pin React <19.4** |
| @react-three/drei | **10.7.9** (2026-09-25) | https://registry.npmjs.org/@react-three/drei | Peer fiber ^9, three >=0.159 |
| three | **0.187.0** (2026-10-30) | https://registry.npmjs.org/three | |
| GSAP | **3.15.1** (2026-11-04). License: "Standard 'no charge' license" | https://gsap.com/standard-license/ · https://gsap.com/pricing/ | **Free incl. commercial use and all plugins** (SplitText, MorphSVG, ScrollTrigger). The only restriction is no use in no-code visual animation builders that compete with Webflow. Not OSI open source |
| Motion | **14.12.0** (2026-11-10), MIT | https://registry.npmjs.org/motion | Peer React 18/19 |
| Vitest | **5.1.0** (2026-11-02) | https://registry.npmjs.org/vitest | Peer `vite ^6.4 \|\| ^7 \|\| ^8` |
| Playwright | **1.65.0** (2026-11-05) | https://registry.npmjs.org/@playwright/test | |
| Testcontainers MySQL (Java) | **org.testcontainers:testcontainers-mysql 2.0.5** | https://java.testcontainers.org/modules/databases/mysql/ | 2.x renamed the artifact. The old `org.testcontainers:mysql` stops at 1.21.4. Add Connector/J separately. Use the image `mysql:8.4.13` |
| JUnit | **6.1.3** (2026-08). Last 5.x is 5.14.4 | https://docs.junit.org/current/user-guide/ · https://repo1.maven.org/maven2/org/junit/junit-bom/maven-metadata.xml | JUnit 6 requires Java 17+, which is fine with 21/25. Use the `junit-bom` 6.1.3 |

## 4. Google Fonts with a `vietnamese` subset

Source: https://fonts.google.com/metadata/fonts (the `subsets` array, read programmatically 2026-11-11).

| Role | Font | vietnamese? | Notes |
|---|---|---|---|
| Typewriter | Special Elite | **NO** (latin, latin-ext) | Vietnamese diacritics will fall back to another font. Avoid it for VN text |
| Typewriter | Courier Prime, Cutive Mono | **NO** | |
| Typewriter/mono | **Space Mono**, IBM Plex Mono, JetBrains Mono, Roboto Mono, Source Code Pro, VT323, Xanh Mono | YES | Space Mono and IBM Plex Mono feel closest to a typewriter. Xanh Mono is a Vietnamese-designed mono |
| Ball-pen handwriting | **Patrick Hand**, Itim, Pangolin, Mali, Sriracha, Playpen Sans, Charm, Dancing Script | YES | Patrick Hand looks most like a ball pen. Pangolin is rounder |
| Handwriting | Caveat, Kalam, Shadows Into Light, Gochi Hand, Nanum Pen Script | **NO** | |
| Display serif | **Playfair Display**, Fraunces, Noto Serif Display, Cormorant Garamond, Lora, Merriweather | YES | DM Serif Display is **NO** |
| Body sans | **Be Vietnam Pro**, Inter, Noto Sans | YES | |

## 5. Patterns

| Item | Finding | Source URL |
|---|---|---|
| React islands from JSP via the Vite manifest | Set `build.manifest: true`, which writes **`<outDir>/.vite/manifest.json`**. Set the entry via `build.rollupOptions.input` (one entry per island, e.g. `src/islands/cart.tsx`). Set `server.cors.origin` to the Tomcat origin. Import `vite/modulepreload-polyfill` in each entry. **Dev**: the JSP emits `<script type="module" src="http://localhost:5173/@vite/client">`, then the React-refresh preamble inline module (imports `/@react-refresh`, `injectIntoGlobalHook(window)`, `$RefreshReg$`/`$RefreshSig$`, `__vite_plugin_react_preamble_installed__=true`), then the entry. **Prod**: a JSP tag/helper reads the manifest once (cache it in `ServletContext`). For an entry key it emits a `<link rel=stylesheet>` for each `css`, then recursively the CSS of each chunk in `imports`, then `<script type=module src=file>`, then optional `<link rel=modulepreload>` for each imported chunk. Mount point: `<div data-island="cart" data-props='${fn:escapeXml(json)}'>`, hydrated by `createRoot` in the entry. Vite ships no server-side helper, so you write the recursive walker (~40 lines of Java) | https://vite.dev/guide/backend-integration |
| Nginx brotli | **Not in the default official image.** It is buildable from the official repo: `docker build --build-arg ENABLED_MODULES="brotli" -f Dockerfile[.alpine]` using `nginx/docker-nginx/modules` (pkg-oss lists `brotli 1.0.0-1`, BuildKit required). Then add `load_module modules/ngx_http_brotli_filter_module.so;` (+ `_static_`). Current tags: mainline **1.31.8**, stable **1.30.6** | https://github.com/nginx/docker-nginx/tree/master/modules · https://hub.docker.com/_/nginx |

## Options & recommendation

| Decision | 1st choice | 2nd choice | Why / risk |
|---|---|---|---|
| JDK | Java 25 LTS | Java 21 LTS | 25 has support to 2030 and Tomcat 11 is tested on it. Risk: a native lib (argon2-jvm) lags. Fall back to 21 if so |
| Password hashing | Password4j Argon2id (pure Java) | spring-security-crypto `BCryptPasswordEncoder` | Password4j has no native deps and covers both algorithms. spring-security-crypto is heavier-maintained but pulls the Spring artifact. Either way **migrate the column to VARCHAR(255)** |
| Migrations | Flyway 13 + flyway-mysql | Liquibase (not evaluated) | Flyway risk: 8.4 is not on the verified list. Mitigate with a CI Testcontainers run |
| Session store | Redisson redisson-tomcat-11 4.8.0 | Nginx sticky sessions + Tomcat in-memory | Redisson works without code changes (context.xml only). Risk: the Community/PRO boundary of its docs was not explicit |
| Animation | GSAP 3.15 | Motion 14 (MIT) | GSAP is free for commercial use. Pick Motion if you need an OSI license |
| Typewriter font for VN | Space Mono / Xanh Mono | IBM Plex Mono | Special Elite lacks Vietnamese |

## Limitations / unverifiable

- curl HEAD returned 403 (bot protection) for `dev.mysql.com/...` (both pages) and `npmjs.com/package/*`. The dev.mysql.com content was read successfully via WebFetch. For npm, the `registry.npmjs.org` URLs (200) are cited instead.
- Oracle's support roadmap returns 200 on HEAD but 403 on content fetch. The Java dates come from endoflife.date only (a single source).
- The context7 `get-library-docs` tool was not available in this session (only `resolve-library-id` was loaded, and it resolved `/websites/tomcat_apache_tomcat-11_0-doc`). The facts come from official sites instead.
- Not verified: Connector/J 26.x server-compat matrix, HikariCP 7 / Flyway 13 minimum Java, whether Redisson's Tomcat manager is Community or PRO, exact `jakarta.servlet-api` / `jsp-api` patch versions, and Argon2/BCrypt lengths beyond the format arithmetic.
- The Redis release dates on GitHub showed no year. 2026 was inferred from release ordering.
