package vn.tiemtruyen.filter;

import java.time.Duration;
import java.util.Objects;

/**
 * Bộ đếm thay thế khi không nối được Redis lúc khởi động: mọi lời gọi ném {@link LoginAttemptStoreException} kèm
 * lí do, để POST đăng nhập trả 500 kèm log thay vì lặng lẽ bỏ chặn. Không làm hỏng việc deploy cả webapp (filter
 * {@code init} ném lỗi thì context không lên, mọi trang 404).
 */
final class UnavailableLoginAttemptStore implements LoginAttemptStore {

    private final String reason;
    private final Throwable cause;

    UnavailableLoginAttemptStore(String reason, Throwable cause) {
        this.reason = Objects.requireNonNull(reason, "reason");
        this.cause = cause;
    }

    @Override
    public long failures(String key) {
        throw unavailable();
    }

    @Override
    public long increment(String key, Duration ttlIfNew) {
        throw unavailable();
    }

    @Override
    public void expire(String key, Duration ttl) {
        throw unavailable();
    }

    @Override
    public void clear(String key) {
        throw unavailable();
    }

    @Override
    public void close() {
        // Không giữ kết nối nào.
    }

    private LoginAttemptStoreException unavailable() {
        return new LoginAttemptStoreException(reason, cause);
    }
}
