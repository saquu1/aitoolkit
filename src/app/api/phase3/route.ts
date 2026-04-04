/**
 * API Routes for Phase 3: Architecture & Infrastructure
 * 
 * Handles:
 * - Knowledge Graph (TASK-3.1)
 * - Agent Architecture (TASK-3.2)
 * - Vector Storage (TASK-3.3)
 * - Search Engine (TASK-3.5)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { knowledgeGraphService } from '@/lib/knowledge-graph/service'
import { graphBuilderAgent } from '@/lib/agents/GraphBuilderAgent'
import { agentRegistry } from '@/agents/core/registry'
import { AgentOrchestrator } from '@/agents/core/orchestrator'
import { vectorEmbeddingService } from '@/lib/embeddings/vector-embedding'
import { searchEngineService } from '@/lib/search/search-service'

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      // ================== Knowledge Graph ==================
      case 'graph-stats':
        return await handleGraphStats(searchParams)
      
      case 'graph-nodes':
        return await handleGetNodes(searchParams)
      
      case 'graph-edges':
        return await handleGetEdges(searchParams)
      
      case 'node-details':
        return await handleNodeDetails(searchParams)
      
      case 'node-dependents':
        return await handleNodeDependents(searchParams)
      
      case 'node-dependencies':
        return await handleNodeDependencies(searchParams)
      
      case 'shortest-path':
        return await handleShortestPath(searchParams)
      
      case 'detect-cycles':
        return await handleDetectCycles(searchParams)
      
      case 'subgraph':
        return await handleSubgraph(searchParams)
      
      // ================== Agent Registry ==================
      case 'list-agents':
        return await handleListAgents()
      
      case 'agent-info':
        return await handleAgentInfo(searchParams)
      
      case 'registry-stats':
        return await handleRegistryStats()
      
      case 'run-history':
        return await handleRunHistory(searchParams)
      
      case 'run-details':
        return await handleRunDetails(searchParams)
      
      // ================== Vector Embeddings ==================
      case 'embedding-stats':
        return await handleEmbeddingStats(searchParams)
      
      case 'similar-entities':
        return await handleSimilarEntities(searchParams)
      
      case 'similar-to-entity':
        return await handleSimilarToEntity(searchParams)
      
      // ================== Search ==================
      case 'search':
        return await handleSearch(searchParams)
      
      case 'search-suggestions':
        return await handleSearchSuggestions(searchParams)
      
      // ================== Default ==================
      default:
        return NextResponse.json({
          actions: [
            'Knowledge Graph: graph-stats, graph-nodes, graph-edges, node-details, node-dependents, node-dependencies, shortest-path, detect-cycles, subgraph',
            'Agent Registry: list-agents, agent-info, registry-stats, run-history, run-details',
            'Vector Embeddings: embedding-stats, similar-entities, similar-to-entity',
            'Search: search, search-suggestions'
          ]
        })
    }
  } catch (error) {
    console.error('[Phase3 API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ================== Knowledge Graph ==================
      case 'build-graph':
        return await handleBuildGraph(body)
      
      case 'create-node':
        return await handleCreateNode(body)
      
      case 'create-edge':
        return await handleCreateEdge(body)
      
      case 'update-node-position':
        return await handleUpdateNodePosition(body)
      
      case 'delete-node':
        return await handleDeleteNode(body)
      
      case 'clear-graph':
        return await handleClearGraph(body)
      
      // ================== Agent Execution ==================
      case 'run-agents':
        return await handleRunAgents(body)
      
      case 'cancel-run':
        return await handleCancelRun(body)
      
      // ================== Vector Embeddings ==================
      case 'create-embedding':
        return await handleCreateEmbedding(body)
      
      case 'embed-entity':
        return await handleEmbedEntity(body)
      
      case 'batch-embed':
        return await handleBatchEmbed(body)
      
      case 'delete-embedding':
        return await handleDeleteEmbedding(body)
      
      // ================== Search Index ==================
      case 'index-entity':
        return await handleIndexEntity(body)
      
      default:
        return NextResponse.json(
          { error: 'Unknown action', availableActions: [
            'build-graph', 'create-node', 'create-edge', 'update-node-position', 'delete-node', 'clear-graph',
            'run-agents', 'cancel-run',
            'create-embedding', 'embed-entity', 'batch-embed', 'delete-embedding',
            'index-entity'
          ]},
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Phase3 API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    )
  }
}

// ============================================================================
// Knowledge Graph Handlers
// ============================================================================

async function handleGraphStats(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const stats = await knowledgeGraphService.getGraphStats(projectId)
  return NextResponse.json(stats)
}

async function handleGetNodes(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const nodeType = searchParams.get('nodeType') || undefined
  const nodes = await knowledgeGraphService.getProjectNodes(projectId, nodeType)
  return NextResponse.json(nodes)
}

async function handleGetEdges(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const edgeType = searchParams.get('edgeType') || undefined
  const edges = await knowledgeGraphService.getProjectEdges(projectId, edgeType)
  return NextResponse.json(edges)
}

async function handleNodeDetails(searchParams: URLSearchParams) {
  const nodeId = searchParams.get('nodeId')
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId required' }, { status: 400 })
  }
  
  const details = await knowledgeGraphService.getNodeWithConnections(nodeId)
  return NextResponse.json(details || { error: 'Node not found' })
}

async function handleNodeDependents(searchParams: URLSearchParams) {
  const nodeId = searchParams.get('nodeId')
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId required' }, { status: 400 })
  }
  
  const maxDepth = searchParams.get('maxDepth') ? parseInt(searchParams.get('maxDepth')!) : 5
  const dependents = await knowledgeGraphService.findDependents(nodeId, maxDepth)
  return NextResponse.json({ dependents, count: dependents.length })
}

async function handleNodeDependencies(searchParams: URLSearchParams) {
  const nodeId = searchParams.get('nodeId')
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId required' }, { status: 400 })
  }
  
  const maxDepth = searchParams.get('maxDepth') ? parseInt(searchParams.get('maxDepth')!) : 5
  const dependencies = await knowledgeGraphService.findDependencies(nodeId, maxDepth)
  return NextResponse.json({ dependencies, count: dependencies.length })
}

async function handleShortestPath(searchParams: URLSearchParams) {
  const startNodeId = searchParams.get('startNodeId')
  const endNodeId = searchParams.get('endNodeId')
  
  if (!startNodeId || !endNodeId) {
    return NextResponse.json({ error: 'startNodeId and endNodeId required' }, { status: 400 })
  }
  
  const path = await knowledgeGraphService.findShortestPath(startNodeId, endNodeId)
  return NextResponse.json(path || { error: 'No path found' })
}

async function handleDetectCycles(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const result = await knowledgeGraphService.detectCircularDependencies(projectId)
  return NextResponse.json(result)
}

async function handleSubgraph(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const centerNodeId = searchParams.get('centerNodeId')
  
  if (!projectId || !centerNodeId) {
    return NextResponse.json({ error: 'projectId and centerNodeId required' }, { status: 400 })
  }
  
  const depth = searchParams.get('depth') ? parseInt(searchParams.get('depth')!) : 2
  const subgraph = await knowledgeGraphService.getSubgraph(projectId, centerNodeId, depth)
  return NextResponse.json(subgraph)
}

async function handleBuildGraph(body: any) {
  const { projectId, tables, procedures, views, modules, foreignKeys, columns } = body
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const result = await graphBuilderAgent.execute({
    projectId,
    tables,
    procedures,
    views,
    modules,
    foreignKeys,
    columns
  })
  
  return NextResponse.json(result)
}

async function handleCreateNode(body: any) {
  const { projectId, nodeType, name, displayName, description, properties, source } = body
  
  if (!projectId || !nodeType || !name) {
    return NextResponse.json({ error: 'projectId, nodeType, and name required' }, { status: 400 })
  }
  
  const result = await knowledgeGraphService.upsertNode({
    projectId,
    nodeType,
    name,
    displayName,
    description,
    properties,
    source
  })
  
  return NextResponse.json(result)
}

async function handleCreateEdge(body: any) {
  const { projectId, sourceNodeId, targetNodeId, edgeType, label, properties, source } = body
  
  if (!projectId || !sourceNodeId || !targetNodeId || !edgeType) {
    return NextResponse.json({ error: 'projectId, sourceNodeId, targetNodeId, and edgeType required' }, { status: 400 })
  }
  
  const result = await knowledgeGraphService.createEdge({
    projectId,
    sourceNodeId,
    targetNodeId,
    edgeType,
    label,
    properties,
    source
  })
  
  return NextResponse.json(result)
}

async function handleUpdateNodePosition(body: any) {
  const { nodeId, x, y } = body
  
  if (!nodeId || x === undefined || y === undefined) {
    return NextResponse.json({ error: 'nodeId, x, and y required' }, { status: 400 })
  }
  
  await knowledgeGraphService.updateNodePosition(nodeId, x, y)
  return NextResponse.json({ success: true })
}

async function handleDeleteNode(body: any) {
  const { nodeId } = body
  
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId required' }, { status: 400 })
  }
  
  await knowledgeGraphService.deleteNode(nodeId)
  return NextResponse.json({ success: true })
}

async function handleClearGraph(body: any) {
  const { projectId } = body
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const result = await knowledgeGraphService.clearProjectGraph(projectId)
  return NextResponse.json(result)
}

// ============================================================================
// Agent Registry Handlers
// ============================================================================

async function handleListAgents() {
  const agents = agentRegistry.getAllInfo()
  return NextResponse.json(agents)
}

async function handleAgentInfo(searchParams: URLSearchParams) {
  const agentId = searchParams.get('agentId')
  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }
  
  const agent = agentRegistry.get(agentId)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  return NextResponse.json(agent.getInfo())
}

async function handleRegistryStats() {
  const stats = agentRegistry.getStats()
  return NextResponse.json(stats)
}

async function handleRunHistory(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
  
  const where: any = {}
  if (projectId) where.projectId = projectId
  
  const runs = await prisma.agentRun.findMany({
    where,
    orderBy: { startTime: 'desc' },
    take: limit,
    select: {
      runId: true,
      runName: true,
      status: true,
      startTime: true,
      endTime: true,
      duration: true,
      totalAgents: true,
      completedAgents: true,
      failedAgents: true
    }
  })
  
  return NextResponse.json(runs)
}

async function handleRunDetails(searchParams: URLSearchParams) {
  const runId = searchParams.get('runId')
  if (!runId) {
    return NextResponse.json({ error: 'runId required' }, { status: 400 })
  }
  
  const run = await prisma.agentRun.findUnique({
    where: { runId },
    include: {
      executions: {
        orderBy: { startTime: 'asc' }
      },
      logs: {
        orderBy: { timestamp: 'desc' },
        take: 100
      }
    }
  })
  
  return NextResponse.json(run || { error: 'Run not found' })
}

async function handleRunAgents(body: any) {
  const { projectId, agentIds, input, parallel, stopOnError } = body
  
  if (!projectId || !agentIds || !Array.isArray(agentIds)) {
    return NextResponse.json({ error: 'projectId and agentIds array required' }, { status: 400 })
  }
  
  const orchestrator = new AgentOrchestrator()
  
  // Register agents
  for (const agentId of agentIds) {
    const agent = agentRegistry.get(agentId)
    if (agent) {
      orchestrator.registerAgent(agent)
    }
  }
  
  // Run orchestrator
  const result = await orchestrator.run({
    projectId,
    input: input || {},
    agents: Array.from(agentRegistry.getAll()).filter(a => agentIds.includes(a.id)),
    parallel: parallel || false,
    stopOnError: stopOnError !== false
  })
  
  return NextResponse.json(result)
}

async function handleCancelRun(body: any) {
  const { runId } = body
  
  if (!runId) {
    return NextResponse.json({ error: 'runId required' }, { status: 400 })
  }
  
  // Update run status
  await prisma.agentRun.update({
    where: { runId },
    data: {
      status: 'cancelled',
      endTime: new Date()
    }
  })
  
  return NextResponse.json({ success: true })
}

// ============================================================================
// Vector Embedding Handlers
// ============================================================================

async function handleEmbeddingStats(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const stats = await vectorEmbeddingService.getStats(projectId)
  return NextResponse.json(stats)
}

async function handleSimilarEntities(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const query = searchParams.get('query')
  
  if (!projectId || !query) {
    return NextResponse.json({ error: 'projectId and query required' }, { status: 400 })
  }
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
  const threshold = searchParams.get('threshold') ? parseFloat(searchParams.get('threshold')!) : 0.7
  
  const results = await vectorEmbeddingService.findSimilar(projectId, query, {
    limit,
    threshold
  })
  
  return NextResponse.json(results)
}

async function handleSimilarToEntity(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  
  if (!projectId || !entityType || !entityId) {
    return NextResponse.json({ error: 'projectId, entityType, and entityId required' }, { status: 400 })
  }
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
  
  const results = await vectorEmbeddingService.findSimilarToEntity(
    projectId,
    entityType,
    entityId,
    { limit }
  )
  
  return NextResponse.json(results)
}

async function handleCreateEmbedding(body: any) {
  const { projectId, entityType, entityId, content } = body
  
  if (!projectId || !entityType || !entityId || !content) {
    return NextResponse.json({ error: 'projectId, entityType, entityId, and content required' }, { status: 400 })
  }
  
  const result = await vectorEmbeddingService.storeEmbedding({
    projectId,
    entityType,
    entityId,
    content
  })
  
  return NextResponse.json(result)
}

async function handleEmbedEntity(body: any) {
  const { projectId, entityType, entityId, entityData } = body
  
  if (!projectId || !entityType || !entityId || !entityData) {
    return NextResponse.json({ error: 'projectId, entityType, entityId, and entityData required' }, { status: 400 })
  }
  
  const result = await vectorEmbeddingService.embedEntity(
    projectId,
    entityType,
    entityId,
    entityData
  )
  
  return NextResponse.json(result)
}

async function handleBatchEmbed(body: any) {
  const { projectId, entities } = body
  
  if (!projectId || !entities || !Array.isArray(entities)) {
    return NextResponse.json({ error: 'projectId and entities array required' }, { status: 400 })
  }
  
  const inputs = entities.map(e => ({
    projectId,
    entityType: e.entityType,
    entityId: e.entityId,
    content: vectorEmbeddingService.generateSearchableContent(e.entityType, e.entityData)
  }))
  
  const result = await vectorEmbeddingService.batchStoreEmbeddings(inputs)
  return NextResponse.json(result)
}

async function handleDeleteEmbedding(body: any) {
  const { projectId, entityType, entityId } = body
  
  if (!projectId || !entityType || !entityId) {
    return NextResponse.json({ error: 'projectId, entityType, and entityId required' }, { status: 400 })
  }
  
  const success = await vectorEmbeddingService.deleteEmbedding(projectId, entityType, entityId)
  return NextResponse.json({ success })
}

// ============================================================================
// Search Handlers
// ============================================================================

async function handleSearch(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const query = searchParams.get('query')
  
  if (!projectId || !query) {
    return NextResponse.json({ error: 'projectId and query required' }, { status: 400 })
  }
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
  const useSemantic = searchParams.get('useSemantic') === 'true'
  
  const results = await searchEngineService.search({
    projectId,
    query,
    options: {
      limit,
      useSemantic
    }
  })
  
  return NextResponse.json(results)
}

async function handleSearchSuggestions(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const prefix = searchParams.get('prefix')
  
  if (!projectId || !prefix) {
    return NextResponse.json({ error: 'projectId and prefix required' }, { status: 400 })
  }
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
  const suggestions = await searchEngineService.getSuggestions(projectId, prefix, limit)
  
  return NextResponse.json(suggestions)
}

async function handleIndexEntity(body: any) {
  const { projectId, entityType, entityId, title, content, keywords, tags, metadata } = body
  
  if (!projectId || !entityType || !entityId) {
    return NextResponse.json({ error: 'projectId, entityType, and entityId required' }, { status: 400 })
  }
  
  await searchEngineService.indexEntity({
    entityType,
    entityId,
    title: title || entityId,
    content: content || '',
    keywords: keywords || [],
    tags: tags || [],
    metadata: { ...metadata, projectId }
  })
  
  return NextResponse.json({ success: true })
}
