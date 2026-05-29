import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--kairos-bg-app)',
        color: 'var(--kairos-purple-400)',
        fontFamily: 'var(--kairos-font)',
        fontSize: 14,
      }}>
        Cargando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
