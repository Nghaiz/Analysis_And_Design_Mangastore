// Tiền điều kiện ch.2 mục 2.3 (lane 8A3): khách minhanh có PM0110 "Đang cho thuê", PM0117 "Đã huỷ" và
// PM0125 "Chờ nhận" (DT001-03, DT020-02, 7 ngày, hẹn 09:00 hôm nay + 2), đúng trạng thái 2.2 để lại.
// Nguồn: chép logic của scripts/smoke/seed-m3-precondition.mjs (file đó chạy ngay khi import nên không import được);
// đề xuất trong báo cáo lane: chuyển hàm này vào scripts/smoke/lib/e2e-db.mjs để smoke và E2E dùng chung.
import { addDays, isoDate, resetChapter2, seedChapter22Bills, sql, vnToday } from './test';

/** Đặt lại DB E2E về đầu kịch bản 2.3. Gọi trong `beforeEach`; không dựa vào file test khác. */
export function seedChapter23(): void {
  resetChapter2();
  // Tài khoản minhanh như ch.2 mục 2.1 (M3 không đăng nhập bằng khách, chuỗi băm giữ chỗ không đăng nhập được).
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
}

/** Dòng SQL TSV tách thành mảng cột (để so phía DB). */
export function rows(statement: string): string[][] {
  const out = sql(statement);
  return out ? out.split('\n').map((line: string) => line.split('\t')) : [];
}
