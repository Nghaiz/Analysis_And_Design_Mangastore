# Phase 5, lane 5A `token-tag`: báo cáo

Trạng thái: **DONE_WITH_CONCERNS** (mọi lệnh kiểm xanh, JSP đã biên dịch bằng Jasper 11.0.27; chưa render được trang bằng Tomcat, xem mục 6).
Nhánh `lane/05-he-thiet-ke-giao-dien/token-tag`, worktree `D:/Coding/mangastore-wt/05-token-tag`.

## 1. Đã làm

| File | Nội dung |
|---|---|
| `frontend/src/styles/app.css` | Nạp đúng thứ tự §2: `tailwindcss` → `tokens` → `fonts` → `paper` → `components` → `print`; giữ `@source` JSP |
| `frontend/src/styles/tokens.css` | `@theme static`: 11 màu, 4 font (+ `--font-sans`/`--font-mono` trỏ về body/type, `--font-sign--font-variation-settings: "SOFT" 100`), `--spacing: 4px`, `--s-1…--s-8`, `--radius-none/paper` và mọi `--radius-xs…4xl` = 2px, `--shadow-paper/lift` (đúng giá trị docs) và mọi `--shadow-*` mặc định của Tailwind trỏ về bóng giấy; biến shadcn trong `:root` + `@theme inline` nối `--color-*` đúng §1. Hex chỉ có ở file này |
| `frontend/src/styles/fonts.css` | 12 `@font-face` (4 họ, latin + vietnamese, `font-display: swap`), url `/fonts/...` → Vite ra `/static/fonts/...` |
| `frontend/src/styles/paper.css` | Lớp nền (body, h1–h3, link, `:focus-visible`), `.tt-main`, chất liệu `.tt-paper`, `.tt-worn`, `.tt-tape`, `.tt-typed`, `.tt-pen`, `.tt-sign` (màu trong suốt qua `color-mix`, không hex) |
| `frontend/src/styles/components.css` | 7 component `tt-*` theo §3/§3a trong `@layer components`; hoạt cảnh chỉ trong `no-preference`; khối `prefers-reduced-motion: reduce` tắt mọi animation/transition |
| `frontend/src/styles/print.css` | `@page { size: A5; margin: 10mm }`; `@media print` ẩn (display:none) mọi thứ không phải/không chứa/không nằm trong `.tt-ticket` (dùng `:has()`), bỏ nền và bóng, mỗi phiếu một trang |
| `frontend/public/fonts/*` | 12 woff2 chép nguyên byte từ Fontsource 5.3.0 + 4 giấy phép OFL (`<họ>-OFL.txt`) |
| `frontend/public/img/{logo-tiem,paper-grain,paper-stain}.svg` | Tự vẽ: biểu trưng không chữ (mái hiên, chồng truyện gáy trơn, con dấu), hạt giấy, vệt ố. `cover-fallback.svg` có sẵn từ phase 1, giữ nguyên |
| `src/main/webapp/WEB-INF/tags/layout.tag` | Khung trang §4, 4 preload font, `<t:assets/>`, `<body class="tt-paper …">`, `<main class="tt-main">` |
| `src/main/webapp/WEB-INF/tags/ui/*.tag` | `ticket`, `stamp`, `condition-tag`, `paper-card`, `ledger-table`, `book-cover`, `message-box`; giá trị sai (status, size, kind, bookId) ném `IllegalArgumentException` |
| `src/main/webapp/dev/StyleGuideView.jsp` | Màu, chữ trên ba nền, font (chuỗi thử ở 4 font, 3 độ đậm body), khoảng cách, bo góc, bóng, chất liệu, mọi biến thể component, khối "Bản JSP / Bản React" (`<div data-island="_demo">`), mục in. Chữ nghiệp vụ lấy bằng EL từ `RentalBill.STATUS_*`, `Messages.*` |
| `frontend/scripts/check-contrast.mjs`, `check-font-subsets.mjs` | Theo §6 (mục 4) |

## 2. Quyết định font (preload URL cố định)

Chọn **chép woff2 vào `frontend/public/fonts/` với tên cố định, tự viết `@font-face`**. Lí do: `@import "@fontsource/..."` cho file có hash Vite, `layout.tag` không biết tên để preload (AssetTags chỉ đọc entry, không đọc asset con của CSS). Chống lệch: `check:fonts` so từng byte bản chép với gói Fontsource đang cài và báo file lạ; nâng phiên bản thì chạy `node frontend/scripts/check-font-subsets.mjs --sync` rồi build. Preload: Be Vietnam Pro 400 và Xanh Mono 400, mỗi họ hai subset (4 link, `crossorigin`); 500/600, Patrick Hand, Fraunces nạp lười. Không dùng latin-ext (tiếng Việt chỉ cần latin + vietnamese).

