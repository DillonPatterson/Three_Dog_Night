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

export interface FigureHandle {
  id: string
  control: keyof PoseSliders
  anchor: LocalPoint
  point: LocalPoint
  min: number
  max: number
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
  handles: FigureHandle[]
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
  handles: FigureHandle[]
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

function polarDown(origin: LocalPoint, length: number, angle: number): LocalPoint {
  return {
    x: origin.x + Math.sin(angle) * length,
    y: origin.y + Math.cos(angle) * length,
  }
}

function shapedLimb(
  anchor: LocalPoint,
  length: number,
  angle: number,
  bend: number,
  bendDirection: number,
  radius: number,
): LimbGeometry {
  const end = polarDown(anchor, length, angle)
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
    center: { x: 50, y: lerp(66, 58, stretch) + curl * 5 },
    rx: 16 + build * 4 + genderTone,
    ry: 27 + stretch * 5 - curl * 5,
  }
  const hips = {
    center: { x: 50, y: lerp(104, 96, stretch) - curl * 4 },
    rx: 15 + build * 5 + (genderTone < 0 ? 2 : 0),
    ry: 22 + build * 2,
  }
  const head = {
    center: { x: 50, y: chest.center.y - chest.ry - 13 + curl * 6 - headLift * 3 },
    rx: 10.5 + build * 0.8,
    ry: 12 + build * 0.8,
  }

  const shoulderY = chest.center.y - chest.ry * 0.64
  const hipY = hips.center.y + hips.ry * 0.08
  const leftShoulder = { x: chest.center.x - chest.rx + 5, y: shoulderY }
  const rightShoulder = { x: chest.center.x + chest.rx - 5, y: shoulderY }
  const leftHip = { x: hips.center.x - hips.rx * 0.5, y: hipY }
  const rightHip = { x: hips.center.x + hips.rx * 0.5, y: hipY }

  const armLength = 38 + stretch * 6 - curl * 4
  const legLength = 50 + stretch * 8 - curl * 10
  const armBend = 5 + (1 - leftArmOpen) * 6 + curl * 3
  const rightArmBend = 5 + (1 - rightArmOpen) * 6 + curl * 3
  const legBend = 8 + (1 - leftLegOpen) * 8 + curl * 8
  const rightLegBend = 8 + (1 - rightLegOpen) * 8 + curl * 8

  const leftArmAngle = lerp(0.45, -1.25, leftArmOpen) + curl * 0.15
  const rightArmAngle = lerp(-0.45, 1.25, rightArmOpen) - curl * 0.15
  const leftLegAngle = lerp(0.22, -0.85, leftLegOpen) - curl * 0.3
  const rightLegAngle = lerp(-0.22, 0.85, rightLegOpen) + curl * 0.3

  const leftArm = shapedLimb(leftShoulder, armLength, leftArmAngle, armBend, -1, 4.6 + build * 0.6)
  const rightArm = shapedLimb(rightShoulder, armLength, rightArmAngle, rightArmBend, 1, 4.6 + build * 0.6)
  const leftLeg = shapedLimb(leftHip, legLength, leftLegAngle, legBend, -1, 5.6 + build * 0.8)
  const rightLeg = shapedLimb(rightHip, legLength, rightLegAngle, rightLegBend, 1, 5.6 + build * 0.8)

