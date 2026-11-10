# Phase 2: Bộ công cụ AI

Lane: serial
Depends-on: 1
Effort: L
Owns: `AGENTS.md`, `CLAUDE.md`, `docs/**`, `.claude/rules/tiem-business-contract.md`, `.claude/rules/tiem-dao-rules.md`, `.claude/rules/tiem-session-rules.md`, `.claude/rules/tiem-ui-theme.md`, `.claude/rules/tiem-cook-orchestration.md`, `.claude/skills/tiem-add-jsp-page/**`, `.claude/skills/tiem-add-dao-duplicate-check/**`, `.claude/skills/tiem-write-flyway-migration/**`, `.claude/skills/tiem-add-crawl-source/**`, `.claude/skills/tiem-create-react-island/**`, `.claude/skills/tiem-create-nostalgia-component/**`, `.claude/skills/tiem-write-e2e-chapter2/**`, `.claude/skills/tiem-open-cook-session/**`, `.claude/agents/tiem-contract-guard.md`, `scripts/check/**`
Creates: `scripts/accept/phase-02.mjs`, `scripts/check/section10-sync.mjs`, `scripts/check/section10-sync.test.mjs`, `scripts/check/contracts-doc.test.mjs`, `scripts/check/skills-frontmatter.test.mjs`, `docs/contracts.md`, `.claude/agents/tiem-contract-guard.md`, `.claude/skills/tiem-open-cook-session/SKILL.md`
AX: AX-20 `AGENTS.md` có lệnh build và test chạy được; AX-04 và AX-05 cho `section10-sync.mjs` (exit 1 kèm vị trí byte lệch đầu tiên và việc cần làm); skill và agent theo AX-12 (tên rõ nghĩa, mô tả nói khi nào dùng)
Accept: `node scripts/accept/phase-02.mjs`

## Mục tiêu

Phase quan trọng nhất (brief §8): mọi phiên sau dựa vào đây. Tạo `AGENTS.md` thật chi tiết, `CLAUDE.md` nhập `@AGENTS.md`, 5 rule, 8 skill, agent `tiem-contract-guard`, và `docs/` (PDR, kiến trúc, từ điển Việt - Anh, ERD và luồng trang bằng Mermaid, ADR, design token, `docs/contracts.md`). Toàn văn brief §10 có mặt ở `AGENTS.md` và `.claude/rules/tiem-cook-orchestration.md`, có script so từng byte.

Nguồn bắt buộc cho mọi lane: brief `prompt-web-tiem-thue-truyen.md` (§3, §8, §10), `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` (D1–D11, §2–§8, §10), `plans/261111-tiem-thue-truyen/contract.md`, `plans/261111-tiem-thue-truyen/plan.md` mục Deferred decisions. Khi cần chi tiết trang và field: báo cáo PDF ch.9 (trang in 56–86, số trang PDF = trang in + 2), đọc bằng `Read` với tham số `pages`; màn hình ở `images/svg/ui_m*_*.svg`.

## Các bước

- [x] **2.0 Lane 2A `hop-dong`, tuần tự (trước mọi lần chia lane):** viết `docs/contracts.md`, `AGENTS.md`, `CLAUDE.md`. Orchestrator đọc lại, commit trước khi mở 2B–2D.
- [x] **2.1 Orchestrator:** viết `scripts/check/section10-sync.mjs` và test của nó, `scripts/check/contracts-doc.test.mjs`, `scripts/check/skills-frontmatter.test.mjs`, `scripts/accept/phase-02.mjs`; commit.
- [x] **2.2 Lane 2B `docs`**, **2.3 Lane 2C `rules`**, **2.4 Lane 2D `skills`** chạy song song (3 chỗ).
- [x] **2.5 Orchestrator, tuần tự:** merge; chạy thử `tiem-contract-guard` trên một diff mẫu cố ý sai (thêm hàm `getBookById` vào `BookDAO` và thêm cột `quantity` vào `tblSelectedBook`) và xác nhận agent báo đúng hai vi phạm; ghi `plans/reports/phase-02-tiem-contract-guard-dryrun-<ts>.md`.
- [x] **2.6 Orchestrator:** chạy Accept, đánh dấu, push nhánh phase, mở PR vào `main` và merge bằng merge commit (`contract.md` §9).

## Nội dung bắt buộc

