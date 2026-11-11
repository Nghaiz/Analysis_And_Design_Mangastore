import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { PerspectiveCamera, type CanvasTexture } from 'three'
import { Bookcase, CeilingFan, Lamp } from './Fixtures'
import {
  CASE_DEPTH,
  FAN_OFFSET,
  LAMP_OFFSET,
  categoryColor,
  categoryPattern,
  type CameraFrame,
  type ShelfLayout,
} from './shelf-layout'
import { Spine } from './Spine'
import { makeSpineTexture, makeWoodTexture } from './textures'
import { useDemandTicker } from './useDemandTicker'

const WALL = '#8B7355'
const FLOOR = '#4A3A2C'
const AMBIENT = '#FFF1D6'
const FILL = '#FFF4E0'

// Ánh sáng chỉnh cho khớp độ sáng ảnh tĩnh shelf-static.* (màu phẳng, không tone mapping: Canvas `flat`).
// three 0.187 tính ánh sáng theo đơn vị vật lí: đèn môi trường cường độ I cho màu bề mặt ≈ albedo × I / π,
// nên tổng ambient + fill ≈ π giữ màu gần đúng mã hex của bảng màu. Fill đặt giữa, trước kệ, để góc phải và
// tầng dưới không tối hơn tầng trên; bóng đèn vàng chỉ thêm quầng ấm ở nửa trên.
const AMBIENT_INTENSITY = 1.75
const FILL_INTENSITY = 1.45
const FILL_POSITION: [number, number, number] = [0.4, 4.5, 9]

export interface ShelfStageProps {
  layout: ShelfLayout
  camera: CameraFrame
  categories: string[]
  fontFamily: string
  /** Gáy đang nhô ra (rê chuột hoặc Tab tới), theo vị trí trong `categories`. */
  active: number | null
  pulling: number | null
  onHover: (index: number, hovered: boolean) => void
  onPick: (index: number) => void
  onPulled: () => void
  /** Khung đầu tiên đã vẽ xong (để island chuyển mờ từ ảnh tĩnh sang canvas). */
  onFirstFrame: () => void
}

/** r3f chỉ áp prop `camera` của Canvas lúc tạo; đổi khung (xoay máy, khung hẹp) thì đặt lại ở đây. */
function CameraRig({ frame }: { frame: CameraFrame }) {
  // Lấy máy quay qua `get()` trong effect: đây là đối tượng three của r3f, không phải state React.
  const getState = useThree((state) => state.get)
  useEffect(() => {
    const { camera, invalidate } = getState()
    camera.position.set(...frame.position)
    camera.rotation.set(...frame.rotation)
    if (camera instanceof PerspectiveCamera) {
      camera.fov = frame.fov
      camera.updateProjectionMatrix()
    }
    invalidate()
  }, [frame, getState])
  return null
}

/** Gọi `onFirstFrame` một lần, sau khi khung đầu tiên (đã có texture) được vẽ ra màn hình. */
function FirstFrameSignal({ onFirstFrame }: { onFirstFrame: () => void }) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    let handle = 0
    const wait = (): void => {
      if (gl.info.render.frame > 0) {
        onFirstFrame()
        return
      }
      handle = requestAnimationFrame(wait)
    }
    handle = requestAnimationFrame(wait)
    return () => cancelAnimationFrame(handle)
  }, [gl, onFirstFrame])
  return null
}

function AmbientTicker() {
  useDemandTicker()
  return null
}

export function ShelfStage(props: ShelfStageProps) {
  const { layout, camera, categories, fontFamily, active, pulling, onHover, onPick, onPulled, onFirstFrame } = props

  const faces = useMemo(() => {
    const byIndex = new Map<number, CanvasTexture>()
    for (const slot of layout.slots) {
      if (slot.kind !== 'category') continue
      const label = categories[slot.index]
      if (label === undefined) throw new Error(`[ShelfScene] No category for spine ${slot.index}`)
      byIndex.set(
        slot.index,
        makeSpineTexture(document, {
          color: categoryColor(slot.index),
          pattern: categoryPattern(slot.index),
          label,
          number: slot.index + 1,
          fontFamily,
          width: slot.width,
          height: slot.height,
          compact: layout.compact,
        }),
      )
    }
    return byIndex
  }, [layout, categories, fontFamily])
  useEffect(() => () => faces.forEach((texture) => texture.dispose()), [faces])

  const wood = useMemo(() => makeWoodTexture(document, 2, 1), [])
  useEffect(() => () => wood.dispose(), [wood])

  const top = layout.caseHeight
  const front = CASE_DEPTH / 2

  return (
    <>
      <CameraRig frame={camera} />
      <FirstFrameSignal onFirstFrame={onFirstFrame} />
      {/* Khung hẹp: quạt nằm ngoài khung, không cần xin khung đều đặn cho nó. */}
      {!layout.compact && <AmbientTicker />}
      <ambientLight color={AMBIENT} intensity={AMBIENT_INTENSITY} />
      <directionalLight color={FILL} intensity={FILL_INTENSITY} position={FILL_POSITION} />
      <mesh position={[0, top / 2, -front - 0.05]}>
        <planeGeometry args={[30, 16]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]}>
        <planeGeometry args={[30, 12]} />
        <meshStandardMaterial color={FLOOR} roughness={1} />
      </mesh>
      <Bookcase layout={layout} wood={wood} />
      {layout.slots.map((slot) => {
        if (slot.kind === 'filler') {
          return <Spine key={`filler-${slot.index}`} slot={slot} face={null} raised={false} pulling={false} />
        }
        const index = slot.index
        return (
          <Spine
            key={`category-${index}-${layout.compact ? 'c' : 'r'}`}
            slot={slot}
            face={faces.get(index) ?? null}
            raised={active === index}
            pulling={pulling === index}
            onHover={(hovered) => onHover(index, hovered)}
            onPick={() => onPick(index)}
            onPulled={onPulled}
          />
        )
      })}
      <Lamp position={[LAMP_OFFSET[0], top + LAMP_OFFSET[1], front + LAMP_OFFSET[2]]} />
      {!layout.compact && <CeilingFan position={[FAN_OFFSET[0], top + FAN_OFFSET[1], front + FAN_OFFSET[2]]} />}
    </>
  )
}
