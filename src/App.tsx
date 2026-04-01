import { Controls } from './components/Controls/Controls'
import { BedScene } from './components/BedScene/BedScene'
import { PosePanel } from './components/PosePanel/PosePanel'
import { useBedStore } from './store/bedStore'
import styles from './App.module.css'

export function App() {
  const selectedFigureId = useBedStore((state) => state.selectedFigureId)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.logo}>Three Dog Night</span>
        <span className={styles.subtitle}>sleepy bed heat map</span>
      </header>
      <main className={styles.stage}>
        <div className={styles.scene}>
          <BedScene />
        </div>
        <aside className={styles.leftDock}>
          <Controls />
        </aside>
        {selectedFigureId ? (
          <aside className={styles.rightDock}>
            <PosePanel />
          </aside>
        ) : null}
      </main>
    </div>
  )
}
