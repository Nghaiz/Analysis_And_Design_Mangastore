// Kiểm props JSON từ JSP (docs/contracts.md §11): sai thì ném lỗi nêu đúng đường dẫn trường, để
// loader báo một lần ra console và giữ nguyên HTML của trang. Dùng chung cho SelectedStack,
// ProcessBillDesk và CollateralDrawer.

export type RawProps = Record<string, unknown>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export interface PropsReader {
  record(value: unknown, path: string): RawProps
  array(value: unknown, path: string): unknown[]
  string(value: unknown, path: string): string
  nullableString(value: unknown, path: string): string | null
  nullableIsoDate(value: unknown, path: string): string | null
  boolean(value: unknown, path: string): boolean
  integer(value: unknown, path: string, min: number): number
  /** Tiền (đồng): số hữu hạn, không âm; float được (C13). */
  money(value: unknown, path: string): number
  /** Lỗi có tiền tố tên island và mục hợp đồng, cho các luật ràng buộc giữa nhiều trường. */
  fail(path: string, rule: string): never
}

export function propsReader(island: string, section: string): PropsReader {
  const fail = (path: string, rule: string): never => {
    throw new Error(`[${island}] props.${path} ${rule} (docs/contracts.md ${section}).`)
  }
  return {
    fail,
    record(value, path) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'must be an object')
      return value as RawProps
    },
    array(value, path) {
      if (!Array.isArray(value)) fail(path, 'must be an array')
      return value as unknown[]
    },
    string(value, path) {
      if (typeof value !== 'string' || value.trim() === '') fail(path, 'must be a non-empty string')
      return value as string
    },
    nullableString(value, path) {
      if (value !== null && typeof value !== 'string') fail(path, 'must be a string or null')
      return value as string | null
    },
    nullableIsoDate(value, path) {
      if (value !== null && (typeof value !== 'string' || !ISO_DATE.test(value))) {
        fail(path, 'must be null or an ISO date yyyy-MM-dd')
      }
      return value as string | null
    },
    boolean(value, path) {
      if (typeof value !== 'boolean') fail(path, 'must be a boolean')
      return value as boolean
    },
    integer(value, path, min) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
        fail(path, `must be an integer >= ${String(min)}`)
      }
      return value as number
    },
    money(value, path) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        fail(path, 'must be a finite number >= 0 (đồng)')
      }
      return value as number
    },
  }
}
