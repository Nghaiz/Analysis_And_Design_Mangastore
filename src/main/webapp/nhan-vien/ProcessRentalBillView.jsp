<%--
  Xử lí phiếu mượn tại quầy (docs/contracts.md §9.1 #17, §9.2 ProcessRentalBillView, §11.2; ch.9 tr.73–75).
  Xem, tự gửi. DAO: không. Session R: staff, rentalBill; W: rentalBill (tự gửi), rentedBook (bản sao, "Thêm tình trạng").
  Mỗi lần hiển thị bỏ listRentedBook, listRentalCollateral, rentedBook (C6).

  Đầu trang, theo thứ tự (phase-07-edge-cases.md §3.1): không có rentalBill → 302 SearchRentalBillView; phiếu không còn
  "Chờ nhận" → forward SearchRentalBillView kèm câu D9 (cả khi GET); POST mà rentalBillId thiếu hoặc khác id phiếu
  trong session → RENTAL_BILL_CHANGED, không ghi gì.
  Tự gửi (POST + dispatcher REQUEST), áp field trước rồi mới xét nút (§3.2):
  - txtDueDate (yyyy-MM-dd): trống, sai dạng, ngày không có, không sau ngày mượn → DUE_DATE_INVALID, giữ ngày cũ.
  - txtDiscount: trống = 0; bỏ dấu chấm, khoảng trắng, hậu tố "đ"; không phải số nguyên đồng không âm hay lớn hơn tổng
    tiền các quyển đang tích → DISCOUNT_INVALID, aria-invalid, giữ giảm giá cũ.
  - txtNote (trim + NFC): quá 255 → INPUT_TOO_LONG, aria-invalid, giữ chữ đã nhập trong ô, không lưu.
  - lnkDeleteRentalCollateral (value = STT): bỏ khoản cọc; STT lạ thì bỏ qua. Không kèm nút có tên (island
    requestSubmit(), nút "Tính lại" trong noscript, nút mặc định ẩn): chỉ áp field.
  - lnkAddCondition (value = mã vạch): khi không có lỗi nhập, W rentedBook = quyển đó, 302 tới AddConditionView.jsp (PRG).
  - btnCancel: hiện hộp huỷ (CANCEL_CONFIRM, txtCancelReason, from=staff, btnConfirmCancel → /doCancelRentalBill.jsp, C8);
    btnCloseCancel: đóng hộp. doCancelRentalBill forward về kèm câu (CANCEL_REASON_REQUIRED, INPUT_TOO_LONG; C17) thì
    mở lại hộp với chữ đã nhập, ô lí do aria-invalid.
  Ô "Nhận" (chkReceived, value = mã vạch) không có trong model: các mã đã bỏ tích nằm ở thuộc tính session kĩ thuật
  uncheckedBarcodes (ArrayList<String>, không thuộc 12 thuộc tính §7; chủ dự án quyết 11/11/2026). Request mang field
  bàn quầy của chính phiếu này (tự gửi, hay doUpdateRentalBill/doCancelRentalBill forward về) thì ghi lại nó từ
  chkReceived (mã vạch lạ bị bỏ); ngược lại (GET, quay về từ AddCondition, Edit, AddRentalCollateral) tích theo nó.
  SearchRentalBillView bỏ nó khi mở phiếu (mọi quyển tích sẵn, ch.2 bước 10); doUpdateRentalBill bỏ khi lưu xong.
  Tổng một dòng = giá chốt × số quyển đang tích của dòng × số ngày (C3); tổng tiền thuê = tổng các dòng − giảm giá.
  Island ProcessBillDesk (§11.2): bản HTML nằm trong data-island-fallback (input có name ở ngoài div data-island),
  chỗ edit-list, add-collateral, note theo plans/reports/phase-07-islands-m3-261111-1057.md §4.
  form có action tường minh: doXxx forward về đây nên URL trình duyệt có thể là trang doXxx.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer" %>
<%@ page import="java.time.LocalDate" %>
<%@ page import="java.time.format.DateTimeParseException" %>
<%@ page import="java.time.temporal.ChronoUnit" %>
<%@ page import="java.util.ArrayList" %>
<%@ page import="java.util.Arrays" %>
<%@ page import="java.util.HashSet" %>
<%@ page import="java.util.LinkedHashMap" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.Map" %>
<%@ page import="java.util.Set" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.model.Book" %>
<%@ page import="vn.tiemtruyen.model.RentalBill" %>
<%@ page import="vn.tiemtruyen.model.RentalCollateral" %>
<%@ page import="vn.tiemtruyen.model.RentedBook" %>
<%@ page import="vn.tiemtruyen.model.RentedDamage" %>
<%@ page import="vn.tiemtruyen.model.Staff" %>
<%@ page import="vn.tiemtruyen.util.Codes" %>
<%@ page import="vn.tiemtruyen.util.Display" %>
<%@ page import="vn.tiemtruyen.util.JsonUtil" %>
<%@ page import="vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%!
    /** Độ dài tối đa của tblRentalBill.note (docs/contracts.md §2). */
    private static final int NOTE_MAX_LENGTH = 255;

    /** Thuộc tính session kĩ thuật: mã vạch đã bỏ tích "Nhận" của phiếu đang mở (quyết định chủ dự án 11/11/2026). */
    private static final String UNCHECKED_ATTRIBUTE = "uncheckedBarcodes";

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

    /** Chuỗi người dùng nhập: bỏ khoảng trắng hai đầu, chuẩn hoá Unicode NFC (phase-06-integration.md §6.1). */
    private static String clean(String text) {
        return Normalizer.normalize(text.strip(), Normalizer.Form.NFC);
    }

    /** Ngày ISO yyyy-MM-dd của ô type="date"; trống, sai dạng, ngày không có thật (2026-02-30) → null. */
    private static LocalDate parseDate(String text) {
        try {
            return LocalDate.parse(text.strip());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Ô giảm giá (phase-07-edge-cases.md §3.2): trống = 0; bỏ dấu chấm, khoảng trắng và hậu tố "đ"; số nguyên đồng
     *  không âm, ngược lại -1. */
    private static long parseMoney(String text) {
        String digits = clean(text).replaceAll("[.\\s]", "").replaceFirst("(?i)đ$", "");
        if (digits.isEmpty()) {
            return 0;
        }
        if (!digits.matches("\\d{1,12}")) {
            return -1;
        }
        return Long.parseLong(digits);
    }

    /** STT gửi từ nút trên dòng; không phải số nguyên dương thì 0 (không trỏ dòng nào, trang chỉ hiện lại). */
    private static int positiveIntOrZero(String text) {
        try {
            int value = Integer.parseInt(text.strip());
            return Math.max(value, 0);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static Book bookOf(RentedBook row) {
        Book book = row.getBookCopy() == null ? null : row.getBookCopy().getBook();
        if (book == null) {
            throw new IllegalStateException("Dòng phiếu thiếu bookCopy.book (mã vạch "
                    + (row.getBookCopy() == null ? "?" : row.getBookCopy().getBarcode()) + ")");
        }
        return book;
    }

    /** Tổng tiền các quyển được tích "Nhận", chưa trừ giảm giá. */
    private static double receivedSubtotal(RentalBill bill, Set<String> received, long days) {
        double sum = 0;
        for (RentedBook row : bill.getListRentedBook()) {
            if (received.contains(row.getBookCopy().getBarcode())) {
                sum += (double) row.getRentalPrice() * days;
            }
        }
        return sum;
    }
%>
<%
    String ctx = request.getContextPath();
    Staff staff = (Staff) session.getAttribute("staff");
    if (staff == null) {
        response.sendRedirect(ctx + "/nhan-vien/LoginView.jsp");
        return;
    }
    // Thứ tự kiểm đầu trang (phase-07-edge-cases.md §3.1): (1) thiếu thuộc tính → trang đầu mối;
    // (2) phiếu không còn "Chờ nhận" → câu D9 ở SearchRentalBillView (cả khi GET); (3) POST lệch rentalBillId.
    RentalBill bill = (RentalBill) session.getAttribute("rentalBill");
    if (bill == null) {
        response.sendRedirect(ctx + "/nhan-vien/SearchRentalBillView.jsp");
        return;
    }
    if (!RentalBill.STATUS_PENDING.equals(bill.getStatus())) {
        request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(bill.getStatus())
                ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
        request.getRequestDispatcher("/nhan-vien/SearchRentalBillView.jsp").forward(request, response);
        return;
    }
    String formBillId = request.getParameter("rentalBillId");
    boolean sameBill = formBillId != null && formBillId.strip().equals(Integer.toString(bill.getId()));
    boolean ownPost = "POST".equals(request.getMethod()) && request.getDispatcherType() == DispatcherType.REQUEST;
    if (ownPost && !sameBill) {
        // Form của thẻ khác (hay thiếu input ẩn): không ghi gì, hiện phiếu đang có trong session.
        request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
        ownPost = false;
    }
    // Request mang field bàn quầy của chính phiếu này (tự gửi, hoặc doUpdateRentalBill forward về) thì ô "Nhận" lấy
    // theo chkReceived đã gửi; ngược lại (mở mới, quay về từ trang khác) tích sẵn mọi quyển.
    boolean fromThisForm = sameBill && (request.getParameter("txtBorrowDate") != null
            || request.getParameter("txtDueDate") != null
            || request.getParameter("txtDiscount") != null);
    Set<String> barcodes = new HashSet<>();
    for (RentedBook row : bill.getListRentedBook()) {
        barcodes.add(row.getBookCopy().getBarcode());
    }
    // Ô "Nhận": thuộc tính session kĩ thuật uncheckedBarcodes (mã vạch đã bỏ tích của phiếu đang mở, không thuộc 12
    // thuộc tính nghiệp vụ §7). Request mang field bàn quầy thì cập nhật từ chkReceived; ngược lại render theo nó.
    Set<String> received = new HashSet<>(barcodes);
    @SuppressWarnings("unchecked")
    List<String> storedUnchecked = (List<String>) session.getAttribute(UNCHECKED_ATTRIBUTE);
    ArrayList<String> unchecked = new ArrayList<>();
    if (fromThisForm) {
        String[] ticked = request.getParameterValues("chkReceived");
        received.clear();
        if (ticked != null) {
            received.addAll(Arrays.asList(ticked));
            received.retainAll(barcodes);
        }
        for (RentedBook row : bill.getListRentedBook()) {
            String barcode = row.getBookCopy().getBarcode();
            if (!received.contains(barcode)) {
                unchecked.add(barcode);
            }
        }
    } else if (storedUnchecked != null) {
        for (String barcode : storedUnchecked) {
            if (barcodes.contains(barcode)) {
                unchecked.add(barcode);
            }
        }
        received.removeAll(unchecked);
    }
    if (unchecked.isEmpty()) {
        session.removeAttribute(UNCHECKED_ATTRIBUTE);
    } else if (!unchecked.equals(storedUnchecked)) {
        session.setAttribute(UNCHECKED_ATTRIBUTE, unchecked);
    }

    boolean dueInvalid = false;
    boolean discountInvalid = false;
    boolean showCancel = false;
    String errorMessage = null;
    if (ownPost) {
        String due = request.getParameter("txtDueDate");
        if (due != null) {
            LocalDate dueDate = parseDate(due);
            if (dueDate == null || (bill.getBorrowDate() != null && !dueDate.isAfter(bill.getBorrowDate()))) {
                dueInvalid = true;
                errorMessage = Messages.DUE_DATE_INVALID;
            } else {
                bill.setDueDate(dueDate);
            }
        }
        String deleteIndex = request.getParameter("lnkDeleteRentalCollateral");
        if (deleteIndex != null) {
            int index = positiveIntOrZero(deleteIndex);
            if (index >= 1 && index <= bill.getListRentalCollateral().size()) {
                List<RentalCollateral> rest = new ArrayList<>(bill.getListRentalCollateral());
                rest.remove(index - 1);
                bill.setListRentalCollateral(rest);
            }
        }
        String discountText = request.getParameter("txtDiscount");
        if (discountText != null) {
            long discount = parseMoney(discountText);
            if (discount < 0 || discount > receivedSubtotal(bill, received, rentalDays(bill))) {
                discountInvalid = true;
                errorMessage = errorMessage == null ? Messages.DISCOUNT_INVALID : errorMessage;
            } else {
                bill.setDiscount(discount);
            }
        }
        String note = request.getParameter("txtNote");
        if (note != null) {
            String cleaned = clean(note);
            if (cleaned.length() > NOTE_MAX_LENGTH) {
                errorMessage = errorMessage == null ? Messages.INPUT_TOO_LONG : errorMessage;
            } else {
                bill.setNote(cleaned.isEmpty() ? null : cleaned);
            }
        }
        session.setAttribute("rentalBill", bill);
        if (errorMessage != null) {
            request.setAttribute("message", errorMessage);
        }

        String conditionBarcode = request.getParameter("lnkAddCondition");
        if (conditionBarcode != null && errorMessage == null) {
            for (RentedBook row : bill.getListRentedBook()) {
                if (row.getBookCopy().getBarcode().equals(conditionBarcode.strip())) {
                    session.setAttribute("rentedBook", row);
                    response.sendRedirect(ctx + "/nhan-vien/AddConditionView.jsp");
                    return;
                }
            }
        }
        showCancel = request.getParameter("btnCancel") != null;
    } else if (request.getDispatcherType() == DispatcherType.FORWARD && request.getParameter("btnConfirmCancel") != null
            && request.getAttribute("message") != null) {
        // doCancelRentalBill trả về đây kèm câu báo (vd lí do huỷ quá dài): mở lại hộp huỷ với chữ đã nhập.
        showCancel = true;
    }
    String noteParam = request.getParameter("txtNote");
    boolean noteInvalid = fromThisForm && noteParam != null && clean(noteParam).length() > NOTE_MAX_LENGTH;
    String reasonParam = showCancel && request.getParameter("txtCancelReason") != null
            ? clean(request.getParameter("txtCancelReason")) : "";
    boolean reasonInvalid = reasonParam.length() > NOTE_MAX_LENGTH
            || Messages.CANCEL_REASON_REQUIRED.equals(request.getAttribute("message"));

    // C6: trang đầu mối dọn thuộc tính tạm của các luồng con mỗi lần hiển thị.
    session.removeAttribute("listRentedBook");
    session.removeAttribute("listRentalCollateral");
    session.removeAttribute("rentedBook");

    long days = rentalDays(bill);
    double subtotal = receivedSubtotal(bill, received, days);

    // Props của island (§11.2, đúng tên field) và dữ liệu hiển thị của bản HTML.
    Map<String, Map<String, Object>> groups = new LinkedHashMap<>();
    Map<String, Integer> groupSize = new LinkedHashMap<>();
    for (RentedBook row : bill.getListRentedBook()) {
        Book book = bookOf(row);
        String key = book.getId() + "|" + Float.floatToIntBits(row.getRentalPrice());
        Map<String, Object> group = groups.get(key);
        if (group == null) {
            group = new LinkedHashMap<>();
            group.put("bookId", book.getId());
            group.put("name", book.getName());
            group.put("rentalPrice", row.getRentalPrice());
            group.put("copies", new ArrayList<Map<String, Object>>());
            groups.put(key, group);
            groupSize.put(key, 0);
        }
        Map<String, Object> copy = new LinkedHashMap<>();
        String barcode = row.getBookCopy().getBarcode();
        copy.put("barcode", barcode);
        copy.put("received", received.contains(barcode));
        copy.put("conditionText", conditionText(row));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> copies = (List<Map<String, Object>>) group.get("copies");
        copies.add(copy);
        groupSize.merge(key, 1, Integer::sum);
    }
    List<Map<String, Object>> propRows = new ArrayList<>(groups.values());
    List<Map<String, Object>> viewRows = new ArrayList<>();
    for (Map.Entry<String, Map<String, Object>> entry : groups.entrySet()) {
        Map<String, Object> group = entry.getValue();
        int quantity = groupSize.get(entry.getKey());
        int receivedCount = 0;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groupCopies = (List<Map<String, Object>>) group.get("copies");
        for (Map<String, Object> copy : groupCopies) {
            if (Boolean.TRUE.equals(copy.get("received"))) {
                receivedCount++;
            }
        }
        float price = (Float) group.get("rentalPrice");
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("data", group);
        view.put("price", Display.money(price));
        view.put("quantity", quantity);
        // Tổng một dòng chỉ tính quyển đang tích "Nhận" (khớp tổng tạm của island, báo cáo 7C §5).
        view.put("total", Display.money((double) price * receivedCount * days));
        viewRows.add(view);
    }

    List<Map<String, Object>> propCollaterals = new ArrayList<>();
    int index = 1;
    for (RentalCollateral collateral : bill.getListRentalCollateral()) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("index", index++);
        item.put("collateralName", collateral.getCollateral().getName());
        item.put("value", collateral.getValue());
        item.put("note", collateral.getNote());
        propCollaterals.add(item);
    }

    String billCode = Codes.rentalBillCode(bill.getId());
    Map<String, Object> props = new LinkedHashMap<>();
    props.put("rentalBillCode", billCode);
    props.put("rows", propRows);
    props.put("borrowDate", bill.getBorrowDate() == null ? null : bill.getBorrowDate().toString());
    props.put("dueDate", bill.getDueDate() == null ? null : bill.getDueDate().toString());
    props.put("expectedDays", bill.getExpectedDays());
    props.put("discount", bill.getDiscount());
    props.put("note", bill.getNote());
    props.put("collaterals", propCollaterals);

    pageContext.setAttribute("propsJson", JsonUtil.toScriptJson(props));
    pageContext.setAttribute("billCode", billCode);
    pageContext.setAttribute("clientName", bill.getClient().getFullName());
    pageContext.setAttribute("clientIdCard", bill.getClient().getIdCard());
    pageContext.setAttribute("clientPhone", bill.getClient().getPhone());
    pageContext.setAttribute("bookRows", viewRows);
    pageContext.setAttribute("collaterals", propCollaterals);
    pageContext.setAttribute("borrowDateValue", bill.getBorrowDate() == null ? "" : bill.getBorrowDate().toString());
    pageContext.setAttribute("dueDateValue", bill.getDueDate() == null ? "" : bill.getDueDate().toString());
    pageContext.setAttribute("discountValue", Long.toString(Math.round(bill.getDiscount())));
    pageContext.setAttribute("noteValue", noteInvalid ? clean(noteParam) : (bill.getNote() == null ? "" : bill.getNote()));
    pageContext.setAttribute("reasonValue", reasonParam);
    pageContext.setAttribute("reasonInvalid", reasonInvalid);
    pageContext.setAttribute("billId", bill.getId());
    pageContext.setAttribute("dueInvalid", dueInvalid);
    pageContext.setAttribute("discountInvalid", discountInvalid);
    pageContext.setAttribute("noteInvalid", noteInvalid);
    pageContext.setAttribute("totalCopies", received.size());
    pageContext.setAttribute("totalMoney", Display.money(subtotal - bill.getDiscount()));
    pageContext.setAttribute("showCancel", showCancel);
    pageContext.setAttribute("cancelConfirm", Messages.CANCEL_CONFIRM);
%>
<t:layout title="Xử lí phiếu mượn">
  <h1>Xử lí phiếu mượn</h1>
  <c:if test="${not empty message}">
    <ui:message-box kind="error" text="${message}"/>
  </c:if>
  <form method="post" action="${pageContext.request.contextPath}/nhan-vien/ProcessRentalBillView.jsp">
    <t:csrf/>
    <%-- Chống hai thẻ (phase-07-edge-cases.md §3.1): trang và doUpdateRentalBill so với id của rentalBill trong session. --%>
    <input type="hidden" id="rentalBillId" name="rentalBillId" value="${billId}">
    <%-- Nút mặc định (không tên) đứng đầu form: Enter trong một ô chỉ gửi về trang để tính lại, không bấm nhầm
         nút trên dòng ("Thêm tình trạng"). --%>
    <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true">Tính lại</button>
    <ui:ticket title="PHIẾU MƯỢN" code="${billCode}">
      <dl class="m-0 mb-4 grid gap-x-6 sm:grid-cols-3">
        <div><dt class="inline">Họ và tên:</dt> <dd class="m-0 inline"><c:out value="${clientName}"/></dd></div>
        <div><dt class="inline">Số CCCD:</dt> <dd class="m-0 inline font-num"><c:out value="${clientIdCard}"/></dd></div>
        <div><dt class="inline">Số điện thoại:</dt> <dd class="m-0 inline font-num"><c:out value="${clientPhone}"/></dd></div>
      </dl>
    </ui:ticket>

    <%-- Bàn quầy: bản HTML chạy không cần JS (data-island-fallback, island ẩn khi gắn; input vẫn nằm trong form và
         vẫn được gửi). Quy ước gắn: plans/reports/phase-07-islands-m3-261111-1057.md §4. --%>
    <div data-island-fallback="ProcessBillDesk" class="mt-6">
        <p class="m-0 mb-2">Danh sách các quyển truyện khách hàng muốn thuê:</p>
        <div class="overflow-x-auto">
          <table id="tblRentedBook" class="tt-ledger-table">
            <caption class="tt-ledger-table__caption sr-only">Danh sách các quyển truyện khách hàng muốn thuê</caption>
            <thead>
              <tr>
                <th scope="col">Mã vạch</th>
                <th scope="col">Tên đầu truyện</th>
                <th scope="col">Giá thuê theo ngày</th>
                <th scope="col">Số lượng</th>
                <th scope="col">Tình trạng khi giao</th>
                <th scope="col">Tổng tiền</th>
                <th scope="col">Nhận</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="row" items="${bookRows}">
                <tr>
                  <td><ul class="m-0 list-none p-0"><c:forEach var="copy" items="${row.data.copies}"><li class="font-num"><c:out value="${copy.barcode}"/></li></c:forEach></ul></td>
                  <td><c:out value="${row.data.name}"/></td>
                  <td class="font-num">${row.price}</td>
                  <td class="font-num">${row.quantity}</td>
                  <td><ul class="m-0 list-none p-0"><c:forEach var="copy" items="${row.data.copies}"><li><ui:condition-tag text="${copy.conditionText}"/></li></c:forEach></ul></td>
                  <td class="font-num">${row.total}</td>
                  <td>
                    <ul class="m-0 list-none p-0">
                      <c:forEach var="copy" items="${row.data.copies}">
                        <li><input type="checkbox" name="chkReceived" value="<c:out value='${copy.barcode}'/>"${copy.received ? ' checked' : ''}
                                   data-submit-on-change aria-label="Nhận <c:out value='${copy.barcode}'/>" class="size-4 accent-pen-blue"></li>
                      </c:forEach>
                    </ul>
                  </td>
                  <td>
                    <ul class="m-0 list-none p-0">
                      <c:forEach var="copy" items="${row.data.copies}">
                        <li><button type="submit" name="lnkAddCondition" value="<c:out value='${copy.barcode}'/>"
                                    aria-label="Thêm tình trạng <c:out value='${copy.barcode}'/>"
                                    class="cursor-pointer border-0 bg-transparent p-0 text-pen-blue underline underline-offset-[3px]">Thêm tình trạng</button></li>
                      </c:forEach>
                    </ul>
                  </td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <p class="mt-3" data-island-slot="ProcessBillDesk:edit-list">
          <a id="lnkEditRentedBookList" href="${pageContext.request.contextPath}/nhan-vien/EditRentedBookListView.jsp">Chỉnh sửa danh sách truyện</a>
        </p>

        <div class="my-4 grid gap-4 sm:grid-cols-2">
          <label for="txtBorrowDate" class="grid gap-1">
            <span>Ngày mượn:</span>
            <input type="date" id="txtBorrowDate" name="txtBorrowDate" value="${borrowDateValue}" readonly
                   class="h-10 rounded-paper border border-input bg-paper-deep px-3 font-num">
          </label>
          <label for="txtDueDate" class="grid gap-1">
            <span>Ngày hẹn trả:</span>
            <input type="date" id="txtDueDate" name="txtDueDate" value="${dueDateValue}"
                   data-submit-on-change${dueInvalid ? ' aria-invalid="true"' : ''}
                   class="h-10 rounded-paper border border-input bg-paper px-3 font-num aria-invalid:border-destructive">
          </label>
        </div>

        <p class="m-0 mb-2">Các khoản đặt cọc:</p>
        <div class="overflow-x-auto">
          <table id="tblRentalCollateral" class="tt-ledger-table">
            <caption class="tt-ledger-table__caption sr-only">Các khoản đặt cọc</caption>
            <thead>
              <tr>
                <th scope="col">STT</th>
                <th scope="col">Loại tài sản</th>
                <th scope="col">Giá trị</th>
                <th scope="col">Ghi chú</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="item" items="${collaterals}">
                <tr>
                  <td class="font-num">${item.index}</td>
                  <td><c:out value="${item.collateralName}"/></td>
                  <td class="font-num"><c:out value="${item.value}"/></td>
                  <td><c:out value="${item.note}"/></td>
                  <td><button type="submit" name="lnkDeleteRentalCollateral" value="${item.index}"
                              aria-label="Xoá khoản cọc ${item.index}"
                              class="cursor-pointer border-0 bg-transparent p-0 text-pen-blue underline underline-offset-[3px]">Xoá</button></td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <p class="mt-3" data-island-slot="ProcessBillDesk:add-collateral">
          <a id="lnkAddRentalCollateral" href="${pageContext.request.contextPath}/nhan-vien/AddRentalCollateralView.jsp">Thêm khoản cọc</a>
        </p>

        <div class="my-4 grid gap-4 sm:grid-cols-2">
          <label for="txtDiscount" class="grid gap-1">
            <span>Giảm giá:</span>
            <input type="text" id="txtDiscount" name="txtDiscount" value="${discountValue}" inputmode="numeric" maxlength="20"
                   data-submit-on-change${discountInvalid ? ' aria-invalid="true"' : ''}
                   class="h-10 rounded-paper border border-input bg-paper px-3 font-num aria-invalid:border-destructive">
          </label>
          <label for="txtNote" class="grid gap-1" data-island-slot="ProcessBillDesk:note">
            <span>Ghi chú:</span>
            <input type="text" id="txtNote" name="txtNote" value="<c:out value='${noteValue}'/>" maxlength="255"${noteInvalid ? ' aria-invalid="true"' : ''}
                   class="h-10 rounded-paper border border-input bg-paper px-3 aria-invalid:border-destructive">
          </label>
        </div>

        <p class="m-0">Tổng số quyển thuê: <span class="font-num">${totalCopies}</span></p>
        <p class="m-0">Tổng tiền thuê: <span class="font-num">${totalMoney}</span></p>
        <noscript>
          <p class="mt-2"><button type="submit"
                  class="inline-flex h-9 items-center justify-center rounded-paper border border-ink-soft bg-paper px-4 shadow-paper hover:bg-accent">Tính lại</button></p>
        </noscript>

    <div class="mt-6 flex flex-wrap gap-3">
      <button type="submit" id="btnConfirm" name="btnConfirm" value=""
              formaction="${pageContext.request.contextPath}/nhan-vien/doUpdateRentalBill.jsp"
              class="inline-flex h-10 items-center justify-center rounded-paper bg-primary px-6 text-primary-foreground hover:bg-primary/90">Xác nhận và in phiếu mượn</button>
      <button type="submit" id="btnCancel" name="btnCancel" value=""
              class="inline-flex h-10 items-center justify-center rounded-paper border border-stamp-red bg-paper px-6 text-stamp-red shadow-paper hover:bg-accent">Huỷ phiếu mượn</button>
    </div>
    </div>
    <div data-island="ProcessBillDesk" data-props="process-bill-props"></div>
    <script type="application/json" id="process-bill-props">${propsJson}</script>

    <c:if test="${showCancel}">
      <div role="alertdialog" aria-modal="false" aria-labelledby="cancelDialogTitle" aria-describedby="cancelDialogText"
           class="mt-6 max-w-xl">
        <ui:paper-card heading="" taped="true">
          <h2 id="cancelDialogTitle" class="m-0 text-xl">Xác nhận huỷ phiếu mượn</h2>
          <p id="cancelDialogText"><c:out value="${cancelConfirm}"/></p>
          <input type="hidden" name="from" value="staff">
          <label for="txtCancelReason" class="grid gap-1">
            <span>Lí do huỷ:</span>
            <input type="text" id="txtCancelReason" name="txtCancelReason" value="<c:out value='${reasonValue}'/>" maxlength="255" autofocus${reasonInvalid ? ' aria-invalid="true"' : ''}
                   class="h-10 rounded-paper border border-input bg-paper px-3 aria-invalid:border-destructive">
          </label>
          <div class="mt-4 flex flex-wrap gap-3">
            <button type="submit" id="btnConfirmCancel" name="btnConfirmCancel" value=""
                    formaction="${pageContext.request.contextPath}/doCancelRentalBill.jsp"
                    class="inline-flex h-10 items-center justify-center rounded-paper bg-destructive px-6 text-primary-foreground hover:bg-destructive/90">Xác nhận</button>
            <button type="submit" id="btnCloseCancel" name="btnCloseCancel" value=""
                    class="inline-flex h-10 items-center justify-center rounded-paper border border-ink-soft bg-paper px-6 shadow-paper hover:bg-accent">Huỷ</button>
          </div>
        </ui:paper-card>
      </div>
    </c:if>
  </form>
</t:layout>
