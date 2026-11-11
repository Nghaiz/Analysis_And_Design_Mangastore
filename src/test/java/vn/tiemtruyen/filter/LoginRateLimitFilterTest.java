package vn.tiemtruyen.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static vn.tiemtruyen.filter.CsrfFilterTest.client;
import static vn.tiemtruyen.filter.CsrfFilterTest.staff;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.filter.FakeHttp.Chain;
import vn.tiemtruyen.filter.FakeHttp.Request;
import vn.tiemtruyen.filter.FakeHttp.Response;
import vn.tiemtruyen.filter.FakeHttp.Session;
import vn.tiemtruyen.util.Messages;

class LoginRateLimitFilterTest {

    private static final int MAX_FAILS = 3;
    private static final Duration WINDOW = Duration.ofSeconds(900);
    private static final String IP = "203.0.113.5";
    private static final String CLIENT_KEY = "tiemtruyen:login-fail:client:" + IP + ":khach01";

    private final InMemoryLoginAttemptStore store = new InMemoryLoginAttemptStore();
    private final LoginRateLimitFilter filter = new LoginRateLimitFilter(store, MAX_FAILS, WINDOW);
    private final List<String> loginAttemptsByPage = new ArrayList<>();
    private Response response;

    /** "Trang" LoginView giả: chỉ xử lí đăng nhập khi là POST (phase-06-integration.md §2). */
    private Consumer<HttpServletRequest> page(boolean success) {
        return r -> {
            if (!"POST".equals(r.getMethod())) {
                return;
            }
            loginAttemptsByPage.add(r.getParameter(LoginRateLimitFilter.USERNAME));
            if (success) {
                r.changeSessionId();
                String role = r.getServletPath().startsWith("/nhan-vien/") ? Requests.STAFF : Requests.CLIENT;
                r.getSession(true).setAttribute(role, Requests.STAFF.equals(role) ? staff(4) : client(11));
            }
        };
    }

    private static Request login(String path, String username) {
        return Request.post(path).param(LoginRateLimitFilter.BUTTON, "").param(LoginRateLimitFilter.USERNAME, username)
                .header(LoginRateLimitFilter.REAL_IP_HEADER, IP).session(FakeHttp.session());
    }

    private Chain run(Request request, boolean success) throws IOException, ServletException {
        response = new Response();
        Chain chain = new Chain(page(success));
        filter.doFilter(request.proxy(), response.proxy(), chain.proxy());
        return chain;
    }

    private void fail(int times) throws IOException, ServletException {
        for (int i = 0; i < times; i++) {
            run(login("/LoginView.jsp", "khach01"), false);
        }
    }

    @Test
    void getAndPostWithoutTheLoginButtonAreNotCounted() throws IOException, ServletException {
        store.breakDown();
        Chain get = run(Request.get("/LoginView.jsp"), false);
        Chain register = run(Request.post("/LoginView.jsp").param(LoginRateLimitFilter.USERNAME, "minhanh"), false);
        assertEquals(1, get.calls());
        assertEquals(1, register.calls());
        assertNull(response.error(), "không gọi tới bộ đếm nên Redis sập cũng không ảnh hưởng");
    }

    @Test
    void failureIsCountedPerRoleIpAndTrimmedLowercaseUsername() throws IOException, ServletException {
        run(login("/LoginView.jsp", "  KHACH01 "), false);
        assertEquals(Map.of(CLIENT_KEY, 1L), store.counts());
    }

    @Test
    void connectionAddressIsUsedWhenNginxHeaderIsMissing() throws IOException, ServletException {
        Request request = Request.post("/nhan-vien/LoginView.jsp").param(LoginRateLimitFilter.BUTTON, "")
                .param(LoginRateLimitFilter.USERNAME, "hant").remoteAddr("172.18.0.4");
        run(request, false);
        assertEquals(Map.of("tiemtruyen:login-fail:staff:172.18.0.4:hant", 1L), store.counts());
    }

    @Test
    void separatorInUsernameCannotForgeAnotherKey() {
        Request request = login("/LoginView.jsp", "a:b");
        assertEquals("tiemtruyen:login-fail:client:" + IP + ":a%3Ab",
                LoginRateLimitFilter.key(request.proxy(), Requests.CLIENT));
    }

