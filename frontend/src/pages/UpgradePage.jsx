import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { createSubscription, cancelSubscription } from '../services/subscriptionService'
import InfinityLogo from '../components/layout/InfinityLogo'
import StarField from '../components/layout/StarField'
import styles from './UpgradePage.module.css'

const FEATURES = [
  { icon: 'ti-layout-kanban', text: 'Tablero Kanban ilimitado con colaboración' },
  { icon: 'ti-brain',         text: 'ABAD — asistente IA con voz y contexto financiero' },
  { icon: 'ti-chart-area-line', text: 'Flujo de caja predictivo con recurrentes' },
  { icon: 'ti-coin',          text: 'Presupuestos Zero-Based por categoría' },
  { icon: 'ti-flame',         text: 'Sistema de rangos griegos y XP de enfoque' },
  { icon: 'ti-player-play',   text: 'Modo Enfoque inmersivo con cápsula' },
  { icon: 'ti-music',         text: 'Reproductor integrado YouTube + Spotify' },
  { icon: 'ti-timeline',      text: 'Agenda inteligente con bloques de energía' },
]

export default function UpgradePage() {
  const { info, loading, load } = useSubscriptionStore()
  const [working, setWorking]   = useState(false)
  const [err, setErr]           = useState('')

  useEffect(() => {
    if (!info && !loading) load()
    else if (loading) load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubscribe() {
    setWorking(true)
    setErr('')
    try {
      const url = await createSubscription()
      window.location.href = url
    } catch (e) {
      setErr(e.message)
      setWorking(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('¿Estás seguro de que quieres cancelar tu suscripción? Perderás acceso al terminar el período actual.')) return
    setWorking(true)
    setErr('')
    try {
      await cancelSubscription()
      await load() // refrescar estado
    } catch (e) {
      setErr(e.message)
    } finally {
      setWorking(false)
    }
  }

  const isActive      = info?.status === 'active'
  const isExpired     = info?.status === 'expired'
  const isPastDue     = info?.status === 'past_due'
  const trialDaysLeft = info?.trialDaysLeft ?? 0

  return (
    <div className={styles.page}>
      <StarField />

      {/* Volver al tablero — solo si el trial aún no expiró */}
      {!isExpired && !isPastDue && (
        <div className={styles.nav}>
          <Link to="/board" className={styles.navBack}>
            <i className="ti ti-arrow-left" /> Volver al tablero
          </Link>
        </div>
      )}

      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <InfinityLogo size={44} state="idle" />
          <span className={styles.wordmark}>KAIROS</span>
        </div>

        {/* Aviso de estado */}
        {isExpired && (
          <div className={`${styles.notice} ${styles.noticeWarn}`}>
            <i className="ti ti-clock-off" />
            Tu período de prueba ha terminado. Activa tu plan para continuar usando KAIROS.
          </div>
        )}
        {isPastDue && (
          <div className={`${styles.notice} ${styles.noticeWarn}`}>
            <i className="ti ti-alert-circle" />
            Tu suscripción tiene un pago pendiente. Actualiza tu método de pago.
          </div>
        )}
        {!isExpired && !isPastDue && !isActive && trialDaysLeft > 0 && (
          <div className={`${styles.notice} ${styles.noticeTrial}`}>
            <i className="ti ti-clock" />
            Te quedan <strong>{trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''}</strong> de prueba gratuita.
          </div>
        )}
        {isActive && (
          <div className={`${styles.notice} ${styles.noticeOk}`}>
            <i className="ti ti-circle-check" />
            Tu suscripción está activa. ¡Gracias por apoyar KAIROS!
          </div>
        )}

        {/* Tarjeta del plan */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.badge}>Plan único</span>
            <span className={styles.planName}>KAIROS Pro</span>
            <div className={styles.priceRow}>
              <span className={styles.currency}>$</span>
              <span className={styles.amount}>5</span>
              <div className={styles.priceSub}>
                <span>USD</span>
                <span>por mes</span>
              </div>
            </div>
            <p className={styles.planDesc}>
              Acceso completo · Sin permanencia · Cancela cuando quieras
            </p>
          </div>

          <ul className={styles.features}>
            {FEATURES.map(f => (
              <li key={f.text} className={styles.feature}>
                <i className={`ti ${f.icon} ${styles.featIcon}`} />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          {err && <p className={styles.error}>{err}</p>}

          {isActive ? (
            <>
              <Link to="/board" className={styles.ctaBtn} style={{ textDecoration: 'none', justifyContent: 'center' }}>
                <i className="ti ti-layout-kanban" /> Ir al tablero
              </Link>
              <button
                className={styles.manageBtn}
                onClick={handleCancel}
                disabled={working}
              >
                <i className="ti ti-circle-x" />
                {working ? 'Cancelando…' : 'Cancelar suscripción'}
              </button>
            </>
          ) : (
            <button
              className={styles.ctaBtn}
              onClick={handleSubscribe}
              disabled={working || loading}
            >
              {working ? (
                <><span className={styles.btnSpinner} /> Redirigiendo a MercadoPago…</>
              ) : (
                <><i className="ti ti-credit-card" /> Suscribirme ahora</>
              )}
            </button>
          )}

          <div className={styles.trust}>
            <span><i className="ti ti-lock" /> Pago seguro con MercadoPago</span>
            <span>·</span>
            <span><i className="ti ti-shield-check" /> PSE · Tarjetas · Efectivo</span>
            <span>·</span>
            <span><i className="ti ti-x" /> Cancela cuando quieras</span>
          </div>
        </div>
      </div>
    </div>
  )
}
