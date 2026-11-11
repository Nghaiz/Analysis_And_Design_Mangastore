import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { DoubleSide, type Group, type Texture } from 'three'
import {
  BOARD_THICKNESS,
  CASE_DEPTH,
  FAN_BLADE_INNER,
  FAN_BLADE_LENGTH,
  FAN_BLADE_WIDTH,
  INNER_WIDTH,
  SIDE_THICKNESS,
  type ShelfLayout,
} from './shelf-layout'

// Đồ đạc của tiệm: tủ gỗ, bóng đèn vàng chao men xanh, quạt trần cánh gỗ quay chậm. Tự dựng bằng hình khối.

const LAMP_LIGHT = '#F6C453'
const BULB_GLOW = '#FFE8A3'
const ENAMEL_GREEN = '#2A6334'
const BACK_PANEL_TINT = '#8A6A50'
const FAN_METAL = '#D9CDB0'
const FAN_BLADE = '#7A5634'
const CORD = '#2B2118'
/** Quạt quay chậm: khoảng 8 vòng một phút. */
const FAN_RADIANS_PER_SECOND = 0.85
const MAX_DELTA = 1 / 10
const BLADE_COUNT = 3
/** Dây đèn và trục quạt kéo lên tới trần, ra ngoài khung hình. */
const CEILING_RISE = 3

export function Bookcase({ layout, wood }: { layout: ShelfLayout; wood: Texture }) {
  const sideX = INNER_WIDTH / 2 + SIDE_THICKNESS / 2
  return (
    <group>
      {[-sideX, sideX].map((x) => (
        <mesh key={x} position={[x, layout.caseHeight / 2, 0]}>
          <boxGeometry args={[SIDE_THICKNESS, layout.caseHeight, CASE_DEPTH]} />
          <meshStandardMaterial map={wood} roughness={0.7} />
        </mesh>
      ))}
      {layout.boardTops.map((top) => (
        <mesh key={top} position={[0, top - BOARD_THICKNESS / 2, 0]}>
          <boxGeometry args={[INNER_WIDTH, BOARD_THICKNESS, CASE_DEPTH]} />
          <meshStandardMaterial map={wood} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, layout.caseHeight / 2, -CASE_DEPTH / 2 + 0.02]}>
        <boxGeometry args={[layout.caseWidth, layout.caseHeight, 0.04]} />
        <meshStandardMaterial map={wood} color={BACK_PANEL_TINT} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, CEILING_RISE / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, CEILING_RISE, 6]} />
        <meshStandardMaterial color={CORD} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <coneGeometry args={[0.34, 0.26, 28, 1, true]} />
        <meshStandardMaterial color={ENAMEL_GREEN} metalness={0.3} roughness={0.45} side={DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.09, 20, 14]} />
        <meshBasicMaterial color={BULB_GLOW} toneMapped={false} />
      </mesh>
      <pointLight color={LAMP_LIGHT} intensity={16} decay={2} />
    </group>
  )
}

export function CeilingFan({ position }: { position: [number, number, number] }) {
  const rotor = useRef<Group>(null)
  useFrame((_, delta) => {
    if (rotor.current) rotor.current.rotation.y += Math.min(delta, MAX_DELTA) * FAN_RADIANS_PER_SECOND
  })
  return (
    <group position={position}>
      <mesh position={[0, CEILING_RISE / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, CEILING_RISE, 8]} />
        <meshStandardMaterial color={FAN_METAL} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.16, 0.12, 0.14, 20]} />
        <meshStandardMaterial color={FAN_METAL} metalness={0.4} roughness={0.5} />
      </mesh>
      <group ref={rotor} position={[0, -0.05, 0]}>
        {Array.from({ length: BLADE_COUNT }, (_, k) => (
          <group key={k} rotation={[0, (k * 2 * Math.PI) / BLADE_COUNT, 0]}>
            <mesh position={[FAN_BLADE_INNER + FAN_BLADE_LENGTH / 2, 0, 0]} rotation={[0.14, 0, 0]}>
              <boxGeometry args={[FAN_BLADE_LENGTH, 0.025, FAN_BLADE_WIDTH]} />
              <meshStandardMaterial color={FAN_BLADE} roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
