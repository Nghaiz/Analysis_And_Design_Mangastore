// docs/contracts.md §11.4, đúng từng trường. Props id trên trang: `shelf-scene-props`.
export interface ShelfSceneProps {
  /** "LoginView.jsp"; bấm gáy truyện = bấm lnkLogin (D10). */
  loginHref: string
  /** Ảnh tĩnh của kệ, hiện trước và làm bản dự phòng. */
  posterSrc: string
  /** null khi ảnh tĩnh chỉ có một cỡ. */
  posterSrcSet: string | null
  posterAlt: string
  /** Nhãn thể loại đánh máy trên gáy, từ pipeline/config/categories.json. */
  categories: string[]
}

/** id của link thật mà bấm gáy truyện phải bấm theo (D10, docs/contracts.md §9.2 HomeView). */
export const LOGIN_LINK_ID = 'lnkLogin'

function requireString(raw: Record<string, unknown>, key: string): string {
  const value = raw[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[ShelfScene] props.${key} must be a non-empty string (docs/contracts.md §11.4).`)
  }
  return value
}

/** Kiểm props JSON từ JSP; sai thì ném lỗi nêu đúng trường để loader báo ra console. */
export function parseShelfSceneProps(raw: Record<string, unknown>): ShelfSceneProps {
  const srcSet = raw.posterSrcSet
  if (srcSet !== null && (typeof srcSet !== 'string' || srcSet.trim() === '')) {
    throw new Error('[ShelfScene] props.posterSrcSet must be null or a non-empty srcset string (docs/contracts.md §11.4).')
  }
  const categories = raw.categories
  if (
    !Array.isArray(categories) ||
    categories.length === 0 ||
    !categories.every((c): c is string => typeof c === 'string' && c.trim() !== '')
  ) {
    throw new Error('[ShelfScene] props.categories must be a non-empty array of non-empty strings (docs/contracts.md §11.4).')
  }
  return {
    loginHref: requireString(raw, 'loginHref'),
    posterSrc: requireString(raw, 'posterSrc'),
    posterSrcSet: srcSet,
    posterAlt: requireString(raw, 'posterAlt'),
    categories,
  }
}
