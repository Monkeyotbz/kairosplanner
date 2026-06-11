import { useState, useEffect, useRef } from 'react'
import InfinityLogo from '../layout/InfinityLogo'
import { usePerfilKairosStore } from '../../store/perfilKairosStore'
import { savePerfilKairos } from '../../services/perfilKairosService'
import styles from './AbadPerfil.module.css'

const TASTE_KEY = 'kairos-music-taste'

// Mapeo label → clave del catálogo musical
const GENERO_MAP = {
  'Lo-fi':       'lofi',
  'Jazz':        'jazz',
  'Clásica':     'clasica',
  'Piano':       'piano',
  'Ambient':     'ambient',
  'Naturaleza':  'naturaleza',
  'Synthwave':   'synthwave',
  'Electrónica': 'electronica',
}

const PASOS = [
  {
    id: 'generos',
    pregunta: '¡Hola! Soy ABAD, tu asistente personal. Quiero conocerte para personalizar tu experiencia en KAIROS. Primero — ¿qué géneros musicales disfrutas?',
    tipo: 'multi',
    opciones: Object.keys(GENERO_MAP),
    min: 1,
    hint: 'Selecciona uno o más',
  },
  {
    id: 'hora_inicio',
    pregunta: 'Perfecto. ¿A qué hora suele comenzar tu jornada de trabajo?',
    tipo: 'single',
    opciones: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'],
    labels:   ['6 am',  '7 am',  '8 am',  '9 am',  '10 am', '11 am', '12 pm'],
    min: 1,
    hint: 'Elige una hora',
  },
  {
    id: 'hora_fin',
    pregunta: 'Entendido. ¿Y a qué hora terminas normalmente?',
    tipo: 'single',
    opciones: ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
    labels:   ['2 pm',  '3 pm',  '4 pm',  '5 pm',  '6 pm',  '7 pm',  '8 pm',  '9 pm'],
    min: 1,
    hint: 'Elige una hora',
  },
  {
    id: 'dias_descanso',
    pregunta: '¿Qué días son tus días libres o de descanso? (puedes no elegir ninguno)',
    tipo: 'multi',
    opciones: [1, 2, 3, 4, 5, 6, 0],
    labels:   ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    min: 0,
    hint: 'Opcional',
  },
  {
    id: 'rutinas',
    pregunta: '¿Tienes alguna rutina fija que quieras recordar en tu agenda?',
    tipo: 'multi',
    opciones: ['Ejercicio', 'Meditación', 'Lectura', 'Idiomas', 'Networking'],
    min: 0,
    hint: 'Opcional',
  },
]

function useTypewriter(text, speed = 22) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])

  return { displayed, done }
}

export default function AbadPerfil() {
  const { isOpen, close } = usePerfilKairosStore()
  const [paso, setPaso] = useState(0)
  const [respuestas, setRespuestas] = useState({})
  const [seleccion, setSeleccion] = useState([])
  const [saving, setSaving] = useState(false)
  const [abadState, setAbadState] = useState('idle')
  const endRef = useRef(null)

  const p = PASOS[paso]
  const { displayed, done } = useTypewriter(isOpen ? p.pregunta : '', 20)
  const canContinue = seleccion.length >= (p.min ?? 1)
  const isLast = paso === PASOS.length - 1

  // Cuando cambia el paso, ABAD "piensa" brevemente
  useEffect(() => {
    if (!isOpen) return
    setAbadState('thinking')
    const t = setTimeout(() => setAbadState('idle'), 600)
    return () => clearTimeout(t)
  }, [paso, isOpen])

  useEffect(() => {
    if (done) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [done])

  if (!isOpen) return null

  function toggleChip(val) {
    if (p.tipo === 'single') {
      setSeleccion([val])
    } else {
      setSeleccion(prev =>
        prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
      )
    }
  }

  function siguiente() {
    if (!canContinue) return
    const nuevas = { ...respuestas, [p.id]: seleccion }
    setRespuestas(nuevas)

    if (isLast) {
      guardar(nuevas)
    } else {
      setSeleccion([])
      setPaso(s => s + 1)
    }
  }

  async function guardar(datos) {
    setSaving(true)
    setAbadState('thinking')

    // Sembrar taste musical
    const generosClave = (datos.generos || []).map(g => GENERO_MAP[g]).filter(Boolean)
    try {
      const taste = JSON.parse(localStorage.getItem(TASTE_KEY) || '{}')
      generosClave.forEach(g => { taste[g] = (taste[g] || 0) + 4 })
      localStorage.setItem(TASTE_KEY, JSON.stringify(taste))
    } catch (_) {}

    // Persistir en Supabase
    const payload = {
      generos_musicales: generosClave,
      hora_inicio:       datos.hora_inicio?.[0] ?? null,
      hora_fin:          datos.hora_fin?.[0]    ?? null,
      dias_descanso:     datos.dias_descanso    ?? [],
      rutinas:           datos.rutinas          ?? [],
      version:           1,
    }

    try { await savePerfilKairos(payload) } catch (_) { /* sin bloqueo si falla */ }

    setAbadState('idle')
    setSaving(false)
    close()
  }

  function skip() { close() }

  const label = (i) => p.labels?.[p.opciones.indexOf(i)] ?? String(i)

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.glow} aria-hidden="true" />

        <button className={styles.skip} onClick={skip}>Saltar</button>

        {/* Cabecera ABAD */}
        <div className={styles.header}>
          <InfinityLogo size={54} state={abadState} />
          <div className={styles.abadLabel}>
            <span className={styles.abadName}>ABAD</span>
            <span className={styles.abadSub}>tu asistente</span>
          </div>
        </div>

        {/* Burbuja de texto */}
        <div className={styles.bubble}>
          <span>{displayed}</span>
          {!done && <span className={styles.cursor}>▍</span>}
        </div>

        {/* Chips */}
        {done && (
          <div className={styles.chipsWrap}>
            {p.hint && <span className={styles.hint}>{p.hint}</span>}
            <div className={styles.chips}>
              {p.opciones.map((op, i) => {
                const active = seleccion.includes(op)
                return (
                  <button
                    key={i}
                    className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                    onClick={() => toggleChip(op)}
                  >
                    {label(op)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div ref={endRef} />

        {/* Progreso + acción */}
        <div className={styles.footer}>
          <div className={styles.dots}>
            {PASOS.map((_, i) => (
              <span key={i} className={`${styles.dot} ${i === paso ? styles.dotActive : i < paso ? styles.dotDone : ''}`} />
            ))}
          </div>

          <button
            className={styles.btn}
            onClick={siguiente}
            disabled={!done || !canContinue || saving}
          >
            {saving ? '...' : isLast ? '◐  ¡Listo!' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}
