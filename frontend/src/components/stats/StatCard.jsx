import styles from './StatCard.module.css'

export default function StatCard({ icon, label, value, unit, color }) {
  return (
    <div className={styles.card}>
      <span className={styles.icon} style={{ color: color || 'var(--kairos-purple-400)' }}>
        {icon}
      </span>
      <div className={styles.body}>
        <span className={styles.value}>
          {value}
          {unit && <span className={styles.unit}>{unit}</span>}
        </span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  )
}
