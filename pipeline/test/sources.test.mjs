import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { kimdongCandidates, kimdongRecord, listSitemapProducts, planKimdong, splitPeople } from '../src/sources/kimdong.mjs';
import { isComboName, isUsedGoods, matchVolume } from '../src/sources/text.mjs';
import { pickTikiProduct, rankCandidates, searchTiki, tikiCandidates, tikiImageUrls, tikiOriginalUrl, tikiRecord } from '../src/sources/tiki.mjs';
import { wikidataRecord } from '../src/sources/wikidata.mjs';
import { fixtureBody, fixtureClient } from './fixtures/http/fake-net.mjs';

const pipelineDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(join(pipelineDir, 'schema', 'raw-record.schema.json'), 'utf8'));
const validateRaw = new Ajv2020({ allErrors: true }).compile(schema);
const expectValid = (record) => {
  const ok = validateRaw(record);
  expect(validateRaw.errors ?? [], JSON.stringify(record).slice(0, 200)).toEqual([]);
  expect(ok).toBe(true);
};

export const CONAN = {
  key: 'conan', name: 'Thám tử lừng danh Conan', aliases: ['thám tử lừng danh conan', 'conan'], publisher: 'Kim Đồng',
  preferredSource: 'kimdong', category: 'Trinh thám', longStory: false, kimdongSlugPrefixes: ['tham-tu-lung-danh-conan-tap-'],
  tikiQuery: 'thám tử lừng danh conan tập', wikidataId: null, maxVolumes: 3,
};
export const DORA = {
  key: 'doraemon-truyen-ngan', name: 'Doraemon truyện ngắn', aliases: ['doraemon truyện ngắn', 'doraemon'], publisher: 'Kim Đồng',
  preferredSource: 'kimdong', category: 'Thiếu nhi', longStory: false,
  kimdongSlugPrefixes: ['tap-le-doraemon-truyen-ngan-chu-meo-may-den-tu-tuong-lai'], tikiQuery: '', wikidataId: 'Q235311', maxVolumes: 2,
};
const BLUELOCK = { ...CONAN, key: 'bluelock', aliases: ['bluelock'], kimdongSlugPrefixes: ['tap-le-bluelock'] };
const SEARCH = JSON.parse(fixtureBody('tiki/search-conan-p1.json'));

describe('text: combo, hàng cũ, số tập', () => {
  it.each([
    ['Combo Thám Tử Lừng Danh Conan - Tái Bản', true],
    ['Truyện tranh - Bộ 100 cuốn thám tử lừng danh Conan - KĐ', true],
    ['Trọn bộ Doraemon', true],
    ['Box set Shin', true],
    ['Thám tử lừng danh Conan - Tập 66 - Tập 70 (5 cuốn)', true],
    ['Thám Tử Lừng Danh Conan (Bản Nâng Cấp) - [Chọn Tập Lẻ', true],
    ['Thám Tử Lừng Danh Conan - Tập 1 [Tái Bản 2023]', false],
    ['(Tập lẻ) Doraemon truyện ngắn - Chú mèo máy đến từ tương lai', false],
    ['(Tập lẻ) Doraemon truyện dài (24 tập)', false],
    ['Doraemon truyện dài (24 tập)', true],
  ])('isComboName(%s) = %s', (name, expected) => expect(isComboName(name)).toBe(expected));

  it('hàng cũ', () => {
    expect(isUsedGoods('Thám Tử Lừng Danh Conan Tập 5 (Sách cũ)')).toBe(true);
    expect(isUsedGoods('Conan tập 5 - like new')).toBe(true);
    expect(isUsedGoods('Cú mèo và bạn')).toBe(false);
  });

  it('số tập chỉ khi tên bộ đứng đầu, ngay sau là số tập', () => {
    const aliases = CONAN.aliases;
    expect(matchVolume('Thám Tử Lừng Danh Conan - Tập 1 [Tái Bản 2023]', aliases)).toBe(1);
    expect(matchVolume('Sách Thám Tử Lừng Danh Conan Tập 77 (Bản Nâng Cấp)', aliases)).toBe(77);
    expect(matchVolume('Thám Tử Lừng Danh Conan 54', aliases)).toBe(54);
    expect(matchVolume('Thám Tử Lừng Danh Conan Hoạt Hình Màu: Thủ Phạm Trong Đôi Mắt - Tập 2', aliases)).toBeNull();
    expect(matchVolume('Doraemon Truyện Dài - Tập 3', ['doraemon'])).toBeNull();
  });
});

