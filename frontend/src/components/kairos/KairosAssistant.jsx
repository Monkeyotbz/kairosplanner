import { useKairosVoice } from '../../hooks/useKairosVoice'
import styles from './KairosAssistant.module.css'

export default function KairosAssistant() {
  const { isListening, toggleListening, transcript } = useKairosVoice({
    onResult: (text) => {
      console.log('KAIROS procesando comando:', text)
      // Para la Fase 1: Solo registramos.
    }
  })

  return (
    <div className={`${styles.container} ${isListening ? styles.active : ''}`}>
      {/* Tooltip con el texto en vivo (se muestra si está escuchando y hay texto) */}
      <div className={`${styles.tooltip} ${(isListening && transcript) ? styles.showTooltip : ''}`}>
        {transcript}
      </div>

      {/* Orbe flotante (estilo Siri) */}
      <button 
        className={`${styles.orb} ${isListening ? styles.listening : ''}`} 
        onClick={toggleListening}
        title="Hablar con KAIROS"
      >
        <span className={styles.innerOrb}></span>
      </button>
    </div>
  )
}
