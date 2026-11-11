<%--
  doRegister.jsp, trang xử lí đăng kí, không giao diện (ch.9 tr.57–58; docs/contracts.md §9.2 doRegister, §14 C2, C4, C5;
  phase-06-integration.md §3, §6.1 M1).
  - Chỉ nhận POST (GET và method khác: 405, C2).
  - Khách đã đăng nhập (client id > 0) gửi tới đây: 302 về ClientHomeView, không đè client đang đăng nhập bằng bản
    nháp (cùng luật với RegisterView, §6.1 M1).
  - Mọi ô chữ trim + chuẩn hoá NFC; điện thoại bỏ dấu cách, chấm, gạch; email chữ thường. Mật khẩu chỉ NFC (không
    trim: dấu cách là một phần của mật khẩu), LoginView chuẩn hoá đúng như vậy.
  - Session W client (bản nháp id = 0, KHÔNG có mật khẩu, C5) trước khi kiểm, để RegisterView điền lại.
  - Thứ tự: ô trống hoặc sai định dạng (C4) → REGISTER_INVALID; mật khẩu nhập lại không khớp →
    REGISTER_PASSWORD_MISMATCH; addClient false (trùng UNIQUE, kể cả hai người đăng kí cùng lúc hoặc F5 gửi lại form
    đã thành công) → REGISTER_DUPLICATE; ← RegisterView. Thành công: bỏ client, REGISTER_SUCCESS, → LoginView.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true"
         import="java.text.Normalizer, java.time.LocalDate, java.time.format.DateTimeParseException,
                 java.util.regex.Pattern, vn.tiemtruyen.dao.ClientDAO, vn.tiemtruyen.model.Client,
                 vn.tiemtruyen.util.Messages" %>
<%!
    // Độ dài cột: docs/contracts.md §2 (tblUser, tblClient).
    private static final int FULL_NAME_MAX = 100;
    private static final int USERNAME_MAX = 50;
    private static final int EMAIL_MAX = 100;
    private static final int ADDRESS_MAX = 255;
    /** Chặn băm Argon2id trên chuỗi khổng lồ (phase-06-integration.md §6.1 M1). */
    private static final int PASSWORD_MAX = 128;
    /** Ngày sinh sớm nhất nhận (phase-06-integration.md §6.1 M1: trước 1900 là sai). */
    private static final LocalDate DOB_MIN = LocalDate.of(1900, 1, 1);

    private static final Pattern ID_CARD = Pattern.compile("\\d{12}");
    private static final Pattern PHONE = Pattern.compile("0\\d{9}");
    private static final Pattern PHONE_SEPARATORS = Pattern.compile("[\\s.\\-]");
    private static final Pattern EMAIL = Pattern.compile("[^\\s@]+@[^\\s@]+\\.[^\\s@]+");
    /** Không có khoảng trắng nào, kể cả khoảng trắng Unicode (NBSP...). */
    private static final Pattern USERNAME = Pattern.compile("\\S+", Pattern.UNICODE_CHARACTER_CLASS);

    /** trim + NFC; thiếu tham số thì chuỗi rỗng. */
    private static String text(String raw) {
        return raw == null ? "" : Normalizer.normalize(raw.strip(), Normalizer.Form.NFC);
    }

    /** Mật khẩu: chỉ NFC, không trim. */
    private static String password(String raw) {
        return raw == null ? "" : Normalizer.normalize(raw, Normalizer.Form.NFC);
    }

    /** yyyy-MM-dd hợp lệ (2003-02-31 là sai), từ 1900 tới trước hôm nay (C4: "trước hôm nay"); sai thì null. */
    private static LocalDate dob(String value) {
        try {
            LocalDate date = LocalDate.parse(value);
            return date.isBefore(DOB_MIN) || !date.isBefore(LocalDate.now()) ? null : date;
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static boolean filled(String value, int max) {
        return !value.isEmpty() && value.length() <= max;
    }
%>
<%
    if (!"POST".equals(request.getMethod())) {
        response.setHeader("Allow", "POST");
        response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        return;
    }
    if (session.getAttribute("client") instanceof Client current && current.getId() > 0) {
        response.sendRedirect(request.getContextPath() + "/ClientHomeView.jsp");
        return;
    }

    String fullName = text(request.getParameter("txtFullName"));
    String dobText = text(request.getParameter("txtDob"));
    String idCard = text(request.getParameter("txtIdCard"));
    String phone = PHONE_SEPARATORS.matcher(text(request.getParameter("txtPhone"))).replaceAll("");
    String email = text(request.getParameter("txtEmail")).toLowerCase(java.util.Locale.ROOT);
    String address = text(request.getParameter("txtAddress"));
    String username = text(request.getParameter("txtUsername"));
    String rawPassword = password(request.getParameter("txtPassword"));
    String confirmPassword = password(request.getParameter("txtConfirmPassword"));
    LocalDate dob = dob(dobText);

    Client client = new Client();
    client.setFullName(fullName);
    client.setDob(dob);
    client.setIdCard(idCard);
    client.setPhone(phone);
    client.setEmail(email);
    client.setAddress(address);
    client.setUsername(username);
    session.setAttribute("client", client); // bản nháp id = 0, chưa có mật khẩu (C5)

    boolean valid = filled(fullName, FULL_NAME_MAX)
            && dob != null
            && ID_CARD.matcher(idCard).matches()
            && PHONE.matcher(phone).matches()
            && filled(email, EMAIL_MAX) && EMAIL.matcher(email).matches()
            && filled(address, ADDRESS_MAX)
            && filled(username, USERNAME_MAX) && USERNAME.matcher(username).matches()
            && filled(rawPassword, PASSWORD_MAX);

    String message;
    String next = "/RegisterView.jsp";
    if (!valid) {
        message = Messages.REGISTER_INVALID;
    } else if (!rawPassword.equals(confirmPassword)) {
        message = Messages.REGISTER_PASSWORD_MISMATCH;
    } else {
        boolean saved;
        client.setPassword(rawPassword);
        try (ClientDAO clientDAO = new ClientDAO()) {
            saved = clientDAO.addClient(client);
        } finally {
            client.setPassword(null); // không để mật khẩu thô sống trên đối tượng (C5)
        }
        if (saved) {
            session.removeAttribute("client");
            message = Messages.REGISTER_SUCCESS;
            next = "/LoginView.jsp";
        } else {
            message = Messages.REGISTER_DUPLICATE;
        }
    }
    request.setAttribute("message", message);
    request.getRequestDispatcher(next).forward(request, response);
%>
