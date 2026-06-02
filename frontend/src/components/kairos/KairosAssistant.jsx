import { useKairosVoice } from '../../hooks/useKairosVoice'
import { useChatStore } from '../../store/chatStore'
import { useMusicStore } from '../../store/musicStore'
import InfinityLogo from '../layout/InfinityLogo'
import styles from './KairosAssistant.module.css'

export default function KairosAssistant() {
  const { isListening, toggleListening, transcript } = useKairosVoice({
    onResult: (text) => {
      console.log('KAIROS procesando comando:', text)
    }
  })
  const chatOpen    = useChatStore(s => s.isOpen)
  const musicActive = useMusicStore(s => s.spotifyPlaying || s.ytPlaying)

  const state = isListening ? 'listening' : musicActive ? 'pulsing' : 'idle'

  return (
    <div
      className={styles.container}
      style={{ right: chatOpen ? '316px' : '30px' }}
    >
      <div className={`${styles.tooltip} ${(isListening && transcript) ? styles.showTooltip : ''}`}>
        {transcript}
      </div>

      <button
        className={`${styles.orbBtn} ${isListening ? styles.active : ''}`}
        onClick={toggleListening}
        title="ABAD — Asistente de KAIROS"
      >
        <InfinityLogo size={64} state={state} />
      </button>
    </div>
  )
}
