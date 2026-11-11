<%--
  Trang lỗi 403 (web.xml error-page; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 403 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session.
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<% response.setStatus(HttpServletResponse.SC_FORBIDDEN); %>
<t:layout title="Không được vào trang này">
  <ui:paper-card heading="" taped="true">
    <h1 class="tt-sign m-0 mb-6 text-3xl">403 · Không được vào trang này</h1>
    <p class="mb-6">Bạn chưa có quyền mở trang này, hoặc phiếu gửi đi đã cũ (phiên làm việc vừa đổi). Hãy mở lại trang từ trang chủ rồi thử lại.</p>
    <p class="m-0"><a href="${pageContext.request.contextPath}/">Về trang chủ</a></p>
  </ui:paper-card>
</t:layout>
