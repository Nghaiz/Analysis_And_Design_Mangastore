<%--
  ConfirmRentalBillView (ch.9 tr.65–66; docs/contracts.md §9.2, §13, C3). Trang xem, không gọi DAO.
  - Session R: rentalBill (SearchBookView điền listRentedBook khi "Tạo phiếu mượn"). Phiếu chưa có dòng nào thì về
    SearchBookView.
  - Không ghi session (C3). Các ô txtExpectedDays, txtExpectedPickupAt, txtNote lấy từ tham số của request: mọi POST
    REQUEST tới trang (đổi số ngày qua data-submit-on-change, hay nút btnRecalculate trong noscript) là một lần tính
    lại; request forward từ doAddRentalBill (EXPECTED_DAYS_INVALID, PICKUP_TIME_INVALID, NOT_ENOUGH_COPIES) giữ
    nguyên các ô đã nhập. btnConfirm gửi tới doAddRentalBill.jsp (formaction).
  - Tổng tiền một dòng = giá × số quyển × số ngày (C3: số ngày = txtExpectedDays vì phiếu chưa có borrowDate,
    dueDate); tổng tiền thuê = tổng các dòng − giảm giá (luôn 0đ ở đây). Số ngày chưa hợp lệ: tổng hiện "…".
  - id cho smoke: totalCopies, discount, totalRentalPrice (chỉ chứa giá trị đã định dạng).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, java.math.BigInteger, java.text.Normalizer, java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map" %>
<%@ page import="vn.tiemtruyen.model.Book, vn.tiemtruyen.model.Client, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook" %>
<%@ page import="vn.tiemtruyen.util.Display, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Độ dài cột tblRentalBill.note (docs/contracts.md §2); dài hơn thì INPUT_TOO_LONG và ô aria-invalid (§10.3). */
    private static final int NOTE_MAX = 255;
%>
<%
    String ctx = request.getContextPath();
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null || rentalBill.getId() != 0 || rentalBill.getListRentedBook().isEmpty()) {
        response.sendRedirect(ctx + "/SearchBookView.jsp");
        return;
    }
    String message = (String) request.getAttribute("message");

    String daysText = request.getParameter("txtExpectedDays") == null ? "" : request.getParameter("txtExpectedDays").strip();
    String pickupText = request.getParameter("txtExpectedPickupAt") == null ? "" : request.getParameter("txtExpectedPickupAt").strip();
    String noteText = request.getParameter("txtNote") == null ? "" : request.getParameter("txtNote");
    // Cùng luật với doAddRentalBill (C15): chuỗi chữ số từ 1 tới RentalBill.MAX_EXPECTED_DAYS.
    Integer days = null;
    String daysError = null;
    if (!daysText.matches("[0-9]+") || new BigInteger(daysText).signum() == 0) {
        daysError = Messages.EXPECTED_DAYS_INVALID;
    } else if (new BigInteger(daysText).compareTo(BigInteger.valueOf(RentalBill.MAX_EXPECTED_DAYS)) > 0) {
        daysError = Messages.EXPECTED_DAYS_TOO_LONG;
    } else {
        days = Integer.valueOf(daysText);
    }
    String noteNormalized = Normalizer.normalize(noteText, Normalizer.Form.NFC).strip();
    boolean noteTooLong = noteNormalized.codePointCount(0, noteNormalized.length()) > NOTE_MAX;
    boolean recalculating = "POST".equals(request.getMethod()) && request.getDispatcherType() == DispatcherType.REQUEST;
    if (recalculating && message == null) {
        // Lần tính lại: ô số ngày đã nhập mà sai, hay ghi chú quá dài, thì báo ngay (không ghi session, C3).
        if (!daysText.isEmpty() && daysError != null) {
            message = daysError;
        } else if (noteTooLong) {
            message = Messages.INPUT_TOO_LONG;
        }
    }
    boolean daysInvalid = Messages.EXPECTED_DAYS_INVALID.equals(message) || Messages.EXPECTED_DAYS_TOO_LONG.equals(message)
            || (!daysText.isEmpty() && daysError != null);
    boolean pickupInvalid = Messages.PICKUP_TIME_INVALID.equals(message);
    boolean noteInvalid = noteTooLong;

    // Gộp dòng phiếu theo đầu truyện, thứ tự như trong danh sách (§9.2).
    Map<Integer, Map<String, Object>> grouped = new LinkedHashMap<>();
    double linesTotal = 0;
    for (RentedBook row : rentalBill.getListRentedBook()) {
        Book b = row.getBookCopy().getBook();
        Map<String, Object> r = grouped.get(b.getId());
        if (r == null) {
            r = new LinkedHashMap<>();
            r.put("name", b.getName());
            r.put("author", b.getAuthor());
            r.put("price", Display.money(row.getRentalPrice()));
            r.put("quantity", 0);
            r.put("amount", 0d);
            grouped.put(b.getId(), r);
        }
        r.put("quantity", (Integer) r.get("quantity") + 1);
        if (days != null) {
            double amount = (double) row.getRentalPrice() * days;
            r.put("amount", (Double) r.get("amount") + amount);
            linesTotal += amount;
        }
    }
    String pending = "…";
    List<Map<String, Object>> rows = new ArrayList<>(grouped.values());
    for (Map<String, Object> r : rows) {
        r.put("total", days == null ? pending : Display.money((Double) r.get("amount")));
    }

    Client client = rentalBill.getClient();
    pageContext.setAttribute("ctx", ctx);
    pageContext.setAttribute("message", message);
    pageContext.setAttribute("fullName", client.getFullName());
    pageContext.setAttribute("phone", client.getPhone());
    pageContext.setAttribute("idCard", client.getIdCard());
    pageContext.setAttribute("email", client.getEmail());
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("daysText", daysText);
    pageContext.setAttribute("pickupText", pickupText);
    pageContext.setAttribute("noteText", noteText);
    pageContext.setAttribute("daysInvalid", daysInvalid);
    pageContext.setAttribute("pickupInvalid", pickupInvalid);
    pageContext.setAttribute("noteInvalid", noteInvalid);
    pageContext.setAttribute("totalCopies", rentalBill.getListRentedBook().size());
    pageContext.setAttribute("discount", Display.money(rentalBill.getDiscount()));
    pageContext.setAttribute("totalRentalPrice", days == null ? pending : Display.money(linesTotal - rentalBill.getDiscount()));
