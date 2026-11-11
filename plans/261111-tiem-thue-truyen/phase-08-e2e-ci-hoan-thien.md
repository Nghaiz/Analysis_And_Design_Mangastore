# Phase 8: E2E, CI và hoàn thiện

Lane: serial
Depends-on: 7
Effort: L
Owns: `e2e/**`, `.github/workflows/**`, `README.md`, `docs/architecture.md`, `docs/pdr.md`
Creates: `scripts/accept/phase-08.mjs`, `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/tests/01-dang-ki.spec.ts`, `e2e/tests/02-tim-chon-truyen.spec.ts`, `e2e/tests/03-nhan-truyen-tai-quay.spec.ts`, `e2e/tests/bao-mat.spec.ts`, `e2e/lighthouse/run-lighthouse.mjs`, `.github/workflows/ci.yml`
AX: AX-04 và AX-05 cho `scripts/accept/phase-08.mjs` và `e2e/lighthouse/run-lighthouse.mjs` (exit 1 kèm trang và hạng mục dưới 90); AX-01 `run-lighthouse.mjs --json` in kết quả máy đọc; AX-07 không hỏi tương tác; AX-20 `README.md` và `AGENTS.md` có lệnh chạy E2E và CI tại máy
Accept: `node scripts/accept/phase-08.mjs`

## Mục tiêu

