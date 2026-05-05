import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const currentYear = new Date().getFullYear()

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

function normalizeTask(task, fallbackYear = currentYear) {
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

function ensureProgramIdForYear(programId, year) {
  const safeId = String(programId || 'program').replace(/\s+/g, '-').toLowerCase()
  return `${safeId}-${year}`
}

// Calendar helpers
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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

function getDaysUntil(dateString) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateString)
  targetDate.setHours(0, 0, 0, 0)
  return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
}

function migrateYearScopedData(rawPrograms, rawTasks) {
  const normalizedTasks = rawTasks.map((task) => normalizeTask(task))
  const hasYearScopedPrograms = rawPrograms.some((program) => Number.isFinite(Number(program?.year)))

  if (hasYearScopedPrograms) {
    const migratedPrograms = rawPrograms.map((program) => ({
      id: String(program.id),
      name: program.name,
      year: Number(program.year) || currentYear,
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

      const fallbackProgramId = ensureProgramIdForYear(task.programId || task.programName || 'program', task.year)
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

  rawPrograms.forEach((program) => {
    const relatedYears = [...new Set(
      normalizedTasks.filter((task) => task.programId === program.id).map((task) => task.year)
    )]
    const yearsForProgram = relatedYears.length ? relatedYears : [currentYear]

    yearsForProgram.forEach((year) => {
      const scopedId = ensureProgramIdForYear(program.id, year)
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
    const scopedId = legacyKeyToScopedId.get(`${task.programId}::${task.year}`) || ensureProgramIdForYear(task.programId || task.programName || 'program', task.year)
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

const initialPrograms = [
  { id: 'prog1-2026', year: 2026, name: 'Pemenuhan Program Pengawasan' },
  { id: 'prog2-2026', year: 2026, name: 'HRADC' },
  { id: 'prog3-2026', year: 2026, name: 'Lainnya' },
]

const initialWorkList = [
  {
    id: 'wl001',
    year: 2026,
    programId: 'prog1-2026',
    programName: 'Pemenuhan Program Pengawasan',
    taskId: 'task001',
    taskName: 'Audit MBG',
    startDate: '2026-04-12',
    endDate: '2026-04-19',
    date: '2026-04-12',
    progress: 100,
    status: 'completed',
  },
  {
    id: 'wl002',
    year: 2026,
    programId: 'prog1-2026',
    programName: 'Pemenuhan Program Pengawasan',
    taskId: 'task002',
    taskName: 'Audit Kinerja',
    startDate: '2026-04-20',
    endDate: '2026-04-30',
    date: '2026-04-20',
    progress: 50,
    status: 'in_progress',
  },
  {
    id: 'wl003',
    year: 2026,
    programId: 'prog2-2026',
    programName: 'HRADC',
    taskId: 'task003',
    taskName: 'Review HR Policy',
    startDate: '2026-05-01',
    endDate: '2026-05-15',
    date: '2026-05-01',
    progress: 0,
    status: 'scheduled',
  },
]

const DECADES = []
for (let d = 2020; d <= 2030; d += 10) {
  DECADES.push(d)
}

function DashboardPage() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [workList, setWorkList] = useState([])
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedDecade, setSelectedDecade] = useState(Math.floor(currentYear / 10) * 10)

  // Calendar state
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())

  useEffect(() => {
    const storedPrograms = localStorage.getItem('portalAoptiPrograms')
    const storedWorkList = localStorage.getItem('portalAoptiWorkList')

    const rawPrograms = storedPrograms ? JSON.parse(storedPrograms) : initialPrograms
    const rawWorkList = storedWorkList ? JSON.parse(storedWorkList) : initialWorkList

    const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(rawPrograms, rawWorkList)

    setPrograms(migratedPrograms)
    setWorkList(migratedTasks)

    localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
    localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
  }, [])

  useEffect(() => {
    function handleStorageChange() {
      const storedPrograms = localStorage.getItem('portalAoptiPrograms')
      const storedWorkList = localStorage.getItem('portalAoptiWorkList')

      if (storedPrograms || storedWorkList) {
        const rawPrograms = storedPrograms ? JSON.parse(storedPrograms) : initialPrograms
        const rawWorkList = storedWorkList ? JSON.parse(storedWorkList) : initialWorkList
        const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(rawPrograms, rawWorkList)
        setPrograms(migratedPrograms)
        setWorkList(migratedTasks)
      }
    }

    window.addEventListener('portalWorkList-changed', handleStorageChange)
    window.addEventListener('portalPrograms-changed', handleStorageChange)

    return () => {
      window.removeEventListener('portalWorkList-changed', handleStorageChange)
      window.removeEventListener('portalPrograms-changed', handleStorageChange)
    }
  }, [])

  const yearPrograms = useMemo(
    () => programs.filter((p) => p.year === selectedYear),
    [programs, selectedYear]
  )

  const yearWorkList = useMemo(
    () => workList.filter((t) => t.year === selectedYear),
    [workList, selectedYear]
  )

  const availableYears = useMemo(() => {
    const yearsSet = new Set()
    workList.forEach((task) => yearsSet.add(task.year))
    programs.forEach((prog) => yearsSet.add(prog.year))
    if (yearsSet.size === 0) yearsSet.add(currentYear)
    return [...yearsSet].sort((a, b) => b - a)
  }, [workList, programs])

  const yearsInDecade = useMemo(() => {
    return [selectedDecade, selectedDecade + 1, selectedDecade + 2, selectedDecade + 3, selectedDecade + 4, selectedDecade + 5, selectedDecade + 6, selectedDecade + 7, selectedDecade + 8, selectedDecade + 9]
      .filter((year) => availableYears.includes(year))
  }, [selectedDecade, availableYears])

  const stats = useMemo(() => {
    const totalPrograms = yearPrograms.length
    const totalTasks = yearWorkList.length
    const completedTasks = yearWorkList.filter((t) => t.status === 'completed').length
    const inProgressTasks = yearWorkList.filter((t) => t.status === 'in_progress').length
    const scheduledTasks = yearWorkList.filter((t) => t.status === 'scheduled').length
    const avgProgress = totalTasks > 0
      ? Math.round(yearWorkList.reduce((sum, t) => sum + normalizeProgress(t.progress), 0) / totalTasks)
      : 0

    return {
      totalPrograms,
      totalTasks,
      completedTasks,
      inProgressTasks,
      scheduledTasks,
      avgProgress,
    }
  }, [yearPrograms, yearWorkList])

  const programProgress = useMemo(() => {
    return yearPrograms.map((program) => {
      const programTasks = yearWorkList.filter((t) => t.programId === program.id)
      const totalTasks = programTasks.length
      const completedTasks = programTasks.filter((t) => t.status === 'completed').length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      return {
        ...program,
        totalTasks,
        completedTasks,
        progress,
        status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'scheduled',
      }
    })
  }, [yearPrograms, yearWorkList])

  const recentTasks = useMemo(() => {
    return [...yearWorkList]
      .sort((a, b) => {
        const dateA = new Date(a.endDate || a.startDate || 0)
        const dateB = new Date(b.endDate || b.startDate || 0)
        return dateB - dateA
      })
      .slice(0, 5)
  }, [yearWorkList])

  function handleYearChange(e) {
    setSelectedYear(Number(e.target.value))
  }

  function handleDecadeChange(e) {
    setSelectedDecade(Number(e.target.value))
  }

  return (
    <section className="page-wrap">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Ringkasan progress audit untuk tahun {selectedYear}</p>
      </div>

      <div className="dashboard-year-selector">
        <select
          className="dashboard-decade-dropdown"
          value={selectedDecade}
          onChange={handleDecadeChange}
        >
          {DECADES.map((decade) => (
            <option key={decade} value={decade}>
              {decade} - {decade + 9}
            </option>
          ))}
        </select>
        <select
          className="dashboard-year-dropdown"
          value={selectedYear}
          onChange={handleYearChange}
        >
          {yearsInDecade.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="stats-grid">
        <article className="card stat-card program">
          <div className="stat-icon stat-icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
          </div>
          <div className="stat-content">
            <strong>{stats.totalPrograms}</strong>
            <p>Program Kerja</p>
          </div>
        </article>

        <article className="card stat-card completed">
          <div className="stat-icon stat-icon-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-content">
            <strong>{stats.completedTasks}</strong>
            <p>Tugas Selesai</p>
          </div>
        </article>

        <article className="card stat-card progress">
          <div className="stat-icon stat-icon-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-content">
            <strong>{stats.inProgressTasks}</strong>
            <p>Sedang Berjalan</p>
          </div>
        </article>

        <article className="card stat-card scheduled">
          <div className="stat-icon stat-icon-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="stat-content">
            <strong>{stats.scheduledTasks}</strong>
            <p>Terjadwal</p>
          </div>
        </article>
      </div>

      <div className="dashboard-main-grid">
        <article className="card table-card">
          <div className="table-head">
            <h3>Progress per Program Kerja</h3>
            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate('/work-list')}
            >
              Lihat Semua
            </button>
          </div>

          <div className="progress-list">
            {programProgress.length === 0 ? (
              <p className="empty-state">Belum ada program kerja untuk tahun ini</p>
            ) : (
              programProgress.map((program) => (
                <div className="progress-item" key={program.id}>
                  <div className="progress-info">
                    <h4>{program.name}</h4>
                    <p>{program.completedTasks} / {program.totalTasks} tugas selesai</p>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar">
                      <div
                        className={`progress-fill progress-${program.status}`}
                        style={{ width: `${program.progress}%` }}
                      />
                    </div>
                    <span className={`progress-badge badge-${program.status}`}>
                      {program.progress}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card activity-card">
          <div className="table-head">
            <h3>Aktivitas Terbaru</h3>
            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate('/fieldwork')}
            >
              Fieldwork
            </button>
          </div>

          <div className="activity-list">
            {recentTasks.length === 0 ? (
              <p className="empty-state">Belum ada aktivitas</p>
            ) : (
              recentTasks.map((task) => (
                <div className="activity-item" key={task.id}>
                  <div className={`activity-indicator activity-${task.status}`} />
                  <div className="activity-content">
                    <h4>{task.taskName}</h4>
                    <p>{task.programName}</p>
                    <span className="activity-date">
                      {task.startDate && task.endDate
                        ? `${formatDate(task.startDate)} - ${formatDate(task.endDate)}`
                        : task.startDate
                          ? formatDate(task.startDate)
                          : 'Tanggal belum ditentukan'}
                    </span>
                  </div>
                  <span className={`status-badge status-${task.status}`}>
                    {task.status === 'completed' ? 'Selesai' : task.status === 'in_progress' ? 'Berjalan' : 'Terjadwal'}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="dashboard-bottom-grid">
        <article className="card summary-card">
          <h3>Ringkasan Tahun {selectedYear}</h3>
          <div className="summary-rings">
            <div className="summary-ring">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${stats.avgProgress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="ring-label">
                <strong>{stats.avgProgress}%</strong>
                <span>Overall Progress</span>
              </div>
            </div>
          </div>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="dot dot-green" />
              <span>Selesai: {stats.completedTasks}</span>
            </div>
            <div className="summary-stat">
              <span className="dot dot-blue" />
              <span>Berjalan: {stats.inProgressTasks}</span>
            </div>
            <div className="summary-stat">
              <span className="dot dot-gray" />
              <span>Terjadwal: {stats.scheduledTasks}</span>
            </div>
          </div>
        </article>

        <article className="card dashboard-calendar-card">
          <div className="dashboard-calendar-header">
            <h3>Kalender</h3>
            <div className="dashboard-calendar-nav">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else { setCalMonth(calMonth - 1) } }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span>{monthNames[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else { setCalMonth(calMonth + 1) } }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="dashboard-calendar-grid">
            {weekdays.map((day) => (
              <div key={day} className="dashboard-cal-day-name">{day}</div>
            ))}
            {buildCalendarDays(calYear, calMonth).map((day, idx) => {
              const dateStr = day ? isoDate(calYear, calMonth, day) : null
              const dayTasks = dateStr ? yearWorkList.filter(t => t.startDate === dateStr || (t.startDate <= dateStr && t.endDate >= dateStr)) : []
              const isToday = dateStr === isoDate(now.getFullYear(), now.getMonth(), now.getDate())
              return (
                <div key={idx} className={`dashboard-cal-cell ${day ? '' : 'empty'} ${isToday ? 'today' : ''}`}>
                  {day && (
                    <>
                      <span className="dashboard-cal-day-num">{day}</span>
                      {dayTasks.slice(0, 2).map((t, i) => (
                        <div key={i} className={`dashboard-cal-task-dot status-${t.status}`} title={t.taskName} />
                      ))}
                      {dayTasks.length > 2 && <span className="dashboard-cal-more">+{dayTasks.length - 2}</span>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div className="dashboard-upcoming">
            <h4>Akan Datang</h4>
            {yearWorkList
              .filter(t => {
                const days = getDaysUntil(t.startDate)
                return days >= 0 && days <= 7 && t.status !== 'completed'
              })
              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
              .slice(0, 3)
              .map(task => (
                <div key={task.id} className="dashboard-upcoming-item">
                  <div className={`dashboard-upcoming-dot status-${task.status}`} />
                  <div className="dashboard-upcoming-info">
                    <span className="dashboard-upcoming-name">{task.taskName}</span>
                    <span className="dashboard-upcoming-date">{formatDate(task.startDate)}</span>
                  </div>
                </div>
              ))}
            {yearWorkList.filter(t => { const days = getDaysUntil(t.startDate); return days >= 0 && days <= 7 && t.status !== 'completed' }).length === 0 && (
              <p className="dashboard-upcoming-empty">Tidak ada tugas mendatang</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default DashboardPage
