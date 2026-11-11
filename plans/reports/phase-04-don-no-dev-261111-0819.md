# Phase 4b, lane D `dev-mode`: CSP của nginx theo `APP_VITE_DEV` (báo cáo tạm)

- Worktree `D:/Coding/mangastore-wt/04-don-no-dev`, nhánh `lane/04-don-no/dev-mode`, commit `6ab6ee48189821de09be0efff14a6fb89552417f` (chỉ tại máy, chưa push).
- Trạng thái: **BLOCKED (chờ compose)**. Orchestrator nhắn không chạy `docker compose` khi phiên phase 5 còn dùng stack `tiemtruyen`. Mọi phần không cần compose đã làm và kiểm; còn ba bước (b), (c), (d) ở mục 4.

## 1. Thay đổi

| File | Việc |
|---|---|
| `docker/nginx/docker-entrypoint.d/30-tiem-csp.sh` (mới) | Chạy mỗi lần container nginx khởi động (entrypoint gốc của ảnh nginx chạy mọi `*.sh` thực thi được trong `/docker-entrypoint.d/`). Ghi một dòng `add_header Content-Security-Policy "…" always;` vào `/etc/nginx/snippets/csp.conf`. `APP_VITE_DEV` không đặt hoặc `false` → `CSP_BUILD`, đúng từng kí tự CSP phase 1 của `contract.md` §10. `true` → CSP dev dựng từ `APP_VITE_DEV_ORIGIN`. Giá trị khác của `APP_VITE_DEV`, hoặc origin sai dạng (không `http(s)://`, có path, host có kí tự lạ, cổng không phải số hoặc dài hơn 5 chữ số, có xuống dòng hay dấu nháy), thì script in lỗi và exit 1, container không chạy nginx. Không có đường lùi ngầm |
| `docker/nginx/snippets/security-headers.conf` | Dòng CSP cứng được thay bằng `include /etc/nginx/snippets/csp.conf;` ở đúng vị trí cũ. Ba header còn lại giữ nguyên. Mọi location đang include file này vẫn có CSP |
| `docker/nginx/Dockerfile` | `COPY --chmod=0755` script vào `/docker-entrypoint.d/`. Cần `--chmod` vì checkout trên Windows không giữ bit thực thi, mà entrypoint gốc bỏ qua script không thực thi được |
| `compose.yaml`, chỉ khối `nginx` | Thêm `APP_VITE_DEV: ${APP_VITE_DEV:-false}` và `APP_VITE_DEV_ORIGIN: ${APP_VITE_DEV_ORIGIN:-http://localhost:5173}`, cùng mặc định với `app`. Một công tắc duy nhất bật cả hai service |
| `src/main/java/vn/tiemtruyen/util/AssetTags.java` | `renderDev` không in script inline nữa. Preamble React Refresh nạp bằng `<script type="module" src="${origin}/static/@id/__x00__@vitejs/plugin-react/preamble">` (hằng `DEV_PREAMBLE_PATH`) |
| `src/test/java/vn/tiemtruyen/util/ViteManifestTest.java` | `devTagsLoadPreambleClientThenEntries` kiểm thứ tự preamble → `@vite/client` → CSS → loader, và kiểm đầu ra dev đúng 4 dòng, dòng nào cũng có `src=`/`href=` (không có script inline) |
| `scripts/check/csp-page-check.mjs` (mới) | Kiểm một trang thật. Đọc HTML và header CSP của phản hồi, rồi kiểm mọi script, stylesheet, modulepreload, icon, img, `<style>`, script inline, thuộc tính `style=`/`on*=` theo directive tương ứng (có chuỗi lùi CSP3). Với `@vite/client`, suy ra WebSocket HMR `ws(s)://host:cổng/` và kiểm `connect-src`. Sau đó tải từng tài nguyên http(s): phải 2xx; module script khác origin phải có `Access-Control-Allow-Origin` khớp origin trang. `--mode build`: CSP phải đúng từng kí tự dòng "CSP phase 1" đọc từ `contract.md` và trang không nạp gì từ origin khác. `--mode dev`: trang phải có `@vite/client`, để bước này không xanh khi app thật ra chưa bật dev. In `[csp] PASS/FAIL …`; exit 0, 1, hoặc 2 khi không tải được trang |
| `scripts/check/csp-page-check.test.mjs` (mới) | 11 test, mô tả ở mục 3 |

**`.env.example` không đổi:** không có biến mới. Nginx dùng lại `APP_VITE_DEV` và `APP_VITE_DEV_ORIGIN` đã có trong bảng `contract.md` §4.

## 2. Vì sao CSP dev có những nguồn này, và chỉ những nguồn này

Mọi nguồn dưới đây chỉ có ở CSP dev. Ví dụ dưới dùng O = `http://localhost:5173`.

