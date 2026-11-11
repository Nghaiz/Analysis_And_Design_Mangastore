<%--
  AddBookView (D6, ngoài báo cáo; docs/contracts.md §9.1, §9.2 "Trang quản trị D6", C10, C11, C12). Trang xem, không
  gọi DAO. Quyền "Quản lí" do AuthFilter (§12).
  - Field (đúng §9.2): txtName, txtAuthor, txtPublisher, txtPublishYear, txtCategory, txtDescription, txtRentalPrice,
    txtCopyCount (số quyển tạo kèm); btnSave (formaction doAddBook.jsp); lnkBack (link về ManageBookView).
  - Mở trang (không phải forward): W book = đầu truyện mới id = 0, làm phiếu nháp để doAddBook biết lần gửi này chưa
    lưu (bấm hai lần, Back rồi gửi lại không tạo đầu truyện thứ hai). Đang có nháp id = 0 thì giữ nguyên.
  - doAddBook forward về khi nhập sai: điền lại ô bằng tham số vừa gửi, ô sai có aria-invalid="true" (request
    attribute invalidFields), câu báo (request attribute message) nếu có: INPUT_TOO_LONG, QUANTITY_INVALID (§10.3).
  Mọi chữ in ra đều escape. Không <style>, không style=, không <script> thực thi (CSP).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map, java.util.Set" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.model.Book" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Một ô của form: tên (= id), nhãn, maxlength, có bắt buộc, có phải ô số, nhiều dòng. */
    private static Map<String, Object> field(String name, String label, int maxlength, boolean required,
            boolean numeric, boolean multiline) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("name", name);
        f.put("label", label);
        f.put("maxlength", maxlength);
        f.put("required", required);
        f.put("numeric", numeric);
        f.put("multiline", multiline);
        return f;
    }
%>
<%
    boolean forwarded = request.getDispatcherType() == DispatcherType.FORWARD;
    Book draft = (Book) session.getAttribute("book");
    if (!forwarded && (draft == null || draft.getId() != 0)) {
        session.setAttribute("book", new Book());
    }

    @SuppressWarnings("unchecked")
    Set<String> invalid = (Set<String>) request.getAttribute("invalidFields");
    List<Map<String, Object>> fields = new ArrayList<>();
    fields.add(field("txtName", "Tên đầu truyện (bắt buộc)", 255, true, false, false));
    fields.add(field("txtAuthor", "Tác giả (bắt buộc)", 100, true, false, false));
    fields.add(field("txtPublisher", "Nhà xuất bản", 100, false, false, false));
    fields.add(field("txtPublishYear", "Năm xuất bản (từ 1900 tới năm nay, để trống nếu không rõ)", 4, false, true, false));
    fields.add(field("txtCategory", "Thể loại (bắt buộc)", 50, true, false, false));
    fields.add(field("txtDescription", "Mô tả", 255, false, false, true));
    fields.add(field("txtRentalPrice", "Giá thuê theo ngày, đồng (bắt buộc, ví dụ 3000)", 15, true, true, false));
    fields.add(field("txtCopyCount", "Số quyển tạo kèm (0 tới 99, để trống là 0)", 2, false, true, false));
    for (Map<String, Object> f : fields) {
        String name = (String) f.get("name");
        String value = forwarded ? request.getParameter(name) : null;
        f.put("value", value == null ? "" : value);
        f.put("invalid", invalid != null && invalid.contains(name));
    }

    pageContext.setAttribute("fields", fields);
    pageContext.setAttribute("message", request.getAttribute("message"));
%>
<t:layout title="Thêm đầu truyện">
  <div class="mx-auto max-w-3xl">
    <nav aria-label="Đường dẫn" class="mb-4 text-sm">
      <ol class="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-ink-soft">
        <li><a href="${pageContext.request.contextPath}/nhan-vien/quan-tri/ManageBookView.jsp">Quản lí đầu truyện</a></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" class="text-ink">Thêm đầu truyện</li>
      </ol>
    </nav>
    <header class="mb-6">
      <h1 class="m-0">Thêm đầu truyện</h1>
      <p class="tt-typed m-0 mt-2 text-sm text-ink-soft">Phần ngoài báo cáo (D6): trang quản trị đơn giản, chỉ dành cho nhân viên có chức vụ Quản lí. Mã vạch của các quyển tạo kèm được đánh số tự động (DTxxx-01, DTxxx-02…).</p>
      <p class="m-0 mt-2 text-ink-soft">Điền thông tin đầu truyện mới; ô ghi "bắt buộc" phải có chữ. Ô nhập sai được viền đỏ để sửa lại.</p>
    </header>

    <c:if test="${not empty message}">
      <div class="mb-6"><ui:message-box kind="error" text="${message}"/></div>
    </c:if>

    <form method="post" action="${pageContext.request.contextPath}/nhan-vien/quan-tri/AddBookView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <ui:paper-card heading="Thông tin đầu truyện">
        <div class="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <c:forEach var="f" items="${fields}">
            <c:if test="${f.name eq 'txtRentalPrice'}">
              <p class="m-0 border-t border-dashed border-ink-soft pt-4 font-type text-ink md:col-span-2">Giá thuê và số quyển</p>
            </c:if>
            <div class="flex flex-col gap-1${f.name eq 'txtName' or f.multiline ? ' md:col-span-2' : ''}">
              <label for="${f.name}" class="text-ink"><c:out value="${f.label}"/></label>
              <c:choose>
                <c:when test="${f.multiline}">
                  <textarea id="${f.name}" name="${f.name}" maxlength="${f.maxlength}" rows="3"${f.invalid ? ' aria-invalid="true"' : ''}
                            class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink aria-invalid:border-2 aria-invalid:border-stamp-red focus-visible:outline-2 focus-visible:outline-pen-blue"><c:out value="${f.value}"/></textarea>
                </c:when>
                <c:otherwise>
                  <input type="text" id="${f.name}" name="${f.name}" value="${fn:escapeXml(f.value)}" maxlength="${f.maxlength}"${f.numeric ? ' inputmode="numeric"' : ''}${f.required ? ' aria-required="true"' : ''}${f.invalid ? ' aria-invalid="true"' : ''} autocomplete="off"
                         class="min-h-11 w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink${f.numeric ? ' font-num' : ''} aria-invalid:border-2 aria-invalid:border-stamp-red focus-visible:outline-2 focus-visible:outline-pen-blue">
                </c:otherwise>
              </c:choose>
            </div>
          </c:forEach>
        </div>
      </ui:paper-card>
      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" name="btnSave" id="btnSave" formaction="${pageContext.request.contextPath}/nhan-vien/quan-tri/doAddBook.jsp"
                class="tt-btn tt-btn--primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
          <span>Lưu</span>
        </button>
        <a href="${pageContext.request.contextPath}/nhan-vien/quan-tri/ManageBookView.jsp" id="lnkBack"
           class="tt-btn tt-btn--ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
          <span>Quay lại</span>
        </a>
        <p class="m-0 text-sm text-ink-soft">Lưu xong, trang quay về danh sách và hiện đầu truyện vừa thêm.</p>
      </div>
    </form>
  </div>
</t:layout>