## 3. Đổi theo hợp đồng §3a (tin nhắn orchestrator sau khi 5B xong)

- `ticket.tag`: gốc `section` → `article.tt-ticket`.
- `stamp.tag`: chữ dấu viết sẵn `CHỜ NHẬN`/`ĐANG CHO THUÊ`/`ĐÃ HUỶ` (trước đó suy ra bằng `toUpperCase(vi)`).
- `book-cover.tag`: lớp chuyển từ `<img>` sang `span.tt-book-cover` bọc `img`; `src` = cỡ hiển thị (trước là 320 cố định); `sizes="{W}px"`; bỏ `/` cuối của gốc URL; bỏ `fetchpriority`; kiểm `bookId` > 0. CSS `.tt-book-cover` thành khung `inline-block`, `img` bên trong 2:3.
- `StyleGuideView.jsp`: khối "Bản JSP" in đúng cây và dữ liệu mẫu của `_demo/sample.ts` (phiếu "Phiếu mượn"/`PM0125`/câu "Khách: …"; thẻ có băng dính chứa ba dấu và ba tem; thẻ chứa bảng 3 cột `DT001`·tên·`3.000đ`; bìa sm eager, md, lg; ba thông báo; danh sách 4 font "Họ: chuỗi thử"). Mục bìa ở phần biến thể cũng đổi sang sm eager.
- `tokens.css`: thêm `--font-sign--font-variation-settings` để tiện ích `font-sign` (5B dùng) bật trục SOFT như `.tt-sign`.

## 4. Script kiểm và lần làm đỏ có chủ đích

`check-contrast.mjs`: đọc bảng "## 1. Màu" của `docs/design-tokens.md` (dạng ô "a / b / c" theo nền ở tiêu đề, "N với chữ `--x`", "N trên `--x`", "nền"), so hex với `--color-*` của `tokens.css` (hai chiều), tính lại tỉ lệ từ hex thật: < 4.5 là lỗi, số trong tài liệu lệch > 0.01 cũng là lỗi. Tuỳ chọn `--doc`, `--css`.

```
$ node frontend/scripts/check-contrast.mjs --css <scratch>/tokens.css   (stamp-amber #7F4B00 → #B07A2A)
[check-contrast] FAIL --stamp-amber: tokens.css #B07A2A ≠ tài liệu #7F4B00 → sửa cho hai file trùng nhau
[check-contrast] FAIL --stamp-amber (#B07A2A) trên --paper (#F3E6C8): 3.00:1 < 4.5:1 (AA chữ cỡ thường) → …
[check-contrast] FAIL --stamp-amber (#B07A2A) trên --paper-deep (#E4CF9F): 2.42:1 < 4.5:1 …
[check-contrast] FAIL --stamp-amber (#B07A2A) trên --tape (#E9DDB0): 2.73:1 < 4.5:1 …
[check-contrast] FAIL 4 vi phạm trên 20 cặp chữ/nền (ngưỡng 4.5:1)
exit=1
```

`check-font-subsets.mjs`: trên CSS đã build (`static/assets/*.css`): mỗi họ × độ đậm có `@font-face` subset vietnamese (U+1EA0-1EF9) và latin; không subset khác; url nằm dưới `/static/fonts/` và file có thật; không `fonts.googleapis/gstatic`; bản chép `public/fonts` khớp byte gói Fontsource, không file lạ; `layout.tag` preload đủ và chỉ các file của họ preload. `--sync` chép lại; `--css-dir` đổi thư mục đầu vào.

```
$ node frontend/scripts/check-font-subsets.mjs --css-dir <scratch>/css   (bỏ @font-face Patrick Hand vietnamese)
[check-font-subsets] FAIL "Patrick Hand" 400: thiếu @font-face subset vietnamese (unicode-range chứa U+1EA0-1EF9) trong CSS đã build → thêm vào frontend/src/styles/fonts.css
[check-font-subsets] FAIL 1 vi phạm (ngưỡng: 4 họ font đều có subset vietnamese + latin, không subset khác, không URL ngoài)
exit=1
$ node frontend/scripts/check-font-subsets.mjs --css-dir <scratch>/khong-co
[check-font-subsets] THIẾU ĐẦU VÀO: …\khong-co không có → chạy npm --prefix frontend run build
exit=2
```

