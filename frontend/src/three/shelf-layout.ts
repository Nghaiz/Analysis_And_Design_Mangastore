// Bố cục kệ, màu gáy, hoạt cảnh rút quyển và khung máy quay: hàm thuần, không import three,
// để test bằng Vitest không cần WebGL. Đơn vị: mét của cảnh (1 = chiều cao một gáy truyện dày).

/** Màu bìa theo VỊ TRÍ thể loại trong `props.categories` (vị trí i lấy màu i % độ dài). Tự chọn,
 *  tông mực in cũ; đỏ dấu và xanh bút bi trùng token `--stamp-red`, `--pen-blue`. */
export const SPINE_COLORS = [
  '#A3221B',
  '#1F3F8F',
  '#2A6334',
  '#B7791F',
  '#6E3B5C',
  '#2F6E73',
  '#B8552F',
  '#3D4A5C',
  '#8A6D1F',
  '#7A2E3A',
] as const

/** Hoa văn gáy theo vị trí (i % độ dài); ghép với 10 màu cho ra 10 gáy khác nhau. */
export const SPINE_PATTERNS = ['bands', 'stripes', 'dots', 'diamonds', 'frame'] as const
export type SpinePattern = (typeof SPINE_PATTERNS)[number]

/** Gáy truyện độn (không nhãn, không bấm được) cho kệ đỡ trống. */
export const FILLER_COLORS = ['#4A3A2C', '#5C4A36', '#3F4B3A', '#6B5134'] as const

export const ROW_HEIGHT = 1.72
export const BOARD_THICKNESS = 0.1
export const SIDE_THICKNESS = 0.12
export const INNER_WIDTH = 4.6
export const CASE_DEPTH = 1.1
export const SPINE_DEPTH = 0.9
export const SPINES_PER_ROW = 5
const SPINE_GAP = 0.015
const FRONT_INSET = 0.05
const FILLER_WIDTHS = [0.24, 0.3, 0.2, 0.34] as const
const FILLER_HEIGHTS = [1.18, 1.36, 1.1, 1.3] as const
/** Sau gáy thể loại thứ mấy trong hàng thì chèn một gáy độn. */
const FILLER_AFTER = new Set([1, 3])

export interface SpineSlot {
  kind: 'category' | 'filler'
  /** Vị trí trong `categories` với gáy thể loại; thứ tự gáy độn với gáy độn. */
  index: number
  /** Tâm hộp gáy. */
  x: number
  y: number
  z: number
  width: number
  height: number
  color: string
  pattern: SpinePattern | null
}

export interface ShelfLayout {
  rows: number
  compact: boolean
  /** Chiều cao tủ, đáy tủ ở y = 0. */
  caseHeight: number
  caseWidth: number
  /** y mặt trên của từng tấm đỡ, từ dưới lên (rows + 1 tấm). */
  boardTops: number[]
  slots: SpineSlot[]
}

function pick<T>(list: readonly T[], index: number): T {
  const value = list[index % list.length]
  if (value === undefined) throw new Error('pick() on an empty list')
  return value
}

export function categoryColor(index: number): string {
  return pick(SPINE_COLORS, index)
}

export function categoryPattern(index: number): SpinePattern {
  return pick(SPINE_PATTERNS, index)
}

function categoryWidth(index: number, compact: boolean): number {
  return compact ? COMPACT_SPINE_WIDTH + (index % 3) * 0.03 : 0.46 + (index % 3) * 0.06
}

function categoryHeight(index: number): number {
  return 1.28 + ((index * 5) % 4) * 0.07
}

/** Khung hẹp (điện thoại): bỏ gáy độn, gáy thể loại rộng gần gấp đôi để nhãn đủ to mà đọc. */
export const COMPACT_MAX_WIDTH_PX = 560
const COMPACT_SPINE_WIDTH = 0.82

export interface LayoutOptions {
  /** Khung hẹp hơn `COMPACT_MAX_WIDTH_PX`: không gáy độn, gáy rộng, máy quay sát tủ. */
  compact: boolean
}

