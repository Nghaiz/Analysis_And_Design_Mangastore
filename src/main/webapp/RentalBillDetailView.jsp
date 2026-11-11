<%--
  RentalBillDetailView (ch.9 tr.68–69; docs/contracts.md §9.2, §13, C3, C7). Trang xem, không gọi DAO.
  - Session R: rentalBill (RentalBillListView ghi khi bấm "Xem chi tiết"). Không có phiếu đã lưu thì về danh sách.
  - Dòng cùng đầu truyện gộp một dòng: "Mã vạch" liệt kê mã từng quyển, "Số lượng" = số quyển, "Tình trạng khi giao"
    theo từng quyển cùng thứ tự (chỉ phiếu "Đang cho thuê"; §13: chưa ghi nhận khi conditionNote NULL, C7).
  - Luôn hiện Ghi chú, Giảm giá. "Đang cho thuê" hiện thêm Ngày mượn, Ngày hẹn trả, Nhân viên xử lí, Tình trạng khi
    giao và các khoản đặt cọc; "Đã huỷ" hiện thêm Lí do huỷ.
  - Tổng tiền một dòng = giá × số quyển × số ngày (C3); tổng tiền thuê = tổng các dòng − giảm giá.
  - id cho smoke: totalCopies, discount, totalRentalPrice (chỉ chứa giá trị đã định dạng).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.time.temporal.ChronoUnit, java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map, java.util.StringJoiner" %>
<%@ page import="vn.tiemtruyen.model.Book, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentalCollateral, vn.tiemtruyen.model.RentedBook, vn.tiemtruyen.model.RentedDamage" %>
<%@ page import="vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Display" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%
    String ctx = request.getContextPath();
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null || rentalBill.getId() <= 0) {
        response.sendRedirect(ctx + "/RentalBillListView.jsp");
        return;
    }
    boolean renting = RentalBill.STATUS_RENTING.equals(rentalBill.getStatus());
    boolean cancelled = RentalBill.STATUS_CANCELLED.equals(rentalBill.getStatus());
    long days = rentalBill.getBorrowDate() != null && rentalBill.getDueDate() != null
            ? ChronoUnit.DAYS.between(rentalBill.getBorrowDate(), rentalBill.getDueDate())
            : rentalBill.getExpectedDays();

    Map<Integer, Map<String, Object>> grouped = new LinkedHashMap<>();
    double linesTotal = 0;
    for (RentedBook row : rentalBill.getListRentedBook()) {
        Book b = row.getBookCopy().getBook();
        Map<String, Object> r = grouped.get(b.getId());
        if (r == null) {
            r = new LinkedHashMap<>();
            r.put("name", b.getName());
            r.put("price", Display.money(row.getRentalPrice()));
            r.put("barcodes", new ArrayList<String>());
            r.put("conditions", new ArrayList<String>());
            r.put("amount", 0d);
            grouped.put(b.getId(), r);
        }
        @SuppressWarnings("unchecked")
        List<String> barcodes = (List<String>) r.get("barcodes");
        barcodes.add(row.getBookCopy().getBarcode());
        String condition = "(chưa ghi nhận)"; // §13: conditionNote NULL = chưa ghi nhận tình trạng
        if (row.getConditionNote() != null) {
            StringJoiner names = new StringJoiner(", ");
            for (RentedDamage damage : row.getListRentedDamage()) {
                names.add(damage.getDamage().getName());
            }
            condition = names.length() == 0 ? "Không có lỗi" : names.toString();
        }
        @SuppressWarnings("unchecked")
        List<String> conditions = (List<String>) r.get("conditions");
        conditions.add(condition);
        double amount = (double) row.getRentalPrice() * days;
        r.put("amount", (Double) r.get("amount") + amount);
        linesTotal += amount;
    }
    List<Map<String, Object>> rows = new ArrayList<>(grouped.values());
    for (Map<String, Object> r : rows) {
        r.put("quantity", ((List<?>) r.get("barcodes")).size());
        r.put("total", Display.money((Double) r.get("amount")));
    }

    List<Map<String, Object>> collaterals = new ArrayList<>();
    int index = 1;
    for (RentalCollateral item : rentalBill.getListRentalCollateral()) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("index", index++);
        r.put("name", item.getCollateral().getName());
        r.put("value", item.getValue());
        collaterals.add(r);
    }

    pageContext.setAttribute("ctx", ctx);
    pageContext.setAttribute("renting", renting);
    pageContext.setAttribute("cancelled", cancelled);
    pageContext.setAttribute("billCode", Codes.rentalBillCode(rentalBill.getId()));
    pageContext.setAttribute("clientName", rentalBill.getClient().getFullName());
    pageContext.setAttribute("createdAt", Display.dateTime(rentalBill.getCreatedAt()));
    pageContext.setAttribute("expectedPickupAt", Display.dateTime(rentalBill.getExpectedPickupAt()));
    pageContext.setAttribute("expectedDays", rentalBill.getExpectedDays());
    pageContext.setAttribute("status", rentalBill.getStatus());
    pageContext.setAttribute("borrowDate", Display.date(rentalBill.getBorrowDate()));
    pageContext.setAttribute("dueDate", Display.date(rentalBill.getDueDate()));
    pageContext.setAttribute("staffName", rentalBill.getStaff() == null ? "" : rentalBill.getStaff().getFullName());
    pageContext.setAttribute("note", rentalBill.getNote() == null ? "" : rentalBill.getNote());
    pageContext.setAttribute("cancelReason", rentalBill.getCancelReason() == null ? "" : rentalBill.getCancelReason());
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("collaterals", collaterals);
    pageContext.setAttribute("totalCopies", rentalBill.getListRentedBook().size());
    pageContext.setAttribute("discount", Display.money(rentalBill.getDiscount()));
    pageContext.setAttribute("totalRentalPrice", Display.money(linesTotal - rentalBill.getDiscount()));
