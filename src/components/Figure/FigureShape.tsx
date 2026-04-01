import type { Figure } from '../../types/figures'
import type { LimbGeometry, LocalPoint } from '../../engine/figureLayout'
import { getFigureLayout } from '../../engine/figureLayout'

interface PetPalette {
  body: string
  bodyShade: string
  accent: string
  outline: string
  shadow: string
}

interface HumanPalette {
  skin: string
  skinShade: string
  pajama: string
  pajamaShade: string
  hair: string
  outline: string
  shadow: string
}

function paletteForHuman(figure: Figure): HumanPalette {
  const isFemale = figure.metadata.kind === 'human' && figure.metadata.gender === 'female'
  const isMale = figure.metadata.kind === 'human' && figure.metadata.gender === 'male'

  return isFemale
    ? {
        skin: '#f3d2bb',
        skinShade: '#e3b08b',
        pajama: '#d38d97',
        pajamaShade: '#b96d7b',
        hair: '#8d4e5b',
        outline: 'rgba(87, 59, 48, 0.42)',
        shadow: 'rgba(82, 57, 38, 0.17)',
      }
    : isMale
    ? {
        skin: '#efc7a3',
        skinShade: '#d89f74',
        pajama: '#7ea0c7',
        pajamaShade: '#5d7fa8',
        hair: '#5b4a3d',
        outline: 'rgba(83, 59, 42, 0.42)',
        shadow: 'rgba(78, 52, 34, 0.17)',
      }
    : {
        skin: '#efcbb0',
        skinShade: '#dea77d',
        pajama: '#998fd3',
        pajamaShade: '#786eb3',
        hair: '#6e5847',
        outline: 'rgba(88, 62, 43, 0.42)',
        shadow: 'rgba(78, 52, 34, 0.17)',
      }
}

function paletteForPet(figure: Figure): PetPalette {
  if (figure.type === 'dog' && figure.metadata.kind === 'dog') {
    const swatches: Record<string, PetPalette> = {
      SMALL_ROUND: {
        body: '#c98758',
        bodyShade: '#b16e3e',
        accent: '#6c3f21',
        outline: 'rgba(86, 56, 35, 0.42)',
        shadow: 'rgba(66, 40, 18, 0.16)',
      },
      MEDIUM_ATHLETIC: {
        body: '#bf9553',
        bodyShade: '#a97735',
        accent: '#654321',
        outline: 'rgba(90, 62, 40, 0.42)',
        shadow: 'rgba(63, 43, 18, 0.16)',
      },
      LARGE_BOXY: {
        body: '#989184',
        bodyShade: '#7e7668',
        accent: '#5b5148',
        outline: 'rgba(79, 69, 57, 0.42)',
        shadow: 'rgba(57, 46, 37, 0.16)',
      },
      LONG_LOW: {
        body: '#c9a065',
        bodyShade: '#b17c3a',
        accent: '#71421e',
        outline: 'rgba(93, 61, 35, 0.42)',
        shadow: 'rgba(66, 44, 22, 0.16)',
      },
      FLUFFY_WIDE: {
        body: '#ddd5cd',
        bodyShade: '#c6beb8',
        accent: '#8f8078',
        outline: 'rgba(98, 90, 82, 0.34)',
        shadow: 'rgba(55, 49, 42, 0.14)',
      },
    }

    return swatches[figure.metadata.breedArchetype] ?? swatches.MEDIUM_ATHLETIC
  }

  const catSwatches: Record<string, PetPalette> = {
    COMPACT: {
      body: '#d8c8b6',
      bodyShade: '#c0ab98',
      accent: '#8f7869',
      outline: 'rgba(92, 73, 60, 0.4)',
      shadow: 'rgba(62, 46, 35, 0.14)',
    },
    LONG: {
      body: '#cfc7bd',
      bodyShade: '#b0a69b',
      accent: '#7b6d63',
      outline: 'rgba(86, 76, 67, 0.38)',
      shadow: 'rgba(53, 45, 37, 0.14)',
    },
  }

  return catSwatches[
    figure.metadata.kind === 'cat' ? figure.metadata.catArchetype : 'COMPACT'
  ] ?? catSwatches.COMPACT
}

function midpoint(a: LocalPoint, b: LocalPoint): LocalPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function capsulePathBetween(start: LocalPoint, end: LocalPoint, width: number): string {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const radius = width / 2
  const px = (-dy / length) * radius
  const py = (dx / length) * radius

  return `
    M ${start.x + px} ${start.y + py}
    L ${end.x + px} ${end.y + py}
    A ${radius} ${radius} 0 0 1 ${end.x - px} ${end.y - py}
    L ${start.x - px} ${start.y - py}
    A ${radius} ${radius} 0 0 1 ${start.x + px} ${start.y + py}
    Z
  `
}

