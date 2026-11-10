<%--
  <t:assets/> : nạp CSS/JS của Vite cho trang (contract.md §5, §10). Dùng trong <head>.
  Mặc định nạp src/styles/app.css và src/loader/island-loader.ts; đổi bằng entries="a,b".
  APP_VITE_DEV=true thì nạp từ Vite dev server (APP_VITE_DEV_ORIGIN), ngược lại đọc /static/.vite/manifest.json.
--%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ tag import="vn.tiemtruyen.util.AssetTags" %>
<%@ attribute name="entries" required="false" rtexprvalue="false" %>
<%= AssetTags.render(application, (String) jspContext.getAttribute("entries")) %>
