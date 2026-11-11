<%--
  Đăng nhập của nhân viên (docs/contracts.md §9.1 #4, §9.2 LoginView; ch.9 tr.71–72; D5).
  Xem, tự gửi. DAO: StaffDAO.checkLogin. Session W: staff (không mật khẩu, C5).
  Chỉ xử lí khi POST + dispatcher REQUEST + có btnLogin (phase-06-integration.md §2); mọi trường hợp khác chỉ hiển thị,
  kể cả khi LoginRateLimitFilter chặn (filter đặt message = LOGIN_FAILED và bọc request thành GET).
  Thành công: đổi session id, ghi staff, chuyển (302) tới /nhan-vien/StaffHomeView.jsp. Thất bại: LOGIN_FAILED,
  giữ txtUsername, để trống txtPassword. GET có expired=1 (C16): hiện SESSION_EXPIRED (kind info).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
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
        user.setUsername(username == null ? null : username.strip());
        user.setPassword(request.getParameter("txtPassword"));
        Staff staff;
        try (StaffDAO dao = new StaffDAO()) {
            staff = dao.checkLogin(user);
        }
        user.setPassword(null);
        if (staff != null) {
            staff.setPassword(null);
            request.getSession();
            request.changeSessionId();
            session.setAttribute("staff", staff);
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
  <h1>Đăng nhập</h1>
  <c:if test="${not empty message}">
    <ui:message-box kind="${messageKind}" text="${message}"/>
  </c:if>
  <ui:paper-card heading="" taped="true">
    <form method="post" action="${pageContext.request.contextPath}/nhan-vien/LoginView.jsp" class="grid max-w-md gap-4">
      <t:csrf/>
      <label for="txtUsername" class="grid gap-1">
        <span>Tên đăng nhập:</span>
        <input type="text" id="txtUsername" name="txtUsername" value="<c:out value='${usernameValue}'/>"
               autocomplete="username" maxlength="50"
               class="h-10 rounded-paper border border-input bg-paper px-3">
      </label>
      <label for="txtPassword" class="grid gap-1">
        <span>Mật khẩu:</span>
        <input type="password" id="txtPassword" name="txtPassword" value="" autocomplete="current-password"
               class="h-10 rounded-paper border border-input bg-paper px-3">
      </label>
      <div>
        <button type="submit" id="btnLogin" name="btnLogin" value=""
                class="inline-flex h-10 items-center justify-center rounded-paper bg-primary px-6 text-primary-foreground hover:bg-primary/90">Đăng nhập</button>
      </div>
    </form>
  </ui:paper-card>
</t:layout>
