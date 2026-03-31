import type { Hotspot, ThermalGrid, ThermalScene } from '../types/thermal'
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
      return Math.hypot(dx, dy) < 0.13
    })

    if (!tooClose) {
      selected.push(candidate)
    }

    if (selected.length === 4) break
  }

  return selected
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

  return {
    data: smoothed,
    width: GRID_W,
    height: GRID_H,
    ambientTemp: scene.ambientTemp,
    maxTemp,
    hotspots: findHotspots(smoothed, scene.ambientTemp),
  }
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
}

export function formatTemperature(tempC: number, useCelsius: boolean): string {
  if (useCelsius) {
    return `${tempC.toFixed(tempC >= 30 ? 0 : 1)}°C`
  }

  const tempF = tempC * 9 / 5 + 32
  return `${tempF.toFixed(tempF >= 86 ? 0 : 1)}°F`
}
