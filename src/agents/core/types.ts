/**
 * Agent System - Shared Types
 * 
 * This file contains all shared type definitions for the multi-agent system.
 * These types define the contracts between agents, orchestrator, and pipeline.
 */

// ============================================================================
// AGENT IDENTIFICATION & METADATA
// ============================================================================

/**
 * Agent categories/layers in the system
 */
export type AgentLayer = 
  | 'schema'      // Agent 1: Schema Layer (Parsers)
  | 'intelligence' // Agent 2: Intelligence Layer
  | 'module'      // Agent 3: Module Layer
  | 'requirements' // Agent 4: Requirements Layer
  | 'generation'  // Agent 5: Generation Layer
  | 'migration'   // Agent 6: Migration Layer
  | 'management'; // Agent 7: Project Management Layer

/**
 * Unique identifier for each sub-agent
 * Format: "{layer}.{index}" e.g., "schema.1" for SQL DDL Parser
 */
export type AgentId = 
  // Schema Layer Agents
  | 'schema.1'  // SQL DDL Parser
  | 'schema.2'  // Stored Procedure Parser
  | 'schema.3'  // SQL View Analyzer
  | 'schema.4'  // CSHTML Parser
  | 'schema.5'  // FK Dependency Resolver
  // Intelligence Layer Agents
  | 'intelligence.1'  // Column Intelligence Engine
  | 'intelligence.2'  // PII/PHI Detector
  | 'intelligence.3'  // Relationship Discovery
  | 'intelligence.4'  // Business Rule Inferrer
  | 'intelligence.5'  // Schema Health Scorer
  // Module Layer Agents
  | 'module.1'  // Module Registry
  | 'module.2'  // Module Auto-Linker
  | 'module.3'  // Priority Planner
  | 'module.4'  // Dependency Chain Builder
  | 'module.5'  // Sprint Planner
  // Requirements Layer Agents
  | 'requirements.1'  // AI Question Engine
  | 'requirements.2'  // User Story Generator
  | 'requirements.3'  // Acceptance Criteria Generator
  | 'requirements.4'  // SOP Generator
  | 'requirements.5'  // Traceability Matrix
  // Generation Layer Agents
  | 'generation.1'  // Prisma Schema Generator
  | 'generation.2'  // API Spec Generator
  | 'generation.3'  // Screen Blueprint Generator
  | 'generation.4'  // Code Generator
  | 'generation.5'  // Test Case Generator
  | 'generation.6'  // Documentation Generator
  // Migration Layer Agents
  | 'migration.1'  // DB Script Converter
  | 'migration.2'  // SP to Node.js Converter
  | 'migration.3'  // CSHTML to React Converter
  | 'migration.4'  // Migration Plan Generator
  // Management Layer Agents
  | 'management.1'  // Stakeholder Dashboards
  | 'management.2'  // Risk Assessment
  | 'management.3'  // Decision Log
  | 'management.4'  // Compliance Reporter
  | 'management.5'; // Team Allocation

/**
 * Agent metadata for registration and display
 */
export interface AgentMetadata {
  /** Unique agent identifier */
  id: AgentId;
  /** Human-readable name */
  name: string;
  /** Layer this agent belongs to */
  layer: AgentLayer;
  /** Brief description of what this agent does */
  description: string;
  /** Version of the agent implementation */
  version: string;
  /** Tags for categorization and search */
  tags: string[];
  /** Dependencies on other agents (must complete before this agent) */
  dependencies: AgentId[];
  /** Whether this agent requires AI/LLM capabilities */
  requiresAI: boolean;
  /** Estimated execution time in seconds (for UI progress) */
  estimatedDuration: number;
  /** Agent status in the registry */
  status: AgentStatus;
}

/**
 * Current status of an agent
 */
export type AgentStatus = 
  | 'idle'       // Not currently running
  | 'running'    // Currently executing
  | 'completed'  // Successfully completed
  | 'failed'     // Execution failed
  | 'skipped'    // Skipped due to conditions
  | 'pending';   // Queued for execution

