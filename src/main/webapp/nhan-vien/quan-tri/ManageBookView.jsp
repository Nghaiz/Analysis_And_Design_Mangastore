<%--
  ManageBookView (D6, ngoài báo cáo; docs/contracts.md §9.1, §9.2 "Trang quản trị D6", C9, C12). Trang xem, tự gửi,
  chỉ gọi DAO đọc. Quyền "Quản lí" do AuthFilter (§12: không phải "Quản lí" thì 403), trang không kiểm lại.
  - Chỉ xử lí khi POST + DispatcherType.REQUEST, nhận ra việc bằng tên nút (phase-06-integration.md §3):
    btnSearch: từ khoá trim + NFC; trống → BOOK_NOT_FOUND, không gọi DAO (C9); dài quá 100 kí tự → INPUT_TOO_LONG,
    aria-invalid, giữ listBook cũ (§10.3); còn lại BookDAO.searchBook → W listBook.
    lnkEditBook (value = id): chọn đầu truyện có id đó trong listBook của session → W book, 302 EditBookView;
    id không phải số hoặc không có trong listBook → bỏ qua, hiện lại trang (C19).
  - Nút "Thêm đầu truyện" là link không mang dữ liệu (§8) → AddBookView.
  - Bảng đọc listBook của session; số quyển sẵn sàng = listBookCopy.size(), tính lúc hiển thị (§3).
  Không <style>, không style=, không <script> thực thi (CSP).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer, java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.dao.BookDAO, vn.tiemtruyen.model.Book" %>
<%@ page import="vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Display, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Từ khoá dài hơn thì INPUT_TOO_LONG, không gọi DAO (docs/contracts.md §10.3). */
    private static final int KEYWORD_MAX = 100;
%>
<%
    String ctx = request.getContextPath();
    @SuppressWarnings("unchecked")
    List<Book> listBook = (List<Book>) session.getAttribute("listBook");
    String keyword = "";
    boolean keywordInvalid = false;
    String message = (String) request.getAttribute("message");

    boolean submitted = "POST".equals(request.getMethod()) && request.getDispatcherType() == DispatcherType.REQUEST;
    if (submitted && request.getParameter("btnSearch") != null) {
        String raw = request.getParameter("txtKeyword");
        keyword = raw == null ? "" : Normalizer.normalize(raw, Normalizer.Form.NFC).strip();
        if (keyword.codePointCount(0, keyword.length()) > KEYWORD_MAX) {
            keywordInvalid = true;
            message = Messages.INPUT_TOO_LONG;
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
    } else if (submitted && request.getParameter("lnkEditBook") != null && listBook != null) {
        String chosen = request.getParameter("lnkEditBook").strip();
        for (Book candidate : listBook) {
            if (String.valueOf(candidate.getId()).equals(chosen)) {
                session.setAttribute("book", candidate);
                response.sendRedirect(ctx + "/nhan-vien/quan-tri/EditBookView.jsp");
                return;
            }
        }
    }

    List<Map<String, Object>> bookRows = new ArrayList<>();
    if (listBook != null) {
        for (Book b : listBook) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", b.getId());
            r.put("code", Codes.bookCode(b.getId()));
            r.put("name", b.getName());
            r.put("author", b.getAuthor());
            r.put("publisher", b.getPublisher());
            r.put("publishYear", b.getPublishYear() == null ? "" : String.valueOf(b.getPublishYear()));
            r.put("category", b.getCategory());
            r.put("price", Display.money(b.getRentalPrice()));
            r.put("available", b.getListBookCopy().size());
            bookRows.add(r);
        }
    }

    pageContext.setAttribute("ctx", ctx);
    pageContext.setAttribute("keyword", keyword);
    pageContext.setAttribute("keywordInvalid", keywordInvalid);
    pageContext.setAttribute("message", message);
    pageContext.setAttribute("messageKind", Messages.BOOK_NOT_FOUND.equals(message) ? "info" : "error");
    pageContext.setAttribute("bookRows", bookRows);
