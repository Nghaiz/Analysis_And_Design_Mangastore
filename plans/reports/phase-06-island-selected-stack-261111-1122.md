# Phase 6, lane 6D `island-selected-stack`: báo cáo

Worktree `D:/Coding/mangastore-wt/06-island-selected-stack`, nhánh `lane/06-chuc-nang-1-2/island-selected-stack`. Chỉ Node (Vitest + jsdom), không dùng Docker.

Trạng thái: **DONE_WITH_CONCERNS** (concern ở §5: một chỗ lệch giữa bản JSP đang làm của 6C và quy ước §11, ngân sách loader còn ít).

## 1. Việc đã làm

| File | Nội dung |
|---|---|
| `frontend/src/islands/SelectedStack/index.tsx` | Island: chồng truyện buộc dây (bảng thật có `caption`, `thead` bốn cột Chọn · Tên đầu truyện · Số lượng · Thao tác theo SVG ch.9; mỗi dòng là một gáy truyện xen ba màu giấy, viền gáy gỗ; sợi dây và nút thắt `aria-hidden`), ô tích, nút "Xoá", nút "Tạo phiếu mượn". Không render control có `name`. |
| `frontend/src/islands/SelectedStack/types.ts` | Kiểu props đúng §11.1 và `parseSelectedStackProps`: sai thì ném `[SelectedStack] props.<đường dẫn> … (docs/contracts.md §11.1)`; từ chối `bookId` lặp (dòng phải gộp theo đầu truyện). |
| `frontend/src/islands/SelectedStack/server-html.ts` | Kiểm form có đủ `btnCreateRentalBill` và, với mỗi dòng, `chkSelectedBook`/`lnkDeleteSelectedBook` value = bookId (thiếu thì ném, loader giữ HTML gốc); ẩn mọi phần tử `data-island-fallback="SelectedStack"` bằng `hidden`, gỡ ra thì hiện lại. |
| `frontend/src/islands/SelectedStack/motion.ts` | Gáy lệch so le, rút ra khi tích, trượt đi khi xoá; rơi vào chồng khi mở trang. Giảm chuyển động: không lớp transition, không xê dịch, chỉ mờ dòng đang xoá. |
| `frontend/src/islands/SelectedStack/SelectedStack.test.tsx` | 22 test (mục 3). |
| `frontend/src/loader/submit-on-change.ts` (+ test) | `data-submit-on-change` (C3) trên form, ô hoặc khối bọc: `change` do người dùng tạo (`isTrusted`) thì `form.requestSubmit()` trên form sở hữu ô (kể cả ô gắn `form="…"`); sự kiện island tự phát bị bỏ qua. Một listener uỷ quyền trên `document`. |
| `frontend/src/loader/message-ok.ts` (+ test) | Thêm vào mỗi `.tt-message-box` một `<button type="button">OK</button>`, focus nút của hộp đầu tiên; bấm thì `hidden` hộp và focus ô `aria-invalid="true"` đầu tiên nếu có. Gọi lại không thêm nút thứ hai. `message-box.tag` không đổi: không JS thì không có nút. |
| `frontend/src/loader/mount-islands.ts` | Đúng hai dòng gọi (`installSubmitOnChange(root)`, `installMessageOk(root)`) ngay đầu `mountIslands`, trước nhánh "trang không có island", cộng hai dòng import. |

Hành vi island:
- **Tích chọn**: đổi state của island và ô thật `chkSelectedBook` (qua `useFormBridge.setChecked`), không gửi form.
- **Xoá**: `form.requestSubmit(<button name="lnkDeleteSelectedBook" value="{bookId}">)`; nút thật mang `formaction` nào thì trình duyệt dùng nút đó.
- **Tạo phiếu mượn**: `form.requestSubmit(<button name="btnCreateRentalBill">)`.
- **Lúc gắn**: ô thật được đặt khớp `rows[].checked` (props thắng trạng thái form trình duyệt tự khôi phục, để cái người dùng thấy đúng là cái được gửi).
- **Focus**: sau lần vẽ đầu, focus ô tích của dòng `focusBookId`, chỉ khi chưa phần tử nào giữ focus (nút OK của hộp thông báo được focus trước, island không giành). Dòng không còn (vừa xoá) hay `null` thì không đổi focus.
- **Giỏ rỗng**: bảng chỉ có hàng tiêu đề, không dây buộc, nút "Tạo phiếu mượn" vẫn có (server trả `BOOK_NOT_CHOSEN`, giống bản HTML). Không thêm câu chữ mới.