%>
<t:layout title="Chi tiết phiếu mượn">
  <div class="mx-auto flex w-full max-w-160 flex-col gap-6">
    <header class="flex flex-col gap-1">
      <nav aria-label="Đường dẫn" class="text-sm">
        <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 p-0 text-ink-soft">
          <li><a href="${ctx}/RentalBillListView.jsp">Danh sách phiếu mượn</a></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page">Chi tiết phiếu mượn</li>
        </ol>
      </nav>
      <h1 class="m-0">Chi tiết phiếu mượn</h1>
      <p class="m-0 text-ink-soft">Thông tin của một phiếu mượn: các quyển tiệm giữ cho bạn, tiền thuê và trạng thái hiện tại.</p>
    </header>

    <ui:ticket title="PHIẾU MƯỢN" code="${billCode}">
      <div class="mb-2 flex justify-end" aria-hidden="true"><ui:stamp status="${status}"/></div>
      <div class="grid gap-x-8 gap-y-1 md:grid-cols-2">
        <dl class="m-0 grid content-start gap-y-1">
          <div><dt class="inline font-type text-ink-soft">Tên khách hàng:</dt> <dd class="m-0 inline"><c:out value="${clientName}"/></dd></div>
          <div><dt class="inline font-type text-ink-soft">Ngày giờ tạo phiếu:</dt> <dd class="m-0 inline font-num"><c:out value="${createdAt}"/></dd></div>
          <div><dt class="inline font-type text-ink-soft">Ngày giờ dự kiến đến nhận:</dt> <dd class="m-0 inline font-num"><c:out value="${expectedPickupAt}"/></dd></div>
          <div><dt class="inline font-type text-ink-soft">Số ngày thuê dự kiến:</dt> <dd class="m-0 inline font-num"><c:out value="${expectedDays}"/></dd></div>
          <div><dt class="inline font-type text-ink-soft">Trạng thái:</dt> <dd class="m-0 inline font-type" id="status"><c:out value="${status}"/></dd></div>
        </dl>
        <dl class="m-0 grid content-start gap-y-1">
          <c:if test="${renting}">
            <div><dt class="inline font-type text-ink-soft">Ngày mượn:</dt> <dd class="m-0 inline font-num"><c:out value="${borrowDate}"/></dd></div>
            <div><dt class="inline font-type text-ink-soft">Ngày hẹn trả:</dt> <dd class="m-0 inline font-num"><c:out value="${dueDate}"/></dd></div>
            <div><dt class="inline font-type text-ink-soft">Nhân viên xử lí:</dt> <dd class="m-0 inline"><c:out value="${staffName}"/></dd></div>
          </c:if>
          <div class="min-w-0 break-words"><dt class="inline font-type text-ink-soft">Ghi chú:</dt> <dd class="m-0 inline"><c:out value="${note}"/></dd></div>
          <c:if test="${cancelled}">
            <div class="min-w-0 break-words"><dt class="inline font-type text-ink-soft">Lí do huỷ:</dt> <dd class="m-0 inline" id="cancelReason"><c:out value="${cancelReason}"/></dd></div>
          </c:if>
        </dl>
      </div>

      <div class="mt-5 overflow-x-auto">
        <table class="tt-ledger-table" id="tblRentedBook">
          <caption class="tt-ledger-table__caption">Các quyển truyện được giữ chỗ:</caption>
          <thead>
            <tr>
              <th scope="col">Mã vạch</th>
              <th scope="col">Tên đầu truyện</th>
              <th scope="col">Giá thuê theo ngày</th>
              <th scope="col">Số lượng</th>
              <c:if test="${renting}"><th scope="col">Tình trạng khi giao</th></c:if>
              <th scope="col">Tổng tiền</th>
            </tr>
          </thead>
          <tbody>
            <c:forEach var="r" items="${rows}">
              <tr>
                <td class="font-num whitespace-nowrap">
                  <ul class="m-0 list-none p-0">
                    <c:forEach var="code" items="${r.barcodes}"><li><c:out value="${code}"/></li></c:forEach>
                  </ul>
                </td>
                <td><c:out value="${r.name}"/></td>
                <td class="font-num whitespace-nowrap"><c:out value="${r.price}"/></td>
                <td class="font-num"><c:out value="${r.quantity}"/></td>
                <c:if test="${renting}">
                  <td>
                    <ul class="m-0 flex list-none flex-col gap-1 p-0">
                      <c:forEach var="condition" items="${r.conditions}"><li><ui:condition-tag text="${condition}"/></li></c:forEach>
                    </ul>
                  </td>
                </c:if>
                <td class="font-num whitespace-nowrap"><c:out value="${r.total}"/></td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>

      <c:if test="${renting}">
        <div class="mt-5 overflow-x-auto">
          <table class="tt-ledger-table" id="tblRentalCollateral">
            <caption class="tt-ledger-table__caption">Các khoản đặt cọc:</caption>
            <thead>
              <tr>
                <th scope="col">STT</th>
                <th scope="col">Loại tài sản</th>
                <th scope="col">Giá trị</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="r" items="${collaterals}">
                <tr>
                  <td class="font-num"><c:out value="${r.index}"/></td>
                  <td><c:out value="${r.name}"/></td>
                  <td><c:out value="${r.value}"/></td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
      </c:if>

      <dl class="m-0 mt-5 ml-auto grid w-full max-w-sm gap-y-1 border-t-2 border-double border-ink-soft pt-3">
        <div class="flex items-baseline justify-between gap-4"><dt class="font-type text-ink-soft">Tổng số quyển:</dt> <dd class="m-0 font-num" id="totalCopies"><c:out value="${totalCopies}"/></dd></div>
        <div class="flex items-baseline justify-between gap-4"><dt class="font-type text-ink-soft">Giảm giá:</dt> <dd class="m-0 font-num" id="discount"><c:out value="${discount}"/></dd></div>
        <div class="flex items-baseline justify-between gap-4"><dt class="font-type text-ink">Tổng tiền thuê:</dt> <dd class="m-0 font-num text-xl font-bold text-stamp-red" id="totalRentalPrice"><c:out value="${totalRentalPrice}"/></dd></div>
      </dl>
    </ui:ticket>

    <div class="flex flex-col gap-3 sm:flex-row">
      <a href="${ctx}/RentalBillListView.jsp" id="lnkBack" class="tt-btn tt-btn--ghost">Quay lại</a>
    </div>
  </div>
</t:layout>
