package vn.tiemtruyen.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.ServletException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.filter.FakeHttp.Request;
import vn.tiemtruyen.filter.FakeHttp.Response;

/** Utf8Filter và SecurityHeadersFilter. */
class BasicFiltersTest {

    private static final Path NGINX_HEADERS = Path.of("docker", "nginx", "snippets", "security-headers.conf");
    private static final Path NGINX_PROXY = Path.of("docker", "nginx", "snippets", "proxy-app.conf");

    @Test
    void utf8FilterSetsRequestAndResponseEncodingBeforeThePage() throws IOException, ServletException {
        Request request = Request.post("/doRegister.jsp");
        Response response = new Response();
        List<String> seenByPage = new ArrayList<>();
        FakeChain chain = new FakeChain(
                r -> seenByPage.add(r.getCharacterEncoding() + "/" + response.characterEncoding()));
        new Utf8Filter().doFilter(request.proxy(), response.proxy(), chain.proxy());
        assertEquals(List.of("UTF-8/UTF-8"), seenByPage);
    }

    @Test
    void utf8FilterKeepsAnEncodingTheBrowserDeclared() throws IOException, ServletException {
        Request request = Request.post("/doRegister.jsp").characterEncoding("ISO-8859-1");
        new Utf8Filter().doFilter(request.proxy(), new Response().proxy(), new FakeChain().proxy());
        assertEquals("ISO-8859-1", request.characterEncoding());
    }

    @Test
    void securityHeadersAreSetOnJspPagesBeforeThePageRuns() throws IOException, ServletException {
        Response response = new Response();
        List<String> seenByPage = new ArrayList<>();
        FakeChain chain = new FakeChain(r -> seenByPage.add(String.join(",", response.header("X-Content-Type-Options"),
                response.header("Referrer-Policy"), response.header("X-Frame-Options"),
                response.header("Cache-Control"))));
        new SecurityHeadersFilter().doFilter(Request.get("/nhan-vien/x.jsp").proxy(), response.proxy(), chain.proxy());
        assertEquals(List.of("nosniff,strict-origin-when-cross-origin,DENY,no-store"), seenByPage);
    }

    @Test
    void staticFilesGetSecurityHeadersButNoNoStore() throws IOException, ServletException {
        Response response = new Response();
        FakeChain chain = new FakeChain();
        new SecurityHeadersFilter().doFilter(Request.get("/static/img/logo-tiem.svg").proxy(), response.proxy(),
                chain.proxy());
        assertEquals(1, chain.calls());
        assertEquals("nosniff", response.header("X-Content-Type-Options"));
        assertEquals("DENY", response.header("X-Frame-Options"));
        assertNull(response.header("Cache-Control"));
        assertNull(response.header("Content-Security-Policy"), "CSP do nginx đặt, filter không đặt");
        assertNull(response.header("Permissions-Policy"), "Permissions-Policy do nginx đặt, filter không đặt");
    }

    /**
     * nginx là SSOT của header nó đặt: header filter cũng đặt phải trùng giá trị và bị nginx ẩn bản của app; header
     * chỉ filter đặt thì nginx không được đặt, nếu không thì qua nginx ra hai giá trị.
     */
    @Test
    void filterHeadersAgreeWithNginx() throws IOException {
        Map<String, String> nginx = new HashMap<>();
        Matcher add = Pattern.compile("(?m)^add_header\\s+(\\S+)\\s+\"([^\"]*)\"").matcher(read(NGINX_HEADERS));
        while (add.find()) {
            nginx.put(add.group(1), add.group(2));
        }
        Set<String> hidden = new HashSet<>();
        Matcher hide = Pattern.compile("(?m)^proxy_hide_header\\s+([^;\\s]+);").matcher(read(NGINX_PROXY));
        while (hide.find()) {
            hidden.add(hide.group(1));
        }
        assertFalse(nginx.isEmpty(), "không đọc được add_header nào từ " + NGINX_HEADERS);
        SecurityHeadersFilter.NGINX_OWNED.forEach((name, value) -> {
            assertEquals(nginx.get(name), value, name + " phải trùng giá trị nginx");
            assertTrue(hidden.contains(name), name + " phải bị nginx ẩn bản của app (proxy_hide_header)");
        });
        SecurityHeadersFilter.APP_OWNED.keySet().forEach(name ->
                assertFalse(nginx.containsKey(name), name + " do filter đặt thì nginx không được đặt lại"));
    }

    private static String read(Path path) throws IOException {
        return Files.readString(path, StandardCharsets.UTF_8);
    }
}
