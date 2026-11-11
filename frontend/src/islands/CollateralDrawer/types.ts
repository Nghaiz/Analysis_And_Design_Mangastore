// docs/contracts.md §11.3, đúng từng trường. Props id trên trang: `collateral-drawer-props`.
import { propsReader, type RawProps } from '../ProcessBillDesk/props-guard'

export interface CollateralDrawerProps {
  /** Thứ tự = listRentalCollateral. */
  rows: CollateralDrawerRow[]
}

export interface CollateralDrawerRow {
  /** STT, từ 1 */
  index: number
  collateralId: number
  collateralName: string
  collateralDescription: string | null
  /** null khi chưa nhập */
  value: string | null
  note: string | null
}

const read = propsReader('CollateralDrawer', '§11.3')

function parseRow(raw: unknown, position: number): CollateralDrawerRow {
  const path = `rows[${position}]`
  const row = read.record(raw, path)
  const index = read.integer(row.index, `${path}.index`, 1)
  // Ô thật `txtCollateralValue`/`txtCollateralNote` đi theo thứ tự dòng (C1): STT phải là 1, 2, 3…
  if (index !== position + 1) read.fail(`${path}.index`, `must be ${String(position + 1)} (rows are in STT order)`)
  return {
    index,
    collateralId: read.integer(row.collateralId, `${path}.collateralId`, 1),
    collateralName: read.string(row.collateralName, `${path}.collateralName`),
    collateralDescription: read.nullableString(row.collateralDescription, `${path}.collateralDescription`),
    value: read.nullableString(row.value, `${path}.value`),
    note: read.nullableString(row.note, `${path}.note`),
  }
}

export function parseCollateralDrawerProps(raw: RawProps): CollateralDrawerProps {
  return { rows: read.array(raw.rows, 'rows').map(parseRow) }
}
