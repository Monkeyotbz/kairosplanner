import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import KairosAssistant from '../kairos/KairosAssistant'
import QuoteStrip from '../entorno/QuoteStrip'
import MusicPlayer from '../music/MusicPlayer'
import StarField from './StarField'
import ChatPanel from '../chat/ChatPanel'
import ToastContainer from './ToastContainer'
import { useChatStore } from '../../store/chatStore'
import styles from './AppShell.module.css'

export default function AppShell() {
  const { isOpen: chatOpen, close: closeChat } = useChatStore()

  return (
    <div className={styles.shell}>
      <StarField />
      <Topbar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <QuoteStrip />
      <MusicPlayer />
      <KairosAssistant />
      {chatOpen && <ChatPanel onClose={closeChat} />}
      <ToastContainer />
    </div>
  )
}
