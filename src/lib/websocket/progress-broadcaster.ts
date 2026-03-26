/**
 * Progress Broadcaster Service
 * Real-time progress updates for agent execution
 * 
 * TASK-4.3: Real-time Progress Updates
 * Part of Phase 4: Features & User Experience
 */

// Types
export interface ProgressEvent {
  type: 'agent-start' | 'agent-progress' | 'agent-complete' | 'agent-error' | 'pipeline-start' | 'pipeline-complete' | 'log'
  projectId: string
  runId: string
  agentId?: string
  agentName?: string
  timestamp: Date
  data: any
}

export interface AgentProgressData {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number // 0-100
  message: string
  itemsProcessed?: number
  itemsTotal?: number
  currentItem?: string
  errors?: string[]
  warnings?: string[]
  output?: any
}

export interface PipelineProgressData {
  totalAgents: number
  completedAgents: number
  runningAgents: string[]
  pendingAgents: string[]
  failedAgents: string[]
  overallProgress: number
  estimatedTimeRemaining?: number
}

export interface LogData {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  agentId?: string
  details?: any
}

// Event emitter for progress updates (works in both client and server)
type EventListener = (event: ProgressEvent) => void

class ProgressEventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map()
  private eventHistory: Map<string, ProgressEvent[]> = new Map()
  private maxHistorySize = 100

  subscribe(projectId: string, listener: EventListener): () => void {
    if (!this.listeners.has(projectId)) {
      this.listeners.set(projectId, new Set())
    }
    this.listeners.get(projectId)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(projectId)?.delete(listener)
    }
  }

  emit(event: ProgressEvent): void {
    // Store in history
    if (!this.eventHistory.has(event.projectId)) {
      this.eventHistory.set(event.projectId, [])
    }
    const history = this.eventHistory.get(event.projectId)!
    history.push(event)
    if (history.length > this.maxHistorySize) {
      history.shift()
    }

    // Notify listeners
    const listeners = this.listeners.get(event.projectId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (e) {
          console.error('Progress listener error:', e)
        }
      })
    }
  }

  getHistory(projectId: string): ProgressEvent[] {
    return this.eventHistory.get(projectId) || []
  }

  clearHistory(projectId: string): void {
    this.eventHistory.delete(projectId)
  }
}

// Singleton emitter
export const progressEmitter = new ProgressEventEmitter()

/**
 * Progress Broadcaster Class
 * Manages progress updates and broadcasting to clients
 */
export class ProgressBroadcaster {
  private activeRuns: Map<string, PipelineProgressData> = new Map()
  private agentStates: Map<string, AgentProgressData> = new Map()

  /**
   * Start a new pipeline run
   */
  startPipeline(
    projectId: string,
    runId: string,
    agentIds: string[]
  ): void {
    const pipelineData: PipelineProgressData = {
      totalAgents: agentIds.length,
      completedAgents: 0,
      runningAgents: [],
      pendingAgents: agentIds,
      failedAgents: [],
      overallProgress: 0
    }

    this.activeRuns.set(runId, pipelineData)

    progressEmitter.emit({
      type: 'pipeline-start',
      projectId,
      runId,
      timestamp: new Date(),
      data: pipelineData
    })
  }

  /**
   * Start an agent
   */
  startAgent(
    projectId: string,
    runId: string,
    agentId: string,
    agentName: string
  ): void {
    const pipeline = this.activeRuns.get(runId)
    if (pipeline) {
      pipeline.pendingAgents = pipeline.pendingAgents.filter(id => id !== agentId)
      pipeline.runningAgents.push(agentId)
    }

    const agentData: AgentProgressData = {
      status: 'running',
      progress: 0,
      message: `Starting ${agentName}...`
    }
    this.agentStates.set(`${runId}-${agentId}`, agentData)

    progressEmitter.emit({
      type: 'agent-start',
      projectId,
      runId,
      agentId,
      agentName,
      timestamp: new Date(),
      data: agentData
    })
  }

