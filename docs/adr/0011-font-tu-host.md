# ADR-0011: Font tự host, chỉ subset latin và vietnamese

<!-- updated 261111 (đổi bộ font theo chủ dự án) -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm §7; `plans/261111-tiem-thue-truyen/plan.md` Deferred #17; `plans/reports/researcher-261111-stack-versions.md` §4

## Bối cảnh

Toàn bộ chữ trên giao diện là tiếng Việt có dấu; font thiếu glyph thì dấu rơi sang font khác. CSP của nginx đặt `font-src 'self'` (`contract.md` §10). Dự án không gửi gì ra ngoài máy lúc chạy.

## Quyết định

- Bốn font, mỗi font có subset `vietnamese`. Bộ hiện hành (Fuzzy Bubbles và ba font Momo): mục "Cập nhật 11/11/2026: đổi bộ font theo chủ dự án"; vai trò từng font: [`docs/design-tokens.md`](../design-tokens.md) §2. Bộ ban đầu (Be Vietnam Pro, Xanh Mono, Patrick Hand, Fraunces, kiểm trên Google Fonts ngày 11/11/2026) đã bị thay.
- Tự host bằng gói **Fontsource** (ghim phiên bản ở phase 5), chỉ lấy subset latin và vietnamese.
- Chỉ preload font chữ thân và font số phiếu (`--font-body`, `--font-type`); hai font còn lại nạp lười.

## Hệ quả

- Không gọi Google Fonts lúc chạy; CSP giữ `font-src 'self'`.
- Phase 5 có test chụp màn hình chuỗi "Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan" ở cả bốn font.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Nhúng Google Fonts CDN | Gọi ra ngoài lúc chạy, phải nới CSP |
| Tải tay file woff2 vào `frontend/public/fonts/` | Không có phiên bản ghim (phase 5 dùng cách gần giống nhưng chép từ gói Fontsource đã ghim, xem mục Cập nhật) |
| Special Elite, Courier Prime, Cutive Mono (chữ đánh máy) | Không có subset vietnamese |
| Be Vietnam Pro, Xanh Mono, Patrick Hand, Fraunces (bộ ban đầu) | Chủ dự án đổi ngày 11/11/2026 |

## Cập nhật 11/11/2026 (phase 5)

- Không `@import "@fontsource/..."` trong CSS: Vite đổi tên file font theo hash, nên `layout.tag` không biết URL để preload.
- Thay vào đó, `frontend/scripts/check-font-subsets.mjs --sync` chép từng byte các file woff2 (subset latin và vietnamese) cùng giấy phép OFL từ gói Fontsource đã ghim vào `frontend/public/fonts/` với tên cố định; `fonts.css` tự viết `@font-face` trỏ tới `/static/fonts/...`. `npm --prefix frontend run check:fonts` báo lỗi khi bản chép lệch gói đã cài, và kiểm `unicode-range` vietnamese trên CSS đã build.
- Preload bốn file: Be Vietnam Pro 400 và Xanh Mono 400, mỗi font hai subset latin và vietnamese. (Bộ font đã thay ở mục dưới; cách chép và kiểm giữ nguyên.)

## Cập nhật 11/11/2026: đổi bộ font theo chủ dự án

- Chủ dự án quyết định ngày 11/11/2026 bỏ hẳn Be Vietnam Pro, Xanh Mono, Patrick Hand, Fraunces; dùng Fuzzy Bubbles làm font chính kèm ba font Momo. Lí do: quyết định của chủ dự án về giao diện, không phải lỗi kĩ thuật của bộ cũ.
- Bộ mới, gói Fontsource 5.3.0, cả bốn có subset vietnamese (đã kiểm gói npm ngày 11/11/2026), giấy phép OFL-1.1:
  - `--font-body`: Fuzzy Bubbles, `@fontsource/fuzzy-bubbles`, 400 và 700.
  - `--font-type`: Momo Trust Sans, `@fontsource-variable/momo-trust-sans` (trục wght).
  - `--font-pen`: Momo Signature, `@fontsource/momo-signature`, 400.
  - `--font-sign`: Momo Trust Display, `@fontsource/momo-trust-display`, 400.
- Preload bốn file: Fuzzy Bubbles 400 và Momo Trust Sans (variable), mỗi font hai subset latin và vietnamese. Momo Signature và Momo Trust Display nạp lười.
- Momo Trust Sans không đơn cách: số và mã dùng `font-variant-numeric: tabular-nums`.
- Cách nạp không đổi: woff2 chép từng byte từ gói Fontsource đã ghim vào `frontend/public/fonts/` bằng `check-font-subsets.mjs --sync`, preload bằng tên cố định; CSP giữ `font-src 'self'`.