- `script-src 'self' O`: preamble, `@vite/client`, các entry và mọi module con đều tải từ O.
- **Không có `'unsafe-inline'` ở `script-src`.** `@vitejs/plugin-react` 6.3.0 có module ảo `@vitejs/plugin-react/preamble` (khai trong `exports` của gói; plugin `vite:react-virtual-preamble` trong `dist/index.js`). Vite dev phục vụ nó theo quy ước module ảo `/@id/__x00__<id>`. Tôi chạy thử: `curl http://localhost:5173/static/@id/__x00__@vitejs/plugin-react/preamble` trả 200, `Access-Control-Allow-Origin: http://localhost:8080`, nội dung là `import { injectIntoGlobalHook } from "/static/@react-refresh"; injectIntoGlobalHook(window); window.$RefreshReg$ = …; window.$RefreshSig$ = …`. Wrapper refresh trong binding rolldown chỉ kiểm `if (!window.$RefreshReg$) throw … can't detect preamble`; tôi đọc chuỗi này trong `@rolldown/binding-win32-x64-msvc`. Cờ `__vite_plugin_react_preamble_installed__` của đoạn inline cũ không còn được kiểm. Các thẻ module chạy theo thứ tự xuất hiện và preamble đứng đầu, nên nó chạy trước mọi module React, kể cả chunk `island-runtime` mà loader của phase 5 tải lười. Chưa kiểm trên trình duyệt; đó là việc của bước (c).
- `style-src 'self' O 'unsafe-inline'`: O cho `<link>` CSS. `'unsafe-inline'` cần vì Vite dev chèn CSS mà module import (Tailwind trong island, lớp báo lỗi của Vite) bằng thẻ `<style>` tạo từ JS. Không có cách tránh nằm trong phạm vi lane: Vite client có đọc nonce từ `meta[property=csp-nonce]` (`client.mjs` dòng 697, 1284), nhưng muốn dùng nonce thì nginx phải sinh nonce cho từng request, chuyển nó cho JSP và AssetTags in ra, đồng thời phải sửa `vite.config.ts` (`html.cspNonce`). Phần đó thuộc phase 5 và quá nặng cho chế độ chỉ dùng ở dev.
- `img-src 'self' data: O`, `font-src 'self' O`: `url()` trong CSS dev trỏ về `server.origin` của Vite.
- `connect-src 'self' O ws://localhost:5173`: WebSocket HMR của `@vite/client` mở tới đúng host:cổng của URL nó được nạp (`client.mjs` dòng 937–947). Theo CSP3, source `http://` không khớp scheme `ws`, nên phải ghi `ws://` riêng. O có `https` thì dùng `wss://`.
- `worker-src 'self' blob:`: khi mất kết nối HMR (Vite tắt hay khởi động lại), client tạo `SharedWorker` từ một URL `blob:` để dò server (`client.mjs` dòng 1144–1151). Không có nguồn này thì trình duyệt chặn worker và trang không tự tải lại khi Vite chạy lại.
- `object-src`, `base-uri`, `form-action`, `frame-ancestors`, `default-src` giữ nguyên như CSP phase 1; test có kiểm.

## 3. Đã kiểm (không cần compose)

| Kiểm | Kết quả |
|---|---|
| `node scripts/dev/mvnw.mjs -B verify` | BUILD SUCCESS, 246 test, 0 lỗi (`ViteManifestTest` 14/14), Checkstyle sạch |
| `node --test "scripts/check/*.test.mjs"` | 67/67 pass (11 test mới) |
| Làm đỏ có chủ đích | Sửa `CSP_BUILD` thành `script-src 'self' 'unsafe-inline'`: 2 test đỏ (so với hợp đồng, CSP mặc định). Sửa lại thì 11/11. Test "preamble inline cũ bị CSP dev chặn" cố ý đưa đoạn inline cũ vào và chờ đúng một FAIL `CSP cho phép <script> inline`. Test "CSP phase 1 chặn mọi tài nguyên Vite" tái hiện lỗi gốc của lane: 5 tài nguyên bị chặn |
| Script chạy trên sh thật (Git sh trên Windows) | Không đặt biến hoặc `false` cho ra CSP phase 1 nguyên văn. `true` (origin có `/` cuối) cho ra CSP dev đúng. 7 giá trị sai (`TRUE`, thiếu origin, thiếu scheme, có path, có `"`, có xuống dòng, cổng 6 chữ số) đều exit 1 và có thông báo |
| Ảnh `tiemtruyen-nginx-laned` (`docker build`, không qua compose), `docker run --rm … nginx -t` | Mặc định, `false` và `true`: `syntax is ok` / `test is successful`. Nội dung `csp.conf` đúng như trên. `APP_VITE_DEV=yes` → `30-tiem-csp.sh: APP_VITE_DEV chỉ nhận true hoặc false, đang là "yes"`, exit 1. Origin `http://x:1/p` → exit 1 |
| Container lẻ của ảnh laned ở cổng 18081 (build) và 18082 (dev), `curl -sI /nginx-health` và `/covers/1/cover-160.webp` | 18081: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`, đúng từng kí tự §10. 18082: có CSP dev. Location `/covers/` (có `add_header` riêng) vẫn có CSP. Đã dừng cả hai container |
| `docker compose config` (chỉ đọc, chỉ in env của nginx) | Mặc định nginx nhận `APP_VITE_DEV=false`, `APP_VITE_DEV_ORIGIN=http://localhost:5173`. `APP_VITE_DEV=true docker compose config` cho `true` ở cả nginx và app, tức biến môi trường của lệnh đè được `.env` |
| `npm --prefix frontend ci`, `npm --prefix frontend run dev` | Vite 8.3.7 chạy ở `http://localhost:5173/static/`. Module preamble được phục vụ như mục 2. Đã tắt Vite (PID 37416) trước khi trả báo cáo |

