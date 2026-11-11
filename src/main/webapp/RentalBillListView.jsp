<%--
  RentalBillListView (ch.9 tr.66–67; docs/contracts.md §9.2, §7, C1, C2, C3, C6). Trang xem, chỉ gọi DAO đọc.
  - Session R: client, listRentalBill. Chưa có listRentalBill (ClientHomeView dọn, C6): getRentalBillList(client) → W
    listRentalBill (DAO sắp mới nhất trước). Có rồi (quay lại từ RentalBillDetailView, doCancelRentalBill): dùng lại.
  - Chỉ xử lí khi POST + DispatcherType.REQUEST: lnkViewDetail (phiếu theo id trong listRentalBill → W rentalBill,
    → RentalBillDetailView), lnkCancelRentalBill (phiếu "Chờ nhận" theo id → W rentalBill, hiện hộp xác nhận huỷ),
    btnCloseCancel (đóng hộp, hiện lại trang). Hộp huỷ là form riêng: CANCEL_CONFIRM, txtCancelReason, from=client,
    btnConfirmCancel (formaction doCancelRentalBill.jsp), btnCloseCancel. Mở bằng gửi về trang, không cần JS (C2).
  - Cột "Trạng thái" in chữ trạng thái nguyên dạng (ch.2 bước 24.1: "Chờ nhận"; smoke so ô này).
  - Nút "Huỷ phiếu" chỉ có ở phiếu "Chờ nhận". id trên nút không phải số hoặc không có trong listRentalBill của chính
    khách (sửa HTML, phiếu của khách khác): bỏ qua, hiện lại trang. Tổng tiền thuê theo §13, số ngày theo C3, tính lúc hiển thị.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.time.temporal.ChronoUnit, java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map" %>
