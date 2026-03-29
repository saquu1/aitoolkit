/**
 * Domain Auto-Detection Engine
 * 
 * Automatically detects business domain from database schema analysis.
 * Supports Healthcare, ERP, CRM, E-Commerce, Education, Hospitality, Real Estate, Finance.
 * 
 * @module domain-intelligence/detector
 */

import { BusinessDomain, DomainDetectionResult, DomainScore, PatternMatch } from './base'
import { HEALTHCARE_DOMAIN } from './patterns/healthcare'
import { ERP_DOMAIN } from './patterns/erp'
import { CRM_DOMAIN } from './patterns/crm'
import { ECOMMERCE_DOMAIN } from './patterns/ecommerce'
import { findDomainMapping, detectDomainFromTables } from './unified-taxonomy'

// =============================================================================
// DOMAIN REGISTRY
// =============================================================================

const DOMAIN_REGISTRY = {
  healthcare: HEALTHCARE_DOMAIN,
  erp: ERP_DOMAIN,
  crm: CRM_DOMAIN,
  ecommerce: ECOMMERCE_DOMAIN,
}

// =============================================================================
// DOMAIN DETECTOR CLASS
// =============================================================================

export class DomainDetector {
  private domains: typeof DOMAIN_REGISTRY
  
  constructor() {
    this.domains = DOMAIN_REGISTRY
  }
  
  /**
   * Auto-detect domain from table and column metadata
   */
  detect(
    tables: Array<{
      tableName: string
      columns: Array<{ name: string; dataType: string }>
    }>,
    options?: {
      minConfidence?: number
      maxDomains?: number
    }
  ): DomainDetectionResult {
    const startTime = Date.now()
    const minConfidence = options?.minConfidence ?? 30
    const maxDomains = options?.maxDomains ?? 5
    
    const domainScores = this.calculateDomainScores(tables)
    const sortedDomains = domainScores.sort((a, b) => b.score - a.score)
    
    // Get primary domain
    const primary = sortedDomains[0]
    
    // Filter by confidence
    const confidentDomains = sortedDomains.filter(d => d.confidence * 100 >= minConfidence).slice(0, maxDomains)
    
    const stats = {
      tablesAnalyzed: tables.length,
      columnsAnalyzed: tables.reduce((sum, t) => sum + t.columns.length, 0),
      fksAnalyzed: 0,
      patternsMatched: primary?.evidence.length || 0,
      parseTimeMs: Date.now() - startTime
    }
    
    return {
      primaryDomain: primary?.domain || 'unknown',
      allDomains: confidentDomains,
      confidence: primary?.confidence || 0,
      method: 'pattern_matching',
      analyzedAt: new Date(),
      stats,
      warnings: this.generateWarnings(sortedDomains),
      recommendations: this.generateRecommendations(primary, tables)
    }
  }
  
  /**
   * Calculate scores for all domains
   */
  private calculateDomainScores(
    tables: Array<{ tableName: string; columns: Array<{ name: string; dataType: string }> }>
  ): DomainScore[] {
    const scores: DomainScore[] = []
    
    for (const [domainKey, domain] of Object.entries(this.domains)) {
      const score = this.scoreDomain(domainKey as BusinessDomain, domain, tables)
      scores.push(score)
    }
    
    // Add 'unknown' domain for unmatched schemas
    scores.push({
      domain: 'unknown',
      score: 0,
      confidence: 0,
      evidence: [],
      categoryBreakdown: {
        tables: 0,
        columns: 0,
        fks: 0,
        workflows: 0,
        sensitive: 0,
        keywords: 0
      }
    })
    
    return scores
  }
  
  /**
   * Score a single domain against the schema
   */
  private scoreDomain(
    domainName: BusinessDomain,
    domain: typeof HEALTHCARE_DOMAIN,
    tables: Array<{ tableName: string; columns: Array<{ name: string; dataType: string }> }>
  ): DomainScore {
    const evidence: PatternMatch[] = []
    let tableScore = 0
    let columnScore = 0
    let fkScore = 0
    let workflowScore = 0
    let sensitiveScore = 0
    let keywordScore = 0
    
    // Score tables
    for (const table of tables) {
      const tableName = table.tableName.toLowerCase()
      
      for (const pattern of domain.tablePatterns) {
        if (tableName.includes(pattern.pattern.toLowerCase())) {
          tableScore += pattern.weight
          evidence.push({
            pattern: pattern.pattern,
            matchedOn: table.tableName,
            score: pattern.weight,
            type: 'table',
            description: pattern.description
          })
        }
      }
      
      // Score columns
      for (const column of table.columns) {
        const columnName = column.name.toLowerCase()
        
        for (const colPattern of domain.columnPatterns) {
          const pattern = typeof colPattern.pattern === 'string' 
            ? colPattern.pattern.toLowerCase()
            : colPattern.pattern
            
          const isMatch = typeof pattern === 'string'
            ? columnName === pattern || columnName.includes(pattern)
            : pattern.test(column.name)
          
          if (isMatch) {
            columnScore += colPattern.weight
            evidence.push({
              pattern: String(colPattern.pattern),
              matchedOn: `${table.tableName}.${column.name}`,
              score: colPattern.weight,
              type: 'column',
              description: colPattern.description
            })
          }
        }
      }
    }
    
    // Score workflows
    for (const workflow of domain.workflows) {
      const matchingTable = tables.find(t => 
        (workflow.tableName instanceof RegExp) && workflow.tableName.test(t.tableName)
      )
      if (matchingTable) {
        workflowScore += workflow.weight
        evidence.push({
          pattern: workflow.name,
          matchedOn: matchingTable.tableName,
          score: workflow.weight,
          type: 'workflow',
          description: `Workflow: ${workflow.states.length} states`
        })
      }
    }
    
    // Calculate total score
    const weights = {
      tables: 0.35,
      columns: 0.25,
      fks: 0.15,
      workflows: 0.15,
      sensitive: 0.10
    }
    
    const totalScore = Math.round(
      tableScore * weights.tables +
      columnScore * weights.columns +
      fkScore * weights.fks +
      workflowScore * weights.workflows +
      sensitiveScore * weights.sensitive
    )
    
    // Calculate confidence (0-1)
    const maxPossibleScore = tables.length * 10 // Max score per table
    const confidence = maxPossibleScore > 0 ? Math.min(1, totalScore / maxPossibleScore) : 0
    
    return {
      domain: domainName,
      score: totalScore,
      confidence,
      evidence,
      categoryBreakdown: {
        tables: tableScore,
        columns: columnScore,
        fks: fkScore,
        workflows: workflowScore,
        sensitive: sensitiveScore,
        keywords: keywordScore
      }
    }
  }
  
