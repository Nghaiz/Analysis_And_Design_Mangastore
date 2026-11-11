<%--
  Trang lỗi 403 (web.xml error-page; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 403 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session. Nút về trang chủ theo vai: chỉ đọc session đã có (như layout.tag),
  không gọi DAO. Hình minh hoạ tự vẽ (SVG nội tuyến, aria-hidden).
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.Staff" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<% response.setStatus(HttpServletResponse.SC_FORBIDDEN); %>
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
<t:layout title="Không được vào trang này">
  <div class="mx-auto max-w-4xl">
    <ui:paper-card heading="" taped="true">
      <div class="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h1 class="tt-sign m-0 mb-6 text-3xl">403 · Không được vào trang này</h1>
          <p class="mb-6">Bạn chưa có quyền mở trang này, hoặc phiếu gửi đi đã cũ (phiên làm việc vừa đổi). Hãy mở lại trang từ trang chủ rồi thử lại.</p>
          <p class="m-0 flex flex-wrap gap-3">
            <c:if test="${not empty roleHome}">
              <a href="${pageContext.request.contextPath}${roleHome}" class="tt-btn tt-btn--primary"><c:out value="${roleHomeText}"/></a>
            </c:if>
            <a href="${pageContext.request.contextPath}/" class="tt-btn ${empty roleHome ? 'tt-btn--primary' : 'tt-btn--ghost'}">Về trang chủ</a>
          </p>
        </div>
        <svg class="order-first mx-auto h-auto w-40 text-ink md:order-none md:w-56" aria-hidden="true" viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 150h172"/>
          <path d="M36 150V44h128v106"/>
          <path d="M28 46 100 18l72 28" class="text-stamp-red"/>
          <rect x="48" y="56" width="104" height="94" class="text-paper-deep" fill="currentColor" stroke="none"/>
          <rect x="48" y="56" width="104" height="94"/>
          <path d="M48 70h104M48 84h104M48 98h104M48 112h104M48 126h104M48 140h104" stroke-width="1.5" opacity="0.6"/>
          <path d="M92 96v-8a8 8 0 0 1 16 0v8" class="text-pen-blue"/>
          <rect x="84" y="96" width="32" height="26" class="text-tape" fill="currentColor" stroke="none"/>
          <rect x="84" y="96" width="32" height="26" class="text-pen-blue"/>
          <circle cx="100" cy="106" r="3" class="text-pen-blue"/>
          <path d="M100 109v6" class="text-pen-blue"/>
        </svg>
      </div>
    </ui:paper-card>
  </div>
</t:layout>
