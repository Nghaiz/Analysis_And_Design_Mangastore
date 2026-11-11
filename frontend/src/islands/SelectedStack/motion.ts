// Chuyển động riêng của chồng truyện: lớp từng gáy (lệch so le, rút ra khi tích, trượt đi khi xoá).
// Phần chung (chế độ `data-motion`, hook "đã vào", chuỗi lớp transition) ở `@/lib/motion`. Giảm
// chuyển động thì không có hoạt cảnh: không lớp transition, không xê dịch; chỉ còn đổi trạng thái
// (mờ dòng đang xoá). Tên lớp viết nguyên chuỗi để Tailwind quét được.
import { ENTRANCE_TRANSITION, type MotionMode } from '@/lib/motion'

export interface SpineState {
  index: number
  checked: boolean
  leaving: boolean
  entered: boolean
}

/** Lớp của một gáy truyện trong chồng: lệch so le, rút ra khi tích, trượt đi khi xoá. */
export function spineClasses(mode: MotionMode, state: SpineState): string {
  if (mode === 'reduced') return state.leaving ? 'opacity-60' : ''
  const shift = state.leaving
    ? 'translate-x-8 opacity-40'
    : state.checked
      ? 'translate-x-2'
      : state.index % 2 === 0
        ? 'translate-x-0.5'
        : '-translate-x-0.5'
  const drop = state.entered ? '' : '-translate-y-2 opacity-0'
  return [ENTRANCE_TRANSITION, shift, drop].filter(Boolean).join(' ')
}
