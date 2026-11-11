package vn.tiemtruyen.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static vn.tiemtruyen.filter.CsrfFilterTest.client;
import static vn.tiemtruyen.filter.CsrfFilterTest.staff;

import jakarta.servlet.ServletException;
import java.io.IOException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.filter.FakeHttp.Request;
import vn.tiemtruyen.filter.FakeHttp.Response;
import vn.tiemtruyen.filter.FakeHttp.Session;
import vn.tiemtruyen.model.Staff;

/** Ma trận phân quyền docs/contracts.md §12: mỗi dòng của bảng một test. */
class AuthFilterTest {

    private static final String CONTEXT = "/tiem";

    private Response response;
    private FakeChain chain;

    private void run(Request request) throws IOException, ServletException {
        response = new Response();
        chain = new FakeChain();
        new AuthFilter().doFilter(request.contextPath(CONTEXT).proxy(), response.proxy(), chain.proxy());
    }

    private void assertAllowed(String path, Session session) throws IOException, ServletException {
        run(Request.get(path).session(session));
        assertEquals(1, chain.calls(), path + " phải cho qua");
        assertNull(response.redirect(), path);
        assertNull(response.error(), path);
    }

    private void assertRedirected(String path, Session session, String login) throws IOException, ServletException {
        run(Request.get(path).session(session));
        assertEquals(0, chain.calls(), path + " không được chạy trang");
        assertEquals(CONTEXT + login, response.redirect(), path);
    }

    private void assertForbidden(String path, Session session) throws IOException, ServletException {
        run(Request.get(path).session(session));
        assertEquals(0, chain.calls(), path);
        assertEquals(403, response.error(), path);
    }

    private static Session clientSession(int id) {
        return FakeHttp.session().with(Requests.CLIENT, client(id));
    }

    private static Session staffSession(String position) {
        Staff staff = staff(3);
        staff.setPosition(position);
        return FakeHttp.session().with(Requests.STAFF, staff);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/HomeView.jsp", "/RegisterView.jsp", "/doRegister.jsp", "/LoginView.jsp"})
    void row1PublicCustomerPagesAreOpenToEveryone(String path) throws IOException, ServletException {
        assertAllowed(path, null);
    }

    @Test
    void row2StaffLoginIsOpenToEveryone() throws IOException, ServletException {
        assertAllowed("/nhan-vien/LoginView.jsp", null);
    }

    @Test
    void row3CancelPageAcceptsALoggedInClientOrStaffOnly() throws IOException, ServletException {
        assertAllowed("/doCancelRentalBill.jsp", clientSession(5));
        assertAllowed("/doCancelRentalBill.jsp", staffSession(Staff.POSITION_SALES));
        assertRedirected("/doCancelRentalBill.jsp", null, "/LoginView.jsp");
        assertRedirected("/doCancelRentalBill.jsp", clientSession(0), "/LoginView.jsp");
    }

    @Test
    void row4bLogoutIsOpenToEveryone() throws IOException, ServletException {
        assertAllowed("/doLogout.jsp", null);
        assertAllowed("/doLogout.jsp", clientSession(5));
        assertAllowed("/doLogout.jsp", staffSession(Staff.POSITION_SALES));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/ClientHomeView.jsp", "/SearchBookView.jsp", "/doAddSelectedBook.jsp",
        "/RentalBillListView.jsp", "/khac/TrangLa.jsp"})
    void row4OtherRootPagesNeedALoggedInClient(String path) throws IOException, ServletException {
        assertAllowed(path, clientSession(5));
        assertRedirected(path, null, "/LoginView.jsp");
        assertRedirected(path, FakeHttp.session(), "/LoginView.jsp");
        assertRedirected(path, clientSession(0), "/LoginView.jsp");
        assertRedirected(path, staffSession(Staff.POSITION_MANAGER), "/LoginView.jsp");
    }

    @Test
    void row4PostToADoPageWithoutLoginIsAlsoRedirected() throws IOException, ServletException {
        run(Request.post("/doAddRentalBill.jsp"));
        assertEquals(0, chain.calls());
        assertEquals(CONTEXT + "/LoginView.jsp", response.redirect());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/nhan-vien/StaffHomeView.jsp", "/nhan-vien/doUpdateRentalBill.jsp", "/nhan-vien/x.jsp"})
    void row5StaffPagesNeedAStaffLogin(String path) throws IOException, ServletException {
        assertAllowed(path, staffSession(Staff.POSITION_SALES));
        assertAllowed(path, staffSession(Staff.POSITION_MANAGER));
        assertRedirected(path, null, "/LoginView.jsp");
        assertRedirected(path, clientSession(5), "/LoginView.jsp");
    }

    @Test
    void row6AdminPagesNeedTheManagerPosition() throws IOException, ServletException {
        String path = "/nhan-vien/quan-tri/ManageBookView.jsp";
        assertAllowed(path, staffSession(Staff.POSITION_MANAGER));
        assertForbidden(path, staffSession(Staff.POSITION_SALES));
        assertForbidden(path, staffSession(null));
        assertRedirected(path, null, "/LoginView.jsp");
        assertRedirected(path, clientSession(5), "/LoginView.jsp");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/dev/StyleGuideView.jsp", "/dev/HomePreviewView.jsp", "/dev/session-probe.jsp"})
    void row7DevPagesAreAlwaysOpen(String path) throws IOException, ServletException {
        assertAllowed(path, null);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/health.jsp", "/static/assets/app.js", "/error/403.jsp", "/error/404.jsp",
        "/favicon.ico", "/", "/khong-co-file"})
    void row8HealthStaticErrorAndNonJspPathsAreOpen(String path) throws IOException, ServletException {
        assertAllowed(path, null);
    }

    @Test
    void expiredSessionCookieOnAClientPageAddsTheExpiredFlag() throws IOException, ServletException {
        run(Request.get("/SearchBookView.jsp").staleSessionCookie());
        assertEquals(0, chain.calls());
        assertEquals(CONTEXT + "/LoginView.jsp?expired=1", response.redirect());
    }

    @Test
    void expiredSessionCookieOnAStaffPageAddsTheExpiredFlag() throws IOException, ServletException {
        run(Request.get("/nhan-vien/quan-tri/ManageBookView.jsp").staleSessionCookie());
        assertEquals(CONTEXT + "/LoginView.jsp?expired=1", response.redirect());
    }

    @Test
    void expiredSessionCookieOnAnOpenPageChangesNothing() throws IOException, ServletException {
        run(Request.get("/RegisterView.jsp").staleSessionCookie());
        assertEquals(1, chain.calls());
        assertNull(response.redirect());
    }

    @Test
    void noSessionCookieAtAllIsNotCalledExpired() throws IOException, ServletException {
        run(Request.get("/ClientHomeView.jsp"));
        assertEquals(CONTEXT + "/LoginView.jsp", response.redirect());
    }

    @Test
    void jspxIsGuardedLikeJsp() throws IOException, ServletException {
        assertRedirected("/ClientHomeView.jspx", null, "/LoginView.jsp");
    }

    @Test
    void pathInfoIsPartOfThePath() throws IOException, ServletException {
        run(Request.get("/nhan-vien").pathInfo("/StaffHomeView.jsp"));
        assertEquals(CONTEXT + "/LoginView.jsp", response.redirect());
    }
}
