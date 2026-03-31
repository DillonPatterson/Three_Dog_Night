import type { HeatLabel, Hotspot, ThermalGrid, ThermalScene } from '../types/thermal'
import { heatmapColorRGB } from '../utils/color'

export const GRID_W = 96
export const GRID_H = 128

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

function blurGrid(data: Float32Array): Float32Array {
  const next = new Float32Array(data.length)

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let total = 0
      let weight = 0

      for (let oy = -1; oy <= 1; oy++) {
        const py = y + oy
        if (py < 0 || py >= GRID_H) continue

        for (let ox = -1; ox <= 1; ox++) {
          const px = x + ox
          if (px < 0 || px >= GRID_W) continue

          const sampleWeight = ox === 0 && oy === 0 ? 4 : ox === 0 || oy === 0 ? 2 : 1
          total += data[py * GRID_W + px] * sampleWeight
          weight += sampleWeight
        }
      }

      next[y * GRID_W + x] = total / weight
    }
  }

  return next
}

function findHotspots(data: Float32Array, ambientTemp: number): Hotspot[] {
  const candidates: Hotspot[] = []

  for (let y = 1; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      const temp = data[y * GRID_W + x]
      if (temp < ambientTemp + 1) continue

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
    const tooClose = selected.some((spot) => {
      const dx = spot.x - candidate.x
      const dy = spot.y - candidate.y
      return Math.hypot(dx, dy) < 0.12
    })

    if (!tooClose) selected.push(candidate)
    if (selected.length === 4) break
  }

  return selected
}

function findLabelForThreshold(
  data: Float32Array,
  targetTemp: number,
  existing: HeatLabel[],
): HeatLabel | null {
  let bestScore = Number.POSITIVE_INFINITY
  let best: HeatLabel | null = null

  for (let y = 10; y < GRID_H - 10; y++) {
    for (let x = 10; x < GRID_W - 10; x++) {
      const temp = data[y * GRID_W + x]
      const diff = Math.abs(temp - targetTemp)
      const edgePenalty = Math.abs(x - GRID_W / 2) * 0.003
      const score = diff + edgePenalty

      if (score >= bestScore) continue

      const candidate = {
        x: x / GRID_W,
        y: y / GRID_H,
        tempC: temp,
        emphasis: targetTemp < temp ? 'warm' : 'ambient',
      } as HeatLabel

      const tooClose = existing.some((label) => Math.hypot(label.x - candidate.x, label.y - candidate.y) < 0.15)
      if (tooClose) continue

      bestScore = score
      best = candidate
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

  const range = maxTemp - ambientTemp
  if (range < 1.2) return labels

  const thresholds = [
    ambientTemp + range * 0.28,
    ambientTemp + range * 0.52,
    ambientTemp + range * 0.78,
  ]

  thresholds.forEach((threshold, index) => {
    const label = findLabelForThreshold(data, threshold, labels)
    if (!label) return

    labels.push({
      ...label,
      emphasis: index === 0 ? 'ambient' : index === thresholds.length - 1 ? 'hot' : 'warm',
    })
  })

  return labels
}

function contourThresholds(grid: ThermalGrid): number[] {
  const range = grid.maxTemp - grid.ambientTemp
  if (range < 1.5) return []

  return [
    grid.ambientTemp + range * 0.3,
    grid.ambientTemp + range * 0.55,
    grid.ambientTemp + range * 0.8,
  ]
}

export function computeGrid(scene: ThermalScene): ThermalGrid {
  if (scene.emitters.length === 0) return emptyGrid(scene.ambientTemp)

  const grid = emptyGrid(scene.ambientTemp)
  let maxTemp = scene.ambientTemp

  for (const emitter of scene.emitters) {
    const cx = emitter.cx * GRID_W
    const cy = emitter.cy * GRID_H
    const sig2 = 2 * emitter.sigma * emitter.sigma
    const range = Math.ceil(3 * emitter.sigma * Math.max(GRID_W, GRID_H))
    const delta = Math.max(0, emitter.peakTemp - scene.ambientTemp)

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

  const smoothed = blurGrid(grid.data)
  for (let i = 0; i < smoothed.length; i++) {
    maxTemp = Math.max(maxTemp, smoothed[i])
  }

  const hotspots = findHotspots(smoothed, scene.ambientTemp)

  return {
    data: smoothed,
    width: GRID_W,
    height: GRID_H,
    ambientTemp: scene.ambientTemp,
    maxTemp,
    hotspots,
    labels: buildHeatLabels(smoothed, scene.ambientTemp, maxTemp, hotspots),
  }
}

function drawContours(ctx: CanvasRenderingContext2D, grid: ThermalGrid, width: number, height: number) {
  const thresholds = contourThresholds(grid)
  if (thresholds.length === 0) return

  ctx.save()
  ctx.lineWidth = 1

  thresholds.forEach((threshold, index) => {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + index * 0.08})`

    for (let gy = 0; gy < GRID_H - 1; gy++) {
      for (let gx = 0; gx < GRID_W - 1; gx++) {
        const v00 = grid.data[gy * GRID_W + gx]
        const v10 = grid.data[gy * GRID_W + gx + 1]
        const v01 = grid.data[(gy + 1) * GRID_W + gx]
        const v11 = grid.data[(gy + 1) * GRID_W + gx + 1]

        const above00 = v00 >= threshold
        const above10 = v10 >= threshold
        const above01 = v01 >= threshold
        const above11 = v11 >= threshold

        if (above00 === above10 && above10 === above01 && above01 === above11) continue

        const px0 = (gx / GRID_W) * width
        const py0 = (gy / GRID_H) * height
        const px1 = ((gx + 1) / GRID_W) * width
        const py1 = ((gy + 1) / GRID_H) * height

        ctx.moveTo((px0 + px1) / 2 - 1.5, (py0 + py1) / 2)
        ctx.lineTo((px0 + px1) / 2 + 1.5, (py0 + py1) / 2)
      }
    }

    ctx.stroke()
  })

  ctx.restore()
}

export function drawHeatmap(canvas: HTMLCanvasElement, grid: ThermalGrid): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  const range = Math.max(4.5, grid.maxTemp - grid.ambientTemp)

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const gx = Math.min(GRID_W - 1, Math.floor((px / width) * GRID_W))
      const gy = Math.min(GRID_H - 1, Math.floor((py / height) * GRID_H))
      const temp = grid.data[gy * GRID_W + gx]
      const rise = temp - grid.ambientTemp
      const index = (py * width + px) * 4

      if (rise < 0.25) {
        data[index] = 0
        data[index + 1] = 0
        data[index + 2] = 0
        data[index + 3] = 0
        continue
      }

      const t = Math.max(0, Math.min(1, rise / range))
      const rgb = heatmapColorRGB(t)
      const alpha = 0.12 + Math.pow(t, 0.72) * 0.68

      data[index] = rgb.r
      data[index + 1] = rgb.g
      data[index + 2] = rgb.b
      data[index + 3] = Math.round(alpha * 255)
    }
  }

  ctx.putImageData(imageData, 0, 0)
  drawContours(ctx, grid, width, height)
}

export function formatTemperature(tempC: number, useCelsius: boolean): string {
  if (useCelsius) {
    return `${tempC.toFixed(tempC >= 30 ? 0 : 1)}°C`
  }

  const tempF = tempC * 9 / 5 + 32
  return `${tempF.toFixed(tempF >= 86 ? 0 : 1)}°F`
}
