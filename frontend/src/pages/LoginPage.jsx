import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsername(savedUser)
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    if (!username.trim() || !password.trim()) {
      setMessage('Username dan password harus diisi')
      setIsSubmitting(false)
      return
    }

    const result = await login(username, password)
    if (result.success) {
      localStorage.setItem('portalAoptiRememberedUser', username)

      window.dispatchEvent(new Event('spi-auth-changed'))
      const targetPath = result.user.role === ROLES.ADMIN ? '/admin' : '/dashboard'
      navigate(targetPath)
    } else {
      setMessage(result.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="login-page-v2">
      {/* Left Panel - Company Photo Area */}
      <div className="login-photo-panel">
        {/* Decorative Elements */}
        <div className="photo-orb photo-orb-1"></div>
        <div className="photo-orb photo-orb-2"></div>
        <div className="photo-orb photo-orb-3"></div>
        <div className="photo-ribbon photo-ribbon-1"></div>
        <div className="photo-ribbon photo-ribbon-2"></div>
        <div className="photo-grid"></div>

        <div className="photo-overlay"></div>
        <div className="photo-brand-overlay">
          <div className="photo-brand-content">
            <h1>Portal AOPTI</h1>
            <p className="photo-brand-tagline">Sistem Audit Internal</p>
            <p className="photo-brand-desc">
              Platform terpadu untuk mengelola kegiatan audit internal dengan fitur lengkap untuk perencanaan, pelaksanaan, dan pelaporan.
            </p>
          </div>
          <div className="photo-brand-features">
            <div className="photo-feature-item">
              <div className="photo-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span>Keamanan Tinggi</span>
            </div>
            <div className="photo-feature-item">
              <div className="photo-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <span>Dashboard Real-time</span>
            </div>
            <div className="photo-feature-item">
              <div className="photo-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <span>Koordinasi Tim</span>
            </div>
            <div className="photo-feature-item">
              <div className="photo-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <span>Analisis Cerdas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-form-panel">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <div className="form-icon spi-login-logo" aria-label="Logo SPI">
              <img src="/spi-logo.svg" alt="Logo SPI" />
            </div>
            <h2>Masuk ke Portal</h2>
            <p>Gunakan akun resmi AOPTI Anda untuk mengakses sistem</p>
          </div>

          <form className="login-form-v2" onSubmit={handleSubmit}>
            <div className={`form-field ${focusedField === 'username' ? 'focused' : ''}`}>
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Masukkan username"
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className={`form-field ${focusedField === 'password' ? 'focused' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Masukkan password"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {message && (
              <div className="form-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{message}</span>
              </div>
            )}

            <button type="submit" className="login-btn-v2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="btn-spinner"></span>
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="login-divider login-divider-soft">
            <span>Akses Portal SPI</span>
          </div>

          <div className="login-access-showcase">
            <div className="login-access-card primary">
              <span className="access-card-kicker">Terintegrasi</span>
              <strong>Audit workflow dalam satu portal</strong>
              <p>Rencana kegiatan, progres kerja, komunikasi tim, dan laporan tersusun dalam alur yang sama.</p>
            </div>
            <div className="login-access-grid">
              <div className="login-access-chip">
                <span>01</span>
                <p>Rencana Audit</p>
              </div>
              <div className="login-access-chip">
                <span>02</span>
                <p>List Pekerjaan</p>
              </div>
              <div className="login-access-chip">
                <span>03</span>
                <p>Team Chat</p>
              </div>
            </div>
          </div>

          <div className="login-footer-info">
            <div className="security-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Sesi dilindungi enkripsi end-to-end</span>
            </div>
            <p className="copyright-text">&copy; 2026 AOPTI. Hak Cipta Dilindungi.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage