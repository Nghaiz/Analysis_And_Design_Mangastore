# tiem-contract-guard: báo cáo (phase 7, bước 7.9)

- Base: origin/main (34879ed78746761f072b970f6c4eb4e78aff4420) · Head: HEAD, nhánh phase/07-chuc-nang-3 (3f8175888424a2b1d70c5a5cb1fbdeb211f696a5) · Lúc chạy: 2026-11-11 12:02
- File trong diff: 39 (phần phase 7, theo pathspec của orchestrator); toàn nhánh 142 file · Thay đổi chưa commit: không
- Kết luận: 0 vi phạm, 7 cảnh báo (1 mức trung bình, 6 mức thấp)
- Tên file theo yêu cầu của orchestrator (`phase-07-contract-guard-…`), thay cho tên mặc định `tiem-contract-guard-<yymmdd-hhmm>.md` của agent.

## Vi phạm

Không có.

## Cảnh báo

| # | Vị trí | Luật | Mục hợp đồng | Bằng chứng | Đề xuất sửa |
|---|---|---|---|---|---|
| 1 | `src/main/webapp/nhan-vien/doUpdateRentedBookList.jsp:28` | Mức **trung bình**. Lệch hợp đồng: bản `listOnlyCopy` gửi vào `updateRentalBill` để `note = NULL` (và `discount = 0`). `UPDATE_BILL` của `RentalBillDAO` ghi `note = ?`, nên "Lưu" danh sách truyện tại quầy **xoá ghi chú khách đã nhập** ở ConfirmRentalBillView (doAddRentalBill gán `note`). Chú thích dòng 23–26 nói "phiếu Chờ nhận trong DB luôn mang ghi chú NULL", câu này sai. Lần sau nhân viên mở lại phiếu qua searchRentalBill thì ghi chú gốc đã mất hẳn, khách xem RentalBillDetailView cũng không thấy | `docs/contracts.md` §9.2 doUpdateRentedBookList ("phiếu mang danh sách quyển mới"), §9.2 doAddRentalBill, §5.3 updateRentalBill | `private static RentalBill listOnlyCopy(RentalBill bill, List<RentedBook> rows) {` | Chép `note` của phiếu sang bản sao (`copy.setNote(bill.getNote())`), hoặc orchestrator chốt rõ ghi chú nào được ghi ở bước này (bản gốc hay bản nhân viên đang sửa) rồi sửa chú thích. Thêm một test smoke/E2E: phiếu có ghi chú của khách, sửa danh sách rồi kiểm DB vẫn giữ ghi chú |
| 2 | `src/main/webapp/nhan-vien/ProcessRentalBillView.jsp:262` | Mức thấp. "Thêm tình trạng" lưu **tham chiếu** tới phần tử của `rentalBill`, không lưu bản sao. Chạy đúng chỉ vì Redisson đặt `readMode=REDIS` (mỗi lần `getAttribute` giải tuần tự ra một đối tượng mới). Nếu session nằm trong bộ nhớ (test, stack không có Redis) thì AddConditionView sửa thẳng quyển trong `rentalBill`, và "Quay lại" không còn huỷ được thay đổi | `docs/contracts.md` §7 ("bản sao… là bản riêng"), §9.2 ProcessRentalBillView ("lưu **bản sao**") | `session.setAttribute("rentedBook", row);` | Sao sâu `row` (cùng `listRentedDamage`) trước khi ghi, hoặc ghi rõ trong `docs/contracts.md` §7 là việc sao chép dựa vào `readMode=REDIS` |
| 3 | `src/main/webapp/nhan-vien/quan-tri/AddBookView.jsp:38` | Mức thấp. Trang ghi `book` (bản nháp `id = 0`) để chặn bấm hai lần. Theo §7 và bảng D6, chỉ SearchBookView và ManageBookView được ghi `book` | `docs/contracts.md` §7, §9.2 "Trang quản trị D6", C12 | `session.setAttribute("book", new Book());` | Orchestrator duyệt rồi thêm AddBookView vào cột "Ghi bởi" của `book` (§7/C12), hoặc bỏ cơ chế nháp |
| 4 | `src/main/webapp/nhan-vien/quan-tri/doAddBook.jsp:157` | Mức thấp. Trang ghi `listBook = [đầu truyện vừa thêm]`. Theo §7, chỉ SearchBookView, AddRentedBookView (và ManageBookView theo D6) được ghi `listBook` | `docs/contracts.md` §7, §9.2 D6 | `session.setAttribute("listBook", listBook);` | Ghi vào §7/C12 nếu giữ cách này |
| 5 | `src/main/webapp/nhan-vien/quan-tri/doUpdateBook.jsp:162` | Mức thấp. Trang thay phần tử cùng id trong `listBook`; doUpdateBook không có trong cột "Ghi bởi" của `listBook` (dù làm theo luật chung §7 về thuộc tính tuần tự hoá riêng) | `docs/contracts.md` §7 | `session.setAttribute("listBook", refreshed);` | Như #4 |
| 6 | `src/main/webapp/nhan-vien/doUpdateRentalBill.jsp:160` | Mức thấp. Khi lưu thành công, trang ghi `listRentalBill` (thay phần tử cùng id). Theo bảng §7, phía nhân viên chỉ SearchRentalBillView và "trang D9" được ghi `listRentalBill`; nhánh này làm theo luật chung §7 (ví dụ doCancelRentalBill) | `docs/contracts.md` §7 | `session.setAttribute("listRentalBill", updated);` | Thêm doUpdateRentalBill vào cột "Ghi bởi" của `listRentalBill` ở §7 |
| 7 | `src/main/webapp/nhan-vien/quan-tri/EditBookView.jsp:91` | Mức thấp. Có field ẩn `bookId` (chống hai thẻ) mà bảng D6 không có. `phase-07-edge-cases.md` §3.1 chỉ quy định `rentalBillId` cho trang M3; §3.4 không nói gì về field này | `docs/contracts.md` §9.2 D6, C12; `phase-07-edge-cases.md` §3.4 | `<input type="hidden" name="bookId" id="bookId" value="${bookId}">` | Ghi field kĩ thuật `bookId` vào C12 hoặc §3.4 của edge-cases |

