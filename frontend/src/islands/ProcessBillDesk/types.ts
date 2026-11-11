// docs/contracts.md §11.2, đúng từng trường. Props id trên trang: `process-bill-props`.
import { propsReader, type RawProps } from '@/lib/props-guard'

export interface ProcessBillDeskProps {
  /** "PM0125" */
  rentalBillCode: string
  /** Gộp theo đầu truyện. */
  rows: BillDeskBookRow[]
  /** ISO yyyy-MM-dd */
  borrowDate: string | null
  /** ISO yyyy-MM-dd */
  dueDate: string | null
  expectedDays: number
  /** đồng */
  discount: number
  note: string | null
  collaterals: BillDeskCollateralRow[]
}

export interface BillDeskBookRow {
  bookId: number
  name: string
  /** Giá chốt của dòng phiếu, đồng/ngày. */
  rentalPrice: number
  copies: BillDeskCopy[]
}

export interface BillDeskCopy {
  /** "DT001-03" */
  barcode: string
  /** Ô "Nhận" đang tích. */
  received: boolean
  /** "Rách bìa, Vết bẩn, viết vẽ" | "Không có lỗi"; null = "(chưa ghi nhận)" */
  conditionText: string | null
}

export interface BillDeskCollateralRow {
  /** STT, từ 1 */
  index: number
  collateralName: string
  value: string
  note: string | null
}

const read = propsReader('ProcessBillDesk', '§11.2')

function parseCopy(raw: unknown, path: string): BillDeskCopy {
  const copy = read.record(raw, path)
  return {
    barcode: read.string(copy.barcode, `${path}.barcode`),
    received: read.boolean(copy.received, `${path}.received`),
    conditionText: read.nullableString(copy.conditionText, `${path}.conditionText`),
  }
}

function parseRow(raw: unknown, path: string): BillDeskBookRow {
  const row = read.record(raw, path)
  const copies = read.array(row.copies, `${path}.copies`).map((copy, i) => parseCopy(copy, `${path}.copies[${i}]`))
  if (copies.length === 0) read.fail(`${path}.copies`, 'must list at least one copy')
  return {
    bookId: read.integer(row.bookId, `${path}.bookId`, 1),
    name: read.string(row.name, `${path}.name`),
    rentalPrice: read.money(row.rentalPrice, `${path}.rentalPrice`),
    copies,
  }
}

function parseCollateral(raw: unknown, path: string): BillDeskCollateralRow {
  const row = read.record(raw, path)
  return {
    index: read.integer(row.index, `${path}.index`, 1),
    collateralName: read.string(row.collateralName, `${path}.collateralName`),
    value: read.string(row.value, `${path}.value`),
    note: read.nullableString(row.note, `${path}.note`),
  }
}

export function parseProcessBillDeskProps(raw: RawProps): ProcessBillDeskProps {
  const rows = read.array(raw.rows, 'rows').map((row, i) => parseRow(row, `rows[${i}]`))
  const barcodes = rows.flatMap((row) => row.copies.map((copy) => copy.barcode))
  if (new Set(barcodes).size !== barcodes.length) read.fail('rows', 'must not repeat a barcode')
  const collaterals = read.array(raw.collaterals, 'collaterals').map((row, i) => parseCollateral(row, `collaterals[${i}]`))
  if (new Set(collaterals.map((row) => row.index)).size !== collaterals.length) {
    read.fail('collaterals', 'must not repeat an index')
  }
  return {
    rentalBillCode: read.string(raw.rentalBillCode, 'rentalBillCode'),
    rows,
    borrowDate: read.nullableIsoDate(raw.borrowDate, 'borrowDate'),
    dueDate: read.nullableIsoDate(raw.dueDate, 'dueDate'),
    expectedDays: read.integer(raw.expectedDays, 'expectedDays', 1),
    discount: read.money(raw.discount, 'discount'),
    note: read.nullableString(raw.note, 'note'),
    collaterals,
  }
}
