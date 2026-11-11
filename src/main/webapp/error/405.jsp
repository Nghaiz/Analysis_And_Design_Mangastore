<%--
  Trang lỗi 405 (web.xml error-page; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 405 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session.
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<% response.setStatus(HttpServletResponse.SC_METHOD_NOT_ALLOWED); %>
<t:layout title="Không gửi được theo cách này">
  <ui:paper-card heading="" taped="true">
    <h1 class="tt-sign m-0 mb-6 text-3xl">405 · Không gửi được theo cách này</h1>
    <p class="mb-6">Trang này không nhận cách gửi vừa dùng (thường do mở thẳng đường dẫn của một nút gửi form). Hãy mở lại trang từ trang chủ rồi làm lại từ đầu.</p>
    <p class="m-0"><a href="${pageContext.request.contextPath}/">Về trang chủ</a></p>
  </ui:paper-card>
</t:layout>
