import { useBedStore } from '../../store/bedStore'
import { useThermalStore } from '../../store/thermalStore'
import type { BedSize, BlanketWeight } from '../../types/bed'
import { formatTemperature } from '../../engine/heatmapRenderer'
import styles from './Controls.module.css'

const BED_SIZES: Array<{ id: BedSize; label: string }> = [
  { id: 'twin', label: 'Twin' },
  { id: 'full', label: 'Full' },
  { id: 'queen', label: 'Queen' },
  { id: 'king', label: 'King' },
]

const BLANKET_WEIGHTS: Array<{ id: BlanketWeight; label: string }> = [
  { id: 'none', label: 'No blanket' },
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'heavy', label: 'Heavy' },
]

function figureSummary(figure: ReturnType<typeof useBedStore.getState>['figures'][0]): string {
  if (figure.metadata.kind === 'human') {
    return `${figure.metadata.height} cm, ${figure.metadata.weight} kg`
  }

  if (figure.metadata.kind === 'dog') {
    return `${figure.metadata.breed}, ${figure.metadata.weight} kg`
  }

  return `${figure.metadata.breed}, ${figure.metadata.weight} kg`
}

function figureLabel(figure: ReturnType<typeof useBedStore.getState>['figures'][0]): string {
  if (figure.type === 'human') return 'Human'
  if (figure.type === 'dog') return 'Dog'
  return 'Cat'
}

export function Controls() {
  const bedConfig = useBedStore((state) => state.bedConfig)
  const setBedSize = useBedStore((state) => state.setBedSize)
  const figures = useBedStore((state) => state.figures)
  const addFigure = useBedStore((state) => state.addFigure)
  const selectedFigureId = useBedStore((state) => state.selectedFigureId)
  const selectFigure = useBedStore((state) => state.selectFigure)
  const blanketZone = useBedStore((state) => state.blanketZone)
  const setBlanketZone = useBedStore((state) => state.setBlanketZone)
  const updateBlanketZone = useBedStore((state) => state.updateBlanketZone)

  const ambientTemp = useThermalStore((state) => state.ambientTemp)
  const setAmbientTemp = useThermalStore((state) => state.setAmbientTemp)
  const useCelsius = useThermalStore((state) => state.useCelsius)
  const toggleUnit = useThermalStore((state) => state.toggleUnit)
  const grid = useThermalStore((state) => state.grid)

  return (
    <div className={styles.sidebar}>
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Bed</div>
        <div className={styles.bedSizeGrid}>
          {BED_SIZES.map((size) => (
            <button
              key={size.id}
              className={`${styles.sizeBtn} ${bedConfig.size === size.id ? styles.active : ''}`}
              onClick={() => setBedSize(size.id)}
            >
              {size.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Sleepers</div>
          <div className={styles.sectionHint}>Add first. Edit after.</div>
        </div>
        <div className={styles.quickAddRow}>
          <button className={styles.addBtn} onClick={() => addFigure('human')}>
            Add human
          </button>
          <button className={styles.addBtn} onClick={() => addFigure('dog')}>
            Add dog
          </button>
          <button className={styles.addBtn} onClick={() => addFigure('cat')}>
            Add cat
          </button>
        </div>

        {figures.length === 0 ? (
          <div className={styles.emptyState}>
            Start with an empty bed, drop in a sleeper, then drag them around.
          </div>
        ) : (
          <div className={styles.occupantList}>
            {figures.map((figure) => (
              <button
                key={figure.figureId}
                className={`${styles.occupantItem} ${figure.figureId === selectedFigureId ? styles.selected : ''}`}
                onClick={() => selectFigure(figure.figureId)}
              >
                <span className={styles.occupantType}>{figureLabel(figure)}</span>
                <span className={styles.occupantMeta}>{figureSummary(figure)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Blanket</div>
          <div className={styles.sectionHint}>Drag it on the bed.</div>
        </div>
        <div className={styles.blanketRow}>
          {BLANKET_WEIGHTS.map((weight) => (
            <button
              key={weight.id}
              className={`${styles.blanketBtn} ${blanketZone?.weight === weight.id ? styles.active : ''} ${weight.id === 'none' && !blanketZone ? styles.active : ''}`}
              onClick={() => {
                if (weight.id === 'none') {
                  setBlanketZone(null)
                  return
                }

                if (!blanketZone) {
                  setBlanketZone({
                    x: 0.08,
                    y: 0.34,
                    width: 0.84,
                    height: 0.56,
                    weight: weight.id,
                  })
                  return
                }

                updateBlanketZone({ weight: weight.id })
              }}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Room</div>
          <div className={styles.sectionHint}>
            Warmest patch: {formatTemperature(grid.maxTemp, useCelsius)}
          </div>
        </div>
        <div className={styles.sliderLabel}>
          <span>Ambient</span>
          <span>{formatTemperature(ambientTemp, useCelsius)}</span>
        </div>
        <input
          type="range"
          className={styles.slider}
          min={14}
          max={30}
          value={ambientTemp}
          onChange={(event) => setAmbientTemp(Number(event.target.value))}
        />
        <button className={styles.unitToggle} onClick={toggleUnit}>
          Show in {useCelsius ? 'Fahrenheit' : 'Celsius'}
        </button>
      </section>
    </div>
  )
}
