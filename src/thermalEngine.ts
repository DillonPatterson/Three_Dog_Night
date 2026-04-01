export type BedSize = 'twin' | 'full' | 'queen' | 'king'
export type TempUnit = 'F' | 'C'
export type Species = 'human' | 'dog' | 'cat'
export type HumanPose = 'straight' | 'side' | 'fetal' | 'diagonal'
export type DogPose = 'sprawled' | 'curled' | 'side'
export type CatPose = 'curled' | 'sprawled' | 'loaf'
export type AgeRange = 'child' | 'adult' | 'senior'

export interface BedDimensions {
  widthIn: number
  lengthIn: number
  gridCols: number
  gridRows: number
}

export const BED_DIMS: Record<BedSize, BedDimensions> = {
  twin: { widthIn: 38, lengthIn: 75, gridCols: 30, gridRows: 40 },
  full: { widthIn: 54, lengthIn: 75, gridCols: 43, gridRows: 40 },
  queen: { widthIn: 60, lengthIn: 80, gridCols: 47, gridRows: 40 },
  king: { widthIn: 76, lengthIn: 80, gridCols: 60, gridRows: 40 },
}

export interface DogBreedSpec {
  name: string
  defaultWeightLbs: number
  coatFactor: number
}

export const DOG_BREEDS: DogBreedSpec[] = [
  { name: 'Chihuahua', defaultWeightLbs: 4, coatFactor: 1.0 },
  { name: 'Dachshund', defaultWeightLbs: 18, coatFactor: 1.0 },
  { name: 'Beagle', defaultWeightLbs: 22, coatFactor: 1.2 },
  { name: 'Bulldog', defaultWeightLbs: 45, coatFactor: 1.1 },
  { name: 'Labrador', defaultWeightLbs: 65, coatFactor: 1.2 },
  { name: 'Golden Retriever', defaultWeightLbs: 65, coatFactor: 1.5 },
  { name: 'German Shepherd', defaultWeightLbs: 70, coatFactor: 1.5 },
  { name: 'Husky', defaultWeightLbs: 50, coatFactor: 1.8 },
  { name: 'Bernese Mountain Dog', defaultWeightLbs: 95, coatFactor: 1.9 },
  { name: 'Great Dane', defaultWeightLbs: 140, coatFactor: 1.0 },
  { name: 'Poodle', defaultWeightLbs: 55, coatFactor: 1.2 },
  { name: 'Corgi', defaultWeightLbs: 28, coatFactor: 1.4 },
  { name: 'Boxer', defaultWeightLbs: 65, coatFactor: 1.0 },
  { name: 'Shih Tzu', defaultWeightLbs: 12, coatFactor: 1.4 },
  { name: 'Mixed/Other', defaultWeightLbs: 40, coatFactor: 1.2 },
]

export function breedByName(name: string): DogBreedSpec {
  return DOG_BREEDS.find((breed) => breed.name === name) ?? DOG_BREEDS[DOG_BREEDS.length - 1]
}

export interface HumanData {
  species: 'human'
  heightInches: number
  weightLbs: number
  ageRange: AgeRange
  sex: 'M' | 'F'
  runsWarm: boolean
  pose: HumanPose
}

export interface DogData {
  species: 'dog'
  breedName: string
  weightLbs: number
  runsWarm: boolean
  pose: DogPose
}

export interface CatData {
  species: 'cat'
  weightLbs: number
  runsWarm: boolean
  pose: CatPose
}

export type OccupantData = HumanData | DogData | CatData

export interface Occupant {
  id: string
  name: string
  x: number
  y: number
  rotation: number
  data: OccupantData
}

export function fahrenheitToCelsius(tempF: number): number {
  return (tempF - 32) * (5 / 9)
}

export function celsiusToFahrenheit(tempC: number): number {
  return tempC * (9 / 5) + 32
}

export function toDisplayTemp(tempC: number, unit: TempUnit): number {
  return unit === 'C' ? tempC : celsiusToFahrenheit(tempC)
}

export function formatDisplayTemp(tempC: number, unit: TempUnit, rounded = true): string {
  const value = toDisplayTemp(tempC, unit)
  const suffix = unit === 'C' ? '\u00B0C' : '\u00B0F'
  return `${rounded ? Math.round(value) : value.toFixed(1)}${suffix}`
}

