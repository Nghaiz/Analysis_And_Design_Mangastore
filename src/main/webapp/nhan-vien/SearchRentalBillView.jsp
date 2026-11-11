<%--
  Tìm phiếu mượn (docs/contracts.md §9.1 #16, §9.2 SearchRentalBillView; ch.9 tr.72–73). Xem, tự gửi.
  DAO: RentalBillDAO.searchRentalBill. Session R: staff, listRentalBill; W: listRentalBill (Tìm), rentalBill (chọn
  phiếu "Chờ nhận").
  - btnSearch: từ khoá trim + NFC, cắt còn 100 kí tự; trống → không gọi DAO (C9); kết quả rỗng → RENTAL_BILL_NOT_FOUND.
  - lnkChooseRentalBill (value = id phiếu): lấy phiếu từ listRentalBill theo id; id không phải số hay không có trong
    danh sách thì bỏ qua, hiện lại trang (phase-07-edge-cases.md §3.2). "Đã huỷ" → RENTAL_BILL_CANCELLED,
    "Đang cho thuê" → RENTAL_BILL_ALREADY_PROCESSED, giữ nguyên trang. "Chờ nhận" → borrowDate = hôm nay,
    dueDate = hôm nay + expectedDays (C7), W rentalBill, 302 tới ProcessRentalBillView.jsp (PRG).
  Request forward tới (doCancelRentalBill, doUpdateRentalBill khi D9) chỉ hiển thị kèm message.
  form có action tường minh: sau forward, URL trình duyệt là trang doXxx. Bảng mang id tblRentalBill trên thẻ <table>
  (smoke đọc theo id); ledger-table.tag chưa nhận id nên trang in lại đúng cây lớp của tag.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer" %>
<%@ page import="java.time.LocalDate" %>
<%@ page import="java.util.ArrayList" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.Map" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.dao.RentalBillDAO" %>
<%@ page import="vn.tiemtruyen.model.RentalBill" %>
<%@ page import="vn.tiemtruyen.util.Codes" %>
<%@ page import="vn.tiemtruyen.util.Display" %>
<%@ page import="vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%!
    /** Độ dài tối đa của từ khoá tìm (phase-07-edge-cases.md §3.2). */
    private static final int KEYWORD_MAX_LENGTH = 100;
%>
<%
    String ctx = request.getContextPath();
    boolean ownPost = "POST".equals(request.getMethod()) && request.getDispatcherType() == DispatcherType.REQUEST;
    @SuppressWarnings("unchecked")
    List<RentalBill> listRentalBill = (List<RentalBill>) session.getAttribute("listRentalBill");
    // Từ khoá: trim + NFC; dài quá KEYWORD_MAX_LENGTH kí tự → INPUT_TOO_LONG, không gọi DAO (docs/contracts.md §10.3).
    // Ô tìm chỉ điền lại khi
    // request đến từ form của chính trang này (forward từ doXxx mang field của form khác).
    String keyword = request.getParameter("txtKeyword");
    String text = keyword == null ? "" : Normalizer.normalize(keyword.strip(), Normalizer.Form.NFC);
    boolean keywordTooLong = text.codePointCount(0, text.length()) > KEYWORD_MAX_LENGTH;
    String keywordValue = ownPost ? text : "";

    if (ownPost && request.getParameter("btnSearch") != null && keywordTooLong) {
        request.setAttribute("message", Messages.INPUT_TOO_LONG);
    } else if (ownPost && request.getParameter("btnSearch") != null) {
        listRentalBill = new ArrayList<>();
        if (!text.isEmpty()) {
            try (RentalBillDAO dao = new RentalBillDAO()) {
                listRentalBill = dao.searchRentalBill(text);
            }
        }
        session.setAttribute("listRentalBill", listRentalBill);
        if (listRentalBill.isEmpty()) {
            request.setAttribute("message", Messages.RENTAL_BILL_NOT_FOUND);
        }
    } else if (ownPost && request.getParameter("lnkChooseRentalBill") != null && listRentalBill != null) {
        RentalBill chosen = null;
        try {
            int id = Integer.parseInt(request.getParameter("lnkChooseRentalBill").strip());
            for (RentalBill bill : listRentalBill) {
                if (bill.getId() == id) {
                    chosen = bill;
                    break;
                }
            }
        } catch (NumberFormatException e) {
            // Giá trị không phải id của dòng nào trong danh sách: không chọn được, hiện lại trang (C10).
            chosen = null;
        }
        if (chosen != null) {
            if (RentalBill.STATUS_CANCELLED.equals(chosen.getStatus())) {
                request.setAttribute("message", Messages.RENTAL_BILL_CANCELLED);
            } else if (RentalBill.STATUS_RENTING.equals(chosen.getStatus())) {
                request.setAttribute("message", Messages.RENTAL_BILL_ALREADY_PROCESSED);
            } else if (RentalBill.STATUS_PENDING.equals(chosen.getStatus())) {
                LocalDate today = LocalDate.now();
                chosen.setBorrowDate(today);
                chosen.setDueDate(today.plusDays(chosen.getExpectedDays()));
                session.setAttribute("rentalBill", chosen);
                // Phiếu mới mở: mọi quyển tích sẵn "Nhận" (ch.2 bước 10), bỏ danh sách bỏ tích của phiếu trước.
                session.removeAttribute("uncheckedBarcodes");
                response.sendRedirect(ctx + "/nhan-vien/ProcessRentalBillView.jsp");
                return;
            } else {
                throw new IllegalStateException("Trạng thái phiếu không hợp lệ: " + chosen.getStatus());
            }
        }
    }

    List<Map<String, Object>> rows = new ArrayList<>();
    if (listRentalBill != null) {
        for (RentalBill bill : listRentalBill) {
            rows.add(Map.of(
                    "id", bill.getId(),
                    "code", Codes.rentalBillCode(bill.getId()),
                    "clientName", bill.getClient().getFullName(),
                    "phone", bill.getClient().getPhone(),
                    "pickupAt", Display.dateTime(bill.getExpectedPickupAt()),
                    "copyCount", bill.getListRentedBook().size(),
                    "status", bill.getStatus()));
        }
    }
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("keywordValue", keywordValue);
    Object message = request.getAttribute("message");
    String kind = "error";
    if (Messages.CANCEL_SUCCESS.equals(message)) {
        kind = "success";
    } else if (Messages.RENTAL_BILL_NOT_FOUND.equals(message)) {
        kind = "info";
    }
    pageContext.setAttribute("messageKind", kind);
%>
<t:layout title="Tìm phiếu mượn">
  <h1>Tìm phiếu mượn</h1>
  <c:if test="${not empty message}">
    <ui:message-box kind="${messageKind}" text="${message}"/>
  </c:if>
  <form method="post" action="${pageContext.request.contextPath}/nhan-vien/SearchRentalBillView.jsp">
    <t:csrf/>
    <div class="mb-6 flex flex-wrap items-end gap-3">
      <label for="txtKeyword" class="sr-only">Từ khoá tìm phiếu mượn</label>
      <input type="search" id="txtKeyword" name="txtKeyword" value="<c:out value='${keywordValue}'/>"
             placeholder="Nhập mã phiếu mượn, tên khách hàng hoặc số CCCD…" maxlength="100"
             class="h-10 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3">
      <button type="submit" id="btnSearch" name="btnSearch" value=""
              class="inline-flex h-10 items-center justify-center rounded-paper bg-primary px-6 text-primary-foreground hover:bg-primary/90">Tìm</button>
    </div>
    <div class="overflow-x-auto">
      <table id="tblRentalBill" class="tt-ledger-table">
        <caption class="tt-ledger-table__caption">Danh sách phiếu mượn</caption>
        <thead>
          <tr>
            <th scope="col">Mã phiếu mượn</th>
            <th scope="col">Tên khách hàng</th>
            <th scope="col">Số điện thoại</th>
            <th scope="col">Ngày giờ dự kiến đến nhận</th>
            <th scope="col">Số quyển</th>
            <th scope="col">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          <c:forEach var="row" items="${rows}">
            <tr>
              <td>
                <button type="submit" name="lnkChooseRentalBill" value="${row.id}"
                        class="cursor-pointer border-0 bg-transparent p-0 font-num text-pen-blue underline underline-offset-[3px]">${row.code}</button>
              </td>
              <td><c:out value="${row.clientName}"/></td>
              <td class="font-num"><c:out value="${row.phone}"/></td>
              <td class="font-num">${row.pickupAt}</td>
              <td class="font-num">${row.copyCount}</td>
              <td><ui:stamp status="${row.status}"/></td>
            </tr>
          </c:forEach>
        </tbody>
      </table>
    </div>
  </form>
</t:layout>
