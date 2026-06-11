import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore, THEMES } from '../store/themeStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { signOut, changePassword, sendPasswordReset } from '../services/authService'
import { updateProfileName, uploadAvatar, updateAvatarUrl } from '../services/profileService'
import styles from './EntornoPage.module.css'

export default function EntornoPage() {
  const navigate = useNavigate()
  const { user, profile, setProfile, clearUser } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const openOnboarding = useOnboardingStore(s => s.open)
  const { info: subInfo } = useSubscriptionStore()
  const fileInputRef = useRef(null)
  const avatarMenuRef = useRef(null)

  // ── Nombre ──
  const [nombre,       setNombre]       = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [profileError, setProfileError] = useState('')

  // ── Avatar ──
  const [showAvatarMenu,  setShowAvatarMenu]  = useState(false)
  const [avatarMode,      setAvatarMode]      = useState(null)   // null | 'url'
  const [avatarUrl,       setAvatarUrl]       = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError,     setAvatarError]     = useState('')

  // ── Contraseña ──
  const [newPwd,    setNewPwd]    = useState('')
  const [confirmPwd,setConfirmPwd]= useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSaved,  setPwdSaved]  = useState(false)
  const [pwdError,  setPwdError]  = useState('')

  // ── Recuperar contraseña ──
  const [resetSending, setResetSending] = useState(false)
  const [resetSent,    setResetSent]    = useState(false)
  const [resetError,   setResetError]   = useState('')

  useEffect(() => {
    if (profile?.nombre) setNombre(profile.nombre)
    else if (user?.email) setNombre(user.email.split('@')[0])
  }, [profile, user])

  // Cerrar menú de avatar al hacer click afuera
  useEffect(() => {
    function onClickOut(e) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setShowAvatarMenu(false)
        setAvatarMode(null)
        setAvatarError('')
      }
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  const displayName = profile?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const email       = profile?.email  || user?.email || ''
  const initials    = displayName.slice(0, 2).toUpperCase()
  const avatarSrc   = profile?.avatar_url || null

  // ── Handlers: nombre ──
  async function handleSaveName(e) {
    e.preventDefault()
    if (!nombre.trim() || nombre.trim() === profile?.nombre) return
    setSaving(true); setProfileError('')
    try {
      const updated = await updateProfileName(nombre.trim())
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) { setProfileError(err.message) }
    finally { setSaving(false) }
  }

  // ── Handlers: avatar ──
  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarError('Solo se permiten imágenes'); return }
    if (file.size > 2 * 1024 * 1024)    { setAvatarError('La imagen debe ser menor a 2 MB'); return }
    setUploadingAvatar(true); setAvatarError('')
    try {
      const updated = await uploadAvatar(user.id, file)
      setProfile(updated)
      setShowAvatarMenu(false)
    } catch (err) { setAvatarError(err.message || 'Error al subir la imagen') }
    finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveAvatarUrl() {
    if (!avatarUrl.trim()) return
    setUploadingAvatar(true); setAvatarError('')
    try {
      const updated = await updateAvatarUrl(user.id, avatarUrl.trim())
      setProfile(updated)
      setAvatarUrl(''); setAvatarMode(null); setShowAvatarMenu(false)
    } catch (err) { setAvatarError(err.message) }
    finally { setUploadingAvatar(false) }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true); setAvatarError('')
    try {
      const updated = await updateAvatarUrl(user.id, null)
      setProfile(updated); setShowAvatarMenu(false)
    } catch (err) { setAvatarError(err.message) }
    finally { setUploadingAvatar(false) }
  }

  // ── Handlers: contraseña ──
  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPwd.length < 6)      { setPwdError('Mínimo 6 caracteres'); return }
    if (newPwd !== confirmPwd)  { setPwdError('Las contraseñas no coinciden'); return }
    setPwdSaving(true); setPwdError('')
    try {
      await changePassword(newPwd)
      setNewPwd(''); setConfirmPwd('')
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 3000)
    } catch (err) { setPwdError(err.message) }
    finally { setPwdSaving(false) }
  }

  async function handlePasswordReset() {
    if (!email) return
    setResetSending(true); setResetError('')
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err) { setResetError(err.message) }
    finally { setResetSending(false) }
  }

  async function handleLogout() {
    await signOut(); clearUser(); navigate('/login')
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Perfil y configuración</h1>

        {/* ── Mi perfil ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Mi perfil</p>
          <div className={styles.card}>

            <div className={styles.profileHeader}>
              {/* Avatar interactivo */}
              <div className={styles.avatarWrap} ref={avatarMenuRef}>
                <button
                  className={styles.avatarLgBtn}
                  onClick={() => { setShowAvatarMenu(v => !v); setAvatarMode(null); setAvatarError('') }}
                  disabled={uploadingAvatar}
                  title="Cambiar foto de perfil"
                >
                  {avatarSrc
                    ? <img src={avatarSrc} alt={displayName} className={styles.avatarImg} />
                    : <span className={styles.avatarInitials}>{initials}</span>
                  }
                  <div className={styles.avatarOverlay}>
                    {uploadingAvatar
                      ? <span className={styles.avatarSpinner} />
                      : <i className="ti ti-camera" />
                    }
                  </div>
                </button>

                {showAvatarMenu && (
                  <div className={styles.avatarMenu}>
                    <button className={styles.avatarMenuItem} onClick={() => fileInputRef.current?.click()}>
                      <i className="ti ti-upload" /> Subir imagen
                    </button>
                    <button
                      className={`${styles.avatarMenuItem} ${avatarMode === 'url' ? styles.avatarMenuItemActive : ''}`}
                      onClick={() => setAvatarMode(avatarMode === 'url' ? null : 'url')}
                    >
                      <i className="ti ti-link" /> Usar URL
                    </button>
                    {avatarSrc && (
                      <button className={`${styles.avatarMenuItem} ${styles.avatarMenuItemDanger}`} onClick={handleRemoveAvatar}>
                        <i className="ti ti-trash" /> Quitar foto
                      </button>
                    )}
                    {avatarMode === 'url' && (
                      <div className={styles.avatarUrlRow}>
                        <input
                          className={styles.avatarUrlInput}
                          value={avatarUrl}
                          onChange={e => setAvatarUrl(e.target.value)}
                          placeholder="https://ejemplo.com/foto.jpg"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter')  handleSaveAvatarUrl()
                            if (e.key === 'Escape') setAvatarMode(null)
                          }}
                        />
                        <button
                          className={styles.avatarUrlSave}
                          onClick={handleSaveAvatarUrl}
                          disabled={!avatarUrl.trim() || uploadingAvatar}
                        >
                          OK
                        </button>
                      </div>
                    )}
                    {avatarError && <p className={styles.avatarError}>{avatarError}</p>}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenFileInput}
                  onChange={handleFileUpload}
                />
              </div>

              <div className={styles.profileMeta}>
                <p className={styles.profileName}>{displayName}</p>
                <p className={styles.profileEmail}>{email}</p>
              </div>
            </div>

            <div className={styles.divider} />

            <form className={styles.form} onSubmit={handleSaveName}>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Nombre visible</label>
                  <input
                    className={styles.input}
                    value={nombre}
                    onChange={e => { setNombre(e.target.value); setSaved(false) }}
                    placeholder="Tu nombre"
                    maxLength={60}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Correo electrónico</label>
                  <input
                    className={`${styles.input} ${styles.inputDisabled}`}
                    value={email}
                    disabled
                  />
                </div>
              </div>
              {profileError && <p className={styles.formError}>{profileError}</p>}
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={saving || !nombre.trim() || nombre.trim() === profile?.nombre}
                >
                  {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Apariencia ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Apariencia</p>
          <div className={styles.card}>
            <div className={styles.themeGrid}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.themeSwatch} ${theme === t.id ? styles.themeSwatchActive : ''}`}
                  onClick={() => setTheme(t.id)}
                  title={t.name}
                >
                  <div className={styles.themePreview} style={{ background: t.bg }}>
                    <div className={styles.themePreviewSidebar} style={{ background: t.sidebar }} />
                    <div className={styles.themePreviewAccent}  style={{ background: t.accent }} />
                    {theme === t.id && <div className={styles.themeCheck}><i className="ti ti-check" /></div>}
                  </div>
                  <span className={styles.themeSwatchName}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Seguridad ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Seguridad</p>
          <div className={styles.card}>

            {/* Cambiar contraseña */}
            <div className={styles.secBlock}>
              <div className={styles.secBlockHead}>
                <div className={styles.secBlockIcon}><i className="ti ti-lock" /></div>
                <div>
                  <p className={styles.secBlockTitle}>Cambiar contraseña</p>
                  <p className={styles.secBlockSub}>Elige una contraseña segura de al menos 6 caracteres.</p>
                </div>
              </div>
              <form className={styles.pwdForm} onSubmit={handleChangePassword}>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Nueva contraseña</label>
                    <input
                      className={styles.input}
                      type="password"
                      value={newPwd}
                      onChange={e => { setNewPwd(e.target.value); setPwdSaved(false); setPwdError('') }}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Confirmar contraseña</label>
                    <input
                      className={styles.input}
                      type="password"
                      value={confirmPwd}
                      onChange={e => { setConfirmPwd(e.target.value); setPwdSaved(false); setPwdError('') }}
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                {pwdError && <p className={styles.formError}>{pwdError}</p>}
                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={pwdSaving || !newPwd || !confirmPwd}
                  >
                    {pwdSaving ? 'Guardando…' : pwdSaved ? '✓ Contraseña actualizada' : 'Actualizar contraseña'}
                  </button>
                </div>
              </form>
            </div>

            <div className={styles.divider} />

            {/* Recuperar contraseña */}
            <div className={styles.secBlock}>
              <div className={styles.secBlockHead}>
                <div className={styles.secBlockIcon}><i className="ti ti-mail" /></div>
                <div>
                  <p className={styles.secBlockTitle}>Recuperar contraseña</p>
                  <p className={styles.secBlockSub}>
                    Enviaremos un enlace de recuperación a <strong className={styles.emailStrong}>{email}</strong>.
                  </p>
                </div>
              </div>
              {resetSent
                ? <p className={styles.resetSent}><i className="ti ti-circle-check" /> Email enviado — revisa tu bandeja de entrada.</p>
                : (
                  <>
                    {resetError && <p className={styles.formError}>{resetError}</p>}
                    <button className={styles.resetBtn} onClick={handlePasswordReset} disabled={resetSending}>
                      {resetSending ? 'Enviando…' : <><i className="ti ti-send" /> Enviar email de recuperación</>}
                    </button>
                  </>
                )
              }
            </div>
          </div>
        </section>

        {/* ── Ayuda ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Ayuda</p>
          <div className={styles.card}>
            <div className={styles.accountRow}>
              <div>
                <p className={styles.accountRowTitle}>Recorrido de bienvenida</p>
                <p className={styles.accountRowSub}>Vuelve a ver la introducción a KAIROS.</p>
              </div>
              <button className={styles.resetBtn} onClick={openOnboarding}>
                <i className="ti ti-route" /> Ver recorrido
              </button>
            </div>
          </div>
        </section>

        {/* ── Suscripción ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Suscripción</p>
          <div className={styles.card}>
            <div className={styles.accountRow}>
              <div className={styles.subInfo}>
                {subInfo?.status === 'active' && (
                  <>
                    <p className={styles.accountRowTitle}>
                      <span className={styles.subBadgeActive}>● KAIROS Pro</span>
                    </p>
                    <p className={styles.accountRowSub}>Suscripción activa — gracias por apoyar el proyecto.</p>
                  </>
                )}
                {subInfo?.status === 'trialing' && (
                  <>
                    <p className={styles.accountRowTitle}>
                      <span className={styles.subBadgeTrial}>◌ Prueba gratuita</span>
                    </p>
                    <p className={styles.accountRowSub}>
                      {subInfo.trialDaysLeft > 0
                        ? `Te quedan ${subInfo.trialDaysLeft} día${subInfo.trialDaysLeft !== 1 ? 's' : ''} de prueba.`
                        : 'Tu prueba termina hoy.'}
                    </p>
                  </>
                )}
                {(subInfo?.status === 'expired' || subInfo?.status === 'canceled' || subInfo?.status === 'past_due') && (
                  <>
                    <p className={styles.accountRowTitle}>
                      <span className={styles.subBadgeExpired}>✕ Sin acceso activo</span>
                    </p>
                    <p className={styles.accountRowSub}>Activa tu plan para seguir usando KAIROS.</p>
                  </>
                )}
                {!subInfo && (
                  <>
                    <p className={styles.accountRowTitle}>Plan</p>
                    <p className={styles.accountRowSub}>Cargando información…</p>
                  </>
                )}
              </div>
              <Link to="/upgrade" className={styles.resetBtn} style={{ textDecoration: 'none' }}>
                <i className="ti ti-crown" />
                {subInfo?.status === 'active' ? 'Gestionar' : 'Ver plan'}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Cuenta ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Cuenta</p>
          <div className={styles.card}>
            <div className={styles.accountRow}>
              <div>
                <p className={styles.accountRowTitle}>Sesión activa</p>
                <p className={styles.accountRowSub}>{email}</p>
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <i className="ti ti-logout" /> Cerrar sesión
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
