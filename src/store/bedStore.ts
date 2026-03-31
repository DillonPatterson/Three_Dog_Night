import { create } from 'zustand'
import type { Figure, FigureMeta, FigureType, PosePreset, PoseSliders } from '../types/figures'
import type { BedConfig, BedSize, BlanketZone } from '../types/bed'
import { defaultPoseSliders, defaultPresetForType } from '../constants/poseDefaults'

const BED_SIZES: Record<BedSize, { widthIn: number; lengthIn: number }> = {
  twin: { widthIn: 38, lengthIn: 75 },
  full: { widthIn: 54, lengthIn: 75 },
  queen: { widthIn: 60, lengthIn: 80 },
  king: { widthIn: 76, lengthIn: 80 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function randomId() {
  return Math.random().toString(36).slice(2, 9)
}

function defaultMetadata(type: FigureType): FigureMeta {
  if (type === 'human') {
    return {
      kind: 'human',
      height: 175,
      weight: 74,
      gender: 'person',
      age: 32,
    }
  }

  if (type === 'dog') {
    return {
      kind: 'dog',
      weight: 24,
      gender: 'female',
      breed: 'Shepherd mix',
      breedArchetype: 'MEDIUM_ATHLETIC',
    }
  }

  return {
    kind: 'cat',
    weight: 5,
    gender: 'female',
    breed: 'Tabby',
    catArchetype: 'COMPACT',
  }
}

function spawnPosition(index: number): { x: number; y: number } {
  const columns = 2
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    x: clamp(0.34 + col * 0.22 + row * 0.02, 0.2, 0.82),
    y: clamp(0.38 + row * 0.18, 0.28, 0.82),
  }
}

function createFigure(type: FigureType, count: number): Figure {
  const preset = defaultPresetForType(type)
  return {
    figureId: randomId(),
    type,
    rootPosition: spawnPosition(count),
    rootRotation: type === 'human' ? 0 : 0.08,
    facingDirection: count % 2 === 0 ? 'right' : 'left',
    activePosePreset: preset,
    poseSliders: defaultPoseSliders(type, preset),
    metadata: defaultMetadata(type),
  }
}

interface BedState {
  bedConfig: BedConfig
  figures: Figure[]
  blanketZone: BlanketZone | null
  selectedFigureId: string | null
  setBedSize: (size: BedSize) => void
  addFigure: (type: FigureType) => void
  removeFigure: (id: string) => void
  updateFigurePosition: (id: string, x: number, y: number) => void
  updateFigureRotation: (id: string, rotation: number) => void
  flipFigure: (id: string) => void
  setFigurePose: (id: string, preset: PosePreset) => void
  updateFigureSliders: (id: string, sliders: Partial<PoseSliders>) => void
  updateFigureMetadata: (id: string, metadata: FigureMeta) => void
  selectFigure: (id: string | null) => void
  setBlanketZone: (zone: BlanketZone | null) => void
  updateBlanketZone: (patch: Partial<BlanketZone>) => void
}

export const useBedStore = create<BedState>((set) => ({
  bedConfig: { size: 'queen', ...BED_SIZES.queen },
  figures: [],
  blanketZone: null,
  selectedFigureId: null,

  setBedSize: (size) => set({ bedConfig: { size, ...BED_SIZES[size] } }),

  addFigure: (type) =>
    set((state) => {
      const figure = createFigure(type, state.figures.length)
      return {
        figures: [...state.figures, figure],
        selectedFigureId: figure.figureId,
      }
    }),

  removeFigure: (id) =>
    set((state) => ({
      figures: state.figures.filter((figure) => figure.figureId !== id),
      selectedFigureId: state.selectedFigureId === id ? null : state.selectedFigureId,
    })),

  updateFigurePosition: (id, x, y) =>
    set((state) => ({
      figures: state.figures.map((figure) =>
        figure.figureId === id
          ? {
              ...figure,
              rootPosition: {
                x: clamp(x, 0.06, 0.94),
                y: clamp(y, 0.1, 0.94),
              },
            }
          : figure,
      ),
    })),

  updateFigureRotation: (id, rotation) =>
    set((state) => ({
      figures: state.figures.map((figure) =>
        figure.figureId === id ? { ...figure, rootRotation: rotation } : figure,
      ),
    })),

  flipFigure: (id) =>
    set((state) => ({
      figures: state.figures.map((figure) =>
        figure.figureId === id
          ? {
              ...figure,
              facingDirection: figure.facingDirection === 'left' ? 'right' : 'left',
            }
          : figure,
      ),
    })),

  setFigurePose: (id, preset) =>
    set((state) => ({
      figures: state.figures.map((figure) =>
        figure.figureId === id
          ? {
              ...figure,
              activePosePreset: preset,
              poseSliders: defaultPoseSliders(figure.type, preset),
            }
          : figure,
      ),
    })),

  updateFigureSliders: (id, sliders) =>
    set((state) => ({
      figures: state.figures.map((figure) =>
        figure.figureId === id
          ? {
              ...figure,
              poseSliders: {
                ...figure.poseSliders,
                ...sliders,
              },
            }
          : figure,
      ),
    })),

  updateFigureMetadata: (id, metadata) =>
    set((state) => ({
      figures: state.figures.map((figure) =>
        figure.figureId === id ? { ...figure, metadata } : figure,
      ),
    })),

  selectFigure: (id) => set({ selectedFigureId: id }),

  setBlanketZone: (zone) => set({ blanketZone: zone }),

  updateBlanketZone: (patch) =>
    set((state) => ({
      blanketZone: state.blanketZone ? { ...state.blanketZone, ...patch } : null,
    })),
}))
