<%--
  AddRentedBookView (ch.9 tr.76; docs/contracts.md §9.2, §6.2, §7, C1, C9, C10). Trang xem, tự gửi, gọi BookDAO.searchBook.
  - Chỉ xử lí khi POST + dispatcher REQUEST, nhận việc bằng tên nút (phase-06-integration.md §3).
  - "Tìm" (btnSearch): từ khoá trim + NFC, cắt còn 100 kí tự; trống thì không gọi DAO (C9); searchBook → W listBook;
    rỗng → BOOK_NOT_FOUND.
  - "Thêm vào phiếu mượn" (btnAddToRentalBill): không chọn radio lnkChooseBook (C1) → BOOK_NOT_CHOSEN; id không có
    trong listBook → bỏ qua, hiện lại trang; txtQuantity không phải số nguyên ≥ 1 → QUANTITY_INVALID (aria-invalid);
    vượt số quyển đang sẵn sàng chưa có trong listRentedBook (kể cả 0) → QUANTITY_EXCEEDED (Messages.quantityExceeded);
    hợp lệ → mỗi quyển (id nhỏ nhất trước, §6.2) một RentedBook mới (giá hiện tại, selectedBook = null)
    → W listRentedBook, sendRedirect EditRentedBookListView (PRG).
  - "Quay lại" là <a href> về EditRentedBookListView.
  Đầu trang (phase-07-edge-cases.md §3.1): (1) thiếu rentalBill → 302 SearchRentalBillView, thiếu listRentedBook →
  302 EditRentedBookListView; (2) rentalBill không còn "Chờ nhận" → forward SearchRentalBillView kèm câu D9;
  (3) POST thiếu hoặc sai input ẩn rentalBillId → forward ProcessRentalBillView kèm RENTAL_BILL_CHANGED.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, jakarta.servlet.http.HttpServletRequest, java.text.Normalizer,
                 java.util.ArrayList, java.util.HashSet, java.util.LinkedHashMap, java.util.List, java.util.Map,
                 java.util.Set, vn.tiemtruyen.dao.BookDAO, vn.tiemtruyen.model.Book, vn.tiemtruyen.model.BookCopy,
                 vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.util.Codes,
                 vn.tiemtruyen.util.Display, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Độ dài tối đa của từ khoá tìm (phase-07-edge-cases.md §3.2): dài hơn thì cắt. */
    private static final int KEYWORD_MAX = 100;

    /** Bước (2), (3) đầu trang M3 (phase-07-edge-cases.md §3.1); null khi được xử lí tiếp. */
    private static String billGuard(HttpServletRequest request, RentalBill bill, boolean checkFormId) {
        if (!RentalBill.STATUS_PENDING.equals(bill.getStatus())) {
            request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(bill.getStatus())
                    ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
            return "/nhan-vien/SearchRentalBillView.jsp";
        }
        String formId = request.getParameter("rentalBillId");
        if (checkFormId && (formId == null || !formId.strip().equals(String.valueOf(bill.getId())))) {
            request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
            return "/nhan-vien/ProcessRentalBillView.jsp";
        }
        return null;
    }

    /** Ô chữ đã trim và chuẩn hoá NFC (phase-06-integration.md §6.1); thiếu tham số thì chuỗi rỗng. */
    private static String clean(String value) {
        return value == null ? "" : Normalizer.normalize(value.strip(), Normalizer.Form.NFC);
    }

    /** Số nguyên dương vừa int; 0 khi trống, 0, âm, thập phân, chữ hay quá int (QUANTITY_INVALID). */
    private static int positiveInt(String text) {
        String value = clean(text);
        if (!value.matches("\\d{1,10}")) {
            return 0;
        }
        long number = Long.parseLong(value);
        return number > Integer.MAX_VALUE ? 0 : (int) number;
    }