  /**
   * Update agent progress
   */
  updateProgress(
    projectId: string,
    runId: string,
    agentId: string,
    agentName: string,
    update: Partial<AgentProgressData>
  ): void {
    const key = `${runId}-${agentId}`
    const existing = this.agentStates.get(key) || {
      status: 'running',
      progress: 0,
      message: ''
    }

    const updated: AgentProgressData = {
      ...existing,
      ...update
    }

    this.agentStates.set(key, updated)

    progressEmitter.emit({
      type: 'agent-progress',
      projectId,
      runId,
      agentId,
      agentName,
      timestamp: new Date(),
      data: updated
    })

    // Update pipeline progress
    this.updatePipelineProgress(runId)
  }

  /**
   * Complete an agent
   */
  completeAgent(
    projectId: string,
    runId: string,
    agentId: string,
    agentName: string,
    result: {
      success: boolean
      itemsProcessed?: number
      output?: any
      errors?: string[]
      warnings?: string[]
    }
  ): void {
    const pipeline = this.activeRuns.get(runId)
    if (pipeline) {
      pipeline.runningAgents = pipeline.runningAgents.filter(id => id !== agentId)
      if (result.success) {
        pipeline.completedAgents++
      } else {
        pipeline.failedAgents.push(agentId)
      }
    }

    const agentData: AgentProgressData = {
      status: result.success ? 'completed' : 'failed',
      progress: 100,
      message: result.success
        ? `${agentName} completed successfully`
        : `${agentName} failed`,
      itemsProcessed: result.itemsProcessed,
      errors: result.errors,
      warnings: result.warnings,
      output: result.output
    }
    this.agentStates.set(`${runId}-${agentId}`, agentData)

    progressEmitter.emit({
      type: 'agent-complete',
      projectId,
      runId,
      agentId,
      agentName,
      timestamp: new Date(),
      data: agentData
    })

    // Update pipeline progress
    this.updatePipelineProgress(runId)
  }

  /**
   * Complete pipeline run
   */
  completePipeline(
    projectId: string,
    runId: string,
    result: {
      success: boolean
      totalItemsProcessed: number
      totalErrors: number
      duration: number
    }
  ): void {
    const pipeline = this.activeRuns.get(runId)

    progressEmitter.emit({
      type: 'pipeline-complete',
      projectId,
      runId,
      timestamp: new Date(),
      data: {
        ...pipeline,
        success: result.success,
        totalItemsProcessed: result.totalItemsProcessed,
        totalErrors: result.totalErrors,
        duration: result.duration
      }
    })

    // Clean up
    this.activeRuns.delete(runId)
  }

  /**
   * Log a message
   */
  log(
    projectId: string,
    runId: string,
    level: LogData['level'],
    message: string,
    agentId?: string,
    details?: any
  ): void {
    progressEmitter.emit({
      type: 'log',
      projectId,
      runId,
      agentId,
      timestamp: new Date(),
      data: {
        level,
        message,
        agentId,
        details
      } as LogData
    })
  }

  /**
   * Get current progress for a run
   */
  getProgress(runId: string): {
    pipeline?: PipelineProgressData
    agents: Map<string, AgentProgressData>
  } {
    const pipeline = this.activeRuns.get(runId)
    const agents = new Map<string, AgentProgressData>()

    this.agentStates.forEach((value, key) => {
      if (key.startsWith(`${runId}-`)) {
        const agentId = key.substring(runId.length + 1)
        agents.set(agentId, value)
      }
    })

    return { pipeline, agents }
  }

  /**
   * Update pipeline progress
   */
  private updatePipelineProgress(runId: string): void {
    const pipeline = this.activeRuns.get(runId)
    if (!pipeline) return

    // Calculate overall progress
    let totalProgress = 0
    let agentCount = 0

    this.agentStates.forEach((state, key) => {
      if (key.startsWith(`${runId}-`)) {
        totalProgress += state.progress
        agentCount++
      }
    })

    if (agentCount > 0) {
      pipeline.overallProgress = Math.round(totalProgress / pipeline.totalAgents)
    }
  }
}

// Singleton instance
export const progressBroadcaster = new ProgressBroadcaster()

/**
 * Hook for React components to subscribe to progress updates
 */
export function useProgressSubscription(projectId: string, callback: (event: ProgressEvent) => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  return progressEmitter.subscribe(projectId, callback)
}

/**
 * Get progress history for a project
 */
export function getProgressHistory(projectId: string): ProgressEvent[] {
  return progressEmitter.getHistory(projectId)
}
