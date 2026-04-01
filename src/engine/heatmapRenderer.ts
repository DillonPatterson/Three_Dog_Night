import type { HeatLabel, Hotspot, ThermalGrid, ThermalScene } from '../types/thermal'
import { heatmapColorRGB } from '../utils/color'

export const GRID_W = 96
export const GRID_H = 128
const BAND_COUNT = 8
const FIELD_VISUAL_RISE_C = 10.5

function emptyGrid(ambientTemp: number): ThermalGrid {
  const data = new Float32Array(GRID_W * GRID_H)
  data.fill(ambientTemp)

  return {
    data,
    width: GRID_W,
    height: GRID_H,
    ambientTemp,
    maxTemp: ambientTemp,
    hotspots: [],
    labels: [],
  }
}

function diffuseGrid(data: Float32Array): Float32Array {
  const next = new Float32Array(data.length)
  const weights = [
    [1, 2, 3, 2, 1],
    [2, 4, 6, 4, 2],
    [3, 6, 9, 6, 3],
    [2, 4, 6, 4, 2],
    [1, 2, 3, 2, 1],
  ]

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let total = 0
      let weight = 0

      for (let oy = -2; oy <= 2; oy++) {
        const py = y + oy
        if (py < 0 || py >= GRID_H) continue

        for (let ox = -2; ox <= 2; ox++) {
          const px = x + ox
          if (px < 0 || px >= GRID_W) continue

          const sampleWeight = weights[oy + 2][ox + 2]
          total += data[py * GRID_W + px] * sampleWeight
          weight += sampleWeight
        }
      }

      next[y * GRID_W + x] = total / Math.max(weight, 1)
    }
  }

  return next
}

function bandIndex(temp: number, ambientTemp: number): number {
  const normalized = Math.max(0, Math.min(1, (temp - ambientTemp) / FIELD_VISUAL_RISE_C))
  return Math.max(0, Math.min(BAND_COUNT - 1, Math.round(normalized * (BAND_COUNT - 1))))
}

function findHotspots(data: Float32Array, ambientTemp: number): Hotspot[] {
  const candidates: Hotspot[] = []

  for (let y = 2; y < GRID_H - 2; y++) {
    for (let x = 2; x < GRID_W - 2; x++) {
      const temp = data[y * GRID_W + x]
      if (temp < ambientTemp + 0.9) continue

      let isPeak = true
      for (let oy = -1; oy <= 1 && isPeak; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue
          if (data[(y + oy) * GRID_W + (x + ox)] > temp) {
            isPeak = false
            break
          }
        }
      }

      if (isPeak) {
        candidates.push({
          x: x / GRID_W,
          y: y / GRID_H,
          tempC: temp,
        })
      }
    }
  }

  candidates.sort((a, b) => b.tempC - a.tempC)

  const selected: Hotspot[] = []
  for (const candidate of candidates) {
    const tooClose = selected.some((spot) => Math.hypot(spot.x - candidate.x, spot.y - candidate.y) < 0.12)
    if (tooClose) continue

    selected.push(candidate)
    if (selected.length >= 5) break
  }

  return selected
}

function pickBandLabel(
  data: Float32Array,
  ambientTemp: number,
  targetTemp: number,
  existing: HeatLabel[],
): HeatLabel | null {
  let best: HeatLabel | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let y = 8; y < GRID_H - 8; y++) {
    for (let x = 8; x < GRID_W - 8; x++) {
      const temp = data[y * GRID_W + x]
      const band = bandIndex(temp, ambientTemp)
      if (Math.abs(temp - targetTemp) > 1.1) continue

      const candidate = {
        x: x / GRID_W,
        y: y / GRID_H,
        tempC: temp,
        emphasis: band <= 1 ? 'ambient' : band >= BAND_COUNT - 2 ? 'hot' : 'warm',
      } as HeatLabel

      const tooClose = existing.some((label) => Math.hypot(label.x - candidate.x, label.y - candidate.y) < 0.11)
      if (tooClose) continue

      const centrality = Math.abs(x - GRID_W / 2) * 0.01 + Math.abs(y - GRID_H / 2) * 0.006
      const score = Math.abs(temp - targetTemp) + centrality

      if (score < bestScore) {
        best = candidate
        bestScore = score
      }
    }
  }

  return best
}

function buildHeatLabels(data: Float32Array, ambientTemp: number, maxTemp: number, hotspots: Hotspot[]): HeatLabel[] {
  const labels: HeatLabel[] = hotspots.slice(0, 1).map((spot) => ({
    x: spot.x,
    y: spot.y,
    tempC: spot.tempC,
    emphasis: 'hot',
  }))

  if (maxTemp - ambientTemp < 1.2) return labels

  const targetTemps = [ambientTemp + 1.8, ambientTemp + 3.8, ambientTemp + 5.8, ambientTemp + 7.8]
  targetTemps.forEach((targetTemp) => {
    if (maxTemp < targetTemp - 0.45) return
    const label = pickBandLabel(data, ambientTemp, targetTemp, labels)
    if (label) labels.push(label)
  })

  return labels
}

