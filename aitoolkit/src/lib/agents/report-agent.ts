// =============================================================================
// Report Generation Agent - Intelligence Report Engine
// =============================================================================
// Generates comprehensive reports: Intelligence, Compliance, Workflows, Migration
// =============================================================================

import { WorkflowDefinition } from '../parsers/workflow-builder';
import { PIIDetectionResult } from '../pii-phi-detector';

/**
 * Report Types
 */
export type ReportType =
  | 'executive_summary'
  | 'intelligence_inventory'
  | 'compliance_hipaa'
  | 'compliance_gdpr'
  | 'workflow_analysis'
  | 'security_audit'
  | 'migration_readiness'
  | 'module_inventory'
  | 'api_inventory'
  | 'pii_phi_inventory'
  | 'dependency_graph'
  | 'custom';

/**
 * Report Format
 */
export type ReportFormat = 'markdown' | 'html' | 'json' | 'pdf';

/**
 * Report Section
 */
export interface ReportSection {
  id: string;
  title: string;
  content: string;
  subsections: ReportSection[];
  charts?: ChartData[];
  tables?: TableData[];
}

/**
 * Chart Data for visualization
 */
export interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'radar' | 'treemap';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
  }[];
}

/**
 * Table Data for reports
 */
export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

/**
 * Report Metadata
 */
export interface ReportMetadata {
  reportId: string;
  reportType: ReportType;
  title: string;
  description?: string;
  generatedAt: Date;
  generatedBy: string;
  projectName?: string;
  projectId?: string;
  version: string;
}

/**
 * Complete Report
 */
export interface IntelligenceReport {
  metadata: ReportMetadata;
  executiveSummary: ReportSection;
  sections: ReportSection[];
  appendices: ReportSection[];
  statistics: ReportStatistics;
  recommendations: string[];
}

/**
 * Report Statistics
 */
export interface ReportStatistics {
  totalFiles: number;
  totalTables: number;
  totalSPs: number;
  totalViews: number;
  totalWorkflows: number;
  totalEndpoints: number;
  totalPIIFields: number;
  totalPHIFields: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Report Generation Options
 */
export interface ReportOptions {
  reportType: ReportType;
  format: ReportFormat;
  includeRawData: boolean;
  includeRecommendations: boolean;
  sections?: string[];
  customTitle?: string;
  projectId?: string;
  projectName?: string;
}

/**
 * Intelligence Data Input
 */
export interface IntelligenceDataInput {
  spResults?: SPAnalysisResult[];
  jsResults?: JSAnalysisResult[];
  workflows?: WorkflowDefinition[];
  piiResults?: Map<string, PIIDetectionResult[]>;
  tables?: Array<{ tableName: string; columns: Array<{ name: string; dataType: string }> }>;
  cshtmlFiles?: Array<{ fileName: string; linkedTable?: string }>;
  fileClassifications?: Array<{ fileName: string; fileType: string; confidence: number }>;
}

/**
 * Simplified SP Analysis Result
 */
export interface SPAnalysisResult {
  procedureName: string;
  actionType: string;
  riskLevel: string;
  tablesReferenced: Array<{ tableName: string }>;
  complexity: number;
  moduleIdentification: { moduleName?: string };
}

/**
 * Simplified JS Analysis Result
 */
export interface JSAnalysisResult {
  fileName: string;
  ajaxCalls: Array<{ url: string; method: string; sourceFile: string }>;
  eventHandlers: unknown[];
  formValidations: unknown[];
  jqueryPlugins: string[];
}

/**
 * Report Generation Agent
 */
export class ReportGenerationAgent {
  private data: IntelligenceDataInput;
  private options: ReportOptions;

  constructor(data: IntelligenceDataInput, options: ReportOptions) {
    this.data = data;
    this.options = options;
  }

