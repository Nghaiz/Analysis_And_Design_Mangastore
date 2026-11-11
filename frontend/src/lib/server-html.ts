// Nối island với bản HTML của JSP (cách B, docs/contracts.md §11). Bản HTML luôn nằm trong form
// và chạy được khi tắt JS; khi island đã gắn:
// - phần HTML đánh dấu `data-island-fallback="<Tên island>"` được ẩn bằng thuộc tính `hidden`
//   (input ẩn vẫn nằm trong form nên vẫn được gửi), trả lại khi island gỡ ra;
// - phần tử JSP đánh dấu `data-island-slot="<Tên island>:<chỗ>"` (nút điều hướng, ô island không
//   đụng tới) được chuyển vào đúng chỗ trong island để giữ thứ tự thành phần của §9, rồi trả về
//   chỗ cũ khi island gỡ ra (loader gỡ island khi nó hỏng: HTML gốc về nguyên vẹn).
// Dùng chung cho ProcessBillDesk và CollateralDrawer (frontend/src/lib/).
import { useLayoutEffect, type RefObject } from 'react'
import { enclosingForm } from '@/hooks/useFormBridge'

export const FALLBACK_ATTRIBUTE = 'data-island-fallback'
export const SLOT_ATTRIBUTE = 'data-island-slot'

type Undo = () => void

/** Ẩn bản HTML dự phòng của `island` trong `form`; trả hàm hiện lại đúng các phần tử đã ẩn. */
export function hideServerFallback(form: HTMLFormElement, island: string, anchor: Element): Undo {
  const targets = Array.from(form.querySelectorAll<HTMLElement>(`[${FALLBACK_ATTRIBUTE}="${island}"]`))
  for (const target of targets) {
    if (target.contains(anchor)) {
      throw new Error(
        `[${island}] An element marked ${FALLBACK_ATTRIBUTE}="${island}" contains the island itself; ` +
          'mark only the server-rendered twin, never the mount point.',
      )
    }
  }
  const hidden = targets.filter((target) => !target.hidden)
  for (const target of hidden) target.hidden = true
  return () => {
    for (const target of hidden) target.hidden = false
  }
}

/** Chuyển phần tử JSP của chỗ `slot` vào `host`; JSP không có chỗ đó thì không làm gì. */
export function adoptServerNode(form: HTMLFormElement, island: string, slot: string, host: HTMLElement): Undo {
  const node = form.querySelector<HTMLElement>(`[${SLOT_ATTRIBUTE}="${island}:${slot}"]`)
  if (!node) return () => {}
  const marker = node.ownerDocument.createComment(`${island}:${slot}`)
  node.replaceWith(marker)
  host.appendChild(node)
  return () => marker.replaceWith(node)
}

/**
 * `slots` phải ổn định giữa các lần render (tạo bằng useMemo/useRef). Lỗi (island không nằm
 * trong form, đánh dấu sai) ném trong effect nên error boundary của loader bắt và trả HTML gốc.
 */
export function useServerHtml(
  anchorRef: RefObject<HTMLElement | null>,
  island: string,
  slots: Readonly<Record<string, RefObject<HTMLElement | null>>>,
): void {
  // Layout effect: ẩn bản HTML và chuyển nút trước lần vẽ đầu, để không nháy hai bản cùng lúc.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const form = enclosingForm(anchor)
    const undo: Undo[] = []
    for (const [slot, ref] of Object.entries(slots)) {
      if (ref.current) undo.push(adoptServerNode(form, island, slot, ref.current))
    }
    if (anchor) undo.push(hideServerFallback(form, island, anchor))
    return () => {
      for (const step of undo.reverse()) step()
    }
  }, [anchorRef, island, slots])
}
