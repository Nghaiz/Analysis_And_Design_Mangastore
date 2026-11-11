<%--
  ClientHomeView.jsp, giao diện chính của khách "Trang chủ khách hàng" (ch.9 tr.59; docs/contracts.md §9.2
  ClientHomeView, §14 C6). Thứ tự theo images/svg/ui_m1_ClientHomeView.svg: tiêu đề, "Họ và tên: …", nút
  "Tìm và thuê truyện" (lnkSearchBook), nút "Phiếu mượn của tôi" (lnkViewRentalBill).
  - Session R client (lấy fullName, in ra có escape). DAO: không. Dọn listRentalBill (C6).
  - Nút "Đăng xuất" (btnLogout → doLogout.jsp) là phần ngoài báo cáo (docs/contracts.md §14 C14).
  - AuthFilter chặn khách chưa đăng nhập (§12); trang vẫn tự về LoginView khi không có client id > 0, để không bao
    giờ ra 500 vì thiếu client.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true"
         import="vn.tiemtruyen.model.Client" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%
    if (!(session.getAttribute("client") instanceof Client client) || client.getId() <= 0) {
        response.sendRedirect(request.getContextPath() + "/LoginView.jsp");
        return;
    }
    session.removeAttribute("listRentalBill");
    pageContext.setAttribute("fullName", client.getFullName());
%>
<t:layout title="Trang chủ khách hàng">
  <section class="mx-auto flex max-w-2xl flex-col gap-6 py-8">
    <h1 class="font-sign text-ink">Trang chủ khách hàng</h1>
    <p class="text-ink">Họ và tên: <span class="tt-typed"><c:out value="${fullName}"/></span></p>
    <p class="flex flex-wrap gap-4">
      <a id="lnkSearchBook" href="${pageContext.request.contextPath}/SearchBookView.jsp" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Tìm và thuê truyện</a>
      <a id="lnkViewRentalBill" href="${pageContext.request.contextPath}/RentalBillListView.jsp" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Phiếu mượn của tôi</a>
    </p>
    <%-- Phần ngoài báo cáo (C14, chủ dự án duyệt 11/11/2026): nút "Đăng xuất". --%>
    <form method="post" action="${pageContext.request.contextPath}/ClientHomeView.jsp">
      <t:csrf/>
      <button type="submit" id="btnLogout" name="btnLogout" formaction="${pageContext.request.contextPath}/doLogout.jsp" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Đăng xuất</button>
    </form>
  </section>
</t:layout>
