package vn.tiemtruyen.util;

import jakarta.servlet.ServletContext;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Manifest build của Vite ({@code /static/.vite/manifest.json}, contract.md §5 và §10).
 *
 * <p>Khoá của manifest là đường dẫn nguồn tính từ {@code frontend/} (ví dụ {@code src/loader/island-loader.ts}).
 * {@link #resolve(List)} đi đệ quy {@code imports} để gom mọi {@code css} và chunk cần {@code modulepreload},
 * không lặp, theo thuật toán {@code importedChunks} trong hướng dẫn "Backend Integration" của Vite.
 */
public final class ViteManifest {

    /** Đường dẫn manifest trong webapp. */
    public static final String MANIFEST_PATH = "/static/.vite/manifest.json";

    static final String CONTEXT_ATTRIBUTE = ViteManifest.class.getName();

    private final Map<String, Chunk> chunks;

    private ViteManifest(Map<String, Chunk> chunks) {
        this.chunks = chunks;
    }

    /**
     * Manifest của webapp, đọc một lần rồi cache trong {@link ServletContext}.
     *
     * @param context ServletContext của ứng dụng
     * @return manifest đã đọc
     * @throws IllegalStateException khi chưa build frontend (không có manifest)
     */
    public static ViteManifest fromServletContext(ServletContext context) {
        Object cached = context.getAttribute(CONTEXT_ATTRIBUTE);
        if (cached instanceof ViteManifest manifest) {
            return manifest;
        }
        ViteManifest manifest = load(context);
        context.setAttribute(CONTEXT_ATTRIBUTE, manifest);
        return manifest;
    }

    private static ViteManifest load(ServletContext context) {
        try (InputStream in = context.getResourceAsStream(MANIFEST_PATH)) {
            if (in == null) {
                throw new IllegalStateException("Không thấy " + MANIFEST_PATH
                        + " trong webapp → chạy npm --prefix frontend run build trước khi đóng gói WAR");
            }
            return parse(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được " + MANIFEST_PATH, e);
        }
    }

    /**
     * Đọc manifest từ chuỗi JSON.
     *
     * @param json nội dung manifest.json
     * @return manifest
     * @throws IllegalArgumentException khi JSON sai hoặc chunk thiếu trường {@code file}
     */
    public static ViteManifest parse(String json) {
        if (!(JsonReader.parse(json) instanceof Map<?, ?> root)) {
            throw new IllegalArgumentException("Manifest Vite phải là một object JSON");
        }
        Map<String, Chunk> chunks = new LinkedHashMap<>();
        root.forEach((key, value) -> chunks.put((String) key, Chunk.from((String) key, value)));
        return new ViteManifest(Collections.unmodifiableMap(chunks));
    }

    /**
     * Gom tài nguyên cho các entry theo thứ tự: stylesheet, script entry, modulepreload; không lặp.
     *
     * @param entries khoá entry trong manifest (đường dẫn nguồn tính từ {@code frontend/})
     * @return đường dẫn file đầu ra, tương đối với {@code /static/}
     * @throws IllegalArgumentException khi một entry không có trong manifest
     */
    public Assets resolve(List<String> entries) {
        Set<String> stylesheets = new LinkedHashSet<>();
        Set<String> scripts = new LinkedHashSet<>();
        Set<String> preloads = new LinkedHashSet<>();
        Set<String> seen = new HashSet<>();
        for (String entry : entries) {
            Chunk chunk = chunks.get(entry);
            if (chunk == null) {
                throw new IllegalArgumentException("Entry \"" + entry + "\" không có trong manifest Vite"
                        + " → kiểm input trong frontend/vite.config.ts");
            }
            if (chunk.isStylesheet()) {
                stylesheets.add(chunk.file());
                continue;
            }
            stylesheets.addAll(chunk.css());
            scripts.add(chunk.file());
            // Chunk của Vite có thể import ngược về chính entry: đánh dấu entry đã thăm trước khi đi đệ quy.
            seen.add(entry);
            for (Chunk imported : importedChunks(entry, chunk, seen)) {
                stylesheets.addAll(imported.css());
                preloads.add(imported.file());
            }
        }
        preloads.removeAll(scripts);
        return new Assets(List.copyOf(stylesheets), List.copyOf(scripts), List.copyOf(preloads));
    }

    private List<Chunk> importedChunks(String owner, Chunk chunk, Set<String> seen) {
        List<Chunk> result = new ArrayList<>();
        for (String key : chunk.imports()) {
            if (!seen.add(key)) {
                continue;
            }
            Chunk imported = chunks.get(key);
            if (imported == null) {
                throw new IllegalStateException("Chunk \"" + owner + "\" import \"" + key
                        + "\" nhưng manifest không có khoá đó → build lại frontend");
            }
            result.addAll(importedChunks(key, imported, seen));
            result.add(imported);
        }
        return result;
    }

    /**
     * Tài nguyên của một trang, đường dẫn tương đối với {@code /static/}.
     *
     * @param stylesheets file CSS, in bằng {@code <link rel="stylesheet">}
     * @param scripts file JS của entry, in bằng {@code <script type="module">}
     * @param preloads chunk được import, in bằng {@code <link rel="modulepreload">}
     */
    public record Assets(List<String> stylesheets, List<String> scripts, List<String> preloads) {
    }

    record Chunk(String file, List<String> css, List<String> imports) {

        boolean isStylesheet() {
            return file.endsWith(".css");
        }

        static Chunk from(String key, Object value) {
            if (!(value instanceof Map<?, ?> map) || !(map.get("file") instanceof String file)) {
                throw new IllegalArgumentException("Chunk \"" + key + "\" của manifest Vite thiếu trường file");
            }
            return new Chunk(file, strings(key, map.get("css")), strings(key, map.get("imports")));
        }

        private static List<String> strings(String key, Object value) {
            if (value == null) {
                return List.of();
            }
            if (!(value instanceof List<?> list) || !list.stream().allMatch(String.class::isInstance)) {
                throw new IllegalArgumentException("Chunk \"" + key + "\": css/imports phải là mảng chuỗi");
            }
            return list.stream().map(String.class::cast).toList();
        }
    }
}