export function computeGrid(scene: ThermalScene): ThermalGrid {
  if (scene.emitters.length === 0) return emptyGrid(scene.ambientTemp)

  const grid = emptyGrid(scene.ambientTemp)
  let maxTemp = scene.ambientTemp

  for (const emitter of scene.emitters) {
    const sig2 = 2 * emitter.sigma * emitter.sigma
    const range = Math.ceil(3.2 * emitter.sigma * Math.max(GRID_W, GRID_H))
    const delta = Math.max(0, emitter.peakTemp - scene.ambientTemp)
    const cx = emitter.cx * GRID_W
    const cy = emitter.cy * GRID_H
    const x0 = Math.max(0, Math.floor(cx - range))
    const x1 = Math.min(GRID_W - 1, Math.ceil(cx + range))
    const y0 = Math.max(0, Math.floor(cy - range))
    const y1 = Math.min(GRID_H - 1, Math.ceil(cy + range))

    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const nx = px / GRID_W
        const ny = py / GRID_H
        const dx = nx - emitter.cx
        const dy = ny - emitter.cy
        const influence = Math.exp(-(dx * dx + dy * dy) / sig2)
        const index = py * GRID_W + px
        const added = delta * emitter.weight * influence
        grid.data[index] = Math.min(36.8, grid.data[index] + added)
        maxTemp = Math.max(maxTemp, grid.data[index])
      }
    }
  }

  const once = diffuseGrid(grid.data)
  const twice = diffuseGrid(once)

  for (let index = 0; index < twice.length; index++) {
    maxTemp = Math.max(maxTemp, twice[index])
  }

  const hotspots = findHotspots(twice, scene.ambientTemp)

  return {
    data: twice,
    width: GRID_W,
    height: GRID_H,
    ambientTemp: scene.ambientTemp,
    maxTemp,
    hotspots,
    labels: buildHeatLabels(twice, scene.ambientTemp, maxTemp, hotspots),
  }
}

function sampleGrid(grid: ThermalGrid, x: number, y: number): number {
  const gx = Math.max(0, Math.min(grid.width - 1, x * (grid.width - 1)))
  const gy = Math.max(0, Math.min(grid.height - 1, y * (grid.height - 1)))
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const x1 = Math.min(grid.width - 1, x0 + 1)
  const y1 = Math.min(grid.height - 1, y0 + 1)
  const tx = gx - x0
  const ty = gy - y0

  const v00 = grid.data[y0 * grid.width + x0]
  const v10 = grid.data[y0 * grid.width + x1]
  const v01 = grid.data[y1 * grid.width + x0]
  const v11 = grid.data[y1 * grid.width + x1]

  const top = v00 + (v10 - v00) * tx
  const bottom = v01 + (v11 - v01) * tx
  return top + (bottom - top) * ty
}

function drawBandContours(ctx: CanvasRenderingContext2D, grid: ThermalGrid, width: number, height: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'
  ctx.lineWidth = 1
  ctx.beginPath()

  for (let y = 0; y < grid.height - 1; y++) {
    for (let x = 0; x < grid.width - 1; x++) {
      const current = bandIndex(grid.data[y * grid.width + x], grid.ambientTemp)
      const right = bandIndex(grid.data[y * grid.width + x + 1], grid.ambientTemp)
      const down = bandIndex(grid.data[(y + 1) * grid.width + x], grid.ambientTemp)

      const px = (x / (grid.width - 1)) * width
      const py = (y / (grid.height - 1)) * height
      const nextX = ((x + 1) / (grid.width - 1)) * width
      const nextY = ((y + 1) / (grid.height - 1)) * height

      if (current !== right) {
        const lineX = (px + nextX) / 2
        ctx.moveTo(lineX, py)
        ctx.lineTo(lineX, nextY)
      }

      if (current !== down) {
        const lineY = (py + nextY) / 2
        ctx.moveTo(px, lineY)
        ctx.lineTo(nextX, lineY)
      }
    }
  }

  ctx.stroke()
  ctx.restore()
}

export function drawHeatmap(canvas: HTMLCanvasElement, grid: ThermalGrid): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  const imageData = ctx.createImageData(width, height)
  const range = FIELD_VISUAL_RISE_C

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const temp = sampleGrid(grid, px / Math.max(width - 1, 1), py / Math.max(height - 1, 1))
      const rise = temp - grid.ambientTemp
      const index = (py * width + px) * 4

      if (rise < 0.18) {
        imageData.data[index] = 0
        imageData.data[index + 1] = 0
        imageData.data[index + 2] = 0
        imageData.data[index + 3] = 0
        continue
      }

      const normalized = Math.max(0, Math.min(1, rise / range))
      const band = Math.round(normalized * (BAND_COUNT - 1)) / (BAND_COUNT - 1)
      const rgb = heatmapColorRGB(band)
      const alpha = 0.14 + Math.pow(normalized, 0.72) * 0.72

      imageData.data[index] = rgb.r
      imageData.data[index + 1] = rgb.g
      imageData.data[index + 2] = rgb.b
      imageData.data[index + 3] = Math.round(alpha * 255)
    }
  }

  ctx.clearRect(0, 0, width, height)
  ctx.putImageData(imageData, 0, 0)
  drawBandContours(ctx, grid, width, height)
}

export function formatTemperature(tempC: number, useCelsius: boolean): string {
  if (useCelsius) {
    return `${tempC.toFixed(tempC >= 30 ? 0 : 1)}\u00B0C`
  }

  const tempF = tempC * 9 / 5 + 32
  return `${tempF.toFixed(tempF >= 86 ? 0 : 1)}\u00B0F`
}

export function formatFieldTemperature(tempC: number, useCelsius: boolean): string {
  if (useCelsius) {
    return `${Math.round(tempC)}\u00B0`
  }

  return `${Math.round(tempC * 9 / 5 + 32)}\u00B0`
}
