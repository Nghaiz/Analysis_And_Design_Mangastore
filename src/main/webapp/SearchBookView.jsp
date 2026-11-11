<%--
  SearchBookView (ch.9 tr.62–63; docs/contracts.md §9.2, §7, §11.1). Trang xem, chỉ gọi DAO đọc.
  - Mở lần đầu (session chưa có cart): CartDAO.getCart(client) → cart; RentalBill mới gồm client → rentalBill.
    rentalBill trong session đã là phiếu đã lưu (id > 0, do RentalBillListView ghi) thì cũng tạo phiếu mới, để
    "Tạo phiếu mượn" không bao giờ điền dòng vào một phiếu đã có.
  - Chỉ xử lí khi POST + DispatcherType.REQUEST, nhận ra việc bằng tên nút (phase-06-integration.md §3):
    btnSearch (BookDAO.searchBook → listBook; từ khoá trim + NFC; trống không gọi DAO, BOOK_NOT_FOUND, C9; quá 100
    kí tự → INPUT_TOO_LONG, không gọi DAO, ô aria-invalid), lnkChooseBook (→ book, BookDetailView),
    lnkDeleteSelectedBook (→ book, forward doDeleteSelectedBook), btnCreateRentalBill (dòng giỏ của các đầu truyện đã
    tích → rentalBill.listRentedBook, ConfirmRentalBillView; không tích dòng nào → BOOK_NOT_CHOSEN, §10.3).
    id trên nút dòng không phải số hoặc không có trong listBook/cart: bỏ qua, hiện lại trang.
  - Khung "Truyện đã chọn" render HTML đầy đủ (chạy không cần JS); island SelectedStack gắn trong cùng form,
    props id selected-stack-props đúng §11.1 (DTO là Map, không đưa thẳng model vào JsonUtil).
  Không <style>, không style=, không <script> thực thi (CSP).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer, java.util.ArrayList, java.util.HashSet, java.util.LinkedHashMap, java.util.List, java.util.Map, java.util.Set" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.dao.BookDAO, vn.tiemtruyen.dao.CartDAO" %>
<%@ page import="vn.tiemtruyen.model.Book, vn.tiemtruyen.model.Cart, vn.tiemtruyen.model.Client" %>
<%@ page import="vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.model.SelectedBook" %>
<%@ page import="vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Display, vn.tiemtruyen.util.JsonUtil, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Từ khoá dài hơn thì INPUT_TOO_LONG, không gọi DAO (phase-06-integration.md §6.1, bảng M2; §10.3). */
    private static final int KEYWORD_MAX = 100;
