<%--
  EditRentedBookListView (ch.9 tr.75; docs/contracts.md §9.2, §7). Trang xem, tự gửi, không gọi DAO.
  - Mở khi session chưa có listRentedBook (từ ProcessRentalBillView): chép danh sách quyển của rentalBill
    → W listRentedBook (bản sao, §7). Quay lại từ AddRentedBookView hay doUpdateRentedBookList: hiện listRentedBook.
  - "Xoá" (lnkDeleteRentedBook, value = mã vạch): chỉ xử lí khi POST + dispatcher REQUEST
    (phase-06-integration.md §3), bỏ dòng khỏi listRentedBook → W listRentedBook.
  - "Lưu" gửi tới doUpdateRentedBookList.jsp; "Thêm truyện", "Quay lại" là <a href>.
  - Hiện NOT_ENOUGH_COPIES do doUpdateRentedBookList đặt (request attribute message).
  Form luôn có action trỏ về chính trang: trang còn được forward tới từ doUpdateRentedBookList.jsp.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, java.time.temporal.ChronoUnit, java.util.ArrayList,
                 java.util.LinkedHashMap, java.util.List, java.util.Map, java.util.StringJoiner,
                 vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.model.RentedDamage,
                 vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Display" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
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
    @SuppressWarnings("unchecked")
    List<RentedBook> listRentedBook = (List<RentedBook>) session.getAttribute("listRentedBook");
    if (listRentedBook == null) {
        listRentedBook = new ArrayList<>(rentalBill.getListRentedBook());
        session.setAttribute("listRentedBook", listRentedBook);
    }

    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    String deleteBarcode = selfPost ? request.getParameter("lnkDeleteRentedBook") : null;
    if (deleteBarcode != null) {
        listRentedBook.removeIf(row -> deleteBarcode.equals(row.getBookCopy().getBarcode()));
        session.setAttribute("listRentedBook", listRentedBook);
    }

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
    pageContext.setAttribute("billCode", Codes.rentalBillCode(rentalBill.getId()));
    pageContext.setAttribute("rows", rows);
%>
<t:layout title="Chỉnh sửa danh sách truyện">
  <section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Chỉnh sửa danh sách truyện</h1>
    <c:if test="${not empty message}"><ui:message-box kind="error" text="${message}"/></c:if>
    <form method="post" action="${base}/EditRentedBookListView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
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
                <td><button type="submit" name="lnkDeleteRentedBook" value="${fn:escapeXml(row.barcode)}" class="rounded-paper border border-ink-soft bg-paper px-2 py-1 text-sm text-ink">Xoá</button></td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
      <p class="m-0"><a id="lnkAddBook" href="${base}/AddRentedBookView.jsp" class="inline-block rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Thêm truyện</a></p>
      <p class="m-0 flex flex-wrap gap-4">
        <button type="submit" id="btnSave" name="btnSave" formaction="${base}/doUpdateRentedBookList.jsp" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Lưu</button>
        <a id="lnkBack" href="${base}/ProcessRentalBillView.jsp" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Quay lại</a>
      </p>
    </form>
  </section>
</t:layout>
