import { useEffect, useState, useRef } from 'react'
import { useBoardStore } from '../store/boardStore'
import { useToastStore } from '../store/toastStore'
import BoardNav from '../components/layout/BoardNav'
import Board from '../components/kanban/Board'
import EmptyBoard from '../components/kanban/EmptyBoard'
import SidePanel from '../components/layout/SidePanel'
import CardDetailModal from '../components/kanban/CardDetailModal'
import FilterPanel from '../components/kanban/FilterPanel'
import styles from './BoardPage.module.css'

function getTodayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

export default function BoardPage() {
  const { proyecto, loading, error, loadBoard, cardsByColumn } = useBoardStore()
  const addToast = useToastStore(s => s.addToast)
  const toastFired = useRef(false)
  const [panelOpen, setPanelOpen] = useState(() => localStorage.getItem('kairos-panel') === 'true')
  const [filterPanelOpen, setFilterPanelOpen] = useState(true)
  const [activeFilters, setActiveFilters] = useState({ selectedPriorities: [], selectedTags: [], selectedMembers: [] })

  useEffect(() => { loadBoard() }, [loadBoard])

  useEffect(() => {
    if (loading || toastFired.current) return
    const today = getTodayStr()
    const d2 = new Date(); d2.setDate(d2.getDate()+1)
    const tomorrow = d2.getFullYear() + '-' + String(d2.getMonth()+1).padStart(2,'0') + '-' + String(d2.getDate()).padStart(2,'0')
    const allCards = Object.values(cardsByColumn).flat()
    const overdue = allCards.filter(c => c.fecha_limite && c.fecha_limite < today).length
    const dueToday = allCards.filter(c => c.fecha_limite === today).length
    const dueTomorrow = allCards.filter(c => c.fecha_limite === tomorrow).length
    if (overdue + dueToday + dueTomorrow > 0) {
      addToast({ overdue, dueToday, dueTomorrow })
      toastFired.current = true
    }
  }, [loading, cardsByColumn, addToast])

  function togglePanel() {
    setPanelOpen(v => { localStorage.setItem('kairos-panel', String(!v)); return !v })
  }

  if (loading) return <div className={styles.state}><span className={styles.spinner} /> Cargando tablero...</div>
  if (error === 'empty') return <EmptyBoard />
  if (error) return <div className={styles.state}><p className={styles.error}>{error}</p></div>

  return (
    <div className={styles.page}>
      <BoardNav proyecto={proyecto} panelOpen={panelOpen} onTogglePanel={togglePanel} />
      <div className={styles.content}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', borderBottom:'1px solid #1e1e3a' }}>
          <button
            onClick={() => setFilterPanelOpen(prev => !prev)}
            style={{ marginLeft:'auto', background: filterPanelOpen ? 'rgba(90,79,207,0.3)' : 'rgba(90,79,207,0.1)', border:'1px solid rgba(90,79,207,0.4)', borderRadius:'8px', padding:'6px 12px', color:'#9b8fff', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'12px' }}
          >
            Filtros
          </button>
        </div>
        <FilterPanel open={filterPanelOpen} proyectoId={proyecto && proyecto.id} onFilterChange={setActiveFilters} />
        <div className={styles.kanbanSide}>
          <div className={styles.boardWrapper}>
            <Board activeFilters={activeFilters} />
          </div>
        </div>
        {panelOpen && <SidePanel onClose={togglePanel} />}
      </div>
      <CardDetailModal />
    </div>
  )
}
