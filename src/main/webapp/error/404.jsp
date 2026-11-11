<%--
  Trang lỗi 404 (web.xml error-page; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 404 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session.
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<% response.setStatus(HttpServletResponse.SC_NOT_FOUND); %>
<t:layout title="Không tìm thấy trang">
  <ui:paper-card heading="" taped="true">
    <h1 class="tt-sign m-0 mb-6 text-3xl">404 · Không tìm thấy trang</h1>
    <p class="mb-6">Trang bạn tìm không có trên kệ: có thể đường dẫn bị gõ sai hoặc trang đã được dời đi.</p>
    <p class="m-0"><a href="${pageContext.request.contextPath}/">Về trang chủ</a></p>
  </ui:paper-card>
</t:layout>
