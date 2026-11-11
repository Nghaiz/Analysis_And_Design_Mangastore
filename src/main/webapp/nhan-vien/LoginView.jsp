<%--
  nhan-vien/LoginView.jsp: trang đăng nhập riêng của nhân viên (D5) đã gộp vào /LoginView.jsp theo yêu cầu chủ dự án
  ngày 11/11/2026 (docs/contracts.md §14 C23). Trang chỉ còn chuyển hướng 302 về trang chung, giữ ?expired=1 (C16),
  để link và dấu trang cũ không gãy. Không giao diện, không đọc session, không gọi DAO.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%
    String expired = "1".equals(request.getParameter("expired")) ? "?expired=1" : "";
    response.sendRedirect(request.getContextPath() + "/LoginView.jsp" + expired);
%>
