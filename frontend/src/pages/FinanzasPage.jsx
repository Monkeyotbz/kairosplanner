import { useEffect, useState } from 'react'
import { getTransacciones, calcSummary, calcByCategoria } from '../services/financeService'
import FinanceSummary from '../components/finanzas/FinanceSummary'
import FinanceChart from '../components/finanzas/FinanceChart'
import TransactionList from '../components/finanzas/TransactionList'
import TransactionForm from '../components/finanzas/TransactionForm'
import BudgetPanel from '../components/finanzas/BudgetPanel'
import ProyectoFinanzas from '../components/finanzas/ProyectoFinanzas'
import styles from './FinanzasPage.module.css'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function FinanzasPage() {
  const now = new Date()
  const [tab, setTab]                     = useState('personal')
  const [year, setYear]                   = useState(now.getFullYear())
  const [month, setMonth]                 = useState(now.getMonth() + 1)
  const [transacciones, setTransacciones] = useState([])
  const [showForm, setShowForm]           = useState(false)
  const [loading, setLoading]             = useState(true)

  function load() {
    setLoading(true)
    getTransacciones(year, month).then(data => {
      setTransacciones(data)
      setLoading(false)
    })
  }

  useEffect(() => { if (tab === 'personal') load() }, [year, month, tab])

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
          <button className={`${styles.tab} ${tab === 'personal' ? styles.tabActive : ''}`} onClick={() => setTab('personal')}>
            💰 Personal
          </button>
          <button className={`${styles.tab} ${tab === 'proyecto' ? styles.tabActive : ''}`} onClick={() => setTab('proyecto')}>
            💼 Por proyecto
          </button>
        </div>
      </div>

      {/* Selector de mes */}
      <div className={styles.monthRow}>
        <button className={styles.monthBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{MONTHS[month - 1]} {year}</span>
        <button className={styles.monthBtn} onClick={nextMonth}>›</button>
      </div>

      {tab === 'personal' && (
        <>
          {loading
            ? <div className={styles.state}><span className={styles.spinner} /> Cargando...</div>
            : (
              <>
                <FinanceSummary ingresos={summary.ingresos} gastos={summary.gastos} balance={summary.balance} />
                <div className={styles.mainRow}>
                  <FinanceChart data={byCategoria} />
                  <TransactionList transacciones={transacciones} onDeleted={load} />
                </div>
                <BudgetPanel transacciones={transacciones} />
              </>
            )
          }
          <button className={styles.newBtn} onClick={() => setShowForm(true)}>+ Nuevo movimiento</button>
          {showForm && <TransactionForm onSaved={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
        </>
      )}

      {tab === 'proyecto' && (
        <ProyectoFinanzas year={year} month={month} />
      )}
    </div>
  )
}
