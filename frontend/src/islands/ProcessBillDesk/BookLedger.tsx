// Cuốn sổ trên bàn quầy: bảng quyển gộp theo đầu truyện, mỗi quyển một dòng con có mã vạch, tem
// tình trạng dán lên dòng, ô "Nhận" và nút "Thêm tình trạng" (docs/contracts.md §9.2, §11.2).
// Không có `name` nào ở đây: ô và nút của island chỉ điều khiển input thật của JSP qua index.tsx.
import { ConditionTag } from '@/components/nostalgia/ConditionTag'
import { LedgerTable } from '@/components/nostalgia/LedgerTable'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { entranceClasses } from '@/lib/motion'
import type { BillDeskBookRow } from './types'

export interface BookLedgerProps {
  rows: readonly BillDeskBookRow[]
  received: ReadonlySet<string>
  lineTotals: readonly number[]
  reducedMotion: boolean
  entered: boolean
  onToggleReceived(barcode: string, received: boolean): void
  onAddCondition(barcode: string): void
}

const NUMBER_CELL = 'font-num text-right whitespace-nowrap'

export function BookLedger(props: BookLedgerProps) {
  const { rows, received, lineTotals, reducedMotion, entered } = props
  const tagClass = entranceClasses(reducedMotion, entered, 'scale-110 opacity-0', '-rotate-1 scale-100 opacity-100')
  return (
    <div className="overflow-x-auto">
      <LedgerTable caption="Danh sách các quyển truyện khách hàng muốn thuê:">
        <thead>
          <tr>
            <th scope="col">Mã vạch</th>
            <th scope="col">Tên đầu truyện</th>
            <th scope="col" className="text-right">Giá thuê theo ngày</th>
            <th scope="col" className="text-right">Số lượng</th>
            <th scope="col">Tình trạng khi giao</th>
            <th scope="col" className="text-right">Tổng tiền</th>
            <th scope="col">Nhận</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) =>
            row.copies.map((copy, copyIndex) => {
              const isReceived = received.has(copy.barcode)
              const span = row.copies.length
              return (
                <tr
                  key={copy.barcode}
                  data-barcode={copy.barcode}
                  data-received={isReceived}
                  className={cn(!isReceived && 'bg-paper-deep')}
                >
                  <td className="font-num whitespace-nowrap">{copy.barcode}</td>
                  {copyIndex === 0 && (
                    <>
                      <td rowSpan={span}>{row.name}</td>
                      <td rowSpan={span} className={NUMBER_CELL}>{formatMoney(row.rentalPrice)}</td>
                      <td rowSpan={span} className={NUMBER_CELL}>{span}</td>
                    </>
                  )}
                  <td>
                    <span className={cn('inline-block origin-left', tagClass)} data-testid="stuck-tag">
                      <ConditionTag text={copy.conditionText} />
                    </span>
                  </td>
                  {copyIndex === 0 && (
                    <td rowSpan={span} className={NUMBER_CELL} data-testid={`line-total-${row.bookId}`}>
                      {formatMoney(lineTotals[rowIndex] ?? 0)}
                    </td>
                  )}
                  <td className="text-center">
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={isReceived}
                      aria-label={`Nhận ${copy.barcode}`}
                      data-desk-action
                      onChange={(event) => props.onToggleReceived(copy.barcode, event.currentTarget.checked)}
                    />
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Thêm tình trạng ${copy.barcode}`}
                      data-desk-action
                      onClick={() => props.onAddCondition(copy.barcode)}
                    >
                      Thêm tình trạng
                    </Button>
                  </td>
                </tr>
              )
            }),
          )}
        </tbody>
      </LedgerTable>
    </div>
  )
}
