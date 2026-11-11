# Phase 6, lane 6A `filter-chung`: báo cáo

Worktree `D:/Coding/mangastore-wt/06-filter-chung`, nhánh `lane/06-chuc-nang-1-2/filter-chung`. Đã merge hai commit phase theo yêu cầu orchestrator: `8c1bccd` (§6.1 "Chung", 405, Throwable) và `612cdd3` (C14 doLogout, C16 `?expired=1`).

Trạng thái: **DONE_WITH_CONCERNS**. Năm filter, trang lỗi, test xong và xanh. Hai việc chưa xong, lí do nằm ngoài lane:

1. **Bộ đếm Redisson chưa viết được**: `pom.xml` không có dependency `org.redisson`, nên lớp dùng Redisson không biên dịch được. Theo brief, tôi dừng phần này và ghi đề xuất ở mục 4. Trong lúc chờ, filter dùng `UnconfiguredLoginAttemptStore`: mọi POST đăng nhập có `btnLogin` trả **500** kèm log SEVERE. Không lặng lẽ cho qua.
2. **Docker Desktop hỏng giữa phiên**: mọi lệnh gọi API engine (`docker version`, `docker ps`, `docker compose up`) trả `500 Internal Server Error`. Vì vậy chưa chạy được stack `tiemtruyen-6a`, bước kiểm bằng curl và các test DAO dùng Testcontainers (mục 3). Tôi không khởi động lại Docker Desktop, vì làm vậy đụng stack `tiemtruyen` của orchestrator và `tiemtruyen-7b` của phiên phase 7.

## 1. Việc đã làm

| File | Nội dung |
|---|---|
| `filter/Utf8Filter.java` | Đặt UTF-8 cho request (giữ charset nếu trình duyệt đã khai) và response |
| `filter/SecurityHeadersFilter.java` | Đặt `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` trước khi trang chạy; thêm `Cache-Control: no-store` cho `*.jsp`; không đặt CSP |
| `filter/CsrfFilter.java` | Token 256 bit base64url ở `csrfToken`, tạo trước khi trang chạy. POST tới trang JSP: session không có token thì 302 (trang cần đăng nhập về LoginView của vai kèm `?expired=1`; trang mở về trang xem của chính nó, không tham số, doRegister về RegisterView, doLogout về HomeView); session còn token mà thiếu hoặc sai `csrf` thì 403 (so bằng `MessageDigest.isEqual`). Sau POST tới một trong hai LoginView, danh tính đăng nhập đổi thì thay token |
| `filter/AuthFilter.java` | Ma trận §12, kể cả `/doLogout.jsp` mở (C14). Thêm `?expired=1` khi request mang session id không còn hợp lệ (C16). `isOpen` và `loginFor` dùng chung với CsrfFilter (một danh sách, không chép) |
| `filter/LoginRateLimitFilter.java` | Chỉ đếm POST có `btnLogin`. Khoá `tiemtruyen:login-fail:<vai>:<IP>:<tên đăng nhập viết thường, đã trim, mã hoá URL>`. Bị chặn thì đặt `message = LOGIN_FAILED` rồi gọi chain với request bọc trả `GET`. Bộ đếm lỗi thì log SEVERE và trả 500 |
| `filter/LoginAttemptStore.java`, `LoginAttemptStoreException.java` | Interface nhỏ để test không cần Redis |
| `filter/UnconfiguredLoginAttemptStore.java` | Chỗ giữ cho bản Redisson (mục 4), mọi lời gọi ném lỗi; xoá khi bản Redisson vào thay |
| `filter/Requests.java` | Đường dẫn trong ứng dụng, vai đã đăng nhập (`client.id > 0`, C5), danh tính |
| `util/AppConfig.java` (+ `AppConfigTest`) | Thêm `redisAddress()`, `redisPassword()` (bí mật, không mặc định), `loginRateMaxFails()` (mặc định 5), `loginRateWindowSeconds()` (mặc định 900), cả hai phải ≥ 1 |
| `webapp/error/403.jsp`, `404.jsp`, `405.jsp`, `500.jsp` | Tiếng Việt, `<t:layout>` + `<ui:paper-card>`, có link về trang chủ, `session="false"`, không in exception; mỗi trang tự đặt lại đúng mã |
| `WEB-INF/tags/csrf.tag` | Giữ nguyên, đã tương thích (in `sessionScope.csrfToken` vào `name="csrf"`) |
| `src/test/java/vn/tiemtruyen/filter/` | `FakeHttp` (request, response, session, chain giả dựng bằng `java.lang.reflect.Proxy`; hàm chưa giả thì ném lỗi), `InMemoryLoginAttemptStore` (có đồng hồ chỉnh tay, mô phỏng `EXPIRE NX`), `BasicFiltersTest`, `CsrfFilterTest`, `AuthFilterTest`, `LoginRateLimitFilterTest` |

