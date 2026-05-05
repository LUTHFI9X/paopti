import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell'
import LoginPage from '../../pages/LoginPage'
import DashboardPage from '../../pages/DashboardPage'
import WorkListPage from '../../pages/WorkListPage'
import AuditPlanPage from '../../pages/AuditPlanPage'
import FieldworkPage from '../../pages/FieldworkPage'
import AnalyticsPage from '../../pages/AnalyticsPage'
import ChatPage from '../../pages/ChatPage'
import AdminPage from '../../pages/AdminPage'
import NotFoundPage from '../../pages/NotFoundPage'
import { useUser, ROLES } from '../../context/UserContext'

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return null
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useUser()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Memuat...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRouter() {
  const { user, isLoading } = useUser()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setAuthReady(true)
    }
  }, [isLoading])

  useEffect(() => {
    function syncAuthState() {
      const hasAuth = Boolean(localStorage.getItem('spiHubToken')) || Boolean(localStorage.getItem('portalAoptiCurrentUser'))
      if (!hasAuth) {
        setAuthReady(false)
      }
    }

    window.addEventListener('storage', syncAuthState)
    window.addEventListener('spi-auth-changed', syncAuthState)

    return () => {
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener('spi-auth-changed', syncAuthState)
    }
  }, [])

  const isAuthenticated = Boolean(localStorage.getItem('spiHubToken')) || Boolean(localStorage.getItem('portalAoptiCurrentUser'))

  if (isLoading || !authReady) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Memuat Portal AOPTI...</p>
      </div>
    )
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={user?.role === ROLES.ADMIN ? '/admin' : '/dashboard'} replace /> : <LoginPage />}
        />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/work-list" element={<WorkListPage />} />
          <Route path="/audit-plan" element={<AuditPlanPage />} />
          <Route path="/fieldwork" element={<FieldworkPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/team-chat" element={<ChatPage />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? (user?.role === ROLES.ADMIN ? '/admin' : '/dashboard') : '/login'} replace />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default AppRouter
