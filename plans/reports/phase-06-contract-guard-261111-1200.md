# tiem-contract-guard: báo cáo (phase 6, bước 6.9, tiêu chí 5)

- Base: origin/main (34879ed78746761f072b970f6c4eb4e78aff4420) · Head: HEAD lúc quét (ab668666e3761af2a5e861c37c853f020ca5bd82), nhánh `phase/06-chuc-nang-1-2` · Lúc chạy: 2026-11-11 11:50–12:00
- File trong diff: 98 · Thay đổi chưa commit: không
- Trong lúc quét, HEAD tiến lên 1784105 (da5fd7b + merge lane 6G); hai commit này chỉ sửa `plans/reports/phase-06-dao-dong-gio-261111-1138.md` (14 dòng tài liệu), không đổi kết luận.
- Kết luận: 0 vi phạm (block 0), 4 cảnh báo (warn 4)
- Đã chốt từ trước, không tính là vi phạm (theo brief của orchestrator, đã đọc lại trong ngữ cảnh): `CartDAO.lockFreeLines` package-private static (`docs/contracts.md` §6.1 bước 1, C21); `updateCart` khoá dòng của chính giỏ (§6.1 đoạn cuối, C21); 9 câu §10.3.

## Vi phạm

Không có.

## Cảnh báo

| # | Vị trí | Luật | Mục hợp đồng | Mức | Bằng chứng | Lí do |
|---|---|---|---|---|---|---|
| 1 | `src/main/webapp/error/403.jsp:1`, `404.jsp:1`, `405.jsp:1`, `500.jsp:1`, `error.jsp:1` | Gần G5 (trang JSP mới ngoài danh mục) | `docs/contracts.md` §9.1 (không liệt kê), §12 (có `/error/*` luôn mở), §5.2 ("trang lỗi chung xử lí") | warn | `<p class="mb-6">Có lỗi xảy ra ở phía tiệm nên chưa làm được việc bạn vừa gửi. Bạn thử lại sau ít phút nhé.</p>` (500.jsp:13) | Năm trang lỗi không có trong bảng §9.1 hay danh sách trang công cụ, nhưng §12 đã mở `/error/*` và `phase-06-integration.md` §2 lên kế hoạch đúng năm trang. Chữ trong trang là nội dung trang, không phải câu báo `message`, nên không tính G4. Đề xuất: orchestrator thêm một dòng "trang lỗi `/error/*.jsp`" vào §9.1 (cạnh danh sách trang công cụ) để danh mục khớp mã. |
| 2 | `src/main/webapp/RentalBillDetailView.jsp:48` | Lệch hiển thị | `docs/contracts.md` §13 (Tình trạng khi giao: chưa ghi nhận → `(chưa ghi nhận)`), C7 | warn | `String condition = "";` | Quyển có `conditionNote` NULL hiện chuỗi rỗng thay vì `(chưa ghi nhận)`. Cột chỉ hiện với phiếu "Đang cho thuê", mà §10.2 điều kiện 2 bắt mọi quyển đã giao có tình trạng, nên nhánh này gần như không chạm; vẫn lệch chữ của §13. |
| 3 | `scripts/smoke/lib/e2e-db.mjs:95` (cùng kiểu ở :73–75, :93) | SQL nối chuỗi | `AGENTS.md` §10 ("cấm nối chuỗi SQL (chỉ `PreparedStatement`)") | warn | `SET @c = (SELECT id FROM tblUser WHERE username = '${username}');` | Công cụ smoke (không phải code ứng dụng) ghép tham số hàm `username` và mã vạch vào SQL chạy bằng `mysql` CLI, không escape. Giá trị hiện đều là hằng của kịch bản ch.2, nên chỉ là rủi ro khi ai đó gọi hàm với chuỗi có dấu nháy. |
| 4 | `src/test/java/vn/tiemtruyen/dao/RentalBillCartLineTest.java:48` | SQL nối chuỗi | `AGENTS.md` §10, `.claude/rules/tiem-dao-rules.md` ("SQL chỉ `PreparedStatement`, không nối chuỗi") | warn | `private static final String BILLS_OF_NAM = "SELECT COUNT(*) FROM tblRentalBill WHERE clientId = " + NAM;` | Test ghép hằng số nguyên vào SQL. Không có dữ liệu ngoài, nhưng rule nói chung "không nối chuỗi"; dùng `?` cho đồng bộ. |

## Đã kiểm

G1–G8 trên 7919 dòng thêm của 98 file, diff `origin/main...ab66866`; rule đã đọc: `.claude/rules/tiem-business-contract.md`, `tiem-cook-orchestration.md`, `tiem-dao-rules.md`, `tiem-session-rules.md`, `tiem-ui-theme.md`; `AGENTS.md` §10; `docs/contracts.md` §1–§3, §5 (5.1–5.3), §6.1–6.3 (C21), §7, §8, §9.1–9.2, §10.1–10.3, §11 (11.1, 11.4), §12, §13, §14 C1–C21.

Chi tiết từng kiểm:

