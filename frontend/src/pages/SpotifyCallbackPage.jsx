import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCode, getMe, getPlaylists } from '../services/spotifyService'
import { useMusicStore } from '../store/musicStore'

export default function SpotifyCallbackPage() {
  const navigate = useNavigate()
  const { setSpotifyUser, setSpotifyPlaylists, setActiveTab, setShowPlayer } = useMusicStore()
  const [status, setStatus] = useState('Conectando con Spotify…')
  const [error,  setError]  = useState('')

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const code      = params.get('code')
    const errParam  = params.get('error')

    if (errParam) { setError(`Spotify rechazó el acceso: ${errParam}`); return }
    if (!code)    { navigate('/', { replace: true }); return }

    async function connect() {
      try {
        setStatus('Obteniendo tokens…')
        await exchangeCode(code)

        setStatus('Cargando tu perfil…')
        const [user, playlists] = await Promise.all([getMe(), getPlaylists()])
        setSpotifyUser(user)
        setSpotifyPlaylists(playlists)
        setActiveTab('spotify')
        setShowPlayer(true)

        navigate('/', { replace: true })
      } catch (err) {
        setError(err.message)
      }
    }

    connect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
            borderTopColor: '#1DB954', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--kairos-text-secondary)', fontSize: '0.88rem' }}>{status}</p>
        </>
      )}
    </div>
  )
}
