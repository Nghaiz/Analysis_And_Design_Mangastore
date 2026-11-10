// Cắt viền đệm đơn sắc quanh bìa (ảnh Tiki vuông 900x900 có viền trắng) trước khi resize.
// Chỉ cắt khi: bốn góc cùng một màu (viền đơn sắc), phần còn lại ≥ 50% mỗi chiều, và tỉ lệ sau cắt
// gần tỉ lệ bìa 2:3 hơn ảnh gốc (để không cắt vào bìa nền trắng vốn đã đúng tỉ lệ).
import sharp from 'sharp';

export const TRIM_THRESHOLD = 24; // độ lệch màu cho phép so với màu viền (nhiễu JPEG)
const CORNER_TOLERANCE = 16; // chênh lệch tối đa từng kênh giữa bốn góc
const MIN_KEEP_RATIO = 0.5;
export const COVER_ASPECT = 2 / 3; // rộng / cao
const RGB = 3;

function pixel(data, info, x, y) {
  const offset = (y * info.width + x) * info.channels;
  return Array.from(data.subarray(offset, offset + RGB));
}

function uniformCorners(data, info) {
  const { width, height } = info;
  const corners = [
    pixel(data, info, 0, 0),
    pixel(data, info, width - 1, 0),
    pixel(data, info, 0, height - 1),
    pixel(data, info, width - 1, height - 1),
  ];
  const [first] = corners;
  const same = corners.every((c) => c.every((v, i) => Math.abs(v - first[i]) <= CORNER_TOLERANCE));
  return same ? first : null;
}

const aspectGap = (width, height) => Math.abs(Math.log(width / height / COVER_ASPECT));

/**
 * Hộp cắt { left, top, width, height } (toạ độ sau khi xoay theo EXIF) hoặc null nếu không nên cắt.
 */
export async function paddingCropBox(buffer) {
  const { data, info } = await sharp(buffer, { failOn: 'error' })
    .autoOrient()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const border = uniformCorners(data, info);
  if (!border) return null;
  const [r, g, b] = border;
  const trimmed = await sharp(buffer, { failOn: 'error' })
    .autoOrient()
    .trim({ background: { r, g, b }, threshold: TRIM_THRESHOLD })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;
  if (width === info.width && height === info.height) return null;
  if (width < info.width * MIN_KEEP_RATIO || height < info.height * MIN_KEEP_RATIO) return null;
  if (aspectGap(width, height) >= aspectGap(info.width, info.height)) return null;
  return { left: -(trimmed.info.trimOffsetLeft ?? 0), top: -(trimmed.info.trimOffsetTop ?? 0), width, height };
}
