package vn.tiemtruyen.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Set;

/**
 * Token CSRF gắn session (phase-06-integration.md §2, docs/contracts.md §8).
 *
 * <ul>
 *   <li>Mọi request tới trang JSP: tạo session và token {@code csrfToken} khi chưa có, trước khi trang chạy, để
 *       {@code <t:csrf/>} in được token.</li>
 *   <li>POST tới trang JSP khi session chưa có token (chưa có session hoặc session đã hết hạn): 302, xem
 *       {@link #expiredSessionTarget(String)}; trang không chạy, không ghi gì.</li>
 *   <li>Session còn token mà POST thiếu hoặc sai tham số {@code csrf} (so hằng thời gian): 403, trang không chạy.</li>
 *   <li>POST tới một trong hai {@code LoginView.jsp}: sau khi trang chạy, đọc lại session; session mới (trang
 *       đã huỷ session cũ) hoặc danh tính đăng nhập đổi thì đặt token mới.</li>
 * </ul>
 *
 * <p>GET {@code /health.jsp} không tạo session: healthcheck gọi vài giây một lần, không mang cookie, nếu tạo thì
 * mỗi lần gọi để lại một session trong Redis. POST tới đó vẫn qua kiểm như mọi trang.
 */
public class CsrfFilter implements Filter {

    /** Tên tham số form do {@code <t:csrf/>} in ra. */
    static final String PARAMETER = "csrf";

    private static final int TOKEN_BYTES = 32;
    private static final Set<String> NO_SESSION_PATHS = Set.of("/health.jsp");
    private static final Set<String> LOGIN_PATHS = Set.of(Requests.CLIENT_LOGIN, Requests.STAFF_LOGIN);
    private static final String REGISTER_ACTION = "/doRegister.jsp";
    private static final String REGISTER_VIEW = "/RegisterView.jsp";
    private static final String HOME_VIEW = "/HomeView.jsp";

    private final SecureRandom random = new SecureRandom();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String path = Requests.path(httpRequest);
        if (!Requests.isJsp(path) || (NO_SESSION_PATHS.contains(path) && !Requests.isPost(httpRequest))) {
            chain.doFilter(request, response);
            return;
        }
        HttpSession session = httpRequest.getSession(true);
        String token = existingToken(session);
        if (token == null) {
            session.setAttribute(Requests.CSRF_TOKEN, newToken());
        }
        if (!Requests.isPost(httpRequest)) {
            chain.doFilter(request, response);
            return;
        }
        if (token == null) {
            ((HttpServletResponse) response).sendRedirect(httpRequest.getContextPath() + expiredSessionTarget(path));
            return;
        }
        if (!matches(token, httpRequest.getParameter(PARAMETER))) {
            ((HttpServletResponse) response).sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        if (!LOGIN_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }
        String before = Requests.identity(session);
        String sessionIdBefore = session.getId();
        chain.doFilter(request, response);
        rotateAfterLogin(httpRequest, before, sessionIdBefore);
    }

    /**
     * Trang nhận 302 khi POST tới mà session chưa có token (chưa có session, hoặc session đã hết hạn khi người dùng
     * để form mở quá lâu; phase-06-integration.md §6.1, C16). Trang không chạy, không ghi gì.
     * <ul>
     *   <li>Trang cần đăng nhập: LoginView của vai kèm {@code ?expired=1}.</li>
     *   <li>Trang mở cho mọi người: trang xem của chính nó, không tham số (doRegister về RegisterView; doLogout về
     *       HomeView vì session đã mất nghĩa là đã ra khỏi tài khoản).</li>
     * </ul>
     *
     * @param path đường dẫn trang JSP được POST tới
     * @return đường dẫn trong ứng dụng (có thể kèm query) để chuyển tới
     */
    static String expiredSessionTarget(String path) {
        if (!AuthFilter.isOpen(path)) {
            return AuthFilter.loginFor(path) + AuthFilter.EXPIRED_QUERY;
        }
        return switch (path) {
            case REGISTER_ACTION -> REGISTER_VIEW;
            case AuthFilter.LOGOUT_PAGE -> HOME_VIEW;
            default -> path;
        };
    }

    /**
     * Sau trang LoginView: trang thành công thì huỷ session cũ và tạo session mới (phase-06-integration.md §2), nên
     * đọc lại {@code getSession(false)}. Session mới (id khác) luôn nhận token mới, kể cả khi cùng người đăng nhập
     * lại, vì session mới chưa có token; cùng session mà danh tính đổi thì cũng thay token.
     */
    private void rotateAfterLogin(HttpServletRequest request, String before, String sessionIdBefore) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return;
        }
        String after = Requests.identity(session);
        boolean newSession = !session.getId().equals(sessionIdBefore);
        boolean loggedIn = !after.isEmpty() && !after.equals(before);
        if (newSession || loggedIn || existingToken(session) == null) {
            session.setAttribute(Requests.CSRF_TOKEN, newToken());
        }
    }

    private static String existingToken(HttpSession session) {
        Object value = session.getAttribute(Requests.CSRF_TOKEN);
        return value instanceof String token && !token.isEmpty() ? token : null;
    }

    private static boolean matches(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedBytes, actual.getBytes(StandardCharsets.UTF_8));
    }

    /** Token mới: 256 bit ngẫu nhiên, base64url không đệm. */
    String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
