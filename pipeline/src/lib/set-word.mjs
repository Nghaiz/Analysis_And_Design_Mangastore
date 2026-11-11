// Chữ "bộ" (một bộ nhiều tập) trong tên sản phẩm, dùng chung cho lọc combo ở crawl (sources/text.mjs)
// và ở validate (lib/title.mjs), CONTRACT §5.
// "Bộ" và "Bố" (cha) chỉ khác nhau ở dấu; bỏ dấu thì cả hai thành "bo", nên luật cũ so trên chữ đã bỏ dấu
// coi "Bố …" là combo (#82, #88). Vì vậy so trên chữ CÓ dấu. Tên không gõ dấu tiếng Việt nào (slug của
// Kim Đồng như "bo-truyen-conan", tên gõ không dấu) thì "bo" không phân biệt được bộ hay bố: giữ cách cũ,
// coi là combo, vì bỏ nhầm một tên còn hơn nạp nhầm một combo.

const SET_WORD = /(?<![\p{L}\p{N}])bộ(?![\p{L}\p{N}])/u;
const FOLDED_SET_WORD = /(?<![a-z0-9])bo(?![a-z0-9])/;
// Dấu thanh, dấu mũ, dấu móc (sau khi tách NFD) hoặc chữ đ: tên có gõ dấu tiếng Việt.
const VIETNAMESE_MARK = /[̀-ͯ]|đ/u;

/** Tên có chữ "bộ" đứng riêng (không phân biệt hoa thường); tên không gõ dấu tiếng Việt thì "bo" cũng tính. */
export function hasSetWord(name) {
  const text = String(name ?? '').normalize('NFC').toLowerCase();
  if (VIETNAMESE_MARK.test(text.normalize('NFD'))) return SET_WORD.test(text);
  return FOLDED_SET_WORD.test(text);
}