## Đã kiểm

G1–G8 trên 5528 dòng thêm của 39 file, diff `origin/main...HEAD -- src/main/webapp/nhan-vien/ frontend/src/islands/ProcessBillDesk/ frontend/src/islands/CollateralDrawer/ docker/app/redisson.yaml src/test/java/vn/tiemtruyen/util/SerializationTest.java scripts/smoke/flow-m3.mjs scripts/smoke/seed-m3-precondition.mjs scripts/accept/phase-07.mjs`. Rule đã đọc: `tiem-business-contract.md`, `tiem-cook-orchestration.md`, `tiem-dao-rules.md`, `tiem-session-rules.md`, `tiem-ui-theme.md`; cùng `docs/contracts.md` §1–§14, `AGENTS.md` §10, `plans/261111-tiem-thue-truyen/phase-07-edge-cases.md`.

Kết quả từng kiểm:
- **G1 getById**: không khớp `(get|find|load|read|fetch|select)…By(Id|ID)`. Mọi lần chọn theo id đều tìm trong danh sách đã có trong session (`listRentalBill`, `listBook`, `listDamage`, `listCollateral`, `rentalBill.listRentedBook`).
- **G2 DAO thứ chín / DAO trung gian**: không có lớp `*DAO` mới. Chỉ dùng BookDAO, CollateralDAO, DamageDAO, RentalBillDAO, StaffDAO.
- **G3 dẫn xuất**: không có cột hay field mới. `quantity`, `total`, `totalCopies`, `totalMoney`, `copyCount`, `sum` chỉ là biến hay khoá map lúc hiển thị (§13).
- **G4 câu báo**: 27 hằng `Messages.*` được dùng đều có trong `Messages.java` (28 câu §10.1 + 9 câu §10.3). `QUANTITY_EXCEEDED` đi qua `Messages.quantityExceeded(int)`. Không có câu báo gõ thẳng trong JSP hay island (chỉ có trong chú thích).
- **G5 ngoài hợp đồng**: không có bảng hay cột mới. 16 trang JSP mới đều có trong §9.1 (12 trang M3 + 5 trang D6). Hàm DAO được gọi: checkLogin, searchRentalBill, updateRentalBill, searchBook, searchDamage, addDamage, searchCollateral, addCollateral, addBook, updateBook, đều có trong §5.3. Thuộc tính session: 11 trong 12 tên §7, cộng `uncheckedBarcodes` (C20).
- **G6/G7**: không có `extends HttpServlet`, `@WebServlet`, `servlet-mapping`, Spring (`HttpServletRequest` chỉ là kiểu tham số).
- **G8**: island không gọi mạng. Hai chỗ khớp `XMLHttpRequest` (`ProcessBillDesk.test.tsx:90`, `CollateralDrawer.test.tsx:72`) là spy trong test để khẳng định **không** gọi, nên không tính.
- **Cảnh báo phụ**: cả 15 trang View đều có `<form method="post">` kèm `<t:csrf/>`. Không có SQL trong JSP. Các hàm ghi (`updateRentalBill`, `addDamage`, `addCollateral`, `addBook`, `updateBook`) chỉ được gọi từ `doXxx.jsp`, trang View chỉ gọi hàm đọc. Mọi `doXxx.jsp` mới đều trả 405 khi không phải POST (C2). Tên field (`name`/`id`) khớp §9.2 và C1. Hai field ẩn `rentalBillId` (edge-cases §3.1) và `from=staff` (C8) có căn cứ. Props island khớp §11.2/§11.3 từng trường. Island chỉ đổi `chkReceived`, `txtDueDate`, `txtDiscount`, `txtCollateralValue`, `txtCollateralNote` và bấm đúng các nút §11.
- `scripts/smoke/seed-m3-precondition.mjs` ghép ngày tính sẵn vào SQL seed. Đây là script test chạy qua `mysql` trong container, không phải tầng DAO, nên không tính là nối chuỗi SQL của app.

Phần phase 6 (không kiểm đủ, chỉ lướt): hàm mới `CartDAO.lockFreeLines` là package-private, khớp §6.1 C21 ("hàm nội bộ package-private của CartDAO"). Hằng mới trong `Messages` khớp §10.3. Thuộc tính session ở filter và trang gốc chỉ gồm các tên §7 và `csrfToken`. Không thấy vi phạm rõ.

## Không kiểm được

- Không chạy test hay build (agent chỉ đọc). Cảnh báo #1 được suy ra từ mã (`listOnlyCopy` + `UPDATE_BILL`), chưa tái hiện trên stack.