## 2. Cây HTML mà island chờ (SearchBookView.jsp)

```jsp
<form method="post" action="${ctx}/SearchBookView.jsp" id="frmSelectedBook">
  <t:csrf/>
  <ui:paper-card heading="Truyện đã chọn" taped="true">
    <div data-island-fallback="SelectedStack">
      <table class="tt-ledger-table" id="tblSelectedBook"> … mỗi dòng gộp:
        <input type="checkbox" name="chkSelectedBook" value="{bookId}" [checked]>
        <button type="submit" name="lnkDeleteSelectedBook" value="{bookId}">Xoá</button>
      </table>
    </div>
    <div data-island="SelectedStack" data-props="selected-stack-props"></div>
    <script type="application/json" id="selected-stack-props"><%= JsonUtil.toScriptJson(dto) %></script>
  </ui:paper-card>
  <div class="mt-6 flex justify-center" data-island-fallback="SelectedStack">
    <button type="submit" name="btnCreateRentalBill" id="btnCreateRentalBill">Tạo phiếu mượn</button>
  </div>
</form>
```

- Mọi `name` nằm ngoài div `data-island`; phần tử fallback không chứa div `data-island` (island ném lỗi nếu chứa).
- Có thể có nhiều phần tử mang `data-island-fallback="SelectedStack"`; island ẩn hết, gỡ ra thì hiện lại.
- Mỗi dòng của `rows` phải có đúng một `chkSelectedBook` và một `lnkDeleteSelectedBook` cùng value; thiếu thì island không gắn (loader giữ HTML, `data-island-state="failed"`).
- Island không dùng chỗ `data-island-slot` nào.

## 3. Kết quả kiểm

Chạy trong `frontend/` của worktree, 11/11/2026:

| Lệnh | Kết quả |
|---|---|
| `npm ci` | OK |
| `npm run lint` | sạch |
| `npm run typecheck` | sạch |
| `npm run test` | 13 file, 133 test PASS, không stderr |
| `npm run build` | OK; `SelectedStack` chunk 8.00 kB (gzip 3.11 kB) |
| `npm run check:budget` | PASS: loader 2.87 / 3.00 kB (trước lane 2.48 kB), CSS entry 9.22 / 30 kB, chunk lớn nhất ngoài ShelfScene 63.14 / 120 kB |
| `grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket|axios" frontend/src/islands/SelectedStack` | chỉ có trong test (spy khẳng định không gọi) |

Test của island: gộp dòng (một gáy mỗi đầu truyện, số lượng, thứ tự cart, bốn cột); giỏ rỗng; ẩn và trả bản HTML; không control có `name`; ô thật khớp props lúc gắn; tích chọn đổi đúng `chkSelectedBook` value = bookId và không gửi; Xoá gửi đúng submitter + value; Tạo phiếu mượn gửi đúng submitter và `FormData` có các ô đã tích; focus về `focusBookId`; không giành focus; giảm chuyển động (không transition, không xê dịch); đủ chuyển động (transition, gáy trượt đi); 6 trường hợp props sai nêu đúng trường; thiếu nút thật thì ném; qua loader thật: `data-island-state="mounted"` và ẩn bản HTML, props sai thì `failed`, báo đúng một lần, bản HTML hiện lại. Mọi test khẳng định `fetch` và `XMLHttpRequest.open` không được gọi.

Test của loader: submit-on-change (thuộc tính trên form, trên ô, trên khối bọc; ô `form="…"`; bỏ qua ô ngoài vùng, ô không có form, sự kiện `isTrusted === false`; listener là cùng một hàm nên DOM chỉ giữ một; `mountIslands` gắn listener cả khi trang không có island). message-ok (một nút `type=button` chữ "OK", focus, bấm thì ẩn hộp và focus ô `aria-invalid`, không ô sai thì chỉ ẩn, gọi lại không thêm nút, `mountIslands` thêm nút cả khi trang không có island).

