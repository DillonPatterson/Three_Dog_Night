export interface HeatEmitter {
  figureId: string
  id: string
  cx: number
  cy: number
  sigma: number
  peakTemp: number
  weight: number
}

export interface OccupantThermalState {
  figureId: string
  x: number
  y: number
  warmthC: number
  surfacePeakC: number
  crowding: number
  contact: number
}

export interface ThermalScene {
  ambientTemp: number
  emitters: HeatEmitter[]
  occupants: OccupantThermalState[]
}

export interface Hotspot {
  x: number
  y: number
  tempC: number
}

export interface HeatLabel {
  x: number
  y: number
  tempC: number
  emphasis: 'ambient' | 'warm' | 'hot'
}

export interface ThermalGrid {
  data: Float32Array
  width: number
  height: number
  ambientTemp: number
  maxTemp: number
  hotspots: Hotspot[]
  labels: HeatLabel[]
}
