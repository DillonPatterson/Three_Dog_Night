import { useEffect, useRef } from 'react'
import { formatDisplayTemp, type TempUnit } from '../thermalEngine'

const COLOR_STOPS_C = [
  { tempC: 18, rgb: [73, 126, 191] },
  { tempC: 21, rgb: [109, 168, 204] },
  { tempC: 24, rgb: [138, 200, 188] },
  { tempC: 27, rgb: [236, 224, 90] },
  { tempC: 30, rgb: [247, 180, 58] },
  { tempC: 33, rgb: [241, 123, 47] },
  { tempC: 35.5, rgb: [223, 74, 38] },
  { tempC: 37.5, rgb: [194, 29, 33] },
  { tempC: 39.5, rgb: [142, 0, 28] },
] as const

const ISOTHERM_TEMPS_C = [24, 29, 34]

function tempToRGB(tempC: number): number[] {
  if (tempC <= COLOR_STOPS_C[0].tempC) return [...COLOR_STOPS_C[0].rgb]
  if (tempC >= COLOR_STOPS_C[COLOR_STOPS_C.length - 1].tempC) {
    return [...COLOR_STOPS_C[COLOR_STOPS_C.length - 1].rgb]
  }

  for (let index = 1; index < COLOR_STOPS_C.length; index++) {
    const low = COLOR_STOPS_C[index - 1]
    const high = COLOR_STOPS_C[index]
    if (tempC <= high.tempC) {
      const t = (tempC - low.tempC) / (high.tempC - low.tempC)
      return [
        Math.round(low.rgb[0] + (high.rgb[0] - low.rgb[0]) * t),
        Math.round(low.rgb[1] + (high.rgb[1] - low.rgb[1]) * t),
        Math.round(low.rgb[2] + (high.rgb[2] - low.rgb[2]) * t),
      ]
    }
  }

  return [...COLOR_STOPS_C[COLOR_STOPS_C.length - 1].rgb]
}

function drawIsolines(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  width: number,
  height: number,
) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  if (!rows || !cols) return

  const cellW = width / cols
  const cellH = height / rows

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'
  ctx.lineWidth = 1

  for (const threshold of ISOTHERM_TEMPS_C) {
    ctx.beginPath()
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const v = grid[row][col]
        const vr = grid[row][col + 1]
        const vd = grid[row + 1][col]

        const x = (col + 0.5) * cellW
        const y = (row + 0.5) * cellH
        const xr = (col + 1.5) * cellW
        const yd = (row + 1.5) * cellH

        if ((v < threshold) !== (vr < threshold)) {
          const t = (threshold - v) / (vr - v)
          const lx = x + (xr - x) * t
          ctx.moveTo(lx - 2, y)
          ctx.lineTo(lx + 2, y)
        }
        if ((v < threshold) !== (vd < threshold)) {
          const t = (threshold - v) / (vd - v)
          const ly = y + (yd - y) * t
          ctx.moveTo(x, ly - 2)
          ctx.lineTo(x, ly + 2)
        }
      }
    }
    ctx.stroke()
  }

  ctx.restore()
}

function pickLabelPoints(grid: number[][], roomTempC: number) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const candidates: Array<{ row: number; col: number; tempC: number; score: number }> = []

  for (let row = 1; row < rows - 1; row += 2) {
    for (let col = 1; col < cols - 1; col += 2) {
      const tempC = grid[row][col]
      if (tempC < roomTempC + 1.2) continue

      const neighbors = [
        grid[row - 1][col],
        grid[row + 1][col],
        grid[row][col - 1],
        grid[row][col + 1],
      ]
      const isLocalPeak = neighbors.every((value) => tempC >= value)
      const centerBias = 1 - Math.abs(col / cols - 0.5) * 0.35 - Math.abs(row / rows - 0.5) * 0.25
      candidates.push({
        row,
        col,
        tempC,
        score: (tempC - roomTempC) * (isLocalPeak ? 1.25 : 1) * centerBias,
      })
    }
  }

  candidates.sort((left, right) => right.score - left.score)

  const chosen: Array<{ row: number; col: number; tempC: number }> = []
  for (const candidate of candidates) {
    const farEnough = chosen.every((label) => {
      const dx = label.col - candidate.col
      const dy = label.row - candidate.row
      return Math.hypot(dx, dy) >= 8
    })
    if (!farEnough) continue
    chosen.push(candidate)
    if (chosen.length >= 7) break
  }

  return chosen
}

interface Props {
  grid: number[][]
  width: number
  height: number
  roomTempC: number
  unit: TempUnit
  className?: string
}

export function HeatmapCanvas({ grid, width, height, roomTempC, unit, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rows = grid.length
    const cols = grid[0]?.length ?? 0
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)

    if (!rows || !cols) return

    const imageData = ctx.createImageData(width, height)
    const pixels = imageData.data
    const baseTempC = roomTempC + 0.6

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const gx = (px / width) * (cols - 1)
        const gy = (py / height) * (rows - 1)

        const c0 = Math.floor(gx)
        const r0 = Math.floor(gy)
        const c1 = Math.min(cols - 1, c0 + 1)
        const r1 = Math.min(rows - 1, r0 + 1)
        const tx = gx - c0
        const ty = gy - r0

        const v00 = grid[r0][c0]
        const v10 = grid[r0][c1]
        const v01 = grid[r1][c0]
        const v11 = grid[r1][c1]

        const tempC =
          v00 * (1 - tx) * (1 - ty) +
          v10 * tx * (1 - ty) +
          v01 * (1 - tx) * ty +
          v11 * tx * ty

        const bandTempC = Math.round(tempC * 2) / 2
        const [r, g, b] = tempToRGB(bandTempC)
        const heatRise = Math.max(0, bandTempC - baseTempC)
        const alpha = heatRise < 0.3 ? 0 : Math.min(0.92, 0.15 + (heatRise / 10) * 0.72)

        const index = (py * width + px) * 4
        pixels[index] = r
        pixels[index + 1] = g
        pixels[index + 2] = b
        pixels[index + 3] = Math.round(alpha * 255)
      }
    }

    ctx.putImageData(imageData, 0, 0)
    drawIsolines(ctx, grid, width, height)

    const labelPoints = pickLabelPoints(grid, roomTempC)
    const cellW = width / cols
    const cellH = height / rows
    ctx.font = '700 12px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const label of labelPoints) {
      const x = (label.col + 0.5) * cellW
      const y = (label.row + 0.5) * cellH
      const text = formatDisplayTemp(label.tempC, unit)
      ctx.lineWidth = 3.5
      ctx.strokeStyle = 'rgba(34,18,8,0.72)'
      ctx.strokeText(text, x, y)
      ctx.fillStyle = 'rgba(255,250,240,0.95)'
      ctx.fillText(text, x, y)
    }
  }, [grid, width, height, roomTempC, unit])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  )
}
