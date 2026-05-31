import { useState } from 'react'
import { Link } from 'react-router-dom'

const STEPS = [
  {
    num: '01',
    title: 'Login ke Sistem',
    body: 'Masukkan username dan password yang diberikan admin. Jika ini login pertama, Anda akan diminta mengganti password sebelum melanjutkan.',
    color: 'blue',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Navigasi Cepat',
    body: 'Gunakan sidebar kiri untuk berpindah modul: Dashboard, List Pekerjaan, Rencana Kegiatan, dan Team Chat. Tombol panah memperluas/menciutkan sidebar.',
    color: 'indigo',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Kelola Pekerjaan',
    body: 'Di List Pekerjaan, pilih tahun & program, lalu tambah tugas. Geser progress untuk memperbarui status. Tugas otomatis sinkron ke Rencana Kegiatan.',
    color: 'violet',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="2"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Koordinasi via Chat',
    body: 'Diskusi tim langsung tanpa keluar aplikasi. Pesan baru dari anggota tim ditampilkan sebagai notifikasi di sidebar.',
    color: 'emerald',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Ganti Password',
    body: 'Buka menu akun di sidebar, pilih "Ganti Password". Password baru minimal 8 karakter, mengandung huruf dan angka.',
    color: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    num: '06',
    title: 'Panel Admin',
    body: 'Admin dapat menambah akun, mereset password, memantau log aktivitas sistem, serta membuat backup data secara berkala.',
    color: 'rose',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M19.5 10.5 21 12l-1.5 1.5"/>
      </svg>
    ),
  },
]

const FAQ = [
  { q: 'Saya lupa password, bagaimana?', a: 'Hubungi admin untuk mereset password. Setelah direset, Anda akan diminta membuat password baru saat login berikutnya.' },
  { q: 'Notifikasi tidak muncul?', a: 'Notifikasi sidebar hanya muncul saat ada pesan chat baru dari anggota tim. Coba refresh halaman dengan Ctrl+R / Cmd+R.' },
  { q: 'Tampilan rusak di HP?', a: 'Sistem mendukung tampilan mobile. Buka melalui browser modern (Chrome, Safari, Edge versi terbaru).' },
  { q: 'Kenapa tugas tidak bisa dihapus?', a: 'Hanya admin dan auditor pemilik yang dapat menghapus tugas. KSPI memiliki akses lihat saja.' },
  { q: 'Apakah data saya aman?', a: 'Semua password dienkripsi (bcrypt). Sesi login berakhir otomatis setelah 24 jam dan setiap login pertama dipaksa mengganti password.' },
]

function HelpPage() {
  const [openFaq, setOpenFaq] = useState(0)
  return (
    <div className="help-page animate-fade-in">
      <header className="help-hero">
        <div>
          <h1>Panduan Penggunaan SPI Hub</h1>
          <p>Panduan langkah demi langkah untuk membantu Anda memaksimalkan penggunaan portal audit internal.</p>
        </div>
        <Link to="/dashboard" className="btn-ghost-soft help-back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Kembali ke Dashboard
        </Link>
      </header>

      <section className="help-steps">
        {STEPS.map((s, i) => (
          <article key={i} className={`help-step animate-slide-up help-step--${s.color}`} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="help-step__num">{s.num}</div>
            <div className="help-step__icon-wrap">
              {s.icon}
            </div>
            <div className="help-step__body">
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="help-faq">
        <h2>Pertanyaan yang Sering Ditanyakan</h2>
        <div className="faq-list">
          {FAQ.map((item, i) => {
            const open = openFaq === i
            return (
              <div key={i} className={`faq-item ${open ? 'is-open' : ''}`}>
                <button type="button" className="faq-trigger" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}>
                  <span>{item.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="faq-chevron">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="faq-body" role="region">
                  <p>{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="help-tips">
        <h2>Tips Singkat</h2>
        <ul>
          <li>Aktifkan tema gelap dari menu akun di sidebar untuk kenyamanan mata di malam hari.</li>
          <li>Backup data secara berkala bila Anda admin — file akan diunduh dalam format JSON.</li>
          <li>Gunakan panduan ini kapan saja lewat ikon tanda tanya di sudut kanan bawah.</li>
        </ul>
      </section>
    </div>
  )
}

export default HelpPage

