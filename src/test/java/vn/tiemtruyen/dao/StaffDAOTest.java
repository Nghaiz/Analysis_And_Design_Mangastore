package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static vn.tiemtruyen.dao.UserDAOTest.credentials;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.Staff;
import vn.tiemtruyen.support.TestDatabase;

/** {@link StaffDAO#checkLogin(vn.tiemtruyen.model.User)} trên tài khoản mẫu của V2. */
class StaffDAOTest {

    private static TestDatabase db;

    @BeforeAll
    static void createDatabase() {
        db = TestDatabase.createMigrated();
    }

    @AfterAll
    static void dropDatabase() {
        db.close();
    }

    @Test
    void staffLoginReturnsPosition() throws Exception {
        try (StaffDAO dao = new StaffDAO(db.connection())) {
            Staff sales = dao.checkLogin(credentials("hant", "hant@123"));
            assertNotNull(sales);
            assertEquals(1, sales.getId());
            assertEquals("hant", sales.getUsername());
            assertEquals("Nguyễn Thu Hà", sales.getFullName());
            assertEquals(Staff.POSITION_SALES, sales.getPosition());
            assertNull(sales.getPassword());

            Staff manager = dao.checkLogin(credentials("quanli", "quanli@123"));
            assertNotNull(manager);
            assertEquals(2, manager.getId());
            assertEquals(Staff.POSITION_MANAGER, manager.getPosition());
        }
    }

    @Test
    void wrongPasswordOrClientAccountReturnsNull() throws Exception {
        try (StaffDAO dao = new StaffDAO(db.connection())) {
            assertNull(dao.checkLogin(credentials("hant", "quanli@123")));
            assertNull(dao.checkLogin(credentials("khongco", "hant@123")));
            assertNull(dao.checkLogin(credentials("khach01", "khach01@123")));
        }
    }
}
