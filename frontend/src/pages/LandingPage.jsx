import { useState, useRef, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore, THEMES } from '../store/themeStore'
import StarField from '../components/layout/StarField'
import InfinityLogo from '../components/layout/InfinityLogo'
import styles from './LandingPage.module.css'
import { IconBrain, IconBrandReact, IconBrandSpotify, IconBrandYoutube, IconCalendar, IconCheck, IconCheckbox, IconDatabase, IconInfoCircle, IconMicrophone, IconMusicOff, IconPalette, IconPlayerSkipBack, IconPlayerSkipForward, IconShieldCheck, IconSparkles, IconUser, IconSquarePlus, IconCoin, IconArrowsExchange, IconLayoutKanban, IconFocus2, IconChartDonut3, IconMusic, IconCalendarEvent, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'

export default function LandingPage() {
  const user  = useAuthStore(s => s.user)
  const theme = useThemeStore(s => s.theme)
  // El landing solo vive en ambientes oscuros; Snow cae a Nebula aquí
  const landingTheme = theme === 'snow' ? 'nebula' : theme

  if (user) return <Navigate to="/board" replace />

  return (
    // data-theme local: resuelve todos los tokens --kairos-* para los hijos del landing
    <div className={styles.page} data-theme={landingTheme}>
      <StarField theme={landingTheme} />
      <LandingNav />
      <main>
        <HeroSection />
        <PhilosophySection />
        <VoiceSection />
        <MusicSection />
        <FeaturesSection />
        <PricingSection />
        <AboutSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

/* ─────────────────────────── Nav ─────────────────────────── */
const NAV_LINKS = [
  { href: '#filosofia', label: 'Filosofía' },
  { href: '#voz',       label: 'Inteligencia' },
  { href: '#musica',    label: 'Música' },
  { href: '#modulos',   label: 'Módulos' },
  { href: '#precios',   label: 'Precios' },
]

function LandingNav() {
  const navigate  = useNavigate()
  const [open, setOpen] = useState(false)

  function closeMenu() { setOpen(false) }

  return (
    <header className={styles.nav}>
      <div className={styles.navBrand}>
        <InfinityLogo size={42} state="idle" />
        <span className={styles.navName}>KAIROS</span>
      </div>

      {/* Desktop links */}
      <nav className={styles.navLinks}>
        {NAV_LINKS.map(l => (
          <a key={l.href} href={l.href} className={styles.navLink}>{l.label}</a>
        ))}
      </nav>

      {/* Desktop actions */}
      <div className={styles.navActions}>
        <LandingThemeSwitcher />
        <button className={styles.navLogin} onClick={() => navigate('/login')}>
          Ingresar
        </button>
        <button
          className={styles.navCta}
          onClick={() => navigate('/login', { state: { mode: 'register' } })}
        >
          Empezar gratis
        </button>
      </div>

      {/* Mobile: login + hamburger */}
      <div className={styles.navMobile}>
        <button className={styles.navLoginMobile} onClick={() => navigate('/login')}>
          Ingresar
        </button>
        <button
          className={`${styles.hamburger} ${open ? styles.hamburgerOpen : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-label="Menú"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className={styles.mobileMenu}>
          <nav className={styles.mobileLinks}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className={styles.mobileLink} onClick={closeMenu}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className={styles.mobileDivider} />
          <div className={styles.mobileActions}>
            <LandingThemeSwitcher />
            <button
              className={styles.navCta}
              style={{ width: '100%' }}
              onClick={() => { navigate('/login', { state: { mode: 'register' } }); closeMenu() }}
            >
              Empezar gratis →
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

/* Selector de tema — solo los 4 ambientes oscuros (Snow vive dentro del app) */
const LANDING_THEMES = THEMES.filter(t => t.id !== 'snow')

function LandingThemeSwitcher() {
  const { theme, setTheme } = useThemeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  // si el tema activo es snow, en el landing se muestra Nebula como activo
  const activeId = theme === 'snow' ? 'nebula' : theme

  useEffect(() => {
    if (!open) return
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className={styles.themeWrap} ref={ref}>
      <button
        className={`${styles.themeBtn} ${open ? styles.themeBtnActive : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Cambiar ambiente"
        aria-label="Cambiar ambiente"
      >
        <IconPalette size="1em" />
      </button>

      {open && (
        <div className={styles.themePanel}>
          <p className={styles.themePanelTitle}><IconSparkles size="1em" /> Elige tu ambiente</p>
          <div className={styles.themeGrid}>
            {LANDING_THEMES.map(t => (
              <button
                key={t.id}
                className={`${styles.swatch} ${activeId === t.id ? styles.swatchActive : ''}`}
                onClick={() => setTheme(t.id)}
                title={t.desc}
              >
                <div className={styles.swatchPreview} style={{ background: t.bg }}>
                  <div className={styles.swatchDot} style={{ background: t.accent }} />
                  {activeId === t.id && (
                    <div className={styles.swatchCheck}><IconCheck size="1em" /></div>
                  )}
                </div>
                <span className={styles.swatchName}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Hero ─────────────────────────── */
function HeroSection() {
  const navigate = useNavigate()
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroContent}>
        <div className={styles.heroLogo}>
          <InfinityLogo size={120} state="idle" />
        </div>

        <span className={styles.badge}>✦ El arte del momento oportuno</span>

        <h1 className={styles.headline}>
          Deja de perseguir el tiempo.<br />
          <span className={styles.headlineAccent}>Encuentra tu Kairos.</span>
        </h1>

        <p className={styles.subheadline}>
          No es otra app de deadlines y cronómetros. KAIROS crea las condiciones
          para que entres en flow y trabajes en tu momento de máxima capacidad.
        </p>

        <div className={styles.ctaGroup}>
          <button
            className={styles.ctaPrimary}
            onClick={() => navigate('/login', { state: { mode: 'register' } })}
          >
            Empezar gratis →
          </button>
          <button className={styles.ctaSecondary} onClick={() => navigate('/login')}>
            Ya tengo cuenta
          </button>
        </div>

        <p className={styles.heroNote}>Sin tarjeta de crédito · Diseño neuroinclusivo</p>
      </div>

      <div className={styles.heroVisual}>
        <KanbanMockup />

        <div className={styles.floatVoice}>
          <div className={styles.floatVoiceLogo}>
            <InfinityLogo size={42} state="listening" />
          </div>
          <div className={styles.floatVoiceText}>
            <span className={styles.floatVoiceLabel}>"Crea una tarjeta para el sprint"</span>
            <span className={styles.floatVoiceSub}>Escuchando…</span>
          </div>
        </div>

        <div className={styles.floatStats}>
          <span className={styles.floatStatsLabel}>Tu Kairos hoy</span>
          <span className={styles.floatStatsVal}>10:42</span>
          <span className={styles.floatStatsSub}>pico de enfoque detectado</span>
        </div>
      </div>
    </section>
  )
}

const MOCKUP_COLS = [
  {
    title: 'Por hacer',
    color: '#B4B2A9',
    cards: [
      { title: 'Diseño UI Dashboard', tag: 'UX', tagColor: '#7F77DD', avatar: 'G', avatarColor: '#534AB7', date: 'Jun 8',  check: '1/3', desc: 'Rediseño completo del panel principal con nuevo sistema de tokens.' },
      { title: 'Sprint planning Q3',  tag: 'Alta', tagColor: '#E07A52', avatar: 'M', avatarColor: '#D4537E', date: 'Jun 10', check: '0/2', desc: 'Definir objetivos y asignar tareas para el próximo sprint.' },
    ],
  },
  {
    title: 'En flow',
    color: '#5BA3F0',
    cards: [
      { title: 'Integrar API Spotify', tag: 'Dev', tagColor: '#5BA3F0', avatar: 'A', avatarColor: '#378ADD', date: 'Hoy',   check: '2/4', desc: 'Conectar autenticación PKCE y Web Playback SDK.' },
      { title: 'Modo enfoque v2',      tag: 'UX',  tagColor: '#7F77DD', avatar: 'G', avatarColor: '#534AB7', date: 'Jun 6',  check: '3/3', desc: 'Rituales de inicio y pausas activas con YouTube.' },
    ],
  },
  {
    title: 'Listo',
    color: '#7FB84A',
    cards: [
      { title: 'Autenticación OAuth', tag: 'Dev',  tagColor: '#5BA3F0', avatar: 'A', avatarColor: '#378ADD', date: 'Jun 3',  check: '4/4', desc: 'Login con Supabase Auth, sesiones persistentes.' },
      { title: 'Landing page',        tag: 'Mktg', tagColor: '#D4537E', avatar: 'G', avatarColor: '#534AB7', date: 'Jun 5',  check: '2/2', desc: 'Hero, filosofía, voz, módulos y CTA final.' },
    ],
  },
]

function KanbanMockup({ highlightTitle = null }) {
  const [activeCard, setActiveCard] = useState(null)
  const popRef = useRef(null)

  useEffect(() => {
    if (!activeCard) return
    function handleClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) setActiveCard(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activeCard])

  return (
    <div className={styles.mockup} style={{ position: 'relative' }}>
      <div className={styles.mockupHeader}>
        <span className={styles.mockupTitle}>
          <InfinityLogo size={22} state="idle" /> Mi proyecto
        </span>
        <div className={styles.mockupDots}><span /><span /><span /></div>
      </div>
      <div className={styles.mockupBoard}>
        {MOCKUP_COLS.map(col => (
          <div key={col.title} className={styles.mockupCol}>
            <div className={styles.mockupColHeader}>
              <span className={styles.mockupColDot} style={{ background: col.color, color: col.color }} />
              <span className={styles.mockupColTitle}>{col.title}</span>
              <span className={styles.mockupColCount}>{col.cards.length}</span>
            </div>
            {col.cards.map(card => (
              <button
                key={card.title}
                className={`${styles.mockupCard} ${styles.mockupCardBtn} ${highlightTitle === card.title ? styles.mockupCardHighlight : ''} ${activeCard?.title === card.title ? styles.mockupCardSelected : ''}`}
                onClick={() => setActiveCard(activeCard?.title === card.title ? null : card)}
              >
                <span className={styles.mockupCardTag} style={{ background: card.tagColor + '2e', color: card.tagColor }}>
                  {card.tag}
                </span>
                <p className={styles.mockupCardTitle}>{card.title}</p>
                <div className={styles.mockupCardFooter}>
                  <span className={styles.mockupAvatar} style={{ background: card.avatarColor + '40', border: `1px solid ${card.avatarColor}99` }}>
                    {card.avatar}
                  </span>
                  <span className={styles.mockupDate}>{card.date}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Popover de detalle al hacer click en una card */}
      {activeCard && (
        <div className={styles.cardPopover} ref={popRef}>
          <div className={styles.cardPopoverHeader}>
            <span className={styles.mockupCardTag} style={{ background: activeCard.tagColor + '2e', color: activeCard.tagColor }}>
              {activeCard.tag}
            </span>
            <button className={styles.cardPopoverClose} onClick={() => setActiveCard(null)}>✕</button>
          </div>
          <p className={styles.cardPopoverTitle}>{activeCard.title}</p>
          <p className={styles.cardPopoverDesc}>{activeCard.desc}</p>
          <div className={styles.cardPopoverMeta}>
            <div className={styles.cardPopoverRow}>
              <IconCheckbox size="1em" />
              <span>Subtareas</span>
              <strong>{activeCard.check}</strong>
            </div>
            <div className={styles.cardPopoverRow}>
              <IconCalendar size="1em" />
              <span>Fecha límite</span>
              <strong>{activeCard.date}</strong>
            </div>
            <div className={styles.cardPopoverRow}>
              <IconUser size="1em" />
              <span>Asignado</span>
              <span className={styles.mockupAvatar} style={{ background: activeCard.avatarColor + '40', border: `1px solid ${activeCard.avatarColor}99`, width: 18, height: 18, fontSize: 9 }}>
                {activeCard.avatar}
              </span>
            </div>
          </div>
          {/* Barra de progreso de checklist */}
          {(() => {
            const [done, total] = activeCard.check.split('/').map(Number)
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <div className={styles.cardPopoverProgress}>
                <div className={styles.cardPopoverProgressBar} style={{ width: `${pct}%` }} />
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

/* ───────────────────── Filosofía Chronos vs Kairos ───────────────────── */
function PhilosophySection() {
  return (
    <section className={styles.philosophy} id="filosofia">
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>La filosofía</span>
        <h2 className={styles.sectionTitle}>Dos formas de habitar el tiempo</h2>
        <p className={styles.sectionSub}>
          Los griegos lo sabían: no todo el tiempo es igual. KAIROS está construido
          sobre esa distinción.
        </p>
      </div>

      <div className={styles.philoGrid}>
        <div className={styles.philoCardChronos}>
          <span className={styles.philoGreek}>Χρόνος</span>
          <h3 className={styles.philoName}>Chronos</h3>
          <p className={styles.philoDesc}>El tiempo lineal y cuantitativo. El reloj que corre.</p>
          <ul className={styles.philoList}>
            <li>⏱ Cronómetros y cuentas regresivas</li>
            <li>📉 Deadlines que generan ansiedad</li>
            <li>🔁 Productividad medida en horas</li>
          </ul>
          <span className={styles.philoVerdict}>Lo que hacen las demás apps</span>
        </div>

        <div className={styles.philoVs}>vs</div>

        <div className={styles.philoCardKairos}>
          <span className={styles.philoGreekAccent}>Καιρός</span>
          <h3 className={styles.philoNameAccent}>Kairos</h3>
          <p className={styles.philoDesc}>El momento oportuno y cualitativo. El instante preciso.</p>
          <ul className={styles.philoList}>
            <li>✦ Rituales que inducen el enfoque</li>
            <li>🎵 Entorno que alinea tu mente</li>
            <li>🧠 Captura del insight en el momento</li>
          </ul>
          <span className={styles.philoVerdictAccent}>Lo que hace KAIROS</span>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────── KAIROS Intelligence (voz animada) ───────────────────── */
const DEMO_SEQUENCE = [
  {
    command: 'Crea una tarjeta "Revisar diseño" para mañana',
    result: { type: 'card', text: 'Tarjeta creada en "Por hacer" ✓', icon: IconSquarePlus },
  },
  {
    command: '¿Cuándo es mi pico de productividad hoy?',
    result: { type: 'insight', text: 'Tu Kairos: 10:42 – 12:15 · máximo potencial', icon: IconBrain },
  },
  {
    command: 'Registra $50 en herramientas de diseño',
    result: { type: 'confirm', text: 'Gasto registrado en Finanzas ✓', icon: IconCoin },
  },
  {
    command: 'Mueve "Sprint planning" a En flow',
    result: { type: 'confirm', text: 'Tarjeta movida a "En flow" ✓', icon: IconArrowsExchange },
  },
]

const TYPEWRITER_SPEED = 38 // ms por caracter

function VoiceSection() {
  const [phase, setPhase]     = useState('idle')   // idle | typing | processing | result
  const [cmdIdx, setCmdIdx]   = useState(0)
  const [typed, setTyped]     = useState('')
  const [logoState, setLogo]  = useState('idle')
  const timerRef = useRef(null)

  const current = DEMO_SEQUENCE[cmdIdx]

  function clearTimer() { if (timerRef.current) clearTimeout(timerRef.current) }

  function startCommand(idx) {
    clearTimer()
    setTyped('')
    setPhase('typing')
    setLogo('listening')
    setCmdIdx(idx)
  }

  // Ciclo automático
  useEffect(() => {
    clearTimer()
    if (phase === 'idle') {
      timerRef.current = setTimeout(() => {
        startCommand((cmdIdx + 1) % DEMO_SEQUENCE.length)
      }, 2500)
    }
    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Typewriter
  useEffect(() => {
    if (phase !== 'typing') return
    const cmd = DEMO_SEQUENCE[cmdIdx].command
    if (typed.length >= cmd.length) {
      timerRef.current = setTimeout(() => setPhase('processing'), 400)
      return
    }
    timerRef.current = setTimeout(() => setTyped(cmd.slice(0, typed.length + 1)), TYPEWRITER_SPEED)
    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typed])

  // Processing → result
  useEffect(() => {
    if (phase !== 'processing') return
    setLogo('pulsing')
    timerRef.current = setTimeout(() => { setPhase('result'); setLogo('idle') }, 900)
    return clearTimer
  }, [phase])

  // Result → idle
  useEffect(() => {
    if (phase !== 'result') return
    timerRef.current = setTimeout(() => setPhase('idle'), 2800)
    return clearTimer
  }, [phase])

  // Arranque inicial
  useEffect(() => {
    timerRef.current = setTimeout(() => startCommand(0), 1200)
    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className={styles.voice} id="voz">
      <div className={styles.voiceVisual}>
        <div className={styles.voiceOrbGlow} aria-hidden="true" />
        <InfinityLogo size={180} state={logoState} />

        {/* Terminal de comandos */}
        <div className={`${styles.voiceTerminal} ${phase !== 'idle' ? styles.voiceTerminalVisible : ''}`}>
          <span className={styles.voiceTerminalPrompt}>›</span>
          <span className={styles.voiceTerminalText}>
            {phase === 'typing' || phase === 'processing' || phase === 'result'
              ? DEMO_SEQUENCE[cmdIdx].command.slice(0, typed.length || DEMO_SEQUENCE[cmdIdx].command.length)
              : ''}
            {phase === 'typing' && <span className={styles.voiceCaret} />}
          </span>
        </div>

        {/* Resultado */}
        {phase === 'result' && (
          <div className={styles.voiceResult}>
            <current.result.icon size="1em" />
            <span>{current.result.text}</span>
          </div>
        )}

        {phase === 'processing' && (
          <div className={styles.voiceProcessing}>
            <span /><span /><span />
          </div>
        )}

        <div className={styles.voiceWave}><span /><span /><span /><span /><span /></div>
      </div>

      <div className={styles.voiceContent}>
        <span className={styles.sectionTag}>KAIROS Intelligence</span>
        <h2 className={styles.sectionTitle}>Tu agente de IA personal.</h2>
        <p className={styles.sectionSub}>
          Habla y el agente crea tarjetas, mueve columnas, registra gastos y detecta
          cuándo estás en tu mejor momento para trabajar.
        </p>
        <div className={styles.voiceChips}>
          {DEMO_SEQUENCE.map((item, i) => (
            <button
              key={item.command}
              className={`${styles.voiceChip} ${cmdIdx === i && phase !== 'idle' ? styles.voiceChipActive : ''}`}
              onClick={() => startCommand(i)}
            >
              <IconMicrophone size="1em" /> {item.command}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────── Música / Ambiente sonoro ───────────────────── */
const PLAYLISTS = [
  { name: 'Deep Focus',      time: '2:42:18', platform: 'spotify', color: '#1DB954', icon: IconBrandSpotify },
  { name: 'Lo-fi Beats',     time: '1:58:04', platform: 'spotify', color: '#1DB954', icon: IconBrandSpotify },
  { name: 'Flow State',      time: '3:10:55', platform: 'youtube', color: '#FF0000', icon: IconBrandYoutube },
  { name: 'Binaural Alpha',  time: '0:58:22', platform: 'youtube', color: '#FF0000', icon: IconBrandYoutube },
]

function MusicSection() {
  const [playing, setPlaying] = useState(null)

  return (
    <section className={styles.musicSection} id="musica">
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>Entorno sonoro</span>
        <h2 className={styles.sectionTitle}>Tu música. Tu flow.</h2>
        <p className={styles.sectionSub}>
          Conecta Spotify Premium o agrega playlists de YouTube para alinear
          tu entorno sonoro con tu estado de enfoque.
        </p>
      </div>

      <div className={styles.musicGrid}>
        {/* Player mock */}
        <div className={styles.musicPlayer}>
          <div className={styles.musicPlayerHeader}>
            <InfinityLogo size={20} state={playing ? 'pulsing' : 'idle'} />
            <span className={styles.musicPlayerTitle}>Reproductor KAIROS</span>
            <div className={styles.musicPlatforms}>
              <span className={styles.musicBadge} style={{ color: '#1DB954' }}><IconBrandSpotify size="1em" /> Spotify</span>
              <span className={styles.musicBadge} style={{ color: '#FF0000' }}><IconBrandYoutube size="1em" /> YouTube</span>
            </div>
          </div>

          {playing
            ? (
              <div className={styles.musicNowPlaying}>
                <div className={styles.musicAlbumArt} style={{ background: playing.platform === 'spotify' ? 'rgba(29,185,84,0.15)' : 'rgba(255,0,0,0.12)', borderColor: playing.platform === 'spotify' ? 'rgba(29,185,84,0.35)' : 'rgba(255,0,0,0.3)' }}>
                  <playing.icon size="1em" style={{ color: playing.color, fontSize: 36 }} />
                </div>
                <div className={styles.musicInfo}>
                  <p className={styles.musicTrackName}>{playing.name}</p>
                  <p className={styles.musicTrackDur}>{playing.time}</p>
                  <div className={styles.musicProgress}>
                    <div className={styles.musicProgressBar} style={{ background: playing.color }} />
                  </div>
                </div>
              </div>
            )
            : (
              <div className={styles.musicEmpty}>
                <IconMusicOff size="1em" />
                <span>Selecciona una playlist para comenzar</span>
              </div>
            )
          }

          <div className={styles.musicControls}>
            <button className={styles.musicCtrl}><IconPlayerSkipBack size="1em" /></button>
            <button
              className={`${styles.musicCtrl} ${styles.musicCtrlPlay}`}
              onClick={() => setPlaying(v => v ? null : PLAYLISTS[0])}
              style={{ background: playing ? 'rgba(255,255,255,0.1)' : 'var(--c-accent)' }}
            >
              {playing ? <IconPlayerPause size="1em" /> : <IconPlayerPlay size="1em" />}
            </button>
            <button className={styles.musicCtrl}><IconPlayerSkipForward size="1em" /></button>
          </div>
        </div>

        {/* Lista de playlists */}
        <div className={styles.musicPlaylistsCol}>
          <p className={styles.musicPlaylistsLabel}>Playlists disponibles</p>
          <div className={styles.musicPlaylists}>
            {PLAYLISTS.map(pl => (
              <button
                key={pl.name}
                className={`${styles.musicPlaylistItem} ${playing?.name === pl.name ? styles.musicPlaylistActive : ''}`}
                onClick={() => setPlaying(pl)}
              >
                <div className={styles.musicPlaylistIcon} style={{ background: pl.color + '1a', border: `1px solid ${pl.color}44` }}>
                  <pl.icon size="1em" style={{ color: pl.color }} />
                </div>
                <div className={styles.musicPlaylistInfo}>
                  <span className={styles.musicPlaylistName}>{pl.name}</span>
                  <span className={styles.musicPlaylistDur}>{pl.time}</span>
                </div>
                {playing?.name === pl.name && (
                  <div className={styles.musicPlaylistWave}>
                    <span /><span /><span />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className={styles.musicPlaylistsNote}>
            <IconInfoCircle size="1em" /> Spotify requiere cuenta Premium para reproducción en browser
          </p>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────── Módulos / Features ───────────────────── */
const FEATURES = [
  { icon: IconLayoutKanban,  name: 'Tablero Kanban',   desc: 'Arrastra, asigna y etiqueta. Tu trabajo fluye sin fricción.' },
  { icon: IconFocus2,        name: 'Modo Enfoque',     desc: 'Pomodoro como ritual, no como reloj. Con pausas activas.' },
  { icon: IconChartDonut3,   name: 'Estadísticas',     desc: 'Descubre cuándo rindes más y capitaliza ese momento.' },
  { icon: IconMusic,         name: 'Música integrada',  desc: 'Spotify y YouTube para alinear tu entorno sonoro.' },
  { icon: IconCoin,          name: 'Finanzas',         desc: 'Controla gastos personales y por proyecto, sin salir del flow.' },
  { icon: IconCalendarEvent, name: 'Agenda inteligente', desc: 'Vista mes y lista, con alertas de vencimiento oportunas.' },
]

function FeaturesSection() {
  return (
    <section className={styles.features} id="modulos">
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>Todo en uno</span>
        <h2 className={styles.sectionTitle}>Un ecosistema para tu Kairos</h2>
        <p className={styles.sectionSub}>
          Cada módulo existe para una sola cosa: eliminar lo que interrumpe tu mejor trabajo.
        </p>
      </div>
      <div className={styles.featGrid}>
        {FEATURES.map(f => (
          <div key={f.name} className={styles.featCard}>
            <div className={styles.featIcon}><f.icon size="1em" /></div>
            <h3 className={styles.featName}>{f.name}</h3>
            <p className={styles.featDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────── Precios ───────────────────── */
function PricingSection() {
  const navigate = useNavigate()
  return (
    <section className={styles.pricing} id="precios">
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>Planes</span>
        <h2 className={styles.sectionTitle}>Simple y transparente</h2>
        <p className={styles.sectionSub}>
          14 días para descubrir tu Kairos. Sin tarjeta de crédito.
        </p>
      </div>

      <div className={styles.pricingGrid}>
        {/* Trial */}
        <div className={styles.pricingCard}>
          <div className={styles.pricingBadge}>Gratis</div>
          <div className={styles.pricingPrice}>
            <span className={styles.pricingAmount}>14 días</span>
            <span className={styles.pricingPer}>prueba completa</span>
          </div>
          <ul className={styles.pricingFeats}>
            <li><IconCheck size="1em" /> Todos los módulos sin límite</li>
            <li><IconCheck size="1em" /> ABAD — agente de IA incluido</li>
            <li><IconCheck size="1em" /> Música + Spotify + YouTube</li>
            <li><IconCheck size="1em" /> Estadísticas y rangos</li>
            <li><IconCheck size="1em" /> Sin tarjeta de crédito</li>
          </ul>
          <button
            className={styles.pricingBtnSecondary}
            onClick={() => navigate('/login', { state: { mode: 'register' } })}
          >
            Comenzar prueba →
          </button>
        </div>

        {/* Pro */}
        <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
          <div className={styles.pricingGlow} aria-hidden="true" />
          <div className={styles.pricingBadgePro}>✦ Pro</div>
          <div className={styles.pricingPrice}>
            <span className={styles.pricingAmount}>$20.000</span>
            <span className={styles.pricingPer}>COP / mes</span>
          </div>
          <p className={styles.pricingNote}>Pago seguro vía MercadoPago</p>
          <ul className={styles.pricingFeats}>
            <li><IconCheck size="1em" /> Todo lo del período de prueba</li>
            <li><IconCheck size="1em" /> Acceso permanente sin cortes</li>
            <li><IconCheck size="1em" /> Nuevas funciones al lanzarse</li>
            <li><IconCheck size="1em" /> Soporte prioritario</li>
            <li><IconCheck size="1em" /> Cancela cuando quieras</li>
          </ul>
          <button
            className={styles.pricingBtnPro}
            onClick={() => navigate('/login', { state: { mode: 'register' } })}
          >
            Empezar gratis → Pro
          </button>
        </div>
      </div>

      <p className={styles.pricingDisclaimer}>
        <IconShieldCheck size="1em" /> Al terminar la prueba se te notificará antes de cualquier cobro.
        No hay cargos automáticos sin confirmación.
      </p>
    </section>
  )
}

/* ───────────────────── About / Creador ───────────────────── */
function AboutSection() {
  return (
    <section className={styles.about} id="sobre">
      <div className={styles.aboutInner}>
        <div className={styles.aboutLogo}>
          <InfinityLogo size={56} state="idle" />
        </div>
        <div className={styles.aboutContent}>
          <span className={styles.sectionTag}>El origen</span>
          <h2 className={styles.aboutTitle}>Construido por un humano, para humanos.</h2>
          <p className={styles.aboutText}>
            KAIROS nació de la frustración de usar apps que miden el tiempo pero ignoran
            cómo funciona la mente. No es un producto de corporación — es una herramienta
            que un desarrollador construyó para sí mismo y decidió compartir.
          </p>
          <p className={styles.aboutText}>
            Cada módulo existe porque resolvió un problema real: el tablero Kanban
            para no perder el hilo, el modo Enfoque para entrar en flow de verdad,
            ABAD para capturar sin interrumpir el trabajo.
          </p>
          <div className={styles.aboutStack}>
            <span className={styles.aboutChip}><IconBrandReact size="1em" /> React</span>
            <span className={styles.aboutChip}><IconDatabase size="1em" /> Supabase</span>
            <span className={styles.aboutChip}><IconBrain size="1em" /> Claude AI</span>
            <span className={styles.aboutChip}><IconBrandSpotify size="1em" /> Spotify</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────── CTA final ───────────────────── */
function FinalCTA() {
  const navigate = useNavigate()
  return (
    <section className={styles.finalCta}>
      <div className={styles.finalGlow} aria-hidden="true" />
      <InfinityLogo size={88} state="idle" />
      <h2 className={styles.finalTitle}>Encuentra tu momento perfecto</h2>
      <p className={styles.finalSub}>
        Empieza a trabajar con el tiempo, no contra él.
      </p>
      <button
        className={styles.ctaPrimary}
        onClick={() => navigate('/login', { state: { mode: 'register' } })}
      >
        Crear mi espacio KAIROS →
      </button>
    </section>
  )
}

/* ───────────────────── Footer ───────────────────── */
function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <InfinityLogo size={28} state="idle" />
        <span className={styles.navName}>KAIROS</span>
      </div>
      <span className={styles.footerText}>El momento oportuno, cada día.</span>
    </footer>
  )
}
