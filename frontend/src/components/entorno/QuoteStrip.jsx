import { useEffect, useState } from 'react'
import { getActiveFrase, getActivePlaylist } from '../../services/boardService'
import styles from './QuoteStrip.module.css'

export default function QuoteStrip() {
  const [frase, setFrase] = useState(null)
  const [playlist, setPlaylist] = useState(null)

  useEffect(() => {
    getActiveFrase().then(setFrase)
    getActivePlaylist().then(setPlaylist)
  }, [])

  return (
    <div className={styles.strip}>
      <div className={styles.left}>
        <span className={styles.icon}>✦</span>
        {frase
          ? <span className={styles.quote}>"{frase.contenido}" — {frase.autor}</span>
          : <span className={styles.quote}>Cargando frase del día...</span>
        }
      </div>

      {playlist && (
        <div className={styles.right}>
          <span className={styles.playlistDot} />
          <span className={styles.playlistName}>{playlist.nombre}</span>
          <span className={styles.separator}>·</span>
          <span className={styles.time}>04:06</span>
        </div>
      )}
    </div>
  )
}
