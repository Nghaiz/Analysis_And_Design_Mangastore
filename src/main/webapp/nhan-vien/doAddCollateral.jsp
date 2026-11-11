<%--
  doAddCollateral (ch.9 tr.81–82; docs/contracts.md §9.2). Trang xử lí, không giao diện, chỉ POST (C2).
  - Field đọc: txtName, txtDescription (trim + NFC). Biến trang: collateral. Session R: listRentalCollateral.
  - Tên trống → COLLATERAL_NAME_REQUIRED; tên quá 100 hoặc mô tả quá 255 kí tự → INPUT_TOO_LONG; cả hai
    forward AddCollateralView, không gọi DAO.
  - CollateralDAO.addCollateral false (tên trùng, kể cả khác hoa thường hay dấu) → COLLATERAL_EXISTS, forward
    AddCollateralView; true → thêm một dòng với loại tài sản vừa lưu vào listRentalCollateral (tạo nếu chưa có)
    → W listRentalCollateral, forward AddRentalCollateralView.
  Đầu trang (phase-07-edge-cases.md §3.1), không ghi gì ở các nhánh này: (1) thiếu rentalBill → 302
  SearchRentalBillView; (2) rentalBill không còn "Chờ nhận" → forward SearchRentalBillView kèm câu D9; (3) input ẩn
  rentalBillId thiếu hoặc sai → forward ProcessRentalBillView kèm RENTAL_BILL_CHANGED.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer, java.util.ArrayList, java.util.List, vn.tiemtruyen.dao.CollateralDAO,
                 vn.tiemtruyen.model.Collateral, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentalCollateral,
                 vn.tiemtruyen.util.Messages" %>
<%!
    /** Độ dài cột tblCollateral (docs/contracts.md §2). */
    private static final int NAME_MAX = 100;
    private static final int DESCRIPTION_MAX = 255;

    /** Ô chữ đã trim và chuẩn hoá NFC (phase-06-integration.md §6.1); thiếu tham số thì chuỗi rỗng. */
    private static String clean(String value) {
        return value == null ? "" : Normalizer.normalize(value.strip(), Normalizer.Form.NFC);
    }
%>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(405);
        return;
    }
    String base = request.getContextPath() + "/nhan-vien";
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null) {
        response.sendRedirect(base + "/SearchRentalBillView.jsp");
        return;
    }
    if (!RentalBill.STATUS_PENDING.equals(rentalBill.getStatus())) {
        request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(rentalBill.getStatus())
                ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
        request.getRequestDispatcher("/nhan-vien/SearchRentalBillView.jsp").forward(request, response);
        return;
    }
    String formId = request.getParameter("rentalBillId");
    if (formId == null || !formId.strip().equals(String.valueOf(rentalBill.getId()))) {
        request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
        request.getRequestDispatcher("/nhan-vien/ProcessRentalBillView.jsp").forward(request, response);
        return;
    }

    String name = clean(request.getParameter("txtName"));
    String description = clean(request.getParameter("txtDescription"));
    String invalid = null;
    if (name.isEmpty()) {
        invalid = Messages.COLLATERAL_NAME_REQUIRED;
    } else if (name.length() > NAME_MAX || description.length() > DESCRIPTION_MAX) {
        invalid = Messages.INPUT_TOO_LONG;
    }
    if (invalid != null) {
        request.setAttribute("message", invalid);
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
