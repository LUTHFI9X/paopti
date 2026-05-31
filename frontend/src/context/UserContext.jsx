import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getUsers,
  login as apiLogin,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  resetUserPassword as apiResetUserPassword,
  changePassword as apiChangePassword,
} from '../services/spiHubApi'

function extractApiError(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error

  if (message) {
    return message
  }

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    const baseUrl = error?.config?.baseURL || ''
    if (baseUrl.includes('localhost')) {
      return 'Koneksi API masih mengarah ke localhost. Set VITE_API_BASE_URL ke URL backend production.'
    }
    return 'Tidak bisa terhubung ke server API. Periksa URL backend Railway dan status deploy.'
  }

  if (error?.response?.status === 404) {
    return 'Endpoint API tidak ditemukan. Pastikan backend Railway aktif dan path /api tersedia.'
  }

  return (
    error?.message ||
    fallback
  )
}

const UserContext = createContext(null)

const ROLES = {
  ADMIN: 'admin',
  AUDITOR: 'auditor',
  KSPI: 'kspi',
}

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.AUDITOR]: 'Auditor AOPTI',
  [ROLES.KSPI]: 'KSPI',
}

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    canCreateUser: true,
    canEditUser: true,
    canDeleteUser: true,
    canEditWorkList: true,
    canDeleteWorkList: true,
    canEditFieldwork: true,
    canDeleteFieldwork: true,
    canViewAnalytics: true,
    canManageChat: true,
  },
  [ROLES.AUDITOR]: {
    canCreateUser: false,
    canEditUser: false,
    canDeleteUser: false,
    canEditWorkList: true,
    canDeleteWorkList: true,
    canEditFieldwork: true,
    canDeleteFieldwork: true,
    canViewAnalytics: true,
    canManageChat: true,
  },
  [ROLES.KSPI]: {
    canCreateUser: false,
    canEditUser: false,
    canDeleteUser: false,
    canEditWorkList: false,
    canDeleteWorkList: false,
    canEditFieldwork: false,
    canDeleteFieldwork: false,
    canViewAnalytics: true,
    canManageChat: true,
  },
}

