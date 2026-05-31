import { useState, useEffect, useMemo } from 'react'
import { useUser, ROLES } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import {
  createProgram,
  createWorkItem,
  deleteProgram,
  deleteWorkItem,
  getAuditPlans,
  getPrograms,
  getWorkList,
  updateProgram,
  updateWorkItem,
  updateWorkItemProgress,
} from '../services/spiHubApi'

const PROGRESS_OPTIONS = [
  { value: 0, label: '0% - Belum Mulai', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 25, label: '25% - Entry Meeting', color: '#1667c8', bg: '#edf4ff' },
  { value: 50, label: '50% - Konfirmasi Audit', color: '#0c3d86', bg: '#e8efff' },
  { value: 75, label: '75% - Expose', color: '#b15b08', bg: '#fff4e6' },
  { value: 100, label: '100% - Exit Meeting', color: '#22a95f', bg: '#e6f7ed' },
]

const currentYear = new Date().getFullYear()

function normalizeProgress(value) {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed <= 0) return 0
  if (parsed >= 100) return 100
  if (parsed >= 75) return 75
  if (parsed >= 50) return 50
  if (parsed >= 25) return 25
  return 0
}

function statusFromProgress(progress) {
  if (progress >= 100) return 'completed'
  if (progress > 0) return 'in_progress'
  return 'scheduled'
}

