package vn.tiemtruyen.util;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import java.util.Objects;
import java.util.logging.Logger;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;

/**
 * Chạy Flyway lúc webapp khởi động (contract.md §5): {@code classpath:db/migration} (V1 schema, V2 danh mục và
 * tài khoản mẫu) cộng {@link AppConfig#flywayDataLocation()} (biến {@code FLYWAY_DATA_LOCATION}, mặc định
 * {@code filesystem:/flyway/data}, lần chạy E2E đặt {@code classpath:db/e2e}).
 *
 * <p>Location không tồn tại (ví dụ gõ sai {@code FLYWAY_DATA_LOCATION}) là lỗi, không lặng lẽ bỏ catalog; thư mục
 * có mà rỗng thì hợp lệ (chỉ chạy V1, V2). Migration lỗi thì ngoại lệ Flyway ném ra khỏi
 * {@link #contextInitialized(ServletContextEvent)} và Tomcat không khởi động webapp. Test dùng cùng cơ chế qua
 * {@link #migrate(DataSource, String)} (Deferred #8).
 */
@WebListener
public final class MigrationListener implements ServletContextListener {

    /** Location của schema và dữ liệu mẫu, có ở mọi lần chạy. */
    public static final String SCHEMA_LOCATION = "classpath:db/migration";

    private static final Logger LOG = Logger.getLogger(MigrationListener.class.getName());

    @Override
    public void contextInitialized(ServletContextEvent event) {
        migrate(Db.dataSource(), AppConfig.get().flywayDataLocation());
    }

    /**
     * Migrate một database tới phiên bản mới nhất với {@link #SCHEMA_LOCATION} và {@code dataLocation}.
     *
     * @param dataSource nguồn kết nối tới database đích (database mặc định của URL)
     * @param dataLocation location Flyway của catalog, ví dụ {@code classpath:db/e2e}
     * @return kết quả của Flyway (số migration đã chạy, phiên bản đích)
     * @throws org.flywaydb.core.api.FlywayException khi migration lỗi
     */
    public static MigrateResult migrate(DataSource dataSource, String dataLocation) {
        Objects.requireNonNull(dataSource, "dataSource");
        Objects.requireNonNull(dataLocation, "dataLocation");
        Flyway flyway = Flyway.configure(MigrationListener.class.getClassLoader())
                .dataSource(dataSource)
                .locations(SCHEMA_LOCATION, dataLocation)
                .failOnMissingLocations(true)
                .load();
        MigrateResult result = flyway.migrate();
        LOG.info(() -> "Flyway: " + result.migrationsExecuted + " migration đã chạy, phiên bản "
                + result.targetSchemaVersion + " (" + SCHEMA_LOCATION + ", " + dataLocation + ")");
        return result;
    }
}
