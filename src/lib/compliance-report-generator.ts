// =============================================================================
// Compliance Report Generator - HIPAA/GDPR/PCI-DSS Compliance Reports
// =============================================================================

import { PIIPhidDetector, type PIIDetectionResult, type ComplianceFramework } from './pii-phi-detector'
import type { ColumnDef, TableDef } from './types'

/**
 * Compliance Report
 */
export interface ComplianceReport {
  reportId: string
  generatedAt: Date
  projectName: string
  summary: ComplianceSummary
  frameworks: FrameworkReport[]
  tables: TableComplianceReport[]
  recommendations: ComplianceRecommendation[]
  riskScore: number // 0-100
  complianceStatus: 'compliant' | 'partial' | 'non_compliant'
}

/**
 * Compliance Summary
 */
export interface ComplianceSummary {
  totalTables: number
  totalColumns: number
  phiColumns: number
  piiColumns: number
  secretColumns: number
  confidentialColumns: number
  encryptionRequired: number
  auditRequired: number
  maskingRequired: number
}

/**
 * Framework Report
 */
export interface FrameworkReport {
  framework: ComplianceFramework
  applicableColumns: number
  complianceScore: number // 0-100
  requirements: RequirementStatus[]
  status: 'compliant' | 'partial' | 'non_compliant'
}

/**
 * Requirement Status
 */
export interface RequirementStatus {
  requirement: string
  description: string
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable'
  details: string
  affectedColumns: string[]
  remediation?: string
}

/**
 * Table Compliance Report
 */
export interface TableComplianceReport {
  tableName: string
  totalColumns: number
  sensitivityBreakdown: Record<string, number>
  columns: ColumnComplianceReport[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  frameworks: ComplianceFramework[]
  recommendations: string[]
}

/**
 * Column Compliance Report
 */
export interface ColumnComplianceReport {
  columnName: string
  dataType: string
  sensitivity: string
  category: string
  frameworks: ComplianceFramework[]
  encryptionRequired: boolean
  auditRequired: boolean
  maskingStrategy: string | null
  recommendations: string[]
}

/**
 * Compliance Recommendation
 */
export interface ComplianceRecommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'encryption' | 'access_control' | 'audit' | 'masking' | 'data_retention' | 'consent'
  title: string
  description: string
  affectedColumns: string[]
  frameworks: ComplianceFramework[]
  estimatedEffort: string
  autoRemediate: boolean
}

/**
 * Compliance Report Generator
 * Generates comprehensive compliance reports for healthcare applications
 */
export class ComplianceReportGenerator {
  private piiDetector: PIIPhidDetector

  constructor() {
    this.piiDetector = new PIIPhidDetector()
  }

  /**
   * Generate a full compliance report
   */
  generateReport(tables: TableDef[], projectName: string = 'Schema Analysis'): ComplianceReport {
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const generatedAt = new Date()

    // Analyze all tables
    const tableReports = this.analyzeTables(tables)

    // Calculate summary
    const summary = this.calculateSummary(tableReports)

    // Generate framework reports
    const frameworks = this.generateFrameworkReports(tableReports)

    // Generate recommendations
    const recommendations = this.generateRecommendations(tableReports)

    // Calculate risk score
    const riskScore = this.calculateRiskScore(summary, tableReports)

    // Determine compliance status
    const complianceStatus = this.determineComplianceStatus(riskScore, frameworks)

    return {
      reportId,
      generatedAt,
      projectName,
      summary,
      frameworks,
      tables: tableReports,
      recommendations,
      riskScore,
      complianceStatus
    }
  }

  /**
   * Analyze all tables
   */
  private analyzeTables(tables: TableDef[]): TableComplianceReport[] {
    return tables.map(table => this.analyzeTable(table))
  }

  /**
   * Analyze a single table
   */
  private analyzeTable(table: TableDef): TableComplianceReport {
    const columnReports = table.columns.map(col => this.analyzeColumn(col, table.tableName))
    const piiResults = table.columns.map(col => this.piiDetector.detect(col, table.tableName))
    const complianceSummary = this.piiDetector.getComplianceSummary(piiResults)

    const sensitivityBreakdown: Record<string, number> = {
      secret: 0,
      phi: 0,
      pii: 0,
      confidential: 0,
      internal: 0,
      public: 0
    }

    piiResults.forEach(r => {
      sensitivityBreakdown[r.sensitivity] = (sensitivityBreakdown[r.sensitivity] || 0) + 1
    })

    // Collect unique recommendations
    const recommendations = [...new Set(
      piiResults.flatMap(r => r.recommendations)
    )].slice(0, 5)

    return {
      tableName: table.tableName,
      totalColumns: table.columns.length,
      sensitivityBreakdown,
      columns: columnReports,
      riskLevel: complianceSummary.riskLevel,
      frameworks: [...new Set(piiResults.flatMap(r => r.complianceFrameworks))] as ComplianceFramework[],
      recommendations
    }
  }

