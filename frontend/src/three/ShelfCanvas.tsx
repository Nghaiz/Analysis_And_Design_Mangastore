import { Canvas, type RootState } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { frameCamera, layoutShelf } from './shelf-layout'
import { ShelfStage } from './ShelfStage'
import { loadTypeFace } from './textures'

// Chunk lười của ShelfScene: chỉ src/islands/ShelfScene/index.tsx import file này, bằng import động.
// three và @react-three/fiber vào bundle qua đây, không lọt vào chunk entry.

export interface ShelfCanvasProps {
  categories: string[]
  /** Khung đầu tiên đã vẽ: island đổi ảnh tĩnh sang cảnh 3D. */
  onReady: () => void
  /** Hoạt cảnh rút quyển xong: island bấm link thật `#lnkLogin`. */
  onPick: () => void
  /** Trình duyệt thu hồi ngữ cảnh WebGL: island quay về ảnh tĩnh. */
  onContextLost: () => void
}

/** Tối đa 1,75 điểm ảnh thiết bị cho mỗi điểm ảnh CSS: nét đủ trên màn hình dày điểm, đỡ GPU điện thoại. */
const DPR_RANGE: [number, number] = [1, 1.75]

export default function ShelfCanvas({ categories, onReady, onPick, onContextLost }: ShelfCanvasProps) {
  const [fontFamily, setFontFamily] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [pulling, setPulling] = useState<number | null>(null)
  const layout = useMemo(() => layoutShelf(categories.length), [categories.length])
  const camera = useMemo(() => frameCamera(layout), [layout])

  useEffect(() => {
    let live = true
    void loadTypeFace(document, categories.join(' ')).then((family) => {
      if (live) setFontFamily(family)
    })
    return () => {
      live = false
    }
  }, [categories])

  useEffect(() => {
    // Quay lại bằng nút Back (bfcache) sau khi đã rút quyển: đặt quyển về kệ.
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) setPulling(null)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const handleCreated = useCallback(
    ({ gl }: RootState) => {
      gl.domElement.addEventListener('webglcontextlost', onContextLost, { once: true })
      requestAnimationFrame(() => {
        setReady(true)
        onReady()
      })
    },
    [onContextLost, onReady],
  )

  const pick = (index: number): void => setPulling((current) => current ?? index)
  const handleHover = useCallback((index: number, isOver: boolean) => {
    setHovered((current) => (isOver ? index : current === index ? null : current))
  }, [])
  const active = pulling ?? focused ?? hovered
  const activeLabel = active === null ? null : categories[active]

  return (
    <div
      className={`absolute inset-0 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-4 has-[button:focus-visible]:outline-pen-blue ${hovered === null ? '' : 'cursor-pointer'}`}
    >
      <div aria-hidden="true" className="absolute inset-0">
        {fontFamily !== null && (
          <Canvas
            frameloop="demand"
            dpr={DPR_RANGE}
            camera={camera}
            gl={{ antialias: true, powerPreference: 'low-power' }}
            onCreated={handleCreated}
          >
            <ShelfStage
              layout={layout}
              categories={categories}
              fontFamily={fontFamily}
              active={active}
              pulling={pulling}
              onHover={handleHover}
              onPick={pick}
              onPulled={onPick}
            />
          </Canvas>
        )}
      </div>
      {ready && (
        <ul aria-label="Kệ truyện: chọn một gáy truyện để đăng nhập và thuê" className="sr-only">
          {categories.map((category, index) => (
            <li key={`${index}-${category}`}>
              <button
                type="button"
                aria-label={`${category}: rút quyển rồi đi tới trang Đăng nhập`}
                onFocus={() => setFocused(index)}
                onBlur={() => setFocused((current) => (current === index ? null : current))}
                onClick={() => pick(index)}
              >
                {category}
              </button>
            </li>
          ))}
        </ul>
      )}
      {activeLabel !== undefined && activeLabel !== null && (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-paper bg-paper px-3 py-1 font-type text-ink shadow-paper"
        >
          {activeLabel}
        </p>
      )}
    </div>
  )
}
