import type {
  HumanPosePreset,
  DogPosePreset,
  CatPosePreset,
  PosePreset,
  PoseSliders,
  FigureType,
} from '../types/figures'

type SliderDefaults = Partial<PoseSliders> & Pick<PoseSliders, 'curl' | 'stretch' | 'head'>

const HUMAN_SLIDERS: Record<HumanPosePreset, SliderDefaults> = {
  back: {
    curl: 20,
    stretch: 45,
    head: 55,
    leftArm: 55,
    rightArm: 55,
    leftLeg: 48,
    rightLeg: 48,
  },
  side: {
    curl: 45,
    stretch: 38,
    head: 62,
    leftArm: 22,
    rightArm: 30,
    leftLeg: 32,
    rightLeg: 36,
  },
  curled: {
    curl: 86,
    stretch: 14,
    head: 28,
    leftArm: 8,
    rightArm: 8,
    leftLeg: 10,
    rightLeg: 10,
  },
  sprawled: {
    curl: 8,
    stretch: 86,
    head: 60,
    leftArm: 94,
    rightArm: 94,
    leftLeg: 90,
    rightLeg: 90,
  },
}

const DOG_SLIDERS: Record<DogPosePreset, SliderDefaults> = {
  curled: {
    curl: 92,
    stretch: 18,
    head: 18,
    frontLegs: 12,
    rearLegs: 10,
    tail: 18,
  },
  side: {
    curl: 45,
    stretch: 48,
    head: 50,
    frontLegs: 42,
    rearLegs: 46,
    tail: 42,
  },
  stretched: {
    curl: 10,
    stretch: 88,
    head: 82,
    frontLegs: 82,
    rearLegs: 84,
    tail: 86,
  },
  goblin: {
    curl: 35,
    stretch: 40,
    head: 70,
    frontLegs: 22,
    rearLegs: 68,
    tail: 48,
  },
}

const CAT_SLIDERS: Record<CatPosePreset, SliderDefaults> = {
  loaf: {
    curl: 55,
    stretch: 28,
    head: 32,
    frontLegs: 20,
    rearLegs: 18,
    tail: 24,
  },
  curled: {
    curl: 92,
    stretch: 16,
    head: 22,
    frontLegs: 14,
    rearLegs: 12,
    tail: 14,
  },
  stretched: {
    curl: 10,
    stretch: 90,
    head: 80,
    frontLegs: 78,
    rearLegs: 82,
    tail: 88,
  },
}

export function defaultPresetForType(type: FigureType): PosePreset {
  if (type === 'human') return 'side'
  if (type === 'dog') return 'side'
  return 'loaf'
}

export function defaultPoseSliders(type: FigureType, preset: PosePreset): PoseSliders {
  const source =
    type === 'human'
      ? HUMAN_SLIDERS[preset as HumanPosePreset]
      : type === 'dog'
      ? DOG_SLIDERS[preset as DogPosePreset]
      : CAT_SLIDERS[preset as CatPosePreset]

  return {
    curl: source?.curl ?? 45,
    stretch: source?.stretch ?? 45,
    head: source?.head ?? 50,
    leftArm: source?.leftArm,
    rightArm: source?.rightArm,
    leftLeg: source?.leftLeg,
    rightLeg: source?.rightLeg,
    frontLegs: source?.frontLegs,
    rearLegs: source?.rearLegs,
    tail: source?.tail,
  }
}
