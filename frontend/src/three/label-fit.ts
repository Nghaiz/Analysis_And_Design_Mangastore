// Chọn cỡ chữ và cách ngắt dòng cho nhãn thể loại trên gáy: hàm thuần, đo chữ qua tham số `measure`
// để test không cần canvas. Chữ trên gáy chạy dọc, nên "dài" là theo chiều cao gáy, "dày" theo chiều rộng.

export interface LabelBox {
  /** Chiều dài tối đa của một dòng chữ (theo chiều cao nhãn giấy), px của texture. */
  length: number
  /** Chiều dày nhãn giấy dành cho các dòng chữ xếp cạnh nhau, px của texture. */
  thickness: number
  minSize: number
  maxSize: number
}

export interface LabelFit {
  size: number
  lines: string[]
}

/** Khoảng cách giữa hai dòng, tính theo cỡ chữ. */
export const LINE_PITCH = 1.12

/** Cách ngắt hai dòng tại dấu cách gần giữa nhất; nhãn một từ thì không ngắt. */
export function splitInTwo(label: string): [string, string] | null {
  const words = label.split(' ').filter((word) => word !== '')
  if (words.length < 2) return null
  let best: [string, string] | null = null
  let bestGap = Infinity
  for (let cut = 1; cut < words.length; cut++) {
    const first = words.slice(0, cut).join(' ')
    const second = words.slice(cut).join(' ')
    const gap = Math.abs(first.length - second.length)
    if (gap < bestGap) {
      bestGap = gap
      best = [first, second]
    }
  }
  return best
}

/**
 * Cỡ chữ lớn nhất (bước 1px) mà nhãn vừa hộp, xét cả một dòng và hai dòng; hai dòng chỉ thắng khi cho
 * chữ to hơn hẳn. Không cách nào vừa ở `minSize` thì trả `minSize` (canvas tự ép chiều dài bằng `maxWidth`).
 */
export function fitLabel(label: string, box: LabelBox, measure: (text: string, size: number) => number): LabelFit {
  const largest = (lines: string[]): number | null => {
    const stackLimit = Math.floor(box.thickness / (lines.length === 1 ? 1 : 1 + LINE_PITCH))
    for (let size = Math.min(box.maxSize, stackLimit); size >= box.minSize; size--) {
      if (lines.every((line) => measure(line, size) <= box.length)) return size
    }
    return null
  }
  const pair = splitInTwo(label)
  const single = largest([label])
  const double = pair ? largest(pair) : null
  if (pair && double !== null && (single === null || double > single)) return { size: double, lines: pair }
  if (single !== null) return { size: single, lines: [label] }
  return { size: box.minSize, lines: pair ?? [label] }
}
