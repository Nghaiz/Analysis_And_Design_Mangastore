package vn.tiemtruyen.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import vn.tiemtruyen.filter.FakeHttp.Request;
import vn.tiemtruyen.filter.FakeHttp.Response;
import vn.tiemtruyen.filter.FakeHttp.Session;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.Staff;

class CsrfFilterTest {

    private static final String TOKEN = "token-cu-cua-session";

    private final CsrfFilter filter = new CsrfFilter();
    private final Response response = new Response();

    private FakeChain run(Request request, Consumer<HttpServletRequest> page) throws IOException, ServletException {
        FakeChain chain = new FakeChain(page);
        filter.doFilter(request.proxy(), response.proxy(), chain.proxy());
        return chain;
    }

    private FakeChain run(Request request) throws IOException, ServletException {
        return run(request, r -> { });
    }

    private static Session withToken() {
        return FakeHttp.session().with(Requests.CSRF_TOKEN, TOKEN);
    }

    @Test
    void firstGetCreatesSessionAndTokenBeforeThePageRuns() throws IOException, ServletException {
        Request request = Request.get("/RegisterView.jsp");
        StringBuilder tokenSeenByPage = new StringBuilder();
        run(request, r -> tokenSeenByPage.append(r.getSession(false).getAttribute(Requests.CSRF_TOKEN)));
        String token = tokenSeenByPage.toString();
        assertTrue(token.matches("[A-Za-z0-9_-]{43}"), "256 bit base64url không đệm: " + token);
    }

    @Test
    void existingTokenIsKept() throws IOException, ServletException {
        Request request = Request.get("/SearchBookView.jsp").session(withToken());
        run(request);
        assertEquals(TOKEN, request.currentSession().attribute(Requests.CSRF_TOKEN));
    }

    @Test
    void tokensAreRandom() {
        assertNotEquals(filter.newToken(), filter.newToken());
    }

    @Test
    void healthCheckAndNonJspPathsDoNotCreateASession() throws IOException, ServletException {
        for (String path : new String[] {"/health.jsp", "/static/assets/app.js", "/favicon.ico"}) {
            Request request = Request.get(path);
            FakeChain chain = run(request);
            assertEquals(1, chain.calls(), path);
            assertNull(request.currentSession(), path);
        }
    }

    @Test
    void postWithoutTokenIs403AndThePageDoesNotRun() throws IOException, ServletException {
        FakeChain chain = run(Request.post("/doRegister.jsp").session(withToken()));
        assertEquals(0, chain.calls());
        assertEquals(403, response.error());
    }

    @Test
    void postWithWrongTokenIs403() throws IOException, ServletException {
        FakeChain chain = run(Request.post("/nhan-vien/doAddDamage.jsp").session(withToken()).param("csrf", "gia-mao"));
        assertEquals(0, chain.calls());
        assertEquals(403, response.error());
    }

    @ParameterizedTest
    @CsvSource({
        "/doRegister.jsp, /RegisterView.jsp",
        "/RegisterView.jsp, /RegisterView.jsp",
        "/LoginView.jsp, /LoginView.jsp",
        "/HomeView.jsp, /HomeView.jsp",
        "/nhan-vien/LoginView.jsp, /nhan-vien/LoginView.jsp",
        "/doLogout.jsp, /HomeView.jsp",
        "/dev/StyleGuideView.jsp, /dev/StyleGuideView.jsp",
        "/health.jsp, /health.jsp",
        "/doAddSelectedBook.jsp, /LoginView.jsp?expired=1",
        "/SearchBookView.jsp, /LoginView.jsp?expired=1",
        "/doCancelRentalBill.jsp, /LoginView.jsp?expired=1",
        "/nhan-vien/doUpdateRentalBill.jsp, /LoginView.jsp?expired=1",
        "/nhan-vien/quan-tri/doAddBook.jsp, /LoginView.jsp?expired=1"
    })
    void postWithoutSessionRedirectsToTheRoleViewAndThePageDoesNotRun(String path, String target)
            throws IOException, ServletException {
        Request request = Request.post(path).contextPath("/tiem").param("csrf", "token-cua-session-da-het-han")
                .param("btnLogin", "");
        FakeChain chain = run(request);
        assertEquals(0, chain.calls(), "không ghi gì: trang không chạy");
        assertNull(response.error());
        assertEquals("/tiem" + target, response.redirect());
        assertNotNull(request.currentSession().attribute(Requests.CSRF_TOKEN), "trang xem kế tiếp có token mới");
    }

    @Test
    void postOnALiveSessionThatLostItsTokenIsTreatedAsExpired() throws IOException, ServletException {
        Request request = Request.post("/doAddRentalBill.jsp").session(FakeHttp.session()).param("csrf", "bat-ki");
        FakeChain chain = run(request);
        assertEquals(0, chain.calls());
        assertEquals("/LoginView.jsp?expired=1", response.redirect());
    }

    @Test
    void postWithEmptyTokenOnALiveSessionIs403() throws IOException, ServletException {
        FakeChain chain = run(Request.post("/doRegister.jsp").session(withToken()).param("csrf", ""));
        assertEquals(0, chain.calls());
        assertEquals(403, response.error());
        assertNull(response.redirect());
    }