<%@ page import="jakarta.servlet.DispatcherType" %>
<%@ page import="vn.tiemtruyen.dao.RentalBillDAO" %>
<%@ page import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook" %>
<%@ page import="vn.tiemtruyen.util.Codes, vn.tiemtruyen.util.Display, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%
    String ctx = request.getContextPath();
    Client client = (Client) session.getAttribute("client");
    @SuppressWarnings("unchecked")
    List<RentalBill> listRentalBill = (List<RentalBill>) session.getAttribute("listRentalBill");
    if (listRentalBill == null) {
        try (RentalBillDAO rentalBillDAO = new RentalBillDAO()) {
            listRentalBill = rentalBillDAO.getRentalBillList(client);
        }
        session.setAttribute("listRentalBill", listRentalBill);
    }
    String message = (String) request.getAttribute("message");
    RentalBill cancelling = null;

    boolean submitted = "POST".equals(request.getMethod()) && request.getDispatcherType() == DispatcherType.REQUEST;
    String chosen = null;
    if (submitted && request.getParameter("lnkViewDetail") != null) {
        chosen = request.getParameter("lnkViewDetail").strip();
    } else if (submitted && request.getParameter("lnkCancelRentalBill") != null) {
        chosen = request.getParameter("lnkCancelRentalBill").strip();
    }
    if (chosen != null) {
        for (RentalBill bill : listRentalBill) {
            if (String.valueOf(bill.getId()).equals(chosen)) {
                if (request.getParameter("lnkViewDetail") != null) {
                    session.setAttribute("rentalBill", bill);
                    response.sendRedirect(ctx + "/RentalBillDetailView.jsp");
                    return;
                }
                if (RentalBill.STATUS_PENDING.equals(bill.getStatus())) {
                    session.setAttribute("rentalBill", bill);
                    cancelling = bill;
                }
                break;
            }
        }
    }
    // doCancelRentalBill trả về vì lí do huỷ trống (CANCEL_REASON_REQUIRED, C17) hay quá 255 kí tự (INPUT_TOO_LONG):
    // mở lại hộp, giữ chữ đã nhập, đánh dấu ô.
    String reasonText = "";
    boolean reasonInvalid = false;
    RentalBill sessionBill = (RentalBill) session.getAttribute("rentalBill");
    if (request.getDispatcherType() == DispatcherType.FORWARD && request.getParameter("btnConfirmCancel") != null
            && (Messages.CANCEL_REASON_REQUIRED.equals(message) || Messages.INPUT_TOO_LONG.equals(message))
            && sessionBill != null && sessionBill.getId() > 0
            && RentalBill.STATUS_PENDING.equals(sessionBill.getStatus())) {
        cancelling = sessionBill;
        reasonText = request.getParameter("txtCancelReason") == null ? "" : request.getParameter("txtCancelReason");
        reasonInvalid = true;
    }

    List<Map<String, Object>> rows = new ArrayList<>();
    for (RentalBill bill : listRentalBill) {
        long days = bill.getBorrowDate() != null && bill.getDueDate() != null
                ? ChronoUnit.DAYS.between(bill.getBorrowDate(), bill.getDueDate())
                : bill.getExpectedDays();
        double linesTotal = 0;
        for (RentedBook row : bill.getListRentedBook()) {
            linesTotal += (double) row.getRentalPrice() * days;
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", bill.getId());
        r.put("code", Codes.rentalBillCode(bill.getId()));
        r.put("createdAt", Display.dateTime(bill.getCreatedAt()));
        r.put("expectedPickupAt", Display.dateTime(bill.getExpectedPickupAt()));
        r.put("copies", bill.getListRentedBook().size());
        r.put("total", Display.money(linesTotal - bill.getDiscount()));
        r.put("status", bill.getStatus());
        r.put("pending", RentalBill.STATUS_PENDING.equals(bill.getStatus()));
        rows.add(r);
    }

    pageContext.setAttribute("ctx", ctx);
    pageContext.setAttribute("message", message);
    pageContext.setAttribute("messageKind", Messages.CANCEL_SUCCESS.equals(message) ? "success" : "error");
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("cancelling", cancelling != null);
    pageContext.setAttribute("cancellingCode", cancelling == null ? "" : Codes.rentalBillCode(cancelling.getId()));
    pageContext.setAttribute("cancelConfirm", Messages.CANCEL_CONFIRM);
    pageContext.setAttribute("reasonText", reasonText);
    pageContext.setAttribute("reasonInvalid", reasonInvalid);
%>
<t:layout title="Danh sách phiếu mượn">
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex flex-col gap-1">
        <p class="tt-hero__eyebrow">Sổ phiếu của bạn</p>
        <h1 class="m-0">Danh sách phiếu mượn</h1>
        <p class="m-0 text-ink-soft">Các phiếu bạn đã tạo, mới nhất ở trên. Phiếu "Chờ nhận" là phiếu tiệm đang giữ truyện, bạn có thể huỷ khi chưa đến nhận.</p>
      </div>
      <a href="${ctx}/SearchBookView.jsp" class="tt-btn tt-btn--ghost flex-none">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        <span>Thuê thêm truyện</span>
      </a>
    </header>

    <c:if test="${not empty message}">
      <div><ui:message-box kind="${messageKind}" text="${message}"/></div>
    </c:if>

    <form method="post" action="${ctx}/RentalBillListView.jsp" class="tt-paper-card">
      <t:csrf/>
      <div class="overflow-x-auto">
        <table class="tt-ledger-table" id="tblRentalBill">
          <caption class="tt-ledger-table__caption sr-only">Danh sách phiếu mượn</caption>
          <thead>
            <tr>
              <th scope="col">Mã phiếu mượn</th>
              <th scope="col">Ngày giờ tạo phiếu</th>
              <th scope="col">Ngày giờ dự kiến đến nhận</th>
              <th scope="col">Số quyển</th>
              <th scope="col">Tổng tiền thuê</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <c:forEach var="r" items="${rows}">
              <tr>
                <td class="font-num whitespace-nowrap"><c:out value="${r.code}"/></td>
                <td class="font-num"><c:out value="${r.createdAt}"/></td>
                <td class="font-num"><c:out value="${r.expectedPickupAt}"/></td>
                <td class="font-num"><c:out value="${r.copies}"/></td>
                <td class="font-num whitespace-nowrap"><c:out value="${r.total}"/></td>
                <c:choose>
                  <c:when test="${r.pending}"><td class="font-type whitespace-nowrap text-stamp-amber"><c:out value="${r.status}"/></td></c:when>
                  <c:when test="${r.status eq RentalBill.STATUS_RENTING}"><td class="font-type whitespace-nowrap text-stamp-green"><c:out value="${r.status}"/></td></c:when>
                  <c:otherwise><td class="font-type whitespace-nowrap text-stamp-red"><c:out value="${r.status}"/></td></c:otherwise>
                </c:choose>
                <td>
                  <div class="flex flex-wrap gap-2">
                    <button type="submit" name="lnkViewDetail" value="${r.id}" aria-label="Xem chi tiết ${r.code}"
                            class="tt-btn tt-btn--ghost tt-btn--sm">Xem chi tiết</button>
                    <c:if test="${r.pending}">
                      <button type="submit" name="lnkCancelRentalBill" value="${r.id}" aria-label="Huỷ phiếu ${r.code}"
                              class="tt-btn tt-btn--ghost tt-btn--sm border-stamp-red text-stamp-red">Huỷ phiếu</button>
                    </c:if>
                  </div>
                </td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
      <c:if test="${empty rows}">
        <p class="m-0 mt-3 border border-dashed border-ink-soft px-4 py-3 text-ink-soft">Bạn chưa có phiếu mượn nào. Vào "Tìm truyện", chọn các tập muốn đọc rồi tạo phiếu, phiếu sẽ hiện ở đây.</p>
      </c:if>
    </form>

    <c:if test="${cancelling}">
      <form method="post" action="${ctx}/RentalBillListView.jsp">
        <t:csrf/>
        <section role="alertdialog" aria-modal="false" aria-labelledby="cancelDialogTitle" aria-describedby="cancelDialogText" id="cancelDialog" class="mx-auto w-full max-w-2xl">
          <ui:paper-card taped="true">
            <h2 id="cancelDialogTitle" class="mt-0 mb-2">Xác nhận huỷ phiếu mượn <span class="font-num text-stamp-red"><c:out value="${cancellingCode}"/></span></h2>
            <p id="cancelDialogText" class="mt-0 mb-4"><c:out value="${cancelConfirm}"/></p>
            <div class="flex flex-col gap-1">
              <label for="txtCancelReason" class="font-type">Lí do huỷ:</label>
              <input type="text" name="txtCancelReason" id="txtCancelReason" maxlength="255" autofocus
                     value="${fn:escapeXml(reasonText)}"${reasonInvalid ? ' aria-invalid="true"' : ''} aria-describedby="txtCancelReasonHint"
                     class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue aria-invalid:border-2 aria-invalid:border-stamp-red">
              <p id="txtCancelReasonHint" class="m-0 text-sm text-ink-soft">Bắt buộc, tối đa 255 kí tự. Huỷ rồi thì các quyển được trả lại kệ.</p>
            </div>
            <input type="hidden" name="from" value="client">
            <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="submit" name="btnConfirmCancel" id="btnConfirmCancel" formaction="${ctx}/doCancelRentalBill.jsp"
                      class="tt-btn border-stamp-red bg-stamp-red text-paper">Xác nhận</button>
              <button type="submit" name="btnCloseCancel" id="btnCloseCancel" class="tt-btn tt-btn--ghost">Huỷ</button>
            </div>
          </ui:paper-card>
        </section>
      </form>
    </c:if>
  </div>
</t:layout>
