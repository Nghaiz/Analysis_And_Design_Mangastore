# Hợp đồng giao diện phase 5 (chốt 11/11/2026, trước khi chia lane 5A, 5B, 5C)

Ba lane chạy song song và không thấy code của nhau. Mọi tên dưới đây là cố định; lane nào thấy cần đổi thì ghi đề xuất vào báo cáo, không tự đổi. Giá trị màu, font, khoảng cách: `docs/design-tokens.md`. Props island: `docs/contracts.md` §11. Ranh giới ảnh bìa và thể loại: `contract.md` §6.

## 1. Token (5A định nghĩa trong `frontend/src/styles/tokens.css`, mọi lane dùng)

Tailwind v4 `@theme`, nên tiện ích sinh ra theo tên:

| Nhóm | Biến CSS | Tiện ích |
|---|---|---|
| Màu | `--color-paper`, `--color-paper-deep`, `--color-tape`, `--color-ink`, `--color-ink-soft`, `--color-pen-blue`, `--color-stamp-red`, `--color-stamp-green`, `--color-stamp-amber`, `--color-wood`, `--color-lamp` | `bg-paper`, `text-ink`, `border-wood`… |
| Font | `--font-body` (Fuzzy Bubbles), `--font-type` (Momo Trust Sans, số dùng `tabular-nums`), `--font-pen` (Momo Signature), `--font-sign` (Momo Trust Display); bảng đủ ở `docs/design-tokens.md` §2 | `font-body`, `font-type`, `font-pen`, `font-sign` |
| Khoảng cách | `--s-1` … `--s-8` (4, 8, 12, 16, 24, 32, 48, 64px); `--spacing: 4px` để `p-4` = 16px | `p-4`, `gap-6`… |
| Bo góc | `--radius-none: 0`, `--radius-paper: 2px`; mọi `--radius-*` khác của Tailwind đặt ≤ 2px | `rounded-paper` |
| Bóng | `--shadow-paper`, `--shadow-lift` | `shadow-paper`, `shadow-lift` |

Biến ngữ nghĩa của shadcn cũng do 5A khai trong `tokens.css`, trỏ về token trên: `--background` (paper), `--foreground` (ink), `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary` (pen-blue), `--primary-foreground` (paper), `--secondary` (paper-deep), `--secondary-foreground` (ink), `--muted` (paper-deep), `--muted-foreground` (ink-soft), `--accent` (tape), `--accent-foreground` (ink), `--destructive` (stamp-red), `--border` (ink-soft), `--input` (ink-soft), `--ring` (pen-blue), `--radius: 2px`; và khối `@theme inline` nối `--color-background: var(--background)`… để các lớp shadcn (`bg-primary`, `border-input`, `ring-ring`) chạy được. 5B bọc component shadcn dựa trên các biến này.

## 2. File CSS (5A sở hữu, `frontend/src/styles/`)

`app.css` (entry, giữ đúng đường dẫn) nạp theo thứ tự: `tailwindcss` → `tokens.css` → `fonts.css` → `paper.css` → `components.css` → `print.css`. Không file CSS nào khác vào entry; 5B, 5C không viết CSS riêng mà dùng lớp dưới đây và tiện ích Tailwind (CSS của cảnh 3D, nếu cần, 5C đặt trong `frontend/src/islands/ShelfScene/` và import từ island để nó vào chunk lười).

## 3. Lớp CSS của component (tiền tố `tt-`, BEM)

Cả tag JSP (5A) lẫn component React (5B) in **đúng** cây lớp này; StyleGuideView đặt hai bản cạnh nhau để so.

