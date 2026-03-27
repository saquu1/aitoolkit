/**
 * Agent Registry
 * 
 * Central registry for all agents in the system.
 * Provides discovery, lookup, and management capabilities.
 * 
 * Task: TASK-3.2c - Agent Registry
 */

import { IAgent, AgentInfo, AgentLayer, AgentCategory } from "./agent-interface"

// ============================================================================
// Types
// ============================================================================

export interface RegistryStats {
  totalAgents: number
  byLayer: Record<AgentLayer, number>
  byCategory: Record<AgentCategory, number>
  requiresAI: number
  avgEstimatedDuration: number
}

export interface AgentFilter {
  layer?: AgentLayer
  category?: AgentCategory
  requiresAI?: boolean
  ids?: string[]
  search?: string
}

// ============================================================================
// Agent Registry
// ============================================================================

class AgentRegistry {
  private agents: Map<string, IAgent> = new Map()
  private initialized: boolean = false

  /**
   * Register an agent
   */
  register(agent: IAgent): void {
    if (this.agents.has(agent.id)) {
      console.warn(`Agent ${agent.id} already registered, replacing`)
    }
    this.agents.set(agent.id, agent)
  }

  /**
   * Register multiple agents
   */
  registerAll(agents: IAgent[]): void {
    for (const agent of agents) {
      this.register(agent)
    }
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): boolean {
    return this.agents.delete(agentId)
  }

