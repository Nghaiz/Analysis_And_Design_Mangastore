// "Các khoản đặt cọc:" trên bàn quầy (docs/contracts.md §9.2): STT, Loại tài sản, Giá trị, Ghi chú,
// Thao tác "Xoá". Nút "Xoá" của island bấm nút thật `lnkDeleteRentalCollateral` (value = STT).
import { LedgerTable } from '@/components/nostalgia/LedgerTable'
import { Button } from '@/components/ui/button'
import type { BillDeskCollateralRow } from './types'

export interface DeskCollateralsProps {
  collaterals: readonly BillDeskCollateralRow[]
  onDelete(index: number): void
}

export function DeskCollaterals({ collaterals, onDelete }: DeskCollateralsProps) {
  return (
    <div className="overflow-x-auto">
      <LedgerTable caption="Các khoản đặt cọc:">
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
          {collaterals.map((row) => (
            <tr key={row.index} data-collateral-index={row.index}>
              <td className="font-num text-right">{row.index}</td>
              <td>{row.collateralName}</td>
              <td>{row.value}</td>
              <td className="font-pen">{row.note ?? ''}</td>
              <td>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Xoá khoản cọc ${row.index}`}
                  data-desk-action
                  onClick={() => onDelete(row.index)}
                >
                  Xoá
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </LedgerTable>
    </div>
  )
}
