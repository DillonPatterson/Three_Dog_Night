import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useStore } from '../store'
import { BED_DIMS, computeThermalField, formatDisplayTemp } from '../thermalEngine'
import { HeatmapCanvas } from './HeatmapCanvas'
import { Inspector } from './Inspector'
import { OccupantSprite } from './Sprites'

const PADDING = 28

function computeBedDisplay(widthIn: number, lengthIn: number, stageW: number, stageH: number) {
  const maxW = stageW - PADDING * 2
  const maxH = stageH - PADDING * 2
  const aspect = widthIn / lengthIn
  let width = maxW
  let height = width / aspect

  if (height > maxH) {
    height = maxH
    width = height * aspect
  }

  return {
    width: Math.floor(width),
    height: Math.floor(height),
  }
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}

export function BedCanvas() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 1000, height: 700 })

  const bedSize = useStore((state) => state.bedSize)
  const roomTempC = useStore((state) => state.roomTempC)
  const tempUnit = useStore((state) => state.tempUnit)
  const occupants = useStore((state) => state.occupants)
  const selectedId = useStore((state) => state.selectedId)
  const selectOccupant = useStore((state) => state.selectOccupant)
  const updateOccupant = useStore((state) => state.updateOccupant)
  const addOccupant = useStore((state) => state.addOccupant)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })

    observer.observe(stage)
    setStageSize({ width: stage.clientWidth, height: stage.clientHeight })
    return () => observer.disconnect()
  }, [])

  const dims = BED_DIMS[bedSize]
  const { width: bedW, height: bedH } = useMemo(
    () => computeBedDisplay(dims.widthIn, dims.lengthIn, stageSize.width, stageSize.height),
    [dims.lengthIn, dims.widthIn, stageSize.height, stageSize.width],
  )

  const debouncedBedSize = useDebounced(bedSize, 40)
  const debouncedRoomTempC = useDebounced(roomTempC, 40)
  const debouncedOccupants = useDebounced(occupants, 40)

  const thermalGrid = useMemo(
    () => computeThermalField(debouncedBedSize, debouncedRoomTempC, debouncedOccupants),
    [debouncedBedSize, debouncedOccupants, debouncedRoomTempC],
  )

  const dragRef = useRef<{
    id: string
    startMouseX: number
    startMouseY: number
    startX: number
    startY: number
  } | null>(null)

  const rotateRef = useRef<{
    id: string
    centerX: number
    centerY: number
    startAngle: number
    startRotation: number
  } | null>(null)

  const handleDragStart = useCallback((id: string, event: ReactPointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const occupant = useStore.getState().occupants.find((entry) => entry.id === id)
    if (!occupant) return

    dragRef.current = {
      id,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX: occupant.x,
      startY: occupant.y,
    }
  }, [])

  const handleRotateStart = useCallback((id: string, event: ReactPointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const occupant = useStore.getState().occupants.find((entry) => entry.id === id)
    if (!occupant || !stageRef.current) return

    const stageRect = stageRef.current.getBoundingClientRect()
    const bedLeft = stageRect.left + (stageSize.width - bedW) / 2
    const bedTop = stageRect.top + (stageSize.height - bedH) / 2
    const centerX = bedLeft + occupant.x * bedW
    const centerY = bedTop + occupant.y * bedH

    rotateRef.current = {
      id,
      centerX,
      centerY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
      startRotation: occupant.rotation,
    }
  }, [bedH, bedW, stageSize.height, stageSize.width])

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (dragRef.current) {
        const { id, startMouseX, startMouseY, startX, startY } = dragRef.current
        const dx = (event.clientX - startMouseX) / bedW
        const dy = (event.clientY - startMouseY) / bedH
        updateOccupant(id, {
          x: Math.max(0.04, Math.min(0.96, startX + dx)),
          y: Math.max(0.06, Math.min(0.94, startY + dy)),
        })
      }

      if (rotateRef.current) {
        const { id, centerX, centerY, startAngle, startRotation } = rotateRef.current
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX)
        const delta = ((angle - startAngle) * 180) / Math.PI
        updateOccupant(id, { rotation: (startRotation + delta + 360) % 360 })
      }
    }

    function handlePointerUp() {
      dragRef.current = null
      rotateRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [bedH, bedW, updateOccupant])

  const selectedOccupant = occupants.find((occupant) => occupant.id === selectedId) ?? null
  const bedLeft = (stageSize.width - bedW) / 2
  const bedTop = (stageSize.height - bedH) / 2
  const hasTwoPillows = dims.widthIn >= 60

  return (
    <div
      ref={stageRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#0f0b08',
      }}
      onPointerDown={() => selectOccupant(null)}
    >
      <div
        style={{
          position: 'absolute',
          left: bedLeft,
          top: bedTop,
          width: bedW,
          height: bedH,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
        }}
      >
        <svg width={bedW} height={bedH} viewBox={`0 0 ${bedW} ${bedH}`} style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <defs>
            <linearGradient id="frame-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a16b3f" />
              <stop offset="100%" stopColor="#6f4526" />
            </linearGradient>
            <linearGradient id="sheet-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8f2ea" />
              <stop offset="100%" stopColor="#eddfd2" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={bedW} height={bedH} rx={24} fill="url(#frame-grad)" />
          <rect x={12} y={14} width={bedW - 24} height={bedH - 24} rx={16} fill="url(#sheet-grad)" />
          <rect x={0} y={0} width={bedW} height={28} rx={24} fill="#87532f" />
          {hasTwoPillows ? (
            <>
              <rect x={bedW * 0.1} y={28} width={bedW * 0.34} height={bedH * 0.12} rx={14} fill="#efe5d9" stroke="#d5c9bc" />
              <rect x={bedW * 0.56} y={28} width={bedW * 0.34} height={bedH * 0.12} rx={14} fill="#efe5d9" stroke="#d5c9bc" />
            </>
          ) : (
            <rect x={bedW * 0.18} y={28} width={bedW * 0.64} height={bedH * 0.12} rx={14} fill="#efe5d9" stroke="#d5c9bc" />
          )}
        </svg>

        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          <HeatmapCanvas grid={thermalGrid} width={bedW} height={bedH} roomTempC={roomTempC} unit={tempUnit} />
        </div>

        <div style={{ position: 'absolute', inset: 0, zIndex: 2 }} onPointerDown={(event) => event.stopPropagation()}>
          {occupants.map((occupant) => (
            <OccupantSprite
              key={occupant.id}
              occupant={occupant}
              bedSize={bedSize}
              bedW={bedW}
              bedH={bedH}
              isSelected={occupant.id === selectedId}
              onSelect={() => selectOccupant(occupant.id)}
              onDragStart={(event) => handleDragStart(occupant.id, event)}
              onRotateStart={(event) => handleRotateStart(occupant.id, event)}
            />
          ))}
        </div>

        {occupants.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 16,
                background: 'rgba(20,14,10,0.62)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
                color: '#f3e6d4',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Empty bed</div>
              <div style={{ fontSize: 13, color: '#c7b7a5', marginBottom: 12 }}>
                Add a human, dog, or cat and watch the mattress heat field form.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', pointerEvents: 'auto' }}>
                <button onClick={() => addOccupant('human')} style={emptyButtonStyle}>Add human</button>
                <button onClick={() => addOccupant('dog')} style={emptyButtonStyle}>Add dog</button>
                <button onClick={() => addOccupant('cat')} style={emptyButtonStyle}>Add cat</button>
              </div>
            </div>
          </div>
        )}

        {occupants.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              zIndex: 4,
              background: 'rgba(18,13,9,0.72)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '8px 10px',
              pointerEvents: 'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: '#b7a48e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Bed surface
            </div>
            <div
              style={{
                width: 144,
                height: 10,
                borderRadius: 999,
                background: 'linear-gradient(to right, #497ebf, #6da8cc, #8ac8bc, #ece05a, #f7b43a, #f17b2f, #df4a26, #c21d21, #8e001c)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, fontSize: 10, color: '#d4c4b5' }}>
              <span>{formatDisplayTemp(18, tempUnit)}</span>
              <span>{formatDisplayTemp(27, tempUnit)}</span>
              <span>{formatDisplayTemp(35.5, tempUnit)}</span>
              <span>{formatDisplayTemp(39.5, tempUnit)}</span>
            </div>
          </div>
        )}
      </div>

      {selectedOccupant && <Inspector occupant={selectedOccupant} onClose={() => selectOccupant(null)} />}
    </div>
  )
}

const emptyButtonStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#2c2018',
  color: '#f4ead8',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
