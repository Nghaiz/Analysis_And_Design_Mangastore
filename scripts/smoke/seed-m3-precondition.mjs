#!/usr/bin/env node
// Dựng tiền điều kiện của ch.2 mục 2.3 bằng SQL, không cần trang M1/M2 (phase-07-chuc-nang-3.md bước 7.5):
// khách minhanh đã có PM0110 "Đang cho thuê", PM0117 "Đã huỷ" và PM0125 "Chờ nhận" (DT001-03, DT020-02, 7 ngày),
// đúng trạng thái mà scripts/smoke/flow-m1-m2.mjs để lại. Dùng để chạy flow-m3.mjs trên stack riêng của lane.
//
// Chạy: SMOKE_COMPOSE_PROJECT=tiemtruyen-7e node scripts/smoke/seed-m3-precondition.mjs
// Từ chối project tiemtruyen (lib/e2e-db.mjs). Exit 0 khi xong, 2 khi stack không chạy.
import { MissingStackError, PROJECT, addDays, resetChapter2, seedChapter22Bills, sql, vnToday, isoDate } from './lib/e2e-db.mjs';

try {
  resetChapter2();
  // Tài khoản minhanh như ch.2 mục 2.1 (mật khẩu không dùng ở M3, chuỗi băm giữ chỗ không đăng nhập được).
  sql(`
INSERT INTO tblUser (username, password, fullName) VALUES ('minhanh', 'not-a-login-hash', 'Trần Minh Anh');
SET @c = LAST_INSERT_ID();
INSERT INTO tblClient (userId, dob, idCard, phone, email, address)
  VALUES (@c, '2003-05-12', '001203012345', '0912345678', 'minhanh.tran@gmail.com', 'Số 12 Trần Phú, Hà Đông, Hà Nội');
INSERT INTO tblCart (clientId) VALUES (@c);
`);
  seedChapter22Bills('minhanh');
  const t = vnToday();
  sql(`
UPDATE tblRentalBill SET status = 'Đã huỷ', cancelReason = 'Đổi ý, chưa cần thuê nữa' WHERE id = 117;
SET @c = (SELECT id FROM tblUser WHERE username = 'minhanh');
INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, discount, status, clientId)
  VALUES (125, NOW(), '${isoDate(addDays(t, 2))} 09:00:00', 7, 0, 'Chờ nhận', @c);
INSERT INTO tblRentedBook (rentalPrice, rentalBillId, bookCopyId)
  SELECT 3000, 125, id FROM tblBookCopy WHERE barcode IN ('DT001-03', 'DT020-02') ORDER BY barcode;
`);
  console.log(`[seed] PASS tiền điều kiện 2.3 trên ${PROJECT}: PM0110 Đang cho thuê, PM0117 Đã huỷ, PM0125 Chờ nhận`);
} catch (err) {
  console.log(`[seed] FAIL ${err.message}`);
  process.exit(err instanceof MissingStackError ? 2 : 1);
}
