<%--
  <ui:ledger-table caption="Danh sách truyện thuê"> <thead>…</thead><tbody>…</tbody> </ui:ledger-table> : bảng sổ
  (phase-05-ui-contract.md §3). Thân là <thead>/<tbody> thật do trang in. Bản React: LedgerTable.tsx.
  Lớp: table.tt-ledger-table > caption.tt-ledger-table__caption.
--%>
<%@ tag body-content="scriptless" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="caption" required="true" %>
<table class="tt-ledger-table">
  <caption class="tt-ledger-table__caption"><c:out value="${caption}"/></caption>
  <jsp:doBody/>
</table>