### Quyết định trong phạm vi lane (hợp đồng không nói rõ)

- **`.jspx` bị kiểm như `.jsp`**: Tomcat ánh xạ cả hai vào Jasper. Nếu chỉ kiểm `.jsp` thì một trang `.jspx` sau này sẽ lọt CSRF và phân quyền.
- **GET `/health.jsp` không tạo session**: healthcheck chạy vài giây một lần và không gửi cookie; tạo session thì mỗi lần gọi để lại một session trong Redis. POST tới đó vẫn qua kiểm.
- **`/nhan-vien/quan-tri/*` khi chưa đăng nhập nhân viên**: 302 về LoginView nhân viên. Đã đăng nhập mà không phải "Quản lí" thì 403. `position` null cũng 403.
- **Nhận biết đăng nhập thành công** trong rate limit: sau chain, session có vai đó, **và** hoặc danh tính khác trước, hoặc session id đã đổi (`changeSessionId`). Nếu chỉ xét "session có vai" như câu chữ §2, một khách đang đăng nhập có thể dò mật khẩu người khác vô hạn lần, vì bộ đếm bị xoá sau mỗi lần thử. Test `failingWhileAlreadyLoggedInIsStillCounted` giữ điểm này.
- **Hạn chặn**: lần sai đầu đặt hạn `WINDOW` nếu khoá chưa có hạn (`EXPIRE NX`, nên khoá không bao giờ kẹt vô hạn). Lần sai chạm ngưỡng đặt lại hạn `WINDOW`, nên thời gian chặn tính đủ 15 phút từ lần đó (đúng Deferred #23: "5 lần sai trong 15 phút thì chặn 15 phút"). Lần bị chặn không đếm thêm.
- **doLogout POST khi session đã mất**: 302 về `HomeView.jsp`, vì session đã mất nghĩa là đã ra khỏi tài khoản và không còn biết vai.
- **Chữ của trang lỗi** là nội dung trang, không phải câu báo của `Messages`; không đụng 28 (nay thêm) câu báo.

## 2. Kết quả lệnh kiểm

| Lệnh | Kết quả |
|---|---|
| `node scripts/dev/mvnw.mjs -B verify "-Dtest=vn.tiemtruyen.filter.*Test,AppConfigTest,MessagesTest,ArchitectureTest,SerializationTest" -Dsurefire.failIfNoSpecifiedTests=false` | **BUILD SUCCESS**: Checkstyle 0 vi phạm (cả mã chính và mã test), 131 test, 0 fail (AuthFilterTest 33, CsrfFilterTest 28, LoginRateLimitFilterTest 16, BasicFiltersTest 4, AppConfigTest 33, ArchitectureTest 10, MessagesTest 4, SerializationTest 3) |
| `node scripts/dev/mvnw.mjs -B verify` (đầy đủ) | **Chưa chạy hết**: Checkstyle, biên dịch và ArchitectureTest qua, rồi treo ở Testcontainers vì engine Docker trả 500. Tôi đã dừng tiến trình Maven của lane mình (PID 11988 và cây con). Cần chạy lại khi Docker chạy lại |
| Làm đỏ có chủ đích | Đổi `if (!matches(...))` thành `if (false && !matches(...))` trong `CsrfFilter`, rồi chạy `mvnw -B test -Dcheckstyle.skip "-Dtest=vn.tiemtruyen.filter.*Test"`: **3 fail** (`postWithoutTokenIs403AndThePageDoesNotRun`, `postWithWrongTokenIs403`, `postWithEmptyTokenOnALiveSessionIs403`, mỗi test báo trang đã chạy 1 lần thay vì 0). Đã trả lại file gốc, `grep "if (false"` cho 0 dòng |
| Stack `tiemtruyen-6a` + curl | **Chưa chạy**: `docker compose -p tiemtruyen-6a ... up --build -d --wait` hỏng ngay với `unable to get image 'tiemtruyen-nginx:local': request returned 500 Internal Server Error`. Không có container nào của project `tiemtruyen-6a` được tạo, nên không cần `down` |

Ma trận §12 trong `AuthFilterTest`, mỗi dòng một test: `row1` 4 trang khách công khai, `row2` LoginView nhân viên, `row3` doCancelRentalBill (khách, nhân viên, chưa đăng nhập, client id 0), `row4b` doLogout, `row4` trang gốc khác (gồm client id 0 của doRegister và nhân viên vào trang khách bị chặn chéo), `row5` `/nhan-vien/*` (khách vào trang nhân viên bị chặn chéo), `row6` quan-tri (Quản lí qua, nhân viên bán hàng 403), `row7` `/dev/*`, `row8` health, static, error, đường dẫn không phải JSP. Thêm C16: cookie session hết hạn ở trang khách và trang nhân viên ra `?expired=1`, ở trang mở thì không đổi gì, không có cookie thì không gắn `expired`.

### Kiểm bằng curl còn nợ (chạy khi Docker chạy lại, từ gốc worktree)

```
NGINX_HTTP_PORT=8081 DB_HOST_PORT=3381 APP_IMAGE_TAG=l6a docker compose -p tiemtruyen-6a -f compose.yaml -f compose.e2e.yaml up --build -d --wait
```
Rồi kiểm trên `http://127.0.0.1:8081`:

- `/HomeView.jsp` có đủ header bảo mật.
- GET `/ClientHomeView.jsp` → 302 `/LoginView.jsp`; GET `/nhan-vien/x.jsp` → 302 `/nhan-vien/LoginView.jsp`.
- POST không cookie: `/doAddSelectedBook.jsp` → 302 `/LoginView.jsp?expired=1`, `/doRegister.jsp` → 302 `/RegisterView.jsp`.
- Có cookie từ GET `/HomeView.jsp`: POST thiếu hoặc sai `csrf` → 403, trang tiếng Việt, không có "Apache Tomcat" hay exception.
- `/dev/StyleGuideView.jsp` → 200; `/health.jsp` → 200 `ok`, không có `Set-Cookie`.
- `/khong-co-trang` → 404 tiếng Việt; PUT `/HomeView.jsp` → 405 tiếng Việt.

Cuối cùng chạy `docker compose -p tiemtruyen-6a -f compose.yaml -f compose.e2e.yaml down` (không `-v`).

## 3. Đề xuất sửa file dùng chung (orchestrator)

### 3.1 `pom.xml`: thêm Redisson (provided). Cần làm trước khi merge, nếu không thì đăng nhập trả 500

Jar `redisson-all` 4.8.0 đã nằm ở `$CATALINA_HOME/lib` của ảnh app (Dockerfile, tầng `session-libs`), nên chỉ cần để biên dịch, không đóng vào WAR:

```xml
<redisson.version>4.8.0</redisson.version>   <!-- trong <properties>, khớp REDISSON_VERSION của docker/app/Dockerfile -->

<dependency>
  <groupId>org.redisson</groupId>
  <artifactId>redisson</artifactId>
  <version>${redisson.version}</version>
  <scope>provided</scope>
</dependency>
```

Sau đó lane 6A (hoặc orchestrator) thêm `filter/RedissonLoginAttemptStore.java` theo bản dưới. API đã tra qua context7 (`/redisson/redisson`: `RAtomicLong.incrementAndGet`, `RExpirable.expireIfNotSet(Duration)`, `expire(Duration)`, `Redisson.create`, `shutdown`). `expireIfNotSet` dùng `EXPIRE ... NX`, cần Redis 7 trở lên; stack dùng 8.10.3.

```java
package vn.tiemtruyen.filter;

import java.time.Duration;
import java.util.function.Supplier;
import org.redisson.Redisson;
import org.redisson.api.RAtomicLong;
import org.redisson.api.RedissonClient;
import org.redisson.client.RedisException;
import org.redisson.config.Config;
import vn.tiemtruyen.util.AppConfig;

/** Bộ đếm đăng nhập sai trên Redis (cùng Redis với session manager), qua Redisson. */
final class RedissonLoginAttemptStore implements LoginAttemptStore {

    private final RedissonClient client;

    private RedissonLoginAttemptStore(RedissonClient client) {
        this.client = client;
    }

    static RedissonLoginAttemptStore connect(AppConfig config) {
        Config redis = new Config();
        redis.useSingleServer().setAddress(config.redisAddress()).setPassword(config.redisPassword());
        try {
            return new RedissonLoginAttemptStore(Redisson.create(redis));
        } catch (RedisException e) {
            throw new LoginAttemptStoreException("Không nối được Redis " + config.redisAddress(), e);
        }
    }

    @Override public long failures(String key) { return call(() -> counter(key).get()); }

    @Override public long increment(String key, Duration ttlIfNew) {
        return call(() -> {
            RAtomicLong counter = counter(key);
            long count = counter.incrementAndGet();
            counter.expireIfNotSet(ttlIfNew);
            return count;
        });
    }

    @Override public void expire(String key, Duration ttl) { call(() -> counter(key).expire(ttl)); }

    @Override public void clear(String key) { call(() -> counter(key).delete()); }

    @Override public void close() { client.shutdown(); }

    private RAtomicLong counter(String key) { return client.getAtomicLong(key); }

    private static <T> T call(Supplier<T> action) {
        try {
            return action.get();
        } catch (RedisException e) {
            throw new LoginAttemptStoreException("Redis lỗi khi đọc hoặc ghi bộ đếm đăng nhập sai", e);
        }
    }
}
```

Trong `LoginRateLimitFilter.init`, thay `store = new UnconfiguredLoginAttemptStore();` bằng:

```java
try {
    store = RedissonLoginAttemptStore.connect(config);
} catch (LoginAttemptStoreException e) {
    LOG.log(Level.SEVERE, "Chưa nối được Redis cho bộ đếm đăng nhập sai; POST đăng nhập sẽ trả 500", e);
    store = new UnconfiguredLoginAttemptStore();  // đổi tên lớp và REASON thành "Redis không tới được lúc khởi động"
}
```

Bọc như vậy để Redis lỗi lúc khởi động không làm hỏng việc deploy cả webapp (filter `init` ném lỗi là context không lên). Lời gọi sau đó vẫn trả 500 kèm log, đúng §2. Không cần sửa test: test dùng `InMemoryLoginAttemptStore`.

### 3.2 Header bảo mật: nginx đè hai header của filter

`docker/nginx/snippets/proxy-app.conf` có `proxy_hide_header X-Content-Type-Options` và `proxy_hide_header Referrer-Policy`. `security-headers.conf` đặt `Referrer-Policy: strict-origin-when-cross-origin`, còn §2 ghi `same-origin`. Đi qua nginx, trình duyệt nhận giá trị của nginx. `X-Frame-Options: DENY` và `Cache-Control: no-store` của filter thì đi qua. Orchestrator chọn một giá trị cho `Referrer-Policy` và sửa bên còn lại (nginx là file chung, filter là của 6A).

### 3.3 `web.xml`: các mã lỗi khác còn ra trang tiếng Anh của Tomcat

Hiện chỉ có 403, 404, 405, 500 và `Throwable`. Tomcat vẫn hiện trang tiếng Anh cho 400 (URL hay header hỏng, tham số quá nhiều), 413, 414, 501. §6.1 yêu cầu "không mã nào". Đề xuất: thêm `<error-page>` không có `error-code` làm trang mặc định (Servlet 3+) trỏ tới một `error/loi.jsp` chung giữ nguyên mã. Lane 6A làm trang đó khi orchestrator khai web.xml.

## 4. Ghi chú cho lane trang (6B, 6C)

- LoginView đọc `expired=1` ở GET để hiện `SESSION_EXPIRED` (C16). Filter chỉ gắn tham số, không đặt `message`.
- Trang bị chặn vì sai nhiều lần nhận request có `getMethod() == "GET"` kèm request attribute `message = LOGIN_FAILED`. Trang phải hiện `message` khi có, ở cả nhánh GET.
- Đến khi có bộ đếm Redisson (mục 3.1), POST đăng nhập có `btnLogin` trả 500 trên mọi stack dựng từ nhánh có lane này.
