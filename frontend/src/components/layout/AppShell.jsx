import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import Dock from './Dock'
import MusicPlayer from '../music/MusicPlayer'
import StarField from './StarField'
import ChatPanel from '../chat/ChatPanel'
import ToastContainer from './ToastContainer'
import SyncIndicator from './SyncIndicator'
import ImmersiveFocus from '../focus/ImmersiveFocus'
import FocusCapsule from '../focus/FocusCapsule'
import AbadChat from '../kairos/AbadChat'
import AbadOnboarding from '../kairos/AbadOnboarding'
import CookieConsent from './CookieConsent'
import { useChatStore } from '../../store/chatStore'
import { useFocusStore } from '../../store/focusStore'
import { useFocusRecovery } from '../../hooks/useFocusRecovery'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import styles from './AppShell.module.css'

export default function AppShell() {
  useFocusRecovery()

  const navigate = useNavigate()
  const { load, info, loading: subLoading } = useSubscriptionStore()

  // Cargar estado de suscripción al montar
  useEffect(() => { load() }, [load])

  // Redirigir a /upgrade si el trial expiró y no hay suscripción activa
  useEffect(() => {
    if (!subLoading && info !== null && !info.isActive) {
      navigate('/upgrade', { replace: true })
    }
  }, [subLoading, info, navigate])

  const { isOpen: chatOpen, close: closeChat } = useChatStore()
  const phase     = useFocusStore(s => s.phase)
  const immersive = useFocusStore(s => s.immersive)

  // Modo Kairós: sesión viva pero minimizada → la interfaz se aquieta.
  const kairosQuiet = !immersive && (phase === 'active' || phase === 'break')

  return (
    <div className={`${styles.shell} ${kairosQuiet ? styles.quiet : ''}`}>
      <StarField />
      <Topbar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <Dock />
      <MusicPlayer />
      {chatOpen && <ChatPanel onClose={closeChat} />}
      <ToastContainer />
      <SyncIndicator />
      <ImmersiveFocus />
      <FocusCapsule />
      <AbadChat />
      <AbadOnboarding />
      <CookieConsent />
    </div>
  )
}
