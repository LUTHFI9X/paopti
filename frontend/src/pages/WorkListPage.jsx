import { useState, useEffect, useMemo } from 'react'
import { useUser, ROLES } from '../context/UserContext'
import {
  createProgram,
  createWorkItem,
  deleteProgram,
  deleteWorkItem,
  getPrograms,
  getWorkList,
  updateProgram,
  updateWorkItem,
  updateWorkItemProgress,
} from '../services/spiHubApi'

const PROGRESS_OPTIONS = [
  { value: 0, label: '0% - Start', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 50, label: '50% - On Progress', color: '#0c3d86', bg: '#e8efff' },
  { value: 100, label: '100% - Selesai', color: '#22a95f', bg: '#e6f7ed' },
]

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
  const startDate = task.startDate || task.start_date || task.date || ''
  const endDate = task.endDate || task.end_date || task.date || startDate
  const programId = task.programId || task.program_id || ''
  const programName = task.programName || task.program_name || ''
  const taskName = task.taskName || task.task_name || ''
  const taskId = task.taskId || task.task_id || ''
  const progress = normalizeProgress(task.progress)

  return {
    ...task,
    year: Number(task.year) || fallbackYear,
    programId,
    programName,
    taskId,
    taskName,
    startDate,
    endDate,
    date: startDate,
    location: task.location || '',
    pic: task.pic || '',
    progress,
    status: statusFromProgress(progress),
  }
}

