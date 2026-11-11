# Phase 5, lane 5B `loader-react`: báo cáo

Nhánh `lane/05-he-thiet-ke-giao-dien/loader-react`, worktree `D:/Coding/mangastore-wt/05-loader-react`. Trạng thái: **DONE_WITH_CONCERNS** (chỉ vì vài chi tiết thẻ HTML hợp đồng §3 chưa ghim, cần 5A khớp lúc merge; xem mục 4).

## 1. Đã làm

| Việc | File |
|---|---|
| Loader bản đủ: quét `[data-island]`, `import.meta.glob('../islands/*/index.tsx')` lười, props JSON theo `data-props` (thiếu thì `{}`), không làm gì khi trang không có island, mỗi island hỏng riêng | `frontend/src/loader/mount-islands.ts`, `island-loader.ts` (không đổi) |
| Nửa React tách ra chunk lười: `createRoot` + error boundary. Island ném lỗi lúc render: boundary render `null`, `onCaughtError`/`onUncaughtError` của root gọi `restore` một lần, `root.unmount()` rồi trả lại **đúng các node** HTML gốc (`replaceChildren`), loader `console.error` đúng một lần `[island-loader] Island "X" crashed while rendering; the server HTML is kept.` | `frontend/src/loader/island-runtime.tsx` |
| 7 component hoài niệm theo §3 | `frontend/src/components/nostalgia/{Ticket,Stamp,ConditionTag,PaperCard,LedgerTable,BookCover,MessageBox}.tsx` |
| Hằng và định dạng dùng chung (không để trong file component vì luật react-refresh) | `frontend/src/lib/{rental-status,condition,covers,format}.ts` |
| Bọc theo chủ đề 7 component shadcn: mọi `rounded-md/lg/xs/[4px]` → `rounded-paper`, bỏ biến thể `dark:`, `shadow-lg` → `shadow-lift`, nút `shadow-paper`, ô nhập bỏ bóng, overlay `bg-ink/50`, destructive chữ `text-primary-foreground`, dialog `motion-reduce:animate-none`, chữ "Close" → "Đóng" | `frontend/src/components/ui/*.tsx` |
| Hook `useReducedMotion(): boolean` (`useSyncExternalStore` trên `(prefers-reduced-motion: reduce)`; không có `matchMedia` thì trả `true`, phía an toàn) | `frontend/src/hooks/useReducedMotion.ts` |
| Hook `useFormBridge(anchorRef)` → `{ form(), setValue(name, value, index?), setChecked(name, value, checked), submit(submitter?) }`; đổi input thật, phát `input` + `change`, `form.requestSubmit(nútThật)` (submitter tìm theo `name` + `value`); thiếu form/input/nút thì ném lỗi rõ, không đoán | `frontend/src/hooks/useFormBridge.ts` |
| Island `_demo` (không props): mọi component §3 + chuỗi thử bốn font + khối shadcn đã bọc | `frontend/src/islands/_demo/{index.tsx,sample.ts}` |
| ESLint chặn mạng: `no-restricted-globals` (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`), `no-restricted-syntax` (mọi `x.fetch`, `x.sendBeacon`…), `no-restricted-imports` (`axios`, `axios/*`); áp cho `src/islands/**`, `src/components/**`, `src/hooks/**`, `src/lib/**`, `src/three/**`, trừ `*.test.*` | `frontend/eslint.config.js` |
| `check-budget.mjs` theo §6 (kB = 1000 byte, gzip mức mặc định của zlib, giống số `vite build` in) | `frontend/scripts/check-budget.mjs` |
| Test Vitest: loader (cả đường error boundary thật, island lành bên cạnh island hỏng, `_demo` qua glob thật), hai hook, component (lớp, chữ dấu, NFD, "hủy" bị từ chối, srcset), shadcn (không bo > 2px, không `dark:`), lib | `*.test.ts(x)` cạnh mã |

## 2. Kết quả kiểm (đuôi đầu ra)

```
> eslint .                       (không lỗi)
> tsc -b                         (không lỗi)
 Test Files  5 passed (5)
      Tests  55 passed (55)
../src/main/webapp/static/assets/app-BhMMHolC.css             16.34 kB │ gzip:  3.97 kB
../src/main/webapp/static/assets/island-loader-CH6Ox0fr.js     4.87 kB │ gzip:  2.26 kB
../src/main/webapp/static/assets/react-dom-DGqxnPcW.js        12.58 kB │ gzip:  4.40 kB
../src/main/webapp/static/assets/_demo-C7Poadgh.js            56.85 kB │ gzip: 19.19 kB
../src/main/webapp/static/assets/island-runtime-DIUM8FXq.js  207.16 kB │ gzip: 65.01 kB
✓ built in 580ms
[budget] loader assets/island-loader-CH6Ox0fr.js: 2.25 kB / 3.00 kB
[budget] entry CSS (assets/app-BhMMHolC.css): 3.97 kB / 30.00 kB
[budget] largest JS chunk outside ShelfScene assets/island-runtime-DIUM8FXq.js: 64.32 kB / 120.00 kB
[budget] ShelfScene-only chunks (not budgeted): 0
[budget] PASS
[accept] PASS 1 frontend: ci, lint, typecheck, test, build
[accept] PASS 2 ESLint chặn fetch/XMLHttpRequest/WebSocket/EventSource/sendBeacon trong islands/ (5/5 bị chặn)
[accept] ALL PASS (log: plans\reports\accept-phase-05-261111-0755.log)
[accept] PASS 5 check-budget: loader ≤ 3 KB, CSS đầu trang ≤ 30 KB, chunk ngoài ShelfScene ≤ 120 KB
```

Loader entry giảm từ 2,46 KB xuống 2,26 KB gzip: React, react-dom/client và helper CJS giờ nằm trong chunk lười `island-runtime`, chunk island không còn import ngược entry. CSS ở đây mới là CSS của worktree này (chưa có `tokens.css` của 5A).

## 3. Làm đỏ có chủ đích

- **check-budget (exit 1):** thêm tạm `import { createRoot } from 'react-dom/client'` tĩnh vào `island-loader.ts`, build, chạy: `[budget] FAIL loader entry assets/island-loader-BPQgx6l7.js is 69.49 kB gzip, limit 3.00 kB`, exit 1. Đã khôi phục bằng `git checkout -- frontend/src/loader/island-loader.ts`, build lại, PASS như trên.
- **check-budget, luật ShelfScene:** manifest giả (`--manifest`): chunk chỉ ShelfScene tới được 200 kB được miễn; chunk dùng chung ShelfScene + island khác 200 kB → `FAIL chunk assets/shared.js (_shared.js) is 200.89 kB gzip, limit 120.00 kB`, exit 1. Manifest không có → exit 2 kèm lệnh build.
- **ESLint:** bước 2 của Accept tự làm đỏ 5/5. Thử tay thêm `import axios`, `window.fetch`, `navigator.sendBeacon`, `new XMLHttpRequest()`: 4/4 lỗi đúng luật.
- **Error boundary:** test `puts the server HTML back and logs exactly once` khẳng định node `#server-table` sau khi hỏng là **chính node cũ** và `console.error` gọi đúng 1 lần.

## 4. Cần 5A khớp (hợp đồng §3 không ghim thẻ HTML; tôi chọn như dưới, không đổi tên lớp nào)

| Component | Thẻ React đã chọn |
|---|---|
| Ticket | `article.tt-ticket` > `div.tt-ticket__perf[aria-hidden=true]`, `header.tt-ticket__head` > `h2.tt-ticket__title` + `span.tt-ticket__code` (**bỏ hẳn** span khi `code` trống); `div.tt-ticket__body` |
| Stamp | `span.tt-stamp.tt-stamp--{pending,renting,cancelled}`, chữ hoa viết sẵn (không `toUpperCase`); trạng thái lạ (kể cả "Đã hủy") → ném lỗi |
| ConditionTag | `span.tt-condition-tag.tt-condition-tag--{none,ok,damaged}` |
| PaperCard | `section.tt-paper-card[.tt-paper-card--taped]` > `h3.tt-paper-card__heading` (bỏ khi trống), `div.tt-paper-card__body` |
| LedgerTable | `table.tt-ledger-table` > `caption.tt-ledger-table__caption` |
| BookCover | **`span.tt-book-cover.tt-book-cover--{sm,md,lg}` bọc `img`** (lớp ở thẻ bọc, không ở `img`); `img` có `src` = cỡ hiển thị, `srcset` 160w/320w/640w, `sizes="{W}px"`, `width`/`height` theo tỉ lệ 2:3, `alt` = `name`, `loading` lazy/eager, `decoding="async"`; `coversBase` mặc định `/covers`, bỏ `/` cuối |
| MessageBox | `p.tt-message-box.tt-message-box--{kind}` với `role` status/alert |

Dữ liệu mẫu `_demo` (StyleGuideView của 5A nên in y hệt, ở `frontend/src/islands/_demo/sample.ts`): Ticket "Phiếu mượn" / `PM0125` / "Khách: Nguyễn Thu Hà · Ngày mượn 25/09/2026 · Hẹn trả 02/10/2026"; PaperCard "Truyện đã chọn" có băng dính chứa ba dấu và ba tem (`null`, "Không có lỗi", "Rách bìa, Vết bẩn, viết vẽ"); LedgerTable "Danh sách truyện thuê", cột Mã · Tên đầu truyện · Giá thuê, dòng `DT001` · "Thám tử lừng danh Conan - Tập 1" · `3.000đ`; bìa `bookId` 1 cỡ sm (eager), md, lg; ba MessageBox: success "Đăng kí tài khoản thành công!", error "Đăng nhập thất bại, vui lòng thử lại.", info "Không tìm thấy thông tin phù hợp."; chuỗi thử bốn font. Khối "Điều khiển (shadcn theo chủ đề)" chỉ có ở bản React.

## 5. Đề xuất cho orchestrator (file dùng chung, tôi không sửa)

- `package.json`, lockfile, `vite.config.ts`: **không cần đổi.**
- `.claude/skills/tiem-create-react-island/SKILL.md` mục Gotchas, thêm: "Island không tự đặt error boundary: lỗi nó bắt cũng tới `onCaughtError` của root và loader sẽ trả lại HTML gốc. Gửi form bằng `useFormBridge(ref)` (`setChecked`, `setValue`, `submit({ name, value })`); test React phải `afterEach(cleanup)` vì Vitest không bật `globals`."
- Luật ESLint chặn mạng phủ cả `src/three/**` (5C) vì đó cũng là mã của island ShelfScene; 5C dùng loader của three/drei thì không vướng (luật chỉ bắt lời gọi trong mã nguồn).
- 5C: hook thật đã có ở `frontend/src/hooks/useReducedMotion.ts`, chữ kí `useReducedMotion(): boolean`; bản tạm trong `src/three/` (nếu có) bỏ lúc merge.
