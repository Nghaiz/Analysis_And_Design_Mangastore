package vn.tiemtruyen.filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.Staff;

/**
 * Phần dùng chung của các filter: đường dẫn trong ứng dụng và vai đã đăng nhập đọc từ session
 * (docs/contracts.md §7, §12; plans/261111-tiem-thue-truyen/phase-06-integration.md §2).
 */
final class Requests {

    /** Thuộc tính session nghiệp vụ của khách (docs/contracts.md §7). */
    static final String CLIENT = "client";
    /** Thuộc tính session nghiệp vụ của nhân viên (docs/contracts.md §7). */
    static final String STAFF = "staff";
    /** Thuộc tính session kĩ thuật giữ token CSRF (phase-06-integration.md §2). */
    static final String CSRF_TOKEN = "csrfToken";
    /** Request attribute mang câu báo cho trang (docs/contracts.md §8). */
    static final String MESSAGE = "message";

    static final String CLIENT_LOGIN = "/LoginView.jsp";
    /** Trang cũ của nhân viên, nay chỉ chuyển hướng sang {@link #CLIENT_LOGIN} (C23); vẫn mở và vẫn qua kiểm CSRF. */
    static final String STAFF_LOGIN = "/nhan-vien/LoginView.jsp";
    static final String STAFF_PREFIX = "/nhan-vien/";
    static final String METHOD_POST = "POST";

    private Requests() {
    }

    /**
     * Đường dẫn trong ứng dụng (bỏ context path), đã được Tomcat giải mã và chuẩn hoá.
     *
     * @param request request đang xử lí
     * @return {@code servletPath + pathInfo}
     */
    static String path(HttpServletRequest request) {
        String servletPath = request.getServletPath();
        String pathInfo = request.getPathInfo();
        String base = servletPath == null ? "" : servletPath;
        return pathInfo == null ? base : base + pathInfo;
    }

    /**
     * Đường dẫn do Jasper chạy như trang JSP. Tomcat ánh xạ cả {@code *.jsp} và {@code *.jspx} vào Jasper, nên
     * cả hai đều phải qua kiểm CSRF và phân quyền.
     */
    static boolean isJsp(String path) {
        return path.endsWith(".jsp") || path.endsWith(".jspx");
    }

    static boolean isPost(HttpServletRequest request) {
        return METHOD_POST.equals(request.getMethod());
    }

    /** Khách đã đăng nhập: {@code client} có {@code id > 0} (bản của doRegister có id 0, C5). */
    static Client loggedInClient(HttpSession session) {
        if (session == null) {
            return null;
        }
        Object value = session.getAttribute(CLIENT);
        return value instanceof Client client && client.getId() > 0 ? client : null;
    }

    /** Nhân viên đã đăng nhập: session có {@code staff}. */
    static Staff loggedInStaff(HttpSession session) {
        if (session == null) {
            return null;
        }
        Object value = session.getAttribute(STAFF);
        return value instanceof Staff staff ? staff : null;
    }

    /**
     * Danh tính đã đăng nhập của session, dạng {@code client:<id>|staff:<id>}; chuỗi rỗng khi chưa đăng nhập.
     * Dùng để so trước và sau một lần đăng nhập.
     */
    static String identity(HttpSession session) {
        Client client = loggedInClient(session);
        Staff staff = loggedInStaff(session);
        if (client == null && staff == null) {
            return "";
        }
        String clientPart = client == null ? "" : CLIENT + ":" + client.getId();
        String staffPart = staff == null ? "" : STAFF + ":" + staff.getId();
        return clientPart + "|" + staffPart;
    }
}
