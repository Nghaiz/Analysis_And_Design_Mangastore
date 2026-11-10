# Agent map: tiệm thuê truyện tuổi thơ

Nguồn sự thật cho việc giao lane của mọi phiên cook. Đọc lại đầu phiên và sau mỗi lần compact (cùng `CLAUDE.md` và file phase đang làm). Giao hay nhận việc xong là cập nhật file này ngay, trước khi làm việc khác.

Phase đang chạy: 4 (pipeline crawl); phase 1, 2, 3 đã vào `main` (PR #1, #2, #3)
Cập nhật lần cuối: 2026-11-11 (phiên cook phase 3–4)
Nhánh phase: `phase/04-pipeline`

## Luật (tóm tắt, bản đủ ở `plan.md` và `contract.md` §1)

- Mọi spawn: `model: "opus"`, `effort: "<CLAUDE_EFFORT>"`, `run_in_background: true`.
- Tối đa 3 agent cùng lúc trên toàn phiên, kể cả khi phase 4 và 5 chạy song song. Agent con không spawn agent. Việc thứ 4 trở đi ghi ở mục "Hàng đợi".
- Hợp đồng đã commit trước khi mở bất kì lane song song nào.
- Mỗi lane sửa code một worktree `D:/Coding/mangastore-wt/<0N>-<lane>`; Owns không chồng nhau; file dùng chung (`contract.md` §8) chỉ orchestrator sửa.
- Lane ghi báo cáo chi tiết vào `plans/reports/`, trả về tóm tắt ≤ 15 dòng kèm đường dẫn và trạng thái.
- Trạng thái lane: `chờ` · `xếp hàng` · `đang chạy` · `xong` · `trễ` · `hỏng` · `chặn`.

## Đang chạy (tối đa 3 dòng)

| Lane | Agent | Bắt đầu | Worktree / nhánh | Báo cáo |
|---|---|---|---|---|

## Hàng đợi

| Thứ tự | Lane | Chờ gì |
|---|---|---|

## Bảng lane

| Phase | Lane | Việc | Agent | Owns | Phụ thuộc | Trạng thái | Báo cáo |
|---|---|---|---|---|---|---|---|
| 1 | 1.0 orchestrator | nhánh phase, `.editorconfig`, file dùng chung, hợp đồng, Accept (git và remote đã có) | phiên chính | xem `phase-01` bước 1.0 | cài JDK 25 bằng winget (bước chuẩn bị) | xong | contract.md §10 |
| 1 | 1A `java-khung` | Maven Wrapper, util, tag assets, health, Dockerfile app | `t1k-web-core-developer` | xem `phase-01` | 1.0 | xong | `plans/reports/phase-01-java-khung-261111-0351.md` |
| 1 | 1B `frontend-khung` | Vite, TS, ESLint, loader khung | `t1k-web-core-developer` | `frontend/**` trừ package | 1.0 | xong | `plans/reports/phase-01-frontend-khung-261111-0342.md` |
| 1 | 1C `ha-tang` | nginx brotli, mysql, redis, make-env | `t1k-web-core-developer` | `docker/nginx,mysql,redis/**`, `scripts/dev/**` | 1.0 | xong | `plans/reports/phase-01-ha-tang-261111-0342.md` |
| 1 | 1D `xac-minh` | Playwright MCP trang tạm | `t1k-web-testing-tester` | `plans/reports/` | 1A, 1B, 1C, `.env` | xong | `plans/reports/phase-01-xac-minh-261111-0356.md` |
| 2 | 2A `hop-dong` | `docs/contracts.md`, `AGENTS.md`, `CLAUDE.md` | `t1k-docs-manager` | ba file đó | phase 1 | xong | `plans/reports/phase-02-hop-dong-261111-0403.md` |
| 2 | 2B `docs` | docs còn lại, ADR, Mermaid | `t1k-docs-manager` | `docs/**` trừ contracts | 2A, 2.1 | xong | `plans/reports/phase-02-docs-261111-0426.md` |
| 2 | 2C `rules` | 5 rule | `t1k-rules-manager` | 5 file `.claude/rules/` | 2A, 2.1 | xong | `plans/reports/phase-02-rules-261111-0415.md` |
| 2 | 2D `skills` | 8 skill, agent tiem-contract-guard | `t1k-skills-manager` | 8 thư mục skill, `tiem-contract-guard.md` | 2A, 2.1 | xong | `plans/reports/phase-02-skills-261111-0419.md` |
| 3 | 3.0 orchestrator | V1, V2, V10 e2e, pom, Accept, Workbench (3.6), báo cáo phase | phiên ab | `db/**`, `pom.xml` | phase 2 (contracts.md 063f864) | xong | `plans/reports/phase-03-schema-dao-261111-0513.md`, `plans/reports/phase-03-workbench-261111-0506.md` |
| 3 | 3A `model-util` | model, DAO cha, Messages, Passwords, Codes, JsonUtil, MigrationListener | `t1k-web-core-developer` | xem `phase-03` | 3.0 | xong (6caaa20) | `plans/reports/phase-03-model-util-261111-0426.md` |
| 3 | 3B `dao-user-book` | User, Client, Staff, Book, Damage, Collateral DAO | `t1k-web-core-developer` | xem `phase-03` | 3A | xong | `plans/reports/phase-03-dao-user-book-261111-0438.md` |
| 3 | 3C `dao-cart-bill` | Cart, RentalBill DAO, K1, D9, test tranh chấp | `t1k-web-core-developer` | xem `phase-03` | 3A | xong (ae188ad) | `plans/reports/phase-03-dao-cart-bill-261111-0450.md` |
| 3 | 3D `kiem-kien-truc` | SchemaConformanceTest, ArchitectureTest | `t1k-web-core-developer` | `src/test/.../schema,arch/**` | 3A | xong | `plans/reports/phase-03-kiem-kien-truc-261111-0442.md` |
| 4 | 4.0 orchestrator | package, schema bản ghi, categories, Accept, `pipeline/CONTRACT.md`, run đầy đủ, publish | phiên ab | xem `phase-04` | phase 3 (chỉ export cần) | đang chạy (phiên ab) | `pipeline/CONTRACT.md` |
| 4 | 4A `nguon` | fetch, robots, cache, nguồn, series, census | `t1k-web-core-developer` | xem `phase-04` | 4.0 | xong | `plans/reports/phase-04-nguon-261111-0411.md` |
| 4 | 4B `xu-li` | clean, images, copies, price, validate, export, publish | `t1k-web-core-developer` | xem `phase-04` | 4.0 | xong | `plans/reports/phase-04-xu-li-261111-0401.md` |
| 4 | 4C `xac-minh` | Playwright MCP trang ảnh chạy thử | `t1k-web-testing-tester` | `plans/reports/` | 4.3 | xong | `plans/reports/phase-04-trial-261111-0423.md` |
| 4 | 4.5 HARD STOP | chủ dự án duyệt chạy thử 10 đầu truyện | orchestrator thay (chủ dự án giao toàn quyền 11/11/2026) | | 4C | xong: 10/10 đạt, crawl hết | `plans/reports/phase-04-trial-261111-0423.md` |
| 5 | 5.0 orchestrator | gói npm, shadcn add, khoá vite.config | phiên chính | xem `phase-05` | phase 3 | chờ | |
| 5 | 5A `token-tag` | token, font, CSS, tag JSP, StyleGuide, kiểm tương phản và font | `t1k-web-ui-developer` | xem `phase-05` | 5.0 | chờ | |
| 5 | 5B `loader-react` | loader cách B, component React, ESLint chặn fetch, ngân sách | `t1k-web-core-developer` | xem `phase-05` | 5.0 | chờ | |
| 5 | 5C `ke-3d` | ShelfScene, quạt trần, ảnh tĩnh, HomePreview | `t1k-web-core-developer` | xem `phase-05` | 5.0 | chờ | |
| 5 | 5D `xac-minh` | Playwright MCP và đo Lighthouse | `t1k-web-testing-tester` | `plans/reports/` | 5A, 5B, 5C | chờ | |
| 6 | 6.0 orchestrator | web.xml filter, compose e2e, smoke M1–M2, Accept | phiên chính | xem `phase-06` | phase 4, 5 | chờ | |
| 6 | 6A `filter-chung` | 5 filter, csrf tag, trang lỗi | `t1k-web-core-developer` | xem `phase-06` | 6.0 | chờ | |
| 6 | 6B `trang-m1` | 5 trang M1 | `t1k-web-core-developer` | xem `phase-06` | 6.0 | chờ | |
| 6 | 6C `trang-m2` | 9 trang M2 | `t1k-web-core-developer` | xem `phase-06` | 6.0 | chờ | |
| 6 | 6D `island-selected-stack` | island SelectedStack | `t1k-web-core-developer` | `frontend/src/islands/SelectedStack/**` | 6.0, chỗ trống | chờ | |
| 6 | 6E `xac-minh-m1` | Playwright MCP chức năng 1 | `t1k-web-testing-tester` | `plans/reports/` | 6A, 6B | chờ | |
| 6 | 6F `xac-minh-m2` | Playwright MCP chức năng 2 | `t1k-web-testing-tester` | `plans/reports/` | 6C, 6D | chờ | |
| 7 | 7.0 orchestrator | smoke M3, Accept | phiên chính | xem `phase-07` | phase 6 | chờ | |
| 7 | 7A `quay-xu-li` | đăng nhập NV, tìm, xử lí, xác nhận, in | `t1k-web-core-developer` | xem `phase-07` | 7.0 | chờ | |
| 7 | 7B `tinh-trang-coc` | sửa danh sách, tình trạng, lỗi, cọc | `t1k-web-core-developer` | xem `phase-07` | 7.0 | chờ | |
| 7 | 7C `islands-m3` | ProcessBillDesk, CollateralDrawer | `t1k-web-core-developer` | xem `phase-07` | 7.0 | chờ | |
| 7 | 7D `quan-tri` | 5 trang quản trị D6 | `t1k-web-core-developer` | `nhan-vien/quan-tri/**` | 7.0, chỗ trống | chờ | |
| 7 | 7E `xac-minh-m3` | Playwright MCP chức năng 3 | `t1k-web-testing-tester` | `plans/reports/` | 7A, 7B, 7C | chờ | |
| 7 | 7F `xac-minh-quan-tri` | Playwright MCP quản trị | `t1k-web-testing-tester` | `plans/reports/` | 7D | chờ | |
| 8 | 8.0 orchestrator | gói e2e, trình duyệt, Accept | phiên chính | xem `phase-08` | phase 7 | chờ | |
| 8 | 8A `e2e` | Playwright 3 kịch bản, ngoại lệ, bảo mật, axe | `t1k-web-core-developer` | xem `phase-08` | 8.0 | chờ | |
| 8 | 8B `ci` | GitHub Actions | `t1k-web-core-developer` | xem `phase-08` | 8.0 | chờ | |
| 8 | 8C `lighthouse-do` | đo Lighthouse mọi trang | `t1k-web-testing-tester` | `e2e/lighthouse/**` | 8.0 | chờ | |
| 8 | 8D `sua-lighthouse` | sửa theo danh sách file | theo danh sách | danh sách do orchestrator ghi ở đây | 8.4 | chờ | |
| 8 | 8E `tai-lieu` | README, docs cuối | `t1k-docs-manager` | xem `phase-08` | 8A, 8B | chờ | |

## Danh sách file của lane 8D (orchestrator ghi sau bước 8.4)

(trống)

## Nhật kí

| Thời điểm | Sự kiện |
|---|---|
| 2026-11-11 | JDK 25.0.5 (Temurin) cài bằng winget; JDK 24 giữ nguyên |
| 2026-11-11 | 1.0 xong, commit hợp đồng; nhánh lane đổi thành `lane/0N-<slug>/<lane>` (git cấm `phase/01-khung/<lane>` khi đã có `phase/01-khung`) |
| 2026-11-11 | Spawn 1A, 1B, 1C song song |
| 2026-11-11 | 1B xong, merge; 1C xong, merge; áp đề xuất compose của 1C (MySQL conf 0644, Redis qua entrypoint); `.env` tạo bằng make-env |
| 2026-11-11 | 2A spawn sớm trên nền phase/01-khung (chỉ tài liệu), merge vào phase/02 sau khi phase 1 vào main |
| 2026-11-11 | 1A xong, merge; Accept phase 1 ALL PASS lần đầu; làm đỏ bước 5 bằng cách dừng redis |
| 2026-11-11 | 1D lần 1 FAIL (`/favicon.ico` 404 ở trang text/plain) → nginx trả favicon tự vẽ, Accept thêm kiểm; lần 2, lần 3 sạch |
| 2026-11-11 | 2A xong (commit f04b1a4), 13 điểm Chưa chốt C1–C13 |
| 2026-11-11 | Phase 1 merge vào `main` (PR #1, merge commit e504f12); nhánh `phase/02-bo-cong-cu-ai` từ `origin/main`, merge 2A |
| 2026-11-11 | 2.1: orchestrator chốt C1–C13 theo uỷ quyền của chủ dự án, viết script kiểm và Accept (063f864); spawn 2B, 2C, 2D song song |
| 2026-11-11 | 2C xong, merge (556973a); section10-sync so thêm khối brief §3 của AGENTS.md (a36f897) |
| 2026-11-11 | 2D xong, merge (d8104fc); chạy thử tiem-contract-guard báo đúng 2 vi phạm cố ý (c124d06), worktree thử không merge |
| 2026-11-11 | 2B xong, merge (875c7fb); UNIQUE vào ô khoá `tblCart.clientId`, thêm `schema-doc-sync.test.mjs` (2257b72) |
| 2026-11-11 | Theo phiên phase 3 (lane 3A): skill `tiem-add-dao-duplicate-check` đổi khuôn sang `con()` + `inWriteTransaction` (Checkstyle cấm trường protected); Accept phase 2 ALL PASS (`plans/reports/accept-phase-02-261111-0430.log`) |
