import type { ShelfSceneProps } from './types'

/** Cỡ gốc của ảnh tĩnh (frontend/public/img/shelf/), tỉ lệ 3:2 giống khung cảnh 3D. */
export const POSTER_WIDTH = 1200
export const POSTER_HEIGHT = 800

type PosterProps = Pick<ShelfSceneProps, 'loginHref' | 'posterSrc' | 'posterSrcSet' | 'posterAlt'> & {
  /** Cảnh 3D đã phủ lên: link ảnh tĩnh ra khỏi thứ tự Tab và cây truy cập. */
  covered: boolean
}

/**
 * Ảnh tĩnh của kệ, bọc trong link thật tới trang đăng nhập. Cây thẻ giống hệt bản JSP trong
 * src/main/webapp/dev/HomePreviewView.jsp, để lúc island gắn vào ảnh không nháy và bố cục không xê dịch.
 */
export function Poster({ loginHref, posterSrc, posterSrcSet, posterAlt, covered }: PosterProps) {
  return (
    <a href={loginHref} className="block" inert={covered}>
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
    </a>
  )
}
