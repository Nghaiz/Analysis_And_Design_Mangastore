-- V10 (chỉ lần chạy E2E, FLYWAY_DATA_LOCATION=classpath:db/e2e): catalog đúng chương 2 của báo cáo (D3).
-- Mã hiển thị DT + id 3 chữ số (D8), nên id khớp mã: DT001, DT002, DT015, DT020, DT021.
-- Không có "Thần đồng đất Việt" để ngoại lệ 5 ra "Không tìm thấy thông tin phù hợp." (D3).
-- Số quyển: fixture của phase 8 giữ DT001-01, DT001-02, DT020-01 bằng hai phiếu mẫu (PM0117, PM0110),
-- nên màn hình còn hiện 5 / 4 / 2 / 3 / 2 quyển như ch.2 và phiếu mới gán DT001-03, DT020-02
-- (quyển trống có id nhỏ nhất, Deferred #10).

INSERT INTO tblBook (id, name, author, publisher, publishYear, category, description, rentalPrice) VALUES
    (1, 'Doraemon - Tập 1', 'Fujiko F. Fujio', 'Kim Đồng', 2023, 'Thiếu nhi',
     'Chú mèo máy Doraemon đến từ thế kỉ 22 giúp đỡ cậu bé Nobita bằng những bảo bối thần kì.', 3000),
    (2, 'Doraemon - Tập 2', 'Fujiko F. Fujio', 'Kim Đồng', 2023, 'Thiếu nhi',
     'Nobita cùng Doraemon và nhóm bạn tiếp tục những chuyện vui buồn thường ngày với bảo bối thần kì.', 3000),
    (15, 'Doraemon: Nobita và lâu đài dưới đáy biển', 'Fujiko F. Fujio', 'Kim Đồng', 2022, 'Phiêu lưu',
     'Chuyến cắm trại dưới đáy biển của Nobita và các bạn biến thành cuộc phiêu lưu tới một lâu đài bí ẩn.', 5000),
    (20, 'Thám tử lừng danh Conan - Tập 1', 'Gosho Aoyama', 'Kim Đồng', 2024, 'Trinh thám',
     'Thám tử trung học Kudo Shinichi bị teo nhỏ thành cậu bé Conan và bắt đầu truy tìm tổ chức áo đen.', 3000),
    (21, 'Thám tử lừng danh Conan - Tập 2', 'Gosho Aoyama', 'Kim Đồng', 2024, 'Trinh thám',
     'Conan tiếp tục phá những vụ án hóc búa bên cạnh Ran và thám tử Mori.', 3000);

INSERT INTO tblBookCopy (barcode, bookId) VALUES
    ('DT001-01', 1), ('DT001-02', 1), ('DT001-03', 1), ('DT001-04', 1), ('DT001-05', 1), ('DT001-06', 1),
    ('DT001-07', 1),
    ('DT002-01', 2), ('DT002-02', 2), ('DT002-03', 2), ('DT002-04', 2),
    ('DT015-01', 15), ('DT015-02', 15),
    ('DT020-01', 20), ('DT020-02', 20), ('DT020-03', 20), ('DT020-04', 20),
    ('DT021-01', 21), ('DT021-02', 21);

-- Phiếu mới đầu tiên của kịch bản ch.2 là PM0125 (Deferred #15). Fixture chèn PM0110, PM0117 bằng id
-- tường minh nên không làm tụt bộ đếm này.
ALTER TABLE tblRentalBill AUTO_INCREMENT = 125;
