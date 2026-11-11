# Làm mới giao diện (chủ dự án yêu cầu 11/11/2026)

Chủ dự án: giao diện khó thao tác, trống, căn lệch; "đừng hardcode dựa vào báo cáo nữa", cần thêm giao diện cải thiện trải
nghiệm. Đã xong ở commit `08ba2ee` (đọc làm mẫu): `WEB-INF/tags/layout.tag` (đầu trang có điều hướng theo vai, nút
Đăng xuất `btnLogout`, chân trang), `ClientHomeView.jsp`, `nhan-vien/StaffHomeView.jsp`, `HomeView.jsp`.

## Lớp CSS có sẵn (frontend/src/styles/components.css, paper.css)

`tt-hero` (+ `__eyebrow`, `__title`, `__lead`, `__actions`, `__art`), `tt-section-title`, `tt-action-grid`,
`tt-action-card` (+ `--red`, `--green`, `__icon`, `__body`, `__title`, `__desc`, `__go`), `tt-steps` / `tt-step`
(+ `__title`, `__desc`), `tt-btn` (+ `--primary`, `--ghost`, `--sm`), `tt-paper-card`, `tt-ticket`, `tt-stamp`,
`tt-ledger-table`, `tt-message-box`, `tt-condition-tag`, `tt-book-cover`, `tt-typed`, `tt-pen`, `tt-sign`, `tt-tape`,
`tt-worn`. Tag `WEB-INF/tags/ui/*.tag`. Thêm: tiện ích Tailwind (token ở `frontend/src/styles/tokens.css`: `bg-paper`,
`bg-paper-deep`, `bg-tape`, `text-ink`, `text-ink-soft`, `text-primary`, `border-ink-soft`, `shadow-paper`,
`rounded-paper`, `font-num`, `font-sign`, `font-type`...). Tailwind quét JSP nên lớp tiện ích dùng được ngay.

## Được làm

- Bố cục rõ ràng, căn đều: khung trang gọn (`mx-auto max-w-*`), đầu trang có tiêu đề và một dòng mô tả ngắn nói trang
  dùng để làm gì, nút "Quay lại" hay đường dẫn ngược rõ ràng, form chia nhóm trong thẻ giấy, nhãn rõ, gợi ý định dạng
  ngắn dưới ô nhập, nút chính nổi bật (`tt-btn tt-btn--primary`), bảng có khung `overflow-x-auto`, trạng thái rỗng có
  chữ hướng dẫn, biểu tượng SVG nội tuyến (`aria-hidden="true"`, `stroke="currentColor"`). Chạy tốt ở 390 px và 1440 px.
- Chữ trợ giúp mới bằng tiếng Việt, đúng nghiệp vụ hiện có (không hứa tính năng không có).

## Cấm (vi phạm là hỏng E2E, smoke hoặc Accept)

- Chỉ sửa file trong danh sách Owns của lane. Không sửa `layout.tag`, CSS, Java, `web.xml`, migration, `docs/`, test.
- **Không đổi** `id`, `name`, `value`, `action`, `formaction`, `method` của form, input, nút, link, bảng; không đổi
  logic scriptlet, thuộc tính session, lời gọi DAO, thứ tự xử lí. Chỉ đổi markup trình bày và lớp CSS.
- **Không đổi chữ** mà test bám vào: trước khi sửa một trang, grep `e2e/` và `scripts/smoke/` theo tên trang, id và
  chữ hiển thị của trang đó (nhãn ô, chữ nút, tiêu đề, caption bảng, câu thông báo). Giữ nguyên đúng từng chữ, kể cả
  dấu hai chấm. Không thêm phần tử thứ hai cùng accessible name với nút hay link test dùng (`getByRole(..., {name})`).
- Mỗi trang đúng một `<h1>`, giữ nguyên chữ h1. Giữ đủ thành phần và thứ tự chính của trang.
- Không câu thông báo mới (`Messages`); không `style=`, không `<style>`, không `<script>` nội tuyến (CSP), không mã màu
  hex, bo góc ≤ 2px. Mọi form POST giữ `<t:csrf/>`. Island giữ nguyên `data-island`, `data-props` và cây HTML bên trong.
- Không chạy docker, npm, Maven; không push, không đổi nhánh. Orchestrator dựng stack và kiểm sau khi gộp, nên phải
  tự đọc lại từng file đã sửa: thẻ JSP/JSTL đóng đủ, EL hợp lệ, không phá scriptlet.

## Giao nộp

Commit pathspec trên nhánh lane. Báo cáo `plans/reports/09-ui-<lane>-<yymmdd-hhmm>.md`: từng trang đổi gì, các
id/chữ đã kiểm giữ nguyên. Trả về ≤ 15 dòng kèm DONE | DONE_WITH_CONCERNS | BLOCKED.