  /**
   * Analyze a single column
   */
  private analyzeColumn(column: ColumnDef, tableName: string): ColumnComplianceReport {
    const piiResult = this.piiDetector.detect(column, tableName)

    return {
      columnName: column.name,
      dataType: column.dataType,
      sensitivity: piiResult.sensitivity,
      category: piiResult.category,
      frameworks: piiResult.complianceFrameworks,
      encryptionRequired: piiResult.encryptionRequired,
      auditRequired: piiResult.auditRequired,
      maskingStrategy: piiResult.maskingStrategy || null,
      recommendations: piiResult.recommendations
    }
  }

  /**
   * Calculate overall summary
   */
  private calculateSummary(tableReports: TableComplianceReport[]): ComplianceSummary {
    let totalColumns = 0
    let phiColumns = 0
    let piiColumns = 0
    let secretColumns = 0
    let confidentialColumns = 0
    let encryptionRequired = 0
    let auditRequired = 0
    let maskingRequired = 0

    tableReports.forEach(table => {
      totalColumns += table.totalColumns
      phiColumns += table.sensitivityBreakdown.phi || 0
      piiColumns += table.sensitivityBreakdown.pii || 0
      secretColumns += table.sensitivityBreakdown.secret || 0
      confidentialColumns += table.sensitivityBreakdown.confidential || 0

      table.columns.forEach(col => {
        if (col.encryptionRequired) encryptionRequired++
        if (col.auditRequired) auditRequired++
        if (col.maskingStrategy) maskingRequired++
      })
    })

    return {
      totalTables: tableReports.length,
      totalColumns,
      phiColumns,
      piiColumns,
      secretColumns,
      confidentialColumns,
      encryptionRequired,
      auditRequired,
      maskingRequired
    }
  }

  /**
   * Generate framework-specific reports
   */
  private generateFrameworkReports(tableReports: TableComplianceReport[]): FrameworkReport[] {
    const frameworks: ComplianceFramework[] = ['HIPAA', 'GDPR', 'PCI-DSS', 'SOX']
    
    return frameworks.map(framework => this.generateFrameworkReport(framework, tableReports))
  }

  /**
   * Generate report for a specific framework
   */
  private generateFrameworkReport(framework: ComplianceFramework, tableReports: TableComplianceReport[]): FrameworkReport {
    // Find columns applicable to this framework
    let applicableColumns = 0
    const affectedColumnNames: string[] = []

    tableReports.forEach(table => {
      table.columns.forEach(col => {
        if (col.frameworks.includes(framework)) {
          applicableColumns++
          affectedColumnNames.push(`${table.tableName}.${col.columnName}`)
        }
      })
    })

    // Generate requirements based on framework
    const requirements = this.getFrameworkRequirements(framework, tableReports)
    
    // Calculate compliance score
    const compliantCount = requirements.filter(r => r.status === 'compliant').length
    const partialCount = requirements.filter(r => r.status === 'partial').length
    const complianceScore = Math.round(
      ((compliantCount * 100) + (partialCount * 50)) / requirements.length
    )

    // Determine status
    let status: 'compliant' | 'partial' | 'non_compliant' = 'compliant'
    if (complianceScore < 50) {
      status = 'non_compliant'
    } else if (complianceScore < 80) {
      status = 'partial'
    }

    return {
      framework,
      applicableColumns,
      complianceScore,
      requirements,
      status
    }
  }

  /**
   * Get framework-specific requirements
   */
  private getFrameworkRequirements(framework: ComplianceFramework, tableReports: TableComplianceReport[]): RequirementStatus[] {
    switch (framework) {
      case 'HIPAA':
        return this.getHIPAARequirements(tableReports)
      case 'GDPR':
        return this.getGDPRRequirements(tableReports)
      case 'PCI-DSS':
        return this.getPCIDSSRequirements(tableReports)
      case 'SOX':
        return this.getSOXRequirements(tableReports)
      default:
        return []
    }
  }

