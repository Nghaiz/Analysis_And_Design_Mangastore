# ADR-0004: React island cách B (một loader chung, chunk lười theo island)

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm §3; `plans/261111-tiem-thue-truyen/contract.md` §5; [`docs/contracts.md`](../contracts.md) mục 11

## Bối cảnh

Brief muốn React island dùng shadcn/ui thật cho các khối nhiều tương tác ("Truyện đã chọn", bàn xử lí phiếu, form đặt cọc) cộng cảnh 3D trang chủ, nhưng island vẫn gửi form tới `doXxx.jsp` và không tạo API riêng ([ADR-0001](0001-jsp-dao-khong-controller.md)). Brainstorm so ba cách nối JSP với island.

## Quyết định

Cách **B**, theo quy tắc "form của server giữ việc gửi, island giữ tương tác":

- Mọi trang nạp một entry duy nhất `src/loader/island-loader.ts` qua tag `<t:assets/>` (đọc manifest Vite). Loader quét `[data-island]` rồi `import()` đúng chunk; registry tự sinh bằng `import.meta.glob('../islands/*/index.tsx')`. Trang không có island thì không tải React.
- JSP render `<form method="post">` thật có `<t:csrf/>` và field đúng tên ch.9. Island mount vào `<div data-island="<Tên>" data-props="<id>">` **trong** form; props ở `<script type="application/json" id="<id>">` do `JsonUtil.toScriptJson()` sinh.
- Island chỉ đổi input thật rồi gọi `form.requestSubmit(submitter)`. Không `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`.
- Bốn island: `SelectedStack`, `ProcessBillDesk`, `CollateralDrawer`, `ShelfScene`; props và input được đổi: `docs/contracts.md` mục 11.

## Hệ quả

- Không có JS hoặc island hỏng thì form HTML do JSP render vẫn gửi được; đây cũng là bản dự phòng cho giảm chuyển động.
- Thêm island chỉ thêm thư mục `frontend/src/islands/<Tên>/`, không sửa `vite.config.ts` (file dùng chung).
- ESLint chặn `fetch`/`XMLHttpRequest` trong `islands/`; Vitest kiểm island chỉ đổi input đúng tên.
- Số tạm (tổng tiền) island hiện ngay, còn giá trị trong session chỉ đổi qua lần gửi về trang.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| A. Mỗi trang một entry Vite | Thêm trang là sửa `vite.config.ts`; mỗi trang tự liệt kê CSS/JS, dễ quên preload |
| C. Web Components bọc React | Shadow DOM vướng Tailwind và shadcn; props phải parse từ thuộc tính chuỗi |
