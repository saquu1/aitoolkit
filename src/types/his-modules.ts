// HIS Module Types - Based on 6-Layer Architecture

export type ModulePriority = 'critical' | 'high' | 'medium' | 'low'

export interface HISModule {
  key: string
  name: string
  description: string
  tables: string[]
  dependsOn: string[]
  priority: ModulePriority
  revenue: boolean
  estimatedDays: number
  apiEndpoints?: string[]
  features?: string[]
  userRoles?: string[]
}

export interface HISLayer {
  number: number
  name: string
  title: string
  description: string
  icon: string
  color: string
  modules: HISModule[]
}

export interface HISSubModule {
  key: string
  name: string
  description: string
}

export interface HISModulesData {
  version: string
  lastUpdated: string
  totalModules: number
  layers: HISLayer[]
  subModules?: Record<string, HISSubModule[]>
  tableToModuleMap: Record<string, string>
}

// Linked Module - represents a module matched with uploaded tables
export interface LinkedModule {
  moduleKey: string
  moduleName: string
  layerNumber: number
  layerName: string
  matchedTables: string[]
  totalTables: number
  coverage: number // percentage of module tables matched
  priority: ModulePriority
  revenue: boolean
}

// Module Override - user customizations stored in DB
export interface ModuleOverride {
  moduleKey: string
  userPriority?: number
  userStatus?: 'planned' | 'in_progress' | 'completed' | 'skipped'
  userNotes?: string
  assignedTo?: string
  startDate?: string
  endDate?: string
}

// Constants for UI
export const LAYER_COLORS: Record<string, string> = {
  'foundation': 'blue',
  'core-transactions': 'green',
  'revenue': 'yellow',
  'clinical': 'red',
  'enterprise': 'purple',
  'optimization': 'indigo'
}

export const LAYER_ICONS: Record<string, string> = {
  'foundation': '🧱',
  'core-transactions': '⚙️',
  'revenue': '💰',
  'clinical': '🏥',
  'enterprise': '🏢',
  'optimization': '🤖'
}

export const PRIORITY_COLORS: Record<ModulePriority, string> = {
  'critical': 'red',
  'high': 'orange',
  'medium': 'yellow',
  'low': 'gray'
}

export const TOTAL_HIS_MODULES = 35 // Total modules defined in JSON
export const TOTAL_HIS_TABLES = 200 // Approximate total tables needed for complete HIS