%>
<%
    String base = request.getContextPath() + "/nhan-vien";
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null) {
        response.sendRedirect(base + "/SearchRentalBillView.jsp");
        return;
    }
    @SuppressWarnings("unchecked")
    List<RentedBook> listRentedBook = (List<RentedBook>) session.getAttribute("listRentedBook");
    if (listRentedBook == null) {
        // Bản sao do EditRentedBookListView tạo khi mở; chưa có thì về trang đó để chép từ rentalBill.
        response.sendRedirect(base + "/EditRentedBookListView.jsp");
        return;
    }
    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    String guard = billGuard(request, rentalBill, selfPost);
    if (guard != null) {
        request.getRequestDispatcher(guard).forward(request, response);
        return;
    }

    @SuppressWarnings("unchecked")
    List<Book> listBook = (List<Book>) session.getAttribute("listBook");
    String message = (String) request.getAttribute("message");
    String messageKind = "error";
    boolean bookInvalid = false;
    boolean quantityInvalid = false;
    String keyword = clean(request.getParameter("txtKeyword"));
    // Từ khoá dài quá KEYWORD_MAX kí tự: INPUT_TOO_LONG, không gọi DAO (docs/contracts.md §10.3).
    boolean keywordTooLong = keyword.codePointCount(0, keyword.length()) > KEYWORD_MAX;
    String chosenParam = selfPost ? clean(request.getParameter("lnkChooseBook")) : "";
    int chosenBookId = positiveInt(chosenParam);

    if (selfPost && request.getParameter("btnSearch") != null && keywordTooLong) {
        message = Messages.INPUT_TOO_LONG;
    } else if (selfPost && request.getParameter("btnSearch") != null) {
        if (keyword.isEmpty()) {
            listBook = new ArrayList<>();
        } else {
            try (BookDAO dao = new BookDAO()) {
                listBook = dao.searchBook(keyword);
            }
        }
        session.setAttribute("listBook", listBook);
        chosenBookId = 0;
        if (listBook.isEmpty()) {
            message = Messages.BOOK_NOT_FOUND;
            messageKind = "info";
        }
    } else if (selfPost && request.getParameter("btnAddToRentalBill") != null) {
        Book chosen = null;
        if (listBook != null) {
            for (Book book : listBook) {
                if (book.getId() == chosenBookId) {
                    chosen = book;
                }
            }
        }
        int quantity = positiveInt(request.getParameter("txtQuantity"));
        if (chosenParam.isEmpty()) {
            message = Messages.BOOK_NOT_CHOSEN;
            bookInvalid = true;
        } else if (chosen == null) {
            chosenBookId = 0; // id sửa tay hay không còn trong listBook: bỏ qua, hiện lại trang
        } else if (quantity == 0) {
            message = Messages.QUANTITY_INVALID;
            quantityInvalid = true;
        } else {
            Set<Integer> inList = new HashSet<>();
            for (RentedBook row : listRentedBook) {
                inList.add(row.getBookCopy().getId());
            }
            List<BookCopy> free = new ArrayList<>();
            for (BookCopy copy : chosen.getListBookCopy()) { // searchBook trả quyển đang sẵn sàng, id tăng dần
                if (!inList.contains(copy.getId())) {
                    free.add(copy);
                }
            }
            if (quantity > free.size()) {
                message = Messages.quantityExceeded(free.size());
                quantityInvalid = true;
            } else {
                for (BookCopy copy : free.subList(0, quantity)) {
                    RentedBook row = new RentedBook();
                    row.setRentalPrice(chosen.getRentalPrice());
                    row.setBookCopy(copy);
                    row.setSelectedBook(null);
                    listRentedBook.add(row);
                }
                session.setAttribute("listRentedBook", listRentedBook);
                response.sendRedirect(base + "/EditRentedBookListView.jsp");
                return;
            }
        }
    }

    List<Map<String, Object>> rows = new ArrayList<>();
    if (listBook != null) {
        for (Book book : listBook) {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("id", book.getId());
            view.put("code", Codes.bookCode(book.getId()));
            view.put("name", book.getName());
            view.put("author", book.getAuthor());
            view.put("category", book.getCategory());
            view.put("price", Display.money(book.getRentalPrice()));
            view.put("available", book.getListBookCopy().size());
            view.put("checked", book.getId() == chosenBookId);
            rows.add(view);
        }
    }
    pageContext.setAttribute("base", base);
    pageContext.setAttribute("billId", rentalBill.getId());
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("pageMessage", message);
    pageContext.setAttribute("messageKind", messageKind);
    pageContext.setAttribute("bookInvalid", bookInvalid);
    pageContext.setAttribute("quantityInvalid", quantityInvalid);
    pageContext.setAttribute("keywordValue", selfPost ? keyword : "");
    pageContext.setAttribute("quantityValue", selfPost ? clean(request.getParameter("txtQuantity")) : "");
