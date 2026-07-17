import { formatMoney, deleteTransaccion } from '../../services/financeService'
import styles from './TransactionList.module.css'

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function TransactionList({ transacciones, onDeleted }) {
  async function handleDelete(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await deleteTransaccion(id)
    onDeleted()
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Movimientos</h3>

      {!transacciones.length
        ? <p className={styles.empty}>Sin movimientos este mes.<br />Agrega tu primer ingreso o gasto.</p>
        : (
          <ul className={styles.list}>
            {transacciones.map(t => (
              <li key={t.id} className={styles.item}>
                <span
                  className={styles.catIcon}
                  style={{ background: `${t.categorias_finanzas?.color || '#6b7280'}22` }}
                >
                  {t.categorias_finanzas?.icono || '◈'}
                </span>

                <div className={styles.info}>
                  <span className={styles.concepto}>
                    {t.concepto}
                    {t.recurrencia_id && (
                      <span className={styles.autoBadge} title="Generado automáticamente desde un recurrente">↻ auto</span>
                    )}
                  </span>
                  <span className={styles.meta}>
                    {t.categorias_finanzas?.nombre || 'Sin categoría'} · {formatDate(t.fecha)}
                  </span>
                </div>

                <span className={`${styles.monto} ${t.tipo === 'ingreso' ? styles.ingreso : styles.gasto}`}>
                  {t.tipo === 'ingreso' ? '+' : '-'}${formatMoney(t.monto)}
                </span>

                <button className={styles.deleteBtn} onClick={() => handleDelete(t.id)} title="Eliminar">✕</button>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  )
}
