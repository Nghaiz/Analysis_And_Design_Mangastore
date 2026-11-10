# ADR-0011: Font tự host, chỉ subset latin và vietnamese

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm §7; `plans/261111-tiem-thue-truyen/plan.md` Deferred #17; `plans/reports/researcher-261111-stack-versions.md` §4

## Bối cảnh

Toàn bộ chữ trên giao diện là tiếng Việt có dấu; font thiếu glyph thì dấu rơi sang font khác. CSP của nginx đặt `font-src 'self'` (`contract.md` §10). Dự án không gửi gì ra ngoài máy lúc chạy.

## Quyết định

- Bốn font, cả bốn có subset `vietnamese` trên Google Fonts (kiểm ngày 11/11/2026): Be Vietnam Pro, Xanh Mono, Patrick Hand, Fraunces. Vai trò từng font: [`docs/design-tokens.md`](../design-tokens.md).
- Tự host bằng gói **Fontsource** (ghim phiên bản ở phase 5), chỉ lấy subset latin và vietnamese; Fraunces dùng bản variable để có trục SOFT.
- Chỉ preload Be Vietnam Pro và Xanh Mono; hai font còn lại nạp lười.

## Hệ quả

- Không gọi Google Fonts lúc chạy; CSP giữ `font-src 'self'`.
- Phase 5 có test chụp màn hình chuỗi "Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan" ở cả bốn font.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Nhúng Google Fonts CDN | Gọi ra ngoài lúc chạy, phải nới CSP |
| Tải tay file woff2 vào `frontend/public/fonts/` | Không có phiên bản ghim; giữ làm cách đảo lại |
| Special Elite, Courier Prime, Cutive Mono (chữ đánh máy) | Không có subset vietnamese |
