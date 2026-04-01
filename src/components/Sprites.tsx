import type { PointerEvent as ReactPointerEvent } from 'react'
import type { BedSize, Occupant } from '../thermalEngine'
import { BED_DIMS, footprintFracs } from '../thermalEngine'

interface SpriteProps {
  occupant: Occupant
  bedSize: BedSize
  bedW: number
  bedH: number
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: ReactPointerEvent) => void
  onRotateStart: (e: ReactPointerEvent) => void
}

function spritePixelSize(occupant: Occupant, bedSize: BedSize, bedW: number, bedH: number) {
  const dims = BED_DIMS[bedSize]
  const { hw, hl } = footprintFracs(occupant, dims)
  return {
    width: Math.max(34, hw * 2 * bedW),
    height: Math.max(40, hl * 2 * bedH),
  }
}

function HumanSprite({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 80 200" width="100%" height="100%">
      <ellipse cx="40" cy="104" rx="24" ry="72" fill="rgba(0,0,0,0.12)" transform="translate(4 5)" />
      <rect x="18" y="42" width="44" height="132" rx="22" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="40" cy="26" r="18" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="33" cy="23" r="2.4" fill={stroke} />
      <circle cx="47" cy="23" r="2.4" fill={stroke} />
      <path d="M 33 33 Q 40 38 47 33" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="24" y="64" width="32" height="70" rx="16" fill="rgba(255,255,255,0.14)" />
    </svg>
  )
}

function DogSprite({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 90 180" width="100%" height="100%">
      <ellipse cx="45" cy="96" rx="26" ry="62" fill="rgba(0,0,0,0.12)" transform="translate(4 5)" />
      <ellipse cx="45" cy="100" rx="26" ry="60" fill={fill} stroke={stroke} strokeWidth="2" />
      <ellipse cx="45" cy="34" rx="18" ry="17" fill={fill} stroke={stroke} strokeWidth="2" />
      <ellipse cx="31" cy="24" rx="6" ry="11" fill={stroke} opacity="0.4" />
      <ellipse cx="59" cy="24" rx="6" ry="11" fill={stroke} opacity="0.4" />
      <circle cx="38" cy="33" r="2.3" fill={stroke} />
      <circle cx="52" cy="33" r="2.3" fill={stroke} />
      <ellipse cx="45" cy="41" rx="5.6" ry="3.2" fill={stroke} opacity="0.7" />
      <path d="M 44 158 C 67 164 74 152 71 141" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

function CatSprite({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 82 168" width="100%" height="100%">
      <ellipse cx="41" cy="90" rx="24" ry="56" fill="rgba(0,0,0,0.12)" transform="translate(4 5)" />
      <ellipse cx="41" cy="92" rx="24" ry="54" fill={fill} stroke={stroke} strokeWidth="2" />
      <ellipse cx="41" cy="30" rx="16" ry="14" fill={fill} stroke={stroke} strokeWidth="2" />
      <polygon points="28,22 23,10 34,18" fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="54,22 59,10 48,18" fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="35" cy="30" r="2.1" fill={stroke} />
      <circle cx="47" cy="30" r="2.1" fill={stroke} />
      <path d="M 41 36 L 38 39 L 44 39 Z" fill={stroke} opacity="0.65" />
      <path d="M 42 145 C 67 152 70 132 61 121" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

function spriteColors(occupant: Occupant) {
  if (occupant.data.species === 'human') {
    return occupant.data.sex === 'F'
      ? { fill: '#f0cabd', stroke: '#6b4130' }
      : { fill: '#e3c39e', stroke: '#614226' }
  }

  if (occupant.data.species === 'dog') {
    return { fill: '#c9a36f', stroke: '#5f4123' }
  }

  return { fill: '#d8d1c8', stroke: '#52463c' }
}

export function OccupantSprite({
  occupant,
  bedSize,
  bedW,
  bedH,
  isSelected,
  onSelect,
  onDragStart,
  onRotateStart,
}: SpriteProps) {
  const { width, height } = spritePixelSize(occupant, bedSize, bedW, bedH)
  const { fill, stroke } = spriteColors(occupant)
  const left = occupant.x * bedW
  const top = occupant.y * bedH

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        transform: `translate(-50%, -50%) rotate(${occupant.rotation}deg)`,
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: isSelected ? 20 : 10,
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
        onSelect()
        onDragStart(event)
      }}
    >
      {occupant.data.species === 'human' && <HumanSprite fill={fill} stroke={stroke} />}
      {occupant.data.species === 'dog' && <DogSprite fill={fill} stroke={stroke} />}
      {occupant.data.species === 'cat' && <CatSprite fill={fill} stroke={stroke} />}

      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -4,
              border: '2px solid rgba(255,218,150,0.95)',
              borderRadius: 12,
              boxShadow: '0 0 0 3px rgba(255,196,92,0.25)',
              pointerEvents: 'none',
            }}
          />
          <button
            onPointerDown={(event) => {
              event.stopPropagation()
              onRotateStart(event)
            }}
            style={{
              position: 'absolute',
              top: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1px solid rgba(80,50,18,0.4)',
              background: '#ffe0a2',
              color: '#5a3514',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'grab',
              zIndex: 30,
            }}
          >
            R
          </button>
        </>
      )}
    </div>
  )
}
