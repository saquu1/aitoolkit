/**
 * Domain Intelligence Module
 * 
 * Multi-domain schema analysis and intelligence system.
 * Supports: Healthcare (HIS), ERP, CRM, E-Commerce, Education, Hospitality, Real Estate, Finance
 * 
 * Features:
 * - Domain auto-detection from schema patterns
 * - State machine generation for workflows
 * - Table archetype detection (Master/Transaction/Lookup/Bridge/Audit)
 * - OpenAPI/Swagger specification generation
 * 
 * @module domain-intelligence
 */

// Base types
export * from './base'

// Unified taxonomy
export * from './unified-taxonomy'

// Domain patterns
export { HEALTHCARE_DOMAIN, HEALTHCARE_TABLE_PATTERNS, HEALTHCARE_COLUMN_PATTERNS, HEALTHCARE_WORKFLOWS } from './patterns/healthcare'
export { ERP_DOMAIN, ERP_TABLE_PATTERNS, ERP_COLUMN_PATTERNS, ERP_WORKFLOWS } from './patterns/erp'
export { CRM_DOMAIN, CRM_TABLE_PATTERNS, CRM_COLUMN_PATTERNS, CRM_WORKFLOWS } from './patterns/crm'
export { ECOMMERCE_DOMAIN, ECOMMERCE_TABLE_PATTERNS, ECOMMERCE_COLUMN_PATTERNS, ECOMMERCE_WORKFLOWS } from './patterns/ecommerce'

// Domain detection
export { 
  DomainDetector, 
  domainDetector, 
  detectDomain, 
  getSensitivePatterns, 
  getWorkflowPatterns, 
  isSensitiveColumn,
  DOMAIN_REGISTRY 
} from './detector'

// State Machine Generator
export {
  StateMachineGenerator,
  StateMachineDefinition,
  StateDefinition,
  StateTransition,
  StateMachineVisualization,
  GeneratedStateMachine,
  stateMachineGenerator,
  generateDomainStateMachines,
  generateApprovalWorkflow
} from './state-machine-generator'

// Table Archetype Detector
export {
  TableArchetypeDetector,
  TableArchetype,
  TableStructure,
  ArchetypeDetectionResult,
  tableArchetypeDetector,
  detectTableArchetype,
  detectTableArchetypes
} from './table-archetype-detector'

// OpenAPI Generator
export {
  OpenApiGenerator,
  OpenAPISpec,
  TableForApiGeneration,
  ApiGenerationOptions,
  GeneratedApiDocs,
  openApiGenerator,
  generateOpenApi
} from './openapi-generator'

// Import detector for re-export
import { DomainDetector, domainDetector, detectDomain, getSensitivePatterns, getWorkflowPatterns, isSensitiveColumn } from './detector'
import { BusinessDomain, DomainDetectionResult, DomainScore, PatternMatch } from './base'
import { StateMachineGenerator, stateMachineGenerator, StateMachineDefinition } from './state-machine-generator'
import { TableArchetypeDetector, tableArchetypeDetector, TableArchetype, ArchetypeDetectionResult } from './table-archetype-detector'
import { OpenApiGenerator, openApiGenerator, OpenAPISpec, GeneratedApiDocs } from './openapi-generator'

// =============================================================================
// CONVENIENCE API
// =============================================================================

/**
 * Analyze a database schema and detect domain
 */
export function analyzeSchema(
  tables: Array<{
    tableName: string
    columns: Array<{ name: string; dataType: string }>
  }>
): {
  domain: BusinessDomain
  confidence: number
  result: DomainDetectionResult
} {
  const result = domainDetector.detect(tables)
  
  return {
    domain: result.primaryDomain,
    confidence: result.confidence,
    result
  }
}

/**
 * Get domain-specific intelligence for a table
 */
