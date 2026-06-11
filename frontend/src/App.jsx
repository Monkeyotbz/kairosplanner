import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ui/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import BoardPage from './pages/BoardPage'
import FocusPage from './pages/FocusPage'
import CalendarPage from './pages/CalendarPage'
import ProductivityPage from './pages/ProductivityPage'
import EntornoPage from './pages/EntornoPage'
import FinanzasPage from './pages/FinanzasPage'
import SpotifyCallbackPage from './pages/SpotifyCallbackPage'
import OnboardingPreviewPage from './pages/OnboardingPreviewPage'
import UpgradePage from './pages/UpgradePage'
import BillingSuccessPage from './pages/BillingSuccessPage'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/callback" element={<SpotifyCallbackPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/board"        element={<BoardPage />} />
          <Route path="/focus"        element={<FocusPage />} />
          <Route path="/calendar"     element={<CalendarPage />} />
          <Route path="/productivity" element={<ProductivityPage />} />
          <Route path="/finanzas"          element={<FinanzasPage />} />
          <Route path="/entorno"           element={<EntornoPage />} />
          <Route path="/onboarding-preview" element={<OnboardingPreviewPage />} />
        </Route>
        {/* Páginas de billing: requieren auth pero NO pasan por AppShell ni gate */}
        <Route path="/upgrade"         element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />
        <Route path="/billing-success" element={<ProtectedRoute><BillingSuccessPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
