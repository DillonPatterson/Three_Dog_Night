interface RGB {
  r: number
  g: number
  b: number
}

const STOPS: Array<{ t: number; c: RGB }> = [
  { t: 0.0, c: { r: 43, g: 103, b: 214 } },
  { t: 0.16, c: { r: 54, g: 177, b: 229 } },
  { t: 0.34, c: { r: 73, g: 214, b: 176 } },
  { t: 0.54, c: { r: 236, g: 223, b: 96 } },
  { t: 0.74, c: { r: 243, g: 160, b: 79 } },
  { t: 1.0, c: { r: 221, g: 69, b: 58 } },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function heatmapColor(t: number, alpha = 0.72): string {
  const rgb = heatmapColorRGB(t)
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
}

export function heatmapColorRGB(t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t))

  let lo = STOPS[0]
  let hi = STOPS[STOPS.length - 1]

  for (let i = 0; i < STOPS.length - 1; i++) {
    if (clamped >= STOPS[i].t && clamped <= STOPS[i + 1].t) {
      lo = STOPS[i]
      hi = STOPS[i + 1]
      break
    }
  }

  const span = hi.t - lo.t
  const factor = span === 0 ? 0 : (clamped - lo.t) / span

  return {
    r: Math.round(lerp(lo.c.r, hi.c.r, factor)),
    g: Math.round(lerp(lo.c.g, hi.c.g, factor)),
    b: Math.round(lerp(lo.c.b, hi.c.b, factor)),
  }
}
