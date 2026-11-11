<%--
  ClientHomeView.jsp, giao diện chính của khách "Trang chủ khách hàng" (ch.9 tr.59; docs/contracts.md §9.2
  ClientHomeView, §14 C6). Thành phần theo images/svg/ui_m1_ClientHomeView.svg, giữ thứ tự: tiêu đề, "Họ và tên: …",
  nút "Tìm và thuê truyện" (lnkSearchBook), nút "Phiếu mượn của tôi" (lnkViewRentalBill). Hai nút in thành thẻ chức
  năng có biểu tượng và mô tả; khối "Thuê truyện thế nào?" là phần trình bày thêm, không đổi nghiệp vụ.
  - Session R client (lấy fullName, in ra có escape). DAO: không. Dọn listRentalBill (C6).
  - doAddRentalBill forward về đây kèm request message = RENTAL_BILL_CREATED (ch.2 2.2 bước 22): hiện hộp thông báo
    kind success; câu khác (nếu có) kind error.
  - Nút "Đăng xuất" btnLogout (C14, ngoài báo cáo) nằm ở đầu trang của layout.tag, có trên mọi trang đã đăng nhập.
  - AuthFilter chặn khách chưa đăng nhập (§12); trang vẫn tự về LoginView khi không có client id > 0, để không bao
    giờ ra 500 vì thiếu client.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true"
         import="vn.tiemtruyen.model.Client, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%
    if (!(session.getAttribute("client") instanceof Client client) || client.getId() <= 0) {
        response.sendRedirect(request.getContextPath() + "/LoginView.jsp");
        return;
    }
    session.removeAttribute("listRentalBill");
    session.removeAttribute("listBook"); // C22: kết quả tìm cũ không theo khách sang lần mở "Tìm truyện" sau.
    pageContext.setAttribute("fullName", client.getFullName());
    pageContext.setAttribute("messageKind",
            Messages.RENTAL_BILL_CREATED.equals(request.getAttribute("message")) ? "success" : "error");
%>
<t:layout title="Trang chủ khách hàng">
  <div class="flex flex-col gap-8">
    <section class="tt-hero" aria-labelledby="client-home-h">
      <div>
        <p class="tt-hero__eyebrow">Xin chào, mời bạn vào tiệm!</p>
        <h1 id="client-home-h" class="tt-hero__title">Trang chủ khách hàng</h1>
        <p class="m-0 mt-2 text-ink">Họ và tên: <span class="tt-typed"><c:out value="${fullName}"/></span></p>
        <p class="tt-hero__lead">Hôm nay bạn muốn đọc gì? Chọn truyện trên mạng, rồi ghé quầy nhận truyện.</p>
      </div>
      <img src="${pageContext.request.contextPath}/static/img/logo-tiem.svg" alt="" width="120" height="120" class="tt-hero__art">
    </section>

    <c:if test="${not empty requestScope.message}"><ui:message-box kind="${messageKind}" text="${requestScope.message}"/></c:if>

    <section aria-labelledby="client-actions-h">
      <h2 id="client-actions-h" class="tt-section-title">Bạn muốn làm gì?</h2>
      <div class="tt-action-grid">
        <a id="lnkSearchBook" href="${pageContext.request.contextPath}/SearchBookView.jsp?moi=1"class="tt-action-card">
          <span class="tt-action-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <span class="tt-action-card__body">
            <span class="tt-action-card__title">Tìm và thuê truyện</span>
            <span class="tt-action-card__desc">Tìm theo tên truyện, xem bìa và số quyển còn trống, chọn tập muốn mượn rồi tạo phiếu.</span>
            <span class="tt-action-card__go" aria-hidden="true">Vào kệ truyện →</span>
          </span>
        </a>
        <a id="lnkViewRentalBill" href="${pageContext.request.contextPath}/RentalBillListView.jsp" class="tt-action-card tt-action-card--red">
          <span class="tt-action-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 13h7M9 17h5"/></svg>
          </span>
          <span class="tt-action-card__body">
            <span class="tt-action-card__title">Phiếu mượn của tôi</span>
            <span class="tt-action-card__desc">Xem các phiếu chờ nhận, đang thuê, đã huỷ; huỷ phiếu chưa nhận truyện.</span>
            <span class="tt-action-card__go" aria-hidden="true">Mở sổ phiếu →</span>
          </span>
        </a>
      </div>
    </section>

    <section aria-labelledby="client-steps-h">
      <h2 id="client-steps-h" class="tt-section-title">Thuê truyện thế nào?</h2>
      <ol class="tt-steps">
        <li class="tt-step"><span class="tt-step__title">Chọn truyện</span><span class="tt-step__desc">Tìm đầu truyện, thêm các tập muốn đọc vào "Truyện đã chọn".</span></li>
        <li class="tt-step"><span class="tt-step__title">Tạo phiếu mượn</span><span class="tt-step__desc">Kiểm lại danh sách, xác nhận để tiệm giữ truyện cho bạn.</span></li>
        <li class="tt-step"><span class="tt-step__title">Đến quầy nhận truyện</span><span class="tt-step__desc">Đọc mã phiếu cho nhân viên, đặt cọc và mang truyện về.</span></li>
      </ol>
    </section>
  </div>
</t:layout>
