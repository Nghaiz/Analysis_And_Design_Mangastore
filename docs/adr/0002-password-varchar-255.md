# ADR-0002: Nới `tblUser.password` thành `varchar(255)` (D1)

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026, chủ dự án chốt ở brainstorm D1)
- Nguồn: brainstorm D1; `plans/reports/researcher-261111-stack-versions.md` §2; [`docs/contracts.md`](../contracts.md) mục 2

## Bối cảnh

Ch.8 khai `tblUser.password varchar(50)`. Mật khẩu phải lưu dạng băm, mà mọi chuỗi băm chuẩn đều dài hơn 50 kí tự: BCrypt cố định 60 kí tự; Argon2id với tham số OWASP và muối 16 byte khoảng 97 kí tự; `addRandomSalt()` không tham số của Password4j dùng muối 64 byte, ra khoảng 150 kí tự trở lên.

## Quyết định

**Đổi thiết kế** đúng một chỗ: `tblUser.password varchar(255)`. Tên bảng, tên cột, kiểu các cột khác và khoá giữ nguyên ch.8. Cột chứa chuỗi băm Argon2id ([ADR-0007](0007-password4j-argon2id.md)), không bao giờ chứa mật khẩu thô.

## Hệ quả

- Đây là chỗ khác báo cáo duy nhất của schema; `docs/contracts.md` mục 2 và `docs/schema.md` ghi rõ, `SchemaConformanceTest` kiểm.
- Tham số băm sau này đổi cũng không phải đổi cột, miễn chuỗi ≤ 255 kí tự.
- Không lưu mật khẩu trong session (C5 của `docs/contracts.md`).

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Giữ `varchar(50)`, lưu mật khẩu thô | Không an toàn |
| Giữ `varchar(50)`, cắt chuỗi băm | Không kiểm lại được mật khẩu |
| Bảng riêng chứa chuỗi băm | Đổi schema nhiều hơn, thêm bảng ngoài 13 bảng |
| BCrypt (60 kí tự) | Vẫn quá 50, nên không tránh được việc đổi cột |
