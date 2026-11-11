package vn.tiemtruyen.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.filter.FakeHttp.Chain;
import vn.tiemtruyen.filter.FakeHttp.Request;
import vn.tiemtruyen.filter.FakeHttp.Response;

/** Utf8Filter và SecurityHeadersFilter. */
class BasicFiltersTest {

    @Test
    void utf8FilterSetsRequestAndResponseEncodingBeforeThePage() throws IOException, ServletException {
        Request request = Request.post("/doRegister.jsp");
        Response response = new Response();
        List<String> seenByPage = new ArrayList<>();
        Chain chain = new Chain(r -> seenByPage.add(r.getCharacterEncoding() + "/" + response.characterEncoding()));
        new Utf8Filter().doFilter(request.proxy(), response.proxy(), chain.proxy());
        assertEquals(List.of("UTF-8/UTF-8"), seenByPage);
    }

    @Test
    void utf8FilterKeepsAnEncodingTheBrowserDeclared() throws IOException, ServletException {
        Request request = Request.post("/doRegister.jsp").characterEncoding("ISO-8859-1");
        new Utf8Filter().doFilter(request.proxy(), new Response().proxy(), new Chain().proxy());
        assertEquals("ISO-8859-1", request.characterEncoding());
    }

    @Test
    void securityHeadersAreSetOnJspPagesBeforeThePageRuns() throws IOException, ServletException {
        Response response = new Response();
        List<String> seenByPage = new ArrayList<>();
        Chain chain = new Chain(r -> seenByPage.add(String.join(",", response.header("X-Content-Type-Options"),
                response.header("Referrer-Policy"), response.header("X-Frame-Options"),
                response.header("Cache-Control"))));
        new SecurityHeadersFilter().doFilter(Request.get("/nhan-vien/x.jsp").proxy(), response.proxy(), chain.proxy());
        assertEquals(List.of("nosniff,same-origin,DENY,no-store"), seenByPage);
    }

    @Test
    void staticFilesGetSecurityHeadersButNoNoStore() throws IOException, ServletException {
        Response response = new Response();
        Chain chain = new Chain();
        new SecurityHeadersFilter().doFilter(Request.get("/static/img/logo-tiem.svg").proxy(), response.proxy(),
                chain.proxy());
        assertEquals(1, chain.calls());
        assertEquals("nosniff", response.header("X-Content-Type-Options"));
        assertEquals("DENY", response.header("X-Frame-Options"));
        assertNull(response.header("Cache-Control"));
        assertNull(response.header("Content-Security-Policy"), "CSP do nginx đặt, filter không đặt");
    }
}
