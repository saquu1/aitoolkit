'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react'
import { matchTablesToModules, countModulesLinked, getModuleSummary } from '@/lib/module-matcher'
import type { LinkedModule } from '@/types/his-modules'

export interface ParsedColumn {
  name: string
  dataType: string
  maxLength?: string
  nullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean
  defaultValue?: string
}

export interface ParsedFK {
  constraintName?: string
  columnName: string
  referencesTable: string
  referencesColumn: string
}

export interface ParsedTable {
  schemaName: string
  tableName: string
  columns: ParsedColumn[]
  foreignKeys: ParsedFK[]
  sourceDDL?: string
}

export interface ParseStats {
  totalTables: number
  totalColumns: number
  totalForeignKeys: number
  totalStoredProcedures: number
  parseTimeMs: number
}

export interface ParseResult {
  tables: ParsedTable[]
  storedProcedures: any[]
  errors: string[]
  warnings: string[]
  stats: ParseStats
}

export interface ModuleSummary {
  totalLinked: number
  totalPossible: number
  byLayer: Record<number, number>
  criticalLinked: number
  revenueLinked: number
}

export interface ActiveProject {
  id: string
  name: string
  description?: string | null
  softwareType: string
  color: string
  icon: string
  status: string
  fileCount?: number
  tableCount?: number
  procedureCount?: number
}

export interface DbStats {
  totalProjects: number
  totalTables: number
  totalColumns: number
  totalProcedures: number
  fkRelationships: number
  fkResolved: number
  fkResolvedPercent: number
  lastSync: string | null
}

export interface SchemaContextType {
  // Active Project
  activeProject: ActiveProject | null
  setActiveProject: (project: ActiveProject | null) => void
  
  // Parsed SQL data
  parseResult: ParseResult | null
  setParseResult: (result: ParseResult | null) => void
  sqlInput: string
  setSqlInput: (sql: string | ((prev: string) => string)) => void
  uploadedFiles: string[]
  setUploadedFiles: (files: string[] | ((prev: string[]) => string[])) => void
  
  // Database stats (loaded from DB)
  dbStats: DbStats | null
  dbStatsLoading: boolean
  refreshDbStats: () => Promise<void>
  
  // Computed stats (from parseResult or dbStats)
  totalTables: number
  totalColumns: number
  fkRelationships: number
  fkResolved: number
  fkResolvedPercent: number
  missingTables: string[]
  
  // Module linking
  modulesLinked: number
  linkedModules: LinkedModule[]
  moduleSummary: ModuleSummary | null
  
  // Actions
  clearAll: () => void
}