function progressFromAuditPhase(plan) {
  if ((plan.tahap_type || plan.tahapType || 'audit') !== 'audit') {
    return normalizeProgress(plan.progress || plan.custom_percentage || plan.customPercentage || 0)
  }

  const phaseLabel = String(plan.phase_label || plan.phaseLabel || '').toLowerCase()
  if (phaseLabel.includes('exit')) return 100
  if (phaseLabel.includes('expose')) return 75
  if (phaseLabel.includes('konfirmasi')) return 50
  if (phaseLabel.includes('entry')) return 25
  return normalizeProgress(plan.progress || 0)
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

// initialPrograms and initialWorkList removed — unused

function WorkListPage() {
  const { user, hasPermission } = useUser()
  const toast = useToast()
  const canEdit = hasPermission('canEditWorkList')
  const canDelete = hasPermission('canDeleteWorkList')
  const isKSPI = user?.role === ROLES.KSPI

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedDecade, setSelectedDecade] = useState(Math.floor(currentYear / 10) * 10)
  const [programs, setPrograms] = useState([])
  const [workList, setWorkList] = useState([])
  const [auditPlans, setAuditPlans] = useState([])
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingProgramId, setEditingProgramId] = useState(null)
  const [selectedProgramId, setSelectedProgramId] = useState(null)
  const [apiError, setApiError] = useState('')
  const [programPage, setProgramPage] = useState(0)

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
  const [detailPage, setDetailPage] = useState(0)
  const DETAIL_PAGE_SIZE = 7
  const PROGRAM_PAGE_SIZE = 5

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
    setSelectedProgramId(null)
    setProgramPage(0)
    setDetailPage(0)
  }

  useEffect(() => {
    let cancelled = false

    async function loadWorkList() {
      try {
        const [programResponse, workListResponse, auditPlanResponse] = await Promise.all([
          getPrograms(selectedYear),
          getWorkList(selectedYear),
          getAuditPlans(selectedYear).catch(() => []),
        ])
        if (cancelled) return

        const apiPrograms = programResponse || []
        const apiWorkList = (workListResponse.worklist || []).map(normalizeTask)
        const { programs: migratedPrograms, tasks: migratedTasks } = migrateYearScopedData(apiPrograms, apiWorkList)

        setPrograms(migratedPrograms)
        setWorkList(migratedTasks)
        setAuditPlans(auditPlanResponse || [])
        setApiError('')
        localStorage.setItem('portalAoptiPrograms', JSON.stringify(migratedPrograms))
        localStorage.setItem('portalAoptiWorkList', JSON.stringify(migratedTasks))
        localStorage.setItem('portalAoptiAuditPlans', JSON.stringify(auditPlanResponse || []))
        window.dispatchEvent(new Event('portalPrograms-changed'))
        window.dispatchEvent(new Event('portalWorkList-changed'))
      } catch (_error) {
        if (cancelled) return
        setApiError('Tidak dapat terhubung ke server. Pastikan backend aktif dan database tersedia.')
        setPrograms([])
        setWorkList([])
        setAuditPlans([])
        localStorage.removeItem('portalAoptiPrograms')
        localStorage.removeItem('portalAoptiWorkList')
      } finally { /* cleanup */ }
    }

    loadWorkList()
    const refreshTimer = window.setInterval(loadWorkList, 15000)
    window.addEventListener('portalAuditPlans-changed', loadWorkList)
    window.addEventListener('focus', loadWorkList)

    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
      window.removeEventListener('portalAuditPlans-changed', loadWorkList)
      window.removeEventListener('focus', loadWorkList)
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
    const programProgressValues = yearPrograms.map((program) => {
      const group = groupedWorkList[program.id] || { tasks: [] }
      return group.tasks.length
        ? Math.round(group.tasks.reduce((sum, task) => sum + normalizeProgress(task.progress), 0) / group.tasks.length)
        : 0
    })
    const avgProgress = programProgressValues.length > 0
      ? Math.round(programProgressValues.reduce((sum, progress) => sum + progress, 0) / programProgressValues.length)
      : 0
    return { total, scheduled, inProgress, completed, avgProgress }
  }, [filteredWorkList, groupedWorkList, yearPrograms])

  const auditProgressByTask = useMemo(() => {
    const progressMap = new Map()
    auditPlans.forEach((plan) => {
      const taskId = String(plan.task_id || plan.taskId || '')
      if (!taskId) return
      const nextProgress = progressFromAuditPhase(plan)
      const currentProgress = progressMap.get(taskId) || 0
      progressMap.set(taskId, Math.max(currentProgress, nextProgress))
    })
    return progressMap
  }, [auditPlans])

  const pipelineTasks = useMemo(() => {
    return filteredWorkList.map((task) => {
      const candidateIds = [task.id, task.taskId].filter(Boolean).map(String)
      const auditProgress = candidateIds.reduce((maxProgress, id) => {
        return Math.max(maxProgress, auditProgressByTask.get(id) || 0)
      }, 0)
      const pipelineProgress = Math.max(normalizeProgress(task.progress), auditProgress)

      return {
        ...task,
        pipelineProgress,
        pipelineStatus: statusFromProgress(pipelineProgress),
      }
    })
  }, [auditProgressByTask, filteredWorkList])

  const auditPipelineColumns = useMemo(() => {
    return PROGRESS_OPTIONS.map((option) => ({
      ...option,
      title: option.label.split(' - ')[1] || option.label,
      tasks: pipelineTasks.filter((task) => task.pipelineProgress === option.value),
    }))
  }, [pipelineTasks])

  const selectedProgramFallback = selectedProgramId
    ? yearPrograms.find((program) => program.id === selectedProgramId)
    : null
  const selectedGroup = selectedProgramId
    ? (groupedWorkList[selectedProgramId] || (selectedProgramFallback ? { program: selectedProgramFallback, tasks: [] } : null))
    : null
  const selectedProgram = selectedGroup?.program || null

  // eslint-disable-next-line no-unused-vars
  function getProgramProgress(group) {
    if (group.tasks.length === 0) return 0
    const total = group.tasks.reduce((sum, t) => sum + normalizeProgress(t.progress), 0)
    return Math.round(total / group.tasks.length)
  }

  // eslint-disable-next-line no-unused-vars
  function getProgramStats(group) {
    const completed = group.tasks.filter(t => t.status === 'completed').length
    const inProgress = group.tasks.filter(t => t.status === 'in_progress').length
    const scheduled = group.tasks.filter(t => t.status === 'scheduled').length
    return { completed, inProgress, scheduled, total: group.tasks.length }
  }

  // eslint-disable-next-line no-unused-vars
  function getStatusInfo(status) {
    const map = {
      scheduled: { label: 'Terjadwal', color: '#6f7a94', bg: '#f4f6ff' },
      in_progress: { label: 'Berlangsung', color: '#0c3d86', bg: '#e8efff' },
      completed: { label: 'Selesai', color: '#22a95f', bg: '#e6f7ed' },
    }
    return map[status] || map.scheduled
  }

  // eslint-disable-next-line no-unused-vars
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
      toast.warning('Nama Program Kerja wajib diisi')
      return
    }

    const submitProgram = async () => {
      const createdName = programFormData.name.trim()
      if (editingProgramId) {
        await updateProgram(editingProgramId, { name: createdName, year: selectedYear })
      } else {
        await createProgram({ name: createdName, year: selectedYear })
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

    submitProgram().catch((error) => {
      const message = error?.response?.data?.message
        || (error?.code === 'ERR_NETWORK'
          ? 'Backend belum aktif. Jalankan server backend lalu coba lagi.'
          : 'Gagal menyimpan program kerja')
      toast.error(message, { title: 'Gagal' })
    })
  }

  function handleEditProgram(program) {
    setEditingProgramId(program.id)
    setProgramFormData({ name: program.name })
    setShowProgramForm(true)
  }

  function handleDeleteProgram(programId) {
    const programTasks = workList.filter((item) => item.programId === programId)
    if (programTasks.length > 0) {
      toast.warning(`Tidak bisa hapus! Program ini masih memiliki ${programTasks.length} tugas. Hapus tugas terlebih dahulu.`)
      return
    }
    toast.confirm({
      title: 'Hapus Program Kerja',
      message: 'Program kerja akan dihapus permanen. Lanjutkan?',
      confirmLabel: 'Hapus',
      tone: 'danger',
    }).then((ok) => {
      if (!ok) return
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
          toast.success('Program kerja berhasil dihapus')
        })
        .catch(() => toast.error('Gagal menghapus program kerja'))
    })
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
      toast.warning('Pilih Program Kerja dan isi Nama Tugas')
      return
    }
    if (!taskFormData.pic.trim()) {
      toast.warning('PIC (Penanggung Jawab) wajib diisi')
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
      // eslint-disable-next-line no-unused-vars
      const createdTaskName = newItem.taskName
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

    submitTask().catch(() => toast.error('Gagal menyimpan tugas'))
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
    toast.confirm({
      title: 'Hapus Tugas',
      message: 'Tugas ini akan dihapus permanen. Lanjutkan?',
      confirmLabel: 'Hapus',
      tone: 'danger',
    }).then((ok) => {
      if (!ok) return
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
          toast.success('Tugas berhasil dihapus')
        })
        .catch(() => toast.error('Gagal menghapus tugas'))
    })
  }

  // eslint-disable-next-line no-unused-vars
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
      .catch(() => toast.error('Gagal mengupdate progress'))
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
    setDetailPage(0)
    setTaskFormData((prev) => ({ ...prev, programId }))
  }

  const availablePrograms = programs.filter(p => p.year === selectedYear)
  const totalProgramPages = Math.max(1, Math.ceil(yearPrograms.length / PROGRAM_PAGE_SIZE))
  const normalizedProgramPage = Math.min(programPage, totalProgramPages - 1)
  const pagedYearPrograms = yearPrograms.slice(
    normalizedProgramPage * PROGRAM_PAGE_SIZE,
    (normalizedProgramPage + 1) * PROGRAM_PAGE_SIZE
  )

  return (
    <div className="wl-container">
      {/* Header Section */}
      <div className="wl-header">
        <div className="wl-header-left">
          <h2>Program Kerja Audit</h2>
          <p>Kelola program kerja dan jadwal kegiatan audit tahunan</p>
          {apiError && (
            <div className="wl-api-alert">
              {apiError}
            </div>
          )}
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

      <section className="wl-pipeline-section">
        <div className="wl-pipeline-header">
          <div>
            <h3>Pipeline Audit</h3>
            <p>Alur pekerjaan berdasarkan tahap progress audit</p>
          </div>
          <span>{filteredWorkList.length} tugas</span>
        </div>
        {filteredWorkList.length === 0 ? (
          <div className="empty-state-pro empty-state-pro--compact">
            <div className="empty-state-pro__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <strong>Pipeline belum memiliki tugas</strong>
              <span>Tambahkan program dan tugas audit untuk mulai memantau alurnya.</span>
            </div>
          </div>
        ) : (
          <div className="wl-pipeline-board">
            {auditPipelineColumns.map((column) => (
              <div key={column.value} className="wl-pipeline-column" style={{ '--stage-color': column.color, '--stage-bg': column.bg }}>
                <div className="wl-pipeline-column-head">
                  <span>{column.title}</span>
                  <strong>{column.tasks.length}</strong>
                </div>
                <div className="wl-pipeline-items">
                  {column.tasks.slice(0, 5).map((task) => (
                    <button key={task.id} type="button" className="wl-pipeline-card" onClick={() => handleSelectProgram(task.programId)}>
                      <strong>{task.taskName}</strong>
                      <span>{task.programName}</span>
                      <small>{task.pipelineProgress}% • {formatDateShort(task.startDate)}{task.pic ? ` • ${task.pic}` : ''}</small>
                    </button>
                  ))}
                  {column.tasks.length === 0 && <div className="wl-pipeline-empty">Kosong</div>}
                  {column.tasks.length > 5 && <div className="wl-pipeline-more">+{column.tasks.length - 5} tugas lainnya</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
        {!selectedProgram ? (
          /* ── Program list view ── */
          <div className="wl-table-section">
            <div className="wl-table-header">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    <th style={{ width: 40 }}>#</th>
                    <th>Nama Program Kerja</th>
                    <th style={{ width: 110 }}>Jumlah Tugas</th>
                    <th style={{ width: 160 }}>Progress</th>
                    <th style={{ width: 100 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {yearPrograms.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div className="wl-empty-state">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <p>Belum ada program kerja</p>
                          {canEdit && (
                            <button className="wl-btn wl-btn-primary wl-btn-sm" onClick={() => setShowProgramForm(true)}>Tambah Program</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : pagedYearPrograms.map((program, index) => {
                    const group = groupedWorkList[program.id] || { tasks: [] }
                    const tasksCount = group.tasks.length
                    const progress = tasksCount > 0
                      ? Math.round(group.tasks.reduce((s, t) => s + normalizeProgress(t.progress), 0) / tasksCount)
                      : 0
                    return (
                      <tr
                        key={program.id}
                        className={`wl-program-row ${selectedProgramId === program.id ? 'selected' : ''}`}
                        onClick={() => handleSelectProgram(program.id)}
                        title="Klik untuk lihat tugas"
                      >
                        <td className="wl-row-number">{normalizedProgramPage * PROGRAM_PAGE_SIZE + index + 1}</td>
                        <td className="wl-program-name">
                          <div className="wl-program-name-content">
                            <span className="wl-program-name-text">{program.name}</span>
                            {tasksCount > 0 && (
                              <span className="wl-program-substats">
                                <span className="wl-substat completed">{group.tasks.filter(t=>t.status==='completed').length} selesai</span>
                                <span className="wl-substat in-progress">{group.tasks.filter(t=>t.status==='in_progress').length} berlangsung</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="wl-tasks-count">
                          <span className={`wl-count-badge ${tasksCount === 0 ? 'empty' : ''}`}>{tasksCount} tugas</span>
                        </td>
                        <td className="wl-program-progress">
                          <div className="wl-progress-bar-wrapper">
                            <div className="wl-progress-bar">
                              <div className="wl-progress-bar-fill" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="wl-progress-value">{progress}%</span>
                          </div>
                        </td>
                        <td className="wl-actions" onClick={e => e.stopPropagation()}>
                          {canEdit && (
                            <button className="wl-action-btn wl-action-edit" onClick={() => handleEditProgram(program)} title="Edit">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                          {canEdit && canDelete && (
                            <button className="wl-action-btn wl-action-delete" onClick={() => handleDeleteProgram(program.id)} title="Hapus">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {yearPrograms.length > PROGRAM_PAGE_SIZE && (
              <div className="wl-program-pagination">
                <button
                  type="button"
                  className="wl-detail-page-btn"
                  disabled={normalizedProgramPage === 0}
                  onClick={() => setProgramPage((page) => Math.max(0, page - 1))}
                >
                  ‹ Prev
                </button>
                <span className="wl-detail-page-info">{normalizedProgramPage + 1} / {totalProgramPages}</span>
                <button
                  type="button"
                  className="wl-detail-page-btn"
                  disabled={normalizedProgramPage >= totalProgramPages - 1}
                  onClick={() => setProgramPage((page) => Math.min(totalProgramPages - 1, page + 1))}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Task detail view ── */
          (() => {
            const tasksForDetail = selectedGroup?.tasks || []
            const totalDetailPages = Math.max(1, Math.ceil(tasksForDetail.length / DETAIL_PAGE_SIZE))
            const pagedTasks = tasksForDetail.slice(detailPage * DETAIL_PAGE_SIZE, (detailPage + 1) * DETAIL_PAGE_SIZE)
            return (
              <div className="wl-table-section wl-program-detail-panel">
                {/* Header with back button */}
                <div className="wl-table-header">
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button className="wl-back-btn" onClick={() => setSelectedProgramId(null)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      Kembali
                    </button>
                    <h3 style={{ margin:0 }}>{selectedProgram.name}</h3>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className="wl-table-count">{tasksForDetail.length} tugas</span>
                    {canEdit && (
                      <button className="wl-btn wl-btn-primary wl-btn-sm" onClick={() => { setShowTaskForm(true); setTaskFormData(p => ({ ...p, programId: selectedProgramId })) }}>
                        + Tugas
                      </button>
                    )}
                  </div>
                </div>

                {/* Pagination header (only when > page size) */}
                {tasksForDetail.length > DETAIL_PAGE_SIZE && (
                  <div className="wl-detail-pagination">
                    <button className="wl-detail-page-btn" disabled={detailPage===0} onClick={() => setDetailPage(p => p-1)}>‹ Prev</button>
                    <span className="wl-detail-page-info">{detailPage+1} / {totalDetailPages}</span>
                    <button className="wl-detail-page-btn" disabled={detailPage>=totalDetailPages-1} onClick={() => setDetailPage(p => p+1)}>Next ›</button>
                  </div>
                )}

                {/* Task rows */}
                {tasksForDetail.length === 0 ? (
                  <div className="wl-table-empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <p>Belum ada tugas dalam program ini</p>
                    {canEdit && (
                      <button className="wl-btn wl-btn-primary wl-btn-sm" onClick={() => { setShowTaskForm(true); setTaskFormData(p => ({ ...p, programId: selectedProgramId })) }}>
                        Tambah Tugas
                      </button>
                    )}
                  </div>
                ) : pagedTasks.map((task, i) => {
                  const pageOffset = detailPage * DETAIL_PAGE_SIZE
                  const statusKey = task.status || 'scheduled'
                  const statusLabels = { scheduled:'Terjadwal', in_progress:'Berlangsung', completed:'Selesai' }
                  return (
                    <div key={task.id} className={`wl-task-row ${statusKey === 'completed' ? 'completed' : ''}`}>
                      <div className="wl-task-num">{pageOffset + i + 1}</div>
                      <div className="wl-task-body">
                        <div className="wl-task-title">{task.taskName}</div>
                        <div className="wl-task-meta">
                          {task.pic && (
                            <span className="wl-task-meta-item">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                              {task.pic}
                            </span>
                          )}
                          {task.startDate && (
                            <span className="wl-task-meta-item">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {formatDateShort(task.startDate)} – {formatDateShort(task.endDate)}
                            </span>
                          )}
                          {task.location && (
                            <span className="wl-task-meta-item">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              {task.location}
                            </span>
                          )}
                          <span className={`wl-status-badge wl-status-${statusKey}`}>{statusLabels[statusKey]}</span>
                        </div>
                        <div className="wl-task-progress-row">
                          <div className="wl-task-progress-bar">
                            <div className="wl-task-progress-fill" style={{ width:`${task.progress}%` }} />
                          </div>
                          <span className="wl-task-progress-label">{task.progress}%</span>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="wl-task-actions">
                          <button className="wl-action-btn wl-action-edit" onClick={() => handleEditTask(task)} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          {canDelete && (
                            <button className="wl-action-btn wl-action-delete" onClick={() => handleDeleteTask(task.id)} title="Hapus">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}

export default WorkListPage
