import { describe, expect, it } from 'vitest';
import { authorKey, buildAuthorSpelling, formatAuthors } from '../src/lib/authors.mjs';
import { toIsbn13 } from '../src/lib/isbn.mjs';
import { htmlToText, truncateAtSentence } from '../src/lib/text.mjs';
import { detectVariant, isCombo, parseVolume, yearFromDate } from '../src/lib/title.mjs';

describe('isbn', () => {
  it('nhận ISBN-13 đúng, đổi ISBN-10 sang 13, bỏ checksum sai', () => {
    expect(toIsbn13('978-604-2-12345-7')).toBe('9786042123457');
    expect(toIsbn13('604-2-12345-9')).toBe('9786042123457');
    expect(toIsbn13('9786042123458')).toBeNull();
    expect(toIsbn13('6042123450')).toBeNull();
    expect(toIsbn13('ISBN: 978-0-306-40615-7')).toBe('9780306406157');
    expect(toIsbn13('0-8044-2957-X')).toBe('9780804429573');
    expect(toIsbn13(null)).toBeNull();
  });
});

describe('text', () => {
  it('bỏ HTML, giải mã thực thể, NFC', () => {
    const decomposed = 'Tiếng Việt';
    expect(htmlToText(`<p>${decomposed}</p><script>x()</script><br>&amp; &#273;`)).toBe('Tiếng Việt & đ');
  });

  it('câu đầu dài quá thì cắt ở ranh giới từ và thêm dấu …', () => {
    const out = truncateAtSentence('a'.repeat(10) + ' ' + 'b'.repeat(300), 255);
    expect(out).toBe('a'.repeat(10) + '…');
    expect(truncateAtSentence('Ngắn.', 255)).toBe('Ngắn.');
  });
});

describe('title', () => {
  it('đọc số tập, biến thể, năm', () => {
    expect(parseVolume('Conan - Tập 12 (Tái bản 2023)')).toBe(12);
    expect(parseVolume('Doraemon Vol. 3')).toBe(3);
    expect(detectVariant('Conan - Tập 3 (Bản đặc biệt)')).toBe('dac-biet');
    expect(detectVariant('Doraemon tuyển tập màu - Tập 1')).toBe('mau');
    expect(detectVariant('Doraemon Plus - Tập 1')).toBe('plus');
    expect(detectVariant('Conan - Tập 12 (Tái bản 2023)')).toBe('thuong');
    expect(detectVariant('Sách mẫu - Tập 1')).toBe('thuong');
    expect(yearFromDate('15/03/2020')).toBe(2020);
    expect(yearFromDate('không rõ')).toBeNull();
  });

  it('nhận dạng combo theo CONTRACT §5', () => {
    expect(isCombo('Combo Conan Tập 1-5')).toBe(true);
    expect(isCombo('Trọn bộ Doraemon 45 tập')).toBe(true);
    expect(isCombo('Bộ Conan 3 tập')).toBe(true);
    expect(isCombo('Box set Conan')).toBe(true);
    expect(isCombo('Tủ sách Doraemon 5 tập')).toBe(true);
    expect(isCombo('Tủ sách tuổi thơ - Tập 1')).toBe(false);
    expect(isCombo('Thám tử lừng danh Conan - Tập 1')).toBe(false);
  });
});

describe('authors', () => {
  it('gộp biến thể chính tả và thứ tự họ tên, nối bằng ", "', () => {
    expect(authorKey('Aoyama Gosho')).toBe(authorKey('GOSHO AOYAMA'));
    const spelling = buildAuthorSpelling(['Gosho Aoyama'], ['AOYAMA GOSHO']);
    expect(formatAuthors(['Aoyama Gosho; Yutaka Abe', 'gosho aoyama'], spelling)).toBe('Gosho Aoyama, Yutaka Abe');
    const noPreferred = buildAuthorSpelling([], ['LÊ LINH', 'Lê Linh']);
    expect(formatAuthors(['le linh'], noPreferred)).toBe('Lê Linh');
  });
});
