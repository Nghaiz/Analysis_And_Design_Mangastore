package vn.tiemtruyen.filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Request, response, session và chain giả cho test filter, dựng bằng {@link Proxy} (không cần Tomcat hay thư viện
 * mock). Hàm nào test chưa khai thì ném {@link UnsupportedOperationException} nêu tên hàm, để test không âm thầm
 * nhận giá trị mặc định.
 */
final class FakeHttp {

    private static final AtomicInteger SESSION_IDS = new AtomicInteger();

    private FakeHttp() {
    }

    static Session session() {
        return new Session();
    }

    @SuppressWarnings("unchecked")
    private static <T> T fake(Class<T> type, InvocationHandler handler) {
        InvocationHandler withObjectMethods = (p, m, a) -> switch (m.getName()) {
            case "hashCode" -> System.identityHashCode(p);
            case "equals" -> p == a[0];
            case "toString" -> "Fake" + type.getSimpleName();
            default -> handler.invoke(p, m, a);
        };
        return (T) Proxy.newProxyInstance(FakeHttp.class.getClassLoader(), new Class<?>[] {type}, withObjectMethods);
    }

    private static UnsupportedOperationException unsupported(String name) {
        return new UnsupportedOperationException("FakeHttp chưa giả hàm " + name);
    }

    /** Session giả: thuộc tính, id đổi được. */
    static final class Session {
        private final Map<String, Object> attributes = new HashMap<>();
        private String id = "S" + SESSION_IDS.incrementAndGet();
        private boolean invalidated;
        private final HttpSession proxy = fake(HttpSession.class, (p, m, a) -> switch (m.getName()) {
            case "getAttribute" -> attributes.get((String) a[0]);
            case "setAttribute" -> {
                attributes.put((String) a[0], a[1]);
                yield null;
            }
            case "removeAttribute" -> attributes.remove((String) a[0]);
            case "getId" -> id;
            case "invalidate" -> {
                invalidated = true;
                yield null;
            }
            default -> throw unsupported(m.getName());
        });

        Session with(String name, Object value) {
            attributes.put(name, value);
            return this;
        }

        Object attribute(String name) {
            return attributes.get(name);
        }

        String id() {
            return id;
        }

        boolean invalidated() {
            return invalidated;
        }

        HttpSession proxy() {
            return proxy;
        }
    }

    /** Request giả. */
    static final class Request {
        private String method = "GET";
        private String servletPath = "/";
        private String pathInfo;
        private String contextPath = "";
        private String remoteAddr = "10.0.0.9";
        private String characterEncoding;
        private final Map<String, String> parameters = new HashMap<>();
        private final Map<String, String> headers = new HashMap<>();
        private final Map<String, Object> attributes = new HashMap<>();
        private Session session;
        private String requestedSessionId;
        private boolean requestedSessionIdValid;
        private IllegalStateException parameterFailure;
        private final HttpServletRequest proxy = fake(HttpServletRequest.class, (p, m, a) -> switch (m.getName()) {
            case "getMethod" -> method;
            case "getServletPath" -> servletPath;
            case "getPathInfo" -> pathInfo;
            case "getContextPath" -> contextPath;
            case "getRemoteAddr" -> remoteAddr;
            case "getCharacterEncoding" -> characterEncoding;
            case "setCharacterEncoding" -> {
                characterEncoding = (String) a[0];
                yield null;
            }
            case "getParameter" -> parameter((String) a[0]);
            case "getParameterMap" -> parameterMap();
            case "getHeader" -> headers.get((String) a[0]);
            case "getAttribute" -> attributes.get((String) a[0]);
            case "setAttribute" -> {
                attributes.put((String) a[0], a[1]);
                yield null;
            }
            case "getRequestedSessionId" -> requestedSessionId;
            case "isRequestedSessionIdValid" -> requestedSessionIdValid;
            case "getSession" -> session(a == null || a.length == 0 || (Boolean) a[0]);
            case "changeSessionId" -> {
                session.id = "S" + SESSION_IDS.incrementAndGet();
                yield session.id;
            }
            default -> throw unsupported(m.getName());
        });

        static Request get(String path) {
            Request request = new Request();
            request.servletPath = path;
            return request;
        }

        static Request post(String path) {
            Request request = get(path);
            request.method = "POST";
            return request;
        }

        Request param(String name, String value) {
            parameters.put(name, value);
            return this;
        }

        Request header(String name, String value) {
            headers.put(name, value);
            return this;
        }

        Request session(Session value) {
            session = value;
            return this;
        }

        /** Trình duyệt gửi cookie của một session đã hết hạn (C16). */
        Request staleSessionCookie() {
            requestedSessionId = "S-het-han";
            requestedSessionIdValid = false;
            return this;
        }

        /** Tham số hỏng như Tomcat 11: mọi {@code getParameter*} ném {@link IllegalStateException}. */
        Request brokenParameters() {
            parameterFailure = new IllegalStateException("giả lập InvalidParameterException của Tomcat");
            return this;
        }

        private String parameter(String name) {
            parameterMap();
            return parameters.get(name);
        }

        private Map<String, String[]> parameterMap() {
            if (parameterFailure != null) {
                throw parameterFailure;
            }
            Map<String, String[]> map = new HashMap<>();
            parameters.forEach((k, v) -> map.put(k, new String[] {v}));
            return map;
        }

        Request contextPath(String value) {
            contextPath = value;
            return this;
        }

        Request pathInfo(String value) {
            pathInfo = value;
            return this;
        }

        Request remoteAddr(String value) {
            remoteAddr = value;
            return this;
        }

        Request characterEncoding(String value) {
            characterEncoding = value;
            return this;
        }

        String characterEncoding() {
            return characterEncoding;
        }

        Object attribute(String name) {
            return attributes.get(name);
        }

        /** Session hiện tại (có thể do filter vừa tạo), {@code null} khi chưa có. */
        Session currentSession() {
            return session;
        }

        HttpServletRequest proxy() {
            return proxy;
        }

        private HttpSession session(boolean create) {
            if (session != null && session.invalidated) {
                session = null;
            }
            if (session == null && create) {
                session = new Session();
            }
            return session == null ? null : session.proxy();
        }
    }

    /** Response giả: ghi lại mã lỗi, redirect, header. */
    static final class Response {
        private int status = HttpServletResponse.SC_OK;
        private Integer error;
        private String redirect;
        private String characterEncoding;
        private boolean committed;
        private final Map<String, String> headers = new HashMap<>();
        private final HttpServletResponse proxy = fake(HttpServletResponse.class, (p, m, a) -> switch (m.getName()) {
            case "setHeader" -> {
                headers.put((String) a[0], (String) a[1]);
                yield null;
            }
            case "getHeader" -> headers.get((String) a[0]);
            case "setCharacterEncoding" -> {
                characterEncoding = (String) a[0];
                yield null;
            }
            case "sendError" -> {
                error = (Integer) a[0];
                status = error;
                committed = true;
                yield null;
            }
            case "sendRedirect" -> {
                redirect = (String) a[0];
                status = HttpServletResponse.SC_FOUND;
                committed = true;
                yield null;
            }
            case "isCommitted" -> committed;
            case "getStatus" -> status;
            default -> throw unsupported(m.getName());
        });

        Integer error() {
            return error;
        }

        String redirect() {
            return redirect;
        }

        String header(String name) {
            return headers.get(name);
        }

        String characterEncoding() {
            return characterEncoding;
        }

        void commit() {
            committed = true;
        }

        HttpServletResponse proxy() {
            return proxy;
        }
    }
}
