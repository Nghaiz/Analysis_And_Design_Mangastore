package vn.tiemtruyen.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Consumer;

/** Chain giả: đếm số lần gọi, giữ request đã nhận, chạy "trang" tuỳ ý. */
final class FakeChain {
    private int calls;
    private HttpServletRequest seen;
    private final Consumer<HttpServletRequest> page;
    private final FilterChain proxy;

    FakeChain() {
        this(r -> { });
    }

    FakeChain(Consumer<HttpServletRequest> page) {
        this.page = page;
        this.proxy = this::run;
    }

    int calls() {
        return calls;
    }

    HttpServletRequest seen() {
        return seen;
    }

    FilterChain proxy() {
        return proxy;
    }

    private void run(ServletRequest request, ServletResponse response) {
        calls++;
        seen = (HttpServletRequest) request;
        page.accept(seen);
    }
}
