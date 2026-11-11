// Lỗi chất lượng thấy ở lần chạy thử 10 đầu (11/11/2026), mỗi lỗi một test; bản ghi chép từ data/raw/trial.
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { readJsonl } from '../src/lib/io.mjs';
import { cleanTitle, stripLeadingTitle } from '../src/lib/name.mjs';
import { normalizePublisher } from '../src/lib/publisher.mjs';
import { formatAuthors } from '../src/lib/authors.mjs';
import { htmlToText, truncateAtSentence } from '../src/lib/text.mjs';
import { parseVolume } from '../src/lib/title.mjs';
import { clean } from '../src/steps/clean.mjs';
import { makeCtx } from './fixtures/records/harness.mjs';

async function realBooks() {
  const ctx = await makeCtx({ fixture: 'real' });
  const result = await clean(ctx);
  expect(result.exitCode).toBe(0);
  const books = await readJsonl(join(ctx.dataDir, 'stage', ctx.run, 'clean.jsonl'));
  return { books, of: (key) => books.find((b) => b.seriesKey === key) };
}

describe('1. thực thể HTML trong mô tả', () => {
  it('giải mã mọi thực thể có tên và số trước khi cắt 255', async () => {
    const { books, of } = await realBooks();
    expect(of('conan').description.startsWith('Ngày nhỏ, Ran và Shinichi từng làm hỏng vòi nước')).toBe(true);
    for (const book of books) expect(book.description ?? '').not.toMatch(/&[#a-zA-Z0-9]+;/);
    expect(htmlToText('&agrave;&ograve;&#7887;&#x1EA1;&nbsp;&Ecirc;&dstrok;&amp;agrave;')).toBe('àòỏạ Êđà');
    const encoded = `${'Câu d&agrave;i. '.repeat(30)}`;
    const out = truncateAtSentence(htmlToText(encoded), 255);
    expect(out.length).toBeGreaterThan(240);
    expect(out).not.toContain('&');
  });
});

describe('2. mô tả lặp lại tên ở đầu', () => {
  it('bỏ phần tên lặp (tên gốc hoặc tên đã làm sạch)', async () => {
    const { of } = await realBooks();
    expect(of('nhoc-maruko').description.startsWith('“Nhóc Maruko” ra đời')).toBe(true);
    expect(of('than-dong-dat-viet').description.startsWith('Cùng đi hội chợ xuân')).toBe(true);
    expect(of('dragon-ball').description.startsWith('Dragon Ball là bộ truyện tranh')).toBe(true);
  });

  it('không bỏ khi tên chỉ trùng một phần từ, hoặc mô tả chỉ có tên', () => {
    expect(stripLeadingTitle('Conan và bạn bè', ['Con'])).toBe('Conan và bạn bè');
    expect(stripLeadingTitle('Nhóc Maruko - Tập 1', ['Nhóc Maruko - Tập 1'])).toBe('Nhóc Maruko - Tập 1');
  });
});

describe('3. nhiễu trong tên', () => {
  it('bỏ "Sách - ", "(YYYY)", "(Tái Bản YYYY)", "(Tặng ...)", "(N tập)"; "Tập 01" → "Tập 1"', async () => {
    const { books, of } = await realBooks();
    expect(of('dragon-ball').name).toBe('Dragon Ball - 7 Viên Ngọc Rồng - Tập 1 - Son Goku Và Các Bạn');
    expect(of('doraemon-truyen-dai').name).toBe('Doraemon truyện dài - Tập 1');
    expect(of('shin-cau-be-but-chi').name).toBe('Shin - Cậu bé bút chì - Tập 1');
    expect(of('dragon-quest-dau-an-roto').name).toBe('Dragon Quest - Dấu ấn Roto - Những người kế thừa - Tập 1');
    expect(of('chu-gia-nuoi-meo-u').name).toBe('Chú già nuôi mèo ú - Tập 1');
    const names = books.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('năm bỏ khỏi tên chỉ dùng khi nguồn chưa có năm', () => {
    expect(cleanTitle('Shin - Tập 01 (2026)')).toEqual({ name: 'Shin - Tập 1', year: 2026 });
    expect(cleanTitle('X - Tập 2 (Tái Bản 2025)')).toEqual({ name: 'X - Tập 2', year: 2025 });
    expect(cleanTitle('X - Tập 2 (Tặng kèm bookmark) (Tặng Sticker)').name).toBe('X - Tập 2');
    expect(cleanTitle('Tập 10 (Bản đặc biệt)').name).toBe('Tập 10 (Bản đặc biệt)');
    expect(cleanTitle('Thám Tử Lừng Danh Conan - Tập 1 [Tái Bản 2023]')).toEqual({ name: 'Thám Tử Lừng Danh Conan - Tập 1', year: 2023 });
    expect(cleanTitle('Sách Thần Đồng Đất Việt (Tập 182) - Chơi Khăm Quan Phủ').name).toBe('Thần Đồng Đất Việt - Tập 182 - Chơi Khăm Quan Phủ');
    expect(cleanTitle('One Piece (Tập 34)').name).toBe('One Piece - Tập 34');
    expect(cleanTitle('Chú Thuật Hồi Chiến - Tập 3 (Bản thường)').name).toBe('Chú Thuật Hồi Chiến - Tập 3');
    expect(cleanTitle('Sách giáo khoa Toán').name).toBe('Sách giáo khoa Toán');
  });

  it('publishYear là năm của ấn bản tiệm có: năm trong tên thắng ngày của nguồn, không có thì ngày của nguồn (#98)', async () => {
    const { of } = await realBooks();
    // Tiki: tên "(Tái Bản 2025)", publication_date "2023-12-21" là ngày mặc định của người bán.
    expect(of('dragon-ball').publishYear).toBe(2025);
    expect(of('shin-cau-be-but-chi').publishYear).toBe(2026);
    expect(of('conan').publishYear).toBeNull();
  });
});

describe('6. số tập dạng "<tên bộ> <số>" không có chữ "Tập"', () => {
  it('"Thần Đồng Đất Việt 113 - Nét Chữ Cứu Người" cho volume 113, tên giữ nguyên', async () => {
    const { of } = await realBooks();
    expect(of('than-dong-dat-viet').volume).toBe(113);
    expect(of('than-dong-dat-viet').name).toBe('Thần Đồng Đất Việt 113 - Nét Chữ Cứu Người');
  });

  it('khớp tên bộ hoặc bí danh, trước " - " hoặc cuối tên; không lấy số dạng năm hay số giữa tên', () => {
    const names = ['Thần đồng đất Việt', 'tdđv'];
    expect(parseVolume('THẦN ĐỒNG ĐẤT VIỆT 7', names)).toBe(7);
    expect(parseVolume('Tdđv 12 - Trạng Tí', names)).toBe(12);
    expect(parseVolume('Thần Đồng Đất Việt 2004 - Kỉ niệm', names)).toBeNull();
    expect(parseVolume('Thần Đồng Đất Việt 113 Nét Chữ', names)).toBeNull();
    expect(parseVolume('Chuyện Thần Đồng Đất Việt 5', names)).toBeNull();
    expect(parseVolume('Thần Đồng Đất Việt 113 - Tập 9', names)).toBe(9);
    expect(parseVolume('Thần Đồng Đất Việt 113')).toBeNull();
  });
});

describe('4. tên NXB', () => {
  it('chuẩn hoá theo tiền tố, không ghi cứng từng chuỗi', async () => {
    const known = ['Kim Đồng', 'Phan Thị'];
    expect(normalizePublisher('Nhà Xuất Bản Kim Đồng', known)).toBe('Kim Đồng');
    expect(normalizePublisher('NXB Kim Đồng', known)).toBe('Kim Đồng');
    expect(normalizePublisher('NXB. KIM ĐỒNG', known)).toBe('Kim Đồng');
    expect(normalizePublisher('Cty Phan Thị', known)).toBe('Phan Thị');
    expect(normalizePublisher('Công ty TNHH Văn hóa Phan Thị', known)).toBe('Phan Thị');
    expect(normalizePublisher('Nhà xuất bản Trẻ', known)).toBe('Trẻ');
    expect(normalizePublisher('Công Ty Cổ Phần Sách Alpha', known)).toBe('Alpha');
    const { books } = await realBooks();
    expect(new Set(books.map((b) => b.publisher))).toEqual(new Set(['Kim Đồng', 'Phan Thị']));
  });
});

describe('5. tác giả', () => {
  it('"Fujiko F Fujio" → "Fujiko F. Fujio"', async () => {
    const { of } = await realBooks();
    expect(of('doraemon-truyen-dai').author).toBe('Fujiko F. Fujio');
  });

  it('"Nhiều tác giả" coi như trống, dùng `author` của series.json', async () => {
    const { of } = await realBooks();
    expect(of('than-dong-dat-viet').author).toBe('Lê Linh');
  });

  it('nhiều tác giả nối ", ", quá 100 kí tự thì giữ các tác giả đầu vừa 100, không thêm "…"', async () => {
    const { buildBook } = await import('../src/lib/book.mjs');
    const names = ['Nguyễn Văn Một', 'Trần Thị Hai', 'Lê Văn Ba', 'Phạm Thị Bốn', 'Hoàng Văn Năm', 'Vũ Thị Sáu', 'Đặng Văn Bảy'];
    const raw = { source: 'tiki', seriesKey: 'x', sourceUrl: 'https://tiki.vn/x', fetchedAt: 'z', name: 'X - Tập 1', authors: names, publisher: null, publishedAt: null, pages: null, descriptionHtml: null, imageUrls: [], categoryHints: [] };
    const { book } = buildBook([{ raw, name: 'X - Tập 1', nameYear: null, volume: 1, variant: 'thuong', key: 'x|1|thuong' }], {
      series: { publisher: 'Kim Đồng', category: 'Thiếu nhi' }, seriesAuthors: [], spelling: new Map(), categories: new Set(['Thiếu nhi']), knownPublishers: [],
    });
    expect(book.author.length).toBeLessThanOrEqual(100);
    expect(book.author).not.toContain('…');
    expect(names.join(', ').startsWith(book.author)).toBe(true);
    expect(book.author.split(', ').length).toBeGreaterThan(1);
    expect(formatAuthors(['A B', 'C D'], new Map())).toBe('A B, C D');
  });
});