  /**
   * Get agent by ID
   */
  get(agentId: string): IAgent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Check if agent exists
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId)
  }

  /**
   * Get all agents
   */
  getAll(): IAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get all agent info
   */
  getAllInfo(): AgentInfo[] {
    return this.getAll().map(agent => agent.getInfo())
  }

  /**
   * Get agents by layer
   */
  getByLayer(layer: AgentLayer): IAgent[] {
    return this.getAll().filter(agent => agent.layer === layer)
  }

  /**
   * Get agents by category
   */
  getByCategory(category: AgentCategory): IAgent[] {
    return this.getAll().filter(agent => agent.category === category)
  }

  /**
   * Get agents that require AI
   */
  getAIAgents(): IAgent[] {
    return this.getAll().filter(agent => agent.requiresAI)
  }

  /**
   * Get agents by filter
   */
  query(filter: AgentFilter): IAgent[] {
    let agents = this.getAll()

    if (filter.layer) {
      agents = agents.filter(a => a.layer === filter.layer)
    }

    if (filter.category) {
      agents = agents.filter(a => a.category === filter.category)
    }

    if (filter.requiresAI !== undefined) {
      agents = agents.filter(a => a.requiresAI === filter.requiresAI)
    }

    if (filter.ids) {
      agents = agents.filter(a => filter.ids!.includes(a.id))
    }

    if (filter.search) {
      const search = filter.search.toLowerCase()
      agents = agents.filter(a => 
        a.name.toLowerCase().includes(search) ||
        a.description.toLowerCase().includes(search) ||
        a.id.toLowerCase().includes(search)
      )
    }

    return agents
  }

  /**
   * Get dependencies for an agent (transitive)
   */
  getDependencies(agentId: string, visited: Set<string> = new Set()): string[] {
    const agent = this.agents.get(agentId)
    if (!agent) return []

    const deps: string[] = []
    
    for (const depId of agent.dependsOn) {
      if (visited.has(depId)) continue
      visited.add(depId)
      
      deps.push(depId)
      deps.push(...this.getDependencies(depId, visited))
    }

    return [...new Set(deps)]
  }

  /**
   * Get dependents for an agent (who depends on this agent)
   */
  getDependents(agentId: string): string[] {
    const dependents: string[] = []
    
    for (const agent of this.agents.values()) {
      if (agent.dependsOn.includes(agentId)) {
        dependents.push(agent.id)
      }
    }

    return dependents
  }

  /**
   * Get execution order for a set of agents (topological sort)
   */
  getExecutionOrder(agentIds: string[]): string[][] {
    const result: string[][] = []
    const processed = new Set<string>()
    const remaining = new Set(agentIds)

    while (remaining.size > 0) {
      const level: string[] = []

      for (const agentId of remaining) {
        const agent = this.agents.get(agentId)
        if (!agent) continue

        // Check if all dependencies are processed
        const allDepsMet = agent.dependsOn.every(dep => 
          processed.has(dep) || !agentIds.includes(dep)
        )

        if (allDepsMet) {
          level.push(agentId)
        }
      }

      if (level.length === 0) {
        // Circular dependency or unresolved
        break
      }

      result.push(level)
      level.forEach(id => {
        processed.add(id)
        remaining.delete(id)
      })
    }

    return result
  }

  /**
   * Validate agent dependencies
   */
  validateDependencies(agentId: string): { 
    valid: boolean
    missing: string[]
    circular: string[]
  } {
    const missing: string[] = []
    const visited = new Set<string>()
    const path = new Set<string>()
    const circular: string[] = []

    const checkDeps = (id: string): void => {
      const agent = this.agents.get(id)
      if (!agent) {
        missing.push(id)
        return
      }

      if (path.has(id)) {
        circular.push(id)
        return
      }

      if (visited.has(id)) return
      
      visited.add(id)
      path.add(id)

      for (const depId of agent.dependsOn) {
        checkDeps(depId)
      }

      path.delete(id)
    }

    const agent = this.agents.get(agentId)
    if (agent) {
      for (const depId of agent.dependsOn) {
        checkDeps(depId)
      }
    }

    return {
      valid: missing.length === 0 && circular.length === 0,
      missing,
      circular
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const agents = this.getAll()
    
    const byLayer: Record<AgentLayer, number> = {
      schema: 0,
      intelligence: 0,
      module: 0,
      requirements: 0,
      generation: 0,
      migration: 0,
      management: 0
    }

    const byCategory: Record<AgentCategory, number> = {
      parsing: 0,
      intelligence: 0,
      resolution: 0,
      matching: 0,
      generation: 0,
      validation: 0,
      orchestration: 0
    }

    let requiresAI = 0
    let totalDuration = 0

    for (const agent of agents) {
      byLayer[agent.layer]++
      byCategory[agent.category]++
      if (agent.requiresAI) requiresAI++
      totalDuration += agent.estimatedDuration
    }

    return {
      totalAgents: agents.length,
      byLayer,
      byCategory,
      requiresAI,
      avgEstimatedDuration: agents.length > 0 ? totalDuration / agents.length : 0
    }
  }

  /**
   * Initialize all agents
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    for (const agent of this.agents.values()) {
      if (agent.initialize) {
        try {
          await agent.initialize()
        } catch (error) {
          console.error(`Failed to initialize agent ${agent.id}:`, error)
        }
      }
    }

    this.initialized = true
  }

  /**
   * Cleanup all agents
   */
  async cleanup(): Promise<void> {
    for (const agent of this.agents.values()) {
      if (agent.cleanup) {
        try {
          await agent.cleanup()
        } catch (error) {
          console.error(`Failed to cleanup agent ${agent.id}:`, error)
        }
      }
    }

    this.initialized = false
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.agents.clear()
    this.initialized = false
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const agentRegistry = new AgentRegistry()

// ============================================================================
// Agent Registration Helper
// ============================================================================

/**
 * Decorator for auto-registering agents
 */
export function RegisterAgent(): ClassDecorator {
  return function <T extends { new (...args: any[]): IAgent }>(constructor: T) {
    const agent = new constructor()
    agentRegistry.register(agent)
    return constructor
  }
}

/**
 * Create and register an agent
 */
export function createAgent<T extends IAgent>(
  agentClass: new (...args: any[]) => T,
  ...args: any[]
): T {
  const agent = new agentClass(...args)
  agentRegistry.register(agent)
  return agent
}

// Export types
export type { RegistryStats as RegistryStatsType, AgentFilter as AgentFilterType }
