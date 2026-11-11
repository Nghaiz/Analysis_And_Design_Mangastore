// Ô "Ngày hẹn trả" và "Giảm giá" của bàn quầy. Người dùng gõ thì số tạm đổi ngay; input thật
// `txtDueDate`, `txtDiscount` chỉ được ghi lúc chốt (rời ô, Enter, hoặc ngay trước khi island gửi
// form), để mỗi phím gõ không phát `change` lên input thật của JSP.
import { useCallback, useRef, useState } from 'react'
import type { FormBridge } from '@/hooks/useFormBridge'
import { isDueDateValid, parseDiscount } from './totals'
import type { ProcessBillDeskProps } from './types'

export const DUE_DATE_FIELD = 'txtDueDate'
export const DISCOUNT_FIELD = 'txtDiscount'

export interface DeskFields {
  dueDate: string
  setDueDate(value: string): void
  discountText: string
  setDiscountText(value: string): void
  /** Ngày hẹn trả đang gõ là ngày đủ và sau ngày mượn. */
  dueDateValid: boolean
  /** Giảm giá đang gõ, null khi không phải số nguyên không âm. */
  discountValue: number | null
  /** Ghi giá trị đang gõ vào input thật; true khi có ô đổi so với lần ghi trước. */
  sync(): boolean
}

/** Giá trị gửi lên `txtDiscount`: số đã bỏ dấu chấm khi hợp lệ, nguyên chữ đã gõ khi không (trang báo lỗi theo C10). */
function discountWire(text: string): string {
  const value = parseDiscount(text)
  return value === null ? text.trim() : String(value)
}

export function useDeskFields(props: ProcessBillDeskProps, bridge: FormBridge): DeskFields {
  const initialDue = props.dueDate ?? ''
  const initialDiscount = String(Math.round(props.discount))
  const [dueDate, setDueDate] = useState(initialDue)
  const [discountText, setDiscountText] = useState(initialDiscount)
  const committed = useRef<Record<string, string>>({ [DUE_DATE_FIELD]: initialDue, [DISCOUNT_FIELD]: initialDiscount })

  const sync = useCallback((): boolean => {
    const pending: Record<string, string> = { [DUE_DATE_FIELD]: dueDate, [DISCOUNT_FIELD]: discountWire(discountText) }
    let changed = false
    for (const [name, value] of Object.entries(pending)) {
      if (committed.current[name] === value) continue
      bridge.setValue(name, value)
      committed.current[name] = value
      changed = true
    }
    return changed
  }, [bridge, dueDate, discountText])

  return {
    dueDate,
    setDueDate,
    discountText,
    setDiscountText,
    dueDateValid: isDueDateValid(props.borrowDate, dueDate),
    discountValue: parseDiscount(discountText),
    sync,
  }
}
