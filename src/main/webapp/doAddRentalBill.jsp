<%--
  doAddRentalBill (ch.9 tr.66; docs/contracts.md §9.2, §6.1, C6, C10). Không giao diện, chỉ nhận POST (C2).
  - Session R: rentalBill, cart. Không có (bấm "Xác nhận" hai lần, F5 sau khi tạo) hoặc rentalBill là phiếu đã lưu →
    302 ClientHomeView, không tạo phiếu thứ hai. Phiếu chưa có dòng → 302 SearchBookView.
  - Field đọc: txtExpectedDays (chuỗi chữ số; trống, chữ, thập phân, âm, < 1 → EXPECTED_DAYS_INVALID; > 
    RentalBill.MAX_EXPECTED_DAYS, kể cả quá int → EXPECTED_DAYS_TOO_LONG, C15), txtExpectedPickupAt (yyyy-MM-ddTHH:mm,
    giờ máy chủ; trống, sai dạng, không sau hiện tại → PICKUP_TIME_INVALID), txtNote (trim, NFC; trống → NULL; quá
    255 kí tự → INPUT_TOO_LONG, §10.3). Mọi lỗi đều ← ConfirmRentalBillView, giữ các ô đã nhập, ô lỗi aria-invalid.
  - Dòng phiếu trỏ dòng giỏ không còn trong cart của session (tab khác vừa xoá) → NOT_ENOUGH_COPIES: không gửi dòng giỏ
    đã xoá xuống DB (khoá ngoại selectedBookId).
  - Gán expectedDays, expectedPickupAt, note, status "Chờ nhận", RentalBillDAO.addRentalBill (K1). false →
    NOT_ENOUGH_COPIES. true → bỏ cart, rentalBill, listRentalBill (C6), RENTAL_BILL_CREATED → ClientHomeView (forward).
  - Khoá theo session id: hai request "Xác nhận" cùng phiên chạy lần lượt, request sau thấy rentalBill đã bị bỏ.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer, java.time.LocalDateTime, java.time.format.DateTimeParseException" %>
<%@ page import="java.math.BigInteger, java.util.HashSet, java.util.Set" %>
<%@ page import="vn.tiemtruyen.dao.RentalBillDAO" %>
<%@ page import="vn.tiemtruyen.model.Cart, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.model.SelectedBook" %>
<%@ page import="vn.tiemtruyen.util.Messages" %>
<%!
    /** Độ dài cột tblRentalBill.note (docs/contracts.md §2). */
    private static final int NOTE_MAX = 255;
%>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        return;
    }
    String ctx = request.getContextPath();
    synchronized (session.getId().intern()) {
        RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
        Cart cart = (Cart) session.getAttribute("cart");
        if (rentalBill == null || cart == null || rentalBill.getId() != 0) {
            response.sendRedirect(ctx + "/ClientHomeView.jsp");
            return;
        }
        if (rentalBill.getListRentedBook().isEmpty()) {
            response.sendRedirect(ctx + "/SearchBookView.jsp");
            return;
        }

        String daysText = request.getParameter("txtExpectedDays") == null ? "" : request.getParameter("txtExpectedDays").strip();
        String daysError = null;
        if (!daysText.matches("[0-9]+") || new BigInteger(daysText).signum() == 0) {
            daysError = Messages.EXPECTED_DAYS_INVALID;
        } else if (new BigInteger(daysText).compareTo(BigInteger.valueOf(RentalBill.MAX_EXPECTED_DAYS)) > 0) {
            daysError = Messages.EXPECTED_DAYS_TOO_LONG;
        }
        if (daysError != null) {
            request.setAttribute("message", daysError);
            request.getRequestDispatcher("/ConfirmRentalBillView.jsp").forward(request, response);
            return;
        }
        int expectedDays = Integer.parseInt(daysText);

        LocalDateTime expectedPickupAt;
        try {
            String raw = request.getParameter("txtExpectedPickupAt");
            expectedPickupAt = raw == null ? null : LocalDateTime.parse(raw.strip());
        } catch (DateTimeParseException e) {
            expectedPickupAt = null;
        }
        if (expectedPickupAt == null || !expectedPickupAt.isAfter(LocalDateTime.now())) {
            request.setAttribute("message", Messages.PICKUP_TIME_INVALID);
            request.getRequestDispatcher("/ConfirmRentalBillView.jsp").forward(request, response);
            return;
        }

        String rawNote = request.getParameter("txtNote") == null ? "" : request.getParameter("txtNote");
        String note = Normalizer.normalize(rawNote, Normalizer.Form.NFC).strip();
        if (note.codePointCount(0, note.length()) > NOTE_MAX) {
            request.setAttribute("message", Messages.INPUT_TOO_LONG);
            request.getRequestDispatcher("/ConfirmRentalBillView.jsp").forward(request, response);
            return;
        }

        Set<Integer> cartLineIds = new HashSet<>();
        for (SelectedBook line : cart.getListSelectedBook()) {
            cartLineIds.add(line.getId());
        }
        for (RentedBook row : rentalBill.getListRentedBook()) {
            if (row.getSelectedBook() == null || !cartLineIds.contains(row.getSelectedBook().getId())) {
                request.setAttribute("message", Messages.NOT_ENOUGH_COPIES);
                request.getRequestDispatcher("/ConfirmRentalBillView.jsp").forward(request, response);
                return;
            }
        }

        rentalBill.setExpectedDays(expectedDays);
        rentalBill.setExpectedPickupAt(expectedPickupAt);
        rentalBill.setNote(note.isEmpty() ? null : note);
        rentalBill.setStatus(RentalBill.STATUS_PENDING);
        boolean saved;
        try (RentalBillDAO rentalBillDAO = new RentalBillDAO()) {
            saved = rentalBillDAO.addRentalBill(rentalBill);
        }
        if (!saved) {
            request.setAttribute("message", Messages.NOT_ENOUGH_COPIES);
            request.getRequestDispatcher("/ConfirmRentalBillView.jsp").forward(request, response);
            return;
        }
        session.removeAttribute("cart");
        session.removeAttribute("rentalBill");
        session.removeAttribute("listRentalBill");
        request.setAttribute("message", Messages.RENTAL_BILL_CREATED);
        request.getRequestDispatcher("/ClientHomeView.jsp").forward(request, response);
    }
%>
