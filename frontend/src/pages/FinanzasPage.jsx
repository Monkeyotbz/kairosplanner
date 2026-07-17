import { useEffect, useState } from 'react'
import { getTransacciones, calcSummary, calcByCategoria, materializeRecurrencias } from '../services/financeService'
import FinanceSummary      from '../components/finanzas/FinanceSummary'
import FinanceChart        from '../components/finanzas/FinanceChart'
import TransactionList     from '../components/finanzas/TransactionList'
import TransactionForm     from '../components/finanzas/TransactionForm'
import BudgetPanel         from '../components/finanzas/BudgetPanel'
import RecurrenciasPanel   from '../components/finanzas/RecurrenciasPanel'
import CashFlowChart       from '../components/finanzas/CashFlowChart'
import SugerenciaAhorro    from '../components/finanzas/SugerenciaAhorro'
import ProyectoFinanzas    from '../components/finanzas/ProyectoFinanzas'
import HealthScore         from '../components/finanzas/HealthScore'
import AlertasFinancieras  from '../components/finanzas/AlertasFinancieras'
import AnalisisFinanciero  from '../components/finanzas/AnalisisFinanciero'
import styles from './FinanzasPage.module.css'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function FinanzasPage() {
  const now = new Date()
  const [tab, setTab]                     = useState('personal')
  const [year, setYear]                   = useState(now.getFullYear())
  const [month, setMonth]                 = useState(now.getMonth() + 1)
  const [transacciones, setTransacciones] = useState([])
  const [recurrencias, setRecurrencias]   = useState([])
  const [showForm, setShowForm]           = useState(false)
  const [editTx, setEditTx]               = useState(null)
  const [loading, setLoading]             = useState(true)
  const [needsSql, setNeedsSql]           = useState(false)
  const [ready, setReady]                 = useState(false)

  function load() {
    setLoading(true)
    getTransacciones(year, month).then(data => {
      setTransacciones(data)
      setLoading(false)
    })
  }

  // Al entrar, convierte en transacciones las ocurrencias vencidas de los
  // recurrentes activos (salario, renta…) antes de cargar el mes.
  useEffect(() => {
    materializeRecurrencias()
      .then(res => setNeedsSql(res.needsSql))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => { if (tab === 'personal' && ready) load() }, [year, month, tab, ready])

  // Cuando cambian los recurrentes (nuevo, editado, reactivado), materializa
  // de una vez lo que ya esté vencido y refresca los movimientos.
  function handleRecurrenciasChange(list) {
    setRecurrencias(list)
    materializeRecurrencias().then(res => {
      if (res.needsSql) setNeedsSql(true)
      if (res.inserted > 0) load()
    })
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const summary     = calcSummary(transacciones)
  const byCategoria = calcByCategoria(transacciones)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Finanzas</h1>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'personal'  ? styles.tabActive : ''}`} onClick={() => setTab('personal')}>
            💰 Personal
          </button>
          <button className={`${styles.tab} ${tab === 'analisis'  ? styles.tabActive : ''}`} onClick={() => setTab('analisis')}>
            📊 Análisis
          </button>
          <button className={`${styles.tab} ${tab === 'proyecto'  ? styles.tabActive : ''}`} onClick={() => setTab('proyecto')}>
            💼 Proyecto
          </button>
        </div>
      </div>

      {/* Selector de mes — solo en Personal y Análisis */}
      {tab !== 'proyecto' && (
        <div className={styles.monthRow}>
          <button className={styles.monthBtn} onClick={prevMonth}>‹</button>
          <span className={styles.monthLabel}>{MONTHS[month - 1]} {year}</span>
          <button className={styles.monthBtn} onClick={nextMonth}>›</button>
        </div>
      )}

      {/* ── Tab Personal ──────────────────────────────────────────── */}
      {tab === 'personal' && (
        <>
          {needsSql && (
            <div className={styles.sqlWarn}>
              ⚠️ Falta ejecutar <code>backend/database/materializacion_recurrencias.sql</code> en
              Supabase → SQL Editor para que los recurrentes se registren solos como movimientos.
            </div>
          )}
          {loading
            ? <div className={styles.state}><span className={styles.spinner} /> Cargando...</div>
            : (
              <>
                {/* Score de salud financiera */}
                <HealthScore
                  summary={summary}
                  recurrencias={recurrencias}
                  transacciones={transacciones}
                  year={year}
                  month={month}
                />

                {/* Alertas predictivas inteligentes */}
                <AlertasFinancieras
                  summary={summary}
                  recurrencias={recurrencias}
                  transacciones={transacciones}
                  year={year}
                  month={month}
                />

                <FinanceSummary ingresos={summary.ingresos} gastos={summary.gastos} balance={summary.balance} />
                <div className={styles.mainRow}>
                  <FinanceChart data={byCategoria} />
                  <TransactionList transacciones={transacciones} onDeleted={load} onEdit={setEditTx} />
                </div>
                <BudgetPanel
                  transacciones={transacciones}
                  year={year} month={month}
                  monthLabel={`${MONTHS[month - 1]} ${year}`}
                />
                <RecurrenciasPanel onChange={handleRecurrenciasChange} />
                <SugerenciaAhorro recurrencias={recurrencias} onGoToMetas={() => setTab('analisis')} />
                <CashFlowChart recurrencias={recurrencias} currentMonthBalance={summary.balance} />
              </>
            )
          }
          <button className={styles.newBtn} onClick={() => setShowForm(true)}>+ Nuevo movimiento</button>
          {(showForm || editTx) && (
            <TransactionForm
              initial={editTx}
              onSaved={() => { setShowForm(false); setEditTx(null); load() }}
              onClose={() => { setShowForm(false); setEditTx(null) }}
            />
          )}
        </>
      )}

      {/* ── Tab Análisis ──────────────────────────────────────────── */}
      {tab === 'analisis' && (
        <AnalisisFinanciero year={year} month={month} />
      )}

      {/* ── Tab Proyecto ──────────────────────────────────────────── */}
      {tab === 'proyecto' && (
        <ProyectoFinanzas year={year} month={month} />
      )}
    </div>
  )
}
