// Thực thể HTML có tên: đủ bảng Latin-1 (U+00A0–U+00FF, theo thứ tự chuẩn HTML 4) cộng các tên
// thường gặp trong mô tả tiếng Việt (ă, đ, ĩ, ũ, dấu câu). Thực thể số (&#7887; &#x1EA1;) giải mã riêng.

const LATIN1_START = 0xa0;
const LATIN1_NAMES = Object.freeze(
  ('nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr ' +
    'deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest ' +
    'Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ' +
    'ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig ' +
    'agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml ' +
    'eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml').split(' '),
);

const EXTRA = Object.freeze({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  Abreve: 'Ă', abreve: 'ă', Dstrok: 'Đ', dstrok: 'đ', Itilde: 'Ĩ', itilde: 'ĩ', Utilde: 'Ũ', utilde: 'ũ',
  OElig: 'Œ', oelig: 'œ', Scaron: 'Š', scaron: 'š', Yuml: 'Ÿ', fnof: 'ƒ', circ: 'ˆ', tilde: '˜',
  ensp: ' ', emsp: ' ', thinsp: ' ', zwnj: '', zwj: '', lrm: '', rlm: '',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„',
  dagger: '†', Dagger: '‡', bull: '•', hellip: '…', permil: '‰', lsaquo: '‹', rsaquo: '›', euro: '€', trade: '™',
});

export const NAMED_ENTITIES = Object.freeze({
  ...Object.fromEntries(LATIN1_NAMES.map((name, i) => [name, String.fromCodePoint(LATIN1_START + i)])),
  ...EXTRA,
});

const ENTITY = /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g;
const MAX_PASSES = 2; // một lần nữa cho chuỗi bị mã hoá hai lần ("&amp;agrave;")
const MAX_CODE_POINT = 0x10ffff;

function decodeOnce(text) {
  return text.replace(ENTITY, (whole, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= MAX_CODE_POINT ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

export function decodeEntities(text) {
  let out = text;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const next = decodeOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}