function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshUsers = useCallback(async () => {
    try {
      const apiUsers = await getUsers()
      setUsers(apiUsers)
      localStorage.setItem('portalAoptiUsers', JSON.stringify(apiUsers))
      window.dispatchEvent(new Event('portalAoptiUsers-changed'))
      return apiUsers
    } catch (error) {
      setUsers([])
      localStorage.removeItem('portalAoptiUsers')
      throw error
    }
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('portalAoptiCurrentUser')
    if (storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(storedUser))
    }

    let cancelled = false

    async function loadUsers() {
      try {
        await refreshUsers()
      } catch (_error) {
        setUsers([])
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [refreshUsers])

  const login = useCallback(async (username, password) => {
    try {
      const result = await apiLogin(username, password)
      const userWithoutPassword = {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
        role: result.user.role,
        must_change_password: Boolean(result.user.must_change_password),
      }

      setUser(userWithoutPassword)
      localStorage.setItem('portalAoptiCurrentUser', JSON.stringify(userWithoutPassword))
      localStorage.setItem('spiHubToken', result.token || 'logged-in')
      localStorage.setItem('spiHubUserName', userWithoutPassword.name)

      const logEntry = {
        id: `log-${Date.now()}`,
        userId: result.user.id,
        user: result.user.name,
        userRole: result.user.role,
        action: 'Login',
        details: `User ${result.user.name} (${result.user.username}) berhasil masuk ke sistem`,
        timestamp: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        category: result.user.role,
      }
      const existingLogs = JSON.parse(localStorage.getItem('portalAoptiActivityLogs') || '[]')
      localStorage.setItem('portalAoptiActivityLogs', JSON.stringify([logEntry, ...existingLogs]))

      return { success: true, user: userWithoutPassword, token: result.token }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Tidak dapat terhubung ke database') }
    }
  }, [])

  const logout = useCallback(() => {
    const currentUserData = JSON.parse(localStorage.getItem('portalAoptiCurrentUser'))
    if (currentUserData) {
      // Log logout activity
      const logEntry = {
        id: `log-${Date.now()}`,
        userId: currentUserData.id,
        user: currentUserData.name,
        userRole: currentUserData.role,
        action: 'Logout',
        details: `User ${currentUserData.name} (${currentUserData.username}) keluar dari sistem`,
        timestamp: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        category: currentUserData.role,
      }
      const existingLogs = JSON.parse(localStorage.getItem('portalAoptiActivityLogs') || '[]')
      localStorage.setItem('portalAoptiActivityLogs', JSON.stringify([logEntry, ...existingLogs]))
    }
    setUser(null)
    localStorage.removeItem('portalAoptiCurrentUser')
  }, [])

  const createUser = useCallback(async (userData) => {
    try {
      const created = await apiCreateUser({
        username: userData.username,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        email: userData.email || '',
        department: userData.department || '',
        phone: userData.phone || '',
        status: 'active',
      })
      await refreshUsers()
      return { success: true, user: created }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Gagal membuat user') }
    }
  }, [refreshUsers])

  const updateUser = useCallback(async (userId, userData) => {
    try {
      await apiUpdateUser(userId, userData)
      await refreshUsers()
      return { success: true }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Gagal mengupdate user') }
    }
  }, [refreshUsers])

  const resetPassword = useCallback(async (userId, newPassword) => {
    try {
      await apiResetUserPassword(userId, { password: newPassword })
      await refreshUsers()
      return { success: true }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Gagal mereset password') }
    }
  }, [refreshUsers])

  const changePassword = useCallback(async ({ currentPassword, newPassword, forced = false }) => {
    try {
      await apiChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
        forced,
      })
      const stored = JSON.parse(localStorage.getItem('portalAoptiCurrentUser') || 'null')
      if (stored) {
        const updated = { ...stored, must_change_password: false }
        localStorage.setItem('portalAoptiCurrentUser', JSON.stringify(updated))
        setUser(updated)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Gagal mengganti password') }
    }
  }, [])

  const toggleUserStatus = useCallback(async (userId) => {
    const target = users.find((u) => u.id === userId)
    if (!target) {
      return { success: false, error: 'User tidak ditemukan' }
    }
    const newStatus = target.status === 'active' ? 'inactive' : 'active'
    try {
      await apiUpdateUser(userId, { status: newStatus })
      await refreshUsers()
      return { success: true }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Gagal mengubah status user') }
    }
  }, [users, refreshUsers])

  const deleteUser = useCallback(async (userId) => {
    if (user && user.id === userId) {
      return { success: false, error: 'Tidak dapat menghapus user yang sedang login' }
    }
    try {
      await apiDeleteUser(userId)
      await refreshUsers()
      return { success: true }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Gagal menghapus user') }
    }
  }, [user, refreshUsers])

  const hasPermission = useCallback((permission) => {
    if (!user) return false
    return ROLE_PERMISSIONS[user.role]?.[permission] || false
  }, [user])

  const importUsers = useCallback(async (usersArray) => {
    let imported = 0
    let skipped = 0
    const existingUsernames = new Set(users.map((u) => u.username))

    for (const userData of usersArray) {
      if (existingUsernames.has(userData.username)) {
        skipped++
        continue
      }
      try {
        await apiCreateUser({
          username: userData.username,
          password: userData.password || 'password123',
          name: userData.name,
          role: userData.role || ROLES.AUDITOR,
          email: userData.email || '',
          department: userData.department || '',
          phone: userData.phone || '',
          status: 'active',
        })
        existingUsernames.add(userData.username)
        imported++
      } catch (_error) {
        skipped++
      }
    }

    await refreshUsers()
    return { success: true, imported, skipped }
  }, [users, refreshUsers])

  const getUserActivities = useCallback((userId) => {
    const logs = JSON.parse(localStorage.getItem('portalAoptiActivityLogs') || '[]')
    return logs.filter((log) => log.userId === userId || log.user === users.find((u) => u.id === userId)?.name)
  }, [users])

  const value = {
    user,
    users,
    isLoading,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    changePassword,
    toggleUserStatus,
    importUsers,
    getUserActivities,
    refreshUsers,
    hasPermission,
    ROLES,
    ROLE_LABELS,
    ROLE_PERMISSIONS,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export { UserProvider, useUser, ROLES, ROLE_LABELS, ROLE_PERMISSIONS }
export default UserContext
