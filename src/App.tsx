import { Controls } from './components/Controls/Controls'
import { BedScene } from './components/BedScene/BedScene'
import { PosePanel } from './components/PosePanel/PosePanel'
import styles from './App.module.css'

export function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.logo}>Three Dog Night</span>
        <span className={styles.subtitle}>sleepy bed heat map</span>
      </header>
      <aside className={styles.sidebar}>
        <Controls />
      </aside>
      <main className={styles.scene}>
        <BedScene />
      </main>
      <div className={styles.pose}>
        <PosePanel />
      </div>
    </div>
  )
}