**Làm đỏ có chủ đích** (rồi trả lại, chạy lại xanh):
1. Island Xoá gọi `bridge.submit()` không submitter → `Xoá submits with the real lnkDeleteSelectedBook…` đỏ (`expected "requestSubmit" to be called with arguments`).
2. Bỏ kiểm `event.isTrusted` trong `submitOnChange` → 2 test đỏ (sự kiện island tự phát, sự kiện tổng hợp của jsdom bị gửi form).

Giới hạn của jsdom: không tạo được sự kiện `isTrusted === true`, nên nhánh "người dùng đổi ô thì gửi" được kiểm bằng cách gọi `submitOnChange` với `{ isTrusted: true, target }`. Lane 6F (Playwright MCP) nên đổi `txtExpectedDays` thật trên ConfirmRentalBillView và thấy một POST về chính trang.

## 4. Không làm, không sửa

- Không sửa `package.json`, `vite.config.ts`, `docs/contracts.md`, `message-box.tag`, `components/`, `hooks/`, `lib/`, JSP.
- Không mở trang thật (lane không có stack; Docker của máy đang hỏng). Kiểm trên trình duyệt thuộc lane 6F.

## 5. Đề xuất cho orchestrator

1. **Lệch với bản đang làm của 6C** (`D:/Coding/mangastore-wt/06-trang-m2/src/main/webapp/SearchBookView.jsp`, đọc ngày 11/11/2026 khi lane chạy): `btnCreateRentalBill` nằm ngoài phần tử fallback nên khi island gắn sẽ có hai nút "Tạo phiếu mượn". Sửa một dòng: thêm `data-island-fallback="SelectedStack"` vào `<div class="mt-6 flex justify-center">` bọc nút (island ẩn mọi phần tử mang dấu này). Phần còn lại của bản 6C khớp §2 ở trên.
2. **`focusBookId` lấy từ `book` trong session** nên còn giá trị sau mọi lần tải lại (kể cả sau "Tìm"). Island chỉ focus khi chưa phần tử nào giữ focus, nên sau "Tìm" focus vẫn nhảy về chồng truyện. Đề xuất 6C chỉ đặt `focusBookId` khi request là forward từ `doAddSelectedBook`/`doDeleteSelectedBook` (`DispatcherType.FORWARD`), còn lại `null`. Hợp đồng §11.1 không cần đổi chữ.
3. **Ngân sách loader**: còn 0.13 kB gzip. Việc loader sau (C2 "In phiếu" gọi `window.print()` ở phase 7) có thể vượt 3 kB; nên tính trước.
4. **Gộp code dùng chung**: `server-html.ts` (ẩn fallback) và cách kiểm props của SelectedStack trùng ý với `ProcessBillDesk/server-html.ts`, `props-guard.ts` của phase 7. Lane này không được sửa `hooks/` hay `lib/` nên viết riêng; nên gộp vào `frontend/src/hooks/useServerFallback.ts` và `frontend/src/lib/props-guard.ts` khi merge phase 6 với phase 7.
5. **Lớp nút OK** là chuỗi tiện ích Tailwind (theo màu của Button outline phase 5): `components/ui/button` kéo React vào chunk loader. Nếu muốn một nguồn, thêm lớp `.tt-button` vào `components.css` (file của phase 5) rồi dùng cho cả JSP và nút OK.
6. **Enter trong ô số ngày (ConfirmRentalBillView)**: Enter trong ô chữ gửi form bằng nút gửi đầu tiên của form. Nếu nút đầu là `btnConfirm` (`formaction="doAddRentalBill.jsp"`), Enter sẽ tạo phiếu thay vì tính lại. Đề xuất 6C đặt nút "Tính lại" (không `formaction`) trước `btnConfirm` trong thứ tự cây; nút này có thể ở `<noscript>` như C3, nhưng khi có JS thì cần một nút gửi mặc định không `formaction` đứng trước.
7. Khi giỏ rỗng, island không có câu "giỏ trống" vì §10 cấm thêm câu khi chủ dự án chưa duyệt; nếu muốn một dòng gợi ý thì cần chủ dự án duyệt câu.
