import { useEffect, useState } from 'react'
import { getProyectoROI, formatMoney } from '../../services/financeService'
import styles from './ProjectROI.module.css'
import { IconAlertTriangle, IconClockDollar, IconPencil, IconTarget, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'

const metaKey = id => `kairos-meta-tarifa-${id}`
function readMeta(id) {
  try { const v = localStorage.getItem(metaKey(id)); return v ? Number(v) : null } catch { return null }
}
function writeMeta(id, val) {
  try {
    if (val) localStorage.setItem(metaKey(id), String(val))
    else localStorage.removeItem(metaKey(id))
  } catch (_) {}
}

function fmtHoras(h) {
  if (h < 1) return `${Math.round(h * 60)} min`
  return `${h.toFixed(1)} h`
}

export default function ProjectROI({ proyectoId, version }) {
  const [roi, setRoi]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [meta, setMeta]     = useState(null)
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaVal, setMetaVal] = useState('')

  useEffect(() => {
    if (!proyectoId) return
    setMeta(readMeta(proyectoId))
    setEditingMeta(false)
    setLoading(true)
    getProyectoROI(proyectoId).then(r => { setRoi(r); setLoading(false) })
  }, [proyectoId, version])

  if (!proyectoId) return null

  if (loading) {
    return <div className={styles.state}><span className={styles.spinner} /> Calculando rentabilidad…</div>
  }
  if (!roi) return null

  const { horas, ingreso, costo, ganancia, tarifaReal } = roi
  const sinEnfoque = horas <= 0

  // Estado: agujero financiero (rojo) > bajo meta (amarillo) > ok (verde)
  const agujero  = ganancia < 0
  const bajoMeta = !agujero && meta != null && tarifaReal < meta
  const estado   = agujero ? 'over' : bajoMeta ? 'warn' : 'ok'

  function saveMeta(e) {
    e.preventDefault()
    const v = parseFloat(metaVal)
    const next = v > 0 ? v : null
    writeMeta(proyectoId, next)
    setMeta(next)
    setEditingMeta(false)
  }

  return (
    <div className={`${styles.card} ${styles[estado]}`}>
      <div className={styles.head}>
        <span className={styles.title}>
          <IconClockDollar size="1em" /> Tiempo = Dinero
        </span>
        <span className={styles.sub}>Rentabilidad acumulada del proyecto</span>
      </div>

      {sinEnfoque ? (
        <p className={styles.empty}>
          Aún no registras enfoque en este proyecto. Inicia una sesión de
          <strong> Modo Enfoque</strong> eligiéndolo, y aquí verás cuánto vale realmente tu hora.
        </p>
      ) : (
        <>
          {/* Hero: tarifa real */}
          <div className={styles.hero}>
            <span className={styles.heroValue}>${formatMoney(tarifaReal)}</span>
            <span className={styles.heroUnit}>/ hora real</span>
          </div>

          {/* Chips */}
          <div className={styles.chips}>
            <div className={styles.chip}>
              <span className={styles.chipLabel}>Horas invertidas</span>
              <span className={styles.chipValue}>{fmtHoras(horas)}</span>
            </div>
            <div className={styles.chip}>
              <span className={styles.chipLabel}>Ingresos</span>
              <span className={`${styles.chipValue} ${styles.green}`}>${formatMoney(ingreso)}</span>
            </div>
            <div className={styles.chip}>
              <span className={styles.chipLabel}>Costos</span>
              <span className={`${styles.chipValue} ${styles.red}`}>${formatMoney(costo)}</span>
            </div>
            <div className={styles.chip}>
              <span className={styles.chipLabel}>Ganancia neta</span>
              <span className={`${styles.chipValue} ${ganancia >= 0 ? styles.green : styles.red}`}>
                ${formatMoney(ganancia)}
              </span>
            </div>
          </div>

          {/* Interpretación */}
          <div className={styles.verdict}>
            {agujero ? (
              <span className={styles.verdictText}>
                <IconAlertTriangle size="1em" /> Agujero financiero: los costos superan los ingresos.
              </span>
            ) : bajoMeta ? (
              <span className={styles.verdictText}>
                <IconTrendingDown size="1em" /> Por debajo de tu meta de ${formatMoney(meta)}/h.
              </span>
            ) : (
              <span className={styles.verdictText}>
                <IconTrendingUp size="1em" /> {meta != null
                  ? `Por encima de tu meta de $${formatMoney(meta)}/h.`
                  : `Ganas $${formatMoney(roi.gananciaPorHora)} netos por hora invertida.`}
              </span>
            )}
          </div>
        </>
      )}

      {/* Meta $/h */}
      <div className={styles.metaRow}>
        {editingMeta ? (
          <form className={styles.metaForm} onSubmit={saveMeta}>
            <span className={styles.metaLabel}>Meta $/h</span>
            <input
              className={styles.metaInput}
              type="number" min="0" step="0.01" placeholder="0.00"
              value={metaVal} onChange={e => setMetaVal(e.target.value)} autoFocus
            />
            <button type="submit" className={styles.metaSave}>Guardar</button>
            <button type="button" className={styles.metaCancel} onClick={() => setEditingMeta(false)}>✕</button>
          </form>
        ) : meta != null ? (
          <button className={styles.metaChip} onClick={() => { setMetaVal(String(meta)); setEditingMeta(true) }}>
            <IconTarget size="1em" /> Meta: ${formatMoney(meta)}/h <IconPencil size="1em" />
          </button>
        ) : (
          <button className={styles.metaChip} onClick={() => { setMetaVal(''); setEditingMeta(true) }}>
            <IconTarget size="1em" /> Definir meta $/h
          </button>
        )}
      </div>
    </div>
  )
}
