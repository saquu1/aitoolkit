/**
 * Knowledge Graph Service
 * 
 * Provides persistent storage and querying for the knowledge graph.
 * Supports nodes and edges for representing database entities and relationships.
 * 
 * Task: TASK-3.1 - Persistent Knowledge Graph
 * Gap ID: GAP-013 (Opus), Architecture-1 (Qwen)
 */

import { prisma } from "@/lib/db"

// ============================================================================
// Types
// ============================================================================

export interface KGNodeData {
  id?: string
  projectId: string
  nodeType: 'table' | 'view' | 'sp' | 'module' | 'form' | 'api' | 'column'
  nodeSubtype?: 'master' | 'transaction' | 'lookup' | 'reference'
  name: string
  displayName?: string
  description?: string
  properties?: Record<string, any>
  confidence?: number
  source?: string
}

export interface KGEdgeData {
  id?: string
  projectId: string
  sourceNodeId: string
  targetNodeId: string
  edgeType: 'fk' | 'sp_access' | 'view_access' | 'module_contains' | 'api_call' | 'column_of' | 'references'
  label?: string
  properties?: Record<string, any>
  confidence?: number
  weight?: number
  source?: string
}

export interface NodeWithConnections {
  node: {
    id: string
    projectId: string
    nodeType: string
    nodeSubtype: string | null
    name: string
    displayName: string | null
    description: string | null
    positionX: number | null
    positionY: number | null
    color: string | null
    size: number
    icon: string | null
    properties: string
    confidence: number
    source: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  outgoing: Array<{
    edge: {
    id: string
    edgeType: string
    label: string | null
    properties: string
    confidence: number
    weight: number
  }
  target: {
    id: string
    name: string
    nodeType: string
  }
  }>
  incoming: Array<{
    edge: {
    id: string
    edgeType: string
    label: string | null
    properties: string
    confidence: number
    weight: number
  }
  source: {
    id: string
    name: string
    nodeType: string
  }
  }>
}

export interface GraphStats {
  totalNodes: number
  totalEdges: number
  nodesByType: Record<string, number>
  edgesByType: Record<string, number>
  avgConfidence: number
}

export interface PathResult {
  nodes: Array<{
    id: string
    name: string
    nodeType: string
  }>
  edges: Array<{
    sourceId: string
    targetId: string
    edgeType: string
  }>
  pathLength: number
}

export interface CycleDetectionResult {
  hasCycles: boolean
  cycles: string[][]
  affectedNodes: string[]
}

// ============================================================================
// Knowledge Graph Service
// ============================================================================

export class KnowledgeGraphService {
  /**
   * Create or update a node in the knowledge graph
   */
  async upsertNode(input: KGNodeData): Promise<{ id: string; name: string; created: boolean }> {
    const existing = await prisma.kGNode.findFirst({
      where: {
        projectId: input.projectId,
        nodeType: input.nodeType,
        name: input.name
      }
    })

    if (existing) {
      await prisma.kGNode.update({
        where: { id: existing.id },
        data: {
          displayName: input.displayName,
          description: input.description,
          nodeSubtype: input.nodeSubtype,
          properties: JSON.stringify(input.properties || {}),
          confidence: input.confidence || 1.0,
          source: input.source,
          updatedAt: new Date()
        }
      })
      return { id: existing.id, name: existing.name, created: false }
    }

    const node = await prisma.kGNode.create({
      data: {
        projectId: input.projectId,
        nodeType: input.nodeType,
        nodeSubtype: input.nodeSubtype,
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        properties: JSON.stringify(input.properties || {}),
        confidence: input.confidence || 1.0,
        source: input.source
      }
    })

    return { id: node.id, name: node.name, created: true }
  }

