package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.concurrent.Callable;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.dao.DAO;
import vn.tiemtruyen.support.TestDatabase;

/** Helper transaction của {@link DAO} theo contracts §5.2, thử qua một DAO giả (không thuộc gói dao). */
class DaoTransactionTest {

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
    void trueCommitsAndRestoresAutocommitAndIsolation() throws Exception {
        try (ProbeDao dao = new ProbeDao(db.connection())) {
            dao.connection().setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            int[] seenIsolation = new int[1];
            boolean[] seenAutoCommit = new boolean[1];
            assertTrue(dao.write(() -> {
                seenIsolation[0] = dao.connection().getTransactionIsolation();
                seenAutoCommit[0] = dao.connection().getAutoCommit();
                insertDamage(dao.connection(), "Thử commit");
                return true;
            }));
            assertEquals(Connection.TRANSACTION_READ_COMMITTED, seenIsolation[0]);
            assertFalse(seenAutoCommit[0]);
            assertTrue(dao.connection().getAutoCommit());
            assertEquals(Connection.TRANSACTION_REPEATABLE_READ, dao.connection().getTransactionIsolation());
        }
        assertEquals(1, countDamage("Thử commit"));
    }

    @Test
    void falseRollsBack() throws Exception {
        try (ProbeDao dao = new ProbeDao(db.connection())) {
            assertFalse(dao.write(() -> {
                insertDamage(dao.connection(), "Thử rollback");
                return false;
            }));
            assertTrue(dao.connection().getAutoCommit());
        }
        assertEquals(0, countDamage("Thử rollback"));
    }

    @Test
    void exceptionsRollBackAndPropagate() throws Exception {
        try (ProbeDao dao = new ProbeDao(db.connection())) {
            SQLException sql = assertThrows(SQLException.class, () -> dao.write(() -> {
                insertDamage(dao.connection(), "Thử lỗi SQL");
                insertDamage(dao.connection(), "Thử lỗi SQL");
                return true;
            }));
            assertEquals(1062, sql.getErrorCode());
            assertThrows(IllegalStateException.class, () -> dao.write(() -> {
                insertDamage(dao.connection(), "Thử lỗi runtime");
                throw new IllegalStateException("hỏng");
            }));
            SQLException wrapped = assertThrows(SQLException.class, () -> dao.write(() -> {
                insertDamage(dao.connection(), "Thử lỗi IO");
                throw new IOException("hỏng");
            }));
            assertTrue(wrapped.getCause() instanceof IOException);
            assertThrows(IllegalStateException.class, () -> dao.write(() -> null));
            assertTrue(dao.connection().getAutoCommit());
        }
        assertEquals(0, countDamage("Thử lỗi SQL"));
        assertEquals(0, countDamage("Thử lỗi runtime"));
        assertEquals(0, countDamage("Thử lỗi IO"));
    }

    @Test
    void refusesToNest() throws Exception {
        try (ProbeDao dao = new ProbeDao(db.connection())) {
            assertThrows(IllegalStateException.class, () -> dao.write(() -> dao.write(() -> true)));
            assertTrue(dao.connection().getAutoCommit());
        }
    }

    @Test
    void closeClosesTheGivenConnection() throws Exception {
        Connection con = db.connection();
        new ProbeDao(con).close();
        assertTrue(con.isClosed());
    }

    private static void insertDamage(Connection con, String name) throws SQLException {
        try (var ps = con.prepareStatement("INSERT INTO tblDamage (name) VALUES (?)")) {
            ps.setString(1, name);
            ps.executeUpdate();
        }
    }

    private static int countDamage(String name) throws SQLException {
        try (Connection con = db.connection();
                var ps = con.prepareStatement("SELECT COUNT(*) FROM tblDamage WHERE name = ?")) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    /** DAO giả chỉ để gọi helper protected của {@link DAO}. */
    private static final class ProbeDao extends DAO {
        ProbeDao(Connection con) {
            super(con);
        }

        Connection connection() {
            return con();
        }

        boolean write(Callable<Boolean> work) throws SQLException {
            return inWriteTransaction(work);
        }
    }
}
