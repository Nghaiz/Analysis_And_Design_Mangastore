<%--
  doAddDamage (ch.9 tr.79; docs/contracts.md §9.2). Trang xử lí, không giao diện, chỉ POST (C2).
  - Field đọc: txtName, txtDescription (trim + NFC). Biến trang: damage. Session R: rentedBook.
  - Tên lỗi trống → DAMAGE_NAME_REQUIRED; tên quá 100 hoặc mô tả quá 255 kí tự → INPUT_TOO_LONG; cả hai
    forward AddDamageView, không gọi DAO.
  - DamageDAO.addDamage false (tên trùng, kể cả khác hoa thường hay dấu: UNIQUE + collation ai_ci) → DAMAGE_EXISTS,
    forward AddDamageView; true → thêm loại lỗi vừa lưu vào "Các lỗi đã ghi nhận" của rentedBook → W rentedBook,
    forward AddConditionView.
  Đầu trang (phase-07-edge-cases.md §3.1), không ghi gì ở các nhánh này: (1) thiếu rentalBill → 302
  SearchRentalBillView, thiếu rentedBook → 302 ProcessRentalBillView; (2) rentalBill không còn "Chờ nhận" → forward
  SearchRentalBillView kèm câu D9; (3) input ẩn rentalBillId thiếu hoặc sai → forward ProcessRentalBillView kèm
  RENTAL_BILL_CHANGED.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer, java.util.ArrayList, java.util.List, vn.tiemtruyen.dao.DamageDAO,
                 vn.tiemtruyen.model.Damage, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook,
                 vn.tiemtruyen.model.RentedDamage, vn.tiemtruyen.util.Messages" %>
<%!
    /** Độ dài cột tblDamage (docs/contracts.md §2). */
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
    RentedBook rentedBook = (RentedBook) session.getAttribute("rentedBook");
    if (rentedBook == null) {
        response.sendRedirect(base + "/ProcessRentalBillView.jsp");
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
        invalid = Messages.DAMAGE_NAME_REQUIRED;
    } else if (name.length() > NAME_MAX || description.length() > DESCRIPTION_MAX) {
        invalid = Messages.INPUT_TOO_LONG;
    }
    if (invalid != null) {
        request.setAttribute("message", invalid);
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
