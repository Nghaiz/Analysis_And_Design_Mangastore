<%--
  LoginView.jsp của khách, giao diện "Đăng nhập" (ch.9 tr.58; docs/contracts.md §9.2 LoginView;
  phase-06-integration.md §2 "Đăng nhập", §6.1 M1). Một trang chung cho khách và nhân viên (C23, chủ dự án đổi D5 ngày 11/11/2026): ClientDAO.checkLogin trước, không khớp thì StaffDAO.checkLogin (tblUser.username là duy nhất nên một tên chỉ thuộc một vai); nhan-vien/LoginView.jsp chỉ còn chuyển hướng về đây.
  - Chỉ xử lí đăng nhập khi POST + dispatcher REQUEST + có btnLogin. Mọi trường hợp khác chỉ hiển thị, kể cả khi
    doRegister forward sang kèm REGISTER_SUCCESS (request đó mang txtUsername, txtPassword của form đăng kí) và khi
    LoginRateLimitFilter chặn (filter đặt message = LOGIN_FAILED và bọc request thành GET).
  - Biến trang user: User (tên đăng nhập trim + NFC, mật khẩu NFC như doRegister), không lưu session. Ô trống hoặc
    mật khẩu dài hơn mức doRegister nhận: LOGIN_FAILED, không gọi DAO. Tên đăng nhập không phân biệt hoa thường nhờ
    collation utf8mb4_0900_ai_ci.
  - ClientDAO.checkLogin(user) khác null: huỷ session cũ, tạo session mới, W client (không mật khẩu), 302 ClientHomeView.
    null: message = LOGIN_FAILED, hiện lại trang, giữ txtUsername, txtPassword trống.
  - Khách đã đăng nhập (client id > 0) mở trang: 302 về ClientHomeView. Nhân viên đã đăng nhập vẫn thấy trang
    (hai vai tách nhau).
  - GET có expired=1 (C16, AuthFilter/CsrfFilter chuyển về khi session hết hạn): hiện SESSION_EXPIRED, kind info.
  - Form có action về chính trang vì URL trên thanh địa chỉ có thể đang là /doRegister.jsp (forward).
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true"
         import="java.text.Normalizer, vn.tiemtruyen.dao.ClientDAO, vn.tiemtruyen.dao.StaffDAO, vn.tiemtruyen.model.Client,
                 vn.tiemtruyen.model.Staff, vn.tiemtruyen.model.User, vn.tiemtruyen.util.Messages" %>
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
    if (direct && session.getAttribute("staff") instanceof Staff) {
        response.sendRedirect(request.getContextPath() + "/nhan-vien/StaffHomeView.jsp");
        return;
    }

    String username = direct ? text(request.getParameter("txtUsername")) : "";
    if (direct && "POST".equals(request.getMethod()) && request.getParameter("btnLogin") != null) {
        String rawPassword = request.getParameter("txtPassword");
        String password = rawPassword == null ? "" : Normalizer.normalize(rawPassword, Normalizer.Form.NFC);
        Client client = null;
        Staff staff = null;
        if (!username.isEmpty() && !password.isEmpty() && password.length() <= PASSWORD_MAX) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(password);
            try (ClientDAO clientDAO = new ClientDAO()) {
                client = clientDAO.checkLogin(user);
                if (client == null) {
                    // C23: không phải khách thì thử tài khoản nhân viên trên cùng trang.
                    user.setPassword(password);
                    try (StaffDAO staffDAO = new StaffDAO()) {
                        staff = staffDAO.checkLogin(user);
                    }
                }
            } finally {
                user.setPassword(null);
            }
        }
        if (staff != null) {
            staff.setPassword(null);
            // Máy quầy dùng chung: không kế thừa thuộc tính của người trước, nên huỷ session cũ rồi mở session mới.
            session.invalidate();
            request.getSession(true).setAttribute("staff", staff);
            response.sendRedirect(request.getContextPath() + "/nhan-vien/StaffHomeView.jsp");
            return;
        }
        if (client != null) {
            // phase-06-integration.md §2: session mới hẳn, người đăng nhập sau không kế thừa cart, rentalBill
            // hay danh sách tạm của người trước trên máy dùng chung (chống cố định session như changeSessionId).
            session.invalidate();
            request.getSession(true).setAttribute("client", client);
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
  <div class="mx-auto flex max-w-4xl flex-col gap-6 py-4">
    <header class="flex flex-col gap-1">
      <p class="tt-hero__eyebrow">Mời bạn vào tiệm</p>
      <h1 class="m-0">Đăng nhập</h1>
      <p class="m-0 text-ink-soft">Khách hàng đăng nhập để tìm truyện, tạo phiếu mượn và xem các phiếu của mình; nhân viên của tiệm dùng chung trang này để vào quầy.</p>
    </header>
    <c:if test="${not empty requestScope.message}"><ui:message-box kind="${messageKind}" text="${requestScope.message}"/></c:if>
    <div class="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
      <form method="post" action="${pageContext.request.contextPath}/LoginView.jsp" class="tt-paper-card tt-worn flex flex-col gap-5">
        <t:csrf/>
        <h2 class="tt-paper-card__heading">Tài khoản của bạn</h2>
        <div class="flex flex-col gap-1">
          <label for="txtUsername" class="font-type text-ink">Tên đăng nhập:</label>
          <input type="text" id="txtUsername" name="txtUsername" value="${fn:escapeXml(username)}" autocomplete="username" autocapitalize="none" spellcheck="false" aria-describedby="txtUsernameHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
          <p id="txtUsernameHint" class="m-0 text-sm text-ink-soft">Tên đăng nhập của tài khoản khách hàng hoặc nhân viên, không phân biệt chữ hoa, chữ thường.</p>
        </div>
        <div class="flex flex-col gap-1">
          <label for="txtPassword" class="font-type text-ink">Mật khẩu:</label>
          <input type="password" id="txtPassword" name="txtPassword" value="" autocomplete="current-password" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
        </div>
        <p class="m-0 flex justify-stretch sm:justify-start">
          <button type="submit" id="btnLogin" name="btnLogin" class="tt-btn tt-btn--primary w-full sm:w-auto">Đăng nhập</button>
        </p>
      </form>
      <section class="tt-paper-card flex flex-col gap-3" aria-labelledby="login-help-h">
        <h2 id="login-help-h" class="tt-paper-card__heading">Chưa có tài khoản?</h2>
        <p class="m-0 text-ink">Đăng kí bằng họ tên, số CCCD, số điện thoại và email. Xong là đăng nhập được ngay.</p>
        <p class="m-0"><a href="${pageContext.request.contextPath}/RegisterView.jsp" class="tt-btn tt-btn--ghost">Tạo tài khoản mới</a></p>
      </section>
    </div>
  </div>
</t:layout>
