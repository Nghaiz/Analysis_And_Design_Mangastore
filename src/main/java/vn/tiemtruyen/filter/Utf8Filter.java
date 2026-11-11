package vn.tiemtruyen.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Filter đầu chuỗi: đọc tham số form và ghi phản hồi bằng UTF-8, để chữ Việt trong form (họ tên, địa chỉ, lí do
 * huỷ) không vỡ dù trình duyệt không gửi charset. Chạy trước mọi filter đọc tham số (CsrfFilter).
 */
public class Utf8Filter implements Filter {

    private static final String UTF_8 = StandardCharsets.UTF_8.name();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request.getCharacterEncoding() == null) {
            request.setCharacterEncoding(UTF_8);
        }
        response.setCharacterEncoding(UTF_8);
        chain.doFilter(request, response);
    }
}
