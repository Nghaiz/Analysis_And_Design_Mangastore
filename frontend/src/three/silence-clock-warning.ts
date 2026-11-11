import { getConsoleFunction, setConsoleFunction } from 'three'

// Vì sao có file này: @react-three/fiber 9.8.2 (bản ổn định mới nhất; 10 còn alpha) tạo `new THREE.Clock()`
// cho mỗi canvas, và three 0.187 (ghim ở phase 5) in cảnh báo r183 dưới đây mỗi lần cảnh nạp. Code của
// tiệm không dùng Clock; cảnh báo làm hỏng tiêu chí "console sạch" mà không có việc gì để sửa ở phía ta.
// Bộ lọc chỉ bỏ ĐÚNG câu này; mọi log/warn/error khác của three đi tiếp tới hàm cũ (hoặc console).
// GỠ file này (và lời gọi trong ShelfCanvas.tsx) khi nâng r3f lên bản dùng THREE.Timer thay cho THREE.Clock.

export const CLOCK_DEPRECATION_WARNING = 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.'

type ConsoleType = 'log' | 'warn' | 'error'
type ThreeConsoleFunction = (type: ConsoleType, message: string, ...params: unknown[]) => void

interface StackTraceLike {
  isStackTrace: true
  getError(message: string): unknown
}

function isStackTrace(value: unknown): value is StackTraceLike {
  return typeof value === 'object' && value !== null && (value as { isStackTrace?: unknown }).isStackTrace === true
}

/** Hành vi mặc định của three khi chưa ai đặt console function (src/utils.js của three 0.187). */
function toNativeConsole(type: ConsoleType, message: string, params: unknown[]): void {
  const [first] = params
  if (type !== 'log' && isStackTrace(first)) {
    console[type](first.getError(message))
    return
  }
  console[type](message, ...params)
}

let installed: { previous: ThreeConsoleFunction | null } | null = null

/** Cài bộ lọc (gọi nhiều lần cũng chỉ cài một); trả hàm gỡ, khôi phục đúng hàm cũ. */
export function installClockWarningFilter(): () => void {
  if (!installed) {
    // Kiểu của @types/three không ghi `null`, nhưng three trả null khi chưa ai đặt hàm.
    const previous = getConsoleFunction() as ThreeConsoleFunction | null
    installed = { previous }
    setConsoleFunction((type, message, ...params) => {
      if (type === 'warn' && message === CLOCK_DEPRECATION_WARNING) return
      if (previous) {
        previous(type, message, ...params)
        return
      }
      toNativeConsole(type, message, params)
    })
  }
  return () => {
    if (!installed) return
    setConsoleFunction(installed.previous as ThreeConsoleFunction)
    installed = null
  }
}