  /**
   * Create an edge in the knowledge graph
   */
  async createEdge(input: KGEdgeData): Promise<{ id: string; created: boolean }> {
    // Check if edge already exists
    const existing = await prisma.kGEdge.findFirst({
      where: {
        projectId: input.projectId,
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        edgeType: input.edgeType
      }
    })

    if (existing) {
      await prisma.kGEdge.update({
        where: { id: existing.id },
        data: {
          label: input.label,
          properties: JSON.stringify(input.properties || {}),
          confidence: input.confidence || 1.0,
          weight: input.weight || 1.0,
          source: input.source,
          updatedAt: new Date()
        }
      })
      return { id: existing.id, created: false }
    }

    const edge = await prisma.kGEdge.create({
      data: {
        projectId: input.projectId,
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        edgeType: input.edgeType,
        label: input.label,
        properties: JSON.stringify(input.properties || {}),
        confidence: input.confidence || 1.0,
        weight: input.weight || 1.0,
        source: input.source
      }
    })

    return { id: edge.id, created: true }
  }

  /**
   * Get node with all connections (incoming and outgoing edges)
   */
  async getNodeWithConnections(nodeId: string): Promise<NodeWithConnections | null> {
    const node = await prisma.kGNode.findUnique({
      where: { id: nodeId },
      include: {
        outgoingEdges: {
          include: { targetNode: true }
        },
        incomingEdges: {
          include: { sourceNode: true }
        }
      }
    })

    if (!node) return null

    return {
      node,
      outgoing: node.outgoingEdges.map(e => ({
        edge: {
          id: e.id,
          edgeType: e.edgeType,
          label: e.label,
          properties: e.properties,
          confidence: e.confidence,
          weight: e.weight
        },
        target: {
          id: e.targetNode.id,
          name: e.targetNode.name,
          nodeType: e.targetNode.nodeType
        }
      })),
      incoming: node.incomingEdges.map(e => ({
        edge: {
          id: e.id,
          edgeType: e.edgeType,
          label: e.label,
          properties: e.properties,
          confidence: e.confidence,
          weight: e.weight
        },
        source: {
          id: e.sourceNode.id,
          name: e.sourceNode.name,
          nodeType: e.sourceNode.nodeType
        }
      }))
    }
  }

  /**
   * Get node by project, type and name
   */
  async getNode(
    projectId: string,
    nodeType: string,
    name: string
  ): Promise<{ id: string; name: string; nodeType: string } | null> {
    const node = await prisma.kGNode.findFirst({
      where: { projectId, nodeType, name },
      select: { id: true, name: true, nodeType: true }
    })
    return node
  }