/** Xếp `count` gáy thể loại theo thứ tự đọc (trái sang phải, hàng trên xuống), mỗi hàng tối đa 5. */
export function layoutShelf(count: number, options: LayoutOptions = { compact: false }): ShelfLayout {
  const { compact } = options
  if (!Number.isInteger(count) || count < 1) throw new Error(`layoutShelf() needs at least one category, got ${count}`)
  const rows = Math.ceil(count / SPINES_PER_ROW)
  const pitch = ROW_HEIGHT + BOARD_THICKNESS
  const caseHeight = rows * pitch + BOARD_THICKNESS
  const boardTops = Array.from({ length: rows + 1 }, (_, k) => k * pitch + BOARD_THICKNESS)
  const z = CASE_DEPTH / 2 - FRONT_INSET - SPINE_DEPTH / 2
  const slots: SpineSlot[] = []
  let fillerIndex = 0

  for (let row = 0; row < rows; row++) {
    const floor = boardTops[rows - 1 - row] ?? 0
    let cursor = -INNER_WIDTH / 2 + SPINE_GAP
    const place = (slot: Omit<SpineSlot, 'x' | 'y' | 'z'>): boolean => {
      if (cursor + slot.width > INNER_WIDTH / 2) return false
      slots.push({ ...slot, x: cursor + slot.width / 2, y: floor + slot.height / 2, z })
      cursor += slot.width + SPINE_GAP
      return true
    }
    const addFiller = (): boolean => {
      const placed = place({
        kind: 'filler',
        index: fillerIndex,
        width: pick(FILLER_WIDTHS, fillerIndex),
        height: pick(FILLER_HEIGHTS, fillerIndex),
        color: pick(FILLER_COLORS, fillerIndex),
        pattern: null,
      })
      if (placed) fillerIndex++
      return placed
    }

    const first = row * SPINES_PER_ROW
    const last = Math.min(count, first + SPINES_PER_ROW)
    for (let index = first; index < last; index++) {
      const placed = place({
        kind: 'category',
        index,
        width: categoryWidth(index, compact),
        height: categoryHeight(index),
        color: categoryColor(index),
        pattern: categoryPattern(index),
      })
      if (!placed) throw new Error(`Category spine ${index} does not fit in row ${row}`)
      if (!compact && FILLER_AFTER.has(index - first)) addFiller()
    }
    while (!compact && addFiller()) {
      // Lấp phần còn lại của hàng bằng gáy độn tới khi hết chỗ.
    }
  }

  return { rows, compact, caseHeight, caseWidth: INNER_WIDTH + 2 * SIDE_THICKNESS, boardTops, slots }
}

/** Gáy nhô ra bao nhiêu khi rê chuột hoặc Tab tới. */
export const HOVER_OFFSET = 0.26
const PULL_OUT_SECONDS = 0.22
const PULL_DROP_SECONDS = 0.42
/** Tổng thời gian hoạt cảnh rút quyển, sau đó island bấm link đăng nhập. */
export const PULL_SECONDS = PULL_OUT_SECONDS + PULL_DROP_SECONDS
const PULL_OUT_DISTANCE = 0.6
const PULL_DROP_DISTANCE = 1.9
const PULL_TILT = 0.5

export interface PullPose {
  /** Dịch ra trước, xuống dưới, và góc nghiêng quanh trục x (radian) so với chỗ đứng trên kệ. */
  dz: number
  dy: number
  tilt: number
  done: boolean
}

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)
const easeIn = (t: number): number => t * t
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

/** Tư thế của quyển đang rút sau `seconds` giây: kéo ra khỏi kệ rồi rơi xuống, nghiêng về phía người xem. */
export function pullPose(seconds: number): PullPose {
  const out = easeOut(clamp01(seconds / PULL_OUT_SECONDS))
  const drop = easeIn(clamp01((seconds - PULL_OUT_SECONDS) / PULL_DROP_SECONDS))
  return {
    dz: out * PULL_OUT_DISTANCE + drop * 0.2,
    dy: -drop * PULL_DROP_DISTANCE,
    tilt: drop * PULL_TILT,
    done: seconds >= PULL_SECONDS,
  }
}

/** Vị trí bóng đèn và tâm quạt trần so với (giữa tủ, đỉnh tủ, mặt trước tủ). Ảnh tĩnh dùng cùng số này. */
export const LAMP_OFFSET: readonly [number, number, number] = [-INNER_WIDTH / 2 + 0.9, 0.62, 0.5]
export const FAN_OFFSET: readonly [number, number, number] = [INNER_WIDTH / 2 - 0.6, 0.75, 0.3]
/** Cánh quạt: từ mép bầu quạt ra tới đầu cánh. */
export const FAN_BLADE_INNER = 0.135
export const FAN_BLADE_LENGTH = 0.9
export const FAN_BLADE_WIDTH = 0.24

/** Tỉ lệ khung của cảnh, khớp ảnh tĩnh 1200×800 để nâng cấp không xê dịch bố cục. */
export const SCENE_ASPECT = 3 / 2
export const CAMERA_FOV = 38
/** Phần trên tủ dành cho đèn và quạt trần (quạt bị khung cắt bớt, như nhìn từ dưới lên). */
export const HEADROOM = 1.2
/** Khung hẹp: chỉ chừa một dải trên đầu tủ; đèn và quạt ra ngoài khung, ánh đèn vẫn rọi xuống kệ. */
export const COMPACT_HEADROOM = 0.15
const FRAME_MARGIN = 1.06
const COMPACT_FRAME_MARGIN = 1.02

export interface CameraFrame {
  position: [number, number, number]
  /** Có `rotation` thì r3f không tự `lookAt(0, 0, 0)`; máy quay nhìn thẳng vào giữa tủ. */
  rotation: [number, number, number]
  fov: number
}

/** Đặt máy quay nhìn thẳng sao cho cả tủ và phần trên đầu tủ (theo `layout.compact`) lọt khung `SCENE_ASPECT`. */
export function frameCamera(layout: ShelfLayout): CameraFrame {
  const halfTan = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
  const height = layout.caseHeight + (layout.compact ? COMPACT_HEADROOM : HEADROOM)
  const width = layout.caseWidth + (layout.compact ? 0.1 : 0.4)
  const margin = layout.compact ? COMPACT_FRAME_MARGIN : FRAME_MARGIN
  const distance = Math.max(height / 2 / halfTan, width / 2 / (halfTan * SCENE_ASPECT)) * margin
  return { position: [0, height / 2, CASE_DEPTH / 2 + distance], rotation: [0, 0, 0], fov: CAMERA_FOV }
}
