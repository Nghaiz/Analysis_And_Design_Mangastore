# Phase 5: Hệ thiết kế giao diện

Lane: ui
Depends-on: 3
Effort: L
Owns: `frontend/**`, `src/main/webapp/WEB-INF/tags/ui/**`, `src/main/webapp/WEB-INF/tags/layout.tag`, `src/main/webapp/dev/StyleGuideView.jsp`, `src/main/webapp/dev/HomePreviewView.jsp`
Creates: `scripts/accept/phase-05.mjs`, `frontend/src/styles/tokens.css`, `frontend/src/styles/print.css`, `frontend/src/islands/ShelfScene/index.tsx`, `frontend/scripts/check-contrast.mjs`, `frontend/scripts/check-budget.mjs`, `frontend/scripts/check-font-subsets.mjs`, `src/main/webapp/dev/StyleGuideView.jsp`, `src/main/webapp/dev/HomePreviewView.jsp`
AX: AX-04 và AX-05 cho ba script kiểm trong `frontend/scripts/` và `scripts/accept/phase-05.mjs` (exit 1 kèm token, file hoặc chunk vi phạm và ngưỡng); AX-07 không hỏi tương tác
Accept: `node scripts/accept/phase-05.mjs`

## Mục tiêu

Hệ thiết kế "tiệm truyện đầu ngõ cuối thập niên 90": token màu, font, spacing (brainstorm §7, `docs/design-tokens.md`); font tự host có subset vietnamese (Fuzzy Bubbles kèm ba font Momo, chủ dự án chốt 11/11/2026); bộ component hoài niệm dùng được từ cả JSP (tag file + lớp CSS) lẫn React (island); island loader cách B; shadcn thật đã bọc theo chủ đề; cảnh 3D kệ truyện có đèn vàng và quạt trần quay chậm, có bản tĩnh; chế độ giảm chuyển động; CSS in A5. Chưa làm trang nghiệp vụ.

Nguồn: brainstorm §3 (island), §7 (giao diện), D2, D10; `docs/design-tokens.md`; `docs/contracts.md` (props của `ShelfScene`); `plans/261111-tiem-thue-truyen/contract.md` §5–§6 (Vite, manifest, ảnh bìa, thể loại); `.claude/skills/tiem-create-nostalgia-component/SKILL.md`, `.claude/skills/tiem-create-react-island/SKILL.md` (do phase 2 tạo).

Chạy song song với phase 4. Khi phase 4 còn lane chạy, phase 5 chỉ dùng 1 chỗ agent; lane 5B, 5C xếp hàng trong `agent-map.md` và mở khi có chỗ.

## Các bước

