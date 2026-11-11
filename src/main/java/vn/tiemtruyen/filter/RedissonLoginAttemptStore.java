package vn.tiemtruyen.filter;

import java.time.Duration;
import java.util.function.Supplier;
import org.redisson.Redisson;
import org.redisson.api.RAtomicLong;
import org.redisson.api.RedissonClient;
import org.redisson.client.RedisException;
import org.redisson.config.Config;
import vn.tiemtruyen.util.AppConfig;

/**
 * Bộ đếm đăng nhập sai trên Redis qua Redisson, cùng Redis với session manager ({@code APP_REDIS_ADDRESS},
 * {@code REDIS_PASSWORD}). Jar Redisson nằm ở {@code $CATALINA_HOME/lib} của ảnh app, WAR chỉ biên dịch với nó.
 *
 * <p>Mỗi khoá là một số nguyên Redis ({@code INCR}); lần tăng đầu đặt hạn bằng {@code EXPIRE ... NX} nên khoá
 * không bao giờ kẹt vô hạn kể cả khi app dừng giữa hai lệnh. Mọi {@link RedisException} được bọc thành
 * {@link LoginAttemptStoreException} để filter trả 500.
 */
final class RedissonLoginAttemptStore implements LoginAttemptStore {

    /** Cùng giá trị với {@code docker/app/redisson.yaml} của session manager. */
    private static final int CONNECT_TIMEOUT_MILLIS = 5000;
    private static final int COMMAND_TIMEOUT_MILLIS = 3000;
    /** Bộ đếm chỉ gửi vài lệnh mỗi lần đăng nhập: giữ pool nhỏ thay cho mặc định 64 kết nối của Redisson. */
    private static final int POOL_SIZE = 4;
    private static final int MIN_IDLE = 1;
    private static final int THREADS = 2;

    private final RedissonClient client;

    private RedissonLoginAttemptStore(RedissonClient client) {
        this.client = client;
    }

    /**
     * Nối tới Redis theo cấu hình.
     *
     * @param config cấu hình ứng dụng
     * @return bộ đếm đã nối
     * @throws LoginAttemptStoreException khi không nối được Redis
     */
    static RedissonLoginAttemptStore connect(AppConfig config) {
        Config redis = new Config();
        redis.setPassword(config.redisPassword());
        redis.setThreads(THREADS);
        redis.setNettyThreads(THREADS);
        redis.useSingleServer()
                .setAddress(config.redisAddress())
                .setConnectTimeout(CONNECT_TIMEOUT_MILLIS)
                .setTimeout(COMMAND_TIMEOUT_MILLIS)
                .setConnectionPoolSize(POOL_SIZE)
                .setConnectionMinimumIdleSize(MIN_IDLE)
                .setSubscriptionConnectionPoolSize(MIN_IDLE)
                .setSubscriptionConnectionMinimumIdleSize(MIN_IDLE);
        try {
            return new RedissonLoginAttemptStore(Redisson.create(redis));
        } catch (RedisException e) {
            throw new LoginAttemptStoreException("Không nối được Redis " + config.redisAddress(), e);
        }
    }

    @Override
    public long failures(String key) {
        return call(() -> counter(key).get());
    }

    @Override
    public long increment(String key, Duration ttlIfNew) {
        return call(() -> {
            RAtomicLong counter = counter(key);
            long count = counter.incrementAndGet();
            counter.expireIfNotSet(ttlIfNew);
            return count;
        });
    }

    @Override
    public void expire(String key, Duration ttl) {
        call(() -> counter(key).expire(ttl));
    }

    @Override
    public void clear(String key) {
        call(() -> counter(key).delete());
    }

    @Override
    public void close() {
        client.shutdown();
    }

    private RAtomicLong counter(String key) {
        return client.getAtomicLong(key);
    }

    private static <T> T call(Supplier<T> action) {
        try {
            return action.get();
        } catch (RedisException e) {
            throw new LoginAttemptStoreException("Redis lỗi khi đọc hoặc ghi bộ đếm đăng nhập sai", e);
        }
    }
}
