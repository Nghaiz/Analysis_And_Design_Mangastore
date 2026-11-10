# Research Report: Data sources for ~300-500 Vietnamese-edition comic volumes

Date: 2026-11-11 | Scope: read-only probing, about 40 sample requests in total, generic UA `Mozilla/5.0 (compatible; research-bot/1.0)` | No code written, no crawling.

## Summary

The international open catalogues (Open Library, Wikidata, Google Books) have almost no Vietnamese volume-level records for these series. They cannot be the primary source. The data lives on Vietnamese retail sites. The two that expose clean structured JSON without a key are **NXB Kim Đồng's own store** (Sapo/Bizweb platform, `products.json` and per-product `.json`; ISBN, author, series, description, ~800x1246 covers) and **Tiki's public product API** (`/api/v2/products`; broad coverage including the volumes Kim Đồng no longer stocks individually, 900x900 covers). Recommendation: Kim Đồng first, Tiki as fallback and gap-filler, Wikidata only for series-level enrichment. Dedup on ISBN-13 where present, otherwise on a normalised `(series, volume number, edition variant)` key. Legal risk is real but small for a private, non-commercial coursework project. Both retail sites assert copyright over their content. Fahasa's ToS explicitly forbids bots, so leave Fahasa out.

## Sample query results (real requests, 2026-11-11)

| Source | Query | Result |
|---|---|---|
| Open Library search | `q=Doraemon&language=vie` | 1 hit, and it is unrelated ("Như mùa dông rơi xuống"). **Miss** |
| Open Library search | `q=Thám tử lừng danh Conan&language=vie` | 0 hits. **Miss** |
| Open Library search | `q=Thần đồng đất Việt&language=vie` | 10 hits, none of them the comic. **Miss** |
| Open Library search | `title=Doraemon&publisher=Kim Đồng` | 0 hits. (Publisher "Kim Đồng" overall: 301 records, mostly non-comic) |
| Open Library ISBN | `/isbn/9786042392594` (Conan tập 107, Kim Đồng) | 404 |
| Google Books | `q=Doraemon tập 1&langRestrict=vi` without a key | **HTTP 429**, `quota_limit_value: "0"` for the anonymous shared project. A key is effectively required. Coverage could not be measured |
| Wikidata | Items with `P179/P361` (part of series) for Doraemon Q235311 / Case Closed manga Q3853685 / Dragon Ball manga Q15051307 / Thần đồng Đất Việt Q10826379 | 8 / 24 / 1 / 0 parts. `P629` (edition of) = 0 for all. These are Japanese-edition or chapter items, not VN volumes |
| Wikidata | ISBN `978-604-2-39259-4` | 0 |
| Wikidata | Count of items `P31=Q3331189 (version/edition) ∧ P407=Vietnamese` | 135 in the entire database |
| Kim Đồng sitemap | `sitemap_products_1.xml` | 5,712 products. URL counts: `tham-tu-lung-danh-conan-tap` 22, `shin-cau-be-but-chi` 43 (many are "Tủ sách khoa học" spin-offs), `doraemon-truyen-ngan` 13 (mostly combos/"tập lẻ"), `7-vien-ngoc-rong` 2, `maruko` 1, `than-dong-dat-viet` 0 |
| Kim Đồng product JSON | `/products/tham-tu-lung-danh-conan-tap-107.json` | 200 JSON. ISBN 978-604-2-39259-4, author Gosho Aoyama, series, age group, size, pages, description, 3 images (normal cover, other, special edition + obi) |
| Tiki API | `q=doraemon tập 1` | 5/5 relevant (Tuyển tập màu T1, Chú mèo máy… T1 tái bản, Plus T1, Hoạt hình màu T1, Đội quân Doraemon T1) |
| Tiki API | total hits for Doraemon truyện ngắn / Conan / Thần đồng đất Việt / Shin / Nhóc Maruko / Dragon Ball tập | 2000+ / 963 / 851 / 1446 / 248 / 2000+. Top 3 always on-topic, with combos and multi-seller duplicates mixed in |
| Tiki product detail | `/api/v2/products/242086753` | 200 JSON: name, authors[], description (HTML), images[] (900x900 base), specifications: Nhà xuất bản, Công ty phát hành, Ngày xuất bản, Dịch giả, Số trang, Kích thước, Loại bìa. **No ISBN field** in this sample (the `sku` is a Tiki-internal barcode) |
| Fahasa | `/searchengine?q=doraemon+tap+1` | 200, but the results are rendered client-side with JS. No product data in the HTML. reCAPTCHA present |