function TailStroke({
  limb,
  fill,
  outline,
}: {
  limb: LimbGeometry
  fill: string
  outline: string
}) {
  const path = `M ${limb.anchor.x} ${limb.anchor.y} Q ${limb.joint.x} ${limb.joint.y} ${limb.end.x} ${limb.end.y}`

  return (
    <>
      <path d={path} fill="none" stroke={outline} strokeLinecap="round" strokeLinejoin="round" strokeWidth={limb.radius * 2.1} />
      <path d={path} fill="none" stroke={fill} strokeLinecap="round" strokeLinejoin="round" strokeWidth={limb.radius * 1.65} />
    </>
  )
}

function SegmentedLimb({
  limb,
  fill,
  outline,
}: {
  limb: LimbGeometry
  fill: string
  outline: string
}) {
  const upperPath = capsulePathBetween(limb.anchor, limb.joint, limb.radius * 2.05)
  const lowerPath = capsulePathBetween(limb.joint, limb.end, limb.radius * 1.92)

  return (
    <>
      <path d={upperPath} fill={fill} stroke={outline} strokeWidth="0.95" />
      <path d={lowerPath} fill={fill} stroke={outline} strokeWidth="0.95" />
    </>
  )
}

function HumanBody({ figure }: { figure: Figure }) {
  const colors = paletteForHuman(figure)
  const layout = getFigureLayout(figure)
  if (layout.kind !== 'human') return null

  const shoulderCenter = midpoint(layout.leftArm.anchor, layout.rightArm.anchor)
  const hipCenter = midpoint(layout.leftLeg.anchor, layout.rightLeg.anchor)
  const torsoPath = capsulePathBetween(shoulderCenter, hipCenter, Math.max(layout.chest.rx * 2.02, 24))
  const neckPath = capsulePathBetween(
    { x: layout.head.center.x, y: layout.head.center.y + layout.head.ry * 0.84 },
    { x: shoulderCenter.x, y: shoulderCenter.y - 1.2 },
    5.8,
  )

  return (
    <>
      <ellipse cx="50" cy="95" rx={layout.hips.rx + 17} ry={layout.hips.ry + 34} fill={colors.shadow} />

      <SegmentedLimb limb={layout.leftArm} fill={colors.skin} outline={colors.outline} />
      <SegmentedLimb limb={layout.rightArm} fill={colors.skin} outline={colors.outline} />
      <SegmentedLimb limb={layout.leftLeg} fill={colors.skin} outline={colors.outline} />
      <SegmentedLimb limb={layout.rightLeg} fill={colors.skin} outline={colors.outline} />

      <path d={torsoPath} fill={colors.pajama} stroke={colors.outline} strokeWidth="1.2" />
      <ellipse
        cx={layout.chest.center.x}
        cy={layout.chest.center.y}
        rx={layout.chest.rx * 0.9}
        ry={layout.chest.ry * 0.72}
        fill={colors.pajamaShade}
        opacity={0.22}
      />
      <ellipse
        cx={layout.hips.center.x}
        cy={layout.hips.center.y}
        rx={layout.hips.rx * 0.94}
        ry={layout.hips.ry * 0.78}
        fill={colors.pajamaShade}
        opacity={0.16}
      />
      <path d={neckPath} fill={colors.skin} stroke={colors.outline} strokeWidth="0.8" />

      <ellipse
        cx={layout.head.center.x}
        cy={layout.head.center.y}
        rx={layout.head.rx * 1.05}
        ry={layout.head.ry * 1.05}
        fill={colors.skin}
        stroke={colors.outline}
        strokeWidth="1.2"
      />
      <path
        d={`
          M ${layout.head.center.x - layout.head.rx * 1.04} ${layout.head.center.y - layout.head.ry * 0.08}
          Q ${layout.head.center.x} ${layout.head.center.y - layout.head.ry * 1.24}
          ${layout.head.center.x + layout.head.rx * 1.04} ${layout.head.center.y - layout.head.ry * 0.08}
        `}
        fill={colors.hair}
        opacity={0.94}
      />
      <circle cx={layout.head.center.x - layout.head.rx * 0.26} cy={layout.head.center.y - layout.head.ry * 0.06} r="1.45" fill={colors.outline} opacity="0.58" />
      <circle cx={layout.head.center.x + layout.head.rx * 0.26} cy={layout.head.center.y - layout.head.ry * 0.06} r="1.45" fill={colors.outline} opacity="0.58" />
      <ellipse cx={layout.head.center.x} cy={layout.head.center.y + layout.head.ry * 0.12} rx="1.35" ry="1" fill={colors.skinShade} opacity="0.72" />
      <path
        d={`M ${layout.head.center.x - 3.3} ${layout.head.center.y + layout.head.ry * 0.44} Q ${layout.head.center.x} ${layout.head.center.y + layout.head.ry * 0.68} ${layout.head.center.x + 3.3} ${layout.head.center.y + layout.head.ry * 0.44}`}
        fill="none"
        stroke={colors.outline}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.46"
      />

      <circle cx={layout.leftArm.end.x} cy={layout.leftArm.end.y} r="3.5" fill={colors.skin} stroke={colors.outline} strokeWidth="0.7" />
      <circle cx={layout.rightArm.end.x} cy={layout.rightArm.end.y} r="3.5" fill={colors.skin} stroke={colors.outline} strokeWidth="0.7" />
      <ellipse cx={layout.leftLeg.end.x} cy={layout.leftLeg.end.y} rx="7.2" ry="4.2" fill={colors.skinShade} stroke={colors.outline} strokeWidth="0.7" />
      <ellipse cx={layout.rightLeg.end.x} cy={layout.rightLeg.end.y} rx="7.2" ry="4.2" fill={colors.skinShade} stroke={colors.outline} strokeWidth="0.7" />
    </>
  )
}

