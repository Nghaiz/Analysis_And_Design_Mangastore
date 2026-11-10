package vn.tiemtruyen.util;

import jakarta.servlet.ServletContext;
import java.util.Arrays;
import java.util.List;

/**
 * Sinh thẻ HTML nạp tài nguyên Vite cho tag {@code <t:assets/>} ({@code WEB-INF/tags/assets.tag}).
 *
 * <p>Chế độ build: đọc {@link ViteManifest}, in stylesheet, rồi script entry, rồi modulepreload. Chế độ dev
 * ({@code APP_VITE_DEV=true}): in preamble React Refresh, {@code @vite/client} rồi các entry, tất cả lấy từ
 * {@code APP_VITE_DEV_ORIGIN} với base {@code /static/} của Vite.
 */
public final class AssetTags {

    /** Entry mặc định của mọi trang (contract.md §5): CSS trước, loader island sau. */
    public static final List<String> DEFAULT_ENTRIES = List.of("src/styles/app.css", "src/loader/island-loader.ts");

    /** Base công khai của Vite ({@code base} trong vite.config.ts). */
    public static final String PUBLIC_BASE = "/static/";

    private AssetTags() {
    }

    /**
     * Thẻ HTML cho trang hiện tại.
     *
     * @param context ServletContext của ứng dụng
     * @param entries danh sách entry cách nhau bởi dấu phẩy; rỗng hoặc {@code null} thì dùng
     *     {@link #DEFAULT_ENTRIES}
     * @return các thẻ {@code <link>}/{@code <script>}, mỗi thẻ một dòng
     */
    public static String render(ServletContext context, String entries) {
        List<String> list = parseEntries(entries);
        AppConfig config = AppConfig.get();
        if (config.viteDev()) {
            return renderDev(config.viteDevOrigin(), list);
        }
        return renderBuild(context.getContextPath(), ViteManifest.fromServletContext(context).resolve(list));
    }

    static List<String> parseEntries(String entries) {
        if (entries == null || entries.isBlank()) {
            return DEFAULT_ENTRIES;
        }
        return Arrays.stream(entries.split(",")).map(String::strip).filter(s -> !s.isEmpty()).toList();
    }

    static String renderBuild(String contextPath, ViteManifest.Assets assets) {
        String base = contextPath + PUBLIC_BASE;
        StringBuilder html = new StringBuilder();
        for (String css : assets.stylesheets()) {
            html.append("<link rel=\"stylesheet\" href=\"").append(attr(base + css)).append("\">\n");
        }
        for (String js : assets.scripts()) {
            html.append("<script type=\"module\" src=\"").append(attr(base + js)).append("\"></script>\n");
        }
        for (String chunk : assets.preloads()) {
            html.append("<link rel=\"modulepreload\" href=\"").append(attr(base + chunk)).append("\">\n");
        }
        return html.toString();
    }

    static String renderDev(String origin, List<String> entries) {
        String base = origin + PUBLIC_BASE;
        StringBuilder html = new StringBuilder();
        html.append("<script type=\"module\">\n")
                .append("import RefreshRuntime from '").append(base).append("@react-refresh';\n")
                .append("RefreshRuntime.injectIntoGlobalHook(window);\n")
                .append("window.$RefreshReg$ = () => {};\n")
                .append("window.$RefreshSig$ = () => (type) => type;\n")
                .append("window.__vite_plugin_react_preamble_installed__ = true;\n")
                .append("</script>\n");
        html.append("<script type=\"module\" src=\"").append(attr(base + "@vite/client")).append("\"></script>\n");
        for (String entry : entries) {
            String url = attr(base + entry);
            if (entry.endsWith(".css")) {
                html.append("<link rel=\"stylesheet\" href=\"").append(url).append("\">\n");
            } else {
                html.append("<script type=\"module\" src=\"").append(url).append("\"></script>\n");
            }
        }
        return html.toString();
    }

    static String attr(String value) {
        StringBuilder sb = new StringBuilder(value.length());
        for (char c : value.toCharArray()) {
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
