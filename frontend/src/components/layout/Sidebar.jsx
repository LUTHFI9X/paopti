import { NavLink, useNavigate } from 'react-router-dom'
import { useUser, ROLE_LABELS } from '../../context/UserContext'
import { useState, useEffect } from 'react'
import spiLogo from '../../assets/icons/logo_sketch_clean_vector.svg'

const auditorMenus = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'List Pekerjaan',
    to: '/work-list',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="15" y2="16" />
      </svg>
    ),
  },
  {
    label: 'Rencana Kegiatan',
    to: '/audit-plan',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Fieldwork',
    to: '/fieldwork',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    to: '/analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: 'Team Chat',
    to: '/team-chat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
]

// KSPI has view-only access to all auditor menus
const kspiMenus = auditorMenus

const adminMenus = [
  {
    label: 'Admin Panel',
    to: '/admin',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Kelola User',
    to: '/admin/users',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Role & Hak Akses',
    to: '/admin/roles',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: 'Log Aktivitas',
    to: '/admin/logs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Pengaturan Sistem',
    to: '/admin/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    label: 'Backup & Restore',
    to: '/admin/backup',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
]

function Sidebar({ collapsed = false }) {
  const navigate = useNavigate()
  const { user, logout, ROLES } = useUser()
  const [, forceUpdate] = useState(0)

  const isAdmin = user?.role === ROLES.ADMIN
  const isKspi = user?.role === ROLES.KSPI
  const isAuditor = user?.role === ROLES.AUDITOR

  // Listen for storage changes to refresh menu visibility
  useEffect(() => {
    const handleStorageChange = () => {
      forceUpdate(n => n + 1)
    }
    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom event when menu visibility changes
    window.addEventListener('menuVisibilityChanged', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('menuVisibilityChanged', handleStorageChange)
    }
  }, [])

  // Get menu visibility from localStorage
  const getVisibleMenus = () => {
    const menuMapping = {
      'Dashboard': 'Dashboard',
      'List Pekerjaan': 'List Pekerjaan',
      'Rencana Kegiatan': 'Rencana Kerja',
      'Fieldwork': 'Fieldwork',
      'Analytics': 'Analytics',
      'Team Chat': 'Team Chat',
    }

    const savedAuditorMenus = JSON.parse(localStorage.getItem('portalAoptiAuditorMenus') || '{"Dashboard":true,"Rencana Kerja":true,"Fieldwork":true,"Temuan Audit":true,"Analytics":true,"Team Chat":true}')
    const savedKspiMenus = JSON.parse(localStorage.getItem('portalAoptiKspiMenus') || '{"Dashboard":true,"Rencana Kerja":false,"Fieldwork":false,"Temuan Audit":false,"Analytics":true,"Team Chat":true}')

    const visibilitySettings = isKspi ? savedKspiMenus : savedAuditorMenus

    return auditorMenus.filter(menu => {
      const settingsKey = menuMapping[menu.label]
      return settingsKey && visibilitySettings[settingsKey] !== false
    })
  }

  const visibleMenus = getVisibleMenus()
  const currentMenus = isAdmin ? adminMenus : visibleMenus
  const sectionTitle = isKspi ? 'Menu KSPI (View Only)' : isAuditor ? 'Menu Auditor' : 'Menu Admin'

  const roleShort = {
    [ROLES.ADMIN]: 'AD',
    [ROLES.AUDITOR]: 'AU',
    [ROLES.KSPI]: 'KS',
  }

  // Separate dashboard from other menus
  const dashboardMenu = currentMenus[0]
  const mainMenus = currentMenus.slice(1)

  function handleSupport() {
    navigate('/team-chat')
  }

  function handleSignOut() {
    const userName = user?.name || 'Unknown'
    const userRole = user?.role

    logout()
    localStorage.removeItem('spiHubToken')
    localStorage.removeItem('spiHubUserName')
    localStorage.removeItem('portalAoptiCurrentUser')

    // Log logout activity
    const savedLogs = localStorage.getItem('portalAoptiActivityLogs')
    const activityLogs = savedLogs ? JSON.parse(savedLogs) : []
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: userName,
      userId: user?.id || null,
      userRole: userRole,
      action: 'Logout',
      details: `User ${userName} keluar dari sistem`,
      ipAddress: '127.0.0.1',
    }
    const updatedLogs = [newLog, ...activityLogs].slice(0, 100)
    localStorage.setItem('portalAoptiActivityLogs', JSON.stringify(updatedLogs))

    window.dispatchEvent(new Event('spi-auth-changed'))
    window.location.href = '/login'
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-glow glow-top" aria-hidden="true"></div>
      <div className="sidebar-glow glow-bottom" aria-hidden="true"></div>
      <div className="sidebar-bubbles" aria-hidden="true">
        <span className="sidebar-bubble sidebar-bubble-a"></span>
        <span className="sidebar-bubble sidebar-bubble-b"></span>
        <span className="sidebar-bubble sidebar-bubble-c"></span>
      </div>

      <div className="brand-wrap">
        <img src={spiLogo} alt="Logo SPI" className="brand-logo-img" />
        <div className="brand-text">
          <span className="brand-name"><span className="brand-name-spi">Portal AOPTI</span></span>
          <span className="brand-tagline">Internal Audit System</span>
        </div>
      </div>

      {user && (
        <div className="user-role-badge">
          <span className={`role-indicator role-${user.role}`}>
            {roleShort[user.role]}
          </span>
          <div className="role-meta">
            <span className="role-label">Role</span>
            <span className="role-text">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>
      )}

      <div className="sidebar-divider" aria-hidden="true"></div>

      <nav className="menu-list" aria-label="Main menu">
        {/* Dashboard */}
        <NavLink
          key={dashboardMenu.to}
          to={dashboardMenu.to}
          end
          className={({ isActive }) =>
            isActive ? 'menu-item menu-item-active' : 'menu-item'
          }
          title={collapsed ? dashboardMenu.label : undefined}
        >
          <span className="menu-icon">{dashboardMenu.icon}</span>
          <span className="menu-label">{dashboardMenu.label}</span>
          <span className="active-indicator"></span>
        </NavLink>

        {/* Menu Section Separator */}
        {!collapsed && (
          <div className="menu-section-separator">
            <span className="menu-section-title">{sectionTitle}</span>
          </div>
        )}

        {/* Main Menus */}
        {mainMenus.map((menu) => (
          <NavLink
            key={menu.to}
            to={menu.to}
            className={({ isActive }) =>
              isActive ? 'menu-item menu-item-active' : 'menu-item'
            }
            title={collapsed ? menu.label : undefined}
          >
            <span className="menu-icon">{menu.icon}</span>
            <span className="menu-label">{menu.label}</span>
            <span className="active-indicator"></span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!isAdmin && (
          <button type="button" className="sidebar-btn support-btn" onClick={handleSupport}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Support</span>
          </button>
        )}
        <button type="button" className="sidebar-btn signout-btn" onClick={handleSignOut}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
