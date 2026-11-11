import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/** Nhịp vẽ của quạt trần: 30 khung/giây là đủ mượt cho một chuyển động chậm, đỡ pin hơn 60. */
export const AMBIENT_FRAME_MS = 1000 / 30

/**
 * Canvas chạy `frameloop="demand"`: không có gì đổi thì không vẽ. Quạt trần cần chạy liên tục, nên
 * hook này xin khung đều đặn, nhưng chỉ khi canvas đang nằm trong màn hình và tab đang hiện.
 * Cuộn khỏi kệ hoặc đổi tab thì dừng hẳn.
 */
export function useDemandTicker(): void {
  const invalidate = useThree((state) => state.invalidate)
  const canvas = useThree((state) => state.gl.domElement)

  useEffect(() => {
    let onScreen = true
    let timer: number | undefined
    const sync = (): void => {
      const run = onScreen && document.visibilityState === 'visible'
      if (run && timer === undefined) {
        timer = window.setInterval(() => invalidate(), AMBIENT_FRAME_MS)
      } else if (!run && timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting)
      sync()
    })
    observer.observe(canvas)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [canvas, invalidate])
}
