// =============================================================================
// Parser Exports - Central export for all parser modules
// =============================================================================

export { FileClassifier, fileClassifier } from './file-classifier';
export type { 
  FileType, 
  Framework, 
  Language, 
  FileClassification, 
  FileMetadata 
} from './file-classifier';

export { JSParserEngine, jsParser } from './js-parser';
export type {
  AjaxCall,
  JSParameter,
  EventHandler,
  JSDependency,
  JSFormValidation,
  ValidationRule as JSValidationRule,
  DiscoveredAPIEndpoint,
  JSIntelligenceResult
} from './js-parser';

export { WorkflowBuilderAgent, workflowBuilder } from './workflow-builder';
export type {
  WorkflowStep,
  WorkflowDefinition,
  WorkflowTransition,
  WorkflowChain,
  BusinessProcessType
} from './workflow-builder';

export { IntelligenceOrchestrator, createOrchestrator, orchestrator } from './orchestrator';
export type { OrchestratorOptions } from './orchestrator';
