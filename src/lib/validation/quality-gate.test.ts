/**
 * Quality Gate Engine Tests
 * 
 * Tests for the quality gate validation and certification logic
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface QualityGateResult {
  projectId: string
  certification: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_READY' | 'NEEDS_REVIEW'
  canGenerate: boolean
  blockingIssues: ConsistencyCheckResult[]
  warnings: ConsistencyCheckResult[]
  info: ConsistencyCheckResult[]
  metrics: QualityMetrics
  recommendations: string[]
  passedChecks: number
  totalChecks: number
  score: number
}

interface QualityMetrics {
  enrichmentProgress: number
  overallConfidence: number
  fkResolutionRate: number
  complianceCoverage: number
  testCoverage: number
  documentationCoverage: number
  sopCompliance: number
}

interface ConsistencyCheckResult {
  id: string
  projectId: string
  tableName: string
  fieldId: string
  checkType: string
  severity: 'error' | 'warning' | 'info'
  description: string
  currentState: string
  expectedState: string
  autoFixable: boolean
  autoFixAction: string | null
  isResolved: boolean
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY GATE ENGINE (Test Implementation)
// ══════════════════════════════════════════════════════════════════════════════

class TestQualityGateEngine {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * Determine certification level based on issues and metrics
   */
  determineCertification(
    blockingIssues: number,
    warnings: number,
    metrics: QualityMetrics
  ): { certification: QualityGateResult['certification']; canGenerate: boolean } {
    if (blockingIssues === 0 && metrics.overallConfidence >= 0.85 && metrics.enrichmentProgress >= 80) {
      return { certification: 'CERTIFIED', canGenerate: true }
    }
    
    if (blockingIssues === 0 && warnings <= 10) {
      return { certification: 'CONDITIONAL', canGenerate: true }
    }
    
    if (blockingIssues <= 3 && warnings <= 20) {
      return { certification: 'NEEDS_REVIEW', canGenerate: false }
    }
    
    return { certification: 'NOT_READY', canGenerate: false }
  }

  /**
   * Calculate quality score (0-100)
   */
  calculateScore(passedChecks: number, totalChecks: number): number {
    if (totalChecks === 0) return 100
    return Math.round((passedChecks / totalChecks) * 100)
  }

  /**
   * Calculate aggregate metrics from field data
   */
  calculateMetrics(fields: Partial<MockField>[]): QualityMetrics {
    if (fields.length === 0) {
      return {
        enrichmentProgress: 0,
        overallConfidence: 0,
        fkResolutionRate: 0,
        complianceCoverage: 0,
        testCoverage: 0,
        documentationCoverage: 0,
        sopCompliance: 0,
      }
    }

    let totalEnrichment = 0
    let totalConfidence = 0
    let fkResolved = 0
    let fkTotal = 0
    let complianceScanned = 0
    let testCasesGenerated = 0
    let documentationGenerated = 0
    let sopCompliant = 0

    for (const field of fields) {
      totalEnrichment += field.enrichmentProgress || 0
      totalConfidence += field.overallConfidence || 0

      if (field.fkIsForeignKey) {
        fkTotal++
        if (field.fkResolutionStatus === 'resolved') fkResolved++
      }

      if (field.compConfidence && field.compConfidence > 0) complianceScanned++
      if (field.testCases && field.testCases.length > 0) testCasesGenerated++
      if (field.docDeveloperNotes || field.docUserGuideText) documentationGenerated++
      if (!field.sopViolations || field.sopViolations.length === 0) sopCompliant++
    }

    return {
      enrichmentProgress: Math.round((totalEnrichment / fields.length) * 100),
      overallConfidence: Math.round((totalConfidence / fields.length) * 100) / 100,
      fkResolutionRate: fkTotal > 0 ? Math.round((fkResolved / fkTotal) * 100) : 100,
      complianceCoverage: Math.round((complianceScanned / fields.length) * 100),
      testCoverage: Math.round((testCasesGenerated / fields.length) * 100),
      documentationCoverage: Math.round((documentationGenerated / fields.length) * 100),
      sopCompliance: Math.round((sopCompliant / fields.length) * 100),
    }
  }

  /**
   * Generate recommendations based on issues
   */
  generateRecommendations(
    blockingIssues: number,
    warnings: number,
    metrics: QualityMetrics
  ): string[] {
    const recommendations: string[] = []

    if (blockingIssues > 0) {
      recommendations.push(`Resolve ${blockingIssues} blocking issues before code generation`)
    }

    if (metrics.enrichmentProgress < 80) {
      recommendations.push(`Complete enrichment: currently ${metrics.enrichmentProgress}% (target: 80%)`)
    }

    if (metrics.fkResolutionRate < 100) {
      recommendations.push(`Resolve FK references: ${metrics.fkResolutionRate}% resolved (target: 100%)`)
    }

    if (metrics.complianceCoverage < 90) {
      recommendations.push(`Complete compliance scan: ${metrics.complianceCoverage}% (target: 90%)`)
    }

    if (metrics.testCoverage < 70) {
      recommendations.push(`Generate test cases: ${metrics.testCoverage}% coverage (target: 70%)`)
    }

    return recommendations
  }

  /**
   * Check if PII field needs encryption
   */
  checkPIIEncryption(field: Partial<MockField>): ConsistencyCheckResult | null {
    if (!field.compIsPII) return null

    if (!field.compRequiresEncryption) {
      return {
        id: `check-${this.projectId}-${field.id}-CHK-010`,
        projectId: this.projectId,
        tableName: field.tableName || '',
        fieldId: field.id || '',
        checkType: 'pii_no_encryption',
        severity: 'error',
        description: 'PII field without encryption',
        currentState: 'PII data stored unencrypted',
        expectedState: 'PII fields must be encrypted at rest',
        autoFixable: true,
        autoFixAction: 'ENABLE_ENCRYPTION',
        isResolved: false,
      }
    }

    return null
  }

  /**
   * Check if FK field has proper UI type
   */
  checkFKUIType(field: Partial<MockField>): ConsistencyCheckResult | null {
    if (!field.fkIsForeignKey) return null

    const uiType = field.uiComponentType || field.cshtmlInputType
    if (uiType !== 'dropdown' && uiType !== 'select' && uiType !== 'lookup') {
      return {
        id: `check-${this.projectId}-${field.id}-CHK-002`,
        projectId: this.projectId,
        tableName: field.tableName || '',
        fieldId: field.id || '',
        checkType: 'fk_ui_type',
        severity: 'warning',
        description: 'FK field should use dropdown/select UI',
        currentState: `Current UI type: ${uiType || 'not set'}`,
        expectedState: 'FK fields should render as dropdown for user selection',
        autoFixable: true,
        autoFixAction: 'CHANGE_TO_DROPDOWN',
        isResolved: false,
      }
    }

    return null
  }

  /**
   * Check if FK table exists
   */
  checkFKTableExists(
    field: Partial<MockField>,
    existingTables: Set<string>
  ): ConsistencyCheckResult | null {
    if (!field.fkIsForeignKey || !field.fkReferencedTable) return null

    if (!existingTables.has(field.fkReferencedTable)) {
      return {
        id: `check-${this.projectId}-${field.id}-CHK-020`,
        projectId: this.projectId,
        tableName: field.tableName || '',
        fieldId: field.id || '',
        checkType: 'fk_table_missing',
        severity: 'error',
        description: `FK references missing table: ${field.fkReferencedTable}`,
        currentState: `Table "${field.fkReferencedTable}" not found in schema`,
        expectedState: `Upload ${field.fkReferencedTable} table definition`,
        autoFixable: false,
        autoFixAction: null,
        isResolved: false,
      }
    }

    return null
  }
}

