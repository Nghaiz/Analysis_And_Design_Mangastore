<%--
  EditBookView (D6, ngoài báo cáo; docs/contracts.md §9.1, §9.2 "Trang quản trị D6", C10, C11, C12). Trang xem, không
  gọi DAO. Quyền "Quản lí" do AuthFilter (§12).
  - Như AddBookView, điền từ book (R book, do ManageBookView ghi khi bấm "Sửa"); txtCopyCount là số quyển THÊM MỚI
    (C12: không sửa, không xoá quyển đã có). Session không có book (hoặc chỉ có nháp id = 0 của AddBookView)
    → 302 ManageBookView (phase-07-edge-cases.md §3.4).
  - Input ẩn bookId = book.id: doUpdateBook so với book của session, khác (hai thẻ sửa hai đầu truyện) thì không ghi.
  - doUpdateBook forward về khi nhập sai: điền lại bằng tham số vừa gửi, ô sai có aria-invalid="true" (request
    attribute invalidFields), câu báo (request attribute message) nếu có: INPUT_TOO_LONG, QUANTITY_INVALID (§10.3).
  - publishYear, description NULL → ô trống (C11). Quyển đang sẵn sàng (book.listBookCopy) chỉ để xem.
  Mọi chữ in ra đều escape. Không <style>, không style=, không <script> thực thi (CSP).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map, java.util.Set" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.model.Book, vn.tiemtruyen.model.BookCopy" %>
<%@ page import="vn.tiemtruyen.util.Codes" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Một ô của form: tên (= id), nhãn, maxlength, có bắt buộc, có phải ô số, nhiều dòng, giá trị lấy từ book. */
    private static Map<String, Object> field(String name, String label, int maxlength, boolean required,
            boolean numeric, boolean multiline, Object bookValue) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("name", name);
        f.put("label", label);
        f.put("maxlength", maxlength);
        f.put("required", required);
        f.put("numeric", numeric);
        f.put("multiline", multiline);
        f.put("bookValue", bookValue == null ? "" : String.valueOf(bookValue));
        return f;
    }
%>
<%
    String ctx = request.getContextPath();
    Book book = (Book) session.getAttribute("book");
    if (book == null || book.getId() < 1) {
        response.sendRedirect(ctx + "/nhan-vien/quan-tri/ManageBookView.jsp");
        return;
    }
    boolean forwarded = request.getDispatcherType() == DispatcherType.FORWARD;

    // Giá thuê float (C13) viết thành số nguyên đồng khi là số nguyên, để ô không hiện "3000.0".
    float price = book.getRentalPrice();
    Object priceValue = price == Math.rint(price) ? (Object) Long.valueOf((long) price) : (Object) Float.valueOf(price);

    @SuppressWarnings("unchecked")
    Set<String> invalid = (Set<String>) request.getAttribute("invalidFields");
    List<Map<String, Object>> fields = new ArrayList<>();
    fields.add(field("txtName", "Tên đầu truyện (bắt buộc)", 255, true, false, false, book.getName()));
    fields.add(field("txtAuthor", "Tác giả (bắt buộc)", 100, true, false, false, book.getAuthor()));
    fields.add(field("txtPublisher", "Nhà xuất bản", 100, false, false, false, book.getPublisher()));
    fields.add(field("txtPublishYear", "Năm xuất bản (từ 1900 tới năm nay, để trống nếu không rõ)", 4, false, true, false,
            book.getPublishYear()));
    fields.add(field("txtCategory", "Thể loại (bắt buộc)", 50, true, false, false, book.getCategory()));
    fields.add(field("txtDescription", "Mô tả", 255, false, false, true, book.getDescription()));
    fields.add(field("txtRentalPrice", "Giá thuê theo ngày, đồng (bắt buộc, ví dụ 3000)", 15, true, true, false,
            priceValue));
    fields.add(field("txtCopyCount", "Số quyển thêm mới (0 tới 99, để trống là 0)", 2, false, true, false, null));
    for (Map<String, Object> f : fields) {
        String name = (String) f.get("name");
        String value = forwarded ? request.getParameter(name) : (String) f.get("bookValue");
        f.put("value", value == null ? "" : value);
        f.put("invalid", invalid != null && invalid.contains(name));
    }

    List<String> barcodes = new ArrayList<>();
    for (BookCopy copy : book.getListBookCopy()) {
        barcodes.add(copy.getBarcode());
    }

    pageContext.setAttribute("ctx", ctx);
    pageContext.setAttribute("fields", fields);
    pageContext.setAttribute("bookId", book.getId());
    pageContext.setAttribute("bookCode", Codes.bookCode(book.getId()));
    pageContext.setAttribute("barcodes", barcodes);
    pageContext.setAttribute("message", request.getAttribute("message"));
