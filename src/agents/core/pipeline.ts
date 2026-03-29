/**
 * Pipeline - Execution Engine for Agent Workflows
 * 
 * This file provides the pipeline execution engine that orchestrates
 * the execution of multiple agents in sequence or parallel, with
 * support for error handling, retries, and progress reporting.
 */

import type {
  AgentId,
  AgentInput,
  AgentOutput,
  AgentExecutionResult,
  AgentLogEntry,
  AgentContextData,
  AIConfig,
  PipelineConfig,
  PipelineResult,
  PipelineStatus,
  PipelineError,
  ProgressReporter,
} from './types';
import type { IAgent } from './agent-interface';
import type { IAgentContext } from './context';
import { AgentContext, createAgentContext } from './context';
import { getRegistry } from './registry';

// ============================================================================
// PIPELINE EVENTS
// ============================================================================

/**
 * Pipeline event types
 */
export interface PipelineEvents {
  'pipeline:start': { pipelineId: string; config: PipelineConfig };
  'pipeline:progress': { pipelineId: string; progress: PipelineProgress };
  'pipeline:complete': { pipelineId: string; result: PipelineResult };
  'pipeline:error': { pipelineId: string; error: PipelineError };
  'pipeline:pause': { pipelineId: string };
  'pipeline:resume': { pipelineId: string };
  'pipeline:cancel': { pipelineId: string };
  'agent:start': { pipelineId: string; agentId: AgentId };
  'agent:progress': { pipelineId: string; agentId: AgentId; progress: ProgressReporter };
  'agent:complete': { pipelineId: string; agentId: AgentId; result: AgentExecutionResult };
  'agent:error': { pipelineId: string; agentId: AgentId; error: Error };
}

/**
 * Pipeline progress information
 */
export interface PipelineProgress {
  /** Current step index */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Current agent ID */
  currentAgent?: AgentId;
  /** Current agent name */
  currentAgentName?: string;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Status message */
  message: string;
  /** Started at */
  startedAt: Date;
  /** Estimated time remaining (seconds) */
  estimatedTimeRemaining?: number;
}

// ============================================================================
// PIPELINE EXECUTOR INTERFACE
// ============================================================================

/**
 * Interface for the pipeline executor
 */
export interface IPipelineExecutor {
  // --------------------------------------------------------------------------
  // EXECUTION CONTROL
  // --------------------------------------------------------------------------

  /**
   * Execute the pipeline
   * @param config Pipeline configuration
   * @param initialContext Initial context data
   */
  execute(config: PipelineConfig, initialContext?: Partial<AgentContextData>): Promise<PipelineResult>;

  /**
   * Pause pipeline execution
   */
  pause(): void;

  /**
   * Resume paused execution
   */
  resume(): void;

  /**
   * Cancel execution
   */
  cancel(): void;

  // --------------------------------------------------------------------------
  // STATUS
  // --------------------------------------------------------------------------

  /**
   * Get current pipeline status
   */
  getStatus(): PipelineStatus;

  /**
   * Get current progress
   */
  getProgress(): PipelineProgress | null;

  /**
   * Get current result (if available)
   */
  getResult(): PipelineResult | null;

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------

  /**
   * Subscribe to pipeline events
   */
  on<K extends keyof PipelineEvents>(
    event: K,
    callback: (data: PipelineEvents[K]) => void
  ): void;

  /**
   * Unsubscribe from pipeline events
   */
  off<K extends keyof PipelineEvents>(
    event: K,
    callback: (data: PipelineEvents[K]) => void
  ): void;
}

// ============================================================================
// PIPELINE EXECUTOR IMPLEMENTATION
// ============================================================================

/**
 * Implementation of the pipeline executor
 */