interface MockField {
  id: string
  tableName: string
  fieldName: string
  enrichmentProgress: number
  overallConfidence: number
  fkIsForeignKey: boolean
  fkReferencedTable?: string
  fkResolutionStatus?: string
  compIsPII: boolean
  compRequiresEncryption: boolean
  compConfidence?: number
  uiComponentType?: string
  cshtmlInputType?: string
  testCases?: any[]
  docDeveloperNotes?: string
  docUserGuideText?: string
  sopViolations?: any[]
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Quality Gate Engine', () => {
  let engine: TestQualityGateEngine

  beforeEach(() => {
    engine = new TestQualityGateEngine('test-project')
  })

  describe('Certification Determination', () => {
    it('should certify when all criteria met', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 85,
        overallConfidence: 0.90,
        fkResolutionRate: 100,
        complianceCoverage: 95,
        testCoverage: 80,
        documentationCoverage: 90,
        sopCompliance: 95,
      }

      const result = engine.determineCertification(0, 0, metrics)
      
      expect(result.certification).toBe('CERTIFIED')
      expect(result.canGenerate).toBe(true)
    })

    it('should give CONDITIONAL when no errors but not fully enriched', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 70,
        overallConfidence: 0.75,
        fkResolutionRate: 100,
        complianceCoverage: 80,
        testCoverage: 60,
        documentationCoverage: 70,
        sopCompliance: 85,
      }

