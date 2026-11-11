<%--
  AddRentedBookView (ch.9 tr.76; docs/contracts.md §9.2, §6.2, §7, C1, C9, C10). Trang xem, tự gửi, gọi BookDAO.searchBook.
  - Chỉ xử lí khi POST + dispatcher REQUEST, nhận việc bằng tên nút (phase-06-integration.md §3).
  - "Tìm" (btnSearch): từ khoá trống thì không gọi DAO (C9); searchBook → W listBook; rỗng → BOOK_NOT_FOUND.
  - "Thêm vào phiếu mượn" (btnAddToRentalBill): đầu truyện chọn bằng radio lnkChooseBook (C1) trong listBook;
    chưa chọn hoặc txtQuantity không phải số nguyên dương → aria-invalid, hiện lại trang (C10); vượt quá số quyển
    đang sẵn sàng chưa có trong listRentedBook → QUANTITY_EXCEEDED (Messages.quantityExceeded); hợp lệ → mỗi quyển
    (id nhỏ nhất trước, §6.2) một RentedBook mới (giá hiện tại, selectedBook = null) → W listRentedBook,
    sendRedirect EditRentedBookListView (PRG).
  - "Quay lại" là <a href> về EditRentedBookListView.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, java.util.ArrayList, java.util.HashSet, java.util.LinkedHashMap,
                 java.util.List, java.util.Map, java.util.Set, vn.tiemtruyen.dao.BookDAO, vn.tiemtruyen.model.Book,
                 vn.tiemtruyen.model.BookCopy, vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.util.Codes,
                 vn.tiemtruyen.util.Display, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Số nguyên dương trong chuỗi, 0 khi trống hoặc không phải số nguyên dương (trang coi là đầu vào sai, C10). */
    private static int positiveInt(String text) {
        if (text == null || !text.strip().matches("\\d{1,9}")) {
            return 0;
        }
        return Integer.parseInt(text.strip());
    }
%>
<%
    String base = request.getContextPath() + "/nhan-vien";
    @SuppressWarnings("unchecked")
    List<RentedBook> listRentedBook = (List<RentedBook>) session.getAttribute("listRentedBook");
    if (listRentedBook == null) {
        // Bản sao do EditRentedBookListView tạo khi mở; chưa có thì về trang đó để chép từ rentalBill.
        response.sendRedirect(base + "/EditRentedBookListView.jsp");
        return;
    }
    @SuppressWarnings("unchecked")
    List<Book> listBook = (List<Book>) session.getAttribute("listBook");

    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    String message = (String) request.getAttribute("message");
    String messageKind = "error";
    boolean bookInvalid = false;
    boolean quantityInvalid = false;
    int chosenBookId = selfPost ? positiveInt(request.getParameter("lnkChooseBook")) : 0;

    if (selfPost && request.getParameter("btnSearch") != null) {
        String keyword = request.getParameter("txtKeyword") == null ? "" : request.getParameter("txtKeyword").strip();
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
        bookInvalid = chosen == null;
        quantityInvalid = quantity == 0;
        if (!bookInvalid && !quantityInvalid) {
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
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("pageMessage", message);
    pageContext.setAttribute("messageKind", messageKind);
    pageContext.setAttribute("bookInvalid", bookInvalid);
    pageContext.setAttribute("quantityInvalid", quantityInvalid);
    pageContext.setAttribute("keywordValue", selfPost ? request.getParameter("txtKeyword") : null);
    pageContext.setAttribute("quantityValue", selfPost ? request.getParameter("txtQuantity") : null);
%>
<t:layout title="Thêm truyện vào phiếu mượn">
  <section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Thêm truyện vào phiếu mượn</h1>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="${messageKind}" text="${pageMessage}"/></c:if>
    <form method="post" action="${base}/AddRentedBookView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <p class="m-0 flex flex-wrap items-center gap-4">
        <label for="txtKeyword" class="sr-only">Từ khoá</label>
        <input type="text" id="txtKeyword" name="txtKeyword" value="${fn:escapeXml(keywordValue)}" placeholder="Nhập tên đầu truyện hoặc tên tác giả…" class="h-9 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3 py-1 text-ink">
        <button type="submit" id="btnSearch" name="btnSearch" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Tìm</button>
      </p>
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
                  <label class="flex items-center gap-2">
                    <input type="radio" name="lnkChooseBook" id="lnkChooseBook-${row.id}" value="${row.id}"${row.checked ? ' checked' : ''}${bookInvalid ? ' aria-invalid="true"' : ''}>
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
      <p class="m-0 flex flex-wrap items-center gap-4">
        <label for="txtQuantity">Số lượng:</label>
        <input type="number" id="txtQuantity" name="txtQuantity" value="${fn:escapeXml(quantityValue)}" class="h-9 w-32 rounded-paper border border-input bg-paper px-3 py-1 font-num text-ink aria-invalid:border-destructive"${quantityInvalid ? ' aria-invalid="true"' : ''}>
      </p>
      <p class="m-0 flex flex-wrap gap-4">
        <button type="submit" id="btnAddToRentalBill" name="btnAddToRentalBill" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Thêm vào phiếu mượn</button>
        <a id="lnkBack" href="${base}/EditRentedBookListView.jsp" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Quay lại</a>
      </p>
    </form>
  </section>
</t:layout>
