import { formatMoney } from '../../services/financeService'
import styles from './FinanceSummary.module.css'

export default function FinanceSummary({ ingresos, gastos, balance }) {
  return (
    <div className={styles.row}>
      <div className={styles.card}>
        <span className={styles.icon}>↑</span>
        <div className={styles.body}>
          <span className={styles.label}>Ingresos</span>
          <span className={`${styles.value} ${styles.green}`}>${formatMoney(ingresos)}</span>
        </div>
      </div>

      <div className={styles.card}>
        <span className={styles.icon}>↓</span>
        <div className={styles.body}>
          <span className={styles.label}>Gastos</span>
          <span className={`${styles.value} ${styles.red}`}>${formatMoney(gastos)}</span>
        </div>
      </div>

      <div className={`${styles.card} ${styles.balanceCard}`}>
        <span className={styles.icon}>=</span>
        <div className={styles.body}>
          <span className={styles.label}>Balance</span>
          <span className={`${styles.value} ${balance >= 0 ? styles.green : styles.red}`}>
            ${formatMoney(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}
