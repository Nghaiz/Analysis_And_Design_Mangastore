<%--
  BookDetailView (ch.9 tr.63–64; docs/contracts.md §9.2). Trang xem, không gọi DAO.
  - Session R: client, book (do SearchBookView ghi khi bấm dòng đầu truyện). Chưa có book thì về SearchBookView.
  - "Số quyển đang có" = số quyển đang sẵn sàng của book (book.listBookCopy, đọc bằng searchBook), tính lúc hiển thị.
  - btnAddToSelectedList gửi txtQuantity tới doAddSelectedBook.jsp (formaction). doAddSelectedBook trả về bằng forward:
    hiện message (QUANTITY_EXCEEDED), giữ số đã nhập, đánh dấu ô bằng aria-invalid khi có câu báo hoặc số không phải
    số nguyên dương (QUANTITY_INVALID, C10).
  - publishYear, description NULL: ô để trống (C11).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.model.Book" %>
<%@ page import="vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Display" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%
    String ctx = request.getContextPath();
    Book book = (Book) session.getAttribute("book");
    if (book == null) {
        response.sendRedirect(ctx + "/SearchBookView.jsp");
        return;
    }
    String message = (String) request.getAttribute("message");
    String quantity = "";
    boolean quantityInvalid = false;
    if (request.getDispatcherType() == DispatcherType.FORWARD && request.getParameter("txtQuantity") != null) {
        quantity = request.getParameter("txtQuantity").strip();
        boolean positive;
        try {
            positive = Integer.parseInt(quantity) >= 1;
        } catch (NumberFormatException e) {
            positive = false;
        }
        quantityInvalid = message != null || !positive;
    }
    pageContext.setAttribute("ctx", ctx);
    pageContext.setAttribute("message", message);
    pageContext.setAttribute("quantity", quantity);
    pageContext.setAttribute("quantityInvalid", quantityInvalid);
    pageContext.setAttribute("bookId", book.getId());
    pageContext.setAttribute("bookCode", Codes.bookCode(book.getId()));
    pageContext.setAttribute("bookName", book.getName());
    pageContext.setAttribute("author", book.getAuthor());
    pageContext.setAttribute("publisher", book.getPublisher());
    pageContext.setAttribute("publishYear", book.getPublishYear() == null ? "" : String.valueOf(book.getPublishYear()));
    pageContext.setAttribute("category", book.getCategory());
    pageContext.setAttribute("price", Display.money(book.getRentalPrice()));
    pageContext.setAttribute("available", book.getListBookCopy().size());
    pageContext.setAttribute("description", book.getDescription() == null ? "" : book.getDescription());
%>
<t:layout title="Chi tiết đầu truyện">
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <nav aria-label="Đường dẫn" class="text-sm">
        <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 p-0 text-ink-soft">
          <li><a href="${ctx}/SearchBookView.jsp">Tìm truyện</a></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page">Chi tiết đầu truyện</li>
        </ol>
      </nav>
      <h1 class="m-0">Chi tiết đầu truyện</h1>
      <p class="m-0 text-ink-soft">Xem thông tin đầu truyện, nhập số quyển muốn thuê rồi thêm vào "Truyện đã chọn".</p>
    </header>

    <c:if test="${not empty message}">
      <div><ui:message-box kind="error" text="${message}"/></div>
    </c:if>

    <ui:paper-card>
      <div class="flex flex-col gap-6 md:flex-row md:items-start">
        <div class="mx-auto w-full max-w-60 flex-none md:mx-0 md:w-60">
          <ui:book-cover bookId="${bookId}" name="${bookName}" size="md" eager="true"/>
        </div>
        <div class="min-w-0 flex-1">
          <dl class="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div><dt class="font-type text-sm text-ink-soft">Mã đầu truyện:</dt><dd class="m-0 font-num" id="bookCode"><c:out value="${bookCode}"/></dd></div>
            <div><dt class="font-type text-sm text-ink-soft">Tên đầu truyện:</dt><dd class="m-0 text-lg" id="bookName"><c:out value="${bookName}"/></dd></div>
            <div><dt class="font-type text-sm text-ink-soft">Tác giả:</dt><dd class="m-0"><c:out value="${author}"/></dd></div>
            <div><dt class="font-type text-sm text-ink-soft">Nhà xuất bản:</dt><dd class="m-0"><c:out value="${publisher}"/></dd></div>
            <div><dt class="font-type text-sm text-ink-soft">Năm xuất bản:</dt><dd class="m-0 font-num"><c:out value="${publishYear}"/></dd></div>
            <div><dt class="font-type text-sm text-ink-soft">Thể loại:</dt><dd class="m-0"><c:out value="${category}"/></dd></div>
            <div class="border-t border-dashed border-ink-soft pt-3"><dt class="font-type text-sm text-ink-soft">Giá thuê theo ngày:</dt><dd class="m-0 font-num text-lg text-stamp-red" id="rentalPrice"><c:out value="${price}"/></dd></div>
            <div class="border-t border-dashed border-ink-soft pt-3"><dt class="font-type text-sm text-ink-soft">Số quyển đang có:</dt><dd class="m-0 font-num text-lg text-stamp-green" id="availableCopies"><c:out value="${available}"/></dd></div>
            <div class="border-t border-dashed border-ink-soft pt-3 sm:col-span-2"><dt class="font-type text-sm text-ink-soft">Mô tả:</dt><dd class="m-0"><c:out value="${description}"/></dd></div>
          </dl>
        </div>
      </div>
    </ui:paper-card>

    <form method="post" action="${ctx}/BookDetailView.jsp" class="tt-paper-card tt-worn flex flex-col gap-4">
      <t:csrf/>
      <div class="flex flex-col gap-1">
        <label for="txtQuantity" class="font-type text-ink">Số lượng muốn thuê:</label>
        <input type="number" name="txtQuantity" id="txtQuantity" inputmode="numeric"
               value="${fn:escapeXml(quantity)}"${quantityInvalid ? ' aria-invalid="true"' : ''} aria-describedby="txtQuantityHint"
               class="w-32 rounded-paper border border-ink-soft bg-paper px-3 py-2 font-num text-ink focus-visible:outline-2 focus-visible:outline-pen-blue aria-invalid:border-2 aria-invalid:border-stamp-red">
        <p id="txtQuantityHint" class="m-0 text-sm text-ink-soft">Nhập một số nguyên dương, không quá số quyển đang có.</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="submit" name="btnAddToSelectedList" id="btnAddToSelectedList" formaction="${ctx}/doAddSelectedBook.jsp"
                class="tt-btn tt-btn--primary">Thêm vào truyện đã chọn</button>
        <a href="${ctx}/SearchBookView.jsp" id="lnkBack" class="tt-btn tt-btn--ghost">Quay lại</a>
      </div>
    </form>
  </div>
</t:layout>
