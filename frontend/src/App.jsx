import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ui/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'

const BoardPage             = lazy(() => import('./pages/BoardPage'))
const FocusPage              = lazy(() => import('./pages/FocusPage'))
const CalendarPage           = lazy(() => import('./pages/CalendarPage'))
const ProductivityPage       = lazy(() => import('./pages/ProductivityPage'))
const EntornoPage            = lazy(() => import('./pages/EntornoPage'))
const FinanzasPage           = lazy(() => import('./pages/FinanzasPage'))
const SpotifyCallbackPage    = lazy(() => import('./pages/SpotifyCallbackPage'))
const JoinProject            = lazy(() => import('./pages/JoinProject'))
const OnboardingPreviewPage  = lazy(() => import('./pages/OnboardingPreviewPage'))
const UpgradePage            = lazy(() => import('./pages/UpgradePage'))
const BillingSuccessPage     = lazy(() => import('./pages/BillingSuccessPage'))
const WTWApp                 = lazy(() => import('./wtw/WTWApp'))

const isWTW = window.location.host.startsWith('wtw.') ||
              new URLSearchParams(window.location.search).get('wtw') === 'true' ||
              window.location.pathname.startsWith('/wtw')

const PageFallback = () => (
  <div style={{ position: 'fixed', inset: 0, background: 'var(--kairos-bg, #0d0a1c)' }} />
)

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => { if (!isWTW) init() }, [init])

  if (isWTW) {
    return (
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <WTWApp />
        </Suspense>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/callback" element={<SpotifyCallbackPage />} />
        <Route path="/join/:inviteId" element={<JoinProject />} />
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
      </Suspense>
    </BrowserRouter>
  )
}
