'use client'

import { useState, useEffect, useCallback } from 'react'

interface UISettings {
  // Copyable Links Feature
  copyableLinksEnabled: boolean
  showUrlOnHover: boolean
  copyToClipboardNotification: boolean
  
  // Other UI preferences
  compactMode: boolean
  showBreadcrumbs: boolean
  animationsEnabled: boolean
}

const DEFAULT_SETTINGS: UISettings = {
  copyableLinksEnabled: true,
  showUrlOnHover: true,
  copyToClipboardNotification: true,
  compactMode: false,
  showBreadcrumbs: true,
  animationsEnabled: true,
}

const STORAGE_KEY = 'ai-architect-ui-settings'

export function useUISettings() {
  const [settings, setSettings] = useState<UISettings>(DEFAULT_SETTINGS)
  const [mounted, setMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch (e) {
      console.error('Failed to load UI settings:', e)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<UISettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save UI settings:', e)
      }
      return updated
    })
  }, [])

  // Toggle a specific setting
  const toggleSetting = useCallback((key: keyof UISettings) => {
    saveSettings({ [key]: !settings[key] })
  }, [settings, saveSettings])

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
    } catch (e) {
      console.error('Failed to reset UI settings:', e)
    }
  }, [])

  return {
    settings,
    mounted,
    saveSettings,
    toggleSetting,
    resetSettings,
    // Convenience getters
    copyableLinksEnabled: settings.copyableLinksEnabled,
    showUrlOnHover: settings.showUrlOnHover,
  }
}

// Singleton context for settings
let globalSettings: UISettings = DEFAULT_SETTINGS
let globalListeners: Set<() => void> = new Set()

export function getUISettings(): UISettings {
  return globalSettings
}

export function setUISettings(settings: Partial<UISettings>) {
  globalSettings = { ...globalSettings, ...settings }
  globalListeners.forEach(listener => listener())
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalSettings))
  } catch (e) {
    console.error('Failed to save UI settings:', e)
  }
}

export function subscribeToUISettings(listener: () => void) {
  globalListeners.add(listener)
  return () => globalListeners.delete(listener)
}
