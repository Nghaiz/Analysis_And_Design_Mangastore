# Kế hoạch: web "Tiệm thuê truyện tuổi thơ"

Hardness: phases=8 new=12 modules=0 lanes=2
Flags: --auto
Ngày lập: 11/11/2026. Trạng thái: ĐÃ DUYỆT (11/11/2026). Chưa viết code.
Repo: `git@github.com:Nghaiz/Analysis_And_Design_Mangastore.git` (public, remote `origin`); commit gốc nằm trên `main` từ ngày 11/11/2026 (Deferred #3). Dự án chỉ chạy localhost, không có prod (Deferred #28).
Thiết kế đã duyệt: `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` (D1–D11, hợp đồng §2, island §3, khoá §4, phiên bản §5, dữ liệu §6, giao diện §7, hạ tầng §8, rủi ro §9, nghiệm thu §10, để sau §11, Phụ lục A).
Brief: `prompt-web-tiem-thue-truyen.md` (§9.3 định dạng kế hoạch, §10 mô hình điều phối).
Hợp đồng kế hoạch (cây thư mục, cổng, biến môi trường, quy ước Accept, file dùng chung): `plans/261111-tiem-thue-truyen/contract.md`.
Agent map: `plans/261111-tiem-thue-truyen/agent-map.md`.

Không mở lại D1–D11 và hợp đồng nghiệp vụ. Mọi chỗ báo cáo không trả lời được ghi ở `## Deferred decisions` với lựa chọn thận trọng đã lấy.

## Forecast

Cap: tối đa 70% cho mỗi con số khi giả định chính chưa đo (độ phủ dữ liệu crawl, Lighthouse với cảnh 3D, Redisson trên Tomcat 11.0.27 + Java 25 đều UNMEASURED).

| Kết quả (đo được) | Độ tin | Cơ sở |
|---|---|---|
| 3 kịch bản ch.2 và mọi ngoại lệ chạy xanh trên Playwright, điện thoại và máy tính (tiêu chí 1) | 65% | ESTIMATED: luồng đã đặc tả đủ ở ch.2/ch.9, rủi ro nằm ở ngày giờ tương đối và seed E2E (Deferred #15) |
| 28 thông báo khớp từng chữ, CSRF 403, kiến trúc không getById (tiêu chí 2, 4, 6) | 70% | ESTIMATED: kiểm bằng test cơ học (MessagesTest, ArchitectureTest, smoke CSRF) |
| Test tranh chấp quyển K1 xanh (tiêu chí 5) | 70% | DOCUMENTED: InnoDB `SELECT … FOR UPDATE` dưới READ COMMITTED; chưa chạy trên 8.4.13 |
| Kho 300–500 Book thật có bìa, validate không lỗi chặn (tiêu chí 8) | 55% | ESTIMATED: researcher chỉ soi 1 sản phẩm Kim Đồng và 1 Tiki; bộ cũ phần lớn bán combo (`researcher-261111-data-sources.md`) |
| Lighthouse mobile ≥ 90 cả 4 hạng mục trên mọi trang có giao diện (tiêu chí 7) | 45% | ESTIMATED: React + three trên trang chủ dưới giả lập CPU chậm; chưa đo |
| CI xanh trên GitHub (tiêu chí 9) | UNKNOWN | insufficient evidence: remote có từ 11/11/2026, nhưng workflow chỉ có từ phase 8 và chưa chạy lần nào |

Success rate (P đạt Accept của phase trong ≤ 2 lần sửa, ESTIMATED): P1 70%, P2 70%, P3 70%, P4 55%, P5 55%, P6 65%, P7 60%, P8 45%. Tổng thể ≤ 45% (yếu nhất: phase 8, Lighthouse). Tích các phase nếu đòi mọi phase đạt ngay lần đầu, không lập lại kế hoạch: khoảng 2% (ESTIMATED, nhân chuỗi), nên kế hoạch dự trù vòng sửa trong từng phase.
Effect (thấp/khả dĩ/cao): thời gian agent 50 / 70 / 100 giờ làm việc liên tục, cộng 1 giờ crawl chạy nền và thời gian chủ dự án duyệt chạy thử (ESTIMATED, cộng từ ước lượng từng phase). Token: cao, mọi lane chạy opus theo luật chủ dự án (DOCUMENTED: `CLAUDE.md` của máy). Có thể chậm hơn ở: phase 4 (Tiki chặn hoặc đổi API), phase 8 (vòng sửa Lighthouse), phase 3 (deadlock khi test tranh chấp).
Uncertainties (theo tác động):
1. Độ phủ dữ liệu từng tập → đếm ứng viên từ `sitemap_products_1.xml` của Kim Đồng và tìm Tiki cho từng bộ (≤ 40 request, khoảng 2 phút) ở bước 4.1, trước chạy thử 10 đầu truyện; trước phase 4 crawl đầy đủ.
2. Lighthouse với 3D → đo Lighthouse mobile trên HomeView tạm và StyleGuideView ở cuối phase 5 (khoảng 30 phút), trước phase 6.
3. Redisson-tomcat-11 4.8.0 trên Tomcat 11.0.27/Java 25 → kiểm session còn sau khi khởi động lại container app ở phase 1 (khoảng 15 phút).
4. Flyway 13.12.1 với MySQL 8.4 (Redgate không liệt kê 8.4) → migration đầu tiên chạy trên Testcontainers `mysql:8.4.13` ngay bước 3.1.
5. Ảnh Docker `tomcat:11.0.27-jdk25-*` và JDK 25 trên máy (máy đang có 24.0.2, đã đo 11/11/2026) → kiểm ở bước 1.0.
Kill / no-regression: (a) chạy thử 10 đầu truyện có dưới 6 đầu đủ trường bắt buộc và có bìa → dừng, không crawl đầy đủ, hỏi chủ dự án đổi nguồn; (b) test tranh chấp K1 không xanh sau 3 lần sửa → dừng, xem lại kiến trúc với chủ dự án; (c) Lighthouse mobile HomeView dưới 80 sau bước đo ở phase 5 → đưa chủ dự án chọn hướng (chỉ ảnh tĩnh trên điện thoại hoặc giảm cảnh). Rollback: mỗi phase nằm trên nhánh riêng, `main` chỉ nhận merge của phase đã đạt Accept, gỡ bằng `git revert -m 1 <merge>`; volume Docker không bị xoá khi rollback.
Re-score: (chưa có)
Not checked: tồn tại thẻ ảnh Docker Tomcat cho Java 25; ranh giới Community/PRO của Redisson Tomcat manager; tương thích Connector/J 26.10.0 với MySQL 8.4; điều khoản của Tiki (trang chạy JS, chưa đọc được); số liệu Lighthouse thật; phiên bản các GitHub Action, Trivy, actionlint, Lighthouse, Fontsource, Checkstyle (tra ở phase dùng tới).

## Phases

| # | Phase | Lane | Effort | Depends-on | File |
|---|-------|------|--------|------------|------|
| 1 | Khung dự án và hạ tầng | serial | M | none | phase-01-khung-du-an-ha-tang.md |
| 2 | Bộ công cụ AI (quan trọng nhất) | serial | L | 1 | phase-02-bo-cong-cu-ai.md |
| 3 | Schema, DAO và test DAO | serial | L | 2 | phase-03-schema-dao-test.md |
| 4 | Pipeline crawl và seed (HARD STOP sau chạy thử 10 đầu truyện) | data | L | 3 | phase-04-pipeline-crawl-seed.md |
| 5 | Hệ thiết kế giao diện | ui | L | 3 | phase-05-he-thiet-ke-giao-dien.md |
| 6 | Chức năng 1 và 2 (M1, M2) | serial | L | 4, 5 | phase-06-chuc-nang-1-2.md |
| 7 | Chức năng 3 (M3) và trang quản trị D6 | serial | L | 6 | phase-07-chuc-nang-3.md |
| 8 | E2E, CI và hoàn thiện | serial | L | 7 | phase-08-e2e-ci-hoan-thien.md |

Nhãn `Lane:` ở đây là mức song song GIỮA các phase: chỉ phase 4 (`data`) và phase 5 (`ui`) chạy cùng lúc, theo quyết định của chủ dự án. Bên trong mỗi phase có các lane con (tối đa 3 agent cùng lúc), ghi trong mục "Lane trong phase" của từng file phase và trong `agent-map.md`.

## Luật điều phối áp dụng cho mọi phase (brief §10)

- Phiên chính là orchestrator: chia việc, giao việc, gom kết quả, cập nhật kế hoạch và `agent-map.md`. Phần đã giao cho subagent thì orchestrator không tự làm lại.
- Mọi lần spawn: `model: "opus"`, `effort: "<giá trị của biến môi trường CLAUDE_EFFORT lúc spawn>"`, `run_in_background: true`. Không để agent rơi về model rẻ hơn.
- Tối đa 3 subagent chạy cùng lúc trên toàn phiên, tính cả lúc phase 4 và phase 5 chạy song song. Subagent không tự spawn agent. Việc độc lập thứ 4 trở đi xếp hàng trong `agent-map.md`, xong một lane mới mở lane tiếp theo.
- Trước mọi lần chia song song: hợp đồng đã nằm trên đĩa và đã commit (`contract.md` cho phase 1; thêm `docs/contracts.md` từ phase 2). Brief của mọi subagent trỏ tới file đó, không dán nội dung.
- Mỗi lane sửa code chạy trong git worktree riêng (Deferred #7); danh sách file của từng lane không chồng nhau. File dùng chung (danh sách trong `contract.md` §8) chỉ orchestrator sửa.
- Tra tài liệu thư viện bằng context7: chỉ giao cho agent có `mcp__context7__query-docs` (`t1k-web-core-developer`), hoặc orchestrator tự tra. `t1k-researcher` chỉ có tên tool cũ nên không dùng cho việc tra tài liệu.
- Kiểm bằng Playwright MCP sau mỗi trang hay mỗi chức năng: mở web thật, đi kịch bản chuẩn và ngoại lệ ch.2, chụp khổ điện thoại 390×844 và máy tính 1440×900, đọc console và network. Chỉ tính là xong khi console không có error/warning và không có request hỏng (trạng thái ≥ 400 hoặc thất bại). Agent kiểm: `t1k-web-testing-tester` (có tool Playwright MCP).
- MCP nào chưa nạp trong phiên (Playwright, cua-driver, context7) thì báo chủ dự án khởi động lại, không lặng lẽ đổi sang cách yếu hơn.
- Subagent ghi kết quả chi tiết vào `plans/reports/`, chỉ trả về bản tóm tắt ngắn kèm đường dẫn. Xong bước nào đánh dấu ngay trong file phase. Context gần đầy: commit, `/t1k:handoff save`, rồi mới làm tiếp. Sau compact: đọc lại `CLAUDE.md`, `agent-map.md` và file phase đang làm.
- Lệnh chạy lâu (Maven, `docker compose up --build`, bộ test, crawl) chạy nền; trong lúc chờ làm việc không phụ thuộc, không dùng sleep để hỏi trạng thái.
- Không gửi gì ra ngoài máy: không Plane, không knowledge-retrieval, không sync-back hay issue lên kit. Ngoại lệ duy nhất là repo của dự án: orchestrator push nhánh phase lên `origin`, mở PR vào `main` và merge khi Accept PASS, theo quyền chủ dự án cho ngày 11/11/2026 (Deferred #3, `contract.md` §9). Subagent không push.

## Human steps (do first)

| Step | Unblocks | Where / exact command | Why an agent cannot | Timing |
|---|---|---|---|---|
| Bấm Yes nếu Windows hiện hộp UAC khi orchestrator cài JDK 25 (máy đang có OpenJDK 24.0.2, đã đo 11/11/2026) | phase 1 | Orchestrator chạy `winget install --id EclipseAdoptium.Temurin.25.JDK -e --accept-package-agreements --accept-source-agreements` (đã kiểm `winget show`: 25.0.5.8) ở bước chuẩn bị của phase 1, rồi kiểm `java -version`; JDK 24 giữ nguyên, script của dự án đặt `JAVA_HOME` tới bản 25 | Chủ dự án cho agent chạy lệnh cài (11/11/2026); hộp UAC của Windows chỉ người bấm được | later: lúc orchestrator bắt đầu phase 1 |
| Tạo `.env` thật từ `.env.example` | phase 1 | `node scripts/dev/make-env.mjs` (sinh mật khẩu ngẫu nhiên cho DB và Redis, ghi vào `.env`, không in ra màn hình) | Bí mật do chủ dự án tạo, agent không tự sinh bí mật | later: script do lane 1C của phase 1 tạo |
| Duyệt kết quả chạy thử 10 đầu truyện (báo cáo validate, trang ảnh bìa) | phase 4 | mở `data/reports/trial/index.html` và `data/reports/trial/validate.md`; trả lời câu hỏi chọn: crawl hết / chỉnh nguồn / dừng | HARD STOP theo brief §6: chủ dự án xem rồi mới crawl hết | later: cần kết quả chạy thử ở bước 4.3 |

MySQL Workbench 8.0 đã có trên máy (đã thấy thư mục cài đặt ngày 11/11/2026), nên phase 3 không cần thao tác tay; chỉ hỏi chủ dự án nếu cua-driver báo bị UIPI chặn. Cổng 3306 trên máy đang bị dịch vụ MySQL 8.0 chiếm (đã đo), nên MySQL của compose dùng 127.0.0.1:3307.

Đã xong ngày 11/11/2026: repo public `git@github.com:Nghaiz/Analysis_And_Design_Mangastore.git` và commit gốc trên `main`; chủ dự án cho agent push nhánh phase, mở PR và merge sau Accept PASS (Deferred #3).

## Planning waves

Group A: run (tại chỗ bởi planner, không spawn helper)
Group B: run (tại chỗ bởi planner, không spawn helper)
Review: 1 reviewer
Fan-out: 2 lanes
Facts: lanes=2 new-rows=12

Ghi chú về dòng `Review:` ở trên: trình kiểm kế hoạch chỉ nhận đúng hai giá trị `1 reviewer` hoặc `4-round`, nên dòng này là định dạng bắt buộc, không phải bản ghi. Thực tế chưa có reviewer nào chạy, và theo luật chủ máy sẽ không chạy reviewer khi chủ dự án chưa yêu cầu.

Theo luật chủ dự án cho phiên lập kế hoạch này: không spawn helper nào. Group A do planner tự làm tại chỗ (đọc brief, brainstorm, hai báo cáo researcher, ch.2 và ch.9 của báo cáo, grep toàn repo, đo máy: JDK, Maven, Node, Docker, cổng, Workbench). Corpus sweep bỏ qua theo luật chủ dự án (không gọi knowledge-retrieval). Group B do planner tự đối chiếu (rubric từng phase, các con số: 28 trang, 28 thông báo, 13 bảng, 8 DAO). Không có reviewer nào được spawn; một reviewer chỉ chạy khi chủ dự án yêu cầu.

## Verification topology

| Lane | Verifier | Concurrent? |
|------|----------|-------------|
| data | `node scripts/accept/phase-04.mjs` | yes, chỉ dùng Node, cache trên đĩa và một lần `docker compose` để nạp dữ liệu |
| ui | `node scripts/accept/phase-05.mjs` | yes, dùng Vitest, build Vite và compose cho StyleGuideView; không đụng dữ liệu crawl |

Lane sizing: tier=opus UNMEASURED; lanes=2; p=0.8; P(all land)=0.64 (information, not a cap)

Ngân sách agent khi phase 4 và 5 chạy cùng lúc: tổng 3. Phase 4 giữ 2 chỗ cho lane 4A và 4B, phase 5 giữ 1 chỗ; lane nào xong thì chỗ đó chuyển cho lane đang xếp hàng của phase 5. Lần crawl đầy đủ là tiến trình nền, không phải agent, không tính vào ngân sách.

## Contract

Owner: orchestrator của phiên cook (phiên chính); lane cần đổi thì báo lên, orchestrator sửa rồi brief lại lane
File: contract.md
Test: scripts/check/plan-contract.test.mjs

Hợp đồng nghiệp vụ và tích hợp chi tiết (tên trang, field form, thuộc tính session, chữ kí DAO, props island, thông báo) nằm ở `docs/contracts.md`, do phase 2 tạo trước mọi lần chia lane của phase 2 trở đi.

## Decision register

| # | Decision | Taken |
|---|---|---|
| R1 | Đường dẫn ảnh bìa (ranh giới phase 4 ↔ 5 ↔ nginx) | `/covers/{bookId}/cover-{160|320|640}.{webp|avif}`, ảnh phụ `extra-{n}-{w}.webp` (D2); thiếu ảnh thì nginx trả ảnh bìa giấy vẽ sẵn; chi tiết `contract.md` §6 |
| R2 | Dữ liệu catalog vào DB thế nào | Pipeline xuất `V10__catalog_data.sql` và `V11__sample_bills.sql` vào `data/export/` (bị ignore), mount vào `/flyway/data`; Flyway nạp lúc app khởi động (Deferred #8, #9) |
| R3 | Danh sách thể loại (pipeline ghi, giao diện tô màu gáy) | Danh sách cố định trong `pipeline/config/categories.json`, có "Thiếu nhi", "Phiêu lưu", "Trinh thám" của ch.2; phase 5 đọc cùng file để chọn màu gáy (Deferred #20) |
| R4 | Mã hiển thị và barcode | `DT` + id 3 chữ số, `PM` + id 4 chữ số chỉ lúc hiển thị; barcode lưu thật `DT001-03` (D8) |
| R5 | Bìa thật chỉ ở chỗ hiển thị dữ liệu | Kết quả tìm, chi tiết đầu truyện, phiếu mượn; kệ 3D dùng gáy tự vẽ (brainstorm §7) |
| R6 | Agent và model | Mọi spawn `model: "opus"`, effort từ `CLAUDE_EFFORT`, chạy nền, tối đa 3 cùng lúc |

Straggler: lane nào chưa về sau khoảng 2 lần thời gian trung vị của các lane cùng đợt thì orchestrator gộp phần đã về, ghi lane trễ là "trễ" trong `agent-map.md` và spawn lại lane đó trên phần còn thiếu; không ngồi chờ lane trễ, không tự làm thay.

## Reuse Ledger

| # | Capability | Verdict | Evidence |
|---|---|---|---|
| 1 | Hợp đồng nghiệp vụ: 13 thực thể, bảng, hàm DAO, 28 trang, luật session, thông báo | REUSE | `B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf` ch.2, 8, 9, 10 và `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` §1, §2 |
| 2 | Thành phần và thứ tự từng màn hình | REUSE | `images/svg/ui_m1_HomeView.svg` và 23 file màn hình M1, M2, M3 khác trong `images/svg/` |
| 3 | Cột, kiểu, khoá ngoại | REUSE | `images/svg/design_database.svg`, `images/svg/design_entity_pa5.svg` |
| 4 | Phiên bản thư viện đã tra | REUSE | `plans/reports/researcher-261111-stack-versions.md` §1–§5 |
| 5 | Nguồn dữ liệu, robots.txt, điều khoản, chiến lược gộp trùng | REUSE | `plans/reports/researcher-261111-data-sources.md` |
| 6 | Mẫu test Testcontainers và Playwright | REUSE | `.claude/skills/t1k-web-testing-core/references/database-testing.md`, `.claude/skills/t1k-web-testing-core/references/e2e-testing-playwright.md` |
| 7 | Hướng dẫn Tailwind v4 và shadcn | REUSE | `.claude/skills/t1k-web-ui-styling/SKILL.md` |
| 8 | Lưu session vào Redis không sửa code trang | REUSE | `repo: redisson/redisson` artifact `redisson-tomcat-11` 4.8.0, cấu hình trong `context.xml` |
| 9 | Băm mật khẩu Argon2id | REUSE | `repo: Password4j/password4j` 1.8.4 (thuần Java) |
| 10 | Pool kết nối và migration | REUSE | HikariCP 7.1.0, `flyway-mysql` 13.12.1 theo `plans/reports/researcher-261111-stack-versions.md` §2 |
| 11 | Nginx có brotli | EXTEND | ảnh nginx chính thức + `repo: nginx/docker-nginx` thư mục `modules` với `ENABLED_MODULES="brotli"` |
| 12 | Cảnh 3D và chuyển động | REUSE | three 0.187.0, `@react-three/fiber` 9.8.2, drei 10.7.9, Motion 14.12.0 theo `plans/reports/researcher-261111-stack-versions.md` §3 |
| 13 | Tầng trang JSP (28 trang ch.9, trang quản trị D6, trang dev) | NEW | Repo chưa có mã ứng dụng: chỉ có PDF, `images/`, brief, `plans/` và bộ kit `.claude/` |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 14 | Tầng DAO, khoá K1, chặn trạng thái D9 | NEW | Không có mã Java nào trong repo |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 15 | Migration Flyway V1, V2 và seed E2E | NEW | grep "flyway" trên toàn repo: 0 file |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 16 | Filter UTF-8, đăng nhập và phân quyền, CSRF, security headers, giới hạn đăng nhập sai | NEW | Không có mã Java nào trong repo |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 17 | Island loader cách B và 4 island | NEW | grep "react-three" trên toàn repo: 0 file; "island" chỉ khớp file thư viện Python trong `.claude/skills/.venv` |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 18 | Hệ thiết kế hoài niệm (token, tag file, component, hình trang trí tự vẽ) | NEW | Repo chỉ có ảnh biểu đồ của báo cáo; skill kit chỉ là hướng dẫn chung |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 19 | Cảnh 3D kệ truyện ShelfScene có quạt trần | NEW | grep "react-three" trên toàn repo: 0 file |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 20 | Pipeline crawl, làm sạch, ảnh, giá, quyển, validate, export, manifest | NEW | grep "sitemap" chỉ khớp tài liệu kit về Next.js và thư viện Python |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 21 | Bộ E2E Playwright theo ch.2 | NEW | grep "playwright.config" chỉ khớp tài liệu tham khảo của skill kit |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 22 | Workflow GitHub Actions | NEW | grep "actions/checkout" chỉ khớp tài liệu kit, repo chưa có `.github/` |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 23 | Bộ công cụ AI của dự án (AGENTS.md, 5 rule, 8 skill, agent tiem-contract-guard, docs) | NEW | `.claude/rules/` hiện chỉ có rule của kit web; chưa có `AGENTS.md`, `docs/` |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |
| 24 | Script Accept từng phase và script kiểm (`scripts/accept/`, `scripts/check/`) | NEW | Repo chưa có `scripts/` |
| | | | reuse-search: not-found-after-grep |
| | | | scope: images/ plans/ prompt-web-tiem-thue-truyen.md .claude/skills/ \| swept: 2026-11-10 (ngày UTC lúc grep; giờ Việt Nam là 11/11/2026) |

Ghi chú: corpus sweep (knowledge-retrieval) bỏ qua theo luật chủ dự án, không gửi gì ra ngoài máy. Grep chạy ngày 11/11/2026 trên toàn repo với các từ khoá `.jsp`, `DAO`, `flyway`, `Testcontainers`, `sitemap`, `island`, `react-three`, `playwright.config`, `compose.yaml`, `actions/checkout`; mọi kết quả khớp đều là tài liệu kit hoặc thư viện Python trong `.claude/skills/.venv`, không có mã ứng dụng.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hai khách giữ cùng một quyển | medium | high | K1 khoá dòng đầu truyện theo id tăng dần, kiểm lại quyển trống trong transaction; 3 test tranh chấp bắt buộc ở phase 3 trước khi phase 6 bắt đầu |
| Island thành API riêng phá kiến trúc JSP-DAO | medium | high | Quy tắc "form của server giữ việc gửi"; ESLint chặn `fetch`/`XMLHttpRequest` trong `frontend/src/islands/**` từ phase 5; agent `tiem-contract-guard` đọc diff mỗi phase |
| Khách huỷ đúng lúc nhân viên xử lí (D9) | medium | medium | `updateRentalBill` khoá dòng phiếu và kiểm trạng thái "Chờ nhận"; test tranh chấp huỷ ↔ xác nhận ở phase 3 |
| Dữ liệu crawl thiếu tập hoặc nhiễu combo | high | medium | Đếm ứng viên trước (bước 4.1), chạy thử 10 đầu truyện và HARD STOP, validate dừng khi vượt ngưỡng |
| Tiki đổi API hoặc chặn | medium | medium | Cache HTTP trên đĩa, lùi dần khi 429/5xx, báo lỗi rõ ràng; Kim Đồng vẫn là nguồn chính |
| Lighthouse < 90 vì 3D | medium | high | Ảnh tĩnh vẽ trước, 3D nạp lười (Deferred #16), đo ở cuối phase 5, kill (c) |
| Lệch §10 giữa `AGENTS.md` và rule | low | high | Script so từng byte với brief §10, chạy trong Accept mọi phase từ phase 2 và trong CI |
| Ghi đè file chéo giữa các lane song song | medium | high | Worktree riêng mỗi lane, danh sách Owns không chồng nhau, file dùng chung chỉ orchestrator sửa |
| Thiếu JDK 25 hoặc thẻ ảnh Tomcat cho Java 25 | medium | medium | Orchestrator cài JDK 25 bằng winget ở đầu phase 1 (chủ dự án đã cho phép); kiểm thẻ ảnh ở bước 1.0; dự phòng Java 21 LTS theo brainstorm §5, ghi ADR nếu dùng |
| Nội dung có bản quyền lọt vào git | low | high | `data/` bị ignore, Accept phase 4 kiểm `git ls-files data` rỗng và manifest không chứa mô tả hay ảnh (D11) |

Mọi rủi ro impact high đều có giảm thiểu nêu trước khi phase liên quan bắt đầu.

## Dependencies

- Blocks: phase N chặn phase N+1, riêng phase 3 chặn cả 4 và 5; phase 6 cần cả 4 và 5.
- Blocked by: bước cài JDK 25 (orchestrator chạy winget, chủ dự án bấm UAC nếu có) chặn phase 1; "Duyệt chạy thử" chặn phần crawl đầy đủ của phase 4.
- Critical path: 1 → 2 → 3 → 4 (crawl + chờ duyệt) → 6 → 7 → 8. Phase 5 chạy song song với phase 4 và không nằm trên đường găng nếu xong trước phase 4.

## Self-improvement loop

- **Signal:** test hoặc bước kiểm chuyển đỏ trong `node scripts/accept/phase-0N.mjs` và CI (MessagesTest, ArchitectureTest, SchemaConformanceTest, `scripts/check/section10-sync.mjs`, Playwright có console error), cùng báo cáo vi phạm của agent `tiem-contract-guard` trong `plans/reports/`.
- **Loop:** cổng Accept của phiên cook đang có: orchestrator đọc lỗi, brief lại đúng lane sở hữu file theo `agent-map.md`, không tự sửa thay lane; không dùng sync-back hay issue lên kit theo luật chủ dự án.
- **Fix:** sửa nằm trong file của lane; bài học lặp lại thì ghi vào mục Gotchas của skill dự án liên quan trong `.claude/skills/` hoặc vào `docs/contracts.md` (do orchestrator sửa), không ghi vào kit.
- **Guard:** chính test đã đỏ, chạy lại trong Accept của phase đó, trong Accept của mọi phase sau và trong CI; bài học mới phải kèm một test hoặc một bước kiểm đi đỏ khi lỗi quay lại.

## Deferred decisions

| # | Question | Options | Choice taken | Why | How to reverse |
|---|----------|---------|--------------|-----|----------------|
| 1 | Nhãn `Lane:` cấp kế hoạch | mỗi phase một lane / chỉ 4, 5 là lane | Phase 4 = `data`, phase 5 = `ui`, còn lại `serial`; lane con mô tả trong từng phase | Đúng quyết định "chỉ 4 và 5 song song" của chủ dự án | sửa dòng `Lane:` các file phase và bảng Phases |
| 2 | Phase 5 phụ thuộc gì | 2 (đủ về kĩ thuật) / 3 (theo thứ tự chủ dự án) | `Depends-on: 3` | Giữ thứ tự 8 phase chủ dự án đã chốt, để 4 và 5 cùng bắt đầu | đổi thành `Depends-on: 2` trong phase 5 |
| 3 | Nhánh git, remote và quyền push | commit thẳng main / nhánh tích hợp develop / nhánh phase và PR trên remote | **Chủ dự án chốt 11/11/2026.** Repo public `git@github.com:Nghaiz/Analysis_And_Design_Mangastore.git`; commit gốc duy nhất nằm thẳng trên `main` (repo mới chưa có nhánh nào để mở PR). Từ phase 1: mỗi phase một nhánh `phase/0N-<slug>` tạo từ `origin/main`; orchestrator push nhánh phase, mở PR vào `main`, merge bằng merge commit khi Accept PASS (phase 8 chờ thêm CI xanh), không cần chờ chủ dự án | Không commit việc dở lên nhánh mặc định; mỗi phase một PR để xem lại, rollback bằng revert merge | sửa `contract.md` §9; muốn tự merge thì bước cuối mỗi phase dừng ở PR đã mở |
| 4 | Phần nào của `.claude/` vào git | tất cả / chỉ file dự án | **Chủ dự án chốt 11/11/2026: chỉ file của dự án.** Bộ TheOneKit trong `.claude/` bị ignore; vào git chỉ `.claude/rules/tiem-*.md`, `.claude/skills/tiem-*/`, `.claude/agents/tiem-*.md` (whitelist trong `.gitignore`), cộng `AGENTS.md` và `CLAUDE.md` ở gốc repo | Repo public không công khai bộ công cụ nội bộ của studio; clone sang máy khác thì cài kit riêng | sửa khối `.claude` trong `.gitignore` |
| 5 | Ngôn ngữ pipeline dữ liệu | Node / Python | Node 24 ESM (`.mjs`), `sharp` cho ảnh, Vitest cho test | Một bộ công cụ chung với frontend; Python sẽ là toolchain thứ hai | viết lại `pipeline/` (chỉ phase 4) |
| 6 | Tên package Java | tuỳ chọn | `vn.tiemtruyen` với `dao`, `model`, `filter`, `util` | Ngắn, đúng cây thư mục brief §7 | đổi trong `contract.md` §2 trước phase 1 |
| 7 | Cách cô lập lane sửa code | danh sách file riêng trên một cây / worktree | Mỗi lane một worktree `D:/Coding/mangastore-wt/<phase>-<lane>`, nhánh `lane/0N-<slug>/<lane>`; orchestrator merge vào nhánh phase | Hai lane cùng chạy Maven trên một cây sẽ ghi đè `target/` | sửa `contract.md` §9 |
| 8 | Ai chạy Flyway | container flyway riêng / listener trong app | `util/MigrationListener` (`@WebListener`) gọi Flyway Java API lúc khởi động; test dùng cùng API | Một cơ chế cho app và test, không thêm service | thay bằng service `flyway` trong compose |
| 9 | Đường nạp dữ liệu crawl | migration trong repo / location ngoài git | `filesystem:/flyway/data` (volume `catalog_data`), file sinh ra ở `data/export/`; lần chạy E2E đặt `FLYWAY_DATA_LOCATION=classpath:db/e2e` | D11: nội dung không vào git | sửa `contract.md` §5 |
| 10 | Chọn quyển cụ thể khi gán phiếu | ngẫu nhiên / id nhỏ nhất còn trống | Quyển có `tblBookCopy.id` nhỏ nhất còn trống của đầu truyện đó | Xác định được, để seed E2E tái tạo đúng mã vạch DT001-03, DT020-02 của ch.2 | sửa `docs/contracts.md` và test DAO |
| 11 | Báo tín hiệu D9 mà giữ `boolean` | ngoại lệ riêng / đọc lại trạng thái | `updateRentalBill` trả `false`; trang gọi hàm danh sách đã có (nhân viên `searchRentalBill("PM"+id)`, khách `getRentalBillList(client)`) để đọc trạng thái mới rồi chọn câu D9; còn "Chờ nhận" thì là thiếu quyển | Không thêm hàm DAO, không getById, đúng D9 | sửa `docs/contracts.md` ở phase 2 |
| 12 | Vòng đời Connection của DAO | filter giữ kết nối / mỗi DAO một kết nối | `DAO implements AutoCloseable`, mượn Connection từ HikariCP trong constructor, trang dùng try-with-resources; hàm ghi tự mở transaction (autocommit tắt, READ COMMITTED) | Đúng "lớp cha DAO giữ Connection", không rò kết nối | sửa `docs/contracts.md` và `DAO.java` |
| 13 | Chỗ đặt `doCancelRentalBill.jsp` (ch.9 dùng chung cho khách và nhân viên) | hai bản / một bản | Một file ở gốc web, cả hai vai được gọi; khách quay về `RentalBillListView.jsp`, nhân viên quay về `/nhan-vien/SearchRentalBillView.jsp` (ch.9 tr.83–84) | Đúng "giống chức năng 2" của ch.9, không nhân đôi | sửa `docs/contracts.md` |
| 14 | Tên trang quản trị D6 (ngoài báo cáo) | tuỳ chọn | `/nhan-vien/quan-tri/ManageBookView.jsp`, `AddBookView.jsp`, `doAddBook.jsp`, `EditBookView.jsp`, `doUpdateBook.jsp` | Theo quy ước tên trang của ch.9 | đổi trong `docs/contracts.md` trước phase 7 |
| 15 | Ngày giờ trong E2E (ch.2 dùng 23–25/09/2026, đã qua so với hôm nay) | giả lập đồng hồ server / ngày tương đối | Ngày tính tương đối theo lúc chạy test, giữ giờ trong ngày của ch.2; tên, mã, giá, tổng, thông báo khớp nguyên văn; `AUTO_INCREMENT` của `tblRentalBill` đặt 125 để phiếu mới là PM0125 | Không thêm đồng hồ giả hay API vào app | thêm `AppClock` chỉ bật khi chạy E2E (đổi thiết kế, cần chủ dự án) |
| 16 | Lúc nào nâng ảnh tĩnh lên 3D | luôn / khi rảnh / khi tương tác | Máy con trỏ thô (điện thoại): chỉ khi người dùng chạm, cuộn hoặc bấm phím lần đầu; máy tính: khi trình duyệt rảnh sau tải trang; không WebGL hoặc giảm chuyển động thì giữ ảnh tĩnh | Bảo vệ Lighthouse mobile và pin điện thoại | sửa `ShelfScene` ở phase 5 |
| 17 | Cách tự host font | tải tay / gói Fontsource | Gói Fontsource (chỉ subset latin và vietnamese), Fraunces bản variable để có trục SOFT | Có sẵn subset vietnamese, phiên bản ghim được | thay bằng file woff2 tải tay trong `frontend/public/fonts/` |
| 18 | Trang chỉ dùng khi phát triển | không có / có | `/dev/StyleGuideView.jsp`, `/dev/HomePreviewView.jsp` và `/dev/session-probe.jsp`, luôn có vì dự án chỉ chạy localhost (Deferred #28) | Cần chỗ để Playwright MCP soi component và kiểm session Redis | xoá thư mục `src/main/webapp/dev/` |
| 19 | Cổng trên máy | mặc định / tránh trùng | nginx 8080, MySQL 127.0.0.1:3307 (3306 đang bị MySQL 8.0 của máy chiếm), Redis không mở, Vite 5173 | Đo được xung đột cổng 3306 | sửa `compose.yaml` |
| 20 | Danh sách thể loại | lấy thô từ nguồn / danh sách cố định | Danh sách cố định có "Thiếu nhi", "Phiêu lưu", "Trinh thám" của ch.2, ánh xạ theo bộ trong `pipeline/config/series.json` | `category varchar(50)` cần giá trị gọn, nhất quán | sửa `pipeline/config/categories.json` |
| 21 | Lint Java | không có / Checkstyle | `maven-checkstyle-plugin` với bộ luật riêng của dự án, phiên bản tra ở Maven Central lúc ghim | Brief §7 đòi lint Java | đổi plugin trong `pom.xml` |
| 22 | Kiểm schema bằng Workbench | bắt buộc / phụ | Dòng lệnh (`information_schema` trong SchemaConformanceTest) là cổng; reverse engineer bằng Workbench 8.0 qua cua-driver là bước đối chiếu phụ do orchestrator chạy | Brief §10: việc làm được bằng dòng lệnh thì dùng dòng lệnh | bỏ bước 3.6 |
| 23 | Ngưỡng chặn đăng nhập sai và câu báo khi bị chặn (báo cáo không có) | câu mới / dùng lại câu cũ | 5 lần sai trong 15 phút theo tên đăng nhập + IP thì chặn 15 phút; câu báo dùng lại nguyên văn "Đăng nhập thất bại, vui lòng thử lại."; ngưỡng là biến môi trường | Không thêm thông báo ngoài báo cáo | đổi biến `LOGIN_RATE_*`; câu mới cần chủ dự án duyệt |
| 24 | Ảnh chụp màn hình kiểm tra có vào git không | có / không | `plans/reports/screens/` bị ignore; báo cáo `.md` ghi đường dẫn | Ảnh làm repo phình | bỏ dòng trong `.gitignore` |
| 25 | CI chạy ở đâu | chỉ tại máy / tại máy và GitHub | Accept phase 8 chạy actionlint và đúng các lệnh của từng job tại máy; PR của phase 8 chạy workflow thật trên GitHub (remote có từ 11/11/2026), chỉ merge khi CI xanh | Cổng Accept vẫn ở máy, GitHub là lần kiểm thứ hai trên Linux | bỏ điều kiện chờ CI ở bước 8.8 |
| 26 | Mật khẩu tài khoản mẫu | ngẫu nhiên / theo ch.2 | V2 nạp ở mọi lần chạy (thường và E2E) như brainstorm §5, mật khẩu theo ch.2 (`hant` / `hant@123`), các tài khoản khác ghi trong `docs/dev-accounts.md`. Chủ dự án chốt 11/11/2026: chỉ chạy localhost, không có prod (Deferred #28), nên không tách tài khoản mẫu ra location riêng | Khớp kịch bản ch.2; không có môi trường công khai nào để lộ mật khẩu mẫu | nếu sau này có prod: tách tài khoản mẫu sang location chỉ nạp trên máy phát triển |
| 27 | Thứ tự bước `price` và `copies` (brainstorm §6 ghi price trước copies) | giữ thứ tự / đảo | `copies` chạy trước `price` | Quy tắc "hiếm: chỉ có 1 quyển" cần số quyển; chỉ là thứ tự cài đặt, quy tắc giá giữ nguyên | đảo lại trong `pipeline/src/steps/index.mjs` và bỏ điều kiện "1 quyển" |
| 28 | Môi trường chạy (brief §7 ghi hai cấu hình dev và prod, có cấu hình prod cho VPS) | dev và prod / chỉ localhost | **Chủ dự án chốt 11/11/2026: chỉ chạy localhost.** Một `compose.yaml` (cổng chỉ mở trên 127.0.0.1) cộng `compose.e2e.yaml` cho E2E. Không có profile `prod`, biến `APP_PROFILE`, `compose.dev.yaml`, `compose.prod.yaml`, TLS, cấu hình VPS hay thư mục `deploy/`; trang `/dev/*` luôn có | Làm đơn giản cho đỡ thời gian; chủ dự án bỏ hai ý đó của brief §7 | thêm `compose.prod.yaml` và cấu hình prod (cần chủ dự án) |
| 29 | 13 điểm báo cáo không trả lời, lane 2A ghi ở `docs/contracts.md` §14 (C1 tên field mới, C2 forward/POST/in phiếu, C3 số ngày tính tiền, C4 định dạng đăng kí, C5 `client` lúc đăng kí, C6 dọn danh sách tạm, C7 tình trạng và ngày mặc định, C8 người gọi doCancelRentalBill, C9 khớp từ khoá searchRentalBill, C10 đầu vào không có câu báo, C11 NULL, C12 trang quản trị, C13 kiểu Java) | hỏi chủ dự án / lấy cột "Tạm lấy" | **Orchestrator chốt 11/11/2026 theo uỷ quyền của chủ dự án trong phiên cook phase 1–2** ("tự chọn phương án khuyến nghị, đừng hỏi"): lấy đúng cột "Tạm lấy" | Không thêm thông báo, bảng, cột ngoài báo cáo; chạy được không cần JS; C5 không để mật khẩu trong session | sửa dòng tương ứng ở `docs/contracts.md` §14 trước phase ở cột "Chốt trước" |

## Để sau (ngoài phạm vi)

Trả truyện, phí phạt, thống kê. Không deploy và không có cấu hình prod: dự án chỉ chạy localhost (Deferred #28).

## Handoff

Kế hoạch đã duyệt ngày 11/11/2026 và không còn bước `now` nào ở mục Human steps: `/t1k:cook plans/261111-tiem-thue-truyen/plan.md`.
