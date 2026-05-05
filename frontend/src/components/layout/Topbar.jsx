import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, ROLES, ROLE_LABELS } from '../../context/UserContext'

function Topbar({ collapsed = false, onToggleSidebar }) {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('spiHubTheme')
    return saved === 'dark'
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { user } = useUser()
  const isAdmin = user?.role === ROLES.ADMIN
  const userName = user?.name || localStorage.getItem('spiHubUserName') || 'Auditor'
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  // Get reminders from localStorage
  const [reminders, setReminders] = useState([])

  useEffect(() => {
    function loadReminders() {
      const workList = JSON.parse(localStorage.getItem('portalAoptiWorkList') || '[]')
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const upcomingReminders = workList
        .map(task => {
          const startDate = new Date(task.startDate)
          startDate.setHours(0, 0, 0, 0)
          const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))

          if (daysUntil === 7 || daysUntil === 3 || daysUntil === 1 || daysUntil === 0) {
            return {
              id: task.id,
              title: daysUntil === 0 ? 'Hari Ini' : `H-${daysUntil}`,
              message: task.taskName,
              programName: task.programName,
              daysUntil,
              unread: true,
            }
          }
          return null
        })
        .filter(Boolean)
        .sort((a, b) => a.daysUntil - b.daysUntil)

      setReminders(upcomingReminders)
    }

    loadReminders()
    const interval = setInterval(loadReminders, 60000) // Check every minute

    window.addEventListener('portalWorkList-changed', loadReminders)
    return () => {
      clearInterval(interval)
      window.removeEventListener('portalWorkList-changed', loadReminders)
    }
  }, [])

  const staticNotifications = [
    { id: 1, title: 'Audit Plan Updated', message: 'Q1 2026 audit plan approved', time: '2 min ago', unread: false },
    { id: 2, title: 'Task Completed', message: 'Fieldwork BIRO A done', time: '1 hour ago', unread: false },
  ]

  const allNotifications = [...reminders, ...staticNotifications]
  const unreadCount = allNotifications.filter(n => n.unread).length

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('spiHubTheme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSignOut() {
    localStorage.removeItem('spiHubToken')
    localStorage.removeItem('spiHubUserName')
    window.dispatchEvent(new Event('spi-auth-changed'))
    navigate('/login', { replace: true })
  }

  function markAllRead() {
    notifications.forEach(n => n.unread = false)
  }

  return (
    <header className="topbar">
      {/* Left: Sidebar Toggle */}
      <div className="topbar-left">
        <button
          type="button"
          className={`sidebar-toggle-btn ${collapsed ? 'collapsed' : ''}`}
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? (
              <>
                <polyline points="9 18 15 12 9 6" />
                <line x1="5" y1="4" x2="5" y2="20" />
              </>
            ) : (
              <>
                <polyline points="15 18 9 12 15 6" />
                <line x1="19" y1="4" x2="19" y2="20" />
              </>
            )}
          </svg>
          <span>{collapsed ? 'Open sidebar' : 'Collapse sidebar'}</span>
        </button>
      </div>

      {/* Right: Clock, Actions, Profile */}
      <div className="topbar-right">
        {/* Clock Widget */}
        <div className="topbar-clock">
          <div className="clock-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="clock-info">
            <span className="clock-time">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="clock-date">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="topbar-divider"></div>

        {/* Theme Toggle */}
        <button className="icon-btn" onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
          {isDarkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        {!isAdmin && (
          <div className="dropdown-wrap" ref={notifRef}>
            <button className={`icon-btn ${unreadCount > 0 ? 'has-badge' : ''}`} onClick={() => setShowNotifications(!showNotifications)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
            </button>

            {showNotifications && (
              <div className="dropdown notification-dropdown">
                <div className="dropdown-header">
                  <h4>Notifications</h4>
                  {unreadCount > 0 && <button onClick={markAllRead}>Mark all read</button>}
                </div>
                <div className="dropdown-body">
                  {allNotifications.map(n => (
                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                      <div className="notif-dot"></div>
                      <div className="notif-content">
                        <h5>{n.title}</h5>
                        <p>{n.message}</p>
                        {n.programName && <span className="notif-program">{n.programName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        {!isAdmin && (
          <button className="icon-btn" onClick={() => navigate('/team-chat')} title="Team Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}

        {/* Profile */}
        <div className="dropdown-wrap" ref={profileRef}>
          <button className="profile-btn" onClick={() => setShowProfile(!showProfile)}>
            <div className="avatar">{userName.slice(0, 2).toUpperCase()}</div>
            <div className="profile-info">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">{ROLE_LABELS[user?.role] || 'Internal Auditor'}</span>
            </div>
            <svg className={`chevron ${showProfile ? 'up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showProfile && (
            <div className="dropdown profile-dropdown">
              <div className="dropdown-header profile-header-row">
                <div className="avatar avatar-lg">{userName.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h4>{userName}</h4>
                  <p>Internal Auditor</p>
                </div>
              </div>
              <div className="dropdown-menu">
                <button onClick={() => { navigate('/dashboard'); setShowProfile(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  My Profile
                </button>
                <button onClick={() => { navigate('/analytics'); setShowProfile(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  Settings
                </button>
              </div>
              <div className="dropdown-footer">
                <button className="signout-btn" onClick={handleSignOut}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
