// Báo cáo validate: validate.md và index.html (trang tĩnh xem bìa, đọc được ở khổ điện thoại).
import { hasCover } from './checks.mjs';

const PREVIEW_WIDTH = 320;
const MAX_LISTED = 200;

const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const mdCell = (text) => String(text ?? '').replace(/\|/g, '\\|');

function issueTable(title, issues) {
  if (issues.length === 0) return `## ${title}\n\nKhông có.\n`;
  const rows = issues.slice(0, MAX_LISTED).map((i) => `| ${i.code} | ${i.bookId ?? ''} | ${mdCell(i.message)} |`);
  const more = issues.length > MAX_LISTED ? `\n… và ${issues.length - MAX_LISTED} dòng nữa (xem validate.json).\n` : '';
  return `## ${title} (${issues.length})\n\n| Mã | Book | Chi tiết |\n|---|---|---|\n${rows.join('\n')}\n${more}`;
}

export function renderMarkdown(report) {
  const verdict = report.blocking.length ? 'CÓ LỖI CHẶN, không export' : 'Không có lỗi chặn';
  const wins = Object.entries(report.sourceWins).map(([source, n]) => `${source} ${n}`).join(', ');
  return [
    `# Validate lần chạy \`${report.run}\``,
    '',
    `- Kết luận: **${verdict}**`,
    `- Book: ${report.books}; quyển: ${report.copies}`,
    `- Có bìa: ${report.withCover.length}; thiếu bìa: ${report.missingCover.length}`,
    `- Nguồn thắng: ${wins}`,
    '',
    issueTable('Lỗi chặn', report.blocking),
    issueTable('Cảnh báo', report.warnings),
    `## Book thiếu bìa\n\n${report.missingCover.length ? report.missingCover.join(', ') : 'Không có.'}\n`,
  ].join('\n');
}

function card(book, imagesHref) {
  const img = hasCover(book)
    ? `<img src="${imagesHref}/${book.id}/cover-${PREVIEW_WIDTH}.webp" alt="${escapeHtml(book.name)}" loading="lazy">`
    : '<div class="missing">Thiếu bìa</div>';
  const meta = [book.author, book.publisher, book.publishYear, book.rentalPrice != null ? `${book.rentalPrice}đ` : null]
    .filter((v) => v != null && v !== '')
    .map(escapeHtml)
    .join(' · ');
  return `<li><figure>${img}<figcaption><b>#${book.id}</b> ${escapeHtml(book.name)}<small>${meta}; ${escapeHtml(book.copies)} quyển; ${escapeHtml(book.source)}</small></figcaption></figure></li>`;
}

/** `imagesHref`: đường dẫn tương đối từ data/reports/<run>/ tới data/images/<run>/. */
export function renderHtml(report, books, imagesHref) {
  const status = report.blocking.length ? `${report.blocking.length} lỗi chặn` : 'không có lỗi chặn';
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bìa lần chạy ${escapeHtml(report.run)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:12px;background:#f6f1e7;color:#2b2118}
h1{font-size:1.2rem;margin:0 0 4px}p{margin:0 0 12px}
ul{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
figure{margin:0;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px #0002}
img,.missing{display:block;width:100%;aspect-ratio:2/3;object-fit:cover;background:#ddd}
.missing{display:flex;align-items:center;justify-content:center;color:#8a1c1c;font-weight:600}
figcaption{padding:6px;font-size:.85rem;line-height:1.3}small{display:block;color:#6b5a48;margin-top:2px}
</style>
</head>
<body>
<h1>Bìa lần chạy ${escapeHtml(report.run)}</h1>
<p>${report.books} Book, ${report.copies} quyển, ${report.withCover.length} có bìa, ${report.missingCover.length} thiếu bìa; ${status}.</p>
<ul>
${books.map((book) => card(book, imagesHref)).join('\n')}
</ul>
</body>
</html>
`;
}
