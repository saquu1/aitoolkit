/**
 * Table Archetype Detector
 * 
 * Detects table archetypes from schema analysis:
 * - Master: Core entity tables (Patients, Customers, Products)
 * - Transaction: Transactional tables (Orders, Invoices, Visits)
 * - Lookup: Reference/lookup tables (Statuses, Types, Categories)
 * - Bridge/Junction: Many-to-many relationship tables
 * - Audit: Audit/history tables
 * - Config: Configuration tables
 * 
 * @module domain-intelligence/table-archetype-detector
 */

import { BusinessDomain, DomainCategory } from './base'
import { DOMAIN_REGISTRY } from './detector'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Table archetype types
 */
export type TableArchetype = 
  | 'master'        // Core entity tables with business meaning
  | 'transaction'   // Transactional/event tables
  | 'lookup'        // Reference/lookup tables
  | 'bridge'        // Junction/bridge tables for M:N relationships
  | 'audit'         // Audit/history/log tables
  | 'config'        // Configuration/settings tables
  | 'reporting'     // Reporting/denormalized tables
  | 'staging'       // ETL staging tables

/**
 * Table structure for archetype detection
 */
export interface TableStructure {
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
    isNullable?: boolean
    defaultValue?: string
  }>
  /** Primary key columns */
  primaryKeys?: string[]
  /** Foreign key relationships */
  foreignKeys?: Array<{
    columnName: string
    referencesTable: string
    referencesColumn: string
  }>
  /** Indexes */
  indexes?: Array<{
    name: string
    columns: string[]
    isUnique?: boolean
  }>
  /** Estimated row count */
  estimatedRowCount?: number
}

/**
 * Archetype detection result
 */
export interface ArchetypeDetectionResult {
  /** Table name */
  tableName: string
  /** Detected archetype */
  archetype: TableArchetype
  /** Confidence level (0-1) */
  confidence: number
  /** Evidence supporting this detection */
  evidence: string[]
  /** Secondary archetype (if applicable) */
  secondaryArchetype?: TableArchetype
  /** Domain relevance */
  domainRelevance?: {
    domain: BusinessDomain
    category: DomainCategory
    score: number
  }
  /** Table characteristics */
  characteristics: {
    hasPrimaryKey: boolean
    hasForeignKey: boolean
    isJunctionTable: boolean
    hasAuditColumns: boolean
    hasStatusColumn: boolean
    hasDateColumns: boolean
    columnCount: number
    fkCount: number
  }
  /** Recommendations */
  recommendations: string[]
}

/**
 * Archetype pattern definition
 */
interface ArchetypePattern {
  archetype: TableArchetype
  patterns: {
    namePatterns: RegExp[]
    columnPatterns: RegExp[]
    structurePatterns: Array<{
      check: (table: TableStructure) => boolean
      weight: number
    }>
  }
  weight: number
}

// =============================================================================
// ARCHETYPE PATTERNS
// =============================================================================

