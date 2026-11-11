// Bước price: copies.jsonl → price.jsonl (chạy sau copies vì "hiếm" dùng số quyển, Deferred #27).
import { loadSeries } from '../lib/config.mjs';
import { readStage, writeStage } from '../lib/io.mjs';
import { priceFor } from '../lib/rules.mjs';

export async function price(ctx) {
  const series = await loadSeries(ctx);
  const books = await readStage(ctx, 'copies');
  const out = books.map((book) => ({ ...book, rentalPrice: priceFor(book, series.byKey.get(book.seriesKey)) }));
  await writeStage(ctx, 'price', out);
  const byPrice = {};
  for (const book of out) byPrice[book.rentalPrice] = (byPrice[book.rentalPrice] ?? 0) + 1;
  ctx.log(`[price] ${out.length} Book: ${JSON.stringify(byPrice)}`);
  return { exitCode: 0, summary: { run: ctx.run, books: out.length, byPrice } };
}