## Options evaluated

### Field coverage matrix

| Field | Kim Đồng JSON | Tiki API | Open Library | Google Books | Wikidata |
|---|---|---|---|---|---|
| VN title + volume | yes (`name`) | yes (`name`, noisy suffixes "(Tái Bản 2020)") | rare | unknown (blocked) | no (series label only, `vi`) |
| Author | yes (in `content` HTML, linked collection) | yes (`authors[]`) | n/a | n/a | series-level (P50) |
| Publisher | implicit (Kim Đồng) | yes (spec "Nhà xuất bản") | n/a | n/a | series-level |
| Publish year | partial: `tags` sometimes carries a year (e.g. "2026"), else none | yes ("Ngày xuất bản") | n/a | n/a | series start date (P571) |
| Category | `product_type` ("Manga - comic", "Truyện tranh") + age-group collection | `categories`/`breadcrumbs` | n/a | n/a | genre (P136) |
| Description | yes (HTML in `content`) | yes (HTML `description`) | n/a | n/a | via vi.wikipedia sitelink |
| ISBN | **yes** (in `content` HTML) | usually missing | when present | when present | rare |
| Cover image | yes, `bizweb.dktcdn.net`, sample 800x1246 JPEG, 417 KB | yes, `salt.tikicdn.com`, base 900x900 (padded square), 198 KB. `/cache/280x280/` thumbs exist | covers.openlibrary.org S/M/L | thumbnails | P18 rarely set for manga |
| Extra image (back/spine) | often 2-3 images per product (cover, back or variant) | `images[]`, often several | no | no | no |

### Trade-off matrix

| Option | Pros | Cons | Adoption risk |
|---|---|---|---|
| **1. NXB Kim Đồng store (Sapo JSON)** | First-party publisher data. ISBN present. Clean JSON with no key: `/products.json?limit=N`, `/products/<alias>.json`, plus a full product sitemap (5,712 URLs). High-res covers. robots.txt does **not** disallow `/products` or `.json` | Current catalogue only. Old volumes such as Doraemon truyện ngắn 1-45 and Dragon Ball 1-42 show up mainly as combos or "tập lẻ", not one product per volume. **No Thần đồng Đất Việt** (published by Phan Thị, not Kim Đồng). Publish year is weak. ToS claims copyright over all content and images. No documented API, so it can change without notice | Medium: undocumented endpoint, partial coverage |
| **2. Tiki public API** | Best coverage. Every listed series has hundreds of hits, including Phan Thị's Thần đồng Đất Việt. Structured specs (publisher, date, translator, pages). 900x900 images. No key | Noisy: combos, multiple sellers, "tái bản" variants, used copies. ISBN usually missing. Undocumented internal API, may be rate-limited or blocked at any time. HEAD returns 404 (GET only). ToS page is a JS SPA and could not be read (**unverified**). Retailer-owned product photos | Medium-high: noise, cleaning cost, undocumented |
| 3. Wikidata SPARQL | CC0 licence, stable, documented, no key. Good for series-level facts (original author, genre, start date, vi label, vi.wikipedia link) | Zero VN volume coverage for these series. Cannot fill name/ISBN/cover per volume | Low risk, low yield (enrichment only) |
| 4. Open Library | Documented API, open data, cover API | Practically no VN comic volumes (all sample queries missed). Covers API says "do not crawl" / not for bulk | Low risk, near-zero yield |
| 5. Google Books | Documented, wide global coverage | Keyless use is dead (429, quota 0). Needs a GCP API key. VN comic coverage unmeasured and historically sparse. ToS: "You may not charge users any fee" and content-removal duties | Medium (key setup), unknown yield |
| 6. Fahasa | Large VN catalogue | JS-rendered search, reCAPTCHA. ToS **explicitly bans bots** (quote below) | **High: excluded** |

## Recommendation

1. **Primary: NXB Kim Đồng store JSON.** Enumerate candidates from `sitemap_products_1.xml`, filter slugs by series keywords, then fetch `/products/<alias>.json` for each. That gives ISBN, author, series, description and high-res covers for Conan, Shin, Doraemon (whatever volumes are listed individually), Dragon Ball "tập lẻ" and Maruko. Throttle to at most 1 request every 2-3 s. One run of about 300 requests takes about 15 minutes.
2. **Fallback / gap-filler: Tiki API** for the volumes Kim Đồng does not list individually, and for Thần đồng Đất Việt (Phan Thị). Use `/api/v2/products?q=<series> tập <n>` and pick the best hit: filter out names containing "Combo", "Bộ", "Trọn bộ", "Set". Prefer items whose spec "Nhà xuất bản" matches the expected publisher, then fetch `/api/v2/products/<id>` for the specs. Same throttle.
3. **Enrichment: Wikidata** for series-level category/genre, original Japanese author and year, and the vi.wikipedia description when the store description is thin.
4. Skip Open Library and Google Books. They cost effort and add almost no VN records. Skip Fahasa on ToS grounds.