const ARCHETYPE_PATTERNS: ArchetypePattern[] = [
  // MASTER DATA TABLES
  {
    archetype: 'master',
    patterns: {
      namePatterns: [
        /^(master|main|mst_)/i,
        /^(patient|customer|employee|user|vendor|supplier|client|account)s?$/i,
        /^(product|item|material|asset|goods|merchandise)s?$/i,
        /^(doctor|physician|nurse|staff|worker)s?$/i,
        /(master|main)$/i,
      ],
      columnPatterns: [
        /^(name|description|title|label)$/i,
        /^(code|number|reference)$/i,
        /^(status|active|enabled)$/i,
        /^(created_at|created_by|updated_at|updated_by)$/i,
      ],
      structurePatterns: [
        { check: (t) => t.primaryKeys?.length === 1, weight: 0.3 },
        { check: (t) => (t.foreignKeys?.length ?? 0) <= 2, weight: 0.2 },
        { check: (t) => (t.columns?.length ?? 0) >= 5, weight: 0.2 },
        { check: (t) => t.columns?.some(c => /name/i.test(c.name)), weight: 0.3 },
      ]
    },
    weight: 1.0
  },
  
  // TRANSACTION TABLES
  {
    archetype: 'transaction',
    patterns: {
      namePatterns: [
        /^(transaction|trans|txn)/i,
        /^(order|invoice|payment|receipt|bill)s?$/i,
        /^(visit|appointment|admission|encounter)s?$/i,
        /(order|invoice|payment|transaction)$/i,
        /^(sale|purchase|shipment|delivery)s?$/i,
        /^(log|record|entry|item|detail)s?$/i,
        /^hist_/i,
      ],
      columnPatterns: [
        /^(date|time|datetime|timestamp)$/i,
        /^(amount|total|subtotal|quantity|qty)$/i,
        /^(status|state|stage|phase)$/i,
        /^(customer|patient|client|user|account)_id$/i,
        /^(order|invoice|transaction|visit)_id$/i,
      ],
      structurePatterns: [
        { check: (t) => t.columns?.some(c => /date|time/i.test(c.name)), weight: 0.3 },
        { check: (t) => t.columns?.some(c => /amount|total|qty/i.test(c.name)), weight: 0.3 },
        { check: (t) => t.columns?.some(c => /status|state/i.test(c.name)), weight: 0.3 },
        { check: (t) => (t.foreignKeys?.length ?? 0) >= 1, weight: 0.2 },
      ]
    },
    weight: 1.0
  },
  
  // LOOKUP TABLES
  {
    archetype: 'lookup',
    patterns: {
      namePatterns: [
        /^(lookup|lkp|ref|type|cat|category)/i,
        /(type|category|class|group|status)s?$/i,
        /^(gender|country|state|city|region|currency|language)/i,
        /^(code|codes|status|statuses)$/i,
        /^(icd|cpt|hl7|loinc)/i, // Healthcare code tables
        /^lut_/i,
        /^ref_/i,
      ],
      columnPatterns: [
        /^(code|value|key|id)$/i,
        /^(name|description|label|display_name)$/i,
        /^(sort_order|display_order|sequence)$/i,
        /^(is_active|is_default|is_system)$/i,
      ],
      structurePatterns: [
        { check: (t) => (t.columns?.length ?? 0) <= 6, weight: 0.4 },
        { check: (t) => (t.foreignKeys?.length ?? 0) === 0, weight: 0.3 },
        { check: (t) => t.columns?.some(c => /code|type|status/i.test(c.name)), weight: 0.3 },
        { check: (t) => t.columns?.some(c => /name|description/i.test(c.name)), weight: 0.2 },
      ]
    },
    weight: 0.9
  },
  
  // BRIDGE/JUNCTION TABLES
  {
    archetype: 'bridge',
    patterns: {
      namePatterns: [
        /^(bridge|junction|link|map|assoc|xref)/i,
        /_(bridge|junction|link|map|assoc|xref)$/i,
        /^(user_role|order_item|cart_item|invoice_line)/i,
        /^(patient_provider|doctor_department|product_category)/i,
        /^has_/i,
      ],
      columnPatterns: [
        // Typically has two FK columns and little else
      ],
      structurePatterns: [
        { check: (t) => (t.foreignKeys?.length ?? 0) >= 2, weight: 0.5 },
        { check: (t) => (t.columns?.length ?? 0) <= 6, weight: 0.3 },
        { check: (t) => t.primaryKeys?.length === 2 || t.primaryKeys?.length === 0, weight: 0.4 },
        { check: (t) => {
          // Most columns are FKs
          const fkCols = t.foreignKeys?.length ?? 0
          const totalCols = t.columns?.length ?? 0
          return totalCols > 0 && fkCols / totalCols >= 0.5
        }, weight: 0.4 },
        { check: (t) => {
          // Check if columns are mostly IDs
          const idCols = t.columns?.filter(c => /_id$/i.test(c.name)).length ?? 0
          const totalCols = t.columns?.length ?? 0
          return totalCols > 0 && idCols / totalCols >= 0.5
        }, weight: 0.3 },
      ]
    },
    weight: 1.0
  },
  
  // AUDIT TABLES
  {
    archetype: 'audit',
    patterns: {
      namePatterns: [
        /^(audit|log|history|track|trail)/i,
        /_(audit|log|history|trail)$/i,
        /^(change|modification|version)s?$/i,
        /^(access_log|activity_log|error_log|system_log)/i,
        /^tbl_audit/i,
        /^hist_/i,
      ],
      columnPatterns: [
        /^(action|operation|change_type)$/i,
        /^(old_value|new_value|before|after)$/i,
        /^(changed_by|modified_by|user_id|actor)$/i,
        /^(changed_at|modified_at|timestamp)$/i,
        /^(table_name|entity_type|record_id)$/i,
      ],
      structurePatterns: [
        { check: (t) => t.columns?.some(c => /old|new|before|after/i.test(c.name)), weight: 0.4 },
        { check: (t) => t.columns?.some(c => /action|operation|change/i.test(c.name)), weight: 0.4 },
        { check: (t) => t.columns?.some(c => /timestamp|changed_at|modified_at/i.test(c.name)), weight: 0.3 },
        { check: (t) => t.columns?.some(c => /user|by|actor/i.test(c.name)), weight: 0.3 },
      ]
    },
    weight: 0.95
  },
  
  // CONFIG TABLES
  {
    archetype: 'config',
    patterns: {
      namePatterns: [
        /^(config|configuration|setting|preference|option)s?$/i,
        /^(sys_|system_|app_|application_)/i,
        /(config|configuration|setting)s?$/i,
        /^(parameter|property|feature|flag)/i,
        /^cfg_/i,
      ],
      columnPatterns: [
        /^(key|name|property|parameter)$/i,
        /^(value|setting|content)$/i,
        /^(environment|tenant|scope)$/i,
        /^(is_enabled|is_active|enabled)$/i,
      ],
      structurePatterns: [
        { check: (t) => t.columns?.some(c => /^key$/i.test(c.name)), weight: 0.4 },
        { check: (t) => t.columns?.some(c => /^value$/i.test(c.name)), weight: 0.4 },
        { check: (t) => (t.columns?.length ?? 0) <= 8, weight: 0.3 },
      ]
    },
    weight: 0.9
  },
  
  // REPORTING TABLES
  {
    archetype: 'reporting',
    patterns: {
      namePatterns: [
        /^(report|summary|aggregate|stats|metrics)/i,
        /^(fact|dim|dimension|measure)/i,
        /^(bi|dw|data_warehouse|mart)/i,
        /_(report|summary|aggregate)$/i,
        /^rpt_/i,
        /^mv_/i, // Materialized views
      ],
      columnPatterns: [
        /^(count|sum|avg|min|max|total)/i,
        /^(period|interval|granularity)/i,
        /^(dimension|measure|metric)/i,
      ],
      structurePatterns: [
        { check: (t) => (t.columns?.length ?? 0) >= 10, weight: 0.3 },
        { check: (t) => {
          const numericCols = t.columns?.filter(c => 
            /int|decimal|numeric|float|double|number/i.test(c.dataType)
          ).length ?? 0
          return numericCols >= 3
        }, weight: 0.3 },
      ]
    },
    weight: 0.85
  },
  
  // STAGING TABLES
  {
    archetype: 'staging',
    patterns: {
      namePatterns: [
        /^(stg|stage|staging|temp|tmp|import|export)/i,
        /^etl_/i,
        /_(staging|temp|tmp)$/i,
        /^zz_/i, // Often used for temp tables
      ],
      columnPatterns: [
        /^(raw_data|source|load_date|batch_id)$/i,
      ],
      structurePatterns: [
        { check: (t) => /temp|tmp|stage|stg|import|export/i.test(t.tableName), weight: 0.6 },
      ]
    },
    weight: 0.9
  }
]