- **G1** (đọc theo id): không dòng thêm nào trong `**/dao/**` khớp `(get|find|load|read|fetch|select)\w*By(Id|ID)`. Ứng viên `RentalBillCartLineTest.java:185` `private static Cart getCart(int clientId)` đã đọc lại: hàm phụ private của test, gọi `CartDAO.getCart(client(clientId))`; không phải hàm DAO, loại.
- **G2** (DAO thứ chín, DAO lớp trung gian): không lớp hay file `*DAO` mới.
- **G3** (cột, field dẫn xuất): không file `*.sql` hay `pipeline/src/steps/export*` nào trong diff; `model/RentalBill.java` chỉ thêm hằng `MAX_EXPECTED_DAYS = 30` (C15), không phải field. `quantity` ở props `SelectedStack` là DTO §11.1, tính lúc hiển thị.
- **G4** (câu báo): 37 hằng của `Messages.java` so từng kí tự với bảng §10.1 (28) và §10.3 (9): khớp hết, tên hằng khớp. Không câu nào trong 37 câu bị gõ thẳng vào JSP hay island (chỉ có ở fixture test `message-ok.test.ts`). `CANCEL_CONFIRM` đọc từ hằng (`RentalBillListView.jsp:101`); `QUANTITY_EXCEEDED` qua `Messages.quantityExceeded` (`doAddSelectedBook.jsp:56`).
- **G5** (thêm ngoài hợp đồng): không `CREATE TABLE`/cột mới. Hàm mới trong DAO: chỉ `CartDAO.lockFreeLines` (package-private static, đã chốt §6.1); `RentalBillDAO.reserveCopies` vẫn private, chỉ thêm tham số `client`. Thuộc tính session dùng ở code thêm: `client`, `staff`, `cart`, `rentalBill`, `listBook`, `book`, `listRentalBill` (đúng §7) và `csrfToken` (kĩ thuật); trang ghi, đọc, bỏ khớp bảng §7, C5, C6, C21 (doAddRentalBill thay `cart`, bỏ `rentalBill` khi `SELECTED_BOOKS_CHANGED`). Trang JSP mới: 17 trang có ở §9.1 (gồm `doLogout.jsp` C14) và 5 trang lỗi (cảnh báo 1).
- **G6** (Servlet điều khiển): không `extends HttpServlet`, `@WebServlet`, `<servlet>`/`<servlet-mapping>`; `web.xml` chỉ thêm 5 filter và `error-page`. Ứng viên `LoginRateLimitFilter.java:168` là `HttpServletRequestWrapper`, loại.
- **G7** (Spring): `pom.xml` chỉ thêm `org.redisson:redisson` scope provided; không Spring, không `@Controller`.
- **G8** (island gọi mạng): không `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`EventSource`/`axios` trong `frontend/src/islands/**` và `frontend/src/loader/**` ngoài test. Ứng viên `SelectedStack.test.tsx:80` là `vi.spyOn(XMLHttpRequest.prototype, 'open')` để khẳng định không gọi, loại.

Kiểm thêm (không thấy lệch):

- Mọi `<form>` thêm có `<t:csrf/>` (BookDetailView 1/1, ClientHomeView 1/1, ConfirmRentalBillView 1/1, LoginView 1/1, RegisterView 1/1, RentalBillListView 2/2, SearchBookView 2/2).
- Trang `XxxView.jsp` chỉ gọi hàm DAO đọc: `LoginView` (`ClientDAO.checkLogin`), `SearchBookView` (`CartDAO.getCart`, `BookDAO.searchBook`), `RentalBillListView` (`getRentalBillList`). Ghi DB chỉ ở `doRegister`, `doAddSelectedBook`, `doDeleteSelectedBook`, `doAddRentalBill`, `doCancelRentalBill`; mọi `do*.jsp` trả 405 với method khác POST (C2).
- D9 ở `doCancelRentalBill.jsp`: đọc lại bằng `getRentalBillList(client)` / `searchRentalBill(Codes.rentalBillCode(id))`, chọn câu theo trạng thái mới, đúng §6.3. C8 (`from` khớp vai, sai thì 403), C17 (`CANCEL_REASON_REQUIRED`, `INPUT_TOO_LONG`).
- K1/C21: `RentalBillDAO.reserveCopies` khoá `tblBook` theo id tăng dần rồi gọi `CartDAO.lockFreeLines` (khoá `tblSelectedBook` theo id tăng dần, đếm lại bằng lệnh đọc riêng, từ chối hai dòng phiếu trỏ cùng dòng giỏ). SQL ghép trong `CartDAO` chỉ nối chuỗi `?` cố định, giá trị đều qua `setInt`/`setString`.
- `AuthFilter` khớp ma trận §12 (mở: Home, Register, doRegister, hai LoginView, doLogout, health, `/static/`, `/error/`, `/dev/`; doCancelRentalBill cho khách hoặc nhân viên; `/nhan-vien/quan-tri/` 403 khi không phải "Quản lí"; khách cần `client.id > 0`, C5). C16 `?expired=1`.
- Island `SelectedStack`: props `rows[{bookId, bookCode, name, author, quantity, checked}]`, `focusBookId: number | null` đúng §11.1; `ShelfScene` thêm `posterNarrowSrc: string | null` đúng §11.4.
- Không chuỗi trạng thái phiếu nào gõ lại ở trang ngoài chú thích (§4); không `style=`, `<style>`, mã màu thẳng trong JSP/frontend thêm.

## Không kiểm được

Không có. (Không chạy Docker, Maven hay test theo brief; kết luận dựa trên đọc diff và mã ở HEAD.)
