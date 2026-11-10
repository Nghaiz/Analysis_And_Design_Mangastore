package vn.tiemtruyen.support;

import org.testcontainers.mysql.MySQLContainer;

/**
 * Một container {@code mysql:8.4.13} dùng chung cho cả JVM test: khởi ở lần dùng đầu, không bao giờ dừng tay (Ryuk
 * của Testcontainers dọn khi JVM thoát). Không dùng module testcontainers-junit-jupiter.
 *
 * <p>Mỗi lớp test không dùng thẳng lớp này mà tạo database riêng qua {@link TestDatabase}. Container chạy múi giờ
 * {@code Asia/Ho_Chi_Minh} giống compose ({@code TZ} trong {@code .env.example}).
 */
public final class SharedMySql {

    /** Image đúng của compose (contract.md §3). */
    public static final String IMAGE = "mysql:8.4.13";
    /** Múi giờ của server và của URL JDBC, khớp {@code .env.example}. */
    public static final String TIME_ZONE = "Asia/Ho_Chi_Minh";

    private SharedMySql() {
    }

    /**
     * URL JDBC tới một database của container, cùng tham số với {@code APP_DB_URL} của {@code .env.example}.
     *
     * @param database tên database
     * @return URL JDBC
     */
    public static String jdbcUrl(String database) {
        MySQLContainer container = Holder.CONTAINER;
        return "jdbc:mysql://" + container.getHost() + ":" + container.getMappedPort(MySQLContainer.MYSQL_PORT) + "/"
                + database + "?characterEncoding=UTF-8&connectionTimeZone=" + TIME_ZONE
                + "&sslMode=DISABLED&allowPublicKeyRetrieval=true";
    }

    /** Tài khoản quản trị (root) để tạo và xoá database. */
    public static String user() {
        return "root";
    }

    /** Mật khẩu root của container. */
    public static String password() {
        return Holder.CONTAINER.getPassword();
    }

    private static final class Holder {
        private static final MySQLContainer CONTAINER = start();

        private static MySQLContainer start() {
            MySQLContainer container = new MySQLContainer(IMAGE).withEnv("TZ", TIME_ZONE);
            container.start();
            return container;
        }
    }
}