// ============================================================================
// EXECUTION CONTEXT & STATE
// ============================================================================

/**
 * Execution priority levels
 */
export type ExecutionPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Configuration for AI/LLM operations
 */
export interface AIConfig {
  /** AI engine to use */
  engine: 'offline' | 'local' | 'cloud';
  /** Model identifier for the selected engine */
  model?: string;
  /** Temperature for AI responses (0-1) */
  temperature?: number;
  /** Maximum tokens for AI responses */
  maxTokens?: number;
  /** API key for cloud providers (stored securely) */
  apiKey?: string;
  /** Base URL for API endpoints */
  baseUrl?: string;
}

/**
 * Source file information for schema parsing
 */
export interface SourceFile {
  /** Unique identifier */
  id: string;
  /** Original file name */
  name: string;
  /** File path relative to project root */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'sql' | 'cshtml' | 'cs' | 'json' | 'xml' | 'unknown';
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** MD5 hash of content for change detection */
  contentHash: string;
}

/**
 * Parsed SQL Table definition
 */
export interface ParsedTable {
  /** Table name */
  name: string;
  /** Schema name (if applicable) */
  schema?: string;
  /** Column definitions */
  columns: ParsedColumn[];
  /** Primary key columns */
  primaryKey: string[];
  /** Foreign key relationships */
  foreignKeys: ParsedForeignKey[];
  /** Indexes */
  indexes: ParsedIndex[];
  /** Table constraints */
  constraints: ParsedConstraint[];
  /** Original DDL statement */
  sourceDDL: string;
  /** Line numbers in source file */
  sourceLocation: { start: number; end: number };
}

/**
 * Parsed column definition
 */
export interface ParsedColumn {
  /** Column name */
  name: string;
  /** SQL data type */
  dataType: string;
  /** Maximum length (for varchar, etc.) */
  maxLength?: number;
  /** Numeric precision */
  precision?: number;
  /** Numeric scale */
  scale?: number;
  /** Is nullable */
  nullable: boolean;
  /** Default value */
  defaultValue?: string;
  /** Is identity/auto-increment */
  isIdentity: boolean;
  /** Is computed column */
  isComputed: boolean;
  /** Computed expression */
  computedExpression?: string;
  /** Column collation */
  collation?: string;
  /** Extended properties/comments */
  description?: string;
  /** Detected business meaning */
  inferredPurpose?: string;
}

/**
 * Parsed foreign key relationship
 */
export interface ParsedForeignKey {
  /** Constraint name */
  name: string;
  /** Source table */
  fromTable: string;
  /** Source columns */
  fromColumns: string[];
  /** Referenced table */
  toTable: string;
  /** Referenced columns */
  toColumns: string[];
  /** ON DELETE action */
  onDelete: 'CASCADE' | 'SET_NULL' | 'SET_DEFAULT' | 'NO_ACTION' | 'RESTRICT';
  /** ON UPDATE action */
  onUpdate: 'CASCADE' | 'SET_NULL' | 'SET_DEFAULT' | 'NO_ACTION' | 'RESTRICT';
}

/**
 * Parsed index definition
 */
export interface ParsedIndex {
  /** Index name */
  name: string;
  /** Is unique index */
  isUnique: boolean;
  /** Is clustered */
  isClustered: boolean;
  /** Indexed columns */
  columns: Array<{ name: string; descending: boolean }>;
  /** Included columns (covering index) */
  includedColumns?: string[];
  /** Filter predicate (filtered index) */
  filter?: string;
}

/**
 * Parsed constraint definition
 */
export interface ParsedConstraint {
  /** Constraint name */
  name: string;
  /** Constraint type */
  type: 'CHECK' | 'UNIQUE' | 'DEFAULT' | 'FOREIGN_KEY';
  /** Constraint definition */
  definition: string;
  /** Affected columns */
  columns: string[];
}

/**
 * Parsed stored procedure
 */
