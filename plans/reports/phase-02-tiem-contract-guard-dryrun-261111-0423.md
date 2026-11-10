# Phase 2, bước 2.5: chạy thử tiem-contract-guard

Ngày 11/11/2026. Tiêu chí 6 của phase 2: **ĐẠT** (báo đủ hai vi phạm cố ý, đúng dòng).

## Cách chạy

- Diff cố ý sai nằm trên nhánh cục bộ `dryrun/02-contract-guard` (worktree `D:/Coding/mangastore-wt/02-dryrun`, không push, không merge, xoá sau phase): thêm `src/main/java/vn/tiemtruyen/dao/BookDAO.java` có hàm `getBookById(int id)` và `src/main/resources/db/migration/V1__schema.sql` có cột `quantity` trong `tblSelectedBook`. Nhánh được merge `phase/02-bo-cong-cu-ai` trước khi chạy để có đủ rule và agent; diff kiểm là `phase/02-bo-cong-cu-ai...HEAD` (55 dòng thêm, 2 file).
- Agent `tiem-contract-guard` mới tạo trong phiên nên chưa có trong danh sách agent của phiên (registry chụp lúc mở phiên). Orchestrator spawn một agent opus (effort high) chỉ dùng Read, Grep, Glob, Bash, đưa file `.claude/agents/tiem-contract-guard.md` làm toàn bộ chỉ dẫn, **không** nói trước diff có lỗi gì.

## Kết quả của agent

Báo cáo gốc: `plans/reports/tiem-contract-guard-261111-0421.md`. Kết luận: 2 vi phạm, 2 cảnh báo.

| # | Vị trí | Mã | Mục hợp đồng | Đúng kì vọng |
|---|---|---|---|---|
| 1 | `src/main/java/vn/tiemtruyen/dao/BookDAO.java:32` (`getBookById(int id)`) | G1 + G5 | §5.1, §5.3 | có |
| 2 | `src/main/resources/db/migration/V1__schema.sql:6` (cột `quantity` của `tblSelectedBook`) | G3 + G5 | §1, §2 | có |

Cảnh báo (không tính): `searchBook` không nạp `listBookCopy` (§3, §5.3); `CREATE TABLE` thiếu InnoDB/utf8mb4/collation (§2). Cả hai đúng là lỗi thật của diff mẫu.

## Điểm định nghĩa chưa rõ agent nêu ra và đã sửa

1. Lệnh ghi báo cáo dùng heredoc: ghi rõ chạy qua tool Bash, không phải PowerShell.
2. Lệch `docs/contracts.md` không thuộc G1–G8: ghi rõ là cảnh báo, kèm mục hợp đồng.
3. Thân hàm bị cấm có tính riêng không: ghi rõ chỉ tính dòng khai báo.

Lần chạy sau ở phiên mới dùng thẳng `subagent_type: "tiem-contract-guard"`.
