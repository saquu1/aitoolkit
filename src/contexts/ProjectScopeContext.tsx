'use client'

import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react'
import type { ProjectScope, ScopeType } from '@/components/project/ProjectSelector'
import type { ProjectContextSettings } from '@/components/project/ContextToggle'
import { DEFAULT_CONTEXT_SETTINGS } from '@/components/project/ContextToggle'

// Storage keys
const SCOPE_STORAGE_KEY = 'schema-architect-project-scope'
const CONTEXT_SETTINGS_STORAGE_KEY = 'schema-architect-context-settings'

// Types
export interface ProjectScopeContextValue {
  // Scope state
  scope: ProjectScope
  setScope: (scope: ProjectScope) => void
  setScopeType: (type: ScopeType) => void
  setActiveProjectId: (id: string | null) => void
  setSelectedProjectIds: (ids: string[]) => void
  
  // Context settings
  contextSettings: ProjectContextSettings
  setContextSettings: (settings: ProjectContextSettings) => void
  updateContextSetting: <K extends keyof ProjectContextSettings>(
    key: K,
    value: ProjectContextSettings[K]
  ) => void
  resetContextSettings: () => void
  
  // Computed helpers
  isGlobalScope: boolean
  isIsolated: boolean
  isMultiProjectMode: boolean
  effectiveProjectIds: string[]
  projectIds: string[]
  includeGlobal: boolean
  
  // Loading states
  isLoaded: boolean
  isSaving: boolean
}

const ProjectScopeContext = createContext<ProjectScopeContextValue | undefined>(undefined)

interface ProjectScopeProviderProps {
  children: ReactNode
  /** Persist to localStorage */
  persistToStorage?: boolean
  /** Auto-load context settings when project changes */
  autoLoadSettings?: boolean
  /** Default scope to use */
  defaultScope?: Partial<ProjectScope>
  /** Default context settings */
  defaultContextSettings?: Partial<ProjectContextSettings>
}

export function ProjectScopeProvider({
  children,
  persistToStorage = true,
  autoLoadSettings = true,
  defaultScope,
  defaultContextSettings
}: ProjectScopeProviderProps) {
  // Initialize scope from storage or defaults
  const [scope, setScopeState] = useState<ProjectScope>(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SCOPE_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            type: parsed.type || 'all',
            activeProjectId: parsed.activeProjectId || null,
            selectedProjectIds: parsed.selectedProjectIds || [],
            ...defaultScope
          }
        }
      } catch (e) {
        console.error('Error loading scope from storage:', e)
      }
    }
    return {
      type: defaultScope?.type || 'all',
      activeProjectId: defaultScope?.activeProjectId || null,
      selectedProjectIds: defaultScope?.selectedProjectIds || []
    }
  })

  // Initialize context settings from storage or defaults
  const [contextSettings, setContextSettingsState] = useState<ProjectContextSettings>(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CONTEXT_SETTINGS_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            ...DEFAULT_CONTEXT_SETTINGS,
            ...parsed,
            ...defaultContextSettings
          }
        }
      } catch (e) {
        console.error('Error loading context settings from storage:', e)
      }
    }
    return {
      ...DEFAULT_CONTEXT_SETTINGS,
      ...defaultContextSettings
    }
  })

  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Mark as loaded after initial mount
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Persist scope to storage
  useEffect(() => {
    if (persistToStorage && isLoaded && typeof window !== 'undefined') {
      localStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(scope))
    }
  }, [scope, persistToStorage, isLoaded])

  // Persist context settings to storage
  useEffect(() => {
    if (persistToStorage && isLoaded && typeof window !== 'undefined') {
      localStorage.setItem(CONTEXT_SETTINGS_STORAGE_KEY, JSON.stringify(contextSettings))
    }
  }, [contextSettings, persistToStorage, isLoaded])

  // Load context settings from API when project changes
  useEffect(() => {
    if (!autoLoadSettings || !scope.activeProjectId) return
    
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/project/${scope.activeProjectId}/context-settings`)
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setContextSettingsState(prev => ({
              ...prev,
              ...data.settings
            }))
          }
        }
      } catch (e) {
        console.error('Error loading context settings from API:', e)
      }
    }
    
    loadSettings()
  }, [scope.activeProjectId, autoLoadSettings])

  // Scope setters
  const setScope = useCallback((newScope: ProjectScope) => {
    setScopeState(newScope)
  }, [])

  const setScopeType = useCallback((type: ScopeType) => {
    setScopeState(prev => ({
      ...prev,
      type,
      // Reset IDs based on type
      activeProjectId: type === 'project' ? prev.activeProjectId : null,
      selectedProjectIds: type === 'multi' ? prev.selectedProjectIds : []
    }))
  }, [])

  const setActiveProjectId = useCallback((id: string | null) => {
    setScopeState(prev => ({
      type: id ? 'project' : 'all',
      activeProjectId: id,
      selectedProjectIds: []
    }))
  }, [])

  const setSelectedProjectIds = useCallback((ids: string[]) => {
    setScopeState(prev => ({
      type: ids.length > 1 ? 'multi' : ids.length === 1 ? 'project' : 'all',
      activeProjectId: ids.length === 1 ? ids[0] : null,
      selectedProjectIds: ids.length > 1 ? ids : []
    }))
  }, [])

  // Context settings setters
  const setContextSettings = useCallback((settings: ProjectContextSettings) => {
    setContextSettingsState(settings)
  }, [])

  const updateContextSetting = useCallback(
    <K extends keyof ProjectContextSettings>(key: K, value: ProjectContextSettings[K]) => {
      setContextSettingsState(prev => ({
        ...prev,
        [key]: value
      }))
    },
    []
  )

  const resetContextSettings = useCallback(() => {
    setContextSettingsState(DEFAULT_CONTEXT_SETTINGS)
  }, [])

  // Computed values
  const isGlobalScope = scope.type === 'all'
  const isIsolated = contextSettings.contextMode === 'isolated'
  const isMultiProjectMode = scope.type === 'multi'
  
  const effectiveProjectIds = React.useMemo(() => {
    if (scope.type === 'multi') {
      return scope.selectedProjectIds
    }
    if (scope.type === 'project' && scope.activeProjectId) {
      return [scope.activeProjectId]
    }
    return []
  }, [scope])

  const projectIds = effectiveProjectIds
  const includeGlobal = !isIsolated && (isGlobalScope || contextSettings.inheritEntities)

  const value: ProjectScopeContextValue = {
    // Scope state
    scope,
    setScope,
    setScopeType,
    setActiveProjectId,
    setSelectedProjectIds,
    
    // Context settings
    contextSettings,
    setContextSettings,
    updateContextSetting,
    resetContextSettings,
    
    // Computed helpers
    isGlobalScope,
    isIsolated,
    isMultiProjectMode,
    effectiveProjectIds,
    projectIds,
    includeGlobal,
    
    // Loading states
    isLoaded,
    isSaving
  }

  return (
    <ProjectScopeContext.Provider value={value}>
      {children}
    </ProjectScopeContext.Provider>
  )
}

export function useProjectScopeContext(): ProjectScopeContextValue {
  const context = useContext(ProjectScopeContext)
  if (context === undefined) {
    throw new Error('useProjectScopeContext must be used within a ProjectScopeProvider')
  }
  return context
}

// Convenience hook alias
export const useProjectScope = useProjectScopeContext

export default ProjectScopeProvider
