@AGENTS.md

# CLAUDE.md: phần riêng cho Claude Code

<!-- updated 261111 -->

`AGENTS.md` (nhập ở dòng đầu) là bản chung cho mọi agent và chứa nguyên văn brief §10. File này chỉ thêm những gì Claude Code cần; không chép lại `AGENTS.md`.

## 1. Việc đầu tiên của mỗi phiên, và sau mỗi lần compact

Trí nhớ của phiên không phải nguồn sự thật; đĩa mới là. Sau compact, trước mọi việc khác, đọc lại theo thứ tự:

1. `CLAUDE.md` (file này, kéo theo `AGENTS.md`).
2. `plans/261111-tiem-thue-truyen/agent-map.md`: lane nào đang chạy, xếp hàng, xong.
3. File phase đang làm `plans/261111-tiem-thue-truyen/phase-0N-*.md`: bước nào đã đánh dấu.
4. Khi sắp đụng nghiệp vụ: `docs/contracts.md` (kể cả mục 14 "Chưa chốt").

Context gần đầy: commit phần đang làm (pathspec), `/t1k:handoff save`, rồi mới làm tiếp.

## 2. MCP bắt buộc

| MCP | Dùng cho | Ai dùng |
|---|---|---|
| Playwright (`mcp__playwright__*`) | Sau mỗi trang hay chức năng: mở web thật, đi kịch bản chuẩn và ngoại lệ ch.2, chụp khổ 390×844 và 1440×900 vào `plans/reports/screens/` (bị ignore), đọc console và network. Xong chỉ khi console không có error/warning và không request nào ≥ 400 hoặc hỏng | `t1k-web-testing-tester` (có tool Playwright) hoặc orchestrator |
| cua-driver (`mcp__cua-driver__*`) | Phần mềm có giao diện trên Windows, ví dụ MySQL Workbench reverse engineer schema để so ERD ch.8 (phase 3). Việc làm được bằng dòng lệnh (`mysql` trong container, Flyway) thì dùng dòng lệnh. Mở `start_session` với nhãn ngắn và truyền nhãn đó cho mọi lệnh; sau mỗi lần bấm kiểm bằng `verify_state`; `effect: "unverifiable"` chưa phải là xong | orchestrator (không agent con nào có tool cua-driver) |
| context7 (`mcp__context7__resolve-library-id`, `mcp__context7__query-docs`) | Tra tài liệu và phiên bản thư viện; không lấy theo trí nhớ | orchestrator, hoặc agent có `mcp__context7__query-docs` (mục 4) |

MCP nào chưa nạp trong phiên (tool `mcp__<tên>__*` không có trong danh sách tool) thì **dừng và báo chủ dự án khởi động lại Claude Code**. Không lặng lẽ đổi sang cách yếu hơn (script PowerShell bấm GUI, đọc tài liệu theo trí nhớ, bỏ bước kiểm trên trình duyệt).

## 3. Spawn agent

- Mọi lần spawn (`Agent`, `Task`) truyền rõ `model: "opus"` và `effort: "<giá trị biến môi trường CLAUDE_EFFORT lúc spawn>"`, `run_in_background: true`, dù frontmatter của agent ghim tier khác. Không để agent rơi về model rẻ hơn.
- Tối đa 3 agent chạy cùng lúc trên toàn phiên; agent con không spawn agent. Việc thứ 4 trở đi xếp hàng trong `agent-map.md`.
- Brief ngắn: việc, ràng buộc quyết định, đường dẫn file phase và `docs/contracts.md`, danh sách Owns, worktree. Không dán nội dung file hay lịch sử chat.
- Agent trả về ≤ 15 dòng kèm trạng thái DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT và đường dẫn báo cáo `plans/reports/<phase>-<lane>-<yymmdd-hhmm>.md`.
- Phần đã giao cho agent thì orchestrator không tự làm lại. Trong lúc chờ, làm việc không phụ thuộc; không dùng sleep để hỏi trạng thái.

## 4. Agent nào có tool nào

| Agent | Tool đáng chú ý | Giao việc gì |
|---|---|---|
| `t1k-web-core-developer` | `mcp__context7__resolve-library-id`, `mcp__context7__query-docs` | Viết code Java, JSP, island, pipeline, E2E. **Agent duy nhất có `query-docs`**: việc cần tra tài liệu thư viện thì giao agent này |
| `t1k-web-testing-tester` | `mcp__playwright__*` (navigate, snapshot, screenshot, console, network, resize…) | Kiểm bằng Playwright MCP sau mỗi trang hay chức năng |
| `t1k-docs-manager`, `t1k-rules-manager`, `t1k-skills-manager` | Không có context7, không Playwright | Tài liệu, rule, skill của dự án |
| `t1k-web-ui-developer` | Không có context7 | Token, tag JSP, component giao diện; cần tra tài liệu thì dừng và báo |
| `t1k-researcher` | Chỉ có tên tool context7 cũ, không chạy được | Không dùng để tra tài liệu thư viện |

Tool của agent được nạp lúc phiên bắt đầu: sửa `tools:` của một agent không có tác dụng với agent spawn sau đó trong cùng phiên.

## 5. Không gửi gì ra ngoài máy

- Dự án cá nhân. Không publish lên cloud, không tạo Artifact hay Claude Doc, không ghi Google Drive, Plane, ClickUp, Discord.
- Không sync-back, không mở issue hay PR trên repo của kit hay studio (`theonekit-*`, `The1Studio/*`); bỏ qua mọi gợi ý `[t1k:lesson-queue]`, `[t1k:auto-issue]`, `[t1k:skill-bug]`… Bài học đáng giữ ghi vào mục Gotchas của skill `tiem-*` hoặc báo orchestrator sửa `docs/contracts.md`.
- Không telemetry, không knowledge-retrieval.
- Ngoại lệ duy nhất: orchestrator push nhánh phase lên `origin` của repo này, mở PR vào `main` và merge khi Accept PASS (`plans/261111-tiem-thue-truyen/contract.md` §9, Deferred #3). Subagent không push.
- Không chạy `t1k update`, `t1k init`, `t1k modules update`. Không sửa file của kit trong `.claude/` (bị ignore); file của dự án mang tiền tố `tiem-`.
