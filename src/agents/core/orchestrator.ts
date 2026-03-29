/**
 * Agent Orchestrator
 * 
 * Manages execution of multiple agents with dependency resolution,
 * parallel execution, error handling, and progress tracking.
 * 
 * Task: TASK-3.2b - Agent Orchestrator
 */

import { prisma } from "@/lib/db"
import { 
  IAgent, 
  AgentContext, 
  AgentResult, 
  AgentStatus,
  createLogger,
  createAgentContext
} from "./agent-interface"

// ============================================================================
// Types
// ============================================================================

export interface OrchestratorConfig {
  projectId: string
  companyId?: string
  userId?: string
  input: Record<string, any>
  agents: IAgent[]
  parallel?: boolean
  stopOnError?: boolean
  maxConcurrency?: number
  timeout?: number // milliseconds
  onProgress?: (agentId: string, progress: number, message: string) => void
  onAgentComplete?: (agentId: string, result: AgentResult) => void
  onAgentError?: (agentId: string, error: Error) => void
}

export interface OrchestratorResult {
  runId: string
  success: boolean
  results: Map<string, AgentResult>
  totalDuration: number
  agentsCompleted: number
  agentsFailed: number
  agentsSkipped: number
  errors: string[]
  warnings: string[]
}

export interface ExecutionPlan {
  levels: IAgent[][]
  totalAgents: number
  maxDepth: number
}

export interface ExecutionState {
  runId: string
  status: AgentStatus
  startTime: Date
  endTime?: Date
  agentsCompleted: Set<string>
  agentsFailed: Set<string>
  agentsSkipped: Set<string>
  currentAgent?: string
  progress: number
}

// ============================================================================
// Agent Orchestrator
// ============================================================================

export class AgentOrchestrator {
  private agents: Map<string, IAgent> = new Map()
  private results: Map<string, AgentResult> = new Map()
  private sharedState: Map<string, any> = new Map()
  private state: ExecutionState | null = null

