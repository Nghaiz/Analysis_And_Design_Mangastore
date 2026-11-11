<%--
  EditRentedBookListView (ch.9 tr.75; docs/contracts.md §9.2, §7). Trang xem, tự gửi, không gọi DAO.
  - Mở khi session chưa có listRentedBook (từ ProcessRentalBillView): chép danh sách quyển của rentalBill
    → W listRentedBook (bản sao, §7). Quay lại từ AddRentedBookView hay doUpdateRentedBookList: hiện listRentedBook.
  - "Xoá" (lnkDeleteRentedBook, value = mã vạch): chỉ xử lí khi POST + dispatcher REQUEST
    (phase-06-integration.md §3), bỏ dòng khỏi listRentedBook → W listRentedBook; mã vạch không có thì bỏ qua.
  - "Lưu" gửi tới doUpdateRentedBookList.jsp; "Thêm truyện", "Quay lại" là <a href>.
  - Hiện NOT_ENOUGH_COPIES, NO_COPY_RECEIVED do doUpdateRentedBookList đặt (request attribute message).
  Đầu trang (phase-07-edge-cases.md §3.1): (1) thiếu rentalBill → 302 SearchRentalBillView; (2) rentalBill không
  còn "Chờ nhận" → forward SearchRentalBillView kèm câu D9; (3) POST thiếu hoặc sai input ẩn rentalBillId → forward
  ProcessRentalBillView kèm RENTAL_BILL_CHANGED. Form có action trỏ về chính trang (trang còn được forward tới).
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, jakarta.servlet.http.HttpServletRequest, java.time.temporal.ChronoUnit,
                 java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map, java.util.StringJoiner,
                 vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.model.RentedDamage,
                 vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Display, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /**
     * Bước (2), (3) đầu trang M3 (phase-07-edge-cases.md §3.1). Trả trang cần forward (đã đặt request attribute
     * message) hoặc null khi được xử lí tiếp.
     */
    private static String billGuard(HttpServletRequest request, RentalBill bill, boolean checkFormId) {
        if (!RentalBill.STATUS_PENDING.equals(bill.getStatus())) {
            request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(bill.getStatus())
                    ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
            return "/nhan-vien/SearchRentalBillView.jsp";
        }
        String formId = request.getParameter("rentalBillId");
        if (checkFormId && (formId == null || !formId.strip().equals(String.valueOf(bill.getId())))) {
            request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
            return "/nhan-vien/ProcessRentalBillView.jsp";
        }
        return null;
    }

    /** Tình trạng khi giao theo §13: null = chưa ghi nhận (C7); không có lỗi = "Không có lỗi"; còn lại tên lỗi nối ", ". */
    private static String conditionText(RentedBook row) {
        if (row.getConditionNote() == null) {
            return null;
        }
        if (row.getListRentedDamage().isEmpty()) {
            return "Không có lỗi";
        }
        StringJoiner names = new StringJoiner(", ");
        for (RentedDamage damage : row.getListRentedDamage()) {
            names.add(damage.getDamage().getName());
        }
        return names.toString();
    }

    /** Số ngày tính tiền (C3): từ ngày mượn tới ngày hẹn trả khi có cả hai, ngược lại số ngày thuê dự kiến. */
    private static long rentalDays(RentalBill bill) {
        if (bill.getBorrowDate() != null && bill.getDueDate() != null) {
            return ChronoUnit.DAYS.between(bill.getBorrowDate(), bill.getDueDate());
        }
        return bill.getExpectedDays();
    }
