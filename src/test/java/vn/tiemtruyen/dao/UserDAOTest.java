package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.User;
import vn.tiemtruyen.support.TestDatabase;

/** {@link UserDAO#checkLogin(User)} trên tài khoản mẫu của V2 (docs/dev-accounts.md). */
class UserDAOTest {

    private static TestDatabase db;

    @BeforeAll
    static void createDatabase() {
        db = TestDatabase.createMigrated();
    }

    @AfterAll
    static void dropDatabase() {
        db.close();
    }

    static User credentials(String username, String password) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        return user;
    }

    @Test
    void correctPasswordReturnsUserWithoutPasswordHash() throws Exception {
        try (UserDAO dao = new UserDAO(db.connection())) {
            User staff = dao.checkLogin(credentials("hant", "hant@123"));
            assertNotNull(staff);
            assertEquals(1, staff.getId());
            assertEquals("hant", staff.getUsername());
            assertEquals("Nguyễn Thu Hà", staff.getFullName());
            assertNull(staff.getPassword());

            User client = dao.checkLogin(credentials("khach01", "khach01@123"));
            assertNotNull(client);
            assertEquals(3, client.getId());
            assertEquals("Lê Hoàng Nam", client.getFullName());
        }
    }

    @Test
    void wrongPasswordUnknownUserOrMissingFieldReturnsNull() throws Exception {
        try (UserDAO dao = new UserDAO(db.connection())) {
            assertNull(dao.checkLogin(credentials("hant", "hant@124")));
            assertNull(dao.checkLogin(credentials("hant", "")));
            assertNull(dao.checkLogin(credentials("khongco", "hant@123")));
            assertNull(dao.checkLogin(credentials(null, "hant@123")));
            assertNull(dao.checkLogin(credentials("hant", null)));
        }
    }

    @Test
    void storedHashTypedAsPasswordIsRejected() throws Exception {
        String storedHash = "$argon2id$v=19$m=19456,t=2,p=1$Z7/ga5InHhW9wZ1E0Nwo2g"
                + "$6OHItTnti86VDbCM3ZI9PqzZZPkQfllb9oYdM2EpeQc";
        try (UserDAO dao = new UserDAO(db.connection())) {
            assertNull(dao.checkLogin(credentials("hant", storedHash)));
        }
    }
}
