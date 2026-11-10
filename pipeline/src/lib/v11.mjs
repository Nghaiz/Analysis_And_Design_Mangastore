// V11__sample_bills.sql: phiếu mẫu giữ HẾT quyển của vài đầu truyện (CONTRACT §6).
// Tài khoản, giỏ, quyển, đồ cọc chỉ tham chiếu bằng truy vấn con theo khoá tự nhiên, không ghi cứng id.
import { SQL_HEADER, sqlNumber, sqlString } from './sql.mjs';
import { barcode } from './rules.mjs';

export const STATUS = Object.freeze({ pending: 'Chờ nhận', renting: 'Đang cho thuê' });

export const BILL_PLAN = Object.freeze([
  { client: 'khach01', status: STATUS.pending, books: 1, createdAt: 'NOW() - INTERVAL 2 HOUR', pickupAt: 'NOW() + INTERVAL 1 DAY', days: 3 },
  {
    client: 'khach02',
    status: STATUS.renting,
    books: 2,
    createdAt: 'NOW() - INTERVAL 3 DAY',
    pickupAt: 'NOW() - INTERVAL 2 DAY',
    days: 7,
    borrowDate: 'CURDATE() - INTERVAL 2 DAY',
    dueDate: 'CURDATE() + INTERVAL 5 DAY',
    staff: 'hant',
    collateral: { name: 'Căn cước công dân', value: '001099000123', note: 'Bản gốc, trả khi khách trả đủ truyện' },
  },
  { client: 'khach03', status: STATUS.pending, books: 1, createdAt: 'NOW() - INTERVAL 30 MINUTE', pickupAt: 'NOW() + INTERVAL 4 HOUR', days: 5 },
]);

const CONDITION_NOTES = Object.freeze(['Bìa còn tốt', 'Gáy hơi sờn', 'Có vết gấp góc trang']);
const DISCOUNT = 0;

const userId = (username) => `(SELECT id FROM tblUser WHERE username = ${sqlString(username)})`;
const clientRef = (username) => `(SELECT userId FROM tblClient WHERE userId = ${userId(username)})`;
const staffRef = (username) => `(SELECT userId FROM tblStaff WHERE userId = ${userId(username)})`;
const cartRef = (username) => `(SELECT id FROM tblCart WHERE clientId = ${clientRef(username)})`;
const copyRef = (code) => `(SELECT id FROM tblBookCopy WHERE barcode = ${sqlString(code)})`;
const collateralRef = (name) => `(SELECT id FROM tblCollateral WHERE name = ${sqlString(name)})`;

/** Đầu truyện bị giữ hết: ít quyển nhất trước, hoà thì id nhỏ hơn. */
export function pickHeldBooks(books) {
  const wanted = BILL_PLAN.reduce((sum, bill) => sum + bill.books, 0);
  return [...books].sort((a, b) => a.copies - b.copies || a.id - b.id).slice(0, wanted).sort((a, b) => a.id - b.id);
}

function billSql(bill, books) {
  const lines = [`-- Phiếu "${bill.status}" của ${bill.client}: giữ hết quyển của Book ${books.map((b) => b.id).join(', ')}`];
  const renting = bill.status === STATUS.renting;
  const values = [
    bill.createdAt,
    bill.pickupAt,
    sqlNumber(bill.days),
    renting ? bill.borrowDate : 'NULL',
    renting ? bill.dueDate : 'NULL',
    sqlNumber(DISCOUNT),
    'NULL',
    sqlString(bill.status),
    'NULL',
    clientRef(bill.client),
    renting ? staffRef(bill.staff) : 'NULL',
  ];
  lines.push(
    'INSERT INTO tblRentalBill (createdAt, expectedPickupAt, expectedDays, borrowDate, dueDate, discount, note, status, cancelReason, clientId, staffId)',
    `VALUES (${values.join(', ')});`,
    'SET @bill = LAST_INSERT_ID();',
  );
  let noteIndex = 0;
  for (const book of books) {
    for (let n = 1; n <= book.copies; n += 1) {
      const code = barcode(book.id, n);
      let selected = 'NULL';
      if (!renting) {
        lines.push(`INSERT INTO tblSelectedBook (cartId, bookCopyId) VALUES (${cartRef(bill.client)}, ${copyRef(code)});`);
        lines.push('SET @selected = LAST_INSERT_ID();');
        selected = '@selected';
      }
      const note = renting ? sqlString(CONDITION_NOTES[noteIndex++ % CONDITION_NOTES.length]) : 'NULL';
      lines.push(
        'INSERT INTO tblRentedBook (rentalPrice, conditionNote, rentalBillId, bookCopyId, selectedBookId)',
        `VALUES (${sqlNumber(book.rentalPrice)}, ${note}, @bill, ${copyRef(code)}, ${selected});`,
      );
    }
  }
  if (renting) {
    const c = bill.collateral;
    lines.push(
      'INSERT INTO tblRentalCollateral (value, note, rentalBillId, collateralId)',
      `VALUES (${sqlString(c.value)}, ${sqlString(c.note)}, @bill, ${collateralRef(c.name)});`,
    );
  }
  return lines.join('\n');
}

export function renderV11(books) {
  const held = pickHeldBooks(books);
  const parts = [SQL_HEADER + '-- Phiếu mẫu; ngày giờ tương đối theo lúc nạp nên file không đổi giữa các lần chạy.'];
  let cursor = 0;
  for (const bill of BILL_PLAN) {
    const mine = held.slice(cursor, cursor + bill.books);
    cursor += bill.books;
    if (mine.length) parts.push(billSql(bill, mine));
  }
  return { sql: `${parts.join('\n\n')}\n`, heldBookIds: held.map((book) => book.id) };
}
