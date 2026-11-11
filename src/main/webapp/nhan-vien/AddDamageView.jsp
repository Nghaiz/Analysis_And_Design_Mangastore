<%--
  AddDamageView (ch.9 tr.78–79; docs/contracts.md §9.2). Trang xem, không gọi DAO, không đổi session (giữ nguyên
  rentedBook). "Lưu" gửi tới doAddDamage.jsp; hiện DAMAGE_NAME_REQUIRED, DAMAGE_EXISTS, INPUT_TOO_LONG do trang đó
  đặt, giữ lại các ô vừa nhập (tham số của request được forward). "Quay lại" là <a href> về AddConditionView.
  Đầu trang (phase-07-edge-cases.md §3.1): (1) thiếu rentalBill → 302 SearchRentalBillView, thiếu rentedBook → 302
  ProcessRentalBillView; (2) rentalBill không còn "Chờ nhận" → forward SearchRentalBillView kèm câu D9.
  Trang không tự xử lí POST nên không có bước (3); doAddDamage kiểm input ẩn rentalBillId.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Độ dài cột tblDamage (docs/contracts.md §2). */
    private static final int NAME_MAX = 100;
    private static final int DESCRIPTION_MAX = 255;

    private static int trimmedLength(String value) {
        return value == null ? 0 : value.strip().length();
    }
%>
<%
    String base = request.getContextPath() + "/nhan-vien";
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null) {
        response.sendRedirect(base + "/SearchRentalBillView.jsp");
        return;
    }
    if (session.getAttribute("rentedBook") == null) {
        response.sendRedirect(base + "/ProcessRentalBillView.jsp");
        return;
    }
    if (!RentalBill.STATUS_PENDING.equals(rentalBill.getStatus())) {
        request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(rentalBill.getStatus())
                ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
        request.getRequestDispatcher("/nhan-vien/SearchRentalBillView.jsp").forward(request, response);
        return;
    }
    String message = (String) request.getAttribute("message");
    boolean tooLong = Messages.INPUT_TOO_LONG.equals(message);
    pageContext.setAttribute("base", base);
    pageContext.setAttribute("billId", rentalBill.getId());
    pageContext.setAttribute("pageMessage", message);
    pageContext.setAttribute("nameInvalid", message != null
            && (!tooLong || trimmedLength(request.getParameter("txtName")) > NAME_MAX));
    pageContext.setAttribute("descriptionInvalid", tooLong
            && trimmedLength(request.getParameter("txtDescription")) > DESCRIPTION_MAX);
%>
<t:layout title="Thêm lỗi mới">
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <header class="flex flex-col gap-2 border-b border-dashed border-ink-soft pb-4">
      <nav aria-label="Đường dẫn" class="text-sm text-ink-soft">
        <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
          <li><a href="${base}/StaffHomeView.jsp">Trang chủ nhân viên</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/SearchRentalBillView.jsp">Tìm phiếu mượn</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/ProcessRentalBillView.jsp">Xử lí phiếu mượn</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/AddConditionView.jsp">Thêm tình trạng truyện</a></li>
          <li aria-current="page" class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>Thêm lỗi mới</li>
        </ol>
      </nav>
      <h1 class="m-0">Thêm lỗi mới</h1>
      <p class="m-0 max-w-3xl text-ink-soft">Thêm một loại lỗi chưa có vào danh mục của tiệm. Lưu xong, lỗi mới được ghi nhận luôn cho quyển đang kiểm và trang quay về Thêm tình trạng truyện.</p>
    </header>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="error" text="${pageMessage}"/></c:if>
    <form method="post" action="${base}/AddDamageView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <input type="hidden" name="rentalBillId" value="${billId}">
      <div class="tt-paper-card tt-paper-card--taped grid gap-5">
        <div class="grid gap-1">
          <label for="txtName">Tên lỗi:</label>
          <input type="text" id="txtName" name="txtName" value="${fn:escapeXml(param.txtName)}" maxlength="100" aria-describedby="txtName-hint" class="h-11 w-full min-w-0 rounded-paper border border-input bg-paper px-3 text-ink aria-invalid:border-destructive"${nameInvalid ? ' aria-invalid="true"' : ''}>
          <p id="txtName-hint" class="m-0 text-sm text-ink-soft">Bắt buộc, tối đa 100 kí tự, không trùng tên lỗi đã có.</p>
        </div>
        <div class="grid gap-1">
          <label for="txtDescription">Mô tả:</label>
          <input type="text" id="txtDescription" name="txtDescription" value="${fn:escapeXml(param.txtDescription)}" maxlength="255" aria-describedby="txtDescription-hint" class="h-11 w-full min-w-0 rounded-paper border border-input bg-paper px-3 text-ink aria-invalid:border-destructive"${descriptionInvalid ? ' aria-invalid="true"' : ''}>
          <p id="txtDescription-hint" class="m-0 text-sm text-ink-soft">Không bắt buộc, tối đa 255 kí tự.</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-3 border-t border-dashed border-ink-soft pt-4">
        <button type="submit" id="btnSave" name="btnSave" formaction="${base}/doAddDamage.jsp" class="tt-btn tt-btn--primary"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>Lưu</span></button>
        <a id="lnkBack" href="${base}/AddConditionView.jsp" class="tt-btn tt-btn--ghost"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg><span>Quay lại</span></a>
      </div>
    </form>
  </div>
</t:layout>
