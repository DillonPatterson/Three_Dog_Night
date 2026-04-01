import type { Figure } from '../types/figures'

export interface LocalPoint {
  x: number
  y: number
}

export interface LocalEmitter {
  id: string
  center: LocalPoint
  radius: number
  weight: number
}

export interface FigureBedScale {
  width: number
  height: number
}

export interface HumanLayout {
  kind: 'human'
  head: { center: LocalPoint; radius: number }
  body: { center: LocalPoint; width: number; height: number; radius: number }
  emitters: LocalEmitter[]
}

export interface PetLayout {
  kind: 'pet'
  species: 'dog' | 'cat'
  body: { center: LocalPoint; width: number; height: number; radius: number }
  head: { center: LocalPoint; rx: number; ry: number }
  tail: { start: LocalPoint; control: LocalPoint; end: LocalPoint; width: number }
  emitters: LocalEmitter[]
}

export type FigureLayout = HumanLayout | PetLayout

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t
}

function bmi(figure: Figure): number {
  if (figure.metadata.kind !== 'human') return 22
  const heightM = figure.metadata.height / 100
  return figure.metadata.weight / Math.max(heightM * heightM, 0.5)
}

function humanLayout(figure: Figure): HumanLayout {
  const curl = clamp(figure.poseSliders.curl / 100, 0, 1)
  const stretch = clamp(figure.poseSliders.stretch / 100, 0, 1)
  const headLift = clamp(figure.poseSliders.head / 100, 0, 1)
  const build = clamp((bmi(figure) - 19) / 12, 0, 1)

  const body = {
    center: { x: 50, y: 98 - curl * 6 },
    width: 28 + build * 5 + curl * 8 - stretch * 4,
    height: 82 + stretch * 24 - curl * 22,
    radius: 16 + build * 2 + curl * 4,
  }
  const head = {
    center: {
      x: 50,
      y: body.center.y - body.height / 2 - 13 + curl * 3 - headLift * 2.5,
    },
    radius: 10.5 + build * 0.9,
  }

  return {
    kind: 'human',
    head,
    body,
    emitters: [
      { id: 'head', center: head.center, radius: 8, weight: 0.16 },
      { id: 'shoulders', center: { x: 50, y: body.center.y - body.height * 0.2 }, radius: 13, weight: 0.28 },
      { id: 'core', center: body.center, radius: 15, weight: 0.36 },
      { id: 'hips', center: { x: 50, y: body.center.y + body.height * 0.2 }, radius: 13, weight: 0.2 },
    ],
  }
}

function petLayout(figure: Figure): PetLayout {
  const curl = clamp(figure.poseSliders.curl / 100, 0, 1)
  const stretch = clamp(figure.poseSliders.stretch / 100, 0, 1)
  const headReach = clamp(figure.poseSliders.head / 100, 0, 1)
  const tail = clamp((figure.poseSliders.tail ?? 50) / 100, 0, 1)

  const isDog = figure.type === 'dog'
  const body = {
    center: { x: 50, y: 96 - curl * 5 },
    width: (isDog ? 24 : 22) + curl * 10 - stretch * 3,
    height: (isDog ? 70 : 56) + stretch * (isDog ? 22 : 18) - curl * (isDog ? 14 : 18),
    radius: isDog ? 18 : 16,
  }
  const head = {
    center: {
      x: 50,
      y: body.center.y - body.height / 2 - lerp(isDog ? 10 : 8, isDog ? 20 : 14, headReach) + curl * 4,
    },
    rx: isDog ? 10 : 8.6,
    ry: isDog ? 9.2 : 8,
  }
  const tailShape = {
    start: { x: 50, y: body.center.y + body.height / 2 - 2 },
    control: {
      x: 50 + lerp(-10, 10, tail),
      y: body.center.y + body.height / 2 + 10 - curl * 4,
    },
    end: {
      x: 50 + lerp(-16, 16, tail),
      y: body.center.y + body.height / 2 + (isDog ? 18 : 14) - curl * 6,
    },
    width: isDog ? 4.4 : 3.4,
  }

  return {
    kind: 'pet',
    species: isDog ? 'dog' : 'cat',
    body,
    head,
    tail: tailShape,
    emitters: [
      { id: 'head', center: head.center, radius: isDog ? 7 : 6, weight: 0.14 },
      { id: 'chest', center: { x: 50, y: body.center.y - body.height * 0.16 }, radius: 10, weight: 0.24 },
      { id: 'core', center: body.center, radius: isDog ? 13 : 11, weight: 0.4 },
      { id: 'rear', center: { x: 50, y: body.center.y + body.height * 0.22 }, radius: 9, weight: 0.22 },
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
    const build = clamp((bmi(figure) - 19) / 12, 0, 1)
    const shoulderCm = heightCm * (0.21 + build * 0.03)
    return {
      width: clamp(shoulderCm / bedWidCm, 0.16, 0.3),
      height: clamp(heightCm / bedLenCm, 0.42, 0.88),
    }
  }

  if (figure.type === 'dog' && figure.metadata.kind === 'dog') {
    const weight = figure.metadata.weight
    const lengthCm = 36 + Math.pow(Math.max(weight, 1), 0.75) * 7.2
    const widthCm = 16 + Math.pow(Math.max(weight, 1), 0.7) * 3.4
    return {
      width: clamp(widthCm / bedWidCm, 0.1, 0.24),
      height: clamp(lengthCm / bedLenCm, 0.16, 0.42),
    }
  }

  if (figure.type === 'cat' && figure.metadata.kind === 'cat') {
    const weight = figure.metadata.weight
    const lengthCm = 32 + Math.pow(Math.max(weight, 1), 0.72) * 5.5
    const widthCm = 14 + Math.pow(Math.max(weight, 1), 0.62) * 2.8
    return {
      width: clamp(widthCm / bedWidCm, 0.08, 0.18),
      height: clamp(lengthCm / bedLenCm, 0.12, 0.26),
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