export class PipelineExecutor implements IPipelineExecutor {
  private _status: PipelineStatus = 'idle';
  private _progress: PipelineProgress | null = null;
  private _result: PipelineResult | null = null;
  private _context: IAgentContext | null = null;
  private _config: PipelineConfig | null = null;
  private _agentResults: AgentExecutionResult[] = [];
  private _errors: PipelineError[] = [];
  private _outputFiles: string[] = [];
  private _startTime: Date | null = null;
  private _paused = false;
  private _cancelled = false;
  private _eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private _executionId: string = '';

  // --------------------------------------------------------------------------
  // EXECUTION CONTROL
  // --------------------------------------------------------------------------

  async execute(
    config: PipelineConfig,
    initialContext?: Partial<AgentContextData>
  ): Promise<PipelineResult> {
    // Initialize execution
    this._executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this._config = config;
    this._context = createAgentContext(initialContext);
    this._agentResults = [];
    this._errors = [];
    this._outputFiles = [];
    this._startTime = new Date();
    this._paused = false;
    this._cancelled = false;

    // Set status
    this._status = 'initializing';
    this.emit('pipeline:start', { pipelineId: config.id, config });

    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return this.createErrorResult(validation.errors.map((e) => ({
        id: `err-${Date.now()}`,
        type: 'validation',
        message: e,
        timestamp: new Date(),
        recoverable: false,
      })));
    }

    // Get agents in execution order
    const registry = getRegistry();
    const orderedAgentIds = registry.getExecutionOrder(config.agents);

    // Update status
    this._status = 'running';
    this._progress = {
      currentStep: 0,
      totalSteps: orderedAgentIds.length,
      percentage: 0,
      message: 'Starting pipeline execution',
      startedAt: this._startTime,
    };

    // Execute agents
    for (let i = 0; i < orderedAgentIds.length; i++) {
      // Check for pause/cancel
      if (this._cancelled) {
        this._status = 'cancelled';
        break;
      }

      while (this._paused) {
        await this.sleep(100);
        if (this._cancelled) {
          this._status = 'cancelled';
          break;
        }
      }

      if (this._cancelled) break;

      const agentId = orderedAgentIds[i];
      const agentResult = await this.executeAgent(agentId, i, orderedAgentIds.length, config);

      this._agentResults.push(agentResult);

      // Update progress
      this._progress = {
        currentStep: i + 1,
        totalSteps: orderedAgentIds.length,
        currentAgent: agentId,
        currentAgentName: agentResult.agentName,
        percentage: Math.round(((i + 1) / orderedAgentIds.length) * 100),
        message: `Completed ${agentResult.agentName}`,
        startedAt: this._startTime!,
        estimatedTimeRemaining: this.estimateTimeRemaining(i + 1, orderedAgentIds.length),
      };

      this.emit('pipeline:progress', { pipelineId: config.id, progress: this._progress });

      // Handle agent failure
      if (agentResult.status === 'failed') {
        if (config.stopOnError) {
          this._status = 'failed';
          break;
        }
      }
    }

    // Create final result
    this._result = this.createResult();
    this._status = this._cancelled ? 'cancelled' : 
      this._errors.some((e) => !e.recoverable) ? 'failed' : 'completed';

    this.emit('pipeline:complete', { pipelineId: config.id, result: this._result });