  /**
   * HIPAA Requirements
   */
  private getHIPAARequirements(tableReports: TableComplianceReport[]): RequirementStatus[] {
    const phiColumns = tableReports.flatMap(t => 
      t.columns.filter(c => c.sensitivity === 'phi').map(c => `${t.tableName}.${c.columnName}`)
    )
    const phiTables = tableReports.filter(t => t.sensitivityBreakdown.phi > 0)

    return [
      {
        requirement: 'Encryption at Rest',
        description: 'PHI must be encrypted when stored (45 CFR § 164.312(a)(2)(iv))',
        status: phiColumns.length > 0 ? 'partial' : 'compliant',
        details: phiColumns.length > 0 
          ? `${phiColumns.length} PHI columns require encryption at rest`
          : 'No PHI columns detected',
        affectedColumns: phiColumns,
        remediation: phiColumns.length > 0 
          ? 'Implement AES-256 encryption for all PHI columns' 
          : undefined
      },
      {
        requirement: 'Encryption in Transit',
        description: 'PHI must be encrypted during transmission (45 CFR § 164.312(e)(1))',
        status: 'partial',
        details: 'Ensure all API endpoints use TLS 1.2 or higher',
        affectedColumns: phiColumns,
        remediation: 'Configure HTTPS for all endpoints handling PHI'
      },
      {
        requirement: 'Access Controls',
        description: 'Implement role-based access control for PHI (45 CFR § 164.312(a)(1))',
        status: phiColumns.length > 0 ? 'partial' : 'compliant',
        details: 'RBAC must be implemented for all PHI access',
        affectedColumns: phiColumns,
        remediation: 'Implement RBAC with minimum necessary principle'
      },
      {
        requirement: 'Audit Controls',
        description: 'Implement audit logging for PHI access (45 CFR § 164.312(b))',
        status: phiColumns.length > 0 ? 'partial' : 'compliant',
        details: 'All access to PHI must be logged',
        affectedColumns: phiColumns,
        remediation: 'Implement comprehensive audit logging'
      },
      {
        requirement: 'Integrity Controls',
        description: 'Protect PHI from improper alteration or destruction (45 CFR § 164.312(c)(1))',
        status: 'partial',
        details: 'Implement data validation and integrity checks',
        affectedColumns: phiColumns,
        remediation: 'Add data validation and checksums for PHI'
      },
      {
        requirement: 'Minimum Necessary',
        description: 'Limit PHI access to minimum necessary for task (45 CFR § 164.502(b))',
        status: 'partial',
        details: 'Implement field-level access controls',
        affectedColumns: phiColumns,
        remediation: 'Implement column-level permissions'
      },
      {
        requirement: 'Data Masking',
        description: 'Mask PHI in non-clinical views',
        status: 'partial',
        details: 'PHI should be masked when displayed in lists or reports',
        affectedColumns: phiColumns,
        remediation: 'Implement data masking strategies (partial mask, redaction)'
      }
    ]
  }

  /**
   * GDPR Requirements
   */
  private getGDPRRequirements(tableReports: TableComplianceReport[]): RequirementStatus[] {
    const piiColumns = tableReports.flatMap(t => 
      t.columns.filter(c => c.sensitivity === 'pii' || c.sensitivity === 'phi').map(c => `${t.tableName}.${c.columnName}`)
    )

    return [
      {
        requirement: 'Data Minimization',
        description: 'Collect only necessary personal data (Art. 5(1)(c))',
        status: 'partial',
        details: 'Review all PII columns for necessity',
        affectedColumns: piiColumns,
        remediation: 'Conduct data minimization audit'
      },
      {
        requirement: 'Right to Access',
        description: 'Allow data subjects to access their data (Art. 15)',
        status: 'partial',
        details: 'Implement data export functionality',
        affectedColumns: piiColumns,
        remediation: 'Build user data export feature'
      },
      {
        requirement: 'Right to Erasure',
        description: 'Allow data subjects to request deletion (Art. 17)',
        status: 'partial',
        details: 'Implement data deletion with cascading',
        affectedColumns: piiColumns,
        remediation: 'Build user data deletion feature with FK handling'
      },
      {
        requirement: 'Data Portability',
        description: 'Allow data to be transferred (Art. 20)',
        status: 'partial',
        details: 'Implement standardized data export (JSON, CSV)',
        affectedColumns: piiColumns,
        remediation: 'Build data portability API'
      },
      {
        requirement: 'Consent Management',
        description: 'Track and manage consent (Art. 7)',
        status: 'non_compliant',
        details: 'Consent tracking tables not detected',
        affectedColumns: [],
        remediation: 'Add ConsentRecords table and management UI'
      },
      {
        requirement: 'Breach Notification',
        description: 'Notify authorities within 72 hours (Art. 33)',
        status: 'partial',
        details: 'Implement breach detection and notification workflow',
        affectedColumns: piiColumns,
        remediation: 'Build breach notification system'
      }
    ]
  }

