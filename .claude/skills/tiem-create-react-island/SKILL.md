---
name: tiem-create-react-island
description: Dùng khi tạo hoặc sửa React island trong frontend/src/islands/ (SelectedStack, ProcessBillDesk, CollateralDrawer, ShelfScene): cách B, props JSON, requestSubmit, không fetch.
effort: medium
---

# Tạo một React island (cách B)

Luật: **form của server giữ việc gửi, island giữ tương tác.** JSP render form HTML thật chạy được khi tắt JS; island chỉ làm đẹp, hiện số tạm, đổi input thật rồi `form.requestSubmit()`. Props, input được đổi và nút được bấm của từng island ở `docs/contracts.md` §11.

## Đọc trước

- `docs/contracts.md` §11 (luật chung và mục của island), §9.2 (trang chứa island, tên field), §13 (định dạng tiền, ngày).
- `plans/261111-tiem-thue-truyen/contract.md` §5; brainstorm §3.
- `frontend/src/loader/island-loader.ts`, `frontend/src/loader/mount-islands.ts` (registry, đọc props, báo lỗi từng island).

## Các bước

1. **Tên island phải là một trong bốn** của §11: `SelectedStack`, `ProcessBillDesk`, `CollateralDrawer`, `ShelfScene`. Island thứ năm là đổi hợp đồng → báo orchestrator.
2. **File:** `frontend/src/islands/<Tên>/index.tsx`, `export default` component. Không cần đăng kí: loader tự lấy bằng `import.meta.glob('../islands/*/index.tsx')`, tên thư mục chính là giá trị `data-island`.
3. **Kiểu props:** `frontend/src/islands/<Tên>/types.ts`, interface đúng từng field của §11 (camelCase, `| null` cho giá trị có thể trống, không `?:`; tiền là `number` đồng; ngày là chuỗi `yyyy-MM-dd`).
4. **Phía JSP** (trong `<form method="post">` đã có `<t:csrf/>`): render bản HTML đầy đủ trước (bảng, ô tích, ô nhập, nút có `name` đúng §9.2), rồi chỗ gắn và props:

```jsp
<div data-island="SelectedStack" data-props="selected-stack-props"></div>
<script type="application/json" id="selected-stack-props"><%= JsonUtil.toScriptJson(selectedStackDto) %></script>
```

   Props sinh từ DTO riêng, không đưa thẳng model (model trỏ vòng `Book` ↔ `BookCopy`, §3).
5. **Tương tác chỉ qua input thật của form cha:** lấy `form = rootElement.closest('form')`; đổi `checked` / `value` của đúng các input ghi ở mục "Input island được đổi" của §11; gửi bằng `form.requestSubmit(submitter)` với `submitter` là nút thật có `name`/`value` đúng (`ProcessBillDesk` gửi không kèm submitter). Dùng hook `useFormBridge` ở `frontend/src/hooks/` (có từ phase 5).
6. **Cấm:** `fetch`, `XMLHttpRequest`, `axios`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, endpoint JSON, tự sửa session hay cookie. Số tạm (tổng tiền) chỉ để hiện; giá trị thật đổi qua lần gửi về trang.
7. **Giảm chuyển động:** đọc `useReducedMotion` (có từ phase 5); bật thì không hoạt cảnh, chỉ đổi trạng thái.
8. **Test Vitest + jsdom** ở `frontend/src/islands/<Tên>/<Tên>.test.tsx`: dựng form HTML giống JSP, mount island, thao tác, khẳng định đúng input đổi, `requestSubmit` được gọi với đúng submitter, `fetch` không bị gọi.

```ts
const submit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {})
const fetchSpy = vi.spyOn(globalThis, 'fetch')
// ... thao tác ...
expect(submit).toHaveBeenCalledWith(form.querySelector('button[name="lnkDeleteSelectedBook"][value="1"]'))
expect(fetchSpy).not.toHaveBeenCalled()
```

9. **`ShelfScene` khác ba island kia:** HomeView không có form; bấm gáy truyện chạy hoạt cảnh rồi gọi `.click()` trên link thật `#lnkLogin` (D10). Ảnh tĩnh hiện trước và làm bản dự phòng; nâng lên 3D theo Deferred #16 (con trỏ thô: chỉ khi tương tác đầu tiên; máy tính: khi rảnh; không WebGL hoặc giảm chuyển động: giữ ảnh tĩnh). Gáy truyện tự vẽ, không bìa crawl.