Bộ Playwright trong repo đi hết 3 kịch bản chuẩn của ch.2 và mọi ngoại lệ trên seed E2E, khổ điện thoại và máy tính; GitHub Actions đủ job (lint Java và frontend, build, unit, integration Testcontainers, E2E trên compose, build image, quét lỗ hổng image) có `timeout-minutes` và `concurrency` cho PR; Lighthouse mobile ≥ 90 cả bốn hạng mục trên mọi trang có giao diện; tài liệu cuối. Không có cấu hình prod hay VPS: dự án chỉ chạy localhost (Deferred #28).

Nguồn: tiêu chí nghiệm thu brainstorm §10, brief §7, ch.2 (trang in 5–19), `docs/contracts.md`, `.claude/skills/tiem-write-e2e-chapter2/SKILL.md`, `.claude/skills/t1k-web-testing-core/references/e2e-testing-playwright.md`, luật CI của máy (timeout theo loại job, không `paths:` trên check bắt buộc, `concurrency.cancel-in-progress`).

## Các bước

- [x] **8.0 Orchestrator, tuần tự (file dùng chung):** `e2e/package.json` (Playwright 1.65.0, `@axe-core/playwright`, Lighthouse; phiên bản tra npm lúc ghim) và lockfile; cài trình duyệt Playwright; chỉnh `compose.e2e.yaml` nếu cần cho CI; `scripts/accept/phase-08.mjs`. Commit trước khi spawn. Hợp đồng lane: `phase-08-integration.md`.
- [ ] **8.1 Lane 8A `e2e`**, **8.2 Lane 8B `ci`**, **8.3 Lane 8C `lighthouse-do`** song song (3 chỗ).
- [ ] **8.4 Orchestrator:** đọc báo cáo Lighthouse của 8C; lập danh sách file cần sửa (thường là tag và CSS của phase 5, trang của phase 6, 7) và ghi vào `agent-map.md`; mở **8.5 Lane 8D `sua-lighthouse`** với đúng danh sách đó. Lặp 8C → 8D tối đa 3 vòng; vòng thứ 3 vẫn dưới 90 thì dừng và hỏi chủ dự án.
- [ ] **8.6 Lane 8E `tai-lieu`** xếp hàng, mở khi có chỗ.
- [ ] **8.7 Orchestrator:** chạy Accept; chạy `tiem-contract-guard` trên toàn bộ diff từ commit gốc; đánh dấu; push nhánh phase và mở PR vào `main` (`contract.md` §9).
- [ ] **8.8 Orchestrator:** PR của phase 8 chạy workflow vừa thêm trên GitHub; chờ check xong bằng lệnh chạy nền `gh pr checks <số PR> --watch`; đỏ thì brief lại lane sở hữu; chỉ merge bằng merge commit khi Accept PASS và mọi check xanh (Deferred #25).

## Lane trong phase

Tối đa 3 agent cùng lúc: 8A, 8B, 8C → 8D vào sau 8C → 8E vào chỗ trống.

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 8A `e2e` | `e2e/playwright.config.ts` (hai project: điện thoại 390×844 và máy tính 1440×900, `workers: 1`, base URL compose e2e); `e2e/fixtures/**` (đặt lại DB bằng SQL qua `docker compose exec db mysql` trước mỗi kịch bản; trạng thái riêng cho từng kịch bản: khách `minhanh` và phiếu PM0110, PM0117 cho mục 2.2, `AUTO_INCREMENT` 125 theo Deferred #15, quyển bị giữ để gán đúng DT001-03 và DT020-02; ngày tương đối theo lúc chạy; fixture làm test thất bại khi có console error/warning hoặc request hỏng); `e2e/tests/01-dang-ki.spec.ts`, `02-tim-chon-truyen.spec.ts`, `03-nhan-truyen-tai-quay.spec.ts` (mỗi file đi kịch bản chuẩn và từng ngoại lệ của mục tương ứng, so thông báo từng chữ, so mã, giá, tổng); `bao-mat.spec.ts` (POST thiếu CSRF 403, trang khách và nhân viên chặn chéo, giảm chuyển động, axe AA trên mọi trang) | `t1k-web-core-developer` (có context7 `query-docs` để tra Playwright 1.65) | `e2e/playwright.config.ts`, `e2e/fixtures/**`, `e2e/tests/**` | 8.0 |
| 8B `ci` | `.github/workflows/ci.yml`: job lint (Checkstyle và ESLint, `timeout-minutes: 5`), build và unit (10), integration Testcontainers (20), E2E trên compose (45), build image (30), quét image bằng Trivy (10, lỗi khi có lỗ hổng HIGH/CRITICAL đã có bản sửa), kiểm `section10-sync.mjs` và `node --test scripts/check/`; `on: pull_request` có `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }`; `on: push: branches: [main]` chạy đủ, không `paths:`; phiên bản action, Trivy, actionlint tra trang chính thức hoặc context7 | `t1k-web-core-developer` | `.github/workflows/**` | 8.0 |
| 8C `lighthouse-do` | `e2e/lighthouse/run-lighthouse.mjs`: đăng nhập bằng Playwright để lấy cookie, chạy Lighthouse cấu hình mobile trên mọi trang có giao diện (không tính `doXxx.jsp` và `/dev/*`), mỗi trang 3 lần lấy trung vị, in bảng 4 hạng mục và `--json`; ghi `plans/reports/phase-08-lighthouse-<ts>.md` kèm danh sách nguyên nhân và file liên quan | `t1k-web-testing-tester` | `e2e/lighthouse/**` | 8.0 |
| 8D `sua-lighthouse` | Sửa đúng các file orchestrator ghi trong `agent-map.md` sau bước 8.4 (không file nào khác) | `t1k-web-ui-developer` (CSS, tag) hoặc `t1k-web-core-developer` (JS, trang) tuỳ danh sách | danh sách file do orchestrator ghi | 8.4 |
| 8E `tai-lieu` | `README.md` (giới thiệu, lệnh chạy tại máy, test, E2E, pipeline; ghi rõ dự án chỉ chạy localhost), cập nhật `docs/architecture.md` và `docs/pdr.md` theo những gì đã làm; mục "để sau" (trả truyện, phí phạt, thống kê) | `t1k-docs-manager` | `README.md`, `docs/architecture.md`, `docs/pdr.md` | 8A, 8B đã merge |

Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent.

## Tiêu chí hoàn thành

1. `npx playwright test` trong `e2e/` xanh cả hai project trên compose e2e: 3 kịch bản chuẩn và mọi ngoại lệ ch.2, bảo mật, axe AA; không console error/warning, không request hỏng.
2. Lighthouse mobile ≥ 90 cả bốn hạng mục (Performance, Accessibility, Best Practices, SEO) trên mọi trang có giao diện.
3. `actionlint` (chạy bằng ảnh Docker, phiên bản tra lúc ghim) không báo lỗi trên `.github/workflows/`; mỗi job có `timeout-minutes`; workflow PR có `concurrency` với `cancel-in-progress: true`; không job bắt buộc nào có `paths:`.
4. Chạy tại máy đúng các lệnh của từng job (Deferred #25): lint, build, unit, integration, E2E, build image, Trivy không còn lỗ hổng HIGH/CRITICAL có bản sửa.
5. Accept phase 1–7 chạy lại xanh (bảo đảm không thoái lui), `section10-sync.mjs` xanh, `tiem-contract-guard` không còn vi phạm mở.
6. `git status` sạch; `git ls-files data` rỗng.
7. CI xanh trên PR của phase 8 (ghi đường dẫn lần chạy vào file này); đây là điều kiện merge ở bước 8.8, không phải bước của script Accept.

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-08.mjs` chạy tiêu chí 1–6. Bước làm đỏ có chủ đích: đổi một chữ trong một thông báo ở test E2E thì bộ Playwright phải đỏ.

## Playwright MCP

Áp dụng: trước khi chạy bộ Playwright trong repo, lane 8A dùng Playwright MCP đi lại một lượt mỗi kịch bản trên compose e2e để kiểm fixture; bộ trong repo vẫn là cổng.

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Lighthouse < 90 trên vài trang | medium | high | Đo trước ở phase 5, vòng 8C → 8D tối đa 3 lần rồi hỏi chủ dự án |
| E2E chập chờn vì thứ tự và dữ liệu | medium | medium | `workers: 1`, đặt lại DB trước mỗi kịch bản, ngày tương đối |
| Ảnh có lỗ hổng không có bản sửa | medium | low | Chỉ chặn lỗi đã có bản sửa; ghi phần còn lại vào `README.md` |
| CI trên GitHub khác máy (Windows ↔ Linux) | medium | medium | `.gitattributes` LF từ commit gốc; chạy compose trong job Linux; PR của phase 8 chạy CI thật trước khi merge |
| Phiên bản action cũ hoặc sai | low | medium | Tra trang chính thức lúc ghim, actionlint kiểm cú pháp |

## Rollback

`git revert -m 1 <merge phase 8>`; phase này chỉ thêm test, CI và tài liệu, cộng các sửa của 8D (mỗi sửa một commit riêng để gỡ từng cái).

## Ước lượng

Effort L: khoảng 8–12 giờ agent (ESTIMATED: 8A khoảng 4 giờ; 8B khoảng 2 giờ; 8C khoảng 1 giờ mỗi vòng; 8D khoảng 1–3 giờ tuỳ số vòng; 8E khoảng 1 giờ; Accept đầy đủ khoảng 1 giờ).