    return this._result;
  }

  pause(): void {
    if (this._status === 'running') {
      this._paused = true;
      this._status = 'paused';
      this.emit('pipeline:pause', { pipelineId: this._config?.id ?? '' });
    }
  }

  resume(): void {
    if (this._status === 'paused') {
      this._paused = false;
      this._status = 'running';
      this.emit('pipeline:resume', { pipelineId: this._config?.id ?? '' });
    }
  }

  cancel(): void {
    this._cancelled = true;
    this._status = 'cancelled';
    this.emit('pipeline:cancel', { pipelineId: this._config?.id ?? '' });
  }

  // --------------------------------------------------------------------------
  // STATUS
  // --------------------------------------------------------------------------

  getStatus(): PipelineStatus {
    return this._status;
  }

  getProgress(): PipelineProgress | null {
    return this._progress;
  }

  getResult(): PipelineResult | null {
    return this._result;
  }

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------

  on<K extends keyof PipelineEvents>(
    event: K,
    callback: (data: PipelineEvents[K]) => void
  ): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event)!.add(callback as (data: unknown) => void);
  }

  off<K extends keyof PipelineEvents>(
    event: K,
    callback: (data: PipelineEvents[K]) => void
  ): void {
    this._eventListeners.get(event)?.delete(callback as (data: unknown) => void);
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private async executeAgent(
    agentId: AgentId,
    stepIndex: number,
    totalSteps: number,
    config: PipelineConfig
  ): Promise<AgentExecutionResult> {
    const registry = getRegistry();
    const metadata = registry.getMetadata(agentId);

    if (!metadata) {
      return this.createAgentErrorResult(agentId, 'Agent not found in registry');
    }

    const startTime = new Date();

    this.emit('agent:start', { pipelineId: config.id, agentId });

    try {
      // Create agent instance
      const agent = await registry.createInstance(agentId, config.aiConfig);

      // Initialize if needed
      if (agent.initialize) {
        await agent.initialize();
      }

      // Prepare input
      const input: AgentInput = {
        config: config.aiConfig,
        context: this._context!.getData(),
        metadata: {
          executionId: this._executionId,
          pipelineId: config.id,
          retryCount: 0,
        },
      };

      // Validate input
      const validation = await agent.validate(input);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute with progress reporting
      const result = await this.executeWithRetry(
        agent,
        input,
        config.retryConfig,
        (progress) => {
          this.emit('agent:progress', {
            pipelineId: config.id,
            agentId,
            progress,
          });
        }
      );

      // Merge context updates
      if (result.success && result.contextUpdates) {
        this._context!.update(result.contextUpdates, agentId);
      }

      // Cleanup if needed
      if (agent.cleanup) {
        await agent.cleanup();
      }

      const endTime = new Date();
      const agentResult: AgentExecutionResult = {
        agentId,
        agentName: metadata.name,
        status: result.success ? 'completed' : 'failed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        output: result.data,
        error: result.errors[0]?.message,
        logs: result.logs,
        itemsProcessed: result.metrics.itemsProcessed,
        retryCount: 0,
      };

      this.emit('agent:complete', { pipelineId: config.id, agentId, result: agentResult });

      return agentResult;
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emit('agent:error', {
        pipelineId: config.id,
        agentId,
        error: error instanceof Error ? error : new Error(errorMessage),
      });

      return {
        agentId,
        agentName: metadata.name,
        status: 'failed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: errorMessage,
        logs: [],
        itemsProcessed: 0,
        retryCount: 0,
      };
    }
  }

  private async executeWithRetry(
    agent: IAgent,
    input: AgentInput,
    retryConfig: PipelineConfig['retryConfig'],
    progressReporter: (progress: ProgressReporter) => void
  ): Promise<AgentOutput> {
    let lastError: Error | null = null;
    let retryDelay = retryConfig.retryDelay;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await agent.execute(input, progressReporter);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retryConfig.maxRetries) {
          if (retryConfig.exponentialBackoff) {
            retryDelay = retryDelay * 2;
          }
          await this.sleep(retryDelay);
        }
      }
    }

    return {
      success: false,
      errors: [{ code: 'EXECUTION_FAILED', message: lastError?.message ?? 'Unknown error' }],
      warnings: [],
      logs: [],
      metrics: {
        itemsProcessed: 0,
        itemsSkipped: 0,
        duration: 0,
        aiCalls: 0,
      },
    };
  }

  private validateConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.id) {
      errors.push('Pipeline ID is required');
    }

    if (!config.agents || config.agents.length === 0) {
      errors.push('At least one agent must be specified');
    }

    if (config.timeout < 0) {
      errors.push('Timeout must be non-negative');
    }

    // Validate agents exist
    const registry = getRegistry();
    for (const agentId of config.agents) {
      if (!registry.has(agentId)) {
        errors.push(`Agent ${agentId} is not registered`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private createResult(): PipelineResult {
    const endTime = new Date();
    const completedAgents = this._agentResults.filter((r) => r.status === 'completed').length;
    const failedAgents = this._agentResults.filter((r) => r.status === 'failed').length;
    const skippedAgents = this._agentResults.filter((r) => r.status === 'skipped').length;

    return {
      executionId: this._executionId,
      pipelineId: this._config?.id ?? '',
      startTime: this._startTime!,
      endTime,
      duration: endTime.getTime() - (this._startTime?.getTime() ?? 0),
      status: this._status,
      agentResults: this._agentResults,
      errors: this._errors,
      outputFiles: this._outputFiles,
      summary: {
        totalAgents: this._agentResults.length,
        completedAgents,
        failedAgents,
        skippedAgents,
        totalItemsProcessed: this._agentResults.reduce((sum, r) => sum + r.itemsProcessed, 0),
      },
    };
  }

  private createErrorResult(errors: PipelineError[]): PipelineResult {
    this._status = 'failed';
    this._errors = errors;

    return {
      executionId: this._executionId,
      pipelineId: this._config?.id ?? '',
      startTime: this._startTime!,
      endTime: new Date(),
      duration: 0,
      status: 'failed',
      agentResults: [],
      errors,
      outputFiles: [],
      summary: {
        totalAgents: 0,
        completedAgents: 0,
        failedAgents: 0,
        skippedAgents: 0,
        totalItemsProcessed: 0,
      },
    };
  }

  private createAgentErrorResult(agentId: AgentId, error: string): AgentExecutionResult {
    const now = new Date();
    return {
      agentId,
      agentName: agentId,
      status: 'failed',
      startTime: now,
      endTime: now,
      duration: 0,
      error,
      logs: [],
      itemsProcessed: 0,
      retryCount: 0,
    };
  }

  private estimateTimeRemaining(completed: number, total: number): number | undefined {
    if (completed === 0 || !this._startTime) return undefined;

    const elapsed = (Date.now() - this._startTime.getTime()) / 1000;
    const avgTimePerAgent = elapsed / completed;
    const remaining = total - completed;

    return Math.round(avgTimePerAgent * remaining);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private emit<K extends keyof PipelineEvents>(
    event: K,
    data: PipelineEvents[K]
  ): void {
    this._eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in pipeline event listener for ${event}:`, error);
      }
    });
  }
}

// ============================================================================
// PIPELINE BUILDER
// ============================================================================

/**
 * Builder for creating pipeline configurations
 */
export class PipelineBuilder {
  private _config: Partial<PipelineConfig> = {
    id: `pipeline-${Date.now()}`,
    name: 'Untitled Pipeline',
    description: '',
    agents: [],
    mode: 'sequential',
    stopOnError: true,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
    },
    timeout: 3600, // 1 hour default
    outputDir: './output',
  };

  /**
   * Set pipeline ID
   */
  id(id: string): this {
    this._config.id = id;
    return this;
  }

  /**
   * Set pipeline name
   */
  name(name: string): this {
    this._config.name = name;
    return this;
  }

  /**
   * Set pipeline description
   */
  description(description: string): this {
    this._config.description = description;
    return this;
  }

  /**
   * Add an agent to the pipeline
   */
  addAgent(agentId: AgentId): this {
    if (!this._config.agents) {
      this._config.agents = [];
    }
    this._config.agents.push(agentId);
    return this;
  }

  /**
   * Add multiple agents
   */
  addAgents(agentIds: AgentId[]): this {
    if (!this._config.agents) {
      this._config.agents = [];
    }
    this._config.agents.push(...agentIds);
    return this;
  }

  /**
   * Set execution mode
   */
  mode(mode: PipelineConfig['mode']): this {
    this._config.mode = mode;
    return this;
  }

  /**
   * Set AI configuration
   */
  aiConfig(config: AIConfig): this {
    this._config.aiConfig = config;
    return this;
  }

  /**
   * Set stop on error
   */
  stopOnError(stop: boolean): this {
    this._config.stopOnError = stop;
    return this;
  }

  /**
   * Set retry configuration
   */
  retryConfig(config: Partial<PipelineConfig['retryConfig']>): this {
    this._config.retryConfig = {
      ...this._config.retryConfig!,
      ...config,
    };
    return this;
  }

  /**
   * Set timeout
   */
  timeout(seconds: number): this {
    this._config.timeout = seconds;
    return this;
  }

  /**
   * Set output directory
   */
  outputDir(dir: string): this {
    this._config.outputDir = dir;
    return this;
  }

  /**
   * Build the configuration
   */
  build(): PipelineConfig {
    if (!this._config.aiConfig) {
      this._config.aiConfig = {
        engine: 'offline',
        temperature: 0.7,
        maxTokens: 4096,
      };
    }

    return this._config as PipelineConfig;
  }
}

// ============================================================================
// PREDEFINED PIPELINES
// ============================================================================

/**
 * Create a full analysis pipeline
 */
export function createFullAnalysisPipeline(): PipelineConfig {
  return new PipelineBuilder()
    .id('full-analysis')
    .name('Full Schema Analysis')
    .description('Complete analysis pipeline from schema parsing to documentation generation')
    .addAgents([
      // Schema Layer
      'schema.1', 'schema.2', 'schema.3', 'schema.4', 'schema.5',
      // Intelligence Layer
      'intelligence.1', 'intelligence.2', 'intelligence.3', 'intelligence.4', 'intelligence.5',
      // Module Layer
      'module.1', 'module.2', 'module.3', 'module.4', 'module.5',
      // Requirements Layer
      'requirements.1', 'requirements.2', 'requirements.3', 'requirements.4', 'requirements.5',
      // Generation Layer
      'generation.1', 'generation.2', 'generation.3', 'generation.4', 'generation.5', 'generation.6',
    ])
    .build();
}

/**
 * Create a quick scan pipeline
 */
export function createQuickScanPipeline(): PipelineConfig {
  return new PipelineBuilder()
    .id('quick-scan')
    .name('Quick Schema Scan')
    .description('Quick analysis of schema structure and health')
    .addAgents([
      'schema.1', // SQL DDL Parser
      'schema.5', // FK Resolver
      'intelligence.1', // Column Intelligence
      'intelligence.5', // Health Score
    ])
    .build();
}

/**
 * Create a migration planning pipeline
 */
export function createMigrationPlanningPipeline(): PipelineConfig {
  return new PipelineBuilder()
    .id('migration-planning')
    .name('Migration Planning')
    .description('Plan and prepare for database migration')
    .addAgents([
      'schema.1', 'schema.2', 'schema.3', 'schema.4', 'schema.5',
      'intelligence.1', 'intelligence.2', 'intelligence.3', 'intelligence.4',
      'migration.1', 'migration.2', 'migration.3', 'migration.4',
    ])
    .build();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new pipeline executor
 */
export function createPipelineExecutor(): IPipelineExecutor {
  return new PipelineExecutor();
}

/**
 * Create a pipeline builder
 */
export function createPipelineBuilder(): PipelineBuilder {
  return new PipelineBuilder();
}

/**
 * Execute a pipeline with default settings
 */
export async function runPipeline(
  agents: AgentId[],
  context?: Partial<AgentContextData>,
  aiConfig?: AIConfig
): Promise<PipelineResult> {
  const builder = new PipelineBuilder()
    .id(`run-${Date.now()}`)
    .name('Quick Run')
    .addAgents(agents);

  if (aiConfig) {
    builder.aiConfig(aiConfig);
  }

  const executor = new PipelineExecutor();
  return executor.execute(builder.build(), context);
}
