package vn.tiemtruyen.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import vn.tiemtruyen.util.AppConfig;
import vn.tiemtruyen.util.Messages;

/**
 * Chặn đăng nhập sai nhiều lần (Deferred #23, phase-06-integration.md §2). web.xml chỉ gắn filter vào hai trang
 * {@code LoginView.jsp}; filter chỉ đếm POST có {@code btnLogin}.
 *
 * <ul>
 *   <li>Khoá = vai (theo đường dẫn) + IP ({@code X-Real-IP} của nginx, không có thì địa chỉ kết nối) + tên đăng
 *       nhập viết thường đã trim.</li>
 *   <li>Đã sai đủ {@code LOGIN_RATE_MAX_FAILS} lần: đặt {@code message = Messages.LOGIN_FAILED} rồi cho trang chạy
 *       với request bọc trả {@code GET}, nên trang chỉ hiển thị kèm câu báo, không gọi DAO.</li>
 *   <li>Không bị chặn: sau khi trang chạy, session mang vai đó mới (danh tính khác trước, hoặc session id đã đổi
 *       do {@code changeSessionId}) thì xoá bộ đếm, không thì tăng. Lần sai chạm ngưỡng đặt lại hạn để thời gian
 *       chặn đủ {@code LOGIN_RATE_WINDOW_SECONDS}.</li>
 *   <li>Bộ đếm lỗi: ghi log mức SEVERE và trả 500, không cho qua.</li>
 * </ul>
 */
public class LoginRateLimitFilter implements Filter {

    static final String KEY_PREFIX = "tiemtruyen:login-fail:";
    static final String BUTTON = "btnLogin";
    static final String USERNAME = "txtUsername";
    static final String REAL_IP_HEADER = "X-Real-IP";

    private static final Logger LOG = Logger.getLogger(LoginRateLimitFilter.class.getName());
    private static final String ROLE_CLIENT = Requests.CLIENT;
    private static final String ROLE_STAFF = Requests.STAFF;

    private LoginAttemptStore store;
    private int maxFails;
    private Duration window;

    /** Bản Tomcat tạo; cấu hình và bộ đếm nạp ở {@link #init(FilterConfig)}. */
    public LoginRateLimitFilter() {
    }

    LoginRateLimitFilter(LoginAttemptStore store, int maxFails, Duration window) {
        this.store = Objects.requireNonNull(store, "store");
        this.maxFails = maxFails;
        this.window = Objects.requireNonNull(window, "window");
    }

    @Override
    public void init(FilterConfig filterConfig) {
        if (store != null) {
            return;
        }
        AppConfig config = AppConfig.get();
        maxFails = config.loginRateMaxFails();
        window = Duration.ofSeconds(config.loginRateWindowSeconds());
        try {
            store = RedissonLoginAttemptStore.connect(config);
        } catch (LoginAttemptStoreException e) {
            LOG.log(Level.SEVERE, "Không nối được Redis cho bộ đếm đăng nhập sai; POST đăng nhập sẽ trả 500", e);
            store = new UnavailableLoginAttemptStore("Redis không tới được lúc khởi động: " + e.getMessage(), e);
        }
    }

    /** Đóng bộ đếm (bản Redisson: {@code shutdown} client, dừng luồng Netty khi undeploy). */
    @Override
    public void destroy() {
        if (store != null) {
            store.close();
            store = null;
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        if (!Requests.isPost(httpRequest) || httpRequest.getParameter(BUTTON) == null) {
            chain.doFilter(request, response);
            return;
        }
        String role = role(httpRequest);
        String key = key(httpRequest, role);
        try {
            if (store.failures(key) >= maxFails) {
                httpRequest.setAttribute(Requests.MESSAGE, Messages.LOGIN_FAILED);
                chain.doFilter(new DisplayOnlyRequest(httpRequest), response);
                return;
            }
        } catch (LoginAttemptStoreException e) {
            fail(httpResponse, e);
            return;
        }
        HttpSession before = httpRequest.getSession(false);
        String identityBefore = roleIdentity(before, role);
        String sessionIdBefore = before == null ? null : before.getId();
        chain.doFilter(request, response);
        try {
            recordOutcome(httpRequest, key, role, identityBefore, sessionIdBefore);
        } catch (LoginAttemptStoreException e) {
            fail(httpResponse, e);
        }
    }

    private void recordOutcome(HttpServletRequest request, String key, String role, String identityBefore,
            String sessionIdBefore) {
        HttpSession after = request.getSession(false);
        String identityAfter = roleIdentity(after, role);
        boolean sessionIdChanged = after != null && !after.getId().equals(sessionIdBefore);
        boolean loggedIn = identityAfter != null && (!identityAfter.equals(identityBefore) || sessionIdChanged);
        if (loggedIn) {
            store.clear(key);
        } else if (store.increment(key, window) >= maxFails) {
            store.expire(key, window);
        }
    }

    /** Khoá của bộ đếm; tên đăng nhập được mã hoá URL để không chứa dấu {@code :} phân cách. */
    static String key(HttpServletRequest request, String role) {
        String username = request.getParameter(USERNAME);
        String normalized = username == null ? "" : username.strip().toLowerCase(Locale.ROOT);
        String encoded = URLEncoder.encode(normalized, StandardCharsets.UTF_8);
        return KEY_PREFIX + role + ":" + clientIp(request) + ":" + encoded;
    }

    private static String clientIp(HttpServletRequest request) {
        String realIp = request.getHeader(REAL_IP_HEADER);
        return realIp == null || realIp.isBlank() ? request.getRemoteAddr() : realIp.strip();
    }

    private static String role(HttpServletRequest request) {
        return Requests.path(request).startsWith(Requests.STAFF_PREFIX) ? ROLE_STAFF : ROLE_CLIENT;
    }

    private static String roleIdentity(HttpSession session, String role) {
        if (ROLE_STAFF.equals(role)) {
            var staff = Requests.loggedInStaff(session);
            return staff == null ? null : ROLE_STAFF + ":" + staff.getId();
        }
        var client = Requests.loggedInClient(session);
        return client == null ? null : ROLE_CLIENT + ":" + client.getId();
    }

    private static void fail(HttpServletResponse response, LoginAttemptStoreException e) throws IOException {
        LOG.log(Level.SEVERE, "Bộ đếm đăng nhập sai không dùng được, trả 500: " + e.getMessage(), e);
        if (!response.isCommitted()) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    /** Request bọc trả {@code GET}: trang LoginView chỉ xử lí đăng nhập khi là POST nên chỉ hiển thị. */
    static final class DisplayOnlyRequest extends HttpServletRequestWrapper {

        static final String METHOD_GET = "GET";

        DisplayOnlyRequest(HttpServletRequest request) {
            super(request);
        }

        @Override
        public String getMethod() {
            return METHOD_GET;
        }
    }
}
