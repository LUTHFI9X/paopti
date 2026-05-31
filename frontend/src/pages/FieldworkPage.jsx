import { useState, useEffect, useMemo } from 'react'
import { useUser, ROLES } from '../context/UserContext'

function normalizeProgress(value) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return 0
  if (parsed >= 100) return 100
  if (parsed >= 50) return 50
  return 0
}

function statusFromProgress(progress) {
  if (progress >= 100) return 'completed'
  if (progress > 0) return 'in_progress'
  return 'scheduled'
}

function normalizeTask(task, fallbackYear = new Date().getFullYear()) {
  const startDate = task.startDate || task.date || ''
  const endDate = task.endDate || task.date || startDate
  const progress = normalizeProgress(task.progress)

  return {
    ...task,
    year: Number(task.year) || fallbackYear,
    startDate,
    endDate,
    date: startDate,
    progress,
    status: statusFromProgress(progress),
  }
}

function migrateYearScopedData(rawPrograms, rawTasks) {
  const normalizedTasks = rawTasks.map((task) => normalizeTask(task))
  const hasYearScopedPrograms = rawPrograms.some((program) => Number.isFinite(Number(program?.year)))

  if (hasYearScopedPrograms) {
    const migratedPrograms = rawPrograms.map((program) => ({
      id: String(program.id),
      name: program.name,
      year: Number(program.year) || new Date().getFullYear(),
    }))

    const idToProgram = new Map(migratedPrograms.map((program) => [program.id, program]))
    const patchedTasks = normalizedTasks.map((task) => {
      const linkedProgram = idToProgram.get(task.programId)
      if (linkedProgram) {
        return {
          ...task,
          year: Number(task.year) || linkedProgram.year,
          programName: linkedProgram.name,
        }
      }

      const safeId = String(task.programId || 'program').replace(/\s+/g, '-').toLowerCase()
      const fallbackProgramId = `${safeId}-${task.year}`
      if (!idToProgram.has(fallbackProgramId)) {
        const fallbackProgram = {
          id: fallbackProgramId,
          name: task.programName || 'Program Kerja',
          year: task.year,
        }
        idToProgram.set(fallbackProgramId, fallbackProgram)
        migratedPrograms.push(fallbackProgram)
      }

      return {
        ...task,
        programId: fallbackProgramId,
        programName: idToProgram.get(fallbackProgramId)?.name || task.programName,
      }
    })

    return { programs: migratedPrograms, tasks: patchedTasks }
  }

  const migratedPrograms = []
  const legacyKeyToScopedId = new Map()
  const currentYear = new Date().getFullYear()

  rawPrograms.forEach((program) => {
    const relatedYears = [...new Set(
      normalizedTasks.filter((task) => task.programId === program.id).map((task) => task.year)
    )]
    const yearsForProgram = relatedYears.length ? relatedYears : [currentYear]

    yearsForProgram.forEach((year) => {
      const safeId = String(program.id).replace(/\s+/g, '-').toLowerCase()
      const scopedId = `${safeId}-${year}`
      legacyKeyToScopedId.set(`${program.id}::${year}`, scopedId)
      migratedPrograms.push({
        id: scopedId,
        name: program.name,
        year,
      })
    })
  })

  const programIndex = new Map(migratedPrograms.map((program) => [program.id, program]))

  const patchedTasks = normalizedTasks.map((task) => {
    const safeId = String(task.programId || 'program').replace(/\s+/g, '-').toLowerCase()
    const scopedId = legacyKeyToScopedId.get(`${task.programId}::${task.year}`) || `${safeId}-${task.year}`
    if (!programIndex.has(scopedId)) {
      const fallbackProgram = {
        id: scopedId,
        name: task.programName || 'Program Kerja',
        year: task.year,
      }
      programIndex.set(scopedId, fallbackProgram)
      migratedPrograms.push(fallbackProgram)
    }

    return {
      ...task,
      programId: scopedId,
      programName: programIndex.get(scopedId)?.name || task.programName,
    }
  })

  return { programs: migratedPrograms, tasks: patchedTasks }
}

