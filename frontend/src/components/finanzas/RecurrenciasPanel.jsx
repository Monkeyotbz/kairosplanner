import { useEffect, useState } from 'react'
import {
  getRecurrencias, addRecurrencia, updateRecurrencia, deleteRecurrencia,
  getCategorias, formatMoney,
} from '../../services/financeService'
import {
  IconCalendarRepeat, IconClock, IconPencil, IconRepeat, IconTrash,
  IconCalendarWeek, IconCalendarStats, IconCalendarMonth, IconCalendarEvent, IconCalendarStar,
} from '@tabler/icons-react'
import styles from './RecurrenciasPanel.module.css'

const FREC_LABEL = {
  diaria:     'Diaria',
  semanal:    'Semanal',
  quincenal:  'Quincenal',
  mensual:    'Mensual',
  bimestral:  'Bimestral',
  trimestral: 'Trimestral',
  anual:      'Anual',
}

const FREC_ICON = {
  diaria:     IconCalendarRepeat,
  semanal:    IconCalendarWeek,
  quincenal:  IconCalendarStats,
  mensual:    IconCalendarMonth,
  bimestral:  IconCalendarEvent,
  trimestral: IconCalendarEvent,
  anual:      IconCalendarStar,
}

function nextOccurrence(r) {
  const today = new Date(); today.setHours(0,0,0,0)
  const inicio = new Date(r.fecha_inicio + 'T00:00:00')
  const diaRef = r.dia_del_mes || inicio.getDate()

  for (let i = 0; i < 400; i++) {
    const d = new Date(today.getTime())
    d.setDate(today.getDate() + i)
    if (d < inicio) continue
    if (r.fecha_fin && d > new Date(r.fecha_fin + 'T00:00:00')) return null

    const diffDias = Math.round((d - inicio) / 86400000)
    const mesOff = (d.getFullYear() - inicio.getFullYear()) * 12 + (d.getMonth() - inicio.getMonth())
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const diaEfectivo = Math.min(diaRef, ultimo)

    let fires = false
    switch (r.frecuencia) {
      case 'diaria':      fires = true; break
      case 'semanal':     fires = diffDias % 7 === 0; break
      case 'quincenal':   fires = diffDias % 14 === 0; break
      case 'mensual':     fires = d.getDate() === diaEfectivo; break
      case 'bimestral':   fires = mesOff % 2 === 0  && d.getDate() === diaEfectivo; break
      case 'trimestral':  fires = mesOff % 3 === 0  && d.getDate() === diaEfectivo; break
      case 'anual':       fires = d.getMonth() === inicio.getMonth() && d.getDate() === diaEfectivo; break
    }
    if (fires) return d
  }
  return null
}

function fmtDate(d) {
  if (!d) return '—'
  const opts = { day: 'numeric', month: 'short' }
  const isThisYear = d.getFullYear() === new Date().getFullYear()
  if (!isThisYear) opts.year = 'numeric'
  return d.toLocaleDateString('es', opts)
}

const EMPTY_FORM = {
  concepto: '', monto: '', tipo: 'gasto', frecuencia: 'mensual',
  dia_del_mes: '', fecha_inicio: new Date().toISOString().slice(0,10),
  fecha_fin: '', categoria_id: '',
}