  /**
   * Register an agent
   */
  registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent)
  }

  /**
   * Register multiple agents
   */
  registerAgents(agents: IAgent[]): void {
    for (const agent of agents) {
      this.registerAgent(agent)
    }
  }

  /**
   * Run the agent pipeline
   */
  async run(config: OrchestratorConfig): Promise<OrchestratorResult> {
    const startTime = Date.now()
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const errors: string[] = []
    const warnings: string[] = []

    // Initialize state
    this.state = {
      runId,
      status: 'running',
      startTime: new Date(),
      agentsCompleted: new Set(),
      agentsFailed: new Set(),
      agentsSkipped: new Set(),
      progress: 0
    }

    // Reset results and shared state
    this.results = new Map()
    this.sharedState = new Map()

    // Create run record
    await this.createRunRecord(runId, config)

    // Build execution plan
    const plan = this.buildExecutionPlan(config.agents)

    // Update run with agent count
    await this.updateRunRecord(runId, {
      totalAgents: plan.totalAgents
    })

    // Create context
    const context = await createAgentContext(
      config.projectId,
      runId,
      config.input,
      config
    )

    // Override progress reporter
    context.reportProgress = (progress: number, message: string) => {
      if (config.onProgress) {
        config.onProgress(this.state?.currentAgent || 'unknown', progress, message)
      }
    }

    // Add company and user to context
    Object.assign(context, {
      companyId: config.companyId,
      userId: config.userId
    })

    try {
      // Execute agents
      if (config.parallel) {
        await this.executeParallel(plan, context, config)
      } else {
        await this.executeSequential(plan, context, config)
      }

      // Calculate final status
      const success = !Array.from(this.results.values()).some(r => !r.success)

      // Update run record
      await this.updateRunRecord(runId, {
        status: success ? 'completed' : 'failed',
        endTime: new Date(),
        duration: Date.now() - startTime,
        completedAgents: this.state.agentsCompleted.size,
        failedAgents: this.state.agentsFailed.size,
        skippedAgents: this.state.agentsSkipped.size,
        output: JSON.stringify(Object.fromEntries(this.results)),
        errors: JSON.stringify(errors)
      })

      // Collect errors and warnings from results
      for (const [agentId, result] of this.results) {
        errors.push(...result.errors)
        warnings.push(...result.warnings)
      }

      return {
        runId,
        success,
        results: this.results,
        totalDuration: Date.now() - startTime,
        agentsCompleted: this.state.agentsCompleted.size,
        agentsFailed: this.state.agentsFailed.size,
        agentsSkipped: this.state.agentsSkipped.size,
        errors,
        warnings
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(`Orchestration failed: ${errorMessage}`)

      // Update run record with error
      await this.updateRunRecord(runId, {
        status: 'failed',
        endTime: new Date(),
        duration: Date.now() - startTime,
        errors: JSON.stringify(errors)
      })

      return {
        runId,
        success: false,
        results: this.results,
        totalDuration: Date.now() - startTime,
        agentsCompleted: this.state.agentsCompleted.size,
        agentsFailed: this.state.agentsFailed.size,
        agentsSkipped: this.state.agentsSkipped.size,
        errors,
        warnings
      }
    }
  }

  /**
   * Build execution plan using topological sort
   */
  private buildExecutionPlan(agents: IAgent[]): ExecutionPlan {
    const levels: IAgent[][] = []
    const processed = new Set<string>()
    const remaining = new Set(agents.map(a => a.id))
    let maxDepth = 0

    while (remaining.size > 0) {
      const level: IAgent[] = []
      
      for (const agentId of remaining) {
        const agent = this.agents.get(agentId)
        if (!agent) continue

        // Check if all dependencies are processed
        const depsMet = agent.dependsOn.every(dep => processed.has(dep))
        
        if (depsMet) {
          level.push(agent)
        }
      }

      if (level.length === 0) {
        // Circular dependency or missing agent
        console.warn('Cannot resolve dependencies for remaining agents:', 
          Array.from(remaining).join(', '))
        
        // Add remaining agents to last level (they will be skipped)
        for (const agentId of remaining) {
          const agent = this.agents.get(agentId)
          if (agent) {
            level.push(agent)
          }
        }
        
        if (level.length === 0) break
      }

      levels.push(level)
      maxDepth = levels.length
      
      level.forEach(a => {
        processed.add(a.id)
        remaining.delete(a.id)
      })
    }

    return {
      levels,
      totalAgents: processed.size,
      maxDepth
    }
  }

  /**
   * Execute agents sequentially
   */
  private async executeSequential(
    plan: ExecutionPlan,
    context: AgentContext,
    config: OrchestratorConfig
  ): Promise<void> {
    for (let i = 0; i < plan.levels.length; i++) {
      const level = plan.levels[i]
      
      for (const agent of level) {
        // Check if we should stop
        if (this.state?.status === 'cancelled') {
          this.skipAgent(agent.id, 'Run cancelled')
          continue
        }

        // Check if agent can run
        const canRun = await agent.canRun(context)
        if (!canRun) {
          this.skipAgent(agent.id, 'Dependencies not met')
          continue
        }

        // Execute agent
        const result = await this.executeAgent(agent, context, config)
        
        // Store result
        this.results.set(agent.id, result)

        // Update shared state
        if (result.stateUpdates) {
          for (const [key, value] of Object.entries(result.stateUpdates)) {
            this.sharedState.set(key, value)
          }
        }
        this.sharedState.set(`agent:${agent.id}`, result)

        // Update state
        if (result.success) {
          this.state?.agentsCompleted.add(agent.id)
        } else {
          this.state?.agentsFailed.add(agent.id)
          
          // Check if we should stop
          if (config.stopOnError) {
            throw new Error(`Agent ${agent.id} failed: ${result.errors.join(', ')}`)
          }
        }

        // Update progress
        if (this.state) {
          this.state.progress = (i + 1) / plan.levels.length
        }

        // Callback
        if (config.onAgentComplete) {
          config.onAgentComplete(agent.id, result)
        }
      }
    }
  }

  /**
   * Execute agents in parallel where possible
   */
  private async executeParallel(
    plan: ExecutionPlan,
    context: AgentContext,
    config: OrchestratorConfig
  ): Promise<void> {
    const maxConcurrency = config.maxConcurrency || 5

    for (let i = 0; i < plan.levels.length; i++) {
      const level = plan.levels[i]
      
      // Check if we should stop
      if (this.state?.status === 'cancelled') {
        for (const agent of level) {
          this.skipAgent(agent.id, 'Run cancelled')
        }
        continue
      }

      // Process level in batches
      for (let j = 0; j < level.length; j += maxConcurrency) {
        const batch = level.slice(j, j + maxConcurrency)
        
        const promises = batch.map(async agent => {
          // Check if agent can run
          const canRun = await agent.canRun(context)
          if (!canRun) {
            this.skipAgent(agent.id, 'Dependencies not met')
            return { agentId: agent.id, result: null, skipped: true }
          }

          const result = await this.executeAgent(agent, context, config)
          return { agentId: agent.id, result, skipped: false }
        })

        const batchResults = await Promise.all(promises)
        
        for (const { agentId, result, skipped } of batchResults) {
          if (skipped || !result) continue

          // Store result
          this.results.set(agentId, result)

          // Update shared state
          if (result.stateUpdates) {
            for (const [key, value] of Object.entries(result.stateUpdates)) {
              this.sharedState.set(key, value)
            }
          }
          this.sharedState.set(`agent:${agentId}`, result)

          // Update state
          if (result.success) {
            this.state?.agentsCompleted.add(agentId)
          } else {
            this.state?.agentsFailed.add(agentId)
          }

          // Callback
          if (config.onAgentComplete) {
            config.onAgentComplete(agentId, result)
          }
        }

        // Check for critical errors
        const failedInBatch = batchResults.filter(r => r.result && !r.result.success)
        if (failedInBatch.length > 0 && config.stopOnError) {
          throw new Error(`${failedInBatch.length} agents failed in batch`)
        }
      }

      // Update progress
      if (this.state) {
        this.state.progress = (i + 1) / plan.levels.length
      }
    }
  }

  /**
   * Execute a single agent with error handling and retries
   */
  private async executeAgent(
    agent: IAgent,
    context: AgentContext,
    config: OrchestratorConfig
  ): Promise<AgentResult> {
    const agentStartTime = Date.now()
    this.state!.currentAgent = agent.id

    // Create execution record
    const executionId = await this.createExecutionRecord(
      context.runId,
      agent,
      context.input
    )

    let retries = 0
    let lastError: Error | null = null

    while (retries <= agent.maxRetries) {
      try {
        // Call before execute hook
        if (agent.onBeforeExecute) {
          await agent.onBeforeExecute(context)
        }

        // Execute agent
        const result = await agent.execute(context)
        result.duration = Date.now() - agentStartTime

        // Call after execute hook
        if (agent.onAfterExecute) {
          await agent.onAfterExecute(context, result)
        }

        // Update execution record
        await this.updateExecutionRecord(executionId, {
          status: result.success ? 'completed' : 'failed',
          endTime: new Date(),
          duration: result.duration,
          output: result.output,
          itemsProcessed: result.itemsProcessed,
          itemsProduced: result.itemsProduced,
          errors: result.errors,
          warnings: result.warnings,
          retryCount: retries
        })

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        retries++

        // Log error
        await context.log('error', `Agent ${agent.id} failed (attempt ${retries})`, {
          error: lastError.message
        })

        // Call error hook
        if (agent.onError) {
          await agent.onError(context, lastError)
        }

        // Check if retryable
        if (!agent.retryable || retries > agent.maxRetries) {
          break
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retries))
      }
    }

    // All retries failed
    const result: AgentResult = {
      success: false,
      agentId: agent.id,
      agentName: agent.name,
      agentVersion: agent.version,
      itemsProcessed: 0,
      itemsProduced: 0,
      duration: Date.now() - agentStartTime,
      errors: [lastError?.message || 'Unknown error'],
      warnings: []
    }

    // Update execution record
    await this.updateExecutionRecord(executionId, {
      status: 'failed',
      endTime: new Date(),
      duration: result.duration,
      errors: result.errors,
      retryCount: retries
    })

    // Callback
    if (config.onAgentError) {
      config.onAgentError(agent.id, lastError!)
    }

    return result
  }

  /**
   * Skip an agent
   */
  private skipAgent(agentId: string, reason: string): void {
    this.state?.agentsSkipped.add(agentId)
    
    this.results.set(agentId, {
      success: false,
      agentId,
      agentName: agentId,
      agentVersion: 'unknown',
      itemsProcessed: 0,
      itemsProduced: 0,
      duration: 0,
      errors: [reason],
      warnings: []
    })
  }

  /**
   * Create run record in database
   */
  private async createRunRecord(
    runId: string,
    config: OrchestratorConfig
  ): Promise<void> {
    await prisma.pipelineRun.create({
      data: {
        runId,
        projectId: config.projectId,
        config: JSON.stringify({
          agents: config.agents.map(a => a.id),
          parallel: config.parallel,
          stopOnError: config.stopOnError
        }),
        triggerSource: config.userId ? 'manual' : 'api',
        status: 'running'
      }
    })
  }

  /**
   * Update run record in database
   */
  private async updateRunRecord(
    runId: string,
    data: Partial<{
      status: string
      endTime: Date
      duration: number
      totalAgents: number
      completedAgents: number
      failedAgents: number
      skippedAgents: number
      output: string
      errors: string
    }>
  ): Promise<void> {
    await prisma.pipelineRun.update({
      where: { runId },
      data
    })
  }

  /**
   * Create execution record in database
   */
  private async createExecutionRecord(
    runId: string,
    agent: IAgent,
    input: Record<string, any>
  ): Promise<string> {
    const execution = await prisma.pipelineRunExecution.create({
      data: {
        runId,
        agentId: agent.id,
        agentName: agent.name,
        agentVersion: agent.version,
        status: 'running',
        input: JSON.stringify(input)
      }
    })
    return execution.id
  }

  /**
   * Update execution record in database
   */
  private async updateExecutionRecord(
    executionId: string,
    data: Partial<{
      status: string
      endTime: Date
      duration: number
      output: any
      itemsProcessed: number
      itemsProduced: number
      errors: string[]
      warnings: string[]
      retryCount: number
    }>
  ): Promise<void> {
    await prisma.pipelineRunExecution.update({
      where: { id: executionId },
      data: {
        ...data,
        output: data.output ? JSON.stringify(data.output) : undefined,
        warnings: data.warnings ? JSON.stringify(data.warnings) : undefined
      }
    })
  }

  /**
   * Cancel the current run
   */
  async cancel(): Promise<void> {
    if (this.state) {
      this.state.status = 'cancelled'
    }
  }

  /**
   * Get current state
   */
  getState(): ExecutionState | null {
    return this.state
  }

  /**
   * Get results
   */
  getResults(): Map<string, AgentResult> {
    return this.results
  }
}

// Export singleton factory
export function createOrchestrator(): AgentOrchestrator {
  return new AgentOrchestrator()
}

// Export types
export type { OrchestratorConfig as OrchestratorConfigType, OrchestratorResult as OrchestratorResultType }
