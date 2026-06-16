import styles from './WTWLoginPage.module.css'
import InfinityLogo from '../../components/layout/InfinityLogo'

const CLIENT_ID  = import.meta.env.VITE_AZURE_CLIENT_ID
const REDIRECT   = `${window.location.origin}/wtw/auth/callback`
const SCOPES     = [
  'openid', 'profile', 'email', 'offline_access',
  'Calendars.ReadWrite',
  'Mail.Read',
  'User.Read',
  'User.ReadBasic.All',
  'OnlineMeetings.ReadWrite',
  'Chat.ReadWrite',
].join(' ')

function getMSLoginUrl() {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'code',
    redirect_uri:  REDIRECT,
    scope:         SCOPES,
    response_mode: 'query',
    state:         crypto.randomUUID(),
  })
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
}

export default function WTWLoginPage() {
  const handleLogin = () => {
    if (!CLIENT_ID) {
      alert('Azure credentials not configured yet. Coming soon.')
      return
    }
    window.location.href = getMSLoginUrl()
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <InfinityLogo size={48} state="idle" />
          <div>
            <h1 className={styles.title}>KAIROS</h1>
            <p className={styles.sub}>for Willis Towers Watson</p>
          </div>
        </div>

        <p className={styles.desc}>
          Tu centro de operaciones inteligente. Conecta tu cuenta Microsoft para comenzar.
        </p>

        <button className={styles.msBtn} onClick={handleLogin}>
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Continuar con Microsoft
        </button>

        <p className={styles.privacy}>
          KAIROS solo accede a tu calendario y correo para organizar tus tareas.
          Nunca lee adjuntos ni comparte datos con terceros.
        </p>
      </div>
    </div>
  )
}