function FieldworkPage() {
  const { user, hasPermission } = useUser()
  const canEdit = hasPermission('canEditFieldwork')
  // eslint-disable-next-line no-unused-vars
  const canDelete = hasPermission('canDeleteFieldwork')
  const isKSPI = user?.role === ROLES.KSPI

  const currentYear = new Date().getFullYear()
  const [programs, setPrograms] = useState([])
  const [workList, setWorkList] = useState([])
  const [fieldworks, setFieldworks] = useState({})
  const [isHydrated, setIsHydrated] = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedDecade, setSelectedDecade] = useState(Math.floor(currentYear / 10) * 10)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedSections, setExpandedSections] = useState({})
  const [newNote, setNewNote] = useState('')

  // Load data from localStorage
  useEffect(() => {
    const savedPrograms = localStorage.getItem('portalAoptiPrograms')
    const savedWorkList = localStorage.getItem('portalAoptiWorkList')
    const savedFieldworks = localStorage.getItem('portalAoptiFieldworks')

    if (savedPrograms && savedWorkList) {
      const rawPrograms = JSON.parse(savedPrograms)
      const rawTasks = JSON.parse(savedWorkList)
      const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(rawPrograms, rawTasks)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrograms(migratedPrograms)
      setWorkList(migratedTasks)
    }

    if (savedFieldworks) {
      setFieldworks(JSON.parse(savedFieldworks))
    }

    setIsHydrated(true)
  }, [])

  // Filter programs and workList by selected year
  const yearWorkList = useMemo(
    () => workList.filter((t) => t.year === selectedYear),
    [workList, selectedYear]
  )

  // Save fieldworks to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('portalAoptiFieldworks', JSON.stringify(fieldworks))
    }
  }, [fieldworks, isHydrated])

  // Listen for WorkList changes
  useEffect(() => {
    function handleWorkListChanged() {
      const savedPrograms = localStorage.getItem('portalAoptiPrograms')
      const savedWorkList = localStorage.getItem('portalAoptiWorkList')

      if (savedPrograms && savedWorkList) {
        const rawPrograms = JSON.parse(savedPrograms)
        const rawTasks = JSON.parse(savedWorkList)
        const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(rawPrograms, rawTasks)
        setPrograms(migratedPrograms)
        setWorkList(migratedTasks)
      }
    }

    window.addEventListener('portalWorkList-changed', handleWorkListChanged)
    window.addEventListener('portalPrograms-changed', handleWorkListChanged)
    return () => {
      window.removeEventListener('portalWorkList-changed', handleWorkListChanged)
      window.removeEventListener('portalPrograms-changed', handleWorkListChanged)
    }
  }, [])

  const filteredTasks = useMemo(() => {
    let tasks = selectedProgramId
      ? yearWorkList.filter((t) => t.programId === selectedProgramId)
      : yearWorkList

    if (filterStatus !== 'all') {
      tasks = tasks.filter((t) => t.status === filterStatus)
    }

    return tasks
  }, [yearWorkList, selectedProgramId, filterStatus])

  function toggleSection(section) {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function getDaysUntil(dateStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
  }

  function getStatusInfo(status) {
    const statusMap = {
      scheduled: { label: 'Terjadwal', color: '#6f7a94', bg: '#f4f6ff' },
      in_progress: { label: 'Berlangsung', color: '#0c3d86', bg: '#e8efff' },
      completed: { label: 'Selesai', color: '#22a95f', bg: '#e6f7ed' },
    }
    return statusMap[status] || statusMap.scheduled
  }

  function getProgressPercentage(task) {
    const fw = fieldworks[task.id]
    if (!fw) return task.progress || 0
    const done = (fw.activities || []).filter((a) => a.done).length
    if ((fw.activities || []).length === 0) return task.progress || 0
    return Math.round((done / fw.activities.length) * 100)
  }

  function toggleActivityCheck(taskId, actItemId) {
    setFieldworks((prev) => {
      const fw = prev[taskId] || createFieldwork(taskId)
      return {
        ...prev,
        [taskId]: {
          ...fw,
          activities: (fw.activities || []).map((item) =>
            item.id === actItemId ? { ...item, done: !item.done } : item
          ),
        },
      }
    })
  }

  function toggleChecklistItem(taskId, checkItemId) {
    setFieldworks((prev) => {
      const fw = prev[taskId] || createFieldwork(taskId)
      return {
        ...prev,
        [taskId]: {
          ...fw,
          checklist: (fw.checklist || []).map((item) =>
            item.id === checkItemId ? { ...item, done: !item.done } : item
          ),
        },
      }
    })
  }

  function addNote(taskId) {
    if (!newNote.trim()) return
    const note = {
      // eslint-disable-next-line react-hooks/purity
      id: `n${Date.now()}`,
      author: 'You',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      text: newNote,
    }
    setFieldworks((prev) => {
      const fw = prev[taskId] || createFieldwork(taskId)
      return {
        ...prev,
        [taskId]: {
          ...fw,
          notes: [...(fw.notes || []), note],
        },
      }
    })
    setNewNote('')
  }

  // eslint-disable-next-line no-unused-vars
  function createFieldwork(taskId) {
    return {
      activities: [],
      photos: [],
      checklist: [],
      notes: [],
    }
  }

  function startFieldwork(taskId) {
    setFieldworks((prev) => {
      if (prev[taskId]) return prev
      return {
        ...prev,
        [taskId]: createFieldwork(taskId),
      }
    })
    setSelectedTaskId(taskId)
  }

  function addActivity(taskId) {
    setFieldworks((prev) => {
      const fw = prev[taskId] || createFieldwork(taskId)
      const newActivity = {
        id: `a${Date.now()}`,
        label: '',
        done: false,
      }
      return {
        ...prev,
        [taskId]: {
          ...fw,
          activities: [...(fw.activities || []), newActivity],
        },
      }
    })
  }

  function updateActivity(taskId, activityId, label) {
    setFieldworks((prev) => {
      const fw = prev[taskId]
      if (!fw) return prev
      return {
        ...prev,
        [taskId]: {
          ...fw,
          activities: fw.activities.map((a) =>
            a.id === activityId ? { ...a, label } : a
          ),
        },
      }
    })
  }

  function removeActivity(taskId, activityId) {
    setFieldworks((prev) => {
      const fw = prev[taskId]
      if (!fw) return prev
      return {
        ...prev,
        [taskId]: {
          ...fw,
          activities: fw.activities.filter((a) => a.id !== activityId),
        },
      }
    })
  }

  function addChecklist(taskId) {
    setFieldworks((prev) => {
      const fw = prev[taskId] || createFieldwork(taskId)
      const newItem = {
        id: `c${Date.now()}`,
        label: '',
        done: false,
      }
      return {
        ...prev,
        [taskId]: {
          ...fw,
          checklist: [...(fw.checklist || []), newItem],
        },
      }
    })
  }

  function updateChecklist(taskId, checkId, label) {
    setFieldworks((prev) => {
      const fw = prev[taskId]
      if (!fw) return prev
      return {
        ...prev,
        [taskId]: {
          ...fw,
          checklist: fw.checklist.map((c) =>
            c.id === checkId ? { ...c, label } : c
          ),
        },
      }
    })
  }

  function removeChecklist(taskId, checkId) {
    setFieldworks((prev) => {
      const fw = prev[taskId]
      if (!fw) return prev
      return {
        ...prev,
        [taskId]: {
          ...fw,
          checklist: fw.checklist.filter((c) => c.id !== checkId),
        },
      }
    })
  }

  function getSelectedTask() {
    if (!selectedTaskId) return null
    return yearWorkList.find((t) => t.id === selectedTaskId) || null
  }

  const selectedTask = getSelectedTask()
  const selectedFieldwork = selectedTaskId ? fieldworks[selectedTaskId] : null

  const statusCounts = {
    all: filteredTasks.length,
    scheduled: filteredTasks.filter((t) => t.status === 'scheduled').length,
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress').length,
    completed: filteredTasks.filter((t) => t.status === 'completed').length,
  }

  // Generate decades (from 2020 to 2050)
  const decades = useMemo(() => {
    const startDecade = 2020
    return Array.from({ length: 5 }, (_, i) => startDecade + i * 10)
  }, [])

  // Generate years for selected decade
  const decadeYears = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => selectedDecade + i)
  }, [selectedDecade])

  // Handle decade change
  function handleDecadeChange(e) {
    const decade = Number(e.target.value)
    setSelectedDecade(decade)
    if (currentYear >= decade && currentYear < decade + 10) {
      setSelectedYear(currentYear)
    } else {
      setSelectedYear(decade)
    }
  }

  // Handle year change
  function handleYearChange(e) {
    setSelectedYear(Number(e.target.value))
    setSelectedProgramId('')
  }

  // Filter programs by selected year
  const yearPrograms = useMemo(
    () => programs.filter((p) => p.year === selectedYear),
    [programs, selectedYear]
  )

  return (
    <section className="page-wrap fieldwork-page">
      {/* Header */}
      <div className="fieldwork-header-v2">
        <div className="fieldwork-header-left">
          <h2>Aktivitas Audit Lapangan</h2>
          <p>Catat dan pantau setiap aktivitas audit yang dilakukan di lapangan</p>
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
        <div className="fieldwork-header-right">
          <div className="status-tabs">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'scheduled', label: 'Terjadwal' },
              { key: 'in_progress', label: 'Berlangsung' },
              { key: 'completed', label: 'Selesai' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`status-tab ${filterStatus === tab.key ? 'active' : ''}`}
                onClick={() => setFilterStatus(tab.key)}
              >
                <span className="tab-label">{tab.label}</span>
                <span className="tab-count">{statusCounts[tab.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="fieldwork-quick-stats">
        <div className="quick-stat-card">
          <div className="quick-stat-icon scheduled">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{statusCounts.scheduled}</span>
            <span className="quick-stat-label">Terjadwal</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{statusCounts.in_progress}</span>
            <span className="quick-stat-label">Berlangsung</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon completed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{statusCounts.completed}</span>
            <span className="quick-stat-label">Selesai</span>
          </div>
        </div>
      </div>

      {/* Year Selector */}
      <div className="fieldwork-year-selector">
        <div className="fieldwork-decade-selector">
          <div className="fieldwork-selector-group">
            <label className="fieldwork-selector-label">Dekade</label>
            <select
              className="fieldwork-decade-dropdown"
              value={selectedDecade}
              onChange={handleDecadeChange}
            >
              {decades.map((decade) => (
                <option key={decade} value={decade}>
                  {decade}-{decade + 9}
                </option>
              ))}
            </select>
          </div>
          <div className="fieldwork-selector-group">
            <label className="fieldwork-selector-label">Tahun</label>
            <select
              className="fieldwork-year-dropdown"
              value={selectedYear}
              onChange={handleYearChange}
            >
              {decadeYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="fieldwork-year-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {selectedYear}
        </div>
      </div>

      {/* Filter Bar - Program Kerja */}
      <div className="fieldwork-filter-bar">
        <div className="filter-group">
          <select
            className="filter-select"
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
          >
            <option value="">Semua Program ({yearPrograms.length})</option>
            {yearPrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-info">
          {yearPrograms.length} program, {yearWorkList.length} tugas
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="audit-grid">
        {filteredTasks.length === 0 ? (
          <div className="empty-fieldwork-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="15" y2="16" />
            </svg>
            <p>Tidak ada tugas audit</p>
            <span>Tambahkan tugas di Menu List Pekerjaan</span>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusInfo = getStatusInfo(task.status)
            const progressPct = getProgressPercentage(task)
            const daysUntil = getDaysUntil(task.startDate)
            const fw = fieldworks[task.id]
            const hasFieldwork = fw && (fw.activities?.length > 0 || fw.findings?.length > 0 || fw.notes?.length > 0)

            return (
              <div key={task.id} className={`audit-card ${hasFieldwork ? 'has-fieldwork' : ''}`}>
                {/* Card Header */}
                <div className="audit-card-header" onClick={() => startFieldwork(task.id)}>
                  <div className="audit-header-top">
                    <span className="biro-badge-v2" style={{ background: '#e8efff', color: '#0c3d86', border: '#0c3d86' }}>
                      AOPTI
                    </span>
                    <span className="status-tag" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <h3 className="audit-title">{task.taskName}</h3>
                  <div className="audit-meta">
                    <div className="meta-avatar-sm">{task.programName?.charAt(0) || 'P'}</div>
                    <span className="meta-name">{task.programName}</span>
                    <span className="meta-dot"></span>
                    <span className={`meta-date ${daysUntil <= 3 && task.status !== 'completed' ? 'urgent' : ''}`}>
                      {task.status === 'completed' ? formatDateShort(task.startDate) :
                       daysUntil === 0 ? 'Hari ini' :
                       daysUntil < 0 ? `${Math.abs(daysUntil)} hari lalu` :
                       `${daysUntil} hari lagi`}
                    </span>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="audit-quick-info">
                  <div className="quick-info-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{task.location || '-'}</span>
                  </div>
                  <div className="quick-info-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span>{fw?.activities?.filter(a => a.done).length || 0}/{fw?.activities?.length || 0} Aktivitas</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="audit-progress-section">
                  <div className="progress-header-row">
                    <span>Progress</span>
                    <span className="progress-percent">{progressPct}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: statusInfo.color }}></div>
                  </div>
                </div>

                {/* Indicators */}
                <div className="audit-indicators">
                  {(fw?.activities?.length || 0) > 0 && (
                    <div className="indicator-item photos">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <span>{fw.activities.length}</span>
                    </div>
                  )}
                  {(fw?.notes?.length || 0) > 0 && (
                    <div className="indicator-item notes">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{fw.notes.length}</span>
                    </div>
                  )}
                </div>

                {/* View Detail Button */}
                <button className="view-detail-btn" onClick={() => startFieldwork(task.id)}>
                  <span>{hasFieldwork ? 'Lihat & Edit' : 'Mulai Fieldwork'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <div className="detail-modal-overlay" onClick={() => setSelectedTaskId(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="detail-modal-header">
              <div className="modal-header-content">
                <div className="modal-header-badges">
                  <span className="biro-badge-v2" style={{ background: '#e8efff', color: '#0c3d86', border: '#0c3d86' }}>
                    AOPTI
                  </span>
                  <span className="status-tag-lg" style={{
                    background: getStatusInfo(selectedTask.status).bg,
                    color: getStatusInfo(selectedTask.status).color
                  }}>
                    {getStatusInfo(selectedTask.status).label}
                  </span>
                </div>
                <h2 className="modal-title">{selectedTask.taskName}</h2>
                <div className="modal-meta">
                  <span className="modal-avatar">{selectedTask.programName?.charAt(0) || 'P'}</span>
                  <span>{selectedTask.programName}</span>
                  <span className="modal-meta-dot"></span>
                  <span>{formatDate(selectedTask.startDate)}</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedTaskId(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="detail-modal-body">
              {/* Section 1: Lokasi */}
              <div className="detail-section-card">
                <div className="section-header" onClick={() => toggleSection('location')}>
                  <div className="section-header-left">
                    <div className="section-icon-wrap location">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <span className="section-title">Lokasi</span>
                  </div>
                  <svg className={`chevron ${expandedSections.location ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {expandedSections.location && (
                  <div className="section-body">
                    <div className="location-display">
                      <div className="location-main">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <div>
                          <p className="location-name">{selectedTask.location || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Aktivitas */}
              <div className="detail-section-card">
                <div className="section-header" onClick={() => toggleSection('activities')}>
                  <div className="section-header-left">
                    <div className="section-icon-wrap activities">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <span className="section-title">Aktivitas yang Dilakukan</span>
                  </div>
                  <div className="section-header-right">
                    <span className="section-count">
                      {(selectedFieldwork?.activities || []).filter(a => a.done).length}/
                      {(selectedFieldwork?.activities || []).length || 0}
                    </span>
                    <svg className={`chevron ${expandedSections.activities ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                {expandedSections.activities && (
                  <div className="section-body">
                    <div className="activities-list">
                      {(selectedFieldwork?.activities || []).map((act) => (
                        <div key={act.id} className="activity-row-group">
                          <div
                            className={`activity-row ${act.done ? 'done' : ''}`}
                            onClick={() => toggleActivityCheck(selectedTaskId, act.id)}
                          >
                            <div className={`activity-checkbox ${act.done ? 'checked' : ''}`}>
                              {act.done && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <input
                              type="text"
                              className="activity-label-input"
                              value={act.label}
                              onChange={(e) => updateActivity(selectedTaskId, act.id, e.target.value)}
                              placeholder="Deskripsi aktivitas..."
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <button
                            className="remove-activity-btn"
                            onClick={(e) => { e.stopPropagation(); removeActivity(selectedTaskId, act.id) }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    {canEdit && (
                      <button className="add-item-btn" onClick={() => addActivity(selectedTaskId)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Tambah Aktivitas
                      </button>
                    )}
                    {(selectedFieldwork?.activities || []).length > 0 && (
                      <div className="activities-progress">
                        <div className="activities-progress-bar">
                          <div className="activities-progress-fill" style={{ width: `${getProgressPercentage(selectedTask)}%` }}></div>
                        </div>
                        <span className="activities-progress-text">{getProgressPercentage(selectedTask)}% selesai</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Checklist Dokumen */}
              <div className="detail-section-card">
                <div className="section-header" onClick={() => toggleSection('checklist')}>
                  <div className="section-header-left">
                    <div className="section-icon-wrap checklist">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <span className="section-title">Checklist Dokumen</span>
                  </div>
                  <div className="section-header-right">
                    <span className="section-count">
                      {(selectedFieldwork?.checklist || []).filter(c => c.done).length}/
                      {(selectedFieldwork?.checklist || []).length || 0}
                    </span>
                    <svg className={`chevron ${expandedSections.checklist ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                {expandedSections.checklist && (
                  <div className="section-body">
                    <div className="checklist-grid">
                      {(selectedFieldwork?.checklist || []).map((item) => (
                        <div key={item.id} className="checklist-item-group">
                          <div
                            className={`checklist-item ${item.done ? 'done' : ''}`}
                            onClick={() => toggleChecklistItem(selectedTaskId, item.id)}
                          >
                            <div className={`checklist-icon ${item.done ? 'checked' : ''}`}>
                              {item.done && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <input
                              type="text"
                              className="checklist-label-input"
                              value={item.label}
                              onChange={(e) => updateChecklist(selectedTaskId, item.id, e.target.value)}
                              placeholder="Nama dokumen..."
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <button
                            className="remove-checklist-btn"
                            onClick={(e) => { e.stopPropagation(); removeChecklist(selectedTaskId, item.id) }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    {canEdit && (
                      <button className="add-item-btn" onClick={() => addChecklist(selectedTaskId)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Tambah Checklist
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Catatan Langsung */}
              <div className="detail-section-card">
                <div className="section-header" onClick={() => toggleSection('notes')}>
                  <div className="section-header-left">
                    <div className="section-icon-wrap notes">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <span className="section-title">Catatan Langsung</span>
                  </div>
                  <div className="section-header-right">
                    <span className="section-count">{selectedFieldwork?.notes?.length || 0}</span>
                    <svg className={`chevron ${expandedSections.notes ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                {expandedSections.notes && (
                  <div className="section-body">
                    <div className="notes-list">
                      {(selectedFieldwork?.notes || []).map((note) => (
                        <div key={note.id} className="note-item">
                          <div className="note-header">
                            <span className="note-avatar">{note.author.charAt(0)}</span>
                            <span className="note-author">{note.author}</span>
                            <span className="note-time">{note.time}</span>
                          </div>
                          <p className="note-text">{note.text}</p>
                        </div>
                      ))}
                    </div>
                    {canEdit && (
                      <div className="add-note-form">
                        <input
                          type="text"
                          className="note-input"
                          placeholder="Tambahkan catatan..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addNote(selectedTaskId)}
                        />
                        <button className="note-submit-btn" onClick={() => addNote(selectedTaskId)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default FieldworkPage