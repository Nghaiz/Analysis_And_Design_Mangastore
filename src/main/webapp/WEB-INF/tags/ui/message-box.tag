<%--
  <ui:message-box kind="error" text="${Messages.LOGIN_FAILED}"/> : hộp thông báo câu nguyên văn
  (phase-05-ui-contract.md §3, docs/contracts.md §10). Tag không thêm, không sửa chữ của text.
  kind: success | info (role="status") hoặc error (role="alert"); giá trị khác ném IllegalArgumentException.
  Bản React: MessageBox.tsx. Lớp: .tt-message-box + --success / --error / --info.
--%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="kind" required="true" %>
<%@ attribute name="text" required="true" %>
<%
    String kind = (String) jspContext.getAttribute("kind");
    if (!"success".equals(kind) && !"error".equals(kind) && !"info".equals(kind)) {
        throw new IllegalArgumentException("<ui:message-box> kind phải là success, error hoặc info, đang là \""
                + kind + "\"");
    }
%>
<p class="tt-message-box tt-message-box--${kind}" role="${kind eq 'error' ? 'alert' : 'status'}"><c:out value="${text}"/></p>
