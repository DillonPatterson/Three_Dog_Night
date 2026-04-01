import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBedStore } from '../../store/bedStore'
import { useThermalStore } from '../../store/thermalStore'
import { computeThermalFromPose } from '../../engine/thermalBridge'
import { drawHeatmap, formatFieldTemperature, formatTemperature } from '../../engine/heatmapRenderer'
import { Figure } from '../Figure/Figure'
import styles from './BedScene.module.css'

const PADDING = 28

function bedDisplaySize(widthIn: number, lengthIn: number, maxW: number, maxH: number) {
  const aspect = widthIn / lengthIn
  let width = maxW
  let height = width / aspect

  if (height > maxH) {
    height = maxH
    width = height * aspect
  }

  return { w: Math.floor(width), h: Math.floor(height) }
}

export function BedScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 1000, h: 760 })

  const bedConfig = useBedStore((state) => state.bedConfig)
  const figures = useBedStore((state) => state.figures)
  const addFigure = useBedStore((state) => state.addFigure)
  const blanketZone = useBedStore((state) => state.blanketZone)
  const updateBlanketZone = useBedStore((state) => state.updateBlanketZone)
  const selectFigure = useBedStore((state) => state.selectFigure)
  const selectedFigureId = useBedStore((state) => state.selectedFigureId)

  const ambientTemp = useThermalStore((state) => state.ambientTemp)
  const useCelsius = useThermalStore((state) => state.useCelsius)
  const setScene = useThermalStore((state) => state.setScene)
  const grid = useThermalStore((state) => state.grid)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]
      if (next) {
        setContainerSize({ w: next.contentRect.width, h: next.contentRect.height })
      }
    })

    observer.observe(element)
    setContainerSize({ w: element.clientWidth, h: element.clientHeight })

    return () => observer.disconnect()
  }, [])

  const { w: bedW, h: bedH } = useMemo(
    () =>
      bedDisplaySize(
        bedConfig.widthIn,
        bedConfig.lengthIn,
        containerSize.w - PADDING * 2,
        containerSize.h - PADDING * 2,
      ),
    [bedConfig.lengthIn, bedConfig.widthIn, containerSize.h, containerSize.w],
  )

  useEffect(() => {
    setScene(computeThermalFromPose(figures, blanketZone, ambientTemp, bedConfig))
  }, [ambientTemp, bedConfig, blanketZone, figures, setScene])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(bedW * dpr)
    canvas.height = Math.floor(bedH * dpr)
    canvas.style.width = `${bedW}px`
    canvas.style.height = `${bedH}px`
    drawHeatmap(canvas, grid)
  }, [bedH, bedW, grid])

  const blanketDrag = useRef<{ mx: number; my: number; bx: number; by: number; width: number; height: number } | null>(null)

  const onBlanketPointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!blanketZone) return

    blanketDrag.current = {
      mx: event.clientX,
      my: event.clientY,
      bx: blanketZone.x,
      by: blanketZone.y,
      width: blanketZone.width,
      height: blanketZone.height,
    }

    const onMove = (moveEvent: PointerEvent) => {
      const drag = blanketDrag.current
      if (!drag) return

      updateBlanketZone({
        x: Math.max(0, Math.min(1 - drag.width, drag.bx + (moveEvent.clientX - drag.mx) / bedW)),
        y: Math.max(0, Math.min(1 - drag.height, drag.by + (moveEvent.clientY - drag.my) / bedH)),
      })
    }

    const onUp = () => {
      blanketDrag.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [bedH, bedW, blanketZone, updateBlanketZone])

  const twoPillows = bedConfig.widthIn >= 60
  const legendMid = (grid.ambientTemp + grid.maxTemp) / 2
  return (
    <div ref={containerRef} className={styles.container}>
      <div
        className={styles.bedWrapper}
        style={{ width: bedW, height: bedH }}
        onPointerDown={() => selectFigure(null)}
      >
        <svg className={styles.bedSvg} width={bedW} height={bedH} viewBox={`0 0 ${bedW} ${bedH}`}>
          <defs>
            <linearGradient id="frameWood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b57a47" />
              <stop offset="100%" stopColor="#8a552c" />
            </linearGradient>
            <linearGradient id="sheetFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fffaf5" />
              <stop offset="100%" stopColor="#f7f0ea" />
            </linearGradient>
          </defs>

          <rect x={0} y={0} width={bedW} height={bedH} rx={26} fill="url(#frameWood)" />
          <rect x={12} y={14} width={bedW - 24} height={bedH - 26} rx={20} fill="#efe3d5" />
          <rect x={16} y={18} width={bedW - 32} height={bedH - 34} rx={18} fill="url(#sheetFill)" />
          <rect x={0} y={0} width={bedW} height={22} rx={26} fill="#996139" />
          <path d={`M 20 22 H ${bedW - 20}`} stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" />

          {twoPillows ? (
            <>
              <rect x={bedW * 0.11} y={28} width={bedW * 0.33} height={bedH * 0.12} rx={16} fill="#ece2d5" stroke="#d7c8b6" />
              <rect x={bedW * 0.56} y={28} width={bedW * 0.33} height={bedH * 0.12} rx={16} fill="#ece2d5" stroke="#d7c8b6" />
            </>
          ) : (
            <rect x={bedW * 0.2} y={28} width={bedW * 0.6} height={bedH * 0.12} rx={16} fill="#ece2d5" stroke="#d7c8b6" />
          )}

          <g opacity="0.35">
            {Array.from({ length: 5 }).map((_, index) => (
              <path
                key={`sheet-h-${index}`}
                d={`M 24 ${bedH * (0.22 + index * 0.14)} H ${bedW - 24}`}
                stroke="#e6d8cb"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            ))}
            {Array.from({ length: 3 }).map((_, index) => (
              <path
                key={`sheet-v-${index}`}
                d={`M ${bedW * (0.28 + index * 0.22)} 24 V ${bedH - 24}`}
                stroke="#ede1d6"
                strokeWidth="1"
                strokeLinecap="round"
              />
            ))}
          </g>
        </svg>

        <canvas ref={canvasRef} className={styles.heatmapCanvas} />

        {grid.labels.map((label, index) => (
          <div
            key={`${label.x}-${label.y}-${index}`}
            className={`${styles.fieldLabel} ${label.emphasis === 'hot' ? styles.fieldLabelHot : label.emphasis === 'ambient' ? styles.fieldLabelAmbient : ''}`}
            style={{ left: label.x * bedW, top: label.y * bedH }}
          >
            {formatFieldTemperature(label.tempC, useCelsius)}
          </div>
        ))}

        {figures.length > 0 ? (
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Bed surface temperature</div>
            <div className={styles.legendScale} />
            <div className={styles.legendTicks}>
              <span>{formatTemperature(grid.ambientTemp, useCelsius)}</span>
              <span>{formatTemperature(legendMid, useCelsius)}</span>
              <span>{formatTemperature(grid.maxTemp, useCelsius)}</span>
            </div>
          </div>
        ) : (
          <div className={styles.emptyPrompt}>
            <div className={styles.emptyPromptTitle}>Empty bed.</div>
            <div className={styles.emptyPromptText}>Pick a size, add a sleeper, then drag them into place.</div>
            <div className={styles.emptyPromptActions}>
              <button className={styles.emptyPromptBtn} onPointerDown={(event) => event.stopPropagation()} onClick={() => addFigure('human')}>
                Add human
              </button>
              <button className={styles.emptyPromptBtn} onPointerDown={(event) => event.stopPropagation()} onClick={() => addFigure('dog')}>
                Add dog
              </button>
              <button className={styles.emptyPromptBtn} onPointerDown={(event) => event.stopPropagation()} onClick={() => addFigure('cat')}>
                Add cat
              </button>
            </div>
          </div>
        )}

        {blanketZone ? (
          <div
            className={styles.blanketOverlay}
            style={{
              left: blanketZone.x * bedW,
              top: blanketZone.y * bedH,
              width: blanketZone.width * bedW,
              height: blanketZone.height * bedH,
            }}
            onPointerDown={onBlanketPointerDown}
          >
            <span className={styles.blanketLabel}>{blanketZone.weight} blanket</span>
          </div>
        ) : null}

        <div className={styles.figureLayer}>
          {figures.map((figure) => (
            <Figure
              key={figure.figureId}
              figure={figure}
              bedW={bedW}
              bedH={bedH}
              bedWidthIn={bedConfig.widthIn}
              bedLengthIn={bedConfig.lengthIn}
              isSelected={figure.figureId === selectedFigureId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
