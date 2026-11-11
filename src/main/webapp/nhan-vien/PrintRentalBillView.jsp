<%--
  Phiếu mượn đã xác nhận, để in (docs/contracts.md §9.1 #28, §9.2 PrintRentalBillView; ch.9 tr.83). Xem. DAO: không.
  Session R: rentalBill (doUpdateRentalBill vừa lưu, "Đang cho thuê"). Không có rentalBill → 302 SearchRentalBillView;
  phiếu chưa "Đang cho thuê" → 302 ProcessRentalBillView (phase-07-edge-cases.md §3.1). Trang không ghi DB nên F5 và
  bấm "In phiếu" hai lần đều vô hại. Bảng quyển gộp theo đầu truyện; mã vạch và tình
  trạng khi giao tách theo từng quyển. In: print.css của phase 5 (@page A5, chỉ in .tt-ticket).
  Nút "In phiếu" (btnPrint): form POST tới StaffHomeView.jsp; có JS thì loader gọi window.print() trước khi gửi
  (thuộc tính data-print, C2), không có JS thì nút gửi thẳng sang StaffHomeView.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.time.temporal.ChronoUnit" %>
<%@ page import="java.util.ArrayList" %>
<%@ page import="java.util.LinkedHashMap" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.Map" %>
<%@ page import="vn.tiemtruyen.model.Book" %>
<%@ page import="vn.tiemtruyen.model.RentalBill" %>
<%@ page import="vn.tiemtruyen.model.RentalCollateral" %>
<%@ page import="vn.tiemtruyen.model.RentedBook" %>
<%@ page import="vn.tiemtruyen.model.RentedDamage" %>
<%@ page import="vn.tiemtruyen.util.Codes" %>
<%@ page import="vn.tiemtruyen.util.Display" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%!
    /** Chữ tình trạng khi giao theo §13: tên lỗi nối ", "; ghi nhận mà không lỗi → "Không có lỗi"; chưa → null. */
    private static String conditionText(RentedBook row) {
        if (!row.getListRentedDamage().isEmpty()) {
            List<String> names = new ArrayList<>();
            for (RentedDamage damage : row.getListRentedDamage()) {
                names.add(damage.getDamage().getName());
            }
            return String.join(", ", names);
        }
        return row.getConditionNote() == null ? null : "Không có lỗi";
    }

    /** Số ngày tính tiền (C3): có cả ngày mượn và ngày hẹn trả thì là số ngày giữa hai ngày, ngược lại expectedDays. */
    private static long rentalDays(RentalBill bill) {
        if (bill.getBorrowDate() == null || bill.getDueDate() == null) {
            return bill.getExpectedDays();
        }
        return ChronoUnit.DAYS.between(bill.getBorrowDate(), bill.getDueDate());
    }
%>
<%
    String ctx = request.getContextPath();
    RentalBill bill = (RentalBill) session.getAttribute("rentalBill");
    // phase-07-edge-cases.md §3.1: thiếu phiếu → SearchRentalBillView; chỉ in phiếu đã xác nhận ("Đang cho thuê"),
    // phiếu khác → ProcessRentalBillView (trang đó tự báo D9 khi phiếu đã huỷ).
    if (bill == null) {
        response.sendRedirect(ctx + "/nhan-vien/SearchRentalBillView.jsp");
        return;
    }
    if (!RentalBill.STATUS_RENTING.equals(bill.getStatus())) {
        response.sendRedirect(ctx + "/nhan-vien/ProcessRentalBillView.jsp");
        return;
    }

    long days = rentalDays(bill);
    double subtotal = 0;
    Map<String, Map<String, Object>> groups = new LinkedHashMap<>();
    for (RentedBook row : bill.getListRentedBook()) {
        Book book = row.getBookCopy() == null ? null : row.getBookCopy().getBook();
        if (book == null) {
            throw new IllegalStateException("Dòng phiếu thiếu bookCopy.book (mã vạch "
                    + (row.getBookCopy() == null ? "?" : row.getBookCopy().getBarcode()) + ")");
        }
        String key = book.getId() + "|" + Float.floatToIntBits(row.getRentalPrice());
        Map<String, Object> group = groups.get(key);
        if (group == null) {
            group = new LinkedHashMap<>();
            group.put("name", book.getName());
            group.put("priceValue", row.getRentalPrice());
            group.put("copies", new ArrayList<Map<String, Object>>());
            groups.put(key, group);
        }
        Map<String, Object> copy = new LinkedHashMap<>();
        copy.put("barcode", row.getBookCopy().getBarcode());
        copy.put("conditionText", conditionText(row));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> copies = (List<Map<String, Object>>) group.get("copies");
        copies.add(copy);
        subtotal += (double) row.getRentalPrice() * days;
    }
    List<Map<String, Object>> bookRows = new ArrayList<>();
    for (Map<String, Object> group : groups.values()) {
        float price = (Float) group.get("priceValue");
        int quantity = ((List<?>) group.get("copies")).size();
        group.put("price", Display.money(price));
        group.put("quantity", quantity);
        group.put("total", Display.money((double) price * quantity * days));
        bookRows.add(group);
    }

    List<Map<String, Object>> collaterals = new ArrayList<>();
    int index = 1;
    for (RentalCollateral collateral : bill.getListRentalCollateral()) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("index", index++);
        item.put("collateralName", collateral.getCollateral().getName());
        item.put("value", collateral.getValue());
        item.put("note", collateral.getNote());
        collaterals.add(item);
    }

    pageContext.setAttribute("billCode", Codes.rentalBillCode(bill.getId()));
    pageContext.setAttribute("clientName", bill.getClient().getFullName());
    pageContext.setAttribute("clientPhone", bill.getClient().getPhone());
    pageContext.setAttribute("clientIdCard", bill.getClient().getIdCard());
    pageContext.setAttribute("borrowDate", Display.date(bill.getBorrowDate()));
    pageContext.setAttribute("dueDate", Display.date(bill.getDueDate()));
    pageContext.setAttribute("staffName", bill.getStaff() == null ? "" : bill.getStaff().getFullName());
    pageContext.setAttribute("note", bill.getNote());
    pageContext.setAttribute("bookRows", bookRows);
    pageContext.setAttribute("collaterals", collaterals);
    pageContext.setAttribute("totalCopies", bill.getListRentedBook().size());
    pageContext.setAttribute("discount", Display.money(bill.getDiscount()));
    pageContext.setAttribute("totalMoney", Display.money(subtotal - bill.getDiscount()));
