<%--
  Trang chủ nhân viên (docs/contracts.md §9.1 #6, §9.2 StaffHomeView; ch.9 tr.72). Xem. DAO: không.
  Session R: staff. Nút "Xử lí phiếu mượn" (lnkProcessRentalBill → SearchRentalBillView.jsp).
  Lối vào trang quản trị D6 chỉ hiện với Staff.POSITION_MANAGER ("Quản lí"), ghi rõ là phần ngoài báo cáo (C12).
  PrintRentalBillView gửi nút "In phiếu" (POST, có csrf) tới đây: trang chỉ hiển thị (C2).
  Nút "Đăng xuất" btnLogout (C14, ngoài báo cáo): form POST + csrf, formaction /doLogout.jsp.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.Staff" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%
    Staff staff = (Staff) session.getAttribute("staff");
    if (staff == null) {
        // AuthFilter đã chặn (§12); phòng khi trang được gọi thẳng lúc filter chưa có.
        response.sendRedirect(request.getContextPath() + "/nhan-vien/LoginView.jsp");
        return;
    }
    pageContext.setAttribute("staffName", staff.getFullName());
    pageContext.setAttribute("staffPosition", staff.getPosition());
    pageContext.setAttribute("isManager", Staff.POSITION_MANAGER.equals(staff.getPosition()));
%>
<t:layout title="Trang chủ nhân viên">
  <h1>Trang chủ nhân viên</h1>
  <ui:paper-card heading="" taped="true">
    <p class="m-0">Họ và tên: <c:out value="${staffName}"/></p>
    <p class="m-0">Chức vụ: <c:out value="${staffPosition}"/></p>
  </ui:paper-card>
  <p class="mt-6">
    <a id="lnkProcessRentalBill" href="${pageContext.request.contextPath}/nhan-vien/SearchRentalBillView.jsp"
       class="inline-flex h-10 items-center justify-center rounded-paper bg-primary px-6 text-primary-foreground no-underline hover:bg-primary/90">Xử lí phiếu mượn</a>
  </p>
  <c:if test="${isManager}">
    <section aria-labelledby="quan-tri-h" class="mt-10 border-t border-ink-soft pt-6">
      <h2 id="quan-tri-h" class="text-xl">Quản trị</h2>
      <p class="m-0 mb-3 text-sm text-ink-soft">Phần thêm ngoài báo cáo (D6), chỉ dành cho Quản lí.</p>
      <a id="lnkManageBook" href="${pageContext.request.contextPath}/nhan-vien/quan-tri/ManageBookView.jsp"
         class="inline-flex h-10 items-center justify-center rounded-paper border border-ink-soft bg-paper px-6 text-ink no-underline shadow-paper hover:bg-accent">Quản lí đầu truyện</a>
    </section>
  </c:if>
  <%-- C14: đăng xuất, phần ngoài báo cáo (chủ dự án duyệt 11/11/2026); doLogout.jsp ở gốc, dùng chung hai vai. --%>
  <form method="post" action="${pageContext.request.contextPath}/nhan-vien/StaffHomeView.jsp"
        class="mt-10 border-t border-ink-soft pt-6">
    <t:csrf/>
    <p class="m-0 mb-3 text-sm text-ink-soft">Phần thêm ngoài báo cáo.</p>
    <button type="submit" id="btnLogout" name="btnLogout" value=""
            formaction="${pageContext.request.contextPath}/doLogout.jsp"
            class="inline-flex h-10 items-center justify-center rounded-paper border border-ink-soft bg-paper px-6 text-ink shadow-paper hover:bg-accent">Đăng xuất</button>
  </form>
</t:layout>
