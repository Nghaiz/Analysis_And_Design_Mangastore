# Phase 8: hợp đồng tích hợp giữa các lane

Owner: orchestrator (chốt 11/11/2026, bước 8.0). Bổ sung cho `phase-08-e2e-ci-hoan-thien.md` và `docs/contracts.md` (thắng về nghiệp vụ). Lane thấy thiếu hay mâu thuẫn: dừng, ghi vào báo cáo, không tự đặt.

Chủ dự án yêu cầu 11/11/2026: phiên phase 8 xong trong khoảng 1 giờ, **không giới hạn 3 agent** (đè luật 3 chỗ cho riêng phiên này). Lane 8A tách thành 4 lane theo file test; 8E chạy ngay từ đầu, cập nhật lại sau khi 8A, 8B merge.

## 1. File orchestrator đã tạo (dùng chung, lane không sửa)

| File | Nội dung |
|---|---|
| `e2e/package.json`, `e2e/package-lock.json` | `@playwright/test` 1.65.0, `@axe-core/playwright` 4.14.0, `lighthouse` 13.6.0, `chrome-launcher` 1.2.3 |
| `e2e/playwright.config.ts` | project `mobile` 390×844 và `desktop` 1440×900, `workers: 1`, `baseURL` = `SMOKE_BASE_URL` (mặc định `http://127.0.0.1:8080`), `vi-VN`, `Asia/Ho_Chi_Minh` |
| `e2e/fixtures/test.ts` | `test` có fixture tự động `guard` (console error/warning, pageerror, requestfailed, response ≥ 400 → đỏ; `guard.allow(/regex/)` cho ngoại lệ có chủ đích); `loginClient`, `loginStaff`, `stubPrint`; xuất lại seed ch.2 từ `scripts/smoke/lib/e2e-db.mjs` (`resetChapter2`, `seedChapter22Bills`, `billState`, `sql`, ngày tương đối) |
| `scripts/accept/phase-08.mjs` | Accept tiêu chí 1–6 |

Mọi file test `import { test, expect, … } from '../fixtures/test'`. Helper riêng của lane: `e2e/fixtures/<tiền tố lane>-*.ts` (bảng §2). Cần thêm hàm vào `e2e/fixtures/test.ts` hay `scripts/smoke/lib/e2e-db.mjs`: ghi đề xuất vào báo cáo, tạm để trong file helper riêng.

**Mỗi file test tự dựng trạng thái DB của nó trong `beforeEach`** (gọi `resetChapter2()` rồi seed thêm): Accept chạy mọi file nối tiếp trên một DB, không file nào được dựa vào trạng thái file khác để lại.

## 2. Lane, Owns, stack riêng

Mọi lane chạy từ worktree `D:/Coding/mangastore-wt/08-<lane>` (có sẵn `.env`), nhánh `lane/08-e2e-ci/<lane>`. Ảnh app đã build sẵn tag `p8`: **không** `--build` (lane không sửa code app). Lệnh dựng stack (từ gốc worktree):

`NGINX_HTTP_PORT=<cổng> DB_HOST_PORT=<cổng db> APP_IMAGE_TAG=p8 docker compose -p <project> -f compose.yaml -f compose.e2e.yaml up -d --wait`

Chạy test: `cd e2e && npm ci && SMOKE_BASE_URL=http://127.0.0.1:<cổng> SMOKE_COMPOSE_PROJECT=<project> npx playwright test tests/<file>`. Xong lane thì `down` (không `-v`).

| Lane | Owns | Tiền tố helper | Cổng / DB / project |
|---|---|---|---|
| 8A1 `e2e-dang-ki` | `e2e/tests/01-dang-ki.spec.ts` | `dang-ki-` | 8081 / 3381 / `tiemtruyen-e2e81` |
| 8A2 `e2e-chon` | `e2e/tests/02-tim-chon-truyen.spec.ts` | `chon-` | 8082 / 3382 / `tiemtruyen-e2e82` |
| 8A3 `e2e-quay` | `e2e/tests/03-nhan-truyen-tai-quay.spec.ts` | `quay-` | 8083 / 3383 / `tiemtruyen-e2e83` |
| 8A4 `e2e-bao-mat` | `e2e/tests/bao-mat.spec.ts` | `bao-mat-` | 8084 / 3384 / `tiemtruyen-e2e84` |
| 8B `ci` | `.github/workflows/**` | | không cần stack (actionlint, Trivy bằng ảnh Docker) |
| 8C `lighthouse-do` | `e2e/lighthouse/**` | | 8085 / 3385 / `tiemtruyen-e2e85` |
| 8E `tai-lieu` | `README.md`, `docs/architecture.md`, `docs/pdr.md` | | không |

Docker VM 12,5 GB / 8 CPU; 5 stack cùng lúc là trần. Docker treo (`docker info` không trả lời): dừng, ghi BLOCKED, không tự khởi động lại Docker.

Playwright MCP là một trình duyệt cho cả phiên: không lane nào dùng nó trong phase 8 (bộ Playwright trong repo chạy trình duyệt riêng và đã đọc console, network). Orchestrator đi lại một lượt bằng MCP nếu còn thời gian.

## 3. Giao diện Accept đọc

**Lighthouse (8C).** `node e2e/lighthouse/run-lighthouse.mjs [--base-url <url>] [--json] [--runs <n>]`; `--base-url` mặc định `SMOKE_BASE_URL` rồi `http://127.0.0.1:8080`, `--runs` mặc định 3 (trung vị). Exit 0 khi mọi trang ≥ 90 cả bốn hạng mục, 1 khi có trang dưới 90 (in trang và hạng mục), 2 khi thiếu công cụ hoặc stack không chạy. `--json` in **một** object JSON duy nhất ra stdout (log khác ra stderr):

```json
{ "baseUrl": "http://127.0.0.1:8080", "runs": 3,
  "pages": [{ "path": "/HomeView.jsp", "role": "guest", "scores": { "performance": 97, "accessibility": 100, "best-practices": 100, "seo": 100 } }],
  "failing": [{ "path": "/SearchBookView.jsp", "category": "performance", "score": 84 }] }
```

Điểm là số nguyên 0–100. `role` ∈ `guest` | `client` | `staff` | `manager`. Trang cần đăng nhập: đăng nhập bằng Playwright (`khach01`, `hant`, `quanli`, `docs/dev-accounts.md`) rồi truyền cookie cho Lighthouse. Không đo `doXxx.jsp`, `/dev/*`, `health.jsp`. Trang cần trạng thái session (chi tiết phiếu, xử lí phiếu…) thì dựng trạng thái bằng thao tác trước đó trong cùng phiên.

**CI (8B).** `.github/workflows/ci.yml` có khối `env:` cấp workflow ghim `ACTIONLINT_VERSION: "x.y.z"` và `TRIVY_VERSION: "x.y.z"` (mỗi biến một dòng); ảnh Docker `rhysd/actionlint:${ACTIONLINT_VERSION}`, `aquasec/trivy:${TRIVY_VERSION}`. Accept chạy đúng hai ảnh đó tại máy. Job E2E chạy `scripts/accept/phase-08.mjs --only 2,3,4,5` hoặc đúng các lệnh tương đương (lane chọn, ghi lí do).