  /**
   * PCI-DSS Requirements
   */
  private getPCIDSSRequirements(tableReports: TableComplianceReport[]): RequirementStatus[] {
    const financialColumns = tableReports.flatMap(t => 
      t.columns.filter(c => c.sensitivity === 'confidential' && c.category === 'financial').map(c => `${t.tableName}.${c.columnName}`)
    )

    return [
      {
        requirement: 'Cardholder Data Protection',
        description: 'Protect stored cardholder data (Req. 3)',
        status: financialColumns.length > 0 ? 'non_compliant' : 'compliant',
        details: financialColumns.length > 0 
          ? 'Financial columns detected - verify no card numbers stored'
          : 'No cardholder data columns detected',
        affectedColumns: financialColumns,
        remediation: 'Use tokenization instead of storing card numbers'
      },
      {
        requirement: 'Encrypt Transmission',
        description: 'Encrypt cardholder data in transit (Req. 4)',
        status: 'partial',
        details: 'Ensure TLS 1.2+ for all financial data transmission',
        affectedColumns: financialColumns,
        remediation: 'Configure secure payment gateway integration'
      },
      {
        requirement: 'Access Control',
        description: 'Restrict access to cardholder data (Req. 7)',
        status: financialColumns.length > 0 ? 'partial' : 'compliant',
        details: 'Implement need-to-know access for financial data',
        affectedColumns: financialColumns,
        remediation: 'Implement role-based access for financial data'
      },
      {
        requirement: 'Audit Logging',
        description: 'Track all access to cardholder data (Req. 10)',
        status: financialColumns.length > 0 ? 'partial' : 'compliant',
        details: 'Log all access to financial columns',
        affectedColumns: financialColumns,
        remediation: 'Implement comprehensive audit logging'
      }
    ]
  }

