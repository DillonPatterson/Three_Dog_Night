import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Figure as FigureType } from '../../types/figures'
import { useBedStore } from '../../store/bedStore'
import { getFigureBedScale } from '../../engine/figureLayout'
import { HumanShape, DogShape, CatShape } from './FigureShape'
import styles from './Figure.module.css'

interface Props {
  figure: FigureType
  bedW: number
  bedH: number
  bedWidthIn: number
  bedLengthIn: number
  isSelected: boolean
}

const VB_W = 100
const VB_H = 180

export function Figure({
  figure,
  bedW,
  bedH,
  bedWidthIn,
  bedLengthIn,
  isSelected,
}: Props) {
  const updatePosition = useBedStore((state) => state.updateFigurePosition)
  const selectFigure = useBedStore((state) => state.selectFigure)

  const [settling, setSettling] = useState(true)
  const dragStart = useRef({ mx: 0, my: 0, fx: 0, fy: 0 })
  const dragCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSettling(false), 220)
    return () => clearTimeout(timer)
  }, [])

  useEffect(
    () => () => {
      dragCleanupRef.current?.()
    },
    [],
  )

  const scale = useMemo(
    () => getFigureBedScale(figure, bedWidthIn, bedLengthIn),
    [figure, bedWidthIn, bedLengthIn],
  )
  const figW = Math.max(40, bedW * scale.width)
  const figH = Math.max(54, bedH * scale.height)
  const px = figure.rootPosition.x * bedW
  const py = figure.rootPosition.y * bedH
  const flip = figure.facingDirection === 'left' ? -1 : 1
  const rotDeg = (figure.rootRotation * 180) / Math.PI

  const bindPointerDrag = useCallback((onMove: (event: PointerEvent) => void) => {
    const handleMove = (moveEvent: PointerEvent) => onMove(moveEvent)

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      dragCleanupRef.current = null
    }

    dragCleanupRef.current?.()
    dragCleanupRef.current = handleUp
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }, [])

  const onBodyPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      selectFigure(figure.figureId)
      dragStart.current = {
        mx: event.clientX,
        my: event.clientY,
        fx: figure.rootPosition.x,
        fy: figure.rootPosition.y,
      }

      bindPointerDrag((moveEvent) => {
        updatePosition(
          figure.figureId,
          dragStart.current.fx + (moveEvent.clientX - dragStart.current.mx) / bedW,
          dragStart.current.fy + (moveEvent.clientY - dragStart.current.my) / bedH,
        )
      })
    },
    [bedH, bedW, bindPointerDrag, figure.figureId, figure.rootPosition.x, figure.rootPosition.y, selectFigure, updatePosition],
  )

  return (
    <div
      className={`${styles.root} ${isSelected ? styles.selected : ''} ${settling ? styles.settling : ''}`}
      style={{
        left: px,
        top: py,
        width: figW,
        height: figH,
        transform: `translate(-50%, -50%) rotate(${rotDeg}deg) scaleX(${flip})`,
      }}
      onPointerDown={onBodyPointerDown}
      onClick={(event) => event.stopPropagation()}
    >
      <svg width={figW} height={figH} viewBox={`0 0 ${VB_W} ${VB_H}`} overflow="visible">
        {isSelected ? (
          <ellipse
            cx="50"
            cy="92"
            rx="34"
            ry="68"
            fill="none"
            stroke="rgba(76, 168, 255, 0.65)"
            strokeWidth="2.5"
            strokeDasharray="8 6"
          />
        ) : null}

        {figure.type === 'human' ? (
          <HumanShape figure={figure} />
        ) : figure.type === 'dog' ? (
          <DogShape figure={figure} />
        ) : (
          <CatShape figure={figure} />
        )}
      </svg>
    </div>
  )
}
