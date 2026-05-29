import styles from './BoardNav.module.css'

export default function BoardNav({ proyecto }) {
  return (
    <div className={styles.boardnav}>
      <div className={styles.left}>
        <span className={styles.projectName}>{proyecto?.nombre ?? 'Cargando...'}</span>
        <span className={styles.divider}>|</span>
        <button className={styles.viewBtn}>
          <span className={styles.viewIcon}>⊞</span>
          Tablero
        </button>
      </div>

      <div className={styles.right}>
        <button className={styles.action}>
          <span>⊟</span> Filtrar
        </button>
        <div className={styles.members}>
          <div className={styles.avatar} style={{ background: '#534AB7' }}>JS</div>
          <div className={styles.avatar} style={{ background: '#D4537E' }}>AM</div>
          <div className={styles.avatar} style={{ background: '#1D9E75' }}>CP</div>
        </div>
        <button className={styles.shareBtn}>
          <span>↗</span> Compartir
        </button>
        <button className={styles.action}>•••</button>
      </div>
    </div>
  )
}
