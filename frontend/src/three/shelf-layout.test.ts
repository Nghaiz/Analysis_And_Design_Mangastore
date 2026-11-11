import { describe, expect, it } from 'vitest'
import {
  CAMERA_FOV,
  HEADROOM,
  INNER_WIDTH,
  PULL_SECONDS,
  ROW_HEIGHT,
  SCENE_ASPECT,
  SPINE_COLORS,
  SPINES_PER_ROW,
  categoryColor,
  categoryPattern,
  frameCamera,
  layoutShelf,
  pullPose,
} from './shelf-layout'

const categorySlots = (count: number) => layoutShelf(count).slots.filter((slot) => slot.kind === 'category')

describe('layoutShelf', () => {
  it('places every category once, in reading order, top row first', () => {
    const layout = layoutShelf(10)
    const slots = categorySlots(10)

    expect(layout.rows).toBe(2)
    expect(slots.map((slot) => slot.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    const topRow = slots.slice(0, SPINES_PER_ROW)
    const bottomRow = slots.slice(SPINES_PER_ROW)
    topRow.forEach((slot) => expect(slot.y).toBeGreaterThan(Math.max(...bottomRow.map((s) => s.y))))
    for (const row of [topRow, bottomRow]) {
      row.slice(1).forEach((slot, k) => expect(slot.x).toBeGreaterThan(row[k]?.x ?? Infinity))
    }
  })

  it('keeps every spine inside the case and below the next board', () => {
    for (const count of [1, 5, 7, 10, 13]) {
      const layout = layoutShelf(count)
      for (const slot of layout.slots) {
        expect(slot.x - slot.width / 2).toBeGreaterThanOrEqual(-INNER_WIDTH / 2)
        expect(slot.x + slot.width / 2).toBeLessThanOrEqual(INNER_WIDTH / 2)
        expect(slot.height).toBeLessThan(ROW_HEIGHT)
        expect(slot.y + slot.height / 2).toBeLessThan(layout.caseHeight)
      }
    }
  })

  it('colours and patterns follow the position in categories', () => {
    const slots = categorySlots(12)
    slots.forEach((slot) => {
      expect(slot.color).toBe(categoryColor(slot.index))
      expect(slot.pattern).toBe(categoryPattern(slot.index))
    })
    expect(categoryColor(SPINE_COLORS.length)).toBe(categoryColor(0))
    const firstTen = new Set(slots.slice(0, 10).map((slot) => `${slot.color}/${slot.pattern}`))
    expect(firstTen.size).toBe(10)
  })

  it('rejects an empty category list', () => {
    expect(() => layoutShelf(0)).toThrow(/at least one category/)
  })
})

describe('pullPose', () => {
  it('starts on the shelf, slides out, then drops and tilts', () => {
    expect(pullPose(0)).toEqual({ dz: 0, dy: -0, tilt: 0, done: false })
    const out = pullPose(0.2)
    expect(out.dz).toBeGreaterThan(0)
    expect(out.dy).toBeCloseTo(0)
    const end = pullPose(PULL_SECONDS)
    expect(end.done).toBe(true)
    expect(end.dy).toBeLessThan(-1)
    expect(end.tilt).toBeGreaterThan(0)
  })

  it('finishes in under a second so the login link follows promptly', () => {
    expect(PULL_SECONDS).toBeLessThan(1)
    expect(pullPose(PULL_SECONDS - 0.01).done).toBe(false)
  })
})

describe('frameCamera', () => {
  it('fits the case and the headroom inside the 3:2 frame', () => {
    const layout = layoutShelf(10)
    const camera = frameCamera(layout)
    const [, y, z] = camera.position
    const halfTan = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
    const distance = z - 0.55
    expect(distance * halfTan).toBeGreaterThanOrEqual((layout.caseHeight + HEADROOM) / 2)
    expect(distance * halfTan * SCENE_ASPECT).toBeGreaterThanOrEqual(layout.caseWidth / 2)
    expect(y).toBeCloseTo((layout.caseHeight + HEADROOM) / 2)
    expect(camera.rotation).toEqual([0, 0, 0])
  })
})