  /**
   * Get all nodes for a project
   */
  async getProjectNodes(
    projectId: string,
    nodeType?: string
  ): Promise<Array<{
    id: string
    name: string
    nodeType: string
    displayName: string | null
    description: string | null
    confidence: number
  }>> {
    const where: any = { projectId, isActive: true }
    if (nodeType) where.nodeType = nodeType

    return prisma.kGNode.findMany({
      where,
      select: {
        id: true,
        name: true,
        nodeType: true,
        displayName: true,
        description: true,
        confidence: true
      },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get all edges for a project
   */
  async getProjectEdges(
    projectId: string,
    edgeType?: string
  ): Promise<Array<{
    id: string
    sourceNodeId: string
    targetNodeId: string
    edgeType: string
    label: string | null
    confidence: number
  }>> {
    const where: any = { projectId, isActive: true }
    if (edgeType) where.edgeType = edgeType

    return prisma.kGEdge.findMany({
      where,
      select: {
        id: true,
        sourceNodeId: true,
        targetNodeId: true,
        edgeType: true,
        label: true,
        confidence: true
      },
      orderBy: { createdAt: 'asc' }
    })
  }

  /**
   * Find all nodes that depend on this node (impact analysis)
   * Returns nodes that reference this node (upstream dependencies)
   */
  async findDependents(nodeId: string, maxDepth: number = 5): Promise<Array<{
    id: string
    name: string
    nodeType: string
    depth: number
  }>> {
    const visited = new Set<string>()
    const result: Array<{ id: string; name: string; nodeType: string; depth: number }> = []

    const traverse = async (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) return
      visited.add(currentId)

      const edges = await prisma.kGEdge.findMany({
        where: { targetNodeId: currentId, isActive: true },
        include: { sourceNode: true }
      })

      for (const edge of edges) {
        result.push({
          id: edge.sourceNode.id,
          name: edge.sourceNode.name,
          nodeType: edge.sourceNode.nodeType,
          depth
        })
        await traverse(edge.sourceNodeId, depth + 1)
      }
    }

    await traverse(nodeId, 0)
    return result
  }

  /**
   * Find all nodes this node depends on (dependency analysis)
   * Returns nodes that this node references (downstream dependencies)
   */
  async findDependencies(nodeId: string, maxDepth: number = 5): Promise<Array<{
    id: string
    name: string
    nodeType: string
    depth: number
  }>> {
    const visited = new Set<string>()
    const result: Array<{ id: string; name: string; nodeType: string; depth: number }> = []

    const traverse = async (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) return
      visited.add(currentId)

      const edges = await prisma.kGEdge.findMany({
        where: { sourceNodeId: currentId, isActive: true },
        include: { targetNode: true }
      })

      for (const edge of edges) {
        result.push({
          id: edge.targetNode.id,
          name: edge.targetNode.name,
          nodeType: edge.targetNode.nodeType,
          depth
        })
        await traverse(edge.targetNodeId, depth + 1)
      }
    }

    await traverse(nodeId, 0)
    return result
  }

  /**
   * Find shortest path between two nodes using BFS
   */
  async findShortestPath(
    startNodeId: string,
    endNodeId: string
  ): Promise<PathResult | null> {
    const visited = new Set<string>()
    const queue: { nodeId: string; path: string[]; edges: Array<{ sourceId: string; targetId: string; edgeType: string }> }[] = [
      { nodeId: startNodeId, path: [startNodeId], edges: [] }
    ]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.nodeId === endNodeId) {
        // Fetch all nodes in path
        const nodes = await prisma.kGNode.findMany({
          where: { id: { in: current.path } },
          select: { id: true, name: true, nodeType: true }
        })

        return {
          nodes,
          edges: current.edges,
          pathLength: current.path.length - 1
        }
      }

      if (visited.has(current.nodeId)) continue
      visited.add(current.nodeId)

      const edges = await prisma.kGEdge.findMany({
        where: { sourceNodeId: current.nodeId, isActive: true },
        select: { targetNodeId: true, edgeType: true }
      })

      for (const edge of edges) {
        if (!visited.has(edge.targetNodeId)) {
          queue.push({
            nodeId: edge.targetNodeId,
            path: [...current.path, edge.targetNodeId],
            edges: [...current.edges, {
              sourceId: current.nodeId,
              targetId: edge.targetNodeId,
              edgeType: edge.edgeType
            }]
          })
        }
      }
    }

    return null // No path found
  }

