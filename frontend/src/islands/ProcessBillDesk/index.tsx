// Island ProcessBillDesk (docs/contracts.md §11.2), trang ProcessRentalBillView.jsp: bàn quầy gỗ,
// cuốn sổ ghi các quyển, tem tình trạng dán lên dòng, khoản cọc và tổng tạm. Cách B: island chỉ
// đổi input thật (`chkReceived`, `txtDueDate`, `txtDiscount`) rồi `form.requestSubmit()` không
// submitter để trang tự gửi về chính nó; nút trên bàn bấm nút thật của JSP (`lnkAddCondition`,
// `lnkDeleteRentalCollateral`, `btnConfirm`, `btnCancel`). Không gọi mạng.
import { useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import type { IslandProps } from '../../loader/mount-islands'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFormBridge, type SubmitterRef } from '@/hooks/useFormBridge'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BookLedger } from './BookLedger'
import { DeskCollaterals } from './DeskCollaterals'
import { entranceClasses, motionMode, useEntered } from './motion'
import { useServerHtml } from './server-html'
import { computeTotals, rentalDays } from './totals'
import { parseProcessBillDeskProps } from './types'
import { useDeskFields } from './useDeskFields'

const ISLAND = 'ProcessBillDesk'
const DESK_ACTION_SELECTOR = '[data-desk-action]'

/** Rời ô sang một nút/ô của chính island thì nút đó tự chốt và gửi; không gửi hai lần. */
function movesToDeskAction(next: EventTarget | null, root: HTMLElement | null): boolean {
  return next instanceof Element && root !== null && root.contains(next) && next.closest(DESK_ACTION_SELECTOR) !== null
}

export default function ProcessBillDesk(rawProps: IslandProps) {
  const props = useMemo(() => parseProcessBillDeskProps(rawProps), [rawProps])
  const reducedMotion = useReducedMotion()
  const entered = useEntered(reducedMotion)
  const ids = useId()

  const rootRef = useRef<HTMLElement>(null)
  const editListSlot = useRef<HTMLDivElement>(null)
  const addCollateralSlot = useRef<HTMLDivElement>(null)
  const noteSlot = useRef<HTMLDivElement>(null)
  const slots = useMemo(
    () => ({ 'edit-list': editListSlot, 'add-collateral': addCollateralSlot, note: noteSlot }),
    [],
  )
  useServerHtml(rootRef, ISLAND, slots)
  const bridge = useFormBridge(rootRef)
  const fields = useDeskFields(props, bridge)
  const [received, setReceived] = useState<ReadonlySet<string>>(
    () => new Set(props.rows.flatMap((row) => row.copies.filter((copy) => copy.received).map((copy) => copy.barcode))),
  )

  // Ngày hẹn trả sai thì số ngày theo ngày trong session (trang giữ ngày cũ, DUE_DATE_INVALID).
  // Giảm giá sai (chữ, âm, lẻ đồng, lớn hơn tổng các quyển đang tích) thì không trừ: tổng tạm là tổng
  // chưa giảm, ô được đánh dấu, và form vẫn gửi để trang báo DISCOUNT_INVALID (phase-07-edge-cases.md).
  const days = rentalDays(props.borrowDate, fields.dueDateValid ? fields.dueDate : props.dueDate, props.expectedDays)
  const subtotal = computeTotals(props.rows, received, days, 0).subtotal
  const discount = fields.discountValue
  const discountValid = discount !== null && discount <= subtotal
  const totals = computeTotals(props.rows, received, days, discountValid ? discount : 0)

  const submit = (submitter?: SubmitterRef): void => {
    fields.sync()
    bridge.submit(submitter)
  }
  const toggleReceived = (barcode: string, isReceived: boolean): void => {
    const next = new Set(received)
    if (isReceived) next.add(barcode)
    else next.delete(barcode)
    setReceived(next)
    bridge.setChecked('chkReceived', barcode, isReceived)
    submit()
  }
  const commitOnBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (movesToDeskAction(event.relatedTarget, rootRef.current)) return
    if (fields.sync()) bridge.submit()
  }
  // Enter trong ô của island không được kích hoạt nút gửi mặc định của form (nút đầu tiên của JSP).
  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (fields.sync()) bridge.submit()
  }

  return (
    <section
      ref={rootRef}
      aria-label={`Bàn quầy xử lí phiếu ${props.rentalBillCode}`}
      data-motion={motionMode(reducedMotion)}
      className="rounded-paper bg-wood p-2 shadow-paper sm:p-4"
    >
      <div
        data-testid="desk-ledger"
        className={cn(
          'tt-paper tt-worn grid gap-4 rounded-paper p-3 shadow-lift sm:p-5',
          entranceClasses(reducedMotion, entered, 'translate-y-2 opacity-0', 'translate-y-0 opacity-100'),
        )}
      >
        <BookLedger
          rows={props.rows}
          received={received}
          lineTotals={totals.lineTotals}
          reducedMotion={reducedMotion}
          entered={entered}
          onToggleReceived={toggleReceived}
          onAddCondition={(barcode) => submit({ name: 'lnkAddCondition', value: barcode })}
        />
        <div ref={editListSlot} className="empty:hidden" />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="flex items-center gap-2">
            <span>Ngày mượn:</span>
            <span className="font-num" data-testid="borrow-date">
              {props.borrowDate === null ? '' : formatDate(props.borrowDate)}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <label htmlFor={`${ids}-due`}>Ngày hẹn trả:</label>
            <Input
              id={`${ids}-due`}
              type="date"
              className="w-auto font-num"
              value={fields.dueDate}
              aria-invalid={fields.dueDateValid ? undefined : true}
              onChange={(event) => fields.setDueDate(event.currentTarget.value)}
              onBlur={commitOnBlur}
              onKeyDown={commitOnEnter}
            />
          </p>
        </div>

        <DeskCollaterals
          collaterals={props.collaterals}
          onDelete={(index) => submit({ name: 'lnkDeleteRentalCollateral', value: String(index) })}
        />
        <div ref={addCollateralSlot} className="empty:hidden" />

        <p className="flex items-center gap-2">
          <label htmlFor={`${ids}-discount`}>Giảm giá:</label>
          <Input
            id={`${ids}-discount`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="w-40 font-num"
            value={fields.discountText}
            aria-invalid={discountValid ? undefined : true}
            onChange={(event) => fields.setDiscountText(event.currentTarget.value)}
            onBlur={commitOnBlur}
            onKeyDown={commitOnEnter}
          />
        </p>
        <div ref={noteSlot} className="empty:hidden" />

        <dl aria-live="polite" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-type">
          <dt>Tổng số quyển thuê:</dt>
          <dd className="font-num" data-testid="total-copies">{totals.copies}</dd>
          <dt>Tổng tiền thuê:</dt>
          <dd className="font-num font-bold" data-testid="total-amount">{formatMoney(totals.amount)}</dd>
        </dl>

        <div className="flex flex-wrap gap-3">
          <Button type="button" data-desk-action onClick={() => submit({ name: 'btnConfirm' })}>
            Xác nhận và in phiếu mượn
          </Button>
          <Button type="button" variant="destructive" data-desk-action onClick={() => submit({ name: 'btnCancel' })}>
            Huỷ phiếu mượn
          </Button>
        </div>
      </div>
    </section>
  )
}
