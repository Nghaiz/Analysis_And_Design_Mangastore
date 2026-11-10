package vn.tiemtruyen.util;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.sql.DataSource;

/**
 * Một {@link DataSource} HikariCP duy nhất cho cả ứng dụng, tạo lười ở lần dùng đầu.
 *
 * <p>Pool được tạo mà không chờ kết nối thử ({@code initializationFailTimeout = -1}), nên khi MySQL chưa sẵn
 * sàng thì {@link #getConnection()} ném {@link SQLException} còn lần gọi sau tự kết nối lại. Thiếu biến cấu
 * hình thì ném {@link IllegalStateException} nêu tên biến và lần sau thử tạo lại.
 */
public final class Db {

    private static final Logger LOG = Logger.getLogger(Db.class.getName());
    private static final long CONNECTION_TIMEOUT_MS = 3_000;
    private static final int VALIDATION_TIMEOUT_SECONDS = 2;
    private static final String POOL_NAME = "tiemtruyen";

    private static volatile HikariDataSource dataSource;

    private Db() {
    }

    /**
     * DataSource dùng chung; tạo ở lần gọi đầu.
     *
     * @return pool HikariCP của ứng dụng
     * @throws IllegalStateException khi thiếu hoặc sai biến cấu hình DB
     */
    public static DataSource dataSource() {
        HikariDataSource current = dataSource;
        if (current != null) {
            return current;
        }
        synchronized (Db.class) {
            if (dataSource == null) {
                dataSource = new HikariDataSource(config(AppConfig.get()));
            }
            return dataSource;
        }
    }

    /**
     * Mượn một kết nối từ pool; người gọi phải đóng nó (try-with-resources).
     *
     * @return kết nối tới MySQL
     * @throws SQLException khi không lấy được kết nối trong thời gian chờ
     */
    public static Connection getConnection() throws SQLException {
        return dataSource().getConnection();
    }

    /**
     * Kiểm DB còn trả lời không; dùng cho {@code /health.jsp}. Lỗi được ghi log (không kèm bí mật) rồi trả
     * {@code false}.
     *
     * @return {@code true} khi lấy được kết nối và kết nối hợp lệ
     */
    public static boolean ping() {
        try (Connection connection = getConnection()) {
            return connection.isValid(VALIDATION_TIMEOUT_SECONDS);
        } catch (SQLException | IllegalStateException e) {
            LOG.log(Level.WARNING, "Ping DB thất bại: {0}", e.getMessage());
            return false;
        }
    }

    /** Đóng pool (khi ứng dụng dừng). Lần gọi {@link #dataSource()} sau đó tạo pool mới. */
    public static void shutdown() {
        synchronized (Db.class) {
            if (dataSource != null) {
                dataSource.close();
                dataSource = null;
            }
        }
    }

    static HikariConfig config(AppConfig config) {
        HikariConfig hikari = new HikariConfig();
        hikari.setPoolName(POOL_NAME);
        hikari.setDriverClassName("com.mysql.cj.jdbc.Driver");
        hikari.setJdbcUrl(config.dbUrl());
        hikari.setUsername(config.dbUser());
        hikari.setPassword(config.dbPassword());
        hikari.setMaximumPoolSize(config.dbPoolSize());
        hikari.setConnectionTimeout(CONNECTION_TIMEOUT_MS);
        hikari.setInitializationFailTimeout(-1);
        return hikari;
    }
}