  /**
   * Detect circular dependencies in the graph
   */
  async detectCircularDependencies(projectId: string): Promise<CycleDetectionResult> {
    const nodes = await prisma.kGNode.findMany({
      where: { projectId, isActive: true },
      include: {
        outgoingEdges: {
          where: { isActive: true },
          select: { targetNodeId: true }
        }
      }
    })

    const adjacencyList = new Map<string, string[]>()
    for (const node of nodes) {
      adjacencyList.set(
        node.id,
        node.outgoingEdges.map(e => e.targetNodeId)
      )
    }

    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      path.push(nodeId)

      const neighbors = adjacencyList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor)
          cycles.push([...path.slice(cycleStart), neighbor])
        }
      }

      recursionStack.delete(nodeId)
      path.pop()
      return false
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id)
      }
    }

    // Get affected nodes
    const affectedNodes = [...new Set(cycles.flat())]

    return {
      hasCycles: cycles.length > 0,
      cycles,
      affectedNodes
    }
  }

  /**
   * Get graph statistics for a project
   */
  async getGraphStats(projectId: string): Promise<GraphStats> {
    const [nodeCount, edgeCount, nodesByType, edgesByType, confidenceResult] = await Promise.all([
      prisma.kGNode.count({ where: { projectId, isActive: true } }),
      prisma.kGEdge.count({ where: { projectId, isActive: true } }),
      prisma.kGNode.groupBy({
        by: ['nodeType'],
        where: { projectId, isActive: true },
        _count: true
      }),
      prisma.kGEdge.groupBy({
        by: ['edgeType'],
        where: { projectId, isActive: true },
        _count: true
      }),
      prisma.kGNode.aggregate({
        where: { projectId, isActive: true },
        _avg: { confidence: true }
      })
    ])

    return {
      totalNodes: nodeCount,
      totalEdges: edgeCount,
      nodesByType: Object.fromEntries(nodesByType.map(n => [n.nodeType, n._count])),
      edgesByType: Object.fromEntries(edgesByType.map(e => [e.edgeType, e._count])),
      avgConfidence: confidenceResult._avg.confidence || 0
    }
  }

  /**
   * Delete a node and all its edges
   */
  async deleteNode(nodeId: string): Promise<void> {
    await prisma.kGEdge.deleteMany({
      where: {
        OR: [
          { sourceNodeId: nodeId },
          { targetNodeId: nodeId }
        ]
      }
    })

    await prisma.kGNode.delete({
      where: { id: nodeId }
    })
  }

  /**
   * Delete all nodes and edges for a project
   */
  async clearProjectGraph(projectId: string): Promise<{ nodesDeleted: number; edgesDeleted: number }> {
    const edgesDeleted = await prisma.kGEdge.deleteMany({
      where: { projectId }
    })

    const nodesDeleted = await prisma.kGNode.deleteMany({
      where: { projectId }
    })

    return {
      nodesDeleted: nodesDeleted.count,
      edgesDeleted: edgesDeleted.count
    }
  }

  /**
   * Update node position (for visualization)
   */
  async updateNodePosition(
    nodeId: string,
    x: number,
    y: number
  ): Promise<void> {
    await prisma.kGNode.update({
      where: { id: nodeId },
      data: { positionX: x, positionY: y }
    })
  }

  /**
   * Batch create nodes
   */
  async batchCreateNodes(
    nodes: Array<KGNodeData>
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const node of nodes) {
      const result = await this.upsertNode(node)
      if (result.created) created++
      else updated++
    }

    return { created, updated }
  }

  /**
   * Batch create edges
   */
  async batchCreateEdges(
    edges: Array<KGEdgeData>
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const edge of edges) {
      const result = await this.createEdge(edge)
      if (result.created) created++
      else updated++
    }

    return { created, updated }
  }

  /**
   * Get subgraph for visualization
   */
  async getSubgraph(
    projectId: string,
    centerNodeId: string,
    depth: number = 2
  ): Promise<{
    nodes: Array<{ id: string; name: string; nodeType: string; positionX: number | null; positionY: number | null }>
    edges: Array<{ sourceNodeId: string; targetNodeId: string; edgeType: string; label: string | null }>
  }> {
    const visitedNodes = new Set<string>()
    const nodes: Array<{ id: string; name: string; nodeType: string; positionX: number | null; positionY: number | null }> = []
    const edges: Array<{ sourceNodeId: string; targetNodeId: string; edgeType: string; label: string | null }> = []

    const traverse = async (nodeId: string, currentDepth: number) => {
      if (currentDepth > depth || visitedNodes.has(nodeId)) return
      visitedNodes.add(nodeId)

      const nodeWithConnections = await this.getNodeWithConnections(nodeId)
      if (!nodeWithConnections) return

      nodes.push({
        id: nodeWithConnections.node.id,
        name: nodeWithConnections.node.name,
        nodeType: nodeWithConnections.node.nodeType,
        positionX: nodeWithConnections.node.positionX,
        positionY: nodeWithConnections.node.positionY
      })

      // Add outgoing edges
      for (const { edge, target } of nodeWithConnections.outgoing) {
        edges.push({
          sourceNodeId: nodeId,
          targetNodeId: target.id,
          edgeType: edge.edgeType,
          label: edge.label
        })

        if (!visitedNodes.has(target.id)) {
          await traverse(target.id, currentDepth + 1)
        }
      }

      // Add incoming edges
      for (const { edge, source } of nodeWithConnections.incoming) {
        edges.push({
          sourceNodeId: source.id,
          targetNodeId: nodeId,
          edgeType: edge.edgeType,
          label: edge.label
        })

        if (!visitedNodes.has(source.id)) {
          await traverse(source.id, currentDepth + 1)
        }
      }
    }

    await traverse(centerNodeId, 0)

    return { nodes, edges }
  }
}

// Export singleton instance
export const knowledgeGraphService = new KnowledgeGraphService()

// Export types
export type { KGNodeData as KGNodeDataType, KGEdgeData as KGEdgeDataType, GraphStats as GraphStatsType }
