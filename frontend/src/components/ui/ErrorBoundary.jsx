import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[KAIROS] Error de render:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    const { error, info } = this.state
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.icon}>⚠️</div>
          <h1 style={styles.title}>Algo se rompió</h1>
          <p style={styles.sub}>
            KAIROS encontró un error inesperado. Puedes recargar para volver.
          </p>

          <pre style={styles.error}>{String(error?.message || error)}</pre>

          {info?.componentStack && (
            <details style={styles.details}>
              <summary style={styles.summary}>Detalles técnicos</summary>
              <pre style={styles.stack}>{info.componentStack}</pre>
            </details>
          )}

          <div style={styles.actions}>
            <button style={styles.reloadBtn} onClick={() => window.location.reload()}>
              ↻ Recargar
            </button>
            <button
              style={styles.homeBtn}
              onClick={() => { window.location.href = '/board' }}
            >
              Ir al tablero
            </button>
          </div>
        </div>
      </div>
    )
  }
}

const styles = {
  wrap: {
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    background: 'radial-gradient(120% 90% at 50% 10%, rgba(83,74,183,0.18), transparent 60%), #0a0716',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    width: 'min(560px, 94vw)', maxHeight: '86vh', overflow: 'auto',
    background: 'rgba(18,14,45,0.72)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20, padding: '32px 28px', textAlign: 'center',
    boxShadow: '0 24px 60px rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)',
  },
  icon: { fontSize: 44, lineHeight: 1 },
  title: { margin: '14px 0 6px', fontSize: 24, fontWeight: 700, color: '#f5f3ff' },
  sub: { margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(207,203,246,0.75)' },
  error: {
    margin: '18px 0 0', padding: '12px 14px', textAlign: 'left',
    background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 10, color: '#fca5a5', fontSize: 13, lineHeight: 1.5,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  details: { marginTop: 12, textAlign: 'left' },
  summary: { cursor: 'pointer', fontSize: 12.5, color: 'rgba(207,203,246,0.6)' },
  stack: {
    marginTop: 8, padding: 12, maxHeight: 220, overflow: 'auto',
    background: 'rgba(0,0,0,0.3)', borderRadius: 8,
    color: 'rgba(207,203,246,0.7)', fontSize: 11.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22 },
  reloadBtn: {
    padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, color: '#fff',
    background: 'linear-gradient(135deg, #534AB7, #378ADD)',
  },
  homeBtn: {
    padding: '11px 22px', borderRadius: 12, cursor: 'pointer',
    fontSize: 14, fontWeight: 600, color: '#f0eeff',
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
  },
}
