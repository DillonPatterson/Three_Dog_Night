// Heatmap color scale: cool blue → teal → yellow → orange → red
// t is normalized 0-1

interface RGB { r: number; g: number; b: number }

const STOPS: Array<{ t: number; c: RGB }> = [
  { t: 0.00, c: { r: 74,  g: 142, b: 248 } },
  { t: 0.24, c: { r: 103, g: 210, b: 236 } },
  { t: 0.50, c: { r: 246, g: 223, b: 108 } },
  { t: 0.76, c: { r: 243, g: 154, b: 87  } },
  { t: 1.00, c: { r: 235, g: 82,  b: 69  } },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function heatmapColor(t: number, alpha = 0.72): string {
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
  const f = span === 0 ? 0 : (clamped - lo.t) / span

  const r = Math.round(lerp(lo.c.r, hi.c.r, f))
  const g = Math.round(lerp(lo.c.g, hi.c.g, f))
  const b = Math.round(lerp(lo.c.b, hi.c.b, f))

  return `rgba(${r},${g},${b},${alpha})`
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
  const f = span === 0 ? 0 : (clamped - lo.t) / span

  return {
    r: Math.round(lerp(lo.c.r, hi.c.r, f)),
    g: Math.round(lerp(lo.c.g, hi.c.g, f)),
    b: Math.round(lerp(lo.c.b, hi.c.b, f)),
  }
}