- [x] **5.0 Orchestrator, tuần tự (file dùng chung):** thêm vào `frontend/package.json` các gói three 0.187.0, `@react-three/fiber` 9.8.2, `@react-three/drei` 10.7.9, Motion 14.12.0, gói Fontsource 5.3.0 cho Fuzzy Bubbles (`@fontsource/fuzzy-bubbles`, 400/700), Momo Trust Sans (`@fontsource-variable/momo-trust-sans`), Momo Signature (`@fontsource/momo-signature`), Momo Trust Display (`@fontsource/momo-trust-display`). Quyết định của chủ dự án ngày 11/11/2026: bỏ hẳn bộ ghim ban đầu (Be Vietnam Pro, Xanh Mono, Patrick Hand, Fraunces), dùng Fuzzy Bubbles làm font chính kèm ba font Momo (`docs/design-tokens.md` §2, ADR-0011 mục cập nhật đổi bộ font); chạy `npx shadcn@4.23.0 add` cho các component cần (button, input, checkbox, table, dialog, label, textarea) để file vào `frontend/src/components/ui/` và lockfile cập nhật; khoá `frontend/vite.config.ts` (từ đây là file dùng chung); viết `scripts/accept/phase-05.mjs`. Commit trước khi spawn. Hợp đồng lớp CSS, token, tag, island chung của ba lane: `phase-05-ui-contract.md`. Việc phase 1 để lại: `lucide-react` 1.71.0 và `radix-ui` 1.8.1 đã ghim chính xác (shadcn còn tự thêm gói npm `cn`, đã gỡ và trả import về `@/lib/utils`); `npm audit` nay báo 15 lỗi (2 low, 13 moderate), tất cả trong devDependencies (typescript-eslint, eslint, shadcn), không `audit fix --force` vì hạ major, xem lại khi nâng typescript-eslint. `server.cors.origin` của vite.config thêm `http://127.0.0.1:8080` (phiên 9b soát chế độ dev Vite; phần nginx CSP, compose, `AssetTags` do phiên 9b sửa).
- [x] **5.1 Lane 5A `token-tag`** (chỗ đầu tiên, chạy song song với phase 4).
- [x] **5.2 Lane 5B `loader-react`** (xếp hàng tới khi có chỗ).
- [x] **5.3 Lane 5C `ke-3d`** (xếp hàng tới khi có chỗ).
- [x] **5.4 Orchestrator:** merge; chạy nền build và compose; mở `/dev/StyleGuideView.jsp` và `/dev/HomePreviewView.jsp` (bản dựng thử bố cục trang chủ có gắn `ShelfScene`; HomeView thật làm ở phase 6). Đã xong: Accept phase 5 ALL PASS (`plans/reports/accept-phase-05-261111-0814.log`), lần đầu FAIL vì HomePreviewView dùng `<%= %>` trong thân scriptless của `layout.tag` (sửa ở c3af339).
- [ ] **5.5 Lane 5D `xac-minh`:** Playwright MCP soi StyleGuideView và HomePreviewView ở 390×844 và 1440×900, có và không có `prefers-reduced-motion`, có và không có WebGL (tắt bằng cờ trình duyệt); đọc console và network; chụp vào `plans/reports/screens/phase-05/`; đo Lighthouse mobile một lần trên hai trang (bước đo rủi ro, chưa phải cổng; công cụ `npx lighthouse` bản tra npm lúc chạy). Ghi `plans/reports/phase-05-xac-minh-<ts>.md`.
- [ ] **5.6 Orchestrator:** đọc số Lighthouse; HomePreviewView dưới 80 thì kill (c) của `plan.md`: dừng, đưa chủ dự án chọn hướng. Ghi số đo vào mục Re-score của `plan.md`. Chạy Accept, đánh dấu, push nhánh phase, mở PR vào `main` và merge bằng merge commit (`contract.md` §9).

