// Nối island với bản HTML của SearchBookView.jsp (cách B, docs/contracts.md §11 "Gắn island").
// Bản HTML (bảng "Truyện đã chọn", ô `chkSelectedBook`, nút `lnkDeleteSelectedBook`,
// `btnCreateRentalBill`) nằm trong phần tử `data-island-fallback="SelectedStack"`, ngoài div
// `data-island`. Khi island gắn: kiểm đủ ô và nút thật cho mọi dòng, rồi ẩn bản HTML bằng
// `hideServerFallback` của `@/lib/server-html` (ô, nút vẫn trong form nên vẫn được gửi); gỡ ra thì
// hiện lại đúng các phần tử đã ẩn. Phần riêng ở đây: tên field và kiểm control từng dòng.
import { useLayoutEffect, type RefObject } from 'react'
import { enclosingForm } from '@/hooks/useFormBridge'
import { hideServerFallback } from '@/lib/server-html'

export const ISLAND = 'SelectedStack'

export const CHECK_FIELD = 'chkSelectedBook'
export const DELETE_BUTTON = 'lnkDeleteSelectedBook'
export const CREATE_BUTTON = 'btnCreateRentalBill'

/** Vế cuối của lỗi đánh dấu dự phòng sai, giữ nguyên câu của phase 6. */
const FALLBACK_MISUSE_REMEDY = 'mark only the server-rendered twin.'

/** <button> không ghi type cũng là nút gửi. */
function submitButton(name: string): string {
  return `button[name="${name}"]:not([type="button"]):not([type="reset"])`
}

function hasControl(form: HTMLFormElement, selector: string): boolean {
  return Array.from(form.elements).some((element) => element.matches(selector))
}

/** Ném lỗi nêu đúng control thiếu: JSP và props lệch nhau thì island không được thay bản HTML. */
export function assertServerControls(form: HTMLFormElement, bookIds: readonly number[]): void {
  const required = [
    submitButton(CREATE_BUTTON),
    ...bookIds.flatMap((id) => [
      `input[type="checkbox"][name="${CHECK_FIELD}"][value="${id}"]`,
      `${submitButton(DELETE_BUTTON)}[value="${id}"]`,
    ]),
  ]
  const missing = required.filter((selector) => !hasControl(form, selector))
  if (missing.length > 0) {
    throw new Error(`[${ISLAND}] The form is missing ${missing.join(', ')}; SearchBookView.jsp must render them (docs/contracts.md §9.2, §11.1).`)
  }
}

/**
 * Layout effect: kiểm và ẩn trước lần vẽ đầu, để không nháy hai bản cùng lúc. Lỗi ném trong effect
 * nên error boundary của loader bắt, đặt `data-island-state="failed"` và trả HTML gốc.
 */
export function useServerFallback(anchorRef: RefObject<HTMLElement | null>, bookIds: readonly number[]): void {
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const form = enclosingForm(anchor)
    assertServerControls(form, bookIds)
    return anchor ? hideServerFallback(form, ISLAND, anchor, FALLBACK_MISUSE_REMEDY) : undefined
  }, [anchorRef, bookIds])
}
