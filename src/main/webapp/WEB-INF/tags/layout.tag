<%--
  <t:layout title="Trang chủ" bodyClass="..."> nội dung </t:layout> : khung trang (phase-05-ui-contract.md §4).

  - title (bắt buộc, tiếng Việt): thẻ <title> = "title · Tiệm thuê truyện tuổi thơ".
  - bodyClass (không bắt buộc): lớp thêm vào <body>, sau "tt-paper".
  - In <!doctype html>, <html lang="vi">, <t:assets/> (CSS và loader island của Vite), đầu trang, thân trang trong
    <main>, chân trang.
  - Đầu trang (phần ngoài báo cáo, giúp đi lại giữa các trang): logo, thanh điều hướng theo vai, tên người đang đăng
    nhập và nút "Đăng xuất" btnLogout (C14) trên mọi trang đã đăng nhập. Vai đọc từ session nếu đã có, không tạo
    session mới: khách (client id > 0), nhân viên (staff), Quản lí thêm mục quản trị (D6), còn lại là khách vãng lai.
    Chỉ đọc session, không gọi DAO, không ghi session. In phiếu: print.css ẩn mọi thứ ngoài phiếu.
  - Preload Fuzzy Bubbles 400 và Momo Trust Sans (variable) (subset latin + vietnamese). URL cố định vì
    fonts.css nạp các file chép nguyên byte từ Fontsource vào frontend/public/fonts/ (Vite phát ra
    /static/fonts/ không đổi tên); check-font-subsets.mjs kiểm từng href dưới đây có file thật.
    Fuzzy Bubbles 700, Momo Signature và Momo Trust Display nạp lười theo font-display: swap.
  - CSP style-src 'self': không <style>, không style=.
  Trang dùng khung phải tự khai <%@ page contentType="text/html; charset=UTF-8" %>.
--%>
<%@ tag body-content="scriptless" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"
        import="vn.tiemtruyen.model.Client, vn.tiemtruyen.model.Staff" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%@ attribute name="title" required="true" %>
<%@ attribute name="bodyClass" required="false" %>
<%
    HttpSession current = request.getSession(false);
    Object clientAttr = current == null ? null : current.getAttribute("client");
    Object staffAttr = current == null ? null : current.getAttribute("staff");
    String role = "guest";
    String userName = null;
    String userRole = null;
    if (clientAttr instanceof Client c && c.getId() > 0) {
        role = "client";
        userName = c.getFullName();
        userRole = "Khách hàng";
    } else if (staffAttr instanceof Staff s) {
        role = Staff.POSITION_MANAGER.equals(s.getPosition()) ? "manager" : "staff";
        userName = s.getFullName();
        userRole = s.getPosition();
    }

    // Mục đang mở của thanh điều hướng, theo đường dẫn trang (sau forward vẫn là trang đích).
    String path = request.getServletPath();
    String section;
    if (path.startsWith("/nhan-vien/quan-tri/")) {
        section = "admin";
    } else if ("/nhan-vien/StaffHomeView.jsp".equals(path) || "/ClientHomeView.jsp".equals(path)
            || "/HomeView.jsp".equals(path)) {
        section = "home";
    } else if ("/nhan-vien/LoginView.jsp".equals(path)) {
        section = "staffLogin";
    } else if (path.startsWith("/nhan-vien/")) {
        section = "process";
    } else if ("/RentalBillListView.jsp".equals(path) || "/RentalBillDetailView.jsp".equals(path)) {
        section = "bills";
    } else if ("/SearchBookView.jsp".equals(path) || "/BookDetailView.jsp".equals(path)
            || "/ConfirmRentalBillView.jsp".equals(path)) {
        section = "search";
    } else if ("/LoginView.jsp".equals(path)) {
        section = "login";
    } else if ("/RegisterView.jsp".equals(path)) {
        section = "register";
    } else {
        section = "";
    }

    jspContext.setAttribute("navRole", role);
    jspContext.setAttribute("navSection", section);
    jspContext.setAttribute("navUserName", userName);
    jspContext.setAttribute("navUserRole", userRole);
%>
<c:set var="ctx" value="${pageContext.request.contextPath}"/>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fn:escapeXml(title)} · Tiệm thuê truyện tuổi thơ</title>
  <link rel="icon" href="${ctx}/static/img/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${ctx}/static/fonts/fuzzy-bubbles-vietnamese-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${ctx}/static/fonts/fuzzy-bubbles-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${ctx}/static/fonts/momo-trust-sans-vietnamese-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${ctx}/static/fonts/momo-trust-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <t:assets/>
