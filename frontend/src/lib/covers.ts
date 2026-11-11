// contract.md §6 and phase-05-ui-contract.md §3: cover URLs `${coversBase}/{bookId}/cover-{w}.webp`.

export type BookCoverSize = 'sm' | 'md' | 'lg'

/** Display width in CSS pixels per size. */
export const COVER_DISPLAY_WIDTH: Readonly<Record<BookCoverSize, number>> = { sm: 160, md: 320, lg: 640 }
/** Widths the pipeline writes for every cover. */
export const COVER_WIDTHS = [160, 320, 640] as const
/** Covers are picked in a 2:3 shape (phase 4), so height = width × 3 / 2. */
export const COVER_HEIGHT_RATIO = 3 / 2
/** Default root of the covers volume when no APP_COVERS_BASE_URL reaches the island. */
export const DEFAULT_COVERS_BASE = '/covers'

export function coverUrl(coversBase: string, bookId: number, width: number): string {
  return `${coversBase.replace(/\/+$/, '')}/${bookId}/cover-${width}.webp`
}

export function coverSrcSet(coversBase: string, bookId: number): string {
  return COVER_WIDTHS.map((w) => `${coverUrl(coversBase, bookId, w)} ${w}w`).join(', ')
}
