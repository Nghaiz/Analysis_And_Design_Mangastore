---
paths: ["frontend/**", "src/main/webapp/**"]
---
# Tiệm truyện: chủ đề giao diện

SSOT: token ở `docs/design-tokens.md` (nguồn: brainstorm §7); thành phần và thứ tự trang ở `docs/contracts.md` §9, props island §11, hiển thị §13. Rule trỏ, không chép bảng màu.

## Rule

- **Chủ đề**: tiệm truyện đầu ngõ Việt Nam cuối thập niên 90, đầu 2000 (brief §5): giấy ố, mép sờn, chữ đánh máy, bút bi xanh, con dấu đỏ, băng dính giấy. Cấm giao diện AI rập khuôn (gradient tím, thẻ bo tròn giống nhau); bo góc tối đa 2px.
- **Token**: chỉ dùng biến CSS của `docs/design-tokens.md` (màu, font, spacing bậc 4px); không viết thẳng mã màu, cỡ chữ hay khoảng cách.
- **Font**: Fuzzy Bubbles (chữ thân), Momo Trust Sans (chữ trong dấu, tiêu đề phiếu, nhãn gáy), Nunito `font-num` (chữ số và mã), Momo Signature (ghi chú tay), Momo Trust Display (tên tiệm, tiêu đề lớn), tự host woff2 subset `latin` và `vietnamese`; không gọi Google Fonts lúc chạy; chỉ preload Fuzzy Bubbles 400 và Momo Trust Sans, Nunito nạp lười. Số và mã cần thẳng cột (số phiếu, mã, mã vạch, tiền, ngày, giờ, cột số) dùng `font-num`: Fuzzy Bubbles và Momo không có `tnum`, `tabular-nums` không giúp được. Font mới phải có subset `vietnamese` (Special Elite bị loại vì không có).
- **Giữ thành phần và thứ tự** từng màn hình theo §9 (SVG ch.2, ch.9); chỉ làm mới hình thức. Chữ toàn tiếng Việt; tiền, ngày, mã `DT`/`PM` theo §13.
- **Giảm chuyển động**: mọi hoạt cảnh tôn trọng `prefers-reduced-motion`; cảnh 3D có ảnh tĩnh dự phòng (không WebGL, giảm chuyển động, máy yếu).
- **Bìa thật chỉ ở chỗ hiển thị dữ liệu** (kết quả tìm, chi tiết đầu truyện, phiếu mượn; §8). Trang trí (logo tiệm, minh hoạ, gáy truyện 3D) tự vẽ; cấm bìa crawl, logo NXB, nhân vật có bản quyền.
- **WCAG AA**: chữ đạt tương phản 4.5:1 trên nền đang dùng; dấu trạng thái luôn kèm chữ, không chỉ dựa vào màu; Lighthouse từ 90; chạy tốt trên điện thoại.
- **Island không bao giờ fetch** (không `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`): chỉ đổi input thật có `name` đúng §9 rồi `form.requestSubmit()`; props đọc từ `<script type="application/json">` (§11).
- PrintRentalBillView dùng CSS in thật `@page { size: A5 }`.

Kiểm bằng: test và lint frontend (phase 5), Lighthouse và E2E (phase 8), Playwright MCP, agent `tiem-contract-guard`.