  return {
    kind: 'human',
    head,
    chest,
    hips,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    handles: [
      { id: 'left-arm', control: 'leftArm', anchor: leftArm.anchor, point: leftArm.end, min: 0, max: 100 },
      { id: 'right-arm', control: 'rightArm', anchor: rightArm.anchor, point: rightArm.end, min: 0, max: 100 },
      { id: 'left-leg', control: 'leftLeg', anchor: leftLeg.anchor, point: leftLeg.end, min: 0, max: 100 },
      { id: 'right-leg', control: 'rightLeg', anchor: rightLeg.anchor, point: rightLeg.end, min: 0, max: 100 },
    ],
    emitters: [
      { id: 'head', center: head.center, radius: 8, weight: 0.12 },
      { id: 'chest', center: chest.center, radius: 15, weight: 0.42 },
      { id: 'hips', center: hips.center, radius: 13, weight: 0.28 },
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
    center: { x: 50, y: 88 - curl * 6 },
    rx: (archWide ? 22 : archCompact ? 20 : archLong ? 16 : isDog ? 18 : 16) + stretch * 6 - curl * 4,
    ry: (archLong ? 26 : archCompact ? 20 : isDog ? 24 : 22) + stretch * 9 - curl * 10,
  }
  const chest = {
    center: { x: 50, y: body.center.y - body.ry * 0.46 },
    rx: body.rx * 0.8,
    ry: body.ry * 0.46,
  }
  const head = {
    center: {
      x: 50,
      y: chest.center.y - chest.ry - lerp(8, 18, headOut) + curl * 7,
    },
    rx: isDog ? 10 + (archCompact ? 1.5 : 0) : 9,
    ry: isDog ? 11 : 9,
    nose: { x: 50, y: chest.center.y - chest.ry - lerp(18, 30, headOut) + curl * 7 },
  }

  const frontAnchor = { x: 50, y: body.center.y - body.ry * 0.1 }
  const rearAnchor = { x: 50, y: body.center.y + body.ry * 0.25 }
  const tailAnchor = { x: 50, y: body.center.y + body.ry - 2 }

  const frontAngle = lerp(0.25, -0.18, frontLegs) - curl * 0.55
  const rearAngle = lerp(-0.25, 0.18, rearLegs) + curl * 0.55
  const frontPaws = shapedLimb(
    frontAnchor,
    26 + stretch * 10 - curl * 8,
    frontAngle,
    5 + (1 - frontLegs) * 5 + curl * 6,
    -1,
    isDog ? 4.5 : 3.8,
  )
  const rearPaws = shapedLimb(
    rearAnchor,
    24 + stretch * 12 - curl * 6,
    rearAngle,
    5 + (1 - rearLegs) * 5 + curl * 6,
    1,
    isDog ? 4.6 : 3.8,
  )
  const tailLimb = shapedLimb(
    tailAnchor,
    22 + stretch * 12 - curl * 8,
    lerp(-0.85, 0.55, tail) + (archLong ? 0.15 : 0),
    6 + (1 - tail) * 4 + curl * 8,
    1,
    isDog ? 2.8 : 2.2,
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
    handles: [
      { id: 'head', control: 'head', anchor: chest.center, point: head.nose, min: 0, max: 100 },
      { id: 'front', control: 'frontLegs', anchor: frontPaws.anchor, point: frontPaws.end, min: 0, max: 100 },
      { id: 'rear', control: 'rearLegs', anchor: rearPaws.anchor, point: rearPaws.end, min: 0, max: 100 },
      { id: 'tail', control: 'tail', anchor: tailLimb.anchor, point: tailLimb.end, min: 0, max: 100 },
    ],
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
    const shoulderCm = heightCm * (0.22 + build * 0.05)
    return {
      width: clamp(shoulderCm / bedWidCm, 0.16, 0.4),
      height: clamp(heightCm / bedLenCm, 0.38, 0.96),
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
      width: clamp(widthCm / bedWidCm, 0.12, 0.42),
      height: clamp(lengthCm / bedLenCm, 0.16, 0.54),
    }
  }

  if (figure.type === 'cat' && figure.metadata.kind === 'cat') {
    const weight = figure.metadata.weight
    const isLong = figure.metadata.catArchetype === 'LONG'
    const lengthCm = isLong ? 52 + weight * 1.8 : 38 + weight * 1.6
    const widthCm = isLong ? 16 + weight * 0.65 : 18 + weight * 0.85
    return {
      width: clamp(widthCm / bedWidCm, 0.1, 0.24),
      height: clamp(lengthCm / bedLenCm, 0.14, 0.32),
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
