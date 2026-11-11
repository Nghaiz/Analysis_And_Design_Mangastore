<%--
  <t:csrf/> : input ẩn mang token CSRF, đặt trong mọi <form method="post"> (docs/contracts.md §8).
  Token nằm ở thuộc tính session kĩ thuật "csrfToken" do CsrfFilter tạo trước khi trang chạy
  (plans/261111-tiem-thue-truyen/phase-06-integration.md §2). Trang không tự đọc hay đổi token.
--%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<input type="hidden" name="csrf" value="${fn:escapeXml(sessionScope.csrfToken)}">
