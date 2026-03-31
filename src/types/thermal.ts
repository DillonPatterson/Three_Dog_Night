export interface HeatEmitter {
  figureId: string
  id: string
  cx: number
  cy: number
  sigma: number
  peakTemp: number
  weight: number
}

export interface ThermalScene {
  ambientTemp: number
  emitters: HeatEmitter[]
}

export interface Hotspot {
  x: number
  y: number
  tempC: number
}

export interface ThermalGrid {
  data: Float32Array
  width: number
  height: number
  ambientTemp: number
  maxTemp: number
  hotspots: Hotspot[]
}
