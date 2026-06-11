import { useState } from 'react'
import styles from './CookieConsent.module.css'

const KEY = 'kairos-cookie-consent'

function hasConsent() {
  try { return !!localStorage.getItem(KEY) } catch { return false }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(!hasConsent())

  if (!visible) return null

  function accept(level) {
    try { localStorage.setItem(KEY, level) } catch (_) {}
    setVisible(false)
  }

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.textWrap}>
          <span className={styles.icon}>🍪</span>
          <p className={styles.text}>
            <strong>KAIROS</strong> usa cookies para guardar tus preferencias, progreso y datos de
            productividad. Tu información es privada y nunca se comparte con terceros.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.essential} onClick={() => accept('essential')}>
            Solo esenciales
          </button>
          <button className={styles.accept} onClick={() => accept('all')}>
            Aceptar todo
          </button>
        </div>
      </div>
    </div>
  )
}
