export type BedSize = 'twin' | 'full' | 'queen' | 'king'

export interface BedConfig {
  size: BedSize
  widthIn: number   // inches
  lengthIn: number  // inches
}

export type BlanketWeight = 'none' | 'light' | 'medium' | 'heavy'

export interface BlanketZone {
  x: number        // normalized 0-1
  y: number
  width: number    // normalized 0-1
  height: number
  weight: BlanketWeight
}
