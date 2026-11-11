package vn.tiemtruyen.util;

import java.util.Map;
import java.util.Objects;
import java.util.function.UnaryOperator;
import java.util.regex.Pattern;

/**
 * Cấu hình ứng dụng đọc từ biến môi trường (danh sách biến: contract.md §4).
 *
 * <p>Biến bí mật ({@code APP_DB_PASSWORD}) không có giá trị mặc định: thiếu thì ném lỗi nêu tên biến.
 * Chỉ các biến có giá trị mặc định ghi trong hợp đồng mới được dùng mặc định. Giá trị chỉ đọc khi được hỏi,
 * nên một trang không cần DB (ví dụ trang tạm) vẫn chạy được khi thiếu biến DB.
 */
public final class AppConfig {

    private static final int DEFAULT_POOL_SIZE = 10;
    private static final int MAX_POOL_SIZE = 100;
    private static final String DEFAULT_COVERS_BASE_URL = "/covers";
    private static final String DEFAULT_FLYWAY_DATA_LOCATION = "filesystem:/flyway/data";
    private static final Pattern ORIGIN_PATTERN = Pattern.compile("https?://[A-Za-z0-9.\\-]+(:\\d{1,5})?");

    private final UnaryOperator<String> source;

    /**
     * Tạo cấu hình đọc từ một nguồn tuỳ ý (dùng trong test).
     *
     * @param source hàm trả giá trị của biến theo tên, {@code null} khi không có
     */
    public AppConfig(UnaryOperator<String> source) {
        this.source = Objects.requireNonNull(source, "source");
    }

    /**
     * Tạo cấu hình từ một bảng tên → giá trị (dùng trong test).
     *
     * @param values bảng biến
     * @return cấu hình đọc từ bảng
     */
    public static AppConfig of(Map<String, String> values) {
        Map<String, String> copy = Map.copyOf(values);
        return new AppConfig(copy::get);
    }

    /**
     * Cấu hình của tiến trình, đọc {@link System#getenv(String)}.
     *
     * @return thể hiện dùng chung
     */
    public static AppConfig get() {
        return Holder.INSTANCE;
    }

    /** URL JDBC tới MySQL. */
    public String dbUrl() {
        return require("APP_DB_URL");
    }

    /** Tài khoản MySQL của ứng dụng. */
    public String dbUser() {
        return require("APP_DB_USER");
    }

    /** Mật khẩu MySQL của ứng dụng (bí mật, không có mặc định). */
    public String dbPassword() {
        return require("APP_DB_PASSWORD");
    }

    /** Số kết nối tối đa của pool, mặc định 10, trong khoảng 1..100. */
    public int dbPoolSize() {
        int size = intValue("APP_DB_POOL_SIZE", DEFAULT_POOL_SIZE);
        if (size < 1 || size > MAX_POOL_SIZE) {
            throw new IllegalStateException("APP_DB_POOL_SIZE phải trong khoảng 1.." + MAX_POOL_SIZE
                    + ", đang là " + size);
        }
        return size;
    }

    /** {@code true} khi JSP nạp tài nguyên từ Vite dev server thay cho manifest. */
    public boolean viteDev() {
        return flag("APP_VITE_DEV", false);
    }

    /**
     * Origin của Vite dev server ({@code http(s)://host[:port]}, không path), bắt buộc khi {@link #viteDev()}
     * bật. Một dấu {@code /} ở cuối được bỏ. Giá trị được in thẳng vào HTML và JS nên chỉ nhận đúng dạng origin.
     */
    public String viteDevOrigin() {
        String origin = require("APP_VITE_DEV_ORIGIN");
        String trimmed = origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
        if (!ORIGIN_PATTERN.matcher(trimmed).matches()) {
            throw new IllegalStateException("APP_VITE_DEV_ORIGIN phải có dạng http://host:port, đang là \"" + origin
                    + "\"");
        }
        return trimmed;
    }

    /** Tiền tố URL của ảnh bìa, mặc định {@code /covers}. */
    public String coversBaseUrl() {
        return optional("APP_COVERS_BASE_URL", DEFAULT_COVERS_BASE_URL);
    }

    /**
     * Location Flyway của dữ liệu catalog ({@code FLYWAY_DATA_LOCATION}), mặc định {@code filesystem:/flyway/data}
     * (volume {@code catalog_data} gắn vào container app); lần chạy E2E đặt {@code classpath:db/e2e}.
     */
    public String flywayDataLocation() {
        return optional("FLYWAY_DATA_LOCATION", DEFAULT_FLYWAY_DATA_LOCATION);
    }

    /**
     * Giá trị bắt buộc của một biến; rỗng hoặc chỉ có khoảng trắng tính là thiếu.
     *
     * @param name tên biến môi trường
     * @return giá trị đã bỏ khoảng trắng hai đầu
     * @throws IllegalStateException khi thiếu, thông điệp nêu tên biến
     */
    public String require(String name) {
        String value = raw(name);
        if (value == null) {
            throw new IllegalStateException("Thiếu biến môi trường " + name + " (xem .env.example)");
        }
        return value;
    }

    /**
     * Giá trị của một biến không bí mật, hoặc giá trị mặc định ghi trong hợp đồng khi thiếu.
     *
     * @param name tên biến môi trường
     * @param defaultValue giá trị mặc định
     * @return giá trị đã bỏ khoảng trắng hai đầu hoặc {@code defaultValue}
     */
    public String optional(String name, String defaultValue) {
        String value = raw(name);
        return value == null ? defaultValue : value;
    }

    /**
     * Số nguyên từ một biến, hoặc giá trị mặc định khi thiếu.
     *
     * @param name tên biến môi trường
     * @param defaultValue giá trị mặc định
     * @return số đã đọc
     * @throws IllegalStateException khi giá trị không phải số nguyên
     */
    public int intValue(String name, int defaultValue) {
        String value = raw(name);
        if (value == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            throw new IllegalStateException(name + " phải là số nguyên, đang là \"" + value + "\"", e);
        }
    }

    /**
     * Cờ {@code true}/{@code false} từ một biến, hoặc giá trị mặc định khi thiếu. Giá trị khác ném lỗi.
     *
     * @param name tên biến môi trường
     * @param defaultValue giá trị mặc định
     * @return giá trị cờ
     */
    public boolean flag(String name, boolean defaultValue) {
        String value = raw(name);
        if (value == null) {
            return defaultValue;
        }
        return switch (value) {
            case "true" -> true;
            case "false" -> false;
            default -> throw new IllegalStateException(name + " chỉ nhận true hoặc false, đang là \"" + value + "\"");
        };
    }

    private String raw(String name) {
        String value = source.apply(name);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.strip();
    }

    private static final class Holder {
        private static final AppConfig INSTANCE = new AppConfig(System::getenv);
    }
}
