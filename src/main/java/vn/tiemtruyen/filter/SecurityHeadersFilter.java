package vn.tiemtruyen.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Header bảo mật của ứng dụng (phase-06-integration.md §2). Đặt trước khi trang chạy, nên cả phản hồi lỗi
 * ({@code sendError}) lẫn redirect cũng mang header. CSP do nginx đặt (contract.md §10), filter không đặt.
 */
public class SecurityHeadersFilter implements Filter {

    static final String NO_STORE = "no-store";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("Referrer-Policy", "same-origin");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        if (Requests.isJsp(Requests.path(httpRequest))) {
            httpResponse.setHeader("Cache-Control", NO_STORE);
        }
        chain.doFilter(request, response);
    }
}
