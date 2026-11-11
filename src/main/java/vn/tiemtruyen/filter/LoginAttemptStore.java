package vn.tiemtruyen.filter;

import java.time.Duration;

/**
 * Bộ đếm lần đăng nhập sai của {@link LoginRateLimitFilter}, tách sau interface để test filter không cần Redis.
 * Bản chạy thật nằm ở Redis (Redisson, cùng Redis với session manager); test dùng bản trong bộ nhớ.
 *
 * <p>Mọi lỗi hạ tầng ném {@link LoginAttemptStoreException}; filter không bao giờ coi lỗi đó là "chưa sai lần nào".
 */
interface LoginAttemptStore extends AutoCloseable {

    /**
     * Số lần sai còn trong cửa sổ của một khoá.
     *
     * @param key khoá vai + IP + tên đăng nhập
     * @return số lần sai, 0 khi chưa có hoặc đã hết hạn
     */
    long failures(String key);

    /**
     * Tăng bộ đếm; khoá mới (chưa có hạn) nhận hạn {@code ttlIfNew}, khoá đang có hạn giữ nguyên hạn.
     *
     * @param key khoá
     * @param ttlIfNew hạn của khoá khi khoá chưa có hạn
     * @return số lần sai sau khi tăng
     */
    long increment(String key, Duration ttlIfNew);

    /**
     * Đặt lại hạn của khoá (dùng khi vừa chạm ngưỡng, để thời gian chặn tính đủ từ lần sai đó).
     *
     * @param key khoá
     * @param ttl hạn mới
     */
    void expire(String key, Duration ttl);

    /**
     * Xoá bộ đếm (đăng nhập thành công).
     *
     * @param key khoá
     */
    void clear(String key);

    @Override
    void close();
}
