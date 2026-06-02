import styles from './InfinityLogo.module.css'

const PATH =
  'M 100,50 C 60,15 10,15 10,50 C 10,85 60,85 100,50 C 140,15 190,15 190,50 C 190,85 140,85 100,50'

export default function InfinityLogo({ size = 80, state = 'idle', className = '' }) {
  return (
    <svg
      viewBox="0 0 200 100"
      width={size}
      height={Math.round(size * 0.5)}
      className={`${styles.root} ${styles[state] ?? ''} ${className}`}
      aria-hidden="true"
    >
      {/* Faint background track */}
      <path
        d={PATH}
        fill="none"
        stroke="var(--kairos-infinity-track)"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Wide glow trace */}
      <path
        d={PATH}
        fill="none"
        stroke="var(--kairos-infinity-glow)"
        strokeWidth="8"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray="30 70"
        className={styles.glowPath}
      />

      {/* Main colored flow */}
      <path
        d={PATH}
        fill="none"
        stroke="var(--kairos-infinity-mid)"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray="26 74"
        className={styles.flowPath}
      />

      {/* Bright leading spark */}
      <path
        d={PATH}
        fill="none"
        stroke="var(--kairos-infinity-spark)"
        strokeWidth="1.5"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray="4 96"
        className={styles.sparkPath}
      />
    </svg>
  )
}
