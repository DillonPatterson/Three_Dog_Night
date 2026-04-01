import { useBedStore } from '../../store/bedStore'
import { useThermalStore } from '../../store/thermalStore'
import { formatTemperature } from '../../engine/heatmapRenderer'
import type { CatMeta, DogMeta, FigureMeta, HumanMeta, PosePreset } from '../../types/figures'
import styles from './PosePanel.module.css'

const HUMAN_PRESETS: Array<{ id: PosePreset; label: string }> = [
  { id: 'back', label: 'Back' },
  { id: 'side', label: 'Side' },
  { id: 'curled', label: 'Curled' },
  { id: 'sprawled', label: 'Sprawled' },
]

const DOG_PRESETS: Array<{ id: PosePreset; label: string }> = [
  { id: 'curled', label: 'Curled' },
  { id: 'side', label: 'Side' },
  { id: 'stretched', label: 'Stretched' },
  { id: 'goblin', label: 'Goblin' },
]

const CAT_PRESETS: Array<{ id: PosePreset; label: string }> = [
  { id: 'loaf', label: 'Loaf' },
  { id: 'curled', label: 'Curled' },
  { id: 'stretched', label: 'Stretched' },
]

function clampNumber(value: string, min: number, max: number, fallback: number): number {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function titleForFigure(figure: ReturnType<typeof useBedStore.getState>['figures'][0]): string {
  if (figure.metadata.kind === 'human') return 'Human'
  if (figure.metadata.kind === 'dog') return figure.metadata.breed || 'Dog'
  return figure.metadata.breed || 'Cat'
}

function toggleRunsWarm(metadata: FigureMeta): FigureMeta {
  return {
    ...metadata,
    runsWarm: !metadata.runsWarm,
  }
}

export function PosePanel() {
  const figures = useBedStore((state) => state.figures)
  const selectedFigureId = useBedStore((state) => state.selectedFigureId)
  const setFigurePose = useBedStore((state) => state.setFigurePose)
  const updateFigureRotation = useBedStore((state) => state.updateFigureRotation)
  const updateFigureMetadata = useBedStore((state) => state.updateFigureMetadata)
  const removeFigure = useBedStore((state) => state.removeFigure)
  const flipFigure = useBedStore((state) => state.flipFigure)
  const scene = useThermalStore((state) => state.scene)
  const useCelsius = useThermalStore((state) => state.useCelsius)

  const figure = figures.find((entry) => entry.figureId === selectedFigureId)
  const thermalState = scene?.occupants.find((occupant) => occupant.figureId === selectedFigureId)

  if (!figure) {
    return (
      <div className={`${styles.panel} ${styles.emptyPanel}`}>
        <div className={styles.emptyTitle}>Nothing selected.</div>
        <div className={styles.emptyText}>
          Add a sleeper, drag it on the bed, then edit details here.
        </div>
      </div>
    )
  }

  const presets =
    figure.type === 'human'
      ? HUMAN_PRESETS
      : figure.type === 'dog'
      ? DOG_PRESETS
      : CAT_PRESETS

  const syncMetadata = (metadata: FigureMeta) => {
    updateFigureMetadata(figure.figureId, metadata)
  }

  const humanMeta = figure.metadata.kind === 'human' ? figure.metadata : null
  const dogMeta = figure.metadata.kind === 'dog' ? figure.metadata : null
  const catMeta = figure.metadata.kind === 'cat' ? figure.metadata : null
  const rotate = (deltaDegrees: number) =>
    updateFigureRotation(figure.figureId, figure.rootRotation + (deltaDegrees * Math.PI) / 180)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{titleForFigure(figure)}</div>
          <div className={styles.hint}>
            Drag on the bed to move. Local warmth is the sleeper microclimate, not exact body temperature.
          </div>
        </div>
        <button className={styles.removeBtn} onClick={() => removeFigure(figure.figureId)}>
          Remove
        </button>
      </div>

      {thermalState ? (
        <section className={styles.card}>
          <div className={styles.cardTitle}>Temperatures</div>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Local warmth</span>
              <span className={styles.metricValue}>{formatTemperature(thermalState.warmthC, useCelsius)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Bed surface</span>
              <span className={styles.metricValue}>{formatTemperature(thermalState.surfacePeakC, useCelsius)}</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.card}>
        <div className={styles.cardTitle}>Quick actions</div>
        <div className={styles.actionGrid}>
          <button className={styles.actionBtn} onClick={() => rotate(-15)}>
            Rotate left
          </button>
          <button className={styles.actionBtn} onClick={() => rotate(15)}>
            Rotate right
          </button>
          <button className={styles.actionBtn} onClick={() => flipFigure(figure.figureId)}>
            Flip
          </button>
          <button
            className={`${styles.actionBtn} ${figure.metadata.runsWarm ? styles.actionBtnActive : ''}`}
            onClick={() => syncMetadata(toggleRunsWarm(figure.metadata))}
          >
            {figure.metadata.runsWarm ? 'Runs warm on' : 'Runs warm off'}
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>Pose presets</div>
        <div className={styles.presets}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`${styles.presetBtn} ${figure.activePosePreset === preset.id ? styles.active : ''}`}
              onClick={() => setFigurePose(figure.figureId, preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className={styles.poseNote}>
          Use presets for the sleep shape. Drag on the bed to reposition.
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>Details</div>
        {humanMeta ? (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Height (cm)</span>
              <input
                className={styles.input}
                type="number"
                min={120}
                max={220}
                step={1}
                value={humanMeta.height}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'human',
                    height: clampNumber(event.target.value, 120, 220, humanMeta.height),
                    weight: humanMeta.weight,
                    gender: humanMeta.gender,
                    age: humanMeta.age,
                    runsWarm: humanMeta.runsWarm,
                  } satisfies HumanMeta)
                }
              />
            </label>
            <label className={styles.field}>
              <span>Weight (kg)</span>
              <input
                className={styles.input}
                type="number"
                min={35}
                max={220}
                step={1}
                value={humanMeta.weight}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'human',
                    height: humanMeta.height,
                    weight: clampNumber(event.target.value, 35, 220, humanMeta.weight),
                    gender: humanMeta.gender,
                    age: humanMeta.age,
                    runsWarm: humanMeta.runsWarm,
                  } satisfies HumanMeta)
                }
              />
            </label>
            <label className={styles.field}>
              <span>Gender</span>
              <select
                className={styles.select}
                value={humanMeta.gender}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'human',
                    height: humanMeta.height,
                    weight: humanMeta.weight,
                    gender: event.target.value,
                    age: humanMeta.age,
                    runsWarm: humanMeta.runsWarm,
                  } satisfies HumanMeta)
                }
              >
                <option value="person">Person</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Age</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                max={100}
                step={1}
                value={humanMeta.age}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'human',
                    height: humanMeta.height,
                    weight: humanMeta.weight,
                    gender: humanMeta.gender,
                    age: clampNumber(event.target.value, 1, 100, humanMeta.age),
                    runsWarm: humanMeta.runsWarm,
                  } satisfies HumanMeta)
                }
              />
            </label>
          </div>
        ) : dogMeta ? (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Breed</span>
              <input
                className={styles.input}
                value={dogMeta.breed}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'dog',
                    breed: event.target.value,
                    weight: dogMeta.weight,
                    gender: dogMeta.gender,
                    breedArchetype: dogMeta.breedArchetype,
                    runsWarm: dogMeta.runsWarm,
                  } satisfies DogMeta)
                }
              />
            </label>
            <label className={styles.field}>
              <span>Weight</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                max={100}
                step={1}
                value={dogMeta.weight}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'dog',
                    breed: dogMeta.breed,
                    weight: clampNumber(event.target.value, 1, 100, dogMeta.weight),
                    gender: dogMeta.gender,
                    breedArchetype: dogMeta.breedArchetype,
                    runsWarm: dogMeta.runsWarm,
                  } satisfies DogMeta)
                }
              />
            </label>
            <label className={styles.field}>
              <span>Gender</span>
              <select
                className={styles.select}
                value={dogMeta.gender}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'dog',
                    breed: dogMeta.breed,
                    weight: dogMeta.weight,
                    gender: event.target.value,
                    breedArchetype: dogMeta.breedArchetype,
                    runsWarm: dogMeta.runsWarm,
                  } satisfies DogMeta)
                }
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
          </div>
        ) : catMeta ? (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Breed</span>
              <input
                className={styles.input}
                value={catMeta.breed}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'cat',
                    breed: event.target.value,
                    weight: catMeta.weight,
                    gender: catMeta.gender,
                    catArchetype: catMeta.catArchetype,
                    runsWarm: catMeta.runsWarm,
                  } satisfies CatMeta)
                }
              />
            </label>
            <label className={styles.field}>
              <span>Weight</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                max={15}
                step={1}
                value={catMeta.weight}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'cat',
                    breed: catMeta.breed,
                    weight: clampNumber(event.target.value, 1, 15, catMeta.weight),
                    gender: catMeta.gender,
                    catArchetype: catMeta.catArchetype,
                    runsWarm: catMeta.runsWarm,
                  } satisfies CatMeta)
                }
              />
            </label>
            <label className={styles.field}>
              <span>Gender</span>
              <select
                className={styles.select}
                value={catMeta.gender}
                onChange={(event) =>
                  syncMetadata({
                    kind: 'cat',
                    breed: catMeta.breed,
                    weight: catMeta.weight,
                    gender: event.target.value,
                    catArchetype: catMeta.catArchetype,
                    runsWarm: catMeta.runsWarm,
                  } satisfies CatMeta)
                }
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
          </div>
        ) : null}
      </section>
    </div>
  )
}
