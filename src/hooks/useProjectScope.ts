'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectScope, ScopeType } from '@/components/project/ProjectSelector'
import type { ProjectContextSettings } from '@/components/project/ContextToggle'
import { DEFAULT_CONTEXT_SETTINGS } from '@/components/project/ContextToggle'

const SCOPE_STORAGE_KEY = 'schema-architect-project-scope'
const CONTEXT_SETTINGS_KEY = 'schema-architect-context-settings'

export interface UseProjectScopeOptions {
  /** Default scope type if nothing stored */
  defaultScopeType?: ScopeType
  /** Default project ID */
  defaultProjectId?: string | null
  /** Persist scope to localStorage */
  persistScope?: boolean
  /** Persist context settings to localStorage */
  persistSettings?: boolean
  /** Auto-sync with API */
  syncWithAPI?: boolean
}

export interface UseProjectScopeReturn {
  // Scope state
  scope: ProjectScope
  setScope: (scope: ProjectScope) => void
  setScopeType: (type: ScopeType) => void
  setActiveProject: (projectId: string | null) => void
  setSelectedProjects: (projectIds: string[]) => void
  
  // Context settings
  contextSettings: ProjectContextSettings
  setContextSettings: (settings: ProjectContextSettings) => void
  updateContextSetting: <K extends keyof ProjectContextSettings>(
    key: K,
    value: ProjectContextSettings[K]
  ) => void
  resetContextSettings: () => void
  
  // Helpers
  isGlobal: boolean
  isIsolated: boolean
  hasMultipleProjects: boolean
  projectIds: string[]
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  
  // Actions
  saveSettings: () => Promise<void>
  loadSettings: (projectId?: string) => Promise<void>
}

export function useProjectScope(
  options: UseProjectScopeOptions = {}
): UseProjectScopeReturn {
  const {
    defaultScopeType = 'all',
    defaultProjectId = null,
    persistScope = true,
    persistSettings = true,
    syncWithAPI = false
  } = options

  // State
  const [scope, setScopeState] = useState<ProjectScope>(() => {
    if (persistScope && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SCOPE_STORAGE_KEY)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error loading scope from storage:', error)
      }
    }
    return {
      type: defaultScopeType,
      activeProjectId: defaultProjectId,
      selectedProjectIds: []
    }
  })

  const [contextSettings, setContextSettingsState] = useState<ProjectContextSettings>(() => {
    if (persistSettings && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CONTEXT_SETTINGS_KEY)
        if (stored) {
          return { ...DEFAULT_CONTEXT_SETTINGS, ...JSON.parse(stored) }
        }
      } catch (error) {
        console.error('Error loading context settings from storage:', error)
      }
    }
    return DEFAULT_CONTEXT_SETTINGS
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Persist scope changes
  useEffect(() => {
    if (persistScope && typeof window !== 'undefined') {
      localStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(scope))
    }
  }, [scope, persistScope])

  // Persist context settings changes
  useEffect(() => {
    if (persistSettings && typeof window !== 'undefined') {
      localStorage.setItem(CONTEXT_SETTINGS_KEY, JSON.stringify(contextSettings))
    }
  }, [contextSettings, persistSettings])

  // Set scope
  const setScope = useCallback((newScope: ProjectScope) => {
    setScopeState(newScope)
  }, [])

  // Set scope type
  const setScopeType = useCallback((type: ScopeType) => {
    setScopeState(prev => {
      if (prev.type === type) return prev
      return {
        ...prev,
        type,
        activeProjectId: type === 'project' ? prev.activeProjectId : null,
        selectedProjectIds: type === 'multi' ? prev.selectedProjectIds : []
      }
    })
  }, [])

  // Set active project
  const setActiveProject = useCallback((projectId: string | null) => {
    setScopeState(prev => ({
      ...prev,
      type: projectId ? 'project' : 'all',
      activeProjectId: projectId,
      selectedProjectIds: []
    }))
  }, [])

  // Set selected projects (for multi-select)
  const setSelectedProjects = useCallback((projectIds: string[]) => {
    setScopeState(prev => ({
      ...prev,
      type: projectIds.length > 1 ? 'multi' : projectIds.length === 1 ? 'project' : 'all',
      activeProjectId: projectIds.length === 1 ? projectIds[0] : null,
      selectedProjectIds: projectIds.length > 1 ? projectIds : []
    }))
  }, [])

  // Set context settings
  const setContextSettings = useCallback((settings: ProjectContextSettings) => {
    setContextSettingsState(settings)
  }, [])

  // Update a single context setting
  const updateContextSetting = useCallback(
    <K extends keyof ProjectContextSettings>(
      key: K,
      value: ProjectContextSettings[K]
    ) => {
      setContextSettingsState(prev => ({
        ...prev,
        [key]: value
      }))
    },
    []
  )

  // Reset context settings to defaults
  const resetContextSettings = useCallback(() => {
    setContextSettingsState(DEFAULT_CONTEXT_SETTINGS)
  }, [])

  // Load settings from API
  const loadSettings = useCallback(async (projectId?: string) => {
    if (!syncWithAPI) return
    
    const targetId = projectId || scope.activeProjectId
    if (!targetId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/project/${targetId}/context-settings`)
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setContextSettingsState({
            ...DEFAULT_CONTEXT_SETTINGS,
            ...data.settings
          })
        }
      }
    } catch (error) {
      console.error('Error loading context settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [scope.activeProjectId, syncWithAPI])

  // Save settings to API
  const saveSettings = useCallback(async () => {
    if (!syncWithAPI || !scope.activeProjectId) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/project/${scope.activeProjectId}/context-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextSettings)
      })
      if (!response.ok) {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving context settings:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [scope.activeProjectId, contextSettings, syncWithAPI])

  // Load settings when project changes
  useEffect(() => {
    if (syncWithAPI && scope.activeProjectId) {
      loadSettings(scope.activeProjectId)
    }
  }, [scope.activeProjectId, syncWithAPI, loadSettings])

  // Computed values
  const isGlobal = scope.type === 'all' || contextSettings.contextMode === 'global'
  const isIsolated = contextSettings.contextMode === 'isolated'
  const hasMultipleProjects = scope.type === 'multi' && scope.selectedProjectIds.length > 1
  const projectIds = scope.type === 'multi'
    ? scope.selectedProjectIds
    : scope.type === 'project' && scope.activeProjectId
    ? [scope.activeProjectId]
    : []

  return {
    // Scope state
    scope,
    setScope,
    setScopeType,
    setActiveProject,
    setSelectedProjects,
    
    // Context settings
    contextSettings,
    setContextSettings,
    updateContextSetting,
    resetContextSettings,
    
    // Helpers
    isGlobal,
    isIsolated,
    hasMultipleProjects,
    projectIds,
    
    // Loading states
    isLoading,
    isSaving,
    
    // Actions
    saveSettings,
    loadSettings
  }
}

export default useProjectScope