describe('Kim Đồng', () => {
  it('liệt kê qua sitemap, lọc combo và đuôi lạ', async () => {
    const { http, calls } = fixtureClient();
    const products = await listSitemapProducts(http);
    expect(products).toHaveLength(10);
    expect(calls.some((c) => c.url.includes('/search'))).toBe(false);
    expect(kimdongCandidates(CONAN, products).map((c) => [c.alias, c.volume]))
      .toEqual([['tham-tu-lung-danh-conan-tap-107', 107]]);
    expect(kimdongCandidates(BLUELOCK, products).map((c) => c.alias)).toEqual(['tap-le-bluelock']);
  });

  it('sản phẩm (Tập lẻ) tách thành từng tập, bản in mới nhất thắng', async () => {
    const { http } = fixtureClient();
    const products = await listSitemapProducts(http);
    const plan = await planKimdong(http, DORA, products);
    expect(plan.map((e) => e.volume)).toEqual([1, 2, 15]);
    const record = await kimdongRecord(http, DORA, plan[2]);
    expectValid(record);
    expect(record.name).toBe('Doraemon truyện ngắn - Chú mèo máy đến từ tương lai - Tập 15 (2026)');
    expect(record.publishedAt).toBe('2026');
    expect(record.imageUrls).toHaveLength(1);
    expect(record.sourceUrl).toMatch(/\?variant=\d+$/);
    expect(record.authors).toEqual(['Fujiko F Fujio']);
  });

  it('sản phẩm một tập: ISBN, tác giả, số trang, mô tả sau <hr>', async () => {
    const { http } = fixtureClient();
    const record = await kimdongRecord(http, CONAN, { volume: 107, alias: 'tham-tu-lung-danh-conan-tap-107' });
    expectValid(record);
    expect(record).toMatchObject({
      source: 'kimdong', level: 'volume', seriesKey: 'conan', isbn: '978-604-2-39259-4', authors: ['Gosho Aoyama'],
      pages: 176, publisher: 'Kim Đồng', sourceUrl: 'https://nxbkimdong.com.vn/tham-tu-lung-danh-conan-tap-107',
      categoryHints: ['Manga - comic', 'Thiếu niên (11 – 15)'],
    });
    expect(record.descriptionHtml).toContain('Mô tả cắt ngắn');
    expect(record.descriptionHtml).not.toContain('ISBN');
  });

  it.each([
    ['dragon-quest-dau-an-roto-nhung-nguoi-ke-thua-tap-1-tang-kem-postcard', ['Kamui Fujiwara', 'Chiaki Kawamata', 'Yuji Horii']],
    ['truong-hoc-biet-tuot-tap-1-len-duong-thoi-nguyen-tu-va-phan-tu', ['Monster Chemistry Group', 'Guo Rurong']],
  ])('nhiều tác giả (mỗi người một <a>, cách bằng <br>) tách thành nhiều phần tử: %s', async (alias, authors) => {
    const { http } = fixtureClient();
    const record = await kimdongRecord(http, { ...CONAN, key: 'x' }, { volume: 1, alias });
    expectValid(record);
    expect(record.authors).toEqual(authors);
  });

  it('splitPeople: dấu phẩy, chấm phẩy, "và", thẻ rỗng, trùng', () => {
    expect(splitPeople({ html: ' Gosho Aoyama' })).toEqual(['Gosho Aoyama']);
    expect(splitPeople({ html: ' A, B; C và D' })).toEqual(['A', 'B', 'C', 'D']);
    expect(splitPeople({ html: '<a href="/x">A</a><a href="/y"><br></a>&nbsp;<a>A</a>' })).toEqual(['A']);
    expect(splitPeople(undefined)).toEqual([]);
  });

  it('sản phẩm 404 bị bỏ, không làm hỏng cả bộ', async () => {
    const { http, logs } = fixtureClient();
    const products = await listSitemapProducts(http);
    await expect(planKimdong(http, BLUELOCK, products, (m) => logs.push(m))).resolves.toEqual([]);
    expect(logs.join('\n')).toMatch(/bỏ tap-le-bluelock/);
  });
});

