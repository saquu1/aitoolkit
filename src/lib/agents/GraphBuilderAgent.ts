/**
 * Graph Builder Agent
 * 
 * Builds the knowledge graph from extracted entities (tables, SPs, views, modules).
 * Creates nodes for each entity and edges for relationships.
 * 
 * Task: TASK-3.1c - Graph Builder Agent
 */

import { prisma } from "@/lib/db"
import { knowledgeGraphService, KGNodeData, KGEdgeData } from "@/lib/knowledge-graph/service"

// ============================================================================
// Types
// ============================================================================

export interface GraphBuildContext {
  projectId: string
  tables?: Array<{
    id: string
    tableName: string
    tableSchema?: string
    displayName?: string
    description?: string
    columnCount?: number
    rowCount?: number
    moduleKey?: string
    tableType?: string
  }>
  procedures?: Array<{
    id: string
    spName: string
    spSchema?: string
    description?: string
    paramCount?: number
    tablesAccessed?: string[]
    operationType?: string
    moduleKey?: string
  }>
  views?: Array<{
    id: string
    viewName: string
    viewSchema?: string
    description?: string
    columnCount?: number
    sourceTables?: string[]
    moduleKey?: string
  }>
  modules?: Array<{
    id: string
    moduleKey: string
    moduleName: string
    description?: string
    layer?: string
    priority?: number
    tableCount?: number
    spCount?: number
  }>
  foreignKeys?: Array<{
    id: string
    fkName: string
    fromTable: string
    fromColumn: string
    toTable: string
    toColumn: string
  }>
  columns?: Array<{
    id: string
    columnName: string
    tableName: string
    dataType: string
    isNullable: boolean
    isPK: boolean
    isFK: boolean
    semanticType?: string
    piiFlag?: boolean
  }>
}

export interface GraphBuilderResult {
  success: boolean
  nodesCreated: number
  nodesUpdated: number
  edgesCreated: number
  edgesUpdated: number
  stats: {
    totalNodes: number
    totalEdges: number
    nodesByType: Record<string, number>
    edgesByType: Record<string, number>
  }
  errors: string[]
  warnings: string[]
}

// ============================================================================
// Graph Builder Agent
// ============================================================================

export class GraphBuilderAgent {
  id = "graph-builder"
  name = "Graph Builder Agent"
  version = "1.0.0"
  description = "Builds knowledge graph from extracted entities"

  /**
   * Execute the graph building process
   */
  async execute(context: GraphBuildContext): Promise<GraphBuilderResult> {
    const { projectId, tables, procedures, views, modules, foreignKeys, columns } = context
    const errors: string[] = []
    const warnings: string[] = []
    
    let nodesCreated = 0
    let nodesUpdated = 0
    let edgesCreated = 0
    let edgesUpdated = 0

    try {
      // Step 1: Create module nodes first
      if (modules && modules.length > 0) {
        const result = await this.createModuleNodes(projectId, modules)
        nodesCreated += result.created
        nodesUpdated += result.updated
      }

      // Step 2: Create table nodes
      if (tables && tables.length > 0) {
        const result = await this.createTableNodes(projectId, tables)
        nodesCreated += result.created
        nodesUpdated += result.updated
      }

      // Step 3: Create column nodes
      if (columns && columns.length > 0) {
        const result = await this.createColumnNodes(projectId, columns)
        nodesCreated += result.created
        nodesUpdated += result.updated
        warnings.push(...result.warnings)
      }

      // Step 4: Create SP nodes
      if (procedures && procedures.length > 0) {
        const result = await this.createSPNodes(projectId, procedures)
        nodesCreated += result.created
        nodesUpdated += result.updated
      }

      // Step 5: Create view nodes
      if (views && views.length > 0) {
        const result = await this.createViewNodes(projectId, views)
        nodesCreated += result.created
        nodesUpdated += result.updated
      }

      // Step 6: Create FK edges
      if (foreignKeys && foreignKeys.length > 0) {
        const result = await this.createFKEdges(projectId, foreignKeys)
        edgesCreated += result.created
        edgesUpdated += result.updated
        warnings.push(...result.warnings)
      }

      // Step 7: Create module containment edges
      if (modules && modules.length > 0 && tables && tables.length > 0) {
        const result = await this.createModuleEdges(projectId, modules, tables, procedures)
        edgesCreated += result.created
        edgesUpdated += result.updated
      }

      // Step 8: Create SP access edges
      if (procedures && procedures.length > 0) {
        const result = await this.createSPAccessEdges(projectId, procedures)
        edgesCreated += result.created
        edgesUpdated += result.updated
        warnings.push(...result.warnings)
      }

      // Step 9: Create view access edges
      if (views && views.length > 0) {
        const result = await this.createViewAccessEdges(projectId, views)
        edgesCreated += result.created
        edgesUpdated += result.updated
        warnings.push(...result.warnings)
      }

      // Step 10: Create column_of edges
      if (columns && columns.length > 0) {
        const result = await this.createColumnEdges(projectId, columns)
        edgesCreated += result.created
        edgesUpdated += result.updated
      }

      // Get final stats
      const stats = await knowledgeGraphService.getGraphStats(projectId)

      return {
        success: true,
        nodesCreated,
        nodesUpdated,
        edgesCreated,
        edgesUpdated,
        stats,
        errors,
        warnings
      }
    } catch (error) {
      errors.push(`Graph building failed: ${error}`)
      return {
        success: false,
        nodesCreated,
        nodesUpdated,
        edgesCreated,
        edgesUpdated,
        stats: {
          totalNodes: 0,
          totalEdges: 0,
          nodesByType: {},
          edgesByType: {}
        },
        errors,
        warnings
      }
    }
  }