</head>
<body class="tt-paper tt-shell${empty bodyClass ? '' : ' '}${fn:escapeXml(bodyClass)}">
  <a href="#noi-dung" class="tt-skip-link">Bỏ qua thanh điều hướng</a>
  <header class="tt-site-header">
    <div class="tt-site-header__inner">
      <c:choose>
        <c:when test="${navRole eq 'client'}"><c:set var="brandHref" value="${ctx}/ClientHomeView.jsp"/></c:when>
        <c:when test="${navRole eq 'staff' or navRole eq 'manager'}"><c:set var="brandHref" value="${ctx}/nhan-vien/StaffHomeView.jsp"/></c:when>
        <c:otherwise><c:set var="brandHref" value="${ctx}/HomeView.jsp"/></c:otherwise>
      </c:choose>
      <a href="${brandHref}" class="tt-brand">
        <img src="${ctx}/static/img/logo-tiem.svg" alt="" width="40" height="40" class="tt-brand__logo">
        <span class="tt-brand__text">
          <span class="tt-brand__name">Tiệm thuê truyện</span>
          <span class="tt-brand__tag">tuổi thơ<c:if test="${navRole eq 'staff' or navRole eq 'manager'}"> · quầy nhân viên</c:if></span>
        </span>
      </a>

      <nav class="tt-nav" aria-label="Điều hướng chính">
        <ul class="tt-nav__list">
          <c:choose>
            <c:when test="${navRole eq 'client'}">
              <li><a href="${ctx}/ClientHomeView.jsp" class="tt-nav__link${navSection eq 'home' ? ' tt-nav__link--active' : ''}"${navSection eq 'home' ? ' aria-current="page"' : ''}>Trang chủ</a></li>
              <li><a href="${ctx}/SearchBookView.jsp?moi=1" class="tt-nav__link${navSection eq 'search' ? ' tt-nav__link--active' : ''}"${navSection eq 'search' ? ' aria-current="page"' : ''}>Tìm truyện</a></li>
              <li><a href="${ctx}/RentalBillListView.jsp" class="tt-nav__link${navSection eq 'bills' ? ' tt-nav__link--active' : ''}"${navSection eq 'bills' ? ' aria-current="page"' : ''}>Phiếu mượn</a></li>
            </c:when>
            <c:when test="${navRole eq 'staff' or navRole eq 'manager'}">
              <li><a href="${ctx}/nhan-vien/StaffHomeView.jsp" class="tt-nav__link${navSection eq 'home' ? ' tt-nav__link--active' : ''}"${navSection eq 'home' ? ' aria-current="page"' : ''}>Trang chủ</a></li>
              <li><a href="${ctx}/nhan-vien/SearchRentalBillView.jsp" class="tt-nav__link${navSection eq 'process' ? ' tt-nav__link--active' : ''}"${navSection eq 'process' ? ' aria-current="page"' : ''}>Xử lí phiếu</a></li>
              <c:if test="${navRole eq 'manager'}">
                <li><a href="${ctx}/nhan-vien/quan-tri/ManageBookView.jsp" class="tt-nav__link${navSection eq 'admin' ? ' tt-nav__link--active' : ''}"${navSection eq 'admin' ? ' aria-current="page"' : ''}>Quản trị</a></li>
              </c:if>
            </c:when>
            <c:otherwise>
              <li><a href="${ctx}/HomeView.jsp" class="tt-nav__link${navSection eq 'home' ? ' tt-nav__link--active' : ''}"${navSection eq 'home' ? ' aria-current="page"' : ''}>Trang chủ</a></li>
              <li><a href="${ctx}/LoginView.jsp" class="tt-nav__link${navSection eq 'login' ? ' tt-nav__link--active' : ''}"${navSection eq 'login' ? ' aria-current="page"' : ''}>Đăng nhập</a></li>
              <li><a href="${ctx}/RegisterView.jsp" class="tt-nav__link${navSection eq 'register' ? ' tt-nav__link--active' : ''}"${navSection eq 'register' ? ' aria-current="page"' : ''}>Đăng kí</a></li>
            </c:otherwise>
          </c:choose>
        </ul>
      </nav>

      <div class="tt-site-header__user">
        <c:choose>
          <c:when test="${navRole eq 'guest'}">
            <a href="${ctx}/nhan-vien/LoginView.jsp" class="tt-btn tt-btn--ghost tt-btn--sm${navSection eq 'staffLogin' ? ' tt-nav__link--active' : ''}"${navSection eq 'staffLogin' ? ' aria-current="page"' : ''}>Nhân viên</a>
          </c:when>
          <c:otherwise>
            <span class="tt-user">
              <span class="tt-user__avatar" aria-hidden="true">${fn:escapeXml(fn:substring(navUserName, 0, 1))}</span>
              <span class="tt-user__text">
                <span class="tt-user__name"><c:out value="${navUserName}"/></span>
                <span class="tt-user__role"><c:out value="${navUserRole}"/></span>
              </span>
            </span>
            <%-- C14: đăng xuất (phần ngoài báo cáo, chủ dự án duyệt 11/11/2026), doLogout.jsp dùng chung hai vai. --%>
            <form method="post" action="${ctx}/doLogout.jsp" class="tt-logout">
              <t:csrf/>
              <button type="submit" id="btnLogout" name="btnLogout" value="" class="tt-btn tt-btn--ghost tt-btn--sm">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
                <span>Đăng xuất</span>
              </button>
            </form>
          </c:otherwise>
        </c:choose>
      </div>
    </div>
  </header>

  <main id="noi-dung" class="tt-main">
    <jsp:doBody/>
  </main>

  <footer class="tt-site-footer">
    <div class="tt-site-footer__inner">
      <p class="tt-site-footer__brand">Tiệm thuê truyện tuổi thơ</p>
      <p class="tt-site-footer__note">Chọn truyện trên mạng, đến quầy nhận truyện.</p>
    </div>
  </footer>
</body>
</html>