## Lane trong phase

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 5A `token-tag` | `frontend/src/styles/{tokens.css, fonts.css, paper.css, components.css, print.css}`: token đúng brainstorm §7 qua `@theme` của Tailwind v4, bo góc tối đa 2px, bóng đổ lệch kiểu giấy, chất liệu giấy ố, mép sờn, băng dính giấy, chữ đánh máy, nét bút bi, dấu đỏ; `@media (prefers-reduced-motion: reduce)` tắt mọi chuyển động CSS; `print.css` có `@page { size: A5; }` và ẩn mọi thứ ngoài phiếu; tag file JSP `WEB-INF/tags/layout.tag` (khung trang, tiêu đề tiếng Việt, `<t:assets/>`, preload Fuzzy Bubbles 400 và Momo Trust Sans, Nunito (`--font-num`), Momo Signature và Momo Trust Display nạp lười) và `WEB-INF/tags/ui/*.tag` (phiếu xé từ sổ `ticket`, dấu trạng thái `stamp` luôn kèm chữ CHỜ NHẬN/ĐANG CHO THUÊ/ĐÃ HUỶ, tem tình trạng `condition-tag`, `paper-card`, `ledger-table`, `book-cover` theo `contract.md` §6, `message-box` cho thông báo nguyên văn); hình trang trí tự vẽ `frontend/public/img/{logo-tiem.svg, cover-fallback.svg, paper-*.svg}` (không logo NXB, không nhân vật có bản quyền); `dev/StyleGuideView.jsp` (mọi component, chuỗi thử "Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan" ở cả năm font); `frontend/scripts/check-contrast.mjs` (tính tỉ lệ WCAG cho mọi cặp chữ/nền khai trong `docs/design-tokens.md`, dưới 4.5:1 thì exit 1); `frontend/scripts/check-font-subsets.mjs` (mỗi họ font có `@font-face` với `unicode-range` của subset vietnamese) | `t1k-web-ui-developer` | `frontend/src/styles/**`, `frontend/public/img/**` trừ `frontend/public/img/shelf/**`, `src/main/webapp/WEB-INF/tags/layout.tag`, `src/main/webapp/WEB-INF/tags/ui/**`, `src/main/webapp/dev/StyleGuideView.jsp`, `frontend/scripts/check-contrast.mjs`, `frontend/scripts/check-font-subsets.mjs` | 5.0 |
| 5B `loader-react` | `frontend/src/loader/island-loader.ts` bản đủ (cách B: quét `[data-island]`, `import()` lười qua `import.meta.glob('../islands/*/index.tsx')`, đọc props JSON theo `data-props`, `createRoot`, error boundary để bản HTML vẫn dùng được khi island hỏng, không làm gì khi trang không có island); `frontend/src/components/nostalgia/*.tsx` (bản React của ticket, stamp, condition-tag, paper-card, ledger-table, book-cover, dùng cùng lớp CSS của 5A); bọc theo chủ đề các component shadcn trong `frontend/src/components/ui/`; `frontend/src/hooks/{useReducedMotion.ts, useFormBridge.ts}` (đổi giá trị input thật trong form cha rồi `form.requestSubmit(submitter)`); island mẫu `frontend/src/islands/_demo/` cho test; luật ESLint chặn `fetch`, `XMLHttpRequest`, `axios`, `navigator.sendBeacon`, `EventSource`, `WebSocket` trong `frontend/src/islands/**`; `frontend/scripts/check-budget.mjs` (đọc manifest, tính kích thước gzip: loader ≤ 3 KB, CSS đầu trang ≤ 30 KB, chunk ngoài `ShelfScene` ≤ 120 KB); test Vitest cho loader, hook, component | `t1k-web-core-developer` (có context7 `query-docs` để tra Vite, React 19, shadcn) | `frontend/src/loader/**`, `frontend/src/components/**`, `frontend/src/hooks/**`, `frontend/src/islands/_demo/**`, `frontend/src/lib/**`, `frontend/eslint.config.js`, `frontend/scripts/check-budget.mjs` | 5.0 |
| 5C `ke-3d` | `frontend/src/islands/ShelfScene/**` và `frontend/src/three/**`: kệ gỗ, gáy truyện tự vẽ (màu theo thể loại đọc từ `pipeline/config/categories.json`, hoa văn, nhãn thể loại đánh máy), ánh đèn vàng, quạt trần quay chậm; rê chuột thì gáy nhô ra; bấm gáy thì rút quyển xuống rồi chuyển tới `LoginView.jsp` (D10, URL lấy từ props); điều kiện nâng cấp theo Deferred #16 (con trỏ thô: chỉ khi tương tác đầu tiên; máy tính: khi rảnh; không WebGL hoặc giảm chuyển động: giữ ảnh tĩnh); ảnh tĩnh `frontend/public/img/shelf/shelf-static.{webp,avif}` và bản SVG vẽ tay cho lúc chưa có ảnh; điều hướng bàn phím (Tab qua từng gáy, Enter để chọn) và nhãn `aria`; trang dựng thử `dev/HomePreviewView.jsp` (lời chào, nút "Đăng nhập", "Đăng kí", kệ 3D, theo thứ tự của `images/svg/ui_m1_HomeView.svg`); test Vitest cho logic chọn tĩnh hay 3D | `t1k-web-core-developer` (có context7 `query-docs` để tra r3f, drei) | `frontend/src/islands/ShelfScene/**`, `frontend/src/three/**`, `frontend/public/img/shelf/**`, `src/main/webapp/dev/HomePreviewView.jsp` | 5.0 |
| 5D `xac-minh` | Kiểm bằng Playwright MCP và đo Lighthouse như bước 5.5, chỉ đọc | `t1k-web-testing-tester` | chỉ ghi `plans/reports/` | 5.4 |

Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent. Lane cần thêm gói npm hoặc đổi `vite.config.ts` thì ghi đề xuất vào báo cáo, orchestrator sửa. Lane 5A dùng `t1k-web-ui-developer` (không có context7): cần tra tài liệu thì dừng và báo, orchestrator tự tra hoặc giao `t1k-web-core-developer`.

