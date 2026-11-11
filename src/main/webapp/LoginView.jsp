<%--
  LoginView.jsp của khách, giao diện "Đăng nhập" (ch.9 tr.58; docs/contracts.md §9.2 LoginView;
  phase-06-integration.md §2 "Đăng nhập", §6.1 M1). Bản của nhân viên ở nhan-vien/LoginView.jsp (D5).
  - Chỉ xử lí đăng nhập khi POST + dispatcher REQUEST + có btnLogin. Mọi trường hợp khác chỉ hiển thị, kể cả khi
    doRegister forward sang kèm REGISTER_SUCCESS (request đó mang txtUsername, txtPassword của form đăng kí) và khi
    LoginRateLimitFilter chặn (filter đặt message = LOGIN_FAILED và bọc request thành GET).
  - Biến trang user: User (tên đăng nhập trim + NFC, mật khẩu NFC như doRegister), không lưu session. Ô trống hoặc
    mật khẩu dài hơn mức doRegister nhận: LOGIN_FAILED, không gọi DAO. Tên đăng nhập không phân biệt hoa thường nhờ
    collation utf8mb4_0900_ai_ci.
  - ClientDAO.checkLogin(user) khác null: changeSessionId, session W client (không mật khẩu), 302 ClientHomeView.
    null: message = LOGIN_FAILED, hiện lại trang, giữ txtUsername, txtPassword trống.
  - Khách đã đăng nhập (client id > 0) mở trang: 302 về ClientHomeView. Nhân viên đã đăng nhập vẫn thấy trang
    (hai vai tách nhau).
  - GET có expired=1 (C16, AuthFilter/CsrfFilter chuyển về khi session hết hạn): hiện SESSION_EXPIRED, kind info.
  - Form có action về chính trang vì URL trên thanh địa chỉ có thể đang là /doRegister.jsp (forward).
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true"
         import="java.text.Normalizer, vn.tiemtruyen.dao.ClientDAO, vn.tiemtruyen.model.Client,
                 vn.tiemtruyen.model.User, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Cùng trần với doRegister.jsp: không tài khoản nào có mật khẩu dài hơn, khỏi băm chuỗi khổng lồ. */
    private static final int PASSWORD_MAX = 128;

    private static String text(String raw) {
        return raw == null ? "" : Normalizer.normalize(raw.strip(), Normalizer.Form.NFC);
    }
%>
<%
    boolean direct = request.getDispatcherType() == DispatcherType.REQUEST;
    if (direct && session.getAttribute("client") instanceof Client current && current.getId() > 0) {
        response.sendRedirect(request.getContextPath() + "/ClientHomeView.jsp");
        return;
    }

    String username = direct ? text(request.getParameter("txtUsername")) : "";
    if (direct && "POST".equals(request.getMethod()) && request.getParameter("btnLogin") != null) {
        String rawPassword = request.getParameter("txtPassword");
        String password = rawPassword == null ? "" : Normalizer.normalize(rawPassword, Normalizer.Form.NFC);
        Client client = null;
        if (!username.isEmpty() && !password.isEmpty() && password.length() <= PASSWORD_MAX) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(password);
            try (ClientDAO clientDAO = new ClientDAO()) {
                client = clientDAO.checkLogin(user);
            } finally {
                user.setPassword(null);
            }
        }
        if (client != null) {
            request.changeSessionId();
            session.setAttribute("client", client);
            response.sendRedirect(request.getContextPath() + "/ClientHomeView.jsp");
            return;
        }
        request.setAttribute("message", Messages.LOGIN_FAILED);
    }
    // C16: AuthFilter/CsrfFilter chuyển về đây kèm ?expired=1 khi session hết hạn (câu ngoài báo cáo, §10.3).
    if (direct && "GET".equals(request.getMethod()) && "1".equals(request.getParameter("expired"))
            && request.getAttribute("message") == null) {
        request.setAttribute("message", Messages.SESSION_EXPIRED);
    }

    Object message = request.getAttribute("message");
    String messageKind = "error";
    if (Messages.REGISTER_SUCCESS.equals(message)) {
        messageKind = "success";
    } else if (Messages.SESSION_EXPIRED.equals(message)) {
        messageKind = "info";
    }
    pageContext.setAttribute("messageKind", messageKind);
    pageContext.setAttribute("username", username);
%>
<t:layout title="Đăng nhập">
  <section class="mx-auto flex max-w-xl flex-col gap-6 py-8">
    <h1 class="font-sign text-ink">Đăng nhập</h1>
    <c:if test="${not empty requestScope.message}"><ui:message-box kind="${messageKind}" text="${requestScope.message}"/></c:if>
    <form method="post" action="${pageContext.request.contextPath}/LoginView.jsp" class="tt-worn flex flex-col gap-4 rounded-paper bg-paper p-6 shadow-paper">
      <t:csrf/>
      <div class="grid gap-x-4 gap-y-3 sm:grid-cols-[9rem_1fr] sm:items-center">
        <label for="txtUsername" class="text-ink">Tên đăng nhập:</label>
        <input type="text" id="txtUsername" name="txtUsername" value="${fn:escapeXml(username)}" autocomplete="username" autocapitalize="none" spellcheck="false" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
        <label for="txtPassword" class="text-ink">Mật khẩu:</label>
        <input type="password" id="txtPassword" name="txtPassword" value="" autocomplete="current-password" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
      </div>
      <p class="flex justify-center">
        <button type="submit" id="btnLogin" name="btnLogin" class="rounded-paper bg-primary px-6 py-2 text-primary-foreground shadow-paper">Đăng nhập</button>
      </p>
    </form>
  </section>
</t:layout>
