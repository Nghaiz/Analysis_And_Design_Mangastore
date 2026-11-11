<%--
  doAddDamage (ch.9 tr.79; docs/contracts.md §9.2). Trang xử lí, không giao diện, chỉ POST (C2).
  - Field đọc: txtName, txtDescription. Biến trang: damage. Session R: rentedBook.
  - Tên lỗi trống (sau khi bỏ khoảng trắng hai đầu) → DAMAGE_NAME_REQUIRED, forward AddDamageView.
  - DamageDAO.addDamage false → DAMAGE_EXISTS, forward AddDamageView; true → thêm loại lỗi vừa lưu vào
    "Các lỗi đã ghi nhận" của rentedBook → W rentedBook, forward AddConditionView.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.ArrayList, java.util.List, vn.tiemtruyen.dao.DamageDAO, vn.tiemtruyen.model.Damage,
                 vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.model.RentedDamage, vn.tiemtruyen.util.Messages" %>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(405);
        return;
    }
    RentedBook rentedBook = (RentedBook) session.getAttribute("rentedBook");
    if (rentedBook == null) {
        response.sendRedirect(request.getContextPath() + "/nhan-vien/ProcessRentalBillView.jsp");
        return;
    }
    String name = request.getParameter("txtName") == null ? "" : request.getParameter("txtName").strip();
    String description = request.getParameter("txtDescription") == null
            ? "" : request.getParameter("txtDescription").strip();
    if (name.isEmpty()) {
        request.setAttribute("message", Messages.DAMAGE_NAME_REQUIRED);
        request.getRequestDispatcher("/nhan-vien/AddDamageView.jsp").forward(request, response);
        return;
    }
    Damage damage = new Damage();
    damage.setName(name);
    damage.setDescription(description.isEmpty() ? null : description);
    boolean saved;
    try (DamageDAO dao = new DamageDAO()) {
        saved = dao.addDamage(damage);
    }
    if (!saved) {
        request.setAttribute("message", Messages.DAMAGE_EXISTS);
        request.getRequestDispatcher("/nhan-vien/AddDamageView.jsp").forward(request, response);
        return;
    }
    RentedDamage item = new RentedDamage();
    item.setDamage(damage);
    List<RentedDamage> damages = new ArrayList<>(rentedBook.getListRentedDamage());
    damages.add(item);
    rentedBook.setListRentedDamage(damages);
    session.setAttribute("rentedBook", rentedBook);
    request.getRequestDispatcher("/nhan-vien/AddConditionView.jsp").forward(request, response);
    return;
%>
