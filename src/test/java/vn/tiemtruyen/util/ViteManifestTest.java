package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.ServletContext;
import java.io.ByteArrayInputStream;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class ViteManifestTest {

    /** Manifest mẫu theo hướng dẫn Backend Integration của Vite, thêm entry CSS, import vòng và import động. */
    private static final String MANIFEST = """
            {
              "_shared-B7PI925R.js": {
                "file": "assets/shared-B7PI925R.js",
                "name": "shared",
                "imports": ["_react-AAAA.js"],
                "css": ["assets/shared-ChJ_j-JJ.css"]
              },
              "_react-AAAA.js": {
                "file": "assets/react-AAAA.js",
                "imports": ["_shared-B7PI925R.js"],
                "css": ["assets/react-CCCC.css"]
              },
              "_shared-ChJ_j-JJ.css": {"file": "assets/shared-ChJ_j-JJ.css", "src": "_shared-ChJ_j-JJ.css"},
              "src/islands/Late.tsx": {
                "file": "assets/late-DDDD.js",
                "src": "src/islands/Late.tsx",
                "isDynamicEntry": true,
                "css": ["assets/late-EEEE.css"]
              },
              "src/loader/island-loader.ts": {
                "file": "assets/island-loader-BRBmoGS9.js",
                "name": "island-loader",
                "src": "src/loader/island-loader.ts",
                "isEntry": true,
                "imports": ["_shared-B7PI925R.js", "_react-AAAA.js"],
                "dynamicImports": ["src/islands/Late.tsx"],
                "css": ["assets/island-loader-5UjPuW-k.css"]
              },
              "src/styles/app.css": {
                "file": "assets/app-Dx81ab9Q.css",
                "src": "src/styles/app.css",
                "isEntry": true
              }
            }
            """;

    /**
     * Manifest thật do Vite 8 của lane 1B sinh ngày 11/11/2026 (React chỉ nằm ở dynamicImports, chunk import
     * ngược về entry, entry CSS là khoá riêng).
     */
    private static final String VITE8_MANIFEST = """
            {
              "_react-C09vBOoi.js": {
                "file": "assets/react-C09vBOoi.js",
                "name": "react",
                "imports": ["src/loader/island-loader.ts"]
              },
              "node_modules/react-dom/client.js": {
                "file": "assets/client-BwoADOad.js",
                "name": "client",
                "src": "node_modules/react-dom/client.js",
                "isDynamicEntry": true,
                "imports": ["src/loader/island-loader.ts", "_react-C09vBOoi.js"]
              },
              "src/loader/island-loader.ts": {
                "file": "assets/island-loader-DC99wicD.js",
                "name": "island-loader",
                "src": "src/loader/island-loader.ts",
                "isEntry": true,
                "dynamicImports": ["_react-C09vBOoi.js", "node_modules/react-dom/client.js"]
              },
              "src/styles/app.css": {
                "file": "assets/app-NTGTz7Ol.css",
                "name": "app",
                "names": ["app.css"],
                "src": "src/styles/app.css",
                "isEntry": true
              }
            }
            """;

    @Test
    void realVite8ManifestPrintsCssEntryFileAndNoDynamicPreloads() {
        ViteManifest.Assets assets = ViteManifest.parse(VITE8_MANIFEST).resolve(AssetTags.DEFAULT_ENTRIES);

        assertEquals(List.of("assets/app-NTGTz7Ol.css"), assets.stylesheets());
        assertEquals(List.of("assets/island-loader-DC99wicD.js"), assets.scripts());
        assertEquals(List.of(), assets.preloads());
    }

    @Test
    void staticImportPointingBackToTheEntryTerminatesWithoutDuplicates() {
        String manifest = VITE8_MANIFEST.replace(
                "\"dynamicImports\": [\"_react-C09vBOoi.js\",",
                "\"imports\": [\"_react-C09vBOoi.js\", \"node_modules/react-dom/client.js\"],\n"
                        + "    \"dynamicImports\": [\"_react-C09vBOoi.js\",");
        ViteManifest.Assets assets = ViteManifest.parse(manifest).resolve(AssetTags.DEFAULT_ENTRIES);

        assertEquals(List.of("assets/island-loader-DC99wicD.js"), assets.scripts());
        assertEquals(List.of("assets/react-C09vBOoi.js", "assets/client-BwoADOad.js"), assets.preloads());
        List<String> lines = AssetTags.renderBuild("", assets).lines().toList();
        assertEquals(lines.size(), lines.stream().distinct().count(), lines.toString());
    }

    @Test
    void resolvesCssEntryAndRecursiveImportsWithoutDuplicates() {
        ViteManifest.Assets assets = ViteManifest.parse(MANIFEST).resolve(AssetTags.DEFAULT_ENTRIES);

        assertEquals(List.of(
                "assets/app-Dx81ab9Q.css",
                "assets/island-loader-5UjPuW-k.css",
                "assets/react-CCCC.css",
                "assets/shared-ChJ_j-JJ.css"), assets.stylesheets());
        assertEquals(List.of("assets/island-loader-BRBmoGS9.js"), assets.scripts());
        assertEquals(List.of("assets/react-AAAA.js", "assets/shared-B7PI925R.js"), assets.preloads());
    }

    @Test
    void dynamicImportsAreNotPreloaded() {
        ViteManifest.Assets assets = ViteManifest.parse(MANIFEST).resolve(List.of("src/loader/island-loader.ts"));
        assertTrue(assets.stylesheets().stream().noneMatch(s -> s.contains("late")));
        assertTrue(assets.preloads().stream().noneMatch(s -> s.contains("late")));
    }

    @Test
    void sameEntryTwiceIsPrintedOnce() {
        ViteManifest.Assets assets = ViteManifest.parse(MANIFEST)
                .resolve(List.of("src/loader/island-loader.ts", "src/loader/island-loader.ts"));
        assertEquals(1, assets.scripts().size());
        assertEquals(2, assets.preloads().size());
    }

    @Test
    void unknownEntryFailsWithItsName() {
        ViteManifest manifest = ViteManifest.parse(MANIFEST);
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifest.resolve(List.of("src/missing.ts")));
        assertTrue(e.getMessage().contains("src/missing.ts"), e.getMessage());
    }

    @Test
    void danglingImportFailsLoudly() {
        ViteManifest manifest = ViteManifest.parse("""
                {"a.ts": {"file": "assets/a.js", "isEntry": true, "imports": ["_gone.js"]}}
                """);
        IllegalStateException e = assertThrows(IllegalStateException.class, () -> manifest.resolve(List.of("a.ts")));
        assertTrue(e.getMessage().contains("_gone.js"), e.getMessage());
    }

    @Test
    void malformedManifestIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> ViteManifest.parse("{\"a.ts\": {\"src\": \"a.ts\"}}"));
        assertThrows(IllegalArgumentException.class, () -> ViteManifest.parse("[]"));
        assertThrows(IllegalArgumentException.class,
                () -> ViteManifest.parse("{\"a.ts\": {\"file\": \"a.js\", \"css\": [1]}}"));
    }

    @Test
    void manifestIsReadOnceAndCachedInServletContext() {
        AtomicInteger reads = new AtomicInteger();
        ServletContext context = fakeContext(MANIFEST, reads);

        ViteManifest first = ViteManifest.fromServletContext(context);
        ViteManifest second = ViteManifest.fromServletContext(context);

        assertSame(first, second);
        assertEquals(1, reads.get());
        assertSame(first, context.getAttribute(ViteManifest.CONTEXT_ATTRIBUTE));
    }

    @Test
    void missingManifestTellsHowToBuildIt() {
        ServletContext context = fakeContext(null, new AtomicInteger());
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> ViteManifest.fromServletContext(context));
        assertTrue(e.getMessage().contains("npm --prefix frontend run build"), e.getMessage());
    }

    @Test
    void buildTagsAreOrderedStylesheetScriptPreload() {
        ViteManifest.Assets assets = ViteManifest.parse(MANIFEST).resolve(AssetTags.DEFAULT_ENTRIES);
        List<String> lines = AssetTags.renderBuild("", assets).lines().toList();

        assertEquals(List.of(
                "<link rel=\"stylesheet\" href=\"/static/assets/app-Dx81ab9Q.css\">",
                "<link rel=\"stylesheet\" href=\"/static/assets/island-loader-5UjPuW-k.css\">",
                "<link rel=\"stylesheet\" href=\"/static/assets/react-CCCC.css\">",
                "<link rel=\"stylesheet\" href=\"/static/assets/shared-ChJ_j-JJ.css\">",
                "<script type=\"module\" src=\"/static/assets/island-loader-BRBmoGS9.js\"></script>",
                "<link rel=\"modulepreload\" href=\"/static/assets/react-AAAA.js\">",
                "<link rel=\"modulepreload\" href=\"/static/assets/shared-B7PI925R.js\">"), lines);
    }

    @Test
    void buildTagsHonourContextPathAndEscape() {
        ViteManifest.Assets assets = new ViteManifest.Assets(List.of("a\"b.css"), List.of(), List.of());
        assertEquals("<link rel=\"stylesheet\" href=\"/shop/static/a&quot;b.css\">\n",
                AssetTags.renderBuild("/shop", assets));
    }

    @Test
    void devTagsLoadPreambleClientThenEntries() {
        String html = AssetTags.renderDev("http://localhost:5173", AssetTags.DEFAULT_ENTRIES);

        int preamble = html.indexOf(
                "src=\"http://localhost:5173/static/@id/__x00__@vitejs/plugin-react/preamble\"");
        int client = html.indexOf("src=\"http://localhost:5173/static/@vite/client\"");
        int css = html.indexOf("<link rel=\"stylesheet\" href=\"http://localhost:5173/static/src/styles/app.css\">");
        int loader = html.indexOf("src=\"http://localhost:5173/static/src/loader/island-loader.ts\"");
        assertTrue(preamble >= 0 && preamble < client && client < css && css < loader, html);
        // Không có script inline: CSP dev của nginx không cho 'unsafe-inline' ở script-src.
        assertEquals(4, html.lines().count(), html);
        assertTrue(html.lines().allMatch(line -> line.contains(" src=\"") || line.contains(" href=\"")), html);
    }

    @Test
    void entriesAttributeIsSplitOnCommas() {
        assertEquals(AssetTags.DEFAULT_ENTRIES, AssetTags.parseEntries(null));
        assertEquals(AssetTags.DEFAULT_ENTRIES, AssetTags.parseEntries("  "));
        assertEquals(List.of("a.ts", "b.css"), AssetTags.parseEntries(" a.ts , b.css ,"));
    }

    private static ServletContext fakeContext(String manifest, AtomicInteger reads) {
        Map<String, Object> attributes = new HashMap<>();
        return (ServletContext) Proxy.newProxyInstance(ServletContext.class.getClassLoader(),
                new Class<?>[] {ServletContext.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "getResourceAsStream" -> {
                        assertEquals(ViteManifest.MANIFEST_PATH, args[0]);
                        reads.incrementAndGet();
                        yield manifest == null ? null
                                : new ByteArrayInputStream(manifest.getBytes(StandardCharsets.UTF_8));
                    }
                    case "getAttribute" -> attributes.get((String) args[0]);
                    case "setAttribute" -> {
                        attributes.put((String) args[0], args[1]);
                        yield null;
                    }
                    case "getContextPath" -> "";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }
}
