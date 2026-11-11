# Phase 05, lane tài liệu font: đổi bộ font theo chủ dự án (11/11/2026)

Trạng thái: DONE

## Đã sửa

| File | Nội dung |
|---|---|
| `docs/design-tokens.md` §2 | Bảng font mới (thêm cột gói Fontsource 5.3.0), câu subset vietnamese và OFL-1.1, ghi chú `tabular-nums` cho Momo Trust Sans, câu nạp bằng `check-font-subsets.mjs --sync`; "Đã loại" thêm bốn font cũ (chủ dự án đổi ngày 11/11/2026), Special Elite giữ lí do cũ |
| `docs/adr/0011-font-tu-host.md` | Mục Quyết định không còn khẳng định bộ cũ là hiện hành (trỏ mục cập nhật, ghi bộ ban đầu đã bị thay); mục Cập nhật phase 5 giữ dòng preload cũ làm lịch sử kèm ghi chú; thêm mục "Cập nhật 11/11/2026: đổi bộ font theo chủ dự án" (bộ mới, lí do, preload mới, tabular-nums, cách nạp không đổi); bảng Phương án đã loại thêm bộ ban đầu |
| `.claude/rules/tiem-ui-theme.md` | Tên bốn font mới, preload Fuzzy Bubbles 400 và Momo Trust Sans, tabular-nums |
| `.claude/skills/tiem-create-nostalgia-component/SKILL.md` | Bước 3 (tên font, preload, trỏ design-tokens §2); Gotchas thêm mục Momo Trust Sans không đơn cách |
| `plans/261111-tiem-thue-truyen/phase-05-ui-contract.md` | §1 nhóm Font ghi font của từng biến (giữ cột cũ, không thêm cột); §3 `layout.tag` preload mới |
| `plans/261111-tiem-thue-truyen/phase-05-he-thiet-ke-giao-dien.md` | Mục tiêu, bước 5.0 (gói mới + câu ghi quyết định đổi font), lane 5A (preload), tiêu chí 3 (tên bốn họ font), rủi ro font (thêm rủi ro không đơn cách) |
| `plans/261111-tiem-thue-truyen/plan.md` | Deferred #17: bộ font mới, Fraunces ghi là bộ ban đầu đã bỏ |

## Kiểm

- `grep -rnE "Be Vietnam|Xanh Mono|Patrick Hand|Fraunces" docs .claude/rules/tiem-*.md .claude/skills/tiem-* plans/261111-tiem-thue-truyen`: còn 7 dòng, đều là lịch sử hoặc "đã loại" (ADR-0011 dòng 14, 30, 36, 40; design-tokens dòng 43; phase-05 bước 5.0; plan.md Deferred #17).
- `node --test "scripts/check/*.test.mjs"`: 56 pass, 0 fail.
- `node scripts/check/section10-sync.mjs`: PASS.
- `AGENTS.md`, `CLAUDE.md`, `docs/contracts.md`, `README.md`, `.claude/agents/tiem-*`, `scripts/`: không có tên font cũ, không cần đề xuất.

## Lưu ý

- Tiêu chí 6 và chuỗi thử "ở cả bốn font" giữ nguyên câu (không nêu tên font), vẫn đúng với bộ mới.
- Bước 5.0 đã đánh dấu `[x]` từ trước; câu gói font giờ mô tả bộ mới, việc cài gói thật do lane code làm song song.

## Bổ sung: font số Nunito (`--font-num`)

Trạng thái: DONE. Theo yêu cầu của orchestrator: Momo Trust Sans và Fuzzy Bubbles không có `tnum`, chủ dự án giao chọn font số; đã chọn Nunito (`@fontsource/nunito` 5.3.0, 400/700, nạp lười).

| File | Nội dung |
|---|---|
| `docs/design-tokens.md` §2 | Thêm dòng `--font-num` vào bảng; `--font-type` chỉ còn chữ trong dấu, tiêu đề phiếu, nhãn gáy; đoạn về `tnum` (commit f05c0cd) ghi đã giải bằng `--font-num`; "bốn" thành "năm" font |
| `docs/adr/0011-font-tu-host.md` | Mục Cập nhật 11/11/2026 thêm Nunito (lí do, số đo 600 đơn vị, nạp lười, phạm vi dùng); lí do loại M PLUS Rounded 1c, Livvic, Varela Round vào bảng Phương án đã loại; Hệ quả "năm font" |
| `.claude/rules/tiem-ui-theme.md` | Thêm Nunito `font-num`, bỏ ý `tabular-nums` |
| `.claude/skills/tiem-create-nostalgia-component/SKILL.md` | Bước 3 thêm Nunito; bước 10 "năm font"; Gotchas thay ý `tabular-nums` bằng "Số và mã dùng `font-num`" |
| `plans/261111-tiem-thue-truyen/phase-05-he-thiet-ke-giao-dien.md` | Lane 5A (Nunito nạp lười, "năm font"), tiêu chí 3 và 6 "năm họ font", rủi ro không đơn cách ghi đã giải bằng Nunito |

Kiểm: `node --test "scripts/check/*.test.mjs"` 56 pass, 0 fail; `node scripts/check/section10-sync.mjs` PASS. Không sửa `phase-05-ui-contract.md` (orchestrator đã sửa §1).
