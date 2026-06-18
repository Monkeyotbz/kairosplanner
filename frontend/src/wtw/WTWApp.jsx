import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useWTWStore } from './store/wtwStore'
import StarField from '../components/layout/StarField'
import WTWLoginPage from './pages/WTWLoginPage'
import WTWAuthCallback from './pages/WTWAuthCallback'
import WTWDashboardPage from './pages/WTWDashboardPage'

function WTWProtected({ children }) {
  const isConnected = useWTWStore(s => s.isConnected)
  if (!isConnected) return <Navigate to="/wtw/login" replace />
  return children
}

export default function WTWApp() {
  const init = useWTWStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <>
      <StarField />
      <Routes>
        <Route path="/wtw/login"         element={<WTWLoginPage />} />
        <Route path="/wtw/auth/callback" element={<WTWAuthCallback />} />
        <Route path="/wtw/dashboard"     element={<WTWProtected><WTWDashboardPage /></WTWProtected>} />
        <Route path="/wtw"               element={<Navigate to="/wtw/dashboard" replace />} />
        <Route path="/wtw/*"             element={<Navigate to="/wtw/dashboard" replace />} />
      </Routes>
    </>
  )
}