    @Test
    void postWithMatchingTokenReachesThePage() throws IOException, ServletException {
        FakeChain chain = run(Request.post("/doAddSelectedBook.jsp").session(withToken()).param("csrf", TOKEN));
        assertEquals(1, chain.calls());
        assertNull(response.error());
    }

    @Test
    void tokenChangesAfterClientLogin() throws IOException, ServletException {
        Request request = Request.post("/LoginView.jsp").session(withToken()).param("csrf", TOKEN);
        run(request, r -> r.getSession(false).setAttribute(Requests.CLIENT, client(7)));
        Object token = request.currentSession().attribute(Requests.CSRF_TOKEN);
        assertNotNull(token);
        assertNotEquals(TOKEN, token);
    }

    @Test
    void tokenChangesAfterStaffLogin() throws IOException, ServletException {
        Request request = Request.post("/nhan-vien/LoginView.jsp").session(withToken()).param("csrf", TOKEN);
        run(request, r -> r.getSession(false).setAttribute(Requests.STAFF, staff(2)));
        assertNotEquals(TOKEN, request.currentSession().attribute(Requests.CSRF_TOKEN));
    }

    @Test
    void tokenChangesWhenAnotherClientLogsInOnTheSameSession() throws IOException, ServletException {
        Request request = Request.post("/LoginView.jsp").param("csrf", TOKEN)
                .session(withToken().with(Requests.CLIENT, client(7)));
        run(request, r -> r.getSession(false).setAttribute(Requests.CLIENT, client(8)));
        assertNotEquals(TOKEN, request.currentSession().attribute(Requests.CSRF_TOKEN));
    }

    @Test
    void loginThatReplacesTheSessionGivesTheNewSessionAFreshToken() throws IOException, ServletException {
        Session old = withToken();
        Request request = Request.post("/LoginView.jsp").session(old).param("csrf", TOKEN);
        run(request, CsrfFilterTest::loginWithNewSession);
        assertTrue(old.invalidated());
        assertNotEquals(old.id(), request.currentSession().id());
        Object token = request.currentSession().attribute(Requests.CSRF_TOKEN);
        assertNotNull(token, "session mới phải có token, nếu không POST kế tiếp bị coi là hết hạn");
        assertNotEquals(TOKEN, token);
    }

    @Test
    void sameClientLoggingInAgainOnANewSessionStillGetsAToken() throws IOException, ServletException {
        Request request = Request.post("/LoginView.jsp").param("csrf", TOKEN)
                .session(withToken().with(Requests.CLIENT, client(7)));
        run(request, CsrfFilterTest::loginWithNewSession);
        Object token = request.currentSession().attribute(Requests.CSRF_TOKEN);
        assertNotNull(token);
        assertNotEquals(TOKEN, token);
    }

    @Test
    void staffLoginThatReplacesTheSessionGivesAFreshToken() throws IOException, ServletException {
        Request request = Request.post("/nhan-vien/LoginView.jsp").session(withToken()).param("csrf", TOKEN);
        run(request, r -> {
            r.getSession(false).invalidate();
            r.getSession(true).setAttribute(Requests.STAFF, staff(2));
        });
        assertNotNull(request.currentSession().attribute(Requests.CSRF_TOKEN));
    }

    /** LoginView thành công: huỷ session cũ, tạo session mới, ghi client (phase-06-integration.md §2). */
    private static void loginWithNewSession(HttpServletRequest r) {
        r.getSession(false).invalidate();
        r.getSession(true).setAttribute(Requests.CLIENT, client(7));
    }

    @Test
    void tokenStaysWhenLoginFails() throws IOException, ServletException {
        Request request = Request.post("/LoginView.jsp").session(withToken()).param("csrf", TOKEN);
        run(request);
        assertEquals(TOKEN, request.currentSession().attribute(Requests.CSRF_TOKEN));
    }

    @Test
    void registrationCopyOfClientWithIdZeroIsNotALogin() throws IOException, ServletException {
        Request request = Request.post("/LoginView.jsp").session(withToken()).param("csrf", TOKEN);
        run(request, r -> r.getSession(false).setAttribute(Requests.CLIENT, client(0)));
        assertEquals(TOKEN, request.currentSession().attribute(Requests.CSRF_TOKEN));
    }

    @Test
    void tokenIsOnlyRotatedByTheLoginPages() throws IOException, ServletException {
        Request request = Request.post("/doRegister.jsp").session(withToken()).param("csrf", TOKEN);
        run(request, r -> r.getSession(false).setAttribute(Requests.CLIENT, client(9)));
        assertEquals(TOKEN, request.currentSession().attribute(Requests.CSRF_TOKEN));
    }

    static Client client(int id) {
        Client client = new Client();
        client.setId(id);
        return client;
    }

    static Staff staff(int id) {
        Staff staff = new Staff();
        staff.setId(id);
        staff.setPosition(Staff.POSITION_SALES);
        return staff;
    }
}
