export type CoatLength = 'short' | 'medium' | 'long'

export interface DogArchetype {
  id: string
  label: string
  description: string
  weightRange: [number, number]  // kg
  coat: CoatLength
  thermalMultiplier: number
  coatMultiplier: number
}

export interface CatArchetype {
  id: string
  label: string
  description: string
  weightRange: [number, number]
  coat: CoatLength
  thermalMultiplier: number
  coatMultiplier: number
}

const coatMultipliers: Record<CoatLength, number> = {
  short: 1.0,
  medium: 0.85,
  long: 0.7,
}

export const DOG_ARCHETYPES: Record<string, DogArchetype> = {
  SMALL_ROUND: {
    id: 'SMALL_ROUND',
    label: 'Small & Round',
    description: 'Chihuahua class',
    weightRange: [2, 6],
    coat: 'short',
    thermalMultiplier: 1.1,
    coatMultiplier: coatMultipliers.short,
  },
  MEDIUM_ATHLETIC: {
    id: 'MEDIUM_ATHLETIC',
    label: 'Medium Athletic',
    description: 'Lab / Shepherd class',
    weightRange: [18, 35],
    coat: 'short',
    thermalMultiplier: 1.0,
    coatMultiplier: coatMultipliers.short,
  },
  LARGE_BOXY: {
    id: 'LARGE_BOXY',
    label: 'Large & Boxy',
    description: 'Dane / Mastiff class',
    weightRange: [40, 90],
    coat: 'short',
    thermalMultiplier: 0.9,
    coatMultiplier: coatMultipliers.short,
  },
  LONG_LOW: {
    id: 'LONG_LOW',
    label: 'Long & Low',
    description: 'Dachshund / Basset class',
    weightRange: [7, 15],
    coat: 'medium',
    thermalMultiplier: 1.05,
    coatMultiplier: coatMultipliers.medium,
  },
  FLUFFY_WIDE: {
    id: 'FLUFFY_WIDE',
    label: 'Fluffy & Wide',
    description: 'Husky / Samoyed class',
    weightRange: [20, 35],
    coat: 'long',
    thermalMultiplier: 0.75,
    coatMultiplier: coatMultipliers.long,
  },
}

export const CAT_ARCHETYPES: Record<string, CatArchetype> = {
  COMPACT: {
    id: 'COMPACT',
    label: 'Compact',
    description: 'Persian / British Shorthair class',
    weightRange: [3, 6],
    coat: 'short',
    thermalMultiplier: 1.0,
    coatMultiplier: coatMultipliers.short,
  },
  LONG: {
    id: 'LONG',
    label: 'Long',
    description: 'Maine Coon / Ragdoll class',
    weightRange: [5, 10],
    coat: 'long',
    thermalMultiplier: 0.9,
    coatMultiplier: coatMultipliers.long,
  },
}

export type DogArchetypeId = keyof typeof DOG_ARCHETYPES
export type CatArchetypeId = keyof typeof CAT_ARCHETYPES
