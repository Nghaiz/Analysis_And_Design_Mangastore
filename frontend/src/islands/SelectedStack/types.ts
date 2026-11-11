// Props của island SelectedStack, đúng từng trường của docs/contracts.md §11.1. Props id trên trang
// SearchBookView.jsp: `selected-stack-props`. Sai thì ném lỗi nêu đúng đường dẫn trường (qua
// `@/lib/props-guard`), để loader báo một lần ra console và giữ nguyên bản HTML của JSP.
import { propsReader, type RawProps } from '@/lib/props-guard'

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

const read = propsReader('SelectedStack', '§11.1')

function parseRow(value: unknown, path: string): SelectedStackRow {
  const raw = read.record(value, path)
  // Tác giả có thể rỗng (island bỏ vế " · tác giả"), nên không dùng `read.string` (đòi chuỗi không rỗng).
  if (typeof raw.author !== 'string') read.fail(`${path}.author`, 'must be a string')
  const author = raw.author as string
  const checked = read.boolean(raw.checked, `${path}.checked`)
  return {
    bookId: read.integer(raw.bookId, `${path}.bookId`, 1),
    bookCode: read.string(raw.bookCode, `${path}.bookCode`),
    name: read.string(raw.name, `${path}.name`),
    author,
    quantity: read.integer(raw.quantity, `${path}.quantity`, 1),
    checked,
  }
}

export function parseSelectedStackProps(raw: RawProps): SelectedStackProps {
  const rows = read.array(raw.rows, 'rows').map((row, index) => parseRow(row, `rows[${index}]`))
  const seen = new Set<number>()
  rows.forEach((row, index) => {
    if (seen.has(row.bookId)) read.fail(`rows[${index}].bookId`, `repeats ${row.bookId}; rows must be grouped by title`)
    seen.add(row.bookId)
  })
  const focusBookId = raw.focusBookId === null ? null : read.integer(raw.focusBookId, 'focusBookId', 1)
  return { rows, focusBookId }
}
