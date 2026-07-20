import { useState, useEffect, useRef, useCallback } from 'react'
import InfinityLogo from '../layout/InfinityLogo'
import { useOnboardingDespertarStore } from '../../store/onboardingDespertarStore'
import { ejecutarPayloadOnboarding } from '../../services/onboardingPayload'
import { useSpeech } from '../../hooks/useSpeech'
import styles from './AbadOnboarding.module.css'
import { IconVolume, IconVolume3 } from '@tabler/icons-react'

// ── Mapas de display ──────────────────────────────────────────

const CATEGORIAS_GASTO_LABELS = {
  arriendo:        'Arriendo / Hipoteca',
  alimentacion:    'Alimentación',
  transporte:      'Transporte',
  suscripciones:   'Suscripciones',
  salud:           'Salud',
  educacion:       'Educación',
  entretenimiento: 'Entretenimiento',
  gimnasio:        'Deporte / Gimnasio',
  deudas:          'Deudas / Crédito',
}

// ── Definición de pasos ───────────────────────────────────────

const PASOS = [
  {
    id: 'intro',
    tipo: 'intro',
    pregunta: 'Antes de mostrarte tu espacio, necesito conocer cómo funciona tu mente. No te tomará más de 3 minutos. Seré directo y tú solo necesitas pulsar.',
    btnLabel: 'Adelante, ABAD →',
  },
  {
    id: 'cronotipo',
    eje: 'TU ENERGÍA',
    pregunta: '¿Cuándo sientes que tu mente está más despejada y capaz de hacer trabajo difícil?',
    tipo: 'single',
    opciones: () => [
      { valor: 'madrugador', label: 'Al amanecer',      sub: '5 – 8 am' },
      { valor: 'mañana',     label: 'A media mañana',   sub: '8 – 12 pm' },
      { valor: 'tarde',      label: 'Por la tarde',     sub: '2 – 6 pm' },
      { valor: 'nocturno',   label: 'De noche',         sub: '8 pm en adelante' },
    ],
    min: 1,
    acuse: sel => ({ madrugador: 'Los amaneceres tienen energía que pocos conocen.', mañana: 'Media mañana — cuando el día ya calentó.', tarde: 'El mundo se mueve de mañana. Tú en la tarde.', nocturno: 'Las noches creativas tienen su magia.' }[sel[0]] || 'Perfecto.'),
  },
  {
    id: 'hora_inicio',
    eje: '¿CUÁNDO EMPIEZA TU DÍA?',
    pregunta: '¿A qué hora empiezas tu jornada en promedio? No la ideal — la real.',
    tipo: 'single',
    opciones: () => ['05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00'].map(h => ({
      valor: h,
      label: `${parseInt(h)} ${parseInt(h) < 12 ? 'am' : 'pm'}`,
    })),
    min: 1,
    acuse: () => 'Anotado. Calibraré tu día desde esa hora.',
  },
  {
    id: 'dias_descanso',
    eje: 'TUS DÍAS LIBRES',
    pregunta: '¿Qué días son para ti, no para el trabajo?',
    tipo: 'multi',
    defaultSelected: [6, 0],
    opciones: () => [
      { valor: 1, label: 'Lun' }, { valor: 2, label: 'Mar' }, { valor: 3, label: 'Mié' },
      { valor: 4, label: 'Jue' }, { valor: 5, label: 'Vie' },
      { valor: 6, label: 'Sáb' }, { valor: 0, label: 'Dom' },
    ],
    min: 0,
    acuse: sel => sel.length === 0 ? 'Sin días libres formales. Respeto tu ritmo.' : 'Esos días serán tuyos en el calendario.',
  },
  {
    id: 'ritmo',
    eje: 'TU VENTANA KAIROS',
    pregunta: 'Cuando estás en trabajo que te importa, ¿cuánto tiempo puedes concentrarte antes de que tu mente pida un respiro?',
    tipo: 'single',
    opciones: () => [
      { valor: 'sprint',   label: '15 – 20 min',   sub: 'Vuelos cortos' },
      { valor: 'pomodoro', label: '25 – 35 min',   sub: 'El clásico' },
      { valor: 'flow',     label: '45 – 60 min',   sub: 'Inmersión media' },
      { valor: 'deep',     label: 'Más de 1 hora', sub: 'Estado de túnel' },
    ],
    min: 1,
    acuse: sel => ({ sprint: 'Corto e intenso. Así funciona.', pomodoro: 'El clásico por algo es clásico.', flow: 'Buena ventana de flujo.', deep: 'Un túnel de tiempo. Respeto eso.' }[sel[0]] || 'Listo.'),
  },
  {
    id: 'tipo_pausa',
    eje: 'TU PAUSA IDEAL',
    pregunta: 'Cuando tu mente necesita un break, ¿qué la recarga mejor?',
    tipo: 'single',
    opciones: () => [
      { valor: 'movimiento',  label: 'Moverme',     sub: 'Estirar, caminar' },
      { valor: 'respiracion', label: 'Respirar',    sub: 'Cerrar los ojos' },
      { valor: 'visual',      label: 'Ver algo',    sub: 'Que no sea trabajo' },
      { valor: 'leve',        label: 'Algo ligero', sub: 'Seguir activo' },
    ],
    min: 1,
    acuse: () => 'Perfecto. Configuraré tus pausas así.',
  },
  {
    id: 'fuente_ingreso',
    eje: 'TU DINERO',
    intro: 'Ahora el dinero. No te pido cifras exactas — solo tus patrones. Esto es solo tuyo.',
    pregunta: '¿Cómo entra dinero a tu vida principalmente?',
    tipo: 'single',
    opciones: () => [
      { valor: 'salario',   label: 'Salario fijo',   sub: 'Mensual, predecible' },
      { valor: 'freelance', label: 'Freelance',       sub: 'Variable, por proyecto' },
      { valor: 'negocio',   label: 'Negocio propio',  sub: 'Mis ventas o servicios' },
      { valor: 'mixto',     label: 'Varias fuentes',  sub: 'Combinación' },
      { valor: 'skip',      label: 'Prefiero no decirlo' },
    ],
    min: 1,
    acuse: sel => sel[0] === 'skip' ? 'Sin problema. Puedes configurarlo después.' : 'Tu dashboard financiero lo tendrá en cuenta.',
  },
  {
    id: 'rango_ingreso',
    eje: 'TU DINERO',
    pregunta: '¿En qué rango está tu ingreso mensual? Solo escala las sugerencias.',
    tipo: 'single',
    opciones: () => [
      { valor: 'bajo',      label: 'Menos de $500' },
      { valor: 'medio_bajo',label: '$500 – $1,500' },
      { valor: 'medio',     label: '$1,500 – $3,500' },
      { valor: 'medio_alto',label: '$3,500 – $7,000' },
      { valor: 'alto',      label: 'Más de $7,000' },
      { valor: 'skip',      label: 'Prefiero no decirlo' },
    ],
    min: 1,
    condicional: r => r.fuente_ingreso && r.fuente_ingreso !== 'skip',
    acuse: () => 'Entendido.',
  },
  {
    id: 'gastos_fijos',
    eje: 'TUS GASTOS',
    pregunta: '¿Cuáles de estos gastos tienes regularmente? Márcalos todos.',
    tipo: 'multi',
    opciones: () => [
      { valor: 'arriendo',        label: 'Arriendo / Hipoteca', emoji: '🏠' },
      { valor: 'alimentacion',    label: 'Alimentación',         emoji: '🍽️' },
      { valor: 'transporte',      label: 'Transporte',           emoji: '🚗' },
      { valor: 'suscripciones',   label: 'Suscripciones',        emoji: '📱' },
      { valor: 'salud',           label: 'Salud',                emoji: '💊' },
      { valor: 'educacion',       label: 'Educación',            emoji: '📚' },
      { valor: 'entretenimiento', label: 'Entretenimiento',      emoji: '🎮' },
      { valor: 'gimnasio',        label: 'Deporte / Gimnasio',   emoji: '💪' },
      { valor: 'deudas',          label: 'Deudas / Crédito',     emoji: '💳' },
    ],
    min: 0,
    acuse: sel => sel.length === 0
      ? 'Las crearemos cuando las necesites.'
      : `${sel.length} categoría${sel.length > 1 ? 's' : ''} lista${sel.length > 1 ? 's' : ''} en tu panel financiero.`,
  },
  {
    id: 'presupuesto_categoria',
    eje: 'TU PRIMER LÍMITE',
    pregunta: '¿Quieres que KAIROS vigile alguno? Elige el que más te preocupa.',
    tipo: 'single',
    opciones: r => [
      ...(r.gastos_fijos || []).map(k => ({ valor: k, label: CATEGORIAS_GASTO_LABELS[k] || k })),
      { valor: 'skip', label: 'Ninguno por ahora' },
    ],
    min: 1,
    condicional: r => (r.gastos_fijos || []).length > 0,
    acuse: sel => sel[0] === 'skip'
      ? 'Sin problema. Puedes agregar límites cuando quieras.'
      : '¿Cuánto es demasiado al mes para ese gasto?',
  },
  {
    id: 'presupuesto_monto',
    eje: 'TU PRIMER LÍMITE',
    pregunta: '¿Cuál es tu límite mensual?',
    tipo: 'single',
    opciones: () => [50, 100, 200, 300, 500, 1000].map(n => ({
      valor: n, label: n.toLocaleString(),
    })),
    min: 1,
    condicional: r => r.presupuesto_categoria && r.presupuesto_categoria !== 'skip',
    acuse: () => 'Esa barra estará activa en tu dashboard desde hoy.',
  },
  {
    id: 'contextos',
    eje: 'TU TABLERO',
    pregunta: '¿Qué intentas organizar con KAIROS? Puedes elegir varios.',
    tipo: 'multi',
    opciones: () => [
      { valor: 'trabajo',     label: 'Mi trabajo diario',         emoji: '💼' },
      { valor: 'negocio',     label: 'Negocio o proyecto propio', emoji: '🚀' },
      { valor: 'estudios',    label: 'Mis estudios',               emoji: '📚' },
      { valor: 'personal',    label: 'Proyecto personal',          emoji: '🏗️' },
      { valor: 'creativo',    label: 'Mi vida creativa',           emoji: '✍️' },
      { valor: 'crecimiento', label: 'Crecimiento personal',       emoji: '🌱' },
    ],
    min: 1,
    acuse: sel => `${sel.length === 1 ? 'Un tablero' : `${sel.length} tableros`} listo${sel.length > 1 ? 's' : ''} para ti.`,
  },
  {
    id: 'primera_tarea',
    eje: 'TU PRIMERA TAREA',
    pregunta: 'Dame una cosa — solo una — que tienes en la cabeza ahora mismo.',
    tipo: 'text',
    placeholder: 'Ej: Terminar el informe del martes...',
    dateOpciones: [
      { valor: 'semana', label: 'Esta semana' },
      { valor: 'mes',    label: 'Este mes' },
      { valor: 'libre',  label: 'Sin fecha' },
    ],
    min: 0,
    acuse: (_, texto) => texto?.trim() ? 'Ya está en tu corriente. No se te va a escapar.' : 'Sin problema, las agregas cuando quieras.',
  },
  {
    id: 'generos',
    eje: 'TU MÚSICA',
    pregunta: 'Último paso: ¿qué ambiente musical te ayuda a enfocarte?',
    tipo: 'multi',
    opciones: () => [
      { valor: 'Lo-fi',       label: 'Lo-fi',        emoji: '🎧' },
      { valor: 'Jazz',        label: 'Jazz',         emoji: '🎷' },
      { valor: 'Clásica',     label: 'Clásica',      emoji: '🎻' },
      { valor: 'Piano',       label: 'Piano',        emoji: '🎹' },
      { valor: 'Ambient',     label: 'Ambient',      emoji: '🌌' },
      { valor: 'Naturaleza',  label: 'Naturaleza',   emoji: '🌿' },
      { valor: 'Synthwave',   label: 'Synthwave',    emoji: '🌆' },
      { valor: 'Electrónica', label: 'Electrónica',  emoji: '🎛️' },
    ],
    min: 1,
    acuse: () => 'Tu reproductor ya sabe qué ponerte.',
  },
]

