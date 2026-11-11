<%--
  <ui:paper-card heading="Truyện đã chọn" taped="true"> nội dung </ui:paper-card> : thẻ giấy
  (phase-05-ui-contract.md §3). heading có thể trống (không in tiêu đề); taped = có băng dính góc trên.
  Bản React: PaperCard.tsx. Lớp: .tt-paper-card (+ --taped) > .tt-paper-card__heading, .tt-paper-card__body.
--%>
<%@ tag body-content="scriptless" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="heading" required="false" %>
<%@ attribute name="taped" required="false" type="java.lang.Boolean" %>
<section class="tt-paper-card${taped ? ' tt-paper-card--taped' : ''}">
  <c:if test="${not empty heading}"><h3 class="tt-paper-card__heading"><c:out value="${heading}"/></h3></c:if>
  <div class="tt-paper-card__body"><jsp:doBody/></div>
</section>
