# Tiệm truyện: điều phối phiên cook (luôn nạp)

Rule của dự án, không phải của kit (không sync-back). Khối nguyên văn bên dưới là toàn văn brief §10, sinh bằng script, không sửa tay; `node scripts/check/section10-sync.mjs` so từng byte với `prompt-web-tiem-thue-truyen.md` và `AGENTS.md`. "File hợp đồng chung" mà brief nhắc tới là `docs/contracts.md` (cộng file phase đang làm).

<!-- BEGIN brief-section-10 -->
## 10. Tự động hoá và điều phối agent

Ghi toàn bộ mục này vào `CLAUDE.md`, `AGENTS.md` và một rule riêng trong `.claude/rules/`, để mọi phiên cook sau đều làm theo, kể cả sau khi phiên bị compact.

**Công cụ tự động.** Việc gì máy làm được thì máy làm, không đẩy sang tôi.
- Playwright MCP: làm xong mỗi trang hay mỗi chức năng thì mở web thật, đi lại kịch bản chuẩn và các ngoại lệ của chương 2, chụp màn hình ở khổ điện thoại và máy tính, đọc console và network. Chỉ khi console sạch và không có request hỏng mới tính là xong. Bộ test Playwright trong repo vẫn chạy trong CI như mục 7.
- cua-driver MCP: dùng khi cần thao tác phần mềm có giao diện trên Windows, ví dụ mở MySQL Workbench để reverse engineer schema rồi so ERD với chương 8. Việc nào làm được bằng dòng lệnh (`mysql` trong container, Flyway) thì dùng dòng lệnh. Sau mỗi lần bấm phải kiểm lại bằng `verify_state`, lệnh bấm không báo lỗi chưa có nghĩa là đã xong.
- context7 MCP để tra tài liệu thư viện.
- MCP nào chưa nạp trong phiên thì báo tôi khởi động lại, không lặng lẽ đổi sang cách khác yếu hơn.

**Mô hình điều phối của mỗi phiên cook.**
- Phiên chính là orchestrator: chia việc, giao việc, gom kết quả, cập nhật kế hoạch. Phần đã giao cho subagent thì orchestrator không tự làm lại.
- Đầu phiên, orchestrator tạo hoặc đọc lại agent map của phase (ví dụ `plans/<plan>/agent-map.md`). Mỗi lane ghi: làm việc gì, subagent nào nhận, được sửa những file nào, phụ thuộc lane nào, trạng thái. Giao hay nhận việc xong là cập nhật file này.
- Subagent dùng cùng model và cùng effort với orchestrator. Mọi lần spawn đều truyền rõ `model` và `effort` (effort lấy theo biến môi trường `CLAUDE_EFFORT`), không để agent tự rơi về model rẻ hơn.
- Tối đa 3 subagent chạy cùng lúc, tính cả agent con: subagent không tự spawn thêm agent. Từ việc độc lập thứ 4 trở đi thì xếp hàng, xong một lane mới mở lane tiếp theo. Luật này đè lên mức song song mặc định của kit.
- Trước khi chia việc song song, chốt hợp đồng chung vào một file: tên trang, tên field form (txtUsername...), tên thuộc tính session, chữ kí hàm DAO, props của island. Brief của mọi subagent trỏ tới file đó.
- Các subagent cùng sửa code thì mỗi lane một git worktree, hoặc một danh sách file không chồng nhau ghi rõ trong brief. File dùng chung (`pom.xml`, `package.json`, `web.xml`, migration) chỉ orchestrator sửa.

**Giữ bối cảnh khi phiên bị compact.**
- Kế hoạch, agent map, hợp đồng và báo cáo nằm trên đĩa. Chúng là nguồn sự thật, trí nhớ của phiên thì không. Sau mỗi lần compact, việc đầu tiên là đọc lại `CLAUDE.md`, agent map và file phase đang làm.
- Brief của subagent ngắn: việc cần làm, ràng buộc quyết định, đường dẫn file để nó tự đọc. Không dán nguyên nội dung file hay lịch sử chat vào brief.
- Subagent ghi kết quả chi tiết vào `plans/reports/`, chỉ trả về orchestrator bản tóm tắt ngắn kèm đường dẫn.
- Xong bước nào thì đánh dấu ngay trong file phase. Context gần đầy thì commit, lưu handoff (`/t1k:handoff save`) rồi mới làm tiếp.

**Chạy nền, không ngồi chờ.**
- Subagent spawn ở chế độ nền. Lệnh chạy lâu (build Maven, `docker compose up --build`, bộ test, pipeline crawl) cũng chạy nền.
- Trong lúc chờ, orchestrator làm việc không phụ thuộc: đọc báo cáo vừa về, soạn brief cho lane sau, cập nhật kế hoạch. Không dùng sleep để hỏi trạng thái liên tục, đợi thông báo xong việc.

<!-- END brief-section-10 -->

## Luật spawn của dự án (`plans/261111-tiem-thue-truyen/contract.md` §1, §8, §9)

- Mọi spawn (`Agent`, `Task`): `model: "opus"`, `effort` = giá trị biến môi trường `CLAUDE_EFFORT` lúc spawn, `run_in_background: true`; ghi rõ cả khi frontmatter của agent ghim tier khác.
- Tối đa 3 agent chạy cùng lúc trên toàn phiên; agent con không spawn agent; việc thứ 4 trở đi xếp hàng trong `agent-map.md`.
- Hợp đồng (`docs/contracts.md`, file phase) được commit **trước** khi chia lane; brief trỏ đường dẫn, không dán nội dung.
- Mỗi lane sửa code một worktree `D:/Coding/mangastore-wt/<0N>-<lane>` trên nhánh `lane/0N-<slug>/<lane>`, do orchestrator tạo; lane chỉ commit tại máy (pathspec), không push, không đổi nhánh.
- File dùng chung (`contract.md` §8: `pom.xml`, `package.json`, `web.xml`, `src/main/resources/db/**`, `AGENTS.md`, `CLAUDE.md`, `docs/contracts.md`…) chỉ orchestrator sửa; lane ghi đề xuất vào báo cáo.
- Lane ghi báo cáo `plans/reports/<phase>-<lane>-<yymmdd-hhmm>.md` và trả về tối đa 15 dòng kèm trạng thái DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT.
