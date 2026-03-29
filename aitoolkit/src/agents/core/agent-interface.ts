/**
 * Agent Interface and Base Implementation
 * 
 * Defines the core interface for all agents in the system.
 * Provides standardized execution, logging, and state management.
 * 
 * Task: TASK-3.2a - Agent Interface and BaseAgent
 */

import { prisma } from "@/lib/db"
import { z } from "zod"

// ============================================================================
// Types
// ============================================================================

export interface AgentContext {
  // Identity
  projectId: string
  companyId?: string
  userId?: string
  runId: string

  // Input data
  input: Record<string, any>

  // Shared state between agents
  sharedState: Map<string, any>

  // Execution tracking
  startTime: Date

  // Configuration
  config: Record<string, any>

  // Logging function
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) => Promise<void>

  // Progress reporting
  reportProgress: (progress: number, message: string) => void
}

export interface AgentResult {
  // Status
  success: boolean
  agentId: string
  agentName: string
  agentVersion: string

  // Output data
  output?: Record<string, any>

  // Metrics
  itemsProcessed: number
  itemsProduced: number

  // Timing
  duration: number

  // Errors and warnings
  errors: string[]
  warnings: string[]

  // State updates for other agents
  stateUpdates?: Record<string, any>

  // Next agents to run (optional override)
  nextAgents?: string[]
}

export interface AgentInfo {
  id: string
  name: string
  version: string
  description: string
  category: AgentCategory
  layer: AgentLayer
  dependsOn: string[]
  produces: string[]
  inputSchema?: z.ZodSchema
  outputSchema?: z.ZodSchema
  estimatedDuration: number // seconds
  requiresAI: boolean
  retryable: boolean
  maxRetries: number
}

export type AgentCategory = 
  | 'parsing'
  | 'intelligence'
  | 'resolution'
  | 'matching'
  | 'generation'
  | 'validation'
  | 'orchestration'

export type AgentLayer =
  | 'schema'
  | 'intelligence'
  | 'module'
  | 'requirements'
  | 'generation'
  | 'migration'
  | 'management'

export type AgentStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'

export interface AgentExecutionRecord {
  id: string
  runId: string
  agentId: string
  agentName: string
  status: AgentStatus
  startTime: Date
  endTime?: Date
  duration?: number
  input?: Record<string, any>
  output?: Record<string, any>
  itemsProcessed: number
  itemsProduced: number
  errors: string[]
  warnings: string[]
  retryCount: number
}

// ============================================================================
// Agent Interface
// ============================================================================

export interface IAgent {
  // Identity
  readonly id: string
  readonly name: string
  readonly version: string
  readonly description: string
  readonly category: AgentCategory
  readonly layer: AgentLayer

  // Dependencies
  readonly dependsOn: string[]
  readonly produces: string[]

  // Configuration
  readonly inputSchema?: z.ZodSchema
  readonly outputSchema?: z.ZodSchema
  readonly estimatedDuration: number
  readonly requiresAI: boolean
  readonly retryable: boolean
  readonly maxRetries: number

  // Execution
  canRun(context: AgentContext): Promise<boolean>
  execute(context: AgentContext): Promise<AgentResult>

  // Lifecycle hooks
  initialize?(): Promise<void>
  cleanup?(): Promise<void>
  onBeforeExecute?(context: AgentContext): Promise<void>
  onAfterExecute?(context: AgentContext, result: AgentResult): Promise<void>
  onError?(context: AgentContext, error: Error): Promise<void>

  // Get info
  getInfo(): AgentInfo
}

// ============================================================================
// Base Agent Implementation
// ============================================================================

export abstract class BaseAgent implements IAgent {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly version: string
  abstract readonly description: string
  abstract readonly category: AgentCategory
  abstract readonly layer: AgentLayer
  abstract readonly dependsOn: string[]
  abstract readonly produces: string[]

  readonly inputSchema?: z.ZodSchema
  readonly outputSchema?: z.ZodSchema
  readonly estimatedDuration: number = 60
  readonly requiresAI: boolean = false
  readonly retryable: boolean = true
  readonly maxRetries: number = 3

  /**
   * Check if the agent can run (dependencies are met)
   */
  async canRun(context: AgentContext): Promise<boolean> {
    // Check if all dependencies have completed successfully
    for (const depId of this.dependsOn) {
      const depResult = context.sharedState.get(`agent:${depId}`)
      if (!depResult) {
        await context.log('debug', `Dependency not found: ${depId}`)
        return false
      }
      if (!depResult.success) {
        await context.log('warn', `Dependency failed: ${depId}`)
        return false
      }
    }
    return true
  }

  /**
   * Main execution method - must be implemented by subclasses
   */
  abstract execute(context: AgentContext): Promise<AgentResult>

