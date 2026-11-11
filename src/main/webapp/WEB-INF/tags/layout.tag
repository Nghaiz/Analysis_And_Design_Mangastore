<%--
  <t:layout title="Trang chủ" bodyClass="..."> nội dung </t:layout> : khung trang (phase-05-ui-contract.md §4).

  - title (bắt buộc, tiếng Việt): thẻ <title> = "title · Tiệm thuê truyện tuổi thơ".
  - bodyClass (không bắt buộc): lớp thêm vào <body>, sau "tt-paper".
  - In <!doctype html>, <html lang="vi">, <t:assets/> (CSS và loader island của Vite), thân trang trong <main>.
  - Preload Fuzzy Bubbles 400 và Momo Trust Sans (variable) (subset latin + vietnamese). URL cố định vì
    fonts.css nạp các file chép nguyên byte từ Fontsource vào frontend/public/fonts/ (Vite phát ra
    /static/fonts/ không đổi tên); check-font-subsets.mjs kiểm từng href dưới đây có file thật.
    Fuzzy Bubbles 700, Momo Signature và Momo Trust Display nạp lười theo font-display: swap.
  - CSP style-src 'self': không <style>, không style=.
  Trang dùng khung phải tự khai <%@ page contentType="text/html; charset=UTF-8" %>.
--%>
<%@ tag body-content="scriptless" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%@ attribute name="title" required="true" %>
<%@ attribute name="bodyClass" required="false" %>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fn:escapeXml(title)} · Tiệm thuê truyện tuổi thơ</title>
  <link rel="icon" href="${pageContext.request.contextPath}/static/img/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${pageContext.request.contextPath}/static/fonts/fuzzy-bubbles-vietnamese-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${pageContext.request.contextPath}/static/fonts/fuzzy-bubbles-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${pageContext.request.contextPath}/static/fonts/momo-trust-sans-vietnamese-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${pageContext.request.contextPath}/static/fonts/momo-trust-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <t:assets/>
</head>
<body class="tt-paper${empty bodyClass ? '' : ' '}${fn:escapeXml(bodyClass)}">
  <main class="tt-main">
    <jsp:doBody/>
  </main>
</body>
</html>
