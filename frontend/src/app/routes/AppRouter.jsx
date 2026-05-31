import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell'
import LoginPage from '../../pages/LoginPage'
import DashboardPage from '../../pages/DashboardPage'
import WorkListPage from '../../pages/WorkListPage'
import AuditPlanPage from '../../pages/AuditPlanPage'
import ChatPage from '../../pages/ChatPage'
import AdminPage from '../../pages/AdminPage'
import NotFoundPage from '../../pages/NotFoundPage'
import ChangePasswordPage from '../../pages/ChangePasswordPage'
import HelpPage from '../../pages/HelpPage'
import WelcomeTour from '../../components/onboarding/WelcomeTour'
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

  // Force change password gate
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {isAuthenticated && !user?.must_change_password && <WelcomeTour />}
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={user?.must_change_password ? '/change-password' : (user?.role === ROLES.ADMIN ? '/admin' : '/dashboard')} replace /> : <LoginPage />}
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
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
          <Route path="/team-chat" element={<ChatPage />} />
          <Route path="/help" element={<HelpPage />} />
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
          element={<Navigate to={isAuthenticated ? (user?.must_change_password ? '/change-password' : (user?.role === ROLES.ADMIN ? '/admin' : '/dashboard')) : '/login'} replace />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default AppRouter
