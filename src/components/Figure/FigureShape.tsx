import type { Figure } from '../../types/figures'
import type { LimbGeometry } from '../../engine/figureLayout'
import { getFigureLayout } from '../../engine/figureLayout'

interface ShapeColors {
  body: string
  bodyShade: string
  accent: string
  outline: string
  shadow: string
}

function paletteForFigure(figure: Figure): ShapeColors {
  if (figure.type === 'human') {
    const tone =
      figure.metadata.kind === 'human' && figure.metadata.gender === 'female'
        ? { body: '#f4cfae', bodyShade: '#e7b58a', accent: '#b65d6e' }
        : figure.metadata.kind === 'human' && figure.metadata.gender === 'male'
        ? { body: '#efc59d', bodyShade: '#dfab7d', accent: '#4d6d97' }
        : { body: '#f0c9a5', bodyShade: '#e2b087', accent: '#7d7cb4' }

    return {
      ...tone,
      outline: 'rgba(88, 62, 43, 0.45)',
      shadow: 'rgba(78, 52, 34, 0.18)',
    }
  }

  if (figure.type === 'dog' && figure.metadata.kind === 'dog') {
    const arch = figure.metadata.breedArchetype
    const swatches: Record<string, ShapeColors> = {
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

    return swatches[arch] ?? swatches.MEDIUM_ATHLETIC
  }

  const catSwatches: Record<string, ShapeColors> = {
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

function limbPath(limb: LimbGeometry): string {
  return `M ${limb.anchor.x} ${limb.anchor.y} Q ${limb.joint.x} ${limb.joint.y} ${limb.end.x} ${limb.end.y}`
}

function Limb({
  limb,
  fill,
  outline,
  detail,
}: {
  limb: LimbGeometry
  fill: string
  outline: string
  detail?: string
}) {
  const path = limbPath(limb)

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={outline}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={limb.radius * 2.35}
      />
      <path
        d={path}
        fill="none"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={limb.radius * 2}
      />
      {detail ? (
        <path
          d={path}
          fill="none"
          stroke={detail}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={Math.max(1.8, limb.radius * 0.6)}
          opacity={0.45}
        />
      ) : null}
    </>
  )
}

function HumanBody({ figure }: { figure: Figure }) {
  const colors = paletteForFigure(figure)
  const layout = getFigureLayout(figure)
  if (layout.kind !== 'human') return null

  return (
    <>
      <ellipse
        cx="50"
        cy="95"
        rx={layout.hips.rx + 16}
        ry={layout.hips.ry + 34}
        fill={colors.shadow}
      />

      <Limb limb={layout.leftArm} fill={colors.body} outline={colors.outline} detail={colors.bodyShade} />
      <Limb limb={layout.rightArm} fill={colors.body} outline={colors.outline} detail={colors.bodyShade} />
      <Limb limb={layout.leftLeg} fill={colors.body} outline={colors.outline} detail={colors.bodyShade} />
      <Limb limb={layout.rightLeg} fill={colors.body} outline={colors.outline} detail={colors.bodyShade} />

      <ellipse
        cx={layout.hips.center.x}
        cy={layout.hips.center.y}
        rx={layout.hips.rx}
        ry={layout.hips.ry}
        fill={colors.bodyShade}
        stroke={colors.outline}
        strokeWidth="1.5"
      />
      <ellipse
        cx={layout.chest.center.x}
        cy={layout.chest.center.y}
        rx={layout.chest.rx}
        ry={layout.chest.ry}
        fill={colors.body}
        stroke={colors.outline}
        strokeWidth="1.5"
      />
      <path
        d={`
          M ${layout.chest.center.x - layout.chest.rx * 0.7} ${layout.chest.center.y - layout.chest.ry * 0.25}
          Q ${layout.chest.center.x} ${layout.chest.center.y - layout.chest.ry * 0.5}
          ${layout.chest.center.x + layout.chest.rx * 0.7} ${layout.chest.center.y - layout.chest.ry * 0.25}
        `}
        fill="none"
        stroke={colors.bodyShade}
        strokeWidth="4"
        strokeLinecap="round"
        opacity={0.55}
      />
      <ellipse
        cx={layout.head.center.x}
        cy={layout.head.center.y}
        rx={layout.head.rx}
        ry={layout.head.ry}
        fill={colors.body}
        stroke={colors.outline}
        strokeWidth="1.4"
      />
      <path
        d={`
          M ${layout.head.center.x - layout.head.rx * 0.8} ${layout.head.center.y - layout.head.ry * 0.55}
          Q ${layout.head.center.x} ${layout.head.center.y - layout.head.ry * 1.15}
          ${layout.head.center.x + layout.head.rx * 0.8} ${layout.head.center.y - layout.head.ry * 0.55}
        `}
        fill="none"
        stroke={colors.accent}
        strokeWidth="5"
        strokeLinecap="round"
        opacity={0.8}
      />
      <ellipse
        cx={layout.head.center.x}
        cy={layout.head.center.y + layout.head.ry * 0.2}
        rx="2.8"
        ry="1.8"
        fill={colors.outline}
        opacity={0.38}
      />
    </>
  )
}

function PetBody({ figure }: { figure: Figure }) {
  const colors = paletteForFigure(figure)
  const layout = getFigureLayout(figure)
  if (layout.kind !== 'pet') return null

  return (
    <>
      <ellipse
        cx={layout.body.center.x}
        cy={layout.body.center.y}
        rx={layout.body.rx + 10}
        ry={layout.body.ry + 18}
        fill={colors.shadow}
      />

      <Limb limb={layout.frontPaws} fill={colors.bodyShade} outline={colors.outline} />
      <Limb limb={layout.rearPaws} fill={colors.bodyShade} outline={colors.outline} />
      <Limb limb={layout.tail} fill={colors.accent} outline={colors.outline} />

      <ellipse
        cx={layout.body.center.x}
        cy={layout.body.center.y}
        rx={layout.body.rx}
        ry={layout.body.ry}
        fill={colors.body}
        stroke={colors.outline}
        strokeWidth="1.4"
      />
      <ellipse
        cx={layout.chest.center.x}
        cy={layout.chest.center.y}
        rx={layout.chest.rx}
        ry={layout.chest.ry}
        fill={colors.bodyShade}
        opacity={0.8}
      />
      <ellipse
        cx={layout.head.center.x}
        cy={layout.head.center.y}
        rx={layout.head.rx}
        ry={layout.head.ry}
        fill={colors.bodyShade}
        stroke={colors.outline}
        strokeWidth="1.3"
      />

      {layout.species === 'dog' ? (
        <>
          <ellipse
            cx={layout.head.center.x}
            cy={layout.head.center.y + layout.head.ry * 0.45}
            rx={layout.head.rx * 0.45}
            ry={layout.head.ry * 0.36}
            fill={colors.body}
            stroke={colors.outline}
            strokeWidth="1"
          />
          <ellipse
            cx={layout.head.center.x - layout.head.rx * 0.58}
            cy={layout.head.center.y - layout.head.ry * 0.55}
            rx="3.4"
            ry="5.8"
            fill={colors.accent}
          />
          <ellipse
            cx={layout.head.center.x + layout.head.rx * 0.58}
            cy={layout.head.center.y - layout.head.ry * 0.55}
            rx="3.4"
            ry="5.8"
            fill={colors.accent}
          />
        </>
      ) : (
        <>
          <polygon
            points={`${layout.head.center.x - layout.head.rx * 0.72},${layout.head.center.y - layout.head.ry * 0.2} ${layout.head.center.x - layout.head.rx * 1.05},${layout.head.center.y - layout.head.ry * 1.18} ${layout.head.center.x - layout.head.rx * 0.2},${layout.head.center.y - layout.head.ry * 0.86}`}
            fill={colors.accent}
          />
          <polygon
            points={`${layout.head.center.x + layout.head.rx * 0.72},${layout.head.center.y - layout.head.ry * 0.2} ${layout.head.center.x + layout.head.rx * 1.05},${layout.head.center.y - layout.head.ry * 1.18} ${layout.head.center.x + layout.head.rx * 0.2},${layout.head.center.y - layout.head.ry * 0.86}`}
            fill={colors.accent}
          />
        </>
      )}

      <ellipse
        cx={layout.head.center.x}
        cy={layout.head.center.y + layout.head.ry * 0.18}
        rx="2.3"
        ry="1.5"
        fill={colors.outline}
        opacity={0.42}
      />
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