**Merge / dedup strategy**
- Key 1: **ISBN-13**, normalised (strip hyphens and spaces, validate the checksum, convert ISBN-10 to 13). Kim Đồng records carry it, so they win on conflict.
- Key 2, when ISBN is missing (most Tiki records): `normalize(series) + "|" + volumeNumber + "|" + variant`, where:
  - `normalize`: NFC, lowercase, strip diacritics (đ→d), drop punctuation, and map aliases (e.g. "7 viên ngọc rồng" ↔ "dragon ball", "thám tử lừng danh conan" ↔ "conan").
  - `volumeNumber` comes from the regex `t(ậ|a)p\s*(\d+)` or a trailing number ("Thần Đồng Đất Việt 160").
  - `variant` is in {thường, đặc biệt, màu, plus, tái bản}. Keep "tái bản YYYY" as an attribute, not a separate record, unless you want one record per edition.
- Field precedence: Kim Đồng > Tiki > Wikidata. Store `sourceUrl` + `source` + `fetchedAt` per record for provenance.
- Images: store the source URL. For a private app, hotlinking is fine. If you download copies, keep them local and out of any public repo.

**Legal / ToS risk (plain terms)**
- **Kim Đồng** ("3. Thương hiệu và bản quyền"): *"Mọi quyền sở hữu trí tuệ (...) nội dung thông tin và tất cả các thiết kế, văn bản, đồ họa, phần mềm, hình ảnh (...) đều là tài sản của chúng tôi. Toàn bộ nội dung của trang web được bảo vệ bởi luật bản quyền của Việt Nam và các công ước quốc tế. Bản quyền đã được bảo lưu."* No anti-bot clause was found. Covers and descriptions are copyrighted. Using them in a private, non-published coursework app is low practical risk, but you need permission before making it public.
- **Fahasa**: *"Fahasa không cho phép việc sử dụng các loại phần mềm giả lập (emulator), phần mềm mô phỏng (simulator), phần mềm thực hiện tác vụ tự động (bot), hay bất kỳ các loại phần mềm có bản chất tương tự khác để truy cập Web / App Fahasa. Việc sử dụng những phần mềm này là hành động vi phạm các Điều khoản Fahasa."* Explicit ban, so do not use.
- **Tiki**: the ToS text could not be retrieved (SPA). Assume a similar IP-ownership clause. robots.txt does not disallow `/api/v2/products`.
- **Wikidata**: structured data *"is released into the public domain under Creative Commons Zero."* No restriction.
- **Open Library**: *"Please do not use our APIs to bulk download metadata"*; covers *"intended for displaying covers on public facing websites and not for bulk download."*
- Underlying rights in cover art belong to the manga rights holders (Shogakukan/Fujiko Pro, etc.) and Kim Đồng. Keep the app private, credit the source, and do not redistribute the image files.

## robots.txt (fetched 2026-11-11, relevant lines quoted)

- **nxbkimdong.com.vn** (Sapo): `User-agent: *` / `Disallow: /admin` `/cart` `/search` `/checkout` `/account` `/collections/*sortBy*` `/collections/*+*` ... / `Sitemap: https://nxbkimdong.com.vn/sitemap.xml`. `/products/*.json` and product pages are **not disallowed**. `/search` **is** disallowed, so enumerate via the sitemap rather than search. `AhrefsBot`: `Crawl-Delay: 10`; `Nutch`: `Disallow: /`.
- **www.fahasa.com**: `User-Agent:*` / `Disallow: /checkout/cart/` `/customer/account/` `/tryout/seriesbook/` `/review/customer/` ... ; `User-agent: PetalBot` `Disallow: /search`. robots permits it, but the ToS forbids bots.
- **tiki.vn**: `User-agent: *` / `Disallow: /search?q=*.com` (spam patterns) ... `Disallow: /checkout/cart` `/catalogsearch/result/` `/api/v2/me/` `/v1/private/` `/api/v2/reviews/writable` / `Sitemap: https://tiki.vn/clover/sitemap_index.xml`. `/api/v2/products` is **not disallowed**.
- **openlibrary.org**: `User-agent: *` / `Disallow: /api` `/search` `/publishers` ... ; `User-agent: *bot` `Crawl-delay: 10`. The documented JSON APIs are governed by the developer-page limits instead: *"1 request per second"*, 3/s when identified with a UA and email.
- **books.google.com**: `Disallow: /books?*q=` etc. Use the googleapis.com API instead.
- **www.wikidata.org**: blocks named abusive bots only. WDQS limits: *"One client (user agent + IP) is allowed 60 seconds of processing time each 60 seconds"*, *"limited to 5 parallel queries per IP"*, 60 s query timeout, 429 with Retry-After.

