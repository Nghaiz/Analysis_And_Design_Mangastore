# ADR-0007: Băm mật khẩu bằng Password4j, thuật toán Argon2id

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm §5; `plans/reports/researcher-261111-stack-versions.md` §2

## Bối cảnh

Brief đòi băm mật khẩu bằng Argon2 hoặc BCrypt. Không dùng Spring. Ảnh app chạy Temurin 25 trên Linux, máy dev chạy Windows.

## Quyết định

- Thư viện `com.password4j:password4j` 1.8.4 (thuần Java, không thư viện native), thuật toán **Argon2id**.
- Gói trong một lớp `util/Passwords` (băm, kiểm); `ClientDAO.addClient` băm trước khi lưu, `UserDAO.checkLogin` kiểm chuỗi băm.
- Cột `tblUser.password varchar(255)` ([ADR-0002](0002-password-varchar-255.md)). Tham số Argon2id do phase 3 chốt trong `util/Passwords` (11/11/2026), theo mức tối thiểu OWASP: bộ nhớ 19 MiB (`m=19456` KiB), 2 vòng (`t=2`), 1 luồng (`p=1`), muối ngẫu nhiên 16 byte, đầu ra 32 byte. Chuỗi PHC `$argon2id$v=19$m=19456,t=2,p=1$<muối>$<băm>` dài khoảng 97 kí tự; `PasswordsTest` kiểm chuỗi băm ≤ 255 kí tự.

## Hệ quả

- Tài khoản mẫu trong V2 chứa chuỗi băm sinh sẵn bằng chính `Passwords`; mật khẩu gốc ở [`docs/dev-accounts.md`](../dev-accounts.md).
- Đổi tham số về sau không làm hỏng chuỗi cũ: chuỗi PHC mang theo tham số của nó.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| `spring-security-crypto` (dùng riêng) | Kéo artifact của Spring; Argon2 còn cần BouncyCastle |
| `argon2-jvm` | Cần JNA và `libargon2` native cho từng nền tảng |
| `at.favre.lib:bcrypt` | Không cập nhật từ 2023 |
| BCrypt | Argon2id là lựa chọn mặc định hiện nay; BCrypt chỉ là dự phòng của researcher |
