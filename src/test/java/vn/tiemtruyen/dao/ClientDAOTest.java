package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static vn.tiemtruyen.dao.UserDAOTest.credentials;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Consumer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.support.TestDatabase;
import vn.tiemtruyen.util.Passwords;

/** {@link ClientDAO#checkLogin(vn.tiemtruyen.model.User)} và {@link ClientDAO#addClient(Client)}. */
class ClientDAOTest {

    private static final List<String> TABLES = List.of("tblUser", "tblClient", "tblCart");

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
    void clientLoginReturnsClientFields() throws Exception {
        try (ClientDAO dao = new ClientDAO(db.connection())) {
            Client client = dao.checkLogin(credentials("khach01", "khach01@123"));
            assertNotNull(client);
            assertEquals(3, client.getId());
            assertEquals("khach01", client.getUsername());
            assertEquals("Lê Hoàng Nam", client.getFullName());
            assertEquals(LocalDate.of(1998, 4, 12), client.getDob());
            assertEquals("001098004512", client.getIdCard());
            assertEquals("0987001122", client.getPhone());
            assertEquals("hoangnam.le@example.com", client.getEmail());
            assertEquals("Số 5 Nguyễn Trãi, Thanh Xuân, Hà Nội", client.getAddress());
            assertNull(client.getPassword());
        }
    }

    @Test
    void wrongPasswordOrStaffAccountReturnsNull() throws Exception {
        try (ClientDAO dao = new ClientDAO(db.connection())) {
            assertNull(dao.checkLogin(credentials("khach01", "khach02@123")));
            assertNull(dao.checkLogin(credentials("khongco", "khach01@123")));
            assertNull(dao.checkLogin(credentials("hant", "hant@123")));
        }
    }

    @Test
    void addClientCreatesUserClientAndCartThenCanLogIn() throws Exception {
        Client client = newClient("minhanh", "001203009999", "0912345678", "minhanh@example.com");
        int[] before = counts();
        try (ClientDAO dao = new ClientDAO(db.connection())) {
            assertTrue(dao.addClient(client));
            assertNotEquals(0, client.getId());

            Client loggedIn = dao.checkLogin(credentials("minhanh", "minhanh@123"));
            assertNotNull(loggedIn);
            assertEquals(client.getId(), loggedIn.getId());
            assertEquals("Trần Minh Anh", loggedIn.getFullName());
            assertEquals(LocalDate.of(2003, 5, 14), loggedIn.getDob());
        }
        int[] after = counts();
        for (int i = 0; i < TABLES.size(); i++) {
            assertEquals(before[i] + 1, after[i], TABLES.get(i));
        }
        assertEquals(1, queryInt("SELECT COUNT(*) FROM tblCart WHERE clientId = " + client.getId()));
        String stored = queryString("SELECT password FROM tblUser WHERE id = " + client.getId());
        assertTrue(stored.startsWith("$argon2id$"), stored);
        assertTrue(Passwords.verify("minhanh@123", stored));
    }

    @Test
    void duplicateOfEachUniqueFieldReturnsFalseAndLeavesNoRows() throws Exception {
        List<Consumer<Client>> duplicates = List.of(
                c -> c.setUsername("khach01"),
                c -> c.setUsername("KHACH01"),
                c -> c.setIdCard("001098004512"),
                c -> c.setPhone("0987001122"),
                c -> c.setEmail("hoangnam.le@example.com"));
        for (Consumer<Client> makeDuplicate : duplicates) {
            Client client = newClient("trungthu", "001203008888", "0911112222", "trungthu@example.com");
            makeDuplicate.accept(client);
            int[] before = counts();
            try (ClientDAO dao = new ClientDAO(db.connection())) {
                assertFalse(dao.addClient(client));
                assertTrue(dao.con().getAutoCommit());
            }
            assertEquals(0, client.getId());
            assertArrayEquals(before, counts());
        }
        assertEquals(0, queryInt("SELECT COUNT(*) FROM tblUser WHERE username = 'trungthu'"));
    }

    @Test
    void otherSqlErrorIsThrownAndRolledBack() throws Exception {
        Client client = newClient("thieungay", "001203007777", "0913334444", "thieungay@example.com");
        client.setDob(null);
        int[] before = counts();
        try (ClientDAO dao = new ClientDAO(db.connection())) {
            SQLException e = assertThrows(SQLException.class, () -> dao.addClient(client));
            assertNotEquals(1062, e.getErrorCode());
        }
        assertEquals(0, client.getId());
        assertArrayEquals(before, counts());
    }

    private static Client newClient(String username, String idCard, String phone, String email) {
        Client client = new Client();
        client.setUsername(username);
        client.setPassword(username + "@123");
        client.setFullName("Trần Minh Anh");
        client.setDob(LocalDate.of(2003, 5, 14));
        client.setIdCard(idCard);
        client.setPhone(phone);
        client.setEmail(email);
        client.setAddress("Số 12 Trần Phú, Hà Đông, Hà Nội");
        return client;
    }

    private static int[] counts() throws SQLException {
        int[] result = new int[TABLES.size()];
        for (int i = 0; i < TABLES.size(); i++) {
            result[i] = queryInt("SELECT COUNT(*) FROM " + TABLES.get(i));
        }
        return result;
    }

    private static int queryInt(String sql) throws SQLException {
        return Integer.parseInt(queryString(sql));
    }

    private static String queryString(String sql) throws SQLException {
        try (Connection con = db.connection(); PreparedStatement ps = con.prepareStatement(sql);
                ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            return rs.getString(1);
        }
    }
}
