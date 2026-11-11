<%--
  Bản dựng thử bố cục trang chủ có gắn island ShelfScene (phase 5, lane 5C; HomeView thật làm ở phase 6).
  Thứ tự theo images/svg/ui_m1_HomeView.svg: tiêu đề "Trang chủ", lời chào, nút "Đăng nhập" (lnkLogin), nút "Đăng kí"
  (lnkRegister); kệ truyện nằm sau (docs/contracts.md §9.2 HomeView, §11.4).
  Thể loại: /static/data/categories.json (Vite phát từ pipeline/config/categories.json), đọc như phase-05-ui-contract.md §5.
  Ảnh tĩnh trong div island trùng từng thẻ với frontend/src/islands/ShelfScene/Poster.tsx: tắt JS vẫn thấy kệ và
  bấm được tới trang đăng nhập; bật JS thì island vẽ lại đúng cây thẻ đó rồi mới nâng lên 3D (Deferred #16).
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true"
         import="java.io.InputStream, java.nio.charset.StandardCharsets, java.util.ArrayList, java.util.LinkedHashMap,
                 java.util.List, java.util.Map, vn.tiemtruyen.util.JsonReader, vn.tiemtruyen.util.JsonUtil" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%
    final String categoriesResource = "/static/data/categories.json";
    List<String> categories = new ArrayList<>();
    try (InputStream in = application.getResourceAsStream(categoriesResource)) {
        if (in == null) {
            throw new IllegalStateException("Thiếu " + categoriesResource + ": chạy npm --prefix frontend run build");
        }
        Object parsed = JsonReader.parse(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        if (!(parsed instanceof List<?> list) || list.isEmpty()) {
            throw new IllegalStateException(categoriesResource + " phải là mảng thể loại không rỗng");
        }
        for (Object item : list) {
            if (!(item instanceof String name) || name.isBlank()) {
                throw new IllegalStateException(categoriesResource + " chỉ được chứa chuỗi thể loại");
            }
            categories.add(name);
        }
    }

    // Chuỗi hằng, không có kí tự cần escape trong HTML; in được thẳng vào thuộc tính bên dưới.
    String contextPath = request.getContextPath();
    String loginHref = contextPath + "/LoginView.jsp";
    String registerHref = contextPath + "/RegisterView.jsp";
    String posterSrc = contextPath + "/static/img/shelf/shelf-static.webp";
    String posterAlt = "Kệ truyện gỗ của tiệm dưới ánh đèn vàng và quạt trần: bấm để đăng nhập và thuê truyện";

    Map<String, Object> shelfProps = new LinkedHashMap<>();
    shelfProps.put("loginHref", loginHref);
    shelfProps.put("posterSrc", posterSrc);
    shelfProps.put("posterSrcSet", null);
    shelfProps.put("posterAlt", posterAlt);
    shelfProps.put("categories", categories);
%>
<t:layout title="Trang chủ">
  <section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Trang chủ</h1>
    <p class="text-ink">Chào mừng bạn đến với cửa hàng cho thuê truyện!</p>
    <p class="flex flex-wrap gap-4">
      <a id="lnkLogin" href="<%= loginHref %>" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Đăng nhập</a>
      <a id="lnkRegister" href="<%= registerHref %>" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Đăng kí</a>
    </p>
    <div data-island="ShelfScene" data-props="shelf-scene-props" class="w-full overflow-hidden rounded-paper bg-wood shadow-paper">
      <div class="relative"><a href="<%= loginHref %>" class="block"><img src="<%= posterSrc %>" alt="<%= posterAlt %>" width="1200" height="800" class="block h-auto w-full" decoding="async" fetchpriority="high"></a></div>
    </div>
    <script type="application/json" id="shelf-scene-props"><%= JsonUtil.toScriptJson(shelfProps) %></script>
  </section>
</t:layout>
