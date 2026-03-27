// =============================================================================
// Schema Toolkit - Core Types
// =============================================================================

/**
 * Column definition parsed from SQL
 */
export interface ColumnDef {
  name: string;
  dataType: string;
  maxLength?: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  // Extended intelligence fields
  uiType?: UIComponentType;
  semanticType?: SemanticType;
  sensitivity?: SensitivityLevel;
  validation?: ValidationRule[];
  isSearchable?: boolean;
  isFilterable?: boolean;
}

/**
 * Foreign key definition
 */
export interface ForeignKeyDef {
  constraintName?: string;
  columnName: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

/**
 * Index definition
 */
export interface IndexDef {
  name: string;
  columns: string[];
  isUnique: boolean;
  isClustered?: boolean;
}

/**
 * Check constraint definition
 */
export interface CheckConstraintDef {
  name?: string;
  expression: string;
  columns?: string[];
}

/**
 * Table definition parsed from SQL
 */
export interface TableDef {
  schemaName: string;
  tableName: string;
  columns: ColumnDef[];
  foreignKeys: ForeignKeyDef[];
  indexes?: IndexDef[];
  checkConstraints?: CheckConstraintDef[];
  sourceDDL?: string;
  // Extended fields
  status?: TableStatus;
  linkedModule?: string;
  estimatedRows?: number;
}

/**
 * Stored procedure definition
 */
export interface StoredProcedureDef {
  schemaName: string;
  procedureName: string;
  parameters: ProcedureParameter[];
  returnType?: string;
  body: string;
  operations?: SQLOperation[];
  tablesAccessed?: string[];
  tablesModified?: string[];
  complexity?: number;
}

/**
 * Procedure parameter
 */
export interface ProcedureParameter {
  name: string;
  dataType: string;
  maxLength?: string;
  isOutput: boolean;
  defaultValue?: string;
}

/**
 * SQL operation detected in stored procedure
 */
export interface SQLOperation {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'OTHER';
  tables: string[];
  columns?: string[];
}

/**
 * INSERT statement parsed from SQL (seed data)
 */
export interface InsertStatementDef {
  schemaName: string;
  tableName: string;
  columns: string[];
  valueCount: number;        // Number of rows inserted
  hasExplicitIdentity: boolean; // SET IDENTITY_INSERT was used
  sourceDDL: string;
}

/**
 * Seed data summary for a table
 */
export interface SeedDataSummary {
  schemaName: string;
  tableName: string;
  totalRows: number;
  columns: string[];
  isLookupTable: boolean;    // Small reference table (Countries, Statuses, etc.)
  hasIdentityInsert: boolean;
  estimatedImportTime: number; // in seconds
}

/**
 * Parse result from SQL parser
 */
export interface ParseResult {
  tables: TableDef[];
  storedProcedures: StoredProcedureDef[];
  insertStatements: InsertStatementDef[];
  seedDataSummaries: SeedDataSummary[];
  errors: string[];
  warnings: string[];
  stats: ParseStats;
}

/**
 * Parse statistics
 */
export interface ParseStats {
  totalTables: number;
  totalColumns: number;
  totalForeignKeys: number;
  totalStoredProcedures: number;
  totalInsertStatements: number;
  totalSeedDataRows: number;
  lookupTablesDetected: number;
  parseTimeMs: number;
}

/**
 * Table resolution status
 */
export type TableStatus = 'complete' | 'partial' | 'missing' | 'standalone';

/**
 * UI Component types inferred from column semantics
 */
export type UIComponentType =
  | 'text_input'
  | 'email_input'
  | 'password_input'
  | 'phone_input'
  | 'number_input'
  | 'currency_input'
  | 'percentage_input'
  | 'date_picker'
  | 'time_picker'
  | 'datetime_picker'
  | 'toggle'
  | 'checkbox'
  | 'dropdown'
  | 'multi_select'
  | 'textarea'
  | 'rich_text'
  | 'file_upload'
  | 'image_upload'
  | 'color_picker'
  | 'url_input'
  | 'hidden'
  | 'auto_generated'
  | 'read_only';

/**
 * Semantic type inferred from column name and data type
 */
export type SemanticType =
  | 'email'
  | 'password'
  | 'phone'
  | 'address'
  | 'name'
  | 'title'
  | 'description'
  | 'code'
  | 'id'
  | 'foreign_key'
  | 'status'
  | 'type'
  | 'category'
  | 'amount'
  | 'price'
  | 'quantity'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'time'
  | 'boolean_flag'
  | 'image'
  | 'file'
  | 'url'
  | 'color'
  | 'gender'
  | 'age'
  | 'measurement'
  | 'national_id'
  | 'salary'
  | 'audit_timestamp'
  | 'audit_user'
  | 'sort_order'
  | 'geo_location'
  | 'medical_record_number'
  | 'diagnosis'
  | 'treatment'
  | 'unknown';

/**
 * Data sensitivity level for PII/PHI detection
 */
export type SensitivityLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'pii'
  | 'phi'
  | 'secret';

/**
 * Validation rule
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'url' | 'min_length' | 'max_length' | 'min_value' | 'max_value' | 'pattern' | 'unique';
  value?: string | number;
  message?: string;
}

/**
 * Column intelligence result
 */
export interface ColumnIntelligence {
  columnName: string;
  tableName: string;
  inferredUIType: UIComponentType;
  inferredSemanticType: SemanticType;
  sensitivityLevel: SensitivityLevel;
  validationRules: ValidationRule[];
  confidence: number; // 0-100
  suggestions: string[];
  isSearchable: boolean;
  isFilterable: boolean;
  displayInList: boolean;
  placeholder?: string;
  label?: string;
  icon?: string;
}

/**
 * FK Dependency analysis result
 */
export interface FKDependencyAnalysis {
  totalFKs: number;
  resolvedFKs: number;
  unresolvedFKs: number;
  completionPercentage: number;
  missingTables: MissingTable[];
  dependencyChains: DependencyChain[];
  resolutionQueue: ResolutionQueueItem[];
}

/**
 * Missing table information
 */
export interface MissingTable {
  tableName: string;
  referencedBy: {
    tableName: string;
    columnName: string;
  }[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: number; // Number of tables blocked
}

/**
 * Dependency chain for recursive dependencies
 */
export interface DependencyChain {
  rootTable: string;
  chain: string[];
  depth: number;
  totalBlocked: number;
}

/**
 * Resolution queue item
 */
export interface ResolutionQueueItem {
  tableName: string;
  priority: number;
  blocksCount: number;
  resolutionOptions: ('upload_sql' | 'design_manual' | 'ai_design')[];
  referencedByTables: string[];
}

/**
 * UAT Test case
 */
export interface UATTestCase {
  id: string;
  module: string;
  testCase: string;
  description: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Passed' | 'Failed' | 'Blocked';
}

/**
 * User story
 */
export interface UserStory {
  id: string;
  title: string;
  role: string;
  feature: string;
  benefit: string;
  acceptanceCriteria: string[];
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  storyPoints: number;
  tables: string[];
  moduleId?: string;
}

/**
 * Screen blueprint
 */
export interface ScreenBlueprint {
  screenType: 'list' | 'form' | 'detail' | 'dashboard';
  tableName: string;
  title: string;
  fields: ScreenField[];
  actions: ScreenAction[];
  sections?: ScreenSection[];
  filters?: ScreenFilter[];
  layout?: 'single_column' | 'two_column' | 'tabs';
}

/**
 * Screen field definition
 */
export interface ScreenField {
  columnName: string;
  label: string;
  uiType: UIComponentType;
  isRequired: boolean;
  isReadOnly: boolean;
  placeholder?: string;
  defaultValue?: string;
  validation?: ValidationRule[];
  options?: { label: string; value: string }[];
  order: number;
  section?: string;
}

/**
 * Screen action button
 */
export interface ScreenAction {
  type: 'create' | 'edit' | 'delete' | 'view' | 'export' | 'custom';
  label: string;
  icon?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  permission?: string;
}

/**
 * Screen section for grouping fields
 */
export interface ScreenSection {
  id: string;
  title: string;
  columns: number;
  isCollapsible: boolean;
  defaultExpanded: boolean;
}

/**
 * Screen filter for list views
 */
export interface ScreenFilter {
  columnName: string;
  label: string;
  type: 'text' | 'dropdown' | 'date_range' | 'number_range' | 'boolean';
  options?: { label: string; value: string }[];
  isMultiSelect?: boolean;
}

/**
 * API Endpoint specification
 */
export interface APIEndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  tableName: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete' | 'custom';
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses?: APIResponse[];
  authentication?: boolean;
  permissions?: string[];
}

/**
 * API Parameter
 */
export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  type: string;
  required: boolean;
  description?: string;
}