%>
<t:layout title="Sửa đầu truyện">
  <h1>Sửa đầu truyện <span class="font-num"><c:out value="${bookCode}"/></span></h1>
  <p class="tt-typed mb-6 text-sm text-ink-soft">Phần ngoài báo cáo (D6): trang quản trị đơn giản, chỉ dành cho nhân viên có chức vụ Quản lí. Quyển đã có không sửa, không xoá được; quyển thêm mới nhận mã vạch nối tiếp số lớn nhất đang có.</p>

  <c:if test="${not empty message}">
    <div class="mb-6"><ui:message-box kind="error" text="${message}"/></div>
  </c:if>

  <form method="post" action="${ctx}/nhan-vien/quan-tri/EditBookView.jsp">
    <t:csrf/>
    <input type="hidden" name="bookId" id="bookId" value="${bookId}">
    <ui:paper-card heading="Thông tin đầu truyện">
      <div class="grid max-w-2xl gap-2">
        <c:forEach var="f" items="${fields}">
          <label for="${f.name}" class="mt-2 text-ink"><c:out value="${f.label}"/></label>
          <c:choose>
            <c:when test="${f.multiline}">
              <textarea id="${f.name}" name="${f.name}" maxlength="${f.maxlength}" rows="3"${f.invalid ? ' aria-invalid="true"' : ''}
                        class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink aria-invalid:border-2 aria-invalid:border-stamp-red focus-visible:outline-2 focus-visible:outline-pen-blue"><c:out value="${f.value}"/></textarea>
            </c:when>
            <c:otherwise>
              <input type="text" id="${f.name}" name="${f.name}" value="${fn:escapeXml(f.value)}" maxlength="${f.maxlength}"${f.numeric ? ' inputmode="numeric"' : ''}${f.required ? ' aria-required="true"' : ''}${f.invalid ? ' aria-invalid="true"' : ''} autocomplete="off"
                     class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink${f.numeric ? ' font-num' : ''} aria-invalid:border-2 aria-invalid:border-stamp-red focus-visible:outline-2 focus-visible:outline-pen-blue">
            </c:otherwise>
          </c:choose>
        </c:forEach>
      </div>
      <p class="mt-4 text-ink">Quyển đang sẵn sàng (<span class="font-num"><c:out value="${fn:length(barcodes)}"/></span>):
        <span class="font-num" id="lstBookCopy"><c:forEach var="code" items="${barcodes}" varStatus="s"><c:out value="${code}"/><c:if test="${not s.last}">, </c:if></c:forEach></span>
      </p>
    </ui:paper-card>
    <div class="mt-6 flex flex-wrap gap-3">
      <button type="submit" name="btnSave" id="btnSave" formaction="${ctx}/nhan-vien/quan-tri/doUpdateBook.jsp"
              class="rounded-paper border-2 border-ink bg-paper-deep px-6 py-2 font-type text-ink shadow-paper hover:bg-tape focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">Lưu</button>
      <a href="${ctx}/nhan-vien/quan-tri/ManageBookView.jsp" id="lnkBack"
         class="rounded-paper border border-ink-soft bg-paper px-4 py-2 font-type text-ink no-underline hover:bg-tape focus-visible:outline-2 focus-visible:outline-pen-blue">Quay lại</a>
    </div>
  </form>
</t:layout>
