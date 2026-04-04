'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Layout modes
export type LayoutMode = 'full-sidebar' | 'mini-sidebar' | 'top-bar-only'

// Navigation style for top-bar-only mode
export type TopBarNavStyle = 'tabs' | 'hamburger'

// UI Density
export type UIDensity = 'compact' | 'normal' | 'comfortable'

// Project dropdown position
export type ProjectDropdownPosition = 'sidebar' | 'topbar'

// Settings scope
export type SettingsScope = 'user' | 'project'

export interface LayoutSettings {
  // Layout mode
  layoutMode: LayoutMode
  
  // Top bar navigation style (when layoutMode is 'top-bar-only')
  topBarNavStyle: TopBarNavStyle
  
  // Project dropdown
  showProjectDropdown: boolean
  projectDropdownPosition: ProjectDropdownPosition
  
  // Sidebar
  sidebarCollapsed: boolean
  rememberSidebarState: boolean
  
  // UI Density
  uiDensity: UIDensity
  
  // Settings scope
  settingsScope: SettingsScope
}

interface LayoutSettingsContextType {
  settings: LayoutSettings
  updateSettings: (updates: Partial<LayoutSettings>) => void
  resetSettings: () => void
  mounted: boolean
}

const DEFAULT_SETTINGS: LayoutSettings = {
  layoutMode: 'full-sidebar',
  topBarNavStyle: 'tabs',
  showProjectDropdown: true,
  projectDropdownPosition: 'sidebar',
  sidebarCollapsed: false,
  rememberSidebarState: true,
  uiDensity: 'normal',
  settingsScope: 'user',
}

const STORAGE_KEY_USER = 'layout-settings-user'
const STORAGE_KEY_PROJECT_PREFIX = 'layout-settings-project-'

const LayoutSettingsContext = createContext<LayoutSettingsContextType | undefined>(undefined)

export function LayoutSettingsProvider({ 
  children,
  projectId 
}: { 
  children: ReactNode
  projectId?: string 
}) {
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_SETTINGS)
  const [mounted, setMounted] = useState(false)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
    setMounted(true)
  }, [projectId])

  // Load settings from localStorage
  const loadSettings = () => {
    try {
      // First check scope preference
      const scopePref = localStorage.getItem('layout-settings-scope')
      const scope = (scopePref as SettingsScope) || 'user'
      
      let savedSettings: Partial<LayoutSettings> | null = null
      
      if (scope === 'project' && projectId) {
        // Load project-specific settings
        const projectSettings = localStorage.getItem(`${STORAGE_KEY_PROJECT_PREFIX}${projectId}`)
        if (projectSettings) {
          savedSettings = JSON.parse(projectSettings)
        }
      }
      
      if (!savedSettings) {
        // Load user settings
        const userSettings = localStorage.getItem(STORAGE_KEY_USER)
        if (userSettings) {
          savedSettings = JSON.parse(userSettings)
        }
      }
      
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...savedSettings, settingsScope: scope }))
      }
    } catch (error) {
      console.error('Error loading layout settings:', error)
    }
  }

  // Save settings to localStorage
  const saveSettings = (newSettings: LayoutSettings) => {
    try {
      const { settingsScope, ...settingsToSave } = newSettings
      
      // Save scope preference
      localStorage.setItem('layout-settings-scope', settingsScope)
      
      if (settingsScope === 'project' && projectId) {
        // Save project-specific settings
        localStorage.setItem(`${STORAGE_KEY_PROJECT_PREFIX}${projectId}`, JSON.stringify(settingsToSave))
      } else {
        // Save user settings
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(settingsToSave))
      }
    } catch (error) {
      console.error('Error saving layout settings:', error)
    }
  }

  // Update settings
  const updateSettings = (updates: Partial<LayoutSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates }
      saveSettings(newSettings)
      return newSettings
    })
  }

  // Reset to defaults
  const resetSettings = () => {
    const newSettings = { ...DEFAULT_SETTINGS, settingsScope: settings.settingsScope }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  return (
    <LayoutSettingsContext.Provider value={{ 
      settings, 
      updateSettings, 
      resetSettings,
      mounted 
    }}>
      {children}
    </LayoutSettingsContext.Provider>
  )
}

export function useLayoutSettings() {
  const context = useContext(LayoutSettingsContext)
  if (!context) {
    throw new Error('useLayoutSettings must be used within a LayoutSettingsProvider')
  }
  return context
}

// Helper hook to get density-based spacing values
export function useDensitySpacing() {
  const { settings } = useLayoutSettings()
  
  const spacing = {
    compact: {
      padding: 'p-2',
      paddingX: 'px-2',
      paddingY: 'py-1',
      gap: 'gap-2',
      gapY: 'space-y-2',
      fontSize: 'text-sm',
      headerHeight: 'h-12',
      iconSize: 'w-4 h-4',
    },
    normal: {
      padding: 'p-4',
      paddingX: 'px-4',
      paddingY: 'py-2',
      gap: 'gap-3',
      gapY: 'space-y-3',
      fontSize: 'text-base',
      headerHeight: 'h-14',
      iconSize: 'w-5 h-5',
    },
    comfortable: {
      padding: 'p-6',
      paddingX: 'px-6',
      paddingY: 'py-3',
      gap: 'gap-4',
      gapY: 'space-y-4',
      fontSize: 'text-lg',
      headerHeight: 'h-16',
      iconSize: 'w-6 h-6',
    },
  }
  
  return spacing[settings.uiDensity]
}
