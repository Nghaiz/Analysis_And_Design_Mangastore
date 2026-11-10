---
name: tiem-open-cook-session
description: Dùng đầu mỗi phiên cook hoặc sau compact: đọc CLAUDE.md, agent-map, file phase; giao tối đa 3 lane trên worktree riêng; gom tóm tắt; cập nhật phase và agent map.
effort: high
---

# Mở một phiên cook (orchestrator)

Phiên chính là orchestrator: chia việc, giao việc, gom kết quả, cập nhật kế hoạch; phần đã giao thì không tự làm lại. Luật gốc là brief §10 (nguyên văn trong `AGENTS.md` §11 và `.claude/rules/tiem-cook-orchestration.md`); skill này là thứ tự thao tác.

## Đọc trước (mỗi đầu phiên và ngay sau mỗi lần compact)

1. `CLAUDE.md` (nhập `AGENTS.md`).
2. `plans/261111-tiem-thue-truyen/agent-map.md`: lane đang chạy, hàng đợi, nhật kí.
3. File phase đang làm `plans/261111-tiem-thue-truyen/phase-0N-*.md`: bước nào đã đánh dấu, bảng "Lane trong phase", tiêu chí hoàn thành.
4. `plans/261111-tiem-thue-truyen/contract.md` §1 (spawn), §8 (file dùng chung), §9 (git).

Trạng thái thật lấy từ đĩa và git, không từ trí nhớ: `git status --short`, `git branch --show-current`, `git worktree list`, `git log --oneline -5`.

## Các bước

1. **Kiểm MCP:** Playwright, cua-driver, context7 phải nạp trong phiên. Thiếu cái nào → báo chủ dự án khởi động lại, không lặng lẽ đổi cách yếu hơn.
2. **Nhánh phase:** `git fetch origin`, rồi `git switch -c phase/0N-<slug> origin/main` (đã có thì `git switch phase/0N-<slug>`). Chỉ orchestrator đổi nhánh.
3. **Chốt hợp đồng trước khi chia lane:** làm bước `N.0` của phase (file dùng chung, hợp đồng, Accept), **commit** lên nhánh phase. Worktree tạo từ commit đó; file chưa commit thì lane không đọc được.
4. **Chọn lane:** tối đa **3** agent chạy cùng lúc trên toàn phiên (kể cả khi hai phase chạy song song); agent con không spawn agent. Lane thứ 4 trở đi ghi vào "Hàng đợi" của agent map. Owns của các lane không chồng nhau; file dùng chung (§8) chỉ orchestrator sửa.
5. **Một worktree cho mỗi lane sửa code:**
   `git worktree add D:/Coding/mangastore-wt/0N-<lane> -b lane/0N-<slug>/<lane> phase/0N-<slug>`
   Lane kiểm (chỉ ghi `plans/reports/`) có thể chạy trên cây của nhánh phase.
6. **Ghi agent map trước khi spawn:** thêm dòng "Đang chạy" (lane, agent, giờ bắt đầu, worktree / nhánh), đổi trạng thái lane, thêm dòng nhật kí.
7. **Spawn** mỗi lane một agent, chạy nền:
   - `subagent_type`: agent ghi ở bảng lane của phase; `name` là tên loại agent, không phải tên việc.
   - `model: "opus"`, `effort: "<giá trị $CLAUDE_EFFORT>"` (đọc biến môi trường lúc spawn; rỗng → hỏi chủ dự án), `run_in_background: true`.
   - Brief ngắn, chỉ đường dẫn, không dán nội dung file hay lịch sử chat: việc; worktree và nhánh (đã checkout, không đổi nhánh); Owns; file phải đọc; ràng buộc quyết định; đường dẫn báo cáo `plans/reports/phase-0N-<lane>-<yymmdd-hhmm>.md`; commit pathspec tại máy, không push, không spawn agent, không sync-back hay issue; trả về **≤ 15 dòng**: trạng thái DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, SHA commit, đường dẫn báo cáo.