  /**
   * Generate the requested report
   */
  generate(): IntelligenceReport {
    const metadata = this.generateMetadata();
    const statistics = this.calculateStatistics();

    let sections: ReportSection[] = [];
    let executiveSummary: ReportSection;
    let recommendations: string[] = [];
    let appendices: ReportSection[] = [];

    switch (this.options.reportType) {
      case 'executive_summary':
        executiveSummary = this.generateExecutiveSummary(statistics);
        sections = [executiveSummary];
        recommendations = this.generateExecutiveRecommendations(statistics);
        break;

      case 'compliance_hipaa':
        executiveSummary = this.generateHIPAASummary(statistics);
        sections = this.generateHIPAASections();
        recommendations = this.generateHIPAARecommendations();
        break;

      case 'compliance_gdpr':
        executiveSummary = this.generateGDPRSummary(statistics);
        sections = this.generateGDPRSections();
        recommendations = this.generateGDPRRecommendations();
        break;

      case 'workflow_analysis':
        executiveSummary = this.generateWorkflowSummary(statistics);
        sections = this.generateWorkflowSections();
        recommendations = this.generateWorkflowRecommendations();
        break;

      case 'security_audit':
        executiveSummary = this.generateSecuritySummary(statistics);
        sections = this.generateSecuritySections();
        recommendations = this.generateSecurityRecommendations();
        break;

      case 'pii_phi_inventory':
        executiveSummary = this.generatePIIPHISummary(statistics);
        sections = this.generatePIIPHISections();
        recommendations = this.generatePIIPHIRecommendations();
        break;

      case 'api_inventory':
        executiveSummary = this.generateAPISummary(statistics);
        sections = this.generateAPISections();
        recommendations = this.generateAPIRecommendations();
        break;

      default:
        executiveSummary = this.generateExecutiveSummary(statistics);
        sections = this.generateAllSections();
        recommendations = this.generateAllRecommendations();
    }

    if (this.options.includeRawData) {
      appendices = this.generateAppendices();
    }

    return {
      metadata,
      executiveSummary,
      sections,
      appendices,
      statistics,
      recommendations,
    };
  }

