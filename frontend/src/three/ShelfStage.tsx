import { useEffect, useMemo } from 'react'
import { Bookcase, CeilingFan, Lamp } from './Fixtures'
import { CASE_DEPTH, FAN_OFFSET, LAMP_OFFSET, categoryColor, categoryPattern, type ShelfLayout } from './shelf-layout'
import { Spine } from './Spine'
import { makeSpineTexture, makeWoodTexture } from './textures'
import { useDemandTicker } from './useDemandTicker'

const WALL = '#8B7355'
const FLOOR = '#4A3A2C'
const AMBIENT = '#FFF1D6'
const FILL = '#FFF4E0'

export interface ShelfStageProps {
  layout: ShelfLayout
  categories: string[]
  fontFamily: string
  /** Gáy đang nhô ra (rê chuột hoặc Tab tới), theo vị trí trong `categories`. */
  active: number | null
  pulling: number | null
  onHover: (index: number, hovered: boolean) => void
  onPick: (index: number) => void
  onPulled: () => void
}

export function ShelfStage({ layout, categories, fontFamily, active, pulling, onHover, onPick, onPulled }: ShelfStageProps) {
  useDemandTicker()

  const faces = useMemo(
    () =>
      categories.map((label, index) =>
        makeSpineTexture(document, {
          color: categoryColor(index),
          pattern: categoryPattern(index),
          label,
          number: index + 1,
          fontFamily,
        }),
      ),
    [categories, fontFamily],
  )
  useEffect(() => () => faces.forEach((texture) => texture.dispose()), [faces])

  const wood = useMemo(() => makeWoodTexture(document, 2, 1), [])
  useEffect(() => () => wood.dispose(), [wood])

  const top = layout.caseHeight
  const front = CASE_DEPTH / 2

  return (
    <>
      <ambientLight color={AMBIENT} intensity={0.55} />
      <directionalLight color={FILL} intensity={0.9} position={[2, 6, 8]} />
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
            key={`category-${index}`}
            slot={slot}
            face={faces[index] ?? null}
            raised={active === index}
            pulling={pulling === index}
            onHover={(hovered) => onHover(index, hovered)}
            onPick={() => onPick(index)}
            onPulled={onPulled}
          />
        )
      })}
      <Lamp position={[LAMP_OFFSET[0], top + LAMP_OFFSET[1], front + LAMP_OFFSET[2]]} />
      <CeilingFan position={[FAN_OFFSET[0], top + FAN_OFFSET[1], front + FAN_OFFSET[2]]} />
    </>
  )
}