%>
<%
    String base = request.getContextPath() + "/nhan-vien";
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null) {
        response.sendRedirect(base + "/SearchRentalBillView.jsp");
        return;
    }
    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    String guard = billGuard(request, rentalBill, selfPost);
    if (guard != null) {
        request.getRequestDispatcher(guard).forward(request, response);
        return;
    }

    @SuppressWarnings("unchecked")
    List<RentedBook> listRentedBook = (List<RentedBook>) session.getAttribute("listRentedBook");
    if (listRentedBook == null) {
        listRentedBook = new ArrayList<>(rentalBill.getListRentedBook());
        session.setAttribute("listRentedBook", listRentedBook);
    }
    String deleteBarcode = selfPost ? request.getParameter("lnkDeleteRentedBook") : null;
    if (deleteBarcode != null) {
        listRentedBook.removeIf(row -> deleteBarcode.strip().equals(row.getBookCopy().getBarcode()));
        session.setAttribute("listRentedBook", listRentedBook);
    }

    String message = (String) request.getAttribute("message");
    long days = rentalDays(rentalBill);
    List<Map<String, Object>> rows = new ArrayList<>();
    for (RentedBook row : listRentedBook) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("barcode", row.getBookCopy().getBarcode());
        view.put("name", row.getBookCopy().getBook().getName());
        view.put("price", Display.money(row.getRentalPrice()));
        view.put("quantity", 1);
        view.put("condition", conditionText(row));
        view.put("total", Display.money((double) row.getRentalPrice() * days));
        rows.add(view);
    }
    pageContext.setAttribute("base", base);
    pageContext.setAttribute("billId", rentalBill.getId());
    pageContext.setAttribute("billCode", Codes.rentalBillCode(rentalBill.getId()));
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("pageMessage", message);
%>
<t:layout title="Chỉnh sửa danh sách truyện">
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-2 border-b border-dashed border-ink-soft pb-4">
      <nav aria-label="Đường dẫn" class="text-sm text-ink-soft">
        <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
          <li><a href="${base}/StaffHomeView.jsp">Trang chủ nhân viên</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/SearchRentalBillView.jsp">Tìm phiếu mượn</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/ProcessRentalBillView.jsp">Xử lí phiếu mượn</a></li>
          <li aria-current="page" class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>Chỉnh sửa danh sách truyện</li>
        </ol>
      </nav>
      <h1 class="m-0">Chỉnh sửa danh sách truyện</h1>
      <p class="m-0 max-w-3xl text-ink-soft">Bỏ quyển khách không lấy hoặc thêm quyển ngay tại quầy. Bấm Lưu để ghi danh sách mới cho phiếu; Quay lại thì bỏ các thay đổi chưa lưu.</p>
    </header>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="error" text="${pageMessage}"/></c:if>
    <form method="post" action="${base}/EditRentedBookListView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <input type="hidden" name="rentalBillId" value="${billId}">
      <div class="flex flex-col gap-3">
        <div class="overflow-x-auto">
          <table id="tblRentedBook" class="tt-ledger-table">
            <caption class="tt-ledger-table__caption">Các quyển truyện của phiếu mượn <span class="font-num">${billCode}</span></caption>
            <thead>
              <tr>
                <th scope="col">Mã vạch</th>
                <th scope="col">Tên đầu truyện</th>
                <th scope="col" class="text-right">Giá thuê theo ngày</th>
                <th scope="col" class="text-right">Số lượng</th>
                <th scope="col">Tình trạng khi giao</th>
                <th scope="col" class="text-right">Tổng tiền</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="row" items="${rows}">
                <tr>
                  <td class="font-num"><c:out value="${row.barcode}"/></td>
                  <td><c:out value="${row.name}"/></td>
                  <td class="font-num text-right">${row.price}</td>
                  <td class="font-num text-right">${row.quantity}</td>
                  <td><ui:condition-tag text="${row.condition}"/></td>
                  <td class="font-num text-right">${row.total}</td>
                  <td><button type="submit" name="lnkDeleteRentedBook" value="${fn:escapeXml(row.barcode)}" class="tt-btn tt-btn--ghost tt-btn--sm">Xoá</button></td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <c:if test="${empty rows}"><p class="m-0 border border-dashed border-ink-soft bg-paper-deep px-4 py-3 text-ink">Danh sách đang trống. Bấm Thêm truyện để thêm quyển cho khách; phiếu cần ít nhất một quyển mới lưu được.</p></c:if>
      </div>
      <p class="m-0"><a id="lnkAddBook" href="${base}/AddRentedBookView.jsp" class="tt-btn tt-btn--ghost"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg><span>Thêm truyện</span></a></p>
      <div class="flex flex-wrap gap-3 border-t border-dashed border-ink-soft pt-4">
        <button type="submit" id="btnSave" name="btnSave" formaction="${base}/doUpdateRentedBookList.jsp" class="tt-btn tt-btn--primary"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>Lưu</span></button>
        <a id="lnkBack" href="${base}/ProcessRentalBillView.jsp" class="tt-btn tt-btn--ghost"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg><span>Quay lại</span></a>
      </div>
    </form>
  </div>
</t:layout>
