import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROLES, useUser } from '../../context/UserContext'

const NAV_ITEMS = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Ringkasan prioritas dan agenda audit', path: '/dashboard', roles: ['all'] },
  { id: 'work-list', title: 'List Pekerjaan', subtitle: 'Program kerja, tugas, dan pipeline audit', path: '/work-list', roles: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.KSPI] },
  { id: 'audit-plan', title: 'Rencana Kegiatan', subtitle: 'Kalender, timeline, dan agenda audit', path: '/audit-plan', roles: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.KSPI] },
  { id: 'fieldwork', title: 'Fieldwork', subtitle: 'Dokumentasi pelaksanaan audit', path: '/fieldwork', roles: [ROLES.ADMIN, ROLES.AUDITOR] },
  { id: 'analytics', title: 'Analytics', subtitle: 'Analisis progress dan temuan', path: '/analytics', roles: ['all'] },
  { id: 'reports', title: 'Reports', subtitle: 'Laporan dan ringkasan audit', path: '/reports', roles: ['all'] },
  { id: 'team-chat', title: 'Team Chat', subtitle: 'Koordinasi internal tim audit', path: '/team-chat', roles: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.KSPI] },
  { id: 'admin', title: 'Admin Panel', subtitle: 'User, role, log aktivitas, dan backup', path: '/admin', roles: [ROLES.ADMIN] },
  { id: 'help', title: 'Panduan', subtitle: 'Bantuan penggunaan SPI Hub', path: '/help', roles: ['all'] },
]

function safeParseArray(key, _refreshVersion) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().trim()
}

function CommandPalette() {
  const navigate = useNavigate()
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [recordsVersion, setRecordsVersion] = useState(0)

  useEffect(() => {
    function onKeyDown(event) {
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (!isCommandK) return
      event.preventDefault()
      setOpen((current) => !current)
    }

    function onEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [])

  useEffect(() => {
    function refreshRecords() {
      setRecordsVersion((version) => version + 1)
    }

    window.addEventListener('portalPrograms-changed', refreshRecords)
    window.addEventListener('portalWorkList-changed', refreshRecords)
    window.addEventListener('portalAuditPlans-changed', refreshRecords)
    window.addEventListener('focus', refreshRecords)
    return () => {
      window.removeEventListener('portalPrograms-changed', refreshRecords)
      window.removeEventListener('portalWorkList-changed', refreshRecords)
      window.removeEventListener('portalAuditPlans-changed', refreshRecords)
      window.removeEventListener('focus', refreshRecords)
    }
  }, [])

  const items = useMemo(() => {
    const role = user?.role
    const navItems = NAV_ITEMS
      .filter((item) => item.roles.includes('all') || item.roles.includes(role))
      .map((item) => ({ ...item, type: 'Halaman' }))

    const programs = safeParseArray('portalAoptiPrograms', recordsVersion).map((program) => ({
      id: `program-${program.id}`,
      title: program.name || 'Program Kerja',
      subtitle: `Program kerja ${program.year || ''}`.trim(),
      path: '/work-list',
      type: 'Program',
    }))

    const tasks = safeParseArray('portalAoptiWorkList', recordsVersion).map((task) => ({
      id: `task-${task.id}`,
      title: task.taskName || task.task_name || 'Tugas Audit',
      subtitle: task.programName || task.program_name || 'List Pekerjaan',
      path: '/work-list',
      type: 'Tugas',
    }))

    const auditPlans = safeParseArray('portalAoptiAuditPlans', recordsVersion).map((agenda) => ({
      id: `agenda-${agenda.id}`,
      title: agenda.taskName || agenda.task_name || agenda.title || 'Agenda Audit',
      subtitle: agenda.phaseLabel || agenda.phase_label || agenda.programName || agenda.program_name || 'Rencana Kegiatan',
      path: '/audit-plan',
      type: 'Agenda',
    }))

    return [...navItems, ...programs, ...tasks, ...auditPlans]
  }, [recordsVersion, user?.role])

  const visibleItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery) return items.slice(0, 10)
    return items
      .filter((item) => {
        const haystack = normalizeSearchText(`${item.title} ${item.subtitle} ${item.type}`)
        return haystack.includes(normalizedQuery)
      })
      .slice(0, 12)
  }, [items, query])

  function openItem(item) {
    navigate(item.path)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <button type="button" className="command-palette-trigger" onClick={() => setOpen(true)} title="Cari cepat">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Cari</span>
        <kbd>⌘K</kbd>
      </button>

      {open && (
        <div className="command-palette-overlay" role="dialog" aria-modal="true">
          <div className="command-palette-panel">
            <div className="command-palette-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari halaman, program, tugas, atau agenda..."
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup pencarian">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="command-palette-results">
              {visibleItems.length === 0 ? (
                <div className="command-palette-empty">Tidak ada hasil yang cocok</div>
              ) : visibleItems.map((item) => (
                <button key={item.id} type="button" className="command-palette-item" onClick={() => openItem(item)}>
                  <span className="command-palette-item__type">{item.type}</span>
                  <span className="command-palette-item__body">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CommandPalette