%>
<%
    String ctx = request.getContextPath();
    Client client = (Client) session.getAttribute("client");
    Cart cart = (Cart) session.getAttribute("cart");
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (cart == null) {
        try (CartDAO cartDAO = new CartDAO()) {
            cart = cartDAO.getCart(client);
        }
        session.setAttribute("cart", cart);
        rentalBill = null;
    }
    if (rentalBill == null || rentalBill.getId() != 0) {
        rentalBill = new RentalBill();
        rentalBill.setClient(client);
        session.setAttribute("rentalBill", rentalBill);
    }

    @SuppressWarnings("unchecked")
    List<Book> listBook = (List<Book>) session.getAttribute("listBook");
    String keyword = "";
    boolean keywordInvalid = false;
    String message = (String) request.getAttribute("message");

    Set<Integer> checkedBookIds = new HashSet<>();
    String[] checkedValues = request.getParameterValues("chkSelectedBook");
    if (checkedValues != null) {
        for (String value : checkedValues) {
            try {
                checkedBookIds.add(Integer.valueOf(value.strip()));
            } catch (NumberFormatException ignored) {
                // Giá trị ô tích không phải id đầu truyện: bỏ qua ô đó, như không tích (C10).
            }
        }
    }

    boolean submitted = "POST".equals(request.getMethod()) && request.getDispatcherType() == DispatcherType.REQUEST;
    if (submitted && request.getParameter("btnSearch") != null) {
        String raw = request.getParameter("txtKeyword") == null ? "" : request.getParameter("txtKeyword");
        keyword = Normalizer.normalize(raw, Normalizer.Form.NFC).strip();
        if (keyword.codePointCount(0, keyword.length()) > KEYWORD_MAX) {
            message = Messages.INPUT_TOO_LONG;
            keywordInvalid = true;
        } else {
            if (keyword.isEmpty()) {
                listBook = new ArrayList<>();
            } else {
                try (BookDAO bookDAO = new BookDAO()) {
                    listBook = bookDAO.searchBook(keyword);
                }
            }
            session.setAttribute("listBook", listBook);
            if (listBook.isEmpty()) {
                message = Messages.BOOK_NOT_FOUND;
            }
        }
    } else if (submitted && request.getParameter("lnkChooseBook") != null) {
        String chosen = request.getParameter("lnkChooseBook").strip();
        if (listBook != null) {
            for (Book candidate : listBook) {
                if (String.valueOf(candidate.getId()).equals(chosen)) {
                    session.setAttribute("book", candidate);
                    response.sendRedirect(ctx + "/BookDetailView.jsp");
                    return;
                }
            }
        }
    } else if (submitted && request.getParameter("lnkDeleteSelectedBook") != null) {
        String chosen = request.getParameter("lnkDeleteSelectedBook").strip();
        for (SelectedBook line : cart.getListSelectedBook()) {
            Book lineBook = line.getBookCopy().getBook();
            if (String.valueOf(lineBook.getId()).equals(chosen)) {
                session.setAttribute("book", lineBook);
                request.getRequestDispatcher("/doDeleteSelectedBook.jsp").forward(request, response);
                return;
            }
        }
    } else if (submitted && request.getParameter("btnCreateRentalBill") != null) {
        List<RentedBook> rows = new ArrayList<>();
        for (SelectedBook line : cart.getListSelectedBook()) {
            Book lineBook = line.getBookCopy().getBook();
            if (checkedBookIds.contains(lineBook.getId())) {
                RentedBook row = new RentedBook();
                row.setSelectedBook(line);
                row.setBookCopy(line.getBookCopy());
                row.setRentalPrice(lineBook.getRentalPrice());
                rows.add(row);
            }
        }
        if (!rows.isEmpty()) {
            rentalBill.setListRentedBook(rows);
            session.setAttribute("rentalBill", rentalBill);
            response.sendRedirect(ctx + "/ConfirmRentalBillView.jsp");
            return;
        }
        message = Messages.BOOK_NOT_CHOSEN;
    }

    // Bảng đầu truyện (kết quả tìm gần nhất trong session).
    List<Map<String, Object>> bookRows = new ArrayList<>();
    if (listBook != null) {
        for (Book b : listBook) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", b.getId());
            r.put("code", Codes.bookCode(b.getId()));
            r.put("name", b.getName());
            r.put("author", b.getAuthor());
            r.put("category", b.getCategory());
            r.put("price", Display.money(b.getRentalPrice()));
            r.put("available", b.getListBookCopy().size());
            bookRows.add(r);
        }
    }

    // Khung "Truyện đã chọn": gộp dòng giỏ theo đầu truyện, thứ tự như trong cart (§9.2, §11.1).
    Map<Integer, Map<String, Object>> grouped = new LinkedHashMap<>();
    for (SelectedBook line : cart.getListSelectedBook()) {
        Book b = line.getBookCopy().getBook();
        Map<String, Object> r = grouped.get(b.getId());
        if (r == null) {
            r = new LinkedHashMap<>();
            r.put("bookId", b.getId());
            r.put("bookCode", Codes.bookCode(b.getId()));
            r.put("name", b.getName());
            r.put("author", b.getAuthor());
            r.put("quantity", 0);
            r.put("checked", checkedBookIds.contains(b.getId()));
            grouped.put(b.getId(), r);
        }
        r.put("quantity", (Integer) r.get("quantity") + 1);
    }
    List<Map<String, Object>> selectedRows = new ArrayList<>(grouped.values());
    Book focusBook = (Book) session.getAttribute("book");
    Map<String, Object> selectedStackProps = new LinkedHashMap<>();
    selectedStackProps.put("rows", selectedRows);
    selectedStackProps.put("focusBookId", focusBook == null ? null : focusBook.getId());

    pageContext.setAttribute("ctx", ctx);
    pageContext.setAttribute("keyword", keyword);
    pageContext.setAttribute("keywordInvalid", keywordInvalid);
    pageContext.setAttribute("message", message);
    pageContext.setAttribute("messageKind", Messages.BOOK_NOT_FOUND.equals(message) ? "info" : "error");
    pageContext.setAttribute("bookRows", bookRows);
    pageContext.setAttribute("selectedRows", selectedRows);
    pageContext.setAttribute("selectedStackJson", JsonUtil.toScriptJson(selectedStackProps));