    @Test
    void blockedAfterThresholdPageOnlyDisplaysWithLoginFailedMessage() throws IOException, ServletException {
        fail(MAX_FAILS);
        assertEquals(MAX_FAILS, loginAttemptsByPage.size());
        Request blocked = login("/LoginView.jsp", "khach01");
        Chain chain = run(blocked, true);
        assertEquals(1, chain.calls(), "trang vẫn hiển thị");
        assertEquals("GET", chain.seen().getMethod());
        assertEquals(Messages.LOGIN_FAILED, blocked.attribute(Requests.MESSAGE));
        assertEquals(MAX_FAILS, loginAttemptsByPage.size(), "trang không chạy phần đăng nhập (không gọi DAO)");
        assertNull(blocked.currentSession().attribute(Requests.CLIENT), "đúng mật khẩu cũng không đăng nhập");
        assertEquals(MAX_FAILS, store.failures(CLIENT_KEY), "lần bị chặn không đếm thêm");
    }

    @Test
    void blockLastsTheWholeWindowFromTheThresholdFailure() throws IOException, ServletException {
        fail(MAX_FAILS - 1);
        store.advance(Duration.ofSeconds(800));
        fail(1);
        store.advance(Duration.ofSeconds(899));
        Request stillBlocked = login("/LoginView.jsp", "khach01");
        run(stillBlocked, true);
        assertEquals(Messages.LOGIN_FAILED, stillBlocked.attribute(Requests.MESSAGE), "còn 1 giây: vẫn chặn");
        assertEquals(MAX_FAILS, loginAttemptsByPage.size());
        store.advance(Duration.ofSeconds(2));
        run(login("/LoginView.jsp", "khach01"), true);
        assertEquals(MAX_FAILS + 1, loginAttemptsByPage.size(), "hết hạn chặn thì trang xử lí đăng nhập");
    }

    @Test
    void failuresOlderThanTheWindowDoNotAccumulate() throws IOException, ServletException {
        fail(MAX_FAILS - 1);
        store.advance(WINDOW);
        fail(1);
        assertEquals(1, store.failures(CLIENT_KEY));
    }

    @Test
    void successfulLoginClearsTheCounter() throws IOException, ServletException {
        fail(MAX_FAILS - 1);
        run(login("/LoginView.jsp", "khach01"), true);
        assertEquals(Map.of(), store.counts());
    }

    @Test
    void clientAndStaffCountersAreSeparate() throws IOException, ServletException {
        fail(MAX_FAILS);
        run(login("/nhan-vien/LoginView.jsp", "khach01"), true);
        assertEquals(MAX_FAILS + 1, loginAttemptsByPage.size(), "chặn khách không chặn nhân viên");
    }

    @Test
    void failingWhileAlreadyLoggedInIsStillCounted() throws IOException, ServletException {
        Session loggedIn = FakeHttp.session().with(Requests.CLIENT, client(11));
        run(login("/LoginView.jsp", "khach01").session(loggedIn), false);
        assertEquals(1, store.failures(CLIENT_KEY), "client cũ còn trong session không phải là đăng nhập thành công");
    }

    @Test
    void sameClientLoggingInAgainClearsTheCounter() throws IOException, ServletException {
        fail(1);
        Session loggedIn = FakeHttp.session().with(Requests.CLIENT, client(11));
        run(login("/LoginView.jsp", "khach01").session(loggedIn), true);
        assertEquals(0, store.failures(CLIENT_KEY));
    }

    @Test
    void storeDownBeforeThePageGives500AndThePageDoesNotRun() throws IOException, ServletException {
        store.breakDown();
        Chain chain = run(login("/LoginView.jsp", "khach01"), true);
        assertEquals(0, chain.calls());
        assertEquals(500, response.error());
    }

    @Test
    void storeDownAfterThePageGives500WhenTheResponseIsNotCommitted() throws IOException, ServletException {
        Request request = login("/LoginView.jsp", "khach01");
        response = new Response();
        Chain chain = new Chain(r -> store.breakDown());
        filter.doFilter(request.proxy(), response.proxy(), chain.proxy());
        assertEquals(500, response.error());
    }

    @Test
    void storeDownAfterACommittedResponseIsOnlyLogged() throws IOException, ServletException {
        Request request = login("/LoginView.jsp", "khach01");
        response = new Response();
        Response committed = response;
        Chain chain = new Chain(r -> {
            committed.commit();
            store.breakDown();
        });
        filter.doFilter(request.proxy(), response.proxy(), chain.proxy());
        assertNull(response.error());
    }

    @Test
    void unconfiguredStoreNeverLetsALoginThroughSilently() throws IOException, ServletException {
        LoginRateLimitFilter unconfigured = new LoginRateLimitFilter(new UnconfiguredLoginAttemptStore(), 5, WINDOW);
        response = new Response();
        Chain chain = new Chain(page(true));
        unconfigured.doFilter(login("/LoginView.jsp", "khach01").proxy(), response.proxy(), chain.proxy());
        assertEquals(0, chain.calls());
        assertEquals(500, response.error());
    }

    @Test
    void destroyClosesTheStore() {
        assertFalse(store.closed());
        filter.destroy();
        assertTrue(store.closed());
    }
}
