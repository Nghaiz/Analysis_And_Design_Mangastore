// Sinh ảnh theo contract.md §6: bìa cover-{w}.webp + cover-{w}.avif, ảnh phụ extra-{n}-{w}.webp.
import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const WIDTHS = Object.freeze([160, 320, 640]);
const WEBP_OPTIONS = Object.freeze({ quality: 80, effort: 4 });
const AVIF_OPTIONS = Object.freeze({ quality: 50, effort: 4 });

export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** Tên các file một ảnh phải có (dùng cả cho validate). */
export function outputNames(image) {
  if (image.kind === 'cover') return WIDTHS.flatMap((w) => [`cover-${w}.webp`, `cover-${w}.avif`]);
  return WIDTHS.map((w) => `extra-${image.n}-${w}.webp`);
}

/** Giữ tỉ lệ, không phóng to ảnh nhỏ hơn cỡ đích, xoay theo EXIF, bỏ metadata. */
function resized(buffer, width) {
  return sharp(buffer, { failOn: 'error' }).autoOrient().resize({ width, withoutEnlargement: true });
}

/** Trả [{ name, data }] cho một ảnh; ném lỗi nếu không giải mã được. */
export async function renderImage(buffer, image) {
  await sharp(buffer, { failOn: 'error' }).metadata();
  const jobs = WIDTHS.flatMap((width) => {
    const base = image.kind === 'cover' ? `cover-${width}` : `extra-${image.n}-${width}`;
    const out = [resized(buffer, width).webp(WEBP_OPTIONS).toBuffer().then((data) => ({ name: `${base}.webp`, data }))];
    if (image.kind === 'cover') {
      out.push(resized(buffer, width).avif(AVIF_OPTIONS).toBuffer().then((data) => ({ name: `${base}.avif`, data })));
    }
    return out;
  });
  return Promise.all(jobs);
}

/** Giải mã trọn một file ảnh (validate dùng); ném lỗi nếu hỏng. */
export async function decodeFile(file) {
  await sharp(file, { failOn: 'error' }).raw().toBuffer();
}