| Component | Tag JSP `WEB-INF/tags/ui/` | React `components/nostalgia/` | Thuộc tính tag = props React | Lớp |
|---|---|---|---|---|
| Phiếu xé từ sổ | `ticket.tag` | `Ticket.tsx` | `title` (chuỗi), `code` (chuỗi, vd `PM0125`, có thể trống); thân = `<jsp:doBody/>` / `children` | `.tt-ticket` > `.tt-ticket__perf` (mép răng cưa), `.tt-ticket__head` > `.tt-ticket__title`, `.tt-ticket__code`; `.tt-ticket__body` |
| Dấu trạng thái | `stamp.tag` | `Stamp.tsx` | `status`: đúng một trong `Chờ nhận` · `Đang cho thuê` · `Đã huỷ` (chuỗi trạng thái của §4) | `.tt-stamp` + `.tt-stamp--pending` / `--renting` / `--cancelled`; chữ trong dấu là chữ hoa `CHỜ NHẬN` / `ĐANG CHO THUÊ` / `ĐÃ HUỶ`, có trong DOM |
| Tem tình trạng | `condition-tag.tag` | `ConditionTag.tsx` | `text`: chuỗi đã định dạng theo §13 hoặc rỗng/null → `(chưa ghi nhận)` | `.tt-condition-tag` + `.tt-condition-tag--none` (chưa ghi nhận) / `--ok` (`Không có lỗi`) / `--damaged` (còn lại) |
| Thẻ giấy | `paper-card.tag` | `PaperCard.tsx` | `heading` (chuỗi, có thể trống), `taped` (bool, có băng dính góc); thân = body / `children` | `.tt-paper-card` (+ `.tt-paper-card--taped`) > `.tt-paper-card__heading`, `.tt-paper-card__body` |
| Bảng sổ | `ledger-table.tag` | `LedgerTable.tsx` | `caption` (chuỗi); thân là `<thead>/<tbody>` thật | `table.tt-ledger-table` > `caption.tt-ledger-table__caption` |
| Bìa truyện | `book-cover.tag` | `BookCover.tsx` | `bookId` (số), `name` (chuỗi), `size` (`sm` = 160 · `md` = 320 · `lg` = 640, là cỡ hiển thị), `eager` (bool, mặc định false) | `.tt-book-cover` + `.tt-book-cover--sm/--md/--lg`; `<img>` có `srcset` 160w/320w/640w từ `${coversBase}/{bookId}/cover-{w}.webp`, `alt` = `name`, `loading="lazy"` trừ khi `eager` |
| Hộp thông báo | `message-box.tag` | `MessageBox.tsx` | `kind`: `success` · `error` · `info`; `text`: câu nguyên văn (§10) | `.tt-message-box` + `--success/--error/--info`, `role="status"` (success, info) hoặc `role="alert"` (error) |

### 3a. Thẻ HTML và dữ liệu mẫu (ghim 11/11/2026 sau khi 5B xong; 5A khớp theo)

| Component | Cây thẻ |
|---|---|
| Ticket | `article.tt-ticket` > `div.tt-ticket__perf[aria-hidden=true]`, `header.tt-ticket__head` > `h2.tt-ticket__title` + `span.tt-ticket__code` (bỏ hẳn span khi `code` trống); `div.tt-ticket__body` |
| Stamp | `span.tt-stamp.tt-stamp--{pending,renting,cancelled}`, chữ hoa viết sẵn trong DOM (không `text-transform`); trạng thái ngoài ba giá trị §4 là lỗi |
| ConditionTag | `span.tt-condition-tag.tt-condition-tag--{none,ok,damaged}` |
| PaperCard | `section.tt-paper-card[.tt-paper-card--taped]` > `h3.tt-paper-card__heading` (bỏ khi trống), `div.tt-paper-card__body` |
| LedgerTable | `table.tt-ledger-table` > `caption.tt-ledger-table__caption` |
| BookCover | `span.tt-book-cover.tt-book-cover--{sm,md,lg}` bọc `img` (lớp ở thẻ bọc); `img`: `src` = cỡ hiển thị, `srcset` 160w/320w/640w, `sizes="{W}px"`, `width`/`height` tỉ lệ 2:3, `alt` = `name`, `loading` lazy/eager, `decoding="async"`; gốc URL bỏ `/` cuối |
| MessageBox | `p.tt-message-box.tt-message-box--{kind}`, `role` status (success, info) / alert (error) |

Dữ liệu mẫu (SSOT: `frontend/src/islands/_demo/sample.ts`; StyleGuideView in y hệt): Ticket "Phiếu mượn" / `PM0125` / "Khách: Nguyễn Thu Hà · Ngày mượn 25/09/2026 · Hẹn trả 02/10/2026"; PaperCard "Truyện đã chọn" có băng dính, chứa ba dấu và ba tem (`null`, "Không có lỗi", "Rách bìa, Vết bẩn, viết vẽ"); LedgerTable "Danh sách truyện thuê", cột Mã · Tên đầu truyện · Giá thuê, dòng `DT001` · "Thám tử lừng danh Conan - Tập 1" · `3.000đ`; bìa `bookId` 1 cỡ sm (eager), md, lg; MessageBox success "Đăng kí tài khoản thành công!", error "Đăng nhập thất bại, vui lòng thử lại.", info "Không tìm thấy thông tin phù hợp."; chuỗi thử bốn font. Khối "Điều khiển (shadcn theo chủ đề)" chỉ có ở bản React.

