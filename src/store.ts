import { create } from 'zustand'
import type { BedSize, OccupantData, Occupant, TempUnit } from './thermalEngine'
import { breedByName } from './thermalEngine'

let nextId = 1

function makeId(): string {
  return `occ-${nextId++}`
}

function defaultOccupantData(species: 'human' | 'dog' | 'cat'): OccupantData {
  if (species === 'human') {
    return {
      species: 'human',
      heightInches: 68,
      weightLbs: 160,
      ageRange: 'adult',
      sex: 'M',
      runsWarm: false,
      pose: 'straight',
    }
  }
  if (species === 'dog') {
    return {
      species: 'dog',
      breedName: 'Labrador',
      weightLbs: breedByName('Labrador').defaultWeightLbs,
      runsWarm: false,
      pose: 'side',
    }
  }
  return {
    species: 'cat',
    weightLbs: 9,
    runsWarm: false,
    pose: 'curled',
  }
}

function defaultName(species: 'human' | 'dog' | 'cat', existingCount: number): string {
  const humanNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan']
  const dogNames  = ['Buddy', 'Max', 'Bella', 'Charlie', 'Luna']
  const catNames  = ['Whisker', 'Luna', 'Mochi', 'Nala', 'Simba']
  const list = species === 'human' ? humanNames : species === 'dog' ? dogNames : catNames
  return list[existingCount % list.length]
}

// Spawn positions: spread occupants around the bed without perfect overlap
function spawnXY(index: number): { x: number; y: number } {
  const positions = [
    { x: 0.28, y: 0.50 },
    { x: 0.72, y: 0.50 },
    { x: 0.50, y: 0.50 },
    { x: 0.50, y: 0.75 },
    { x: 0.50, y: 0.25 },
    { x: 0.28, y: 0.75 },
    { x: 0.72, y: 0.25 },
  ]
  return positions[index % positions.length]
}

interface AppState {
  bedSize: BedSize
  roomTempC: number
  tempUnit: TempUnit
  occupants: Occupant[]
  selectedId: string | null

  setBedSize: (size: BedSize) => void
  setRoomTempC: (tempC: number) => void
  toggleTempUnit: () => void
  addOccupant: (species: 'human' | 'dog' | 'cat') => void
  removeOccupant: (id: string) => void
  updateOccupant: (id: string, patch: Partial<Omit<Occupant, 'id'>>) => void
  updateOccupantData: (id: string, patch: Partial<OccupantData>) => void
  selectOccupant: (id: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  bedSize: 'king',
  roomTempC: 20,
  tempUnit: 'F',
  occupants: [],
  selectedId: null,

  setBedSize: (size) => set({ bedSize: size }),

  setRoomTempC: (tempC) => set({ roomTempC: Math.max(15.5, Math.min(25.5, tempC)) }),
  toggleTempUnit: () => set((state) => ({ tempUnit: state.tempUnit === 'F' ? 'C' : 'F' })),

  addOccupant: (species) => set((state) => {
    const countOfSpecies = state.occupants.filter(o => o.data.species === species).length
    const { x, y } = spawnXY(state.occupants.length)
    const occ: Occupant = {
      id: makeId(),
      name: defaultName(species, countOfSpecies),
      x,
      y,
      rotation: 0,
      data: defaultOccupantData(species),
    }
    return { occupants: [...state.occupants, occ], selectedId: occ.id }
  }),

  removeOccupant: (id) => set((state) => ({
    occupants: state.occupants.filter(o => o.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId,
  })),

  updateOccupant: (id, patch) => set((state) => ({
    occupants: state.occupants.map(o => o.id === id ? { ...o, ...patch } : o),
  })),

  updateOccupantData: (id, patch) => set((state) => ({
    occupants: state.occupants.map(o =>
      o.id === id
        ? { ...o, data: { ...o.data, ...patch } as OccupantData }
        : o
    ),
  })),

  selectOccupant: (id) => set({ selectedId: id }),
}))
