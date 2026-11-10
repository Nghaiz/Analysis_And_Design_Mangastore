<%--
  Trang công cụ kiểm session Redis (contract.md §10, tiêu chí 5 của phase 1).
  Mỗi lần gọi tăng thuộc tính session "probeCount" (Integer) rồi in đúng một dòng "count=<n>"; lần đầu in count=1.
--%>
<%@ page contentType="text/plain; charset=UTF-8" session="true" trimDirectiveWhitespaces="true" %>
<%
    response.setHeader("Cache-Control", "no-store");
    Integer previous = (Integer) session.getAttribute("probeCount");
    Integer count = previous == null ? 1 : previous + 1;
    session.setAttribute("probeCount", count);
    out.print("count=" + count + "\n");
%>
