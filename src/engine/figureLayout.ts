import type { Figure, PoseSliders } from '../types/figures'

export interface LocalPoint {
  x: number
  y: number
}

export interface LimbGeometry {
  anchor: LocalPoint
  joint: LocalPoint
  end: LocalPoint
  radius: number
}

export interface LocalEmitter {
  id: string
  center: LocalPoint
  radius: number
  weight: number
}

export interface HumanLayout {
  kind: 'human'
  head: { center: LocalPoint; rx: number; ry: number }
  chest: { center: LocalPoint; rx: number; ry: number }
  hips: { center: LocalPoint; rx: number; ry: number }
  leftArm: LimbGeometry
  rightArm: LimbGeometry
  leftLeg: LimbGeometry
  rightLeg: LimbGeometry
  emitters: LocalEmitter[]
}

export interface PetLayout {
  kind: 'pet'
  species: 'dog' | 'cat'
  body: { center: LocalPoint; rx: number; ry: number }
  chest: { center: LocalPoint; rx: number; ry: number }
  head: { center: LocalPoint; rx: number; ry: number; nose: LocalPoint }
  frontPaws: LimbGeometry
  rearPaws: LimbGeometry
  tail: LimbGeometry
  emitters: LocalEmitter[]
}

export type FigureLayout = HumanLayout | PetLayout

export interface FigureBedScale {
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t
}

function slider(sliders: PoseSliders, key: keyof PoseSliders, fallback: number): number {
  const value = sliders[key]
  return typeof value === 'number' ? value : fallback
}

function pointFromAngle(origin: LocalPoint, length: number, angle: number): LocalPoint {
  return {
    x: origin.x + Math.sin(angle) * length,
    y: origin.y + Math.cos(angle) * length,
  }
}

function solveTwoBone(
  anchor: LocalPoint,
  target: LocalPoint,
  upperLength: number,
  lowerLength: number,
  bendDirection: number,
  radius: number,
): LimbGeometry {
  const dx = target.x - anchor.x
  const dy = target.y - anchor.y
  const rawDistance = Math.hypot(dx, dy) || 0.0001
  const minReach = Math.abs(upperLength - lowerLength) + 0.001
  const maxReach = upperLength + lowerLength - 0.001
  const reach = clamp(rawDistance, minReach, maxReach)
  const unitX = dx / rawDistance
  const unitY = dy / rawDistance
  const end = {
    x: anchor.x + unitX * reach,
    y: anchor.y + unitY * reach,
  }

  const base = (upperLength * upperLength - lowerLength * lowerLength + reach * reach) / (2 * reach)
  const height = Math.sqrt(Math.max(upperLength * upperLength - base * base, 0))
  const mid = {
    x: anchor.x + unitX * base,
    y: anchor.y + unitY * base,
  }
  const joint = {
    x: mid.x + -unitY * height * bendDirection,
    y: mid.y + unitX * height * bendDirection,
  }

  return { anchor, joint, end, radius }
}

function shapedCurve(
  anchor: LocalPoint,
  length: number,
  angle: number,
  bend: number,
  bendDirection: number,
  radius: number,
): LimbGeometry {
  const end = pointFromAngle(anchor, length, angle)
  const mid = {
    x: (anchor.x + end.x) / 2,
    y: (anchor.y + end.y) / 2,
  }
  const dx = end.x - anchor.x
  const dy = end.y - anchor.y
  const mag = Math.hypot(dx, dy) || 1
  const joint = {
    x: mid.x + (-dy / mag) * bend * bendDirection,
    y: mid.y + (dx / mag) * bend * bendDirection,
  }

  return { anchor, joint, end, radius }
}

function bmi(meta: Figure['metadata']): number {
  if (meta.kind !== 'human') return 22
  const heightM = meta.height / 100
  return meta.weight / Math.max(heightM * heightM, 0.5)
}

function humanBodyTone(meta: Figure['metadata']) {
  if (meta.kind !== 'human') return 0
  if (meta.gender === 'male') return 1
  if (meta.gender === 'female') return -1
  return 0
}

