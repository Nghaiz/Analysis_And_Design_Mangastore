// Đặt lại và chèn dữ liệu kịch bản ch.2 trên DB của stack E2E (phase-06-integration.md §5). Chỉ chạy trên compose
// project E2E (mặc định tiemtruyen-e2e), không bao giờ trên project tiemtruyen (dữ liệu thường).
// Ngày tương đối (Deferred #15): "hôm nay" của kịch bản là ngày chạy ở Asia/Ho_Chi_Minh, giữ giờ trong ngày của ch.2.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const PROJECT = process.env.SMOKE_COMPOSE_PROJECT ?? 'tiemtruyen-e2e';
export const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8080';

if (PROJECT === 'tiemtruyen') {
  throw new Error('SMOKE_COMPOSE_PROJECT=tiemtruyen là dữ liệu thường → smoke chỉ chạy trên project E2E');
}

export class MissingStackError extends Error {}

/** Chạy SQL (qua stdin) bằng mysql trong container db của stack E2E; trả stdout dạng TSV không tiêu đề. */
export function sql(statements) {
  const args = ['compose', '-p', PROJECT, '-f', 'compose.yaml', '-f', 'compose.e2e.yaml', 'exec', '-T', 'db', 'sh', '-c',
    'mysql --default-character-set=utf8mb4 -N -B -uroot -p"$MYSQL_ROOT_PASSWORD" tiemtruyen 2>&1 | grep -v "Using a password"'];
  const r = spawnSync('docker', args, { cwd: ROOT, input: statements, encoding: 'utf8', timeout: 60_000 });
  if (r.error?.code === 'ENOENT') throw new MissingStackError('không có lệnh docker → cài Docker Desktop');
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.status !== 0 || /^ERROR \d+/m.test(out)) {
    throw new MissingStackError(`mysql trên project ${PROJECT} lỗi: ${out.trim().slice(0, 300)} → dựng stack: `
      + `docker compose -p ${PROJECT} -f compose.yaml -f compose.e2e.yaml up --build -d --wait`);
  }
  return out.trim();
}

/** Ngày hôm nay ở Asia/Ho_Chi_Minh (Date UTC nửa đêm, chỉ dùng phần ngày). */
export function vnToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

export function addDays(d, n) {
  return new Date(d.getTime() + n * 86_400_000);
}

const p2 = (n) => String(n).padStart(2, '0');
/** yyyy-MM-dd (SQL DATE, input type=date). */
export const isoDate = (d) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
/** dd/MM/yyyy (docs/contracts.md §13). */
export const viDate = (d) => `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
/** HH:mm dd/MM/yyyy (§13). */
export const viDateTime = (d, hhmm) => `${hhmm} ${viDate(d)}`;
/** yyyy-MM-ddTHH:mm (input type=datetime-local). */
export const isoLocal = (d, hhmm) => `${isoDate(d)}T${hhmm}`;
const sqlTs = (d, hhmm) => `'${isoDate(d)} ${hhmm}:00'`;

/** Tài khoản do kịch bản đăng kí tạo (ch.2 2.1, kể cả ngoại lệ 6.3). */
export const SCENARIO_USERNAMES = ['minhanh', 'minhanh2003'];

/**
 * Đưa DB E2E về đúng trước kịch bản ch.2 (D3): không phiếu nào, không giỏ có dòng, chưa có minhanh,
 * chưa có loại lỗi "Ố vàng" và loại tài sản "Thẻ sinh viên" (ch.2 2.3 ngoại lệ 19, 37 thêm mới hai dòng này),
 * bộ đếm phiếu về 125 (Deferred #15). Gọi ở đầu flow-m1-m2.mjs; flow-m3.mjs chạy sau, không gọi lại.
 */
export function resetChapter2() {
  const users = SCENARIO_USERNAMES.map((u) => `'${u}'`).join(', ');
  sql(`
