<%--
  Trang lỗi 404 (web.xml error-page; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 404 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session. Nút về trang chủ theo vai: chỉ đọc session đã có (như layout.tag),
  không gọi DAO. Hình minh hoạ tự vẽ (SVG nội tuyến, aria-hidden).
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.Staff" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<% response.setStatus(HttpServletResponse.SC_NOT_FOUND); %>
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
<t:layout title="Không tìm thấy trang">
  <div class="mx-auto max-w-4xl">
    <ui:paper-card heading="" taped="true">
      <div class="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h1 class="tt-sign m-0 mb-6 text-3xl">404 · Không tìm thấy trang</h1>
          <p class="mb-6">Trang bạn tìm không có trên kệ: có thể đường dẫn bị gõ sai hoặc trang đã được dời đi.</p>
          <p class="m-0 flex flex-wrap gap-3">
            <c:if test="${not empty roleHome}">
              <a href="${pageContext.request.contextPath}${roleHome}" class="tt-btn tt-btn--primary"><c:out value="${roleHomeText}"/></a>
            </c:if>
            <a href="${pageContext.request.contextPath}/" class="tt-btn ${empty roleHome ? 'tt-btn--primary' : 'tt-btn--ghost'}">Về trang chủ</a>
          </p>
        </div>
        <svg class="order-first mx-auto h-auto w-40 text-ink md:order-none md:w-56" aria-hidden="true" viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 70h172M14 146h172" class="text-wood" stroke-width="5"/>
          <rect x="22" y="26" width="14" height="44" class="text-stamp-red" fill="currentColor" stroke="none" opacity="0.85"/>
          <rect x="22" y="26" width="14" height="44"/>
          <rect x="38" y="34" width="16" height="36" class="text-paper-deep" fill="currentColor" stroke="none"/>
          <rect x="38" y="34" width="16" height="36"/>
          <rect x="88" y="30" width="15" height="40" class="text-stamp-green" fill="currentColor" stroke="none" opacity="0.8"/>
          <rect x="88" y="30" width="15" height="40"/>
          <rect x="105" y="38" width="13" height="32" class="text-tape" fill="currentColor" stroke="none"/>
          <rect x="105" y="38" width="13" height="32"/>
          <path d="M60 64h22" stroke-dasharray="4 5" class="text-ink-soft" stroke-width="2"/>
          <rect x="22" y="100" width="16" height="46" class="text-tape" fill="currentColor" stroke="none"/>
          <rect x="22" y="100" width="16" height="46"/>
          <rect x="40" y="108" width="14" height="38" class="text-pen-blue" fill="currentColor" stroke="none" opacity="0.75"/>
          <rect x="40" y="108" width="14" height="38"/>
          <circle cx="140" cy="102" r="24" class="text-paper" fill="currentColor" stroke="none"/>
          <circle cx="140" cy="102" r="24" class="text-pen-blue"/>
          <path d="m157 119 20 20" class="text-pen-blue" stroke-width="6"/>
          <path d="M133 95a7 7 0 1 1 10 6c-2 1-3 3-3 5v2M140 115v1" class="text-stamp-red"/>
        </svg>
      </div>
    </ui:paper-card>
  </div>
</t:layout>
