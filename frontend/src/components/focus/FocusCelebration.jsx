import { useEffect, useMemo, useState } from 'react'
import { getFocusProgress } from '../../services/rankService'
import styles from './FocusCelebration.module.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const PHRASES = [
  'El tiempo bien usado no vuelve vacío.',
  'Cada minuto de enfoque es una semilla de maestría.',
  'Aprovechaste tu Kairós — el momento oportuno.',
  'La constancia silenciosa construye lo extraordinario.',
  'Hoy elegiste avanzar. Eso ya es victoria.',
  'El flow no se busca: se cultiva, sesión a sesión.',
  'Pequeños bloques, grandes transformaciones.',
  'Tu atención es tu poder. Lo ejerciste bien.',
]

// Props: elapsedSeconds, sessionId, totalBreaks, onDone, doneLabel
export default function FocusCelebration({ elapsedSeconds, sessionId, totalBreaks = 0, onDone, doneLabel = 'Finalizar' }) {
  const phrase = useMemo(() => PHRASES[Math.floor(Math.random() * PHRASES.length)], [])
  const [progress, setProgress] = useState(null)   // resultado de getFocusProgress
  const [progressTimedOut, setProgressTimedOut] = useState(false)
  const [barFill, setBarFill] = useState(0)         // 0..1 animado
  const [shownXp, setShownXp] = useState(0)         // contador de XP animado

  useEffect(() => {
    let cancelled = false
    const fallbackTimer = setTimeout(() => { if (!cancelled) setProgressTimedOut(true) }, 9000)
    getFocusProgress({ excludeSessionId: sessionId, earnedSeconds: elapsedSeconds }).then(p => {
      if (cancelled) return
      clearTimeout(fallbackTimer)
      setProgress(p)
      const start = p.leveledUp ? 0 : p.before.progress
      setBarFill(start)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setBarFill(p.after.progress)
      }))
    })
    return () => { cancelled = true; clearTimeout(fallbackTimer) }
  }, [sessionId, elapsedSeconds])

  // Cuenta ascendente del XP ganado
  useEffect(() => {
    if (!progress) return
    const target = progress.earnedMinutes
    if (target <= 0) { setShownXp(0); return }
    let raf
    const t0 = performance.now()
    const dur = 900
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      setShownXp(Math.round(k * target))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [progress])

  const rank = progress?.after.current
  const next = progress?.after.next

  return (
    <div className={styles.card}>
      <div className={styles.glowRing} aria-hidden="true" />

      {progress?.leveledUp && (
        <div className={styles.levelUp}>★ ¡Subiste de nivel!</div>
      )}

      <span className={styles.emoji}>🎉</span>
      <h2 className={styles.title}>¡Sesión completada!</h2>
      <p className={styles.phrase}>{phrase}</p>

      {/* Tiempo de esta sesión */}
      <div className={styles.timeBig}>
        <span className={styles.timeValue}>{formatTime(elapsedSeconds)}</span>
        <span className={styles.timeLabel}>de enfoque{totalBreaks > 0 ? ` · ${totalBreaks} pausa${totalBreaks > 1 ? 's' : ''}` : ''}</span>
      </div>

      {/* Rango + barra de XP */}
      {progress ? (
        <div className={styles.rankBox}>
          <div className={styles.rankHead}>
            <span className={styles.rankIcon} style={{ color: rank.color }}>{rank.icon}</span>
            <div className={styles.rankNames}>
              <span className={styles.rankName}>{rank.name}</span>
              {next
                ? <span className={styles.rankNext}>Siguiente: {next.name}</span>
                : <span className={styles.rankNext}>Rango máximo alcanzado ✦</span>}
            </div>
            {progress.earnedMinutes > 0 && (
              <span className={styles.xpGain}>+{shownXp} XP</span>
            )}
          </div>

          <div className={styles.xpBar}>
            <div
              className={styles.xpFill}
              style={{ width: `${barFill * 100}%`, background: `linear-gradient(90deg, ${rank.color}, #378ADD)` }}
            />
          </div>

          <div className={styles.xpMeta}>
            {next ? (
              <>
                <span>{progress.after.xpInRank} / {progress.after.xpForNext} XP</span>
                <span>Faltan {progress.after.minToNext} min para {next.name}</span>
              </>
            ) : (
              <span>{progress.after.totalMinutes} min de flow acumulados</span>
            )}
          </div>

          {progress.streak > 0 && (
            <div className={styles.streak}>🔥 {progress.streak} día{progress.streak > 1 ? 's' : ''} de racha</div>
          )}
        </div>
      ) : progressTimedOut ? (
        <div className={styles.rankLoading}>Tu sesión fue guardada ✓</div>
      ) : (
        <div className={styles.rankLoading}>Calculando tu progreso…</div>
      )}

      <button className={styles.doneBtn} onClick={onDone}>{doneLabel}</button>
    </div>
  )
}
