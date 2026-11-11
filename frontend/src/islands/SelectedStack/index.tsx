// Island SelectedStack (docs/contracts.md §11.1), khung "Truyện đã chọn" của SearchBookView.jsp:
// chồng truyện buộc dây, mỗi gáy là một đầu truyện đã gộp (tên, số lượng), ô "Chọn", nút "Xoá".
// Cách B: island chỉ đổi ô thật `chkSelectedBook` (value = bookId) của bản HTML rồi
// `form.requestSubmit(submitter)` với nút thật `lnkDeleteSelectedBook` (value = bookId) hoặc
// `btnCreateRentalBill`. Không gọi mạng, không render control có `name`.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { IslandProps } from '../../loader/mount-islands'
import { Button } from '@/components/ui/button'
import { useFormBridge } from '@/hooks/useFormBridge'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { motionMode, useEntered } from '@/lib/motion'
import { spineClasses } from './motion'
import { CHECK_FIELD, CREATE_BUTTON, DELETE_BUTTON, useServerFallback } from './server-html'
import { parseSelectedStackProps, type SelectedStackRow } from './types'

/** Gáy truyện xen màu giấy để chồng trông như nhiều quyển khác nhau. */
const SPINE_TONES = ['bg-paper-deep', 'bg-tape', 'bg-paper'] as const
const CELL = 'border-y border-ink-soft/40 px-2 py-2 align-middle'

/** Ô đang giữ focus là chỗ người dùng (hay hộp thông báo) đã chọn; island không giành lấy. */
function focusIsFree(doc: Document): boolean {
  const active = doc.activeElement
  return active === null || active === doc.body || active === doc.documentElement
}

export default function SelectedStack(rawProps: IslandProps) {
  const props = useMemo(() => parseSelectedStackProps(rawProps), [rawProps])
  const bookIds = useMemo(() => props.rows.map((row) => row.bookId), [props.rows])
  const reducedMotion = useReducedMotion()
  const mode = motionMode(reducedMotion)
  const entered = useEntered(reducedMotion)

  const rootRef = useRef<HTMLDivElement>(null)
  useServerFallback(rootRef, bookIds)
  const bridge = useFormBridge(rootRef)
  const [checked, setChecked] = useState<ReadonlySet<number>>(
    () => new Set(props.rows.filter((row) => row.checked).map((row) => row.bookId)),
  )
  const [leaving, setLeaving] = useState<number | null>(null)

  // Ô thật luôn khớp cái người dùng thấy: props thắng trạng thái trình duyệt tự khôi phục cho form.
  useLayoutEffect(() => {
    for (const row of props.rows) bridge.setChecked(CHECK_FIELD, String(row.bookId), row.checked)
  }, [bridge, props.rows])

  // Sau khi trang tải lại (thêm từ BookDetailView, xoá), focus về dòng của đầu truyện vừa thao tác.
  useEffect(() => {
    const root = rootRef.current
    if (props.focusBookId === null || !root || !focusIsFree(root.ownerDocument)) return
    root.querySelector<HTMLInputElement>(`input[data-book-id="${props.focusBookId}"]`)?.focus()
  }, [props.focusBookId])

  const toggle = (bookId: number, isChecked: boolean): void => {
    const next = new Set(checked)
    if (isChecked) next.add(bookId)
    else next.delete(bookId)
    setChecked(next)
    bridge.setChecked(CHECK_FIELD, String(bookId), isChecked)
  }
  const remove = (bookId: number): void => {
    setLeaving(bookId)
    bridge.submit({ name: DELETE_BUTTON, value: String(bookId) })
  }

  return (
    <div ref={rootRef} data-motion={mode} className="grid gap-4">
      <div className="relative overflow-x-auto">
        <table data-testid="selected-stack" className="w-full border-separate border-spacing-y-1 text-ink">
          <caption className="sr-only">Truyện đã chọn</caption>
          <thead className="font-type text-sm text-ink-soft">
            <tr>
              <th scope="col" className="w-12 px-2 py-1 text-left font-normal">Chọn</th>
              <th scope="col" className="px-2 py-1 text-left font-normal">Tên đầu truyện</th>
              <th scope="col" className="w-20 px-2 py-1 text-right font-normal">Số lượng</th>
              <th scope="col" className="w-24 px-2 py-1 text-left font-normal">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, index) => (
              <SpineRow
                key={row.bookId}
                row={row}
                tone={SPINE_TONES[index % SPINE_TONES.length] ?? SPINE_TONES[0]}
                motionClasses={spineClasses(mode, {
                  index,
                  checked: checked.has(row.bookId),
                  leaving: leaving === row.bookId,
                  entered,
                })}
                checked={checked.has(row.bookId)}
                onToggle={toggle}
                onRemove={remove}
              />
            ))}
          </tbody>
        </table>
        {props.rows.length > 0 ? <Twine /> : null}
      </div>
      <div className="flex justify-center">
        <Button type="button" size="lg" className="font-type" onClick={() => bridge.submit({ name: CREATE_BUTTON })}>
          Tạo phiếu mượn
        </Button>
      </div>
    </div>
  )
}

interface SpineRowProps {
  row: SelectedStackRow
  tone: string
  motionClasses: string
  checked: boolean
  onToggle(bookId: number, checked: boolean): void
  onRemove(bookId: number): void
}

function SpineRow({ row, tone, motionClasses, checked, onToggle, onRemove }: SpineRowProps) {
  return (
    <tr data-book-id={row.bookId} className={motionClasses}>
      <td className={`${CELL} ${tone} rounded-l-paper border-l-4 border-l-wood`}>
        <input
          type="checkbox"
          data-book-id={row.bookId}
          aria-label={`Chọn ${row.name}`}
          checked={checked}
          onChange={(event) => onToggle(row.bookId, event.currentTarget.checked)}
          className="size-5 accent-pen-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue"
        />
      </td>
      <td className={`${CELL} ${tone} pl-4`}>
        <span className="block break-words">{row.name}</span>
        <span className="block text-sm text-ink-soft">
          <span className="font-num">{row.bookCode}</span>
          {row.author === '' ? null : ` · ${row.author}`}
        </span>
      </td>
      <td className={`${CELL} ${tone} text-right font-num`} data-testid={`quantity-${row.bookId}`}>
        {row.quantity}
      </td>
      <td className={`${CELL} ${tone} rounded-r-paper border-r`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-type"
          aria-label={`Xoá ${row.name} khỏi truyện đã chọn`}
          onClick={() => onRemove(row.bookId)}
        >
          Xoá
        </Button>
      </td>
    </tr>
  )
}

/** Sợi dây buộc chồng truyện: chạy dọc giữa cột "Chọn" và tên, nút thắt ở trên cùng. Chỉ trang trí. */
function Twine() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute top-8 bottom-0 left-12 w-0.5 bg-wood/70" />
      <span aria-hidden="true" className="pointer-events-none absolute top-6 left-10 size-4 rotate-45 border-2 border-wood" />
    </>
  )
}
