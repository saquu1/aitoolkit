/**
 * FLOW MAP SERVICE
 * ================
 * Phase 4 of Contract Validator - Data flow visualization
 * 
 * Capabilities:
 * - Map data flow between Frontend ↔ API ↔ Database
 * - Visualize connections and transformations
 * - Detect data flow issues
 * - Generate flow diagrams
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface FlowNode {
  id: string
  nodeType: 'frontend_component' | 'api_endpoint' | 'database_table' | 'hook' | 'util'
  name: string
  label?: string
  description?: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  color: string
  icon?: string
  filePath?: string
  hasIssues?: boolean
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: 'request' | 'response' | 'query' | 'mutation' | 'render' | 'import'
  label?: string
  animated?: boolean
  style?: Record<string, any>
  data?: {
    dataType?: string
    transformation?: string
    isValid?: boolean
  }
}

export interface FlowMap {
  nodes: FlowNode[]
  edges: FlowEdge[]
  metadata: {
    scanId: string
    totalNodes: number
    totalEdges: number
    issueCount: number
    layers: {
      frontend: number
      api: number
      database: number
    }
  }
}

export interface DataFlowAnalysis {
  source: {
    type: string
    entity: string
    field?: string
  }
  target: {
    type: string
    entity: string
    field?: string
  }
  flowType: string
  dataType?: string
  transformation?: string
  isValid: boolean
}

// =============================================================================
// FLOW MAP SERVICE
// =============================================================================

export class FlowMapService {
  private nodeColors = {
    frontend_component: '#3b82f6',  // Blue
    api_endpoint: '#10b981',        // Green
    database_table: '#f59e0b',      // Amber
    hook: '#8b5cf6',                // Purple
    util: '#6b7280'                 // Gray
  }

  private layerYPositions = {
    frontend: 100,
    api: 350,
    database: 600
  }

  /**
   * Generate a complete flow map from a scan
   */
  async generateFlowMap(scanId: string): Promise<FlowMap> {
    // Clear existing flow data for this scan
    await this.clearFlowData(scanId)

    // Scan the codebase for data flows
    const flows = await this.scanForDataFlows(scanId)

    // Build nodes and edges
    const nodes = await this.buildNodes(scanId, flows)
    const edges = await this.buildEdges(scanId, flows)

    // Calculate metadata
    const metadata = {
      scanId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      issueCount: edges.filter(e => e.data?.isValid === false).length,
      layers: {
        frontend: nodes.filter(n => n.nodeType === 'frontend_component' || n.nodeType === 'hook').length,
        api: nodes.filter(n => n.nodeType === 'api_endpoint').length,
        database: nodes.filter(n => n.nodeType === 'database_table').length
      }
    }

    return { nodes, edges, metadata }
  }

  /**
   * Scan codebase for data flows
   */
  private async scanForDataFlows(scanId: string): Promise<DataFlowAnalysis[]> {
    const flows: DataFlowAnalysis[] = []
    const srcPath = path.join(process.cwd(), 'src')

    // Scan API routes for database connections
    const apiFlows = await this.scanAPIRoutes(scanId, srcPath)
    flows.push(...apiFlows)

    // Scan components for API calls
    const componentFlows = await this.scanComponents(scanId, srcPath)
    flows.push(...componentFlows)

    // Scan hooks for data fetching
    const hookFlows = await this.scanHooks(scanId, srcPath)
    flows.push(...hookFlows)

    // Store flows in database
    for (const flow of flows) {
      await this.storeFlow(scanId, flow)
    }

    return flows
  }

  /**
   * Scan API routes for database operations
   */
  private async scanAPIRoutes(scanId: string, srcPath: string): Promise<DataFlowAnalysis[]> {
    const flows: DataFlowAnalysis[] = []
    const apiPath = path.join(srcPath, 'app', 'api')

    if (!fs.existsSync(apiPath)) return flows

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          scanDir(fullPath)
        } else if (item === 'route.ts' || item === 'route.tsx') {
          const routeFlows = this.analyzeAPIRoute(fullPath)
          flows.push(...routeFlows)
        }
      }
    }

    scanDir(apiPath)
    return flows
  }

  /**
   * Analyze a single API route file
   */
  private analyzeAPIRoute(filePath: string): DataFlowAnalysis[] {
    const flows: DataFlowAnalysis[] = []
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Get route path from file path
    const apiIndex = filePath.indexOf('/api/')
    const routePath = filePath.slice(apiIndex, filePath.lastIndexOf('/'))
    
    // Find Prisma calls
    const prismaMatches = content.matchAll(/prisma\.(\w+)\.(findMany|findFirst|findUnique|create|update|delete|upsert)/g)
    for (const match of prismaMatches) {
      const tableName = match[1]
      const operation = match[2]
      
      flows.push({
        source: { type: 'api', entity: routePath },
        target: { type: 'database', entity: tableName },
        flowType: operation.includes('find') ? 'query' : 'mutation',
        isValid: true
      })

      // Response flow
      flows.push({
        source: { type: 'database', entity: tableName },
        target: { type: 'api', entity: routePath },
        flowType: 'response',
        isValid: true
      })
    }

    // Find request body references
    const bodyMatches = content.matchAll(/const\s*{?\s*(\w+)\s*}?\s*=\s*(?:await\s*)?request\.json\(\)/g)
    for (const match of bodyMatches) {
      flows.push({
        source: { type: 'frontend', entity: 'caller' },
        target: { type: 'api', entity: routePath },
        flowType: 'request',
        isValid: true
      })
    }

    return flows
  }

  /**
   * Scan components for API calls
   */
  private async scanComponents(scanId: string, srcPath: string): Promise<DataFlowAnalysis[]> {
    const flows: DataFlowAnalysis[] = []
    const componentsPath = path.join(srcPath, 'components')

    if (!fs.existsSync(componentsPath)) return flows

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          scanDir(fullPath)
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          const componentFlows = this.analyzeComponent(fullPath)
          flows.push(...componentFlows)
        }
      }
    }

    scanDir(componentsPath)
    return flows
  }

  /**
   * Analyze a component for API calls
   */
  private analyzeComponent(filePath: string): DataFlowAnalysis[] {
    const flows: DataFlowAnalysis[] = []
    const content = fs.readFileSync(filePath, 'utf-8')
    
    const componentName = path.basename(filePath, path.extname(filePath))
    
    // Find fetch calls
    const fetchMatches = content.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g)
    for (const match of fetchMatches) {
      const endpoint = match[1]
      
      flows.push({
        source: { type: 'frontend', entity: componentName },
        target: { type: 'api', entity: endpoint },
        flowType: 'request',
        isValid: true
      })

      flows.push({
        source: { type: 'api', entity: endpoint },
        target: { type: 'frontend', entity: componentName },
        flowType: 'response',
        isValid: true
      })
    }

    // Find useQuery/useMutation patterns
    const reactQueryMatches = content.matchAll(/use(Query|Mutation)\s*\(\s*['"`]?([^'"`\)]+)/g)
    for (const match of reactQueryMatches) {
      const queryType = match[1]
      const queryKey = match[2].trim()
      
      flows.push({
        source: { type: 'frontend', entity: componentName },
        target: { type: 'api', entity: queryKey },
        flowType: queryType === 'Query' ? 'query' : 'mutation',
        isValid: true
      })
    }

    return flows
  }

  /**
   * Scan hooks for data fetching
   */
  private async scanHooks(scanId: string, srcPath: string): Promise<DataFlowAnalysis[]> {
    const flows: DataFlowAnalysis[] = []
    const hooksPath = path.join(srcPath, 'hooks')

    if (!fs.existsSync(hooksPath)) return flows

    const items = fs.readdirSync(hooksPath)
    for (const item of items) {
      const fullPath = path.join(hooksPath, item)
      const stat = fs.statSync(fullPath)

      if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        const hookFlows = this.analyzeHook(fullPath)
        flows.push(...hookFlows)
      }
    }

    return flows
  }

  /**
   * Analyze a hook for data fetching
   */
  private analyzeHook(filePath: string): DataFlowAnalysis[] {
    const flows: DataFlowAnalysis[] = []
    const content = fs.readFileSync(filePath, 'utf-8')
    const hookName = path.basename(filePath, path.extname(filePath))

    // Find fetch calls
    const fetchMatches = content.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g)
    for (const match of fetchMatches) {
      const endpoint = match[1]
      
      flows.push({
        source: { type: 'hook', entity: hookName },
        target: { type: 'api', entity: endpoint },
        flowType: 'request',
        isValid: true
      })
    }

    return flows
  }

  /**
   * Build nodes from flows
   */
  private async buildNodes(scanId: string, flows: DataFlowAnalysis[]): Promise<FlowNode[]> {
    const nodeMap = new Map<string, FlowNode>()
    
    // Collect unique entities
    for (const flow of flows) {
      const sourceKey = `${flow.source.type}:${flow.source.entity}`
      const targetKey = `${flow.target.type}:${flow.target.entity}`

      if (!nodeMap.has(sourceKey)) {
        nodeMap.set(sourceKey, this.createNode(flow.source.type, flow.source.entity))
      }
      if (!nodeMap.has(targetKey)) {
        nodeMap.set(targetKey, this.createNode(flow.target.type, flow.target.entity))
      }
    }

    const nodes = Array.from(nodeMap.values())

    // Calculate positions
    this.calculateNodePositions(nodes)

    // Store nodes in database
    for (const node of nodes) {
      await this.storeNode(scanId, node)
    }

    return nodes
  }

  /**
   * Create a node from type and name
   */
  private createNode(type: string, name: string): FlowNode {
    const nodeType = this.mapNodeType(type)
    
    return {
      id: `${type}_${name}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      nodeType,
      name,
      label: this.formatLabel(name),
      position: { x: 0, y: 0 },
      size: { width: 150, height: 80 },
      color: this.nodeColors[nodeType] || '#6b7280',
      hasIssues: false
    }
  }

  /**
   * Map flow type to node type
   */
  private mapNodeType(type: string): FlowNode['nodeType'] {
    switch (type) {
      case 'frontend': return 'frontend_component'
      case 'api': return 'api_endpoint'
      case 'database': return 'database_table'
      case 'hook': return 'hook'
      default: return 'util'
    }
  }

  /**
   * Calculate node positions for layered layout
   */
  private calculateNodePositions(nodes: FlowNode[]): void {
    const layers = {
      frontend_component: { x: 100, y: this.layerYPositions.frontend },
      hook: { x: 100, y: this.layerYPositions.frontend + 200 },
      api_endpoint: { x: 100, y: this.layerYPositions.api },
      database_table: { x: 100, y: this.layerYPositions.database }
    }

    const counts: Record<string, number> = {}

    for (const node of nodes) {
      const layer = layers[node.nodeType] || { x: 100, y: 400 }
      const count = counts[node.nodeType] || 0
      
      node.position = {
        x: layer.x + (count % 4) * 200,
        y: layer.y + Math.floor(count / 4) * 120
      }
      
      counts[node.nodeType] = count + 1
    }
  }

  /**
   * Build edges from flows
   */
  private async buildEdges(scanId: string, flows: DataFlowAnalysis[]): Promise<FlowEdge[]> {
    const edges: FlowEdge[] = []
    const edgeSet = new Set<string>()

    for (const flow of flows) {
      const sourceId = `${flow.source.type}_${flow.source.entity}`.replace(/[^a-zA-Z0-9_]/g, '_')
      const targetId = `${flow.target.type}_${flow.target.entity}`.replace(/[^a-zA-Z0-9_]/g, '_')
      const edgeKey = `${sourceId}->${targetId}:${flow.flowType}`

      if (!edgeSet.has(edgeKey)) {
        const edge: FlowEdge = {
          id: `edge_${edges.length}`,
          source: sourceId,
          target: targetId,
          type: flow.flowType as FlowEdge['type'],
          label: flow.flowType,
          animated: flow.flowType === 'request' || flow.flowType === 'mutation',
          data: {
            dataType: flow.dataType,
            transformation: flow.transformation,
            isValid: flow.isValid
          }
        }
        
        edges.push(edge)
        edgeSet.add(edgeKey)
      }
    }

    return edges
  }

  /**
   * Format label for display
   */
  private formatLabel(name: string): string {
    // Convert path to readable label
    return name
      .replace(/^\/api\//, '')
      .replace(/-/g, ' ')
      .replace(/\//g, ' → ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Store flow in database
   */
  private async storeFlow(scanId: string, flow: DataFlowAnalysis): Promise<void> {
    try {
      await prisma.dataFlow.create({
        data: {
          scanId,
          sourceType: flow.source.type,
          sourceEntity: flow.source.entity,
          sourceField: flow.source.field,
          targetType: flow.target.type,
          targetEntity: flow.target.entity,
          targetField: flow.target.field,
          flowType: flow.flowType,
          dataType: flow.dataType,
          transformation: flow.transformation,
          isValid: flow.isValid
        }
      })
    } catch (error) {
      // Ignore duplicate errors
    }
  }

  /**
   * Store node in database
   */
  private async storeNode(scanId: string, node: FlowNode): Promise<void> {
    try {
      await prisma.flowNode.create({
        data: {
          scanId,
          nodeType: node.nodeType,
          nodeName: node.name,
          nodeLabel: node.label,
          positionX: node.position.x,
          positionY: node.position.y,
          width: node.size.width,
          height: node.size.height,
          color: node.color,
          hasIssues: node.hasIssues
        }
      })
    } catch (error) {
      // Ignore duplicate errors
    }
  }

  /**
   * Clear flow data for a scan
   */
  private async clearFlowData(scanId: string): Promise<void> {
    await prisma.dataFlow.deleteMany({ where: { scanId } })
    await prisma.flowNode.deleteMany({ where: { scanId } })
  }

  /**
   * Get flow map from database
   */
  async getFlowMap(scanId: string): Promise<FlowMap | null> {
    const [dbNodes, dbFlows] = await Promise.all([
      prisma.flowNode.findMany({ where: { scanId } }),
      prisma.dataFlow.findMany({ where: { scanId } })
    ])

    if (dbNodes.length === 0) return null

    const nodes: FlowNode[] = dbNodes.map(n => ({
      id: n.id,
      nodeType: n.nodeType as FlowNode['nodeType'],
      name: n.nodeName,
      label: n.nodeLabel || undefined,
      description: n.description || undefined,
      position: { x: n.positionX, y: n.positionY },
      size: { width: n.width, height: n.height },
      color: n.color,
      icon: n.icon || undefined,
      filePath: n.filePath || undefined,
      hasIssues: n.hasIssues
    }))

    const edges: FlowEdge[] = dbFlows.map((f, i) => ({
      id: `edge_${i}`,
      source: `${f.sourceType}_${f.sourceEntity}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      target: `${f.targetType}_${f.targetEntity}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      type: f.flowType as FlowEdge['type'],
      label: f.flowType,
      animated: f.flowType === 'request' || f.flowType === 'mutation',
      data: {
        dataType: f.dataType || undefined,
        transformation: f.transformation || undefined,
        isValid: f.isValid
      }
    }))

    return {
      nodes,
      edges,
      metadata: {
        scanId,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        issueCount: edges.filter(e => e.data?.isValid === false).length,
        layers: {
          frontend: nodes.filter(n => n.nodeType === 'frontend_component' || n.nodeType === 'hook').length,
          api: nodes.filter(n => n.nodeType === 'api_endpoint').length,
          database: nodes.filter(n => n.nodeType === 'database_table').length
        }
      }
    }
  }

  /**
   * Get flow statistics
   */
  async getFlowStats(scanId: string): Promise<{
    totalFlows: number
    validFlows: number
    invalidFlows: number
    flowsByType: Record<string, number>
    flowsByLayer: { frontend: number; api: number; database: number }
  }> {
    const flows = await prisma.dataFlow.findMany({ where: { scanId } })

    const flowsByType: Record<string, number> = {}
    for (const flow of flows) {
      flowsByType[flow.flowType] = (flowsByType[flow.flowType] || 0) + 1
    }

    return {
      totalFlows: flows.length,
      validFlows: flows.filter(f => f.isValid).length,
      invalidFlows: flows.filter(f => !f.isValid).length,
      flowsByType,
      flowsByLayer: {
        frontend: flows.filter(f => f.sourceType === 'frontend' || f.targetType === 'frontend').length,
        api: flows.filter(f => f.sourceType === 'api' || f.targetType === 'api').length,
        database: flows.filter(f => f.sourceType === 'database' || f.targetType === 'database').length
      }
    }
  }

  /**
   * Generate Mermaid diagram
   */
  async generateMermaidDiagram(scanId: string): Promise<string> {
    const flowMap = await this.getFlowMap(scanId)
    if (!flowMap) return ''

    const lines: string[] = ['graph TD']
    
    // Add subgraphs for each layer
    lines.push('    subgraph Frontend')
    for (const node of flowMap.nodes.filter(n => n.nodeType === 'frontend_component' || n.nodeType === 'hook')) {
      lines.push(`        ${node.id}["${node.label || node.name}"]`)
    }
    lines.push('    end')
    
    lines.push('    subgraph API')
    for (const node of flowMap.nodes.filter(n => n.nodeType === 'api_endpoint')) {
      lines.push(`        ${node.id}["${node.label || node.name}"]`)
    }
    lines.push('    end')
    
    lines.push('    subgraph Database')
    for (const node of flowMap.nodes.filter(n => n.nodeType === 'database_table')) {
      lines.push(`        ${node.id}["${node.label || node.name}"]`)
    }
    lines.push('    end')

    // Add edges
    for (const edge of flowMap.edges) {
      const arrow = edge.type === 'response' ? '-->' : '-->'
      lines.push(`    ${edge.source} ${arrow}|${edge.label}| ${edge.target}`)
    }

    return lines.join('\n')
  }
}

// Export singleton
export const flowMapService = new FlowMapService()
