import { useSyncStore } from '../../store/syncStore'
import styles from './SyncIndicator.module.css'
import { IconCheck, IconCloudOff } from '@tabler/icons-react'

// Pill discreto tipo Trello: "Guardando…" mientras la cola se vacía,
// "N cambios pendientes" si no hay conexión, "✓ Guardado" al terminar.
export default function SyncIndicator() {
  const { pending, phase, savedFlash } = useSyncStore()

  if (phase === 'idle' && !savedFlash) return null

  if (savedFlash && phase === 'idle') {
    return (
      <div className={`${styles.pill} ${styles.saved}`}>
        <IconCheck size="1em" aria-hidden="true" />
        <span>Guardado</span>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div className={`${styles.pill} ${styles.waiting}`}>
        <IconCloudOff size="1em" aria-hidden="true" />
        <span>{pending} cambio{pending !== 1 ? 's' : ''} pendiente{pending !== 1 ? 's' : ''} — reintentando…</span>
      </div>
    )
  }

  return (
    <div className={styles.pill}>
      <span className={styles.spinner} />
      <span>Guardando…</span>
    </div>
  )
}
