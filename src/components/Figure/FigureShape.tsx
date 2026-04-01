import type { Figure } from '../../types/figures'
import { getFigureLayout } from '../../engine/figureLayout'

function humanPalette(figure: Figure) {
  if (figure.metadata.kind !== 'human') {
    return {
      skin: '#efc9ac',
      hair: '#6d584a',
      outfit: '#8ea6cf',
      outfitShade: '#7089b5',
      outline: 'rgba(88, 62, 43, 0.34)',
      shadow: 'rgba(79, 57, 38, 0.12)',
    }
  }

  if (figure.metadata.gender === 'female') {
    return {
      skin: '#f3d2bb',
      hair: '#8e5f67',
      outfit: '#d597a3',
      outfitShade: '#c07b8d',
      outline: 'rgba(87, 59, 48, 0.34)',
      shadow: 'rgba(82, 57, 38, 0.12)',
    }
  }

  if (figure.metadata.gender === 'male') {
    return {
      skin: '#efc7a3',
      hair: '#615043',
      outfit: '#89a9cf',
      outfitShade: '#6d8bb3',
      outline: 'rgba(83, 59, 42, 0.34)',
      shadow: 'rgba(78, 52, 34, 0.12)',
    }
  }

  return {
    skin: '#efc9ac',
    hair: '#6d584a',
    outfit: '#9f96d7',
    outfitShade: '#837abf',
    outline: 'rgba(88, 62, 43, 0.34)',
    shadow: 'rgba(78, 52, 34, 0.12)',
  }
}

function petPalette(figure: Figure) {
  if (figure.type === 'dog') {
    return {
      body: '#c69a62',
      shade: '#a9773f',
      accent: '#6b4927',
      outline: 'rgba(92, 64, 38, 0.34)',
      shadow: 'rgba(67, 47, 28, 0.12)',
    }
  }

  return {
    body: '#d8cabd',
    shade: '#c0ad9a',
    accent: '#8d7868',
    outline: 'rgba(86, 71, 60, 0.34)',
    shadow: 'rgba(57, 46, 37, 0.12)',
  }
}

function tailPath(start: { x: number; y: number }, control: { x: number; y: number }, end: { x: number; y: number }) {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
}

export function HumanShape({ figure }: { figure: Figure }) {
  const layout = getFigureLayout(figure)
  if (layout.kind !== 'human') return null
  const palette = humanPalette(figure)
  const bodyX = layout.body.center.x - layout.body.width / 2
  const bodyY = layout.body.center.y - layout.body.height / 2

  return (
    <>
      <ellipse
        cx={layout.body.center.x}
        cy={layout.body.center.y + 6}
        rx={layout.body.width * 0.62}
        ry={layout.body.height * 0.54}
        fill={palette.shadow}
      />
      <rect
        x={bodyX}
        y={bodyY}
        width={layout.body.width}
        height={layout.body.height}
        rx={layout.body.radius}
        fill={palette.outfit}
        stroke={palette.outline}
        strokeWidth="1.1"
      />
      <rect
        x={bodyX + 3}
        y={bodyY + 10}
        width={layout.body.width - 6}
        height={layout.body.height * 0.46}
        rx={layout.body.radius * 0.7}
        fill={palette.outfitShade}
        opacity={0.24}
      />
      <circle
        cx={layout.head.center.x}
        cy={layout.head.center.y}
        r={layout.head.radius}
        fill={palette.skin}
        stroke={palette.outline}
        strokeWidth="1"
      />
      <path
        d={`
          M ${layout.head.center.x - layout.head.radius * 0.96} ${layout.head.center.y - layout.head.radius * 0.12}
          Q ${layout.head.center.x} ${layout.head.center.y - layout.head.radius * 1.12}
          ${layout.head.center.x + layout.head.radius * 0.96} ${layout.head.center.y - layout.head.radius * 0.12}
        `}
        fill={palette.hair}
      />
      <circle cx={layout.head.center.x - layout.head.radius * 0.28} cy={layout.head.center.y - 1} r="1.15" fill={palette.outline} opacity="0.55" />
      <circle cx={layout.head.center.x + layout.head.radius * 0.28} cy={layout.head.center.y - 1} r="1.15" fill={palette.outline} opacity="0.55" />
      <path
        d={`M ${layout.head.center.x - 3.1} ${layout.head.center.y + layout.head.radius * 0.34} Q ${layout.head.center.x} ${layout.head.center.y + layout.head.radius * 0.52} ${layout.head.center.x + 3.1} ${layout.head.center.y + layout.head.radius * 0.34}`}
        fill="none"
        stroke={palette.outline}
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.45"
      />
    </>
  )
}

