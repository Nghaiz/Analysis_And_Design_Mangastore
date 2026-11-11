# Tài khoản mẫu

<!-- updated 261111 -->

**Chỉ dùng tại máy (localhost).** Dự án không có môi trường công khai nào (Deferred #28, [ADR-0013](adr/0013-chi-chay-localhost.md)), nên mật khẩu mẫu ghi công khai ở đây và V2 nạp chúng ở mọi lần chạy, kể cả E2E (Deferred #26). Có prod về sau thì phải tách các tài khoản này sang location chỉ nạp trên máy dev và đổi mật khẩu.

Trong DB chỉ có chuỗi băm Argon2id sinh sẵn bằng `util/Passwords` ([ADR-0007](adr/0007-password4j-argon2id.md)); file này là nơi duy nhất ghi mật khẩu gốc. Giá trị `position` đúng `docs/contracts.md` mục 4.

## 1. Nạp bởi `V2__catalog_seed.sql` (mọi lần chạy)

| Tên đăng nhập | Mật khẩu | Vai | Họ và tên | Đăng nhập ở | Nguồn |
|---|---|---|---|---|---|
| `hant` | `hant@123` | Staff, `Nhân viên bán hàng` | Nguyễn Thu Hà | `/LoginView.jsp` (C23) | ch.2 mục 2.3, bước 1–2 |
| `quanli` | `quanli@123` | Staff, `Quản lí` (vào được `/nhan-vien/quan-tri/*`) | Phạm Quốc Huy | `/LoginView.jsp` (C23) | D6; tên và mật khẩu do lane 2B đặt 11/11/2026 theo mẫu `hant@123` (báo cáo không có) |
| `khach01` | `khach01@123` | Client (kèm một dòng `tblCart`) | Lê Hoàng Nam | `/LoginView.jsp` | phase-03 bước V2; tên và mật khẩu do lane 2B đặt 11/11/2026 theo mẫu `hant@123` |
| `khach02` | `khach02@123` | Client (kèm một dòng `tblCart`) | Đỗ Thị Lan | `/LoginView.jsp` | như trên |
| `khach03` | `khach03@123` | Client (kèm một dòng `tblCart`) | Vũ Đức Long | `/LoginView.jsp` | như trên |

Ràng buộc cho phase 3 khi viết V2:

- Ba khách mẫu **không trùng** khách của ch.2: tên đăng nhập khác `minhanh`, `minhanh2003`; CCCD khác `001203012345`; điện thoại khác `0912345678`; email khác `minhanh.tran@gmail.com`. Nếu trùng, kịch bản đăng kí ch.2 mục 2.1 bước 5–6 sẽ báo `REGISTER_DUPLICATE` thay vì `REGISTER_SUCCESS`.
- Giá trị các cột khác của khách mẫu phải qua được quy tắc định dạng C4 (CCCD 12 chữ số, điện thoại 10 chữ số bắt đầu bằng 0…), để giống tài khoản tạo qua RegisterView.
- Họ và tên của `quanli`, `khach01..03` do phase 3 chọn khi viết V2 (đã điền ở bảng trên, 11/11/2026).
- Phiếu mẫu của dữ liệu crawl (`V11__sample_bills.sql`, phase 4) dùng `khach01`–`khach03` và nhân viên `hant`.

## 2. Chỉ có trong E2E (fixture riêng từng kịch bản, phase 8)

Không nằm trong V2: ch.2 mục 2.1 bước 5 **đăng kí mới** `minhanh`, còn mục 2.1 ngoại lệ 6, mục 2.2 và 2.3 cần `minhanh` đã có sẵn kèm phiếu PM0110, PM0117. Fixture E2E dựng từng trạng thái.

| Tên đăng nhập | Mật khẩu | Vai | Họ và tên | Nguồn |
|---|---|---|---|---|
| `minhanh` | `Anh@2003` | Client | Trần Minh Anh | ch.2 mục 2.1 bước 5, 9; mục 2.2 bước 1 |
| `minhanh2003` | `Anh@2003` | Client (tạo trong ngoại lệ 6 của mục 2.1) | Trần Minh Anh | ch.2 mục 2.1 ngoại lệ 6.3–6.4 |
