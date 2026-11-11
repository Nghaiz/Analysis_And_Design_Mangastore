package vn.tiemtruyen.filter;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Bộ đếm trong bộ nhớ cho test, mô phỏng đúng ngữ nghĩa của bản Redis: {@code increment} chỉ đặt hạn khi khoá
 * chưa có hạn ({@code EXPIRE ... NX}), {@code expire} đặt lại hạn, khoá hết hạn thì biến mất. Đồng hồ chỉnh tay.
 */
final class InMemoryLoginAttemptStore implements LoginAttemptStore {

    private final Map<String, Entry> entries = new HashMap<>();
    private Instant now = Instant.parse("2026-11-11T08:00:00Z");
    private boolean broken;
    private boolean closed;

    void advance(Duration duration) {
        now = now.plus(duration);
    }

    /** Từ giờ mọi lời gọi ném lỗi hạ tầng, như khi Redis sập. */
    void breakDown() {
        broken = true;
    }

    boolean closed() {
        return closed;
    }

    Map<String, Long> counts() {
        Map<String, Long> counts = new HashMap<>();
        entries.forEach((key, entry) -> {
            if (alive(entry)) {
                counts.put(key, entry.count);
            }
        });
        return counts;
    }

    @Override
    public long failures(String key) {
        Entry entry = live(key);
        return entry == null ? 0 : entry.count;
    }

    @Override
    public long increment(String key, Duration ttlIfNew) {
        Entry entry = live(key);
        if (entry == null) {
            entry = new Entry();
            entries.put(key, entry);
        }
        entry.count++;
        if (entry.expiresAt == null) {
            entry.expiresAt = now.plus(ttlIfNew);
        }
        return entry.count;
    }

    @Override
    public void expire(String key, Duration ttl) {
        Entry entry = live(key);
        if (entry != null) {
            entry.expiresAt = now.plus(ttl);
        }
    }

    @Override
    public void clear(String key) {
        check();
        entries.remove(key);
    }

    @Override
    public void close() {
        closed = true;
    }

    private Entry live(String key) {
        check();
        Entry entry = entries.get(key);
        if (entry != null && !alive(entry)) {
            entries.remove(key);
            return null;
        }
        return entry;
    }

    private boolean alive(Entry entry) {
        return entry.expiresAt == null || now.isBefore(entry.expiresAt);
    }

    private void check() {
        if (broken) {
            throw new LoginAttemptStoreException("Redis giả đang sập");
        }
    }

    private static final class Entry {
        private long count;
        private Instant expiresAt;
    }
}
