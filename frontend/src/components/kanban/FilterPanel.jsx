import { useState, useEffect, useRef } from "react"
import { getProjectMembers } from "../../services/boardService"
import { useBoardStore } from "../../store/boardStore"
import styles from "./FilterPanel.module.css"

const PRIORITIES = [
  { id: "alta",   label: "Alta",   color: "#ef4444" },
  { id: "normal", label: "Normal", color: "#eab308" },
  { id: "baja",   label: "Baja",   color: "#22c55e" },
]

const TABS = [
  { id: "priority", label: "Prioridad" },
  { id: "tag",      label: "Etiqueta"  },
  { id: "member",   label: "Miembro"   },
  { id: "list",     label: "Lista"     },
]

export default function FilterPanel({ open, proyectoId, onFilterChange, onClose }) {
  const [activeTab, setActiveTab] = useState("priority")
  const [selectedPriorities, setSelectedPriorities] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [selectedLists, setSelectedLists] = useState([])
  const etiquetas = useBoardStore(s => s.etiquetas)
  const columns = useBoardStore(s => s.columns)
  const [miembros, setMiembros] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const ref = useRef(null)

  // Cerrar al hacer click afuera del popover
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  useEffect(() => {
    if (!proyectoId) return
    setLoadingData(true)
    getProjectMembers(proyectoId)
      .catch(() => [])
      .then(members => setMiembros(members.map(m => ({
        id:     m.usuario_id,
        label:  (m.usuarios && (m.usuarios.nombre || m.usuarios.email)) || "Sin nombre",
        avatar: ((m.usuarios && (m.usuarios.nombre || m.usuarios.email)) || "?")[0].toUpperCase(),
        color:  "#5a4fcf",
      }))))
      .finally(() => setLoadingData(false))
  }, [proyectoId])

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ selectedPriorities, selectedTags, selectedMembers, selectedLists })
    }
  }, [selectedPriorities, selectedTags, selectedMembers, selectedLists])

  const toggle = (setList, id) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const activeCount = selectedPriorities.length + selectedTags.length + selectedMembers.length + selectedLists.length

  const clearAll = () => {
    setSelectedPriorities([])
    setSelectedTags([])
    setSelectedMembers([])
    setSelectedLists([])
  }

  const tabCount = (id) => {
    if (id === "priority") return selectedPriorities.length
    if (id === "tag")      return selectedTags.length
    if (id === "member")   return selectedMembers.length
    if (id === "list")     return selectedLists.length
    return 0
  }

  return (
    <div
      className={`${styles.filterPanel} ${open ? styles.filterPanelOpen : ""}`}
      ref={ref}
    >
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={[styles.tab, activeTab === tab.id ? styles.tabActive : ""].join(" ")}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            {tabCount(tab.id) > 0 && (
              <span className={styles.tabCount}>{tabCount(tab.id)}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === "priority" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Selecciona una o mas prioridades</div>
            {PRIORITIES.map(p => {
              const active = selectedPriorities.includes(p.id)
              return (
                <button
                  key={p.id}
                  className={[styles.optionItem, active ? styles.optionItemActive : ""].join(" ")}
                  onClick={() => toggle(setSelectedPriorities, p.id)}
                >
                  <span className={styles.priorityDot} style={{ background: p.color }} />
                  <span className={styles.optionLabel}>{p.label}</span>
                  {active && <span className={styles.checkMark}>v</span>}
                </button>
              )
            })}
          </div>
        )}

        {activeTab === "tag" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Filtra por etiqueta</div>
            {loadingData ? (
              <div style={{ color: "#666", fontSize: "12px", padding: "8px 0" }}>Cargando...</div>
            ) : etiquetas.length === 0 ? (
              <div style={{ color: "#666", fontSize: "12px", padding: "8px 0" }}>Sin etiquetas en este proyecto</div>
            ) : etiquetas.map(t => {
              const active = selectedTags.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={[styles.optionItem, active ? styles.optionItemActive : ""].join(" ")}
                  onClick={() => toggle(setSelectedTags, t.id)}
                >
                  <span
                    className={styles.tagPill}
                    style={{ background: t.color + "33", color: t.color, borderColor: t.color + "66" }}
                  >
                    {t.nombre}
                  </span>
                  {active && <span className={styles.checkMark}>v</span>}
                </button>
              )
            })}
          </div>
        )}

        {activeTab === "member" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Filtra por miembro asignado</div>
            {loadingData ? (
              <div style={{ color: "#666", fontSize: "12px", padding: "8px 0" }}>Cargando...</div>
            ) : miembros.length === 0 ? (
              <div style={{ color: "#666", fontSize: "12px", padding: "8px 0" }}>Sin miembros en este proyecto</div>
            ) : miembros.map(m => {
              const active = selectedMembers.includes(m.id)
              return (
                <button
                  key={m.id}
                  className={[styles.optionItem, active ? styles.optionItemActive : ""].join(" ")}
                  onClick={() => toggle(setSelectedMembers, m.id)}
                >
                  <span className={styles.memberAvatar} style={{ background: m.color }}>
                    {m.avatar}
                  </span>
                  <span className={styles.optionLabel}>{m.label}</span>
                  {active && <span className={styles.checkMark}>v</span>}
                </button>
              )
            })}
          </div>
        )}
        {activeTab === "list" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Muestra solo las listas seleccionadas</div>
            {columns.length === 0 ? (
              <div style={{ color: "#666", fontSize: "12px", padding: "8px 0" }}>Sin listas en este tablero</div>
            ) : columns.map(col => {
              const active = selectedLists.includes(col.id)
              return (
                <button
                  key={col.id}
                  className={[styles.optionItem, active ? styles.optionItemActive : ""].join(" ")}
                  onClick={() => toggle(setSelectedLists, col.id)}
                >
                  <span className={styles.priorityDot} style={{ background: col.color || "#5a4fcf" }} />
                  <span className={styles.optionLabel}>{col.nombre}</span>
                  {active && <span className={styles.checkMark}>v</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {activeCount > 0 && (
        <div className={styles.activeSummary}>
          <div className={styles.activeSummaryTitle}>Filtros activos</div>
          <div className={styles.activeChips}>
            {selectedPriorities.map(id => {
              const p = PRIORITIES.find(x => x.id === id)
              return p ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: p.color }} />
                  {p.label}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedPriorities, id)}>x</button>
                </span>
              ) : null
            })}
            {selectedTags.map(id => {
              const t = etiquetas.find(x => x.id === id)
              return t ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: t.color }} />
                  {t.nombre}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedTags, id)}>x</button>
                </span>
              ) : null
            })}
            {selectedMembers.map(id => {
              const m = miembros.find(x => x.id === id)
              return m ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipAvatar} style={{ background: m.color }}>{m.avatar}</span>
                  {m.label}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedMembers, id)}>x</button>
                </span>
              ) : null
            })}
            {selectedLists.map(id => {
              const col = columns.find(x => x.id === id)
              return col ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: col.color || "#5a4fcf" }} />
                  {col.nombre}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedLists, id)}>x</button>
                </span>
              ) : null
            })}
          </div>
          <button className={styles.clearBtn} onClick={clearAll}>Limpiar todo</button>
        </div>
      )}
    </div>
  )
}
