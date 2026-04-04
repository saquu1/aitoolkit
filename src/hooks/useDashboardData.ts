'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardSummary {
  healthScore: number
  totalTables: number
  totalColumns: number
  totalFKs: number
  totalSPs: number
  totalViews: number
  totalFiles: number
}

export interface FKResolutionStats {
  total: number
  resolved: number
  percent: number
  missing: string[]
}

export interface SPStats {
  total: number
  byActionType: Record<string, number>
  byModule: Record<string, number>
  highRisk: number
  avgComplexity: number
}

export interface CSHTMLStats {
  total: number
  byViewType: Record<string, number>
  totalFields: number
  linkedToTables: number
}

export interface JSStats {
  total: number
  totalAjaxCalls: number
  totalEventHandlers: number
  totalEndpoints: number
  avgComplexity: number
}

export interface ModuleStats {
  linked: number
  total: number
  percent: number
}

export interface FileStats {
  total: number
  byType: Record<string, number>
  parsed: number
  pending: number
  failed: number
}

export interface ClassificationStats {
  total: number
  byFileType: Record<string, number>
  byLanguage: Record<string, number>
  avgConfidence: number
}

export interface DiscoveredTablesStats {
  total: number
  resolved: number
  highPriority: number
}

export interface DashboardData {
  success: boolean
  hasProject: boolean
  projectId?: string
  summary: DashboardSummary
  fkResolution: FKResolutionStats
  spStats: SPStats
  cshtmlStats: CSHTMLStats
  jsStats: JSStats
  moduleStats: ModuleStats
  fileStats: FileStats
  classificationStats: ClassificationStats
  discoveredTables: DiscoveredTablesStats
  quality: any
  lastUpdated: string
}

export interface ParserStatsData {
  javascript: {
    totalFiles: number
    summary: {
      totalAjaxCalls: number
      totalEventHandlers: number
      totalEndpoints: number
      byMethod: Record<string, number>
      byDataType: Record<string, number>
    }
  }
  storedProcedures: {
    total: number
    tablesReferenced: string[]
    byActionType: Record<string, number>
    byModule: Record<string, number>
    byRiskLevel: Record<string, number>
  }
  cshtml: {
    total: number
    byViewType: Record<string, number>
  }
  classifications: {
    total: number
    byFileType: Record<string, number>
    byLanguage: Record<string, number>
  }
}

export interface TableIntelligenceData {
  tables: any[]
  columns: any[]
  discoveredTables: any[]
  summary: {
    totalTables: number
    totalColumns: number
    totalDiscovered: number
    modulesLinked: number
  }
}

export interface SPIntelligenceData {
  procedures: any[]
  summary: {
    total: number
    byActionType: Record<string, number>
    byModule: Record<string, number>
    byRiskLevel: Record<string, number>
    avgComplexity: number
  }
}

export interface CSHTMLIntelligenceData {
  views: any[]
  ajaxEndpoints: any[]
  formIntelligences: any[]
  dropdownMappings: any[]
  summary: {
    totalViews: number
    byViewType: Record<string, number>
    totalFields: number
    totalAjaxEndpoints: number
    totalForms: number
    totalDropdowns: number
  }
}

export interface JSIntelligenceData {
  files: any[]
  ajaxCallCaches: any[]
  eventHandlerCaches: any[]
  formValidationCaches: any[]
  summary: {
    totalFiles: number
    byFramework: Record<string, number>
    totalAjaxCalls: number
    totalEventHandlers: number
    totalFormValidations: number
    avgComplexity: number
  }
}

export interface FKResolutionData {
  totalFKs: number
  resolvedFKs: number
  unresolvedFKs: number
  resolutionPercent: number
  missingTables: Array<{
    tableName: string
    referencedBy: string[]
    referenceCount: number
  }>
  discoveredTables: any[]
  dependencyCaches: any[]
  sessions: any[]
  resolutions: any[]
}

export interface ComplianceData {
  pii: {
    columns: any[]
    count: number
    byTable: Record<string, number>
  }
  phi: {
    columns: any[]
    count: number
    byTable: Record<string, number>
  }
  sensitive: {
    columns: any[]
    count: number
    byTable: Record<string, number>
  }
  bySemanticType: Record<string, number>
  bySensitivity: Record<string, number>
}

export interface ActivityData {
  activities: Array<{
    type: string
    timestamp: string
    data: any
  }>
}

// =============================================================================
// HOOK
// =============================================================================

export function useDashboardData(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=summary`
        : `/api/dashboard?action=summary`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useParserStats(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ParserStatsData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=parser-stats`
        : `/api/dashboard?action=parser-stats`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData(result.stats)
      } else {
        setError(result.error || 'Failed to fetch parser stats')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useTableIntelligence(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TableIntelligenceData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=table-intelligence`
        : `/api/dashboard?action=table-intelligence`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData({
          tables: result.tables,
          columns: result.columns,
          discoveredTables: result.discoveredTables,
          summary: result.summary,
        })
      } else {
        setError(result.error || 'Failed to fetch table intelligence')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useSPIntelligence(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SPIntelligenceData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=sp-intelligence`
        : `/api/dashboard?action=sp-intelligence`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData({
          procedures: result.procedures,
          summary: result.summary,
        })
      } else {
        setError(result.error || 'Failed to fetch SP intelligence')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useCSHTMLIntelligence(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CSHTMLIntelligenceData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=cshtml-intelligence`
        : `/api/dashboard?action=cshtml-intelligence`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData({
          views: result.views,
          ajaxEndpoints: result.ajaxEndpoints,
          formIntelligences: result.formIntelligences,
          dropdownMappings: result.dropdownMappings,
          summary: result.summary,
        })
      } else {
        setError(result.error || 'Failed to fetch CSHTML intelligence')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useJSIntelligence(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<JSIntelligenceData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=js-intelligence`
        : `/api/dashboard?action=js-intelligence`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData({
          files: result.files,
          ajaxCallCaches: result.ajaxCallCaches,
          eventHandlerCaches: result.eventHandlerCaches,
          formValidationCaches: result.formValidationCaches,
          summary: result.summary,
        })
      } else {
        setError(result.error || 'Failed to fetch JS intelligence')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useFKResolution(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FKResolutionData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=fk-resolution`
        : `/api/dashboard?action=fk-resolution`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch FK resolution data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useCompliance(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ComplianceData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=compliance`
        : `/api/dashboard?action=compliance`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch compliance data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}

export function useActivity(projectId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ActivityData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId 
        ? `/api/dashboard?projectId=${projectId}&action=activity`
        : `/api/dashboard?action=activity`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch activity data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    loading, 
    error, 
    data, 
    refetch: fetchData 
  }
}