function PetBody({ figure }: { figure: Figure }) {
  const colors = paletteForPet(figure)
  const layout = getFigureLayout(figure)
  if (layout.kind !== 'pet') return null

  const rearCore = {
    x: layout.body.center.x,
    y: layout.body.center.y + layout.body.ry * 0.42,
  }
  const bodyPath = capsulePathBetween(layout.chest.center, rearCore, Math.max(layout.body.rx * 1.7, 18))

  return (
    <>
      <ellipse cx={layout.body.center.x} cy={layout.body.center.y} rx={layout.body.rx + 10} ry={layout.body.ry + 18} fill={colors.shadow} />

      <SegmentedLimb limb={layout.frontPaws} fill={colors.bodyShade} outline={colors.outline} />
      <SegmentedLimb limb={layout.rearPaws} fill={colors.bodyShade} outline={colors.outline} />
      <TailStroke limb={layout.tail} fill={colors.accent} outline={colors.outline} />

      <path d={bodyPath} fill={colors.body} stroke={colors.outline} strokeWidth="1.15" />
      <ellipse cx={layout.chest.center.x} cy={layout.chest.center.y} rx={layout.chest.rx} ry={layout.chest.ry} fill={colors.bodyShade} opacity={0.82} />
      <ellipse
        cx={layout.head.center.x}
        cy={layout.head.center.y}
        rx={layout.head.rx}
        ry={layout.head.ry}
        fill={colors.bodyShade}
        stroke={colors.outline}
        strokeWidth="1.05"
      />

      {layout.species === 'dog' ? (
        <>
          <ellipse
            cx={layout.head.center.x}
            cy={layout.head.center.y + layout.head.ry * 0.4}
            rx={layout.head.rx * 0.48}
            ry={layout.head.ry * 0.34}
            fill={colors.body}
            stroke={colors.outline}
            strokeWidth="0.85"
          />
          <ellipse cx={layout.head.center.x - layout.head.rx * 0.72} cy={layout.head.center.y - layout.head.ry * 0.36} rx="3.2" ry="5.2" fill={colors.accent} opacity="0.92" />
          <ellipse cx={layout.head.center.x + layout.head.rx * 0.72} cy={layout.head.center.y - layout.head.ry * 0.36} rx="3.2" ry="5.2" fill={colors.accent} opacity="0.92" />
        </>
      ) : (
        <>
          <polygon
            points={`${layout.head.center.x - layout.head.rx * 0.68},${layout.head.center.y - layout.head.ry * 0.16} ${layout.head.center.x - layout.head.rx * 1.08},${layout.head.center.y - layout.head.ry * 1.12} ${layout.head.center.x - layout.head.rx * 0.22},${layout.head.center.y - layout.head.ry * 0.84}`}
            fill={colors.accent}
          />
          <polygon
            points={`${layout.head.center.x + layout.head.rx * 0.68},${layout.head.center.y - layout.head.ry * 0.16} ${layout.head.center.x + layout.head.rx * 1.08},${layout.head.center.y - layout.head.ry * 1.12} ${layout.head.center.x + layout.head.rx * 0.22},${layout.head.center.y - layout.head.ry * 0.84}`}
            fill={colors.accent}
          />
        </>
      )}

      <circle cx={layout.head.center.x - layout.head.rx * 0.24} cy={layout.head.center.y - layout.head.ry * 0.06} r="1.15" fill={colors.outline} opacity="0.56" />
      <circle cx={layout.head.center.x + layout.head.rx * 0.24} cy={layout.head.center.y - layout.head.ry * 0.06} r="1.15" fill={colors.outline} opacity="0.56" />
      <ellipse cx={layout.head.center.x} cy={layout.head.center.y + layout.head.ry * 0.18} rx="2.5" ry="1.7" fill={colors.outline} opacity="0.46" />

      <circle cx={layout.frontPaws.end.x} cy={layout.frontPaws.end.y} r={layout.species === 'dog' ? 3.9 : 3.2} fill={colors.bodyShade} stroke={colors.outline} strokeWidth="0.65" />
      <circle cx={layout.rearPaws.end.x} cy={layout.rearPaws.end.y} r={layout.species === 'dog' ? 3.9 : 3.2} fill={colors.bodyShade} stroke={colors.outline} strokeWidth="0.65" />
    </>
  )
}

export function HumanShape({ figure }: { figure: Figure }) {
  return <HumanBody figure={figure} />
}

export function DogShape({ figure }: { figure: Figure }) {
  return <PetBody figure={figure} />
}

export function CatShape({ figure }: { figure: Figure }) {
  return <PetBody figure={figure} />
}