%>
<t:layout title="Xác nhận phiếu mượn">
  <h1>Xác nhận phiếu mượn</h1>
  <ui:ticket title="PHIẾU MƯỢN" code="${billCode}">
    <div class="mb-4 grid gap-x-6 sm:grid-cols-2">
      <dl class="m-0">
        <div><dt class="inline">Mã phiếu mượn:</dt> <dd class="m-0 inline font-num">${billCode}</dd></div>
        <div><dt class="inline">Tên khách hàng:</dt> <dd class="m-0 inline"><c:out value="${clientName}"/></dd></div>
        <div><dt class="inline">Số điện thoại:</dt> <dd class="m-0 inline font-num"><c:out value="${clientPhone}"/></dd></div>
        <div><dt class="inline">Số CCCD:</dt> <dd class="m-0 inline font-num"><c:out value="${clientIdCard}"/></dd></div>
      </dl>
      <dl class="m-0">
        <div><dt class="inline">Ngày mượn:</dt> <dd class="m-0 inline font-num">${borrowDate}</dd></div>
        <div><dt class="inline">Ngày hẹn trả:</dt> <dd class="m-0 inline font-num">${dueDate}</dd></div>
        <div><dt class="inline">Nhân viên xử lí:</dt> <dd class="m-0 inline"><c:out value="${staffName}"/></dd></div>
        <div><dt class="inline">Ghi chú:</dt> <dd class="m-0 inline"><c:out value="${note}"/></dd></div>
      </dl>
    </div>

    <p class="m-0 mb-2">Các quyển truyện đã nhận:</p>
    <table id="tblRentedBook" class="tt-ledger-table">
      <caption class="tt-ledger-table__caption sr-only">Các quyển truyện đã nhận</caption>
      <thead>
        <tr>
          <th scope="col">Mã vạch</th>
          <th scope="col">Tên đầu truyện</th>
          <th scope="col">Giá thuê theo ngày</th>
          <th scope="col">Số lượng</th>
          <th scope="col">Tình trạng khi giao</th>
          <th scope="col">Tổng tiền</th>
        </tr>
      </thead>
      <tbody>
        <c:forEach var="row" items="${bookRows}">
          <tr>
            <td><ul class="m-0 list-none p-0"><c:forEach var="copy" items="${row.copies}"><li class="font-num"><c:out value="${copy.barcode}"/></li></c:forEach></ul></td>
            <td><c:out value="${row.name}"/></td>
            <td class="font-num">${row.price}</td>
            <td class="font-num">${row.quantity}</td>
            <td><ul class="m-0 list-none p-0"><c:forEach var="copy" items="${row.copies}"><li><ui:condition-tag text="${copy.conditionText}"/></li></c:forEach></ul></td>
            <td class="font-num">${row.total}</td>
          </tr>
        </c:forEach>
      </tbody>
    </table>

    <p class="m-0 mb-2 mt-4">Các khoản đặt cọc:</p>
    <table id="tblRentalCollateral" class="tt-ledger-table">
      <caption class="tt-ledger-table__caption sr-only">Các khoản đặt cọc</caption>
      <thead>
        <tr>
          <th scope="col">STT</th>
          <th scope="col">Loại tài sản</th>
          <th scope="col">Giá trị</th>
          <th scope="col">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        <c:forEach var="item" items="${collaterals}">
          <tr>
            <td class="font-num">${item.index}</td>
            <td><c:out value="${item.collateralName}"/></td>
            <td class="font-num"><c:out value="${item.value}"/></td>
            <td><c:out value="${item.note}"/></td>
          </tr>
        </c:forEach>
      </tbody>
    </table>

    <div class="mt-4">
      <p class="m-0">Tổng số quyển thuê: <span class="font-num">${totalCopies}</span></p>
      <p class="m-0">Giảm giá: <span class="font-num">${discount}</span></p>
      <p class="m-0">Tổng tiền thuê: <span class="font-num">${totalMoney}</span></p>
    </div>
  </ui:ticket>
  <form method="post" action="${pageContext.request.contextPath}/nhan-vien/StaffHomeView.jsp" class="mt-6">
    <t:csrf/>
    <button type="submit" id="btnPrint" name="btnPrint" value="" data-print
            class="inline-flex h-10 items-center justify-center rounded-paper bg-primary px-6 text-primary-foreground hover:bg-primary/90">In phiếu</button>
  </form>
</t:layout>
