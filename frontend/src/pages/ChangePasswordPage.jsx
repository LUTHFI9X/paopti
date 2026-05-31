import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import spiLogo from '../assets/icons/logo_sketch_clean_vector.svg'

function strengthScore(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}
const STRENGTH_LABELS = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat']

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, changePassword, logout } = useUser()
  const toast = useToast()
  const forced = Boolean(user?.must_change_password)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user, navigate])

  const score = strengthScore(newPassword)
  const checks = {
    length: newPassword.length >= 8,
    letter: /[A-Za-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    different: newPassword !== currentPassword || newPassword === '',
    match: newPassword !== '' && newPassword === confirm,
  }
  const canSubmit = checks.length && checks.letter && checks.number && checks.match && checks.different && (forced || currentPassword !== '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const result = await changePassword({ currentPassword, newPassword, forced })
    setSubmitting(false)
    if (result.success) {
      toast.success('Password berhasil diperbarui. Silakan gunakan password baru pada login berikutnya.', { title: 'Berhasil' })
      navigate('/dashboard', { replace: true })
    } else {
      toast.error(result.error || 'Gagal mengganti password', { title: 'Gagal' })
    }
  }

  return (
    <div className="auth-screen change-password-screen" data-state="open">
      <div className="auth-card animate-scale-in">
        <div className="auth-card__brand">
          <img src={spiLogo} alt="SPI Hub" />
          <div>
            <h1>{forced ? 'Ganti Password Anda' : 'Ganti Password'}</h1>
            <p>{forced ? 'Demi keamanan, atur password baru sebelum melanjutkan.' : 'Perbarui password akun Anda.'}</p>
          </div>
        </div>

        {forced && (
          <div className="alert-banner alert-banner--warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Akun ini menggunakan password sementara. Ganti sekarang untuk melindungi data Anda.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!forced && (
            <label className="auth-field">
              <span>Password Saat Ini</span>
              <div className="auth-input-wrap">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="auth-input-toggle" onClick={() => setShowCurrent((v) => !v)}>
                  {showCurrent ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </label>
          )}

          <label className="auth-field">
            <span>Password Baru</span>
            <div className="auth-input-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button type="button" className="auth-input-toggle" onClick={() => setShowNew((v) => !v)}>
                {showNew ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
            {newPassword && (
              <div className="pw-strength">
                <div className={`pw-strength__bar pw-strength__bar--${score}`}>
                  <span /><span /><span /><span />
                </div>
                <span className="pw-strength__label">{STRENGTH_LABELS[score]}</span>
              </div>
            )}
          </label>

          <label className="auth-field">
            <span>Konfirmasi Password Baru</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <ul className="pw-checklist">
            <li className={checks.length ? 'ok' : ''}>Minimal 8 karakter</li>
            <li className={checks.letter ? 'ok' : ''}>Mengandung huruf</li>
            <li className={checks.number ? 'ok' : ''}>Mengandung angka</li>
            <li className={checks.different ? 'ok' : ''}>Berbeda dengan password lama</li>
            <li className={checks.match ? 'ok' : ''}>Konfirmasi password sesuai</li>
          </ul>

          <div className="auth-actions">
            {forced ? (
              <button
                type="button"
                className="btn-ghost-soft"
                onClick={() => { logout(); navigate('/login', { replace: true }) }}
              >
                Keluar
              </button>
            ) : (
              <button type="button" className="btn-ghost-soft" onClick={() => navigate(-1)}>
                Batal
              </button>
            )}
            <button type="submit" className="btn-primary-solid" disabled={!canSubmit || submitting}>
              {submitting ? 'Menyimpan…' : 'Simpan Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordPage
