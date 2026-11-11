# Agent map: tiệm thuê truyện tuổi thơ

Nguồn sự thật cho việc giao lane của mọi phiên cook. Đọc lại đầu phiên và sau mỗi lần compact (cùng `CLAUDE.md` và file phase đang làm). Giao hay nhận việc xong là cập nhật file này ngay, trước khi làm việc khác.

Phase 1–5 xong: phase 1–4 vào `main` qua PR #1–#6, phase 5 qua PR #7, phase 4b (dọn mục bỏ sót của phase 1–4, `phase-04-don-no.md`) qua PR #8. Phase tiếp theo: 6
Cập nhật lần cuối: 2026-11-11 (phiên cook phase 3–4, sau khi gộp phase 5)
Nhánh phase: `phase/06-chuc-nang-1-2` (phiên 55, worktree `06-orch`) và `phase/07-chuc-nang-3` (phiên 93, worktree `07-orch`) chạy song song từ 11/11/2026

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
| 7I `in-a5-6` (phiên 93) | `t1k-web-testing-tester` | 2026-11-11 | 07-orch (chỉ ghi `plans/reports/`), stack `tiemtruyen-7e` 8087 | |

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
| 4 | 4.0 orchestrator | package, schema bản ghi, categories, Accept, `pipeline/CONTRACT.md`, run đầy đủ, publish | phiên ab | xem `phase-04` | phase 3 (chỉ export cần) | xong | `plans/reports/phase-04-pipeline-261111-0532.md` |
| 4 | 4A `nguon` | fetch, robots, cache, nguồn, series, census | `t1k-web-core-developer` | xem `phase-04` | 4.0 | xong | `plans/reports/phase-04-nguon-261111-0411.md` |
| 4 | 4B `xu-li` | clean, images, copies, price, validate, export, publish | `t1k-web-core-developer` | xem `phase-04` | 4.0 | xong | `plans/reports/phase-04-xu-li-261111-0401.md` |
| 4 | 4C `xac-minh` | Playwright MCP trang ảnh chạy thử | `t1k-web-testing-tester` | `plans/reports/` | 4.3 | xong | `plans/reports/phase-04-trial-261111-0423.md` |
| 4 | 4.5 HARD STOP | chủ dự án duyệt chạy thử 10 đầu truyện | orchestrator thay (chủ dự án giao toàn quyền 11/11/2026) | | 4C | xong: 10/10 đạt, crawl hết | `plans/reports/phase-04-trial-261111-0423.md` |
| 4b | J `java` | JsonReader giữ, flywayDataLocation, updateBook đánh số, gộp ánh xạ Book, ghim maven -noble | `t1k-web-core-developer` | xem `phase-04-don-no` | soát 11/11 | xong (b81736b) | `plans/reports/phase-04-don-no-java-261111-0818.md` |
| 4b | P `pipeline` | combo "Bố", bìa có dải người bán, publishYear theo ấn bản, crawl bù Thần Đồng Đất Việt 164 | `t1k-web-core-developer` | xem `phase-04-don-no` | soát 11/11 | xong (ff4e2af) | `plans/reports/phase-04-don-no-pipeline-261111-0830.md` |
| 4b | D `dev-mode` | CSP nginx theo APP_VITE_DEV, preamble module ngoài, csp-page-check | `t1k-web-core-developer` | xem `phase-04-don-no` | soát 11/11 | xong (a6b5178; chạy thử dev mode 11/11) | `plans/reports/phase-04-don-no-dev-261111-0819.md` |
| 5 | 5.0 orchestrator | gói npm, shadcn add, khoá vite.config, hợp đồng giao diện, Accept | phiên chính | xem `phase-05` | phase 3 | xong | `phase-05-ui-contract.md` |
| 5 | 5A `token-tag` | token, font, CSS, tag JSP, StyleGuide, kiểm tương phản và font | `t1k-web-ui-developer` | xem `phase-05` | 5.0 | xong (5660371) | `plans/reports/phase-05-token-tag-261111-0812.md` |
| 5 | 5B `loader-react` | loader cách B, component React, ESLint chặn fetch, ngân sách | `t1k-web-core-developer` | xem `phase-05` | 5.0 | xong (6349b00) | `plans/reports/phase-05-loader-react-261111-0756.md` |
| 5 | 5C `ke-3d` | ShelfScene, quạt trần, ảnh tĩnh, HomePreview | `t1k-web-core-developer` | xem `phase-05` | 5.0 | xong (b5de396) | `plans/reports/phase-05-ke-3d-261111-0801.md` |
| 5 | 5D `xac-minh` | Playwright MCP và đo Lighthouse | `t1k-web-testing-tester` | `plans/reports/` | 5A, 5B, 5C | xong | `plans/reports/phase-05-xac-minh-261111-0828.md` |
| 6 | 6.0 orchestrator | web.xml filter, compose e2e, smoke M1–M2, Accept | phiên chính | xem `phase-06` | phase 4, 5 | xong: Accept ALL PASS, PR vào main | `phase-06-integration.md` |
| 6 | 6A `filter-chung` | 5 filter, csrf tag, trang lỗi | `t1k-web-core-developer` | xem `phase-06` | 6.0 | xong 3 vòng, merge (038d316, 3481296): Redisson, error.jsp, header, 400 khi %-hỏng, trang 400/413/414 nginx | |
| 6 | 6B `trang-m1` | 5 trang M1 | `t1k-web-core-developer` | xem `phase-06` | 6.0 | xong, merge (48c0823); ClientHomeView thêm hộp thông báo (71165d9) | `plans/reports/phase-06-trang-m1-261111-1110.md` |
| 6 | 6C `trang-m2` | 9 trang M2 | `t1k-web-core-developer` | xem `phase-06` | 6.0 | xong, merge (d5de2df) | |
| 6 | 6D `island-selected-stack` | island SelectedStack | `t1k-web-core-developer` | `frontend/src/islands/SelectedStack/**` | 6.0, chỗ trống | xong, merge (799d807); nút OK về ô nhập đầu (258c6f5) | |
| 6 | 6E `xac-minh-m1` | Playwright MCP chức năng 1 | `t1k-web-testing-tester` | `plans/reports/` | 6A, 6B | DONE_WITH_CONCERNS: 1440 PASS, 390 tới ngoại lệ 6.2 (`phase-06-xac-minh-m1-261111-1158.md`) | |
| 6 | 6G `dao-dong-gio` | C21 dòng giỏ trong K1, updateCart khoá giỏ, nút Tạo phiếu mượn không trùng | `t1k-web-core-developer` | RentalBillDAO, CartDAO, test DAO, doAddRentalBill.jsp, SearchBookView.jsp | 6C | xong, merge (28d08c5, 1784105); làm đỏ 34/41, 1/41 | |
| 6 | 6F `xac-minh-m2` | Playwright MCP chức năng 2 | `t1k-web-testing-tester` | `plans/reports/` | 6C, 6D | DONE_WITH_CONCERNS: 1440 JS bật PASS; phần còn lại giao 6H (`phase-06-xac-minh-m2-261111-1203.md`) |
| 6 | 6H `xac-minh-con-lai` | Playwright: tắt JS, C21 hai tab, bước 24, 390, nút OK, reduced motion | `t1k-tester` | `plans/reports/` | 6E, 6F | xong: PASS trừ bảng 390 (sửa 79e1412) (`phase-06-xac-minh-con-lai-261111-1215.md`) | |
| 7 | 7.0 orchestrator | smoke M3, Accept | phiên chính | xem `phase-07` | phase 6 | chờ | |
| 7 | 7A `quay-xu-li` | đăng nhập NV, tìm, xử lí, xác nhận, in | `t1k-web-core-developer` | xem `phase-07` | hợp đồng (chạy trước 7.0); csrf.tag, filter của 6A khi kiểm | xong (fcfb3bf, merge 836aedf; verify chưa chạy vì Docker) | `plans/reports/phase-07-quay-xu-li-261111-1110.md` |
| 7 | 7B `tinh-trang-coc` | sửa danh sách, tình trạng, lỗi, cọc | `t1k-web-core-developer` | xem `phase-07` | hợp đồng (chạy trước 7.0); csrf.tag, filter của 6A khi kiểm | xong (07c50ca, đã merge) | `plans/reports/phase-07-tinh-trang-coc-261111-1110.md` |
| 7 | 7C `islands-m3` | ProcessBillDesk, CollateralDrawer | `t1k-web-core-developer` | xem `phase-07` | hợp đồng §11.2, §11.3 | xong (5f42ac3, merge bfc467e) | `plans/reports/phase-07-islands-m3-261111-1057.md` | |
| 7 | 7D `quan-tri` | 5 trang quản trị D6 | `t1k-web-core-developer` | `nhan-vien/quan-tri/**` | chỗ trống | xong, chưa chạy HTTP (5b4a3c4, merge 989791e) | `plans/reports/phase-07-quan-tri-261111-1130.md` |
| 7 | 7E `xac-minh-m3` | Playwright MCP chức năng 3 | `t1k-web-testing-tester` | `plans/reports/` | 7A, 7B, 7C | xong (L1 in A5, L2 tiêu đề cột → sửa 33afcba, đo lại PASS) | `plans/reports/phase-07-xac-minh-m3-261111-1203.md` |
| 7 | 7F `xac-minh-quan-tri` | Playwright MCP quản trị | `t1k-web-testing-tester` | `plans/reports/` | 7D | xong (0 lỗi) | `plans/reports/phase-07-xac-minh-quan-tri-261111-1220.md` |
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
| 2026-11-11 | Phase 5: 5.0 xong (gói npm ghim, shadcn 7 component sửa import `cn`, vite phát `data/categories.json`, `phase-05-ui-contract.md`, Accept phase 5 bước 2 đỏ có chủ đích); phiên 9b báo phase 5 đụng cây chính → chuyển sang worktree `05-orch`, cây chính về `main` |
| 2026-11-11 | Spawn 5A, 5B, 5C song song (phase 4 xong nên đủ 3 chỗ) |
| 2026-11-11 | Merge PR #5, #6 của main vào nhánh phase. 5B xong (DONE_WITH_CONCERNS: thẻ HTML chưa ghim), merge (eab90f0); hợp đồng giao diện thêm §3a, nhắn 5A khớp theo; 5B đề xuất 3 gotcha, đã thêm vào skill `tiem-create-react-island`; loader 2,25 kB gzip |
| 2026-11-11 | 5C xong (DONE_WITH_CONCERNS: chưa soi trình duyệt, HomePreview cần layout.tag của 5A), merge (289a89e); đổi import sang `@/hooks/useReducedMotion`, xoá hook tạm (a46b254); 88 test xanh, check:budget PASS (loader 2,36 kB, ShelfCanvas 247 kB gzip chỉ ShelfScene); đề xuất `posterAvifSrcSet` trong contracts §11.4 để sau số Lighthouse |
| 2026-11-11 | 5A dừng ở giới hạn 75 lượt, nhắn làm tiếp, xong (5660371), merge (c419293); áp đề xuất tài liệu, Accept thêm bước 4b chặn hex; loader thêm `data-island-state` (mục phiên 9b mang từ phase 1); Accept lần 1 FAIL bước 6 (HomePreviewView 500: `<%= %>` trong thân scriptless), sửa (c3af339), lần 2 ALL PASS; spawn 5D. Stack compose do phase 5 giữ tới khi xong 5.5 (đã hẹn phiên 9b) |
| 2026-11-11 | 5D lần 1: L1 (CSS ảnh thiếu lớp JSP) sửa ở Dockerfile + Accept bước 6; chủ dự án đổi font (Fuzzy Bubbles + Momo), lane 5E và lane tài liệu làm; 5C sửa ánh sáng, chuyển mờ, nhãn 390, lọc warning THREE.Clock; 5D đo lại PASS; chủ dự án giao chọn font số → Nunito (`--font-num`); Accept ALL PASS (0908); Lighthouse HomePreview 96, StyleGuide 98; ảnh tĩnh kệ cho điện thoại ghi sang phase 6 |
| 2026-11-11 | Phase 6: 6.0 chốt `phase-06-integration.md` (ranh giới trang ↔ filter, Display, posterNarrowSrc §11.4, stack riêng từng lane cổng 8081–8083; phase 7 dùng 8084–8089), filter khung cho qua để web.xml hợp lệ (a96abb6); spawn 6A, 6B, 6C. Phiên phase 7 chạy song song, nhận SHA 6A khi xong |
| 2026-11-11 | Phase 7 chạy song song phase 6 (chủ dự án yêu cầu): phiên 93 tạo `phase/07-chuc-nang-3` từ `origin/main` 34879ed; mở 7A, 7B, 7C trước 7.0 vì Owns không chồng phase 6 và hợp đồng đã đủ; phụ thuộc csrf.tag và filter của 6A sẽ merge vào khi phiên 55 báo SHA; phiên 93 không chạy compose khi chưa hỏi phiên 55 |
| 2026-11-11 | Phase 7: chủ dự án yêu cầu bao quát mọi ngoại lệ và edge case ngoài báo cáo → `phase-07-edge-cases.md`; duyệt 5 câu mới (phiên 55 ghi vào contracts §10.3 cùng 3 câu của phase 6, 612cdd3), quá giờ hẹn không xử lí, quầy không giới hạn 30 ngày. 7C xong (DONE_WITH_CONCERNS: quy ước data-island-fallback/slot, đã báo 7A, 7B và phiên 55); mở 7D. Để sau: chuyển `server-html.ts`, `motion.ts`, `props-guard.ts` của ProcessBillDesk sang `frontend/src/lib/` (CollateralDrawer đang import chéo) |
| 2026-11-11 | Chủ dự án yêu cầu bao quát mọi ngoại lệ ch.2 và edge case thực tế: `phase-06-integration.md` §6 (064d59b); chốt qua AskUserQuestion: thêm câu báo, đăng xuất, số ngày thuê ≤ 30, phiếu quá hạn không làm gì; gộp với 5 câu phiên phase 7 thành `docs/contracts.md` §10.3 (8 câu) + C14–C19 (612cdd3); quy ước gắn island §11 theo lane 7C, smoke thêm edge case (5703549); fixture PM0110 = DT001-01+02, PM0117 = DT020-01 (71b29a8). Đã nhắn 6A, 6B, 6C merge và làm thêm |
| 2026-11-11 | Docker Desktop hỏng ~10:56 (API 500), chủ dự án khởi động lại ~11:20. 6B xong (DONE_WITH_CONCERNS: chưa chạy Tomcat), merge; sửa LoginView sang session mới. 6A DONE_WITH_CONCERNS (thiếu Redisson trong pom) → orchestrator thêm Redisson provided, error.jsp mặc định (a0bc269), nhắn 6A làm tiếp. Mở 6D |
| 2026-11-11 | Docker treo lần hai (hai phiên cùng chạy nhiều stack và Testcontainers). Thoả thuận với phiên phase 7: tối đa 2 stack compose trên máy (phase 6 giữ 1: 6c, rồi e2e của orchestrator), `mvnw verify` đủ chỉ orchestrator chạy và báo phiên kia "verify bắt đầu/xong", stack thường `tiemtruyen` tắt khi không ai dùng (down, không -v). 6A, 6D không dùng Docker; 6C chỉ dựng stack khi `docker info` trả lời; chủ dự án tự khởi động lại Docker. C20 `uncheckedBarcodes` (5216e6e) |
| 2026-11-11 | 6C DONE_WITH_CONCERNS (chưa chạy stack vì Docker), merge (d5de2df); 6A DONE vòng 2 (Redisson, error.jsp, header, token mới sau đăng nhập), merge (038d316), SHA gửi phiên phase 7; verify đủ 358 test xanh. Đề xuất 4 của 6C (dòng giỏ bị xoá hoặc đã thuộc phiếu khác khi khách dùng hai thiết bị → 500 hoặc phiếu trùng) → câu §10.3 thứ 9 `SELECTED_BOOKS_CHANGED` + C21 (3e5d5fd), mở lane 6G `dao-dong-gio` (worktree `06-dao-dong-gio`, Owns RentalBillDAO, test DAO, doAddRentalBill.jsp, SearchBookView.jsp). 6D DONE_WITH_CONCERNS, merge (799d807); nút "Tạo phiếu mượn" trùng khi có JS giao 6G. Stack thường down (không -v), dựng tiemtruyen-e2e |
| 2026-11-11 | Docker treo lần 3, 4 (VM 3 GB / 3 CPU). Chủ dự án duyệt nâng: `.wslconfig` memory=12GB, processors=8, swap=4GB (bản cũ `.wslconfig.bak-261111`), VM giờ 12,5 GB / 8 CPU; mỗi phiên một stack lại. Codec Redisson Kryo tràn stack với vòng Book↔BookCopy → SerializationCodec + test codec runtime (phiên phase 7, cherry-pick 585c504). 6G merge, §6.1 ghi khoá dòng giỏ (ab66866). verify đủ 400 xanh; smoke 49 bước ALL PASS; rate limit Redis 11/11 (stack tạm 8082); tiem-contract-guard 0 vi phạm, 4 cảnh báo (sửa 2: §9.1 trang lỗi, "(chưa ghi nhận)"). 6E: nút OK về BODY khi không có ô sai → sửa (258c6f5); hai lane Playwright dùng chung một trình duyệt MCP → mỗi lúc một lane |
| 2026-11-11 | 6H xong; bảng 390 break-word (79e1412); kiểm lại 8080: smoke ALL PASS, nút OK, bảng 390, console sạch. Phase 6 đóng: push nhánh phase, PR vào main |
| 2026-11-11 | Phase 7: 7A, 7B, 7D xong (Docker treo nên chưa verify, chưa chạy HTTP); merge filter thật 6A 038d316 vào phase 7 (0cef444). Từ khoá > 100 kí tự ở 4 trang M3 đổi sang INPUT_TOO_LONG cho khớp §10.3 (9448e88). Quyết định cho 7D: nháp `book` id 0 trong session, `listBook = [đầu truyện vừa lưu]` sau doAddBook, `txtPublisher` không bắt buộc, số quyển 0 nhận ở AddBook. Stack 7e (8087) dựng sau khi phiên 55 báo "verify xong" |
| 2026-11-11 | Phase 7: Docker VM nâng lên 12,5 GB/8 CPU (chủ dự án duyệt, phiên 55 làm). Smoke M3 PASS, probe D6 ALL PASS, verify 400 test, frontend 186 test. Sửa: codec session Redisson Kryo5 → SerializationCodec + test codec runtime (fdaf8b6, 500 khi session có listBook), từ khoá > 100 kí tự (9448e88), lưu danh sách quyển xoá ghi chú khách (5dade05, contract-guard), in A5 tràn trang và tiêu đề cột vỡ (33afcba, 7E). contract-guard 0 vi phạm. 7E, 7F gộp một agent vì trình duyệt MCP dùng chung |
| 2026-11-11 | Phase 7: phase 6 vào main (PR #10); merge origin/main. 7G gộp helper island SelectedStack vào `frontend/src/lib` (196 test). 7H làm đỏ có chủ đích điều kiện cọc: FAIL rồi PASS. Accept bước 2 sửa reporter Vitest (75d3edd). Accept phase 7 ALL PASS 5/5 (ff75cdf). 7I đo phiếu 6 đầu truyện A5 đang chạy |
