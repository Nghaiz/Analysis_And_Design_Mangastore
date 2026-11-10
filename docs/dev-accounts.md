# Tài khoản mẫu (chỉ chạy localhost)

Nạp bởi `src/main/resources/db/migration/V2__catalog_seed.sql` ở mọi lần chạy, cả thường và E2E (Deferred #26, #28). Trong DB chỉ có chuỗi băm Argon2id; mật khẩu gốc nằm ở đây vì dự án không có môi trường công khai nào. Nếu sau này có prod thì phải tách tài khoản mẫu sang location chỉ nạp trên máy phát triển.

| id | username | Mật khẩu | Họ và tên | Vai trò |
|---|---|---|---|---|
| 1 | `hant` | `hant@123` | Nguyễn Thu Hà | Nhân viên, chức vụ "Nhân viên bán hàng" (ch.2) |
| 2 | `quanli` | `Quanli@123` | Phạm Quốc Huy | Nhân viên, chức vụ "Quản lí" (vào được `/nhan-vien/quan-tri/`) |
| 3 | `khach01` | `Khach01@123` | Lê Hoàng Nam | Khách hàng |
| 4 | `khach02` | `Khach02@123` | Đỗ Thị Lan | Khách hàng |
| 5 | `khach03` | `Khach03@123` | Vũ Đức Long | Khách hàng |

Khách của chương 2 (Trần Minh Anh, `minhanh` / `Anh@2003`) không có trong V2: kịch bản đăng kí của E2E tự tạo tài khoản đó.

Phiếu mẫu của dữ liệu crawl (`V11__sample_bills.sql`, phase 4) dùng `khach01`–`khach03` và nhân viên `hant`.

Đổi mật khẩu mẫu: sinh chuỗi mới bằng `vn.tiemtruyen.util.Passwords.hash(...)`, sửa V2 và bảng này trong cùng commit; DB đã nạp V2 thì phải dùng database mới (Flyway kiểm checksum).
