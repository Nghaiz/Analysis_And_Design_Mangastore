<%--
  doUpdateRentedBookList (ch.9 tr.77; docs/contracts.md §9.2, §6.1, §6.3). Trang xử lí, không giao diện, chỉ POST (C2).
  - Session R: rentalBill, listRentedBook. Gọi RentalBillDAO.updateRentalBill với một bản sao chỉ mang danh sách
    quyển mới (listOnlyCopy: không ngày, giảm giá, ghi chú, nhân viên, khoản cọc, tình trạng), để lần lưu này chỉ ghi
    danh sách quyển (orchestrator 11/11/2026); quyển mới thêm (id = 0) đi qua khoá K1 trong hàm.
  - true → listRentedBook (nhận id và quyển thực giao K1 từ bản sao, giữ tình trạng đang sửa) thành danh sách quyển
    của rentalBill trong session (giữ ngày, giảm giá, cọc đang sửa) → W rentalBill, bỏ listRentedBook,
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
<%@ page import="java.util.ArrayList, java.util.List, vn.tiemtruyen.dao.RentalBillDAO, vn.tiemtruyen.model.RentalBill,
                 vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.util.Messages" %>
<%!
    /**
     * Bản phiếu chỉ mang danh sách quyển (quyết định của orchestrator 11/11/2026, theo docs/contracts.md §2 và §9.2
     * AddConditionView): ngày mượn, ngày hẹn trả, nhân viên NULL, giảm giá 0, không khoản cọc; mỗi dòng giữ id, quyển,
     * giá chốt, dòng giỏ, bỏ tình trạng và lỗi. Phiếu "Chờ nhận" trong DB luôn mang đúng các giá trị này (chưa đường
     * nào ghi chúng trước khi xác nhận). Ghi chú thì khác: khách đã nhập ở ConfirmRentalBillView (doAddRentalBill ghi)
     * và UPDATE_BILL ghi đè cột note, nên bản sao giữ note của phiếu trong session (cùng giá trị bàn quầy đang hiện).
     */
    private static RentalBill listOnlyCopy(RentalBill bill, List<RentedBook> rows) {
        RentalBill copy = new RentalBill();
        copy.setId(bill.getId());
        copy.setCreatedAt(bill.getCreatedAt());
        copy.setExpectedPickupAt(bill.getExpectedPickupAt());
        copy.setExpectedDays(bill.getExpectedDays());
        copy.setStatus(bill.getStatus());
        copy.setCancelReason(bill.getCancelReason());
        copy.setNote(bill.getNote());
        copy.setClient(bill.getClient());
        List<RentedBook> copyRows = new ArrayList<>();
        for (RentedBook row : rows) {
            RentedBook line = new RentedBook();
            line.setId(row.getId());
            line.setRentalPrice(row.getRentalPrice());
            line.setBookCopy(row.getBookCopy());
            line.setSelectedBook(row.getSelectedBook());
            copyRows.add(line);
        }
        copy.setListRentedBook(copyRows);
        return copy;
    }

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

    RentalBill listOnly = listOnlyCopy(rentalBill, listRentedBook);
    boolean saved;
    try (RentalBillDAO dao = new RentalBillDAO()) {
        saved = dao.updateRentalBill(listOnly);
    }
    if (saved) {
        // K1 đã gán id và quyển thực giao cho dòng mới của bản sao; chép lại sang dòng tương ứng trong session.
        for (int i = 0; i < listRentedBook.size(); i++) {
            RentedBook written = listOnly.getListRentedBook().get(i);
            listRentedBook.get(i).setId(written.getId());
            listRentedBook.get(i).setBookCopy(written.getBookCopy());
        }
        rentalBill.setListRentedBook(listRentedBook);
        session.setAttribute("rentalBill", rentalBill);
        session.removeAttribute("listRentedBook");
        request.getRequestDispatcher("/nhan-vien/ProcessRentalBillView.jsp").forward(request, response);
        return;
    }

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