Gốc URL ảnh bìa `coversBase`: JSP lấy từ biến môi trường `APP_COVERS_BASE_URL` qua `AppConfig` (5A tra `src/main/java/vn/tiemtruyen/util/AppConfig.java`; thiếu getter thì ghi đề xuất, dùng `/covers` cho StyleGuide); React nhận qua prop `coversBase` (mặc định `/covers`).

Lớp chất liệu dùng tự do (5A định nghĩa trong `paper.css`): `.tt-paper` (nền giấy ố), `.tt-worn` (mép sờn), `.tt-tape` (băng dính giấy), `.tt-typed` (chữ đánh máy, font-type), `.tt-pen` (nét bút bi, font-pen), `.tt-sign` (bảng hiệu, font-sign).

## 4. Khung trang JSP (5A làm, 5C dùng)

```jsp
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<t:layout title="Trang chủ">
  ... nội dung trang ...
</t:layout>
```

`layout.tag`: thuộc tính `title` (bắt buộc, tiếng Việt; thẻ `<title>` = `title · Tiệm thuê truyện tuổi thơ`), `bodyClass` (không bắt buộc). In `<!doctype html>`, `<html lang="vi">`, `<meta charset>`, viewport, `<t:assets/>`, preload Fuzzy Bubbles 400 và Momo Trust Sans (mỗi font subset latin và vietnamese), `<body class="tt-paper ...">`, thân trang trong `<main>`. Không `<style>` nội tuyến, không `style=` (CSP `style-src 'self'`).

## 5. Island

- Loader (5B): `<div data-island="<Tên>" data-props="<id>">` với `<script type="application/json" id="<id>">`; thiếu `data-props` thì props là `{}`. Island hỏng thì error boundary giữ nguyên HTML gốc trong div và `console.error` đúng một lần.
- Island `_demo` (5B, `frontend/src/islands/_demo/index.tsx`) là bản React của StyleGuide: không props, render mọi component §3 với dữ liệu mẫu giống hệt bản JSP của 5A (cùng chữ, cùng `bookId` 1, `name` "Thám tử lừng danh Conan - Tập 1"). StyleGuideView (5A) gắn `<div data-island="_demo"></div>` ở mục "Bản React".
- ShelfScene (5C): props đúng `docs/contracts.md` §11.4. HomePreviewView đọc thể loại từ `/static/data/categories.json` (Vite phát từ `pipeline/config/categories.json`, xem `frontend/vite.config.ts`) bằng `application.getResourceAsStream` + `vn.tiemtruyen.util.JsonReader.parse`, rồi `JsonUtil.toScriptJson` cho props; màu gáy theo vị trí thể loại trong mảng. Link thật `<a id="lnkLogin" href="LoginView.jsp">Đăng nhập</a>` và `lnkRegister` có sẵn trong HTML (theo `images/svg/ui_m1_HomeView.svg`).
- Hook (5B): `useReducedMotion(): boolean` ở `frontend/src/hooks/useReducedMotion.ts`; 5C import hook này, chưa có lúc chạy song song thì viết tạm theo đúng chữ kí này trong `frontend/src/three/` và ghi vào báo cáo để orchestrator gộp lúc merge.

## 6. Ngân sách và kiểm (script đọc gì)

- `npm --prefix frontend run check:contrast` (5A): đọc cặp chữ/nền khai trong `docs/design-tokens.md` và giá trị thật trong `tokens.css`; lệch giá trị giữa hai file cũng là lỗi.
- `npm --prefix frontend run check:fonts` (5A): kiểm trên CSS **đã build** trong `src/main/webapp/static/assets/` rằng bốn họ font đều có `@font-face` với `unicode-range` của subset vietnamese (có U+1EA0-1EF9).
- `npm --prefix frontend run check:budget` (5B): đọc `src/main/webapp/static/.vite/manifest.json`, gzip: loader entry ≤ 3 KB; CSS của entry (kể cả CSS của chunk import tĩnh) ≤ 30 KB; mỗi chunk JS không thuộc riêng ShelfScene ≤ 120 KB (chunk thuộc riêng ShelfScene = chỉ tới được qua import động của `src/islands/ShelfScene/index.tsx`).
- Ba script: Node 24 thuần, không hỏi tương tác, exit 0 khi đạt, exit 1 kèm tên token/file/chunk vi phạm và ngưỡng, exit 2 khi thiếu đầu vào (chưa build), mỗi script đã làm đỏ có chủ đích một lần (ghi trong báo cáo lane).
