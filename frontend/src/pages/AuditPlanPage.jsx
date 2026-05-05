import { useEffect, useState } from 'react'
import { useUser, ROLES } from '../context/UserContext'

const auditPhases = [
  { id: 'entry_meeting', label: 'Entry Meeting', value: 0, icon: 'clipboard-list' },
  { id: 'konfirmasi', label: 'Konfirmasi Audit', value: 25, icon: 'check-circle' },
  { id: 'expose', label: 'Expose Meeting', value: 50, icon: 'presentation' },
  { id: 'exit_meeting', label: 'Exit Meeting', value: 75, icon: 'flag' },
  { id: 'lainnya', label: 'Lainnya', value: 100, icon: 'bookmark' },
]

const tahapTypes = [
  { id: 'audit', label: 'Tahap Audit', icon: 'clipboard-check' },
  { id: 'non_audit', label: 'Tahap Non Audit', icon: 'file-text' },
]

const percentageOptions = [
  { value: 0, label: '0%' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' },
]

const phaseIcons = {
  'clipboard-list': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  ),
  'check-circle': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  'presentation': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h20" />
      <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
      <path d="m7 21 5-5 5 5" />
    </svg>
  ),
  'flag': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  'bookmark': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  'clipboard-check': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  'file-text': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
}

const teamRoles = [
  { id: 'pic', label: 'PIC' },
  { id: 'pt', label: 'Pengendali Teknis (PT)' },
  { id: 'ketua', label: 'Ketua Tim (KT)' },
  { id: 'anggota', label: 'Anggota Tim (AT)' },
]

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDaysUntil(dateString) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateString)
  targetDate.setHours(0, 0, 0, 0)
  return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
}

function getStatus(dateString, completed) {
  if (completed) return 'completed'
  const days = getDaysUntil(dateString)
  if (days < 0) return 'completed'
  if (days === 0) return 'today'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'near'
  return 'upcoming'
}

