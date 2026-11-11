---
name: tiem-create-nostalgia-component
description: Dùng khi làm component giao diện hoài niệm (phiếu xé, dấu trạng thái, tem tình trạng, giấy, kệ): token design-tokens.md, font vietnamese, bo ≤2px, AA, giảm chuyển động.
effort: medium
---

# Tạo một component "tiệm truyện đầu ngõ"

Chủ đề: tiệm cho thuê truyện đầu ngõ, giấy ố, phiếu xé từ sổ, chữ đánh máy, nét bút bi, dấu đỏ. Giá trị màu, font, khoảng cách là SSOT ở `docs/design-tokens.md`; skill này không chép giá trị, chỉ nói cách dùng.

## Đọc trước

- `docs/design-tokens.md` (bảng màu kèm tỉ lệ tương phản, font, spacing, bóng đổ).
- `.claude/rules/tiem-ui-theme.md`; brainstorm §7.
- `docs/contracts.md` §4 (chữ của dấu trạng thái), §8 (chỗ được hiện bìa thật), §13 (hiển thị), §11.4 (kệ 3D).
- `plans/261111-tiem-thue-truyen/contract.md` §6 (component bìa); `phase-05-he-thiet-ke-giao-dien.md` (lane 5A, 5B).

## Các bước

1. **Mỗi component có hai bản dùng chung một lớp CSS:** tag JSP `src/main/webapp/WEB-INF/tags/ui/<tên>.tag` (chạy không cần JS) và bản React `frontend/src/components/nostalgia/<Tên>.tsx` (cho island). Lớp CSS ở `frontend/src/styles/components.css` (chất giấy ở `paper.css`, in ở `print.css`). Bộ có sẵn từ phase 5: `ticket`, `stamp`, `condition-tag`, `paper-card`, `ledger-table`, `book-cover`.
2. **Chỉ dùng token:** biến CSS và `@theme` của Tailwind v4 ở `frontend/src/styles/tokens.css`. Không mã màu hex, không cỡ chữ hay khoảng cách gõ tay; khoảng cách theo bậc 4px (`--s-1` … `--s-8`).
3. **Font có subset vietnamese, tự host** (Fontsource, chỉ subset latin và vietnamese, Deferred #17): Fuzzy Bubbles (chữ thân: bảng, form, đoạn văn, nút), Momo Trust Sans (chữ trong dấu, tiêu đề phiếu, nhãn gáy), Nunito `font-num` (mọi chữ số và mã cần thẳng cột: số phiếu, mã đầu truyện, mã vạch, tiền, ngày, giờ, cột số trong bảng sổ), Momo Signature (ghi chú tay, tình trạng, chữ kí), Momo Trust Display (tên tiệm, tiêu đề lớn); bảng ở `docs/design-tokens.md` §2. Chỉ preload Fuzzy Bubbles 400 và Momo Trust Sans; Nunito, Momo Signature, Momo Trust Display nạp lười. Không font thiếu dấu (Special Elite đã bị loại), không gọi Google Fonts lúc chạy.
4. **Hình khối:** bo góc **tối đa 2px** (giấy không bo tròn); bóng đổ lệch kiểu giấy đặt trên bàn, không bóng mờ lớn; mép sờn, băng dính giấy vẽ bằng CSS/SVG.
5. **Dấu trạng thái luôn kèm chữ:** `CHỜ NHẬN`, `ĐANG CHO THUÊ`, `ĐÃ HUỶ` (§4), màu chỉ là phụ. Tem tình trạng hiện chữ theo §13 (`Không có lỗi`, `(chưa ghi nhận)`, tên lỗi nối bằng `, `).
6. **Tương phản AA:** chữ cỡ thường ≥ 4.5:1 trên nền nó thực sự nằm (`paper`, `paper-deep`, `tape`); tra cột tương phản trong `docs/design-tokens.md`. Màu chỉ để trang trí (ví dụ ánh đèn) không dùng cho chữ.
7. **Giảm chuyển động:** CSS bọc hoạt cảnh trong `@media (prefers-reduced-motion: no-preference)` hoặc tắt ở `reduce`; bản React đọc `useReducedMotion`. Không hoạt cảnh nào là cách duy nhất để hiểu trạng thái.
8. **Bìa thật chỉ ở chỗ dữ liệu:** kết quả tìm, chi tiết đầu truyện, phiếu mượn, qua `book-cover` (nhận `bookId`, `name`, `size`; tự dựng `srcset` 160/320/640 từ `${APP_COVERS_BASE_URL}/{bookId}/cover-{w}.webp`; `alt` là tên đầu truyện; `loading="lazy"` trừ ảnh đầu màn hình).
9. **Trang trí tự vẽ:** logo tiệm, gáy truyện trên kệ, hoa văn là SVG tự vẽ ở `frontend/public/img/`. Không bìa crawl, logo nhà xuất bản, nhân vật có bản quyền.
10. **Đưa component vào `/dev/StyleGuideView.jsp`** với mọi biến thể, và chuỗi thử dấu "Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan" ở cả năm font.
11. **In:** phần thuộc phiếu dùng `print.css` (`@page { size: A5 }`, ẩn mọi thứ ngoài phiếu).

## Gotchas

- **Cây thẻ cố định** (`plans/261111-tiem-thue-truyen/phase-05-ui-contract.md` §3a): bìa là `span.tt-book-cover` bọc `img` (lớp ở thẻ bọc); chữ trong dấu viết sẵn chữ hoa trong DOM, không `text-transform`. Tag JSP và component React phải in cùng cây.
- **Giá trị ngoài hợp đồng thì ném lỗi**, không lặng lẽ rơi về mặc định: `stamp` nhận đúng ba trạng thái (cả "Đã hủy" sai dấu cũng là lỗi), `message-box` đúng ba `kind`.
- **Số và mã dùng `font-num`** (Nunito, chữ số cùng bề rộng): Fuzzy Bubbles và Momo Trust Sans không có `tnum`, nên `font-variant-numeric: tabular-nums` trên chúng không có tác dụng và cột số lệch nhau.
- **Font không `@import "@fontsource/..."`**: tên file có hash nên không preload được. Woff2 chép vào `frontend/public/fonts/` bằng `node frontend/scripts/check-font-subsets.mjs --sync` (ADR-0011 mục Cập nhật).
- **Màu cảnh 3D** nằm trong `frontend/src/three/` dưới dạng số (WebGL không đọc biến CSS); đó là chỗ duy nhất được có hex ngoài `tokens.css` (Accept phase 5 bước 4b).
- shadcn/ui mặc định `rounded-md`/`rounded-lg`: đặt `--radius` và các `--radius-*` của `@theme` ≤ 2px để component shadcn không lọt góc tròn; soát lại sau mỗi lần `shadcn add`.
- Chữ tiếng Việt chồng dấu (ố, ẫ, ặ) bị cắt khi `line-height` quá thấp hoặc `overflow: hidden`; thử chuỗi có dấu ở cỡ nhỏ nhất của component.
- Chữ xoay trong dấu đỏ vẫn phải đọc được bằng trình đọc màn hình: chữ thật trong DOM, không vẽ chữ bằng ảnh.
- "huỷ" (dấu trên y) là cách viết của dự án; chép từ `docs/contracts.md`, không gõ lại thành "hủy".
- CSP `style-src 'self'; font-src 'self'`: không `<style>` nội tuyến, không thuộc tính `style=` trong JSP, không font từ CDN.
- Kết cấu giấy bằng ảnh lớn làm tụt Lighthouse; ưu tiên gradient CSS hoặc SVG nhỏ.
- Màu dấu chỉ đạt AA ở chữ cỡ thường trên đúng ba nền đã đo; đặt dấu lên nền khác (gỗ, ảnh) phải đo lại.

## Lệnh kiểm

| Việc | Lệnh | Có từ |
|---|---|---|
| Lint, test, kiểm kiểu frontend | `npm --prefix frontend run lint && npm --prefix frontend run test && npm --prefix frontend run typecheck` | phase 1 |
| Build CSS/JS | `npm --prefix frontend run build` | phase 1 |
| Tìm mã màu gõ tay ngoài file token | `grep -rnE "#[0-9a-fA-F]{3,8}\b" frontend/src --include=*.css --include=*.tsx` (chỉ được khớp `tokens.css`) | phase 1 |
| Accept phase 5 (token, font, tương phản, ngân sách JS) | `node scripts/accept/phase-05.mjs` | phase 5 |
| Dựng stack để soi StyleGuide | `docker compose up --build -d --wait` | phase 1 |

Playwright MCP: mở `/dev/StyleGuideView.jsp` ở 390×844 và 1440×900, có và không có `prefers-reduced-motion`; chụp vào `plans/reports/screens/`; console và network sạch.

## Danh sách kiểm tra

- [ ] Có cả tag JSP và bản React, dùng chung lớp CSS.
- [ ] Chỉ dùng token; không hex, không cỡ gõ tay.
- [ ] Font tự host, subset vietnamese; chỉ preload hai font.
- [ ] Bo góc ≤ 2px, kể cả component shadcn.
- [ ] Dấu trạng thái luôn có chữ; tình trạng hiện đúng §13.
- [ ] Tương phản AA trên nền thực tế.
- [ ] Tắt hoạt cảnh khi giảm chuyển động.
- [ ] Bìa thật chỉ ở chỗ dữ liệu; trang trí tự vẽ.
- [ ] Có mặt ở StyleGuideView với chuỗi thử dấu; đã soi bằng Playwright MCP.
