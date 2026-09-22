import { AppShell } from './components/AppShell/AppShell'
import styles from './App.module.css'

// Placeholders until the selector, status card and map are built.
export default function App() {
  return (
    <AppShell
      panel={
        <div className={styles.placeholder}>
          <h2 className={styles.placeholderTitle}>Selecciona un vehículo</h2>
          <p className={styles.placeholderText}>
            Aquí aparecerán el selector de vehículos y su tarjeta de estado en tiempo real.
          </p>
        </div>
      }
      map={
        <div className={styles.mapPlaceholder}>
          <p className="sr-only">El mapa se mostrará al seleccionar un vehículo.</p>
        </div>
      }
    />
  )
}
