// Island CollateralDrawer (docs/contracts.md §11.3), trang AddRentalCollateralView.jsp: ngăn kéo đồ
// cọc kéo ra từ quầy, mỗi khoản một dòng có ô giá trị, ô ghi chú và nút "Xoá". Cách B: island chỉ
// ghi vào input thật `txtCollateralValue`/`txtCollateralNote` (dòng thứ i ↔ ô thứ i, C1) và bấm nút
// thật `lnkDeleteRentalCollateral` (value = STT) hoặc `btnSave`. Phần tìm loại tài sản là của JSP.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { IslandProps } from '../../loader/mount-islands'
import { LedgerTable } from '@/components/nostalgia/LedgerTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFormBridge, type SubmitterRef } from '@/hooks/useFormBridge'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { entranceClasses, motionMode, useEntered } from '@/lib/motion'
import { useServerHtml } from '@/lib/server-html'
import { parseCollateralDrawerProps } from './types'

const ISLAND = 'CollateralDrawer'
const FIELDS = { value: 'txtCollateralValue', note: 'txtCollateralNote' } as const

type Field = keyof typeof FIELDS
type Entry = Record<Field, string>

/** maxlength giống bản HTML của JSP (phase-07-edge-cases.md): giá trị 100, ghi chú 255. */
const MAX_LENGTH: Record<Field, number> = { value: 100, note: 255 }
const FIELD_LABEL: Record<Field, string> = { value: 'Giá trị', note: 'Ghi chú' }
const FIELD_CLASS: Record<Field, string> = { value: 'min-w-32', note: 'min-w-40 font-pen' }

/** Giá trị toàn dấu cách chưa tính là đã nhập (trang báo COLLATERAL_VALUE_REQUIRED khi "Lưu"). */
function isEntered(text: string): boolean {
  return text.trim() !== ''
}

/**
 * Chữ trang gửi lại đã dài quá giới hạn (trang giữ chữ và báo INPUT_TOO_LONG) thì bỏ maxlength của
 * ô island: ô người dùng đã sửa mà vẫn quá dài là `tooLong`, và `requestSubmit` sẽ chặn cả form.
 * Island không chặn gửi form; trang tự kiểm.
 */
function maxLengthFor(field: Field, text: string): number | undefined {
  const limit = MAX_LENGTH[field]
  return text.length > limit ? undefined : limit
}

export default function CollateralDrawer(rawProps: IslandProps) {
  const props = useMemo(() => parseCollateralDrawerProps(rawProps), [rawProps])
  const reducedMotion = useReducedMotion()
  const entered = useEntered(reducedMotion)

  const rootRef = useRef<HTMLElement>(null)
  const backSlot = useRef<HTMLDivElement>(null)
  const slots = useMemo(() => ({ back: backSlot }), [])
  useServerHtml(rootRef, ISLAND, slots)
  const bridge = useFormBridge(rootRef)

  const initial = useMemo<Entry[]>(
    () => props.rows.map((row) => ({ value: row.value ?? '', note: row.note ?? '' })),
    [props.rows],
  )
  const [entries, setEntries] = useState<Entry[]>(initial)
  const committed = useRef<Entry[]>(initial.map((entry) => ({ ...entry })))
  const [removing, setRemoving] = useState<number | null>(null)

  const edit = (position: number, field: Field, text: string): void =>
    setEntries((current) => current.map((entry, i) => (i === position ? { ...entry, [field]: text } : entry)))

  /** Ghi các ô đang gõ vào ô thật cùng thứ tự; chỉ ghi ô đã đổi. */
  const sync = (): void => {
    entries.forEach((entry, position) => {
      const saved = committed.current[position]
      if (!saved) return
      for (const field of Object.keys(FIELDS) as Field[]) {
        if (saved[field] === entry[field]) continue
        bridge.setValue(FIELDS[field], entry[field], position)
        saved[field] = entry[field]
      }
    })
  }
  const submit = (submitter: SubmitterRef): void => {
    sync()
    bridge.submit(submitter)
  }
  // Rời ô thì ghi ngay: nút của JSP ("Tìm", chọn loại tài sản, "Quay lại") gửi form mà không qua island,
  // và trang đọc lại các ô này ở mọi lần gửi về (C1).
  const syncOnBlur = (): void => sync()
  // Enter trong ô của island không được kích hoạt nút gửi mặc định của form (nút "Tìm" của JSP).
  const syncOnEnter = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    sync()
  }
  const remove = (index: number): void => {
    setRemoving(index)
    submit({ name: 'lnkDeleteRentalCollateral', value: String(index) })
  }

  return (
    <section
      ref={rootRef}
      aria-label="Ngăn kéo đồ cọc"
      data-motion={motionMode(reducedMotion)}
      className="rounded-paper bg-wood p-2 shadow-paper sm:p-4"
    >
      <div aria-hidden="true" className="mx-auto mb-2 h-2 w-16 rounded-paper bg-ink-soft" />
      <div
        data-testid="drawer-tray"
        className={cn(
          'tt-paper tt-worn grid gap-4 rounded-paper p-3 shadow-lift sm:p-5',
          entranceClasses(reducedMotion, entered, '-translate-y-3 opacity-0', 'translate-y-0 opacity-100'),
        )}
      >
        <div className="overflow-x-auto">
          <LedgerTable caption="Các khoản cọc">
            <thead>
              <tr>
                <th scope="col" className="text-right">STT</th>
                <th scope="col">Loại tài sản</th>
                <th scope="col">Giá trị</th>
                <th scope="col">Ghi chú</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row, position) => (
                <tr
                  key={row.index}
                  data-collateral-index={row.index}
                  data-removing={removing === row.index}
                  className={cn(removing === row.index && 'bg-paper-deep line-through')}
                >
                  <td className="font-num text-right">{row.index}</td>
                  <td>
                    <span className="block">{row.collateralName}</span>
                    {row.collateralDescription && (
                      <span className="block text-sm text-ink-soft">{row.collateralDescription}</span>
                    )}
                  </td>
                  {(Object.keys(FIELDS) as Field[]).map((field) => {
                    const text = entries[position]?.[field] ?? ''
                    const missing = field === 'value' && !isEntered(text)
                    return (
                      <td key={field}>
                        <Input
                          type="text"
                          autoComplete="off"
                          className={cn(FIELD_CLASS[field], missing && 'border-dashed')}
                          aria-label={`${FIELD_LABEL[field]} khoản cọc ${row.index}`}
                          data-entered={field === 'value' ? !missing : undefined}
                          maxLength={maxLengthFor(field, text)}
                          value={text}
                          onChange={(event) => edit(position, field, event.currentTarget.value)}
                          onBlur={syncOnBlur}
                          onKeyDown={syncOnEnter}
                        />
                      </td>
                    )
                  })}
                  <td>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Xoá khoản cọc ${row.index}`}
                      onClick={() => remove(row.index)}
                    >
                      Xoá
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => submit({ name: 'btnSave' })}>
            Lưu
          </Button>
          <div ref={backSlot} className="empty:hidden" />
        </div>
      </div>
    </section>
  )
}
