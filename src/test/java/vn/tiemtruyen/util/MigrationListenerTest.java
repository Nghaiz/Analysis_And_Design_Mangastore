package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import vn.tiemtruyen.support.SharedMySql;
import vn.tiemtruyen.support.TestDatabase;

/**
 * Phép thử sớm của phase 3: Flyway 13 chạy V1, V2 và V10 e2e trên {@code mysql:8.4.13} bằng đúng
 * {@link MigrationListener#migrate}.
 */
class MigrationListenerTest {

    private static final Set<String> TABLES = new TreeSet<>(List.of("tblUser", "tblClient", "tblStaff", "tblBook",
            "tblBookCopy", "tblDamage", "tblCollateral", "tblCart", "tblSelectedBook", "tblRentalBill",
            "tblRentedBook", "tblRentedDamage", "tblRentalCollateral"));

    @Test
    void migratesSchemaSeedAndE2eCatalogOnMysql84() throws SQLException {
        try (TestDatabase db = TestDatabase.createEmpty()) {
            MigrateResult result = MigrationListener.migrate(db.dataSource(), TestDatabase.E2E_DATA_LOCATION);

            assertTrue(result.success);
            assertEquals(3, result.migrationsExecuted);
            assertEquals("10", result.targetSchemaVersion);
            try (Connection con = db.connection()) {
                assertTrue(scalarString(con, "SELECT VERSION()").startsWith("8.4.13"));
                assertEquals(List.of("1", "2", "10"), appliedVersions(con));
                assertEquals(TABLES, tables(con, db.name()));
                assertTrue(scalarInt(con, "SELECT COUNT(*) FROM tblDamage") > 0, "V2 phải nạp loại lỗi");
                assertEquals(5, scalarInt(con, "SELECT COUNT(*) FROM tblUser"));
                assertTrue(scalarInt(con, "SELECT COUNT(*) FROM tblBook WHERE id = 1") == 1, "V10 e2e có DT001");
            }
        }
    }

    @Test
    void secondRunIsNoOp() {
        try (TestDatabase db = TestDatabase.createMigrated()) {
            MigrateResult again = MigrationListener.migrate(db.dataSource(), TestDatabase.E2E_DATA_LOCATION);
            assertTrue(again.success);
            assertEquals(0, again.migrationsExecuted);
        }
    }

    @Test
    void emptyDataLocationAppliesOnlySchemaAndSeed(@TempDir Path emptyCatalog) throws SQLException {
        try (TestDatabase db = TestDatabase.createEmpty()) {
            MigrateResult result = MigrationListener.migrate(db.dataSource(), "filesystem:" + emptyCatalog);
            assertEquals(2, result.migrationsExecuted);
            try (Connection con = db.connection()) {
                assertEquals(TABLES, tables(con, db.name()));
                assertEquals(0, scalarInt(con, "SELECT COUNT(*) FROM tblBook"));
            }
        }
    }

    @Test
    void missingDataLocationFailsInsteadOfSkippingCatalog() {
        try (TestDatabase db = TestDatabase.createEmpty()) {
            assertThrows(FlywayException.class,
                    () -> MigrationListener.migrate(db.dataSource(), "classpath:db/khong-co"));
        }
    }

    @Test
    void migrationFailureIsThrown() throws SQLException {
        try (TestDatabase db = TestDatabase.createEmpty()) {
            try (Connection con = db.connection(); Statement statement = con.createStatement()) {
                statement.execute("CREATE TABLE tblUser (id INT PRIMARY KEY)");
            }
            assertThrows(FlywayException.class,
                    () -> MigrationListener.migrate(db.dataSource(), TestDatabase.E2E_DATA_LOCATION));
        }
    }

    @Test
    void sharedContainerRunsTheComposeImage() {
        assertEquals("mysql:8.4.13", SharedMySql.IMAGE);
    }

    private static List<String> appliedVersions(Connection con) throws SQLException {
        List<String> versions = new ArrayList<>();
        try (Statement statement = con.createStatement(); ResultSet rs = statement.executeQuery(
                "SELECT version FROM flyway_schema_history WHERE success = 1 ORDER BY installed_rank")) {
            while (rs.next()) {
                versions.add(rs.getString(1));
            }
        }
        return versions;
    }

    private static Set<String> tables(Connection con, String schema) throws SQLException {
        Set<String> tables = new TreeSet<>();
        try (PreparedStatement ps = con.prepareStatement("SELECT table_name FROM information_schema.tables "
                + "WHERE table_schema = ? AND table_name <> 'flyway_schema_history'")) {
            ps.setString(1, schema);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tables.add(rs.getString(1));
                }
            }
        }
        return tables;
    }

    private static int scalarInt(Connection con, String sql) throws SQLException {
        return Integer.parseInt(scalarString(con, sql));
    }

    private static String scalarString(Connection con, String sql) throws SQLException {
        try (Statement statement = con.createStatement(); ResultSet rs = statement.executeQuery(sql)) {
            rs.next();
            return rs.getString(1);
        }
    }
}
