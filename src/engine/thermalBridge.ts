import type { BedConfig, BlanketZone, BlanketWeight } from '../types/bed'
import type { Figure } from '../types/figures'
import type { HeatEmitter, OccupantThermalState, ThermalScene } from '../types/thermal'
import { getFigureBedScale, getFigureLayout, transformLocalPoint } from './figureLayout'
import { contactAreaSqM, effectiveHeatWatts, insulationPenalty } from './heatLookup'

const BLANKET_OCCUPANT_BONUS: Record<BlanketWeight, number> = {
  none: 0,
  light: 0.5,
  medium: 1.05,
  heavy: 1.55,
}

const BLANKET_SURFACE_BONUS: Record<BlanketWeight, number> = {
  none: 0,
  light: 0.7,
  medium: 1.35,
  heavy: 2.05,
}

const BLANKET_SPREAD_BONUS: Record<BlanketWeight, number> = {
  none: 1,
  light: 1.05,
  medium: 1.09,
  heavy: 1.15,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function blanketWeightAt(point: { x: number; y: number }, blanketZone: BlanketZone | null): BlanketWeight {
  if (
    blanketZone &&
    point.x >= blanketZone.x &&
    point.x <= blanketZone.x + blanketZone.width &&
    point.y >= blanketZone.y &&
    point.y <= blanketZone.y + blanketZone.height
  ) {
    return blanketZone.weight
  }

  return 'none'
}

function warmthAnchor(figure: Figure, bedConfig: BedConfig) {
  const scale = getFigureBedScale(figure, bedConfig.widthIn, bedConfig.lengthIn)
  const layout = getFigureLayout(figure)
  const localPoint = layout.kind === 'human' ? layout.chest.center : layout.body.center
  return {
    scale,
    layout,
    point: transformLocalPoint(localPoint, figure, scale),
  }
}

function figureWeight(figure: Figure): number {
  if (figure.metadata.kind === 'human') return figure.metadata.weight
  return figure.metadata.weight
}

function ageAdjustment(figure: Figure): number {
  if (figure.metadata.kind !== 'human') return 0
  return clamp((32 - figure.metadata.age) * 0.02, -0.45, 0.35)
}

function warmBias(figure: Figure): number {
  return figure.metadata.runsWarm ? 0.65 : 0
}

function poseShelterBonus(figure: Figure): number {
  const curl = clamp(figure.poseSliders.curl / 100, 0, 1)
  const stretch = clamp(figure.poseSliders.stretch / 100, 0, 1)
  return curl * 1.15 - stretch * 0.65
}

function contactRadiusNormalized(contactAreaSqMValue: number, bedAreaSqM: number): number {
  const normalizedArea = contactAreaSqMValue / Math.max(bedAreaSqM, 0.25)
  return Math.sqrt(normalizedArea / Math.PI)
}

function proximityMetrics(
  centerA: { x: number; y: number },
  centerB: { x: number; y: number },
  radiusA: number,
  radiusB: number,
) {
  const dist = distance(centerA, centerB)
  const contactRange = radiusA + radiusB
  const softness = 0.14
  const gap = dist - contactRange
  const contact = clamp(-gap / Math.max(contactRange, 0.02), 0, 1)
  const proximity = clamp(1 - gap / softness, 0, 1)

  return {
    distance: dist,
    contact,
    proximity,
  }
}

function occupantWarmthC(
  figure: Figure,
  ambientTemp: number,
  blanketWeight: BlanketWeight,
  watts: number,
  contactAreaSqMValue: number,
  crowding: number,
  directContact: number,
): number {
  const flux = watts / Math.max(contactAreaSqMValue, 0.02)
  const massBonus = Math.sqrt(Math.max(figureWeight(figure), 2)) * 0.09
  const ambientLift = (ambientTemp - 20) * 0.11
  const shelter = poseShelterBonus(figure)
  const furBenefit =
    figure.metadata.kind === 'human'
      ? 0
      : insulationPenalty(figure.metadata) * 1.25
  const crowdingLift = crowding * 0.8 + directContact * 1.1
  const blanketLift = BLANKET_OCCUPANT_BONUS[blanketWeight]
  const ageLift = ageAdjustment(figure)
  const bias = warmBias(figure)
  const baseDelta =
    7.1 +
    Math.sqrt(flux) * 0.18 +
    massBonus +
    ambientLift +
    shelter +
    crowdingLift +
    blanketLift +
    furBenefit +
    ageLift +
    bias
  const cap = figure.metadata.kind === 'human' ? 34.9 : figure.type === 'dog' ? 34.4 : 34.1
  const floor = figure.metadata.kind === 'human' ? ambientTemp + 7.6 : figure.type === 'dog' ? ambientTemp + 6.4 : ambientTemp + 5.8

  return clamp(ambientTemp + baseDelta, floor, cap)
}

function bedSurfacePeakC(
  figure: Figure,
  ambientTemp: number,
  blanketWeight: BlanketWeight,
  occupantWarmth: number,
  watts: number,
  contactAreaSqMValue: number,
  crowding: number,
  directContact: number,
): number {
  const transferDensity = watts / Math.max(contactAreaSqMValue, 0.02)
  const furTransferPenalty =
    figure.metadata.kind === 'human'
      ? 0.15
      : insulationPenalty(figure.metadata) * 1.6
  const blanketLift = BLANKET_SURFACE_BONUS[blanketWeight]
  const clusteringLift = crowding * 0.35 + directContact * 0.8
  const peak =
    occupantWarmth -
    1.4 +
    Math.sqrt(transferDensity) * 0.08 +
    blanketLift +
    clusteringLift +
    warmBias(figure) * 0.45 -
    furTransferPenalty

  return clamp(peak, ambientTemp + 2.2, occupantWarmth - 0.2)
}

export function computeThermalFromPose(
  figures: Figure[],
  blanketZone: BlanketZone | null,
  ambientTemp: number,
  bedConfig: BedConfig,
): ThermalScene {
  const bedAreaSqM = bedConfig.widthIn * 0.0254 * bedConfig.lengthIn * 0.0254
  const anchors = figures.map((figure) => warmthAnchor(figure, bedConfig))
  const contactAreas = figures.map((figure) =>
    contactAreaSqM(figure.metadata, figure.poseSliders.curl, figure.poseSliders.stretch),
  )
  const contactRadii = contactAreas.map((area) => contactRadiusNormalized(area, bedAreaSqM))
  const watts = figures.map((figure) => effectiveHeatWatts(figure.metadata))

  const crowding = figures.map(() => 0)
  const directContact = figures.map(() => 0)

  for (let i = 0; i < figures.length; i++) {
    for (let j = i + 1; j < figures.length; j++) {
      const metrics = proximityMetrics(
        anchors[i].point,
        anchors[j].point,
        contactRadii[i],
        contactRadii[j],
      )

      crowding[i] += metrics.proximity
      crowding[j] += metrics.proximity
      directContact[i] += metrics.contact
      directContact[j] += metrics.contact
    }
  }

  const occupants: OccupantThermalState[] = figures.map((figure, index) => {
    const blanketWeight = blanketWeightAt(anchors[index].point, blanketZone)
    const warmthC = occupantWarmthC(
      figure,
      ambientTemp,
      blanketWeight,
      watts[index],
      contactAreas[index],
      crowding[index],
      directContact[index],
    )
    const surfacePeakC = bedSurfacePeakC(
      figure,
      ambientTemp,
      blanketWeight,
      warmthC,
      watts[index],
      contactAreas[index],
      crowding[index],
      directContact[index],
    )

    return {
      figureId: figure.figureId,
      x: anchors[index].point.x,
      y: anchors[index].point.y,
      warmthC,
      surfacePeakC,
      crowding: crowding[index],
      contact: directContact[index],
    }
  })

  const emitters: HeatEmitter[] = []

  figures.forEach((figure, index) => {
    const { layout, scale } = anchors[index]

    layout.emitters.forEach((emitter) => {
      const center = transformLocalPoint(emitter.center, figure, scale)
      const blanketWeight = blanketWeightAt(center, blanketZone)
      const spreadMultiplier = BLANKET_SPREAD_BONUS[blanketWeight]
      const sigma = clamp(
        (emitter.radius / 100) * Math.max(scale.width, scale.height) * spreadMultiplier,
        0.028,
        0.19,
      )

      emitters.push({
        figureId: figure.figureId,
        id: `${figure.figureId}-${emitter.id}`,
        cx: center.x,
        cy: center.y,
        sigma,
        peakTemp: occupants[index].surfacePeakC + BLANKET_SURFACE_BONUS[blanketWeight] * 0.18,
        weight: emitter.weight * (1 + crowding[index] * 0.08 + directContact[index] * 0.16),
      })
    })
  })

  return {
    ambientTemp,
    emitters,
    occupants,
  }
}
