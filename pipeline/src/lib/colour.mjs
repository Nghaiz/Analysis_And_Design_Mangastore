// Chọn bìa: ảnh bìa ứng viên gần như không màu (trang ruột đen trắng) mà Book có ảnh màu
// thì ảnh màu đầu tiên làm bìa, các ảnh còn lại làm ảnh phụ theo thứ tự cũ.
import sharp from 'sharp';

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
export async function chooseCover(fetched) {
  if (fetched.length < 2 || !fetched[0].buffer) return fetched;
  const chroma = await meanChroma(fetched[0].buffer);
  if (chroma == null || chroma >= GREY_CHROMA_MAX) return fetched;
  let colourIndex = -1;
  for (let i = 1; i < fetched.length && colourIndex < 0; i += 1) {
    if (!fetched[i].buffer) continue;
    const c = await meanChroma(fetched[i].buffer);
    if (c != null && c >= GREY_CHROMA_MAX) colourIndex = i;
  }
  if (colourIndex < 0) return fetched;
  const ordered = [fetched[colourIndex], ...fetched.filter((_, i) => i !== colourIndex)];
  return ordered.map((entry, n) => ({ ...entry, image: { ...entry.image, kind: n === 0 ? 'cover' : 'extra', n } }));
}
