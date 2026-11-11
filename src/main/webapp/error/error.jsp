<%--
  Trang lỗi chung (web.xml <error-page> không mã: mọi mã không có trang riêng, ví dụ 400, 413, 414, 501; lane 6A,
  phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS riêng, không in chi tiết lỗi hay stack trace.
  Không đặt lại mã trạng thái: giữ nguyên mã Tomcat đã đặt; chữ chọn theo mã (jakarta.servlet.error.status_code).
  session="false": trang lỗi không tạo session.
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<c:set var="code" value="${requestScope['jakarta.servlet.error.status_code']}"/>
<c:choose>
  <c:when test="${code == 400}">
    <c:set var="heading" value="Yêu cầu không hợp lệ"/>
    <c:set var="text" value="Tiệm không đọc được yêu cầu vừa gửi (đường dẫn hoặc dữ liệu bị hỏng). Hãy mở lại trang từ trang chủ rồi thử lại."/>
  </c:when>
  <c:when test="${code == 413}">
    <c:set var="heading" value="Dữ liệu gửi lên quá lớn"/>
    <c:set var="text" value="Nội dung vừa gửi dài hơn mức tiệm nhận được. Hãy rút ngắn rồi gửi lại."/>
  </c:when>
  <c:when test="${code == 414}">
    <c:set var="heading" value="Đường dẫn quá dài"/>
    <c:set var="text" value="Đường dẫn vừa mở dài hơn mức tiệm nhận được. Hãy mở lại trang từ trang chủ."/>
  </c:when>
  <c:when test="${code == 501}">
    <c:set var="heading" value="Tiệm chưa hỗ trợ việc này"/>
    <c:set var="text" value="Cách gửi vừa dùng chưa được tiệm hỗ trợ. Hãy mở lại trang từ trang chủ rồi làm lại từ đầu."/>
  </c:when>
  <c:otherwise>
    <c:set var="heading" value="Có lỗi khi xử lí yêu cầu"/>
    <c:set var="text" value="Tiệm chưa làm được việc bạn vừa gửi. Hãy mở lại trang từ trang chủ rồi thử lại."/>
  </c:otherwise>
</c:choose>
<t:layout title="${heading}">
  <ui:paper-card heading="" taped="true">
    <h1 class="tt-sign m-0 mb-6 text-3xl"><c:if test="${not empty code}"><c:out value="${code}"/> · </c:if><c:out value="${heading}"/></h1>
    <p class="mb-6"><c:out value="${text}"/></p>
    <p class="m-0"><a href="${pageContext.request.contextPath}/">Về trang chủ</a></p>
  </ui:paper-card>
</t:layout>
