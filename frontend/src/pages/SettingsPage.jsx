import { useState, useEffect } from 'react'
import { useAppearance } from '../context/AppearanceContext'

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const { settings: appearanceSettings, updateSetting: updateAppearance } = useAppearance()
  const [settings, setSettings] = useState({
    appName: localStorage.getItem('appName') || 'Portal AOPTI',
    organizationName: localStorage.getItem('organizationName') || 'Badan Supervisi Pemilihan Indonesia',
    organizationAddress: localStorage.getItem('organizationAddress') || 'Jl. Gatot Subroto No. 6, Jakarta Selatan',
    organizationPhone: localStorage.getItem('organizationPhone') || '021-1234567',
    organizationEmail: localStorage.getItem('organizationEmail') || 'info@aopti.go.id',
    sessionTimeout: parseInt(localStorage.getItem('sessionTimeout') || '30'),
    passwordMinLength: parseInt(localStorage.getItem('passwordMinLength') || '8'),
    maxLoginAttempts: parseInt(localStorage.getItem('maxLoginAttempts') || '5'),
    lockoutDuration: parseInt(localStorage.getItem('lockoutDuration') || '15'),
    passwordExpiry: parseInt(localStorage.getItem('passwordExpiry') || '90'),
    requireSpecialChar: localStorage.getItem('requireSpecialChar') === 'true',
    requireNumber: localStorage.getItem('requireNumber') === 'true',
    preventPasswordReuse: localStorage.getItem('preventPasswordReuse') === 'true',
    passwordHistory: parseInt(localStorage.getItem('passwordHistory') || '3'),
    sessionRemember: localStorage.getItem('sessionRemember') === 'true',
    concurrentSession: localStorage.getItem('concurrentSession') === 'true',
    notificationEmail: localStorage.getItem('notificationEmail') === 'true',
    notificationLogin: localStorage.getItem('notificationLogin') === 'true',
    reminderDeadline: localStorage.getItem('reminderDeadline') === 'true',
    defaultExportFormat: localStorage.getItem('defaultExportFormat') || 'pdf',
    timezone: localStorage.getItem('timezone') || 'Asia/Jakarta',
    dateFormat: localStorage.getItem('dateFormat') || 'DD/MM/YYYY',
  })
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = (category) => {
    Object.keys(settings).forEach((key) => {
      localStorage.setItem(key, settings[key])
    })
    setSaveStatus(category)
    setTimeout(() => setSaveStatus(''), 3000)
  }

  const tabs = [
    { id: 'general', label: 'Umum', icon: 'settings' },
    { id: 'appearance', label: 'Tampilan', icon: 'palette' },
    { id: 'security', label: 'Keamanan', icon: 'shield' },
    { id: 'notifications', label: 'Notifikasi', icon: 'bell' },
    { id: 'regional', label: 'Wilayah & Format', icon: 'globe' },
    { id: 'about', label: 'Tentang Sistem', icon: 'info' },
  ]

  const tabIcons = {
    settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    palette: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>,
    shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    globe: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  }

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Informasi Aplikasi
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Nama Aplikasi</label>
            <p>Nama yang ditampilkan di header dan tab browser</p>
          </div>
          <input
            type="text"
            value={settings.appName}
            onChange={(e) => handleInputChange('appName', e.target.value)}
            className="settings-input"
          />
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>
          Informasi Organisasi
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Nama Organisasi</label>
            <p>Nama resmi organisasi Anda</p>
          </div>
          <input
            type="text"
            value={settings.organizationName}
            onChange={(e) => handleInputChange('organizationName', e.target.value)}
            className="settings-input"
          />
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Alamat</label>
            <p>Alamat kantor pusat organisasi</p>
          </div>
          <input
            type="text"
            value={settings.organizationAddress}
            onChange={(e) => handleInputChange('organizationAddress', e.target.value)}
            className="settings-input"
          />
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Telepon</label>
            <p>Nomor telepon kontak</p>
          </div>
          <input
            type="text"
            value={settings.organizationPhone}
            onChange={(e) => handleInputChange('organizationPhone', e.target.value)}
            className="settings-input"
          />
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Email</label>
            <p>Alamat email resmi</p>
          </div>
          <input
            type="email"
            value={settings.organizationEmail}
            onChange={(e) => handleInputChange('organizationEmail', e.target.value)}
            className="settings-input"
          />
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Pengaturan Sesi
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Timeout Sesi (menit)</label>
            <p>Waktu tidak aktif sebelum sesi berakhir</p>
          </div>
          <select
            value={settings.sessionTimeout}
            onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
            className="settings-input"
          >
            <option value={15}>15 menit</option>
            <option value={30}>30 menit</option>
            <option value={60}>1 jam</option>
            <option value={120}>2 jam</option>
            <option value={240}>4 jam</option>
          </select>
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className={`submit-btn ${saveStatus === 'general' ? 'saved' : ''}`}
          onClick={() => handleSave('general')}
        >
          {saveStatus === 'general' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Tersimpan!
            </>
          ) : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  )

  const renderAppearanceSettings = () => (
    <div className="settings-section">
      {/* Tema Aplikasi */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          Tema Aplikasi
        </h4>
        <div className="settings-item theme-toggle">
          <div className="settings-item-info">
            <label>Mode Tampilan</label>
            <p>Pilih tema terang atau gelap untuk kenyamanan Anda</p>
          </div>
          <div className="theme-selector">
            <button
              type="button"
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <span>Terang</span>
            </button>
            <button
              type="button"
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <span>Gelap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warna Aksen */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>
          Warna Aksen
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Pilih Warna Utama</label>
            <p>Warna aksen yang digunakan di seluruh aplikasi</p>
          </div>
          <div className="accent-color-selector">
            <button
              type="button"
              className={`accent-option ${appearanceSettings.accentColor === '#1f4f96' ? 'active' : ''}`}
              style={{ background: '#1f4f96' }}
              onClick={() => updateAppearance('accentColor', '#1f4f96')}
              title="Biru"
            />
            <button
              type="button"
              className={`accent-option ${appearanceSettings.accentColor === '#059669' ? 'active' : ''}`}
              style={{ background: '#059669' }}
              onClick={() => updateAppearance('accentColor', '#059669')}
              title="Hijau"
            />
            <button
              type="button"
              className={`accent-option ${appearanceSettings.accentColor === '#d97706' ? 'active' : ''}`}
              style={{ background: '#d97706' }}
              onClick={() => updateAppearance('accentColor', '#d97706')}
              title="Orange"
            />
            <button
              type="button"
              className={`accent-option ${appearanceSettings.accentColor === '#dc2626' ? 'active' : ''}`}
              style={{ background: '#dc2626' }}
              onClick={() => updateAppearance('accentColor', '#dc2626')}
              title="Merah"
            />
            <button
              type="button"
              className={`accent-option ${appearanceSettings.accentColor === '#7c3aed' ? 'active' : ''}`}
              style={{ background: '#7c3aed' }}
              onClick={() => updateAppearance('accentColor', '#7c3aed')}
              title="Ungu"
            />
            <button
              type="button"
              className={`accent-option ${appearanceSettings.accentColor === '#0891b2' ? 'active' : ''}`}
              style={{ background: '#0891b2' }}
              onClick={() => updateAppearance('accentColor', '#0891b2')}
              title="Biru Muda"
            />
          </div>
        </div>
      </div>

      {/* Ukuran Tampilan */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
          Ukuran Tampilan
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Ukuran Font</label>
            <p>Atur ukuran teks sesuai preferensi</p>
          </div>
          <div className="font-size-selector">
            <button
              type="button"
              className={`font-option ${appearanceSettings.fontSize === 'small' ? 'active' : ''}`}
              onClick={() => updateAppearance('fontSize', 'small')}
            >
              <span style={{ fontSize: '12px' }}>Aa</span>
              <span>Kecil</span>
            </button>
            <button
              type="button"
              className={`font-option ${appearanceSettings.fontSize === 'medium' ? 'active' : ''}`}
              onClick={() => updateAppearance('fontSize', 'medium')}
            >
              <span style={{ fontSize: '14px' }}>Aa</span>
              <span>Sedang</span>
            </button>
            <button
              type="button"
              className={`font-option ${appearanceSettings.fontSize === 'large' ? 'active' : ''}`}
              onClick={() => updateAppearance('fontSize', 'large')}
            >
              <span style={{ fontSize: '16px' }}>Aa</span>
              <span>Besar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tata Letak */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          Tata Letak
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Sidebar Collapsed</label>
            <p>Sembunyikan sidebar dan tampilkan ikon saja</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={appearanceSettings.sidebarCollapsed}
              onChange={(e) => updateAppearance('sidebarCollapsed', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Tampilan Compact</label>
            <p>Kurangi spasi untuk menampilkan lebih banyak konten</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={appearanceSettings.compactMode}
              onChange={(e) => updateAppearance('compactMode', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Card Rounded</label>
            <p>Gunakan sudut card yang membulat</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={appearanceSettings.cardRounded}
              onChange={(e) => updateAppearance('cardRounded', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
      </div>

      {/* Animasi & Transisi */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Animasi & Transisi
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Aktifkan Animasi</label>
            <p>Tampilkan animasi transisi di seluruh aplikasi</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={appearanceSettings.enableAnimations}
              onChange={(e) => updateAppearance('enableAnimations', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Transisi Halus</label>
            <p>Efek transisi halus saat navigasi halaman</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={appearanceSettings.smoothTransitions}
              onChange={(e) => updateAppearance('smoothTransitions', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
      </div>

      {/* Info Aplikasi */}
      <div className="settings-preview">
        <div className="preview-card" style={{ borderColor: appearanceSettings.accentColor }}>
          <div className="preview-header" style={{ background: theme === 'dark' ? '#1a1f2e' : '#ffffff', borderColor: theme === 'dark' ? '#ffffff14' : '#e5e7eb' }}>
            <span style={{ color: theme === 'dark' ? '#e8ecf4' : '#111827' }}>Portal AOPTI</span>
          </div>
          <div className="preview-body" style={{ background: theme === 'dark' ? '#1e2333' : '#f9fafb' }}>
            <div className="preview-stat" style={{ background: theme === 'dark' ? '#1a1f2e' : '#ffffff', borderLeft: `3px solid ${appearanceSettings.accentColor}` }}>
              <span style={{ color: theme === 'dark' ? '#e8ecf4' : '#111827' }}>Dashboard Preview</span>
            </div>
          </div>
        </div>
        <p className="preview-note">Pratinjau tema yang dipilih</p>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="settings-section">
      {/* Kebijakan Password */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Kebijakan Password
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Minimal Panjang Password</label>
            <p>Jumlah karakter minimum untuk password</p>
          </div>
          <select
            value={settings.passwordMinLength}
            onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
            className="settings-input"
          >
            <option value={6}>6 karakter</option>
            <option value={8}>8 karakter</option>
            <option value={10}>10 karakter</option>
            <option value={12}>12 karakter</option>
            <option value={16}>16 karakter</option>
          </select>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Waktu Habis Password (hari)</label>
            <p>Password harus diubah setelah X hari</p>
          </div>
          <select
            value={settings.passwordExpiry}
            onChange={(e) => handleInputChange('passwordExpiry', parseInt(e.target.value))}
            className="settings-input"
          >
            <option value={30}>30 hari</option>
            <option value={60}>60 hari</option>
            <option value={90}>90 hari</option>
            <option value={180}>180 hari</option>
            <option value={365}>1 tahun</option>
            <option value={0}>Tidak terbatas</option>
          </select>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Wajib Gunakan Karakter Khusus</label>
            <p>Password harus mengandung simbol (!@#$%^&*)</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.requireSpecialChar}
              onChange={(e) => handleInputChange('requireSpecialChar', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Wajib Gunakan Angka</label>
            <p>Password harus mengandung angka (0-9)</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.requireNumber}
              onChange={(e) => handleInputChange('requireNumber', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Cegah Penggunaan Password Lama</label>
            <p>Tidak boleh menggunakan X password sebelumnya</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.preventPasswordReuse}
              onChange={(e) => handleInputChange('preventPasswordReuse', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
        {settings.preventPasswordReuse && (
          <div className="settings-item" style={{ paddingLeft: '20px' }}>
            <div className="settings-item-info">
              <label>Jumlah Password Lama yang Dicegah</label>
              <p>Simpan riwayat password untuk dicegah</p>
            </div>
            <select
              value={settings.passwordHistory}
              onChange={(e) => handleInputChange('passwordHistory', parseInt(e.target.value))}
              className="settings-input"
            >
              <option value={3}>3 password terakhir</option>
              <option value={5}>5 password terakhir</option>
              <option value={10}>10 password terakhir</option>
            </select>
          </div>
        )}
      </div>

      {/* Perlindungan Login */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          Perlindungan Login
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Maksimal Percobaan Login</label>
            <p>Account terkunci setelah X percobaan gagal</p>
          </div>
          <select
            value={settings.maxLoginAttempts}
            onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
            className="settings-input"
          >
            <option value={3}>3 kali</option>
            <option value={5}>5 kali</option>
            <option value={10}>10 kali</option>
          </select>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Durasi Kunci Akun (menit)</label>
            <p>Waktu sebelum akun bisa dicoba login lagi</p>
          </div>
          <select
            value={settings.lockoutDuration}
            onChange={(e) => handleInputChange('lockoutDuration', parseInt(e.target.value))}
            className="settings-input"
          >
            <option value={5}>5 menit</option>
            <option value={15}>15 menit</option>
            <option value={30}>30 menit</option>
            <option value={60}>1 jam</option>
            <option value={1440}>1 hari</option>
          </select>
        </div>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Batasi Sesi Serentak</label>
            <p>Hanya satu perangkat yang bisa login sekaligus</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.concurrentSession}
              onChange={(e) => handleInputChange('concurrentSession', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
      </div>

      {/* Pengaturan Login */}
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Pengaturan Login
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Ingat Sesi</label>
            <p>Izinkan pengguna mengingat sesi login di perangkat ini</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.sessionRemember}
              onChange={(e) => handleInputChange('sessionRemember', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className={`submit-btn ${saveStatus === 'security' ? 'saved' : ''}`}
          onClick={() => handleSave('security')}
        >
          {saveStatus === 'security' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Tersimpan!
            </>
          ) : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Notifikasi Email
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Notifikasi Email</label>
            <p>Kirim notifikasi penting melalui email</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.notificationEmail}
              onChange={(e) => handleInputChange('notificationEmail', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
          Notifikasi Keamanan
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Login dari Perangkat Baru</label>
            <p>Beritahu pengguna saat ada login dari perangkat baru</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.notificationLogin}
              onChange={(e) => handleInputChange('notificationLogin', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Pengingat
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Pengingat Deadline</label>
            <p>Kirim pengingat sebelum deadline pengawasan</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.reminderDeadline}
              onChange={(e) => handleInputChange('reminderDeadline', e.target.checked)}
            />
            <span className="toggle-slider">
              <span className="toggle-label on">ON</span>
              <span className="toggle-label off">OFF</span>
            </span>
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className={`submit-btn ${saveStatus === 'notifications' ? 'saved' : ''}`}
          onClick={() => handleSave('notifications')}
        >
          {saveStatus === 'notifications' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Tersimpan!
            </>
          ) : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  )

  const renderRegionalSettings = () => (
    <div className="settings-section">
      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Zona Waktu
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Zona Waktu Default</label>
            <p>Digunakan untuk menampilkan tanggal dan waktu</p>
          </div>
          <select
            value={settings.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className="settings-input"
          >
            <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
            <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
            <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Format Tanggal & Angka
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Format Tanggal</label>
            <p>Format tampilan tanggal di seluruh aplikasi</p>
          </div>
          <select
            value={settings.dateFormat}
            onChange={(e) => handleInputChange('dateFormat', e.target.value)}
            className="settings-input"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
            <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Format Export
        </h4>
        <div className="settings-item">
          <div className="settings-item-info">
            <label>Format Export Default</label>
            <p>Format file saat export data</p>
          </div>
          <select
            value={settings.defaultExportFormat}
            onChange={(e) => handleInputChange('defaultExportFormat', e.target.value)}
            className="settings-input"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel (.xlsx)</option>
            <option value="csv">CSV</option>
          </select>
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className={`submit-btn ${saveStatus === 'regional' ? 'saved' : ''}`}
          onClick={() => handleSave('regional')}
        >
          {saveStatus === 'regional' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Tersimpan!
            </>
          ) : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  )

  const renderAboutSettings = () => (
    <div className="settings-section">
      <div className="about-header">
        <div className="about-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="about-info">
          <h3>{settings.appName}</h3>
          <p className="about-version">Versi 1.0.0</p>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>
          Tentang Sistem
        </h4>
        <div className="about-description">
          <p>
            <strong>{settings.appName}</strong> adalah sistem informasi manajemen pengawasan intern yang dikembangkan untuk mendukung kegiatan {settings.organizationName}.
          </p>
          <p>
            Sistem ini dirancang untuk membantu pengelolaan program pengawasan, penugasan auditor, pencatatan temuan, dan pelaporan kegiatan secara terstruktur dan efisien.
          </p>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Informasi Teknis
        </h4>
        <div className="about-tech-info">
          <div className="tech-item">
            <span className="tech-label">Platform</span>
            <span className="tech-value">React + Vite</span>
          </div>
          <div className="tech-item">
            <span className="tech-label">Backend</span>
            <span className="tech-value">LocalStorage (Demo)</span>
          </div>
          <div className="tech-item">
            <span className="tech-label">Database</span>
            <span className="tech-value">IndexedDB</span>
          </div>
          <div className="tech-item">
            <span className="tech-label">Lisensi</span>
            <span className="tech-value">Internal Use Only</span>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Kontak
        </h4>
        <div className="about-contact">
          <p><strong>{settings.organizationName}</strong></p>
          <p>{settings.organizationAddress}</p>
          <p>Telepon: {settings.organizationPhone}</p>
          <p>Email: {settings.organizationEmail}</p>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings()
      case 'appearance':
        return renderAppearanceSettings()
      case 'security':
        return renderSecuritySettings()
      case 'notifications':
        return renderNotificationSettings()
      case 'regional':
        return renderRegionalSettings()
      case 'about':
        return renderAboutSettings()
      default:
        return null
    }
  }

  return (
    <section className="page-wrap settings-page">
      <div className="page-header">
        <h2>Pengaturan Sistem</h2>
        <p>Kelola konfigurasi dan preferensi sistem Portal AOPTI</p>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tabIcons[tab.icon]}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-content">
          {renderTabContent()}
        </main>
      </div>
    </section>
  )
}

export default SettingsPage
