/**
 * Domain Intelligence Base Module
 * 
 * Provides common interfaces and types for multi-domain schema analysis.
 * Supports Healthcare (HIS), ERP, CRM, and E-Commerce domains.
 * 
 * @module domain-intelligence/base
 */

// =============================================================================
// DOMAIN TYPES
// =============================================================================

/**
 * Supported business domains
 */
export type BusinessDomain = 
  | 'healthcare'    // Hospital Information Systems, Medical Practice
  | 'erp'           // Enterprise Resource Planning, Manufacturing, Finance
  | 'crm'           // Customer Relationship Management, Sales
  | 'ecommerce'     // E-Commerce, Retail, Online Stores
  | 'hrms'          // Human Resource Management Systems
  | 'education'     // Learning Management, Student Information
  | 'logistics'     // Supply Chain, Transportation, Warehouse
  | 'finance'       // Banking, Insurance, Investment
  | 'real_estate'   // Property Management, Real Estate
  | 'hospitality'   // Hotels, Restaurants, Tourism
  | 'unknown'       // Cannot determine domain

/**
 * Domain category for classification
 */
export type DomainCategory = 
  | 'master'        // Core entity tables (Patients, Customers, Products)
  | 'transaction'   // Transactional tables (Orders, Invoices, Visits)
  | 'lookup'        // Reference/lookup tables (Statuses, Types, Categories)
  | 'junction'      // Bridge/junction tables for M:N relationships
  | 'audit'         // Audit/history tables
  | 'config'        // Configuration tables
  | 'workflow'      // Workflow/process tables
  | 'reporting'     // Reporting/analytics tables
  | 'integration'   // External system integration tables

/**
 * Sensitivity classification for data
 */
export type SensitivityType = 
  | 'PHI'           // Protected Health Information
  | 'PII'           // Personally Identifiable Information
  | 'PCI'           // Payment Card Industry data
  | 'PIR'           // Personal Information Record
  | 'CONFIDENTIAL'  // Business confidential
  | 'INTERNAL'      // Internal use only
  | 'PUBLIC'        // Public information

// =============================================================================
// PATTERN INTERFACES
// =============================================================================

/**
 * Table name pattern for domain detection
 */
export interface TableNamePattern {
  /** Pattern to match (case-insensitive substring match) */
  pattern: string
  /** Weight/score for this match (1-10) */
  weight: number
  /** Category if matched */
  category?: DomainCategory
  /** Description of what this table typically represents */
  description: string
}

/**
 * Column name pattern for domain detection
 */
export interface ColumnNamePattern {
  /** Pattern to match (regex or string) */
  pattern: string | RegExp
  /** Weight/score for this match (1-10) */
  weight: number
  /** Sensitivity classification if matched */
  sensitivity?: SensitivityType
  /** Semantic type inference */
  semanticType?: string
  /** Description */
  description: string
}

/**
 * FK relationship pattern for domain detection
 */
export interface FKPattern {
  /** Column name pattern */
  columnPattern: string | RegExp
  /** Expected reference table */
  referencesTable: string
  /** Weight for domain scoring */
  weight: number
  /** Description */
  description: string
}

/**
 * Workflow pattern for domain detection
 */
export interface WorkflowPattern {
  /** Workflow name */
  name: string
  /** Table name pattern */
  tableName: string | RegExp
  /** Expected status column */
  statusColumn: string
  /** Expected states */
  states: string[]
  /** Weight for domain scoring */
  weight: number
}

/**
 * Sensitive data pattern for domain detection
 */
export interface SensitiveDataPattern {
  /** Pattern name */
  name: string
  /** Regex patterns to detect */
  patterns: RegExp[]
  /** Sensitivity type */
  sensitivity: SensitivityType
  /** Domain relevance */
  domainWeight: number
  /** Description */
  description: string
}

// =============================================================================
// DOMAIN DEFINITION INTERFACE
// =============================================================================

/**
 * Complete domain definition with all patterns
 */
export interface DomainDefinition {
  /** Domain identifier */
  domain: BusinessDomain
  /** Display name */
  displayName: string
  /** Domain description */
  description: string
  /** Industry examples */
  industries: string[]
  
  /** Table name patterns */
  tablePatterns: TableNamePattern[]
  /** Column name patterns */
  columnPatterns: ColumnNamePattern[]
  /** FK relationship patterns */
  fkPatterns: FKPattern[]
  /** Workflow patterns */
  workflows: WorkflowPattern[]
  /** Sensitive data patterns */
  sensitivePatterns: SensitiveDataPattern[]
  
  /** Common table categories for this domain */
  tableCategories: Record<DomainCategory, string[]>
  
  /** Domain-specific keywords for additional scoring */
  keywords: string[]
  
  /** Priority when multiple domains match (higher = more specific) */
  specificity: number
}

