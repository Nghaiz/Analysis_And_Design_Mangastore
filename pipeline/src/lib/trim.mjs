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

// Dải nhãn người bán (#95): ảnh Tiki của một số người bán là khung vuông nền trắng, bìa đặt giữa, phía
// trên bìa có một nhãn chữ (logo cửa hàng) tách khỏi bìa bằng một khoảng trắng chạy hết bề ngang. Cắt viền
// đệm giữ cả nhãn vì nhãn không trắng. Nhận ra nhãn trong hộp cắt: một dải trên cùng hẹp hơn bề ngang bìa,
// rồi một khoảng hàng toàn màu viền, rồi bìa.
const BLANK_ROW_MIN = 0.98; // hàng có ≥ 98% điểm cùng màu viền là hàng trống (nhiễu JPEG)
const TAG_ROW_BORDER_MIN = 0.3; // mỗi hàng của dải nhãn còn ≥ 30% màu viền: nhãn hẹp hơn 70% bề ngang
export const BAND_MIN_FRACTION = 0.03; // dải nhãn (tính cả hàng trống phía trên) cao 3–15% hộp cắt
export const BAND_MAX_FRACTION = 0.15;
export const BAND_GUTTER_MIN_FRACTION = 0.025; // khoảng trắng dưới nhãn cao ≥ 2,5% hộp cắt

/** Tỉ lệ điểm cùng màu viền của từng hàng trong `rows` hàng đầu của hộp cắt. */
function borderRowFractions(data, info, box, border, rows) {
  const out = [];
  for (let y = box.top; y < box.top + rows; y += 1) {
    let same = 0;
    for (let x = box.left; x < box.left + box.width; x += 1) {
      const p = pixel(data, info, x, y);
      if (p.every((v, i) => Math.abs(v - border[i]) <= TRIM_THRESHOLD)) same += 1;
    }
    out.push(same / box.width);
  }
  return out;
}

/**
 * Chiều cao (số hàng, toạ độ của hộp cắt) của dải nhãn người bán phía trên bìa, tính tới hết khoảng trắng
 * dưới nhãn; 0 nếu không có. Chỉ xét ảnh có viền đệm (paddingCropBox khác null).
 */
export async function sellerBandHeight(buffer) {
  const box = await paddingCropBox(buffer);
  if (!box) return 0;
  const { data, info } = await sharp(buffer, { failOn: 'error' }).autoOrient().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const border = uniformCorners(data, info);
  const maxBand = Math.floor(box.height * BAND_MAX_FRACTION);
  const minGutter = Math.ceil(box.height * BAND_GUTTER_MIN_FRACTION);
  const rows = borderRowFractions(data, info, box, border, Math.min(box.height, 2 * maxBand + minGutter));
  let y = 0;
  while (y < maxBand && rows[y] >= BLANK_ROW_MIN) y += 1; // hàng trống phía trên nhãn
  if (y >= maxBand) return 0;
  while (y < maxBand && rows[y] < BLANK_ROW_MIN) {
    if (rows[y] < TAG_ROW_BORDER_MIN) return 0; // dải chạy gần hết bề ngang: là bìa, không phải nhãn
    y += 1;
  }
  const bandEnd = y;
  if (bandEnd < box.height * BAND_MIN_FRACTION || bandEnd >= maxBand) return 0;
  while (y < rows.length && rows[y] >= BLANK_ROW_MIN) y += 1;
  return y - bandEnd >= minGutter && y < rows.length ? y : 0;
}
