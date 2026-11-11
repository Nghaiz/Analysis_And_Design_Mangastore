<%--
  doUpdateRentedBookList (ch.9 tr.77; docs/contracts.md §9.2, §6.1, §6.3). Trang xử lí, không giao diện, chỉ POST (C2).
  - Session R: rentalBill, listRentedBook. Gọi RentalBillDAO.updateRentalBill với phiếu mang danh sách quyển mới
    listRentedBook; quyển mới thêm (id = 0) đi qua khoá K1 trong hàm.
  - true → listRentedBook thành danh sách quyển của rentalBill → W rentalBill, bỏ listRentedBook,
    forward ProcessRentalBillView.
  - false → rentalBill giữ danh sách cũ; đọc lại trạng thái bằng searchRentalBill("PM" + id) → W listRentalBill (D9):
    vẫn "Chờ nhận" → NOT_ENOUGH_COPIES, forward EditRentedBookListView; "Đã huỷ" → RENTAL_BILL_CANCELLED,
    "Đang cho thuê" → RENTAL_BILL_ALREADY_PROCESSED, bỏ rentalBill, forward SearchRentalBillView.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.List, vn.tiemtruyen.dao.RentalBillDAO, vn.tiemtruyen.model.RentalBill,
                 vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.util.Messages" %>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(405);
        return;
    }
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    @SuppressWarnings("unchecked")
    List<RentedBook> listRentedBook = (List<RentedBook>) session.getAttribute("listRentedBook");
    if (rentalBill == null || listRentedBook == null) {
        response.sendRedirect(request.getContextPath() + "/nhan-vien/SearchRentalBillView.jsp");
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
    request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(status)
            ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
    session.removeAttribute("rentalBill");
    request.getRequestDispatcher("/nhan-vien/SearchRentalBillView.jsp").forward(request, response);
    return;
%>
