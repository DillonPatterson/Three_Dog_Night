import type { BlanketZone, BedConfig } from '../types/bed'
import type { Figure } from '../types/figures'
import type { HeatEmitter, ThermalScene } from '../types/thermal'
import { getFigureBedScale, getFigureLayout, transformLocalPoint } from './figureLayout'
import { contactAreaSqM, effectiveHeatWatts, insulationPenalty } from './heatLookup'

const BLANKET_TEMP_BONUS = {
  none: 0,
  light: 0.9,
  medium: 1.7,
  heavy: 2.5,
}

const BLANKET_SPREAD_BONUS = {
  none: 1,
  light: 1.04,
  medium: 1.08,
  heavy: 1.13,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function underBlanket(point: { x: number; y: number }, blanketZone: BlanketZone | null): BlanketZone['weight'] | null {
  if (!blanketZone) return null
  if (
    point.x >= blanketZone.x &&
    point.x <= blanketZone.x + blanketZone.width &&
    point.y >= blanketZone.y &&
    point.y <= blanketZone.y + blanketZone.height
  ) {
    return blanketZone.weight
  }
  return null
}

function figureSurfacePeak(
  figure: Figure,
  ambientTemp: number,
  nearbyCount: number,
  blanketWeight: BlanketZone['weight'] | null,
): number {
  const watts = effectiveHeatWatts(figure.metadata)
  const contactArea = contactAreaSqM(
    figure.metadata,
    figure.poseSliders.curl,
    figure.poseSliders.stretch,
  )
  const heatFlux = watts / Math.max(contactArea, 0.02)
  const ambientShift = (20 - ambientTemp) * 0.08
  const clusterBoost = nearbyCount * 0.55
  const furPenalty = insulationPenalty(figure.metadata) * 1.8
  const blanketBonus = blanketWeight ? BLANKET_TEMP_BONUS[blanketWeight] : 0
  const baseDelta = 1.8 + Math.sqrt(heatFlux) * 0.34 + ambientShift + clusterBoost - furPenalty

  const peakCap = figure.metadata.kind === 'human' ? 35.3 : 34.5
  return clamp(ambientTemp + baseDelta + blanketBonus, ambientTemp + 2.8, peakCap)
}

export function computeThermalFromPose(
  figures: Figure[],
  blanketZone: BlanketZone | null,
  ambientTemp: number,
  bedConfig: BedConfig,
): ThermalScene {
  const scales = figures.map((figure) =>
    getFigureBedScale(figure, bedConfig.widthIn, bedConfig.lengthIn),
  )

  const figureCenters = figures.map((figure, index) =>
    transformLocalPoint({ x: 50, y: 90 }, figure, scales[index]),
  )

  const emitters: HeatEmitter[] = []

  figures.forEach((figure, index) => {
    const layout = getFigureLayout(figure)
    const nearbyCount = figureCenters.reduce((count, point, otherIndex) => {
      if (otherIndex === index) return count
      return count + (distance(point, figureCenters[index]) < 0.18 ? 1 : 0)
    }, 0)

    const peakTemp = figureSurfacePeak(
      figure,
      ambientTemp,
      nearbyCount,
      underBlanket(figureCenters[index], blanketZone),
    )

    for (const emitter of layout.emitters) {
      const center = transformLocalPoint(emitter.center, figure, scales[index])
      const blanketWeight = underBlanket(center, blanketZone)
      const spreadMultiplier = blanketWeight ? BLANKET_SPREAD_BONUS[blanketWeight] : 1
      const sigma = clamp(
        (emitter.radius / 100) * Math.max(scales[index].width, scales[index].height) * spreadMultiplier,
        0.028,
        0.19,
      )

      emitters.push({
        figureId: figure.figureId,
        id: `${figure.figureId}-${emitter.id}`,
        cx: center.x,
        cy: center.y,
        sigma,
        peakTemp: blanketWeight ? peakTemp + BLANKET_TEMP_BONUS[blanketWeight] * 0.35 : peakTemp,
        weight: emitter.weight + nearbyCount * 0.02,
      })
    }
  })

  return {
    ambientTemp,
    emitters,
  }
}