## Rate limits / keys

| Source | Key | Limit |
|---|---|---|
| Kim Đồng | none | none documented. Self-throttle to ≤0.5 req/s |
| Tiki | none | none documented. Self-throttle to ≤0.5 req/s and back off on 429/403 |
| Open Library | none | 1 req/s (3 req/s identified). Covers by ISBN: *"100 requests/IP ... every 5 minutes"*, then 403 |
| Google Books | **API key required** in practice (keyless = 429, quota 0) | per-project daily quota (the default value was not verified this session) |
| Wikidata WDQS | none | 60 s CPU/min per UA+IP, 5 parallel, 30 errors/min |

## Limitations / gaps

- Google Books VN coverage was not measured (blocked without a key). With a key, it might add ISBNs for some Tiki records. That is unverified.
- Tiki ToS text not read (JS SPA). The Tiki API is undocumented and may change, rate-limit or block.
- Fahasa coverage not measured (JS-rendered, ToS ban).
- Kim Đồng's publish year comes only from occasional `tags` values. Tiki's "Ngày xuất bản" is usually the **reprint** date, not the first VN edition.
- Some target series volumes (Doraemon truyện ngắn 1-45, Dragon Ball 1-42) may be obtainable from Kim Đồng only as combos. Per-volume rows then depend on Tiki.
- Sample size: 1 Kim Đồng product and 1 Tiki product inspected in detail. The field-shape claims generalise from those.
- Other VN sources not probed: nxbtre.com.vn (NXB Trẻ), phanthi.vn (Thần đồng Đất Việt's official site, listed in Wikidata P856), vinabook, nhasachphuongnam. Check them first if Thần đồng Đất Việt data from Tiki proves too noisy.

## Sources (HTTP status as checked 2026-11-11)

Verified 200 (GET or HEAD):
- https://nxbkimdong.com.vn/robots.txt · https://nxbkimdong.com.vn/sitemap.xml · https://nxbkimdong.com.vn/products.json · https://nxbkimdong.com.vn/products/tham-tu-lung-danh-conan-tap-107.json · https://nxbkimdong.com.vn/dieu-khoan
- https://tiki.vn/robots.txt · https://tiki.vn/api/v2/products/242086753 (**GET 200, HEAD 404**) · https://tiki.vn/api/v2/products?q=doraemon (GET 200)
- https://www.fahasa.com/robots.txt · https://www.fahasa.com/dieu-khoan-su-dung (curl 200; WebFetch got 403)
- https://openlibrary.org/robots.txt · https://openlibrary.org/developers/api · https://openlibrary.org/dev/docs/api/search · https://openlibrary.org/dev/docs/api/covers
- https://developers.google.com/books/docs/v1/using · https://developers.google.com/books/terms · https://developers.google.com/terms
- https://www.wikidata.org/wiki/Wikidata:Licensing · https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual · https://query.wikidata.org/ · https://www.wikidata.org/wiki/Q10826379
- https://www.goodreads.com/series/230282 · https://tuoitre.vn/nha-xuat-ban-kim-dong-xuat-ban-tuyen-tap-cac-kiet-tac-cua-cha-de-doraemon-20251113152007712.htm (background only)

Not 200 / unverifiable:
- https://www.googleapis.com/books/v1/volumes?q=... returns GET 429 (no key) and HEAD 404
- https://tiki.vn/thong-tin/dieu-khoan-su-dung: curl -L 200, but the page is a JS shell and WebFetch got 404. **ToS text unverified**
- https://hotro.tiki.vn/s/article/dieu-khoan-su-dung: 200, but the body is an empty "Knowledge Base" shell
- https://covers.openlibrary.org/b/id/10656428-L.jpg returns 302 (redirect to archive.org, expected)
