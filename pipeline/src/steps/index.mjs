// Đăng kí bước của lane 4B cho pipeline/cli.mjs (CONTRACT §3). Thứ tự trong `steps` là thứ tự của `run`.
import { clean } from './clean.mjs';
import { copies } from './copies.mjs';
import { exportStep } from './export.mjs';
import { images } from './images.mjs';
import { price } from './price.mjs';
import { publish } from './publish.mjs';
import { validate } from './validate.mjs';

export const steps = Object.freeze([
  { name: 'clean', describe: 'Làm sạch, gộp trùng, gán id: raw/<run>/*.jsonl → stage/<run>/clean.jsonl', run: clean },
  { name: 'images', describe: 'Tải ảnh, sinh WebP 160/320/640 và AVIF bìa: → images.jsonl, images/<run>/', run: images },
  { name: 'copies', describe: 'Số quyển 1–5 theo seed cố định: → copies.jsonl', run: copies },
  { name: 'price', describe: 'Giá thuê theo quy tắc 3.000/5.000đ, hiếm +1.000đ: → price.jsonl', run: price },
  { name: 'validate', describe: 'Kiểm lỗi chặn, cảnh báo; ghi reports/<run>/validate.{md,json}, index.html', run: validate },
  { name: 'export', describe: 'Xuất V10, V11 và manifest.jsonl (hỗ trợ --dry-run)', run: exportStep },
]);

export const extraCommands = Object.freeze([
  {
    name: 'publish',
    describe: 'Chép data/export/*.sql và data/images/full/** vào volume Docker (hỗ trợ --dry-run, --project)',
    run: (ctx) => publish(ctx),
  },
]);
