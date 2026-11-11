package vn.tiemtruyen.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Filter đầu chuỗi: đọc tham số form và ghi phản hồi bằng UTF-8, để chữ Việt trong form (họ tên, địa chỉ, lí do
 * huỷ) không vỡ dù trình duyệt không gửi charset. Chạy trước mọi filter đọc tham số (CsrfFilter).
 *
 * <p>Ép phân tích tham số (query và thân {@code application/x-www-form-urlencoded}) ngay sau khi đặt bảng mã. Tham
 * số hỏng ({@code %} lẻ, {@code %zz}, byte không phải UTF-8, quá giới hạn số tham số) thì trả 400, trang
 * {@code error/error.jsp} hiện "400 · Yêu cầu không hợp lệ"; trang không chạy. Không bắt ở đây thì lần
 * {@code getParameter} đầu tiên trong trang ném lỗi và người dùng thấy 500. Servlet 6.1 quy định
 * {@code getParameter*} ném {@link IllegalStateException} khi phân tích hỏng; Tomcat 11.0.27 ném lớp con
 * {@code org.apache.tomcat.util.http.InvalidParameterException} và ném lại ở mọi lần gọi sau.
 */
public class Utf8Filter implements Filter {

    private static final Logger LOG = Logger.getLogger(Utf8Filter.class.getName());
    private static final String UTF_8 = StandardCharsets.UTF_8.name();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request.getCharacterEncoding() == null) {
            request.setCharacterEncoding(UTF_8);
        }
        response.setCharacterEncoding(UTF_8);
        try {
            request.getParameterMap();
        } catch (IllegalStateException e) {
            LOG.log(Level.FINE, "Tham số request hỏng, trả 400: {0}", e.getMessage());
            ((HttpServletResponse) response).sendError(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        chain.doFilter(request, response);
    }
}
