import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { acceptInvitation } from '../services/boardService'

const PENDING_KEY = 'kairos-pending-invite'

export default function JoinProject() {
  const { inviteId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // Sin sesión: guarda la invitación y ve a loguearte. BoardPage la
      // retoma sola apenas vuelvas a entrar.
      localStorage.setItem(PENDING_KEY, inviteId)
      navigate('/login', { replace: true })
      return
    }

    acceptInvitation(inviteId)
      .then(proyectoId => {
        localStorage.removeItem(PENDING_KEY)
        localStorage.setItem('kairos-last-project', proyectoId)
        navigate('/board', { replace: true })
      })
      .catch(err => setError(err.message || 'Invitación no válida'))
  }, [authLoading, user, inviteId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--kairos-bg-app)', fontFamily: 'var(--kairos-font)',
      gap: 16, padding: 24,
    }}>
      {error ? (
        <>
          <p style={{ color: '#fca07a', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'var(--kairos-purple-600)', border: 'none', borderRadius: 8,
              padding: '8px 20px', color: '#fff', cursor: 'pointer', fontSize: '0.88rem',
            }}
          >
            Volver
          </button>
        </>
      ) : (
        <>
          <div style={{
            width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--kairos-purple-400)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--kairos-text-secondary)', fontSize: '0.88rem' }}>Uniéndote al proyecto…</p>
        </>
      )}
    </div>
  )
}
