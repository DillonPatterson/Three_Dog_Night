import type { CSSProperties } from 'react'
import { useStore } from '../store'
import { fahrenheitToCelsius, formatDisplayTemp, type BedSize } from '../thermalEngine'

const BED_SIZES: Array<{ key: BedSize; label: string }> = [
  { key: 'twin', label: 'Twin' },
  { key: 'full', label: 'Full' },
  { key: 'queen', label: 'Queen' },
  { key: 'king', label: 'King' },
]

const addButtons = [
  { species: 'human' as const, label: 'Add human' },
  { species: 'dog' as const, label: 'Add dog' },
  { species: 'cat' as const, label: 'Add cat' },
]

export function TopBar() {
  const bedSize = useStore((state) => state.bedSize)
  const roomTempC = useStore((state) => state.roomTempC)
  const tempUnit = useStore((state) => state.tempUnit)
  const setBedSize = useStore((state) => state.setBedSize)
  const setRoomTempC = useStore((state) => state.setRoomTempC)
  const toggleTempUnit = useStore((state) => state.toggleTempUnit)
  const addOccupant = useStore((state) => state.addOccupant)

  const stepC = tempUnit === 'C' ? 1 : fahrenheitToCelsius(33) - fahrenheitToCelsius(32)

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 18px',
        background: '#17110c',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#f0dfc8', lineHeight: 1 }}>
          Three Dog Night
        </div>
        <div style={{ fontSize: 12, color: '#9f8b78' }}>Bed heatmap in real units</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {BED_SIZES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setBedSize(key)}
            style={{
              padding: '7px 12px',
              background: bedSize === key ? '#f0dfc8' : '#241a13',
              border: `1px solid ${bedSize === key ? '#f0dfc8' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 999,
              color: bedSize === key ? '#1d140e' : '#d0c0b0',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: '#241a13',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999,
        }}
      >
        <span style={{ fontSize: 12, color: '#b9a892', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Room
        </span>
        <button onClick={() => setRoomTempC(roomTempC - stepC)} style={roundButtonStyle}>
          -
        </button>
        <span style={{ minWidth: 64, textAlign: 'center', color: '#fff3e0', fontSize: 14, fontWeight: 700 }}>
          {formatDisplayTemp(roomTempC, tempUnit)}
        </span>
        <button onClick={() => setRoomTempC(roomTempC + stepC)} style={roundButtonStyle}>
          +
        </button>
        <button
          onClick={toggleTempUnit}
          style={{
            marginLeft: 4,
            padding: '5px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.14)',
            background: '#120d09',
            color: '#f0dfc8',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {tempUnit === 'F' ? 'Show °C' : 'Show °F'}
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {addButtons.map(({ species, label }) => (
          <button
            key={species}
            onClick={() => addOccupant(species)}
            style={{
              padding: '8px 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#2d2017',
              color: '#f0dfc8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}

const roundButtonStyle: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.14)',
  background: '#120d09',
  color: '#f0dfc8',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  lineHeight: 1,
}
