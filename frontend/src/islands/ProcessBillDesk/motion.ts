// Hoạt cảnh vào (sổ mở ra, tem dán xuống, ngăn kéo kéo ra) cho hai island M3. Giảm chuyển động thì
// không có hoạt cảnh: phần tử hiện ngay ở trạng thái cuối, không lớp transition nào được gắn.
// Lớp `motion-safe:` giữ cùng luật ở tầng CSS (components.css còn tắt mọi transition khi `reduce`).
import { useEffect, useState } from 'react'

/** Lớp transition cho phần tử có hoạt cảnh vào; rỗng khi giảm chuyển động. */
export const ENTRANCE_TRANSITION = 'motion-safe:transition motion-safe:duration-300 motion-safe:ease-out'

/** true khi phần tử đã ở trạng thái cuối: ngay lập tức khi giảm chuyển động, sau một khung hình nếu không. */
export function useEntered(reducedMotion: boolean): boolean {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (reducedMotion) return
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])
  return reducedMotion || entered
}

/** Lớp của một phần tử có hoạt cảnh vào: `from` trước khi vào, `to` sau khi vào. */
export function entranceClasses(reducedMotion: boolean, entered: boolean, from: string, to: string): string {
  if (reducedMotion) return to
  return `${ENTRANCE_TRANSITION} ${entered ? to : from}`
}

/** Giá trị cho thuộc tính `data-motion` của gốc island, để test và CSS biết island đang ở chế độ nào. */
export function motionMode(reducedMotion: boolean): 'reduced' | 'full' {
  return reducedMotion ? 'reduced' : 'full'
}
