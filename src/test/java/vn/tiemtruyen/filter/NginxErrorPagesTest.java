package vn.tiemtruyen.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Trang lỗi tĩnh của nginx (400, 413, 414) đi cùng ranh giới lỗi của filter: nginx trả các mã này trước khi tới
 * Tomcat, nên không có error.jsp. Test giữ ba điều không lệch: app.conf trỏ đúng file có thật, chữ trùng error.jsp,
 * giá trị token của loi.css trùng tokens.css (SSOT giao diện).
 */
class NginxErrorPagesTest {

    private static final Path ERRORS = Path.of("docker", "nginx", "errors");
    private static final Path APP_CONF = Path.of("docker", "nginx", "conf.d", "app.conf");
    private static final Path TOKENS = Path.of("frontend", "src", "styles", "tokens.css");
    private static final Path ERROR_JSP = Path.of("src", "main", "webapp", "error", "error.jsp");
    private static final String PREFIX = "/__tiem-loi/";
    private static final Pattern ERROR_PAGE =
            Pattern.compile("(?m)^\\s*error_page\\s+([0-9 ]+?)\\s+(?:=\\d+\\s+)?(\\S+);");
    private static final Pattern VARIABLE = Pattern.compile("(--[a-z0-9-]+):\\s*([^;]+);");

    private static String read(Path path) throws IOException {
        return Files.readString(path, StandardCharsets.UTF_8);
    }

    @Test
    void everyNginxErrorPageExistsAndCoversTheCodesNginxReturnsItself() throws IOException {
        Matcher m = ERROR_PAGE.matcher(read(APP_CONF));
        Set<String> codes = new HashSet<>();
        while (m.find()) {
            String uri = m.group(2);
            assertTrue(uri.startsWith(PREFIX), uri);
            assertTrue(Files.isRegularFile(ERRORS.resolve(uri.substring(PREFIX.length()))), uri + " không có file");
            codes.addAll(Set.of(m.group(1).trim().split("\\s+")));
        }
        assertTrue(codes.containsAll(Set.of("400", "413", "414", "494")), "error_page thiếu mã: " + codes);
    }

    @Test
    void pagesAreVietnameseKeepTheCodeAndDoNotRevealNginx() throws IOException {
        for (String code : new String[] {"400", "413", "414"}) {
            String html = read(ERRORS.resolve(code + ".html"));
            assertTrue(html.contains("<html lang=\"vi\">"), code);
            assertTrue(html.contains("<h1>" + code + " · "), code);
            assertTrue(html.contains("href=\"" + PREFIX + "loi.css\""), code);
            assertTrue(html.contains("<a href=\"/\">Về trang chủ</a>"), code);
            assertFalse(html.matches("(?s).*(style=|<style|<script|nginx/\\d).*"), code + ": CSP hoặc lộ phiên bản");
        }
    }

    @Test
    void textMatchesTheSharedErrorJsp() throws IOException {
        String jsp = read(ERROR_JSP);
        for (String code : new String[] {"400", "413", "414"}) {
            Matcher when = Pattern.compile("code == " + code + "}\">\\s*<c:set var=\"heading\" value=\"([^\"]+)\"/>"
                    + "\\s*<c:set var=\"text\" value=\"([^\"]+)\"/>").matcher(jsp);
            assertTrue(when.find(), "error.jsp không có nhánh " + code);
            String html = read(ERRORS.resolve(code + ".html"));
            assertTrue(html.contains("<h1>" + code + " · " + when.group(1) + "</h1>"), code + " tiêu đề lệch");
            assertTrue(html.contains("<p>" + when.group(2) + "</p>"), code + " lời lệch error.jsp");
        }
    }

    @Test
    void tokenValuesMatchTheDesignTokens() throws IOException {
        Map<String, String> tokens = variables(read(TOKENS));
        Map<String, String> copy = variables(read(ERRORS.resolve("loi.css")));
        assertFalse(copy.isEmpty(), "loi.css không khai biến token nào");
        copy.forEach((name, value) -> assertEquals(tokens.get(name), value, name + " trong loi.css lệch tokens.css"));
    }

    private static Map<String, String> variables(String css) {
        Map<String, String> vars = new HashMap<>();
        Matcher m = VARIABLE.matcher(css);
        while (m.find()) {
            vars.putIfAbsent(m.group(1), m.group(2).strip());
        }
        return vars;
    }
}