/**
 * API Request body
 */
export interface APIRequestBody {
  contentType: string;
  schema: Record<string, unknown>;
}

/**
 * API Response
 */
export interface APIResponse {
  statusCode: number;
  description: string;
  schema?: Record<string, unknown>;
}

/**
 * Module definition for HIS
 */
export interface ModuleDef {
  key: string;
  name: string;
  description: string;
  layer: number;
  tables: string[];
  dependsOn: string[];
  apiEndpoints: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  revenue: boolean;
  estimatedDays: number;
  features: string[];
  userRoles: string[];
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
}

/**
 * Project information
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  softwareType: 'HIS' | 'ERP' | 'CRM' | 'E-Commerce' | 'LMS' | 'Custom';
  rawSql?: string;
  tables: TableDef[];
  storedProcedures: StoredProcedureDef[];
  modules: ModuleDef[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'markdown' | 'csv' | 'html' | 'pdf' | 'prisma';

/**
 * Generator options
 */
export interface GeneratorOptions {
  provider: 'sqlite' | 'postgresql' | 'mysql' | 'sqlserver';
  includeRelations: boolean;
  includeAuditFields: boolean;
  useUUID: boolean;
  softDelete: boolean;
  namespace?: string;
}

// =============================================================================
// Phase 1: File Intelligence Types
// =============================================================================

