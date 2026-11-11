<%--
  Trang lỗi 405 (web.xml error-page; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 405 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session. Nút về trang chủ theo vai: chỉ đọc session đã có (như layout.tag),
  không gọi DAO. Hình minh hoạ tự vẽ (SVG nội tuyến, aria-hidden).
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.Staff" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<% response.setStatus(HttpServletResponse.SC_METHOD_NOT_ALLOWED); %>
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
<t:layout title="Không gửi được theo cách này">
  <div class="mx-auto max-w-4xl">
    <ui:paper-card heading="" taped="true">
      <div class="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h1 class="tt-sign m-0 mb-6 text-3xl">405 · Không gửi được theo cách này</h1>
          <p class="mb-6">Trang này không nhận cách gửi vừa dùng (thường do mở thẳng đường dẫn của một nút gửi form). Hãy mở lại trang từ trang chủ rồi làm lại từ đầu.</p>
          <p class="m-0 flex flex-wrap gap-3">
            <c:if test="${not empty roleHome}">
              <a href="${pageContext.request.contextPath}${roleHome}" class="tt-btn tt-btn--primary"><c:out value="${roleHomeText}"/></a>
            </c:if>
            <a href="${pageContext.request.contextPath}/" class="tt-btn ${empty roleHome ? 'tt-btn--primary' : 'tt-btn--ghost'}">Về trang chủ</a>
          </p>
        </div>
        <svg class="order-first mx-auto h-auto w-40 text-ink md:order-none md:w-56" aria-hidden="true" viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 150h172"/>
          <rect x="120" y="36" width="64" height="114" class="text-paper-deep" fill="currentColor" stroke="none"/>
          <rect x="120" y="36" width="64" height="114"/>
          <rect x="132" y="58" width="40" height="8" class="text-ink" fill="currentColor"/>
          <path d="M132 86h40M132 98h28" stroke-width="2" opacity="0.6"/>
          <rect x="18" y="88" width="74" height="48" class="text-tape" fill="currentColor" stroke="none"/>
          <rect x="18" y="88" width="74" height="48"/>
          <path d="m18 88 37 26 37-26"/>
          <path d="M60 78c10-30 46-36 64-18" class="text-pen-blue" stroke-dasharray="6 6"/>
          <path d="m118 52 8 10-12 2" class="text-pen-blue"/>
          <circle cx="104" cy="44" r="13" class="text-paper" fill="currentColor" stroke="none"/>
          <circle cx="104" cy="44" r="13" class="text-stamp-red"/>
          <path d="m98 38 12 12m0-12-12 12" class="text-stamp-red"/>
        </svg>
      </div>
    </ui:paper-card>
  </div>
</t:layout>
