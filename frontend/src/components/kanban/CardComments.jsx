import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import { getComentarios, addComentario, deleteComentario } from '../../services/boardService'
import styles from './CardComments.module.css'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return 'hace un momento'
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function CardComments({ cardId }) {
  const { user } = useAuthStore()
  const markCardCommentsRead = useBoardStore(s => s.markCardCommentsRead)
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!cardId) return
    setLoading(true)
    getComentarios(cardId)
      .then(setComments)
      .finally(() => setLoading(false))
    markCardCommentsRead(cardId)
  }, [cardId])

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setSending(true)
    try {
      const c = await addComentario(cardId, content)
      setComments(prev => [...prev, c])
      setText('')
    } finally { setSending(false) }
  }

  async function handleDelete(id) {
    setComments(prev => prev.filter(c => c.id !== id))
    await deleteComentario(id)
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className={styles.wrap}>
      {loading ? (
        <span className={styles.loading}>Cargando…</span>
      ) : comments.length === 0 ? (
        <p className={styles.empty}>Sin comentarios todavía.</p>
      ) : (
        <ul className={styles.list}>
          {comments.map(c => {
            const isMine = c.autor_id === user?.id
            return (
              <li key={c.id} className={styles.item}>
                <div className={styles.avatar}>{isMine ? initial : '?'}</div>
                <div className={styles.bubble}>
                  <div className={styles.bubbleTop}>
                    <span className={styles.who}>{isMine ? 'Tú' : 'Miembro'}</span>
                    <span className={styles.when}>{timeAgo(c.creado_en)}</span>
                    {isMine && (
                      <button className={styles.delBtn} onClick={() => handleDelete(c.id)}>
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>
                  <p className={styles.content}>{c.contenido}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form className={styles.form} onSubmit={handleSend}>
        <div className={styles.avatar}>{initial}</div>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe un comentario…"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
          }}
        />
        <button type="submit" className={styles.sendBtn} disabled={!text.trim() || sending}>
          <i className="ti ti-send" />
        </button>
      </form>
    </div>
  )
}
