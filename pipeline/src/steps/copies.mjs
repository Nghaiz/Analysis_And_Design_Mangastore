// Bước copies: images.jsonl → copies.jsonl, 1–5 quyển mỗi Book cố định theo seed (CONTRACT §5).
import { readStage, writeStage } from '../lib/io.mjs';
import { copiesFor, FEW_COPIES_MAX, MANY_COPIES_MIN } from '../lib/rules.mjs';

export async function copies(ctx) {
  const books = await readStage(ctx, 'images');
  const out = books.map((book) => ({ ...book, copies: copiesFor(book) }));
  await writeStage(ctx, 'copies', out);
  const histogram = {};
  for (const book of out) histogram[book.copies] = (histogram[book.copies] ?? 0) + 1;
  const summary = {
    run: ctx.run,
    books: out.length,
    copies: out.reduce((sum, book) => sum + book.copies, 0),
    histogram,
    few: out.filter((book) => book.copies <= FEW_COPIES_MAX).length,
    many: out.filter((book) => book.copies >= MANY_COPIES_MIN).length,
  };
  ctx.log(`[copies] ${summary.copies} quyển cho ${summary.books} Book`);
  return { exitCode: 0, summary };
}
