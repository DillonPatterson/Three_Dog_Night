import { TopBar } from './components/TopBar'
import { BedCanvas } from './components/BedCanvas'

export function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#0e0a06',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <TopBar />
      <BedCanvas />
    </div>
  )
}
