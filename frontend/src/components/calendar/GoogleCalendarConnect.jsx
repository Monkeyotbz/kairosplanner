import { useEffect, useState, useCallback } from 'react'
import { getConnectionStatus, startConnect, syncNow, disconnect } from '../../services/googleCalendarService'
import styles from './GoogleCalendarConnect.module.css'
import { IconBrandGoogle, IconRefresh, IconAlertTriangle } from '@tabler/icons-react'

function timeAgo(dateStr) {
  if (!dateStr) return 'nunca'
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return 'hace un momento'
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

// Conexión de Google Calendar → Kairos, por proyecto. Solo un admin
// del proyecto puede conectar/desconectar/forzar sync (gateado acá
// en la UI y de nuevo en el backend vía requireProjectAdmin).
export default function GoogleCalendarConnect({ proyectoId, isAdmin }) {
  const [conexion, setConexion] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  const load = useCallback(() => {
    if (!proyectoId) return
    setLoading(true)
    getConnectionStatus(proyectoId)
      .then(r => setConexion(r.conexion))
      .catch(() => setError('No se pudo consultar el estado de la conexión'))
      .finally(() => setLoading(false))
  }, [proyectoId])

  useEffect(() => { load() }, [load])

  async function handleConnect() {
    setError('')
    try { await startConnect(proyectoId) } catch { setError('No se pudo iniciar la conexión con Google') }
  }

  async function handleSyncNow() {
    setBusy(true); setError('')
    try { await syncNow(proyectoId); await load() }
    catch { setError('No se pudo sincronizar ahora mismo') }
    finally { setBusy(false) }
  }

  async function handleDisconnect() {
    if (!window.confirm('¿Desconectar Google Calendar de este proyecto?')) return
    setBusy(true); setError('')
    try { await disconnect(proyectoId); setConexion(null) }
    catch { setError('No se pudo desconectar') }
    finally { setBusy(false) }
  }

  if (loading) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <IconBrandGoogle size="1em" />
        <span>Google Calendar</span>
      </div>

      {!conexion ? (
        isAdmin ? (
          <button className={styles.connectBtn} onClick={handleConnect}>Conectar</button>
        ) : (
          <p className={styles.hint}>Solo un administrador del proyecto puede conectar Google Calendar.</p>
        )
      ) : conexion.estado === 'revocado' ? (
        <div className={styles.alert}>
          <IconAlertTriangle size="1em" />
          <span>Se perdió el acceso a Google Calendar.</span>
          {isAdmin && <button className={styles.connectBtn} onClick={handleConnect}>Reconectar</button>}
        </div>
      ) : (
        <div className={styles.connected}>
          <p className={styles.email}>{conexion.google_account_email}</p>
          <p className={styles.sync}>Última sincronización: {timeAgo(conexion.ultima_sync_at)}</p>
          {isAdmin && (
            <div className={styles.actions}>
              <button className={styles.actionBtn} onClick={handleSyncNow} disabled={busy}>
                <IconRefresh size="1em" /> Sincronizar ahora
              </button>
              <button className={styles.disconnectBtn} onClick={handleDisconnect} disabled={busy}>Desconectar</button>
            </div>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
