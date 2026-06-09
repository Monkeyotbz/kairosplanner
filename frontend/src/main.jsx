import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@tabler/icons-webfont/dist/tabler-icons.min.css' // iconos auto-alojados (sin CDN)
import './styles/globals.css'
import './store/themeStore' // side-effect: aplica el tema guardado antes del primer render
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