  /**
   * Create module nodes
   */
  private async createModuleNodes(
    projectId: string,
    modules: GraphBuildContext['modules']
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const module of modules!) {
      const nodeData: KGNodeData = {
        projectId,
        nodeType: 'module',
        name: module.moduleKey,
        displayName: module.moduleName,
        description: module.description,
        properties: {
          layer: module.layer,
          priority: module.priority,
          tableCount: module.tableCount,
          spCount: module.spCount
        },
        confidence: 0.95,
        source: 'module-matcher'
      }

      const result = await knowledgeGraphService.upsertNode(nodeData)
      if (result.created) created++
      else updated++
    }

    return { created, updated }
  }

  /**
   * Create table nodes
   */
  private async createTableNodes(
    projectId: string,
    tables: GraphBuildContext['tables']
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const table of tables!) {
      const nodeData: KGNodeData = {
        projectId,
        nodeType: 'table',
        nodeSubtype: table.tableType as any,
        name: `${table.tableSchema || 'dbo'}.${table.tableName}`,
        displayName: table.displayName || table.tableName,
        description: table.description,
        properties: {
          schema: table.tableSchema || 'dbo',
          columnCount: table.columnCount,
          rowCount: table.rowCount,
          moduleKey: table.moduleKey,
          tableId: table.id
        },
        confidence: 0.9,
        source: 'sql-parser'
      }

      const result = await knowledgeGraphService.upsertNode(nodeData)
      if (result.created) created++
      else updated++
    }

    return { created, updated }
  }

  /**
   * Create column nodes
   */
  private async createColumnNodes(
    projectId: string,
    columns: GraphBuildContext['columns']
  ): Promise<{ created: number; updated: number; warnings: string[] }> {
    let created = 0
    let updated = 0
    const warnings: string[] = []
    const BATCH_SIZE = 100

    // Process in batches for performance
    for (let i = 0; i < columns!.length; i += BATCH_SIZE) {
      const batch = columns!.slice(i, i + BATCH_SIZE)

      for (const column of batch) {
        const nodeData: KGNodeData = {
          projectId,
          nodeType: 'column',
          name: `${column.tableName}.${column.columnName}`,
          displayName: column.columnName,
          properties: {
            tableName: column.tableName,
            dataType: column.dataType,
            isNullable: column.isNullable,
            isPK: column.isPK,
            isFK: column.isFK,
            semanticType: column.semanticType,
            piiFlag: column.piiFlag,
            columnId: column.id
          },
          confidence: column.isPK ? 1.0 : column.isFK ? 0.9 : 0.85,
          source: 'column-intelligence'
        }

        try {
          const result = await knowledgeGraphService.upsertNode(nodeData)
          if (result.created) created++
          else updated++
        } catch (error) {
          warnings.push(`Failed to create column node ${column.columnName}: ${error}`)
        }
      }
    }

    return { created, updated, warnings }
  }

  /**
   * Create SP nodes
   */
  private async createSPNodes(
    projectId: string,
    procedures: GraphBuildContext['procedures']
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const sp of procedures!) {
      const nodeData: KGNodeData = {
        projectId,
        nodeType: 'sp',
        name: `${sp.spSchema || 'dbo'}.${sp.spName}`,
        displayName: sp.spName,
        description: sp.description,
        properties: {
          schema: sp.spSchema || 'dbo',
          paramCount: sp.paramCount,
          operationType: sp.operationType,
          moduleKey: sp.moduleKey,
          spId: sp.id
        },
        confidence: 0.85,
        source: 'sp-parser'
      }

      const result = await knowledgeGraphService.upsertNode(nodeData)
      if (result.created) created++
      else updated++
    }

    return { created, updated }
  }

  /**
   * Create view nodes
   */
  private async createViewNodes(
    projectId: string,
    views: GraphBuildContext['views']
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const view of views!) {
      const nodeData: KGNodeData = {
        projectId,
        nodeType: 'view',
        name: `${view.viewSchema || 'dbo'}.${view.viewName}`,
        displayName: view.viewName,
        description: view.description,
        properties: {
          schema: view.viewSchema || 'dbo',
          columnCount: view.columnCount,
          moduleKey: view.moduleKey,
          viewId: view.id
        },
        confidence: 0.9,
        source: 'view-parser'
      }

      const result = await knowledgeGraphService.upsertNode(nodeData)
      if (result.created) created++
      else updated++
    }

    return { created, updated }
  }

  /**
   * Create FK edges between tables
   */
  private async createFKEdges(
    projectId: string,
    foreignKeys: GraphBuildContext['foreignKeys']
  ): Promise<{ created: number; updated: number; warnings: string[] }> {
    let created = 0
    let updated = 0
    const warnings: string[] = []

    for (const fk of foreignKeys!) {
      try {
        // Find source and target nodes
        const sourceNode = await knowledgeGraphService.getNode(
          projectId,
          'table',
          `dbo.${fk.fromTable}`
        )
        const targetNode = await knowledgeGraphService.getNode(
          projectId,
          'table',
          `dbo.${fk.toTable}`
        )

        if (!sourceNode || !targetNode) {
          warnings.push(`FK edge skipped: node not found for ${fk.fkName}`)
          continue
        }

        const edgeData: KGEdgeData = {
          projectId,
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          edgeType: 'fk',
          label: fk.fromColumn,
          properties: {
            fkName: fk.fkName,
            fromColumn: fk.fromColumn,
            toColumn: fk.toColumn
          },
          confidence: 0.95,
          weight: 1.0,
          source: 'fk-resolver'
        }

        const result = await knowledgeGraphService.createEdge(edgeData)
        if (result.created) created++
        else updated++
      } catch (error) {
        warnings.push(`Failed to create FK edge ${fk.fkName}: ${error}`)
      }
    }

    return { created, updated, warnings }
  }

  /**
   * Create module containment edges
   */
  private async createModuleEdges(
    projectId: string,
    modules: GraphBuildContext['modules'],
    tables: GraphBuildContext['tables'],
    procedures: GraphBuildContext['procedures']
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    // Create module -> table edges
    for (const table of tables!) {
      if (!table.moduleKey) continue

      const moduleNode = await knowledgeGraphService.getNode(
        projectId,
        'module',
        table.moduleKey
      )
      const tableNode = await knowledgeGraphService.getNode(
        projectId,
        'table',
        `${table.tableSchema || 'dbo'}.${table.tableName}`
      )

      if (moduleNode && tableNode) {
        const result = await knowledgeGraphService.createEdge({
          projectId,
          sourceNodeId: moduleNode.id,
          targetNodeId: tableNode.id,
          edgeType: 'module_contains',
          confidence: 0.9,
          source: 'module-matcher'
        })
        if (result.created) created++
        else updated++
      }
    }

    // Create module -> SP edges
    if (procedures) {
      for (const sp of procedures) {
        if (!sp.moduleKey) continue

        const moduleNode = await knowledgeGraphService.getNode(
          projectId,
          'module',
          sp.moduleKey
        )
        const spNode = await knowledgeGraphService.getNode(
          projectId,
          'sp',
          `${sp.spSchema || 'dbo'}.${sp.spName}`
        )

        if (moduleNode && spNode) {
          const result = await knowledgeGraphService.createEdge({
            projectId,
            sourceNodeId: moduleNode.id,
            targetNodeId: spNode.id,
            edgeType: 'module_contains',
            confidence: 0.85,
            source: 'module-matcher'
          })
          if (result.created) created++
          else updated++
        }
      }
    }

    return { created, updated }
  }

  /**
   * Create SP access edges
   */
  private async createSPAccessEdges(
    projectId: string,
    procedures: GraphBuildContext['procedures']
  ): Promise<{ created: number; updated: number; warnings: string[] }> {
    let created = 0
    let updated = 0
    const warnings: string[] = []

    for (const sp of procedures!) {
      if (!sp.tablesAccessed || sp.tablesAccessed.length === 0) continue

      const spNode = await knowledgeGraphService.getNode(
        projectId,
        'sp',
        `${sp.spSchema || 'dbo'}.${sp.spName}`
      )

      if (!spNode) {
        warnings.push(`SP node not found: ${sp.spName}`)
        continue
      }

      for (const tableName of sp.tablesAccessed) {
        const tableNode = await knowledgeGraphService.getNode(
          projectId,
          'table',
          `dbo.${tableName}`
        )

        if (!tableNode) {
          warnings.push(`Table node not found for SP access: ${tableName}`)
          continue
        }

        const result = await knowledgeGraphService.createEdge({
          projectId,
          sourceNodeId: spNode.id,
          targetNodeId: tableNode.id,
          edgeType: 'sp_access',
          label: sp.operationType || 'access',
          properties: {
            operationType: sp.operationType
          },
          confidence: 0.8,
          source: 'sp-parser'
        })
        if (result.created) created++
        else updated++
      }
    }

    return { created, updated, warnings }
  }

  /**
   * Create view access edges
   */
  private async createViewAccessEdges(
    projectId: string,
    views: GraphBuildContext['views']
  ): Promise<{ created: number; updated: number; warnings: string[] }> {
    let created = 0
    let updated = 0
    const warnings: string[] = []

    for (const view of views!) {
      if (!view.sourceTables || view.sourceTables.length === 0) continue

      const viewNode = await knowledgeGraphService.getNode(
        projectId,
        'view',
        `${view.viewSchema || 'dbo'}.${view.viewName}`
      )

      if (!viewNode) {
        warnings.push(`View node not found: ${view.viewName}`)
        continue
      }

      for (const tableName of view.sourceTables) {
        const tableNode = await knowledgeGraphService.getNode(
          projectId,
          'table',
          `dbo.${tableName}`
        )

        if (!tableNode) {
          warnings.push(`Table node not found for view access: ${tableName}`)
          continue
        }

        const result = await knowledgeGraphService.createEdge({
          projectId,
          sourceNodeId: viewNode.id,
          targetNodeId: tableNode.id,
          edgeType: 'view_access',
          properties: {},
          confidence: 0.85,
          source: 'view-parser'
        })
        if (result.created) created++
        else updated++
      }
    }

    return { created, updated, warnings }
  }

  /**
   * Create column_of edges (column -> table)
   */
  private async createColumnEdges(
    projectId: string,
    columns: GraphBuildContext['columns']
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const column of columns!) {
      const columnNode = await knowledgeGraphService.getNode(
        projectId,
        'column',
        `${column.tableName}.${column.columnName}`
      )
      const tableNode = await knowledgeGraphService.getNode(
        projectId,
        'table',
        `dbo.${column.tableName}`
      )

      if (columnNode && tableNode) {
        const result = await knowledgeGraphService.createEdge({
          projectId,
          sourceNodeId: columnNode.id,
          targetNodeId: tableNode.id,
          edgeType: 'column_of',
          confidence: 1.0,
          source: 'column-intelligence'
        })
        if (result.created) created++
        else updated++
      }
    }

    return { created, updated }
  }
}

// Export singleton
export const graphBuilderAgent = new GraphBuilderAgent()

// Export types
export type { GraphBuildContext as GraphBuildContextType, GraphBuilderResult as GraphBuilderResultType }
