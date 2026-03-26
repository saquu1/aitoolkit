'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// PROJECT INTELLIGENCE HOOK
// Simplified version that uses project-status endpoint
// =============================================================================

export interface ProjectIntelligence {
  // Core data
  tables: any[]
  views: any[]
  procedures: any[]
  files: any[]
  
  // Statistics
  statistics: {
    totalTables: number
    totalViews: number
    totalProcedures: number
    totalFiles: number
    parsedFiles: number
    pendingFiles: number
    errorFiles: number
    totalFKs: number
    resolvedFKs: number
  }
  
  // Modules
  modules: any[]
  moduleCoverage: number
  
  // FK Analysis
  fkAnalysis: {
    totalFKs: number
    resolvedFKs: number
    missingTables: string[]
  }
  
  // Meta
  projectId: string
  project: any
  timestamp: string
}

interface UseProjectIntelligenceOptions {
  projectId: string | null
  autoFetch?: boolean
}

interface UseProjectIntelligenceReturn {
  // Data
  intelligence: ProjectIntelligence | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchIntelligence: () => Promise<void>
  linkModules: () => Promise<void>
  refresh: () => Promise<void>
  
  // Convenience getters
  tables: any[]
  views: any[]
  procedures: any[]
  modules: any[]
  moduleCoverage: number
}

export function useProjectIntelligence(
  options: UseProjectIntelligenceOptions
): UseProjectIntelligenceReturn {
  const { projectId, autoFetch = true } = options

  const [intelligence, setIntelligence] = useState<ProjectIntelligence | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Main fetch function - uses project-status endpoint
  const fetchIntelligence = useCallback(async () => {
    if (!projectId) {
      setIntelligence(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch project status
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch project status')
      }

      const data = await response.json()
      
      // Fetch modules
      const modulesResponse = await fetch(`/api/project-intelligence?projectId=${projectId}&action=modules`)
      let modulesData = { modules: [], coverage: { percentage: 0 } }
      
      if (modulesResponse.ok) {
        modulesData = await modulesResponse.json()
      }

      // Build intelligence object
      const intel: ProjectIntelligence = {
        tables: data.tables || [],
        views: data.cshtmlViews || [],
        procedures: data.procedures || [],
        files: data.recentFiles || [],
        
        statistics: {
          totalTables: data.counts?.tables || 0,
          totalViews: data.counts?.cshtmlViews || 0,
          totalProcedures: data.counts?.procedures || 0,
          totalFiles: data.files?.total || 0,
          parsedFiles: data.files?.parsed || 0,
          pendingFiles: data.files?.pending || 0,
          errorFiles: data.files?.error || 0,
          totalFKs: data.fkAnalysis?.totalFKs || 0,
          resolvedFKs: data.fkAnalysis?.resolvedFKs || 0
        },
        
        modules: modulesData.modules || [],
        moduleCoverage: modulesData.coverage?.percentage || 0,
        
        fkAnalysis: data.fkAnalysis || {
          totalFKs: 0,
          resolvedFKs: 0,
          missingTables: []
        },
        
        projectId,
        project: data.project || null,
        timestamp: new Date().toISOString()
      }

      setIntelligence(intel)
    } catch (err: any) {
      console.error('Failed to fetch project intelligence:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Auto-fetch when project changes
  useEffect(() => {
    if (autoFetch && projectId) {
      fetchIntelligence()
    }
  }, [projectId, autoFetch, fetchIntelligence])

  // Link modules
  const linkModules = useCallback(async () => {
    if (!projectId) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/project-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link-modules', projectId }),
      })

      if (!response.ok) throw new Error('Failed to link modules')

      // Refresh intelligence after linking
      await fetchIntelligence()
    } catch (err: any) {
      console.error('Failed to link modules:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, fetchIntelligence])

  // Refresh
  const refresh = useCallback(async () => {
    await fetchIntelligence()
  }, [fetchIntelligence])

  // Convenience getters
  const tables = intelligence?.tables || []
  const views = intelligence?.views || []
  const procedures = intelligence?.procedures || []
  const modules = intelligence?.modules || []
  const moduleCoverage = intelligence?.moduleCoverage || 0

  return {
    // Data
    intelligence,
    isLoading,
    error,

    // Actions
    fetchIntelligence,
    linkModules,
    refresh,

    // Convenience getters
    tables,
    views,
    procedures,
    modules,
    moduleCoverage,
  }
}
