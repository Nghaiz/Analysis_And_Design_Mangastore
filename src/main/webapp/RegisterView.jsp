<%--
  RegisterView.jsp, giao diện "Đăng kí tài khoản" (ch.9 tr.57; docs/contracts.md §9.2 RegisterView;
  phase-06-integration.md §3, §6.1 M1). Thứ tự theo images/svg/ui_m1_RegisterView.svg: tiêu đề, 9 ô, nút "Đăng kí".
  - Session R client: chỉ khi doRegister forward về vì đăng kí không thành công (bản nháp id = 0) thì điền lại các ô;
    mở trang bình thường (REQUEST) thì các ô trống. Hai ô mật khẩu luôn trống. DAO: không.
  - Khách đã đăng nhập (client id > 0) mở trang: 302 về ClientHomeView (§6.1 M1).
  - btnRegister gửi tới doRegister.jsp (formaction); form có action về chính trang vì URL trên thanh địa chỉ có thể
    đang là /doRegister.jsp (forward).
  - Câu báo do doRegister đặt (request attribute message, câu của Messages); mọi giá trị in ra đều escape.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true"
         import="vn.tiemtruyen.model.Client" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%
    Object sessionClient = session.getAttribute("client");
    boolean forwarded = request.getDispatcherType() == DispatcherType.FORWARD;
    if (!forwarded && sessionClient instanceof Client current && current.getId() > 0) {
        response.sendRedirect(request.getContextPath() + "/ClientHomeView.jsp");
        return;
    }
    if (forwarded && sessionClient instanceof Client draft && draft.getId() == 0) {
        pageContext.setAttribute("draft", draft);
        pageContext.setAttribute("draftDob", draft.getDob() == null ? "" : draft.getDob().toString());
    }
%>
<t:layout title="Đăng kí tài khoản">
  <section class="mx-auto flex max-w-2xl flex-col gap-6 py-8">
    <h1 class="font-sign text-ink">Đăng kí tài khoản</h1>
    <c:if test="${not empty requestScope.message}"><ui:message-box kind="error" text="${requestScope.message}"/></c:if>
    <form method="post" action="${pageContext.request.contextPath}/RegisterView.jsp" class="tt-worn flex flex-col gap-4 rounded-paper bg-paper p-6 shadow-paper">
      <t:csrf/>
      <div class="grid gap-x-4 gap-y-3 sm:grid-cols-[11rem_1fr] sm:items-center">
        <label for="txtFullName" class="text-ink">Họ và tên:</label>
        <input type="text" id="txtFullName" name="txtFullName" value="${fn:escapeXml(draft.fullName)}" autocomplete="name" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
        <label for="txtDob" class="text-ink">Ngày sinh:</label>
        <input type="date" id="txtDob" name="txtDob" value="${fn:escapeXml(draftDob)}" autocomplete="bday" class="w-full rounded-paper border border-input bg-paper px-3 py-2 font-num text-ink">
        <label for="txtIdCard" class="text-ink">Số CCCD:</label>
        <input type="text" id="txtIdCard" name="txtIdCard" value="${fn:escapeXml(draft.idCard)}" inputmode="numeric" autocomplete="off" class="w-full rounded-paper border border-input bg-paper px-3 py-2 font-num text-ink">
        <label for="txtPhone" class="text-ink">Số điện thoại:</label>
        <input type="tel" id="txtPhone" name="txtPhone" value="${fn:escapeXml(draft.phone)}" autocomplete="tel" class="w-full rounded-paper border border-input bg-paper px-3 py-2 font-num text-ink">
        <label for="txtEmail" class="text-ink">Email:</label>
        <input type="text" id="txtEmail" name="txtEmail" value="${fn:escapeXml(draft.email)}" inputmode="email" autocomplete="email" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
        <label for="txtAddress" class="text-ink">Địa chỉ:</label>
        <input type="text" id="txtAddress" name="txtAddress" value="${fn:escapeXml(draft.address)}" autocomplete="street-address" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
        <label for="txtUsername" class="text-ink">Tên đăng nhập:</label>
        <input type="text" id="txtUsername" name="txtUsername" value="${fn:escapeXml(draft.username)}" autocomplete="username" autocapitalize="none" spellcheck="false" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
        <label for="txtPassword" class="text-ink">Mật khẩu:</label>
        <input type="password" id="txtPassword" name="txtPassword" value="" autocomplete="new-password" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
        <label for="txtConfirmPassword" class="text-ink">Nhập lại mật khẩu:</label>
        <input type="password" id="txtConfirmPassword" name="txtConfirmPassword" value="" autocomplete="new-password" class="w-full rounded-paper border border-input bg-paper px-3 py-2 text-ink">
      </div>
      <p class="flex justify-center">
        <button type="submit" id="btnRegister" name="btnRegister" formaction="${pageContext.request.contextPath}/doRegister.jsp" class="rounded-paper bg-primary px-6 py-2 text-primary-foreground shadow-paper">Đăng kí</button>
      </p>
    </form>
  </section>
</t:layout>