  /**
   * Generate warnings based on analysis
   */
  private generateWarnings(sortedDomains: DomainScore[]): string[] {
    const warnings: string[] = []
    
    // Check for close scores (ambiguous domain)
    if (sortedDomains.length >= 2) {
      const diff = sortedDomains[0].score - sortedDomains[1].score
      if (diff < 5) {
        warnings.push(
          `Domain detection is ambiguous. "${sortedDomains[0].domain}" and "${sortedDomains[1].domain}" have similar scores.`
        )
      }
    }
    
    // Check for low confidence
    if (sortedDomains[0].confidence < 0.3) {
      warnings.push('Low confidence in domain detection. Schema may be generic or mixed-domain.')
    }
    
    return warnings
  }
  
  /**
   * Generate recommendations based on detected domain
   */
  private generateRecommendations(
    primary: DomainScore | undefined,
    tables: Array<{ tableName: string; columns: Array<{ name: string; dataType: string }> }>
  ): string[] {
    const recommendations: string[] = []
    
    if (!primary || primary.domain === 'unknown') {
      recommendations.push('Unable to determine domain. Consider adding more domain-specific tables or columns.')
      return recommendations
    }
    
    const domain = this.domains[primary.domain]
    if (!domain) return recommendations
    
    // Check for missing common tables
    const existingTables = new Set(tables.map(t => t.tableName.toLowerCase()))
    const commonTables = domain.tablePatterns
      .filter(p => p.weight >= 8)
      .map(p => p.pattern.toLowerCase())
    
    const missingTables = commonTables.filter(t => !existingTables.has(t))
    if (missingTables.length > 0 && missingTables.length <= 3) {
      recommendations.push(`Consider adding common ${domain.displayName} tables: ${missingTables.join(', ')}`)
    }
    
    // Check for sensitive data
    const sensitivePatterns = domain.sensitivePatterns
    const allColumns = tables.flatMap(t => t.columns.map(c => c.name.toLowerCase()))
    
    for (const sensitive of sensitivePatterns) {
      const found = allColumns.some(col => 
        sensitive.patterns.some(p => p.test(col))
      )
      if (found) {
        recommendations.push(
          `Found ${sensitive.name} data. Ensure ${sensitive.sensitivity} compliance.`
        )
      }
    }
    
    // Domain-specific recommendations
    if (primary.domain === 'healthcare') {
      recommendations.push('Ensure HIPAA compliance for PHI data handling.')
    } else if (primary.domain === 'ecommerce') {
      recommendations.push('Ensure PCI-DSS compliance for payment card data.')
    } else if (primary.domain === 'crm') {
      recommendations.push('Consider GDPR compliance for customer PII.')
    }
    
    return recommendations
  }
  
  /**
   * Get domain definition by name
   */
  getDomainDefinition(domainName: BusinessDomain) {
    return this.domains[domainName]
  }
  
  /**
   * Get all supported domains
   */
  getSupportedDomains(): BusinessDomain[] {
    return Object.keys(this.domains) as BusinessDomain[]
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick domain detection from table names
 */
export function detectDomain(tableNames: string[]): {
  domain: BusinessDomain
  confidence: number
} {
  const result = detectDomainFromTables(tableNames)
  return {
    domain: result.domain,
    confidence: result.confidence / 100
  }
}

/**
 * Get sensitive data patterns for a domain
 */
export function getSensitivePatterns(domain: BusinessDomain) {
  const domainDef = DOMAIN_REGISTRY[domain]
  return domainDef?.sensitivePatterns || []
}

/**
 * Get workflow patterns for a domain
 */
export function getWorkflowPatterns(domain: BusinessDomain) {
  const domainDef = DOMAIN_REGISTRY[domain]
  return domainDef?.workflows || []
}

/**
 * Check if a column name matches sensitive patterns
 */
export function isSensitiveColumn(
  columnName: string, 
  domain: BusinessDomain
): { isSensitive: boolean; pattern?: string; sensitivity?: string } {
  const patterns = getSensitivePatterns(domain)
  
  for (const pattern of patterns) {
    for (const regex of pattern.patterns) {
      if (regex.test(columnName)) {
        return {
          isSensitive: true,
          pattern: pattern.name,
          sensitivity: pattern.sensitivity
        }
      }
    }
  }
  
  return { isSensitive: false }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DOMAIN_REGISTRY }
export const domainDetector = new DomainDetector()
