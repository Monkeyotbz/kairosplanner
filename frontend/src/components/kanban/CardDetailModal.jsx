import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../../store/boardStore'
import { useFocusStore } from '../../store/focusStore'
import { getProjectMembers } from '../../services/boardService'
import CardChecklist from './CardChecklist'
import styles from './CardDetailModal.module.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function buildDateInfo(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const isToday    = d.getTime() === today.getTime()
  const isTomorrow = d.getTime() === tomorrow.getTime()
  const isPast     = d < today && !isToday
  const label = d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  const suffix = isToday ? ' · vence hoy' : isTomorrow ? ' · mañana' : isPast ? ' · vencida' : ''
  return { label: label + suffix, isPast }
}

const PRIORITY_META = {
  baja:   { label: 'Baja prioridad',   bg: 'rgba(99,153,34,0.18)',   color: '#86efac' },
  normal: { label: 'Prioridad normal', bg: 'rgba(83,74,183,0.18)',   color: 'var(--kairos-purple-200)' },
  alta:   { label: 'Alta prioridad',   bg: 'rgba(216,90,48,0.18)',   color: '#fca07a' },
}

const PRIORITY_BTNS = [
  { key: 'baja',   label: 'Baja',   color: '#86efac',  bg: 'rgba(99,153,34,0.18)',  border: 'rgba(99,153,34,0.35)'  },
  { key: 'normal', label: 'Normal', color: 'var(--kairos-purple-200)', bg: 'rgba(83,74,183,0.18)', border: 'rgba(83,74,183,0.35)' },
  { key: 'alta',   label: 'Alta',   color: '#fca07a',  bg: 'rgba(216,90,48,0.18)', border: 'rgba(216,90,48,0.35)' },
]