export function bodyTempC(occupant: Occupant): number {
  const { data } = occupant

  if (data.species === 'human') {
    let base = 36.8
    if (data.runsWarm) base += 0.2
    if (data.ageRange === 'child') base += 0.15
    if (data.ageRange === 'senior') base -= 0.12
    if (data.sex === 'F') base += 0.05
    return Math.min(Math.max(base, 36.4), 37.3)
  }

  if (data.species === 'dog') {
    const breed = breedByName(data.breedName)
    let base = 38.6 + Math.min(0.25, Math.sqrt(data.weightLbs / 60) * 0.14)
    if (breed.coatFactor >= 1.6) base -= 0.08
    if (data.runsWarm) base += 0.16
    return Math.min(Math.max(base, 37.9), 39.3)
  }

  let base = 38.7 + (data.weightLbs > 10 ? 0.08 : 0)
  if (data.runsWarm) base += 0.14
  return Math.min(Math.max(base, 38.0), 39.2)
}

export function contactTempC(occupant: Occupant): number {
  const { data } = occupant
  const bodyTemp = bodyTempC(occupant)

  if (data.species === 'human') {
    let base = bodyTemp - 3.6
    if (data.pose === 'fetal') base += 0.55
    if (data.pose === 'side') base += 0.2
    if (data.pose === 'diagonal') base += 0.1
    if (data.runsWarm) base += 0.45
    base += Math.min(0.4, Math.max(0, (data.weightLbs - 150) / 260))
    return Math.min(Math.max(base, 32.5), 35.3)
  }

  if (data.species === 'dog') {
    const breed = breedByName(data.breedName)
    let base = bodyTemp - (breed.coatFactor >= 1.6 ? 3.7 : 3.1)
    if (data.pose === 'curled') base += 0.4
    if (data.pose === 'sprawled') base -= 0.2
    if (data.runsWarm) base += 0.3
    return Math.min(Math.max(base, 34.3), 37.1)
  }

  let base = bodyTemp - 3.35
  if (data.pose === 'curled') base += 0.45
  if (data.pose === 'loaf') base += 0.28
  if (data.runsWarm) base += 0.28
  return Math.min(Math.max(base, 34.1), 36.7)
}

export function footprintFracs(
  occupant: Occupant,
  dims: BedDimensions,
): { hw: number; hl: number } {
  const { widthIn, lengthIn } = dims
  const { data } = occupant

  if (data.species === 'human') {
    const bodyLenIn = data.heightInches * 0.91
    const bodyWidthIn =
      data.heightInches * (data.sex === 'M' ? 0.235 : 0.222) *
      (1 + Math.max(0, (data.weightLbs - 150) / 360))
    let hl = (bodyLenIn / lengthIn) * 0.5
    let hw = (bodyWidthIn / widthIn) * 0.5
    switch (data.pose) {
      case 'fetal':
        hl *= 0.62
        hw *= 0.84
        break
      case 'side':
        hl *= 0.88
        hw *= 0.74
        break
      case 'diagonal':
        hl *= 0.84
        hw *= 0.9
        break
      case 'straight':
        break
    }
    return { hw: Math.min(hw, 0.26), hl: Math.min(hl, 0.47) }
  }

  if (data.species === 'dog') {
    const breed = breedByName(data.breedName)
    const weightKg = data.weightLbs / 2.205
    const bodyLenIn = (33 + Math.pow(weightKg, 0.78) * 7.4) / 2.54
    const bodyWidthIn = (16 + Math.pow(weightKg, 0.65) * 4.4 * Math.sqrt(breed.coatFactor)) / 2.54
    let hl = (bodyLenIn / lengthIn) * 0.5
    let hw = (bodyWidthIn / widthIn) * 0.5
    switch (data.pose) {
      case 'curled': {
        const radius = Math.min(hl, hw) * 0.84
        hl = radius
        hw = radius
        break
      }
      case 'sprawled':
        hl *= 0.8
        hw *= 1.18
        break
      case 'side':
        break
    }
    return { hw: Math.min(hw, 0.23), hl: Math.min(hl, 0.35) }
  }

  const weightKg = data.weightLbs / 2.205
  const bodyLenIn = (28 + Math.pow(weightKg, 0.72) * 5.8) / 2.54
  const bodyWidthIn = (12 + Math.pow(weightKg, 0.6) * 3.4) / 2.54
  let hl = (bodyLenIn / lengthIn) * 0.5
  let hw = (bodyWidthIn / widthIn) * 0.5
  switch (data.pose) {
    case 'curled': {
      const radius = Math.min(hl, hw) * 0.86
      hl = radius
      hw = radius
      break
    }
    case 'sprawled':
      hl *= 0.88
      hw *= 1.12
      break
    case 'loaf':
      hl *= 0.68
      hw *= 0.9
      break
  }
  return { hw: Math.min(hw, 0.16), hl: Math.min(hl, 0.22) }
}

