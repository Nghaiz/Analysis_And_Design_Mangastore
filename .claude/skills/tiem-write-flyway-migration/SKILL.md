---
name: tiem-write-flyway-migration
description: Dùng khi viết migration Flyway (V1 schema, V2 seed, V10 catalog hoặc e2e, V11 phiếu mẫu): số phiên bản, location, không cột dẫn xuất, thử trên mysql:8.4.13.
effort: medium
---

# Viết migration Flyway

Flyway chạy bằng Java API trong `util/MigrationListener` lúc app khởi động; test dùng cùng API. Cột, kiểu, khoá lấy đúng `docs/contracts.md` §2 (bảng cột máy đọc được ở `docs/schema.md`). `src/main/resources/db/**` là file dùng chung: chỉ orchestrator sửa (`plans/261111-tiem-thue-truyen/contract.md` §8); lane cần đổi thì ghi đề xuất.

## Đọc trước

- `plans/261111-tiem-thue-truyen/contract.md` §5 (location, số phiên bản), §2 (cây thư mục).
- `docs/contracts.md` §2 (13 bảng), §1 (không cột trạng thái quyển), §6.2 (chọn quyển, để seed tái tạo mã vạch ch.2).
- `plans/261111-tiem-thue-truyen/phase-03-schema-dao-test.md` bước 3.0; `plan.md` Deferred #8, #9, #15, #26.

## Các bước

1. **Chọn số phiên bản và chỗ đặt file:**

| File | Thư mục | Nạp khi |
|---|---|---|
| `V1__schema.sql` | `src/main/resources/db/migration/` | mọi lần chạy |
| `V2__catalog_seed.sql` (loại lỗi, loại tài sản cọc, nhân viên, khách mẫu) | `src/main/resources/db/migration/` | mọi lần chạy |
| `V10__e2e_catalog.sql` | `src/main/resources/db/e2e/` | chỉ E2E (`FLYWAY_DATA_LOCATION=classpath:db/e2e`) |
| `V10__catalog_data.sql`, `V11__sample_bills.sql` | sinh vào `data/export/` (bị ignore), `publish` chép vào volume `catalog_data` | lần chạy thường (`filesystem:/flyway/data`) |

   Location luôn là `classpath:db/migration` cộng `${FLYWAY_DATA_LOCATION}`; không thêm profile. V3–V9 chỉ dùng khi orchestrator đổi hợp đồng schema (cần sửa `docs/contracts.md` §2 trước).
