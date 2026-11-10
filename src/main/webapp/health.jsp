<%--
  Healthcheck của service app (contract.md §3, §10): ping DB qua util/Db.
  Khoẻ: 200, thân "ok". Hỏng: 503, thân không chứa "ok", không in chi tiết lỗi hay bí mật.
--%>
<%@ page contentType="text/plain; charset=UTF-8" session="false" trimDirectiveWhitespaces="true"
         import="vn.tiemtruyen.util.Db" %>
<%
    response.setHeader("Cache-Control", "no-store");
    boolean healthy = Db.ping();
    response.setStatus(healthy ? HttpServletResponse.SC_OK : HttpServletResponse.SC_SERVICE_UNAVAILABLE);
    out.print(healthy ? "ok" : "db-loi");
%>
