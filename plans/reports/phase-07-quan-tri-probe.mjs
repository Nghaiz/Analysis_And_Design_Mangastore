// Kiểm HTTP lane 7D (phase-07-edge-cases.md §3.4) trên một stack E2E đã dựng, CHƯA CHẠY (Docker treo 11/11/2026).
// Chạy từ gốc repo: node plans/reports/phase-07-quan-tri-probe.mjs <cổng nginx> <compose project>
//   ví dụ: node plans/reports/phase-07-quan-tri-probe.mjs 8080 tiemtruyen-e2e
// Cần LoginView nhân viên (lane 7A) và seed E2E (quanli, hant). Ghi vào DB của stack (thêm 2 đầu truyện thử).
// In PASS/FAIL từng dòng; exit 1 khi có FAIL. Dòng hant → 403 cần AuthFilter thật của phase 6.
import { execFileSync } from 'node:child_process';
import { Session, messageOf, valueOf, tableRows, csrfOf } from '../../scripts/smoke/lib/http.mjs';

const PORT = process.argv[2] ?? '8080';
const PROJECT = process.argv[3] ?? 'tiemtruyen-e2e';
const BASE = `http://127.0.0.1:${PORT}`;
const Q = '/nhan-vien/quan-tri';
const M = {
  BOOK_NOT_FOUND: 'Không tìm thấy thông tin phù hợp.',
  INPUT_TOO_LONG: 'Nội dung nhập quá dài, vui lòng rút gọn.',
  QUANTITY_INVALID: 'Số lượng phải là số nguyên lớn hơn hoặc bằng 1.',
};
let fails = 0;
const check = (label, ok, info = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${info ? ' :: ' + info : ''}`);
};
const sql = (q) => execFileSync('docker', ['compose', '-p', PROJECT, '-f', 'compose.yaml', '-f', 'compose.e2e.yaml', 'exec', '-T', 'db',
  'sh', '-c', `mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD" tiemtruyen -e "${q.replace(/"/g, '\\"')}" 2>/dev/null`],
{ encoding: 'utf8' }).trim();
const invalidOf = (html) => [...html.matchAll(/<(input|textarea)\b[^>]*\bid="([^"]+)"[^>]*aria-invalid="true"/g)].map((m) => m[2]).sort();
const post = (s, action, fields, page) => {
  const f = { ...fields };
  const token = csrfOf(page.html);
  if (token) f.csrf = token;
  return s.request(action, { method: 'POST', form: f, follow: false });
};
const bookCount = () => Number(sql('SELECT COUNT(*) FROM tblBook'));

async function login(username, password) {
  const s = new Session(BASE);
  const form = await s.get('/nhan-vien/LoginView.jsp');
  const r = await post(s, '/nhan-vien/LoginView.jsp', { txtUsername: username, txtPassword: password, btnLogin: '' }, form);
  check(`đăng nhập ${username}`, r.status === 302, `${r.status} ${r.location}`);
  return s;
}

const valid = { txtName: 'Truyện thử 7D', txtAuthor: 'Tác giả 7D', txtPublisher: '', txtPublishYear: '', txtCategory: 'Thử nghiệm',
  txtDescription: '', txtRentalPrice: '3.000', txtCopyCount: '3', btnSave: '' };

// Quyền và method
const hant = await login('hant', 'hant@123');
let r = await hant.get(`${Q}/ManageBookView.jsp`, { follow: false });
check('nhân viên thường mở quan-tri → 403', r.status === 403, String(r.status));
const s = await login('quanli', 'quanli@123');
let page = await s.get(`${Q}/ManageBookView.jsp`);
r = await s.get(`${Q}/doAddBook.jsp`, { follow: false });
check('GET doAddBook → 405', r.status === 405, String(r.status));
r = await s.get(`${Q}/doUpdateBook.jsp`, { follow: false });
check('GET doUpdateBook → 405', r.status === 405, String(r.status));
r = await s.get(`${Q}/EditBookView.jsp`, { follow: false });
check('EditBookView khi không có book → 302 ManageBookView', r.status === 302 && /ManageBookView\.jsp$/.test(r.location ?? ''), `${r.status} ${r.location}`);

// ManageBookView
check('ManageBookView 200, ghi ngoài báo cáo', page.status === 200 && page.html.includes('Phần ngoài báo cáo (D6)'));
check('form có action tường minh và csrf', /<form method="post" action="[^"]*\/nhan-vien\/quan-tri\/ManageBookView\.jsp"/.test(page.html) && page.html.includes('name="csrf"'));
r = await post(s, `${Q}/ManageBookView.jsp`, { txtKeyword: '   ', btnSearch: '' }, page);
check('từ khoá trống → BOOK_NOT_FOUND', messageOf(r.html) === M.BOOK_NOT_FOUND, messageOf(r.html));
r = await post(s, `${Q}/ManageBookView.jsp`, { txtKeyword: 'a'.repeat(101), btnSearch: '' }, page);
check('từ khoá 101 kí tự → INPUT_TOO_LONG + aria-invalid', messageOf(r.html) === M.INPUT_TOO_LONG && invalidOf(r.html).includes('txtKeyword'), messageOf(r.html));
r = await post(s, `${Q}/ManageBookView.jsp`, { txtKeyword: 'conan', btnSearch: '' }, page);
check('tìm "conan" ra kết quả', (tableRows(r.html, 'tblBook') ?? []).length > 0);
for (const bad of ['abc', '999999', '']) {
  const rr = await post(s, `${Q}/ManageBookView.jsp`, { lnkEditBook: bad }, page);
  check(`lnkEditBook="${bad}" → hiện lại trang`, rr.status === 200, String(rr.status));
}

// AddBookView: nhập sai
const before = bookCount();
r = await post(s, `${Q}/doAddBook.jsp`, valid, page);
check('doAddBook khi chưa mở AddBookView → 302, không ghi', r.status === 302 && bookCount() === before, `${r.status}`);
let add = await s.get(`${Q}/AddBookView.jsp`);
check('AddBookView 200, ghi ngoài báo cáo', add.status === 200 && add.html.includes('Phần ngoài báo cáo (D6)'));
const cases = [
  ['ô bắt buộc trống', { txtName: '', txtAuthor: ' ', txtCategory: '', txtRentalPrice: '' }, ['txtAuthor', 'txtCategory', 'txtName', 'txtRentalPrice'], null],
  ['giá âm', { txtRentalPrice: '-1' }, ['txtRentalPrice'], null],
  ['giá chữ', { txtRentalPrice: 'abc' }, ['txtRentalPrice'], null],
  ['giá 0', { txtRentalPrice: '0' }, ['txtRentalPrice'], null],
  ['năm chữ', { txtPublishYear: 'abc' }, ['txtPublishYear'], null],
  ['năm 1899', { txtPublishYear: '1899' }, ['txtPublishYear'], null],
  ['năm sau', { txtPublishYear: String(new Date().getFullYear() + 1) }, ['txtPublishYear'], null],
  ['số quyển âm', { txtCopyCount: '-1' }, ['txtCopyCount'], M.QUANTITY_INVALID],
  ['số quyển thập phân', { txtCopyCount: '1.5' }, ['txtCopyCount'], M.QUANTITY_INVALID],
  ['số quyển chữ', { txtCopyCount: 'abc' }, ['txtCopyCount'], M.QUANTITY_INVALID],
  ['số quyển 100', { txtCopyCount: '100' }, ['txtCopyCount'], M.QUANTITY_INVALID],
  ['tên 256 kí tự', { txtName: 'ễ'.repeat(256) }, ['txtName'], M.INPUT_TOO_LONG],
  ['tác giả 101', { txtAuthor: 'x'.repeat(101) }, ['txtAuthor'], M.INPUT_TOO_LONG],
  ['NXB 101', { txtPublisher: 'x'.repeat(101) }, ['txtPublisher'], M.INPUT_TOO_LONG],
  ['thể loại 51', { txtCategory: 'x'.repeat(51) }, ['txtCategory'], M.INPUT_TOO_LONG],
  ['mô tả 256', { txtDescription: 'x'.repeat(256) }, ['txtDescription'], M.INPUT_TOO_LONG],
  ['quá dài + số quyển sai', { txtName: 'x'.repeat(256), txtCopyCount: 'abc' }, ['txtCopyCount', 'txtName'], M.INPUT_TOO_LONG],
];
for (const [label, patch, want, msg] of cases) {
  const n = bookCount();
  const rr = await post(s, `${Q}/doAddBook.jsp`, { ...valid, ...patch }, add);
  const got = invalidOf(rr.html);
  check(`AddBook ${label}`, rr.status === 200 && JSON.stringify(got) === JSON.stringify(want) && messageOf(rr.html) === msg && bookCount() === n,
    `status ${rr.status}, aria-invalid ${JSON.stringify(got)}, câu ${messageOf(rr.html)}`);
}
let rr = await post(s, `${Q}/doAddBook.jsp`, { ...valid, txtCategory: '', txtAuthor: 'Giữ <b>lại</b>' }, add);
check('AddBook sai thì giữ chữ đã nhập, có escape', valueOf(rr.html, 'txtAuthor') === 'Giữ <b>lại</b>' && !rr.html.includes('Giữ <b>lại</b>'));

// Thêm hợp lệ (XSS, NFD, giá "4.500đ")
const n0 = bookCount();
const nfdName = '<script>alert(1)</script> Thấm từ 7D';
rr = await post(s, `${Q}/doAddBook.jsp`, { ...valid, txtName: `  ${nfdName}  `, txtRentalPrice: '4.500đ' }, add);
check('AddBook hợp lệ → 302 ManageBookView', rr.status === 302 && /ManageBookView\.jsp$/.test(rr.location ?? ''), `${rr.status} ${rr.location}`);
const newId = Number(sql('SELECT MAX(id) FROM tblBook'));
const code = `DT${String(newId).padStart(3, '0')}`;
check('thêm đúng một đầu truyện', bookCount() === n0 + 1);
const row = sql(`SELECT name, publisher, IFNULL(publishYear,'NULL'), IFNULL(description,'NULL'), rentalPrice FROM tblBook WHERE id=${newId}`).split('\t');
check('lưu NFC + trim; năm, mô tả NULL; NXB rỗng; giá 4500', row[0] === nfdName.normalize('NFC') && row[1] === '' && row[2] === 'NULL' && row[3] === 'NULL' && Number(row[4]) === 4500, JSON.stringify(row));
check('mã vạch D8 01..03', sql(`SELECT GROUP_CONCAT(barcode ORDER BY id) FROM tblBookCopy WHERE bookId=${newId}`) === `${code}-01,${code}-02,${code}-03`);
page = await s.get(`${Q}/ManageBookView.jsp`);
const rows = tableRows(page.html, 'tblBook');
check('ManageBookView hiện đầu truyện vừa thêm, 3 quyển', rows?.length === 1 && rows[0][0] === code && rows[0][7] === '3', JSON.stringify(rows));
check('tên có <script> được escape', !page.html.includes('<script>alert(1)') && page.html.includes('&lt;script&gt;alert(1)'));
rr = await post(s, `${Q}/doAddBook.jsp`, { ...valid, txtName: 'Lần hai' }, add);
check('gửi lại form thêm (bấm hai lần, Back) → 302, không ghi', rr.status === 302 && bookCount() === n0 + 1, `${rr.status}`);
add = await s.get(`${Q}/AddBookView.jsp`);
rr = await post(s, `${Q}/doAddBook.jsp`, { ...valid, txtName: nfdName, txtCopyCount: '' }, add);
check('hai đầu truyện cùng tên được; số quyển trống = 0', rr.status === 302 && bookCount() === n0 + 2 && sql(`SELECT COUNT(*) FROM tblBookCopy WHERE bookId=${newId + 1}`) === '0');

// Sửa
page = await s.get(`${Q}/ManageBookView.jsp`);
page = await post(s, `${Q}/ManageBookView.jsp`, { txtKeyword: 'thấm từ 7d', btnSearch: '' }, page);
check('tìm lại hai đầu truyện cùng tên', (tableRows(page.html, 'tblBook') ?? []).length === 2);
r = await post(s, `${Q}/ManageBookView.jsp`, { lnkEditBook: String(newId) }, page);
check('Sửa → 302 EditBookView', r.status === 302 && /EditBookView\.jsp$/.test(r.location ?? ''), `${r.status} ${r.location}`);
let edit = await s.get(`${Q}/EditBookView.jsp`);
check('EditBookView điền từ book; năm NULL trống; giá 4500; bookId', valueOf(edit.html, 'txtName') === nfdName.normalize('NFC')
  && valueOf(edit.html, 'txtPublishYear') === '' && valueOf(edit.html, 'txtRentalPrice') === '4500' && valueOf(edit.html, 'bookId') === String(newId));
const editValid = { bookId: String(newId), txtName: 'Truyện thử 7D đã sửa', txtAuthor: 'Tác giả 7D', txtPublisher: 'NXB Thử', txtPublishYear: '2001',
  txtCategory: 'Thử nghiệm', txtDescription: 'Mô tả', txtRentalPrice: '5000', txtCopyCount: '2', btnSave: '' };
rr = await post(s, `${Q}/doUpdateBook.jsp`, { ...editValid, txtCopyCount: '1.5' }, edit);
check('EditBook số quyển sai → QUANTITY_INVALID, giữ ô', rr.status === 200 && messageOf(rr.html) === M.QUANTITY_INVALID
  && valueOf(rr.html, 'txtName') === editValid.txtName && invalidOf(rr.html).join() === 'txtCopyCount');
rr = await post(s, `${Q}/doUpdateBook.jsp`, { ...editValid, bookId: String(newId + 1) }, edit);
check('bookId khác book của session → 302, không ghi', rr.status === 302 && sql(`SELECT name FROM tblBook WHERE id=${newId + 1}`) === nfdName.normalize('NFC'));
sql(`INSERT INTO tblBookCopy (barcode, bookId) VALUES ('${code}-09', ${newId})`);
rr = await post(s, `${Q}/doUpdateBook.jsp`, editValid, edit);
check('EditBook hợp lệ → 302 ManageBookView', rr.status === 302 && /ManageBookView\.jsp$/.test(rr.location ?? ''), `${rr.status}`);
check('quyển mới nối tiếp số lớn nhất (09 → 10, 11), không xoá quyển',
  sql(`SELECT GROUP_CONCAT(barcode ORDER BY id) FROM tblBookCopy WHERE bookId=${newId}`) === `${code}-01,${code}-02,${code}-03,${code}-09,${code}-10,${code}-11`);
check('cột Book đã sửa', sql(`SELECT CONCAT(name,'|',publisher,'|',publishYear,'|',description,'|',rentalPrice) FROM tblBook WHERE id=${newId}`)
  === 'Truyện thử 7D đã sửa|NXB Thử|2001|Mô tả|5000');
page = await s.get(`${Q}/ManageBookView.jsp`);
const after = (tableRows(page.html, 'tblBook') ?? []).find((x) => x[0] === code);
check('ManageBookView hiện bản đã sửa (3 cũ + 2 mới trong listBook)', after?.[1] === 'Truyện thử 7D đã sửa' && after?.[7] === '5' && after?.[6] === '5.000đ', JSON.stringify(after));
rr = await post(s, `${Q}/doUpdateBook.jsp`, editValid, edit);
check('gửi lại form sửa → 302, không thêm quyển', rr.status === 302 && sql(`SELECT COUNT(*) FROM tblBookCopy WHERE bookId=${newId}`) === '6');
r = await s.get(`${Q}/EditBookView.jsp`, { follow: false });
check('EditBookView sau khi lưu (book đã bỏ) → 302', r.status === 302);
await post(s, `${Q}/ManageBookView.jsp`, { lnkEditBook: String(newId) }, page);
edit = await s.get(`${Q}/EditBookView.jsp`);
rr = await post(s, `${Q}/doUpdateBook.jsp`, { ...editValid, txtCopyCount: '0', txtRentalPrice: '6000' }, edit);
check('EditBook số quyển 0 → không thêm, vẫn sửa cột', rr.status === 302 && sql(`SELECT COUNT(*) FROM tblBookCopy WHERE bookId=${newId}`) === '6'
  && sql(`SELECT rentalPrice FROM tblBook WHERE id=${newId}`) === '6000');

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
