package vn.tiemtruyen.filter;

import java.time.Duration;

/**
 * Chỗ giữ cho bản Redisson của {@link LoginAttemptStore}: {@code pom.xml} chưa có dependency {@code org.redisson}
 * nên bản Redisson chưa biên dịch được (báo cáo lane 6A, phase 6). Mọi lời gọi ném
 * {@link LoginAttemptStoreException}, để POST đăng nhập trả 500 kèm log thay vì lặng lẽ bỏ chặn.
 * Xoá lớp này khi {@code RedissonLoginAttemptStore} vào thay.
 */
final class UnconfiguredLoginAttemptStore implements LoginAttemptStore {

    static final String REASON = "Chưa có bộ đếm đăng nhập sai trên Redis: pom.xml thiếu dependency org.redisson "
            + "(provided), RedissonLoginAttemptStore chưa được nối (báo cáo plans/reports/phase-06-filter-chung-*)";

    @Override
    public long failures(String key) {
        throw new LoginAttemptStoreException(REASON);
    }

    @Override
    public long increment(String key, Duration ttlIfNew) {
        throw new LoginAttemptStoreException(REASON);
    }

    @Override
    public void expire(String key, Duration ttl) {
        throw new LoginAttemptStoreException(REASON);
    }

    @Override
    public void clear(String key) {
        throw new LoginAttemptStoreException(REASON);
    }

    @Override
    public void close() {
        // Không giữ kết nối nào.
    }
}