%>
<t:layout title="Thêm truyện vào phiếu mượn">
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-2 border-b border-dashed border-ink-soft pb-4">
      <nav aria-label="Đường dẫn" class="text-sm text-ink-soft">
        <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
          <li><a href="${base}/StaffHomeView.jsp">Trang chủ nhân viên</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/SearchRentalBillView.jsp">Tìm phiếu mượn</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/ProcessRentalBillView.jsp">Xử lí phiếu mượn</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/EditRentedBookListView.jsp">Chỉnh sửa danh sách truyện</a></li>
          <li aria-current="page" class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>Thêm truyện vào phiếu mượn</li>
        </ol>
      </nav>
      <h1 class="m-0">Thêm truyện vào phiếu mượn</h1>
      <p class="m-0 max-w-3xl text-ink-soft">Tìm đầu truyện, chọn một dòng trong bảng, nhập số quyển rồi bấm Thêm vào phiếu mượn. Tiệm tự lấy các quyển đang còn trống của đầu truyện đó.</p>
    </header>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="${messageKind}" text="${pageMessage}"/></c:if>
    <form method="post" action="${base}/AddRentedBookView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <input type="hidden" name="rentalBillId" value="${billId}">
      <div class="tt-paper-card grid gap-2">
        <label for="txtKeyword">Từ khoá</label>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="text" id="txtKeyword" name="txtKeyword" value="${fn:escapeXml(keywordValue)}" maxlength="100" placeholder="Nhập tên đầu truyện hoặc tên tác giả…" aria-describedby="txtKeyword-hint" class="h-11 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3 text-ink">
          <button type="submit" id="btnSearch" name="btnSearch" class="tt-btn tt-btn--primary"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><span>Tìm</span></button>
        </div>
        <p id="txtKeyword-hint" class="m-0 text-sm text-ink-soft">Tìm theo tên đầu truyện hoặc tên tác giả, gõ một phần tên cũng được.</p>
      </div>
      <div class="flex flex-col gap-3">
        <div class="overflow-x-auto">
          <table id="tblBook" class="tt-ledger-table">
            <caption class="tt-ledger-table__caption">Danh sách đầu truyện</caption>
            <thead>
              <tr>
                <th scope="col">Mã đầu truyện</th>
                <th scope="col">Tên đầu truyện</th>
                <th scope="col">Tác giả</th>
                <th scope="col">Thể loại</th>
                <th scope="col" class="text-right">Giá thuê theo ngày</th>
                <th scope="col" class="text-right">Số lượng hiện có</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="row" items="${rows}">
                <tr>
                  <td class="font-num">${row.code}</td>
                  <td>
                    <label class="flex cursor-pointer items-center gap-2">
                      <input type="radio" name="lnkChooseBook" id="lnkChooseBook-${row.id}" value="${row.id}"${row.checked ? ' checked' : ''}${bookInvalid ? ' aria-invalid="true"' : ''} class="size-4 accent-pen-blue">
                      <span class="text-pen-blue underline"><c:out value="${row.name}"/></span>
                    </label>
                  </td>
                  <td><c:out value="${row.author}"/></td>
                  <td><c:out value="${row.category}"/></td>
                  <td class="font-num text-right">${row.price}</td>
                  <td class="font-num text-right">${row.available}</td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <c:if test="${empty rows}"><p class="m-0 border border-dashed border-ink-soft bg-paper-deep px-4 py-3 text-ink">Chưa có đầu truyện nào trong bảng. Nhập từ khoá ở ô trên rồi bấm Tìm.</p></c:if>
      </div>
      <div class="tt-paper-card grid gap-2 sm:max-w-sm">
        <label for="txtQuantity">Số lượng:</label>
        <input type="number" id="txtQuantity" name="txtQuantity" value="${fn:escapeXml(quantityValue)}" aria-describedby="txtQuantity-hint" class="h-11 w-32 rounded-paper border border-input bg-paper px-3 font-num text-ink aria-invalid:border-destructive"${quantityInvalid ? ' aria-invalid="true"' : ''}>
        <p id="txtQuantity-hint" class="m-0 text-sm text-ink-soft">Số nguyên từ 1 trở lên, không quá số quyển còn trống chưa có trong phiếu.</p>
      </div>
      <div class="flex flex-wrap gap-3 border-t border-dashed border-ink-soft pt-4">
        <button type="submit" id="btnAddToRentalBill" name="btnAddToRentalBill" class="tt-btn tt-btn--primary"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg><span>Thêm vào phiếu mượn</span></button>
        <a id="lnkBack" href="${base}/EditRentedBookListView.jsp" class="tt-btn tt-btn--ghost"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg><span>Quay lại</span></a>
      </div>
    </form>
  </div>
</t:layout>
