// Khi nào nâng ảnh tĩnh của kệ lên cảnh 3D (plan.md Deferred #16):
// - giảm chuyển động hoặc tiết kiệm dữ liệu: giữ ảnh tĩnh;
// - con trỏ thô (điện thoại): chỉ khi người dùng chạm, cuộn hoặc bấm phím lần đầu;
// - máy tính: khi trình duyệt rảnh sau khi tải xong trang;
// - lúc nâng, không có WebGL2 (three r187 chỉ chạy WebGL2) hoặc chỉ có WebGL chạy phần mềm: giữ ảnh tĩnh.
// File này không import three; nó nằm trong chunk nhỏ của island, cảnh 3D nạp lười sau khi qua mọi điều kiện.

export type UpgradePlan = 'static' | 'on-interaction' | 'on-idle'

export interface UpgradeEnvironment {
  reducedMotion: boolean
  /** `navigator.connection.saveData`: người dùng xin bớt dữ liệu, coi như máy yếu. */
  saveData: boolean
  /** `(pointer: coarse)`: thiết bị cảm ứng là chính. */
  coarsePointer: boolean
}

/** Kết quả thử WebGL2: `weak` = chỉ có khi chấp nhận "major performance caveat" (render phần mềm). */
export type WebGLProbe = 'ok' | 'weak' | 'none'

export function planUpgrade(env: UpgradeEnvironment): UpgradePlan {
  if (env.reducedMotion || env.saveData) return 'static'
  return env.coarsePointer ? 'on-interaction' : 'on-idle'
}

export function canRender3D(probe: WebGLProbe): boolean {
  return probe === 'ok'
}

interface NetworkInformationLike {
  saveData?: boolean
}

export function readEnvironment(win: Window): UpgradeEnvironment {
  const matches = (query: string): boolean => typeof win.matchMedia === 'function' && win.matchMedia(query).matches
  const connection = (win.navigator as Navigator & { connection?: NetworkInformationLike }).connection
  return {
    reducedMotion: matches('(prefers-reduced-motion: reduce)'),
    saveData: connection?.saveData === true,
    coarsePointer: matches('(pointer: coarse)'),
  }
}

/** Thử tạo ngữ cảnh WebGL2 trên canvas tạm rồi trả ngữ cảnh lại ngay, để không giữ chỗ GPU. */
export function probeWebGL(doc: Document): WebGLProbe {
  const tryContext = (failIfMajorPerformanceCaveat: boolean): WebGL2RenderingContext | null => {
    try {
      return doc.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat })
    } catch {
      // Một số trình duyệt ném thay vì trả null khi GPU bị chặn; cả hai nghĩa là "không có WebGL2".
      return null
    }
  }
  const release = (gl: WebGL2RenderingContext): void => gl.getExtension('WEBGL_lose_context')?.loseContext()

  const fast = tryContext(true)
  if (fast) {
    release(fast)
    return 'ok'
  }
  const slow = tryContext(false)
  if (slow) {
    release(slow)
    return 'weak'
  }
  return 'none'
}

/** Phần của `window` mà lịch nâng cấp cần; tách ra để test không cần trình duyệt. */
export interface UpgradeHost {
  isLoaded(): boolean
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void
  removeEventListener(type: string, listener: () => void, options?: EventListenerOptions): void
  requestIdleCallback?: (callback: () => void, options?: IdleRequestOptions) => number
  cancelIdleCallback?: (handle: number) => void
  setTimeout(callback: () => void, ms: number): number
  clearTimeout(handle: number): void
}

/** Sự kiện được tính là "tương tác đầu tiên" trên máy con trỏ thô. */
export const INTERACTION_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel'] as const
/** Trần chờ của requestIdleCallback: trang bận mãi thì vẫn nâng sau ngần này. */
export const IDLE_TIMEOUT_MS = 4000
/** Trình duyệt không có requestIdleCallback: đợi ngần này sau sự kiện load. */
export const IDLE_FALLBACK_DELAY_MS = 1500

/**
 * Hẹn gọi `start` đúng một lần theo `plan`; trả hàm huỷ (gọi khi island gỡ ra hoặc người dùng
 * bật giảm chuyển động giữa chừng).
 */
export function scheduleUpgrade(plan: Exclude<UpgradePlan, 'static'>, host: UpgradeHost, start: () => void): () => void {
  let done = false
  const cleanups: Array<() => void> = []
  const cancel = (): void => {
    done = true
    for (const cleanup of cleanups.splice(0)) cleanup()
  }
  const fire = (): void => {
    if (done) return
    cancel()
    start()
  }

  if (plan === 'on-interaction') {
    const options: AddEventListenerOptions = { capture: true, passive: true }
    for (const type of INTERACTION_EVENTS) {
      host.addEventListener(type, fire, options)
      cleanups.push(() => host.removeEventListener(type, fire, { capture: true }))
    }
    return cancel
  }

  const whenIdle = (): void => {
    if (done) return
    if (host.requestIdleCallback && host.cancelIdleCallback) {
      const cancelIdle = host.cancelIdleCallback
      const handle = host.requestIdleCallback(fire, { timeout: IDLE_TIMEOUT_MS })
      cleanups.push(() => cancelIdle(handle))
      return
    }
    const handle = host.setTimeout(fire, IDLE_FALLBACK_DELAY_MS)
    cleanups.push(() => host.clearTimeout(handle))
  }

  if (host.isLoaded()) {
    whenIdle()
  } else {
    host.addEventListener('load', whenIdle, { once: true })
    cleanups.push(() => host.removeEventListener('load', whenIdle))
  }
  return cancel
}

export function browserHost(win: Window): UpgradeHost {
  return {
    isLoaded: () => win.document.readyState === 'complete',
    addEventListener: (type, listener, options) => win.addEventListener(type, listener, options),
    removeEventListener: (type, listener, options) => win.removeEventListener(type, listener, options),
    requestIdleCallback:
      typeof win.requestIdleCallback === 'function' ? (cb, options) => win.requestIdleCallback(cb, options) : undefined,
    cancelIdleCallback:
      typeof win.cancelIdleCallback === 'function' ? (handle) => win.cancelIdleCallback(handle) : undefined,
    setTimeout: (cb, ms) => win.setTimeout(cb, ms),
    clearTimeout: (handle) => win.clearTimeout(handle),
  }
}
