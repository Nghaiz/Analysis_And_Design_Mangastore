// Chuyển động của chồng truyện. Giảm chuyển động (prefers-reduced-motion) thì không có hoạt cảnh:
// không lớp transition, không xê dịch; chỉ còn đổi trạng thái (mờ dòng đang xoá). Lớp `motion-safe:`
// giữ cùng luật ở tầng CSS. Tên lớp viết nguyên chuỗi để Tailwind quét được.
import { useEffect, useState } from 'react'

const TRANSITION = 'motion-safe:transition motion-safe:duration-300 motion-safe:ease-out'

export type MotionMode = 'reduced' | 'full'

export function motionMode(reducedMotion: boolean): MotionMode {
  return reducedMotion ? 'reduced' : 'full'
}

/** true khi chồng đã ở trạng thái cuối: ngay khi giảm chuyển động, sau một khung hình nếu không. */
export function useEntered(reducedMotion: boolean): boolean {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (reducedMotion) return
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])
  return reducedMotion || entered
}

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
  return [TRANSITION, shift, drop].filter(Boolean).join(' ')
}
