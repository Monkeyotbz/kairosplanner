import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWTWStore } from '../store/wtwStore'
import styles from './WTWAuthCallback.module.css'

export default function WTWAuthCallback() {
  const navigate   = useNavigate()
  const setToken   = useWTWStore(s => s.setToken)
  const calledRef  = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const error  = params.get('error')

    if (error || !code) {
      navigate('/wtw/login?error=auth_failed')
      return
    }

    fetch('/api/wtw-auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, redirect_uri: `${window.location.origin}/wtw/auth/callback` }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setToken(data)
        navigate('/wtw/dashboard')
      })
      .catch(() => navigate('/wtw/login?error=token_exchange'))
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.spinner} />
      <p className={styles.text}>Conectando con Microsoft…</p>
    </div>
  )
}
