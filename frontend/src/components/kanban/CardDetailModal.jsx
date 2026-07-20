import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../../store/boardStore'
import { useFocusStore } from '../../store/focusStore'
import { getProjectMembers } from '../../services/boardService'
import CardChecklist from './CardChecklist'
import CardTimeTracker from './CardTimeTracker'
import LabelPicker from './LabelPicker'
import CardComments from './CardComments'
import CoverPicker from './CoverPicker'
import styles from './CardDetailModal.module.css'
import { IconAlignLeft, IconCalendar, IconChecklist, IconClockPlay, IconHourglass, IconLayoutKanban, IconMaximize, IconMessage, IconPhoto, IconPlayerPause, IconPlayerStop, IconPlus, IconTag, IconTrash, IconUser, IconUserPlus, IconX } from '@tabler/icons-react'

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
  const { phase, tipo, duracion_plan_min, elapsedSeconds, startBreak, finishSession, startSession, enterImmersive } = useFocusStore()

  const [localTitle,    setLocalTitle]    = useState('')
  const [localDesc,     setLocalDesc]     = useState('')
  const [localDate,     setLocalDate]     = useState('')
  const [localCoverUrl, setLocalCoverUrl] = useState(undefined)
  const [members,      setMembers]      = useState([])
  const [addSubtask,   setAddSubtask]   = useState(0)
  const [showLabels,   setShowLabels]   = useState(false)
  const [showAssign,   setShowAssign]   = useState(false)
  const [coverPicker,  setCoverPicker]  = useState({ open: false, top: 0, right: 0 })
  const [labelsSide, setLabelsSide] = useState({ open: false, top: 0, right: 0 })
  const [assignSide, setAssignSide] = useState({ open: false, top: 0, right: 0 })
  const dateRef       = useRef(null)
  const assignRef     = useRef(null)
  const labelsWrapRef = useRef(null)
  const assignWrapRef = useRef(null)

  useEffect(() => {
    if (!selectedCard) return
    setLocalTitle(selectedCard.titulo      || '')
    setLocalDesc (selectedCard.descripcion || '')
    setLocalDate (selectedCard.fecha_limite || '')
    setLocalCoverUrl(undefined)
    setShowLabels(false)
    setShowAssign(false)
    setCoverPicker({ open: false, top: 0, right: 0 })
    setLabelsSide({ open: false, top: 0, right: 0 })
    setAssignSide({ open: false, top: 0, right: 0 })
  }, [selectedCard?.id])

  useEffect(() => {
    if (!selectedCard || !proyecto?.id) return
    getProjectMembers(proyecto.id).then(setMembers).catch(() => {})
  }, [selectedCard?.id, proyecto?.id])

  // Cerrar dropdowns al hacer click afuera
  useEffect(() => {
    function onClickOut(e) {
      if (assignRef.current     && !assignRef.current.contains(e.target))     setShowAssign(false)
      if (labelsWrapRef.current && !labelsWrapRef.current.contains(e.target)) setLabelsSide(s => s.open ? { ...s, open: false } : s)
      if (assignWrapRef.current && !assignWrapRef.current.contains(e.target)) setAssignSide(s => s.open ? { ...s, open: false } : s)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

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

  // Miembro asignado
  const assignedMember = members.find(m => m.usuario_id === selectedCard.asignado_a)
  const assignedName   = assignedMember?.usuarios?.nombre || assignedMember?.usuarios?.email || null

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

  function assignTo(userId) {
    setShowAssign(false)
    const next = selectedCard.asignado_a === userId ? null : userId
    editCard(selectedCard.id, selectedCard.columna_id, { asignado_a: next })
  }

  function openCoverPicker(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const pickerW = 380
    let right = window.innerWidth - r.right
    if (window.innerWidth - right - pickerW < 8) right = window.innerWidth - pickerW - 8
    let top = r.bottom + 8
    if (top + 340 > window.innerHeight) top = Math.max(8, r.top - 340 - 8)
    setCoverPicker({ open: true, top, right })
  }

  function handleCoverSelect(url) {
    const normalized = url?.trim() || null
    setLocalCoverUrl(normalized)          // feedback inmediato sin esperar Supabase
    editCard(selectedCard.id, selectedCard.columna_id, { cover_url: normalized })
    setCoverPicker(p => ({ ...p, open: false }))
  }

  function handleCoverRemove() {
    setLocalCoverUrl(null)
    editCard(selectedCard.id, selectedCard.columna_id, { cover_url: null })
    setCoverPicker(p => ({ ...p, open: false }))
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la tarjeta "${selectedCard.titulo}"? Esta acción no se puede deshacer.`)) return
    clearSelectedCard()
    await removeCard(selectedCard.id, selectedCard.columna_id)
  }

  // Modo Enfoque Inmersivo: enfoca esta tarjeta ocultando todo el chrome.
  // Si no hay sesión activa, arranca una sesión libre ligada al proyecto.
  async function handleImmersive() {
    const task = {
      id: selectedCard.id,
      titulo: localTitle.trim() || selectedCard.titulo,
      descripcion: localDesc.trim() || selectedCard.descripcion || null,
      prioridad: selectedCard.prioridad || null,
    }
    if (phase !== 'active') {
      try {
        await startSession({ tipo: 'libre', duracion_plan_min: null, proyecto_id: proyecto?.id || null })
      } catch (_) { /* aun sin sesión, permitimos el modo inmersivo */ }
    }
    enterImmersive(task)
    clearSelectedCard()
  }

  return (
    <div className={styles.overlay} onClick={clearSelectedCard}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── Cover ── */}
        <div className={styles.cover} style={{ background: coverBg }}>
          {(localCoverUrl !== undefined ? localCoverUrl : selectedCard.cover_url) && (
            <img
              src={localCoverUrl !== undefined ? localCoverUrl : selectedCard.cover_url}
              alt=""
              className={styles.coverImg}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          )}
          <IconLayoutKanban size="1em" aria-hidden="true" />
          <div className={styles.coverActions}>
            <button className={styles.coverBtn} onClick={openCoverPicker}>
              <IconPhoto size="1em" aria-hidden="true" /> Cambiar portada
            </button>
          </div>
          <button className={styles.closeBtn} onClick={clearSelectedCard} aria-label="Cerrar">
            <IconX size="1em" aria-hidden="true" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {/* Labels row */}
            <div className={styles.labelsRow} style={{ position: 'relative' }}>
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
              <button className={styles.lblAdd} onClick={() => setShowLabels(v => !v)}>
                <IconPlus size="1em" aria-hidden="true" /> Etiqueta
              </button>
              {showLabels && <LabelPicker onClose={() => setShowLabels(false)} />}
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
              {/* Asignado a */}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Asignado a</span>
                <div className={styles.metaVal} style={{ position: 'relative' }} ref={assignRef}>
                  <button
                    className={assignedName ? styles.assignedChip : styles.metaEmpty}
                    onClick={() => setShowAssign(v => !v)}
                  >
                    {assignedName ? (
                      <>
                        <div className={styles.avatarSm}>{assignedName[0].toUpperCase()}</div>
                        <span>{assignedName}</span>
                      </>
                    ) : (
                      <><IconUser size="1em" aria-hidden="true" /> Asignar</>
                    )}
                  </button>
                  {showAssign && (
                    <div className={styles.assignMenu}>
                      <button
                        className={`${styles.assignItem} ${!selectedCard.asignado_a ? styles.assignActive : ''}`}
                        onClick={() => assignTo(null)}
                      >
                        <div className={styles.assignAv}>–</div>
                        <span>Sin asignar</span>
                      </button>
                      {members.map(m => {
                        const name = m.usuarios?.nombre || m.usuarios?.email || '?'
                        const active = selectedCard.asignado_a === m.usuario_id
                        return (
                          <button
                            key={m.usuario_id}
                            className={`${styles.assignItem} ${active ? styles.assignActive : ''}`}
                            onClick={() => assignTo(m.usuario_id)}
                          >
                            <div className={styles.assignAv}>{name[0].toUpperCase()}</div>
                            <span>{name}</span>
                            {active && <span className={styles.assignCheck}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Fecha límite — input nativo visible (showPicker fallaba
                  en algunos navegadores y el selector "no abría") */}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Fecha límite</span>
                <input
                  ref={dateRef}
                  type="date"
                  className={`${styles.dateInput} ${dateInfo?.isPast ? styles.dateInputPast : ''}`}
                  value={localDate}
                  onChange={e => setLocalDate(e.target.value)}
                  onBlur={saveDate}
                />
              </div>

              {/* Columna */}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Columna</span>
                <div className={styles.metaVal}>
                  <IconLayoutKanban size="1em" style={{ color: column?.color }} aria-hidden="true" />
                  <span>{column?.nombre}</span>
                </div>
              </div>
            </div>

            {/* Timer block */}
            <div className={styles.timerBlock}>
              <div className={styles.timerHead}>
                <IconClockPlay size="1em" aria-hidden="true" />
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
                      <IconPlayerPause size="1em" aria-hidden="true" /> Pausar
                    </button>
                    <button className={styles.tBtnStop} onClick={finishSession}>
                      <IconPlayerStop size="1em" aria-hidden="true" /> Detener y guardar
                    </button>
                  </div>
                  <button className={styles.timerImmersiveBtn} style={{ marginTop: 10 }} onClick={handleImmersive}>
                    <IconMaximize size="1em" aria-hidden="true" /> Modo inmersivo
                  </button>
                </>
              ) : (
                <div className={styles.timerBtns}>
                  <button className={styles.timerStartBtn} onClick={() => { clearSelectedCard(); navigate('/focus') }}>
                    <IconClockPlay size="1em" aria-hidden="true" /> Iniciar sesión
                  </button>
                  <button className={styles.timerImmersiveBtn} onClick={handleImmersive}>
                    <IconMaximize size="1em" aria-hidden="true" /> Modo inmersivo
                  </button>
                </div>
              )}
            </div>

            {/* Tiempo registrado en esta tarjeta */}
            <div>
              <div className={styles.sectionTitle}>
                <IconHourglass size="1em" aria-hidden="true" /> Tiempo en esta tarjeta
              </div>
              <CardTimeTracker cardId={selectedCard.id} />
            </div>

            {/* Subtareas */}
            <div>
              <div className={styles.sectionTitle}>
                <IconChecklist size="1em" aria-hidden="true" /> Subtareas
              </div>
              <CardChecklist cardId={selectedCard.id} triggerAdd={addSubtask} />
            </div>

            {/* Description */}
            <div>
              <div className={styles.sectionTitle}>
                <IconAlignLeft size="1em" aria-hidden="true" /> Descripción
              </div>
              <textarea
                className={styles.descArea}
                value={localDesc}
                onChange={e => setLocalDesc(e.target.value)}
                placeholder="Añade una descripción detallada..."
                rows={4}
              />
              {localDesc.trim() !== (selectedCard.descripcion || '') && (
                <button className={styles.descSaveBtn} onClick={saveDesc}>
                  Guardar descripción
                </button>
              )}
            </div>

            {/* Comentarios */}
            <div>
              <div className={styles.sectionTitle}>
                <IconMessage size="1em" aria-hidden="true" /> Comentarios
              </div>
              <CardComments cardId={selectedCard.id} />
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

            {/* Fecha límite — enfoca el input real de la columna principal */}
            <button
              className={styles.sideBtn}
              onClick={() => {
                dateRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                dateRef.current?.focus()
              }}
            >
              <IconCalendar size="1em" aria-hidden="true" /> Fecha límite
            </button>

            {/* Editar etiquetas */}
            <div ref={labelsWrapRef}>
              <button className={styles.sideBtn} onClick={e => {
                if (labelsSide.open) { setLabelsSide(s => ({ ...s, open: false })); return }
                const r = e.currentTarget.getBoundingClientRect()
                setLabelsSide({ open: true, top: r.bottom + 4, right: window.innerWidth - r.right })
              }}>
                <IconTag size="1em" aria-hidden="true" /> Editar etiquetas
              </button>
              {labelsSide.open && (
                <LabelPicker
                  style={{ position: 'fixed', top: labelsSide.top, right: labelsSide.right, left: 'auto', bottom: 'auto' }}
                  onClose={() => setLabelsSide(s => ({ ...s, open: false }))}
                />
              )}
            </div>

            {/* Asignar miembro */}
            <div ref={assignWrapRef}>
              <button className={styles.sideBtn} onClick={e => {
                if (assignSide.open) { setAssignSide(s => ({ ...s, open: false })); return }
                const r = e.currentTarget.getBoundingClientRect()
                setAssignSide({ open: true, top: r.bottom + 4, right: window.innerWidth - r.right })
              }}>
                <IconUserPlus size="1em" aria-hidden="true" /> Asignar miembro
              </button>
              {assignSide.open && (
                <div
                  className={styles.assignMenu}
                  style={{ position: 'fixed', top: assignSide.top, right: assignSide.right, left: 'auto' }}
                >
                  <button
                    className={`${styles.assignItem} ${!selectedCard.asignado_a ? styles.assignActive : ''}`}
                    onClick={() => { assignTo(null); setAssignSide(s => ({ ...s, open: false })) }}
                  >
                    <div className={styles.assignAv}>–</div>
                    <span>Sin asignar</span>
                  </button>
                  {members.map(m => {
                    const name = m.usuarios?.nombre || m.usuarios?.email || '?'
                    const active = selectedCard.asignado_a === m.usuario_id
                    return (
                      <button
                        key={m.usuario_id}
                        className={`${styles.assignItem} ${active ? styles.assignActive : ''}`}
                        onClick={() => { assignTo(m.usuario_id); setAssignSide(s => ({ ...s, open: false })) }}
                      >
                        <div className={styles.assignAv}>{name[0].toUpperCase()}</div>
                        <span>{name}</span>
                        {active && <span className={styles.assignCheck}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Añadir subtarea */}
            <button className={styles.sideBtn} onClick={() => setAddSubtask(n => n + 1)}>
              <IconChecklist size="1em" aria-hidden="true" /> Añadir subtarea
            </button>

            {/* Portada */}
            <button className={styles.sideBtn} onClick={openCoverPicker}>
              <IconPhoto size="1em" aria-hidden="true" /> Portada
            </button>

            <span className={styles.sideLabel}>Peligro</span>
            <button className={`${styles.sideBtn} ${styles.sideBtnDanger}`} onClick={handleDelete}>
              <IconTrash size="1em" aria-hidden="true" /> Eliminar tarjeta
            </button>

          </div>
        </div>
      </div>

      {coverPicker.open && (
        <CoverPicker
          currentUrl={selectedCard.cover_url}
          onSelect={handleCoverSelect}
          onRemove={handleCoverRemove}
          onClose={() => setCoverPicker(p => ({ ...p, open: false }))}
          style={{ top: coverPicker.top, right: coverPicker.right }}
        />
      )}
    </div>
  )
}
