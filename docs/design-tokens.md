# Design token: "tiệm truyện đầu ngõ"

<!-- updated 261111 (phase 5: token đã cài vào frontend/src/styles/tokens.css) -->

Chủ đề: tiệm thuê truyện đầu ngõ ở Việt Nam cuối thập niên 90, đầu 2000: giấy ố vàng, mép giấy sờn, chữ đánh máy, nét bút bi xanh, con dấu đỏ, băng dính giấy. Nguồn: brief §5, brainstorm §7. Phase 5 cài token vào `frontend/src/styles/tokens.css` qua `@theme` của Tailwind v4; tên token dưới đây là tên biến CSS. Phase 5 đã cài nguyên văn mọi giá trị dưới đây; tên tiện ích Tailwind sinh ra: `plans/261111-tiem-thue-truyen/phase-05-ui-contract.md` §1.

## 1. Màu

Tương phản theo WCAG 2.x, đo trên ba nền `paper` / `paper-deep` / `tape` (tính lại ngày 11/11/2026 từ mã hex, khớp brainstorm). Mọi màu chữ đạt AA 4.5:1 cho chữ cỡ thường trên cả ba nền.

| Token | Giá trị | Tương phản (paper / paper-deep / tape) | Dùng cho |
|---|---|---|---|
| `--paper` | `#F3E6C8` | nền | Nền giấy ố |
| `--paper-deep` | `#E4CF9F` | nền | Mép giấy, thẻ |
| `--tape` | `#E9DDB0` | nền | Băng dính giấy |
| `--ink` | `#2B2118` | 12.72 / 10.29 / 11.57 | Chữ chính |
| `--ink-soft` | `#5C4A36` | 6.82 / 5.52 / 6.20 | Chữ phụ |
| `--pen-blue` | `#1F3F8F` | 7.83 / 6.34 / 7.13 | Nét bút bi, link |
| `--stamp-red` | `#A3221B` | 6.05 / 4.90 / 5.51 | Dấu `ĐÃ HUỶ`, lỗi |
| `--stamp-green` | `#2A6334` | 5.78 / 4.68 / 5.26 | Dấu `ĐANG CHO THUÊ` |
| `--stamp-amber` | `#7F4B00` | 5.83 / 4.72 / 5.31 | Dấu `CHỜ NHẬN` |
| `--wood` | `#6B4226` | 6.97 với chữ `--paper` | Kệ, quầy |
| `--lamp` | `#F6C453` | 5.32 trên `--wood` | Ánh đèn vàng, chỉ trang trí |

- Dấu trạng thái luôn kèm chữ (`CHỜ NHẬN`, `ĐANG CHO THUÊ`, `ĐÃ HUỶ`), không chỉ dựa vào màu.
- Tránh kiểu giao diện AI rập khuôn: không gradient tím, không thẻ bo tròn giống nhau (brief §5).

## 2. Font

<!-- updated 261111 (đổi bộ font theo chủ dự án; thêm --font-num Nunito) -->

Bộ font do chủ dự án chốt ngày 11/11/2026: Fuzzy Bubbles làm font chính, kèm ba font Momo, cộng Nunito cho chữ số (`--font-num`). Cả năm có subset `vietnamese` (đã kiểm gói npm ngày 11/11/2026), giấy phép OFL-1.1. Tự host bằng Fontsource 5.3.0, chỉ subset latin và vietnamese, không gọi Google Fonts lúc chạy ([ADR-0011](adr/0011-font-tu-host.md)).

| Token | Font | Gói Fontsource 5.3.0 | Độ đậm | Nạp | Dùng cho |
|---|---|---|---|---|---|
| `--font-body` | Fuzzy Bubbles | `@fontsource/fuzzy-bubbles` | 400, 700 | preload 400 (latin + vietnamese) | Chữ thân: bảng, form, đoạn văn, nút |
| `--font-type` | Momo Trust Sans | `@fontsource-variable/momo-trust-sans` (trục wght) | variable | preload (latin + vietnamese) | Chữ trong dấu, tiêu đề phiếu, nhãn gáy |
| `--font-num` | Nunito | `@fontsource/nunito` (bản tĩnh) | 400, 700 | lười | Mọi chữ số và mã cần thẳng cột: số phiếu, mã đầu truyện, mã vạch, tiền, ngày, giờ, cột số trong bảng sổ |
| `--font-pen` | Momo Signature | `@fontsource/momo-signature` | 400 | lười | Ghi chú tay, tình trạng truyện, chữ kí |
| `--font-sign` | Momo Trust Display | `@fontsource/momo-trust-display` | 400 | lười | Tên tiệm, tiêu đề lớn |

