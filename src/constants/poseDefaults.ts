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
  },
  side: {
    curl: 45,
    stretch: 38,
    head: 62,
  },
  curled: {
    curl: 86,
    stretch: 14,
    head: 28,
  },
  sprawled: {
    curl: 8,
    stretch: 86,
    head: 60,
  },
}

const DOG_SLIDERS: Record<DogPosePreset, SliderDefaults> = {
  curled: {
    curl: 92,
    stretch: 18,
    head: 18,
    tail: 18,
  },
  side: {
    curl: 45,
    stretch: 48,
    head: 50,
    tail: 42,
  },
  stretched: {
    curl: 10,
    stretch: 88,
    head: 82,
    tail: 86,
  },
  goblin: {
    curl: 35,
    stretch: 40,
    head: 70,
    tail: 48,
  },
}

const CAT_SLIDERS: Record<CatPosePreset, SliderDefaults> = {
  loaf: {
    curl: 55,
    stretch: 28,
    head: 32,
    tail: 24,
  },
  curled: {
    curl: 92,
    stretch: 16,
    head: 22,
    tail: 14,
  },
  stretched: {
    curl: 10,
    stretch: 90,
    head: 80,
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
    tail: source?.tail,
  }
}