export interface ParsedStoredProcedure {
  /** Procedure name */
  name: string;
  /** Schema name */
  schema?: string;
  /** Parameters */
  parameters: ParsedParameter[];
  /** Return type */
  returnType?: string;
  /** Procedure body */
  body: string;
  /** Detected operations */
  operations: DBOperation[];
  /** Tables accessed */
  tablesAccessed: string[];
  /** Tables modified */
  tablesModified: string[];
  /** Complexity score */
  complexity: number;
  /** Source file */
  sourceFile: string;
  /** Line numbers */
  sourceLocation: { start: number; end: number };
}

/**
 * Parsed parameter definition
 */
export interface ParsedParameter {
  /** Parameter name */
  name: string;
  /** Data type */
  dataType: string;
  /** Direction */
  direction: 'IN' | 'OUT' | 'INOUT';
  /** Default value */
  defaultValue?: string;
  /** Is nullable */
  nullable: boolean;
  /** Maximum length */
  maxLength?: number;
}

/**
 * Database operation types detected in procedures
 */
export type DBOperation = 
  | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' 
  | 'MERGE' | 'EXEC' | 'TRUNCATE' | 'DROP' | 'CREATE';

/**
 * Parsed SQL View definition
 */
export interface ParsedView {
  /** View name */
  name: string;
  /** Schema name */
  schema?: string;
  /** View definition */
  definition: string;
  /** Tables used in view */
  baseTables: string[];
  /** Columns exposed by view */
  columns: ParsedColumn[];
  /** Dependencies on other views */
  viewDependencies: string[];
  /** Detected complexity */
  complexity: number;
  /** Source file */
  sourceFile: string;
}

/**
 * Parsed CSHTML/ASP.NET MVC View
 */
export interface ParsedCSHTML {
  /** View name */
  name: string;
  /** Controller name (inferred) */
  controller?: string;
  /** Action name (inferred) */
  action?: string;
  /** Model type */
  modelType?: string;
  /** HTML elements detected */
  elements: CSHTMLElement[];
  /** Form definitions */
  forms: CSHTMLForm[];
  /** Scripts referenced */
  scripts: string[];
  /** Stylesheets referenced */
  styles: string[];
  /** Layout used */
  layout?: string;
  /** Source file path */
  sourceFile: string;
}

/**
 * CSHTML element representation
 */
export interface CSHTMLElement {
  /** Element type/tag */
  tag: string;
  /** Element ID */
  id?: string;
  /** Element name attribute */
  name?: string;
  /** CSS classes */
  classes: string[];
  /** Data bindings detected */
  bindings: Array<{ type: string; expression: string }>;
  /** Child elements */
  children: CSHTMLElement[];
  /** Is bound to model */
  isModelBound: boolean;
}

/**
 * CSHTML form definition
 */
export interface CSHTMLForm {
  /** Form ID */
  id?: string;
  /** Form action URL */
  action?: string;
  /** HTTP method */
  method: 'GET' | 'POST';
  /** Form fields */
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    label?: string;
    validation?: string[];
  }>;
}

// ============================================================================
// INTELLIGENCE LAYER OUTPUT
// ============================================================================

/**
 * Column intelligence result
 */
export interface ColumnIntelligence {
  /** Column reference */
  tableName: string;
  columnName: string;
  /** Detected data category */
  category: DataCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected business meaning */
  businessMeaning: string;
  /** Suggested constraints */
  suggestedConstraints: string[];
  /** Validation rules */
  validationRules: ValidationRule[];
  /** Similar columns in other tables */
  similarColumns: Array<{ table: string; column: string; similarity: number }>;
}

/**
 * Data category classification
 */
