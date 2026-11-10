# Design token: "tiệm truyện đầu ngõ"

<!-- updated 261111 -->

Chủ đề: tiệm thuê truyện đầu ngõ ở Việt Nam cuối thập niên 90, đầu 2000: giấy ố vàng, mép giấy sờn, chữ đánh máy, nét bút bi xanh, con dấu đỏ, băng dính giấy. Nguồn: brief §5, brainstorm §7. Phase 5 cài token vào `frontend/src/styles/tokens.css` qua `@theme` của Tailwind v4; tên token dưới đây là tên biến CSS. Dòng ghi **đề xuất** chưa có trong brainstorm, phase 5 chốt rồi sửa file này.

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

Cả bốn có subset `vietnamese` (Google Fonts metadata, kiểm 11/11/2026). Tự host bằng Fontsource, chỉ subset latin và vietnamese, không gọi Google Fonts lúc chạy ([ADR-0011](adr/0011-font-tu-host.md)).

| Token (đề xuất tên) | Font | Độ đậm | Nạp | Dùng cho |
|---|---|---|---|---|
| `--font-body` | Be Vietnam Pro | 400, 500, 600 | preload | Bảng, form, đoạn văn |
| `--font-type` | Xanh Mono | 400 | preload | Số phiếu, mã vạch, tiêu đề phiếu, chữ trong dấu |
| `--font-pen` | Patrick Hand | 400 | lười | Ghi chú tay, tình trạng truyện, chữ kí nhân viên |
| `--font-sign` | Fraunces (variable, trục SOFT) | variable | lười | Tên tiệm, tiêu đề lớn |

Đã loại: Special Elite (không có subset vietnamese). Kiểm chữ: chụp màn hình chuỗi "Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan" ở cả bốn font (phase 5).

## 3. Khoảng cách

Bậc theo bội số 4px, tám bậc từ `--s-1` = 4px tới `--s-8` = 64px (brainstorm §7). Các bậc giữa là **đề xuất**:

| Token | `--s-1` | `--s-2` | `--s-3` | `--s-4` | `--s-5` | `--s-6` | `--s-7` | `--s-8` |
|---|---|---|---|---|---|---|---|---|
| Giá trị | 4px | 8px | 12px | 16px | 24px | 32px | 48px | 64px |

## 4. Bo góc

Giấy không bo tròn: bo góc **tối đa 2px**.

| Token (đề xuất tên) | Giá trị | Dùng cho |
|---|---|---|
| `--radius-none` | 0 | Tờ phiếu, thẻ giấy, bảng |
| `--radius-paper` | 2px | Nút, ô nhập, tem dán |

Không token nào lớn hơn 2px; component shadcn bọc lại theo chủ đề phải ghi đè `--radius` của shadcn về giá trị này.

## 5. Bóng đổ

Bóng đổ lệch, cứng, kiểu tờ giấy đặt trên bàn, thay cho bóng mờ lan rộng (brainstorm §7). Giá trị là **đề xuất**:

| Token | Giá trị đề xuất | Dùng cho |
|---|---|---|
| `--shadow-paper` | `2px 3px 0 rgb(43 33 24 / 0.18)` | Tờ phiếu, thẻ trên nền |
| `--shadow-lift` | `4px 6px 0 rgb(43 33 24 / 0.22)` | Phần tử đang nhấc lên (gáy truyện rê chuột, ngăn kéo mở) |

Màu bóng lấy từ `--ink` (`#2B2118` = `rgb(43 33 24)`).

## 6. Chuyển động và in

- `prefers-reduced-motion: reduce` tắt chuyển động trang trí; cảnh 3D giữ ảnh tĩnh ([ADR-0009](adr/0009-motion-thay-gsap.md), Deferred #16).
- Phiếu in (PrintRentalBillView): CSS in thật, `@page { size: A5 }`.
- Bìa truyện thật chỉ ở chỗ hiển thị dữ liệu (kết quả tìm, chi tiết đầu truyện, phiếu mượn); phần trang trí tự vẽ, không logo nhà xuất bản hay nhân vật có bản quyền.
