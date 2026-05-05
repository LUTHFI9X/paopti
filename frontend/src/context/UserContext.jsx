import { createContext, useContext, useState, useEffect, useCallback } from 'react'

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

const initialUsers = [
  { id: 'u1', username: 'admin', password: 'admin123', name: 'Administrator', role: ROLES.ADMIN, email: 'admin@aopti.go.id', department: 'Pengawasan Intern', phone: '021-1234567', status: 'active', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'u2', username: 'auditor', password: 'auditor123', name: 'Ahmad Auditor', role: ROLES.AUDITOR, email: 'ahmad.auditor@aopti.go.id', department: 'Tim Audit 1', phone: '021-2345678', status: 'active', createdAt: '2024-01-15T00:00:00.000Z' },
  { id: 'u3', username: 'kspi', password: 'kspi123', name: 'Budi KSPI', role: ROLES.KSPI, email: 'budi.kspi@aopti.go.id', department: 'KSPI', phone: '021-3456789', status: 'active', createdAt: '2024-02-01T00:00:00.000Z' },
]

function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUsers = localStorage.getItem('portalAoptiUsers')
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers))
    } else {
      setUsers(initialUsers)
      localStorage.setItem('portalAoptiUsers', JSON.stringify(initialUsers))
    }

    const storedUser = localStorage.getItem('portalAoptiCurrentUser')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = useCallback((username, password) => {
    const foundUser = users.find(
      (u) => u.username === username && u.password === password
    )
    if (foundUser) {
      const userWithoutPassword = {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        role: foundUser.role,
      }
      setUser(userWithoutPassword)
      localStorage.setItem('portalAoptiCurrentUser', JSON.stringify(userWithoutPassword))

      // Log login activity
      const logEntry = {
        id: `log-${Date.now()}`,
        userId: foundUser.id,
        user: foundUser.name,
        userRole: foundUser.role,
        action: 'Login',
        details: `User ${foundUser.name} (${foundUser.username}) berhasil masuk ke sistem`,
        timestamp: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        category: foundUser.role,
      }
      const existingLogs = JSON.parse(localStorage.getItem('portalAoptiActivityLogs') || '[]')
      localStorage.setItem('portalAoptiActivityLogs', JSON.stringify([logEntry, ...existingLogs]))

      return { success: true, user: userWithoutPassword }
    }
    return { success: false, error: 'Username atau password salah' }
  }, [users])

  const logout = useCallback(() => {
    const currentUserData = JSON.parse(localStorage.getItem('portalAoptiCurrentUser'))
    if (currentUserData) {
      const foundUser = users.find((u) => u.id === currentUserData.id)
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
  }, [users])

  const createUser = useCallback((userData) => {
    const existingUser = users.find((u) => u.username === userData.username)
    if (existingUser) {
      return { success: false, error: 'Username sudah digunakan' }
    }

    const newUser = {
      id: `u${Date.now()}`,
      username: userData.username,
      password: userData.password,
      name: userData.name,
      role: userData.role,
      email: userData.email || '',
      department: userData.department || '',
      phone: userData.phone || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem('portalAoptiUsers', JSON.stringify(updatedUsers))
    return { success: true, user: newUser }
  }, [users])

  const updateUser = useCallback((userId, userData) => {
    const userIndex = users.findIndex((u) => u.id === userId)
    if (userIndex === -1) {
      return { success: false, error: 'User tidak ditemukan' }
    }

    if (userData.username !== users[userIndex].username) {
      const existingUser = users.find((u) => u.username === userData.username && u.id !== userId)
      if (existingUser) {
        return { success: false, error: 'Username sudah digunakan' }
      }
    }

    const updatedUsers = [...users]
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      ...userData,
    }
    setUsers(updatedUsers)
    localStorage.setItem('portalAoptiUsers', JSON.stringify(updatedUsers))
    return { success: true }
  }, [users])

  const resetPassword = useCallback((userId, newPassword) => {
    const userIndex = users.findIndex((u) => u.id === userId)
    if (userIndex === -1) {
      return { success: false, error: 'User tidak ditemukan' }
    }

    const updatedUsers = [...users]
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      password: newPassword,
      lastPasswordReset: new Date().toISOString(),
    }
    setUsers(updatedUsers)
    localStorage.setItem('portalAoptiUsers', JSON.stringify(updatedUsers))
    return { success: true }
  }, [users])

  const toggleUserStatus = useCallback((userId) => {
    const userIndex = users.findIndex((u) => u.id === userId)
    if (userIndex === -1) {
      return { success: false, error: 'User tidak ditemukan' }
    }

    const updatedUsers = [...users]
    const currentStatus = updatedUsers[userIndex].status
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      status: currentStatus === 'active' ? 'inactive' : 'active',
    }
    setUsers(updatedUsers)
    localStorage.setItem('portalAoptiUsers', JSON.stringify(updatedUsers))
    return { success: true }
  }, [users])

  const deleteUser = useCallback((userId) => {
    if (user && user.id === userId) {
      return { success: false, error: 'Tidak dapat menghapus user yang sedang login' }
    }

    const updatedUsers = users.filter((u) => u.id !== userId)
    setUsers(updatedUsers)
    localStorage.setItem('portalAoptiUsers', JSON.stringify(updatedUsers))
    return { success: true }
  }, [users, user])

  const hasPermission = useCallback((permission) => {
    if (!user) return false
    return ROLE_PERMISSIONS[user.role]?.[permission] || false
  }, [user])

  const importUsers = useCallback((usersArray) => {
    let imported = 0
    let skipped = 0
    const updatedUsers = [...users]

    usersArray.forEach((userData) => {
      const existingUser = updatedUsers.find((u) => u.username === userData.username)
      if (existingUser) {
        skipped++
      } else {
        updatedUsers.push({
          id: `u${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          username: userData.username,
          password: userData.password || 'password123',
          name: userData.name,
          role: userData.role || ROLES.AUDITOR,
          email: userData.email || '',
          department: userData.department || '',
          phone: userData.phone || '',
          status: 'active',
          createdAt: new Date().toISOString(),
        })
        imported++
      }
    })

    setUsers(updatedUsers)
    localStorage.setItem('portalAoptiUsers', JSON.stringify(updatedUsers))
    return { success: true, imported, skipped }
  }, [users])

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
    toggleUserStatus,
    importUsers,
    getUserActivities,
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

export { UserProvider, useUser, ROLES, ROLE_LABELS, ROLE_PERMISSIONS }
export default UserContext
