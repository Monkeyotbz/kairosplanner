import { useState, useEffect } from "react"
import { getProjectMembers } from "../../services/boardService"
import { useBoardStore } from "../../store/boardStore"
import styles from "./FilterPanel.module.css"

const PRIORITIES = [
  { id: "alta",   label: "Alta",   color: "#ef4444" },
  { id: "normal", label: "Normal", color: "#eab308" },
  { id: "baja",   label: "Baja",   color: "#22c55e" },
]

const TABS = [
  { id: "priority", label: "Prioridad"    },
  { id: "tag",      label: "Etiqueta"     },
  { id: "member",   label: "Miembro"      },
  { id: "list",     label: "Lista"        },
  { id: "fecha",    label: "Fecha límite" },
  { id: "subtareas", label: "Subtareas"   },
]

const FECHA_BUCKETS = [
  { id: "vencida",  label: "Vencidas",         color: "#ef4444" },
  { id: "hoy",      label: "Vence hoy",        color: "#fb923c" },
  { id: "semana",   label: "Vence esta semana", color: "#facc15" },
  { id: "sinfecha", label: "Sin fecha",        color: "#6b7280" },
]

const SUBTAREA_BUCKETS = [
  { id: "pendientes", label: "Con pendientes",  color: "#f59e0b" },
  { id: "completas",  label: "Todas completas", color: "#22c55e" },
  { id: "sin",        label: "Sin subtareas",   color: "#6b7280" },
]