## 5. Lệnh kiểm cuối (worktree, 11/11/2026 08:09)

```
=== lint exit=0          > eslint .
=== typecheck exit=0     > tsc -b
=== test exit=0          Tests  14 passed (14)
=== build exit=0         app-*.css 42.77 kB │ gzip: 8.69 kB · ✓ built in 268ms
=== check:contrast exit=0  [check-contrast] PASS 20 cặp chữ/nền đều ≥ 4.5:1; 11 token màu khớp docs/design-tokens.md
=== check:fonts exit=0     [check-font-subsets] PASS 4 họ font có subset vietnamese (U+1EA0-1EF9) và latin; 12 @font-face trong 1 file CSS; 16 file (woff2 + OFL) khớp Fontsource; 4 preload đúng
```

Thêm: `grep -rnE "#[0-9a-fA-F]{3,8}\b" frontend/src --include=*.css` ngoài `tokens.css`: không có. Không `style=`/`<style>` trong tag và StyleGuideView (chỉ trong chú thích). CSS build có `.bg-paper`, `.rounded-paper`, `.shadow-lift`, `--radius-md:2px`, `--shadow-xs:var(--shadow-paper)`, `@page`, `:has(.tt-ticket)`.

JSP: biên dịch toàn bộ webapp bằng `org.apache.jasper.JspC` của tomcat-embed-jasper 11.0.27 (JDK 25, ecj 3.46.100, JSTL 3.0.1, `target/classes`) → 0 lỗi; ra lớp cho `StyleGuideView_jsp`, `layout_tag` và 7 tag `ui/`. (Jar Jasper, Ant, annotation-api tải về `~/.m2` bằng `mvnw dependency:get`, không đổi `pom.xml`.)

## 6. Chưa làm, rủi ro

- **Chưa render trang**: thử Tomcat nhúng trong scratchpad (không web.xml, không DB) bị treo ở lượt yêu cầu (Jasper `rctxt` null khi khởi tạo `JspServlet` thủ công); dừng vì hết lượt. Chưa kiểm lúc chạy: EL truy cập hằng tĩnh `${RentalBill.STATUS_PENDING}`, `${Messages.LOGIN_FAILED}` qua import của trang (JSP 3.1/EL 5 hỗ trợ, Jasper đã biên dịch được). Orchestrator mở `/dev/StyleGuideView.jsp` ở bước 5.4 sẽ xác nhận; nếu lỗi, đổi các thuộc tính đó sang `<%= … %>` chỉ được ở ngoài thân `scriptless` nên cách sửa là `<c:set>` ở đầu trang.
- Chưa soi bằng mắt (Playwright là việc lane 5D).
- `tw-animate-css` không nằm trong entry (hợp đồng §2 cấm file khác); lớp `animate-in` của dialog shadcn sẽ không có hoạt cảnh.
- Bảng `tt-ledger-table` không có khung cuộn ngang trên điện thoại (gốc phải là `table` theo §3a); trang phase 6 cần bọc nếu nhiều cột.
- Bảng màu mặc định của Tailwind vẫn còn (dialog shadcn dùng `bg-black/50`); chưa có cổng chặn lớp màu Tailwind ngoài token trong JSX/JSP.

## 7. Đề xuất cho file dùng chung (orchestrator)

1. `docs/design-tokens.md` §2: ghi tên token đã chốt (bỏ "đề xuất tên") và cách nạp font: woff2 chép vào `frontend/public/fonts/` bằng `check-font-subsets.mjs --sync`, preload 4 file 400 latin + vietnamese; §4, §5: bỏ chữ "đề xuất" (giá trị đã cài nguyên văn).
2. `docs/adr/0011-font-tu-host.md`: thêm đoạn vì sao không `@import @fontsource` (tên có hash, không preload được).
3. `scripts/accept/phase-05.mjs` bước 4: có thể thêm cổng "không hex ngoài `tokens.css`" (grep như skill `tiem-create-nostalgia-component`).
4. `.claude/skills/tiem-create-nostalgia-component/SKILL.md` Gotchas: bìa là `span.tt-book-cover` bọc `img`; chữ dấu viết sẵn; tag phải ném lỗi khi giá trị ngoài hợp đồng.