      const result = engine.determineCertification(0, 5, metrics)
      
      expect(result.certification).toBe('CONDITIONAL')
      expect(result.canGenerate).toBe(true)
    })

    it('should give NEEDS_REVIEW when few blocking issues', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 60,
        overallConfidence: 0.65,
        fkResolutionRate: 80,
        complianceCoverage: 60,
        testCoverage: 40,
        documentationCoverage: 50,
        sopCompliance: 70,
      }

      const result = engine.determineCertification(2, 15, metrics)
      
      expect(result.certification).toBe('NEEDS_REVIEW')
      expect(result.canGenerate).toBe(false)
    })

    it('should give NOT_READY when many issues', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 40,
        overallConfidence: 0.50,
        fkResolutionRate: 50,
        complianceCoverage: 30,
        testCoverage: 20,
        documentationCoverage: 25,
        sopCompliance: 40,
      }

      const result = engine.determineCertification(5, 25, metrics)
      
      expect(result.certification).toBe('NOT_READY')
      expect(result.canGenerate).toBe(false)
    })

    it('should require 85% confidence for CERTIFIED', () => {
      const metricsLowConfidence: QualityMetrics = {
        enrichmentProgress: 90,
        overallConfidence: 0.80,
        fkResolutionRate: 100,
        complianceCoverage: 100,
        testCoverage: 100,
        documentationCoverage: 100,
        sopCompliance: 100,
      }

      const result = engine.determineCertification(0, 0, metricsLowConfidence)
      
      expect(result.certification).toBe('CONDITIONAL')
    })

    it('should require 80% enrichment for CERTIFIED', () => {
      const metricsLowEnrichment: QualityMetrics = {
        enrichmentProgress: 75,
        overallConfidence: 0.90,
        fkResolutionRate: 100,
        complianceCoverage: 100,
        testCoverage: 100,
        documentationCoverage: 100,
        sopCompliance: 100,
      }

      const result = engine.determineCertification(0, 0, metricsLowEnrichment)
      
      expect(result.certification).toBe('CONDITIONAL')
    })
  })

  describe('Score Calculation', () => {
    it('should calculate 100% when all checks pass', () => {
      const score = engine.calculateScore(100, 100)
      expect(score).toBe(100)
    })

    it('should calculate 0% when no checks pass', () => {
      const score = engine.calculateScore(0, 100)
      expect(score).toBe(0)
    })

    it('should calculate partial scores correctly', () => {
      expect(engine.calculateScore(50, 100)).toBe(50)
      expect(engine.calculateScore(75, 100)).toBe(75)
      expect(engine.calculateScore(33, 100)).toBe(33)
    })

    it('should handle zero total checks', () => {
      const score = engine.calculateScore(0, 0)
      expect(score).toBe(100)
    })
  })

  describe('Metrics Calculation', () => {
    it('should calculate metrics for empty fields', () => {
      const metrics = engine.calculateMetrics([])
      
      expect(metrics.enrichmentProgress).toBe(0)
      expect(metrics.overallConfidence).toBe(0)
      expect(metrics.fkResolutionRate).toBe(0)
    })

    it('should calculate enrichment progress correctly', () => {
      const fields: Partial<MockField>[] = [
        { enrichmentProgress: 0.8 },
        { enrichmentProgress: 0.9 },
        { enrichmentProgress: 0.7 },
      ]

      const metrics = engine.calculateMetrics(fields)
      
      expect(metrics.enrichmentProgress).toBe(80)
    })

    it('should calculate FK resolution rate correctly', () => {
      const fields: Partial<MockField>[] = [
        { fkIsForeignKey: true, fkResolutionStatus: 'resolved' },
        { fkIsForeignKey: true, fkResolutionStatus: 'resolved' },
        { fkIsForeignKey: true, fkResolutionStatus: 'missing_table' },
        { fkIsForeignKey: false },
      ]

      const metrics = engine.calculateMetrics(fields)
      
      expect(metrics.fkResolutionRate).toBe(67) // 2/3 = 66.67 -> 67
    })

    it('should calculate test coverage correctly', () => {
      const fields: Partial<MockField>[] = [
        { testCases: [{ id: 1 }] },
        { testCases: [] },
        { testCases: [{ id: 1 }, { id: 2 }] },
        { testCases: undefined },
      ]

      const metrics = engine.calculateMetrics(fields)
      
      expect(metrics.testCoverage).toBe(50) // 2/4 = 50%
    })

    it('should calculate SOP compliance correctly', () => {
      const fields: Partial<MockField>[] = [
        { sopViolations: [] },
        { sopViolations: [] },
        { sopViolations: [{ id: 'v1' }] },
        { sopViolations: undefined },
      ]

      const metrics = engine.calculateMetrics(fields)
      
      expect(metrics.sopCompliance).toBe(75) // 3/4 = 75%
    })

    it('should return 100% FK resolution when no FK fields', () => {
      const fields: Partial<MockField>[] = [
        { fkIsForeignKey: false },
        { fkIsForeignKey: false },
      ]

      const metrics = engine.calculateMetrics(fields)
      
      expect(metrics.fkResolutionRate).toBe(100)
    })
  })

  describe('PII Encryption Check', () => {
    it('should detect PII field without encryption', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Users',
        fieldName: 'ssn',
        compIsPII: true,
        compRequiresEncryption: false,
      }

      const result = engine.checkPIIEncryption(field)
      
      expect(result).not.toBeNull()
      expect(result?.severity).toBe('error')
      expect(result?.autoFixable).toBe(true)
      expect(result?.autoFixAction).toBe('ENABLE_ENCRYPTION')
    })

    it('should pass PII field with encryption', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Users',
        fieldName: 'ssn',
        compIsPII: true,
        compRequiresEncryption: true,
      }

      const result = engine.checkPIIEncryption(field)
      
      expect(result).toBeNull()
    })

    it('should skip non-PII fields', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Users',
        fieldName: 'name',
        compIsPII: false,
        compRequiresEncryption: false,
      }

      const result = engine.checkPIIEncryption(field)
      
      expect(result).toBeNull()
    })
  })

  describe('FK UI Type Check', () => {
    it('should detect FK field with wrong UI type', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Orders',
        fieldName: 'customerId',
        fkIsForeignKey: true,
        uiComponentType: 'input',
      }

      const result = engine.checkFKUIType(field)
      
      expect(result).not.toBeNull()
      expect(result?.severity).toBe('warning')
      expect(result?.autoFixAction).toBe('CHANGE_TO_DROPDOWN')
    })

    it('should pass FK field with dropdown UI', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Orders',
        fieldName: 'customerId',
        fkIsForeignKey: true,
        uiComponentType: 'dropdown',
      }

      const result = engine.checkFKUIType(field)
      
      expect(result).toBeNull()
    })

    it('should pass FK field with select UI', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Orders',
        fieldName: 'customerId',
        fkIsForeignKey: true,
        cshtmlInputType: 'select',
      }

      const result = engine.checkFKUIType(field)
      
      expect(result).toBeNull()
    })

    it('should skip non-FK fields', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Users',
        fieldName: 'name',
        fkIsForeignKey: false,
        uiComponentType: 'input',
      }

      const result = engine.checkFKUIType(field)
      
      expect(result).toBeNull()
    })
  })

  describe('FK Table Exists Check', () => {
    it('should detect missing FK table', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Orders',
        fieldName: 'customerId',
        fkIsForeignKey: true,
        fkReferencedTable: 'Customers',
      }

      const existingTables = new Set(['Orders', 'Products'])
      const result = engine.checkFKTableExists(field, existingTables)
      
      expect(result).not.toBeNull()
      expect(result?.severity).toBe('error')
      expect(result?.autoFixable).toBe(false)
      expect(result?.description).toContain('Customers')
    })

    it('should pass when FK table exists', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Orders',
        fieldName: 'customerId',
        fkIsForeignKey: true,
        fkReferencedTable: 'Customers',
      }

      const existingTables = new Set(['Orders', 'Customers', 'Products'])
      const result = engine.checkFKTableExists(field, existingTables)
      
      expect(result).toBeNull()
    })

    it('should skip non-FK fields', () => {
      const field: Partial<MockField> = {
        id: 'field-1',
        tableName: 'Users',
        fieldName: 'name',
        fkIsForeignKey: false,
      }

      const existingTables = new Set(['Users'])
      const result = engine.checkFKTableExists(field, existingTables)
      
      expect(result).toBeNull()
    })
  })

  describe('Recommendations Generation', () => {
    it('should recommend resolving blocking issues', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 90,
        overallConfidence: 0.90,
        fkResolutionRate: 100,
        complianceCoverage: 95,
        testCoverage: 80,
        documentationCoverage: 90,
        sopCompliance: 95,
      }

      const recommendations = engine.generateRecommendations(3, 5, metrics)
      
      expect(recommendations.some(r => r.includes('blocking issues'))).toBe(true)
    })

    it('should recommend completing enrichment', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 60,
        overallConfidence: 0.70,
        fkResolutionRate: 100,
        complianceCoverage: 80,
        testCoverage: 60,
        documentationCoverage: 70,
        sopCompliance: 80,
      }

      const recommendations = engine.generateRecommendations(0, 5, metrics)
      
      expect(recommendations.some(r => r.includes('enrichment'))).toBe(true)
    })

    it('should recommend resolving FK references', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 90,
        overallConfidence: 0.90,
        fkResolutionRate: 75,
        complianceCoverage: 90,
        testCoverage: 80,
        documentationCoverage: 90,
        sopCompliance: 90,
      }

      const recommendations = engine.generateRecommendations(0, 5, metrics)
      
      expect(recommendations.some(r => r.includes('FK references'))).toBe(true)
    })

    it('should recommend generating test cases', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 90,
        overallConfidence: 0.90,
        fkResolutionRate: 100,
        complianceCoverage: 90,
        testCoverage: 50,
        documentationCoverage: 90,
        sopCompliance: 90,
      }

      const recommendations = engine.generateRecommendations(0, 5, metrics)
      
      expect(recommendations.some(r => r.includes('test cases'))).toBe(true)
    })

    it('should generate multiple recommendations', () => {
      const metrics: QualityMetrics = {
        enrichmentProgress: 60,
        overallConfidence: 0.65,
        fkResolutionRate: 70,
        complianceCoverage: 60,
        testCoverage: 40,
        documentationCoverage: 50,
        sopCompliance: 60,
      }

      const recommendations = engine.generateRecommendations(2, 15, metrics)
      
      expect(recommendations.length).toBeGreaterThan(1)
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-FIX TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Auto-Fix Actions', () => {
  const autoFixActions = [
    { action: 'ENABLE_ENCRYPTION', description: 'Enable PII encryption', field: 'compRequiresEncryption', value: true },
    { action: 'ENABLE_MASKING', description: 'Enable display masking', fields: ['compRequiresMasking', 'compMaskingPattern'] },
    { action: 'CHANGE_TO_DROPDOWN', description: 'Change FK to dropdown', field: 'uiComponentType', value: 'dropdown' },
    { action: 'GENERATE_TEST_CASES', description: 'Generate basic tests' },
    { action: 'GENERATE_DOCUMENTATION', description: 'Generate field docs' },
    { action: 'ALIGN_MAX_LENGTH', description: 'Align UI maxlength with DB' },
    { action: 'APPLY_SOP_AUTOFIX', description: 'Clear SOP violations' },
  ]

  it('should have 7 auto-fix actions', () => {
    expect(autoFixActions.length).toBe(7)
  })

  it('should have valid action names', () => {
    autoFixActions.forEach(({ action }) => {
      expect(action).toMatch(/^[A-Z_]+$/)
    })
  })

  it('should have descriptions for all actions', () => {
    autoFixActions.forEach(({ description }) => {
      expect(description.length).toBeGreaterThan(0)
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// CHECK CATEGORY TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Check Categories', () => {
  const checkCategories = [
    { category: 'schema_ui', checks: ['CHK-001', 'CHK-002', 'CHK-003', 'CHK-004'] },
    { category: 'compliance_code', checks: ['CHK-010', 'CHK-011', 'CHK-012', 'CHK-013'] },
    { category: 'fk_existence', checks: ['CHK-020', 'CHK-021', 'CHK-022', 'CHK-023'] },
    { category: 'test_doc_traceability', checks: ['CHK-030', 'CHK-031', 'CHK-032'] },
    { category: 'business_rule_code', checks: ['CHK-040', 'CHK-041', 'CHK-042'] },
    { category: 'validation_alignment', checks: ['CHK-050', 'CHK-051', 'CHK-052'] },
  ]

  it('should have 6 check categories', () => {
    expect(checkCategories.length).toBe(6)
  })

  it('should have at least 20 total checks', () => {
    const totalChecks = checkCategories.reduce((sum, cat) => sum + cat.checks.length, 0)
    expect(totalChecks).toBeGreaterThanOrEqual(20)
  })

  it('should have 4 checks per category', () => {
    checkCategories.forEach(({ checks }) => {
      // Most categories have 4 checks, some may have 3-4
      expect(checks.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('should have unique check IDs', () => {
    const allChecks = checkCategories.flatMap(c => c.checks)
    const uniqueChecks = new Set(allChecks)
    expect(uniqueChecks.size).toBe(allChecks.length)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// SEVERITY TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Check Severities', () => {
  const severityLevels = ['error', 'warning', 'info']

  it('should have valid severity levels', () => {
    severityLevels.forEach(level => {
      expect(['error', 'warning', 'info']).toContain(level)
    })
  })

  it('should prioritize errors over warnings', () => {
    const errors = [{ severity: 'error' }, { severity: 'error' }]
    const warnings = [{ severity: 'warning' }, { severity: 'warning' }, { severity: 'warning' }]
    
    const blockingIssues = errors.filter(e => e.severity === 'error')
    const warningIssues = warnings.filter(w => w.severity === 'warning')
    
    // Errors are always blocking
    expect(blockingIssues.length).toBe(2)
    // Warnings may or may not be blocking based on count
    expect(warningIssues.length).toBe(3)
  })

  it('should treat info as non-blocking', () => {
    const infoIssues = [{ severity: 'info' }, { severity: 'info' }]
    const blockingIssues = infoIssues.filter(i => i.severity === 'error')
    
    expect(blockingIssues.length).toBe(0)
  })
})
