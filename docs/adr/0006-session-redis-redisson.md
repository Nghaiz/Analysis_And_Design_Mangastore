# ADR-0006: Session Tomcat lưu trong Redis qua Redisson (D7)

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm D7, §5; `plans/261111-tiem-thue-truyen/contract.md` §10; `docker/app/context.xml`

## Bối cảnh

Brief muốn Redis cho session (để chạy được nhiều instance), cache và chặn đăng nhập sai. Luồng nghiệp vụ dựa nhiều vào session (12 thuộc tính, `docs/contracts.md` mục 7), mà không có Spring nên không dùng được Spring Session.

## Quyết định

- `org.redisson.tomcat.RedissonSessionManager` (`redisson-tomcat-11` 4.8.0) khai trong `conf/context.xml` của **ảnh app**, không nằm trong WAR hay code trang: `readMode="REDIS"`, `updateMode="DEFAULT"`, `keyPrefix="tiemtruyen:"`. `redisson.yaml` đọc `APP_REDIS_ADDRESS`, `REDIS_PASSWORD`.
- Jar `redisson-all` và `redisson-tomcat-11` nằm ở `$CATALINA_HOME/lib`, tải lúc build ảnh và kiểm SHA-256 ghim.
- Redis còn dùng để chặn đăng nhập sai (`LoginRateLimitFilter`, Deferred #23). Cache, nếu có, chỉ cho phần tĩnh của đầu truyện; **số quyển trống luôn đọc từ MySQL**.

## Hệ quả

- 13 lớp model `implements Serializable`; `SerializationTest` tuần tự hoá đủ graph Cart, RentalBill.
- Với `readMode=REDIS`, mỗi thuộc tính session được tuần tự hoá riêng: `rentalBill` và phần tử cùng id trong `listRentalBill` không còn là một đối tượng (`docs/contracts.md` mục 7).
- Session sống qua lần khởi động lại container app (Accept phase 1 bước 5: đếm 1, 2, restart, 3).
- Redis chết thì mọi trang dùng session lỗi 500 (Accept phase 1 đã làm đỏ có chủ đích).

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Session trong bộ nhớ Tomcat + sticky session ở nginx | Mất session khi restart app |
| `DeltaManager` / `BackupManager` của Tomcat | Cần nhiều node, không giữ session qua restart một node |
| Spring Session | Không dùng Spring |