export function getTableIntelligence(
  tableName: string,
  columns: Array<{ name: string; dataType: string }>,
  domain: BusinessDomain
): {
  category: string
  sensitiveColumns: Array<{ column: string; type: string; sensitivity: string }>
  workflow: { name: string; states: string[] } | null
  recommendations: string[]
} {
  const sensitiveColumns: Array<{ column: string; type: string; sensitivity: string }> = []
  
  // Check each column for sensitivity
  for (const col of columns) {
    const result = isSensitiveColumn(col.name, domain)
    if (result.isSensitive) {
      sensitiveColumns.push({
        column: col.name,
        type: result.pattern || 'Unknown',
        sensitivity: result.sensitivity || 'PII'
      })
    }
  }
  
  // Check for workflow
  let workflow: { name: string; states: string[] } | null = null
  const workflows = getWorkflowPatterns(domain)
  
  for (const w of workflows) {
    if (w.tableName.test(tableName)) {
      workflow = {
        name: w.name,
        states: w.states
      }
      break
    }
  }
  
  // Generate recommendations
  const recommendations: string[] = []
  
  if (sensitiveColumns.length > 0) {
    recommendations.push(`Found ${sensitiveColumns.length} sensitive columns requiring protection`)
  }
  
  if (workflow) {
    recommendations.push(`Table participates in "${workflow.name}" workflow with ${workflow.states.length} states`)
  }
  
  return {
    category: 'transaction', // Would be determined by pattern matching
    sensitiveColumns,
    workflow,
    recommendations
  }
}

/**
 * Generate compliance checklist for a domain
 */
export function getComplianceChecklist(domain: BusinessDomain): string[] {
  const checklists: Record<BusinessDomain, string[]> = {
    healthcare: [
      'Implement HIPAA-compliant access controls',
      'Enable audit logging for PHI access',
      'Encrypt PHI at rest and in transit',
      'Implement minimum necessary access principle',
      'Configure automatic logoff for workstations',
      'Implement breach notification procedures',
      'Maintain Business Associate Agreements (BAAs)',
      'Conduct regular risk assessments'
    ],
    erp: [
      'Implement SOX controls for financial reporting',
      'Enable segregation of duties',
      'Configure approval workflows for transactions',
      'Maintain audit trails for all financial entries',
      'Implement data retention policies',
      'Configure role-based access control',
      'Enable change management processes'
    ],
    crm: [
      'Implement GDPR compliance for EU customers',
      'Enable data subject access request (DSAR) workflows',
      'Configure consent management',
      'Implement data retention and deletion policies',
      'Enable privacy notice management',
      'Configure customer data portability'
    ],
    ecommerce: [
      'Implement PCI-DSS compliance for payment data',
      'Configure secure payment tokenization',
      'Enable fraud detection systems',
      'Implement secure checkout process',
      'Configure data encryption for customer data',
      'Enable GDPR/CCPA compliance features',
      'Implement secure password policies'
    ],
    hrms: [
      'Implement GDPR compliance for employee data',
      'Configure payroll data protection',
      'Enable employee consent management',
      'Implement secure recruitment processes',
      'Configure benefits data encryption',
      'Enable employee data access requests'
    ],
    education: [
      'Implement FERPA compliance for student records',
      'Enable parental consent management',
      'Configure student data privacy controls',
      'Implement secure grade reporting',
      'Enable learning analytics with privacy controls'
    ],
    logistics: [
      'Implement supply chain data security',
      'Configure shipment tracking privacy',
      'Enable vendor data protection',
      'Implement warehouse access controls',
      'Configure GPS tracking compliance'
    ],
    finance: [
      'Implement SOX compliance',
      'Enable Basel III reporting',
      'Configure anti-money laundering (AML) checks',
      'Implement KYC (Know Your Customer) processes',
      'Enable regulatory reporting'
    ],
    real_estate: [
      'Implement GDPR/CCPA for client data',
      'Enable secure document management',
      'Configure fair housing compliance',
      'Implement commission tracking with privacy'
    ],
    hospitality: [
      'Implement PCI-DSS for payment processing',
      'Configure GDPR compliance for guest data',
      'Enable secure reservation systems',
      'Implement loyalty program data protection'
    ],
    unknown: [
      'Implement general data protection measures',
      'Enable audit logging',
      'Configure role-based access control',
      'Implement data classification'
    ]
  }
  
  return checklists[domain] || checklists.unknown
}
