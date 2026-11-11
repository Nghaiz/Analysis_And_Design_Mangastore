// ISBN: chuẩn hoá về ISBN-13 đã kiểm checksum; sai thì trả null (không gộp theo ISBN sai).

const ISBN10_LENGTH = 10;
const ISBN13_LENGTH = 13;
const ISBN13_PREFIX = '978';
const MOD10 = 10;
const MOD11 = 11;

function isbn10ChecksumOk(digits) {
  let sum = 0;
  for (let i = 0; i < ISBN10_LENGTH; i += 1) {
    const ch = digits[i];
    const value = ch === 'X' ? MOD10 : Number(ch);
    if (ch === 'X' && i !== ISBN10_LENGTH - 1) return false;
    sum += value * (ISBN10_LENGTH - i);
  }
  return sum % MOD11 === 0;
}

function isbn13CheckDigit(first12) {
  let sum = 0;
  for (let i = 0; i < ISBN13_LENGTH - 1; i += 1) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((MOD10 - (sum % MOD10)) % MOD10);
}

/** Trả ISBN-13 (chuỗi 13 chữ số, đầu 978/979) hoặc null nếu không hợp lệ. */
export function toIsbn13(raw) {
  if (raw == null) return null;
  const compact = String(raw).toUpperCase().replace(/^ISBN(?:-1[03])?:?/, '').replace(/[\s-]/g, '');
  if (compact.length === ISBN13_LENGTH && /^97[89]\d{10}$/.test(compact)) {
    return isbn13CheckDigit(compact.slice(0, -1)) === compact.at(-1) ? compact : null;
  }
  if (compact.length === ISBN10_LENGTH && /^\d{9}[\dX]$/.test(compact)) {
    if (!isbn10ChecksumOk(compact)) return null;
    const first12 = ISBN13_PREFIX + compact.slice(0, -1);
    return first12 + isbn13CheckDigit(first12);
  }
  return null;
}
