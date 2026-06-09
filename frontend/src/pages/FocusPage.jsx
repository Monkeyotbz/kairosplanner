import { useEffect, useRef } from 'react'
import { useFocusStore } from '../store/focusStore'
import FocusStart from '../components/focus/FocusStart'
import FocusCelebration from '../components/focus/FocusCelebration'
import styles from './FocusPage.module.css'

export default function FocusPage() {
  const { phase, immersive, session, elapsedSeconds, totalBreaks, enterImmersive, reset } = useFocusStore()
  const mounted = useRef(false)

  // Al ABRIR Enfoque con una sesión viva, entrar al inmersivo (solo en el montaje:
  // si luego minimizas, te dejamos ver la cápsula sin re-inmersar a la fuerza).
  useEffect(() => {
    if (!mounted.current && (phase === 'active' || phase === 'break') && !immersive) enterImmersive()
    mounted.current = true
  }, [phase, immersive, enterImmersive])

  // El overlay inmersivo global cubre todo.
  if (immersive) return null

  // Sesión en curso pero minimizada (la cápsula flota): ofrecemos volver.
  if (phase === 'active' || phase === 'break') {
    return (
      <div className={styles.page}>
        <div className={styles.resume}>
          <span className={styles.resumeDot} />
          <p className={styles.resumeText}>Tienes una sesión de enfoque en curso.</p>
          <button className={styles.resumeBtn} onClick={() => enterImmersive()}>
            ⛶ Volver al enfoque
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {phase === 'complete' ? (
        <FocusCelebration
          elapsedSeconds={elapsedSeconds}
          sessionId={session?.id}
          totalBreaks={totalBreaks}
          onDone={reset}
          doneLabel="Nueva sesión"
        />
      ) : (
        <FocusStart />
      )}
    </div>
  )
}