8. **Chờ, không hỏi liên tục:** không `sleep`, không poll; trong lúc chờ đọc báo cáo vừa về, soạn brief lane sau, cập nhật kế hoạch.
9. **Gom kết quả mỗi lane về:**
   - đọc tóm tắt rồi báo cáo; SHA đọc lại bằng `git log -1 --format=%H lane/0N-<slug>/<lane>`;
   - BLOCKED / NEEDS_CONTEXT: đổi điều kiện (thêm bối cảnh, chia nhỏ) rồi mới giao lại; hỏng 3 lần → hỏi chủ dự án;
   - merge: `git merge --no-ff lane/0N-<slug>/<lane>` trên nhánh phase; xung đột → dừng, không tự giải bừa;
   - chạy lệnh kiểm của phần vừa merge; áp đề xuất sửa file dùng chung mà lane ghi trong báo cáo;
   - dọn: `git worktree remove D:/Coding/mangastore-wt/0N-<lane>` (không `--force`), `git branch -d lane/0N-<slug>/<lane>`;
   - đánh dấu ngay bước trong file phase và trạng thái lane trong agent map; mở lane tiếp theo trong hàng đợi.
10. **Kiểm hợp đồng:** chạy agent `tiem-contract-guard` trên diff của phase (base `origin/main`) ở bước phase yêu cầu; vi phạm thì brief lại lane sở hữu.
11. **Cuối phase:** chạy Accept `node scripts/accept/phase-0N.mjs`; PASS thì `git push -u origin phase/0N-<slug>`, `gh pr create --base main`, `gh pr merge <số> --merge --delete-branch`, `git switch main && git pull --ff-only` (`contract.md` §9).
12. **Không gửi gì ra ngoài máy** ngoài push nhánh phase và PR của repo này: không Plane, không issue hay sync-back lên kit, không telemetry, không Discord.
13. **Context gần đầy:** commit việc đang dở, `/t1k:handoff save`, rồi mới làm tiếp.

## Gotchas

- Git không cho nhánh `phase/0N-<slug>/<lane>` khi đã có `phase/0N-<slug>`; nhánh lane luôn là `lane/0N-<slug>/<lane>`.
- Danh sách agent được chụp lúc phiên bắt đầu: agent `.md` vừa tạo hay sửa (ví dụ `tiem-contract-guard`) chỉ gọi được sau khi khởi động lại phiên.
- Ba lane cùng sửa một file "không ai sở hữu" (registry, hằng, cấu hình) ghi đè nhau không báo lỗi; trước khi chia lane, liệt kê file như vậy và giao đích danh cho một lane hoặc giữ cho orchestrator.
- Không `git stash`, không `git add .`, không force-push; commit dạng pathspec `git commit -m "..." -- <đường dẫn>`.
- Thông điệp commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; mô tả PR kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Lane về DONE chưa phải xong: chỉ xong khi đã merge, lệnh kiểm xanh và file phase đã đánh dấu.
- Phase 4 có HARD STOP (bước 4.5): hỏi chủ dự án bằng câu hỏi lựa chọn, không crawl hết khi chưa có trả lời.

## Lệnh kiểm

| Việc | Lệnh | Có từ |
|---|---|---|
| Worktree và nhánh lane đang có | `git worktree list` | phase 1 |
| Commit cuối của một lane | `git log -1 --format='%H %s' lane/0N-<slug>/<lane>` | phase 1 |
| Biến effort để truyền khi spawn | `echo "$CLAUDE_EFFORT"` | phase 1 |
| Test các script kiểm | `node --test "scripts/check/*.test.mjs"` | phase 1 |
| Khối brief §10 khớp từng byte | `node scripts/check/section10-sync.mjs` | phase 2 |
| Accept của phase | `node scripts/accept/phase-0N.mjs` | phase 1 |

## Danh sách kiểm tra

- [ ] Đã đọc lại `CLAUDE.md`, agent map, file phase; trạng thái git khớp agent map.
- [ ] MCP đủ, hoặc đã báo chủ dự án khởi động lại.
- [ ] Hợp đồng và bước `N.0` đã commit trước khi tạo worktree.
- [ ] Không quá 3 agent cùng lúc; lane thừa nằm ở hàng đợi.
- [ ] Mỗi lane sửa code một worktree `D:/Coding/mangastore-wt/0N-<lane>` trên `lane/0N-<slug>/<lane>`.
- [ ] Agent map cập nhật trước khi spawn và ngay khi lane về.
- [ ] Mọi spawn có `model: "opus"`, `effort` từ `CLAUDE_EFFORT`, chạy nền; brief chỉ đường dẫn.
- [ ] Tóm tắt ≤ 15 dòng đã đọc, SHA đã đọc lại, lane đã merge và dọn worktree.
- [ ] File phase đánh dấu từng bước ngay khi xong.
- [ ] Ngoài push và PR của phase, không gì rời khỏi máy.
