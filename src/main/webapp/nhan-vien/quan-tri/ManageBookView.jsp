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

    pageContext.setAttribute("keyword", keyword);
    pageContext.setAttribute("keywordInvalid", keywordInvalid);
    pageContext.setAttribute("message", message);
    pageContext.setAttribute("messageKind", Messages.BOOK_NOT_FOUND.equals(message) ? "info" : "error");
    pageContext.setAttribute("bookRows", bookRows);
%>
<t:layout title="Quản lí đầu truyện">
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <section class="tt-hero" aria-labelledby="manage-book-h">
      <div>
        <p class="tt-hero__eyebrow">Quản trị kho truyện</p>
        <h1 id="manage-book-h" class="tt-hero__title">Quản lí đầu truyện</h1>
        <p class="tt-typed m-0 mt-2 text-sm text-ink-soft">Phần ngoài báo cáo (D6): trang quản trị đơn giản, chỉ dành cho nhân viên có chức vụ Quản lí.</p>
        <p class="tt-hero__lead">Tìm đầu truyện theo tên hoặc tác giả để xem giá thuê và số quyển sẵn sàng, bấm "Sửa" trên dòng để đổi thông tin hay thêm quyển, hoặc thêm đầu truyện mới vào kho.</p>
      </div>
      <svg class="tt-hero__art text-ink" aria-hidden="true" viewBox="0 0 120 120" width="120" height="120" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 104h100"/>
        <rect x="16" y="34" width="16" height="70" class="text-paper-deep" fill="currentColor" stroke="none"/>
        <rect x="16" y="34" width="16" height="70"/>
        <rect x="34" y="24" width="14" height="80" class="text-stamp-red" fill="currentColor" stroke="none" opacity="0.85"/>
        <rect x="34" y="24" width="14" height="80"/>
        <rect x="50" y="40" width="18" height="64" class="text-tape" fill="currentColor" stroke="none"/>
        <rect x="50" y="40" width="18" height="64"/>
        <path d="M72 46l14-4 16 58-14 4z" class="text-stamp-green" fill="currentColor" stroke="none" opacity="0.8"/>
        <path d="M72 46l14-4 16 58-14 4z"/>
        <path d="M20 48h8M38 40h6M54 56h10"/>
        <circle cx="92" cy="26" r="11" class="text-pen-blue"/>
        <path d="M100 34l8 8" class="text-pen-blue"/>
      </svg>
    </section>

    <c:if test="${not empty message}">
      <div><ui:message-box kind="${messageKind}" text="${message}"/></div>
    </c:if>

    <form method="post" action="${pageContext.request.contextPath}/nhan-vien/quan-tri/ManageBookView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <ui:paper-card heading="Tìm đầu truyện">
        <div class="flex flex-col gap-2" role="search">
          <label for="txtKeyword" class="text-ink">Từ khoá tìm đầu truyện</label>
          <div class="flex flex-wrap items-stretch gap-3">
            <input type="search" name="txtKeyword" id="txtKeyword" value="${fn:escapeXml(keyword)}" maxlength="100"
                   placeholder="Nhập tên đầu truyện hoặc tên tác giả…"${keywordInvalid ? ' aria-invalid="true"' : ''} aria-describedby="txtKeyword-hint"
                   class="min-h-11 min-w-0 flex-1 basis-60 rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink aria-invalid:border-2 aria-invalid:border-stamp-red focus-visible:outline-2 focus-visible:outline-pen-blue">
            <button type="submit" name="btnSearch" id="btnSearch" class="tt-btn tt-btn--primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <span>Tìm</span>
            </button>
          </div>
          <p id="txtKeyword-hint" class="m-0 text-sm text-ink-soft">Tối đa 100 kí tự, gõ có dấu hay không dấu đều được.</p>
        </div>
      </ui:paper-card>

      <div class="flex flex-wrap gap-3">
        <a href="${pageContext.request.contextPath}/nhan-vien/quan-tri/AddBookView.jsp" id="lnkAddBook" class="tt-btn tt-btn--ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          <span>Thêm đầu truyện</span>
        </a>
        <a href="${pageContext.request.contextPath}/nhan-vien/StaffHomeView.jsp" id="lnkBack" class="tt-btn tt-btn--ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
          <span>Quay lại</span>
        </a>
      </div>

      <section aria-labelledby="book-list-h" class="flex flex-col gap-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="book-list-h" class="tt-section-title m-0">Danh sách đầu truyện</h2>
          <c:if test="${not empty bookRows}">
            <p class="m-0 text-sm text-ink-soft">Đang hiện <span class="font-num"><c:out value="${fn:length(bookRows)}"/></span> đầu truyện</p>
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
                  <td class="font-num whitespace-nowrap"><c:out value="${b.code}"/></td>
                  <td><c:out value="${b.name}"/></td>
                  <td><c:out value="${b.author}"/></td>
                  <td><c:out value="${b.publisher}"/></td>
                  <td class="font-num"><c:out value="${b.publishYear}"/></td>
                  <td><c:out value="${b.category}"/></td>
                  <td class="font-num whitespace-nowrap"><c:out value="${b.price}"/></td>
                  <td class="font-num"><c:out value="${b.available}"/></td>
                  <td>
                    <button type="submit" name="lnkEditBook" value="${b.id}"
                            aria-label="Sửa ${fn:escapeXml(b.name)}"
                            class="tt-btn tt-btn--ghost tt-btn--sm focus-visible:outline-2 focus-visible:outline-pen-blue">
                      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>
                      <span>Sửa</span>
                    </button>
                  </td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <c:if test="${empty bookRows}">
          <p class="m-0 border border-dashed border-ink-soft bg-paper px-4 py-3 text-ink-soft">Danh sách đang trống. Nhập tên đầu truyện hoặc tên tác giả rồi bấm "Tìm" để hiện các đầu truyện trong kho; chưa có đầu truyện cần tìm thì bấm "Thêm đầu truyện".</p>
        </c:if>
      </section>
    </form>
  </div>
</t:layout>
