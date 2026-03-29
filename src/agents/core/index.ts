/**
 * Agent Core Module - Index Export
 * 
 * This file exports all core agent infrastructure components.
 */

// Types
export type {
  // Agent Identification & Metadata
  AgentLayer,
  AgentId,
  AgentMetadata,
  AgentStatus,
  
  // Execution Context & State
  ExecutionPriority,
  AIConfig,
  SourceFile,
  
  // Parsed Schema Types
  ParsedTable,
  ParsedColumn,
  ParsedForeignKey,
  ParsedIndex,
  ParsedConstraint,
  ParsedStoredProcedure,
  ParsedParameter,
  DBOperation,
  ParsedView,
  ParsedCSHTML,
  CSHTMLElement,
  CSHTMLForm,
  
  // Intelligence Layer Output
  ColumnIntelligence,
  DataCategory,
  ValidationRule,
  PII_PHIDetection,
  DiscoveredRelationship,
  InferredBusinessRule,
  SchemaHealthScore,
  SchemaIssue,
  
  // Module Layer Output
  Module,
  SprintPlan,
  
  // Requirements Layer Output
  UserStory,
  AcceptanceCriteria,
  SOP,
  TraceabilityEntry,
  
  // Generation Layer Output
  GeneratedPrismaSchema,
  GeneratedAPISpec,
  GeneratedScreenBlueprint,
  GeneratedTestCase,
  
  // Migration Layer Output
  MigrationPlan,
  MigrationPhase,
  
  // Pipeline Execution Types
  PipelineStatus,
  PipelineConfig,
  PipelineResult,
  AgentExecutionResult,
  AgentLogEntry,
  PipelineError,
  
  // Context Types
  AgentContextData,
  AgentInput,
  AgentOutput,
  
  // Utility Types
  AsyncFunction,
  EventCallback,
  ProgressReporter,
  PipelineEvents as PipelineEventsType,
  AgentSystemSettings,
} from './types';

// Agent Interface
export {
  // Interface
  type IAgent,
  type AgentEvents,
  
  // Base class
  BaseAgent,
  
  // Factory interface
  type IAgentFactory,
  
  // Validator interface
  type IAgentValidator,
  
  // Decorators
  type AgentDecoratorOptions,
  withRetry,
  withTimeout,
  
  // Helper functions
  isAgent,
  getAgentLayer,
  getAgentNumber,
  compareAgentPriority,
} from './agent-interface';

// Context
export {
  // Types
  type ContextChange,
  type ContextEvents,
  type ContextSnapshot,
  type IAgentContext,
  
  // Implementation
  AgentContext,
  
  // Builder
  ContextBuilder,
  
  // Helper functions
  createAgentContext,
  createContextBuilder,
  createTestContext,
  validateContext,
} from './context';

// Registry
export {
  // Types
  type AgentFactoryFn,
  type AgentRegistration,
  type RegistryStats,
  type RegistryEvents,
  type IAgentRegistry,
  
  // Implementation
  AgentRegistry,
  
  // Global instance
  getRegistry,
  resetRegistry,
  
  // Decorator
  RegisterAgent,
  
  // Helper functions
  registerAgents,
  getAllAgentsInOrder,
  createAgentInstances,
} from './registry';

// Pipeline
export {
  // Types
  type PipelineEvents,
  type PipelineProgress,
  type IPipelineExecutor,
  
  // Implementation
  PipelineExecutor,
  
  // Builder
  PipelineBuilder,
  
  // Predefined pipelines
  createFullAnalysisPipeline,
  createQuickScanPipeline,
  createMigrationPlanningPipeline,
  
  // Helper functions
  createPipelineExecutor,
  createPipelineBuilder,
  runPipeline,
} from './pipeline';

// Orchestrator
export {
  // Types
  type OrchestratorConfig,
  type OrchestratorState,
  type OrchestratorEvents,
  type OrchestratorProgress,
  type LayerExecutionResult,
  type IOrchestrator,
  
  // Implementation
  Orchestrator,
  
  // Global instance
  getOrchestrator,
  resetOrchestrator,
  
  // Helper functions
  createOrchestrator,
  initializeOrchestrator,
  runFullAnalysis,
  runQuickScan,
} from './orchestrator';
