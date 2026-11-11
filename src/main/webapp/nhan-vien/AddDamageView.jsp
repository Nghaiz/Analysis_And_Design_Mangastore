<%--
  AddDamageView (ch.9 tr.78–79; docs/contracts.md §9.2). Trang xem, không gọi DAO, không đọc session (giữ nguyên
  rentedBook). "Lưu" gửi tới doAddDamage.jsp; hiện DAMAGE_NAME_REQUIRED, DAMAGE_EXISTS do trang đó đặt, giữ lại
  các ô vừa nhập (tham số của request được forward). "Quay lại" là <a href> về AddConditionView.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<% pageContext.setAttribute("base", request.getContextPath() + "/nhan-vien"); %>
<t:layout title="Thêm lỗi mới">
  <section class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Thêm lỗi mới</h1>
    <c:if test="${not empty message}"><ui:message-box kind="error" text="${message}"/></c:if>
    <form method="post" action="${base}/AddDamageView.jsp" class="flex flex-col gap-4">
      <t:csrf/>
      <p class="m-0 flex flex-col gap-1">
        <label for="txtName">Tên lỗi:</label>
        <input type="text" id="txtName" name="txtName" value="${fn:escapeXml(param.txtName)}" maxlength="100" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 text-ink aria-invalid:border-destructive"${not empty message ? ' aria-invalid="true"' : ''}>
      </p>
      <p class="m-0 flex flex-col gap-1">
        <label for="txtDescription">Mô tả:</label>
        <input type="text" id="txtDescription" name="txtDescription" value="${fn:escapeXml(param.txtDescription)}" maxlength="255" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 text-ink">
      </p>
      <p class="m-0 flex flex-wrap gap-4">
        <button type="submit" id="btnSave" name="btnSave" formaction="${base}/doAddDamage.jsp" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Lưu</button>
        <a id="lnkBack" href="${base}/AddConditionView.jsp" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Quay lại</a>
      </p>
    </form>
  </section>
</t:layout>