## Gotchas

- **Island không tự đặt error boundary.** Loader (`frontend/src/loader/`) bọc mỗi island và trả lại đúng các node HTML gốc khi island ném lỗi; island tự bọc thì nuốt mất lỗi và bản HTML không về.
- **Gửi form qua `useFormBridge(ref)`** (`frontend/src/hooks/useFormBridge.ts`): hook đổi giá trị input thật, phát `input`/`change` rồi `form.requestSubmit(submitter)`; không tự viết lại.
- **Test React cần `afterEach(cleanup)`** của `@testing-library/react`: Vitest của dự án không bật `globals`, nên cleanup tự động không chạy và DOM của test trước còn sót.
- **Không render input có `name` trong island.** Bản HTML của JSP đã có các input đó; island thêm input cùng tên thì form gửi hai giá trị. Island đổi input thật (có thể ẩn bản HTML bằng lớp CSS sau khi mount, nhưng input vẫn nằm trong form).
- `requestSubmit(submitter)` ném lỗi nếu `submitter` không phải nút submit **của chính form đó**. `name`/`value` của nút chỉ được gửi khi nút là submitter; `formaction` của nút cũng chỉ áp khi nó là submitter.
- Checkbox không tích thì không được gửi; muốn bỏ chọn là đặt `checked = false`, không xoá input.
- jsdom không thực sự gửi form: luôn `mockImplementation` cho `requestSubmit` trong test, nếu không console báo "Not implemented" và test tưởng sạch.
- CSP `script-src 'self'`: không `eval`, không `new Function`, không `<script>` nội tuyến chạy được. Script `type="application/json"` không chạy nên hợp lệ.
- Island hỏng (props sai, chunk lỗi) thì loader báo `[island-loader] ...` vào console và bỏ qua island đó; bản HTML phải vẫn dùng được. Console có error là chưa xong.
- Số và chữ hiển thị theo §13 (`3.000đ`, `dd/MM/yyyy`); tự định dạng trong island, không nhận chuỗi đã định dạng từ props.
- ESLint chặn `fetch` / `XMLHttpRequest` trong `islands/` (có từ phase 5); không tắt luật bằng comment `eslint-disable`.

## Lệnh kiểm

| Việc | Lệnh | Có từ |
|---|---|---|
| Lint (kể cả luật chặn fetch từ phase 5) | `npm --prefix frontend run lint` | phase 1 |
| Test Vitest | `npm --prefix frontend run test` | phase 1 |
| Kiểm kiểu TypeScript | `npm --prefix frontend run typecheck` | phase 1 |
| Build ra `src/main/webapp/static/` | `npm --prefix frontend run build` | phase 1 |
| Tìm lệnh gọi mạng còn sót | `grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket|axios" frontend/src/islands` (phải rỗng) | phase 1 |
| Accept phase 5 (ngân sách JS, kệ 3D) | `node scripts/accept/phase-05.mjs` | phase 5 |

Playwright MCP: mở trang chứa island ở 390×844 và 1440×900, thao tác, xem request gửi đi là POST form của trang (không request JSON); làm lại khi tắt JavaScript và khi giả lập `prefers-reduced-motion`.

## Danh sách kiểm tra

- [ ] Tên island thuộc bốn tên của §11; file `islands/<Tên>/index.tsx` có default export.
- [ ] Kiểu props khớp §11 từng field; JSP sinh props bằng `JsonUtil.toScriptJson` từ DTO.
- [ ] Chỗ gắn nằm trong `<form method="post">` có `<t:csrf/>`, sau bản HTML đầy đủ.
- [ ] Island chỉ đổi input được liệt kê, gửi bằng `requestSubmit` với đúng submitter; không input `name` trùng.
- [ ] Không `fetch` / XHR / WebSocket / sendBeacon / EventSource / axios.
- [ ] Giảm chuyển động tắt hoạt cảnh; tắt JS trang vẫn chạy hết luồng.
- [ ] Test Vitest khẳng định input, submitter và không gọi mạng; lint, typecheck, build xanh.
