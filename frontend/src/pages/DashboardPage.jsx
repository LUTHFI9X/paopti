import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkList, getAuditPlans, getPrograms } from '../services/spiHubApi'

function parseAgendaDate(value) {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (year && month && day) return new Date(year, month - 1, day)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getAgendaDistanceTone(value, baseDate = new Date()) {
  const agendaDate = parseAgendaDate(value)
  if (!agendaDate) return 'far'
  const start = new Date(baseDate)
  start.setHours(0, 0, 0, 0)
  agendaDate.setHours(0, 0, 0, 0)
  const days = Math.ceil((agendaDate - start) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'past'
  if (days <= 3) return 'near'
  if (days <= 7) return 'soon'
  return 'far'
}

function getAgendaDescription(agenda) {
  const parts = [
    agenda.phase_label,
    agenda.note,
    agenda.program_name,
  ].filter(Boolean)

  return parts.length ? parts.join(' • ') : 'Agenda audit terjadwal'
}

function DashboardPage() {
  const year = new Date().getFullYear()
  const today = useMemo(() => new Date(), [])

  const [programs, setPrograms] = useState([])
  const [tasks, setTasks] = useState([])
  const [calendar, setCalendar] = useState([])
  const [progPage, setProgPage] = useState(0)
  const [selectedProg, setSelectedProg] = useState(null)
  const [taskPage, setTaskPage] = useState(0)
  const PAGE = 5

  useEffect(() => {
    let m = true
    async function load() {
      try {
        const [progs, wl, auditPlans] = await Promise.all([
          getPrograms(year),
          getWorkList(year),
          getAuditPlans(year).catch(() => []),
        ])
        if (!m) return
        setPrograms(progs || [])
        const items = (wl?.worklist || []).map(t => ({
          ...t,
          taskName: t.task_name || t.taskName || '',
          programId: t.program_id || t.programId || '',
          programName: t.program_name || t.programName || '',
          startDate: t.start_date || t.startDate || '',
          progress: Number(t.progress || 0),
          status: t.status || 'scheduled',
        }))
        setTasks(items)
        const workListCalendar = items.map((item) => ({
          id: `wl-${item.id}`,
          task_name: item.taskName,
          title: item.taskName,
          program_name: item.programName,
          start_date: item.startDate,
          date: item.startDate,
          location: item.location || '',
          phase_label: 'Program Kerja',
          note: item.pic ? `PIC: ${item.pic}` : '',
          time: item.time || '',
        }))
        const planCalendar = (Array.isArray(auditPlans) ? auditPlans : []).map((plan) => ({
          id: plan.id,
          task_name: plan.task_name || plan.taskName || plan.title || 'Agenda',
          title: plan.title || plan.task_name || plan.taskName || 'Agenda',
          program_name: plan.program_name || plan.programName || '',
          start_date: plan.start_date || plan.startDate || plan.date || '',
          date: plan.date || plan.start_date || plan.startDate || '',
          location: plan.location || '',
          phase_label: plan.phase_label || plan.phaseLabel || '',
          note: plan.note || '',
          time: plan.time || '',
        }))
        setCalendar([...workListCalendar, ...planCalendar].filter((item) => item.start_date || item.date))
      } catch { /* load error ignored */ }
    }
    load()
    const refresh = () => load()
    const refreshTimer = window.setInterval(refresh, 15000)
    window.addEventListener('portalAuditPlans-changed', refresh)
    window.addEventListener('portalWorkList-changed', refresh)
    window.addEventListener('portalPrograms-changed', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      m = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('portalAuditPlans-changed', refresh)
      window.removeEventListener('portalWorkList-changed', refresh)
      window.removeEventListener('portalPrograms-changed', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [year])

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.progress >= 100).length
    const inProgress = tasks.filter(t => t.progress > 0 && t.progress < 100).length
    const scheduled = tasks.filter(t => t.progress === 0).length
    return { total, completed, inProgress, scheduled, programs: programs.length }
  }, [tasks, programs])

  // Programs with paged tasks lookup
  const groupedTasks = useMemo(() => {
    const g = {}
    tasks.forEach(t => {
      if (!g[t.programId]) g[t.programId] = []
      g[t.programId].push(t)
    })
    return g
  }, [tasks])

  const programProgressRows = useMemo(() => {
    return programs.map((program) => {
      const programTasks = groupedTasks[program.id] || []
      const progress = programTasks.length
        ? Math.round(programTasks.reduce((sum, task) => sum + task.progress, 0) / programTasks.length)
        : 0

      return {
        program,
        tasks: programTasks,
        progress,
        completed: programTasks.filter((task) => task.progress >= 100).length,
        inProgress: programTasks.filter((task) => task.progress > 0 && task.progress < 100).length,
      }
    })
  }, [programs, groupedTasks])

  const overallProgramProgress = programProgressRows.length
    ? Math.round(programProgressRows.reduce((sum, row) => sum + row.progress, 0) / programProgressRows.length)
    : 0

  const attentionItems = useMemo(() => {
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)

    const taskSignals = tasks
      .map((task) => {
        const date = parseAgendaDate(task.startDate)
        if (!date || task.progress >= 100) return null
        date.setHours(0, 0, 0, 0)
        const days = Math.ceil((date - start) / (1000 * 60 * 60 * 24))

        if (days < 0) {
          return {
            id: `task-overdue-${task.id}`,
            tone: 'danger',
            label: 'Terlambat',
            title: task.taskName,
            meta: task.programName || 'Program kerja',
            date: task.startDate,
            path: '/work-list',
            rank: 0,
          }
        }
        if (days === 0) {
          return {
            id: `task-today-${task.id}`,
            tone: 'today',
            label: 'Hari ini',
            title: task.taskName,
            meta: task.programName || 'Program kerja',
            date: task.startDate,
            path: '/work-list',
            rank: 1,
          }
        }
        if (days <= 7) {
          return {
            id: `task-soon-${task.id}`,
            tone: 'soon',
            label: `H-${days}`,
            title: task.taskName,
            meta: task.programName || 'Program kerja',
            date: task.startDate,
            path: '/work-list',
            rank: 2 + days,
          }
        }
        return null
      })
      .filter(Boolean)

    const agendaSignals = calendar
      .map((agenda) => {
        const dateValue = agenda.start_date || agenda.date
        const date = parseAgendaDate(dateValue)
        if (!date) return null
        date.setHours(0, 0, 0, 0)
        const days = Math.ceil((date - start) / (1000 * 60 * 60 * 24))
        if (days < 0 || days > 7) return null

        return {
          id: `agenda-${agenda.id}`,
          tone: days === 0 ? 'today' : 'soon',
          label: days === 0 ? 'Agenda hari ini' : `Agenda H-${days}`,
          title: agenda.task_name || agenda.title || 'Agenda audit',
          meta: getAgendaDescription(agenda),
          date: dateValue,
          path: '/audit-plan',
          rank: days === 0 ? 1 : 5 + days,
        }
      })
      .filter(Boolean)

    return [...taskSignals, ...agendaSignals]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
  }, [calendar, tasks, today])

  // Paged programs
  const totalProgPages = Math.max(1, Math.ceil(programProgressRows.length / PAGE))
  const pagedProgs = programProgressRows.slice(progPage * PAGE, (progPage + 1) * PAGE)

  // Tasks of selected prog
  const selectedProgTasks = selectedProg ? (groupedTasks[selectedProg.id] || []) : []
  const totalTaskPages = Math.max(1, Math.ceil(selectedProgTasks.length / PAGE))
  const pagedTasks = selectedProgTasks.slice(taskPage * PAGE, (taskPage + 1) * PAGE)

  // Mini calendar
  const calYear = today.getFullYear()
  const calMonth = today.getMonth()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const eventDateTones = useMemo(() => {
    const priority = { near: 4, soon: 3, far: 2, past: 1 }
    const tones = new Map()
    calendar.forEach((item) => {
      const date = parseAgendaDate(item.start_date || item.date || '')
      if (!date || date.getFullYear() !== calYear || date.getMonth() !== calMonth) return
      const tone = getAgendaDistanceTone(item.start_date || item.date, today)
      const key = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`
      const current = tones.get(key)
      if (!current || priority[tone] > priority[current]) {
        tones.set(key, tone)
      }
    })
    return tones
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [calendar, calMonth, calYear, today])
  const DOW = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

  // Upcoming agenda (next 5)
  // Upcoming agenda (next 5)
  const upcoming = useMemo(() => {
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    return [...calendar]
      .filter(c => {
        const d = parseAgendaDate(c.start_date || c.date || '')
        return d && d >= todayStart
      })
      .sort((a, b) => parseAgendaDate(a.start_date || a.date) - parseAgendaDate(b.start_date || b.date))
      .slice(0, 5)
  }, [calendar, today])

  function fmtDate(s) {
    if (!s) return '-'
    return new Date(s).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
  }

  return (
    <section className="dashboard-shell dashboard-shell-redesign">
      <div className="dashboard-page-head">
        <div>
          <h2>Dashboard</h2>
          <p>Aktivitas dan agenda audit tahun {year}</p>
        </div>
        <div className="dashboard-year-chip">{year}</div>
      </div>

      {/* Stat Cards */}
      <div className="dash-stat-cards">
        <div className="dash-stat-card dash-stat-programs">
          <div className="dash-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{stats.programs}</div>
            <div className="dash-stat-label">Program Kerja</div>
          </div>
        </div>
        <div className="dash-stat-card dash-stat-total">
          <div className="dash-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{stats.total}</div>
            <div className="dash-stat-label">Total Tugas</div>
          </div>
        </div>
        <div className="dash-stat-card dash-stat-done">
          <div className="dash-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{stats.completed}</div>
            <div className="dash-stat-label">Selesai</div>
          </div>
        </div>
        <div className="dash-stat-card dash-stat-active">
          <div className="dash-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{stats.inProgress}</div>
            <div className="dash-stat-label">Berlangsung</div>
          </div>
        </div>
        <div className="dash-stat-card dash-stat-overall">
          <div className="dash-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{overallProgramProgress}%</div>
            <div className="dash-stat-label">Overall Progress</div>
            <div className="dash-stat-mini-progress">
              <div className="dash-stat-mini-fill" style={{ width: `${overallProgramProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="dash-focus-panel">
        <div className="dash-focus-head">
          <div>
            <h3>Prioritas Hari Ini</h3>
            <p>Tugas dan agenda yang perlu segera diperhatikan</p>
          </div>
          <div className="dash-focus-actions">
            <Link to="/work-list" className="dash-focus-link">List Pekerjaan</Link>
            <Link to="/audit-plan" className="dash-focus-link">Rencana Kegiatan</Link>
          </div>
        </div>
        {attentionItems.length === 0 ? (
          <div className="empty-state-pro empty-state-pro--compact">
            <div className="empty-state-pro__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <strong>Tidak ada prioritas mendesak</strong>
              <span>Semua agenda kritis untuk minggu ini terlihat aman.</span>
            </div>
          </div>
        ) : (
          <div className="dash-focus-list">
            {attentionItems.map((item) => (
              <Link key={item.id} to={item.path} className={`dash-focus-item dash-focus-item--${item.tone}`}>
                <span className="dash-focus-badge">{item.label}</span>
                <span className="dash-focus-body">
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </span>
                <span className="dash-focus-date">{fmtDate(item.date)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="dash-grid" style={{ marginTop:16 }}>

        {/* Left: Programs + Tasks */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Program list card */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Program Kerja
              </span>
              {selectedProg && (
                <button
                  onClick={() => { setSelectedProg(null); setTaskPage(0) }}
                  style={{ fontSize:12, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                >
                  ← Semua Program
                </button>
              )}
            </div>

            {!selectedProg ? (
              <>
                <div className="dash-card-body">
                  {pagedProgs.length === 0 ? (
                    <div style={{ padding:16, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Belum ada program</div>
                  ) : pagedProgs.map((row, index) => {
                    const prog = row.program
                    const ptasks = row.tasks
                    const pct = row.progress
                    return (
                      <div key={prog.id} className="dash-prog-row" onClick={() => { setSelectedProg(prog); setTaskPage(0) }}>
                        <div className="dash-prog-index">{progPage * PAGE + index + 1}</div>
                        <div className="dash-prog-main">
                          <div className="dash-prog-name">{prog.name}</div>
                          <div className="dash-prog-sub">
                            <span>{ptasks.length} tugas</span>
                            <span>{row.completed} selesai</span>
                            <span>{row.inProgress} berlangsung</span>
                          </div>
                        </div>
                        <div className="dash-prog-progress">
                          <div className="dash-prog-bar">
                            <div className="dash-prog-bar-fill" style={{ width:`${pct}%` }} />
                          </div>
                          <span className="dash-prog-pct">{pct}%</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color:'var(--muted)', flexShrink:0 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    )
                  })}
                </div>
                {programs.length > PAGE && (
                  <div className="dash-pagination">
                    <button className="dash-pg-btn" disabled={progPage===0} onClick={() => setProgPage(p=>p-1)}>‹</button>
                    <span className="dash-pg-info">{progPage+1} / {totalProgPages}</span>
                    <button className="dash-pg-btn" disabled={progPage>=totalProgPages-1} onClick={() => setProgPage(p=>p+1)}>›</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="dash-card-body">
                  <div style={{ padding:'8px 18px', fontSize:13, color:'var(--muted)', fontWeight:600, background:'var(--panel)', borderBottom:'1px solid var(--line)' }}>
                    {selectedProg.name}
                  </div>
                  {pagedTasks.length === 0 ? (
                    <div style={{ padding:16, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Belum ada tugas</div>
                  ) : pagedTasks.map((t, i) => (
                    <div key={t.id || i} className="dash-task-row">
                      <span style={{ width:22, height:22, borderRadius:5, background:'var(--panel)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--brand-strong)', flexShrink:0 }}>
                        {taskPage * PAGE + i + 1}
                      </span>
                      <div className="dash-task-name">{t.taskName}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:50, height:4, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${t.progress}%`, background:'var(--brand)', borderRadius:99 }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--brand-strong)', minWidth:30 }}>{t.progress}%</span>
                      </div>
                      <div className="dash-task-date">{fmtDate(t.startDate)}</div>
                    </div>
                  ))}
                </div>
                {selectedProgTasks.length > PAGE && (
                  <div className="dash-pagination">
                    <button className="dash-pg-btn" disabled={taskPage===0} onClick={() => setTaskPage(p=>p-1)}>‹</button>
                    <span className="dash-pg-info">{taskPage+1} / {totalTaskPages}</span>
                    <button className="dash-pg-btn" disabled={taskPage>=totalTaskPages-1} onClick={() => setTaskPage(p=>p+1)}>›</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status distribution card */}
          <div className="dash-card dash-status-card">
            <div className="dash-card-header">
              <span className="dash-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-7"/>
                </svg>
                Status Tugas
              </span>
            </div>
            <div className="dash-status-list">
              <div className="dash-status-item scheduled">
                <span>Terjadwal</span>
                <strong>{stats.scheduled}</strong>
              </div>
              <div className="dash-status-item active">
                <span>Berlangsung</span>
                <strong>{stats.inProgress}</strong>
              </div>
              <div className="dash-status-item done">
                <span>Selesai</span>
                <strong>{stats.completed}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mini Calendar + Agenda */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Mini Calendar */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {today.toLocaleDateString('id-ID', { month:'long', year:'numeric' })}
              </span>
            </div>
            <div className="dash-cal-grid">
              {DOW.map(d => <div key={d} className="dash-cal-dow">{d}</div>)}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={'e'+i} className="dash-cal-day empty">-</div>
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const isToday = day === today.getDate()
                const eventTone = eventDateTones.get(`${day}-${calMonth}-${calYear}`)
                const hasEv = Boolean(eventTone)
                return (
                  <div
                    key={day}
                    className={`dash-cal-day ${isToday ? 'today' : ''} ${hasEv ? `has-event event-${eventTone}` : ''}`}
                    title={hasEv ? 'Ada agenda' : undefined}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Agenda */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Agenda Terdekat
              </span>
            </div>
            <div className="dash-card-body">
              {upcoming.length === 0 ? (
                <div style={{ padding:16, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Tidak ada agenda mendatang</div>
              ) : upcoming.map((c, i) => {
                const tone = getAgendaDistanceTone(c.start_date || c.date, today)
                return (
                <div key={i} className={`dash-agenda-item event-${tone}`}>
                  <div className={`dash-agenda-dot event-${tone}`} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="dash-agenda-name">{c.task_name || c.title || 'Agenda'}</div>
                    <div className="dash-agenda-desc">{getAgendaDescription(c)}</div>
                    <div className="dash-agenda-date">
                      {fmtDate(c.start_date || c.date)}{c.time ? ` • ${c.time}` : ''}
                    </div>
                  </div>
                  {c.location && (
                    <div className="dash-agenda-location">{c.location}</div>
                  )}
                </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default DashboardPage