export type DataCategory = 
  | 'identifier'    // IDs, codes, keys
  | 'person_name'   // Names of people
  | 'email'         // Email addresses
  | 'phone'         // Phone numbers
  | 'address'       // Address components
  | 'date_time'     // Dates and times
  | 'monetary'      // Currency/financial values
  | 'quantity'      // Counts, amounts
  | 'percentage'    // Percentage values
  | 'status'        // Status flags/indicators
  | 'description'   // Free text descriptions
  | 'reference'     // Reference codes
  | 'configuration' // Config/settings values
  | 'audit'         // Audit fields (created_by, etc.)
  | 'pii'           // Personal identifiable information
  | 'phi'           // Protected health information
  | 'unknown';      // Cannot determine

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /** Rule type */
  type: 'format' | 'range' | 'length' | 'pattern' | 'custom';
  /** Rule definition */
  rule: string;
  /** Error message */
  errorMessage: string;
  /** Source of rule (inferred, explicit, etc.) */
  source: 'inferred' | 'explicit' | 'business_rule';
}

/**
 * PII/PHI Detection result
 */
export interface PII_PHIDetection {
  /** Table name */
  tableName: string;
  /** Column name */
  columnName: string;
  /** Detection type */
  type: 'PII' | 'PHI' | 'SENSITIVE' | 'NONE';
  /** Specific category */
  category: string;
  /** Confidence score */
  confidence: number;
  /** Compliance requirements */
  complianceRequirements: string[];
  /** Recommended protections */
  recommendedProtections: string[];
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Relationship discovery result
 */
export interface DiscoveredRelationship {
  /** Source table */
  fromTable: string;
  /** Source column */
  fromColumn: string;
  /** Target table */
  toTable: string;
  /** Target column */
  toColumn: string;
  /** Relationship type */
  type: 'one_to_one' | 'one_to_many' | 'many_to_many' | 'self_referencing';
  /** How this was discovered */
  discoveryMethod: 'explicit_fk' | 'naming_convention' | 'data_analysis' | 'inferred';
  /** Confidence score */
  confidence: number;
  /** Whether this is a soft relationship (not enforced by FK) */
  isSoft: boolean;
  /** Business meaning of relationship */
  businessMeaning?: string;
}

/**
 * Business rule inference result
 */
export interface InferredBusinessRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Source of inference */
  source: 'constraint' | 'naming' | 'data_pattern' | 'procedure_logic' | 'explicit';
  /** Affected table */
  tableName: string;
  /** Affected columns */
  columns: string[];
  /** Rule expression/logic */
  rule: string;
  /** Confidence score */
  confidence: number;
  /** Related rules */
  relatedRules: string[];
}

/**
 * Schema health score result
 */