// =============================================================================
// DETECTOR CLASS
// =============================================================================

export class TableArchetypeDetector {
  
  /**
   * Detect archetype for a single table
   */
  detect(table: TableStructure, domain?: BusinessDomain): ArchetypeDetectionResult {
    const scores: Map<TableArchetype, number> = new Map()
    const evidence: Map<TableArchetype, string[]> = new Map()
    
    // Initialize scores
    for (const pattern of ARCHETYPE_PATTERNS) {
      scores.set(pattern.archetype, 0)
      evidence.set(pattern.archetype, [])
    }
    
    // Score each archetype
    for (const pattern of ARCHETYPE_PATTERNS) {
      let score = 0
      const archetypeEvidence: string[] = []
      
      // Name pattern matching
      for (const namePattern of pattern.patterns.namePatterns) {
        if (namePattern.test(table.tableName)) {
          score += 0.4
          archetypeEvidence.push(`Table name matches pattern: ${namePattern.source}`)
        }
      }
      
      // Column pattern matching
      for (const columnPattern of pattern.patterns.columnPatterns) {
        for (const column of table.columns ?? []) {
          if (columnPattern.test(column.name)) {
            score += 0.1
            archetypeEvidence.push(`Column '${column.name}' matches pattern: ${columnPattern.source}`)
          }
        }
      }
      
      // Structure pattern matching
      for (const structurePattern of pattern.patterns.structurePatterns) {
        if (structurePattern.check(table)) {
          score += structurePattern.weight * 0.3
          archetypeEvidence.push(`Structure pattern matched`)
        }
      }
      
      // Apply archetype weight
      score *= pattern.weight
      
      scores.set(pattern.archetype, score)
      evidence.set(pattern.archetype, archetypeEvidence)
    }
    
    // Domain-specific adjustments
    if (domain) {
      const domainDef = DOMAIN_REGISTRY[domain]
      if (domainDef) {
        // Check if table matches domain patterns
        for (const tablePattern of domainDef.tablePatterns) {
          if (table.tableName.toLowerCase().includes(tablePattern.pattern.toLowerCase())) {
            const categoryScore = scores.get(tablePattern.category as TableArchetype) ?? 0
            scores.set(tablePattern.category as TableArchetype, categoryScore + 0.3)
            evidence.set(tablePattern.category as TableArchetype, [
              ...(evidence.get(tablePattern.category as TableArchetype) ?? []),
              `Domain pattern match: ${tablePattern.pattern} (${tablePattern.category})`
            ])
          }
        }
      }
    }
    
    // Find best archetype
    let bestArchetype: TableArchetype = 'master'
    let bestScore = 0
    let secondBestArchetype: TableArchetype | undefined
    let secondBestScore = 0
    
    for (const [archetype, score] of Array.from(scores)) {
      if (score > bestScore) {
        secondBestScore = bestScore
        secondBestArchetype = bestArchetype
        bestScore = score
        bestArchetype = archetype
      } else if (score > secondBestScore) {
        secondBestScore = score
        secondBestArchetype = archetype
      }
    }
    
    // Calculate confidence
    const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0)
    const confidence = totalScore > 0 ? Math.min(1, bestScore / totalScore) : 0
    
