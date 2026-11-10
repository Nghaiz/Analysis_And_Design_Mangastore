// Sinh ảnh theo contract.md §6: bìa cover-{w}.webp + cover-{w}.avif, ảnh phụ extra-{n}-{w}.webp.
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { paddingCropBox } from './trim.mjs';

export const WIDTHS = Object.freeze([160, 320, 640]);
const WEBP_OPTIONS = Object.freeze({ quality: 80, effort: 4 });
const AVIF_OPTIONS = Object.freeze({ quality: 50, effort: 4 });
/** Đổi khi cách sinh ảnh đổi, để bước images không dùng lại file của cách cũ. */
export const RENDER_VERSION = 2;

export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** Tên các file một ảnh phải có (dùng cả cho validate). */
export function outputNames(image) {
  if (image.kind === 'cover') return WIDTHS.flatMap((w) => [`cover-${w}.webp`, `cover-${w}.avif`]);
  return WIDTHS.map((w) => `extra-${image.n}-${w}.webp`);
}

/** Xoay theo EXIF, cắt viền đệm (nếu có), giữ tỉ lệ, không phóng to ảnh nhỏ hơn cỡ đích, bỏ metadata. */
function resized(buffer, width, box) {
  const base = sharp(buffer, { failOn: 'error' }).autoOrient();
  return (box ? base.extract(box) : base).resize({ width, withoutEnlargement: true });
}

/** Trả [{ name, data }] cho một ảnh; ném lỗi nếu không giải mã được. Chỉ bìa được cắt viền đệm. */
export async function renderImage(buffer, image) {
  await sharp(buffer, { failOn: 'error' }).metadata();
  const box = image.kind === 'cover' ? await paddingCropBox(buffer) : null;
  const jobs = WIDTHS.flatMap((width) => {
    const base = image.kind === 'cover' ? `cover-${width}` : `extra-${image.n}-${width}`;
    const out = [resized(buffer, width, box).webp(WEBP_OPTIONS).toBuffer().then((data) => ({ name: `${base}.webp`, data }))];
    if (image.kind === 'cover') {
      out.push(resized(buffer, width, box).avif(AVIF_OPTIONS).toBuffer().then((data) => ({ name: `${base}.avif`, data })));
    }
    return out;
  });
  return Promise.all(jobs);
}

/** Giải mã trọn một file ảnh (validate dùng); ném lỗi nếu hỏng. */
export async function decodeFile(file) {
  await sharp(file, { failOn: 'error' }).raw().toBuffer();
}