// ── Hook typewriter ───────────────────────────────────────────

function useTypewriter(text, speed = 20, active = true) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone]           = useState(false)
  const skipRef = useRef(false)

  useEffect(() => {
    if (!active) return
    skipRef.current = false
    setDisplayed('')
    setDone(false)
    let i = 0
    const tick = () => {
      if (skipRef.current) { setDisplayed(text); setDone(true); return }
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { setDone(true); return }
      setTimeout(tick, speed)
    }
    const id = setTimeout(tick, speed)
    return () => clearTimeout(id)
  }, [text, speed, active])

  const skip = useCallback(() => { skipRef.current = true }, [])
  return { displayed, done, skip }
}

// ── Componente ────────────────────────────────────────────────

export default function AbadOnboarding({ preview = false, onExit }) {
  const { isOpen: storeOpen, close: storeClose } = useOnboardingDespertarStore()

  // En modo preview, siempre está abierto y no toca el store
  const isOpen = preview ? true : storeOpen
  function close() { if (!preview) storeClose() }

  const { speak, cancel: cancelSpeech, isMuted, toggleMute } = useSpeech({ rate: 0.9, pitch: 1.08 })

  const [pasoActual,  setPasoActual]  = useState(0)
  const [respuestas,  setRespuestas]  = useState({})
  const [seleccion,   setSeleccion]   = useState([])
  const [textoLibre,  setTextoLibre]  = useState('')
  const [fechaTarea,  setFechaTarea]  = useState('semana')
  const [fase,        setFase]        = useState('conversando') // conversando | acusando | guardando | cierre | preview-results | error
  const [acuseText,   setAcuseText]   = useState('')
  const [abadState,   setAbadState]   = useState('idle')
  const [errorMsg,    setErrorMsg]    = useState('')
  const [resultados,  setResultados]  = useState(null)
  const inputRef = useRef(null)

  // Pasos visibles (filtra condicionales)
  const visiblePasos = PASOS.filter(p => !p.condicional || p.condicional(respuestas))
  const currentPaso  = visiblePasos[pasoActual] || PASOS[0]
  const totalPasos   = visiblePasos.length
  const progreso     = totalPasos > 1 ? (pasoActual / (totalPasos - 1)) * 100 : 0

  const opciones = typeof currentPaso.opciones === 'function'
    ? currentPaso.opciones(respuestas)
    : (currentPaso.opciones || [])

  const { displayed, done, skip } = useTypewriter(
    fase === 'acusando' ? acuseText : (isOpen ? currentPaso.pregunta : ''),
    fase === 'acusando' ? 28 : 20,
    isOpen && (fase === 'conversando' || fase === 'acusando')
  )

  // Reset al cambiar de paso + hablar la pregunta
  useEffect(() => {
    if (!isOpen) return
    const defaults = currentPaso.defaultSelected || []
    setSeleccion(defaults.slice())
    setTextoLibre('')
    setFechaTarea('semana')
    setAbadState('thinking')
    const t = setTimeout(() => {
      setAbadState('idle')
      speak(currentPaso.pregunta)
    }, 500)
    return () => { clearTimeout(t); cancelSpeech() }
  }, [pasoActual, isOpen])


  // Foco en input de texto
  useEffect(() => {
    if (done && currentPaso.tipo === 'text' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [done, currentPaso.tipo])

  // Reiniciar flujo (solo en preview)
  function handleReset() {
    setPasoActual(0)
    setRespuestas({})
    setSeleccion([])
    setTextoLibre('')
    setFechaTarea('semana')
    setFase('conversando')
    setAbadState('idle')
    setResultados(null)
    setErrorMsg('')
  }

  if (!isOpen) return null
  if (fase === 'guardando')       return <PantallaGuardando />
  if (fase === 'cierre')          return <PantallaCierre onClose={close} />
  if (fase === 'preview-results') return <PantallaResultados respuestas={resultados} onReset={handleReset} />
  if (fase === 'error')           return <PantallaError msg={errorMsg} onRetry={() => handleGuardar(respuestas)} onSkip={() => { if (preview) handleReset(); else close() }} />

  // ── Lógica de chips ─────────────────────────────────────────
  function toggleChip(valor) {
    if (currentPaso.tipo === 'single') {
      setSeleccion([valor])
    } else {
      setSeleccion(prev => prev.includes(valor) ? prev.filter(v => v !== valor) : [...prev, valor])
    }
  }

  // ── ¿Puede continuar? ───────────────────────────────────────
  const canContinue = (() => {
    if (!done) return false
    const min = currentPaso.min ?? 1
    if (currentPaso.tipo === 'intro') return true
    if (currentPaso.tipo === 'text')  return min === 0 || textoLibre.trim().length > 0
    return seleccion.length >= min
  })()

  const isLast = pasoActual === totalPasos - 1

  // ── Avanzar ─────────────────────────────────────────────────
  function handleAvanzar() {
    if (!canContinue) return

    // Guardar respuesta del paso actual
    let valor
    if (currentPaso.tipo === 'intro')   valor = true
    else if (currentPaso.tipo === 'single') valor = seleccion[0]
    else if (currentPaso.tipo === 'multi')  valor = [...seleccion]
    else if (currentPaso.tipo === 'text')   valor = { texto: textoLibre.trim(), fecha: fechaTarea }

    const nuevasResp = { ...respuestas, [currentPaso.id]: valor }
    setRespuestas(nuevasResp)

    // Acuse de recibo
    const textoAcuse = currentPaso.acuse
      ? currentPaso.acuse(Array.isArray(valor) ? valor : [valor], textoLibre)
      : ''

    if (textoAcuse && currentPaso.tipo !== 'intro') {
      setAcuseText(textoAcuse)
      setAbadState('thinking')
      setFase('acusando')

      // Avanzar solo cuando ABAD termina de hablar
      let avanzado = false
      const avanzar = () => {
        if (avanzado) return
        avanzado = true
        setFase('conversando')
        setAbadState('idle')
        if (isLast) handleGuardar(nuevasResp)
        else setPasoActual(s => s + 1)
      }

      const willSpeak = speak(textoAcuse, { onEnd: avanzar })
      // Fallback: si está muteado o TTS no dispara onend, avanzar por tiempo
      const msBase = willSpeak
        ? Math.max(5000, (textoAcuse.trim().split(/\s+/).length / 1.4) * 1000 + 1200)
        : Math.max(2000, textoAcuse.length * 55)
      setTimeout(avanzar, msBase)
    } else {
      if (isLast) handleGuardar(nuevasResp)
      else setPasoActual(s => s + 1)
    }
  }

  // ── Guardar payload ──────────────────────────────────────────
  async function handleGuardar(r = respuestas) {
    if (preview) {
      // Modo preview: no toca Supabase, muestra lo que se enviaría
      setResultados(r)
      setFase('preview-results')
      return
    }
    setFase('guardando')
    setAbadState('thinking')
    try {
      await ejecutarPayloadOnboarding(r)
      setAbadState('celebrating')
      setFase('cierre')
    } catch (err) {
      setErrorMsg(err?.message || 'Error desconocido')
      setFase('error')
      setAbadState('idle')
    }
  }

  // ── Render pasos ─────────────────────────────────────────────
  const showChips = done && currentPaso.tipo !== 'intro' && currentPaso.tipo !== 'text' && fase === 'conversando'
  const showText  = done && currentPaso.tipo === 'text' && fase === 'conversando'
  const showBtn   = done || fase === 'acusando'

  function skipAndCancelSpeech() { skip(); cancelSpeech() }

  return (
    <div className={`${styles.overlay} ${preview ? styles.overlayPreview : ''}`} onClick={skipAndCancelSpeech}>
      <div className={styles.stage} onClick={e => e.stopPropagation()}>

        {/* Banner modo preview */}
        {preview && (
          <div className={styles.previewBanner}>
            <span className={styles.previewDot} />
            MODO VISTA PREVIA — sin guardar en Supabase
            <span className={styles.previewStep}>{pasoActual + 1} / {totalPasos}</span>
            {onExit && (
              <button
                className={styles.previewExit}
                onClick={e => { e.stopPropagation(); onExit() }}
              >
                ✕ Salir
              </button>
            )}
          </div>
        )}

        {/* Control de voz */}
        <button
          className={styles.muteBtn}
          onClick={e => { e.stopPropagation(); toggleMute() }}
          title={isMuted ? 'Activar voz de ABAD' : 'Silenciar voz de ABAD'}
          aria-label={isMuted ? 'Activar voz' : 'Silenciar voz'}
        >
          {isMuted ? <IconVolume3 size="1em" /> : <IconVolume size="1em" />}
        </button>

        {/* Barra de progreso */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progreso}%` }} />
        </div>

        {/* Glow ambiental */}
        <div className={styles.ambientGlow} aria-hidden="true" />

        {/* Orbe ABAD */}
        <div className={styles.orbeWrap}>
          <InfinityLogo size={currentPaso.tipo === 'intro' ? 96 : 72} state={abadState} />
          {currentPaso.tipo !== 'intro' && (
            <div className={styles.abadTag}>
              <span className={styles.abadName}>ABAD</span>
              {currentPaso.eje && <span className={styles.ejeLabel}>{currentPaso.eje}</span>}
            </div>
          )}
        </div>

        {/* Nota de contexto financiero */}
        {currentPaso.intro && fase === 'conversando' && (
          <p className={styles.introNote}>{currentPaso.intro}</p>
        )}

        {/* Burbuja de texto */}
        <div className={`${styles.bubble} ${currentPaso.tipo === 'intro' ? styles.bubbleIntro : ''}`}
             onClick={skip}>
          <span className={fase === 'acusando' ? styles.acuseText : ''}>{displayed}</span>
          {!done && <span className={styles.cursor}>▍</span>}
        </div>

        {/* Chips de respuesta */}
        {showChips && (
          <div className={`${styles.chipsZone} ${currentPaso.tipo === 'multi' ? styles.chipsMulti : styles.chipsSingle}`}>
            {opciones.map((op, i) => (
              <button
                key={i}
                className={`${styles.chip} ${seleccion.includes(op.valor) ? styles.chipActive : ''}`}
                onClick={() => toggleChip(op.valor)}
              >
                {op.emoji && <span className={styles.chipEmoji}>{op.emoji}</span>}
                <span className={styles.chipLabel}>{op.label}</span>
                {op.sub && <span className={styles.chipSub}>{op.sub}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Campo de texto (primera_tarea) */}
        {showText && (
          <div className={styles.textZone}>
            <input
              ref={inputRef}
              className={styles.textInput}
              type="text"
              maxLength={120}
              placeholder={currentPaso.placeholder}
              value={textoLibre}
              onChange={e => setTextoLibre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canContinue) handleAvanzar() }}
            />
            <div className={styles.dateChips}>
              {currentPaso.dateOpciones.map(op => (
                <button
                  key={op.valor}
                  className={`${styles.dateChip} ${fechaTarea === op.valor ? styles.dateChipActive : ''}`}
                  onClick={() => setFechaTarea(op.valor)}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botón de acción */}
        {showBtn && fase === 'conversando' && (
          <div className={styles.actions}>
            {currentPaso.tipo === 'intro' ? (
              <button className={styles.btnPrimary} onClick={handleAvanzar}>
                {currentPaso.btnLabel}
              </button>
            ) : (
              <button
                className={styles.btnPrimary}
                onClick={handleAvanzar}
                disabled={!canContinue}
              >
                {isLast ? '◐  Construir mi KAIROS' : 'Continuar →'}
              </button>
            )}
            {currentPaso.min === 0 && currentPaso.tipo !== 'intro' && !isLast && (
              <button className={styles.btnSkip} onClick={handleAvanzar}>
                Omitir
              </button>
            )}
          </div>
        )}

        {/* Título principal (solo en intro) */}
        {currentPaso.tipo === 'intro' && (
          <div className={styles.introFooter}>
            <p className={styles.introHint}>Pulsa en cualquier lugar para acelerar el texto</p>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Pantallas especiales ──────────────────────────────────────

function PantallaGuardando({ abadState }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.stage}>
        <div className={styles.ambientGlow} aria-hidden="true" />
        <InfinityLogo size={80} state="thinking" />
        <p className={styles.guardandoText}>Construyendo tu espacio...</p>
        <p className={styles.guardandoSub}>Tableros, categorías y preferencias</p>
      </div>
    </div>
  )
}

function PantallaCierre({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`${styles.overlay} ${styles.cierreOverlay}`}>
      <div className={styles.stage}>
        <div className={styles.cierreGlow} aria-hidden="true" />
        <InfinityLogo size={88} state="celebrating" />
        <p className={styles.cierreText}>KAIROS ya sabe quién eres.</p>
        <p className={styles.cierreSub}>Tu espacio está listo.</p>
        <button className={styles.btnCierre} onClick={onClose}>Entrar →</button>
      </div>
    </div>
  )
}

function PantallaError({ msg, onRetry, onSkip }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.stage}>
        <div className={styles.ambientGlow} aria-hidden="true" />
        <InfinityLogo size={72} state="idle" />
        <p className={styles.errorText}>Algo salió mal guardando tus datos.</p>
        <p className={styles.errorSub}>{msg}</p>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={onRetry}>Reintentar</button>
          <button className={styles.btnSkip} onClick={onSkip}>Continuar sin guardar</button>
        </div>
      </div>
    </div>
  )
}

// ── Panel de resultados (solo modo preview) ───────────────────

const LABEL_PASO = {
  intro:                  'Intro',
  cronotipo:              'Cronotipo',
  hora_inicio:            'Hora de inicio',
  dias_descanso:          'Días de descanso',
  ritmo:                  'Ritmo / Ventana',
  tipo_pausa:             'Tipo de pausa',
  fuente_ingreso:         'Fuente de ingreso',
  rango_ingreso:          'Rango de ingreso',
  gastos_fijos:           'Gastos fijos',
  presupuesto_categoria:  'Categoría vigilada',
  presupuesto_monto:      'Límite mensual',
  contextos:              'Contextos / Tableros',
  primera_tarea:          'Primera tarea',
  generos:                'Géneros musicales',
}

function PantallaResultados({ respuestas, onReset }) {
  const entradas = Object.entries(respuestas || {}).filter(([k]) => k !== 'intro')

  return (
    <div className={`${styles.overlay} ${styles.overlayPreview}`}>
      <div className={styles.resultadosCard}>
        <div className={styles.resultadosCabecera}>
          <InfinityLogo size={48} state="celebrating" />
          <div>
            <p className={styles.resultadosTitulo}>Flujo completado</p>
            <p className={styles.resultadosSub}>Esto es lo que se enviaría a Supabase</p>
          </div>
        </div>

        <div className={styles.resultadosGrid}>
          {entradas.map(([clave, valor]) => (
            <div key={clave} className={styles.resultadosRow}>
              <span className={styles.resultadosClave}>{LABEL_PASO[clave] || clave}</span>
              <span className={styles.resultadosValor}>
                {Array.isArray(valor)
                  ? valor.length === 0 ? <em>(ninguno)</em> : valor.join(', ')
                  : typeof valor === 'object' && valor !== null
                    ? Object.entries(valor).map(([k, v]) => `${k}: ${v}`).join(' · ')
                    : String(valor)}
              </span>
            </div>
          ))}
        </div>

        <details className={styles.resultadosJson}>
          <summary>JSON completo</summary>
          <pre>{JSON.stringify(respuestas, null, 2)}</pre>
        </details>

        <button className={styles.btnPrimary} style={{ width: '100%', marginTop: 8 }} onClick={onReset}>
          ↺ Reiniciar flujo
        </button>
      </div>
    </div>
  )
}