%>
<t:layout title="Tìm truyện">
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <p class="tt-hero__eyebrow">Kệ truyện của tiệm</p>
      <h1 class="m-0">Tìm truyện</h1>
      <p class="m-0 text-ink-soft">Tìm đầu truyện, mở chi tiết để thêm các tập muốn mượn vào "Truyện đã chọn", rồi tạo phiếu mượn ở cuối trang.</p>
    </header>

    <c:if test="${not empty message}">
      <div><ui:message-box kind="${messageKind}" text="${message}"/></div>
    </c:if>

    <form method="post" action="${ctx}/SearchBookView.jsp" class="flex flex-col gap-5" role="search">
      <t:csrf/>
      <div class="tt-paper-card tt-worn flex flex-col gap-2">
        <label for="txtKeyword" class="font-type text-ink">Từ khoá tìm truyện</label>
        <div class="flex flex-wrap items-stretch gap-2">
          <input type="search" name="txtKeyword" id="txtKeyword" value="${fn:escapeXml(keyword)}" maxlength="100"${keywordInvalid ? ' aria-invalid="true"' : ''}
                 placeholder="Nhập tên đầu truyện hoặc tên tác giả…" aria-describedby="txtKeywordHint"
                 class="min-w-0 flex-1 basis-56 rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue aria-invalid:border-2 aria-invalid:border-stamp-red">
          <button type="submit" name="btnSearch" id="btnSearch" class="tt-btn tt-btn--primary">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <span>Tìm</span>
          </button>
        </div>
        <p id="txtKeywordHint" class="m-0 text-sm text-ink-soft">Ví dụ: Doraemon, Conan. Tìm theo tên đầu truyện hoặc tên tác giả, tối đa 100 kí tự.</p>
      </div>

      <section aria-labelledby="search-result-h" class="flex flex-col gap-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="search-result-h" class="m-0">Kết quả tìm</h2>
          <c:if test="${not empty bookRows}">
            <p class="m-0 text-sm text-ink-soft"><span class="font-num">${fn:length(bookRows)}</span> đầu truyện. Bấm tên truyện để xem chi tiết.</p>
          </c:if>
        </div>
        <div class="overflow-x-auto">
          <table class="tt-ledger-table" id="tblBook">
            <caption class="tt-ledger-table__caption sr-only">Danh sách đầu truyện</caption>
            <thead>
              <tr>
                <th scope="col">Mã đầu truyện</th>
                <th scope="col">Tên đầu truyện</th>
                <th scope="col">Tác giả</th>
                <th scope="col">Thể loại</th>
                <th scope="col">Giá thuê theo ngày</th>
                <th scope="col">Số lượng hiện có</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="b" items="${bookRows}">
                <tr>
                  <td class="font-num"><c:out value="${b.code}"/></td>
                  <td>
                    <div class="flex min-w-48 items-center gap-3">
                      <span class="block w-16 flex-none"><ui:book-cover bookId="${b.id}" name="${b.name}" size="sm"/></span>
                      <button type="submit" name="lnkChooseBook" value="${b.id}"
                              class="cursor-pointer border-0 bg-transparent p-0 text-left text-pen-blue underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-pen-blue"><c:out value="${b.name}"/></button>
                    </div>
                  </td>
                  <td><c:out value="${b.author}"/></td>
                  <td><c:out value="${b.category}"/></td>
                  <td class="font-num whitespace-nowrap"><c:out value="${b.price}"/></td>
                  <td class="font-num"><c:out value="${b.available}"/></td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <c:if test="${empty bookRows}">
          <p class="m-0 border border-dashed border-ink-soft px-4 py-3 text-ink-soft">Chưa có kết quả. Gõ tên truyện hoặc tên tác giả vào ô phía trên rồi bấm "Tìm".</p>
        </c:if>
      </section>
    </form>

    <form method="post" action="${ctx}/SearchBookView.jsp" id="frmSelectedBook">
      <t:csrf/>
      <ui:paper-card taped="true">
        <h2 class="tt-paper-card__heading">Truyện đã chọn</h2>
        <p class="m-0 mb-3 text-sm text-ink-soft">Tích ô "Chọn" ở các đầu truyện muốn mượn lần này rồi bấm "Tạo phiếu mượn". Bấm "Xoá" để bỏ một đầu truyện khỏi danh sách.</p>
        <div class="overflow-x-auto" id="selectedBookFallback" data-island-fallback="SelectedStack">
          <table class="tt-ledger-table" id="tblSelectedBook">
            <caption class="tt-ledger-table__caption sr-only">Truyện đã chọn</caption>
            <thead>
              <tr>
                <th scope="col">Chọn</th>
                <th scope="col">Tên đầu truyện</th>
                <th scope="col">Số lượng</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="s" items="${selectedRows}">
                <tr>
                  <td>
                    <input type="checkbox" name="chkSelectedBook" value="${s.bookId}"
                           aria-label="Chọn ${fn:escapeXml(s.name)}"${s.checked ? ' checked' : ''}
                           class="size-5 accent-pen-blue focus-visible:outline-2 focus-visible:outline-pen-blue">
                  </td>
                  <td><c:out value="${s.name}"/></td>
                  <td class="font-num"><c:out value="${s.quantity}"/></td>
                  <td>
                    <button type="submit" name="lnkDeleteSelectedBook" value="${s.bookId}"
                            aria-label="Xoá ${fn:escapeXml(s.name)} khỏi truyện đã chọn"
                            class="tt-btn tt-btn--ghost tt-btn--sm">Xoá</button>
                  </td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <div data-island="SelectedStack" data-props="selected-stack-props"></div>
        <script type="application/json" id="selected-stack-props">${selectedStackJson}</script>
        <c:if test="${empty selectedRows}">
          <p class="m-0 mt-3 border border-dashed border-ink-soft px-4 py-3 text-ink-soft">Chưa có truyện nào. Tìm truyện ở trên, bấm tên truyện, nhập số lượng rồi bấm "Thêm vào truyện đã chọn".</p>
        </c:if>
      </ui:paper-card>
      <%-- Bọc ngoài, không lớp hiển thị: island gắn thì đặt hidden lên phần tử này (§11), lớp flex không đè được. --%>
      <div id="createRentalBillFallback" data-island-fallback="SelectedStack">
        <div class="mt-6 flex justify-center">
          <button type="submit" name="btnCreateRentalBill" id="btnCreateRentalBill" class="tt-btn tt-btn--primary">Tạo phiếu mượn</button>
        </div>
      </div>
    </form>
  </div>
</t:layout>
