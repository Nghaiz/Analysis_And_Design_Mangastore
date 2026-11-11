<%--
  <ui:ticket title="Phiếu mượn" code="PM0125"> thân phiếu </ui:ticket> : phiếu xé từ sổ
  (phase-05-ui-contract.md §3). code có thể trống (không in ô số phiếu). Bản React: components/nostalgia/Ticket.tsx.
  Cây thẻ (hợp đồng §3a): article.tt-ticket > div.tt-ticket__perf[aria-hidden], header.tt-ticket__head > h2.tt-ticket__title + span.tt-ticket__code; div.tt-ticket__body.
  Lớp: .tt-ticket > .tt-ticket__perf, .tt-ticket__head > (.tt-ticket__title, .tt-ticket__code), .tt-ticket__body.
--%>
<%@ tag body-content="scriptless" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="title" required="true" %>
<%@ attribute name="code" required="false" %>
<article class="tt-ticket">
  <div class="tt-ticket__perf" aria-hidden="true"></div>
  <header class="tt-ticket__head">
    <h2 class="tt-ticket__title"><c:out value="${title}"/></h2>
    <c:if test="${not empty code}"><span class="tt-ticket__code"><c:out value="${code}"/></span></c:if>
  </header>
  <div class="tt-ticket__body"><jsp:doBody/></div>
</article>
