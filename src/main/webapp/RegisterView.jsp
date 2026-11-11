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
  <div class="mx-auto flex max-w-3xl flex-col gap-6 py-4">
    <header class="flex flex-col gap-1">
      <p class="tt-hero__eyebrow">Làm thẻ thành viên của tiệm</p>
      <h1 class="m-0">Đăng kí tài khoản</h1>
      <p class="m-0 text-ink-soft">Điền đủ các ô bên dưới. Số CCCD, số điện thoại, email và tên đăng nhập chỉ dùng được cho một tài khoản.</p>
    </header>
    <c:if test="${not empty requestScope.message}"><ui:message-box kind="error" text="${requestScope.message}"/></c:if>
    <form method="post" action="${pageContext.request.contextPath}/RegisterView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <fieldset class="tt-paper-card tt-worn m-0 min-w-0">
        <legend class="tt-tape font-type text-ink">Thông tin cá nhân</legend>
        <div class="mt-2 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label for="txtFullName" class="font-type text-ink">Họ và tên:</label>
            <input type="text" id="txtFullName" name="txtFullName" value="${fn:escapeXml(draft.fullName)}" autocomplete="name" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
          </div>
          <div class="flex flex-col gap-1">
            <label for="txtDob" class="font-type text-ink">Ngày sinh:</label>
            <input type="date" id="txtDob" name="txtDob" value="${fn:escapeXml(draftDob)}" autocomplete="bday" aria-describedby="txtDobHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue font-num">
            <p id="txtDobHint" class="m-0 text-sm text-ink-soft">Một ngày trước hôm nay.</p>
          </div>
          <div class="flex flex-col gap-1">
            <label for="txtIdCard" class="font-type text-ink">Số CCCD:</label>
            <input type="text" id="txtIdCard" name="txtIdCard" value="${fn:escapeXml(draft.idCard)}" inputmode="numeric" autocomplete="off" aria-describedby="txtIdCardHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue font-num">
            <p id="txtIdCardHint" class="m-0 text-sm text-ink-soft">Đủ 12 chữ số, như trên thẻ căn cước.</p>
          </div>
          <div class="flex flex-col gap-1">
            <label for="txtPhone" class="font-type text-ink">Số điện thoại:</label>
            <input type="tel" id="txtPhone" name="txtPhone" value="${fn:escapeXml(draft.phone)}" autocomplete="tel" aria-describedby="txtPhoneHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue font-num">
            <p id="txtPhoneHint" class="m-0 text-sm text-ink-soft">10 chữ số, bắt đầu bằng 0.</p>
          </div>
          <div class="flex flex-col gap-1">
            <label for="txtEmail" class="font-type text-ink">Email:</label>
            <input type="text" id="txtEmail" name="txtEmail" value="${fn:escapeXml(draft.email)}" inputmode="email" autocomplete="email" aria-describedby="txtEmailHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
            <p id="txtEmailHint" class="m-0 text-sm text-ink-soft">Ví dụ: ten@gmail.com</p>
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label for="txtAddress" class="font-type text-ink">Địa chỉ:</label>
            <input type="text" id="txtAddress" name="txtAddress" value="${fn:escapeXml(draft.address)}" autocomplete="street-address" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
          </div>
        </div>
      </fieldset>
      <fieldset class="tt-paper-card tt-worn m-0 min-w-0">
        <legend class="tt-tape font-type text-ink">Tài khoản đăng nhập</legend>
        <div class="mt-2 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label for="txtUsername" class="font-type text-ink">Tên đăng nhập:</label>
            <input type="text" id="txtUsername" name="txtUsername" value="${fn:escapeXml(draft.username)}" autocomplete="username" autocapitalize="none" spellcheck="false" aria-describedby="txtUsernameHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
            <p id="txtUsernameHint" class="m-0 text-sm text-ink-soft">Tối đa 50 kí tự, không có khoảng trắng.</p>
          </div>
          <div class="flex flex-col gap-1">
            <label for="txtPassword" class="font-type text-ink">Mật khẩu:</label>
            <input type="password" id="txtPassword" name="txtPassword" value="" autocomplete="new-password" aria-describedby="txtPasswordHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
            <p id="txtPasswordHint" class="m-0 text-sm text-ink-soft">Không để trống, tối đa 128 kí tự.</p>
          </div>
          <div class="flex flex-col gap-1">
            <label for="txtConfirmPassword" class="font-type text-ink">Nhập lại mật khẩu:</label>
            <input type="password" id="txtConfirmPassword" name="txtConfirmPassword" value="" autocomplete="new-password" aria-describedby="txtConfirmPasswordHint" class="w-full rounded-paper border border-ink-soft bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-pen-blue">
            <p id="txtConfirmPasswordHint" class="m-0 text-sm text-ink-soft">Gõ lại đúng mật khẩu vừa nhập.</p>
          </div>
        </div>
      </fieldset>
      <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="submit" id="btnRegister" name="btnRegister" formaction="${pageContext.request.contextPath}/doRegister.jsp" class="tt-btn tt-btn--primary">Đăng kí</button>
        <p class="m-0 text-ink-soft">Đã có tài khoản? <a href="${pageContext.request.contextPath}/LoginView.jsp">Đăng nhập tại đây</a></p>
      </div>
    </form>
  </div>
</t:layout>
