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
import java.util.List;
import java.util.Set;
import vn.tiemtruyen.model.Staff;

/**
 * Phân quyền theo đường dẫn (docs/contracts.md §12, phase-06-integration.md §2).
 *
 * <ul>
 *   <li>Luôn mở: Home, Register, doRegister, hai LoginView, doLogout (C14), health, {@code /static/*},
 *       {@code /error/*}, {@code /dev/*}; đường dẫn không phải trang JSP cho qua (Tomcat tự trả 404).</li>
 *   <li>{@code /doCancelRentalBill.jsp}: khách đã đăng nhập hoặc nhân viên; trang kiểm thêm {@code from} (C8).</li>
 *   <li>{@code /nhan-vien/quan-tri/*}: chưa đăng nhập nhân viên thì về LoginView của nhân viên; nhân viên không
 *       phải "Quản lí" thì 403.</li>
 *   <li>{@code /nhan-vien/*} khác: nhân viên; không thì 302 về {@code /nhan-vien/LoginView.jsp}.</li>
 *   <li>Mọi trang JSP khác: khách có {@code client.id > 0}; không thì 302 về {@code /LoginView.jsp}.</li>
 * </ul>
 *
 * <p>Chuyển về LoginView mà request mang session id không còn hợp lệ (session hết hạn giữa chừng) thì thêm
 * {@code ?expired=1} (C16).
 */
public class AuthFilter implements Filter {

    static final String CANCEL_PAGE = "/doCancelRentalBill.jsp";
    static final String LOGOUT_PAGE = "/doLogout.jsp";
    static final String ADMIN_PREFIX = "/nhan-vien/quan-tri/";
    /** Tham số LoginView nhận khi bị chuyển về vì session hết hạn (C16; trang hiện {@code SESSION_EXPIRED}). */
    static final String EXPIRED_QUERY = "?expired=1";

    private static final Set<String> OPEN_PAGES = Set.of("/HomeView.jsp", "/RegisterView.jsp", "/doRegister.jsp",
            Requests.CLIENT_LOGIN, Requests.STAFF_LOGIN, LOGOUT_PAGE, "/health.jsp");
    private static final List<String> OPEN_PREFIXES = List.of("/static/", "/error/", "/dev/");

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String path = Requests.path(httpRequest);
        Decision decision = decide(path, httpRequest.getSession(false));
        String expired = sessionExpired(httpRequest) ? EXPIRED_QUERY : "";
        String context = httpRequest.getContextPath();
        switch (decision) {
            case ALLOW -> chain.doFilter(request, response);
            case CLIENT_LOGIN -> httpResponse.sendRedirect(context + Requests.CLIENT_LOGIN + expired);
            case STAFF_LOGIN -> httpResponse.sendRedirect(context + Requests.STAFF_LOGIN + expired);
            case FORBIDDEN -> httpResponse.sendError(HttpServletResponse.SC_FORBIDDEN);
            default -> throw new IllegalStateException("Quyết định phân quyền chưa xử lí: " + decision);
        }
    }

    /**
     * Quyết định cho một đường dẫn và session (tách riêng để test đủ ma trận §12).
     *
     * @param path đường dẫn trong ứng dụng, xem {@link Requests#path}
     * @param session session hiện tại hoặc {@code null}
     * @return quyết định
     */
    static Decision decide(String path, HttpSession session) {
        if (!Requests.isJsp(path) || isOpen(path)) {
            return Decision.ALLOW;
        }
        boolean client = Requests.loggedInClient(session) != null;
        Staff staff = Requests.loggedInStaff(session);
        if (CANCEL_PAGE.equals(path)) {
            return client || staff != null ? Decision.ALLOW : Decision.CLIENT_LOGIN;
        }
        if (path.startsWith(Requests.STAFF_PREFIX)) {
            if (staff == null) {
                return Decision.STAFF_LOGIN;
            }
            boolean admin = path.startsWith(ADMIN_PREFIX);
            return !admin || Staff.POSITION_MANAGER.equals(staff.getPosition()) ? Decision.ALLOW : Decision.FORBIDDEN;
        }
        return client ? Decision.ALLOW : Decision.CLIENT_LOGIN;
    }

    /** Trang JSP mở cho mọi người (cột "mọi người" và "luôn mở" của §12); CsrfFilter dùng chung danh sách này. */
    static boolean isOpen(String path) {
        return OPEN_PAGES.contains(path) || OPEN_PREFIXES.stream().anyMatch(path::startsWith);
    }

    /** LoginView của vai sở hữu đường dẫn: {@code /nhan-vien/*} về LoginView nhân viên, còn lại về LoginView khách. */
    static String loginFor(String path) {
        return path.startsWith(Requests.STAFF_PREFIX) ? Requests.STAFF_LOGIN : Requests.CLIENT_LOGIN;
    }

    /** C16: request mang session id (cookie) mà session đó không còn (hết hạn, bị huỷ). */
    private static boolean sessionExpired(HttpServletRequest request) {
        return request.getRequestedSessionId() != null && !request.isRequestedSessionIdValid();
    }

    /** Kết quả phân quyền của một request. */
    enum Decision {
        /** Cho trang chạy. */
        ALLOW,
        /** 302 về LoginView của khách. */
        CLIENT_LOGIN,
        /** 302 về LoginView của nhân viên. */
        STAFF_LOGIN,
        /** 403. */
        FORBIDDEN
    }
}
