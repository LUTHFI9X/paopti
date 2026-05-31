import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser, ROLES, ROLE_LABELS } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import SettingsPage from './SettingsPage'

const ROLE_COLORS = {
  [ROLES.ADMIN]: { bg: '#e8f0ff', text: '#1f4f96' },
  [ROLES.AUDITOR]: { bg: '#e6f7ed', text: '#22a95f' },
  [ROLES.KSPI]: { bg: '#fff4e6', text: '#b15b08' },
}

const STATUS_COLORS = {
  active: { bg: '#e6f7ed', text: '#22a95f' },
  inactive: { bg: '#fff0f0', text: '#d13438' },
}

const USERS_PER_PAGE = 10

function AdminPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { users, user: currentUser, createUser, updateUser, deleteUser, resetPassword, toggleUserStatus, importUsers, getUserActivities } = useUser()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState(() => {
    // Only set initial tab from URL on first load
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
      return 'dashboard'
    }
    const path = window.location.pathname.split('/').pop()
    const tabMap = {
      'users': 'users',
      'programs': 'programs',
      'tasks': 'tasks',
      'findings': 'findings',
      'analytics': 'analytics',
      'roles': 'roles',
      'logs': 'logs',
      'settings': 'settings',
      'backup': 'backup',
    }
    return tabMap[path] || 'dashboard'
  })

  // User Management State
  const [showModal, setShowModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  // showActivityModal removed — unused
  const [editingUser, setEditingUser] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [userActivities, setUserActivities] = useState([])
  const [logSearch, setLogSearch] = useState('')
  const [logFilterAction, setLogFilterAction] = useState('all')
  const [logFilterRole, setLogFilterRole] = useState('all')
  const [logFilterCategory, setLogFilterCategory] = useState('all')
  const [backupHistory, setBackupHistory] = useState(() => {
    const saved = localStorage.getItem('portalAoptiBackupHistory')
    return saved ? JSON.parse(saved) : []
  })
  const [backupSettings, setBackupSettings] = useState(() => {
    const saved = localStorage.getItem('portalAoptiBackupSettings')
    return saved ? JSON.parse(saved) : {
      autoBackup: false,
      backupFrequency: 'daily',
      backupTime: '02:00',
      retentionCount: 10,
      compression: true,
      maxStorageSize: 1024,
      notifyOnSuccess: true,
      notifyOnFailure: true,
    }
  })
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: ROLES.AUDITOR,
    email: '',
    department: '',
    phone: '',
  })
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [activityLogs, setActivityLogs] = useState(() => {
    const saved = localStorage.getItem('portalAoptiActivityLogs')
    return saved ? JSON.parse(saved) : []
  })

  const [systemSettings, setSystemSettings] = useState(() => {
    const saved = localStorage.getItem('portalAoptiSystemSettings')
    return saved ? JSON.parse(saved) : {
      appName: 'Portal AOPTI',
      organization: 'Badan Pengawasan Keuangan dan Pembangunan',
      auditPeriod: new Date().getFullYear().toString(),
      emailNotification: true,
      autoBackup: true,
      backupFrequency: 'daily',
      sessionTimeout: 30,
      maxLoginAttempts: 5,
    }
  })

  const [allPrograms, setAllPrograms] = useState([])
  const [allWorkList, setAllWorkList] = useState([])
  const [allFieldworks, setAllFieldworks] = useState({})
  const [programStats, setProgramStats] = useState([])

  const [_stats, setStats] = useState({
    totalUsers: 0,
    totalPrograms: 0,
    totalTasks: 0,
    totalFindings: 0,
    recentActivity: 0,
  })

  useEffect(() => {
    const saved = localStorage.getItem('portalAoptiActivityLogs')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setActivityLogs(JSON.parse(saved))

    const programs = JSON.parse(localStorage.getItem('portalAoptiPrograms') || '[]')
    const workList = JSON.parse(localStorage.getItem('portalAoptiWorkList') || '[]')
    const fieldworks = JSON.parse(localStorage.getItem('portalAoptiFieldworks') || '{}')
    const usersData = JSON.parse(localStorage.getItem('portalAoptiUsers') || '[]')

    setAllPrograms(programs)
    setAllWorkList(workList)
    setAllFieldworks(fieldworks)

    const programStatsData = programs.map(program => {
      const programTasks = workList.filter(t => t.programId === program.id)
      const completed = programTasks.filter(t => t.status === 'completed').length
      const inProgress = programTasks.filter(t => t.status === 'in_progress').length
      const totalFindings = programTasks.reduce((sum, task) => {
        const fw = fieldworks[task.id]
        return sum + (fw?.findings?.length || 0)
      }, 0)
      return {
        id: program.id,
        name: program.name,
        year: program.year,
        totalTasks: programTasks.length,
        completed,
        inProgress,
        scheduled: programTasks.filter(t => t.status === 'scheduled').length,
        totalFindings
      }
    })
    setProgramStats(programStatsData)

    setStats({
      totalUsers: usersData.length,
      totalPrograms: programs.length,
      totalTasks: workList.length,
      totalFindings: workList.filter(w => w.findings?.length > 0).reduce((acc, w) => acc + (w.findings?.length || 0), 0),
      recentActivity: saved ? JSON.parse(saved).length : 0,
    })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats((currentStats) => ({
      ...currentStats,
      totalUsers: users.length,
    }))
  }, [users.length])

  const [auditorMenus, setAuditorMenus] = useState(() => {
    const saved = localStorage.getItem('portalAoptiAuditorMenus')
    return saved ? JSON.parse(saved) : {
      'Dashboard': true,
      'Rencana Kerja': true,
      'Fieldwork': true,
      'Temuan Audit': true,
      'Analytics': true,
      'Team Chat': true,
    }
  })

  const [kspiMenus, setKspiMenus] = useState(() => {
    const saved = localStorage.getItem('portalAoptiKspiMenus')
    return saved ? JSON.parse(saved) : {
      'Dashboard': true,
      'Rencana Kerja': false,
      'Fieldwork': false,
      'Temuan Audit': false,
      'Analytics': true,
      'Team Chat': true,
    }
  })

  const MENUS = [
    { key: 'Dashboard', icon: 'grid', label: 'Dashboard', auditorLabel: 'Lihat Dashboard', kspiLabel: 'Lihat Dashboard (read-only)' },
    { key: 'Rencana Kerja', icon: 'folder', label: 'Rencana Kerja', auditorLabel: 'Buat & edit Program Kerja', kspiLabel: 'Lihat Program Kerja (read-only)' },
    { key: 'Fieldwork', icon: 'clipboard', label: 'Fieldwork', auditorLabel: 'Edit Fieldwork', kspiLabel: 'Lihat Fieldwork (read-only)' },
    { key: 'Temuan Audit', icon: 'alert', label: 'Temuan Audit', auditorLabel: 'Tambah Temuan Audit', kspiLabel: 'Lihat Temuan Audit (read-only)' },
    { key: 'Analytics', icon: 'chart', label: 'Analytics', auditorLabel: 'Lihat Analytics', kspiLabel: 'Lihat Analytics' },
    { key: 'Team Chat', icon: 'message', label: 'Team Chat', auditorLabel: 'Team Chat', kspiLabel: 'Team Chat' },
  ]

  function handleToggleAuditorMenu(menuKey) {
    const updated = { ...auditorMenus }
    updated[menuKey] = !updated[menuKey]
    setAuditorMenus(updated)
    localStorage.setItem('portalAoptiAuditorMenus', JSON.stringify(updated))
    window.dispatchEvent(new Event('menuVisibilityChanged'))
    logActivity('Ubah Menu Auditor', `${updated[menuKey] ? 'Mengaktifkan' : 'Menonaktifkan'} ${menuKey} untuk Auditor`)
  }

  function handleToggleKspiMenu(menuKey) {
    const updated = { ...kspiMenus }
    updated[menuKey] = !updated[menuKey]
    setKspiMenus(updated)
    localStorage.setItem('portalAoptiKspiMenus', JSON.stringify(updated))
    window.dispatchEvent(new Event('menuVisibilityChanged'))
    logActivity('Ubah Menu KSPI', `${updated[menuKey] ? 'Mengaktifkan' : 'Menonaktifkan'} ${menuKey} untuk KSPI`)
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = searchQuery === '' ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, filterRole, filterStatus])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE
    return filteredUsers.slice(start, start + USERS_PER_PAGE)
  }, [filteredUsers, currentPage])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [searchQuery, filterRole, filterStatus])

  // Handle browser navigation (back/forward buttons)
  useEffect(() => {
    const path = location.pathname.split('/').pop()
    const tabMap = {
      '': 'dashboard',
      'users': 'users',
      'programs': 'programs',
      'tasks': 'tasks',
      'findings': 'findings',
      'analytics': 'analytics',
      'roles': 'roles',
      'logs': 'logs',
      'settings': 'settings',
      'backup': 'backup',
    }
    const newTab = tabMap[path] || 'dashboard'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab(newTab)
  }, [location.pathname])

  function handleTabChange(tab) {
    setActiveTab(tab)
    if (tab === 'dashboard') {
      navigate('/admin')
    } else {
      navigate(`/admin/${tab}`)
    }
  }

  function logActivity(action, details, _userId = null) {
    const newLog = {
      // eslint-disable-next-line react-hooks/purity
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'System',
      userId: currentUser?.id || null,
      userRole: currentUser?.role || null,
      action,
      details,
      ipAddress: '127.0.0.1',
    }
    const updated = [newLog, ...activityLogs].slice(0, 100)
    setActivityLogs(updated)
    localStorage.setItem('portalAoptiActivityLogs', JSON.stringify(updated))
  }

  function handleOpenModal(user = null) {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        role: user.role,
        email: user.email || '',
        department: user.department || '',
        phone: user.phone || '',
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        password: '',
        name: '',
        role: ROLES.AUDITOR,
        email: '',
        department: '',
        phone: '',
      })
    }
    setMessage('')
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditingUser(null)
    setMessage('')
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.username.trim() || !formData.name.trim()) {
      setMessage('Username dan nama harus diisi')
      setMessageType('error')
      return
    }

    if (!editingUser && !formData.password.trim()) {
      setMessage('Password harus diisi untuk user baru')
      setMessageType('error')
      return
    }

    if (editingUser) {
      const updateData = {
        username: formData.username,
        name: formData.name,
        role: formData.role,
        email: formData.email,
        department: formData.department,
        phone: formData.phone,
      }
      if (formData.password.trim()) {
        updateData.password = formData.password
      }
      const result = await updateUser(editingUser.id, updateData)
      if (result.success) {
        setMessage('User berhasil diperbarui')
        setMessageType('success')
        logActivity('Edit User', `Mengubah user: ${formData.name} (${ROLE_LABELS[formData.role]})`)
        setTimeout(handleCloseModal, 1000)
      } else {
        setMessage(result.error)
        setMessageType('error')
      }
    } else {
      const result = await createUser({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        email: formData.email,
        department: formData.department,
        phone: formData.phone,
      })
      if (result.success) {
        setMessage('User berhasil dibuat')
        setMessageType('success')
        logActivity('Buat User Baru', `Menambah user: ${formData.name} (${ROLE_LABELS[formData.role]})`)
        setTimeout(handleCloseModal, 1000)
      } else {
        setMessage(result.error)
        setMessageType('error')
      }
    }
  }

  async function handleDelete(userId) {
    const userToDelete = users.find((u) => u.id === userId)
    const ok = await toast.confirm({
      title: 'Hapus User',
      message: `Yakin ingin menghapus ${userToDelete?.name || 'user ini'}? Tindakan tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
      tone: 'danger',
    })
    if (!ok) return
    const result = await deleteUser(userId)
    if (!result.success) {
      setMessage(result.error)
      setMessageType('error')
      toast.error(result.error || 'Gagal menghapus user')
    } else {
      logActivity('Hapus User', `Menghapus user: ${userToDelete?.name}`)
      toast.success(`User ${userToDelete?.name || ''} berhasil dihapus`)
    }
  }

  async function handleToggleStatus(userId) {
    const userToToggle = users.find((u) => u.id === userId)
    const newStatus = userToToggle?.status === 'active' ? 'nonaktifkan' : 'aktifkan'
    const ok = await toast.confirm({
      title: 'Ubah Status User',
      message: `Yakin ingin ${newStatus} ${userToToggle?.name || 'user ini'}?`,
      confirmLabel: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
    })
    if (!ok) return
    const result = await toggleUserStatus(userId)
    if (result.success) {
      logActivity('Ubah Status User', `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}: ${userToToggle?.name}`)
      toast.success(`Status user diperbarui`)
    } else {
      setMessage(result.error)
      setMessageType('error')
      toast.error(result.error || 'Gagal mengubah status')
    }
  }

  // eslint-disable-next-line no-unused-vars
  function handleOpenProfile(user) {
    setViewingUser(user)
    const activities = getUserActivities(user.id)
    setUserActivities(activities)
    setShowProfileModal(true)
  }

  // eslint-disable-next-line no-unused-vars
  function handleOpenResetPassword(user) {
    setResetPasswordUser(user)
    setResetPasswordData({ newPassword: '', confirmPassword: '' })
    setMessage('')
    setShowResetPasswordModal(true)
  }

  function handleCloseResetPassword() {
    setShowResetPasswordModal(false)
    setResetPasswordUser(null)
    setMessage('')
  }

  async function handleResetPasswordSubmit(e) {
    e.preventDefault()
    if (!resetPasswordData.newPassword) {
      setMessage('Password baru harus diisi')
      setMessageType('error')
      return
    }
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setMessage('Password tidak cocok')
      setMessageType('error')
      return
    }
    if (resetPasswordData.newPassword.length < 6) {
      setMessage('Password minimal 6 karakter')
      setMessageType('error')
      return
    }
    const result = await resetPassword(resetPasswordUser.id, resetPasswordData.newPassword)
    if (result.success) {
      setMessage('Password berhasil direset')
      setMessageType('success')
      logActivity('Reset Password', `Mereset password: ${resetPasswordUser.name}`)
      setTimeout(handleCloseResetPassword, 1000)
    } else {
      setMessage(result.error)
      setMessageType('error')
    }
  }

  // eslint-disable-next-line no-unused-vars
  function handleOpenImport() {
    setShowImportModal(true)
  }

  function handleCloseImport() {
    setShowImportModal(false)
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

        const requiredHeaders = ['username', 'name']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        if (missingHeaders.length > 0) {
          setMessage(`Header tidak lengkap. Butuh: ${requiredHeaders.join(', ')}`)
          setMessageType('error')
          return
        }

        const usersToImport = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          const userData = {}
          headers.forEach((header, idx) => {
            userData[header] = values[idx] || ''
          })

          if (userData.username && userData.name) {
            if (userData.role) {
              const roleMap = { admin: ROLES.ADMIN, auditor: ROLES.AUDITOR, kspi: ROLES.KSPI }
              userData.role = roleMap[userData.role.toLowerCase()] || ROLES.AUDITOR
            }
            usersToImport.push(userData)
          }
        }

        if (usersToImport.length === 0) {
          setMessage('Tidak ada data user yang valid')
          setMessageType('error')
          return
        }

        const result = await importUsers(usersToImport)
        logActivity('Import User', `Mengimport ${result.imported} user (${result.skipped} dilewati)`)
        setMessage(`Berhasil import ${result.imported} user (${result.skipped} dilewati)`)
        setMessageType('success')
        setTimeout(handleCloseImport, 1500)
      } catch (_err) {
        setMessage('Format file tidak valid')
        setMessageType('error')
      }
    }
    reader.readAsText(file)
  }

  // eslint-disable-next-line no-unused-vars
  function handleExportExcel() {
    const exportData = filteredUsers.map((user, idx) => ({
      '#': idx + 1,
      'Nama Lengkap': user.name,
      'Username': user.username,
      'Email': user.email || '-',
      'Departemen': user.department || '-',
      'Telepon': user.phone || '-',
      'Role': ROLE_LABELS[user.role],
      'Status': user.status === 'active' ? 'Aktif' : 'Nonaktif',
      'Tanggal Dibuat': user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-',
    }))

    let csv = Object.keys(exportData[0]).join(',') + '\n'
    exportData.forEach(row => {
      csv += Object.values(row).map(val => `"${val}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    logActivity('Export User', `Mengexport ${filteredUsers.length} user`)
  }

  // eslint-disable-next-line no-unused-vars
  function handleExportPDF() {
    const printContent = `
      <html>
        <head>
          <title>Daftar User - Portal AOPTI</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f4f96; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #1f4f96; color: white; }
            tr:nth-child(even) { background: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Daftar User Portal AOPTI</h1>
          <p>Tanggal export: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nama</th>
                <th>Username</th>
                <th>Email</th>
                <th>Departemen</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.map((user, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${user.name}</td>
                  <td>${user.username}</td>
                  <td>${user.email || '-'}</td>
                  <td>${user.department || '-'}</td>
                  <td>${ROLE_LABELS[user.role]}</td>
                  <td>${user.status === 'active' ? 'Aktif' : 'Nonaktif'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
    logActivity('Export User PDF', `Mengexport ${filteredUsers.length} user ke PDF`)
  }

  // eslint-disable-next-line no-unused-vars
  function handleSettingChange(key, value) {
    const updated = { ...systemSettings, [key]: value }
    setSystemSettings(updated)
    localStorage.setItem('portalAoptiSystemSettings', JSON.stringify(updated))
    logActivity('Ubah Pengaturan', `Mengubah ${key}`)
  }

  // eslint-disable-next-line no-unused-vars
  function handleBackup() {
    const backupData = {
      backupDate: new Date().toISOString(),
      version: '1.0.0',
      users: users,
      programs: JSON.parse(localStorage.getItem('portalAoptiPrograms') || '[]'),
      workList: JSON.parse(localStorage.getItem('portalAoptiWorkList') || '[]'),
      settings: systemSettings,
      activityLogs: activityLogs,
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spi-hub-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    // Save to backup history
    const newBackup = {
      id: Date.now(),
      date: new Date().toISOString(),
      fileName: `spi-hub-backup-${new Date().toISOString().split('T')[0]}.json`,
      size: 'Auto',
      userCount: users.length,
      programCount: JSON.parse(localStorage.getItem('portalAoptiPrograms') || '[]').length,
    }
    const updatedHistory = [newBackup, ...backupHistory].slice(0, 10)
    setBackupHistory(updatedHistory)
    localStorage.setItem('portalAoptiBackupHistory', JSON.stringify(updatedHistory))

    logActivity('Backup Data', 'Membuat backup data sistem')
    toast.success('Backup berhasil disimpan!', { title: 'Berhasil' })
  }

  // eslint-disable-next-line no-unused-vars
  function handleRestore(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.users) {
          localStorage.setItem('portalAoptiUsers', JSON.stringify(data.users))
        }
        if (data.programs) {
          localStorage.setItem('portalAoptiPrograms', JSON.stringify(data.programs))
        }
        if (data.workList) {
          localStorage.setItem('portalAoptiWorkList', JSON.stringify(data.workList))
        }
        if (data.settings) {
          localStorage.setItem('portalAoptiSystemSettings', JSON.stringify(data.settings))
          setSystemSettings(data.settings)
        }
        logActivity('Restore Data', `Merestore backup dari ${data.backupDate || 'file'}`)
        toast.success('Restore berhasil! Halaman akan dimuat ulang.', { title: 'Berhasil' })
        setTimeout(() => window.location.reload(), 1200)
      } catch (_err) {
        toast.error('File backup tidak valid', { title: 'Gagal restore' })
      }
    }
    reader.readAsText(file)
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardTab()
      case 'users':
        return renderUsersTab()
      case 'programs':
        return renderProgramsTab()
      case 'tasks':
        return renderTasksTab()
      case 'findings':
        return renderFindingsTab()
      case 'analytics':
        return renderAnalyticsTab()
      case 'roles':
        return renderRolesTab()
      case 'logs':
        return renderLogsTab()
      case 'settings':
        return <SettingsPage embedded />
      case 'backup':
        return (
          <div className="backup-page">
            {message && (
              <div className={`message ${messageType}`}>
                {message}
              </div>
            )}

            {/* Header */}
            <div className="backup-header">
              <div className="backup-header-left">
                <h3>Backup & Restore</h3>
                <p>Kelola backup data dan pulihkan sistem jika terjadi masalah</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="backup-stats-grid">
              <div className="backup-stat-card">
                <div className="backup-stat-icon blue">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="backup-stat-content">
                  <span className="backup-stat-number">{backupHistory.length}</span>
                  <span className="backup-stat-label">Total Backup</span>
                </div>
              </div>

              <div className="backup-stat-card">
                <div className="backup-stat-icon green">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="backup-stat-content">
                  <span className="backup-stat-number">{(backupHistory.reduce((sum, b) => sum + (b.size || 0), 0) / 1024).toFixed(1)} MB</span>
                  <span className="backup-stat-label">Ukuran Total</span>
                </div>
              </div>

              <div className="backup-stat-card">
                <div className="backup-stat-icon orange">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="backup-stat-content">
                  <span className="backup-stat-number">
                    {backupHistory.length > 0
                      ? new Date(backupHistory[0].date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                      : '-'}
                  </span>
                  <span className="backup-stat-label">Backup Terakhir</span>
                </div>
              </div>

              <div className="backup-stat-card">
                <div className="backup-stat-icon purple">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="backup-stat-content">
                  <span className="backup-stat-number">{backupHistory[0]?.status === 'completed' ? 'Aman' : '-'}</span>
                  <span className="backup-stat-label">Status</span>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="backup-main-grid">
              {/* Left Content */}
              <div className="backup-content">
                {/* Backup History Card */}
                <div className="backup-card">
                  <div className="backup-card-header">
                    <h4>Riwayat Backup</h4>
                    <button className="btn-full secondary" onClick={() => setShowBackupModal(true)} style={{ width: 'auto', padding: '8px 16px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Backup Baru
                    </button>
                  </div>
                  <div className="backup-card-body">
                    {backupHistory.length === 0 ? (
                      <div className="backup-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p>Belum ada backup</p>
                        <span>Klik tombol di atas untuk membuat backup pertama</span>
                      </div>
                    ) : (
                      <div className="backup-list">
                        {backupHistory.map((backup) => (
                          <div key={backup.id} className="backup-item">
                            <div className="backup-item-icon">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                              </svg>
                            </div>
                            <div className="backup-item-info">
                              <span className="backup-item-date">
                                {new Date(backup.date).toLocaleDateString('id-ID', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="backup-item-meta">
                                {backup.type === 'full' ? 'Full Backup' : 'Partial Backup'} • {backup.format} • {(backup.size || 0).toFixed(0)} KB
                              </span>
                            </div>
                            <div className="backup-item-status">
                              <span className={`status-badge ${backup.status}`}>
                                {backup.status === 'completed' ? 'Berhasil' : 'Gagal'}
                              </span>
                            </div>
                            <div className="backup-item-actions">
                              <button className="btn-icon" title="Download" onClick={() => {
                                const blob = new Blob([JSON.stringify({ backupData: backup, exportDate: new Date().toISOString() })], { type: 'application/json' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `backup_${new Date(backup.date).toISOString().split('T')[0]}.json`
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                              }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              </button>
                              <button className="btn-icon" title="Restore" onClick={() => {
                                setSelectedBackup(backup)
                                setShowRestoreModal(true)
                              }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="1 4 1 10 7 10"/>
                                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                                </svg>
                              </button>
                              <button className="btn-icon danger" title="Hapus" onClick={() => {
                                const updatedHistory = backupHistory.filter(b => b.id !== backup.id)
                                setBackupHistory(updatedHistory)
                                localStorage.setItem('portalAoptiBackupHistory', JSON.stringify(updatedHistory))
                                setMessage('Backup berhasil dihapus!')
                                setMessageType('success')
                              }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto Backup Settings */}
                <div className="backup-card">
                  <div className="backup-card-header">
                    <h4>Pengaturan Backup Otomatis</h4>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={backupSettings.autoBackup}
                        onChange={(e) => setBackupSettings({ ...backupSettings, autoBackup: e.target.checked })}
                      />
                      <span className="toggle-slider">
                        <span className="toggle-label on">ON</span>
                        <span className="toggle-label off">OFF</span>
                      </span>
                    </label>
                  </div>
                  {backupSettings.autoBackup && (
                    <div className="backup-card-body">
                      <div className="backup-settings-grid">
                        <div className="backup-setting-item">
                          <label>Frekuensi</label>
                          <select
                            value={backupSettings.backupFrequency}
                            onChange={(e) => setBackupSettings({ ...backupSettings, backupFrequency: e.target.value })}
                            className="settings-input"
                          >
                            <option value="hourly">Setiap Jam</option>
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly">Bulanan</option>
                          </select>
                        </div>
                        <div className="backup-setting-item">
                          <label>Waktu</label>
                          <input
                            type="time"
                            value={backupSettings.backupTime}
                            onChange={(e) => setBackupSettings({ ...backupSettings, backupTime: e.target.value })}
                            className="settings-input"
                          />
                        </div>
                        <div className="backup-setting-item">
                          <label>Retensi</label>
                          <select
                            value={backupSettings.retentionCount}
                            onChange={(e) => setBackupSettings({ ...backupSettings, retentionCount: parseInt(e.target.value) })}
                            className="settings-input"
                          >
                            <option value={5}>5 Backup</option>
                            <option value={10}>10 Backup</option>
                            <option value={15}>15 Backup</option>
                            <option value={20}>20 Backup</option>
                          </select>
                        </div>
                        <div className="backup-setting-item">
                          <label>Kompresi</label>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={backupSettings.compression}
                              onChange={(e) => setBackupSettings({ ...backupSettings, compression: e.target.checked })}
                            />
                            <span className="toggle-slider">
                              <span className="toggle-label on">ON</span>
                              <span className="toggle-label off">OFF</span>
                            </span>
                          </label>
                        </div>
                      </div>
                      <button className="btn-full secondary" onClick={() => {
                        localStorage.setItem('portalAoptiBackupSettings', JSON.stringify(backupSettings))
                        setMessage('Pengaturan backup disimpan!')
                        setMessageType('success')
                      }} style={{ marginTop: '16px' }}>
                        Simpan Pengaturan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="backup-sidebar">
                {/* Quick Actions */}
                <div className="backup-actions-card">
                  <h4>Aksi Cepat</h4>
                  <button className="btn-full primary" onClick={() => setShowBackupModal(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Buat Backup Sekarang
                  </button>
                </div>

                {/* Restore Card */}
                <div className="restore-card">
                  <h4>Pulihkan Data</h4>
                  <p>Upload file backup untuk memulihkan data sistem</p>
                  <div className="restore-dropzone">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p>Drag & drop file backup di sini</p>
                    <span>atau klik untuk pilih file (.json, .zip)</span>
                  </div>
                  <div className="restore-warning-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <p>Restore akan menimpa data saat ini. Pastikan Anda telah membuat backup.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Backup Modal */}
            {showBackupModal && (
              <div className="modal-overlay" onClick={() => setShowBackupModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Buat Backup Baru</h3>
                    <button className="close-btn" onClick={() => setShowBackupModal(false)}>×</button>
                  </div>
                  <div className="modal-body">
                    <p>Backup akan mencakup:</p>
                    <ul>
                      <li>Data pengguna dan hak akses</li>
                      <li>Program kerja dan tugas</li>
                      <li>Temuan audit</li>
                      <li>Log aktivitas</li>
                      <li>Pengaturan sistem</li>
                    </ul>
                    <div className="form-group">
                      <label>Tipe Backup</label>
                      <select className="settings-input">
                        <option value="full">Full Backup (Semua Data)</option>
                        <option value="database">Database Saja</option>
                        <option value="files">File Saja</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="cancel-btn" onClick={() => setShowBackupModal(false)}>Batal</button>
                    <button className="btn-primary" onClick={() => {
                      setIsBackingUp(true)
                      setTimeout(() => {
                        const newBackup = {
                          id: `backup_${Date.now()}`,
                          date: new Date().toISOString(),
                          type: 'full',
                          format: backupSettings.compression ? 'ZIP' : 'SQL',
                          size: Math.floor(Math.random() * 500) + 100,
                          status: 'completed',
                          note: 'Backup berhasil dibuat',
                        }
                        const updatedHistory = [newBackup, ...backupHistory]
                        setBackupHistory(updatedHistory)
                        localStorage.setItem('portalAoptiBackupHistory', JSON.stringify(updatedHistory))
                        setIsBackingUp(false)
                        setShowBackupModal(false)
                        setMessage('Backup berhasil dibuat!')
                        setMessageType('success')
                      }, 2000)
                    }} disabled={isBackingUp}>
                      {isBackingUp ? 'Membuat Backup...' : 'Buat Backup'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Restore Modal */}
            {showRestoreModal && (
              <div className="modal-overlay" onClick={() => { setShowRestoreModal(false); setSelectedBackup(null); }}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Konfirmasi Restore</h3>
                    <button className="close-btn" onClick={() => { setShowRestoreModal(false); setSelectedBackup(null); }}>×</button>
                  </div>
                  <div className="modal-body">
                    <div className="restore-warning-box" style={{ marginBottom: '16px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <p>Restore akan menimpa data saat ini. Pastikan Anda telah membuat backup data terkini.</p>
                    </div>
                    {selectedBackup && (
                      <div className="restore-info">
                        <p><strong>Backup yang akan dipulihkan:</strong></p>
                        <p>Tanggal: {new Date(selectedBackup.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p>Ukuran: {selectedBackup.size} KB</p>
                        <p>Format: {selectedBackup.format}</p>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button className="cancel-btn" onClick={() => { setShowRestoreModal(false); setSelectedBackup(null); }}>Batal</button>
                    <button className="btn-danger" onClick={() => {
                      setIsRestoring(true)
                      setTimeout(() => {
                        setIsRestoring(false)
                        setShowRestoreModal(false)
                        setSelectedBackup(null)
                        setMessage('Restore berhasil! Data telah dipulihkan.')
                        setMessageType('success')
                      }, 3000)
                    }} disabled={isRestoring}>
                      {isRestoring ? 'Merestore...' : 'Ya, Pulihkan Data'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  function renderDashboardTab() {
    // User Statistics
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.status === 'active').length
    const inactiveUsers = users.filter(u => u.status === 'inactive').length
    const adminCount = users.filter(u => u.role === ROLES.ADMIN).length
    const auditorCount = users.filter(u => u.role === ROLES.AUDITOR).length
    const kspiCount = users.filter(u => u.role === ROLES.KSPI).length

    // Role & Menu Statistics
    const auditorEnabledMenus = Object.values(auditorMenus).filter(v => v).length
    const kspiEnabledMenus = Object.values(kspiMenus).filter(v => v).length

    // Activity Log Statistics
    const totalActivityLogs = activityLogs.length
    const todayLogs = activityLogs.filter(log => {
      const logDate = new Date(log.timestamp)
      const today = new Date()
      return logDate.toDateString() === today.toDateString()
    }).length
    const thisWeekLogs = activityLogs.filter(log => {
      const logDate = new Date(log.timestamp)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return logDate >= weekAgo
    }).length

    // Get recent logs by category — kept for potential future use
    // eslint-disable-next-line no-unused-vars
    const recentAdminLogs = activityLogs.filter(log => log.userRole === ROLES.ADMIN).slice(0, 3)
    // eslint-disable-next-line no-unused-vars
    const recentAuditorLogs = activityLogs.filter(log => log.userRole === ROLES.AUDITOR).slice(0, 3)
    // eslint-disable-next-line no-unused-vars
    const recentKspiLogs = activityLogs.filter(log => log.userRole === ROLES.KSPI).slice(0, 3)

    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title-wrap">
              <h3>Ringkasan Sistem</h3>
              <p>Dashboard Administratif Portal AOPTI</p>
            </div>
            <span className="dashboard-date">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Quick Stats Row - Kelola User Stats */}
        <div className="admin-stats-grid dashboard-stats-row">
          <div className="admin-stat-card users-stat" onClick={() => handleTabChange('users')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon users-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-number">{totalUsers}</span>
              <span className="stat-label">Total User</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-breakdown-item">
                <span className="breakdown-dot active"></span>
                <span className="breakdown-text">{activeUsers} Aktif</span>
              </div>
              <div className="stat-breakdown-item">
                <span className="breakdown-dot inactive"></span>
                <span className="breakdown-text">{inactiveUsers} Nonaktif</span>
              </div>
            </div>
          </div>

          <div className="admin-stat-card role-distribution-stat" onClick={() => handleTabChange('roles')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon roles-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-number">3</span>
              <span className="stat-label">Role Aktif</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-breakdown-item">
                <span className="breakdown-dot admin"></span>
                <span className="breakdown-text">{adminCount} Admin</span>
              </div>
              <div className="stat-breakdown-item">
                <span className="breakdown-dot auditor"></span>
                <span className="breakdown-text">{auditorCount} Auditor</span>
              </div>
              <div className="stat-breakdown-item">
                <span className="breakdown-dot kspi"></span>
                <span className="breakdown-text">{kspiCount} KSPI</span>
              </div>
            </div>
          </div>

          <div className="admin-stat-card menus-stat" onClick={() => handleTabChange('roles')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon menus-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-number">{auditorEnabledMenus + kspiEnabledMenus}</span>
              <span className="stat-label">Menu Diakses</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-breakdown-item">
                <span className="breakdown-text">{auditorEnabledMenus}/6 Menu Auditor</span>
              </div>
              <div className="stat-breakdown-item">
                <span className="breakdown-text">{kspiEnabledMenus}/6 Menu KSPI</span>
              </div>
            </div>
          </div>

          <div className="admin-stat-card logs-stat" onClick={() => handleTabChange('logs')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon logs-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-number">{totalActivityLogs}</span>
              <span className="stat-label">Total Aktivitas</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-breakdown-item">
                <span className="breakdown-dot today"></span>
                <span className="breakdown-text">{todayLogs} hari ini</span>
              </div>
              <div className="stat-breakdown-item">
                <span className="breakdown-dot week"></span>
                <span className="breakdown-text">{thisWeekLogs} minggu ini</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Distribution & Role Access Section */}
        <div className="dashboard-row">
          <div className="admin-section-card user-distribution-card">
            <div className="card-header">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Distribusi User per Role
              </h4>
              <button type="button" className="card-action-btn" onClick={() => handleTabChange('users')}>
                Kelola User
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <div className="user-distribution">
              <div className="dist-item admin">
                <div className="dist-info">
                  <div className="dist-icon admin-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <span className="dist-label">Admin</span>
                  <span className="dist-count">{adminCount} user</span>
                </div>
                <div className="dist-bar-container">
                  <div className="dist-bar">
                    <div className="dist-fill admin" style={{ width: `${totalUsers > 0 ? (adminCount / totalUsers) * 100 : 0}%` }}></div>
                  </div>
                  <span className="dist-percent">{totalUsers > 0 ? Math.round((adminCount / totalUsers) * 100) : 0}%</span>
                </div>
              </div>
              <div className="dist-item auditor">
                <div className="dist-info">
                  <div className="dist-icon auditor-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <span className="dist-label">Auditor AOPTI</span>
                  <span className="dist-count">{auditorCount} user</span>
                </div>
                <div className="dist-bar-container">
                  <div className="dist-bar">
                    <div className="dist-fill auditor" style={{ width: `${totalUsers > 0 ? (auditorCount / totalUsers) * 100 : 0}%` }}></div>
                  </div>
                  <span className="dist-percent">{totalUsers > 0 ? Math.round((auditorCount / totalUsers) * 100) : 0}%</span>
                </div>
              </div>
              <div className="dist-item kspi">
                <div className="dist-info">
                  <div className="dist-icon kspi-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                  </div>
                  <span className="dist-label">KSPI</span>
                  <span className="dist-count">{kspiCount} user</span>
                </div>
                <div className="dist-bar-container">
                  <div className="dist-bar">
                    <div className="dist-fill kspi" style={{ width: `${totalUsers > 0 ? (kspiCount / totalUsers) * 100 : 0}%` }}></div>
                  </div>
                  <span className="dist-percent">{totalUsers > 0 ? Math.round((kspiCount / totalUsers) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-section-card role-access-card">
            <div className="card-header">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Hak Akses Menu
              </h4>
              <button type="button" className="card-action-btn" onClick={() => handleTabChange('roles')}>
                Kelola Role
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <div className="role-access-list">
              <div className="role-access-item">
                <div className="role-access-header">
                  <span className="role-access-name">Auditor AOPTI</span>
                  <span className="role-access-count">{auditorEnabledMenus}/6 Menu</span>
                </div>
                <div className="role-access-bar">
                  <div className="role-access-fill auditor" style={{ width: `${(auditorEnabledMenus / 6) * 100}%` }}></div>
                </div>
                <div className="role-access-labels">
                  <span className={`access-label ${auditorMenus['Dashboard'] ? 'active' : 'inactive'}`}>Dashboard</span>
                  <span className={`access-label ${auditorMenus['Rencana Kerja'] ? 'active' : 'inactive'}`}>Rencana</span>
                  <span className={`access-label ${auditorMenus['Fieldwork'] ? 'active' : 'inactive'}`}>Fieldwork</span>
                  <span className={`access-label ${auditorMenus['Temuan Audit'] ? 'active' : 'inactive'}`}>Temuan</span>
                  <span className={`access-label ${auditorMenus['Analytics'] ? 'active' : 'inactive'}`}>Analytics</span>
                  <span className={`access-label ${auditorMenus['Team Chat'] ? 'active' : 'inactive'}`}>Chat</span>
                </div>
              </div>
              <div className="role-access-item">
                <div className="role-access-header">
                  <span className="role-access-name">KSPI</span>
                  <span className="role-access-count">{kspiEnabledMenus}/6 Menu</span>
                </div>
                <div className="role-access-bar">
                  <div className="role-access-fill kspi" style={{ width: `${(kspiEnabledMenus / 6) * 100}%` }}></div>
                </div>
                <div className="role-access-labels">
                  <span className={`access-label ${kspiMenus['Dashboard'] ? 'active' : 'inactive'}`}>Dashboard</span>
                  <span className={`access-label ${kspiMenus['Rencana Kerja'] ? 'active' : 'inactive'}`}>Rencana</span>
                  <span className={`access-label ${kspiMenus['Fieldwork'] ? 'active' : 'inactive'}`}>Fieldwork</span>
                  <span className={`access-label ${kspiMenus['Temuan Audit'] ? 'active' : 'inactive'}`}>Temuan</span>
                  <span className={`access-label ${kspiMenus['Analytics'] ? 'active' : 'inactive'}`}>Analytics</span>
                  <span className={`access-label ${kspiMenus['Team Chat'] ? 'active' : 'inactive'}`}>Chat</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Logs Section */}
        <div className="dashboard-row">
          <div className="admin-section-card activity-card">
            <div className="card-header">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Aktivitas Terbaru
              </h4>
              <button type="button" className="card-action-btn" onClick={() => handleTabChange('logs')}>
                Lihat Semua
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <div className="recent-activity-list">
              {activityLogs.slice(0, 6).map((log) => (
                <div key={log.id} className={`activity-item log-item-${log.userRole || 'admin'}`}>
                  <div className="activity-icon">
                    {getLogIcon(log.action)}
                  </div>
                  <div className="activity-content">
                    <span className="activity-action">{log.action}</span>
                    <span className="activity-details">{log.details}</span>
                  </div>
                  <div className="activity-meta">
                    <span className={`log-role-badge ${log.userRole || 'admin'}`}>
                      {log.userRole === ROLES.ADMIN ? 'Admin' : log.userRole === ROLES.AUDITOR ? 'Auditor' : log.userRole === ROLES.KSPI ? 'KSPI' : 'System'}
                    </span>
                    <span className="activity-time">{formatDate(log.timestamp)}</span>
                  </div>
                </div>
              ))}
              {activityLogs.length === 0 && (
                <div className="empty-activity">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <p>Belum ada aktivitas yang tercatat</p>
                </div>
              )}
            </div>
          </div>

          <div className="admin-section-card activity-summary-card">
            <div className="card-header">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Ringkasan Aktivitas
              </h4>
            </div>
            <div className="activity-stats-grid">
              <div className="activity-stat-item">
                <div className="activity-stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="activity-stat-info">
                  <span className="activity-stat-value">{todayLogs}</span>
                  <span className="activity-stat-label">Aktivitas Hari Ini</span>
                </div>
              </div>
              <div className="activity-stat-item">
                <div className="activity-stat-icon week">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="activity-stat-info">
                  <span className="activity-stat-value">{thisWeekLogs}</span>
                  <span className="activity-stat-label">Minggu Ini</span>
                </div>
              </div>
              <div className="activity-stat-item">
                <div className="activity-stat-icon total">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="activity-stat-info">
                  <span className="activity-stat-value">{totalActivityLogs}</span>
                  <span className="activity-stat-label">Total Keseluruhan</span>
                </div>
              </div>
              <div className="activity-stat-item">
                <div className="activity-stat-icon users-stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="activity-stat-info">
                  <span className="activity-stat-value">{[...new Set(activityLogs.map(l => l.userId))].length}</span>
                  <span className="activity-stat-label">User Aktif</span>
                </div>
              </div>
            </div>
            <div className="activity-breakdown-by-role">
              <h5>Aktivitas per Role</h5>
              <div className="role-activity-breakdown">
                <div className="role-activity-item admin">
                  <span className="role-activity-label">Admin</span>
                  <div className="role-activity-bar">
                    <div className="role-activity-fill" style={{ width: `${totalActivityLogs > 0 ? (activityLogs.filter(l => l.userRole === ROLES.ADMIN).length / totalActivityLogs) * 100 : 0}%` }}></div>
                  </div>
                  <span className="role-activity-count">{activityLogs.filter(l => l.userRole === ROLES.ADMIN).length}</span>
                </div>
                <div className="role-activity-item auditor">
                  <span className="role-activity-label">Auditor</span>
                  <div className="role-activity-bar">
                    <div className="role-activity-fill" style={{ width: `${totalActivityLogs > 0 ? (activityLogs.filter(l => l.userRole === ROLES.AUDITOR).length / totalActivityLogs) * 100 : 0}%` }}></div>
                  </div>
                  <span className="role-activity-count">{activityLogs.filter(l => l.userRole === ROLES.AUDITOR).length}</span>
                </div>
                <div className="role-activity-item kspi">
                  <span className="role-activity-label">KSPI</span>
                  <div className="role-activity-bar">
                    <div className="role-activity-fill" style={{ width: `${totalActivityLogs > 0 ? (activityLogs.filter(l => l.userRole === ROLES.KSPI).length / totalActivityLogs) * 100 : 0}%` }}></div>
                  </div>
                  <span className="role-activity-count">{activityLogs.filter(l => l.userRole === ROLES.KSPI).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function getLogIcon(action) {
    if (action.includes('Login') || action.includes('Logout')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      )
    }
    if (action.includes('Buat') || action.includes('Tambah')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    }
    if (action.includes('Edit') || action.includes('Ubah')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    }
    if (action.includes('Hapus') || action.includes('Delete')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  }

  function renderUsersTab() {
    const roleCounts = {
      all: users.length,
      admin: users.filter(u => u.role === ROLES.ADMIN).length,
      auditor: users.filter(u => u.role === ROLES.AUDITOR).length,
      kspi: users.filter(u => u.role === ROLES.KSPI).length,
    }

    return (
      <>
        <div className="ku-header">
          <div className="ku-header-left">
            <h3>Kelola User</h3>
            <span className="ku-header-desc">Kelola informasi dan akses seluruh pengguna dalam sistem Portal AOPTI</span>
          </div>
          <button type="button" className="primary-btn" onClick={() => handleOpenModal()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah User
          </button>
        </div>

        <div className="ku-stats-row">
          <div className="ku-stat-box" onClick={() => { setFilterRole('all'); setFilterStatus('all'); setSearchQuery(''); }}>
            <div className="ku-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="ku-stat-content">
              <span className="ku-stat-value">{roleCounts.all}</span>
              <span className="ku-stat-label">Total User</span>
              <span className="ku-stat-desc">Seluruh pengguna sistem</span>
            </div>
          </div>
          <div className="ku-stat-box admin" onClick={() => { setFilterRole(ROLES.ADMIN); setFilterStatus('all'); }}>
            <div className="ku-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="ku-stat-content">
              <span className="ku-stat-value">{roleCounts.admin}</span>
              <span className="ku-stat-label">Admin</span>
              <span className="ku-stat-desc">Kelola sistem & pengguna</span>
            </div>
          </div>
          <div className="ku-stat-box auditor" onClick={() => { setFilterRole(ROLES.AUDITOR); setFilterStatus('all'); }}>
            <div className="ku-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div className="ku-stat-content">
              <span className="ku-stat-value">{roleCounts.auditor}</span>
              <span className="ku-stat-label">Auditor AOPTI</span>
              <span className="ku-stat-desc">Tim audit lapangan</span>
            </div>
          </div>
          <div className="ku-stat-box kspi" onClick={() => { setFilterRole(ROLES.KSPI); setFilterStatus('all'); }}>
            <div className="ku-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              </svg>
            </div>
            <div className="ku-stat-content">
              <span className="ku-stat-value">{roleCounts.kspi}</span>
              <span className="ku-stat-label">KSPI</span>
              <span className="ku-stat-desc">Pengawas intern</span>
            </div>
          </div>
        </div>

        <div className="ku-toolbar">
          <label className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="ku-filter-btns">
            <span className="ku-filter-label">Role:</span>
            <button
              type="button"
              className={`ku-filter-btn ${filterRole === 'all' ? 'active' : ''}`}
              onClick={() => setFilterRole('all')}
            >
              Semua
            </button>
            <button
              type="button"
              className={`ku-filter-btn ${filterRole === ROLES.ADMIN ? 'active' : ''}`}
              onClick={() => setFilterRole(ROLES.ADMIN)}
            >
              Admin
            </button>
            <button
              type="button"
              className={`ku-filter-btn ${filterRole === ROLES.AUDITOR ? 'active' : ''}`}
              onClick={() => setFilterRole(ROLES.AUDITOR)}
            >
              Auditor
            </button>
            <button
              type="button"
              className={`ku-filter-btn ${filterRole === ROLES.KSPI ? 'active' : ''}`}
              onClick={() => setFilterRole(ROLES.KSPI)}
            >
              KSPI
            </button>
          </div>
          <div className="ku-filter-btns">
            <span className="ku-filter-label">Status:</span>
            <button
              type="button"
              className={`ku-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              Semua
            </button>
            <button
              type="button"
              className={`ku-filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Aktif
            </button>
            <button
              type="button"
              className={`ku-filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterStatus('inactive')}
            >
              Nonaktif
            </button>
          </div>
        </div>

        <div className="ku-table-wrap">
          <table className="ku-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Email</th>
                <th>Departemen</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="ku-empty-cell">
                    {searchQuery || filterRole !== 'all' || filterStatus !== 'all'
                      ? 'Tidak ada user yang sesuai filter'
                      : 'Belum ada user'}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className={user.id === currentUser?.id ? 'current-user-row' : ''}>
                    <td>
                      <div className="ku-user-cell">
                        <div className="ku-avatar" style={{ background: ROLE_COLORS[user.role].bg, color: ROLE_COLORS[user.role].text }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ku-user-info">
                          <span className="ku-user-name">
                            {user.name}
                            {user.id === currentUser?.id && <span className="ku-you-badge">Anda</span>}
                          </span>
                          <span className="ku-user-username">@{user.username}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="ku-role-badge" style={{ background: ROLE_COLORS[user.role].bg, color: ROLE_COLORS[user.role].text }}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td>
                      <span className={`ku-status-badge ${user.status}`}>
                        {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="ku-email">{user.email || '-'}</td>
                    <td className="ku-dept">{user.department || '-'}</td>
                    <td>
                      <div className="ku-actions">
                        <button
                          type="button"
                          className="ku-action-btn edit"
                          onClick={() => handleOpenModal(user)}
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`ku-action-btn toggle ${user.status === 'active' ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleStatus(user.id)}
                          title={user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {user.status === 'active' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          className="ku-action-btn delete"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? 'Tidak dapat menghapus' : 'Hapus'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="ku-pagination">
            <span className="ku-pagination-info">
              Menampilkan {((currentPage - 1) * USERS_PER_PAGE) + 1} - {Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} dari {filteredUsers.length}
            </span>
            <div className="ku-pagination-controls">
              <button
                type="button"
                className="ku-page-btn prev"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  className={`ku-page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="ku-page-btn next"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderRolesTab() {
    const roleStats = {
      [ROLES.AUDITOR]: users.filter(u => u.role === ROLES.AUDITOR).length,
      [ROLES.KSPI]: users.filter(u => u.role === ROLES.KSPI).length,
    }

    const menuIcons = {
      'grid': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
      'folder': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
      'clipboard': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
      'alert': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
      'chart': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
      'message': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    }

    const renderRolePanel = (role, roleName, menus, menuSettings, handleToggle, roleType) => {
      const enabledCount = Object.values(menuSettings).filter(v => v).length
      const totalCount = Object.keys(menuSettings).length

      return (
        <div className="rha-panel">
          <div className="rha-panel-header" style={{
            background: `linear-gradient(135deg, ${ROLE_COLORS[role].bg} 0%, ${ROLE_COLORS[role].bg}dd 100%)`,
            borderBottom: `2px solid ${ROLE_COLORS[role].text}`
          }}>
            <div className="rha-panel-title">
              <div className="rha-panel-icon" style={{ background: '#fff', color: ROLE_COLORS[role].text }}>
                {role === ROLES.AUDITOR ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                )}
              </div>
              <div className="rha-panel-info">
                <h4>{roleName}</h4>
                <div className="rha-panel-meta">
                  <span className="rha-user-count">{roleStats[role]} user</span>
                  <span className="rha-access-count">{enabledCount}/{totalCount} menu aktif</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rha-menu-list">
            {MENUS.map(menu => {
              const isEnabled = menuSettings[menu.key] !== false
              return (
                <div key={menu.key} className={`rha-menu-item ${!isEnabled ? 'rha-menu-item-disabled' : ''}`}>
                  <div className="rha-menu-item-icon" style={{ color: isEnabled ? ROLE_COLORS[role].text : '#9ca3af' }}>
                    {menuIcons[menu.icon]}
                  </div>
                  <div className="rha-menu-item-info">
                    <span className="rha-menu-item-name">{menu.label}</span>
                    <span className="rha-menu-item-desc">{roleType === 'auditor' ? menu.auditorLabel : menu.kspiLabel}</span>
                  </div>
                  <div className="rha-menu-item-toggle">
                    <button
                      type="button"
                      className={`toggle-btn ${isEnabled ? 'active' : 'inactive'}`}
                      onClick={() => handleToggle(menu.key)}
                      title={isEnabled ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    >
                      <span className="toggle-btn-track">
                        <span className="toggle-btn-status">
                          {isEnabled ? 'ON' : 'OFF'}
                        </span>
                        <span className="toggle-btn-thumb">
                          {isEnabled ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <div className="rha-page">
        <div className="rha-header">
          <div className="rha-header-left">
            <h3>Role & Hak Akses</h3>
            <p>Kelola menu yang dapat diakses oleh setiap role dalam sistem</p>
          </div>
        </div>

        <div className="rha-content">
          <div className="rha-panels">
            {renderRolePanel(ROLES.AUDITOR, 'Auditor AOPTI', MENUS, auditorMenus, handleToggleAuditorMenu, 'auditor')}
            {renderRolePanel(ROLES.KSPI, 'KSPI', MENUS, kspiMenus, handleToggleKspiMenu, 'kspi')}
          </div>
        </div>
      </div>
    )
  }

  function renderLogsTab() {
    const uniqueActions = [...new Set(activityLogs.map(log => log.action))]
    const filteredLogs = activityLogs.filter(log => {
      const matchesSearch = logSearch === '' ||
        log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.user.toLowerCase().includes(logSearch.toLowerCase())
      const matchesAction = logFilterAction === 'all' || log.action === logFilterAction
      const matchesRole = logFilterRole === 'all' || log.userRole === logFilterRole
      const matchesCategory = logFilterCategory === 'all' || log.category === logFilterCategory
      return matchesSearch && matchesAction && matchesRole && matchesCategory
    })

    const getLogIcon = (action) => {
      if (action.includes('Login') || action.includes('Logout')) {
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        )
      }
      if (action.includes('Buat') || action.includes('Tambah')) {
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        )
      }
      if (action.includes('Edit') || action.includes('Ubah')) {
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        )
      }
      if (action.includes('Hapus') || action.includes('Delete')) {
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        )
      }
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    }

    // Get log counts by category
    const logCounts = {
      all: activityLogs.length,
      [ROLES.KSPI]: activityLogs.filter(log => log.category === ROLES.KSPI).length,
      [ROLES.AUDITOR]: activityLogs.filter(log => log.category === ROLES.AUDITOR).length,
      [ROLES.ADMIN]: activityLogs.filter(log => log.category === ROLES.ADMIN).length,
    }
    const todayLogCount = activityLogs.filter((log) => new Date(log.timestamp).toDateString() === new Date().toDateString()).length
    const uniqueUserCount = [...new Set(activityLogs.map((log) => log.userId || log.user).filter(Boolean))].length
    const destructiveCount = activityLogs.filter((log) => /hapus|delete|reset/i.test(log.action)).length

    return (
      <div className="logs-section">
        <div className="ku-header">
          <div className="ku-header-left">
            <h3>Log Aktivitas Sistem</h3>
            <span className="ku-header-desc">Catat dan pantau aktivitas login, logout, serta perubahan data oleh pengguna</span>
          </div>
          <button
            type="button"
            className="danger-btn"
            onClick={async () => {
              const ok = await toast.confirm({
                title: 'Bersihkan Log',
                message: 'Semua log aktivitas akan dihapus. Lanjutkan?',
                confirmLabel: 'Hapus Semua',
                tone: 'danger',
              })
              if (ok) {
                setActivityLogs([])
                localStorage.removeItem('portalAoptiActivityLogs')
                toast.success('Log aktivitas telah dibersihkan')
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Bersihkan Log
          </button>
        </div>
        <div className="logs-count-summary">
          <span className="logs-count">{filteredLogs.length} dari {activityLogs.length} aktivitas</span>
        </div>

        <div className="logs-insight-strip">
          <div className="logs-insight-card">
            <span>Aktivitas Hari Ini</span>
            <strong>{todayLogCount}</strong>
          </div>
          <div className="logs-insight-card">
            <span>User Terlibat</span>
            <strong>{uniqueUserCount}</strong>
          </div>
          <div className="logs-insight-card logs-insight-card--risk">
            <span>Aksi Sensitif</span>
            <strong>{destructiveCount}</strong>
          </div>
        </div>

        {/* Log Category Tabs */}
        <div className="log-category-tabs">
          <button
            type="button"
            className={`log-category-tab ${logFilterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setLogFilterCategory('all')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Semua
            <span className="log-category-count">{logCounts.all}</span>
          </button>
          <button
            type="button"
            className={`log-category-tab kspi ${logFilterCategory === ROLES.KSPI ? 'active' : ''}`}
            onClick={() => setLogFilterCategory(ROLES.KSPI)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            KSPI
            <span className="log-category-count">{logCounts[ROLES.KSPI]}</span>
          </button>
          <button
            type="button"
            className={`log-category-tab auditor ${logFilterCategory === ROLES.AUDITOR ? 'active' : ''}`}
            onClick={() => setLogFilterCategory(ROLES.AUDITOR)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Auditor AOPTI
            <span className="log-category-count">{logCounts[ROLES.AUDITOR]}</span>
          </button>
          <button
            type="button"
            className={`log-category-tab admin ${logFilterCategory === ROLES.ADMIN ? 'active' : ''}`}
            onClick={() => setLogFilterCategory(ROLES.ADMIN)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin
            <span className="log-category-count">{logCounts[ROLES.ADMIN]}</span>
          </button>
        </div>

        <div className="logs-filters">
          <label className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari aktivitas..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </label>
          <select value={logFilterRole} onChange={(e) => setLogFilterRole(e.target.value)} className="log-filter-select">
            <option value="all">Semua Role</option>
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.AUDITOR}>Auditor AOPTI</option>
            <option value={ROLES.KSPI}>KSPI</option>
          </select>
          <select value={logFilterAction} onChange={(e) => setLogFilterAction(e.target.value)} className="log-filter-select">
            <option value="all">Semua Aksi</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div className="logs-list logs-timeline-list">
          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p>{logSearch || logFilterAction !== 'all' || logFilterRole !== 'all' ? 'Tidak ada aktivitas yang sesuai filter' : 'Belum ada aktivitas yang tercatat'}</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`log-item log-timeline-item ${log.userRole ? `log-item-${log.userRole}` : ''}`}>
                <div className="log-icon" style={{
                  color: log.userRole === ROLES.ADMIN ? '#7c3aed' :
                         log.userRole === ROLES.AUDITOR ? '#2563eb' :
                         log.userRole === ROLES.KSPI ? '#059669' : '#1f4f96',
                  background: log.userRole === ROLES.ADMIN ? '#f3e8ff' :
                              log.userRole === ROLES.AUDITOR ? '#e8f0ff' :
                              log.userRole === ROLES.KSPI ? '#e6f7ed' : '#f4f6ff'
                }}>
                  {getLogIcon(log.action)}
                </div>
                <div className="log-content">
                  <div className="log-header">
                    <div className="log-header-left">
                      <span className="log-action">{log.action}</span>
                      {log.userRole && (
                        <span className={`log-role-badge ${log.userRole}`}>
                          {ROLE_LABELS[log.userRole]}
                        </span>
                      )}
                    </div>
                    <span className="log-time">{formatDate(log.timestamp)}</span>
                  </div>
                  <p className="log-details">{log.details}</p>
                  <div className="log-footer">
                    <span className="log-user">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {log.user}
                    </span>
                    <span className="log-ip">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                      </svg>
                      {log.ipAddress}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  function renderProgramsTab() {
    return (
      <div className="admin-programs-section">
        <div className="admin-section-header">
          <h3>Daftar Program Kerja Audit</h3>
          <span className="section-count">{allPrograms.length} program</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama Program</th>
                <th>Tahun</th>
                <th>Total Tugas</th>
                <th>Selesai</th>
                <th>Berlangsung</th>
                <th>Temuan</th>
              </tr>
            </thead>
            <tbody>
              {programStats.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-cell">Belum ada program kerja</td>
                </tr>
              ) : (
                programStats.map((program, idx) => (
                  <tr key={program.id}>
                    <td>{idx + 1}</td>
                    <td className="program-name-cell">{program.name}</td>
                    <td>{program.year}</td>
                    <td>{program.totalTasks}</td>
                    <td>
                      <span className="status-badge completed">{program.completed}</span>
                    </td>
                    <td>
                      <span className="status-badge in-progress">{program.inProgress}</span>
                    </td>
                    <td>
                      <span className="status-badge findings">{program.totalFindings}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderTasksTab() {
    const tasksWithPrograms = allWorkList.map(task => {
      const program = allPrograms.find(p => p.id === task.programId)
      return { ...task, programName: program?.name || task.programName }
    })

    return (
      <div className="admin-tasks-section">
        <div className="admin-section-header">
          <h3>Daftar Semua Tugas Audit</h3>
          <span className="section-count">{allWorkList.length} tugas</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama Tugas</th>
                <th>Program</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {tasksWithPrograms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">Belum ada tugas audit</td>
                </tr>
              ) : (
                tasksWithPrograms.map((task, idx) => {
                  const statusInfo = {
                    scheduled: { label: 'Terjadwal', bg: '#f4f6ff', color: '#6f7a94' },
                    in_progress: { label: 'Berlangsung', bg: '#e8efff', color: '#0c3d86' },
                    completed: { label: 'Selesai', bg: '#e6f7ed', color: '#22a95f' },
                  }[task.status] || { label: '-', bg: '#f4f6ff', color: '#6f7a94' }
                  return (
                    <tr key={task.id}>
                      <td>{idx + 1}</td>
                      <td className="task-name-cell">{task.taskName}</td>
                      <td className="program-name-cell">{task.programName}</td>
                      <td>{task.startDate ? new Date(task.startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td>
                        <span className="status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>{task.location || '-'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderFindingsTab() {
    const allFindings = []

    allWorkList.forEach(task => {
      const fw = allFieldworks[task.id]
      if (fw?.findings?.length > 0) {
        fw.findings.forEach(finding => {
          allFindings.push({
            ...finding,
            taskId: task.id,
            taskName: task.taskName,
            programName: task.programName,
            createdAt: finding.createdAt || new Date().toISOString()
          })
        })
      }
    })

    return (
      <div className="admin-findings-section">
        <div className="admin-section-header">
          <h3>Kelola Temuan Audit</h3>
          <span className="section-count">{allFindings.length} temuan</span>
        </div>
        <div className="findings-stats">
          <div className="finding-stat-card high">
            <span className="finding-stat-value">{allFindings.filter(f => f.severity === 'high').length}</span>
            <span className="finding-stat-label">Tingkat Tinggi</span>
          </div>
          <div className="finding-stat-card medium">
            <span className="finding-stat-value">{allFindings.filter(f => f.severity === 'medium').length}</span>
            <span className="finding-stat-label">Tingkat Sedang</span>
          </div>
          <div className="finding-stat-card low">
            <span className="finding-stat-value">{allFindings.filter(f => f.severity === 'low').length}</span>
            <span className="finding-stat-label">Tingkat Rendah</span>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Judul Temuan</th>
                <th>Tugas</th>
                <th>Program</th>
                <th>Tingkat</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allFindings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">Belum ada temuan audit</td>
                </tr>
              ) : (
                allFindings.map((finding, idx) => {
                  const severityInfo = {
                    high: { label: 'Tinggi', bg: '#fff0f0', color: '#d13438' },
                    medium: { label: 'Sedang', bg: '#fff4e6', color: '#b15b08' },
                    low: { label: 'Rendah', bg: '#e6f7ed', color: '#22a95f' },
                  }[finding.severity] || { label: '-', bg: '#f4f6ff', color: '#6f7a94' }
                  return (
                    <tr key={finding.id}>
                      <td>{idx + 1}</td>
                      <td className="finding-title-cell">
                        <span className="finding-title">{finding.title || '(Tanpa judul)'}</span>
                        <span className="finding-desc">{finding.description || '-'}</span>
                      </td>
                      <td className="task-name-cell">{finding.taskName}</td>
                      <td className="program-name-cell">{finding.programName}</td>
                      <td>
                        <span className="severity-badge" style={{ background: severityInfo.bg, color: severityInfo.color }}>
                          {severityInfo.label}
                        </span>
                      </td>
                      <td>
                        <select className="finding-status-select">
                          <option value="pending">Menunggu</option>
                          <option value="review">Ditinjau</option>
                          <option value="approved">Disetujui</option>
                          <option value="resolved">Terselesaikan</option>
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderAnalyticsTab() {
    const totalTasks = allWorkList.length
    const completedTasks = allWorkList.filter(t => t.status === 'completed').length
    const inProgressTasks = allWorkList.filter(t => t.status === 'in_progress').length
    const scheduledTasks = allWorkList.filter(t => t.status === 'scheduled').length

    const allFindings = []
    allWorkList.forEach(task => {
      const fw = allFieldworks[task.id]
      if (fw?.findings?.length > 0) {
        fw.findings.forEach(f => allFindings.push(f))
      }
    })

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const programBreakdown = programStats.map(p => ({
      name: p.name,
      total: p.totalTasks,
      completed: p.completed,
      progress: p.totalTasks > 0 ? Math.round((p.completed / p.totalTasks) * 100) : 0
    }))

    return (
      <div className="admin-analytics-section">
        <div className="analytics-header">
          <h3>Analytics Sistem</h3>
        </div>

        <div className="analytics-cards-grid">
          <div className="analytics-card">
            <div className="analytics-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="analytics-card-content">
              <span className="analytics-value">{allPrograms.length}</span>
              <span className="analytics-label">Total Program</span>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div className="analytics-card-content">
              <span className="analytics-value">{totalTasks}</span>
              <span className="analytics-label">Total Tugas</span>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-card-icon completed">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="analytics-card-content">
              <span className="analytics-value">{completedTasks}</span>
              <span className="analytics-label">Tugas Selesai</span>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-card-icon findings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div className="analytics-card-content">
              <span className="analytics-value">{allFindings.length}</span>
              <span className="analytics-label">Total Temuan</span>
            </div>
          </div>
        </div>

        <div className="analytics-progress-section">
          <h4>Overall Progress</h4>
          <div className="analytics-progress-bar">
            <div className="analytics-progress-fill" style={{ width: `${completionRate}%` }}></div>
          </div>
          <div className="analytics-progress-stats">
            <div className="progress-stat">
              <span className="progress-stat-value">{completionRate}%</span>
              <span className="progress-stat-label">Tingkat Penyelesaian</span>
            </div>
            <div className="progress-stat">
              <span className="progress-stat-value">{inProgressTasks}</span>
              <span className="progress-stat-label">Sedang Berlangsung</span>
            </div>
            <div className="progress-stat">
              <span className="progress-stat-value">{scheduledTasks}</span>
              <span className="progress-stat-label">Terjadwal</span>
            </div>
          </div>
        </div>

        <div className="analytics-programs-breakdown">
          <h4>Breakdown per Program</h4>
          <div className="programs-breakdown-list">
            {programBreakdown.length === 0 ? (
              <p className="no-data">Belum ada data program</p>
            ) : (
              programBreakdown.map((program, idx) => (
                <div key={idx} className="program-breakdown-item">
                  <div className="program-breakdown-header">
                    <span className="program-breakdown-name">{program.name}</span>
                    <span className="program-breakdown-count">{program.total} tugas</span>
                  </div>
                  <div className="program-breakdown-bar">
                    <div className="program-breakdown-fill" style={{ width: `${program.progress}%` }}></div>
                  </div>
                  <span className="program-breakdown-percent">{program.progress}% selesai ({program.completed}/{program.total})</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analytics-findings-summary">
          <h4>Ringkasan Temuan</h4>
          <div className="findings-summary-grid">
            <div className="finding-summary-item high">
              <span className="finding-summary-value">{allFindings.filter(f => f.severity === 'high').length}</span>
              <span className="finding-summary-label">Temuan Tinggi</span>
            </div>
            <div className="finding-summary-item medium">
              <span className="finding-summary-value">{allFindings.filter(f => f.severity === 'medium').length}</span>
              <span className="finding-summary-label">Temuan Sedang</span>
            </div>
            <div className="finding-summary-item low">
              <span className="finding-summary-value">{allFindings.filter(f => f.severity === 'low').length}</span>
              <span className="finding-summary-label">Temuan Rendah</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="page-wrap admin-page-shell">
      <article className="admin-card admin-content-surface">
        {renderTabContent()}
      </article>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {message && (
                  <div className={`form-message ${messageType}`}>
                    {message}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Nama Lengkap</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Masukkan username"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@contoh.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Telepon</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="021-xxxxxxx"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="department">Departemen</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Nama departemen"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">
                    Password {editingUser && <span className="label-hint">(kosongkan jika tidak diubah)</span>}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingUser ? 'Masukkan password baru' : 'Masukkan password'}
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <div className="role-selector">
                    {Object.values(ROLES).map((role) => (
                      <label key={role} className="role-option">
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={formData.role === role}
                          onChange={handleInputChange}
                        />
                        <span className="role-option-content" style={{ background: ROLE_COLORS[role].bg, color: ROLE_COLORS[role].text }}>
                          {ROLE_LABELS[role]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="role-description">
                  {formData.role === ROLES.ADMIN && (
                    <p>Admin dapat membuat, mengedit, dan menghapus user lain. Memiliki akses penuh ke semua fitur.</p>
                  )}
                  {formData.role === ROLES.AUDITOR && (
                    <p>Auditor AOPTI dapat membuat dan mengedit program kerja, fieldwork, dan melihat analytics.</p>
                  )}
                  {formData.role === ROLES.KSPI && (
                    <p>KSPI hanya dapat melihat data (view only). Tidak dapat membuat atau mengedit data.</p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Batal
                </button>
                <button type="submit" className="submit-btn">
                  {editingUser ? 'Simpan Perubahan' : 'Buat User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && viewingUser && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Profil User</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowProfileModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="profile-header">
                <div className="profile-avatar" style={{ background: ROLE_COLORS[viewingUser.role].bg, color: ROLE_COLORS[viewingUser.role].text }}>
                  {viewingUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                  <h4>{viewingUser.name}</h4>
                  <span className="profile-username">@{viewingUser.username}</span>
                  <span className="role-badge" style={{ background: ROLE_COLORS[viewingUser.role].bg, color: ROLE_COLORS[viewingUser.role].text }}>
                    {ROLE_LABELS[viewingUser.role]}
                  </span>
                </div>
              </div>

              <div className="profile-details">
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Email</span>
                  <span className="profile-detail-value">{viewingUser.email || '-'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Telepon</span>
                  <span className="profile-detail-value">{viewingUser.phone || '-'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Departemen</span>
                  <span className="profile-detail-value">{viewingUser.department || '-'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Status</span>
                  <span className="status-badge" style={{ background: STATUS_COLORS[viewingUser.status]?.bg, color: STATUS_COLORS[viewingUser.status]?.text }}>
                    {viewingUser.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Tanggal Dibuat</span>
                  <span className="profile-detail-value">{viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</span>
                </div>
              </div>

              <div className="profile-activities">
                <h4>Aktivitas Terakhir</h4>
                {userActivities.length === 0 ? (
                  <p className="no-activities">Belum ada aktivitas</p>
                ) : (
                  <div className="profile-activity-list">
                    {userActivities.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="profile-activity-item">
                        <span className="profile-activity-action">{activity.action}</span>
                        <span className="profile-activity-time">{formatDate(activity.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="cancel-btn" onClick={() => setShowProfileModal(false)}>
                Tutup
              </button>
              <button type="button" className="submit-btn" onClick={() => { setShowProfileModal(false); handleOpenModal(viewingUser) }}>
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="modal-overlay" onClick={handleCloseResetPassword}>
          <div className="modal-content admin-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button type="button" className="modal-close-btn" onClick={handleCloseResetPassword}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="modal-body">
                <p className="reset-info">
                  Reset password untuk user <strong>{resetPasswordUser.name}</strong>
                </p>
                {message && (
                  <div className={`form-message ${messageType}`}>
                    {message}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="newPassword">Password Baru</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={resetPasswordData.newPassword}
                    onChange={(e) => setResetPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Masukkan password baru (min. 6 karakter)"
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Konfirmasi Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={resetPasswordData.confirmPassword}
                    onChange={(e) => setResetPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Ulangi password baru"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={handleCloseResetPassword}>
                  Batal
                </button>
                <button type="submit" className="submit-btn">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={handleCloseImport}>
          <div className="modal-content admin-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import User dari CSV</h3>
              <button type="button" className="modal-close-btn" onClick={handleCloseImport}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {message && (
                <div className={`form-message ${messageType}`}>
                  {message}
                </div>
              )}
              <div className="import-instructions">
                <h4>Format CSV:</h4>
                <pre className="csv-format">
username,name,role,email,department,phone
ahmad.auditor,Ahmad Auditor,auditor,ahmad@email.com,Tim Audit 1,021-xxx
budi.user,Budi User,kspi,budi@email.com,KSPI,021-xxx
                </pre>
                <p><strong>Role yang valid:</strong> admin, auditor, kspi</p>
                <p><strong>Catatan:</strong> Username yang sudah ada akan dilewati.</p>
              </div>
              <div className="form-group">
                <label>Pilih File CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="file-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="cancel-btn" onClick={handleCloseImport}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminPage
