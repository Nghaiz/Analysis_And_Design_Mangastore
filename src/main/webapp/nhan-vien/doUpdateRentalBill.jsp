<%--
  Xác nhận phiếu mượn tại quầy (docs/contracts.md §9.1 #27, §9.2 doUpdateRentalBill, §10.2, §6.3; ch.9 tr.82; ch.10).
  Xử lí, không giao diện, chỉ nhận POST (khác POST → 405, C2). DAO: RentalBillDAO.updateRentalBill (+ searchRentalBill
  khi D9). Field đọc: rentalBillId, chkReceived (mã vạch các quyển tích "Nhận"), txtNote. Session R: staff, rentalBill.
  0. Thứ tự kiểm (phase-07-edge-cases.md §3.1): không có rentalBill → 302 SearchRentalBillView; phiếu không còn
     "Chờ nhận" (Back rồi gửi lại, bấm hai lần) → forward SearchRentalBillView kèm câu D9, không ghi gì; rentalBillId
     thiếu hoặc khác → RENTAL_BILL_CHANGED, forward ProcessRentalBillView.
  1. txtNote (trim + NFC) quá 255 → INPUT_TOO_LONG, forward ProcessRentalBillView; hợp lệ thì áp vào rentalBill (W)
     trước khi kiểm, để ô ghi chú không mất khi bị trả về.
  2. Bốn điều kiện theo thứ tự §10.2, rồi giảm giá ≤ tổng tiền các quyển tích (DISCOUNT_INVALID, §3.2); sai thì câu
     tương ứng, forward về ProcessRentalBillView.jsp (request vẫn mang chkReceived nên trang giữ đúng các ô đã tích).
  3. Hợp lệ: bỏ quyển không tích (DAO xoá cả lỗi của quyển đó), gán note, staff, status "Đang cho thuê",
     updateRentalBill. true → W rentalBill (và phần tử cùng id trong listRentalBill, §7), 302 PrintRentalBillView.jsp
     (PRG: F5 chỉ tải lại trang in). false → D9 (§6.3): searchRentalBill("PM" + id) → W listRentalBill; "Đã huỷ" →
     RENTAL_BILL_CANCELLED, "Đang cho thuê" → RENTAL_BILL_ALREADY_PROCESSED (cả hai bỏ rentalBill, → SearchRentalBillView);
     vẫn "Chờ nhận" → NOT_ENOUGH_COPIES, rentalBill giữ như trước, ← ProcessRentalBillView.jsp.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer" %>
<%@ page import="java.time.temporal.ChronoUnit" %>
<%@ page import="java.util.ArrayList" %>
<%@ page import="java.util.Arrays" %>
<%@ page import="java.util.HashSet" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.Set" %>
<%@ page import="vn.tiemtruyen.dao.RentalBillDAO" %>
<%@ page import="vn.tiemtruyen.model.RentalBill" %>
<%@ page import="vn.tiemtruyen.model.RentedBook" %>
<%@ page import="vn.tiemtruyen.model.Staff" %>
<%@ page import="vn.tiemtruyen.util.Codes" %>
<%@ page import="vn.tiemtruyen.util.Messages" %>
<%!
    /** Độ dài tối đa của tblRentalBill.note (docs/contracts.md §2). */
    private static final int NOTE_MAX_LENGTH = 255;

    private static final String PROCESS_VIEW = "/nhan-vien/ProcessRentalBillView.jsp";
    private static final String SEARCH_VIEW = "/nhan-vien/SearchRentalBillView.jsp";
    private static final String PRINT_VIEW = "/nhan-vien/PrintRentalBillView.jsp";

    /** Câu của điều kiện đầu tiên bị vi phạm (§10.2), null khi đủ bốn. */
    private static String firstViolation(RentalBill bill, List<RentedBook> receivedRows) {
        if (receivedRows.isEmpty()) {
            return Messages.NO_COPY_RECEIVED;
        }
        for (RentedBook row : receivedRows) {
            if (row.getConditionNote() == null) {
                return Messages.CONDITION_MISSING;
            }
        }
        if (bill.getListRentalCollateral().isEmpty()) {
            return Messages.COLLATERAL_MISSING;
        }
        if (bill.getBorrowDate() == null || bill.getDueDate() == null
                || !bill.getDueDate().isAfter(bill.getBorrowDate())) {
            return Messages.DUE_DATE_INVALID;
        }
        return null;
    }

    /** Tổng tiền các quyển được tích "Nhận" (giá chốt × số ngày, C3), chưa trừ giảm giá. */
    private static double receivedSubtotal(RentalBill bill, List<RentedBook> receivedRows) {
        long days = bill.getBorrowDate() == null || bill.getDueDate() == null
                ? bill.getExpectedDays() : ChronoUnit.DAYS.between(bill.getBorrowDate(), bill.getDueDate());
        double sum = 0;
        for (RentedBook row : receivedRows) {
            sum += (double) row.getRentalPrice() * days;
        }
        return sum;
    }
%>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        return;
    }
    String ctx = request.getContextPath();
    Staff staff = (Staff) session.getAttribute("staff");
    if (staff == null) {
        response.sendRedirect(ctx + "/nhan-vien/LoginView.jsp");
        return;
    }
    // Thứ tự kiểm đầu trang (phase-07-edge-cases.md §3.1).
    RentalBill bill = (RentalBill) session.getAttribute("rentalBill");
    if (bill == null) {
        response.sendRedirect(ctx + SEARCH_VIEW);
        return;
    }
    if (!RentalBill.STATUS_PENDING.equals(bill.getStatus())) {
        // Back rồi gửi lại, bấm hai lần: không ghi gì, câu D9 theo trạng thái đang có.
        request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(bill.getStatus())
                ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
        request.getRequestDispatcher(SEARCH_VIEW).forward(request, response);
        return;
    }
    String formBillId = request.getParameter("rentalBillId");
    if (formBillId == null || !formBillId.strip().equals(Integer.toString(bill.getId()))) {
        request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
        request.getRequestDispatcher(PROCESS_VIEW).forward(request, response);
        return;
    }

    String note = request.getParameter("txtNote");
    if (note != null) {
        String cleaned = Normalizer.normalize(note.strip(), Normalizer.Form.NFC);
        if (cleaned.length() > NOTE_MAX_LENGTH) {
            request.setAttribute("message", Messages.INPUT_TOO_LONG);
            request.getRequestDispatcher(PROCESS_VIEW).forward(request, response);
            return;
        }
        bill.setNote(cleaned.isEmpty() ? null : cleaned);
        session.setAttribute("rentalBill", bill);
    }

    Set<String> ticked = new HashSet<>();
    String[] values = request.getParameterValues("chkReceived");
    if (values != null) {
        ticked.addAll(Arrays.asList(values));
    }
    List<RentedBook> receivedRows = new ArrayList<>();
    for (RentedBook row : bill.getListRentedBook()) {
        if (ticked.contains(row.getBookCopy().getBarcode())) {
            receivedRows.add(row);
        }
    }

    String violation = firstViolation(bill, receivedRows);
    if (violation == null && bill.getDiscount() > receivedSubtotal(bill, receivedRows)) {
        // Sau bốn điều kiện (thứ tự của chúng không đổi): bỏ tích làm tổng nhỏ hơn giảm giá đang có.
        violation = Messages.DISCOUNT_INVALID;
    }
    if (violation != null) {
        request.setAttribute("message", violation);
        request.getRequestDispatcher(PROCESS_VIEW).forward(request, response);
        return;
    }

    // Giữ bản trước khi gán để trả lại nguyên trạng khi không lưu được (session trong bộ nhớ dùng chung đối tượng).
    List<RentedBook> previousRows = bill.getListRentedBook();
    Staff previousStaff = bill.getStaff();
    bill.setListRentedBook(receivedRows);
    bill.setStaff(staff);
    bill.setStatus(RentalBill.STATUS_RENTING);
    boolean saved;
    List<RentalBill> reread = null;
    try (RentalBillDAO dao = new RentalBillDAO()) {
        saved = dao.updateRentalBill(bill);
        if (!saved) {
            reread = dao.searchRentalBill(Codes.rentalBillCode(bill.getId()));
        }
    }

    if (saved) {
        session.setAttribute("rentalBill", bill);
        session.removeAttribute("uncheckedBarcodes");
        @SuppressWarnings("unchecked")
        List<RentalBill> listRentalBill = (List<RentalBill>) session.getAttribute("listRentalBill");
        if (listRentalBill != null) {
            List<RentalBill> updated = new ArrayList<>(listRentalBill);
            updated.replaceAll(item -> item.getId() == bill.getId() ? bill : item);
            session.setAttribute("listRentalBill", updated);
        }
        // PRG: F5 trên trang in chỉ tải lại trang in, không gửi lại form.
        response.sendRedirect(ctx + PRINT_VIEW);
        return;
    }

    bill.setListRentedBook(previousRows);
    bill.setStaff(previousStaff);
    bill.setStatus(RentalBill.STATUS_PENDING);

    // D9 (§6.3): đọc lại bằng hàm danh sách đã có, chọn câu theo trạng thái mới.
    session.setAttribute("listRentalBill", reread);
    RentalBill current = null;
    for (RentalBill item : reread) {
        if (item.getId() == bill.getId()) {
            current = item;
        }
    }
    if (current == null) {
        throw new IllegalStateException("Không đọc lại được phiếu " + Codes.rentalBillCode(bill.getId()));
    }
    if (RentalBill.STATUS_CANCELLED.equals(current.getStatus())) {
        session.removeAttribute("rentalBill");
        request.setAttribute("message", Messages.RENTAL_BILL_CANCELLED);
        request.getRequestDispatcher(SEARCH_VIEW).forward(request, response);
    } else if (RentalBill.STATUS_RENTING.equals(current.getStatus())) {
        session.removeAttribute("rentalBill");
        request.setAttribute("message", Messages.RENTAL_BILL_ALREADY_PROCESSED);
        request.getRequestDispatcher(SEARCH_VIEW).forward(request, response);
    } else {
        // Vẫn "Chờ nhận": thiếu quyển (K1). Session giữ rentalBill như trước lần lưu này.
        request.setAttribute("message", Messages.NOT_ENOUGH_COPIES);
        request.getRequestDispatcher(PROCESS_VIEW).forward(request, response);
    }
%>
