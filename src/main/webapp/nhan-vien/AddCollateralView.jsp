<%--
  AddCollateralView (ch.9 tr.81; docs/contracts.md §9.2). Trang xem, không gọi DAO, không đổi session (giữ nguyên
  listRentalCollateral). "Lưu" gửi tới doAddCollateral.jsp; hiện COLLATERAL_NAME_REQUIRED, COLLATERAL_EXISTS,
  INPUT_TOO_LONG do trang đó đặt, giữ lại các ô vừa nhập (tham số của request được forward). "Quay lại" là <a href>
  về AddRentalCollateralView.
  Đầu trang (phase-07-edge-cases.md §3.1): (1) thiếu rentalBill → 302 SearchRentalBillView; (2) rentalBill không còn
  "Chờ nhận" → forward SearchRentalBillView kèm câu D9. Trang không tự xử lí POST nên không có bước (3);
  doAddCollateral kiểm input ẩn rentalBillId.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Độ dài cột tblCollateral (docs/contracts.md §2). */
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
<t:layout title="Thêm loại tài sản mới">
  <section class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Thêm loại tài sản mới</h1>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="error" text="${pageMessage}"/></c:if>
    <form method="post" action="${base}/AddCollateralView.jsp" class="flex flex-col gap-4">
      <t:csrf/>
      <input type="hidden" name="rentalBillId" value="${billId}">
      <p class="m-0 flex flex-col gap-1">
        <label for="txtName">Tên loại tài sản:</label>
        <input type="text" id="txtName" name="txtName" value="${fn:escapeXml(param.txtName)}" maxlength="100" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 text-ink aria-invalid:border-destructive"${nameInvalid ? ' aria-invalid="true"' : ''}>
      </p>
      <p class="m-0 flex flex-col gap-1">
        <label for="txtDescription">Mô tả:</label>
        <input type="text" id="txtDescription" name="txtDescription" value="${fn:escapeXml(param.txtDescription)}" maxlength="255" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 text-ink aria-invalid:border-destructive"${descriptionInvalid ? ' aria-invalid="true"' : ''}>
      </p>
      <p class="m-0 flex flex-wrap gap-4">
        <button type="submit" id="btnSave" name="btnSave" formaction="${base}/doAddCollateral.jsp" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Lưu</button>
        <a id="lnkBack" href="${base}/AddRentalCollateralView.jsp" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Quay lại</a>
      </p>
    </form>
  </section>
</t:layout>
