import { useRef, useEffect } from 'react'
import { useThemeStore, THEMES } from '../../store/themeStore'
import styles from './ThemeSwitcher.module.css'

export default function ThemeSwitcher({ open, onClose }) {
  const { theme, setTheme } = useThemeStore()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.panel} ref={ref}>
      <p className={styles.title}><i className="ti ti-palette" /> Apariencia</p>
      <div className={styles.grid}>
        {THEMES.map(t => (
          <button
            key={t.id}
            className={`${styles.swatch} ${theme === t.id ? styles.swatchActive : ''}`}
            onClick={() => { setTheme(t.id); onClose() }}
            title={t.name}
          >
            <div className={styles.preview} style={{ background: t.bg }}>
              <div className={styles.previewSidebar} style={{ background: t.sidebar }} />
              <div className={styles.previewAccent} style={{ background: t.accent }} />
              {theme === t.id && (
                <div className={styles.previewCheck}>
                  <i className="ti ti-check" />
                </div>
              )}
            </div>
            <span className={styles.swatchName}>{t.name}</span>
            <span className={styles.swatchDesc}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
