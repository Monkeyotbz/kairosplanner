import { formatMoney, deleteTransaccion } from '../../services/financeService'
import styles from './TransactionList.module.css'
import { IconPencil } from '@tabler/icons-react'

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function TransactionList({ transacciones, onDeleted, onEdit }) {
  const todayIso = new Date().toISOString().slice(0, 10)

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
              <li key={t.id} className={`${styles.item} ${t.fecha > todayIso ? styles.itemFuturo : ''}`}>
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
                    {t.fecha > todayIso && (
                      <span className={styles.futuroBadge} title="Aún no llega la fecha — cuenta en el plan del mes">⏱ programado</span>
                    )}
                  </span>
                  <span className={styles.meta}>
                    {t.categorias_finanzas?.nombre || 'Sin categoría'} · {formatDate(t.fecha)}
                  </span>
                </div>

                <span className={`${styles.monto} ${t.tipo === 'ingreso' ? styles.ingreso : styles.gasto}`}>
                  {t.tipo === 'ingreso' ? '+' : '-'}${formatMoney(t.monto)}
                </span>

                <button className={styles.editBtn} onClick={() => onEdit?.(t)} title="Editar monto o fecha">
                  <IconPencil size="1em" />
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(t.id)} title="Eliminar">✕</button>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  )
}