function humanLayout(figure: Figure): HumanLayout {
  const curl = clamp(slider(figure.poseSliders, 'curl', 45) / 100, 0, 1)
  const stretch = clamp(slider(figure.poseSliders, 'stretch', 45) / 100, 0, 1)
  const headLift = clamp(slider(figure.poseSliders, 'head', 50) / 100, 0, 1)
  const leftArmOpen = clamp(slider(figure.poseSliders, 'leftArm', 50) / 100, 0, 1)
  const rightArmOpen = clamp(slider(figure.poseSliders, 'rightArm', 50) / 100, 0, 1)
  const leftLegOpen = clamp(slider(figure.poseSliders, 'leftLeg', 50) / 100, 0, 1)
  const rightLegOpen = clamp(slider(figure.poseSliders, 'rightLeg', 50) / 100, 0, 1)

  const build = clamp((bmi(figure.metadata) - 18) / 14, 0, 1)
  const genderTone = humanBodyTone(figure.metadata)

  const chest = {
    center: { x: 50, y: lerp(70, 61, stretch) + curl * 4.5 },
    rx: 14.2 + build * 3.6 + genderTone * 0.8,
    ry: 21 + stretch * 5 - curl * 3,
  }
  const hips = {
    center: { x: 50, y: lerp(102, 93, stretch) - curl * 3.6 },
    rx: 13.8 + build * 4.2 + (genderTone < 0 ? 1.8 : 0),
    ry: 18.5 + build * 2.4,
  }
  const head = {
    center: { x: 50, y: chest.center.y - chest.ry - 14 + curl * 4.5 - headLift * 2.8 },
    rx: 11.6 + build * 0.8,
    ry: 12.4 + build * 0.85,
  }

  const shoulderY = chest.center.y - chest.ry * 0.6
  const hipY = hips.center.y + hips.ry * 0.05
  const leftShoulder = { x: chest.center.x - chest.rx + 2.8, y: shoulderY }
  const rightShoulder = { x: chest.center.x + chest.rx - 2.8, y: shoulderY }
  const leftHip = { x: hips.center.x - hips.rx * 0.5, y: hipY }
  const rightHip = { x: hips.center.x + hips.rx * 0.5, y: hipY }

  const armLength = 37 + stretch * 8 - curl * 5
  const legLength = 48 + stretch * 10 - curl * 8
  const armUpper = armLength * 0.52
  const armLower = armLength * 0.48
  const legUpper = legLength * 0.53
  const legLower = legLength * 0.47

  const leftArmAngle = lerp(0.52, -1.1, leftArmOpen) + curl * 0.08
  const rightArmAngle = lerp(-0.52, 1.1, rightArmOpen) - curl * 0.08
  const leftLegAngle = lerp(0.28, -0.78, leftLegOpen) - curl * 0.2
  const rightLegAngle = lerp(-0.28, 0.78, rightLegOpen) + curl * 0.2

  const leftArmTarget = pointFromAngle(leftShoulder, armLength, leftArmAngle)
  const rightArmTarget = pointFromAngle(rightShoulder, armLength, rightArmAngle)
  const leftLegTarget = pointFromAngle(leftHip, legLength, leftLegAngle)
  const rightLegTarget = pointFromAngle(rightHip, legLength, rightLegAngle)

  const leftArm = solveTwoBone(leftShoulder, leftArmTarget, armUpper, armLower, -1, 3.8 + build * 0.45)
  const rightArm = solveTwoBone(rightShoulder, rightArmTarget, armUpper, armLower, 1, 3.8 + build * 0.45)
  const leftLeg = solveTwoBone(leftHip, leftLegTarget, legUpper, legLower, -1, 4.8 + build * 0.55)
  const rightLeg = solveTwoBone(rightHip, rightLegTarget, legUpper, legLower, 1, 4.8 + build * 0.55)

  return {
    kind: 'human',
    head,
    chest,
    hips,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    emitters: [
      { id: 'head', center: head.center, radius: 8, weight: 0.1 },
      { id: 'chest', center: chest.center, radius: 14, weight: 0.45 },
      { id: 'hips', center: hips.center, radius: 12, weight: 0.27 },
      { id: 'legs', center: { x: 50, y: (leftLeg.joint.y + rightLeg.joint.y) / 2 }, radius: 10, weight: 0.18 },
    ],
  }
}