%>
<t:layout title="Xác nhận phiếu mượn">
  <div class="mx-auto flex w-full max-w-160 flex-col gap-6">
    <header class="flex flex-col gap-1">
      <nav aria-label="Đường dẫn" class="text-sm">
        <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 p-0 text-ink-soft">
          <li><a href="${ctx}/SearchBookView.jsp">Tìm truyện</a></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page">Xác nhận phiếu mượn</li>
        </ol>
      </nav>
      <h1 class="m-0">Xác nhận phiếu mượn</h1>
      <p class="m-0 text-ink-soft">Kiểm lại thông tin và các đầu truyện, nhập số ngày thuê và lúc bạn đến nhận rồi bấm "Xác nhận". Tiệm giữ các quyển này cho bạn đến khi nhận tại quầy.</p>
    </header>

    <c:if test="${not empty message}">
      <div><ui:message-box kind="error" text="${message}"/></div>
    </c:if>

    <form method="post" action="${ctx}/ConfirmRentalBillView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <ui:ticket title="PHIẾU MƯỢN">
        <dl class="m-0 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div><dt class="inline font-type text-ink-soft">Họ và tên:</dt> <dd class="m-0 inline"><c:out value="${fullName}"/></dd></div>
          <div><dt class="inline font-type text-ink-soft">Số điện thoại:</dt> <dd class="m-0 inline font-num"><c:out value="${phone}"/></dd></div>
          <div><dt class="inline font-type text-ink-soft">Số CCCD:</dt> <dd class="m-0 inline font-num"><c:out value="${idCard}"/></dd></div>
          <div class="min-w-0 break-words"><dt class="inline font-type text-ink-soft">Email:</dt> <dd class="m-0 inline"><c:out value="${email}"/></dd></div>
        </dl>

        <div class="mt-5 overflow-x-auto">
          <table class="tt-ledger-table" id="tblRentedBook">
            <caption class="tt-ledger-table__caption">Danh sách các đầu truyện đã chọn:</caption>
            <thead>
              <tr>
                <th scope="col">Tên đầu truyện</th>
                <th scope="col">Tác giả</th>
                <th scope="col">Giá thuê theo ngày</th>
                <th scope="col">Số lượng</th>
                <th scope="col">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="r" items="${rows}">
                <tr>
                  <td><c:out value="${r.name}"/></td>
                  <td><c:out value="${r.author}"/></td>
                  <td class="font-num whitespace-nowrap"><c:out value="${r.price}"/></td>
                  <td class="font-num"><c:out value="${r.quantity}"/></td>
                  <td class="font-num whitespace-nowrap"><c:out value="${r.total}"/></td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>

        <fieldset class="m-0 mt-5 min-w-0 border border-dashed border-ink-soft p-4">
          <legend class="tt-tape font-type text-ink">Thông tin nhận truyện</legend>
          <div class="mt-2 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label for="txtExpectedDays" class="font-type">Số ngày thuê dự kiến:</label>
              <div class="flex flex-wrap items-center gap-2">
                <input type="number" name="txtExpectedDays" id="txtExpectedDays" inputmode="numeric"
                       value="${fn:escapeXml(daysText)}" data-submit-on-change${daysInvalid ? ' aria-invalid="true"' : ''} aria-describedby="txtExpectedDaysHint"
                       class="w-28 rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue aria-invalid:border-2 aria-invalid:border-stamp-red font-num">
                <noscript>
                  <button type="submit" name="btnRecalculate" id="btnRecalculate" class="tt-btn tt-btn--ghost tt-btn--sm">Tính lại</button>
                </noscript>
              </div>
              <p id="txtExpectedDaysHint" class="m-0 text-sm text-ink-soft">Từ 1 tới 30 ngày. Đổi số ngày thì tổng tiền được tính lại.</p>
            </div>
            <div class="flex flex-col gap-1">
              <label for="txtExpectedPickupAt" class="font-type">Ngày giờ dự kiến đến nhận:</label>
              <input type="datetime-local" name="txtExpectedPickupAt" id="txtExpectedPickupAt"
                     value="${fn:escapeXml(pickupText)}"${pickupInvalid ? ' aria-invalid="true"' : ''} aria-describedby="txtExpectedPickupAtHint"
                     class="w-full max-w-xs rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue aria-invalid:border-2 aria-invalid:border-stamp-red font-num">
              <p id="txtExpectedPickupAtHint" class="m-0 text-sm text-ink-soft">Chọn một thời điểm sau bây giờ.</p>
            </div>
            <div class="flex flex-col gap-1 sm:col-span-2">
              <label for="txtNote" class="font-type">Ghi chú:</label>
              <input type="text" name="txtNote" id="txtNote" maxlength="255" value="${fn:escapeXml(noteText)}"${noteInvalid ? ' aria-invalid="true"' : ''} aria-describedby="txtNoteHint"
                     class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue aria-invalid:border-2 aria-invalid:border-stamp-red">
              <p id="txtNoteHint" class="m-0 text-sm text-ink-soft">Không bắt buộc, tối đa 255 kí tự.</p>
            </div>
          </div>
        </fieldset>

        <dl class="m-0 mt-5 ml-auto grid w-full max-w-sm gap-y-1 border-t-2 border-double border-ink-soft pt-3">
          <div class="flex items-baseline justify-between gap-4"><dt class="font-type text-ink-soft">Tổng số quyển:</dt> <dd class="m-0 font-num" id="totalCopies"><c:out value="${totalCopies}"/></dd></div>
          <div class="flex items-baseline justify-between gap-4"><dt class="font-type text-ink-soft">Giảm giá:</dt> <dd class="m-0 font-num" id="discount"><c:out value="${discount}"/></dd></div>
          <div class="flex items-baseline justify-between gap-4"><dt class="font-type text-ink">Tổng tiền thuê:</dt> <dd class="m-0 font-num text-xl font-bold text-stamp-red" id="totalRentalPrice"><c:out value="${totalRentalPrice}"/></dd></div>
        </dl>
      </ui:ticket>

      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="submit" name="btnConfirm" id="btnConfirm" formaction="${ctx}/doAddRentalBill.jsp" class="tt-btn tt-btn--primary">Xác nhận</button>
        <a href="${ctx}/SearchBookView.jsp" id="lnkBack" class="tt-btn tt-btn--ghost">Quay lại</a>
      </div>
    </form>
  </div>
</t:layout>
