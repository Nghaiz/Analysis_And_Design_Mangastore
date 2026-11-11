<%--
  Trang chủ nhân viên (docs/contracts.md §9.1 #6, §9.2 StaffHomeView; ch.9 tr.72). Xem. DAO: không.
  Session R: staff. Nút "Xử lí phiếu mượn" (lnkProcessRentalBill → SearchRentalBillView.jsp), in thành thẻ chức năng.
  Lối vào trang quản trị D6 chỉ hiện với Staff.POSITION_MANAGER ("Quản lí"), ghi rõ là phần ngoài báo cáo (C12).
  PrintRentalBillView gửi nút "In phiếu" (POST, có csrf) tới đây: trang chỉ hiển thị (C2).
  Nút "Đăng xuất" btnLogout (C14, ngoài báo cáo) nằm ở đầu trang của layout.tag, có trên mọi trang đã đăng nhập.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.Staff" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
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
  <div class="flex flex-col gap-8">
    <section class="tt-hero" aria-labelledby="staff-home-h">
      <div>
        <p class="tt-hero__eyebrow">Chúc một ca làm việc suôn sẻ!</p>
        <h1 id="staff-home-h" class="tt-hero__title">Trang chủ nhân viên</h1>
        <p class="m-0 mt-2">Họ và tên: <span class="tt-typed"><c:out value="${staffName}"/></span></p>
        <p class="m-0">Chức vụ: <span class="tt-typed"><c:out value="${staffPosition}"/></span></p>
      </div>
      <img src="${pageContext.request.contextPath}/static/img/logo-tiem.svg" alt="" width="120" height="120" class="tt-hero__art">
    </section>

    <section aria-labelledby="staff-actions-h">
      <h2 id="staff-actions-h" class="tt-section-title">Công việc tại quầy</h2>
      <div class="tt-action-grid">
        <a id="lnkProcessRentalBill" href="${pageContext.request.contextPath}/nhan-vien/SearchRentalBillView.jsp" class="tt-action-card">
          <span class="tt-action-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>
          </span>
          <span class="tt-action-card__body">
            <span class="tt-action-card__title">Xử lí phiếu mượn</span>
            <span class="tt-action-card__desc">Tìm phiếu khách đã tạo, kiểm quyển và tình trạng, nhận đồ cọc, xác nhận và in phiếu.</span>
            <span class="tt-action-card__go" aria-hidden="true">Mở bàn quầy →</span>
          </span>
        </a>
        <c:if test="${isManager}">
          <a id="lnkManageBook" href="${pageContext.request.contextPath}/nhan-vien/quan-tri/ManageBookView.jsp" class="tt-action-card tt-action-card--green">
            <span class="tt-action-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.5-1 3 15.5-3.5 1z"/></svg>
            </span>
            <span class="tt-action-card__body">
              <span class="tt-action-card__title">Quản lí đầu truyện</span>
              <span class="tt-action-card__desc">Thêm và sửa đầu truyện trong kho. Phần thêm ngoài báo cáo (D6), chỉ dành cho Quản lí.</span>
              <span class="tt-action-card__go" aria-hidden="true">Vào kho truyện →</span>
            </span>
          </a>
        </c:if>
      </div>
    </section>

    <section aria-labelledby="staff-steps-h">
      <h2 id="staff-steps-h" class="tt-section-title">Các bước giao truyện</h2>
      <ol class="tt-steps">
        <li class="tt-step"><span class="tt-step__title">Tìm phiếu</span><span class="tt-step__desc">Nhập mã phiếu hoặc thông tin khách, chọn phiếu đang chờ nhận.</span></li>
        <li class="tt-step"><span class="tt-step__title">Kiểm truyện</span><span class="tt-step__desc">Tích quyển giao, ghi tình trạng và lỗi của từng quyển.</span></li>
        <li class="tt-step"><span class="tt-step__title">Nhận cọc và in phiếu</span><span class="tt-step__desc">Thêm khoản cọc, đặt ngày hẹn trả, xác nhận rồi in phiếu.</span></li>
      </ol>
    </section>
  </div>
</t:layout>
