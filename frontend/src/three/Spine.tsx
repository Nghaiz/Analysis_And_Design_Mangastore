import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, MeshStandardMaterial, type Group, type Texture } from 'three'
import { HOVER_OFFSET, SPINE_DEPTH, pullPose, type SpineSlot } from './shelf-layout'

const PAGE_EDGE = '#EFE3C4'
const HOVER_DAMPING = 12
const SETTLE_EPSILON = 0.001
/** Khung đầu tiên sau lúc đứng yên có delta rất lớn; chặn lại để hoạt cảnh không nhảy cóc. */
const MAX_DELTA = 1 / 20

export interface SpineProps {
  slot: SpineSlot
  /** Mặt trước vẽ sẵn (gáy thể loại); null với gáy độn. */
  face: Texture | null
  raised: boolean
  pulling: boolean
  onHover?: (hovered: boolean) => void
  onPick?: () => void
  /** Gọi đúng một lần khi hoạt cảnh rút quyển chạy xong. */
  onPulled?: () => void
}

export function Spine({ slot, face, raised, pulling, onHover, onPick, onPulled }: SpineProps) {
  const body = useRef<Group>(null)
  const pullTime = useRef<number | null>(null)
  const pullFrom = useRef(0)
  const notified = useRef(false)
  const invalidate = useThree((state) => state.invalidate)

  const materials = useMemo(() => {
    const cover = new MeshStandardMaterial({ color: slot.color, roughness: 0.85 })
    const pages = new MeshStandardMaterial({ color: PAGE_EDGE, roughness: 0.95 })
    const front = face ? new MeshStandardMaterial({ map: face, roughness: 0.8 }) : cover
    // Thứ tự mặt của BoxGeometry: +x, -x, +y, -y, +z (mặt gáy nhìn ra), -z.
    return [cover, cover, pages, pages, front, cover]
  }, [slot.color, face])

  useEffect(() => () => new Set(materials).forEach((material) => material.dispose()), [materials])
  useEffect(() => invalidate(), [raised, pulling, invalidate])

  useFrame((_, rawDelta) => {
    const group = body.current
    if (!group) return
    const delta = Math.min(rawDelta, MAX_DELTA)

    if (pulling) {
      if (pullTime.current === null) {
        pullTime.current = 0
        pullFrom.current = group.position.z
      } else {
        pullTime.current += delta
      }
      const pose = pullPose(pullTime.current)
      group.position.set(0, pose.dy, pullFrom.current + pose.dz)
      group.rotation.x = pose.tilt
      if (!pose.done) {
        invalidate()
      } else if (!notified.current) {
        notified.current = true
        onPulled?.()
      }
      return
    }

    if (pullTime.current !== null) {
      // Quay lại trang bằng nút Back (bfcache): đặt quyển về kệ.
      pullTime.current = null
      notified.current = false
      group.position.y = 0
      group.rotation.x = 0
    }
    const target = raised ? HOVER_OFFSET : 0
    group.position.z = MathUtils.damp(group.position.z, target, HOVER_DAMPING, delta)
    if (Math.abs(group.position.z - target) > SETTLE_EPSILON) {
      invalidate()
    } else {
      group.position.z = target
    }
  })

  const interactive = onPick !== undefined
  const handleOver = (event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation()
    onHover?.(true)
  }
  const handleClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation()
    onPick?.()
  }

  return (
    <group position={[slot.x, slot.y, slot.z]}>
      <group ref={body}>
        <mesh
          material={materials}
          onPointerOver={interactive ? handleOver : undefined}
          onPointerOut={interactive ? () => onHover?.(false) : undefined}
          onClick={interactive ? handleClick : undefined}
        >
          <boxGeometry args={[slot.width, slot.height, SPINE_DEPTH]} />
        </mesh>
      </group>
    </group>
  )
}