export default function RecurrenciasPanel({ onChange }) {
  const [items, setItems] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // null = nuevo, id = editar
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    const [data, cats] = await Promise.all([getRecurrencias(), getCategorias()])
    setItems(data)
    setCategorias(cats)
    setLoading(false)
    onChange?.(data)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErr('')
    setShowForm(true)
  }

  function openEdit(item) {
    setEditing(item.id)
    setForm({
      concepto:    item.concepto,
      monto:       String(item.monto),
      tipo:        item.tipo,
      frecuencia:  item.frecuencia,
      dia_del_mes: item.dia_del_mes ? String(item.dia_del_mes) : '',
      fecha_inicio: item.fecha_inicio,
      fecha_fin:   item.fecha_fin || '',
      categoria_id: item.categoria_id || '',
    })
    setErr('')
    setShowForm(true)
  }

  async function handleToggle(item) {
    const updated = await updateRecurrencia(item.id, { activa: !item.activa })
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, ...updated } : x))
    onChange?.(items.map(x => x.id === item.id ? { ...x, ...updated } : x))
  }

  async function handleDelete(item) {
    if (!confirm(`¿Eliminar el recurrente "${item.concepto}"? Dejará de proyectarse en el flujo de caja y de registrarse cada mes.`)) return
    setItems(prev => prev.filter(x => x.id !== item.id))
    await deleteRecurrencia(item.id)
    onChange?.(items.filter(x => x.id !== item.id))
  }

  async function handleSave() {
    setErr('')
    if (!form.concepto.trim()) { setErr('El concepto es obligatorio.'); return }
    const monto = parseFloat(form.monto)
    if (!monto || monto <= 0) { setErr('Ingresa un monto válido mayor a 0.'); return }

    setSaving(true)
    try {
      const payload = {
        concepto:    form.concepto.trim(),
        monto,
        tipo:        form.tipo,
        frecuencia:  form.frecuencia,
        dia_del_mes: form.dia_del_mes ? parseInt(form.dia_del_mes) : null,
        fecha_inicio: form.fecha_inicio,
        fecha_fin:   form.fecha_fin || null,
        categoria_id: form.categoria_id || null,
      }
      if (editing) {
        const updated = await updateRecurrencia(editing, payload)
        setItems(prev => prev.map(x => x.id === editing ? updated : x))
        onChange?.(items.map(x => x.id === editing ? updated : x))
      } else {
        const created = await addRecurrencia(payload)
        const next = [...items, created]
        setItems(next)
        onChange?.(next)
      }
      setShowForm(false)
    } catch (e) {
      setErr(e.message || 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const conDiaDelMes = ['mensual','bimestral','trimestral','anual'].includes(form.frecuencia)
  const gastoCats = categorias.filter(c => c.tipo === form.tipo)

  const ingresos = items.filter(i => i.tipo === 'ingreso')
  const gastos   = items.filter(i => i.tipo === 'gasto')

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headTitles}>
          <h2 className={styles.heading}>
            <IconRepeat size="1em" /> Recurrentes
          </h2>
          <span className={styles.subtitle}>
            Pagos e ingresos que se repiten — base del pronóstico de flujo de caja
          </span>
        </div>
        <button className={styles.addBtn} onClick={openNew}>+ Recurrente</button>
      </div>

      {loading ? (
        <div className={styles.state}><span className={styles.spinner} /> Cargando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <IconCalendarRepeat size="1em" />
          <p className={styles.emptyTitle}>Sin recurrentes definidos</p>
          <p className={styles.emptyText}>
            Agrega tus pagos fijos (renta, suscripciones) e ingresos periódicos
            para que KAIROS proyecte tu flujo de caja real.
          </p>
        </div>
      ) : (
        <div className={styles.lists}>
          {ingresos.length > 0 && (
            <RecurList label="Ingresos" items={ingresos} accent="#4ade80"
              onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} />
          )}
          {gastos.length > 0 && (
            <RecurList label="Gastos" items={gastos} accent="#f87171"
              onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      )}

      {showForm && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>{editing ? 'Editar recurrente' : 'Nuevo recurrente'}</span>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className={styles.form}>
              {/* Tipo */}
              <div className={styles.typeToggle}>
                <button
                  className={`${styles.typeBtn} ${form.tipo === 'gasto' ? styles.typeBtnGasto : ''}`}
                  onClick={() => setForm(f => ({ ...f, tipo: 'gasto', categoria_id: '' }))}
                >↓ Gasto</button>
                <button
                  className={`${styles.typeBtn} ${form.tipo === 'ingreso' ? styles.typeBtnIngreso : ''}`}
                  onClick={() => setForm(f => ({ ...f, tipo: 'ingreso', categoria_id: '' }))}
                >↑ Ingreso</button>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Concepto</label>
                  <input className={styles.input} value={form.concepto}
                    onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                    placeholder="Netflix, Renta, Salario…" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Monto</label>
                  <input className={styles.input} type="number" min="0.01" step="0.01"
                    value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    placeholder="0.00" />
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Frecuencia</label>
                  <select className={styles.select} value={form.frecuencia}
                    onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value }))}>
                    {Object.entries(FREC_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                {conDiaDelMes && (
                  <div className={styles.field}>
                    <label className={styles.label}>Día del mes</label>
                    <input className={styles.input} type="number" min="1" max="31"
                      value={form.dia_del_mes}
                      onChange={e => setForm(f => ({ ...f, dia_del_mes: e.target.value }))}
                      placeholder={new Date(form.fecha_inicio + 'T00:00:00').getDate()} />
                  </div>
                )}
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Inicia el</label>
                  <input className={styles.input} type="date" value={form.fecha_inicio}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Termina el <span className={styles.optional}>(opcional)</span></label>
                  <input className={styles.input} type="date" value={form.fecha_fin}
                    onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
                </div>
              </div>

              {gastoCats.length > 0 && (
                <div className={styles.field}>
                  <label className={styles.label}>Categoría <span className={styles.optional}>(opcional)</span></label>
                  <select className={styles.select} value={form.categoria_id}
                    onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                    <option value="">Sin categoría</option>
                    {gastoCats.map(c => (
                      <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {err && <div className={styles.error}>{err}</div>}

              <div className={styles.actions}>
                <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
                <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function RecurList({ label, items, accent, onToggle, onEdit, onDelete }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel} style={{ color: accent }}>
        <span className={styles.groupDot} style={{ background: accent }} />
        {label}
        <span className={styles.groupCount}>{items.length}</span>
      </div>
      <div className={styles.grid}>
        {items.map(item => {
          const next = nextOccurrence(item)
          return (
            <div key={item.id} className={`${styles.card} ${!item.activa ? styles.cardInactive : ''}`}>
              <div className={styles.cardTop}>
                {(() => { const FrecIcon = FREC_ICON[item.frecuencia] || IconCalendarEvent; return <FrecIcon size="1em" className={styles.frecIcon} /> })()}
                <span className={styles.concepto}>{item.concepto}</span>
                <span className={styles.monto} style={{ color: accent }}>
                  {item.tipo === 'ingreso' ? '+' : '-'}${formatMoney(item.monto)}
                </span>
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.frec}>{FREC_LABEL[item.frecuencia]}</span>
                {next && (
                  <span className={styles.next}>
                    <IconClock size="1em" /> próx. {fmtDate(next)}
                  </span>
                )}
                {item.categorias_finanzas && (
                  <span className={styles.cat} style={{ color: item.categorias_finanzas.color }}>
                    {item.categorias_finanzas.icono} {item.categorias_finanzas.nombre}
                  </span>
                )}
              </div>
              <div className={styles.cardActions}>
                <button
                  className={`${styles.toggleBtn} ${item.activa ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => onToggle(item)}
                  title={item.activa ? 'Pausar' : 'Activar'}
                >
                  <span className={styles.toggleThumb} />
                </button>
                <button className={styles.iconBtn} onClick={() => onEdit(item)} title="Editar">
                  <IconPencil size="1em" />
                </button>
                <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={() => onDelete(item)} title="Eliminar">
                  <IconTrash size="1em" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