%>
<t:layout title="Quản lí đầu truyện">
  <h1>Quản lí đầu truyện</h1>
  <p class="tt-typed mb-6 text-sm text-ink-soft">Phần ngoài báo cáo (D6): trang quản trị đơn giản, chỉ dành cho nhân viên có chức vụ Quản lí.</p>

  <c:if test="${not empty message}">
    <div class="mb-6"><ui:message-box kind="${messageKind}" text="${message}"/></div>
  </c:if>

  <form method="post" action="${ctx}/nhan-vien/quan-tri/ManageBookView.jsp" class="mb-8">
    <t:csrf/>
    <div class="flex flex-wrap items-stretch gap-2" role="search">
      <label for="txtKeyword" class="sr-only">Từ khoá tìm đầu truyện</label>
      <input type="search" name="txtKeyword" id="txtKeyword" value="${fn:escapeXml(keyword)}" maxlength="100"
             placeholder="Nhập tên đầu truyện hoặc tên tác giả…"${keywordInvalid ? ' aria-invalid="true"' : ''}
             class="min-w-0 flex-1 rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink aria-invalid:border-2 aria-invalid:border-stamp-red focus-visible:outline-2 focus-visible:outline-pen-blue">
      <button type="submit" name="btnSearch" id="btnSearch"
              class="rounded-paper border-2 border-ink bg-paper-deep px-6 py-2 font-type text-ink shadow-paper hover:bg-tape focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">Tìm</button>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <a href="${ctx}/nhan-vien/quan-tri/AddBookView.jsp" id="lnkAddBook"
         class="rounded-paper border-2 border-ink bg-paper-deep px-4 py-2 font-type text-ink no-underline shadow-paper hover:bg-tape focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">Thêm đầu truyện</a>
      <a href="${ctx}/nhan-vien/StaffHomeView.jsp" id="lnkBack"
         class="rounded-paper border border-ink-soft bg-paper px-4 py-2 font-type text-ink no-underline hover:bg-tape focus-visible:outline-2 focus-visible:outline-pen-blue">Quay lại</a>
    </div>

    <div class="mt-6 overflow-x-auto">
      <table class="tt-ledger-table" id="tblBook">
        <caption class="tt-ledger-table__caption sr-only">Danh sách đầu truyện</caption>
        <thead>
          <tr>
            <th scope="col">Mã đầu truyện</th>
            <th scope="col">Tên đầu truyện</th>
            <th scope="col">Tác giả</th>
            <th scope="col">Nhà xuất bản</th>
            <th scope="col">Năm xuất bản</th>
            <th scope="col">Thể loại</th>
            <th scope="col">Giá thuê theo ngày</th>
            <th scope="col">Số quyển sẵn sàng</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <c:forEach var="b" items="${bookRows}">
            <tr>
              <td class="font-num"><c:out value="${b.code}"/></td>
              <td><c:out value="${b.name}"/></td>
              <td><c:out value="${b.author}"/></td>
              <td><c:out value="${b.publisher}"/></td>
              <td class="font-num"><c:out value="${b.publishYear}"/></td>
              <td><c:out value="${b.category}"/></td>
              <td class="font-num"><c:out value="${b.price}"/></td>
              <td class="font-num"><c:out value="${b.available}"/></td>
              <td>
                <button type="submit" name="lnkEditBook" value="${b.id}"
                        aria-label="Sửa ${fn:escapeXml(b.name)}"
                        class="rounded-paper border border-ink-soft bg-paper px-3 py-1 font-type text-sm text-ink hover:bg-tape focus-visible:outline-2 focus-visible:outline-pen-blue">Sửa</button>
              </td>
            </tr>
          </c:forEach>
        </tbody>
      </table>
    </div>
  </form>
</t:layout>