const statusConfig = {
  completed: { label: 'Selesai', color: '#22a95f', bg: '#e6f7ed' },
  today: { label: 'Hari Ini', color: '#0c3d86', bg: '#e8efff' },
  urgent: { label: 'Segera', color: '#d13438', bg: '#fff0f0' },
  near: { label: 'Mendekat', color: '#b15b08', bg: '#fff4e6' },
  upcoming: { label: 'Akan Datang', color: '#6f7a94', bg: '#f4f6ff' },
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array(adjustedFirst).fill(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const nationalHolidays = {
  '2026': {
    '01-01': 'Tahun Baru',
    '01-16': 'Isra Mi\'raj',
    '02-17': 'Imlek',
    '03-03': 'Nyepi',
    '03-18': 'Idulfitri',
    '03-19': 'Idulfitri',
    '03-20': 'Cuti Bersama',
    '03-23': 'Cuti Bersama',
    '05-01': 'Hari Buruh',
    '05-31': 'Kenaikan Isa',
    '06-01': 'Pascakebarsilan',
    '07-06': 'Waisak',
    '07-27': 'Tahun Baru Islam',
    '08-17': 'Merdeka',
    '09-15': 'Maulid Nabi',
    '12-25': 'Natal',
  }
}

function getHolidayLabel(year, month, day) {
  const monthDay = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return nationalHolidays[year]?.[monthDay] || null
}

function isWeekend(date) {
  const d = new Date(date)
  return d.getDay() === 0 || d.getDay() === 6
}

function AuditPlanPage() {
  const { user } = useUser()
  const isKSPI = user?.role === ROLES.KSPI

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(isoDate(now.getFullYear(), now.getMonth(), now.getDate()))
  const [showHolidayLegend, setShowHolidayLegend] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [workListData, setWorkListData] = useState([])

  // Form state
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedPhase, setSelectedPhase] = useState(auditPhases[0].id)
  const [selectedTahapType, setSelectedTahapType] = useState('audit')
  const [nonAuditDescription, setNonAuditDescription] = useState('')
  const [nonAuditPercentage, setNonAuditPercentage] = useState(0)
  const [dateWarning, setDateWarning] = useState('')
  const [formTeam, setFormTeam] = useState([
    { id: 1, name: '', role: 'pic' },
    { id: 2, name: '', role: 'ketua' },
    { id: 3, name: '', role: 'anggota' },
  ])
  const [formNote, setFormNote] = useState('')
  const [formDate, setFormDate] = useState(isoDate(now.getFullYear(), now.getMonth(), now.getDate()))
  const [formTime, setFormTime] = useState('')
  const [formMessage, setFormMessage] = useState('')

  // Agendas state
  const [agendas, setAgendas] = useState([])

  // Load WorkList data
  useEffect(() => {
    const saved = localStorage.getItem('portalAoptiWorkList')
    if (saved) {
      const workList = JSON.parse(saved)
      setWorkListData(workList)

      // Convert WorkList to agendas with initial phases
      const workListAgendas = workList.map((item, idx) => ({
        id: `wl-${item.id}`,
        taskId: item.id,
        programName: item.programName,
        taskName: item.taskName,
        startDate: item.startDate || item.date,
        endDate: item.endDate || item.startDate || item.date,
        location: item.location,
        progress: item.progress,
        status: item.status,
        completed: item.status === 'completed',
        isAgenda: false,
        phases: [
          { phase: 'Entry Meeting', date: item.startDate || item.date, done: item.progress >= 0 },
          { phase: 'Konfirmasi Audit', date: '', done: item.progress >= 25 },
          { phase: 'Expose Meeting', date: '', done: item.progress >= 75 },
          { phase: 'Exit Meeting', date: '', done: item.progress >= 100 },
        ],
      }))

      setAgendas((prev) => {
        const workIds = workListAgendas.map((w) => w.id)
        const existingManual = prev.filter((a) => !a.id.startsWith('wl-')).map((a) => ({ ...a, isAgenda: true }))
        return [...workListAgendas, ...existingManual]
      })
    }
  }, [])

  // Listen for WorkList updates
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('portalAoptiWorkList')
      if (saved) {
        const workList = JSON.parse(saved)
        setWorkListData(workList)
      }
    }
    window.addEventListener('portalWorkList-changed', handleStorageChange)
    return () => window.removeEventListener('portalWorkList-changed', handleStorageChange)
  }, [])

  const calendarDays = buildCalendarDays(selectedYear, selectedMonth)

  // Filter agendas
  const filteredAgendas = agendas.filter((a) => {
    if (filterStatus === 'all') return true
    return a.status === filterStatus
  })

  const agendasInMonth = filteredAgendas.filter((a) => {
    const date = new Date(a.startDate)
    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth && a.isAgenda
  })

  const agendasOnDate = filteredAgendas.filter((a) => a.startDate === selectedDate)
  const nowIso = isoDate(now.getFullYear(), now.getMonth(), now.getDate())

  const totalCount = filteredAgendas.length
  const overdueCount = filteredAgendas.filter((a) => getDaysUntil(a.startDate) < 0 && !a.completed).length
  const todayCount = filteredAgendas.filter((a) => a.startDate === nowIso).length

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const searchResults = filteredAgendas
    .filter((agenda) => {
      // Filter by selected calendar month
      const date = new Date(agenda.startDate)
      const isInSelectedMonth = date.getFullYear() === selectedYear && date.getMonth() === selectedMonth

      if (!isInSelectedMonth) return false
      if (!normalizedQuery) return true
      return (
        agenda.taskName?.toLowerCase().includes(normalizedQuery) ||
        agenda.programName?.toLowerCase().includes(normalizedQuery)
      )
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))

  // Team handlers
  function addTeamMember() {
    setFormTeam((prev) => [...prev, { id: Date.now(), name: '', role: 'anggota' }])
  }

  function removeTeamMember(id) {
    if (formTeam.length > 1) {
      setFormTeam((prev) => prev.filter((m) => m.id !== id))
    }
  }

  function updateTeamMember(id, field, value) {
    setFormTeam((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m))
  }

  // Submit handler
  function handleSubmit(e) {
    e.preventDefault()

    if (!selectedTaskId) {
      setFormMessage('Pilih tugas terlebih dahulu')
      return
    }

    const selectedTask = workListData.find((w) => w.id === selectedTaskId)
    if (!selectedTask) {
      setFormMessage('Tugas tidak ditemukan')
      return
    }

    // Validate date range for Tahap Audit
    if (selectedTahapType === 'audit') {
      const taskStart = selectedTask.startDate || selectedTask.date
      const taskEnd = selectedTask.endDate || taskStart
      if (taskStart && formDate < taskStart) {
        setDateWarning(`Peringatan: Tanggal ${formDate} sebelum periode tugas (${taskStart})`)
      } else if (taskEnd && formDate > taskEnd) {
        setDateWarning(`Peringatan: Tanggal ${formDate} setelah periode tugas (${taskEnd})`)
      } else {
        setDateWarning('')
      }
    }

    // Validate non-audit description
    if (selectedTahapType === 'non_audit' && !nonAuditDescription.trim()) {
      setFormMessage('Deskripsi Tahap Non Audit wajib diisi')
      return
    }

    const filledTeam = formTeam.filter((m) => m.name.trim())

    // Create new agenda entry
    let progress = 0
    let phaseLabel = ''
    let tahapType = selectedTahapType

    if (selectedTahapType === 'audit') {
      const phaseConfig = auditPhases.find((p) => p.id === selectedPhase)
      progress = phaseConfig?.value || 0
      phaseLabel = phaseConfig?.label || ''

      const newAgenda = {
        id: `ap-${Date.now()}`,
        taskId: selectedTask.id,
        programName: selectedTask.programName,
        taskName: selectedTask.taskName,
        startDate: formDate,
        endDate: formDate,
        location: selectedTask.location,
        progress,
        status: 'in_progress',
        completed: false,
        isAgenda: true,
        tahapType: 'audit',
        team: filledTeam.map(m => ({ role: m.role, name: m.name })),
        note: formNote,
        phases: [
          { phase: 'Entry Meeting', date: selectedPhase === 'entry_meeting' ? formDate : '', done: selectedPhase === 'entry_meeting' },
          { phase: 'Konfirmasi Audit', date: selectedPhase === 'konfirmasi' ? formDate : '', done: selectedPhase === 'konfirmasi' },
          { phase: 'Expose Meeting', date: selectedPhase === 'expose' ? formDate : '', done: selectedPhase === 'expose' },
          { phase: 'Exit Meeting', date: selectedPhase === 'exit_meeting' ? formDate : '', done: selectedPhase === 'exit_meeting' },
        ],
      }

      // Also update the WorkList agenda's phases to mark this phase as done
      setAgendas((prev) => {
        const updated = prev.map((a) => {
          if ((a.id === `wl-${selectedTaskId}` || a.taskId === selectedTaskId) && a.id.startsWith('wl-')) {
            const updatedPhases = a.phases.map((p, idx) => {
              if (idx === 0 && selectedPhase === 'entry_meeting') return { ...p, done: true, date: formDate }
              if (idx === 1 && selectedPhase === 'konfirmasi') return { ...p, done: true, date: formDate }
              if (idx === 2 && selectedPhase === 'expose') return { ...p, done: true, date: formDate }
              if (idx === 3 && selectedPhase === 'exit_meeting') return { ...p, done: true, date: formDate }
              return p
            })
            return { ...a, phases: updatedPhases }
          }
          return a
        })
        return [...updated, newAgenda]
      })
    } else {
      // Tahap Non Audit
      progress = nonAuditPercentage
      phaseLabel = nonAuditDescription.trim()

      const newAgenda = {
        id: `ap-${Date.now()}`,
        taskId: selectedTask.id,
        programName: selectedTask.programName,
        taskName: selectedTask.taskName,
        startDate: formDate,
        endDate: formDate,
        location: selectedTask.location,
        progress,
        status: 'in_progress',
        completed: false,
        isAgenda: true,
        tahapType: 'non_audit',
        phaseLabel: nonAuditDescription.trim(),
        customPercentage: nonAuditPercentage,
        team: filledTeam.map(m => ({ role: m.role, name: m.name })),
        note: formNote,
      }

      setAgendas((prev) => [...prev, newAgenda])
    }

    setFormMessage(selectedTahapType === 'audit' ? 'Tahap Audit berhasil diupdate!' : 'Tahap Non Audit berhasil ditambahkan!')
    setFormDate(isoDate(now.getFullYear(), now.getMonth(), now.getDate()))
    setNonAuditDescription('')
    setNonAuditPercentage(0)
    setTimeout(() => setFormMessage(''), 3000)
  }

  // Task selection handler
  function handleProgramSelect(programId) {
    setSelectedProgramId(programId)
    setSelectedTaskId('') // Reset task selection when program changes
  }

  function handleTaskSelect(taskId) {
    setSelectedTaskId(taskId)
    setFormDate(isoDate(now.getFullYear(), now.getMonth(), now.getDate()))
    const task = workListData.find((w) => w.id === taskId)
    if (task) {
      setSelectedDate(task.startDate || task.date)
    }
  }

  // Delete agenda handler
  function handleDeleteAgenda(agendaId) {
    const agenda = agendas.find((a) => a.id === agendaId)
    if (!agenda) return

    // Check if this agenda is from workList (wl- prefix)
    if (agenda.id.startsWith('wl-') || agenda.taskId) {
      // This is from WorkList - delete from both WorkList AND agendas
      if (confirm(`Hapus "${agenda.taskName}" dari Program Kerja dan Kalender?`)) {
        const taskIdToDelete = agenda.taskId || agenda.id.replace('wl-', '')

        // Remove from WorkList (localStorage)
        const savedWorkList = localStorage.getItem('portalAoptiWorkList')
        if (savedWorkList) {
          const workList = JSON.parse(savedWorkList)
          const updatedWorkList = workList.filter((item) => item.id !== taskIdToDelete)
          localStorage.setItem('portalAoptiWorkList', JSON.stringify(updatedWorkList))
          // Dispatch event to notify WorkListPage
          window.dispatchEvent(new Event('portalWorkList-changed'))
        }

        // Remove from agendas state
        setAgendas((prev) => prev.filter((a) => a.id !== agendaId))
      }
    } else {
      // This is a manual agenda - just delete from agendas
      if (confirm(`Hapus "${agenda.taskName}" dari daftar agenda?`)) {
        setAgendas((prev) => prev.filter((a) => a.id !== agendaId))
      }
    }
  }

  const selectedTask = workListData.find((w) => w.id === selectedTaskId)

  // Get unique programs from workListData
  const programOptions = workListData.reduce((programs, task) => {
    const exists = programs.find((p) => p.id === task.programId)
    if (!exists) {
      programs.push({ id: task.programId, name: task.programName })
    }
    return programs
  }, [])

  // Filter tasks by selected program
  const filteredTasks = selectedProgramId
    ? workListData.filter((task) => task.programId === selectedProgramId)
    : workListData

  return (
    <section className="ap-layout">
      {/* Main Content */}
      <div className="ap-main">
        {/* Header */}
        <div className="ap-header">
          <div className="ap-title-section">
            <h2>Jadwal Audit</h2>
            <p>Pantau progress dan jadwal kegiatan audit internal</p>
            {isKSPI && (
              <span className="fieldwork-readonly-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Mode Baca Saja
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="ap-stats-grid">
          <div className="ap-stat-card">
            <div className="ap-stat-icon ap-stat-total">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="ap-stat-content">
              <span className="ap-stat-value">{totalCount}</span>
              <span className="ap-stat-label">Total Audit</span>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-icon ap-stat-month">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="9" y1="2" x2="9" y2="6" />
                <line x1="15" y1="2" x2="15" y2="6" />
              </svg>
            </div>
            <div className="ap-stat-content">
              <span className="ap-stat-value">{agendasInMonth.length}</span>
              <span className="ap-stat-label">Bulan Ini</span>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-icon ap-stat-today">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="ap-stat-content">
              <span className="ap-stat-value">{todayCount}</span>
              <span className="ap-stat-label">Hari Ini</span>
            </div>
          </div>
          <div className="ap-stat-card ap-stat-danger">
            <div className="ap-stat-icon ap-stat-overdue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="ap-stat-content">
              <span className="ap-stat-value">{overdueCount}</span>
              <span className="ap-stat-label">Terlambat</span>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="ap-command-bar">
          <div className="ap-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari program kerja atau tugas..."
            />
          </div>
          <div className="ap-filter-chips">
            {['all', 'scheduled', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                className={`ap-filter-chip ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'Semua' : status === 'scheduled' ? 'Terjadwal' : status === 'in_progress' ? 'Berlangsung' : 'Selesai'}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="ap-calendar-card">
          <div className="ap-calendar-nav">
            <div className="ap-calendar-info">
              <h3>{monthNames[selectedMonth]} {selectedYear}</h3>
              <span className="ap-agenda-count">{agendasInMonth.length} agenda</span>
            </div>
            <div className="ap-calendar-controls">
              <button className="ap-nav-btn" onClick={() => { setSelectedMonth(m => m === 0 ? 11 : m - 1); if (selectedMonth === 0) setSelectedYear(y => y - 1) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value) || now.getFullYear())} min="2020" max="2100" />
              <button className="ap-nav-btn" onClick={() => { setSelectedMonth(m => m === 11 ? 0 : m + 1); if (selectedMonth === 11) setSelectedYear(y => y + 1) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button className="ap-today-btn" onClick={() => { setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth()); setSelectedDate(nowIso) }}>
                Hari Ini
              </button>
            </div>
          </div>

          <div className="ap-weekday-header">
            {weekdays.map((day, i) => (
              <div key={day} className={`ap-weekday-cell ${i >= 5 ? 'weekend' : ''}`}>{day}</div>
            ))}
          </div>

          <div className="ap-calendar-grid">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} className="ap-day-cell ap-day-empty"></div>
              const dayIso = isoDate(selectedYear, selectedMonth, day)
              const dayAgendas = agendas.filter((a) => a.startDate === dayIso)
              const isToday = dayIso === nowIso
              const isSelected = dayIso === selectedDate
              const isWeekendDay = isWeekend(dayIso)
              const holidayName = getHolidayLabel(selectedYear, selectedMonth, day)

              return (
                <div
                  key={idx}
                  className={`ap-day-cell ${isToday ? 'ap-day-today' : ''} ${isSelected ? 'ap-day-selected' : ''} ${isWeekendDay || holidayName ? 'ap-day-weekend' : ''}`}
                  onClick={() => setSelectedDate(dayIso)}
                >
                  <span className={`ap-day-number ${isToday ? 'ap-day-badge' : ''}`}>{day}</span>
                  {holidayName && <span className="ap-holiday-label">{holidayName}</span>}
                  {dayAgendas.length > 0 && (
                    <div className="ap-day-tasks">
                      {dayAgendas.slice(0, 3).map((agenda) => {
                        const status = getStatus(agenda.startDate, agenda.completed)
                        const color = statusConfig[status].color
                        const donePhase = agenda.phases.find((p) => p.done)
                        const displayName = donePhase
                          ? `ISO - ${donePhase.phase}`
                          : agenda.taskName
                        return (
                          <div key={agenda.id} className="ap-day-task-pill" style={{ borderLeftColor: color }}>
                            <span className="ap-day-task-name">{displayName}</span>
                          </div>
                        )
                      })}
                      {dayAgendas.length > 3 && (
                        <span className="ap-day-more">+{dayAgendas.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Agenda List */}
        <div className="ap-agenda-list-card">
          <div className="ap-agenda-list-header">
            <h3>Daftar Agenda {monthNames[selectedMonth]} {selectedYear}</h3>
            <span>{agendasInMonth.length} agenda</span>
          </div>
          <div className="ap-agenda-list">
            {agendasInMonth.map((agenda) => {
              const status = getStatus(agenda.startDate, agenda.completed)
              const config = statusConfig[status]
              const days = getDaysUntil(agenda.startDate)
              const donePhase = agenda.phases.find((p) => p.done)
              const phaseLabel = donePhase ? donePhase.phase : 'Start'
              const hasTeam = agenda.team && agenda.team.length > 0 && agenda.team.some(m => m.name)

              return (
                <div key={agenda.id} className="ap-agenda-item" style={{ borderLeftColor: config.color }}>
                  <div className="ap-agenda-date">
                    <span className="ap-agenda-day">{new Date(agenda.startDate).getDate()}</span>
                    <span className="ap-agenda-month">{monthNames[new Date(agenda.startDate).getMonth()]}</span>
                  </div>
                  <div className="ap-agenda-content">
                    <div className="ap-agenda-status-row">
                      <span className="ap-status-badge" style={{ background: config.bg, color: config.color }}>
                        {config.label}
                        {status !== 'completed' && status !== 'today' && <span> ({days} hari)</span>}
                      </span>
                      {agenda.isAgenda && (
                        <span className="ap-agenda-type-badge">
                          {agenda.id.startsWith('wl-') ? 'Dari Program' : 'Manual'}
                        </span>
                      )}
                    </div>
                    <h4>{agenda.taskName} - {phaseLabel}</h4>
                    <div className="ap-agenda-meta">
                      <span className="ap-program-tag">{agenda.programName}</span>
                      {agenda.location && (
                        <span className="ap-location-tag">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {agenda.location}
                        </span>
                      )}
                    </div>
                    {hasTeam && (
                      <div className="ap-agenda-team">
                        <span className="ap-team-label">Tim:</span>
                        {agenda.team.map((member, idx) => (
                          member.name && (
                            <span key={idx} className="ap-team-member">
                              {member.name}
                              <span className="ap-team-role">
                                ({teamRoles.find(r => r.id === member.role)?.label || member.role})
                              </span>
                            </span>
                          )
                        ))}
                      </div>
                    )}
                    {agenda.note && (
                      <div className="ap-agenda-note">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {agenda.note}
                      </div>
                    )}
                  </div>
                  <div className="ap-agenda-actions">
                    <button
                      className="ap-agenda-delete-btn"
                      onClick={() => handleDeleteAgenda(agenda.id)}
                      title="Hapus agenda"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
            {agendasInMonth.length === 0 && (
              <div className="ap-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p>Tidak ada agenda di bulan {monthNames[selectedMonth]} {selectedYear}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Form */}
      {!isKSPI && (
      <aside className="ap-sidebar">
        <div className="ap-form-card">
          <div className="ap-form-header">
            <div className="ap-form-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3>Update Progress Audit</h3>
              <p>Pilih tugas dan update tahap audit</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="ap-form">
            {/* Program Selection */}
            <div className="ap-form-group">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Program Kerja
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => handleProgramSelect(e.target.value)}
              >
                <option value="">-- Pilih Program Kerja --</option>
                {programOptions.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Selection */}
            <div className="ap-form-group">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Pilih Tugas Audit
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => handleTaskSelect(e.target.value)}
                disabled={!selectedProgramId}
              >
                <option value="">-- Pilih Tugas --</option>
                {filteredTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.taskName}
                  </option>
                ))}
              </select>
              {!selectedProgramId && (
                <span className="ap-form-hint">Pilih program kerja terlebih dahulu</span>
              )}
            </div>

            {/* Selected Task Info */}
            {selectedTask && (
              <div className="ap-task-info">
                <div className="ap-task-info-row">
                  <span className="ap-task-info-label">Program</span>
                  <span className="ap-task-info-value">{selectedTask.programName}</span>
                </div>
                <div className="ap-task-info-row">
                  <span className="ap-task-info-label">Periode</span>
                  <span className="ap-task-info-value">
                    {formatDateShort(selectedTask.startDate || selectedTask.date)} - {formatDateShort(selectedTask.endDate || selectedTask.startDate || selectedTask.date)}
                  </span>
                </div>
                <div className="ap-task-info-row">
                  <span className="ap-task-info-label">Lokasi</span>
                  <span className="ap-task-info-value">{selectedTask.location || '-'}</span>
                </div>
              </div>
            )}

            {/* Tanggal */}
            <div className="ap-form-group">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Tanggal
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
              {selectedTask && selectedTahapType === 'audit' && (
                <span className="ap-form-hint" style={{ fontSize: '11px', color: '#6f7a94' }}>
                  Periode tugas: {formatDateShort(selectedTask.startDate || selectedTask.date)} - {formatDateShort(selectedTask.endDate || selectedTask.startDate || selectedTask.date)}
                </span>
              )}
            </div>

            {/* Date Warning */}
            {dateWarning && (
              <div className="ap-date-warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {dateWarning}
              </div>
            )}

            {/* Jam */}
            <div className="ap-form-group">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Jam Mulai
              </label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                placeholder="Contoh: 09:00"
              />
            </div>

            {/* Tahap Type Selection */}
            <div className="ap-form-group">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Tipe Tahap
              </label>
              <div className="ap-tahap-type-options">
                {tahapTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={`ap-tahap-type-option ${selectedTahapType === type.id ? 'active' : ''}`}
                    onClick={() => setSelectedTahapType(type.id)}
                  >
                    <span className="ap-tahap-type-icon">{phaseIcons[type.icon]}</span>
                    <span className="ap-tahap-type-label">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tahap Audit Options */}
            {selectedTahapType === 'audit' && (
              <div className="ap-form-group">
                <label>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  Tahap Audit
                </label>
                <div className="ap-phase-options">
                  {auditPhases.map((phase) => (
                    <button
                      key={phase.id}
                      type="button"
                      className={`ap-phase-option ${selectedPhase === phase.id ? 'active' : ''}`}
                      onClick={() => setSelectedPhase(phase.id)}
                    >
                      <span className="ap-phase-icon">{phaseIcons[phase.icon]}</span>
                      <span className="ap-phase-label">{phase.label}</span>
                      <span className="ap-phase-percent">{phase.value}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tahap Non Audit Options */}
            {selectedTahapType === 'non_audit' && (
              <div className="ap-non-audit-section">
                <div className="ap-form-group">
                  <label>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Deskripsi Tahap
                  </label>
                  <input
                    type="text"
                    value={nonAuditDescription}
                    onChange={(e) => setNonAuditDescription(e.target.value)}
                    placeholder="Contoh: Review Dokumen, Koordinasi Internal"
                  />
                </div>
                <div className="ap-form-group">
                  <label>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Persentase
                  </label>
                  <div className="ap-percentage-options">
                    {percentageOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`ap-percentage-option ${nonAuditPercentage === opt.value ? 'active' : ''}`}
                        onClick={() => setNonAuditPercentage(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Team Section */}
            <div className="ap-form-group">
              <div className="ap-form-group-header">
                <label>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  PIC & Tim Audit
                </label>
                <button type="button" className="ap-add-team-btn" onClick={addTeamMember}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah
                </button>
              </div>
              <div className="ap-team-list">
                {formTeam.map((member) => (
                  <div key={member.id} className="ap-team-row">
                    <select
                      value={member.role}
                      onChange={(e) => updateTeamMember(member.id, 'role', e.target.value)}
                    >
                      {teamRoles.map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                    <div className="ap-team-input-wrap">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateTeamMember(member.id, 'name', e.target.value)}
                        placeholder="Nama anggota"
                      />
                      <button type="button" className="ap-remove-team-btn" onClick={() => removeTeamMember(member.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="ap-form-group">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Catatan (opsional)
              </label>
              <textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Tambahkan catatan jika diperlukan..."
                rows={3}
              />
            </div>

            {/* Message */}
            {formMessage && (
              <div className="ap-form-message">{formMessage}</div>
            )}

            {/* Submit Button */}
            <button type="submit" className="ap-submit-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Update Progress
            </button>
          </form>
        </div>

        {/* Quick Stats */}
        <div className="ap-quick-stats">
          <h4>Progress Overview</h4>
          <div className="ap-quick-stat-list">
            {['Entry Meeting', 'Konfirmasi', 'Expose', 'Exit Meeting'].map((label, idx) => {
              const count = filteredAgendas.filter((a) => {
                const phase = a.phases?.[idx]
                return phase?.done
              }).length
              return (
                <div key={label} className="ap-quick-stat-item">
                  <span className="ap-quick-stat-label">{label}</span>
                  <span className="ap-quick-stat-value">{count}/{totalCount}</span>
                </div>
              )
            })}
          </div>
        </div>
      </aside>
      )}

    </section>
  )
}

export default AuditPlanPage