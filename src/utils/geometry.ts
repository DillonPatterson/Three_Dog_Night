export interface Point {
  x: number
  y: number
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
