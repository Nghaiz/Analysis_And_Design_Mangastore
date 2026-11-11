package vn.tiemtruyen.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import java.io.IOException;

/**
 * Khung do orchestrator tạo ở bước 6.0 (cho qua) để web.xml hợp lệ trong lúc các lane chạy song song.
 * Lane 6A thay bằng bản thật (plans/261111-tiem-thue-truyen/phase-06-integration.md §2).
 */
public class Utf8Filter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        chain.doFilter(request, response);
    }
}