export interface SchemaHealthScore {
  /** Overall health score (0-100) */
  overallScore: number;
  /** Individual scores */
  scores: {
    /** Naming consistency */
    naming: number;
    /** Index optimization */
    indexing: number;
    /** Relationship integrity */
    relationships: number;
    /** Data type consistency */
    dataTypes: number;
    /** Normalization level */
    normalization: number;
    /** Documentation coverage */
    documentation: number;
  };
  /** Issues found */
  issues: SchemaIssue[];
  /** Recommendations */
  recommendations: string[];
  /** Health grade */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Schema issue definition
 */
export interface SchemaIssue {
  /** Issue ID */
  id: string;
  /** Issue severity */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** Issue type */
  type: string;
  /** Affected object */
  object: string;
  /** Issue description */
  description: string;
  /** Suggested fix */
  suggestion: string;
  /** Auto-fixable */
  autoFixable: boolean;
}

// ============================================================================
// MODULE LAYER OUTPUT
// ============================================================================

/**
 * Module definition
 */
export interface Module {
  /** Module ID */
  id: string;
  /** Module name */
  name: string;
  /** Module description */
  description: string;
  /** Category */
  category: string;
  /** Related tables */
  tables: string[];
  /** Related procedures */
  procedures: string[];
  /** Related views */
  views: string[];
  /** Related CSHTML views */
  screens: string[];
  /** Priority score */
  priority: number;
  /** Complexity estimate */
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  /** Estimated effort (hours) */
  estimatedHours: number;
  /** Dependencies on other modules */
  dependencies: string[];
  /** Business value */
  businessValue: 'critical' | 'high' | 'medium' | 'low';
  /** Status */
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

/**
 * Sprint plan
 */
export interface SprintPlan {
  /** Sprint ID */
  id: string;
  /** Sprint name */
  name: string;
  /** Sprint duration (weeks) */
  duration: number;
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Modules in sprint */
  modules: Array<{
    moduleId: string;
    priority: number;
    estimatedHours: number;
    assignedTo?: string;
  }>;
  /** Total estimated hours */
  totalHours: number;
  /** Sprint goals */
  goals: string[];
  /** Risks */
  risks: string[];
}

// ============================================================================
// REQUIREMENTS LAYER OUTPUT
// ============================================================================

/**
 * Generated user story
 */
export interface UserStory {
  /** Story ID */
  id: string;
  /** Story title */
  title: string;
  /** As a [role] */
  role: string;
  /** I want [feature] */
  feature: string;
  /** So that [benefit] */
  benefit: string;
  /** Acceptance criteria */
  acceptanceCriteria: AcceptanceCriteria[];
  /** Related module */
  moduleId: string;
  /** Related tables */
  tables: string[];
  /** Priority */
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  /** Story points */
  storyPoints: number;
}

/**
 * Acceptance criteria definition
 */
export interface AcceptanceCriteria {
  /** Criteria ID */
  id: string;
  /** Given condition */
  given: string;
  /** When action */
  when: string;
  /** Then result */
  then: string;
  /** Test type */
  testType: 'unit' | 'integration' | 'e2e' | 'manual';
}

/**
 * Standard Operating Procedure
 */
export interface SOP {
  /** SOP ID */
  id: string;
  /** SOP title */
  title: string;
  /** Purpose */
  purpose: string;
  /** Scope */
  scope: string;
  /** Prerequisites */
  prerequisites: string[];
  /** Steps */
  steps: Array<{
    step: number;
    action: string;
    expectedResult: string;
    notes?: string;
  }>;
  /** Related module */
  moduleId: string;
  /** Version */
  version: string;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Traceability matrix entry
 */
export interface TraceabilityEntry {
  /** Entry ID */
  id: string;
  /** Source requirement */
  sourceRequirement: string;
  /** Related user story */
  userStoryId?: string;
  /** Related table */
  table?: string;
  /** Related procedure */
  procedure?: string;
  /** Related screen */
  screen?: string;
  /** Test case ID */
  testCaseId?: string;
  /** Status */
  status: 'covered' | 'partial' | 'missing';
  /** Coverage percentage */
  coverage: number;
}

// ============================================================================
// GENERATION LAYER OUTPUT
// ============================================================================

/**
 * Generated Prisma schema
 */
export interface GeneratedPrismaSchema {
  /** Model name */
  modelName: string;
  /** Prisma schema content */
  schema: string;
  /** Original table mapping */
  sourceTable: string;
  /** Field mappings */
  fieldMappings: Array<{
    prismaField: string;
    sqlColumn: string;
    type: string;
  }>;
  /** Relations defined */
  relations: Array<{
    name: string;
    type: string;
    references: string;
  }>;
  /** Enum definitions */
  enums: Array<{ name: string; values: string[] }>;
}

/**
 * Generated API specification
 */
export interface GeneratedAPISpec {
  /** API path */
  path: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Operation ID */
  operationId: string;
  /** Description */
  description: string;
  /** Request body schema */
  requestBody?: object;
  /** Response schema */
  responses: Record<string, object>;
  /** Parameters */
  parameters: Array<{
    name: string;
    in: 'path' | 'query' | 'header';
    required: boolean;
    schema: object;
  }>;
  /** Related module */
  moduleId: string;
  /** Related table */
  tableName: string;
}

/**
 * Generated screen blueprint
 */
export interface GeneratedScreenBlueprint {
  /** Screen name */
  name: string;
  /** Screen type */
  type: 'list' | 'detail' | 'form' | 'dashboard' | 'report';
  /** Route path */
  route: string;
  /** Components needed */
  components: Array<{
    name: string;
    type: string;
    props: Record<string, unknown>;
  }>;
  /** Data requirements */
  dataRequirements: Array<{
    name: string;
    source: string;
    fields: string[];
    filters?: string[];
  }>;
  /** Actions */
  actions: Array<{
    name: string;
    type: string;
    handler: string;
  }>;
  /** Related module */
  moduleId: string;
  /** Original CSHTML reference */
  sourceCSHTML?: string;
}

/**
 * Generated test case
 */
export interface GeneratedTestCase {
  /** Test case ID */
  id: string;
  /** Test name */
  name: string;
  /** Test type */
  type: 'unit' | 'integration' | 'e2e';
  /** Test description */
  description: string;
  /** Preconditions */
  preconditions: string[];
  /** Test steps */
  steps: Array<{
    action: string;
    expectedResult: string;
  }>;
  /** Test data */
  testData: Record<string, unknown>;
  /** Related user story */
  userStoryId: string;
  /** Related acceptance criteria */
  acceptanceCriteriaId: string;
}

// ============================================================================
// MIGRATION LAYER OUTPUT
// ============================================================================

/**
 * Migration plan
 */
export interface MigrationPlan {
  /** Plan ID */
  id: string;
  /** Plan name */
  name: string;
  /** Phases */
  phases: MigrationPhase[];
  /** Total estimated duration (days) */
  estimatedDuration: number;
  /** Risk assessment */
  risks: Array<{
    risk: string;
    mitigation: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  /** Rollback strategy */
  rollbackStrategy: string;
  /** Success criteria */
  successCriteria: string[];
}

/**
 * Migration phase
 */
export interface MigrationPhase {
  /** Phase number */
  phase: number;
  /** Phase name */
  name: string;
  /** Tasks */
  tasks: Array<{
    id: string;
    description: string;
    duration: number;
    dependencies: string[];
  }>;
  /** Estimated duration (days) */
  duration: number;
}

// ============================================================================
// PIPELINE EXECUTION TYPES
// ============================================================================

/**
 * Pipeline execution status
 */
export type PipelineStatus = 
  | 'idle'
  | 'initializing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /** Pipeline ID */
  id: string;
  /** Pipeline name */
  name: string;
  /** Description */
  description: string;
  /** Agents to execute (in order) */
  agents: AgentId[];
  /** Execution mode */
  mode: 'sequential' | 'parallel' | 'conditional';
  /** AI configuration */
  aiConfig: AIConfig;
  /** Stop on error */
  stopOnError: boolean;
  /** Retry configuration */
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  /** Timeout (seconds) */
  timeout: number;
  /** Output directory */
  outputDir: string;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  /** Execution ID */
  executionId: string;
  /** Pipeline ID */
  pipelineId: string;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Duration (ms) */
  duration?: number;
  /** Status */
  status: PipelineStatus;
  /** Agent results */
  agentResults: AgentExecutionResult[];
  /** Errors */
  errors: PipelineError[];
  /** Output files generated */
  outputFiles: string[];
  /** Summary statistics */
  summary: {
    totalAgents: number;
    completedAgents: number;
    failedAgents: number;
    skippedAgents: number;
    totalItemsProcessed: number;
  };
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  /** Agent ID */
  agentId: AgentId;
  /** Agent name */
  agentName: string;
  /** Execution status */
  status: AgentStatus;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Duration (ms) */
  duration?: number;
  /** Output data */
  output?: unknown;
  /** Error if failed */
  error?: string;
  /** Log entries */
  logs: AgentLogEntry[];
  /** Items processed count */
  itemsProcessed: number;
  /** Retry count */
  retryCount: number;
}

/**
 * Agent log entry
 */
export interface AgentLogEntry {
  /** Timestamp */
  timestamp: Date;
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Message */
  message: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Pipeline error
 */
export interface PipelineError {
  /** Error ID */
  id: string;
  /** Agent that caused the error */
  agentId?: AgentId;
  /** Error type */
  type: 'validation' | 'execution' | 'timeout' | 'dependency' | 'system';
  /** Error message */
  message: string;
  /** Stack trace */
  stack?: string;
  /** Timestamp */
  timestamp: Date;
  /** Whether error is recoverable */
  recoverable: boolean;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Shared context data passed between agents
 */
export interface AgentContextData {
  // Source Files
  sourceFiles: SourceFile[];
  