export default function CardDetailModal() {
  const navigate = useNavigate()
  const { selectedCard, clearSelectedCard, editCard, removeCard, columns, proyecto } = useBoardStore()
  const { phase, tipo, duracion_plan_min, elapsedSeconds, startBreak, finishSession } = useFocusStore()

  const [localTitle,   setLocalTitle]   = useState('')
  const [localDesc,    setLocalDesc]    = useState('')
  const [localDate,    setLocalDate]    = useState('')
  const [members,      setMembers]      = useState([])
  const [addSubtask,   setAddSubtask]   = useState(0)
  const dateRef = useRef(null)

  useEffect(() => {
    if (!selectedCard) return
    setLocalTitle(selectedCard.titulo      || '')
    setLocalDesc (selectedCard.descripcion || '')
    setLocalDate (selectedCard.fecha_limite || '')
  }, [selectedCard?.id])

  useEffect(() => {
    if (!selectedCard || !proyecto?.id) return
    getProjectMembers(proyecto.id).then(setMembers).catch(() => {})
  }, [selectedCard?.id, proyecto?.id])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') clearSelectedCard() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [clearSelectedCard])

  if (!selectedCard) return null

  const column    = columns.find(c => c.id === selectedCard.columna_id)
  const coverBg   = column?.color || 'var(--kairos-purple-600)'
  const isActive  = phase === 'active'
  const isPomodoro = tipo === 'pomodoro'
  const totalSec  = isPomodoro ? duracion_plan_min * 60 : null
  const displaySec = isPomodoro ? Math.max(0, totalSec - elapsedSeconds) : elapsedSeconds
  const dateInfo  = buildDateInfo(selectedCard.fecha_limite)
  const prioMeta  = selectedCard.prioridad ? PRIORITY_META[selectedCard.prioridad] : null

  function saveTitle() {
    const t = localTitle.trim()
    if (!t || t === selectedCard.titulo) return
    editCard(selectedCard.id, selectedCard.columna_id, { titulo: t })
  }

  function saveDesc() {
    const d = localDesc.trim()
    if (d === (selectedCard.descripcion || '')) return
    editCard(selectedCard.id, selectedCard.columna_id, { descripcion: d || null })
  }

  function saveDate() {
    const d = localDate || null
    if (d === (selectedCard.fecha_limite || null)) return
    editCard(selectedCard.id, selectedCard.columna_id, { fecha_limite: d })
  }

  function togglePriority(key) {
    const next = selectedCard.prioridad === key ? null : key
    editCard(selectedCard.id, selectedCard.columna_id, { prioridad: next })
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la tarjeta "${selectedCard.titulo}"? Esta acción no se puede deshacer.`)) return
    clearSelectedCard()
    await removeCard(selectedCard.id, selectedCard.columna_id)
  }

  return (
    <div className={styles.overlay} onClick={clearSelectedCard}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── Cover ── */}
        <div className={styles.cover} style={{ background: coverBg }}>
          <i className="ti ti-layout-kanban" aria-hidden="true" />
          <button className={styles.coverBtn}>
            <i className="ti ti-photo" aria-hidden="true" /> Cambiar portada
          </button>
          <button className={styles.closeBtn} onClick={clearSelectedCard} aria-label="Cerrar">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {/* Labels row */}
            <div className={styles.labelsRow}>
              {selectedCard.labels?.map(lbl => (
                <span
                  key={lbl.id}
                  className={styles.lbl}
                  style={{ background: `${lbl.color}28`, color: lbl.color }}
                >
                  {lbl.nombre}
                </span>
              ))}
              {prioMeta && (
                <span className={styles.lbl} style={{ background: prioMeta.bg, color: prioMeta.color }}>
                  {prioMeta.label}
                </span>
              )}
              <button className={styles.lblAdd}>
                <i className="ti ti-plus" aria-hidden="true" /> Etiqueta
              </button>
            </div>

            {/* Title */}
            <textarea
              className={styles.titleInput}
              value={localTitle}
              onChange={e => setLocalTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
              rows={2}
            />

            {/* Meta row */}
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Asignado a</span>
                <div className={styles.metaVal}>
                  <div className={styles.avatarSm}>?</div>
                  <span>Sin asignar</span>
                </div>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Fecha límite</span>
                <div className={styles.metaVal} style={{ position: 'relative' }}>
                  {dateInfo ? (
                    <button
                      className={`${styles.dueChip} ${dateInfo.isPast ? styles.dueChipPast : ''}`}
                      onClick={() => dateRef.current?.showPicker?.()}
                    >
                      <i className="ti ti-calendar-x" aria-hidden="true" /> {dateInfo.label}
                    </button>
                  ) : (
                    <button className={styles.metaEmpty} onClick={() => dateRef.current?.showPicker?.()}>
                      <i className="ti ti-calendar" aria-hidden="true" /> Añadir fecha
                    </button>
                  )}
                  <input
                    ref={dateRef}
                    type="date"
                    className={styles.hiddenDate}
                    value={localDate}
                    onChange={e => setLocalDate(e.target.value)}
                    onBlur={saveDate}
                  />
                </div>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Columna</span>
                <div className={styles.metaVal}>
                  <i className="ti ti-layout-kanban" style={{ color: column?.color }} aria-hidden="true" />
                  <span>{column?.nombre}</span>
                </div>
              </div>
            </div>

            {/* Timer block */}
            <div className={styles.timerBlock}>
              <div className={styles.timerHead}>
                <i className="ti ti-clock-play" aria-hidden="true" />
                <span className={styles.timerHeadTitle}>Temporizador de sesión</span>
              </div>
              {isActive ? (
                <>
                  <div className={styles.timerDisplay}>
                    <span className={styles.timerPulse} />
                    {formatTime(displaySec)}
                  </div>
                  <div className={styles.timerBtns}>
                    <button className={styles.tBtnPause} onClick={startBreak}>
                      <i className="ti ti-player-pause" aria-hidden="true" /> Pausar
                    </button>
                    <button className={styles.tBtnStop} onClick={finishSession}>
                      <i className="ti ti-player-stop" aria-hidden="true" /> Detener y guardar
                    </button>
                  </div>
                </>
              ) : (
                <button className={styles.timerStartBtn} onClick={() => { clearSelectedCard(); navigate('/focus') }}>
                  <i className="ti ti-clock-play" aria-hidden="true" /> Iniciar sesión de enfoque
                </button>
              )}
            </div>

            {/* Subtareas / Checklist */}
            <div>
              <div className={styles.sectionTitle}>
                <i className="ti ti-checklist" aria-hidden="true" /> Subtareas
              </div>
              <CardChecklist cardId={selectedCard.id} triggerAdd={addSubtask} />
            </div>

            {/* Description */}
            <div>
              <div className={styles.sectionTitle}>
                <i className="ti ti-align-left" aria-hidden="true" /> Descripción
              </div>
              <textarea
                className={styles.descArea}
                value={localDesc}
                onChange={e => setLocalDesc(e.target.value)}
                onBlur={saveDesc}
                placeholder="Añade una descripción detallada..."
                rows={4}
              />
            </div>

            {/* Comments placeholder */}
            <div>
              <div className={styles.sectionTitle}>
                <i className="ti ti-message" aria-hidden="true" /> Comentarios
                <span className={styles.comingBadge}>Próximamente</span>
              </div>
              <div className={styles.placeholderBox}>
                Los comentarios del equipo llegarán en la próxima versión.
              </div>
            </div>

          </div>

          {/* ── Side column ── */}
          <div className={styles.sideCol}>

            <span className={styles.sideLabel}>Miembros</span>
            <div className={styles.membersList}>
              {members.length > 0 ? members.map(m => {
                const name = m.usuarios?.nombre || m.usuarios?.email || '?'
                const initials = name.slice(0, 2).toUpperCase()
                return (
                  <div key={m.usuario_id} className={styles.memberRow}>
                    <div className={styles.memberAv}>{initials}</div>
                    <div>
                      <div className={styles.memberName}>{name}</div>
                      <div className={styles.memberRole}>{m.rol}</div>
                    </div>
                  </div>
                )
              }) : (
                <div className={styles.memberRow}>
                  <div className={styles.memberAv}>?</div>
                  <div><div className={styles.memberName}>Sin miembros</div></div>
                </div>
              )}
            </div>

            <span className={styles.sideLabel}>Prioridad</span>
            <div className={styles.priorityBtns}>
              {PRIORITY_BTNS.map(p => {
                const active = selectedCard.prioridad === p.key
                return (
                  <button
                    key={p.key}
                    className={`${styles.priorityBtn} ${active ? styles.priorityBtnActive : ''}`}
                    style={active ? { color: p.color, background: p.bg, borderColor: p.border } : undefined}
                    onClick={() => togglePriority(p.key)}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            <span className={styles.sideLabel}>Acciones</span>
            <button className={styles.sideBtn} onClick={() => dateRef.current?.showPicker?.()}>
              <i className="ti ti-calendar" aria-hidden="true" /> Fecha límite
            </button>
            <button className={styles.sideBtn}>
              <i className="ti ti-tag" aria-hidden="true" /> Editar etiquetas
            </button>
            <button className={styles.sideBtn}>
              <i className="ti ti-user-plus" aria-hidden="true" /> Asignar miembro
            </button>
            <button className={styles.sideBtn} onClick={() => setAddSubtask(n => n + 1)}>
              <i className="ti ti-checklist" aria-hidden="true" /> Añadir subtarea
            </button>
            <button className={styles.sideBtn}>
              <i className="ti ti-photo" aria-hidden="true" /> Portada
            </button>

            <span className={styles.sideLabel}>Peligro</span>
            <button className={`${styles.sideBtn} ${styles.sideBtnDanger}`} onClick={handleDelete}>
              <i className="ti ti-trash" aria-hidden="true" /> Eliminar tarjeta
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
