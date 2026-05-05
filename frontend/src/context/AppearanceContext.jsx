import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppearanceContext = createContext(null)

const DEFAULT_SETTINGS = {
  accentColor: '#1f4f96',
  fontSize: 'medium',
  sidebarCollapsed: false,
  compactMode: false,
  cardRounded: true,
  enableAnimations: true,
  smoothTransitions: true,
}

const FONT_SIZES = {
  small: '13px',
  medium: '14px',
  large: '16px',
}

function AppearanceProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appearanceSettings')
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  })

  const applySettings = useCallback(() => {
    const root = document.documentElement

    // Apply accent color
    root.style.setProperty('--brand', settings.accentColor)

    // Apply font size
    const fontSize = FONT_SIZES[settings.fontSize] || '14px'
    root.style.setProperty('--font-size-base', fontSize)
    root.style.fontSize = fontSize

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add('compact-mode')
    } else {
      root.classList.remove('compact-mode')
    }

    // Apply card rounded
    if (settings.cardRounded) {
      root.classList.add('card-rounded')
    } else {
      root.classList.remove('card-rounded')
    }

    // Apply animations
    if (!settings.enableAnimations) {
      root.classList.add('no-animations')
    } else {
      root.classList.remove('no-animations')
    }

    // Apply smooth transitions
    if (settings.smoothTransitions) {
      root.classList.add('smooth-transitions')
    } else {
      root.classList.remove('smooth-transitions')
    }

    // Apply sidebar collapsed
    if (settings.sidebarCollapsed) {
      root.classList.add('sidebar-collapsed')
    } else {
      root.classList.remove('sidebar-collapsed')
    }
  }, [settings])

  // Apply settings on mount and when settings change
  useEffect(() => {
    applySettings()
  }, [applySettings])

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem('appearanceSettings', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AppearanceContext.Provider value={{ settings, updateSetting, applySettings }}>
      {children}
    </AppearanceContext.Provider>
  )
}

function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider')
  }
  return context
}

export { AppearanceProvider, useAppearance, DEFAULT_SETTINGS, FONT_SIZES }
export default AppearanceContext
