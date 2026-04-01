import type { FigureMeta } from '../types/figures'
import { DOG_ARCHETYPES, CAT_ARCHETYPES } from '../constants/breedArchetypes'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function restingAnimalOutput(weightKg: number, coefficient: number): number {
  return coefficient * Math.pow(Math.max(weightKg, 1), 0.75)
}

export function effectiveHeatWatts(meta: FigureMeta): number {
  if (meta.kind === 'human') {
    const surfaceArea = 0.007184 * Math.pow(meta.height, 0.725) * Math.pow(meta.weight, 0.425)
    const restingOutput = 58 * surfaceArea
    return restingOutput * 0.38 * (meta.runsWarm ? 1.08 : 1)
  }

  if (meta.kind === 'dog') {
    const arch = DOG_ARCHETYPES[meta.breedArchetype]
    if (!arch) return 18
    return restingAnimalOutput(meta.weight, 3.7) * arch.thermalMultiplier * (meta.runsWarm ? 1.06 : 1)
  }

  if (meta.kind === 'cat') {
    const arch = CAT_ARCHETYPES[meta.catArchetype]
    if (!arch) return 9
    return restingAnimalOutput(meta.weight, 3.1) * arch.thermalMultiplier * (meta.runsWarm ? 1.05 : 1)
  }

  return 10
}

export function contactAreaSqM(meta: FigureMeta, curl: number, stretch: number): number {
  const curlFactor = clamp(curl / 100, 0, 1)
  const stretchFactor = clamp(stretch / 100, 0, 1)

  if (meta.kind === 'human') {
    const heightM = meta.height / 100
    const widthM = 0.22 + (meta.weight / Math.max(meta.height, 120)) * 0.18
    const sideFactor = 0.68 + curlFactor * 0.2 - stretchFactor * 0.08
    return clamp(heightM * widthM * 0.32 * sideFactor, 0.18, 0.38)
  }

  if (meta.kind === 'dog') {
    const arch = DOG_ARCHETYPES[meta.breedArchetype]
    const base = clamp(0.014 * Math.pow(Math.max(meta.weight, 1), 0.72), 0.05, 0.18)
    const shapeFactor =
      arch?.id === 'LONG_LOW'
        ? 1.12
        : arch?.id === 'FLUFFY_WIDE'
        ? 1.05
        : arch?.id === 'SMALL_ROUND'
        ? 0.88
        : 1
    return clamp(base * shapeFactor * (0.88 + curlFactor * 0.16 - stretchFactor * 0.08), 0.035, 0.24)
  }

  if (meta.kind === 'cat') {
    const arch = CAT_ARCHETYPES[meta.catArchetype]
    const base = clamp(0.012 * Math.pow(Math.max(meta.weight, 1), 0.7), 0.028, 0.07)
    const shapeFactor = arch?.id === 'LONG' ? 1.08 : 0.94
    return clamp(base * shapeFactor * (0.9 + curlFactor * 0.14 - stretchFactor * 0.08), 0.028, 0.1)
  }

  return 0.05
}

export function insulationPenalty(meta: FigureMeta): number {
  if (meta.kind === 'dog') {
    return 1 - (DOG_ARCHETYPES[meta.breedArchetype]?.coatMultiplier ?? 1)
  }
  if (meta.kind === 'cat') {
    return 1 - (CAT_ARCHETYPES[meta.catArchetype]?.coatMultiplier ?? 1)
  }
  return 0.05
}
