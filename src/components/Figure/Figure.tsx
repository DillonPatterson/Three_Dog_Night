import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Figure as FigureType } from '../../types/figures'
import type { OccupantThermalState } from '../../types/thermal'
import { useBedStore } from '../../store/bedStore'
import { useThermalStore } from '../../store/thermalStore'
import { formatTemperature } from '../../engine/heatmapRenderer'
import { getFigureBedScale, getFigureLayout, type FigureHandle } from '../../engine/figureLayout'
import { HumanShape, DogShape, CatShape } from './FigureShape'
import styles from './Figure.module.css'

interface Props {
  figure: FigureType
  bedW: number
  bedH: number
  bedWidthIn: number
  bedLengthIn: number
  thermalState?: OccupantThermalState
  isSelected: boolean
}

const VB_W = 100
const VB_H = 180

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function sliderFromAngle(angle: number, start: number, end: number): number {
  const span = end - start || 1
  return clamp(((angle - start) / span) * 100, 0, 100)
}

function eventToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const matrix = svg.getScreenCTM()
  return matrix ? point.matrixTransform(matrix.inverse()) : { x: 50, y: 90 }
}

export function Figure({ figure, bedW, bedH, bedWidthIn, bedLengthIn, thermalState, isSelected }: Props) {
  const updatePosition = useBedStore((state) => state.updateFigurePosition)
  const updateRotation = useBedStore((state) => state.updateFigureRotation)
  const updateFigureSliders = useBedStore((state) => state.updateFigureSliders)
  const flipFigure = useBedStore((state) => state.flipFigure)
  const selectFigure = useBedStore((state) => state.selectFigure)
  const ambientTemp = useThermalStore((state) => state.ambientTemp)
  const useCelsius = useThermalStore((state) => state.useCelsius)

  const [settling, setSettling] = useState(true)
  const dragStart = useRef({ mx: 0, my: 0, fx: 0, fy: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSettling(false), 280)
    return () => clearTimeout(timer)
  }, [])

  const scale = useMemo(
    () => getFigureBedScale(figure, bedWidthIn, bedLengthIn),
    [figure, bedWidthIn, bedLengthIn],
  )
  const layout = useMemo(() => getFigureLayout(figure), [figure])

  const figW = Math.max(34, bedW * scale.width)
  const figH = Math.max(42, bedH * scale.height)
  const px = figure.rootPosition.x * bedW
  const py = figure.rootPosition.y * bedH
  const flip = figure.facingDirection === 'left' ? -1 : 1
  const rotDeg = (figure.rootRotation * 180) / Math.PI
  const warmthAnchor = layout.kind === 'human' ? layout.chest.center : layout.body.center
  const warmthTone = thermalState
    ? clamp((thermalState.warmthC - ambientTemp) / Math.max(1.5, 34 - ambientTemp), 0, 1)
    : 0

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    selectFigure(figure.figureId)
    dragStart.current = {
      mx: event.clientX,
      my: event.clientY,
      fx: figure.rootPosition.x,
      fy: figure.rootPosition.y,
    }

    const onMove = (moveEvent: MouseEvent) => {
      updatePosition(
        figure.figureId,
        dragStart.current.fx + (moveEvent.clientX - dragStart.current.mx) / bedW,
        dragStart.current.fy + (moveEvent.clientY - dragStart.current.my) / bedH,
      )
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [bedH, bedW, figure.figureId, figure.rootPosition.x, figure.rootPosition.y, selectFigure, updatePosition])

  const onRotateDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const startAngle = Math.atan2(event.clientY - cy, event.clientX - cx)
    const startRotation = figure.rootRotation

    const onMove = (moveEvent: MouseEvent) => {
      const angle = Math.atan2(moveEvent.clientY - cy, moveEvent.clientX - cx)
      updateRotation(figure.figureId, startRotation + angle - startAngle)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [figure.figureId, figure.rootRotation, updateRotation])

  const onHandleDown = useCallback((event: React.MouseEvent, handle: FigureHandle) => {
    event.preventDefault()
    event.stopPropagation()
    selectFigure(figure.figureId)

    const svg = svgRef.current
    if (!svg) return

    const onMove = (moveEvent: MouseEvent) => {
      const point = eventToSvgPoint(svg, moveEvent.clientX, moveEvent.clientY)
      const dx = point.x - handle.anchor.x
      const dy = point.y - handle.anchor.y
      const angle = Math.atan2(dx, dy)
      const curl = clamp(figure.poseSliders.curl / 100, 0, 1)

      if (handle.control === 'leftArm') {
        updateFigureSliders(figure.figureId, {
          leftArm: sliderFromAngle(angle - curl * 0.15, 0.45, -1.25),
        })
        return
      }

      if (handle.control === 'rightArm') {
        updateFigureSliders(figure.figureId, {
          rightArm: sliderFromAngle(angle + curl * 0.15, -0.45, 1.25),
        })
        return
      }

      if (handle.control === 'leftLeg') {
        updateFigureSliders(figure.figureId, {
          leftLeg: sliderFromAngle(angle + curl * 0.3, 0.22, -0.85),
        })
        return
      }

      if (handle.control === 'rightLeg') {
        updateFigureSliders(figure.figureId, {
          rightLeg: sliderFromAngle(angle - curl * 0.3, -0.22, 0.85),
        })
        return
      }

      if (handle.control === 'frontLegs') {
        updateFigureSliders(figure.figureId, {
          frontLegs: sliderFromAngle(angle + curl * 0.55, 0.25, -0.18),
        })
        return
      }

      if (handle.control === 'rearLegs') {
        updateFigureSliders(figure.figureId, {
          rearLegs: sliderFromAngle(angle - curl * 0.55, -0.25, 0.18),
        })
        return
      }

      if (handle.control === 'tail') {
        updateFigureSliders(figure.figureId, {
          tail: sliderFromAngle(angle, -0.85, 0.55),
        })
        return
      }

      if (handle.control === 'head' && layout.kind === 'pet') {
        const reach = clamp((handle.anchor.y - point.y - layout.chest.ry - 18 + curl * 7) / 12, 0, 1)
        updateFigureSliders(figure.figureId, {
          head: reach * 100,
        })
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [figure.figureId, figure.poseSliders.curl, layout, selectFigure, updateFigureSliders])

  const onFlip = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    flipFigure(figure.figureId)
  }, [figure.figureId, flipFigure])

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
      onMouseDown={onMouseDown}
    >
      <svg ref={svgRef} width={figW} height={figH} viewBox={`0 0 ${VB_W} ${VB_H}`} overflow="visible">
        {isSelected ? (
          <ellipse
            cx="50"
            cy="90"
            rx="43"
            ry="82"
            fill="none"
            stroke="rgba(76, 168, 255, 0.65)"
            strokeWidth="3"
            strokeDasharray="9 6"
          />
        ) : null}

        {figure.type === 'human' ? <HumanShape figure={figure} /> : figure.type === 'dog' ? <DogShape figure={figure} /> : <CatShape figure={figure} />}

        {isSelected
          ? layout.handles.map((handle) => (
              <g
                key={handle.id}
                className={styles.handle}
                transform={`translate(${handle.point.x}, ${handle.point.y})`}
                onMouseDown={(event) => onHandleDown(event, handle)}
              >
                <line
                  x1={handle.anchor.x - handle.point.x}
                  y1={handle.anchor.y - handle.point.y}
                  x2="0"
                  y2="0"
                  stroke="rgba(65, 135, 236, 0.5)"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
                <circle r="7.5" fill="rgba(72, 154, 255, 0.24)" stroke="rgba(72, 154, 255, 0.7)" strokeWidth="1.2" />
                <circle r="3.2" fill="#ffffff" />
              </g>
            ))
          : null}

        {isSelected ? (
          <g className={styles.rotateHandle} transform="translate(50, 10)" onMouseDown={onRotateDown}>
            <circle r="9" fill="rgba(50, 104, 212, 0.92)" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M -3 -1 A 5 5 0 1 1 2 4" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M 1 0 L 5 0 L 5 4" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}

        {isSelected ? (
          <g className={styles.flipBtn} transform="translate(84, 16)" onMouseDown={onFlip}>
            <circle r="8.5" fill="rgba(245, 131, 109, 0.95)" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M -4 0 H 4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M -4 0 L -1 -3" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M -4 0 L -1 3" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 4 0 L 1 -3" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 4 0 L 1 3" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ) : null}
      </svg>

      {thermalState ? (
        <div
          className={styles.warmthBubble}
          style={{
            left: `${warmthAnchor.x}%`,
            top: `${(warmthAnchor.y / VB_H) * 100}%`,
            transform: `translate(-50%, -50%) scaleX(${flip})`,
            background: `rgba(${Math.round(255 - warmthTone * 40)}, ${Math.round(248 - warmthTone * 70)}, ${Math.round(241 - warmthTone * 150)}, 0.96)`,
            borderColor: `rgba(${Math.round(214 + warmthTone * 18)}, ${Math.round(150 + warmthTone * 12)}, ${Math.round(98 - warmthTone * 22)}, 0.92)`,
          }}
        >
          <span className={styles.warmthLabel}>Warm</span>
          <span className={styles.warmthValue}>{formatTemperature(thermalState.warmthC, useCelsius)}</span>
        </div>
      ) : null}
    </div>
  )
}
