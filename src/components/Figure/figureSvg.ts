import type { Figure } from '../../types/figures'

export interface RenderedSegment {
  ax: number
  ay: number
  bx: number
  by: number
  radius: number
  isHead: boolean
  isTail: boolean
}

export function getRenderedSegments(_figure: Figure): RenderedSegment[] {
  return []
}

export function figureColors(_figure: Figure): { body: string; accent: string; detail: string } {
  return {
    body: '#d8b999',
    accent: '#8a6347',
    detail: '#5d3d2a',
  }
}
