<%--
  doUpdateRentedBookList (ch.9 tr.77; docs/contracts.md §9.2, §6.1, §6.3). Trang xử lí, không giao diện, chỉ POST (C2).
  - Session R: rentalBill, listRentedBook. Gọi RentalBillDAO.updateRentalBill với phiếu mang danh sách quyển mới
    listRentedBook; quyển mới thêm (id = 0) đi qua khoá K1 trong hàm.
  - true → listRentedBook thành danh sách quyển của rentalBill → W rentalBill, bỏ listRentedBook,
    forward ProcessRentalBillView.
  - false → rentalBill giữ danh sách cũ; đọc lại trạng thái bằng searchRentalBill("PM" + id) → W listRentalBill (D9):
    vẫn "Chờ nhận" → NOT_ENOUGH_COPIES, forward EditRentedBookListView; "Đã huỷ" → RENTAL_BILL_CANCELLED,
    "Đang cho thuê" → RENTAL_BILL_ALREADY_PROCESSED, bỏ rentalBill, forward SearchRentalBillView.
  Edge case (phase-07-edge-cases.md §3.1, §3.3), không ghi DB ở mọi nhánh dưới:
  - thiếu rentalBill → 302 SearchRentalBillView; thiếu listRentedBook → 302 EditRentedBookListView;
  - phiếu trong session không còn "Chờ nhận" → forward SearchRentalBillView kèm câu D9 theo trạng thái;
  - input ẩn rentalBillId thiếu hoặc khác phiếu trong session → forward ProcessRentalBillView kèm RENTAL_BILL_CHANGED;
  - danh sách rỗng → NO_COPY_RECEIVED, forward EditRentedBookListView.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.List, vn.tiemtruyen.dao.RentalBillDAO, vn.tiemtruyen.model.RentalBill,
                 vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.util.Messages" %>
<%!
    /** Câu D9 cho phiếu không còn "Chờ nhận" (docs/contracts.md §6.3). */
    private static String changedStatusMessage(String status) {
        return RentalBill.STATUS_CANCELLED.equals(status)
                ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED;
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
    @SuppressWarnings("unchecked")
    List<RentedBook> listRentedBook = (List<RentedBook>) session.getAttribute("listRentedBook");
    if (listRentedBook == null) {
        response.sendRedirect(base + "/EditRentedBookListView.jsp");
        return;
    }
    if (!RentalBill.STATUS_PENDING.equals(rentalBill.getStatus())) {
        request.setAttribute("message", changedStatusMessage(rentalBill.getStatus()));
        request.getRequestDispatcher("/nhan-vien/SearchRentalBillView.jsp").forward(request, response);
        return;
    }
    String formId = request.getParameter("rentalBillId");
    if (formId == null || !formId.strip().equals(String.valueOf(rentalBill.getId()))) {
        request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
        request.getRequestDispatcher("/nhan-vien/ProcessRentalBillView.jsp").forward(request, response);
        return;
    }
    if (listRentedBook.isEmpty()) {
        request.setAttribute("message", Messages.NO_COPY_RECEIVED);
        request.getRequestDispatcher("/nhan-vien/EditRentedBookListView.jsp").forward(request, response);
        return;
    }

    List<RentedBook> previous = rentalBill.getListRentedBook();
    rentalBill.setListRentedBook(listRentedBook);
    boolean saved;
    try (RentalBillDAO dao = new RentalBillDAO()) {
        saved = dao.updateRentalBill(rentalBill);
    }
    if (saved) {
        session.setAttribute("rentalBill", rentalBill);
        session.removeAttribute("listRentedBook");
        request.getRequestDispatcher("/nhan-vien/ProcessRentalBillView.jsp").forward(request, response);
        return;
    }

    rentalBill.setListRentedBook(previous);
    List<RentalBill> found;
    try (RentalBillDAO dao = new RentalBillDAO()) {
        found = dao.searchRentalBill("PM" + rentalBill.getId());
    }
    session.setAttribute("listRentalBill", found);
    String status = null;
    for (RentalBill bill : found) {
        if (bill.getId() == rentalBill.getId()) {
            status = bill.getStatus();
        }
    }
    if (status == null) {
        throw new IllegalStateException("searchRentalBill không trả phiếu mượn id " + rentalBill.getId());
    }
    if (RentalBill.STATUS_PENDING.equals(status)) {
        session.setAttribute("rentalBill", rentalBill);
        request.setAttribute("message", Messages.NOT_ENOUGH_COPIES);
        request.getRequestDispatcher("/nhan-vien/EditRentedBookListView.jsp").forward(request, response);
        return;
    }
    request.setAttribute("message", changedStatusMessage(status));
    session.removeAttribute("rentalBill");
    request.getRequestDispatcher("/nhan-vien/SearchRentalBillView.jsp").forward(request, response);
    return;
%>
