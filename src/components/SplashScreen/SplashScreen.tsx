import { BrandMark } from '../BrandMark/BrandMark'
import styles from './SplashScreen.module.css'

/** Shown while the session cookie is being checked, to avoid flashing the login form. */
export function SplashScreen() {
  return (
    <div className={styles.splash} role="status" aria-busy="true">
      <BrandMark size={44} className={styles.mark} />
      <p className={styles.text}>Recuperando sesión…</p>
    </div>
  )
}
