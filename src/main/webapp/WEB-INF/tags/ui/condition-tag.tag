<%--
  <ui:condition-tag text="${...}"/> : tem tình trạng khi giao (phase-05-ui-contract.md §3, docs/contracts.md §13).
  text là chuỗi đã định dạng theo §13: rỗng hoặc không có → "(chưa ghi nhận)" (.tt-condition-tag--none);
  "Không có lỗi" → --ok; còn lại (tên lỗi nối bằng ", ") → --damaged. Bản React: ConditionTag.tsx.
--%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="text" required="false" %>
<c:choose>
  <c:when test="${empty text}"><span class="tt-condition-tag tt-condition-tag--none">(chưa ghi nhận)</span></c:when>
  <c:when test="${text eq 'Không có lỗi'}"><span class="tt-condition-tag tt-condition-tag--ok">Không có lỗi</span></c:when>
  <c:otherwise><span class="tt-condition-tag tt-condition-tag--damaged"><c:out value="${text}"/></span></c:otherwise>
</c:choose>
