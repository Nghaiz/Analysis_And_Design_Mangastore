// Chọn bìa, hai luật theo thứ tự, mỗi luật chỉ đổi khi có ảnh thay thế đạt:
// 1. Bìa ứng viên gần như không màu (trang ruột đen trắng) → ảnh màu đầu tiên làm bìa.
// 2. Bìa ứng viên sau khi cắt viền đệm vẫn xa dáng bìa dọc 2:3 (ảnh ghép bìa với quà tặng, ảnh vuông)
//    → ảnh màu đầu tiên đúng dáng bìa (sau khi cắt viền) làm bìa.
// Có nhiều ảnh đạt thì lấy ảnh giống bìa tham chiếu của bộ nhất (trung bình bìa các tập khác của bộ đã
// đạt cả hai luật), để không lấy nhầm bìa sau; không có tham chiếu thì lấy ảnh đạt đầu tiên.
// Các ảnh còn lại làm ảnh phụ theo thứ tự cũ.
import sharp from 'sharp';
import { COVER_ASPECT, paddingCropBox } from './trim.mjs';

const SAMPLE_SIZE = 64; // thu nhỏ trước khi đo cho nhanh
export const GREY_CHROMA_MAX = 12; // độ lệch kênh trung bình (max - min của R,G,B; 0–255) dưới mức này là "không màu"
const RGB = 3;

/** Độ lệch kênh trung bình của ảnh (0 = xám tuyệt đối); null nếu không giải mã được. */
export async function meanChroma(buffer) {
  try {
    const { data, info } = await sharp(buffer, { failOn: 'error' })
      .resize({ width: SAMPLE_SIZE, height: SAMPLE_SIZE, fit: 'inside' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    const pixels = info.width * info.height;
    for (let i = 0; i < pixels; i += 1) {
      const o = i * info.channels;
      const channels = info.channels >= RGB ? [data[o], data[o + 1], data[o + 2]] : [data[o]];
      sum += Math.max(...channels) - Math.min(...channels);
    }
    return sum / pixels;
  } catch {
    return null; // ảnh hỏng: bước images xử lí và ghi nhận riêng
  }
}

/**
 * @param fetched [{ image, buffer }] theo thứ tự nguồn (phần tử đầu là bìa ứng viên)
 * @returns cùng các phần tử, đã đổi thứ tự nếu cần, `kind`/`n` gán lại
 */
export async function chooseCover(fetched, reference = null) {
  if (fetched.length < 2 || !fetched[0].buffer) return fetched;
  const chroma = await meanChroma(fetched[0].buffer);
  if (chroma == null) return fetched;
  if (chroma < GREY_CHROMA_MAX) {
    return promote(fetched, await bestIndex(fetched, async (b) => isColour(b), reference));
  }
  const gap = await coverAspectGap(fetched[0].buffer);
  if (gap == null || gap <= MISSHAPEN_GAP_MIN) return fetched;
  const shaped = async (b) => (await isColour(b)) && (await isCoverShaped(b));
  return promote(fetched, await bestIndex(fetched, shaped, reference));
}

const THUMB_W = 12;
const THUMB_H = 18;

/**
 * Vector màu thu nhỏ 12×18 của ảnh (sau khi cắt viền đệm), để so ảnh với bìa các tập khác cùng bộ.
 * null nếu ảnh hỏng.
 */
export async function thumbVector(buffer) {
  try {
    const box = await paddingCropBox(buffer);
    let image = sharp(buffer, { failOn: 'error' }).autoOrient();
    if (box) image = image.extract(box);
    const data = await image.resize({ width: THUMB_W, height: THUMB_H, fit: 'fill' }).removeAlpha().toColourspace('srgb').raw().toBuffer();
    return Float32Array.from(data);
  } catch {
    return null;
  }
}

/** Trung bình của các vector (bìa tham chiếu của một bộ). */
export function meanVector(vectors) {
  const sum = new Float32Array(vectors[0].length);
  for (const v of vectors) for (let i = 0; i < v.length; i += 1) sum[i] += v[i];
  return sum.map((x) => x / vectors.length);
}

function distance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

/** Bìa ứng viên đã đạt cả hai luật, không cần đổi (dùng làm tham chiếu cho bộ). */
export async function isUsableCover(buffer) {
  if (!buffer) return false;
  const chroma = await meanChroma(buffer);
  const gap = await coverAspectGap(buffer);
  return chroma != null && chroma >= GREY_CHROMA_MAX && gap != null && gap <= MISSHAPEN_GAP_MIN;
}

/** Độ lệch log giữa tỉ lệ rộng/cao (sau khi cắt viền đệm) và 2:3; 0 = đúng dáng bìa. null nếu ảnh hỏng. */
export async function coverAspectGap(buffer) {
  try {
    const box = await paddingCropBox(buffer);
    const { width, height } = box ?? (await sharp(buffer, { failOn: 'error' }).autoOrient().metadata());
    return Math.abs(Math.log(width / height / COVER_ASPECT));
  } catch {
    return null;
  }
}

// Ngưỡng lệch dáng (log tỉ lệ). Bìa thật: 0–0,1. Ảnh vuông 1:1 ≈ 0,41.
export const MISSHAPEN_GAP_MIN = 0.3; // từ khoảng rộng/cao ≥ 0,9 (hoặc ≤ 0,49) là ảnh không phải bìa đơn
export const COVER_SHAPED_GAP_MAX = 0.15; // rộng/cao trong khoảng 0,57–0,77 là đúng dáng bìa

async function isColour(buffer) {
  const c = await meanChroma(buffer);
  return c != null && c >= GREY_CHROMA_MAX;
}

async function isCoverShaped(buffer) {
  const gap = await coverAspectGap(buffer);
  return gap != null && gap <= COVER_SHAPED_GAP_MAX;
}

/**
 * Ảnh thay thế đạt `test`: có bìa tham chiếu của bộ thì lấy ảnh giống nó nhất (bìa trước, không phải
 * bìa sau hay trang màu), không có thì ảnh đạt đầu tiên. -1 nếu không ảnh nào đạt.
 */
async function bestIndex(fetched, test, reference) {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 1; i < fetched.length; i += 1) {
    if (!fetched[i].buffer || !(await test(fetched[i].buffer))) continue;
    if (!reference) return i;
    const vector = await thumbVector(fetched[i].buffer);
    const d = vector ? distance(vector, reference) : Infinity;
    if (best < 0 || d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  return best;
}

function promote(fetched, index) {
  if (index < 0) return fetched;
  const ordered = [fetched[index], ...fetched.filter((_, i) => i !== index)];
  return ordered.map((entry, n) => ({ ...entry, image: { ...entry.image, kind: n === 0 ? 'cover' : 'extra', n } }));
}