## Tiêu chí hoàn thành

1. `npm --prefix frontend run lint`, `run typecheck`, `run test`, `run build` xanh; luật ESLint chặn `fetch` trong `islands/` đã được làm đỏ có chủ đích một lần.
2. `check-contrast.mjs`: mọi cặp chữ/nền khai báo đạt AA 4.5:1.
3. `check-font-subsets.mjs`: năm họ font (Fuzzy Bubbles, Momo Trust Sans, Nunito, Momo Signature, Momo Trust Display) có subset vietnamese; không gọi Google Fonts lúc chạy (grep đầu ra build không có `fonts.googleapis.com`).
4. `check-budget.mjs`: đạt ngân sách JS và CSS đã nêu.
5. Qua compose: `/dev/StyleGuideView.jsp` và `/dev/HomePreviewView.jsp` trả 200 (trang công cụ, luôn có vì dự án chỉ chạy localhost).
6. Playwright MCP: StyleGuideView và HomePreviewView sạch console, không request hỏng, có ảnh hai khổ, bản giảm chuyển động không có chuyển động, bản không WebGL hiện ảnh tĩnh; chuỗi thử tiếng Việt hiện đúng dấu ở cả năm font.
7. Số Lighthouse mobile của HomePreviewView và StyleGuideView đã ghi vào `plan.md` (không phải cổng; cổng là phase 8).
8. Accept phase 1–3 phần nhanh vẫn xanh (`node --test scripts/check/`, `section10-sync.mjs`, build frontend).

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-05.mjs` chạy tiêu chí 1–5 và 8. Tiêu chí 6–7 do lane 5D ghi báo cáo.

## Playwright MCP

Áp dụng: bước 5.5 cho StyleGuideView và HomePreviewView.

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Lighthouse mobile thấp vì three và React | medium | high | Ảnh tĩnh vẽ trước, 3D chỉ nạp theo Deferred #16, đo ở 5.5, kill (c) |
| Giao diện trông "AI rập khuôn" | medium | medium | Token và chất liệu cụ thể của brainstorm §7, bo góc ≤ 2px, không gradient tím; StyleGuideView chụp ảnh để chủ dự án xem |
| Hai bản component (JSP và React) lệch nhau | medium | medium | Cùng lớp CSS của 5A; StyleGuideView đặt hai bản cạnh nhau |
| Font thiếu dấu tiếng Việt | low | medium | Chỉ dùng font có subset vietnamese (bộ Fuzzy Bubbles và Momo đã kiểm gói npm 11/11/2026), script kiểm `unicode-range`, ảnh chụp chuỗi thử |
| Momo Trust Sans không đơn cách, số phiếu và cột tiền lệch | medium | low | Đã giải (11/11/2026): Momo và Fuzzy Bubbles không có `tnum` nên `tabular-nums` không đủ; số và mã dùng `--font-num` (Nunito, chữ số cùng bề rộng 600 đơn vị); soát ảnh chụp bảng và phiếu |
| Quạt trần và hover tốn CPU trên điện thoại | medium | medium | Điện thoại chỉ nâng cấp khi chạm; `frameloop="demand"` khi đứng yên; giảm chuyển động thì tắt |

## Rollback

`git revert -m 1 <merge phase 5>`; phase này không đụng DB hay dữ liệu.

## Ước lượng

Effort L: khoảng 6–10 giờ agent (ESTIMATED: 5A khoảng 3 giờ; 5B khoảng 2–3 giờ; 5C khoảng 3–4 giờ, bị xếp hàng khi phase 4 còn chạy; kiểm và đo khoảng 1 giờ).
