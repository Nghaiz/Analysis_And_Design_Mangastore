-- V2: danh mục (loại lỗi, loại tài sản cọc) và tài khoản mẫu. Nạp ở mọi lần chạy, cả thường và E2E,
-- vì dự án chỉ chạy localhost (Deferred #26, #28). Mật khẩu gốc ghi trong docs/dev-accounts.md;
-- ở đây chỉ có chuỗi Argon2id sinh bằng vn.tiemtruyen.util.Passwords (D1).
-- Tên loại lỗi và loại tài sản được chọn để các từ khoá của ch.2 ("Rách", "Vết bẩn", "Căn cước", "Tiền mặt")
-- trả đúng các dòng trong kịch bản, không thừa dòng nào.

INSERT INTO tblDamage (name, description) VALUES
    ('Rách bìa', 'Bìa truyện bị rách'),
    ('Rách trang', 'Trang truyện bị rách'),
    ('Vết bẩn, viết vẽ', 'Truyện có vết bẩn, vẽ bậy'),
    ('Ố vàng', 'Giấy truyện bị ố vàng theo thời gian'),
    ('Mất trang', 'Truyện bị thiếu một hoặc nhiều trang'),
    ('Bung gáy', 'Gáy truyện bị bung, trang rời khỏi gáy'),
    ('Quăn góc', 'Góc bìa hoặc góc trang bị quăn, gấp nếp'),
    ('Ẩm mốc', 'Truyện bị ẩm, có đốm mốc');

INSERT INTO tblCollateral (name, description) VALUES
    ('Căn cước công dân', 'Giữ bản gốc căn cước công dân của khách hàng'),
    ('Tiền mặt', 'Tiền có giá trị lưu hành'),
    ('Thẻ sinh viên', 'Giữ thẻ sinh viên còn hạn của khách hàng'),
    ('Giấy phép lái xe', 'Giữ bản gốc giấy phép lái xe của khách hàng');

-- Nhân viên (id 1, 2) và khách mẫu (id 3–5). Khách của ch.2 (Trần Minh Anh, minhanh) KHÔNG có ở đây:
-- kịch bản đăng kí của E2E tự tạo tài khoản đó.
INSERT INTO tblUser (id, username, password, fullName) VALUES
    (1, 'hant', '$argon2id$v=19$m=19456,t=2,p=1$Z7/ga5InHhW9wZ1E0Nwo2g$6OHItTnti86VDbCM3ZI9PqzZZPkQfllb9oYdM2EpeQc', 'Nguyễn Thu Hà'),
    (2, 'quanli', '$argon2id$v=19$m=19456,t=2,p=1$WsKuqJ2Jb0qcqNNwbZR39w$7NtBlGWwDTKTeCpfFOMQjJF6QonuXxP8gVoJhxIilcM', 'Phạm Quốc Huy'),
    (3, 'khach01', '$argon2id$v=19$m=19456,t=2,p=1$gdrTiFlWIsrtIXCgO3arpQ$m7eD1URB+sOant0IbjBlnN8GdYVR+ROvGN1jPqVv6Y8', 'Lê Hoàng Nam'),
    (4, 'khach02', '$argon2id$v=19$m=19456,t=2,p=1$x2BL8YwmgrEsyfrA1BkqQQ$TaMxzVYriJjvujQDEniQiKdpL8bMy/TQafZLXVdswYA', 'Đỗ Thị Lan'),
    (5, 'khach03', '$argon2id$v=19$m=19456,t=2,p=1$qiUpoXh7tG+GFctny1Qp3w$NIo7Dc1E6R/oJz967vGc2hqXcSZFiNMjYrypLo7lKi4', 'Vũ Đức Long');

INSERT INTO tblStaff (userId, position) VALUES
    (1, 'Nhân viên bán hàng'),
    (2, 'Quản lí');

INSERT INTO tblClient (userId, dob, idCard, phone, email, address) VALUES
    (3, '1998-04-12', '001098004512', '0987001122', 'hoangnam.le@example.com', 'Số 5 Nguyễn Trãi, Thanh Xuân, Hà Nội'),
    (4, '2001-11-03', '001301008833', '0977334455', 'thilan.do@example.com', 'Số 18 Quang Trung, Hà Đông, Hà Nội'),
    (5, '1995-07-21', '001095002176', '0966556677', 'duclong.vu@example.com', 'Số 41 Láng Hạ, Đống Đa, Hà Nội');

-- Mỗi khách một giỏ, như ClientDAO.addClient.
INSERT INTO tblCart (clientId) VALUES (3), (4), (5);