/**
 * File intelligence result from multi-file upload
 */
export interface FileIntelligenceResult {
  classifications: FileClassificationInfo[];
  ajaxEndpoints: DiscoveredAjaxEndpoint[];
  workflows: WorkflowSummary[];
  dependencies: DependencySummary;
  statistics: FileIntelligenceStats;
}

/**
 * File classification info
 */
export interface FileClassificationInfo {
  fileName: string;
  fileType: string;
  language: string;
  framework: string;
  confidence: number;
  parser: string;
}

/**
 * Discovered AJAX endpoint
 */
export interface DiscoveredAjaxEndpoint {
  url: string;
  method: string;
  sourceFile: string;
  parameters: string[];
}

/**
 * Workflow summary
 */
export interface WorkflowSummary {
  name: string;
  module: string;
  steps: number;
  sourceSPs: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Dependency summary
 */
export interface DependencySummary {
  jsLibraries: string[];
  cssFrameworks: string[];
  requiredTables: string[];
  missingTables: string[];
}

/**
 * File intelligence statistics
 */
export interface FileIntelligenceStats {
  totalFiles: number;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
  totalEndpoints: number;
  totalWorkflows: number;
  parseTimeMs: number;
}

/**
 * Multi-file parse request
 */
export interface MultiFileParseRequest {
  files: Array<{
    name: string;
    content: string;
  }>;
  options?: ParseOptions;
}

/**
 * Parse options
 */
export interface ParseOptions {
  extractWorkflows: boolean;
  extractAJAX: boolean;
  detectDependencies: boolean;
  crossReference: boolean;
}

/**
 * Complete system parse result
 */
export interface SystemParseResult {
  // SQL Results
  tables: TableDef[];
  storedProcedures: StoredProcedureDef[];
  insertStatements: InsertStatementDef[];
  
  // File Intelligence
  fileClassifications: FileClassificationInfo[];
  ajaxCalls: DiscoveredAjaxEndpoint[];
  workflows: WorkflowSummary[];
  
  // Cross-references
  pageToTableMappings: PageTableMapping[];
  spToTableMappings: SPTableMapping[];
  discoveredTables: DiscoveredTableInfo[];
  
  // Statistics
  statistics: SystemParseStats;
}

/**
 * Page to table mapping
 */
export interface PageTableMapping {
  pageName: string;
  tableName: string;
  fields: string[];
  operations: ('create' | 'read' | 'update' | 'delete')[];
  confidence: number;
}

/**
 * SP to table mapping
 */
export interface SPTableMapping {
  spName: string;
  tables: string[];
  operations: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
}

/**
 * Discovered table info
 */
export interface DiscoveredTableInfo {
  tableName: string;
  discoveredIn: string;
  columns: string[];
  suggestedModule: string;
}

/**
 * System parse statistics
 */
export interface SystemParseStats {
  totalFiles: number;
  totalTables: number;
  totalSPs: number;
  totalPages: number;
  totalWorkflows: number;
  totalEndpoints: number;
  discoveredTables: number;
  parseTimeMs: number;
}
