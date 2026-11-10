package vn.tiemtruyen.util;

import com.mysql.cj.jdbc.AbandonedConnectionCleanupThread;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Collections;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Dọn tài nguyên JDBC khi webapp dừng: đóng pool {@link Db}, gỡ driver MySQL do webapp nạp và dừng luồng dọn
 * kết nối của Connector/J. Không có bước này Tomcat cảnh báo rò bộ nhớ mỗi lần container app dừng.
 */
@WebListener
public final class DbShutdownListener implements ServletContextListener {

    private static final Logger LOG = Logger.getLogger(DbShutdownListener.class.getName());

    @Override
    public void contextDestroyed(ServletContextEvent event) {
        Db.shutdown();
        ClassLoader webapp = DbShutdownListener.class.getClassLoader();
        for (Driver driver : Collections.list(DriverManager.getDrivers())) {
            if (driver.getClass().getClassLoader() != webapp) {
                continue;
            }
            try {
                DriverManager.deregisterDriver(driver);
            } catch (SQLException e) {
                LOG.log(Level.WARNING, "Không gỡ được driver JDBC " + driver.getClass().getName(), e);
            }
        }
        AbandonedConnectionCleanupThread.checkedShutdown();
    }
}