  /**
   * SOX Requirements
   */
  private getSOXRequirements(tableReports: TableComplianceReport[]): RequirementStatus[] {
    const financialColumns = tableReports.flatMap(t => 
      t.columns.filter(c => c.sensitivity === 'confidential').map(c => `${t.tableName}.${c.columnName}`)
    )

    return [
      {
        requirement: 'Internal Controls',
        description: 'Implement internal controls for financial reporting (Section 404)',
        status: 'partial',
        details: 'Financial data requires controlled access and audit trail',
        affectedColumns: financialColumns,
        remediation: 'Implement segregation of duties for financial data'
      },
      {
        requirement: 'Audit Trail',
        description: 'Maintain complete audit trail for financial data',
        status: 'partial',
        details: 'All changes to financial data must be logged',
        affectedColumns: financialColumns,
        remediation: 'Implement comprehensive change logging'
      },
      {
        requirement: 'Data Integrity',
        description: 'Ensure accuracy and completeness of financial data',
        status: 'partial',
        details: 'Implement validation and reconciliation processes',
        affectedColumns: financialColumns,
        remediation: 'Add data validation and reconciliation jobs'
      }
    ]
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(tableReports: TableComplianceReport[]): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = []
    let id = 1

    // Collect all columns with issues
    const phiColumns: string[] = []
    const piiColumns: string[] = []
    const secretColumns: string[] = []
    const encryptColumns: string[] = []
    const auditColumns: string[] = []

    tableReports.forEach(table => {
      table.columns.forEach(col => {
        const fullName = `${table.tableName}.${col.columnName}`
        if (col.sensitivity === 'phi') phiColumns.push(fullName)
        if (col.sensitivity === 'pii') piiColumns.push(fullName)
        if (col.sensitivity === 'secret') secretColumns.push(fullName)
        if (col.encryptionRequired) encryptColumns.push(fullName)
        if (col.auditRequired) auditColumns.push(fullName)
      })
    })

    // Critical: Secret data handling
    if (secretColumns.length > 0) {
      recommendations.push({
        id: `REC-${id++}`,
        priority: 'critical',
        category: 'encryption',
        title: 'Implement Secure Password/Secret Storage',
        description: 'Secret fields (passwords, tokens) must be hashed using secure algorithms like bcrypt or Argon2. Never store plaintext secrets.',
        affectedColumns: secretColumns,
        frameworks: ['HIPAA', 'GDPR', 'PCI-DSS'],
        estimatedEffort: '2-4 hours',
        autoRemediate: false
      })
    }

    // Critical: Encryption for PHI
    if (encryptColumns.length > 0) {
      recommendations.push({
        id: `REC-${id++}`,
        priority: 'critical',
        category: 'encryption',
        title: 'Implement Column-Level Encryption',
        description: 'Sensitive columns require encryption at rest. Use AES-256 encryption with proper key management.',
        affectedColumns: encryptColumns,
        frameworks: ['HIPAA', 'PCI-DSS'],
        estimatedEffort: '4-8 hours',
        autoRemediate: true
      })
    }

    // High: Audit logging
    if (auditColumns.length > 0) {
      recommendations.push({
        id: `REC-${id++}`,
        priority: 'high',
        category: 'audit',
        title: 'Implement Comprehensive Audit Logging',
        description: 'All access to sensitive data must be logged for compliance. Include user ID, timestamp, action, and affected data.',
        affectedColumns: auditColumns,
        frameworks: ['HIPAA', 'GDPR', 'SOX'],
        estimatedEffort: '8-16 hours',
        autoRemediate: true
      })
    }

    // High: Data masking
    if (phiColumns.length > 0 || piiColumns.length > 0) {
      recommendations.push({
        id: `REC-${id++}`,
        priority: 'high',
        category: 'masking',
        title: 'Implement Data Masking for PII/PHI',
        description: 'Sensitive data should be masked in list views and non-clinical reports. Use partial masking or redaction strategies.',
        affectedColumns: [...phiColumns, ...piiColumns],
        frameworks: ['HIPAA', 'GDPR'],
        estimatedEffort: '4-8 hours',
        autoRemediate: true
      })
    }

    // High: Access control
    if (phiColumns.length > 0) {
      recommendations.push({
        id: `REC-${id++}`,
        priority: 'high',
        category: 'access_control',
        title: 'Implement Role-Based Access Control for PHI',
        description: 'PHI access must be restricted based on user roles. Implement minimum necessary principle and break-the-glass for emergencies.',
        affectedColumns: phiColumns,
        frameworks: ['HIPAA'],
        estimatedEffort: '16-24 hours',
        autoRemediate: false
      })
    }

    // Medium: Consent management for GDPR
    recommendations.push({
      id: `REC-${id++}`,
      priority: 'medium',
      category: 'consent',
      title: 'Implement Consent Management System',
      description: 'GDPR requires tracking user consent for data processing. Add consent records table and management interface.',
      affectedColumns: [...piiColumns, ...phiColumns],
      frameworks: ['GDPR'],
      estimatedEffort: '8-16 hours',
      autoRemediate: false
    })

    // Medium: Data retention
    if (phiColumns.length > 0 || piiColumns.length > 0) {
      recommendations.push({
        id: `REC-${id++}`,
        priority: 'medium',
        category: 'data_retention',
        title: 'Implement Data Retention Policies',
        description: 'Define and implement data retention policies. Automatically archive or delete data past retention period.',
        affectedColumns: [...phiColumns, ...piiColumns],
        frameworks: ['HIPAA', 'GDPR'],
        estimatedEffort: '8-16 hours',
        autoRemediate: false
      })
    }

    return recommendations
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(summary: ComplianceSummary, tableReports: TableComplianceReport[]): number {
    let score = 0

    // Critical risk factors
    score += summary.secretColumns * 30  // Secrets are critical
    score += summary.phiColumns * 20      // PHI is high risk
    score += summary.piiColumns * 10      // PII is medium risk
    score += summary.confidentialColumns * 5  // Confidential is lower risk

    // Missing controls increase risk
    score += summary.encryptionRequired * 5
    score += summary.auditRequired * 3

    // Risk level of tables
    tableReports.forEach(table => {
      if (table.riskLevel === 'critical') score += 20
      else if (table.riskLevel === 'high') score += 10
      else if (table.riskLevel === 'medium') score += 5
    })

    // Cap at 100
    return Math.min(score, 100)
  }

  /**
   * Determine overall compliance status
   */
  private determineComplianceStatus(riskScore: number, frameworks: FrameworkReport[]): 'compliant' | 'partial' | 'non_compliant' {
    // If any framework is non-compliant, overall is non-compliant
    if (frameworks.some(f => f.status === 'non_compliant')) {
      return 'non_compliant'
    }

    // If risk score is too high, non-compliant
    if (riskScore >= 70) {
      return 'non_compliant'
    }

    // If any framework is partial, overall is partial
    if (frameworks.some(f => f.status === 'partial')) {
      return 'partial'
    }

    return 'compliant'
  }

  /**
   * Export report as JSON
   */
  exportAsJSON(report: ComplianceReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Export report as Markdown
   */
  exportAsMarkdown(report: ComplianceReport): string {
    const md: string[] = []

    md.push(`# Compliance Report`)
    md.push(``)
    md.push(`**Report ID:** ${report.reportId}`)
    md.push(`**Generated:** ${report.generatedAt.toISOString()}`)
    md.push(`**Project:** ${report.projectName}`)
    md.push(`**Risk Score:** ${report.riskScore}/100`)
    md.push(`**Status:** ${report.complianceStatus.toUpperCase()}`)
    md.push(``)

    // Summary
    md.push(`## Summary`)
    md.push(``)
    md.push(`| Metric | Count |`)
    md.push(`|--------|-------|`)
    md.push(`| Total Tables | ${report.summary.totalTables} |`)
    md.push(`| Total Columns | ${report.summary.totalColumns} |`)
    md.push(`| 🔴 PHI Columns | ${report.summary.phiColumns} |`)
    md.push(`| 🟡 PII Columns | ${report.summary.piiColumns} |`)
    md.push(`| 🔴 Secret Columns | ${report.summary.secretColumns} |`)
    md.push(`| Encryption Required | ${report.summary.encryptionRequired} |`)
    md.push(`| Audit Required | ${report.summary.auditRequired} |`)
    md.push(``)

    // Frameworks
    md.push(`## Framework Compliance`)
    md.push(``)
    for (const fw of report.frameworks) {
      md.push(`### ${fw.framework}`)
      md.push(``)
      md.push(`**Score:** ${fw.complianceScore}% (${fw.status})`)
      md.push(`**Applicable Columns:** ${fw.applicableColumns}`)
      md.push(``)
      md.push(`| Requirement | Status | Details |`)
      md.push(`|-------------|--------|---------|`)
      for (const req of fw.requirements) {
        md.push(`| ${req.requirement} | ${req.status} | ${req.details} |`)
      }
      md.push(``)
    }

    // Recommendations
    md.push(`## Recommendations`)
    md.push(``)
    for (const rec of report.recommendations) {
      md.push(`### ${rec.id}: ${rec.title}`)
      md.push(``)
      md.push(`**Priority:** ${rec.priority.toUpperCase()}`)
      md.push(`**Category:** ${rec.category}`)
      md.push(`**Estimated Effort:** ${rec.estimatedEffort}`)
      md.push(``)
      md.push(rec.description)
      md.push(``)
      md.push(`**Affected Columns:** ${rec.affectedColumns.slice(0, 5).join(', ')}${rec.affectedColumns.length > 5 ? '...' : ''}`)
      md.push(`**Frameworks:** ${rec.frameworks.join(', ')}`)
      md.push(``)
    }

    // Tables
    md.push(`## Table Analysis`)
    md.push(``)
    for (const table of report.tables.slice(0, 20)) {
      md.push(`### ${table.tableName}`)
      md.push(``)
      md.push(`- **Risk Level:** ${table.riskLevel.toUpperCase()}`)
      md.push(`- **Columns:** ${table.totalColumns}`)
      md.push(`- **PHI:** ${table.sensitivityBreakdown.phi || 0} | PII: ${table.sensitivityBreakdown.pii || 0}`)
      md.push(``)
    }

    if (report.tables.length > 20) {
      md.push(`_... and ${report.tables.length - 20} more tables_`)
    }

    return md.join('\n')
  }
}

// Export singleton instance
export const complianceReportGenerator = new ComplianceReportGenerator()
