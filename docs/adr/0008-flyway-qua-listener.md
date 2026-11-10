# ADR-0008: Flyway chạy qua listener trong app

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: `plans/261111-tiem-thue-truyen/plan.md` Deferred #8, #9; `plans/261111-tiem-thue-truyen/contract.md` §5

## Bối cảnh

Brief chọn Flyway cho migration. Dữ liệu crawl không được vào git (D11, [ADR-0010](0010-nguon-du-lieu-kim-dong-tiki.md)), trong khi E2E cần một bộ dữ liệu riêng dựng y hệt ch.2 (D3). Cần một cơ chế chung cho app và test.

## Quyết định

- `util/MigrationListener` (`@WebListener`) gọi Flyway Java API (`flyway-core` + `flyway-mysql` 13.12.1) lúc app khởi động; test DAO gọi cùng API trên Testcontainers.
- Hai location: `classpath:db/migration` và `${FLYWAY_DATA_LOCATION}`. Mặc định `filesystem:/flyway/data` (volume `catalog_data`, dữ liệu crawl); lần chạy E2E đặt `classpath:db/e2e`. Biến này là chỗ khác nhau duy nhất giữa lần chạy thường và E2E, không có profile.
- Số phiên bản: V1 schema, V2 danh mục và tài khoản mẫu, V10 catalog (crawl hoặc E2E), V11 phiếu mẫu (chỉ crawl).

## Hệ quả

- Không thêm service vào compose; app không lên nếu migration hỏng (thấy ngay ở healthcheck).
- Redgate chỉ ghi đã kiểm MySQL 5.7, 8.0, 9.4, không có 8.4, nên migration luôn được chạy trên đúng `mysql:8.4.13` bằng Testcontainers.
- `src/main/resources/db/**` là file dùng chung, chỉ orchestrator sửa.
- Phase 1 chưa có Flyway (pom chưa có dependency); phase 3 thêm `MigrationListener` và V1, V2.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Service `flyway` riêng trong compose | Thêm một service và hai đường chạy migration khác nhau cho app và test |
| Flyway Maven plugin | Không chạy lúc app khởi động trong container |
| Script `docker-entrypoint-initdb.d` của MySQL | Chỉ chạy lần đầu volume trống, không có phiên bản |
| Migration dữ liệu crawl trong repo | Trái D11 |
