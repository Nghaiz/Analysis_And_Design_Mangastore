import type { ShelfSceneProps } from './types'

/** Cỡ gốc của ảnh tĩnh (frontend/public/img/shelf/), tỉ lệ 3:2 giống khung cảnh 3D; ảnh khung hẹp cùng cỡ. */
export const POSTER_WIDTH = 1200
export const POSTER_HEIGHT = 800

/**
 * Viewport hẹp hơn ngần này thì trình duyệt lấy ảnh khung hẹp (docs/contracts.md §11.4). Cảnh 3D chuyển sang khung
 * hẹp khi kệ hẹp hơn COMPACT_MAX_WIDTH_PX = 560 px; HomeView chừa đúng 40 px lề ngang quanh kệ nên hai ngưỡng gặp
 * nhau ở viewport 600 px. Bản JSP (src/main/webapp/HomeView.jsp) in đúng chuỗi này.
 */
export const POSTER_NARROW_MEDIA = '(max-width: 599.98px)'

type PosterProps = Pick<ShelfSceneProps, 'loginHref' | 'posterSrc' | 'posterSrcSet' | 'posterNarrowSrc' | 'posterAlt'> & {
  /** Cảnh 3D đã phủ lên: link ảnh tĩnh ra khỏi thứ tự Tab và cây truy cập. */
  covered: boolean
}

/**
 * Ảnh tĩnh của kệ, bọc trong link thật tới trang đăng nhập. Cây thẻ giống hệt bản JSP trong
 * src/main/webapp/HomeView.jsp, để lúc island gắn vào ảnh không nháy và bố cục không xê dịch.
 */
export function Poster({ loginHref, posterSrc, posterSrcSet, posterNarrowSrc, posterAlt, covered }: PosterProps) {
  return (
    <a href={loginHref} className="block" inert={covered}>
      <picture className="block">
        {posterNarrowSrc !== null && <source media={POSTER_NARROW_MEDIA} srcSet={posterNarrowSrc} />}
        <img
          src={posterSrc}
          srcSet={posterSrcSet ?? undefined}
          sizes={posterSrcSet === null ? undefined : '(min-width: 64rem) 60rem, 100vw'}
          alt={posterAlt}
          width={POSTER_WIDTH}
          height={POSTER_HEIGHT}
          className="block h-auto w-full"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </a>
  )
}
