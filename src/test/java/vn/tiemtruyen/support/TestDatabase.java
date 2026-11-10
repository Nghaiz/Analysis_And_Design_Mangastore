package vn.tiemtruyen.support;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import javax.sql.DataSource;
import vn.tiemtruyen.util.MigrationListener;

/**
 * Một database riêng trên {@link SharedMySql}, tên ngẫu nhiên, có pool HikariCP riêng. Đóng thì đóng pool và xoá
 * database.
 *
 * <p>Cách dùng trong lớp test DAO (package {@code vn.tiemtruyen.dao}, gọi constructor {@code protected} của DAO):
 * <pre>{@code
 * private static TestDatabase db;
 *
 * @BeforeAll
 * static void createDatabase() {
 *     db = TestDatabase.createMigrated();
 * }
 *
 * @AfterAll
 * static void dropDatabase() {
 *     db.close();
 * }
 *
 * @Test
 * void loginWorks() throws Exception {
 *     try (UserDAO dao = new UserDAO(db.connection())) { ... }
 * }
 * }</pre>
 * Mỗi lần gọi {@link #connection()} mượn một kết nối khác từ pool (tối đa {@link #MAX_CONNECTIONS} cùng lúc),
 * nên mỗi luồng của test tranh chấp lấy kết nối riêng. DAO đóng kết nối được đưa vào khi {@code close()}.
 * Database dùng chung cho mọi hàm test của lớp; test cần dữ liệu sạch thì gọi {@link #createMigrated()} riêng.
 */
public final class TestDatabase implements AutoCloseable {

    /** Location catalog của lần chạy E2E: V10 (catalog ch.2). */
    public static final String E2E_DATA_LOCATION = "classpath:db/e2e";
    /** Số kết nối tối đa đồng thời của một database test. */
    public static final int MAX_CONNECTIONS = 20;

    private static final long CONNECTION_TIMEOUT_MS = 10_000;

    private final String name;
    private final HikariDataSource dataSource;

    private TestDatabase(String name, HikariDataSource dataSource) {
        this.name = name;
        this.dataSource = dataSource;
    }

    /**
     * Database mới đã migrate V1, V2 ({@code classpath:db/migration}) và V10 e2e ({@code classpath:db/e2e}) bằng
     * {@link MigrationListener#migrate(DataSource, String)}, đúng cơ chế của app.
     *
     * @return database sẵn sàng
     */
    public static TestDatabase createMigrated() {
        TestDatabase database = createEmpty();
        try {
            MigrationListener.migrate(database.dataSource(), E2E_DATA_LOCATION);
        } catch (RuntimeException e) {
            database.close();
            throw e;
        }
        return database;
    }

    /**
     * Database mới chưa có bảng nào (test migration tự gọi Flyway).
     *
     * @return database rỗng
     */
    public static TestDatabase createEmpty() {
        String name = "t_" + UUID.randomUUID().toString().replace("-", "");
        execute("CREATE DATABASE " + name + " CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
        HikariConfig config = new HikariConfig();
        config.setPoolName(name);
        config.setJdbcUrl(SharedMySql.jdbcUrl(name));
        config.setUsername(SharedMySql.user());
        config.setPassword(SharedMySql.password());
        config.setMaximumPoolSize(MAX_CONNECTIONS);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(CONNECTION_TIMEOUT_MS);
        return new TestDatabase(name, new HikariDataSource(config));
    }

    /** Tên database (đồng thời là schema trong {@code information_schema}). */
    public String name() {
        return name;
    }

    /** Pool của database; dùng cho Flyway hoặc khi test cần tự quản lí kết nối. */
    public DataSource dataSource() {
        return dataSource;
    }

    /**
     * Mượn một kết nối mới (autocommit bật). Người gọi đóng nó, thường bằng cách đưa vào DAO.
     *
     * @return kết nối riêng cho luồng gọi
     * @throws SQLException khi pool hết kết nối trong thời gian chờ
     */
    public Connection connection() throws SQLException {
        return dataSource.getConnection();
    }

    /** Đóng pool và xoá database. */
    @Override
    public void close() {
        dataSource.close();
        execute("DROP DATABASE IF EXISTS " + name);
    }

    private static void execute(String sql) {
        try (Connection admin = DriverManager.getConnection(SharedMySql.jdbcUrl(""), SharedMySql.user(),
                SharedMySql.password()); Statement statement = admin.createStatement()) {
            statement.execute(sql);
        } catch (SQLException e) {
            throw new IllegalStateException("Lệnh quản trị MySQL test lỗi: " + sql, e);
        }
    }
}
