import { useState, useEffect, useRef } from 'react'
import styles from './CoverPicker.module.css'
import { IconPhoto, IconSearch, IconX } from '@tabler/icons-react'

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY

const QUICK_TAGS = ['espacio', 'naturaleza', 'ciudad', 'montaña', 'océano', 'abstracto', 'tecnología', 'foco']

export default function CoverPicker({ onSelect, onRemove, onClose, currentUrl, style }) {
  const [query,   setQuery]   = useState('')
  const [photos,  setPhotos]  = useState([])
  const [loading, setLoading] = useState(true)
  const debounce = useRef(null)

  useEffect(() => { fetchDefault() }, [])

  async function fetchDefault() {
    if (!ACCESS_KEY) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://api.unsplash.com/photos?per_page=16&order_by=popular&client_id=${ACCESS_KEY}`
      )
      setPhotos(await res.json())
    } catch {
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchSearch(q) {
    if (!q.trim()) { fetchDefault(); return }
    if (!ACCESS_KEY) return
    setLoading(true)
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=16&client_id=${ACCESS_KEY}`
      )
      const data = await res.json()
      setPhotos(data.results ?? [])
    } catch {
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  function handleQuery(q) {
    setQuery(q)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => fetchSearch(q), 500)
  }

  function handleQuickTag(tag) {
    setQuery(tag)
    fetchSearch(tag)
  }

  return (
    <>
      <div className={styles.backdrop} onClick={e => { e.stopPropagation(); onClose() }} />

      <div className={styles.picker} style={style} onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className={styles.header}>
          <span className={styles.title}>
            <IconPhoto size="1em" /> Portada
          </span>
          <div className={styles.headerRight}>
            {currentUrl && (
              <button className={styles.removeBtn} onClick={() => { onRemove(); onClose() }}>
                Quitar
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <IconX size="1em" />
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className={styles.searchRow}>
          <IconSearch size="1em" />
          <input
            className={styles.searchInput}
            placeholder="Buscar imágenes..."
            value={query}
            onChange={e => handleQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tags rápidos */}
        <div className={styles.tags}>
          {QUICK_TAGS.map(t => (
            <button
              key={t}
              className={query === t ? styles.tagActive : styles.tag}
              onClick={() => handleQuickTag(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {!ACCESS_KEY ? (
          <div className={styles.noKey}>
            Agrega <code>VITE_UNSPLASH_ACCESS_KEY</code> en <code>frontend/.env.local</code>
          </div>
        ) : loading ? (
          <div className={styles.loading}><div className={styles.spinner} /></div>
        ) : photos.length === 0 ? (
          <div className={styles.empty}>No se encontraron imágenes</div>
        ) : (
          <div className={styles.grid}>
            {photos.map(photo => (
              <button
                key={photo.id}
                className={styles.thumb}
                onClick={() => { onSelect(photo.urls.small); onClose() }}
                title={photo.user?.name ?? ''}
              >
                <img src={photo.urls.thumb} alt={photo.alt_description ?? ''} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className={styles.attribution}>
          Fotos por{' '}
          <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>
        </div>

      </div>
    </>
  )
}