Momo Trust Sans không đơn cách và **không có** tính năng OpenType `tnum` (GSUB chỉ có `ccmp`, `locl`; đo trong file woff2 ngày 11/11/2026), Fuzzy Bubbles cũng vậy, nên `font-variant-numeric: tabular-nums` không làm chữ số của chúng cùng bề rộng. Đã giải bằng `--font-num` (Nunito): chữ số mặc định rộng đúng 600 đơn vị ở 400/700/800 (đo bằng fontTools ngày 11/11/2026), nên mọi chữ số và mã cần thẳng cột dùng `font-num`; cột tiền vẫn căn phải. `npm --prefix frontend run check:fonts` có bước kiểm font gán cho `--font-num`: 10 chữ số 0–9 phải cùng advance width (đọc bảng `hmtx`/`cmap` bằng `frontend/scripts/font-digits.mjs`), lệch thì exit 1. `tabular-nums` đã bỏ khỏi `.tt-ticket__code` và `.tt-ledger-table`.

Khoảng dòng (đo từ chiều cao dấu trong file woff2, để dấu chồng như ố, ặ, ẫ không bị cắt): chữ thân và cỡ `text-xs` tới `text-2xl` là 1.75; tiêu đề (`text-3xl` trở lên) 1.6; tem tình trạng và hộp thông báo 1.85. Giá trị nằm trong `frontend/src/styles/tokens.css` (`--text-*--line-height`).

Nạp font: woff2 chép từng byte từ gói Fontsource đã ghim vào `frontend/public/fonts/` bằng `check-font-subsets.mjs --sync` (tên cố định, để preload), xem [ADR-0011](adr/0011-font-tu-host.md) mục Cập nhật. Đã loại: Special Elite (không có subset vietnamese); Be Vietnam Pro, Xanh Mono, Patrick Hand, Fraunces (chủ dự án đổi ngày 11/11/2026). Kiểm chữ: chụp màn hình chuỗi "Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan" ở cả năm font (phase 5).

## 3. Khoảng cách

Bậc theo bội số 4px, tám bậc từ `--s-1` = 4px tới `--s-8` = 64px (brainstorm §7). Các bậc giữa do phase 5 chốt:

| Token | `--s-1` | `--s-2` | `--s-3` | `--s-4` | `--s-5` | `--s-6` | `--s-7` | `--s-8` |
|---|---|---|---|---|---|---|---|---|
| Giá trị | 4px | 8px | 12px | 16px | 24px | 32px | 48px | 64px |

## 4. Bo góc

Giấy không bo tròn: bo góc **tối đa 2px**.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--radius-none` | 0 | Tờ phiếu, thẻ giấy, bảng |
| `--radius-paper` | 2px | Nút, ô nhập, tem dán |

Không token nào lớn hơn 2px; component shadcn bọc lại theo chủ đề phải ghi đè `--radius` của shadcn về giá trị này.

## 5. Bóng đổ

Bóng đổ lệch, cứng, kiểu tờ giấy đặt trên bàn, thay cho bóng mờ lan rộng (brainstorm §7). Giá trị do phase 5 chốt:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--shadow-paper` | `2px 3px 0 rgb(43 33 24 / 0.18)` | Tờ phiếu, thẻ trên nền |
| `--shadow-lift` | `4px 6px 0 rgb(43 33 24 / 0.22)` | Phần tử đang nhấc lên (gáy truyện rê chuột, ngăn kéo mở) |

Màu bóng lấy từ `--ink` (`#2B2118` = `rgb(43 33 24)`).

## 6. Chuyển động và in

- `prefers-reduced-motion: reduce` tắt chuyển động trang trí; cảnh 3D giữ ảnh tĩnh ([ADR-0009](adr/0009-motion-thay-gsap.md), Deferred #16).
- Phiếu in (PrintRentalBillView): CSS in thật, `@page { size: A5 }`.
- Bìa truyện thật chỉ ở chỗ hiển thị dữ liệu (kết quả tìm, chi tiết đầu truyện, phiếu mượn); phần trang trí tự vẽ, không logo nhà xuất bản hay nhân vật có bản quyền.
