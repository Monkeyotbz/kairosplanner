import { useState, useEffect, useRef } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { getMessages, sendMessage, subscribeToMessages } from '../../services/chatService'
import { getProjectMembers } from '../../services/boardService'
import { supabase } from '../../services/supabase'
import styles from './ChatPanel.module.css'
import { IconMessageCircle, IconMessageOff, IconSend, IconX } from '@tabler/icons-react'

function timeLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  return `${d.toLocaleDateString('es', { day: 'numeric', month: 'short' })} ${time}`
}

function Avatar({ name, url, size = 28 }) {
  if (url) return <img src={url} alt={name} className={styles.avatar} style={{ width: size, height: size }} />
  return (
    <div className={styles.avatarFallback} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function ChatPanel({ onClose }) {
  const { proyecto } = useBoardStore()
  const { user, profile } = useAuthStore()
  const [messages,    setMessages]    = useState([])
  const [members,     setMembers]     = useState([])
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(true)
  const [sending,     setSending]     = useState(false)
  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const channelRef   = useRef(null)
  const presenceRef  = useRef(null)

  useEffect(() => {
    if (!proyecto?.id || !user?.id) return
    setLoading(true)

    Promise.all([
      getMessages(proyecto.id),
      getProjectMembers(proyecto.id),
    ]).then(([msgs, mbs]) => {
      setMessages(msgs)
      setMembers(mbs)
    }).catch(console.error).finally(() => setLoading(false))

    // Suscripción a mensajes nuevos
    channelRef.current = subscribeToMessages(proyecto.id, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    // Presencia online — rastrea quién tiene el chat abierto
    presenceRef.current = supabase.channel(`presence-${proyecto.id}`)
    presenceRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = presenceRef.current.presenceState()
        const online = new Set(
          Object.values(state).flat().map(p => p.user_id)
        )
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceRef.current.track({ user_id: user.id })
        }
      })

    return () => {
      if (channelRef.current)  supabase.removeChannel(channelRef.current)
      if (presenceRef.current) supabase.removeChannel(presenceRef.current)
    }
  }, [proyecto?.id, user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || !user || sending) return
    setInput('')
    setSending(true)
    try {
      const msg = await sendMessage(proyecto.id, user.id, text)
      // El canal realtime lo añadirá — si falla, lo añadimos localmente
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    } catch (err) {
      console.error(err)
      setInput(text) // restaurar si falló
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.panel}>

      {/* Cabecera */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <IconMessageCircle size="1em" />
          <span>Chat del proyecto</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          <IconX size="1em" />
        </button>
      </div>

      {/* Miembros del proyecto */}
      {members.length > 0 && (
        <div className={styles.members}>
          {members.map(m => {
            const name     = m.usuarios?.nombre || m.usuarios?.email || '?'
            const url      = m.usuarios?.avatar_url
            const isMe     = m.usuario_id === user?.id
            const isOnline = onlineUsers.has(m.usuario_id)
            return (
              <div key={m.usuario_id} className={styles.memberPill} title={isOnline ? `${name} — en línea` : name}>
                <div className={styles.memberAvatarWrap}>
                  <Avatar name={name} url={url} size={24} />
                  <span className={`${styles.presenceDot} ${isOnline ? styles.online : styles.offline}`} />
                </div>
                <span className={`${styles.memberName} ${isMe ? styles.memberMe : ''}`}>
                  {isMe ? 'Tú' : name.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className={styles.divider} />

      {/* Mensajes */}
      <div className={styles.messages}>
        {loading ? (
          <div className={styles.loadingMsg}>
            <div className={styles.spinner} />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.empty}>
            <IconMessageOff size="1em" />
            <p>No hay mensajes aún</p>
            <small>¡Sé el primero en escribir!</small>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn     = msg.usuario_id === user?.id
            const name      = msg.usuarios?.nombre || msg.usuarios?.email || '?'
            const url       = msg.usuarios?.avatar_url
            const prevMsg   = messages[i - 1]
            const grouped   = prevMsg && prevMsg.usuario_id === msg.usuario_id
            return (
              <div
                key={msg.id}
                className={`${styles.msg} ${isOwn ? styles.own : styles.other} ${grouped ? styles.grouped : ''}`}
              >
                {!isOwn && !grouped && (
                  <div className={styles.msgAvatar}>
                    <Avatar name={name} url={url} size={26} />
                  </div>
                )}
                {!isOwn && grouped && <div className={styles.msgAvatarSpace} />}

                <div className={styles.msgContent}>
                  {!isOwn && !grouped && (
                    <span className={styles.msgName}>{name}</span>
                  )}
                  <div className={styles.msgBubble}>{msg.contenido}</div>
                  {(!grouped || i === messages.length - 1) && (
                    <span className={styles.msgTime}>{timeLabel(msg.created_at)}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje... (Enter para enviar)"
          rows={1}
          disabled={sending}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          <IconSend size="1em" />
        </button>
      </div>

    </div>
  )
}