// =============================================================================
// DETECTION RESULT INTERFACES
// =============================================================================

/**
 * Match evidence for a single pattern
 */
export interface PatternMatch {
  /** Pattern that matched */
  pattern: string
  /** Matched entity (table/column name) */
  matchedOn: string
  /** Score contributed */
  score: number
  /** Pattern type */
  type: 'table' | 'column' | 'fk' | 'workflow' | 'sensitive' | 'keyword'
  /** Description */
  description: string
}

/**
 * Domain detection result with evidence
 */
export interface DomainScore {
  /** Domain */
  domain: BusinessDomain
  /** Total score (0-100) */
  score: number
  /** Confidence level (0-1) */
  confidence: number
  /** Evidence of matches */
  evidence: PatternMatch[]
  /** Category breakdown */
  categoryBreakdown: {
    tables: number
    columns: number
    fks: number
    workflows: number
    sensitive: number
    keywords: number
  }
}

/**
 * Complete domain detection result
 */
export interface DomainDetectionResult {
  /** Detected primary domain */
  primaryDomain: BusinessDomain
  /** All domain scores sorted by score */
  allDomains: DomainScore[]
  /** Overall confidence (0-1) */
  confidence: number
  /** Detection method used */
  method: 'pattern_matching' | 'ml_inference' | 'hybrid'
  /** Analysis timestamp */
  analyzedAt: Date
  /** Statistics */
  stats: {
    tablesAnalyzed: number
    columnsAnalyzed: number
    fksAnalyzed: number
    patternsMatched: number
    parseTimeMs: number
  }
  /** Warnings or notes */
  warnings: string[]
  /** Recommendations */
  recommendations: string[]
}

// =============================================================================
// TABLE ANALYSIS INTERFACES
// =============================================================================

/**
 * Input table for domain analysis
 */
export interface TableForAnalysis {
  /** Table name */
  tableName: string
  /** Schema name */
  schemaName?: string
  /** Columns */
  columns: Array<{
    name: string
    dataType: string
    isPrimaryKey?: boolean
    isForeignKey?: boolean
    referencesTable?: string
  }>
  /** Foreign keys */
  foreignKeys?: Array<{
    columnName: string
    referencesTable: string
    referencesColumn: string
  }>
  /** Row count estimate (if available) */
  estimatedRowCount?: number
}

/**
 * Analyzed table with domain intelligence
 */
export interface AnalyzedTable extends TableForAnalysis {
  /** Detected category */
  category: DomainCategory
  /** Detected sensitive columns */
  sensitiveColumns: Array<{
    column: string
    sensitivity: SensitivityType
    pattern: string
  }>
  /** Inferred workflow (if any) */
  inferredWorkflow?: {
    name: string
    statusColumn: string
    detectedStates: string[]
  }
  /** Domain relevance scores */
  domainRelevance: Record<BusinessDomain, number>
  /** Semantic type inferences */
  semanticInferences: Array<{
    column: string
    semanticType: string
    confidence: number
  }>
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Domain detection options
 */
export interface DomainDetectionOptions {
  /** Minimum confidence threshold */
  confidenceThreshold?: number
  /** Maximum domains to return */
  maxDomains?: number
  /** Include evidence details */
  includeEvidence?: boolean
  /** Enable workflow detection */
  detectWorkflows?: boolean
  /** Enable sensitive data detection */
  detectSensitiveData?: boolean
  /** Custom domain definitions (override defaults) */
  customDomains?: DomainDefinition[]
}

/**
 * Domain suggestion for mixed/hybrid schemas
 */
export interface DomainSuggestion {
  domain: BusinessDomain
  percentage: number
  description: string
  modules: string[]
}

/**
 * Default detection options
 */
export const DEFAULT_DETECTION_OPTIONS: DomainDetectionOptions = {
  confidenceThreshold: 0.3,
  maxDomains: 5,
  includeEvidence: true,
  detectWorkflows: true,
  detectSensitiveData: true
}

// =============================================================================
// SCORING CONSTANTS
// =============================================================================

/**
 * Weight distribution for domain detection
 */
export const SCORING_WEIGHTS = {
  /** Table name matches */
  tableNames: 0.35,
  /** Column name matches */
  columnNames: 0.25,
  /** FK relationship patterns */
  fkPatterns: 0.15,
  /** Sensitive data patterns */
  sensitiveData: 0.15,
  /** Workflow indicators */
  workflows: 0.10
}

/**
 * Minimum scores for domain detection
 */
export const DETECTION_THRESHOLDS = {
  /** Minimum score to be considered a match */
  minimumScore: 10,
  /** Score for high confidence detection */
  highConfidence: 50,
  /** Score for medium confidence detection */
  mediumConfidence: 30,
  /** Score difference to consider secondary domain */
  secondaryThreshold: 15
}