describe('Tiki', () => {
  it('lọc combo, bộ, chọn tập lẻ, bộ khác, hàng cũ; giữ tập lẻ thật', () => {
    const got = tikiCandidates(CONAN, SEARCH);
    const names = got.map((c) => c.name).join('\n');
    expect(names).not.toMatch(/Combo|Bộ 100|Chọn Tập|Hoạt Hình|Sách cũ/);
    expect([...new Set(got.map((c) => c.volume))].sort((a, b) => a - b)).toEqual([1, 2, 54, 77]);
  });

  it('nhiều người bán cùng tập: bản thường, Tiki Trading, bán chạy trước', () => {
    const vol77 = tikiCandidates(CONAN, SEARCH).filter((c) => c.volume === 77);
    expect(vol77).toHaveLength(3);
    expect(rankCandidates(CONAN, vol77)[0].id).toBe(262346925);
    const vol2 = tikiCandidates(CONAN, SEARCH).filter((c) => c.volume === 2);
    expect(rankCandidates(CONAN, vol2).map((c) => c.id)).toEqual([262303707, 270712353]);
  });

  it('ưu tiên sản phẩm có NXB khớp publisher của bộ', async () => {
    const real = JSON.parse(fixtureBody('tiki/product-262303707.json'));
    const otherPublisher = structuredClone(real);
    for (const a of otherPublisher.specifications[0].attributes) {
      if (['manufacturer', 'publisher_vn', 'Organization_name'].includes(a.code)) a.value = 'Công ty Sách Khác';
    }
    const matching = { ...structuredClone(real), id: 270712353, url_path: 'tham-tu-lung-danh-conan-tap-2-p270712353.html' };
    const json = (obj) => ({ body: JSON.stringify(obj), contentType: 'application/json' });
    const { http } = fixtureClient({ overrides: {
      'https://tiki.vn/api/v2/products/262303707': json(otherPublisher),
      'https://tiki.vn/api/v2/products/270712353': json(matching),
    } });
    const vol2 = tikiCandidates(CONAN, SEARCH).filter((c) => c.volume === 2);
    const picked = await pickTikiProduct(http, CONAN, vol2);
    expect(picked.id).toBe(270712353);
  });

  it('bản ghi đúng schema, sourceUrl là trang sản phẩm', async () => {
    const { http } = fixtureClient();
    const byVolume = await searchTiki(http, CONAN, { maxPages: 1 });
    const detail = await pickTikiProduct(http, CONAN, byVolume.get(2));
    const record = tikiRecord(http, CONAN, detail);
    expectValid(record);
    expect(record).toMatchObject({
      source: 'tiki', sourceId: '262303707', publisher: 'Nhà Xuất Bản Kim Đồng', pages: 176,
      publishedAt: '2014-06-01 00:00:00', authors: ['Aoyama Gosho'],
      sourceUrl: 'https://tiki.vn/tham-tu-lung-danh-conan-tap-2-tai-ban-2014-p262303707.html',
    });
    expect(record.categoryHints).toContain('Truyện Tranh, Manga, Comic');
    expect(record.imageUrls[0]).toMatch(/^https:\/\/salt\.tikicdn\.com\//);
  });
});

describe('Tiki: ảnh bìa theo thumbnail_url', () => {
  const TDDV = { ...CONAN, key: 'than-dong-dat-viet', aliases: ['thần đồng đất việt'], publisher: 'Phan Thị' };
  const real = JSON.parse(fixtureBody('tiki/product-51348719.json'));
  const originals = real.images.map((i) => i.base_url);

  it('bỏ tiền tố cache/kích thước của salt.tikicdn.com', () => {
    expect(tikiOriginalUrl('https://salt.tikicdn.com/cache/280x280/ts/product/9c/ff/11/a.jpg'))
      .toBe('https://salt.tikicdn.com/ts/product/9c/ff/11/a.jpg');
    expect(tikiOriginalUrl('https://salt.tikicdn.com/cache/w1200/ts/product/a.jpg')).toBe('https://salt.tikicdn.com/ts/product/a.jpg');
  });

  it('ảnh khớp thumbnail lên đầu, ảnh phụ giữ thứ tự còn lại', () => {
    const thumb = originals[2].replace('/ts/', '/cache/280x280/ts/');
    expect(tikiImageUrls({ ...real, thumbnail_url: thumb }))
      .toEqual([originals[2], originals[0], originals[1], ...originals.slice(3)]);
  });

  it('thumbnail không có trong images[]: ảnh gốc của thumbnail làm bìa', () => {
    const urls = tikiImageUrls({ ...real, thumbnail_url: 'https://salt.tikicdn.com/cache/280x280/ts/product/zz/x.jpg' });
    expect(urls[0]).toBe('https://salt.tikicdn.com/ts/product/zz/x.jpg');
    expect(urls.slice(1)).toEqual(originals);
  });

  it('Thần Đồng Đất Việt 113 (fixture thật): ảnh chính Tiki chính là trang ruột, JSON không sửa được', async () => {
    // KnownGap: thumbnail_url = images[0] = trang 12; bìa trước thật là images[2] (đã xem ảnh trong cache
    // ngày 2026-11-11). Nếu Tiki đổi ảnh chính thì test này đỏ: khi đó xoá ghim, không ghim lại.
    const { http } = fixtureClient();
    const detail = await http.getJson('https://tiki.vn/api/v2/products/51348719');
    const record = tikiRecord(http, TDDV, detail);
    expectValid(record);
    expect(record.imageUrls[0]).toBe(originals[0]);
    expect(record.imageUrls).toHaveLength(originals.length);
  });
});

describe('Wikidata', () => {
  it('một bản ghi cấp bộ từ Special:EntityData, không dùng /sparql', async () => {
    const { http, calls } = fixtureClient();
    const record = await wikidataRecord(http, DORA);
    expectValid(record);
    expect(record).toMatchObject({
      source: 'wikidata', level: 'series', sourceId: 'Q235311', name: 'Doraemon', publishedAt: '1969-12-01',
      sourceUrl: 'https://www.wikidata.org/wiki/Q235311',
    });
    expect(record.imageUrls[0]).toMatch(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\//);
    expect(calls.filter((c) => !c.url.endsWith('/robots.txt'))).toHaveLength(1);
    expect(calls.some((c) => c.url.includes('query.wikidata.org'))).toBe(false);
  });
});
