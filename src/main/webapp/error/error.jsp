<%--
  Trang lỗi chung (web.xml <error-page> không mã: mọi mã không có trang riêng, ví dụ 400, 413, 414, 501; lane 6A,
  phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS riêng, không in chi tiết lỗi hay stack trace.
  Không đặt lại mã trạng thái: giữ nguyên mã Tomcat đã đặt; chữ chọn theo mã (jakarta.servlet.error.status_code).
  session="false": trang lỗi không tạo session. Nút về trang chủ theo vai: chỉ đọc session đã có (như layout.tag),
  không gọi DAO. Hình minh hoạ tự vẽ (SVG nội tuyến, aria-hidden).
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.Staff" %>
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
<%
    HttpSession current = request.getSession(false);
    String roleHome = null;
    String roleHomeText = null;
    if (current != null && current.getAttribute("staff") instanceof Staff) {
        roleHome = "/nhan-vien/StaffHomeView.jsp";
        roleHomeText = "Trang chủ nhân viên";
    } else if (current != null && current.getAttribute("client") instanceof Client cl && cl.getId() > 0) {
        roleHome = "/ClientHomeView.jsp";
        roleHomeText = "Trang chủ khách hàng";
    }
    pageContext.setAttribute("roleHome", roleHome);
    pageContext.setAttribute("roleHomeText", roleHomeText);
%>
<t:layout title="${heading}">
  <div class="mx-auto max-w-4xl">
    <ui:paper-card heading="" taped="true">
      <div class="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h1 class="tt-sign m-0 mb-6 text-3xl"><c:if test="${not empty code}"><c:out value="${code}"/> · </c:if><c:out value="${heading}"/></h1>
          <p class="mb-6"><c:out value="${text}"/></p>
          <p class="m-0 flex flex-wrap gap-3">
            <c:if test="${not empty roleHome}">
              <a href="${pageContext.request.contextPath}${roleHome}" class="tt-btn tt-btn--primary"><c:out value="${roleHomeText}"/></a>
            </c:if>
            <a href="${pageContext.request.contextPath}/" class="tt-btn ${empty roleHome ? 'tt-btn--primary' : 'tt-btn--ghost'}">Về trang chủ</a>
          </p>
        </div>
        <svg class="order-first mx-auto h-auto w-40 text-ink md:order-none md:w-56" aria-hidden="true" viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M24 44h118l-6 9 6 9-6 9 6 9-6 9 6 9-6 9 6 9H24z" class="text-tape" fill="currentColor" stroke="none"/>
          <path d="M24 44h118l-6 9 6 9-6 9 6 9-6 9 6 9-6 9 6 9H24z"/>
          <path d="M44 44v72" stroke-dasharray="4 6" stroke-width="2"/>
          <path d="M58 66h56M58 84h44M58 102h50" stroke-width="2" opacity="0.6"/>
          <path d="M158 56l14 4-4 78-16-2z" class="text-paper-deep" fill="currentColor" stroke="none"/>
          <path d="M158 56l14 4-4 78-16-2z"/>
          <circle cx="132" cy="122" r="20" class="text-paper" fill="currentColor" stroke="none"/>
          <circle cx="132" cy="122" r="20" class="text-stamp-red"/>
          <path d="M125 116a7 7 0 1 1 10 6c-2 1-3 2-3 4v2M132 134v1" class="text-stamp-red"/>
        </svg>
      </div>
    </ui:paper-card>
  </div>
</t:layout>