    // Get characteristics
    const characteristics = this.analyzeCharacteristics(table)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(bestArchetype, table, characteristics)
    
    return {
      tableName: table.tableName,
      archetype: bestArchetype,
      confidence,
      evidence: evidence.get(bestArchetype) ?? [],
      secondaryArchetype: secondBestScore > 0 && (bestScore - secondBestScore) < 0.2 
        ? secondBestArchetype 
        : undefined,
      characteristics,
      recommendations
    }
  }
  
  /**
   * Detect archetypes for multiple tables
   */
  detectAll(
    tables: TableStructure[], 
    domain?: BusinessDomain
  ): ArchetypeDetectionResult[] {
    return tables.map(t => this.detect(t, domain))
  }
  
  /**
   * Analyze table characteristics
   */
  private analyzeCharacteristics(table: TableStructure): ArchetypeDetectionResult['characteristics'] {
    const columns = table.columns ?? []
    const fks = table.foreignKeys ?? []
    
    return {
      hasPrimaryKey: (table.primaryKeys?.length ?? 0) > 0 || columns.some(c => c.isPrimaryKey),
      hasForeignKey: fks.length > 0 || columns.some(c => c.isForeignKey),
      isJunctionTable: fks.length >= 2 && columns.length <= 6,
      hasAuditColumns: columns.some(c => 
        /^(created_at|updated_at|created_by|updated_by|deleted_at)$/i.test(c.name)
      ),
      hasStatusColumn: columns.some(c => /^(status|state|phase|stage)$/i.test(c.name)),
      hasDateColumns: columns.some(c => 
        /^(date|time|datetime|timestamp|created_at|updated_at)$/i.test(c.name) ||
        /date|time/i.test(c.dataType)
      ),
      columnCount: columns.length,
      fkCount: fks.length
    }
  }
  
  /**
   * Generate recommendations based on archetype
   */
  private generateRecommendations(
    archetype: TableArchetype,
    table: TableStructure,
    characteristics: ArchetypeDetectionResult['characteristics']
  ): string[] {
    const recommendations: string[] = []
    
    // Master table recommendations
    if (archetype === 'master') {
      if (!characteristics.hasPrimaryKey) {
        recommendations.push('Add a primary key for proper entity identification')
      }
      if (!characteristics.hasAuditColumns) {
        recommendations.push('Consider adding audit columns (created_at, updated_at)')
      }
    }
    
    // Transaction table recommendations
    if (archetype === 'transaction') {
      if (!characteristics.hasDateColumns) {
        recommendations.push('Add a date/timestamp column for transaction tracking')
      }
      if (!characteristics.hasStatusColumn) {
        recommendations.push('Consider adding a status column for workflow tracking')
      }
    }
    
    // Lookup table recommendations
    if (archetype === 'lookup') {
      if (characteristics.columnCount > 10) {
        recommendations.push('Table has many columns; consider splitting if not truly a lookup')
      }
    }
    
    // Bridge table recommendations
    if (archetype === 'bridge') {
      if (!characteristics.hasPrimaryKey) {
        recommendations.push('Consider adding a composite primary key on FK columns')
      }
    }
    
    // Audit table recommendations
    if (archetype === 'audit') {
      if (!characteristics.hasDateColumns) {
        recommendations.push('Audit tables should have a timestamp column')
      }
    }
    
    // Common recommendations
    if (!characteristics.hasPrimaryKey && archetype !== 'bridge' && archetype !== 'staging') {
      recommendations.push('Consider adding a primary key for data integrity')
    }
    
    return recommendations
  }
  
  /**
   * Get archetype summary for a schema
   */
  getArchetypeSummary(results: ArchetypeDetectionResult[]): Record<TableArchetype, number> {
    const summary: Record<TableArchetype, number> = {
      master: 0,
      transaction: 0,
      lookup: 0,
      bridge: 0,
      audit: 0,
      config: 0,
      reporting: 0,
      staging: 0
    }
    
    for (const result of results) {
      summary[result.archetype]++
    }
    
    return summary
  }
  
  /**
   * Get tables by archetype
   */
  getTablesByArchetype(
    results: ArchetypeDetectionResult[]
  ): Record<TableArchetype, string[]> {
    const grouped: Record<TableArchetype, string[]> = {
      master: [],
      transaction: [],
      lookup: [],
      bridge: [],
      audit: [],
      config: [],
      reporting: [],
      staging: []
    }
    
    for (const result of results) {
      grouped[result.archetype].push(result.tableName)
    }
    
    return grouped
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const tableArchetypeDetector = new TableArchetypeDetector()

/**
 * Detect table archetype
 */
export function detectTableArchetype(
  table: TableStructure,
  domain?: BusinessDomain
): ArchetypeDetectionResult {
  return tableArchetypeDetector.detect(table, domain)
}

/**
 * Detect archetypes for multiple tables
 */
export function detectTableArchetypes(
  tables: TableStructure[],
  domain?: BusinessDomain
): ArchetypeDetectionResult[] {
  return tableArchetypeDetector.detectAll(tables, domain)
}