**`docs/contracts.md` (SSOT nghiệp vụ và tích hợp, Owner: orchestrator).**
- 13 thực thể và quan hệ (brief §3), bảng cột theo brainstorm §2.1 (D1: `password varchar(255)`; `publishYear` cho phép NULL vì pipeline không bịa năm).
- 28 trang ch.9, đúng tên, kèm thư mục (gốc, `/nhan-vien/`, D5) và trang quản trị D6 (Deferred #14), `doCancelRentalBill.jsp` dùng chung (Deferred #13). Với từng trang: thành phần và thứ tự (theo SVG), field form đúng tên ch.9 (`txtUsername`, `txtKeyword`, `txtQuantity`, `txtExpectedDays`, `txtExpectedPickupAt`, `txtNote`, `txtCancelReason`, `txtBorrowDate`, `txtDueDate`, `txtDiscount`, `txtConditionNote`, `txtName`, `txtDescription`…), thuộc tính session đọc và ghi (`client`, `staff`, `cart`, `rentalBill`, `listBook`, `book`, `listRentalBill`, `rentedBook`, `listRentedBook`, `listDamage`, `listCollateral`, `listRentalCollateral`), trang gửi tới và trang quay về.
- Chữ kí DAO đủ theo brainstorm §2.3, không gộp; luật DAO của thầy; vòng đời Connection (Deferred #12); khoá K1 (brainstorm §4); D9 và cách báo tín hiệu (Deferred #11); chọn quyển (Deferred #10).
- 28 thông báo nguyên văn (brainstorm §2.2) dưới dạng bảng `| Hằng số | Câu |` (tên hằng số tiếng Anh, ví dụ `REGISTER_SUCCESS`); bốn điều kiện xác nhận.
- Props JSON của 4 island (`SelectedStack`, `ProcessBillDesk`, `CollateralDrawer`, `ShelfScene`): tên field, kiểu, camelCase, giá trị null; input ẩn mà island được đổi.
- Ma trận phân quyền filter: khách (mọi trang trừ Home, Register, doRegister, Login), nhân viên (`/nhan-vien/*`), quản lí (`/nhan-vien/quan-tri/*`, `position = "Quản lí"`), `/dev/*` luôn mở (dự án chỉ chạy localhost, Deferred #28).
- Luật hiển thị mã `DT`/`PM` (D8), định dạng tiền `3.000đ`, ngày `dd/MM/yyyy`, giờ `HH:mm dd/MM/yyyy`.

**`AGENTS.md`:** tổng quan; lệnh chạy (build, test, compose, pipeline, E2E) chạy được thật; cây thư mục (`contract.md` §2); kiến trúc JSP-DAO; toàn bộ hợp đồng nghiệp vụ brief §3 cùng phần bổ sung brainstorm §2 (trỏ `docs/contracts.md` cho bảng chi tiết); quy ước đặt tên (file của dự án trong `.claude/` mang tiền tố `tiem-`, Deferred #4); quy ước git theo `plans/261111-tiem-thue-truyen/contract.md` §9 (nhánh phase, PR vào `main`, merge sau Accept PASS; quyền push do chủ dự án cho ngày 11/11/2026, Deferred #3); dự án chỉ chạy localhost, không có prod (Deferred #28); cách test; điều cấm (getById, DAO cho SelectedBook/RentedBook/RentedDamage/RentalCollateral, lưu thuộc tính dẫn xuất, sửa thông báo nguyên văn, Servlet điều khiển, Spring, island gọi `fetch`); toàn văn brief §10 giữa hai dấu `<!-- BEGIN brief-section-10 -->` và `<!-- END brief-section-10 -->`.

**`CLAUDE.md`:** dòng `@AGENTS.md` ở đầu; phần chỉ Claude cần: MCP bắt buộc (Playwright, cua-driver, context7) và việc báo chủ dự án khởi động lại khi thiếu; mọi spawn `model: "opus"` và `effort` từ `CLAUDE_EFFORT`; agent nào có `mcp__context7__query-docs`; việc đầu tiên sau compact (đọc `CLAUDE.md`, `plans/<plan>/agent-map.md`, file phase đang làm); không gửi gì ra ngoài máy, trừ push và PR lên `origin` của repo này theo `contract.md` §9.

**`scripts/check/section10-sync.mjs`:** trích khối giữa hai dấu ở `AGENTS.md` và ở `.claude/rules/tiem-cook-orchestration.md`, so từng byte với nhau và với nguyên văn brief §10 (từ dòng `## 10.` tới trước `## 11.` trong `prompt-web-tiem-thue-truyen.md`); lệch thì exit 1 và in vị trí byte lệch đầu tiên.

**Rule (`.claude/rules/tiem-*.md`):** `tiem-business-contract.md` (13 thực thể, trạng thái phiếu, không thuộc tính dẫn xuất, thông báo nguyên văn), `tiem-dao-rules.md` (luật DAO của thầy, K1, D9), `tiem-session-rules.md` (luật trang và session, doXxx, dòng chọn lưu session), `tiem-ui-theme.md` (chủ đề, token, font có subset vietnamese, giảm chuyển động, bìa thật chỉ ở chỗ dữ liệu, AA), `tiem-cook-orchestration.md` (toàn văn brief §10 giữa hai dấu, cộng luật spawn opus/effort). Mỗi rule trỏ `docs/contracts.md`, không chép bảng.

**Skill (`.claude/skills/tiem-<tên>/SKILL.md`, có frontmatter `name` trùng tên thư mục, `description` nói khi nào dùng, mục Gotchas):** `tiem-add-jsp-page`, `tiem-add-dao-duplicate-check`, `tiem-write-flyway-migration`, `tiem-add-crawl-source`, `tiem-create-react-island`, `tiem-create-nostalgia-component`, `tiem-write-e2e-chapter2`, `tiem-open-cook-session` (đọc agent map, giao lane tối đa 3, gom kết quả, cập nhật file phase). Mỗi skill có danh sách kiểm tra cuối và lệnh kiểm.

**Agent `.claude/agents/tiem-contract-guard.md`:** chỉ đọc (`tools: Read, Grep, Glob, Bash`), `model: opus`; đọc diff (`git diff <base>...HEAD`), đối chiếu `docs/contracts.md` và các rule; ghi báo cáo vi phạm vào `plans/reports/tiem-contract-guard-<ts>.md`; không sửa code.

**`docs/`:** `pdr.md`, `architecture.md` (cây thư mục, kiến trúc, island cách B), `glossary.md` (phiếu mượn = RentalBill, giỏ truyện = Cart, quyển truyện = BookCopy, đầu truyện = Book, truyện đã chọn = SelectedBook, quyển đã giao = RentedBook, lỗi = Damage, loại tài sản cọc = Collateral, khoản cọc = RentalCollateral…), `schema.md` (ERD `erDiagram` Mermaid và bảng cột máy đọc được cho SchemaConformanceTest ở phase 3), `page-flow.md` (luồng trang `flowchart` Mermaid theo ch.9, ch.10), `design-tokens.md` (bảng màu, font, spacing của brainstorm §7), `data-pipeline.md` (khung, phase 4 điền), `dev-accounts.md`, `adr/0001`… ít nhất: JSP-DAO không controller, D1 password 255, Jakarta EE 11 + Tomcat 11.0.27 + Java 25 (kèm nguồn và ngày tra phiên bản), island cách B, K1, Redis/Redisson (D7), Password4j Argon2id, Flyway qua listener, Motion thay GSAP, nguồn dữ liệu (D11), font tự host, pipeline bằng Node.

## Lane trong phase

2A chạy một mình trước (hợp đồng). Sau đó 2B, 2C, 2D song song (3 chỗ). Không có lane thứ 4.

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 2A `hop-dong` | `docs/contracts.md`, `AGENTS.md`, `CLAUDE.md` | `t1k-docs-manager` | ba file trên (lane tạo lần đầu; sau khi orchestrator duyệt và commit, chúng thành file dùng chung theo `contract.md` §8) | phase 1 |
| 2B `docs` | Mọi file `docs/**` còn lại, kể cả `docs/adr/**` | `t1k-docs-manager` | `docs/**` trừ `docs/contracts.md` | 2A, 2.1 |
| 2C `rules` | 5 rule | `t1k-rules-manager` | 5 file `.claude/rules/` ở dòng Owns | 2A, 2.1 |
| 2D `skills` | 8 skill và agent `tiem-contract-guard` | `t1k-skills-manager` | 8 thư mục `.claude/skills/tiem-<tên>/`, `.claude/agents/tiem-contract-guard.md` | 2A, 2.1 |

Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent. File của kit đang có trong `.claude/` không được sửa; chúng bị ignore trong git, chỉ file `tiem-*` vào repo (Deferred #4).

## Tiêu chí hoàn thành

1. `node scripts/check/section10-sync.mjs` exit 0; sửa một kí tự trong khối của rule thì exit 1 (đã thử có chủ đích, ghi báo cáo).
2. `contracts-doc.test.mjs`: `docs/contracts.md` có đủ 28 tên trang (danh sách cố định từ brief §3), đủ 28 thông báo nguyên văn (từ brainstorm §2.2), đủ 13 bảng, đủ hàm DAO của brainstorm §2.3, đủ 12 thuộc tính session, đủ props 4 island.
3. `skills-frontmatter.test.mjs`: 8 skill và agent có frontmatter hợp lệ, `name` khớp tên thư mục hoặc tên file và bắt đầu bằng `tiem-`, `description` không rỗng; agent có `model: opus`. Sau merge, `git ls-files .claude` chỉ có 5 rule, 8 thư mục skill và 1 agent mang tiền tố `tiem-`, không file nào của kit.
4. Mọi khối Mermaid trong `docs/*.md` render được bằng `@mermaid-js/mermaid-cli` (phiên bản tra npm lúc dùng).
5. `CLAUDE.md` có dòng `@AGENTS.md`; `AGENTS.md` có mọi lệnh ở mục "lệnh chạy" và các lệnh đó chạy được ở trạng thái hiện tại (lệnh của phase sau ghi rõ "có từ phase N").
6. Lần chạy thử `tiem-contract-guard` báo đủ hai vi phạm cố ý.
7. Accept phase 1 vẫn xanh (chống thoái lui: `plan-contract.test.mjs`, compose healthy).

## Kết quả (11/11/2026)

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| 1 | `section10-sync.mjs` exit 0; làm đỏ có chủ đích: sửa một kí tự trong khối của rule → exit 1 kèm byte lệch (test tự động, cùng với một kí tự trong khối brief §3 của `AGENTS.md`) | `scripts/check/section10-sync.test.mjs` |
| 2 | 28 trang, 28 thông báo, 13 bảng, 9 dòng DAO và 15 hàm, 12 thuộc tính session, props 4 island; danh sách đọc từ brief, brainstorm, `contract.md`, không chép trong test; làm đỏ đã thử bằng cách xoá một câu | `scripts/check/contracts-doc.test.mjs` |
| 3 | 8 skill, 1 agent, 5 rule hợp lệ; `git ls-files .claude` chỉ có file `tiem-*` | `scripts/check/skills-frontmatter.test.mjs` |
| 4 | Mọi khối Mermaid trong `docs/**` render bằng `@mermaid-js/mermaid-cli@12.2.0` | Accept bước 4 |
| 5 | `CLAUDE.md` mở đầu bằng `@AGENTS.md`; 38 lệnh ở bảng "Lệnh chạy", mọi đường dẫn và script npm của lệnh đã có từ phase 1–2 tồn tại | Accept bước 5 |
| 6 | `tiem-contract-guard` báo đúng 2 vi phạm: `BookDAO.java:32` (G1 + G5) và `V1__schema.sql:6` (G3 + G5) | `plans/reports/phase-02-tiem-contract-guard-dryrun-261111-0423.md` |
| 7 | Accept phase 1 chạy lại trong Accept phase 2, compose healthy | Accept bước 7 |

Thêm ngoài kế hoạch: `section10-sync.mjs` so cả khối nguyên văn brief §3 trong `AGENTS.md`; `schema-doc-sync.test.mjs` giữ bảng cột của `docs/schema.md` khớp từng kí tự với `docs/contracts.md` §2; `tblCart.clientId` ghi UNIQUE ngay trong ô khoá.

Lệch kế hoạch: 2A chạy sớm trên nền `phase/01-khung` (chỉ tài liệu) rồi merge vào nhánh phase 2; 13 điểm "Chưa chốt" C1–C13 do orchestrator chốt theo uỷ quyền chủ dự án cho phiên này (`docs/contracts.md` §14); Deferred #29 ở `plan.md`.

Để lại cho phase sau (đã ghi trong tài liệu, không phải nợ của phase 2): tham số Argon2id (phase 3, ADR-0007); token giao diện ở `docs/design-tokens.md` là đề xuất, phase 5 đo tương phản rồi chốt; lệnh test của pipeline chốt ở phase 4; mật khẩu tài khoản mẫu `<username>@123` (`docs/dev-accounts.md`) chỉ cho localhost.

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-02.mjs` chạy tiêu chí 1–5 và 7. Tiêu chí 6 do bước 2.5 ghi báo cáo.

## Playwright MCP

Không áp dụng: phase này không tạo trang web nào.

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `docs/contracts.md` sót field hoặc thuộc tính session của ch.9 | medium | high | Lane 2A đọc ch.9 từng trang (trang in 56–86) và đối chiếu SVG; `contracts-doc.test.mjs` kiểm danh sách; phase 6, 7 dừng và báo nếu thấy thiếu |
| §10 bị diễn giải lại thay vì chép nguyên văn | medium | high | So từng byte với brief, không cho sửa tay |
| Skill dự án trùng tên hoặc lấn skill của kit | low | medium | Tên mang tiền tố `tiem-` (kit dùng `t1k-`), kiểm thư mục chưa tồn tại trước khi tạo |
| Mermaid lỗi cú pháp | medium | low | Render bằng mermaid-cli trong Accept |

## Rollback

`git revert -m 1 <merge phase 2>`; phase này chỉ thêm tài liệu và script, không đụng mã chạy.

## Ước lượng

Effort L: khoảng 5–8 giờ agent (ESTIMATED: 2A khoảng 2 giờ vì phải đọc kĩ ch.9; 2B–2D song song khoảng 2–3 giờ; tích hợp và chạy thử tiem-contract-guard khoảng 1 giờ).