function buildTaskPayload(task) {
  return {
    id: task.id,
    task_id: task.taskId,
    program_id: task.programId,
    program_name: task.programName,
    task_name: task.taskName,
    start_date: task.startDate,
    end_date: task.endDate,
    location: task.location || '',
    pic: task.pic || '',
    progress: task.progress,
    year: task.year,
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

const initialPrograms = []
const initialWorkList = []

function WorkListPage() {
  const { user, hasPermission } = useUser()
  const canEdit = hasPermission('canEditWorkList')
  const canDelete = hasPermission('canDeleteWorkList')
  const isKSPI = user?.role === ROLES.KSPI

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedDecade, setSelectedDecade] = useState(Math.floor(currentYear / 10) * 10)
  const [programs, setPrograms] = useState([])
  const [workList, setWorkList] = useState([])
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingProgramId, setEditingProgramId] = useState(null)
  const [selectedProgramId, setSelectedProgramId] = useState(null)

  const [programFormData, setProgramFormData] = useState({ name: '' })

  const [taskFormData, setTaskFormData] = useState({
    programId: '',
    taskName: '',
    startDate: '',
    endDate: '',
    location: '',
    pic: '',
    progress: 0,
  })

  // Generate decades (from 2020 to 2050)
  const decades = useMemo(() => {
    const currentCentury = Math.floor(currentYear / 100) * 100
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
    // Auto-select first year of decade or current year if in decade
    if (currentYear >= decade && currentYear < decade + 10) {
      setSelectedYear(currentYear)
    } else {
      setSelectedYear(decade)
    }
  }

  // Handle year change
  function handleYearChange(e) {
    setSelectedYear(Number(e.target.value))
  }

  useEffect(() => {
    let cancelled = false

    async function loadWorkList() {
      try {
        const [programResponse, workListResponse] = await Promise.all([
          getPrograms(selectedYear),
          getWorkList(selectedYear),
        ])
        if (cancelled) return

        const apiPrograms = programResponse || []
        const apiWorkList = (workListResponse.worklist || []).map(normalizeTask)
        const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(apiPrograms, apiWorkList)

        setPrograms(migratedPrograms)
        setWorkList(migratedTasks)
        localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
        localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
        window.dispatchEvent(new Event('portalPrograms-changed'))
        window.dispatchEvent(new Event('portalWorkList-changed'))
      } catch (error) {
        if (cancelled) return

        const savedPrograms = localStorage.getItem('portalAoptiPrograms')
        const savedWorkList = localStorage.getItem('portalAoptiWorkList')

        if (savedPrograms && savedWorkList) {
          const rawPrograms = JSON.parse(savedPrograms)
          const rawTasks = JSON.parse(savedWorkList)
          const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(rawPrograms, rawTasks)
          setPrograms(migratedPrograms)
          setWorkList(migratedTasks)
        } else {
          setPrograms([])
          setWorkList([])
        }
      } finally {
      }
    }

    loadWorkList()

    return () => {
      cancelled = true
    }
  }, [selectedYear])

  const filteredWorkList = workList.filter((item) => item.year === selectedYear)
  const yearPrograms = useMemo(
    () => programs.filter((p) => p.year === selectedYear),
    [programs, selectedYear]
  )

  const groupedWorkList = useMemo(() => {
    const grouped = {}
    filteredWorkList.forEach((item) => {
      if (!grouped[item.programId]) {
        const program = yearPrograms.find((p) => p.id === item.programId)
        grouped[item.programId] = {
          program: program || { id: item.programId, name: item.programName },
          tasks: [],
        }
      }
      grouped[item.programId].tasks.push(item)
    })
    return grouped
  }, [filteredWorkList, yearPrograms])

  const stats = useMemo(() => {
    const total = filteredWorkList.length
    const scheduled = filteredWorkList.filter((i) => i.status === 'scheduled').length
    const inProgress = filteredWorkList.filter((i) => i.status === 'in_progress').length
    const completed = filteredWorkList.filter((i) => i.status === 'completed').length
    const avgProgress = total > 0
      ? Math.round(filteredWorkList.reduce((sum, t) => sum + normalizeProgress(t.progress), 0) / total)
      : 0
    return { total, scheduled, inProgress, completed, avgProgress }
  }, [filteredWorkList])

  const selectedGroup = selectedProgramId ? groupedWorkList[selectedProgramId] : null
  const selectedProgram = selectedGroup?.program || null

  function getProgramProgress(group) {
    if (group.tasks.length === 0) return 0
    const total = group.tasks.reduce((sum, t) => sum + normalizeProgress(t.progress), 0)
    return Math.round(total / group.tasks.length)
  }

  function getProgramStats(group) {
    const completed = group.tasks.filter(t => t.status === 'completed').length
    const inProgress = group.tasks.filter(t => t.status === 'in_progress').length
    const scheduled = group.tasks.filter(t => t.status === 'scheduled').length
    return { completed, inProgress, scheduled, total: group.tasks.length }
  }

  function getStatusInfo(status) {
    const map = {
      scheduled: { label: 'Terjadwal', color: '#6f7a94', bg: '#f4f6ff' },
      in_progress: { label: 'Berlangsung', color: '#0c3d86', bg: '#e8efff' },
      completed: { label: 'Selesai', color: '#22a95f', bg: '#e6f7ed' },
    }
    return map[status] || map.scheduled
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  // Program handlers
  function handleProgramSubmit(e) {
    e.preventDefault()
    if (!programFormData.name.trim()) {
      alert('Nama Program Kerja wajib diisi')
      return
    }

    const submitProgram = async () => {
      if (editingProgramId) {
        await updateProgram(editingProgramId, { name: programFormData.name.trim(), year: selectedYear })
      } else {
        await createProgram({ name: programFormData.name.trim(), year: selectedYear })
      }

      setProgramFormData({ name: '' })
      setEditingProgramId(null)
      setShowProgramForm(false)
      const [programResponse, workListResponse] = await Promise.all([
        getPrograms(selectedYear),
        getWorkList(selectedYear),
      ])
      const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(programResponse || [], (workListResponse.worklist || []).map(normalizeTask))
      setPrograms(migratedPrograms)
      setWorkList(migratedTasks)
      localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
      localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
      window.dispatchEvent(new Event('portalPrograms-changed'))
      window.dispatchEvent(new Event('portalWorkList-changed'))
    }

    submitProgram().catch(() => alert('Gagal menyimpan program kerja'))
  }

  function handleEditProgram(program) {
    setEditingProgramId(program.id)
    setProgramFormData({ name: program.name })
    setShowProgramForm(true)
  }

  function handleDeleteProgram(programId) {
    const programTasks = workList.filter((item) => item.programId === programId)
    if (programTasks.length > 0) {
      alert(`Tidak bisa hapus! Program ini masih memiliki ${programTasks.length} tugas. Hapus tugas terlebih dahulu.`)
      return
    }
    if (confirm('Hapus Program Kerja ini?')) {
      deleteProgram(programId)
        .then(() => Promise.all([getPrograms(selectedYear), getWorkList(selectedYear)]))
        .then(([programResponse, workListResponse]) => {
          const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(programResponse || [], (workListResponse.worklist || []).map(normalizeTask))
          setPrograms(migratedPrograms)
          setWorkList(migratedTasks)
          localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
          localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
          window.dispatchEvent(new Event('portalPrograms-changed'))
          window.dispatchEvent(new Event('portalWorkList-changed'))
          if (selectedProgramId === programId) {
            setSelectedProgramId(null)
          }
        })
        .catch(() => alert('Gagal menghapus program kerja'))
    }
  }

  function resetProgramForm() {
    setProgramFormData({ name: '' })
    setEditingProgramId(null)
    setShowProgramForm(false)
  }

  // Task handlers
  function handleTaskSubmit(e) {
    e.preventDefault()
    if (!taskFormData.programId || !taskFormData.taskName.trim()) {
      alert('Pilih Program Kerja dan isi Nama Tugas')
      return
    }
    if (!taskFormData.pic.trim()) {
      alert('PIC (Penanggung Jawab) wajib diisi')
      return
    }

    const program = programs.find((p) => p.id === taskFormData.programId)
    const progress = normalizeProgress(taskFormData.progress)

    const newItem = {
      id: editingId || `task${Date.now()}`,
      year: selectedYear,
      programId: taskFormData.programId,
      programName: program?.name || '',
      taskId: editingId ? workList.find(w => w.id === editingId)?.taskId : `task${Date.now()}`,
      taskName: taskFormData.taskName.trim(),
      startDate: taskFormData.startDate,
      endDate: taskFormData.endDate || taskFormData.startDate,
      date: taskFormData.startDate,
      location: taskFormData.location,
      pic: taskFormData.pic,
      progress,
      status: statusFromProgress(progress),
    }

    const submitTask = async () => {
      if (editingId) {
        await updateWorkItem(editingId, buildTaskPayload(newItem))
      } else {
        await createWorkItem(buildTaskPayload(newItem))
      }

      resetTaskForm()
      const [programResponse, workListResponse] = await Promise.all([
        getPrograms(selectedYear),
        getWorkList(selectedYear),
      ])
      const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(programResponse || [], (workListResponse.worklist || []).map(normalizeTask))
      setPrograms(migratedPrograms)
      setWorkList(migratedTasks)
      localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
      localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
      window.dispatchEvent(new Event('portalPrograms-changed'))
      window.dispatchEvent(new Event('portalWorkList-changed'))
    }

    submitTask().catch(() => alert('Gagal menyimpan tugas'))
  }

  function handleEditTask(item) {
    setEditingId(item.id)
    setTaskFormData({
      programId: item.programId,
      taskName: item.taskName,
      startDate: item.startDate,
      endDate: item.endDate,
      location: item.location || '',
      pic: item.pic || '',
      progress: item.progress,
    })
    setShowTaskForm(true)
  }

  function handleDeleteTask(id) {
    if (confirm('Hapus tugas ini?')) {
      deleteWorkItem(id)
        .then(() => Promise.all([getPrograms(selectedYear), getWorkList(selectedYear)]))
        .then(([programResponse, workListResponse]) => {
          const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(programResponse || [], (workListResponse.worklist || []).map(normalizeTask))
          setPrograms(migratedPrograms)
          setWorkList(migratedTasks)
          localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
          localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
          window.dispatchEvent(new Event('portalPrograms-changed'))
          window.dispatchEvent(new Event('portalWorkList-changed'))
        })
        .catch(() => alert('Gagal menghapus tugas'))
    }
  }

  function handleProgressChange(id, newProgress) {
    const progress = normalizeProgress(newProgress)
    updateWorkItemProgress(id, { progress })
      .then(() => Promise.all([getPrograms(selectedYear), getWorkList(selectedYear)]))
      .then(([programResponse, workListResponse]) => {
        const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(programResponse || [], (workListResponse.worklist || []).map(normalizeTask))
        setPrograms(migratedPrograms)
        setWorkList(migratedTasks)
        localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
        localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
        window.dispatchEvent(new Event('portalPrograms-changed'))
        window.dispatchEvent(new Event('portalWorkList-changed'))
      })
      .catch(() => alert('Gagal mengupdate progress'))
  }

  function resetTaskForm() {
    setTaskFormData({
      programId: '',
      taskName: '',
      startDate: '',
      endDate: '',
      location: '',
      pic: '',
      progress: 0,
    })
    setEditingId(null)
    setShowTaskForm(false)
  }

  function handleSelectProgram(programId) {
    setSelectedProgramId(programId)
    setTaskFormData((prev) => ({ ...prev, programId }))
  }

  const availablePrograms = programs.filter(p => p.year === selectedYear)

  return (
    <div className="wl-container">
      {/* Header Section */}
      <div className="wl-header">
        <div className="wl-header-left">
          <h1>Program Kerja Audit</h1>
          <p>Kelola program kerja dan jadwal kegiatan audit tahunan</p>
        </div>
        <div className="wl-header-actions">
          {canEdit && (
            <>
              <button
                className={`wl-btn wl-btn-outline ${showProgramForm ? 'active' : ''}`}
                onClick={() => { setShowProgramForm(!showProgramForm); setShowTaskForm(false) }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                {showProgramForm ? 'Tutup' : 'Program Baru'}
              </button>
              <button
                className={`wl-btn wl-btn-primary ${showTaskForm ? 'active' : ''}`}
                onClick={() => { setShowTaskForm(!showTaskForm); setShowProgramForm(false) }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {showTaskForm ? 'Tutup' : 'Tugas Baru'}
              </button>
            </>
          )}
          {isKSPI && (
            <span className="wl-readonly-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Mode Baca Saja
            </span>
          )}
        </div>
      </div>

      {/* Year Selector */}
      <div className="wl-year-selector">
        <div className="wl-decade-selector">
          <div className="wl-selector-group">
            <label className="wl-selector-label">Dekade</label>
            <select
              className="wl-decade-dropdown"
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
          <div className="wl-selector-group">
            <label className="wl-selector-label">Tahun</label>
            <select
              className="wl-year-dropdown-new"
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
        <div className="wl-current-year-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {selectedYear}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="wl-stats-grid">
        <div className="wl-stat-card wl-stat-total">
          <div className="wl-stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="wl-stat-content">
            <span className="wl-stat-value">{stats.total}</span>
            <span className="wl-stat-label">Total Tugas</span>
          </div>
        </div>
        <div className="wl-stat-card wl-stat-scheduled">
          <div className="wl-stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="wl-stat-content">
            <span className="wl-stat-value">{stats.scheduled}</span>
            <span className="wl-stat-label">Terjadwal</span>
          </div>
        </div>
        <div className="wl-stat-card wl-stat-progress">
          <div className="wl-stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="wl-stat-content">
            <span className="wl-stat-value">{stats.inProgress}</span>
            <span className="wl-stat-label">Berlangsung</span>
          </div>
        </div>
        <div className="wl-stat-card wl-stat-completed">
          <div className="wl-stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="wl-stat-content">
            <span className="wl-stat-value">{stats.completed}</span>
            <span className="wl-stat-label">Selesai</span>
          </div>
        </div>
        <div className="wl-stat-card wl-stat-overall">
          <div className="wl-stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="wl-stat-content">
            <span className="wl-stat-value">{stats.avgProgress}%</span>
            <span className="wl-stat-label">Overall Progress</span>
          </div>
          <div className="wl-stat-progress-bar">
            <div className="wl-stat-progress-fill" style={{ width: `${stats.avgProgress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Forms Section */}
      <div className="wl-forms-container">
        {/* Program Form */}
        {showProgramForm && (
          <div className="wl-form-card wl-program-form">
            <div className="wl-form-header">
              <div className="wl-form-icon wl-form-icon-program">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h3>{editingProgramId ? 'Edit Program Kerja' : 'Tambah Program Kerja'}</h3>
                <p>Program kerja adalah kategori utama untuk pengelompokan tugas audit</p>
              </div>
            </div>
            <form onSubmit={handleProgramSubmit} className="wl-form">
              <div className="wl-form-group">
                <label>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Nama Program Kerja
                </label>
                <input
                  type="text"
                  value={programFormData.name}
                  onChange={(e) => setProgramFormData({ name: e.target.value })}
                  placeholder="Contoh: Pemenuhan Program Pengawasan"
                  required
                />
              </div>
              <div className="wl-form-actions">
                <button type="button" className="wl-btn wl-btn-secondary" onClick={resetProgramForm}>
                  Batal
                </button>
                <button type="submit" className="wl-btn wl-btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {editingProgramId ? 'Simpan' : 'Tambah Program'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Task Form */}
        {showTaskForm && (
          <div className="wl-form-card wl-task-form">
            <div className="wl-form-header">
              <div className="wl-form-icon wl-form-icon-task">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <h3>{editingId ? 'Edit Tugas' : 'Tambah Tugas Baru'}</h3>
                <p>Buat jadwal tugas audit dalam program kerja</p>
              </div>
            </div>
            <form onSubmit={handleTaskSubmit} className="wl-form">
              <div className="wl-form-row">
                <div className="wl-form-group">
                  <label>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    Program Kerja
                  </label>
                  <select
                    value={taskFormData.programId}
                    onChange={(e) => setTaskFormData((prev) => ({ ...prev, programId: e.target.value }))}
                    required
                  >
                    <option value="">Pilih Program Kerja</option>
                    {availablePrograms.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                </div>
                <div className="wl-form-group">
                  <label>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Nama Tugas
                  </label>
                  <input
                    type="text"
                    value={taskFormData.taskName}
                    onChange={(e) => setTaskFormData((prev) => ({ ...prev, taskName: e.target.value }))}
                    placeholder="Contoh: Audit MBG"
                    required
                  />
                </div>
              </div>
              <div className="wl-form-row">
                <div className="wl-form-group">
                  <label>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                    </svg>
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={taskFormData.startDate}
                    onChange={(e) => setTaskFormData((prev) => ({ ...prev, startDate: e.target.value, endDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="wl-form-group">
                  <label>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                    </svg>
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={taskFormData.endDate}
                    onChange={(e) => setTaskFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="wl-form-group wl-form-group-full">
                <label>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Lokasi
                </label>
                <input
                  type="text"
                  value={taskFormData.location}
                  onChange={(e) => setTaskFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Masukkan lokasi audit"
                />
              </div>
              <div className="wl-form-group wl-form-group-full">
                <label>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  PIC (Penanggung Jawab)
                </label>
                <input
                  type="text"
                  value={taskFormData.pic}
                  onChange={(e) => setTaskFormData((prev) => ({ ...prev, pic: e.target.value }))}
                  placeholder="Masukkan nama penanggung jawab"
                  required
                />
              </div>
              <div className="wl-form-group wl-form-group-full">
                <label>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  Progress
                </label>
                <div className="wl-progress-options">
                  {PROGRESS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`wl-progress-option ${taskFormData.progress === opt.value ? 'active' : ''}`}
                      style={{ '--opt-color': opt.color, '--opt-bg': opt.bg }}
                      onClick={() => setTaskFormData((prev) => ({ ...prev, progress: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="wl-form-actions">
                <button type="button" className="wl-btn wl-btn-secondary" onClick={resetTaskForm}>
                  Batal
                </button>
                <button type="submit" className="wl-btn wl-btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {editingId ? 'Simpan Perubahan' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Tables Section */}
      <div className="wl-tables-container">
        {/* Table 1: Program Kerja */}
        <div className="wl-table-section">
          <div className="wl-table-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Daftar Program Kerja
            </h3>
            <span className="wl-table-count">{yearPrograms.length} program</span>
          </div>
          <div className="wl-table-wrapper">
            <table className="wl-table wl-program-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Nama Program Kerja</th>
                  <th style={{ width: '100px' }}>Jumlah Tugas</th>
                  <th style={{ width: '150px' }}>Progress</th>
                  <th style={{ width: '120px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {yearPrograms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="wl-table-empty">
                      <div className="wl-empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <p>Belum ada program kerja</p>
                        <button className="wl-btn wl-btn-primary wl-btn-sm" onClick={() => setShowProgramForm(true)}>
                          Tambah Program
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  yearPrograms.map((program, index) => {
                    const group = groupedWorkList[program.id] || { tasks: [] }
                    const tasksCount = group.tasks.length
                    const progress = tasksCount > 0
                      ? Math.round(group.tasks.reduce((sum, t) => sum + normalizeProgress(t.progress), 0) / tasksCount)
                      : 0
                    const isSelected = selectedProgramId === program.id
                    const completed = group.tasks.filter(t => t.status === 'completed').length
                    const inProgress = group.tasks.filter(t => t.status === 'in_progress').length

                    return (
                      <tr
                        key={program.id}
                        className={`wl-program-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectProgram(program.id)}
                      >
                        <td className="wl-row-number">{index + 1}</td>
                        <td className="wl-program-name">
                          <div className="wl-program-name-content">
                            <span className="wl-program-name-text">{program.name}</span>
                            {tasksCount > 0 && (
                              <span className="wl-program-substats">
                                <span className="wl-substat completed">{completed} selesai</span>
                                <span className="wl-substat in-progress">{inProgress} berlangsung</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="wl-tasks-count">
                          <span className={`wl-count-badge ${tasksCount === 0 ? 'empty' : ''}`}>
                            {tasksCount} tugas
                          </span>
                        </td>
                        <td className="wl-program-progress">
                          <div className="wl-progress-bar-wrapper">
                            <div className="wl-progress-bar">
                              <div className="wl-progress-bar-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="wl-progress-value">{progress}%</span>
                          </div>
                        </td>
                        <td className="wl-actions">
                          {canEdit && (
                            <>
                              <button
                                className="wl-action-btn wl-action-edit"
                                onClick={(e) => { e.stopPropagation(); handleEditProgram(program) }}
                                title="Edit"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              {canDelete && (
                                <button
                                  className="wl-action-btn wl-action-delete"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteProgram(program.id) }}
                                  title="Hapus"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedProgram && (
          <div className="wl-table-section wl-program-detail-panel active">
            <div className="wl-table-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                {selectedProgram.name}
              </h3>
              <span className="wl-table-count">{selectedGroup?.tasks.length || 0} tugas</span>
            </div>
            <div className="wl-program-detail-list">
              {selectedGroup?.tasks.length > 0 ? (
                selectedGroup.tasks.map((task, index) => {
                  const statusInfo = getStatusInfo(task.status)
                  return (
                    <div key={task.id} className={`wl-program-detail-item ${task.status === 'completed' ? 'completed' : ''}`}>
                      <div className="wl-program-detail-index">{index + 1}</div>
                      <div className="wl-program-detail-main">
                        <div className="wl-task-name-content">
                          <span className="wl-task-name-text">{task.taskName}</span>
                          {task.location && (
                            <span className="wl-task-location">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              {task.location}
                            </span>
                          )}
                        </div>
                        <div className="wl-task-meta-grid">
                          <span><strong>PIC:</strong> {task.pic || '-'}</span>
                          <span><strong>Mulai:</strong> {formatDateShort(task.startDate)}</span>
                          <span><strong>Selesai:</strong> {formatDateShort(task.endDate)}</span>
                          <span><strong>Status:</strong> {statusInfo.label}</span>
                        </div>
                        <div className="wl-progress-bar-wrapper">
                          <div className="wl-progress-bar">
                            <div className="wl-progress-bar-fill" style={{ width: `${task.progress}%` }}></div>
                          </div>
                          <span className="wl-progress-value">{task.progress}%</span>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="wl-program-detail-actions">
                          <button className="wl-action-btn wl-action-edit" onClick={() => handleEditTask(task)} title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {canDelete && (
                            <button className="wl-action-btn wl-action-delete" onClick={() => handleDeleteTask(task.id)} title="Hapus">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="wl-table-empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  <p>Belum ada tugas dalam program ini</p>
                  {canEdit && (
                    <button className="wl-btn wl-btn-primary wl-btn-sm" onClick={() => { setShowTaskForm(true); setTaskFormData((prev) => ({ ...prev, programId: selectedProgramId })) }}>
                      Tambah Tugas
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkListPage
