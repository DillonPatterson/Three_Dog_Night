import type { DogArchetypeId, CatArchetypeId } from '../constants/breedArchetypes'

export interface PoseSliders {
  curl: number
  stretch: number
  head: number
  tail?: number
}

export type FigureType = 'human' | 'dog' | 'cat'

export interface HumanMeta {
  kind: 'human'
  height: number   // cm
  weight: number   // kg
  gender: string
  age: number
  runsWarm: boolean
}

export interface DogMeta {
  kind: 'dog'
  weight: number
  gender: string
  breed: string
  breedArchetype: DogArchetypeId
  runsWarm: boolean
}

export interface CatMeta {
  kind: 'cat'
  weight: number
  gender: string
  breed: string
  catArchetype: CatArchetypeId
  runsWarm: boolean
}

export type FigureMeta = HumanMeta | DogMeta | CatMeta

export type HumanPosePreset = 'back' | 'side' | 'curled' | 'sprawled'
export type DogPosePreset = 'curled' | 'side' | 'stretched' | 'goblin'
export type CatPosePreset = 'loaf' | 'curled' | 'stretched'
export type PosePreset = HumanPosePreset | DogPosePreset | CatPosePreset

export interface Figure {
  figureId: string
  type: FigureType
  rootPosition: { x: number; y: number }
  rootRotation: number
  facingDirection: 'left' | 'right'
  activePosePreset: PosePreset
  poseSliders: PoseSliders
  metadata: FigureMeta
}
