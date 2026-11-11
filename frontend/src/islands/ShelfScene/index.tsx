import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import type { IslandProps } from '../../loader/mount-islands'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { followLoginLink } from './login-link'
import { Poster } from './Poster'
import { SceneBoundary } from './SceneBoundary'
import { parseShelfSceneProps } from './types'
import { browserHost, canRender3D, planUpgrade, probeWebGL, readEnvironment, scheduleUpgrade } from './upgrade'

// Island ShelfScene (docs/contracts.md §11.4). Chunk này nhỏ: ảnh tĩnh + lịch nâng cấp (Deferred #16).
// three và @react-three/fiber chỉ nằm trong chunk của ../../three/ShelfCanvas, import động bên dưới.
const ShelfCanvas = lazy(() => import('../../three/ShelfCanvas'))

/** poster: chờ nâng cấp · static: giữ ảnh tĩnh hẳn · loading: đang tải cảnh 3D · live: cảnh 3D đã phủ lên. */
type Stage = 'poster' | 'static' | 'loading' | 'live'

export default function ShelfScene(rawProps: IslandProps) {
  const props = useMemo(() => parseShelfSceneProps(rawProps), [rawProps])
  const reducedMotion = useReducedMotion()
  const [stage, setStage] = useState<Stage>('poster')

  useEffect(() => {
    if (reducedMotion || stage !== 'poster') return
    const plan = planUpgrade(readEnvironment(window))
    if (plan === 'static') return
    return scheduleUpgrade(plan, browserHost(window), () => {
      setStage(canRender3D(probeWebGL(document)) ? 'loading' : 'static')
    })
  }, [reducedMotion, stage])

  const handleReady = useCallback(() => setStage('live'), [])
  const handlePick = useCallback(() => followLoginLink(document, props.loginHref), [props.loginHref])
  const handleContextLost = useCallback(() => {
    console.warn('[ShelfScene] The browser dropped the WebGL context; showing the static shelf image.')
    setStage('static')
  }, [])
  const handleSceneError = useCallback(() => setStage('static'), [])

  const show3d = !reducedMotion && (stage === 'loading' || stage === 'live')
  const live = show3d && stage === 'live'

  return (
    <div className="relative">
      <Poster
        loginHref={props.loginHref}
        posterSrc={props.posterSrc}
        posterSrcSet={props.posterSrcSet}
        posterAlt={props.posterAlt}
        covered={live}
      />
      {show3d && (
        <div
          // Chuyển mờ ngắn từ ảnh tĩnh sang canvas, chỉ sau khi canvas đã vẽ khung đầu (stage 'live').
          // Giảm chuyển động thì không có cảnh 3D; `motion-reduce:transition-none` giữ luật đó cả ở tầng CSS.
          className={`absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none ${live ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <SceneBoundary onError={handleSceneError}>
            <Suspense fallback={null}>
              <ShelfCanvas
                categories={props.categories}
                onReady={handleReady}
                onPick={handlePick}
                onContextLost={handleContextLost}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
    </div>
  )
}
