import { create } from 'zustand'
import type { ThermalGrid, ThermalScene } from '../types/thermal'
import { computeGrid, GRID_W, GRID_H } from '../engine/heatmapRenderer'

function createEmptyGrid(ambientTemp: number): ThermalGrid {
  const data = new Float32Array(GRID_W * GRID_H)
  data.fill(ambientTemp)

  return {
    data,
    width: GRID_W,
    height: GRID_H,
    ambientTemp,
    maxTemp: ambientTemp,
    hotspots: [],
  }
}

interface ThermalState {
  ambientTemp: number
  useCelsius: boolean
  scene: ThermalScene | null
  grid: ThermalGrid
  setAmbientTemp: (temp: number) => void
  toggleUnit: () => void
  setScene: (scene: ThermalScene) => void
}

export const useThermalStore = create<ThermalState>((set) => ({
  ambientTemp: 20,
  useCelsius: false,
  scene: null,
  grid: createEmptyGrid(20),

  setAmbientTemp: (temp) => set({ ambientTemp: temp }),
  toggleUnit: () => set((state) => ({ useCelsius: !state.useCelsius })),

  setScene: (scene) => {
    set({
      scene,
      grid: computeGrid(scene),
    })
  },
}))