DELETE FROM tblRentedDamage;
DELETE FROM tblRentalCollateral;
DELETE FROM tblRentedBook;
DELETE FROM tblRentalBill;
DELETE FROM tblSelectedBook;
DELETE c FROM tblCart c JOIN tblUser u ON u.id = c.clientId WHERE u.username IN (${users});
DELETE cl FROM tblClient cl JOIN tblUser u ON u.id = cl.userId WHERE u.username IN (${users});
DELETE FROM tblUser WHERE username IN (${users});
DELETE FROM tblDamage WHERE name = 'Ố vàng';
DELETE FROM tblCollateral WHERE name = 'Thẻ sinh viên';
ALTER TABLE tblRentalBill AUTO_INCREMENT = 125;
`);
}

/**
 * Hai phiếu có sẵn của khách minhanh trước ch.2 2.2 (bảng bước 24.1), id tường minh nên không làm tụt bộ đếm:
 * PM0110 "Đang cho thuê" giữ DT001-01, DT001-02 (2 quyển, 10 ngày, 60.000đ; nhân viên hant);
 * PM0117 "Chờ nhận" giữ DT020-01 (1 quyển, 7 ngày, 21.000đ). Sau khi 2.2 huỷ PM0117, Doraemon - Tập 1 còn 4 quyển
 * như ch.2 2.3 ngoại lệ 11.8 (trang in 17); ch.2 2.2 không ghi quyển của PM0117. Nhờ vậy màn hình còn 5 / 4 / 2 / 3 / 2 quyển
 * và phiếu mới được gán DT001-03, DT020-02 (Deferred #10).
 * Ngày theo ch.2 với "hôm nay" T = 23/09/2026: PM0110 tạo 19:00 T-9, hẹn 10:00 T-8, mượn T-8, trả T+2;
 * PM0117 tạo 10:30 T-1, hẹn 18:00 T+1.
 */
export function seedChapter22Bills(username = 'minhanh') {
  const t = vnToday();
  const copy = (b) => `(SELECT id FROM tblBookCopy WHERE barcode = '${b}')`;
  sql(`
SET @c = (SELECT id FROM tblUser WHERE username = '${username}');
INSERT INTO tblRentalBill (id, createdAt, expectedPickupAt, expectedDays, borrowDate, dueDate, discount, note, status,
    cancelReason, clientId, staffId) VALUES
  (110, ${sqlTs(addDays(t, -9), '19:00')}, ${sqlTs(addDays(t, -8), '10:00')}, 10, '${isoDate(addDays(t, -8))}',
    '${isoDate(addDays(t, 2))}', 0, NULL, 'Đang cho thuê', NULL, @c, 1),
  (117, ${sqlTs(addDays(t, -1), '10:30')}, ${sqlTs(addDays(t, 1), '18:00')}, 7, NULL, NULL, 0, NULL, 'Chờ nhận',
    NULL, @c, NULL);
INSERT INTO tblRentedBook (rentalPrice, conditionNote, rentalBillId, bookCopyId, selectedBookId) VALUES
  (3000, 'Không có lỗi', 110, ${copy('DT001-01')}, NULL),
  (3000, 'Không có lỗi', 110, ${copy('DT001-02')}, NULL),
  (3000, NULL, 117, ${copy('DT020-01')}, NULL);
INSERT INTO tblRentalCollateral (value, note, rentalBillId, collateralId) VALUES
  ('001203012345', NULL, 110, (SELECT id FROM tblCollateral WHERE name = 'Căn cước công dân'));
`);
}

/** Trạng thái và mã vạch của một phiếu (để smoke kiểm phía DB). */
export function billState(id) {
  const out = sql(`SELECT rb.status, IFNULL(rb.cancelReason, ''), IFNULL(GROUP_CONCAT(bc.barcode ORDER BY bc.barcode), '')
FROM tblRentalBill rb LEFT JOIN tblRentedBook r ON r.rentalBillId = rb.id LEFT JOIN tblBookCopy bc ON bc.id = r.bookCopyId
WHERE rb.id = ${Number(id)} GROUP BY rb.id;`);
  if (!out) return null;
  const [status, cancelReason, barcodes] = out.split('\t');
  return { status, cancelReason, barcodes: barcodes ? barcodes.split(',') : [] };
}
