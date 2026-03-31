import { DOG_ARCHETYPES, CAT_ARCHETYPES } from '../../constants/breedArchetypes'
import { useBedStore } from '../../store/bedStore'
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

export function PosePanel() {
  const figures = useBedStore((state) => state.figures)
  const selectedFigureId = useBedStore((state) => state.selectedFigureId)
  const setFigurePose = useBedStore((state) => state.setFigurePose)
  const updateFigureSliders = useBedStore((state) => state.updateFigureSliders)
  const updateFigureMetadata = useBedStore((state) => state.updateFigureMetadata)
  const removeFigure = useBedStore((state) => state.removeFigure)
  const flipFigure = useBedStore((state) => state.flipFigure)

  const figure = figures.find((entry) => entry.figureId === selectedFigureId)

  if (!figure) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyTitle}>Nothing on the bed yet.</div>
        <div className={styles.emptyText}>
          Add a human, dog, or cat from the left. Once selected, drag the body to move it and drag the blue limb handles to change the sleep shape directly.
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

  const armAverage =
    ((figure.poseSliders.leftArm ?? 50) + (figure.poseSliders.rightArm ?? 50)) / 2
  const legAverage =
    ((figure.poseSliders.leftLeg ?? 50) + (figure.poseSliders.rightLeg ?? 50)) / 2
  const pawAverage =
    ((figure.poseSliders.frontLegs ?? 50) + (figure.poseSliders.rearLegs ?? 50)) / 2
  const humanMeta = figure.metadata.kind === 'human' ? figure.metadata : null
  const dogMeta = figure.metadata.kind === 'dog' ? figure.metadata : null
  const catMeta = figure.metadata.kind === 'cat' ? figure.metadata : null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{titleForFigure(figure)}</div>
          <div className={styles.hint}>Drag the body to move. Blue handles pose the limbs directly. The center badge is local warmth, not exact body temperature.</div>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryBtn} onClick={() => flipFigure(figure.figureId)}>
            Flip
          </button>
          <button className={styles.removeBtn} onClick={() => removeFigure(figure.figureId)}>
            Remove
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardTitle}>Details</div>
          {humanMeta ? (
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Height</span>
                <input
                  className={styles.input}
                  type="number"
                  min={120}
                  max={220}
                  value={humanMeta.height}
                  onChange={(event) =>
                    syncMetadata({
                      kind: 'human',
                      height: clampNumber(event.target.value, 120, 220, humanMeta.height),
                      weight: humanMeta.weight,
                      gender: humanMeta.gender,
                      age: humanMeta.age,
                    } satisfies HumanMeta)
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Weight</span>
                <input
                  className={styles.input}
                  type="number"
                  min={35}
                  max={220}
                  value={humanMeta.weight}
                  onChange={(event) =>
                    syncMetadata({
                      kind: 'human',
                      height: humanMeta.height,
                      weight: clampNumber(event.target.value, 35, 220, humanMeta.weight),
                      gender: humanMeta.gender,
                      age: humanMeta.age,
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
                  value={humanMeta.age}
                  onChange={(event) =>
                    syncMetadata({
                      kind: 'human',
                      height: humanMeta.height,
                      weight: humanMeta.weight,
                      gender: humanMeta.gender,
                      age: clampNumber(event.target.value, 1, 100, humanMeta.age),
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
                  value={dogMeta.weight}
                  onChange={(event) =>
                    syncMetadata({
                      kind: 'dog',
                      breed: dogMeta.breed,
                      weight: clampNumber(event.target.value, 1, 100, dogMeta.weight),
                      gender: dogMeta.gender,
                      breedArchetype: dogMeta.breedArchetype,
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
                    } satisfies DogMeta)
                  }
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Build</span>
                <select
                  className={styles.select}
                  value={dogMeta.breedArchetype}
                  onChange={(event) =>
                    syncMetadata({
                      kind: 'dog',
                      breed: dogMeta.breed,
                      weight: dogMeta.weight,
                      gender: dogMeta.gender,
                      breedArchetype: event.target.value as DogMeta['breedArchetype'],
                    } satisfies DogMeta)
                  }
                >
                  {Object.values(DOG_ARCHETYPES).map((archetype) => (
                    <option key={archetype.id} value={archetype.id}>
                      {archetype.label}
                    </option>
                  ))}
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
                  value={catMeta.weight}
                  onChange={(event) =>
                    syncMetadata({
                      kind: 'cat',
                      breed: catMeta.breed,
                      weight: clampNumber(event.target.value, 1, 15, catMeta.weight),
                      gender: catMeta.gender,
                      catArchetype: catMeta.catArchetype,
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
                    } satisfies CatMeta)
                  }
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Build</span>
                <select
                  className={styles.select}
                  value={catMeta.catArchetype}
                  onChange={(event) =>
                    syncMetadata({
                      kind: 'cat',
                      breed: catMeta.breed,
                      weight: catMeta.weight,
                      gender: catMeta.gender,
                      catArchetype: event.target.value as CatMeta['catArchetype'],
                    } satisfies CatMeta)
                  }
                >
                  {Object.values(CAT_ARCHETYPES).map((archetype) => (
                    <option key={archetype.id} value={archetype.id}>
                      {archetype.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>Pose</div>
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

          <label className={styles.sliderRow}>
            <span className={styles.sliderLabel}>
              <span>Curl</span>
              <span>{Math.round(figure.poseSliders.curl)}</span>
            </span>
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={100}
              value={figure.poseSliders.curl}
              onChange={(event) =>
                updateFigureSliders(figure.figureId, {
                  curl: Number(event.target.value),
                })
              }
            />
          </label>

          <label className={styles.sliderRow}>
            <span className={styles.sliderLabel}>
              <span>Stretch</span>
              <span>{Math.round(figure.poseSliders.stretch)}</span>
            </span>
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={100}
              value={figure.poseSliders.stretch}
              onChange={(event) =>
                updateFigureSliders(figure.figureId, {
                  stretch: Number(event.target.value),
                })
              }
            />
          </label>

          {figure.type === 'human' ? (
            <>
              <label className={styles.sliderRow}>
                <span className={styles.sliderLabel}>
                  <span>Arms</span>
                  <span>{Math.round(armAverage)}</span>
                </span>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={100}
                  value={armAverage}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    updateFigureSliders(figure.figureId, {
                      leftArm: value,
                      rightArm: value,
                    })
                  }}
                />
              </label>
              <label className={styles.sliderRow}>
                <span className={styles.sliderLabel}>
                  <span>Legs</span>
                  <span>{Math.round(legAverage)}</span>
                </span>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={100}
                  value={legAverage}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    updateFigureSliders(figure.figureId, {
                      leftLeg: value,
                      rightLeg: value,
                    })
                  }}
                />
              </label>
            </>
          ) : (
            <>
              <label className={styles.sliderRow}>
                <span className={styles.sliderLabel}>
                  <span>Head reach</span>
                  <span>{Math.round(figure.poseSliders.head)}</span>
                </span>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={100}
                  value={figure.poseSliders.head}
                  onChange={(event) =>
                    updateFigureSliders(figure.figureId, {
                      head: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className={styles.sliderRow}>
                <span className={styles.sliderLabel}>
                  <span>Paws</span>
                  <span>{Math.round(pawAverage)}</span>
                </span>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={100}
                  value={pawAverage}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    updateFigureSliders(figure.figureId, {
                      frontLegs: value,
                      rearLegs: value,
                    })
                  }}
                />
              </label>
              <label className={styles.sliderRow}>
                <span className={styles.sliderLabel}>
                  <span>Tail</span>
                  <span>{Math.round(figure.poseSliders.tail ?? 50)}</span>
                </span>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={100}
                  value={figure.poseSliders.tail ?? 50}
                  onChange={(event) =>
                    updateFigureSliders(figure.figureId, {
                      tail: Number(event.target.value),
                    })
                  }
                />
              </label>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
