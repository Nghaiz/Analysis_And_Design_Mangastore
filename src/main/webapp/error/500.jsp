<%--
  Trang lỗi 500 (web.xml error-page cho mã 500 và mọi java.lang.Throwable không bắt; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 500 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session.
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<% response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR); %>
<t:layout title="Tiệm đang gặp trục trặc">
  <ui:paper-card heading="" taped="true">
    <h1 class="tt-sign m-0 mb-6 text-3xl">500 · Tiệm đang gặp trục trặc</h1>
    <p class="mb-6">Có lỗi xảy ra ở phía tiệm nên chưa làm được việc bạn vừa gửi. Bạn thử lại sau ít phút nhé.</p>
    <p class="m-0"><a href="${pageContext.request.contextPath}/">Về trang chủ</a></p>
  </ui:paper-card>
</t:layout>
