import { rentalStatusKey, STAMP_TEXT } from '@/lib/rental-status'

export interface StampProps {
  /** Exactly one of "Chờ nhận" · "Đang cho thuê" · "Đã huỷ" (docs/contracts.md §4). */
  status: string
}

/**
 * Dấu trạng thái (phase-05-ui-contract.md §3). The upper-case text is real DOM text, so the
 * stamp never relies on colour alone. An unknown status throws: the island boundary then keeps
 * the server HTML instead of showing a wrong stamp.
 */
export function Stamp({ status }: StampProps) {
  const key = rentalStatusKey(status)
  return <span className={`tt-stamp tt-stamp--${key}`}>{STAMP_TEXT[key]}</span>
}
