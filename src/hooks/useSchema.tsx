'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'
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
  
  // Computed stats
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
  
  // Computed values
  const totalTables = parseResult?.stats.totalTables || 0
  const totalColumns = parseResult?.stats.totalColumns || 0
  const fkRelationships = parseResult?.stats.totalForeignKeys || 0
  
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
  
  const fkResolved = fkStats.resolved
  const fkResolvedPercent = fkStats.percent
  
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
  
  const modulesLinked = linkedModules.length
  
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
      totalTables,
      totalColumns,
      fkRelationships,
      fkResolved,
      fkResolvedPercent,
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
    throw new Error('useSchema must be used within a SchemaProvider')
  }
  return context
}