  /**
   * Generate report metadata
   */
  private generateMetadata(): ReportMetadata {
    return {
      reportId: `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportType: this.options.reportType,
      title: this.options.customTitle || this.getDefaultTitle(),
      generatedAt: new Date(),
      generatedBy: 'AI Enterprise Architect - Report Agent',
      projectName: this.options.projectName,
      projectId: this.options.projectId,
      version: '1.0.0',
    };
  }

  /**
   * Get default title for report type
   */
  private getDefaultTitle(): string {
    const titles: Record<ReportType, string> = {
      'executive_summary': 'Executive Summary Report',
      'intelligence_inventory': 'Intelligence Inventory Report',
      'compliance_hipaa': 'HIPAA Compliance Report',
      'compliance_gdpr': 'GDPR Compliance Report',
      'workflow_analysis': 'Workflow Analysis Report',
      'security_audit': 'Security Audit Report',
      'migration_readiness': 'Migration Readiness Assessment',
      'module_inventory': 'Module Inventory Report',
      'api_inventory': 'API Inventory Report',
      'pii_phi_inventory': 'PII/PHI Inventory Report',
      'dependency_graph': 'Dependency Graph Report',
      'custom': 'Custom Intelligence Report',
    };
    return titles[this.options.reportType];
  }

  /**
   * Calculate report statistics
   */
  private calculateStatistics(): ReportStatistics {
    const totalFiles = this.data.fileClassifications?.length || 0;
    const totalTables = this.data.tables?.length || 0;
    const totalSPs = this.data.spResults?.length || 0;
    const totalViews = this.data.cshtmlFiles?.length || 0;
    const totalWorkflows = this.data.workflows?.length || 0;
    const totalEndpoints = this.data.jsResults?.reduce(
      (sum, js) => sum + (js.ajaxCalls?.length || 0), 0
    ) || 0;

    // Calculate PII/PHI fields
    let totalPIIFields = 0;
    let totalPHIFields = 0;

    if (this.data.piiResults) {
      for (const results of this.data.piiResults.values()) {
        totalPIIFields += results.filter(r => r.sensitivity === 'pii').length;
        totalPHIFields += results.filter(r => r.sensitivity === 'phi').length;
      }
    }

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(totalPHIFields, totalPIIFields);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(totalPHIFields, totalPIIFields);

    return {
      totalFiles,
      totalTables,
      totalSPs,
      totalViews,
      totalWorkflows,
      totalEndpoints,
      totalPIIFields,
      totalPHIFields,
      complianceScore,
      riskLevel,
    };
  }

  /**
   * Calculate compliance score (0-100)
   */
  private calculateComplianceScore(phiFields: number, piiFields: number): number {
    let score = 100;
    score -= Math.min(phiFields * 2, 30);
    score -= Math.min(piiFields * 1, 20);
    return Math.max(score, 0);
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(phiFields: number, piiFields: number): 'low' | 'medium' | 'high' | 'critical' {
    if (phiFields > 20 || piiFields > 50) return 'critical';
    if (phiFields > 10 || piiFields > 30) return 'high';
    if (phiFields > 0 || piiFields > 10) return 'medium';
    return 'low';
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(stats: ReportStatistics): ReportSection {
    const content = `
## Executive Summary

This report provides a comprehensive analysis of the enterprise system intelligence gathered from ${stats.totalFiles} source files.

### Key Findings

- **Database Schema**: ${stats.totalTables} tables identified
- **Business Logic**: ${stats.totalSPs} stored procedures analyzed
- **User Interface**: ${stats.totalViews} views/screens mapped
- **Business Workflows**: ${stats.totalWorkflows} workflows discovered
- **API Endpoints**: ${stats.totalEndpoints} AJAX endpoints detected

### Security & Compliance

- **PII Fields**: ${stats.totalPIIFields} personally identifiable information fields
- **PHI Fields**: ${stats.totalPHIFields} protected health information fields
- **Compliance Score**: ${stats.complianceScore}%
- **Risk Level**: **${stats.riskLevel.toUpperCase()}**

### Priority Recommendations

${this.getPriorityRecommendations(stats)}
    `.trim();

    return {
      id: 'executive-summary',
      title: 'Executive Summary',
      content,
      subsections: [],
      charts: [this.generateOverviewChart(stats)],
    };
  }

  /**
   * Generate priority recommendations
   */
  private getPriorityRecommendations(stats: ReportStatistics): string {
    const recommendations: string[] = [];

    if (stats.riskLevel === 'critical') {
      recommendations.push('🔴 **CRITICAL**: Immediate security review required due to high PHI/PII exposure');
    }
    if (stats.complianceScore < 70) {
      recommendations.push('🟠 **HIGH**: Compliance score below 70% - implement encryption for sensitive fields');
    }
    if (stats.totalWorkflows === 0 && stats.totalSPs > 0) {
      recommendations.push('🟡 **MEDIUM**: No workflows detected - verify SP naming conventions');
    }
    if (stats.totalEndpoints > 20) {
      recommendations.push('🟢 **INFO**: Consider API documentation for ${stats.totalEndpoints} discovered endpoints');
    }

    return recommendations.join('\n') || 'No critical issues identified.';
  }

  /**
   * Generate overview chart
   */
  private generateOverviewChart(stats: ReportStatistics): ChartData {
    return {
      type: 'bar',
      title: 'System Intelligence Overview',
      labels: ['Tables', 'SPs', 'Views', 'Workflows', 'Endpoints', 'PII', 'PHI'],
      datasets: [{
        label: 'Count',
        data: [
          stats.totalTables,
          stats.totalSPs,
          stats.totalViews,
          stats.totalWorkflows,
          stats.totalEndpoints,
          stats.totalPIIFields,
          stats.totalPHIFields,
        ],
        backgroundColor: [
          '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
          '#ef4444', '#f97316', '#dc2626'
        ],
      }],
    };
  }

  /**
   * Generate HIPAA summary
   */
  private generateHIPAASummary(stats: ReportStatistics): ReportSection {
    return {
      id: 'hipaa-summary',
      title: 'HIPAA Compliance Summary',
      content: `
## HIPAA Compliance Assessment

**PHI Fields Identified**: ${stats.totalPHIFields}
**Compliance Score**: ${stats.complianceScore}%
**Risk Level**: ${stats.riskLevel.toUpperCase()}

This assessment identifies protected health information within the database schema and provides recommendations for HIPAA compliance.
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate HIPAA sections
   */
  private generateHIPAASections(): ReportSection[] {
    return [
      this.generatePHIInventorySection(),
      this.generateHIPAAChecklistSection(),
    ];
  }

  /**
   * Generate PHI inventory section
   */
  private generatePHIInventorySection(): ReportSection {
    const phiFields: Array<{ tableName: string; columnName: string; category: string }> = [];

    if (this.data.piiResults) {
      for (const [tableName, results] of this.data.piiResults.entries()) {
        for (const result of results) {
          if (result.sensitivity === 'phi') {
            phiFields.push({
              tableName,
              columnName: result.columnName,
              category: result.category,
            });
          }
        }
      }
    }

    return {
      id: 'phi-inventory',
      title: 'Protected Health Information (PHI) Inventory',
      content: `
## PHI Inventory

${phiFields.length} PHI fields identified across the database schema.

### HIPAA Definition
PHI includes any individually identifiable health information that relates to:
- Past, present, or future physical or mental health condition
- Provision of health care to an individual
- Past, present, or future payment for health care
      `.trim(),
      subsections: [],
      tables: phiFields.length > 0 ? [{
        headers: ['Table', 'Column', 'Category'],
        rows: phiFields.slice(0, 30).map(f => [f.tableName, f.columnName, f.category]),
        caption: 'PHI Fields Identified',
      }] : undefined,
    };
  }

  /**
   * Generate HIPAA checklist section
   */
  private generateHIPAAChecklistSection(): ReportSection {
    return {
      id: 'hipaa-checklist',
      title: 'HIPAA Compliance Checklist',
      content: `
## HIPAA Security Rule Compliance

### Administrative Safeguards
- [ ] Security Officer designated
- [ ] Workforce training completed
- [ ] Access management procedures
- [ ] Incident response plan

### Physical Safeguards
- [ ] Facility access controls
- [ ] Workstation security
- [ ] Device and media controls

### Technical Safeguards
- [ ] Access controls (unique user IDs)
- [ ] Audit controls
- [ ] Integrity controls
- [ ] Transmission security (encryption)
- [ ] Automatic logoff
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate GDPR summary
   */
  private generateGDPRSummary(stats: ReportStatistics): ReportSection {
    return {
      id: 'gdpr-summary',
      title: 'GDPR Compliance Summary',
      content: `
## GDPR Compliance Assessment

**PII Fields Identified**: ${stats.totalPIIFields}
**PHI Fields Identified**: ${stats.totalPHIFields}
**Compliance Score**: ${stats.complianceScore}%

This assessment identifies personal data within the system for GDPR compliance.
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate GDPR sections
   */
  private generateGDPRSections(): ReportSection[] {
    return [
      this.generatePIIInventorySection(),
      this.generateGDPRChecklistSection(),
    ];
  }

  /**
   * Generate PII inventory section for GDPR
   */
  private generatePIIInventorySection(): ReportSection {
    const piiFields: Array<{ tableName: string; columnName: string; category: string }> = [];

    if (this.data.piiResults) {
      for (const [tableName, results] of this.data.piiResults.entries()) {
        for (const result of results) {
          if (result.sensitivity === 'pii') {
            piiFields.push({
              tableName,
              columnName: result.columnName,
              category: result.category,
            });
          }
        }
      }
    }

    return {
      id: 'pii-inventory',
      title: 'Personally Identifiable Information (PII) Inventory',
      content: `
## PII Inventory (GDPR)

${piiFields.length} PII fields identified under GDPR definition.

### GDPR Article 4 Definition
Personal data means any information relating to an identified or identifiable natural person.
      `.trim(),
      subsections: [],
      tables: piiFields.length > 0 ? [{
        headers: ['Table', 'Column', 'Category'],
        rows: piiFields.slice(0, 30).map(f => [f.tableName, f.columnName, f.category]),
      }] : undefined,
    };
  }

  /**
   * Generate GDPR checklist section
   */
  private generateGDPRChecklistSection(): ReportSection {
    return {
      id: 'gdpr-checklist',
      title: 'GDPR Compliance Checklist',
      content: `
## GDPR Compliance Checklist

### Lawful Basis
- [ ] Documented lawful basis for processing
- [ ] Consent mechanisms in place
- [ ] Data processing agreements

### Data Subject Rights
- [ ] Right to access implementation
- [ ] Right to rectification
- [ ] Right to erasure (right to be forgotten)
- [ ] Right to data portability

### Technical Measures
- [ ] Data encryption
- [ ] Access controls
- [ ] Privacy by design
- [ ] Data minimization
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate workflow summary
   */
  private generateWorkflowSummary(stats: ReportStatistics): ReportSection {
    return {
      id: 'workflow-summary',
      title: 'Workflow Analysis Summary',
      content: `
## Business Workflow Analysis

**Total Workflows Discovered**: ${stats.totalWorkflows}
**Total SPs Analyzed**: ${stats.totalSPs}

Workflows are reconstructed by analyzing stored procedure naming patterns and execution dependencies.
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate workflow sections
   */
  private generateWorkflowSections(): ReportSection[] {
    const workflows = this.data.workflows || [];
    
    if (workflows.length === 0) {
      return [{
        id: 'no-workflows',
        title: 'No Workflows Detected',
        content: 'No business workflows were detected. This may indicate that stored procedures do not follow standard naming conventions.',
        subsections: [],
      }];
    }

    return [{
      id: 'workflow-list',
      title: 'Discovered Workflows',
      content: `${workflows.length} workflows discovered from SP analysis.`,
      subsections: [],
      tables: [{
        headers: ['Workflow', 'Module', 'Steps', 'Complexity'],
        rows: workflows.map(wf => [
          wf.name,
          wf.module,
          wf.totalSteps.toString(),
          wf.complexity,
        ]),
        caption: 'Discovered Workflows',
      }],
    }];
  }

  /**
   * Generate security summary
   */
  private generateSecuritySummary(stats: ReportStatistics): ReportSection {
    return {
      id: 'security-summary',
      title: 'Security Audit Summary',
      content: `
## Security Audit Summary

**Risk Level**: ${stats.riskLevel.toUpperCase()}
**Compliance Score**: ${stats.complianceScore}%
**PHI Fields**: ${stats.totalPHIFields}
**PII Fields**: ${stats.totalPIIFields}

This security audit identifies sensitive data exposure and provides risk mitigation recommendations.
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate security sections
   */
  private generateSecuritySections(): ReportSection[] {
    return [
      this.generatePHIInventorySection(),
      this.generatePIIInventorySection(),
      this.generateSecurityRecommendationsSection(),
    ];
  }

  /**
   * Generate security recommendations section
   */
  private generateSecurityRecommendationsSection(): ReportSection {
    return {
      id: 'security-recommendations',
      title: 'Security Recommendations',
      content: `
## Security Recommendations

### Critical Priority
- Encrypt all PHI fields at rest using AES-256
- Implement audit logging for sensitive data access
- Enable row-level security for multi-tenant data

### High Priority
- Implement field-level encryption for PII
- Add rate limiting on authentication endpoints
- Enable HTTPS for all API communications

### Medium Priority
- Implement data masking for non-production environments
- Add intrusion detection for database access
- Enable query logging for audit trail
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate PII/PHI summary
   */
  private generatePIIPHISummary(stats: ReportStatistics): ReportSection {
    return {
      id: 'pii-phi-summary',
      title: 'PII/PHI Inventory Summary',
      content: `
## Sensitive Data Inventory

**Total PII Fields**: ${stats.totalPIIFields}
**Total PHI Fields**: ${stats.totalPHIFields}
**Risk Level**: ${stats.riskLevel.toUpperCase()}

This inventory identifies all sensitive data fields requiring special handling.
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate PII/PHI sections
   */
  private generatePIIPHISections(): ReportSection[] {
    return [
      this.generatePHIInventorySection(),
      this.generatePIIInventorySection(),
    ];
  }

  /**
   * Generate API summary
   */
  private generateAPISummary(stats: ReportStatistics): ReportSection {
    return {
      id: 'api-summary',
      title: 'API Inventory Summary',
      content: `
## API Endpoint Inventory

**Total Endpoints Discovered**: ${stats.totalEndpoints}

API endpoints are discovered through JavaScript AJAX call analysis.
      `.trim(),
      subsections: [],
    };
  }

  /**
   * Generate API sections
   */
  private generateAPISections(): ReportSection[] {
    const endpoints: Array<{ url: string; method: string; source: string }> = [];

    if (this.data.jsResults) {
      for (const js of this.data.jsResults) {
        for (const call of js.ajaxCalls || []) {
          endpoints.push({
            url: call.url,
            method: call.method,
            source: call.sourceFile,
          });
        }
      }
    }

    return [{
      id: 'api-inventory',
      title: 'API Endpoints',
      content: `${endpoints.length} API endpoints discovered from JavaScript analysis.`,
      subsections: [],
      tables: endpoints.length > 0 ? [{
        headers: ['URL', 'Method', 'Source File'],
        rows: endpoints.slice(0, 30).map(e => [e.url, e.method, e.source]),
        caption: 'Discovered API Endpoints',
      }] : undefined,
    }];
  }

  /**
   * Generate all sections
   */
  private generateAllSections(): ReportSection[] {
    return [
      this.generatePHIInventorySection(),
      this.generatePIIInventorySection(),
      ...this.generateWorkflowSections(),
      ...this.generateAPISections(),
    ];
  }

  /**
   * Generate appendices
   */
  private generateAppendices(): ReportSection[] {
    const appendices: ReportSection[] = [];

    if (this.data.fileClassifications && this.data.fileClassifications.length > 0) {
      appendices.push({
        id: 'appendix-file-classifications',
        title: 'Appendix A: File Classifications',
        content: 'Complete list of file classifications.',
        subsections: [],
        tables: [{
          headers: ['File', 'Type', 'Confidence'],
          rows: this.data.fileClassifications.slice(0, 50).map(f => [
            f.fileName,
            f.fileType,
            `${f.confidence}%`,
          ]),
        }],
      });
    }

    return appendices;
  }

  // Recommendation generators
  private generateExecutiveRecommendations(stats: ReportStatistics): string[] {
    const rec: string[] = [];
    if (stats.riskLevel === 'critical') rec.push('Conduct immediate security review for PHI/PII exposure');
    if (stats.complianceScore < 80) rec.push('Implement encryption for sensitive data fields');
    if (stats.totalWorkflows > 0) rec.push('Document discovered business workflows for stakeholder review');
    return rec;
  }

  private generateHIPAARecommendations(): string[] {
    return [
      'Implement encryption for all PHI fields at rest',
      'Enable comprehensive audit logging',
      'Create role-based access controls for PHI',
      'Develop data masking rules for non-clinical views',
    ];
  }

  private generateGDPRRecommendations(): string[] {
    return [
      'Document lawful basis for all PII processing',
      'Implement data subject access request workflows',
      'Create data retention policies',
      'Enable data portability features',
    ];
  }

  private generateWorkflowRecommendations(): string[] {
    return [
      'Validate discovered workflows with business analysts',
      'Document workflow triggers and conditions',
      'Create workflow diagrams for stakeholder review',
    ];
  }

  private generateSecurityRecommendations(): string[] {
    return [
      'Implement encryption for sensitive fields',
      'Enable audit logging',
      'Review access controls',
      'Conduct penetration testing',
    ];
  }

  private generatePIIPHIRecommendations(): string[] {
    return [
      'Implement encryption at rest for PHI fields',
      'Create data masking rules for PII display',
      'Enable audit logging for sensitive data access',
    ];
  }

  private generateAPIRecommendations(): string[] {
    return [
      'Document all discovered API endpoints',
      'Implement API versioning',
      'Add authentication/authorization',
    ];
  }

  private generateAllRecommendations(): string[] {
    return [
      ...this.generateSecurityRecommendations(),
      ...this.generateHIPAARecommendations(),
    ];
  }
}

/**
 * Create report generator
 */
export function createReportGenerator(
  data: IntelligenceDataInput,
  options: ReportOptions
): ReportGenerationAgent {
  return new ReportGenerationAgent(data, options);
}

/**
 * Quick report generation helper
 */
export function generateQuickReport(
  data: IntelligenceDataInput,
  type: ReportType = 'executive_summary'
): IntelligenceReport {
  const agent = new ReportGenerationAgent(data, {
    reportType: type,
    format: 'markdown',
    includeRawData: false,
    includeRecommendations: true,
  });
  return agent.generate();
}
