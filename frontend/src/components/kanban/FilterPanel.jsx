import { useState } from "react"
import styles from "./FilterPanel.module.css"

const PRIORITIES = [
  { id: "urgent", label: "Urgente", color: "#ef4444" },
  { id: "high", label: "Alta", color: "#f97316" },
  { id: "medium", label: "Media", color: "#eab308" },
  { id: "low", label: "Baja", color: "#22c55e" },
]

const TAGS = [
  { id: "design", label: "Diseño", color: "#8b5cf6" },
  { id: "dev", label: "Desarrollo", color: "#3b82f6" },
  { id: "marketing", label: "Marketing", color: "#ec4899" },
  { id: "ops", label: "Operaciones", color: "#14b8a6" },
  { id: "research", label: "Investigación", color: "#f59e0b" },
]

const MEMBERS = [
  { id: "j", label: "Juanse", avatar: "J", color: "#5a4fcf" },
  { id: "m", label: "María", avatar: "M", color: "#ec4899" },
  { id: "c", label: "Carlos", avatar: "C", color: "#14b8a6" },
  { id: "a", label: "Ana", avatar: "A", color: "#f97316" },
]

const TABS = [
  { id: "priority", icon: "🔴", label: "Prioridad" },
  { id: "tag", icon: "🏷️", label: "Etiqueta" },
  { id: "member", icon: "👤", label: "Miembro" },
]

export default function FilterPanel({ open }) {
  const [activeTab, setActiveTab] = useState("priority")
  const [selectedPriorities, setSelectedPriorities] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])

  const toggle = (setList, id) =>
    setList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const activeCount =
    selectedPriorities.length + selectedTags.length + selectedMembers.length

  const clearAll = () => {
    setSelectedPriorities([])
    setSelectedTags([])
    setSelectedMembers([])
  }

  const tabCount = (id) => {
    if (id === "priority") return selectedPriorities.length
    if (id === "tag") return selectedTags.length
    if (id === "member") return selectedMembers.length
    return 0
  }

  return (
    <div
      className={styles.filterPanel}
      style={{
        width: open ? 220 : 0,
        opacity: open ? 1 : 0,
        padding: open ? "16px 14px" : "0",
        overflow: "hidden",
        transition: "width 0.25s ease, opacity 0.2s ease, padding 0.25s ease",
      }}
    >
      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
            {tabCount(tab.id) > 0 && (
              <span className={styles.tabCount}>{tabCount(tab.id)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>

        {/* Priority */}
        {activeTab === "priority" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Selecciona una o más prioridades</div>
            {PRIORITIES.map((p) => {
              const active = selectedPriorities.includes(p.id)
              return (
                <button
                  key={p.id}
                  className={`${styles.optionItem} ${active ? styles.optionItemActive : ""}`}
                  onClick={() => toggle(setSelectedPriorities, p.id)}
                >
                  <span
                    className={styles.priorityDot}
                    style={{ background: p.color }}
                  />
                  <span className={styles.optionLabel}>{p.label}</span>
                  {active && <span className={styles.checkMark}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Tag */}
        {activeTab === "tag" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Filtra por etiqueta</div>
            {TAGS.map((t) => {
              const active = selectedTags.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={`${styles.optionItem} ${active ? styles.optionItemActive : ""}`}
                  onClick={() => toggle(setSelectedTags, t.id)}
                >
                  <span
                    className={styles.tagPill}
                    style={{ background: t.color + "33", color: t.color, borderColor: t.color + "66" }}
                  >
                    {t.label}
                  </span>
                  {active && <span className={styles.checkMark}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Member */}
        {activeTab === "member" && (
          <div className={styles.optionList}>
            <div className={styles.sectionHint}>Filtra por miembro asignado</div>
            {MEMBERS.map((m) => {
              const active = selectedMembers.includes(m.id)
              return (
                <button
                  key={m.id}
                  className={`${styles.optionItem} ${active ? styles.optionItemActive : ""}`}
                  onClick={() => toggle(setSelectedMembers, m.id)}
                >
                  <span
                    className={styles.memberAvatar}
                    style={{ background: m.color }}
                  >
                    {m.avatar}
                  </span>
                  <span className={styles.optionLabel}>{m.label}</span>
                  {active && <span className={styles.checkMark}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Active filters summary */}
      {activeCount > 0 && (
        <div className={styles.activeSummary}>
          <div className={styles.activeSummaryTitle}>Filtros activos</div>
          <div className={styles.activeChips}>
            {selectedPriorities.map((id) => {
              const p = PRIORITIES.find((x) => x.id === id)
              return (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: p.color }} />
                  {p.label}
                  <button
                    className={styles.chipX}
                    onClick={() => toggle(setSelectedPriorities, id)}
                  >
                    ×
                  </button>
                </span>
              )
            })}
            {selectedTags.map((id) => {
              const t = TAGS.find((x) => x.id === id)
              return (
                <span key={id} className={styles.chip}>
                  <span className={styles.chipDot} style={{ background: t.color }} />
                  {t.label}
                  <button
                    className={styles.chipX}
                    onClick={() => toggle(setSelectedTags, id)}
                  >
                    ×
                  </button>
                </span>
              )
            })}
            {selectedMembers.map((id) => {
              const m = MEMBERS.find((x) => x.id === id)
              return (
                <span key={id} className={styles.chip}>
                  <span
                    className={styles.chipAvatar}
                    style={{ background: m.color }}
                  >
                    {m.avatar}
                  </span>
                  {m.label}
                  <button
                    className={styles.chipX}
                    onClick={() => toggle(setSelectedMembers, id)}
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
          <button className={styles.clearBtn} onClick={clearAll}>
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}