function petShapeFactors(figure: Figure) {
  const curl = clamp(slider(figure.poseSliders, 'curl', 45) / 100, 0, 1)
  const stretch = clamp(slider(figure.poseSliders, 'stretch', 45) / 100, 0, 1)
  const headOut = clamp(slider(figure.poseSliders, 'head', 50) / 100, 0, 1)
  const frontLegs = clamp(slider(figure.poseSliders, 'frontLegs', 50) / 100, 0, 1)
  const rearLegs = clamp(slider(figure.poseSliders, 'rearLegs', 50) / 100, 0, 1)
  const tail = clamp(slider(figure.poseSliders, 'tail', 50) / 100, 0, 1)
  return { curl, stretch, headOut, frontLegs, rearLegs, tail }
}

function petLayout(figure: Figure): PetLayout {
  const { curl, stretch, headOut, frontLegs, rearLegs, tail } = petShapeFactors(figure)
  const dogArch = figure.metadata.kind === 'dog' ? figure.metadata.breedArchetype : 'COMPACT'
  const catArch = figure.metadata.kind === 'cat' ? figure.metadata.catArchetype : 'COMPACT'

  const isDog = figure.type === 'dog'
  const archWide = isDog && dogArch === 'FLUFFY_WIDE'
  const archLong = (isDog && dogArch === 'LONG_LOW') || (!isDog && catArch === 'LONG')
  const archCompact = isDog && dogArch === 'SMALL_ROUND'

  const body = {
    center: { x: 50, y: 88 - curl * 5.5 },
    rx: (archWide ? 22 : archCompact ? 20 : archLong ? 16 : isDog ? 18 : 16) + stretch * 5.5 - curl * 4.2,
    ry: (archLong ? 26 : archCompact ? 20 : isDog ? 24 : 22) + stretch * 8.5 - curl * 10,
  }
  const chest = {
    center: { x: 50, y: body.center.y - body.ry * 0.44 },
    rx: body.rx * 0.78,
    ry: body.ry * 0.42,
  }
  const head = {
    center: {
      x: 50,
      y: chest.center.y - chest.ry - lerp(8, 18, headOut) + curl * 6.5,
    },
    rx: isDog ? 10.8 + (archCompact ? 1.4 : 0) : 9.6,
    ry: isDog ? 11.2 : 9.4,
    nose: { x: 50, y: chest.center.y - chest.ry - lerp(18, 30, headOut) + curl * 6.5 },
  }

  const frontAnchor = { x: 50, y: body.center.y - body.ry * 0.05 }
  const rearAnchor = { x: 50, y: body.center.y + body.ry * 0.28 }
  const tailAnchor = { x: 50, y: body.center.y + body.ry - 1 }

  const frontLength = 24 + stretch * 10 - curl * 8
  const rearLength = 23 + stretch * 11 - curl * 6
  const frontAngle = lerp(0.22, -0.16, frontLegs) - curl * 0.42
  const rearAngle = lerp(-0.22, 0.16, rearLegs) + curl * 0.42
  const frontTarget = pointFromAngle(frontAnchor, frontLength, frontAngle)
  const rearTarget = pointFromAngle(rearAnchor, rearLength, rearAngle)

  const frontPaws = solveTwoBone(
    frontAnchor,
    frontTarget,
    frontLength * 0.54,
    frontLength * 0.46,
    -1,
    isDog ? 3.9 : 3.3,
  )
  const rearPaws = solveTwoBone(
    rearAnchor,
    rearTarget,
    rearLength * 0.56,
    rearLength * 0.44,
    1,
    isDog ? 4 : 3.3,
  )
  const tailLimb = shapedCurve(
    tailAnchor,
    22 + stretch * 12 - curl * 8,
    lerp(-0.85, 0.55, tail) + (archLong ? 0.15 : 0),
    6 + (1 - tail) * 4 + curl * 8,
    1,
    isDog ? 2.6 : 2.1,
  )

  return {
    kind: 'pet',
    species: isDog ? 'dog' : 'cat',
    body,
    chest,
    head,
    frontPaws,
    rearPaws,
    tail: tailLimb,
    emitters: [
      { id: 'head', center: head.center, radius: isDog ? 8 : 7, weight: 0.12 },
      { id: 'chest', center: chest.center, radius: 10, weight: 0.26 },
      { id: 'core', center: body.center, radius: Math.max(body.rx, body.ry) * 0.52, weight: 0.44 },
      { id: 'rear', center: { x: 50, y: body.center.y + body.ry * 0.38 }, radius: 9, weight: 0.18 },
    ],
  }
}