function diffuseOnce(grid: Float32Array<ArrayBufferLike>, cols: number, rows: number): Float32Array<ArrayBufferLike> {
  const next: Float32Array<ArrayBufferLike> = new Float32Array(grid.length)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let total = grid[row * cols + col] * 5
      let weight = 5

      const neighbors: Array<[number, number, number]> = [
        [row - 1, col, 2],
        [row + 1, col, 2],
        [row, col - 1, 2],
        [row, col + 1, 2],
        [row - 1, col - 1, 1],
        [row - 1, col + 1, 1],
        [row + 1, col - 1, 1],
        [row + 1, col + 1, 1],
      ]

      for (const [nextRow, nextCol, sampleWeight] of neighbors) {
        if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
          total += grid[nextRow * cols + nextCol] * sampleWeight
          weight += sampleWeight
        }
      }

      next[row * cols + col] = total / weight
    }
  }

  return next
}

export function computeThermalField(
  bedSize: BedSize,
  roomTempC: number,
  occupants: Occupant[],
): number[][] {
  const dims = BED_DIMS[bedSize]
  const { gridCols: cols, gridRows: rows } = dims
  const baseTempC = roomTempC + 1.0
  const size = cols * rows
  const grid: Float32Array<ArrayBufferLike> = new Float32Array(size).fill(baseTempC)
  const sourceFloor: Float32Array<ArrayBufferLike> = new Float32Array(size).fill(baseTempC)

  for (const occupant of occupants) {
    const peakTempC = contactTempC(occupant)
    const delta = peakTempC - baseTempC
    if (delta <= 0) continue

    const { hw, hl } = footprintFracs(occupant, dims)
    const cx = occupant.x * cols
    const cy = occupant.y * rows
    const hrx = hw * cols
    const hry = hl * rows
    const rotationRad = (occupant.rotation * Math.PI) / 180
    const cosR = Math.cos(rotationRad)
    const sinR = Math.sin(rotationRad)

    const margin = Math.ceil(Math.max(hrx, hry) * 3.1) + 2
    const colMin = Math.max(0, Math.floor(cx - margin))
    const colMax = Math.min(cols - 1, Math.ceil(cx + margin))
    const rowMin = Math.max(0, Math.floor(cy - margin))
    const rowMax = Math.min(rows - 1, Math.ceil(cy + margin))

    for (let row = rowMin; row <= rowMax; row++) {
      for (let col = colMin; col <= colMax; col++) {
        const dx = col - cx
        const dy = row - cy
        const localX = dx * cosR + dy * sinR
        const localY = -dx * sinR + dy * cosR
        const ellipseDistance = Math.sqrt((localX / hrx) ** 2 + (localY / hry) ** 2)

        let contribution = 0
        if (ellipseDistance <= 1) {
          const t = 1 - ellipseDistance
          contribution = delta * (0.58 + 0.42 * t * t)
        } else if (ellipseDistance <= 2.6) {
          const t = 1 - (ellipseDistance - 1) / 1.6
          contribution = delta * 0.24 * t * t
        }

        if (contribution <= 0) continue

        const index = row * cols + col
        grid[index] += contribution
        if (ellipseDistance <= 1) {
          sourceFloor[index] = Math.max(sourceFloor[index], Math.min(39.5, baseTempC + contribution))
        }
      }
    }
  }

  for (let index = 0; index < size; index++) {
    grid[index] = Math.min(39.5, grid[index])
  }

  let current: Float32Array<ArrayBufferLike> = grid
  for (let pass = 0; pass < 4; pass++) {
    const next = diffuseOnce(current, cols, rows)
    for (let index = 0; index < size; index++) {
      next[index] = Math.max(sourceFloor[index], Math.max(baseTempC - 0.2, next[index]))
    }
    current = next
  }

  const result: number[][] = []
  for (let row = 0; row < rows; row++) {
    result.push(Array.from(current.subarray(row * cols, (row + 1) * cols)))
  }
  return result
}
