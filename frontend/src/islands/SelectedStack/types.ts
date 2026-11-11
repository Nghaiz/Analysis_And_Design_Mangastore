// Props của island SelectedStack, đúng từng trường của docs/contracts.md §11.1. Props id trên trang
// SearchBookView.jsp: `selected-stack-props`. Sai thì ném lỗi nêu đúng đường dẫn trường, để loader
// báo một lần ra console và giữ nguyên bản HTML của JSP.

export interface SelectedStackRow {
  bookId: number
  /** "DT001" (D8, JSP định dạng sẵn bằng Codes.bookCode). */
  bookCode: string
  name: string
  author: string
  /** Số dòng giỏ của đầu truyện này. */
  quantity: number
  /** Ô "Chọn" đang tích. */
  checked: boolean
}

export interface SelectedStackProps {
  /** Gộp theo đầu truyện, thứ tự như trong cart. */
  rows: SelectedStackRow[]
  /** Đầu truyện vừa thao tác, để đặt lại focus; không có thì null. */
  focusBookId: number | null
}

const SECTION = '§11.1'

function fail(path: string, rule: string): never {
  throw new Error(`[SelectedStack] props.${path} ${rule} (docs/contracts.md ${SECTION}).`)
}

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) fail(path, 'must be an integer >= 1')
  return value
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(path, 'must be a non-empty string')
  return value
}

function parseRow(value: unknown, path: string): SelectedStackRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'must be an object')
  const raw = value as Record<string, unknown>
  if (typeof raw.author !== 'string') fail(`${path}.author`, 'must be a string')
  if (typeof raw.checked !== 'boolean') fail(`${path}.checked`, 'must be a boolean')
  return {
    bookId: positiveInteger(raw.bookId, `${path}.bookId`),
    bookCode: nonEmptyString(raw.bookCode, `${path}.bookCode`),
    name: nonEmptyString(raw.name, `${path}.name`),
    author: raw.author,
    quantity: positiveInteger(raw.quantity, `${path}.quantity`),
    checked: raw.checked,
  }
}

export function parseSelectedStackProps(raw: Record<string, unknown>): SelectedStackProps {
  if (!Array.isArray(raw.rows)) fail('rows', 'must be an array')
  const rows = raw.rows.map((row, index) => parseRow(row, `rows[${index}]`))
  const seen = new Set<number>()
  rows.forEach((row, index) => {
    if (seen.has(row.bookId)) fail(`rows[${index}].bookId`, `repeats ${row.bookId}; rows must be grouped by title`)
    seen.add(row.bookId)
  })
  const focusBookId = raw.focusBookId === null ? null : positiveInteger(raw.focusBookId, 'focusBookId')
  return { rows, focusBookId }
}