export function getFigureLayout(figure: Figure): FigureLayout {
  return figure.type === 'human' ? humanLayout(figure) : petLayout(figure)
}

export function getFigureBedScale(
  figure: Figure,
  bedWidthIn: number,
  bedLengthIn: number,
): FigureBedScale {
  const bedLenCm = bedLengthIn * 2.54
  const bedWidCm = bedWidthIn * 2.54

  if (figure.type === 'human' && figure.metadata.kind === 'human') {
    const heightCm = figure.metadata.height
    const build = clamp((bmi(figure.metadata) - 18) / 14, 0, 1)
    const shoulderCm = heightCm * (0.235 + build * 0.055)
    return {
      width: clamp(shoulderCm / bedWidCm, 0.18, 0.38),
      height: clamp(heightCm / bedLenCm, 0.4, 0.94),
    }
  }

  if (figure.type === 'dog' && figure.metadata.kind === 'dog') {
    const weight = figure.metadata.weight
    const arch = figure.metadata.breedArchetype
    const lengthCm =
      arch === 'LONG_LOW'
        ? 34 + weight * 2.7
        : arch === 'SMALL_ROUND'
        ? 28 + weight * 2.4
        : arch === 'FLUFFY_WIDE'
        ? 48 + weight * 1.5
        : arch === 'LARGE_BOXY'
        ? 52 + weight * 1.3
        : 40 + weight * 1.7
    const widthCm =
      arch === 'FLUFFY_WIDE'
        ? 28 + weight * 0.65
        : arch === 'LARGE_BOXY'
        ? 24 + weight * 0.55
        : arch === 'LONG_LOW'
        ? 16 + weight * 0.4
        : 18 + weight * 0.45
    return {
      width: clamp(widthCm / bedWidCm, 0.12, 0.4),
      height: clamp(lengthCm / bedLenCm, 0.16, 0.5),
    }
  }

  if (figure.type === 'cat' && figure.metadata.kind === 'cat') {
    const weight = figure.metadata.weight
    const isLong = figure.metadata.catArchetype === 'LONG'
    const lengthCm = isLong ? 52 + weight * 1.8 : 38 + weight * 1.6
    const widthCm = isLong ? 16 + weight * 0.65 : 18 + weight * 0.85
    return {
      width: clamp(widthCm / bedWidCm, 0.1, 0.22),
      height: clamp(lengthCm / bedLenCm, 0.14, 0.3),
    }
  }

  return { width: 0.16, height: 0.4 }
}

export function transformLocalPoint(
  point: LocalPoint,
  figure: Figure,
  scale: FigureBedScale,
): LocalPoint {
  const nx = (point.x - 50) / 100
  const ny = (point.y - 90) / 180
  const fx = figure.facingDirection === 'left' ? -1 : 1
  const x = nx * scale.width * fx
  const y = ny * scale.height
  const cos = Math.cos(figure.rootRotation)
  const sin = Math.sin(figure.rootRotation)

  return {
    x: figure.rootPosition.x + x * cos - y * sin,
    y: figure.rootPosition.y + x * sin + y * cos,
  }
}
