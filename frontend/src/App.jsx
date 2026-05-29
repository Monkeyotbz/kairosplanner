import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ui/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import BoardPage from './pages/BoardPage'
import FocusPage from './pages/FocusPage'
import CalendarPage from './pages/CalendarPage'
import ProductivityPage from './pages/ProductivityPage'
import EntornoPage from './pages/EntornoPage'
import FinanzasPage from './pages/FinanzasPage'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/productivity" element={<ProductivityPage />} />
          <Route path="/finanzas" element={<FinanzasPage />} />
          <Route path="/entorno" element={<EntornoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