export default function FilterPanel({ proyectoId, onFilterChange, onClose }) {
  const [activeTab, setActiveTab] = useState("priority")
  const [selectedPriorities, setSelectedPriorities] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [selectedLists, setSelectedLists] = useState([])
  const [selectedFecha, setSelectedFecha] = useState([])
  const [selectedSubtareas, setSelectedSubtareas] = useState([])
  const [soloSinAsignar, setSoloSinAsignar] = useState(false)
  const [soloSinEtiquetas, setSoloSinEtiquetas] = useState(false)
  const [soloSinLeer, setSoloSinLeer] = useState(false)
  const [soloConTiempo, setSoloConTiempo] = useState(false)
  const etiquetas = useBoardStore(s => s.etiquetas)
  const columns = useBoardStore(s => s.columns)
  const [miembros, setMiembros] = useState([])
  const [loadingData, setLoadingData] = useState(false)

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
      onFilterChange({
        selectedPriorities, selectedTags, selectedMembers, selectedLists,
        selectedFecha, selectedSubtareas, soloSinAsignar, soloSinEtiquetas,
        soloSinLeer, soloConTiempo,
      })
    }
  }, [selectedPriorities, selectedTags, selectedMembers, selectedLists, selectedFecha, selectedSubtareas, soloSinAsignar, soloSinEtiquetas, soloSinLeer, soloConTiempo])

  const toggle = (setList, id) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const activeCount = selectedPriorities.length + selectedTags.length + selectedMembers.length + selectedLists.length
    + selectedFecha.length + selectedSubtareas.length + (soloSinAsignar ? 1 : 0) + (soloSinEtiquetas ? 1 : 0)
    + (soloSinLeer ? 1 : 0) + (soloConTiempo ? 1 : 0)

  const clearAll = () => {
    setSelectedPriorities([])
    setSelectedTags([])
    setSelectedMembers([])
    setSelectedLists([])
    setSelectedFecha([])
    setSelectedSubtareas([])
    setSoloSinAsignar(false)
    setSoloSinEtiquetas(false)
    setSoloSinLeer(false)
    setSoloConTiempo(false)
  }

  const tabCount = (id) => {
    if (id === "priority")   return selectedPriorities.length
    if (id === "tag")        return selectedTags.length
    if (id === "member")     return selectedMembers.length
    if (id === "list")       return selectedLists.length
    if (id === "fecha")      return selectedFecha.length
    if (id === "subtareas")  return selectedSubtareas.length
    return 0
  }

  return (
    <aside className={styles.filterPanel}>
      <div className={styles.header}>
        <span className={styles.title}>Filtros</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar filtros">✕</button>
      </div>

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
                  {active && <span className={styles.checkMark}>✓</span>}
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
                  {active && <span className={styles.checkMark}>✓</span>}
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
                  {active && <span className={styles.checkMark}>✓</span>}
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
                  {active && <span className={styles.checkMark}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {activeTab === "fecha" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Filtra por vencimiento</div>
            {FECHA_BUCKETS.map(f => {
              const active = selectedFecha.includes(f.id)
              return (
                <button
                  key={f.id}
                  className={[styles.optionItem, active ? styles.optionItemActive : ""].join(" ")}
                  onClick={() => toggle(setSelectedFecha, f.id)}
                >
                  <span className={styles.priorityDot} style={{ background: f.color }} />
                  <span className={styles.optionLabel}>{f.label}</span>
                  {active && <span className={styles.checkMark}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {activeTab === "subtareas" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Filtra por estado del checklist</div>
            {SUBTAREA_BUCKETS.map(s => {
              const active = selectedSubtareas.includes(s.id)
              return (
                <button
                  key={s.id}
                  className={[styles.optionItem, active ? styles.optionItemActive : ""].join(" ")}
                  onClick={() => toggle(setSelectedSubtareas, s.id)}
                >
                  <span className={styles.priorityDot} style={{ background: s.color }} />
                  <span className={styles.optionLabel}>{s.label}</span>
                  {active && <span className={styles.checkMark}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className={styles.quickRow}>
        <button
          className={[styles.quickChip, soloSinAsignar ? styles.quickChipActive : ""].join(" ")}
          onClick={() => setSoloSinAsignar(v => !v)}
        >
          Sin asignar
        </button>
        <button
          className={[styles.quickChip, soloSinEtiquetas ? styles.quickChipActive : ""].join(" ")}
          onClick={() => setSoloSinEtiquetas(v => !v)}
        >
          Sin etiquetas
        </button>
        <button
          className={[styles.quickChip, soloSinLeer ? styles.quickChipActive : ""].join(" ")}
          onClick={() => setSoloSinLeer(v => !v)}
        >
          Comentarios sin leer
        </button>
        <button
          className={[styles.quickChip, soloConTiempo ? styles.quickChipActive : ""].join(" ")}
          onClick={() => setSoloConTiempo(v => !v)}
        >
          Con tiempo registrado
        </button>
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
                  <button className={styles.chipX} onClick={() => toggle(setSelectedPriorities, id)}>✕</button>
                </span>
              ) : null
            })}
            {selectedTags.map(id => {
              const t = etiquetas.find(x => x.id === id)
              return t ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: t.color }} />
                  {t.nombre}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedTags, id)}>✕</button>
                </span>
              ) : null
            })}
            {selectedMembers.map(id => {
              const m = miembros.find(x => x.id === id)
              return m ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipAvatar} style={{ background: m.color }}>{m.avatar}</span>
                  {m.label}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedMembers, id)}>✕</button>
                </span>
              ) : null
            })}
            {selectedLists.map(id => {
              const col = columns.find(x => x.id === id)
              return col ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: col.color || "#5a4fcf" }} />
                  {col.nombre}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedLists, id)}>✕</button>
                </span>
              ) : null
            })}
            {selectedFecha.map(id => {
              const f = FECHA_BUCKETS.find(x => x.id === id)
              return f ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: f.color }} />
                  {f.label}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedFecha, id)}>✕</button>
                </span>
              ) : null
            })}
            {selectedSubtareas.map(id => {
              const s = SUBTAREA_BUCKETS.find(x => x.id === id)
              return s ? (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: s.color }} />
                  {s.label}
                  <button className={styles.chipX} onClick={() => toggle(setSelectedSubtareas, id)}>✕</button>
                </span>
              ) : null
            })}
            {soloSinAsignar && (
              <span className={styles.chip}>
                Sin asignar
                <button className={styles.chipX} onClick={() => setSoloSinAsignar(false)}>✕</button>
              </span>
            )}
            {soloSinEtiquetas && (
              <span className={styles.chip}>
                Sin etiquetas
                <button className={styles.chipX} onClick={() => setSoloSinEtiquetas(false)}>✕</button>
              </span>
            )}
            {soloSinLeer && (
              <span className={styles.chip}>
                Comentarios sin leer
                <button className={styles.chipX} onClick={() => setSoloSinLeer(false)}>✕</button>
              </span>
            )}
            {soloConTiempo && (
              <span className={styles.chip}>
                Con tiempo registrado
                <button className={styles.chipX} onClick={() => setSoloConTiempo(false)}>✕</button>
              </span>
            )}
          </div>
          <button className={styles.clearBtn} onClick={clearAll}>Limpiar todo</button>
        </div>
      )}
    </aside>
  )
}
