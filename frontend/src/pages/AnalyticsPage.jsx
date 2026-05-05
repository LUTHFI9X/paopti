import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, ROLES } from '../context/UserContext'

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

const initialFindings = [
  { id: 'f1', year: 2026, programId: 'prog1-2026', title: 'Keterlambatan pelaporan', risk: 'tinggi', status: 'open' },
  { id: 'f2', year: 2026, programId: 'prog1-2026', title: 'Dokumentasi tidak lengkap', risk: 'menengah', status: 'in_progress' },
  { id: 'f3', year: 2026, programId: 'prog2-2026', title: 'Prosedur belum diupdate', risk: 'rendah', status: 'closed' },
  { id: 'f4', year: 2026, programId: 'prog1-2026', title: 'SOP belum distandardisasi', risk: 'menengah', status: 'open' },
  { id: 'f5', year: 2026, programId: 'prog2-2026', title: 'Training belum dilakukan', risk: 'tinggi', status: 'in_progress' },
]

function AnalyticsPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const isKSPI = user?.role === ROLES.KSPI

  const [programs, setPrograms] = useState([])
  const [workList, setWorkList] = useState([])
  const [findings, setFindings] = useState([])
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedDecade, setSelectedDecade] = useState(Math.floor(currentYear / 10) * 10)
  const [timelineFilter, setTimelineFilter] = useState('upcoming') // 'upcoming', 'this-month', 'this-quarter', 'all'

  useEffect(() => {
    const storedPrograms = localStorage.getItem('portalAoptiPrograms')
    const storedWorkList = localStorage.getItem('portalAoptiWorkList')
    const storedFindings = localStorage.getItem('portalAoptiFindings')

    const rawPrograms = storedPrograms ? JSON.parse(storedPrograms) : initialPrograms
    const rawWorkList = storedWorkList ? JSON.parse(storedWorkList) : initialWorkList
    const rawFindings = storedFindings ? JSON.parse(storedFindings) : initialFindings

    const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(rawPrograms, rawWorkList)

    setPrograms(migratedPrograms)
    setWorkList(migratedTasks)
    setFindings(rawFindings)

    localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
    localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
    if (!storedFindings) {
      localStorage.setItem('portalAoptiFindings', JSON.stringify(initialFindings))
    }
  }, [])

  useEffect(() => {
    function handleStorageChange() {
      const storedPrograms = localStorage.getItem('portalAoptiPrograms')
      const storedWorkList = localStorage.getItem('portalAoptiWorkList')
      const storedFindings = localStorage.getItem('portalAoptiFindings')

      if (storedPrograms || storedWorkList) {
        const rawPrograms = storedPrograms ? JSON.parse(storedPrograms) : initialPrograms
        const rawWorkList = storedWorkList ? JSON.parse(storedWorkList) : initialWorkList
        const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(rawPrograms, rawWorkList)
        setPrograms(migratedPrograms)
        setWorkList(migratedTasks)
      }
      if (storedFindings) {
        setFindings(JSON.parse(storedFindings))
      }
    }

    window.addEventListener('portalWorkList-changed', handleStorageChange)
    window.addEventListener('portalPrograms-changed', handleStorageChange)
    window.addEventListener('portalFindings-changed', handleStorageChange)

    return () => {
      window.removeEventListener('portalWorkList-changed', handleStorageChange)
      window.removeEventListener('portalPrograms-changed', handleStorageChange)
      window.removeEventListener('portalFindings-changed', handleStorageChange)
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

  const yearFindings = useMemo(
    () => findings.filter((f) => f.year === selectedYear),
    [findings, selectedYear]
  )

  // Helper function to get date range for filters
  const getDateRange = (filter) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const endOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)

    switch (filter) {
      case 'this-month':
        return { start: startOfMonth, end: endOfMonth }
      case 'this-quarter':
        return { start: startOfQuarter, end: endOfQuarter }
      default:
        return null
    }
  }

  // Filter tasks based on timeline filter
  const filteredTimelineTasks = useMemo(() => {
    if (!yearWorkList || yearWorkList.length === 0) return []

    const sorted = [...yearWorkList].sort((a, b) =>
      new Date(a.startDate || 0) - new Date(b.startDate || 0)
    )

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    switch (timelineFilter) {
      case 'upcoming': {
        const upcoming = sorted.filter(task => {
          const endDate = task.endDate ? new Date(task.endDate) : null
          return !endDate || endDate >= now
        })
        return upcoming.slice(0, 8)
      }
      case 'this-month': {
        const range = getDateRange('this-month')
        return sorted.filter(task => {
          const start = task.startDate ? new Date(task.startDate) : null
          const end = task.endDate ? new Date(task.endDate) : null
          if (!start && !end) return false
          const taskStart = start || end
          const taskEnd = end || start
          return (taskStart <= range.end && taskEnd >= range.start)
        })
      }
      case 'this-quarter': {
        const range = getDateRange('this-quarter')
        return sorted.filter(task => {
          const start = task.startDate ? new Date(task.startDate) : null
          const end = task.endDate ? new Date(task.endDate) : null
          if (!start && !end) return false
          const taskStart = start || end
          const taskEnd = end || start
          return (taskStart <= range.end && taskEnd >= range.start)
        })
      }
      case 'all':
      default:
        return sorted
    }
  }, [yearWorkList, timelineFilter])

  const availableYears = useMemo(() => {
    const yearsSet = new Set()
    workList.forEach((task) => yearsSet.add(task.year))
    programs.forEach((prog) => yearsSet.add(prog.year))
    findings.forEach((f) => yearsSet.add(f.year))
    if (yearsSet.size === 0) yearsSet.add(currentYear)
    return [...yearsSet].sort((a, b) => b - a)
  }, [workList, programs, findings])

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
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const totalFindings = yearFindings.length
    const openFindings = yearFindings.filter((f) => f.status === 'open').length
    const inProgressFindings = yearFindings.filter((f) => f.status === 'in_progress').length
    const closedFindings = yearFindings.filter((f) => f.status === 'closed').length

    const highRiskFindings = yearFindings.filter((f) => f.risk === 'tinggi').length
    const mediumRiskFindings = yearFindings.filter((f) => f.risk === 'menengah').length
    const lowRiskFindings = yearFindings.filter((f) => f.risk === 'rendah').length

    return {
      totalPrograms,
      totalTasks,
      completedTasks,
      inProgressTasks,
      scheduledTasks,
      completionRate,
      totalFindings,
      openFindings,
      inProgressFindings,
      closedFindings,
      highRiskFindings,
      mediumRiskFindings,
      lowRiskFindings,
    }
  }, [yearPrograms, yearWorkList, yearFindings])

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return months.map((month, index) => {
      const monthTasks = yearWorkList.filter((t) => {
        const startMonth = t.startDate ? new Date(t.startDate).getMonth() : -1
        return startMonth === index
      })
      const completed = monthTasks.filter((t) => t.status === 'completed').length
      return {
        month,
        total: monthTasks.length,
        completed,
      }
    })
  }, [yearWorkList])

  const maxMonthlyTasks = useMemo(() => {
    return Math.max(...monthlyData.map((m) => m.total), 1)
  }, [monthlyData])

  const programDistribution = useMemo(() => {
    return yearPrograms.map((program) => {
      const programTasks = yearWorkList.filter((t) => t.programId === program.id)
      const completed = programTasks.filter((t) => t.status === 'completed').length
      return {
        name: program.name,
        total: programTasks.length,
        completed,
        percentage: programTasks.length > 0 ? Math.round((completed / programTasks.length) * 100) : 0,
      }
    })
  }, [yearPrograms, yearWorkList])

  const maxProgramTasks = useMemo(() => {
    return Math.max(...programDistribution.map((p) => p.total), 1)
  }, [programDistribution])

  function handleYearChange(e) {
    setSelectedYear(Number(e.target.value))
  }

  function handleDecadeChange(e) {
    setSelectedDecade(Number(e.target.value))
  }

  return (
    <section className="page-wrap">
      <div className="page-header">
        <h2>Analytics</h2>
        <p>Analisis performance audit dan trend untuk tahun {selectedYear}</p>
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

      <div className="analytics-year-selector">
        <select
          className="analytics-decade-dropdown"
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
          className="analytics-year-dropdown"
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

      <div className="analytics-stats-grid">
        <article className="card analytics-stat-card">
          <div className="analytics-stat-header">
            <span className="analytics-stat-icon icon-green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <span className="analytics-stat-label">Completion Rate</span>
          </div>
          <div className="analytics-stat-value">{stats.completionRate}%</div>
          <div className="analytics-stat-sub">
            {stats.completedTasks} dari {stats.totalTasks} tugas selesai
          </div>
        </article>

        <article className="card analytics-stat-card">
          <div className="analytics-stat-header">
            <span className="analytics-stat-icon icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="2" />
              </svg>
            </span>
            <span className="analytics-stat-label">Total Findings</span>
          </div>
          <div className="analytics-stat-value">{stats.totalFindings}</div>
          <div className="analytics-stat-sub">
            {stats.openFindings} open, {stats.inProgressFindings} in progress
          </div>
        </article>

        <article className="card analytics-stat-card">
          <div className="analytics-stat-header">
            <span className="analytics-stat-icon icon-red">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span className="analytics-stat-label">High Risk</span>
          </div>
          <div className="analytics-stat-value">{stats.highRiskFindings}</div>
          <div className="analytics-stat-sub">
            {stats.mediumRiskFindings} menengah, {stats.lowRiskFindings} rendah
          </div>
        </article>

        <article className="card analytics-stat-card">
          <div className="analytics-stat-header">
            <span className="analytics-stat-icon icon-purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <span className="analytics-stat-label">In Progress</span>
          </div>
          <div className="analytics-stat-value">{stats.inProgressTasks}</div>
          <div className="analytics-stat-sub">
            {stats.scheduledTasks} scheduled
          </div>
        </article>
      </div>

      <div className="analytics-main-grid">
        <article className="card chart-card">
          <h3>Task Completion per Bulan</h3>
          <div className="bar-chart">
            {monthlyData.map((data, index) => (
              <div className="bar-chart-item" key={index}>
                <div className="bar-chart-bar-wrap">
                  <div
                    className="bar-chart-bar"
                    style={{ height: `${(data.total / maxMonthlyTasks) * 100}%` }}
                  >
                    <div
                      className="bar-chart-bar-completed"
                      style={{ height: `${(data.completed / maxMonthlyTasks) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="bar-chart-label">{data.month}</span>
                <span className="bar-chart-value">{data.completed}/{data.total}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-dot legend-blue" />
              Total Tasks
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-green" />
              Completed
            </span>
          </div>
        </article>

        <article className="card chart-card">
          <h3>Distribusi per Program Kerja</h3>
          <div className="horizontal-bar-chart">
            {programDistribution.length === 0 ? (
              <p className="empty-state">Belum ada data program kerja</p>
            ) : (
              programDistribution.map((program, index) => (
                <div className="h-bar-item" key={index}>
                  <div className="h-bar-label">
                    <span className="h-bar-name">{program.name}</span>
                    <span className="h-bar-count">{program.completed}/{program.total}</span>
                  </div>
                  <div className="h-bar-track">
                    <div
                      className="h-bar-fill"
                      style={{ width: `${(program.total / maxProgramTasks) * 100}%` }}
                    />
                    <div
                      className="h-bar-completed"
                      style={{ width: `${(program.completed / maxProgramTasks) * 100}%` }}
                    />
                  </div>
                  <span className="h-bar-percent">{program.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="analytics-bottom-grid">
        <article className="card findings-card">
          <div className="card-header">
            <h3>Temuan Audit</h3>
            <span className="badge badge-total">{stats.totalFindings} Total</span>
          </div>
          <div className="findings-list">
            {yearFindings.length === 0 ? (
              <p className="empty-state">Belum ada temuan untuk tahun ini</p>
            ) : (
              yearFindings.map((finding) => (
                <div className="finding-item" key={finding.id}>
                  <div className="finding-header">
                    <span className={`risk-badge risk-${finding.risk}`}>
                      {finding.risk === 'tinggi' ? 'Tinggi' : finding.risk === 'menengah' ? 'Menengah' : 'Rendah'}
                    </span>
                    <span className={`status-badge status-${finding.status}`}>
                      {finding.status === 'open' ? 'Open' : finding.status === 'in_progress' ? 'In Progress' : 'Closed'}
                    </span>
                  </div>
                  <p className="finding-title">{finding.title}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card risk-dist-card">
          <h3>Distribusi Risiko</h3>
          <div className="donut-chart-container">
            <svg viewBox="0 0 32 32" className="donut-chart">
              {stats.totalFindings > 0 ? (
                <>
                  <circle
                    className="donut-segment donut-high"
                    cx="16"
                    cy="16"
                    r="12"
                    strokeDasharray={`${(stats.highRiskFindings / stats.totalFindings) * 100} ${100 - (stats.highRiskFindings / stats.totalFindings) * 100}`}
                    strokeDashoffset="0"
                  />
                  <circle
                    className="donut-segment donut-medium"
                    cx="16"
                    cy="16"
                    r="12"
                    strokeDasharray={`${(stats.mediumRiskFindings / stats.totalFindings) * 100} ${100 - (stats.mediumRiskFindings / stats.totalFindings) * 100}`}
                    strokeDashoffset={`${-(stats.highRiskFindings / stats.totalFindings) * 100}`}
                  />
                  <circle
                    className="donut-segment donut-low"
                    cx="16"
                    cy="16"
                    r="12"
                    strokeDasharray={`${(stats.lowRiskFindings / stats.totalFindings) * 100} ${100 - (stats.lowRiskFindings / stats.totalFindings) * 100}`}
                    strokeDashoffset={`${-((stats.highRiskFindings + stats.mediumRiskFindings) / stats.totalFindings) * 100}`}
                  />
                </>
              ) : (
                <circle className="donut-segment donut-empty" cx="16" cy="16" r="12" strokeDasharray="100 0" />
              )}
            </svg>
          </div>
          <div className="risk-legend">
            <div className="risk-legend-item">
              <span className="risk-dot risk-high" />
              <span>Tinggi</span>
              <strong>{stats.highRiskFindings}</strong>
            </div>
            <div className="risk-legend-item">
              <span className="risk-dot risk-medium" />
              <span>Menengah</span>
              <strong>{stats.mediumRiskFindings}</strong>
            </div>
            <div className="risk-legend-item">
              <span className="risk-dot risk-low" />
              <span>Rendah</span>
              <strong>{stats.lowRiskFindings}</strong>
            </div>
          </div>
        </article>

        <article className="card timeline-card">
          <div className="timeline-header">
            <h3>Timeline Audit</h3>
            <div className="timeline-filter-tabs">
              <button
                className={`timeline-filter-tab ${timelineFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setTimelineFilter('upcoming')}
              >
                Mendatang
              </button>
              <button
                className={`timeline-filter-tab ${timelineFilter === 'this-month' ? 'active' : ''}`}
                onClick={() => setTimelineFilter('this-month')}
              >
                Bulan Ini
              </button>
              <button
                className={`timeline-filter-tab ${timelineFilter === 'this-quarter' ? 'active' : ''}`}
                onClick={() => setTimelineFilter('this-quarter')}
              >
                Kuartal Ini
              </button>
              <button
                className={`timeline-filter-tab ${timelineFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTimelineFilter('all')}
              >
                Semua
              </button>
            </div>
          </div>
          <div className="timeline-meta">
            <span className="timeline-count">{filteredTimelineTasks.length} jadwal</span>
            {timelineFilter === 'upcoming' && (
              <span className="timeline-hint">Jadwal terdekat dan sedang berlangsung</span>
            )}
            {timelineFilter === 'this-month' && (
              <span className="timeline-hint">
                {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
            )}
            {timelineFilter === 'this-quarter' && (
              <span className="timeline-hint">
                Q{Math.floor(new Date().getMonth() / 3) + 1} {new Date().getFullYear()}
              </span>
            )}
          </div>
          <div className="timeline">
            {filteredTimelineTasks.length === 0 ? (
              <div className="timeline-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>Tidak ada jadwal dalam periode ini</p>
              </div>
            ) : (
              filteredTimelineTasks.map((task, index) => (
                <div className="timeline-item" key={task.id}>
                  <div className={`timeline-dot timeline-${task.status}`} />
                  <div className="timeline-content">
                    <div className="timeline-item-header">
                      <h4>{task.taskName}</h4>
                      <span className={`timeline-status-badge ${task.status}`}>
                        {task.status === 'completed' ? 'Selesai' : task.status === 'in_progress' ? 'Berlangsung' : 'Mendatang'}
                      </span>
                    </div>
                    <p className="timeline-program">{task.programName}</p>
                    <div className="timeline-date-range">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {formatDate(task.startDate)} - {formatDate(task.endDate)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {timelineFilter === 'all' && filteredTimelineTasks.length > 8 && (
            <div className="timeline-footer">
              <span>Menampilkan {filteredTimelineTasks.length} jadwal</span>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default AnalyticsPage