## 4. Còn lại (chạy khi orchestrator nhắn "compose rảnh")

Chạy từ worktree `D:/Coding/mangastore-wt/04-don-no-dev`, trừ (d).

- **(b) Chế độ build không đổi:** `docker compose up --build -d --wait`, rồi `curl -sI http://127.0.0.1:8080/HomeView.jsp`, so header CSP với §10. Sau đó `node scripts/check/csp-page-check.mjs --mode build --url http://127.0.0.1:8080/HomeView.jsp`, chờ toàn PASS.
- **(c) Chế độ dev chạy được:**
  1. Chạy nền `npm --prefix frontend run dev`.
  2. `APP_VITE_DEV=true docker compose up --build -d --wait`. Chỉ đặt biến cho lệnh này, không sửa `.env`.
  3. `node scripts/check/csp-page-check.mjs --mode dev --url http://localhost:8080/HomeView.jsp`.

  Dùng `localhost` vì nhánh này chưa có bản sửa CORS cho `127.0.0.1` (bản đó ở `phase/05`, d82554a). Kiểm thêm trên trình duyệt (orchestrator hoặc tester có Playwright MCP): console không có vi phạm CSP, không có `can't detect preamble`, và WebSocket HMR mở được.
- **(d) Trả stack về main:** tắt Vite, rồi từ `D:/Coding/Analysis_And_Design_Mangastore` chạy `APP_VITE_DEV=false docker compose up --build -d --wait` và `curl -fsS http://127.0.0.1:8080/health.jsp` (200, `ok`). Lưu ý: cho tới khi lane này được merge, ảnh nginx dựng từ main vẫn dùng CSP cứng cũ. Đó là điều đúng khi stack chạy main.

## 5. Đề xuất thay câu trong `contract.md` §10 (orchestrator sửa)

Thay dòng "**CSP phase 1:** … Trang dev Vite (`APP_VITE_DEV=true`) không đi qua nginx nên không vướng CSP này." bằng:

> - **CSP phase 1:** `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Nginx sinh header này lúc khởi động bằng `docker/nginx/docker-entrypoint.d/30-tiem-csp.sh` (`snippets/csp.conf`, được `security-headers.conf` include), theo `APP_VITE_DEV` mà compose truyền cho cả `app` và `nginx`; `false` (mặc định) là đúng chuỗi trên. Trang dev Vite (`APP_VITE_DEV=true`) cũng đi qua nginx: CSP thêm đúng origin `APP_VITE_DEV_ORIGIN` vào `script-src`, `style-src` (kèm `'unsafe-inline'` cho thẻ `<style>` Vite chèn), `img-src`, `font-src`, `connect-src` (kèm `ws://`/`wss://` cùng host:cổng cho HMR), và thêm `worker-src 'self' blob:`. Script inline vẫn bị chặn vì `<t:assets/>` nạp preamble React Refresh dạng module ngoài (`/static/@id/__x00__@vitejs/plugin-react/preamble`). Kiểm: `node scripts/check/csp-page-check.mjs --mode build|dev`.

Thêm đề xuất (orchestrator quyết):

1. Trong `AGENTS.md` §3, dòng Vite dev server: ghi rõ phải bật bằng `APP_VITE_DEV=true docker compose up --build -d --wait` (không sửa `.env`), mở `http://localhost:8080`, và kiểm bằng `node scripts/check/csp-page-check.mjs --mode dev`.
2. Accept phase 4 (hoặc phase sau) có thể gọi `csp-page-check.mjs --mode build` thay cho kiểm `frame-ancestors` riêng lẻ ở `scripts/accept/phase-01.mjs`. Kiểm này so cả chuỗi CSP với hợp đồng.
3. Skill `tiem-add-jsp-page` (Gotchas, dòng CSP): thêm một câu cảnh báo. CSP dev có `'unsafe-inline'` ở `style-src`, nên `style=` hay `<style>` trong JSP vẫn chạy ở dev nhưng bị chặn ở build. Vì vậy trang nào cũng phải qua `csp-page-check.mjs --mode build` trước khi tính là xong.

**Status:** BLOCKED (chờ compose)