function PetShape({ figure }: { figure: Figure }) {
  const layout = getFigureLayout(figure)
  if (layout.kind !== 'pet') return null
  const palette = petPalette(figure)
  const bodyX = layout.body.center.x - layout.body.width / 2
  const bodyY = layout.body.center.y - layout.body.height / 2

  return (
    <>
      <ellipse
        cx={layout.body.center.x}
        cy={layout.body.center.y + 5}
        rx={layout.body.width * 0.58}
        ry={layout.body.height * 0.48}
        fill={palette.shadow}
      />
      <rect
        x={bodyX}
        y={bodyY}
        width={layout.body.width}
        height={layout.body.height}
        rx={layout.body.radius}
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth="1.05"
      />
      <rect
        x={bodyX + 3}
        y={bodyY + 8}
        width={layout.body.width - 6}
        height={layout.body.height * 0.4}
        rx={layout.body.radius * 0.7}
        fill={palette.shade}
        opacity={0.22}
      />
      <ellipse
        cx={layout.head.center.x}
        cy={layout.head.center.y}
        rx={layout.head.rx}
        ry={layout.head.ry}
        fill={palette.shade}
        stroke={palette.outline}
        strokeWidth="1"
      />
      {layout.species === 'dog' ? (
        <>
          <ellipse cx={layout.head.center.x - layout.head.rx * 0.7} cy={layout.head.center.y - layout.head.ry * 0.12} rx="3" ry="5.2" fill={palette.accent} opacity="0.88" />
          <ellipse cx={layout.head.center.x + layout.head.rx * 0.7} cy={layout.head.center.y - layout.head.ry * 0.12} rx="3" ry="5.2" fill={palette.accent} opacity="0.88" />
          <ellipse cx={layout.head.center.x} cy={layout.head.center.y + layout.head.ry * 0.42} rx={layout.head.rx * 0.42} ry={layout.head.ry * 0.3} fill={palette.body} stroke={palette.outline} strokeWidth="0.8" />
        </>
      ) : (
        <>
          <polygon
            points={`${layout.head.center.x - layout.head.rx * 0.62},${layout.head.center.y - layout.head.ry * 0.12} ${layout.head.center.x - layout.head.rx * 1.02},${layout.head.center.y - layout.head.ry * 1.02} ${layout.head.center.x - layout.head.rx * 0.2},${layout.head.center.y - layout.head.ry * 0.68}`}
            fill={palette.accent}
          />
          <polygon
            points={`${layout.head.center.x + layout.head.rx * 0.62},${layout.head.center.y - layout.head.ry * 0.12} ${layout.head.center.x + layout.head.rx * 1.02},${layout.head.center.y - layout.head.ry * 1.02} ${layout.head.center.x + layout.head.rx * 0.2},${layout.head.center.y - layout.head.ry * 0.68}`}
            fill={palette.accent}
          />
        </>
      )}
      <circle cx={layout.head.center.x - layout.head.rx * 0.24} cy={layout.head.center.y - 0.7} r="0.95" fill={palette.outline} opacity="0.56" />
      <circle cx={layout.head.center.x + layout.head.rx * 0.24} cy={layout.head.center.y - 0.7} r="0.95" fill={palette.outline} opacity="0.56" />
      <ellipse cx={layout.head.center.x} cy={layout.head.center.y + layout.head.ry * 0.18} rx="1.9" ry="1.3" fill={palette.outline} opacity="0.46" />
      <path
        d={tailPath(layout.tail.start, layout.tail.control, layout.tail.end)}
        fill="none"
        stroke={palette.outline}
        strokeWidth={layout.tail.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={tailPath(layout.tail.start, layout.tail.control, layout.tail.end)}
        fill="none"
        stroke={palette.accent}
        strokeWidth={layout.tail.width * 0.68}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
}

export function DogShape({ figure }: { figure: Figure }) {
  return <PetShape figure={figure} />
}

export function CatShape({ figure }: { figure: Figure }) {
  return <PetShape figure={figure} />
}
