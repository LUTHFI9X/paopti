import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, ROLE_LABELS } from '../context/UserContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login, user: currentUser, ROLES } = useUser()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  useEffect(() => {
    if (currentUser) {
      const targetPath = currentUser.role === ROLES.ADMIN ? '/admin' : '/dashboard'
      navigate(targetPath, { replace: true })
    }
  }, [currentUser, navigate, ROLES])

  useEffect(() => {
    const savedUser = localStorage.getItem('portalAoptiRememberedUser')
    if (savedUser) {
      setUsername(savedUser)
    }
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    if (!username.trim() || !password.trim()) {
      setMessage('Username dan password harus diisi')
      setIsSubmitting(false)
      return
    }

    const result = login(username, password)
    if (result.success) {
      localStorage.setItem('portalAoptiRememberedUser', username)
      localStorage.setItem('spiHubToken', 'logged-in')
      localStorage.setItem('spiHubUserName', result.user.name)

      // Log login activity
      const savedLogs = localStorage.getItem('portalAoptiActivityLogs')
      const activityLogs = savedLogs ? JSON.parse(savedLogs) : []
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user: result.user.name,
        userId: result.user.id,
        userRole: result.user.role,
        action: 'Login',
        details: `User ${result.user.name} (${ROLE_LABELS[result.user.role]}) berhasil masuk ke sistem`,
        ipAddress: '127.0.0.1',
      }
      const updatedLogs = [newLog, ...activityLogs].slice(0, 100)
      localStorage.setItem('portalAoptiActivityLogs', JSON.stringify(updatedLogs))

      window.dispatchEvent(new Event('spi-auth-changed'))
      const targetPath = result.user.role === ROLES.ADMIN ? '/admin' : '/dashboard'
      navigate(targetPath)
    } else {
      setMessage(result.error)
    }
    setIsSubmitting(false)
  }

  const demoCredentials = [
    { role: ROLE_LABELS[ROLES.ADMIN], username: 'admin', password: 'admin123' },
    { role: ROLE_LABELS[ROLES.AUDITOR], username: 'auditor', password: 'auditor123' },
    { role: ROLE_LABELS[ROLES.KSPI], username: 'kspi', password: 'kspi123' },
  ]

  return (
    <div className="login-page">
      <div className="login-bg-orb orb-1"></div>
      <div className="login-bg-orb orb-2"></div>
      <div className="login-bg-ribbon ribbon-1"></div>
      <div className="login-bg-ribbon ribbon-2"></div>
      <div className="login-bg-grid"></div>
      <div className="login-container">
        <div className="login-left">
          <div className="login-branding">
            <div className="brand-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="url(#logoGrad)"/>
                <path d="M14 34V18L24 14L34 18V34L24 38L14 34Z" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M14 18L24 22L34 18" stroke="white" strokeWidth="2"/>
                <path d="M24 22V38" stroke="white" strokeWidth="2"/>
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1a5cbe"/>
                    <stop offset="1" stopColor="#0c3d86"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1>Portal AOPTI</h1>
            <p className="brand-tagline">Internal Audit System</p>
          </div>

          <div className="login-insight-card">
            <div className="insight-head">
              <span className="insight-dot"></span>
              <span>Modul Utama Portal AOPTI</span>
            </div>
            <div className="insight-grid">
              <div className="insight-item">
                <strong>Dashboard</strong>
                <span>Pantau ringkasan</span>
              </div>
              <div className="insight-item">
                <strong>Audit Plan</strong>
                <span>Atur kalender audit</span>
              </div>
              <div className="insight-item">
                <strong>Fieldwork</strong>
                <span>Kelola kegiatan lapangan</span>
              </div>
              <div className="insight-item">
                <strong>Analytics</strong>
                <span>Analisis tren audit</span>
              </div>
              <div className="insight-item">
                <strong>Team Chat</strong>
                <span>Koordinasi tim cepat</span>
              </div>
              <div className="insight-item">
                <strong>User Management</strong>
                <span>Kelola akses pengguna</span>
              </div>
            </div>
          </div>

          <div className="login-demo-card">
            <h4>Akun Demo</h4>
            <p>Klik untuk mengisi otomatis:</p>
            <div className="demo-accounts">
              {demoCredentials.map((cred) => (
                <button
                  key={cred.username}
                  type="button"
                  className="demo-account-btn"
                  onClick={() => {
                    setUsername(cred.username)
                    setPassword(cred.password)
                  }}
                >
                  <span className="demo-role">{cred.role}</span>
                  <span className="demo-creds">{cred.username} / {cred.password}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="login-features">
            <div className="feature-item">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <h3>Keamanan Tinggi</h3>
                <p>Enkripsi data dengan standar keamanan terbaik</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                </svg>
              </div>
              <div>
                <h3>Dashboard Interaktif</h3>
                <p>Pantau aktivitas audit secara real-time</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h3>Analisis Data Cerdas</h3>
                <p>Wawasan berbasis data untuk keputusan strategis</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-container">
            <div className="form-header">
              <span className="login-kicker">Portal Internal Audit</span>
              <h2>Selamat Datang</h2>
              <p>Masuk ke akun Portal AOPTI Anda</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className={`input-group ${focusedField === 'username' ? 'focused' : ''} ${username ? 'has-value' : ''}`}>
                <label htmlFor="username">
                  <span className="label-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  Username / ID Pengguna
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Masukkan username Anda"
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>

              <div className={`input-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
                <label htmlFor="password">
                  <span className="label-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  Kata Sandi
                </label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Masukkan kata sandi"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
              </div>

              {message && (
                <div className="error-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {message}
                </div>
              )}

              <button type="submit" className="login-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>

              <div className="login-security-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Sesi login dilindungi enkripsi dan audit trail internal.</span>
              </div>
            </form>

            <div className="login-trust-row">
              <span className="trust-chip">Akses Terenkripsi</span>
              <span className="trust-chip">Monitoring Aktivitas</span>
              <span className="trust-chip">SSO Ready</span>
            </div>

            <div className="login-mini-illustration">
              <div className="mini-illustration-icon">AI</div>
              <div>
                <strong>Audit Intelligence</strong>
                <p>Login cepat untuk akses dashboard, agenda, dan pengingat audit terpadu.</p>
              </div>
            </div>

            <div className="login-footer">
              <p>Butuh bantuan? <a href="#">Hubungi administrator</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