const SchemaContext = createContext<SchemaContextType | null>(null)

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [sqlInput, setSqlInputState] = useState('')
  const [uploadedFiles, setUploadedFilesState] = useState<string[]>([])
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [dbStatsLoading, setDbStatsLoading] = useState(true)
  
  // Load database stats on mount
  const refreshDbStats = useCallback(async () => {
    setDbStatsLoading(true)
    try {
      const response = await fetch('/api/schema/stats')
      const data = await response.json()
      if (data.success && data.stats) {
        setDbStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load db stats:', error)
    } finally {
      setDbStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshDbStats()
  }, [refreshDbStats])
  
  // Wrapper functions to support both direct values and function updaters
  const setSqlInput = useCallback((value: string | ((prev: string) => string)) => {
    if (typeof value === 'function') {
      setSqlInputState(value)
    } else {
      setSqlInputState(value)
    }
  }, [])
  
  const setUploadedFiles = useCallback((value: string[] | ((prev: string[]) => string[])) => {
    if (typeof value === 'function') {
      setUploadedFilesState(value)
    } else {
      setUploadedFilesState(value)
    }
  }, [])
  
  // Computed values - prefer parseResult, fallback to dbStats
  const totalTables = parseResult?.stats.totalTables || dbStats?.totalTables || 0
  const totalColumns = parseResult?.stats.totalColumns || dbStats?.totalColumns || 0
  const fkRelationships = parseResult?.stats.totalForeignKeys || dbStats?.fkRelationships || 0
  const fkResolvedPercent = parseResult 
    ? fkResolvedPercent 
    : (dbStats?.fkResolvedPercent || 0)
  
  // Get uploaded table names
  const uploadedTableNames = useMemo(() => {
    if (!parseResult) return []
    return parseResult.tables.map(t => t.tableName)
  }, [parseResult])
  
  // Calculate FK resolution stats
  const fkStats = useMemo(() => {
    if (!parseResult) return { resolved: 0, percent: 0 }
    const tableNames = new Set(parseResult.tables.map(t => t.tableName.toLowerCase()))
    let total = 0
    let resolved = 0
    
    parseResult.tables.forEach(table => {
      table.foreignKeys.forEach(fk => {
        total++
        if (tableNames.has(fk.referencesTable.toLowerCase())) resolved++
      })
    })
    
    return { 
      resolved, 
      percent: total > 0 ? Math.round((resolved / total) * 100) : 0 
    }
  }, [parseResult])
  
  const fkResolved = parseResult ? fkStats.resolved : (dbStats?.fkResolved || 0)
  const fkResolvedPercentFinal = parseResult ? fkStats.percent : (dbStats?.fkResolvedPercent || 0)
  
  // Calculate missing tables
  const missingTables = useMemo(() => {
    if (!parseResult) return []
    const tableNames = new Set(parseResult.tables.map(t => t.tableName.toLowerCase()))
    const missing = new Set<string>()
    
    parseResult.tables.forEach(table => {
      table.foreignKeys.forEach(fk => {
        if (!tableNames.has(fk.referencesTable.toLowerCase())) {
          missing.add(fk.referencesTable)
        }
      })
    })
    
    return Array.from(missing)
  }, [parseResult])
  
  // Calculate module linking
  const linkedModules = useMemo(() => {
    if (uploadedTableNames.length === 0) return []
    return matchTablesToModules(uploadedTableNames)
  }, [uploadedTableNames])
  
  const modulesLinked = linkedModules.length || (dbStats?.totalTables ? Math.min(dbStats.totalTables, 35) : 0)
  
  const moduleSummary = useMemo(() => {
    if (uploadedTableNames.length === 0) return null
    return getModuleSummary(uploadedTableNames)
  }, [uploadedTableNames])
  
  const clearAll = useCallback(() => {
    setParseResult(null)
    setSqlInputState('')
    setUploadedFilesState([])
  }, [])
  
  return (
    <SchemaContext.Provider value={{
      activeProject,
      setActiveProject,
      parseResult,
      setParseResult,
      sqlInput,
      setSqlInput,
      uploadedFiles,
      setUploadedFiles,
      dbStats,
      dbStatsLoading,
      refreshDbStats,
      totalTables,
      totalColumns,
      fkRelationships,
      fkResolved,
      fkResolvedPercent: fkResolvedPercentFinal,
      missingTables,
      modulesLinked,
      linkedModules,
      moduleSummary,
      clearAll,
    }}>
      {children}
    </SchemaContext.Provider>
  )
}

export function useSchema() {
  const context = useContext(SchemaContext)
  if (!context) {
    // Return default context instead of throwing during SSR/build
    return {
      activeProject: null,
      setActiveProject: () => {},
      parseResult: null,
      setParseResult: () => {},
      sqlInput: '',
      setSqlInput: () => {},
      uploadedFiles: [],
      setUploadedFiles: () => {},
      dbStats: null,
      dbStatsLoading: false,
      refreshDbStats: async () => {},
      totalTables: 0,
      totalColumns: 0,
      fkRelationships: 0,
      fkResolved: 0,
      fkResolvedPercent: 0,
      missingTables: [],
      modulesLinked: 0,
      linkedModules: [],
      moduleSummary: null,
      clearAll: () => {},
    }
  }
  return context
}
