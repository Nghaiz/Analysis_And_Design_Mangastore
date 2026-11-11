import {
  COVER_DISPLAY_WIDTH,
  COVER_HEIGHT_RATIO,
  coverSrcSet,
  coverUrl,
  DEFAULT_COVERS_BASE,
  type BookCoverSize,
} from '@/lib/covers'

export interface BookCoverProps {
  bookId: number
  /** Book title; also the image alt text. */
  name: string
  size: BookCoverSize
  /** Load immediately (first cover on screen); otherwise lazy. */
  eager?: boolean
  /** Root URL of the covers volume (APP_COVERS_BASE_URL on the server). */
  coversBase?: string
}

/** Bìa truyện (phase-05-ui-contract.md §3, contract.md §6; twin of book-cover.tag). */
export function BookCover({ bookId, name, size, eager = false, coversBase = DEFAULT_COVERS_BASE }: BookCoverProps) {
  if (!Number.isInteger(bookId) || bookId <= 0) {
    throw new Error(`BookCover needs a positive integer bookId, got ${String(bookId)}.`)
  }
  const width = COVER_DISPLAY_WIDTH[size]
  if (width === undefined) throw new Error(`Unknown BookCover size "${String(size)}"; expected sm, md or lg.`)
  return (
    <span className={`tt-book-cover tt-book-cover--${size}`}>
      <img
        src={coverUrl(coversBase, bookId, width)}
        srcSet={coverSrcSet(coversBase, bookId)}
        sizes={`${width}px`}
        width={width}
        height={Math.round(width * COVER_HEIGHT_RATIO)}
        alt={name}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </span>
  )
}
