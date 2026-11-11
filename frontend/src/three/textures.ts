import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { SpinePattern } from './shelf-layout'

// Gáy truyện và vân gỗ vẽ tay bằng canvas 2D (không ảnh ngoài, không bìa crawl, không chữ của NXB).
// Chữ nhãn vẽ bằng font của token `--font-type` (Momo Trust Sans) đã nạp trên trang, nên tiếng Việt có
// dấu đầy đủ. Chọn `--font-type` thay vì `--font-body`: nhãn giấy trên gáy là chữ "đánh máy" của tiệm
// (cùng vai với số phiếu, mã vạch), Momo Trust Sans đã preload nên không tải thêm file, và nét sans gọn
// đọc rõ hơn nét bong bóng của Fuzzy Bubbles khi chữ thu nhỏ còn 18px và nhìn nghiêng trên kệ 3D.

const PAPER = '#F3E6C8'
const INK = '#2B2118'
const SPINE_PX_W = 192
const SPINE_PX_H = 512
const LABEL_MAX_PX = 300
const LABEL_MIN_FONT_PX = 18
const LABEL_START_FONT_PX = 40

/** Họ font khi trang chưa khai `--font-type` (cùng font Momo Trust Sans, chỉ thêm dự phòng của hệ thống). */
const TYPE_FACE_STACK = '"Momo Trust Sans", system-ui, sans-serif'

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('[ShelfScene] Canvas 2D is unavailable; cannot paint spine textures.')
  return ctx
}

function newCanvas(doc: Document, width: number, height: number): HTMLCanvasElement {
  const canvas = doc.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Đọc họ font của token `--font-type` và chờ nó nạp xong cho đúng các chữ sẽ vẽ (subset vietnamese). */
export async function loadTypeFace(doc: Document, sampleText: string): Promise<string> {
  const declared = getComputedStyle(doc.documentElement).getPropertyValue('--font-type').trim()
  const family = declared === '' ? TYPE_FACE_STACK : declared
  try {
    await doc.fonts.load(`${LABEL_START_FONT_PX}px ${family}`, sampleText)
  } catch (cause) {
    console.warn('[ShelfScene] Could not load the --font-type face for spine labels; the browser fallback is used.', cause)
  }
  return family
}

function paintPattern(ctx: CanvasRenderingContext2D, pattern: SpinePattern): void {
  ctx.save()
  ctx.strokeStyle = 'rgb(243 230 200 / 0.55)'
  ctx.fillStyle = 'rgb(243 230 200 / 0.5)'
  ctx.lineWidth = 6
  switch (pattern) {
    case 'bands':
      for (const y of [28, 44, SPINE_PX_H - 52, SPINE_PX_H - 36]) ctx.fillRect(0, y, SPINE_PX_W, 8)
      break
    case 'stripes':
      ctx.lineWidth = 10
      for (let x = -SPINE_PX_H; x < SPINE_PX_W; x += 34) {
        ctx.beginPath()
        ctx.moveTo(x, SPINE_PX_H)
        ctx.lineTo(x + SPINE_PX_H, 0)
        ctx.stroke()
      }
      break
    case 'dots':
      for (let y = 18; y < SPINE_PX_H; y += 30) {
        for (let x = (y / 30) % 2 === 0 ? 18 : 33; x < SPINE_PX_W; x += 30) {
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    case 'diamonds':
      for (let y = 0; y < SPINE_PX_H; y += 48) {
        ctx.beginPath()
        ctx.moveTo(SPINE_PX_W / 2, y)
        ctx.lineTo(SPINE_PX_W - 20, y + 24)
        ctx.lineTo(SPINE_PX_W / 2, y + 48)
        ctx.lineTo(20, y + 24)
        ctx.closePath()
        ctx.stroke()
      }
      break
    case 'frame':
      ctx.strokeRect(14, 14, SPINE_PX_W - 28, SPINE_PX_H - 28)
      ctx.lineWidth = 3
      ctx.strokeRect(26, 26, SPINE_PX_W - 52, SPINE_PX_H - 52)
      break
  }
  ctx.restore()
}

function paintLabel(ctx: CanvasRenderingContext2D, label: string, fontFamily: string): void {
  const plateX = 46
  const plateW = SPINE_PX_W - 2 * plateX
  ctx.fillStyle = PAPER
  ctx.fillRect(plateX, 84, plateW, 344)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(plateX + 5, 89, plateW - 10, 334)

  let size = LABEL_START_FONT_PX
  ctx.font = `${size}px ${fontFamily}`
  while (size > LABEL_MIN_FONT_PX && ctx.measureText(label).width > LABEL_MAX_PX) {
    size -= 2
    ctx.font = `${size}px ${fontFamily}`
  }
  ctx.save()
  ctx.translate(SPINE_PX_W / 2, 256)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, 0, LABEL_MAX_PX)
  ctx.restore()
}

function paintSticker(ctx: CanvasRenderingContext2D, number: number, fontFamily: string): void {
  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.arc(SPINE_PX_W / 2, 466, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = INK
  ctx.font = `22px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(number).padStart(2, '0'), SPINE_PX_W / 2, 467)
}

export interface SpineArt {
  color: string
  pattern: SpinePattern
  label: string
  /** Số dán dưới chân gáy, kiểu nhãn kệ của tiệm (vị trí + 1). */
  number: number
  fontFamily: string
}

/** Mặt trước gáy truyện: màu bìa, hoa văn, nhãn giấy có tên thể loại đánh máy, nhãn số ở chân. */
export function makeSpineTexture(doc: Document, art: SpineArt): CanvasTexture {
  const canvas = newCanvas(doc, SPINE_PX_W, SPINE_PX_H)
  const ctx = context2d(canvas)
  ctx.fillStyle = art.color
  ctx.fillRect(0, 0, SPINE_PX_W, SPINE_PX_H)
  paintPattern(ctx, art.pattern)
  paintLabel(ctx, art.label, art.fontFamily)
  paintSticker(ctx, art.number, art.fontFamily)
  // Mép gáy sờn: viền tối mỏng hai bên.
  ctx.fillStyle = 'rgb(43 33 24 / 0.35)'
  ctx.fillRect(0, 0, 6, SPINE_PX_H)
  ctx.fillRect(SPINE_PX_W - 6, 0, 6, SPINE_PX_H)
  return toTexture(canvas)
}

const WOOD_PX = 256
const WOOD_BASE = '#6B4226'

/** Số giả ngẫu nhiên có hạt giống: vân gỗ giống hệt nhau mỗi lần nạp. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

/** Vân gỗ màu `--wood` cho tủ và tấm đỡ, lặp theo `repeat`. */
export function makeWoodTexture(doc: Document, repeatX: number, repeatY: number): CanvasTexture {
  const canvas = newCanvas(doc, WOOD_PX, WOOD_PX)
  const ctx = context2d(canvas)
  const random = seededRandom(1996)
  ctx.fillStyle = WOOD_BASE
  ctx.fillRect(0, 0, WOOD_PX, WOOD_PX)
  for (let i = 0; i < 46; i++) {
    const y = random() * WOOD_PX
    const dark = random() < 0.6
    ctx.strokeStyle = dark ? 'rgb(43 25 12 / 0.35)' : 'rgb(160 110 70 / 0.25)'
    ctx.lineWidth = 0.6 + random() * 2.2
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= WOOD_PX; x += 32) ctx.lineTo(x, y + Math.sin(x / 40 + i) * (1 + random() * 3))
    ctx.stroke()
  }
  const texture = toTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return texture
}
