<%--
  Đăng nhập của nhân viên (docs/contracts.md §9.1 #4, §9.2 LoginView; ch.9 tr.71–72; D5).
  Xem, tự gửi. DAO: StaffDAO.checkLogin. Session W: staff (không mật khẩu, C5).
  Chỉ xử lí khi POST + dispatcher REQUEST + có btnLogin (phase-06-integration.md §2); mọi trường hợp khác chỉ hiển thị,
  kể cả khi LoginRateLimitFilter chặn (filter đặt message = LOGIN_FAILED và bọc request thành GET).
  Thành công: huỷ session cũ, mở session mới, ghi staff, chuyển (302) tới /nhan-vien/StaffHomeView.jsp. Thất bại: LOGIN_FAILED,
  giữ txtUsername, để trống txtPassword. GET có expired=1 (C16): hiện SESSION_EXPIRED (kind info).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.dao.StaffDAO" %>
<%@ page import="vn.tiemtruyen.model.Staff" %>
<%@ page import="vn.tiemtruyen.model.User" %>
<%@ page import="vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%
    String ctx = request.getContextPath();
    boolean ownPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST
            && request.getParameter("btnLogin") != null;
    String username = request.getParameter("txtUsername");
    if (ownPost) {
        User user = new User();
        user.setUsername(username == null ? null
                : Normalizer.normalize(username.strip(), Normalizer.Form.NFC));
        user.setPassword(request.getParameter("txtPassword"));
        Staff staff;
        try (StaffDAO dao = new StaffDAO()) {
            staff = dao.checkLogin(user);
        }
        user.setPassword(null);
        if (staff != null) {
            staff.setPassword(null);
            // Máy quầy dùng chung: không kế thừa thuộc tính của người trước, nên huỷ session cũ rồi mở session mới.
            HttpSession old = request.getSession(false);
            if (old != null) {
                old.invalidate();
            }
            request.getSession(true).setAttribute("staff", staff);
            response.sendRedirect(ctx + "/nhan-vien/StaffHomeView.jsp");
            return;
        }
        request.setAttribute("message", Messages.LOGIN_FAILED);
    } else if ("GET".equals(request.getMethod()) && "1".equals(request.getParameter("expired"))
            && request.getAttribute("message") == null) {
        // C16: AuthFilter/CsrfFilter chuyển về đây vì session hết hạn.
        request.setAttribute("message", Messages.SESSION_EXPIRED);
    }
    pageContext.setAttribute("messageKind",
            Messages.SESSION_EXPIRED.equals(request.getAttribute("message")) ? "info" : "error");
    pageContext.setAttribute("usernameValue", username == null ? "" : username);
%>
<t:layout title="Đăng nhập">
  <div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 md:items-start">
    <section class="tt-hero md:col-span-2" aria-labelledby="staff-login-h">
      <div>
        <p class="tt-hero__eyebrow">Quầy nhân viên</p>
        <h1 id="staff-login-h" class="tt-hero__title">Đăng nhập</h1>
        <p class="tt-hero__lead">Đăng nhập bằng tài khoản nhân viên của tiệm để tìm phiếu khách đã đặt và giao truyện tại quầy.</p>
      </div>
      <img src="${pageContext.request.contextPath}/static/img/logo-tiem.svg" alt="" width="96" height="96" class="tt-hero__art">
    </section>

    <div class="flex flex-col gap-4">
      <c:if test="${not empty message}">
        <ui:message-box kind="${messageKind}" text="${message}"/>
      </c:if>
      <ui:paper-card heading="" taped="true">
        <form method="post" action="${pageContext.request.contextPath}/nhan-vien/LoginView.jsp" class="grid gap-5">
          <t:csrf/>
          <div class="grid gap-1">
            <label for="txtUsername">Tên đăng nhập:</label>
            <input type="text" id="txtUsername" name="txtUsername" value="<c:out value='${usernameValue}'/>"
                   autocomplete="username" maxlength="50" autocapitalize="none" spellcheck="false"
                   aria-describedby="txtUsername-hint"
                   class="h-11 w-full rounded-paper border border-input bg-paper px-3 text-ink">
            <p id="txtUsername-hint" class="m-0 text-sm text-ink-soft">Tên đăng nhập do tiệm cấp cho nhân viên.</p>
          </div>
          <div class="grid gap-1">
            <label for="txtPassword">Mật khẩu:</label>
            <input type="password" id="txtPassword" name="txtPassword" value="" autocomplete="current-password"
                   class="h-11 w-full rounded-paper border border-input bg-paper px-3 text-ink">
          </div>
          <div>
            <button type="submit" id="btnLogin" name="btnLogin" value=""
                    class="tt-btn tt-btn--primary w-full sm:w-auto">Đăng nhập</button>
          </div>
        </form>
      </ui:paper-card>
    </div>

    <aside aria-labelledby="staff-login-note-h" class="flex flex-col gap-3">
      <h2 id="staff-login-note-h" class="tt-section-title">Sau khi đăng nhập</h2>
      <ol class="tt-steps">
        <li class="tt-step"><span class="tt-step__title">Tìm phiếu</span><span class="tt-step__desc">Tìm theo mã phiếu, tên khách hàng hoặc số CCCD.</span></li>
        <li class="tt-step"><span class="tt-step__title">Kiểm truyện</span><span class="tt-step__desc">Tích quyển giao, ghi tình trạng từng quyển, nhận đồ cọc.</span></li>
        <li class="tt-step"><span class="tt-step__title">Xác nhận và in</span><span class="tt-step__desc">Lưu phiếu rồi in phiếu mượn đưa khách.</span></li>
      </ol>
      <p class="m-0 text-sm text-ink-soft">Máy quầy dùng chung: đăng nhập sẽ kết thúc phiên của người dùng trước trên trình duyệt này. Xong ca thì bấm Đăng xuất ở đầu trang.</p>
    </aside>
  </div>
</t:layout>
