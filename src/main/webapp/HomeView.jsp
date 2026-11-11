<%--
  HomeView.jsp, giao diện "Trang chủ" (ch.9 tr.56; docs/contracts.md §9.2 HomeView, §11.4 ShelfScene).
  Thứ tự theo images/svg/ui_m1_HomeView.svg: tiêu đề "Trang chủ", lời chào, nút "Đăng nhập" (lnkLogin), nút "Đăng kí"
  (lnkRegister); kệ truyện 3D nằm cùng trang, bấm gáy truyện = bấm lnkLogin (D10). Session: không. DAO: không.
  Thể loại: /static/data/categories.json (Vite phát từ pipeline/config/categories.json, phase-05-ui-contract.md §5).
  Ảnh tĩnh trong div island trùng từng thẻ với frontend/src/islands/ShelfScene/Poster.tsx (<picture>: ảnh khung hẹp
  chỉ có tủ kệ cho viewport < 600 px, rồi ảnh toàn cảnh): tắt JS vẫn thấy kệ và bấm được tới trang đăng nhập; bật JS
  thì island vẽ lại đúng cây thẻ đó rồi mới nâng lên 3D (Deferred #16).
  Lề ngang quanh kệ đúng 40 px (lề tt-main 2 × 16 px + px-1 của section 2 × 4 px), để ngưỡng 600 px của ảnh khung hẹp
  gặp đúng ngưỡng COMPACT_MAX_WIDTH_PX = 560 px của cảnh 3D (docs/contracts.md §11.4).
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
    String posterNarrowSrc = contextPath + "/static/img/shelf/shelf-static-narrow.webp";
    String posterAlt = "Kệ truyện gỗ của tiệm dưới ánh đèn vàng và quạt trần: bấm để đăng nhập và thuê truyện";

    Map<String, Object> shelfProps = new LinkedHashMap<>();
    shelfProps.put("loginHref", loginHref);
    shelfProps.put("posterSrc", posterSrc);
    shelfProps.put("posterSrcSet", null);
    shelfProps.put("posterNarrowSrc", posterNarrowSrc);
    shelfProps.put("posterAlt", posterAlt);
    shelfProps.put("categories", categories);

    // Thân của layout.tag là scriptless (cấm biểu thức Java), nên giá trị đi qua thuộc tính trang và EL.
    pageContext.setAttribute("loginHref", loginHref);
    pageContext.setAttribute("registerHref", registerHref);
    pageContext.setAttribute("posterSrc", posterSrc);
    pageContext.setAttribute("posterNarrowSrc", posterNarrowSrc);
    pageContext.setAttribute("posterAlt", posterAlt);
    pageContext.setAttribute("shelfPropsJson", JsonUtil.toScriptJson(shelfProps));
%>
<t:layout title="Trang chủ">
  <section class="mx-auto flex max-w-5xl flex-col gap-6 px-1 py-8">
    <h1 class="font-sign text-ink">Trang chủ</h1>
    <p class="text-ink">Chào mừng bạn đến với cửa hàng cho thuê truyện!</p>
    <p class="flex flex-wrap gap-4">
      <a id="lnkLogin" href="${loginHref}" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Đăng nhập</a>
      <a id="lnkRegister" href="${registerHref}" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Đăng kí</a>
    </p>
    <div data-island="ShelfScene" data-props="shelf-scene-props" class="w-full overflow-hidden rounded-paper bg-wood shadow-paper">
      <div class="relative"><a href="${loginHref}" class="block"><picture class="block"><source media="(max-width: 599.98px)" srcset="${posterNarrowSrc}"><img src="${posterSrc}" alt="${posterAlt}" width="1200" height="800" class="block h-auto w-full" decoding="async" fetchpriority="high"></picture></a></div>
    </div>
    <script type="application/json" id="shelf-scene-props">${shelfPropsJson}</script>
  </section>
</t:layout>
