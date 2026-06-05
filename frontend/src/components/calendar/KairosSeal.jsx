import { useMemo } from 'react'
import InfinityLogo from '../layout/InfinityLogo'
import styles from './KairosSeal.module.css'

/*
 * KairosSeal — Sigilo cósmico procedural, único por fecha.
 * La respuesta KAIROS al glifo maya: geometría sagrada + constelación,
 * con el infinito vivo en el centro. Determinista (mismo día = mismo sello).
 */

function seedFromDate(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

function buildSeal(seed) {
  const R    = 38                         // radio de la constelación
  const N    = 7 + (seed % 5)             // 7..11 nodos
  const step = 2 + (seed % Math.max(1, Math.floor(N / 2) - 1))  // paso de la estrella
  const rot  = (seed % 360) * (Math.PI / 180)

  // Nodos equiespaciados en el anillo
  const nodes = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2 + rot
    return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) }
  })

  // Aristas de la estrella {N/step}
  const edges = nodes.map((_, i) => {
    const a = nodes[i]
    const b = nodes[(i + step) % N]
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  })

  return { nodes, edges }
}

export default function KairosSeal({ date, size = 64, live = true }) {
  const { nodes, edges } = useMemo(() => buildSeal(seedFromDate(date)), [date])

  return (
    <div className={styles.seal} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className={styles.svg}>
        {/* Anillo exterior */}
        <circle cx="50" cy="50" r="46" fill="none"
          stroke="var(--kairos-purple-600)" strokeWidth="0.6" opacity="0.35" />
        <circle cx="50" cy="50" r="42" fill="none"
          stroke="var(--kairos-purple-400)" strokeWidth="0.4" opacity="0.25"
          strokeDasharray="1 3" />

        {/* Constelación rotatoria */}
        <g className={styles.constellation}>
          {edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="var(--kairos-purple-400)" strokeWidth="0.5" opacity="0.5" />
          ))}
          {nodes.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r="1.4"
              fill="var(--kairos-purple-200)" opacity="0.9" />
          ))}
        </g>
      </svg>

      {/* Infinito vivo al centro */}
      <div className={styles.core}>
        <InfinityLogo size={size * 0.46} state={live ? 'idle' : 'idle'} />
      </div>
    </div>
  )
}