  // Parsed Schema (Schema Layer output)
  parsedTables: ParsedTable[];
  parsedProcedures: ParsedStoredProcedure[];
  parsedViews: ParsedView[];
  parsedCSHTML: ParsedCSHTML[];
  fkRelationships: ParsedForeignKey[];
  
  // Intelligence Layer output
  columnIntelligence: ColumnIntelligence[];
  piiPHIDetections: PII_PHIDetection[];
  discoveredRelationships: DiscoveredRelationship[];
  businessRules: InferredBusinessRule[];
  healthScore: SchemaHealthScore | null;
  
  // Module Layer output
  modules: Module[];
  sprintPlans: SprintPlan[];
  
  // Requirements Layer output
  userStories: UserStory[];
  sops: SOP[];
  traceabilityMatrix: TraceabilityEntry[];
  
  // Generation Layer output
  prismaSchemas: GeneratedPrismaSchema[];
  apiSpecs: GeneratedAPISpec[];
  screenBlueprints: GeneratedScreenBlueprint[];
  testCases: GeneratedTestCase[];
  
  // Migration Layer output
  migrationPlan: MigrationPlan | null;
  
  // Configuration
  aiConfig: AIConfig;
  
  // Metadata
  projectName: string;
  projectDescription: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent input contract
 */
export interface AgentInput {
  /** Agent configuration */
  config: AIConfig;
  /** Shared context data */
  context: AgentContextData;
  /** Specific input for this agent */
  input?: unknown;
  /** Execution metadata */
  metadata: {
    executionId: string;
    pipelineId: string;
    parentAgentId?: AgentId;
    retryCount: number;
  };
}

/**
 * Agent output contract
 */
export interface AgentOutput<T = unknown> {
  /** Success flag */
  success: boolean;
  /** Output data */
  data?: T;
  /** Context updates to merge */
  contextUpdates?: Partial<AgentContextData>;
  /** Errors */
  errors: Array<{ code: string; message: string }>;
  /** Warnings */
  warnings: string[];
  /** Logs */
  logs: AgentLogEntry[];
  /** Metrics */
  metrics: {
    itemsProcessed: number;
    itemsSkipped: number;
    duration: number;
    aiCalls: number;
    tokensUsed?: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Async function type
 */
export type AsyncFunction<T = void> = () => Promise<T>;

/**
 * Event callback type
 */
export type EventCallback<T = unknown> = (event: T) => void | Promise<void>;

/**
 * Progress reporter
 */
export interface ProgressReporter {
  /** Current step */
  step: number;
  /** Total steps */
  totalSteps: number;
  /** Current step name */
  currentStep: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Message */
  message: string;
}

/**
 * Event types for pipeline
 */
export interface PipelineEvents {
  'pipeline:start': { pipelineId: string; config: PipelineConfig };
  'pipeline:complete': { pipelineId: string; result: PipelineResult };
  'pipeline:error': { pipelineId: string; error: PipelineError };
  'agent:start': { agentId: AgentId; input: AgentInput };
  'agent:progress': { agentId: AgentId; progress: ProgressReporter };
  'agent:complete': { agentId: AgentId; result: AgentExecutionResult };
  'agent:error': { agentId: AgentId; error: Error };
  'context:update': { updates: Partial<AgentContextData> };
}

/**
 * Settings for the agent system
 */
export interface AgentSystemSettings {
  /** AI configuration */
  ai: AIConfig;
  /** Default pipeline settings */
  pipeline: {
    stopOnError: boolean;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    outputDir: string;
  };
  /** UI settings */
  ui: {
    showAdvanced: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    autoScroll: boolean;
  };
  /** Feature flags */
  features: {
    enableMigration: boolean;
    enableAI: boolean;
    enableOffline: boolean;
  };
}
