import { useEffect, useMemo, useState } from 'react'
import { ROLES, useUser } from '../../context/UserContext'

const STEPS = [
  {
    title: 'Selamat datang di SPI Hub',
    body: 'Portal terpadu untuk Satuan Pengawasan Internal. Mari kenali fitur-fitur utamanya dalam beberapa langkah singkat.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    color: 'blue',
  },
  {
    title: 'Sidebar Navigasi',
    body: 'Semua modul dapat diakses dari sidebar kiri. Klik tombol panah untuk menciutkan agar layar lebih lega.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    color: 'indigo',
  },
  {
    title: 'Kelola Pekerjaan',
    body: 'Tambah program, buat tugas, atur tim, dan pantau progress dalam satu tempat. Status diperbarui secara realtime.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="2"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    color: 'emerald',
  },
  {
    title: 'Keamanan Akun',
    body: 'Saat login pertama, sistem akan meminta Anda mengganti password sementara dari admin. Gunakan password yang kuat.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    color: 'amber',
  },
  {
    title: 'Butuh bantuan?',
    body: 'Buka halaman "Panduan" kapan saja lewat ikon tanda tanya di sudut kanan bawah untuk panduan lengkap.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    color: 'violet',
  },
]

const STORAGE_KEY = 'spiHubTourSeen'

const ROLE_STEPS = {
  [ROLES.ADMIN]: {
    title: 'Kontrol sistem untuk Admin',
    body: 'Pantau user, role akses, log aktivitas, dan backup dari Admin Panel. Area ini menjadi pusat tata kelola aplikasi.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    color: 'rose',
  },
  [ROLES.AUDITOR]: {
    title: 'Ruang kerja Auditor',
    body: 'Mulai dari List Pekerjaan, lanjutkan ke Rencana Kegiatan, lalu dokumentasikan pelaksanaan di Fieldwork.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
    color: 'emerald',
  },
  [ROLES.KSPI]: {
    title: 'Mode monitoring KSPI',
    body: 'Akses Anda fokus untuk memantau program kerja, jadwal audit, analytics, dan laporan tanpa mengubah data operasional.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    color: 'indigo',
  },
}

function WelcomeTour() {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  const steps = useMemo(() => {
    const roleStep = ROLE_STEPS[user?.role]
    return roleStep ? [STEPS[0], roleStep, ...STEPS.slice(1)] : STEPS
  }, [user?.role])

  const storageKey = `${STORAGE_KEY}:${user?.role || 'guest'}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(storageKey) === 'true'
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 700)
      return () => clearTimeout(t)
    }
  }, [storageKey])

  const close = (markSeen = true) => {
    if (markSeen) localStorage.setItem(storageKey, 'true')
    setOpen(false)
  }

  if (!open) return null
  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" data-state="open">
      <div className="tour-card animate-scale-in">
        <button type="button" className="tour-close" onClick={() => close(true)} aria-label="Tutup panduan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className={`tour-icon tour-icon--${current.color}`}>{current.icon}</div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="tour-dots">
          {steps.map((_, i) => (
            <span key={i} className={`tour-dot ${i === step ? 'is-active' : ''}`} />
          ))}
        </div>
        <div className="tour-actions">
          <button type="button" className="btn-ghost-soft" onClick={() => close(true)}>Lewati</button>
          <div className="tour-actions__right">
            {step > 0 && (
              <button type="button" className="btn-ghost-soft" onClick={() => setStep((s) => s - 1)}>Kembali</button>
            )}
            <button
              type="button"
              className="btn-primary-solid"
              onClick={() => (isLast ? close(true) : setStep((s) => s + 1))}
            >
              {isLast ? 'Selesai' : 'Lanjut'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeTour
