import { useState } from 'react'
import { useWTWStore } from '../store/wtwStore'
import { useThemeStore, THEMES } from '../../store/themeStore'
import InfinityLogo from '../../components/layout/InfinityLogo'
import WTWKanbanBoard from '../components/WTWKanbanBoard'
import WTWCalendarPanel from '../components/WTWCalendarPanel'
import WTWAbadChat from '../components/WTWAbadChat'
import styles from './WTWDashboardPage.module.css'

const TABS = [
  { id: 'overview',  label: 'Resumen',   icon: 'ti-layout-dashboard' },
  { id: 'kanban',    label: 'Tablero',   icon: 'ti-layout-kanban' },
  { id: 'calendar',  label: 'Reuniones', icon: 'ti-calendar' },
]

export default function WTWDashboardPage() {
  const { msUser, msToken, disconnect } = useWTWStore()
  const { theme, setTheme } = useThemeStore()
  const [tab, setTab] = useState('overview')

  const firstName = msUser?.displayName?.split(' ')[0] || 'Gabriel'

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <InfinityLogo size={32} state="idle" />
          <div>
            <p className={styles.brandName}>KAIROS</p>
            <p className={styles.brandSub}>for WTW</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.navItem} ${tab === t.id ? styles.navActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`ti ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.themePicker}>
          <p className={styles.sectionLabel}>Tema</p>
          <div className={styles.themeGrid}>
            {THEMES.map(th => (
              <button
                key={th.id}
                title={th.name}
                className={`${styles.themeBtn} ${theme === th.id ? styles.themeBtnActive : ''}`}
                onClick={() => setTheme(th.id)}
                style={{ background: th.bg, borderColor: theme === th.id ? th.accent : 'transparent' }}
              >
                <span style={{ background: th.accent }} className={styles.themeAccentDot} />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.user}>
          <div className={styles.avatar}>
            {(msUser?.displayName?.[0] || 'G').toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{msUser?.displayName || 'Gabriel'}</p>
            <p className={styles.userEmail}>{msUser?.email || ''}</p>
          </div>
          <button className={styles.disconnectBtn} onClick={disconnect} title="Desconectar">
            <i className="ti ti-logout" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.greeting}>Buen día, {firstName}</h1>
            <p className={styles.headerSub}>KAIROS for WTW · Centro de Operaciones</p>
          </div>
        </header>

        <div className={styles.content}>
          {tab === 'overview' && (
            <div className={styles.overview}>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <i className="ti ti-mail" /> Tareas desde email
                </h3>
                <p className={styles.comingSoon}>
                  <i className="ti ti-inbox" />
                  Las tareas extraídas de tus correos aparecerán aquí una vez configures el reenvío.
                </p>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <i className="ti ti-calendar" /> Próximas reuniones
                </h3>
                <WTWCalendarPanel msToken={msToken} />
              </section>
            </div>
          )}

          {tab === 'kanban' && (
            <div className={styles.kanbanWrap}>
              <WTWKanbanBoard userId={msUser?.kairos_id} />
            </div>
          )}

          {tab === 'calendar' && (
            <div className={styles.calendarWrap}>
              <WTWCalendarPanel msToken={msToken} />
            </div>
          )}
        </div>
      </main>

      <WTWAbadChat />
    </div>
  )
}
