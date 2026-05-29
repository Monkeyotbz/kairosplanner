import { useEffect } from 'react'
import { useFocusStore } from '../store/focusStore'
import ModeSelector from '../components/focus/ModeSelector'
import ActiveTimer from '../components/focus/ActiveTimer'
import BreakScreen from '../components/focus/BreakScreen'
import SessionComplete from '../components/focus/SessionComplete'
import styles from './FocusPage.module.css'

export default function FocusPage() {
  const { phase, tipo, duracion_plan_min, elapsedSeconds, tick, tickBreak, startBreak } = useFocusStore()

  // Tick del timer de trabajo
  useEffect(() => {
    if (phase !== 'active') return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, tick])

  // Tick del timer de pausa
  useEffect(() => {
    if (phase !== 'break') return
    const id = setInterval(tickBreak, 1000)
    return () => clearInterval(id)
  }, [phase, tickBreak])

  // Pomodoro: pausa automática al completar el bloque
  useEffect(() => {
    if (phase !== 'active' || tipo !== 'pomodoro' || !duracion_plan_min) return
    if (elapsedSeconds >= duracion_plan_min * 60) startBreak()
  }, [elapsedSeconds, phase, tipo, duracion_plan_min, startBreak])

  return (
    <div className={styles.page}>
      {phase === 'idle'     && <ModeSelector />}
      {phase === 'active'   && <ActiveTimer />}
      {phase === 'break'    && <BreakScreen />}
      {phase === 'complete' && <SessionComplete />}
    </div>
  )
}
