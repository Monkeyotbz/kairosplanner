import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signIn, signUp } from '../services/authService'
import { useThemeStore } from '../store/themeStore'
import StarField from '../components/layout/StarField'
import InfinityLogo from '../components/layout/InfinityLogo'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const theme     = useThemeStore(s => s.theme)
  const loginTheme = theme === 'snow' ? 'nebula' : theme

  const [mode, setMode] = useState(location.state?.mode === 'register' ? 'register' : 'login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/board')
      } else {
        await signUp(email, password)
        setError('Revisa tu correo para confirmar tu cuenta.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className={styles.page} data-theme={loginTheme}>
      <StarField theme={loginTheme} />

      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.card}>
        {/* Marca */}
        <div className={styles.brand}>
          <InfinityLogo size={56} state="idle" />
        </div>

        {/* Cabecera */}
        <h1 className={styles.title}>
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
        </h1>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Ingresa a tu espacio de trabajo'
            : 'Empieza a organizar tu trabajo'}
        </p>

        {/* Formulario */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Correo electrónico</label>
            <input
              className={styles.input}
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Cargando...'
              : mode === 'login' ? 'Ingresar →' : 'Crear cuenta →'}
          </button>
        </form>

        {/* Toggle */}
        <p className={styles.toggle}>
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          {' '}
          <button className={styles.toggleBtn} onClick={switchMode}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>

        {/* Volver al landing */}
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  )
}
