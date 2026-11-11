<%--
  doAddCollateral (ch.9 tr.81–82; docs/contracts.md §9.2). Trang xử lí, không giao diện, chỉ POST (C2).
  - Field đọc: txtName, txtDescription. Biến trang: collateral. Session R: listRentalCollateral.
  - Tên trống (sau khi bỏ khoảng trắng hai đầu) → COLLATERAL_NAME_REQUIRED, forward AddCollateralView.
  - CollateralDAO.addCollateral false → COLLATERAL_EXISTS, forward AddCollateralView; true → thêm một dòng với loại
    tài sản vừa lưu vào listRentalCollateral (tạo nếu chưa có) → W listRentalCollateral, forward AddRentalCollateralView.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.ArrayList, java.util.List, vn.tiemtruyen.dao.CollateralDAO, vn.tiemtruyen.model.Collateral,
                 vn.tiemtruyen.model.RentalCollateral, vn.tiemtruyen.util.Messages" %>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(405);
        return;
    }
    String name = request.getParameter("txtName") == null ? "" : request.getParameter("txtName").strip();
    String description = request.getParameter("txtDescription") == null
            ? "" : request.getParameter("txtDescription").strip();
    if (name.isEmpty()) {
        request.setAttribute("message", Messages.COLLATERAL_NAME_REQUIRED);
        request.getRequestDispatcher("/nhan-vien/AddCollateralView.jsp").forward(request, response);
        return;
    }
    Collateral collateral = new Collateral();
    collateral.setName(name);
    collateral.setDescription(description.isEmpty() ? null : description);
    boolean saved;
    try (CollateralDAO dao = new CollateralDAO()) {
        saved = dao.addCollateral(collateral);
    }
    if (!saved) {
        request.setAttribute("message", Messages.COLLATERAL_EXISTS);
        request.getRequestDispatcher("/nhan-vien/AddCollateralView.jsp").forward(request, response);
        return;
    }
    @SuppressWarnings("unchecked")
    List<RentalCollateral> current = (List<RentalCollateral>) session.getAttribute("listRentalCollateral");
    List<RentalCollateral> listRentalCollateral = current == null ? new ArrayList<>() : new ArrayList<>(current);
    RentalCollateral item = new RentalCollateral();
    item.setCollateral(collateral);
    listRentalCollateral.add(item);
    session.setAttribute("listRentalCollateral", listRentalCollateral);
    request.getRequestDispatcher("/nhan-vien/AddRentalCollateralView.jsp").forward(request, response);
    return;
%>
