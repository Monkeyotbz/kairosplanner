import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import Dock from './Dock'
import MusicPlayer from '../music/MusicPlayer'
import StarField from './StarField'
import ChatPanel from '../chat/ChatPanel'
import ToastContainer from './ToastContainer'
import ImmersiveFocus from '../focus/ImmersiveFocus'
import FocusCapsule from '../focus/FocusCapsule'
import AbadChat from '../kairos/AbadChat'
import Onboarding from './Onboarding'
import { useChatStore } from '../../store/chatStore'
import { useFocusStore } from '../../store/focusStore'
import styles from './AppShell.module.css'

export default function AppShell() {
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
      <ImmersiveFocus />
      <FocusCapsule />
      <AbadChat />
      <Onboarding />
    </div>
  )
}