  /**
   * Create a successful result
   */
  protected createSuccessResult(
    output: Record<string, any> = {},
    itemsProcessed: number = 0,
    itemsProduced: number = 0,
    warnings: string[] = [],
    stateUpdates: Record<string, any> = {}
  ): AgentResult {
    return {
      success: true,
      agentId: this.id,
      agentName: this.name,
      agentVersion: this.version,
      output,
      itemsProcessed,
      itemsProduced,
      duration: 0, // Set by orchestrator
      errors: [],
      warnings,
      stateUpdates
    }
  }

  /**
   * Create a failed result
   */
  protected createErrorResult(
    errors: string[],
    itemsProcessed: number = 0,
    itemsProduced: number = 0,
    warnings: string[] = []
  ): AgentResult {
    return {
      success: false,
      agentId: this.id,
      agentName: this.name,
      agentVersion: this.version,
      itemsProcessed,
      itemsProduced,
      duration: 0,
      errors,
      warnings
    }
  }

  /**
   * Log info message
   */
  protected async logInfo(context: AgentContext, message: string, data?: any): Promise<void> {
    await context.log('info', `[${this.name}] ${message}`, data)
  }

  /**
   * Log warning message
   */
  protected async logWarn(context: AgentContext, message: string, data?: any): Promise<void> {
    await context.log('warn', `[${this.name}] ${message}`, data)
  }

  /**
   * Log error message
   */
  protected async logError(context: AgentContext, message: string, data?: any): Promise<void> {
    await context.log('error', `[${this.name}] ${message}`, data)
  }

  /**
   * Log debug message
   */
  protected async logDebug(context: AgentContext, message: string, data?: any): Promise<void> {
    await context.log('debug', `[${this.name}] ${message}`, data)
  }

  /**
   * Report progress
   */
  protected reportProgress(context: AgentContext, progress: number, message: string): void {
    context.reportProgress(progress, `[${this.name}] ${message}`)
  }

  /**
   * Validate input against schema
   */
  protected validateInput(context: AgentContext): { valid: boolean; errors: string[] } {
    if (!this.inputSchema) {
      return { valid: true, errors: [] }
    }

    try {
      this.inputSchema.parse(context.input)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        return { valid: false, errors }
      }
      return { valid: false, errors: [String(error)] }
    }
  }

  /**
   * Validate output against schema
   */
  protected validateOutput(output: Record<string, any>): { valid: boolean; errors: string[] } {
    if (!this.outputSchema) {
      return { valid: true, errors: [] }
    }

    try {
      this.outputSchema.parse(output)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        return { valid: false, errors }
      }
      return { valid: false, errors: [String(error)] }
    }
  }

  /**
   * Get shared state value
   */
  protected getSharedState<T>(context: AgentContext, key: string): T | undefined {
    return context.sharedState.get(key) as T | undefined
  }

  /**
   * Set shared state value
   */
  protected setSharedState(context: AgentContext, key: string, value: any): void {
    context.sharedState.set(key, value)
  }

  /**
   * Get agent info
   */
  getInfo(): AgentInfo {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      category: this.category,
      layer: this.layer,
      dependsOn: this.dependsOn,
      produces: this.produces,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      estimatedDuration: this.estimatedDuration,
      requiresAI: this.requiresAI,
      retryable: this.retryable,
      maxRetries: this.maxRetries
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a logger function that writes to the database
 */
export function createLogger(runId: string) {
  return async (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): Promise<void> => {
    try {
      await prisma.pipelineRunLog.create({
        data: {
          runId,
          level,
          message,
          data: data ? JSON.stringify(data) : null,
          agentId: data?.agentId || null
        }
      })
    } catch (error) {
      // Fallback to console if database write fails
      console.error(`[${level.toUpperCase()}] ${message}`, data || '')
    }
  }
}

/**
 * Create a progress reporter function
 */
export function createProgressReporter(runId: string, agentId: string) {
  return async (progress: number, message: string): Promise<void> => {
    try {
      await prisma.pipelineRunLog.create({
        data: {
          runId,
          level: 'info',
          message: `Progress: ${Math.round(progress * 100)}% - ${message}`,
          agentId
        }
      })
    } catch (error) {
      console.log(`Progress: ${Math.round(progress * 100)}% - ${message}`)
    }
  }
}

/**
 * Create agent context
 */
export async function createAgentContext(
  projectId: string,
  runId: string,
  input: Record<string, any>,
  config: Record<string, any> = {}
): Promise<AgentContext> {
  const sharedState = new Map<string, any>()

  return {
    projectId,
    runId,
    input,
    sharedState,
    startTime: new Date(),
    config,
    log: createLogger(runId),
    reportProgress: () => {} // Will be overridden by orchestrator
  }
}

// Export types
export type { AgentContext as AgentContextType, AgentResult as AgentResultType, AgentInfo as AgentInfoType }
