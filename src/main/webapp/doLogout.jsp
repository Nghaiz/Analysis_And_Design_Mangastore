<%--
  doLogout.jsp, đăng xuất, không giao diện. PHẦN NGOÀI BÁO CÁO (chủ dự án duyệt 11/11/2026): docs/contracts.md §9.1
  dòng C14, §12, §14 C14. Một trang ở gốc, khách và nhân viên dùng chung.
  - Chỉ nhận POST (CsrfFilter đã kiểm token); method khác: 405.
  - Đọc vai TRƯỚC khi huỷ session, rồi session.invalidate():
      khách (client id > 0) → 302 HomeView.jsp; nhân viên (staff) → 302 /LoginView.jsp (trang đăng nhập chung, C23);
      chưa đăng nhập (không session, hoặc chỉ có bản nháp đăng kí id = 0) → 302 HomeView.jsp.
    Session vừa có client vừa có staff (không có luồng nào tạo ra): coi là khách, vì nút ở ClientHomeView.
  - session="false": không tạo session mới chỉ để huỷ nó.
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true"
         import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.Staff" %>
<%
    if (!"POST".equals(request.getMethod())) {
        response.setHeader("Allow", "POST");
        response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        return;
    }
    String next = "/HomeView.jsp";
    HttpSession current = request.getSession(false);
    if (current != null) {
        boolean client = current.getAttribute("client") instanceof Client c && c.getId() > 0;
        boolean staff = current.getAttribute("staff") instanceof Staff;
        if (!client && staff) {
            next = "/LoginView.jsp";
        }
        current.invalidate();
    }
    response.sendRedirect(request.getContextPath() + next);
%>
