package vn.tiemtruyen.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 * Header bảo mật phía ứng dụng (phase-06-integration.md §2). nginx là SSOT của header nó đặt
 * ({@code docker/nginx/snippets/security-headers.conf}, CSP do {@code 30-tiem-csp.sh} sinh).
 *
 * <ul>
 *   <li>{@link #NGINX_OWNED}: nginx cũng đặt và ẩn bản của app ({@code proxy_hide_header}), nên qua nginx chỉ còn
 *       một giá trị; filter đặt cùng giá trị để chạy thẳng Tomcat cũng an toàn. Test so với file nginx.</li>
 *   <li>{@code X-Frame-Options: DENY}: nginx không đặt (CSP của nginx có {@code frame-ancestors 'none'}, cùng ý).</li>
 *   <li>{@code Cache-Control: no-store} cho trang JSP; nginx không đặt ở {@code location /}.</li>
 * </ul>
 * Không đặt CSP và {@code Permissions-Policy}: hai header đó chỉ đến từ nginx.
 * Đặt trước khi trang chạy, nên cả {@code sendError} lẫn redirect cũng mang header.
 */
public class SecurityHeadersFilter implements Filter {

    /** Header nginx cũng đặt (và ẩn bản của app): giá trị phải trùng file nginx. */
    static final Map<String, String> NGINX_OWNED = Map.of(
            "X-Content-Type-Options", "nosniff",
            "Referrer-Policy", "strict-origin-when-cross-origin");
    /** Header chỉ filter đặt. */
    static final Map<String, String> APP_OWNED = Map.of("X-Frame-Options", "DENY");
    static final String CACHE_CONTROL = "Cache-Control";
    static final String NO_STORE = "no-store";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        NGINX_OWNED.forEach(httpResponse::setHeader);
        APP_OWNED.forEach(httpResponse::setHeader);
        if (Requests.isJsp(Requests.path(httpRequest))) {
            httpResponse.setHeader(CACHE_CONTROL, NO_STORE);
        }
        chain.doFilter(request, response);
    }
}
