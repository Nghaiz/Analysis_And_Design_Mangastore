<%--
  doCancelRentalBill (ch.9 tr.67, tr.83–84; docs/contracts.md §9.2, §6.3, §7; Deferred #11, #13; C8). Không giao
  diện, chỉ nhận POST (C2). Một file ở gốc web cho cả khách và nhân viên.
  - C8: input ẩn from = "client" | "staff", phải khớp vai đang có trong session (client id > 0, hoặc staff); không
    khớp → 403. Khách chỉ huỷ được phiếu của chính mình (rentalBill.client.id = client.id), khác → 403.
  - Field đọc: txtCancelReason (trim, NFC). Trống → CANCEL_REASON_REQUIRED (C17), quá 255 kí tự → INPUT_TOO_LONG
    (§10.3): không ghi, khách ← RentalBillListView (mở lại hộp huỷ, ô aria-invalid, giữ chữ), nhân viên ←
    /nhan-vien/ProcessRentalBillView. Session R: rentalBill (phiếu đã
    lưu, id > 0); không có → 302 về trang danh sách của vai.
  - Gán cancelReason, status "Đã huỷ", RentalBillDAO.updateRentalBill. true → W rentalBill, thay phần tử cùng id trong
    listRentalBill (§7), CANCEL_SUCCESS; khách ← RentalBillListView, nhân viên ← /nhan-vien/SearchRentalBillView.
  - false → D9 (§6.3): rentalBill trong session không đổi, đọc lại bằng hàm danh sách (khách getRentalBillList, nhân viên
    searchRentalBill("PM" + id)) → W listRentalBill; "Đã huỷ" → RENTAL_BILL_CANCELLED, "Đang cho thuê" →
    RENTAL_BILL_ALREADY_PROCESSED (cả hai bỏ rentalBill, về trang danh sách của vai); vẫn "Chờ nhận" →
    NOT_ENOUGH_COPIES (khách về RentalBillListView, nhân viên về /nhan-vien/ProcessRentalBillView).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer, java.util.ArrayList, java.util.List" %>
<%@ page import="vn.tiemtruyen.dao.RentalBillDAO" %>
<%@ page import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.Staff" %>
<%@ page import="vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Messages" %>
<%!
    /** Độ dài cột tblRentalBill.cancelReason (docs/contracts.md §2). */
    private static final int REASON_MAX = 255;
%>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        return;
    }
    String from = request.getParameter("from");
    Client client = (Client) session.getAttribute("client");
    Staff staff = (Staff) session.getAttribute("staff");
    boolean asClient = "client".equals(from) && client != null && client.getId() > 0;
    boolean asStaff = "staff".equals(from) && staff != null;
    if (!asClient && !asStaff) {
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
        return;
    }
    String listPage = asClient ? "/RentalBillListView.jsp" : "/nhan-vien/SearchRentalBillView.jsp";
    String billPage = asClient ? "/RentalBillListView.jsp" : "/nhan-vien/ProcessRentalBillView.jsp";

    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null || rentalBill.getId() <= 0) {
        response.sendRedirect(request.getContextPath() + listPage);
        return;
    }
    if (asClient && rentalBill.getClient().getId() != client.getId()) {
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
        return;
    }

    String rawReason = request.getParameter("txtCancelReason") == null ? "" : request.getParameter("txtCancelReason");
    String reason = Normalizer.normalize(rawReason, Normalizer.Form.NFC).strip();
    if (reason.isEmpty() || reason.codePointCount(0, reason.length()) > REASON_MAX) {
        request.setAttribute("message", reason.isEmpty() ? Messages.CANCEL_REASON_REQUIRED : Messages.INPUT_TOO_LONG);
        request.getRequestDispatcher(billPage).forward(request, response);
        return;
    }
    rentalBill.setCancelReason(reason);
    rentalBill.setStatus(RentalBill.STATUS_CANCELLED);
    // Session ở Redis (readMode=REDIS): đối tượng vừa gán chỉ sống trong request này, chưa setAttribute thì session
    // vẫn giữ phiếu như cũ khi DAO trả false hay ném lỗi.
    try (RentalBillDAO rentalBillDAO = new RentalBillDAO()) {
        if (!rentalBillDAO.updateRentalBill(rentalBill)) {
            List<RentalBill> fresh = asClient
                    ? rentalBillDAO.getRentalBillList(client)
                    : rentalBillDAO.searchRentalBill(Codes.rentalBillCode(rentalBill.getId()));
            session.setAttribute("listRentalBill", fresh);
            String currentStatus = null;
            for (RentalBill bill : fresh) {
                if (bill.getId() == rentalBill.getId()) {
                    currentStatus = bill.getStatus();
                }
            }
            if (currentStatus == null) {
                throw new IllegalStateException("Đọc lại không thấy phiếu " + Codes.rentalBillCode(rentalBill.getId()));
            }
            if (RentalBill.STATUS_PENDING.equals(currentStatus)) {
                request.setAttribute("message", Messages.NOT_ENOUGH_COPIES);
                request.getRequestDispatcher(billPage).forward(request, response);
                return;
            }
            session.removeAttribute("rentalBill");
            request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(currentStatus)
                    ? Messages.RENTAL_BILL_CANCELLED
                    : Messages.RENTAL_BILL_ALREADY_PROCESSED);
            request.getRequestDispatcher(listPage).forward(request, response);
            return;
        }
    }

    session.setAttribute("rentalBill", rentalBill);
    @SuppressWarnings("unchecked")
    List<RentalBill> listRentalBill = (List<RentalBill>) session.getAttribute("listRentalBill");
    if (listRentalBill != null) {
        List<RentalBill> updated = new ArrayList<>(listRentalBill);
        for (int i = 0; i < updated.size(); i++) {
            if (updated.get(i).getId() == rentalBill.getId()) {
                updated.set(i, rentalBill);
            }
        }
        session.setAttribute("listRentalBill", updated);
    }
    request.setAttribute("message", Messages.CANCEL_SUCCESS);
    request.getRequestDispatcher(listPage).forward(request, response);
%>
