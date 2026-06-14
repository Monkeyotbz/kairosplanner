import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getTransacciones, calcSummary, calcByCategoria } from '../services/financeService'
import FinanceSummary from '../components/finanzas/FinanceSummary'
import FinanceChart from '../components/finanzas/FinanceChart'
import TransactionList from '../components/finanzas/TransactionList'
import TransactionForm from '../components/finanzas/TransactionForm'
import BudgetPanel from '../components/finanzas/BudgetPanel'
import RecurrenciasPanel from '../components/finanzas/RecurrenciasPanel'
import CashFlowChart from '../components/finanzas/CashFlowChart'
import ProyectoFinanzas from '../components/finanzas/ProyectoFinanzas'
import styles from './FinanzasPage.module.css'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function FinanzasPage() {
  const now = new Date()
  const [tab, setTab] = useState('personal')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [transacciones, setTransacciones] = useState([])
  const [recurrencias, setRecurrencias] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const summary = calcSummary(transacciones)
  const byCategoria = calcByCategoria(transacciones)

  const exportCSV = () => {
    const rows = transacciones.map(t => ({
      Fecha: t.fecha, Descripcion: t.descripcion,
      Monto: t.monto, Categoria: t.categoria, Tipo: t.tipo
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Finanzas')
    XLSX.writeFile(wb, 'finanzas-kairos.csv')
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const monthLabel = MONTHS[month - 1] + ' ' + year
    doc.setFillColor(13, 13, 26)
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(124, 111, 212)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Kairos - Finanzas', 14, 18)
    doc.setTextColor(180, 180, 200)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(monthLabel, 170, 18)
    doc.setTextColor(40, 40, 60)
    doc.setFontSize(10)
    doc.text('Ingresos: ' + summary.ingresos.toLocaleString(), 14, 42)
    doc.text('Gastos: ' + summary.gastos.toLocaleString(), 80, 42)
    doc.text('Balance: ' + summary.balance.toLocaleString(), 150, 42)
    doc.setDrawColor(90, 79, 207)
    doc.setLineWidth(0.5)
    doc.line(14, 46, 196, 46)
    autoTable(doc, {
      startY: 52,
      head: [['Fecha', 'Descripcion', 'Categoria', 'Tipo', 'Monto']],
      body: transacciones.map(t => [t.fecha, t.descripcion, t.categoria, t.tipo, Number(t.monto).toLocaleString()]),
      headStyles: { fillColor: [90, 79, 207], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 60] },
      alternateRowStyles: { fillColor: [240, 238, 255] },
      styles: { cellPadding: 3 }
    })
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Generado por Kairos - ' + new Date().toLocaleDateString(), 14, 290)
    doc.save('finanzas-kairos-' + year + '-' + String(month).padStart(2,'0') + '.pdf')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Finanzas</h1>
        <div className={styles.tabs}>
          <button className={styles.tab + (tab === 'personal' ? ' ' + styles.tabActive : '')} onClick={() => setTab('personal')}>
            Personal
          </button>
          <button className={styles.tab + (tab === 'proyecto' ? ' ' + styles.tabActive : '')} onClick={() => setTab('proyecto')}>
            Por proyecto
          </button>
        </div>
      </div>
      <div className={styles.monthRow}>
        <button className={styles.monthBtn} onClick={prevMonth}>anterior</button>
        <span className={styles.monthLabel}>{MONTHS[month - 1]} {year}</span>
        <button className={styles.monthBtn} onClick={nextMonth}>siguiente</button>
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
                <BudgetPanel transacciones={transacciones} year={year} month={month} monthLabel={MONTHS[month - 1] + ' ' + year} />
                <RecurrenciasPanel onChange={setRecurrencias} />
                <CashFlowChart recurrencias={recurrencias} currentMonthBalance={summary.balance} />
              </>
            )
          }
          <div className={styles.actions}>
            <button className={styles.newBtn} onClick={() => setShowForm(true)}>+ Nuevo movimiento</button>
            <button style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'8px', padding:'6px 12px', color:'#86efac', cursor:'pointer', fontSize:'12px' }} onClick={exportCSV}>Exportar CSV</button>
            <button style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'8px', padding:'6px 12px', color:'#86efac', cursor:'pointer', fontSize:'12px' }} onClick={exportPDF}>Exportar PDF</button>
          </div>
          {showForm && <TransactionForm onSaved={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
        </>
      )}
      {tab === 'proyecto' && (
        <ProyectoFinanzas year={year} month={month} />
      )}
    </div>
  )
}
