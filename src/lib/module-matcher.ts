// Module Matching Utility
// Matches uploaded SQL tables to HIS modules

import type { HISModulesData, HISLayer, HISModule, LinkedModule } from '@/types/his-modules'

// Import the JSON data
import hisModulesData from '@/data/his-modules.json'

/**
 * Get all modules from the JSON data
 */
export function getAllModules(): { layers: HISLayer[], modules: HISModule[] } {
  const layers = hisModulesData.layers as HISLayer[]
  const modules: HISModule[] = []
  
  layers.forEach(layer => {
    layer.modules.forEach(module => {
      modules.push(module)
    })
  })
  
  return { layers, modules }
}

/**
 * Get the table-to-module mapping
 */
export function getTableToModuleMap(): Record<string, string> {
  return hisModulesData.tableToModuleMap as Record<string, string>
}

/**
 * Find which module a table belongs to
 */
export function findModuleForTable(tableName: string): HISModule | null {
  const { modules } = getAllModules()
  
  // Normalize table name for comparison
  const normalizedTable = tableName.toLowerCase().replace(/[\[\]]/g, '')
  
  for (const mod of modules) {
    const hasTable = mod.tables.some(t => 
      t.toLowerCase() === normalizedTable ||
      t.toLowerCase().replace(/[\[\]]/g, '') === normalizedTable
    )
    if (hasTable) return mod
  }
  
  return null
}

/**
 * Match uploaded tables to HIS modules
 * Returns a list of linked modules with coverage info
 */
export function matchTablesToModules(uploadedTableNames: string[]): LinkedModule[] {
  const { layers, modules } = getAllModules()
  const tableToModuleMap = getTableToModuleMap()
  
  // Normalize uploaded table names
  const normalizedTables = new Set(
    uploadedTableNames.map(t => t.toLowerCase().replace(/[\[\]]/g, ''))
  )
  
  // Track which modules have matches
  const moduleMatches = new Map<string, { matchedTables: string[], totalTables: number }>()
  
  // Initialize all modules
  modules.forEach(mod => {
    moduleMatches.set(mod.key, {
      matchedTables: [],
      totalTables: mod.tables.length
    })
  })
  
  // Check each uploaded table
  uploadedTableNames.forEach(tableName => {
    const normalizedTable = tableName.toLowerCase().replace(/[\[\]]/g, '')
    
    // Find module for this table
    let moduleKey = tableToModuleMap[tableName] || tableToModuleMap[normalizedTable]
    
    // If not in map, search by table list
    if (!moduleKey) {
      for (const mod of modules) {
        if (mod.tables.some(t => t.toLowerCase() === normalizedTable)) {
          moduleKey = mod.key
          break
        }
      }
    }
    
    if (moduleKey) {
      const match = moduleMatches.get(moduleKey)
      if (match) {
        match.matchedTables.push(tableName)
      }
    }
  })
  
  // Build linked modules list
  const linkedModules: LinkedModule[] = []
  
  modules.forEach(module => {
    const match = moduleMatches.get(module.key)
    if (match && match.matchedTables.length > 0) {
      // Find layer info
      const layer = layers.find(l => l.number === getLayerNumberForModule(module.key, layers))
      
      linkedModules.push({
        moduleKey: module.key,
        moduleName: module.name,
        layerNumber: layer?.number || 0,
        layerName: layer?.name || 'unknown',
        matchedTables: match.matchedTables,
        totalTables: match.totalTables,
        coverage: Math.round((match.matchedTables.length / match.totalTables) * 100),
        priority: module.priority,
        revenue: module.revenue
      })
    }
  })
  
  // Sort by coverage (highest first), then by priority
  const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 }
  linkedModules.sort((a, b) => {
    if (a.coverage !== b.coverage) return b.coverage - a.coverage
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
  
  return linkedModules
}

/**
 * Get layer number for a module key
 */
function getLayerNumberForModule(moduleKey: string, layers: HISLayer[]): number {
  for (const layer of layers) {
    if (layer.modules.some(m => m.key === moduleKey)) {
      return layer.number
    }
  }
  return 0
}

/**
 * Count total unique modules that have at least one table match
 */
export function countModulesLinked(uploadedTableNames: string[]): number {
  const linkedModules = matchTablesToModules(uploadedTableNames)
  return linkedModules.length
}

/**
 * Get module summary for display
 */
export function getModuleSummary(uploadedTableNames: string[]): {
  totalLinked: number
  totalPossible: number
  byLayer: Record<number, number>
  criticalLinked: number
  revenueLinked: number
} {
  const linkedModules = matchTablesToModules(uploadedTableNames)
  const { layers } = getAllModules()
  
  const byLayer: Record<number, number> = {}
  layers.forEach(layer => {
    byLayer[layer.number] = 0
  })
  
  linkedModules.forEach(lm => {
    byLayer[lm.layerNumber] = (byLayer[lm.layerNumber] || 0) + 1
  })
  
  return {
    totalLinked: linkedModules.length,
    totalPossible: hisModulesData.totalModules,
    byLayer,
    criticalLinked: linkedModules.filter(lm => lm.priority === 'critical').length,
    revenueLinked: linkedModules.filter(lm => lm.revenue).length
  }
}

/**
 * Export the raw data for direct access
 */
export { hisModulesData }