2. **Không sửa migration đã áp.** Flyway lưu checksum ở `flyway_schema_history`; sửa V1 đã chạy làm app không khởi động. Muốn đổi → migration mới, cùng commit với sửa hợp đồng.
3. **Viết bảng:** `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`; tên bảng và cột đúng từng kí tự §2 (camelCase, `tblXxx`); `id INT NOT NULL AUTO_INCREMENT PRIMARY KEY`, trừ `tblClient`, `tblStaff` lấy `userId` làm khoá chính kiêm khoá ngoại. Đủ UNIQUE, khoá ngoại, index và `DEFAULT` ghi ở §2. Đặt tên định danh trong dấu backtick.
4. **Không cột dẫn xuất:** không số lượng, tổng tiền, tổng số quyển, trạng thái quyển (`quantity`, `total`, `availableCount`, `copyStatus`, `status` ở `tblBookCopy`), không cột sinh (`GENERATED`), không trigger, không view thay bảng. Một dòng giỏ là một quyển. `tblRentedBook.rentalPrice` là giá chốt, không phải dẫn xuất.
5. **Seed:**
   - `V2`: mật khẩu là chuỗi Argon2id sinh sẵn bằng `util/Passwords` (mật khẩu gốc ghi `docs/dev-accounts.md`, ví dụ `hant` / `hant@123`); mỗi khách mẫu kèm một dòng `tblCart`; chữ tiếng Việt Unicode NFC, đúng ch.2 (mô tả loại lỗi, loại tài sản).
   - `V10__e2e_catalog.sql`: id tường minh để mã khớp ch.2 (DT001, DT002, DT015, DT020, DT021); đủ quyển để fixture E2E giữ quyển 01, 02 của DT001 và quyển 01 của DT020 (Deferred #10); `ALTER TABLE tblRentalBill AUTO_INCREMENT = 125` (Deferred #15).
   - Dữ liệu crawl (mô tả, tên tập, ảnh) **không vào git**: chỉ pipeline sinh vào `data/export/`.
6. **Thử trên Testcontainers `mysql:8.4.13`** bằng chính `MigrationListener`/Flyway API: migrate từ DB trống thành công, `SchemaConformanceTest` so `information_schema` với `docs/schema.md` xanh. Thử thêm migrate lần hai (không đổi gì, không lỗi).
7. **Thử trên compose:** `docker compose up --build -d --wait`, đọc `flyway_schema_history` trong container (lệnh ở dưới).

## Gotchas

- `V10` có ở hai location khác nhau (`db/e2e` và `/flyway/data`); không lỗi vì `FLYWAY_DATA_LOCATION` chỉ trỏ một trong hai. Đừng để hai location cùng nạp một lúc.
- Flyway 13 cần module `flyway-mysql` (đã ghim 13.12.1 trong `pom.xml`); thiếu thì báo "Unsupported Database".
- `value`, `status`, `name`, `description` là từ khoá không cấm của MySQL; vẫn backtick cho chắc.
- `float` là kiểu của ch.8 cho tiền và giảm giá; không đổi sang `DECIMAL` (đổi thiết kế, C13).
- `timestamp` lưu theo múi giờ phiên; compose đặt `TZ=Asia/Ho_Chi_Minh`. Seed ngày giờ nên tương đối (`NOW()`, `CURDATE() + INTERVAL`), không gõ cứng 23–25/09/2026 của ch.2.
- File SQL phải LF và UTF-8 không BOM (`.gitattributes`); BOM làm câu lệnh đầu lỗi cú pháp.
- `flyway.cleanDisabled` giữ mặc định `true`: không gọi `clean()` ở app.
- Xoá dữ liệu để làm lại là thao tác phá huỷ: không `docker compose down -v` khi chủ dự án chưa đồng ý; dùng stack E2E (project `tiemtruyen-e2e`, volume riêng) để thử.

## Lệnh kiểm

| Việc | Lệnh | Có từ |
|---|---|---|
| Build và mọi test (Flyway trên Testcontainers) | `node scripts/dev/mvnw.mjs -B verify` | phase 1 (migration từ phase 3) |
| So schema với tài liệu | `node scripts/dev/mvnw.mjs -B verify -Dtest=SchemaConformanceTest` | phase 3 |
| Dựng stack thường | `docker compose up --build -d --wait` | phase 1 |
| Lịch sử migration trong DB | `docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" tiemtruyen -e "SELECT version, description, success FROM flyway_schema_history"'` | phase 3 |
| Dựng stack E2E (seed E2E) | `docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml up --build -d --wait` | phase 6 |
| Accept phase 3 | `node scripts/accept/phase-03.mjs` | phase 3 |

## Danh sách kiểm tra

- [ ] Số phiên bản và thư mục đúng bảng ở bước 1; không sửa migration đã áp.
- [ ] Tên bảng, cột, kiểu, NULL, khoá, UNIQUE, index khớp `docs/contracts.md` §2.
- [ ] InnoDB, `utf8mb4`, `utf8mb4_0900_ai_ci`.
- [ ] Không cột dẫn xuất, cột sinh, trigger.
- [ ] Seed: mật khẩu Argon2id, mỗi khách một giỏ, chữ NFC, id E2E khớp mã ch.2, `AUTO_INCREMENT = 125`.
- [ ] Không có nội dung crawl trong git.
- [ ] Migrate trên Testcontainers `mysql:8.4.13` xanh, `SchemaConformanceTest` xanh.
