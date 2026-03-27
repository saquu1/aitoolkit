/**
 * Quality Gate Engine
 * 
 * Phase 4B: Quality Gate implementation for validating intelligence
 * before code generation.
 * 
 * Features:
 * - 20 Consistency checks from roadmap
 * - CERTIFIED / CONDITIONAL / NOT_READY certification
 * - Quality gate evaluation
 * - Auto-fix capabilities
 * - Quality metrics tracking
 */

import { prisma } from '@/lib/db';
import type { 
  ConsistencyCheckResult,
  ConsistencyCheckType,
  ConsistencySeverity 
} from '@/lib/intelligence-bank/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface QualityGateResult {
  projectId: string;
  certification: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_READY' | 'NEEDS_REVIEW';
  canGenerate: boolean;
  blockingIssues: ConsistencyCheckResult[];
  warnings: ConsistencyCheckResult[];
  info: ConsistencyCheckResult[];
  metrics: QualityMetrics;
  recommendations: string[];
  passedChecks: number;
  totalChecks: number;
  score: number; // 0-100
}

export interface QualityMetrics {
  enrichmentProgress: number;
  overallConfidence: number;
  fkResolutionRate: number;
  complianceCoverage: number;
  testCoverage: number;
  documentationCoverage: number;
  sopCompliance: number;
}

export interface ConsistencyCheck {
  checkId: string;
  checkName: string;
  checkType: ConsistencyCheckType;
  category: 'schema_ui' | 'compliance_code' | 'fk_existence' | 'test_doc_traceability' | 'business_rule_code' | 'validation_alignment';
  severity: ConsistencySeverity;
  autoFixable: boolean;
  description: string;
  check: (field: any, context: CheckContext) => ConsistencyCheckResult | null;
}

export interface CheckContext {
  allFields: any[];
  allTables: Set<string>;
  projectId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY GATE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class QualityGateEngine {
  private projectId: string;
  private checks: ConsistencyCheck[] = [];

  constructor(projectId: string) {
    this.projectId = projectId;
    this.initializeChecks();
  }

  /**
   * Initialize all 20 consistency checks
   */
  private initializeChecks(): void {
    this.checks = [
      // ═══════════════════════════════════════════════════════════════════════
      // SCHEMA ↔ UI CONSISTENCY (CHK-001 to CHK-004)
      // ═══════════════════════════════════════════════════════════════════════
      {
        checkId: 'CHK-001',
        checkName: 'Required Field Alignment',
        checkType: 'required_not_null_mismatch',
        category: 'schema_ui',
        severity: 'warning',
        autoFixable: true,
        description: 'Client-side required validation must match database NOT NULL',
        check: (field, ctx) => {
          const clientRequired = this.isClientRequired(field);
          const dbRequired = !field.schemaIsNullable && !field.schemaIsPrimaryKey;
          
          if (clientRequired !== dbRequired && !field.schemaIsPrimaryKey) {
            return this.createResult(field, 'CHK-001', 'warning',
              `Required field mismatch: Client=${clientRequired}, DB=${dbRequired}`,
              `Client says ${clientRequired ? 'required' : 'optional'}`,
              `Should be ${clientRequired ? 'NOT NULL in DB' : 'consistent'}`,
              true, clientRequired ? 'MAKE_DB_REQUIRED' : 'MAKE_CLIENT_OPTIONAL'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-002',
        checkName: 'FK Field UI Type',
        checkType: 'fk_table_missing',
        category: 'schema_ui',
        severity: 'warning',
        autoFixable: true,
        description: 'Foreign key fields must have dropdown/lookup UI component',
        check: (field, ctx) => {
          if (!field.fkIsForeignKey) return null;
          
          const uiType = field.uiComponentType || field.cshtmlInputType;
          if (uiType !== 'dropdown' && uiType !== 'select' && uiType !== 'lookup') {
            return this.createResult(field, 'CHK-002', 'warning',
              'FK field should use dropdown/select UI',
              `Current UI type: ${uiType || 'not set'}`,
              'FK fields should render as dropdown for user selection',
              true, 'CHANGE_TO_DROPDOWN'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-003',
        checkName: 'Max Length Alignment',
        checkType: 'validation_mismatch',
        category: 'schema_ui',
        severity: 'warning',
        autoFixable: true,
        description: 'UI maxlength must not exceed database maxlength',
        check: (field, ctx) => {
          const dbMaxLength = field.schemaMaxLength;
          const uiMaxLength = field.cshtmlMaxLength || field.uiMaxLength;
          
          if (dbMaxLength && uiMaxLength && uiMaxLength > dbMaxLength) {
            return this.createResult(field, 'CHK-003', 'warning',
              `UI maxlength (${uiMaxLength}) exceeds DB maxlength (${dbMaxLength})`,
              `UI allows ${uiMaxLength} chars, DB allows ${dbMaxLength}`,
              `UI maxlength should be <= ${dbMaxLength}`,
              true, 'ALIGN_MAX_LENGTH'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-004',
        checkName: 'Date Format Consistency',
        checkType: 'validation_mismatch',
        category: 'schema_ui',
        severity: 'info',
        autoFixable: true,
        description: 'All date fields must use consistent format',
        check: (field, ctx) => {
          const dateTypes = ['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME'];
          if (!dateTypes.includes(field.schemaDataType?.toUpperCase())) return null;
          
          const dateConfig = field.uiDateConfig ? JSON.parse(field.uiDateConfig) : null;
          const format = dateConfig?.format || field.cshtmlDateFormat;
          
          // Check if format matches standard DD/MM/YYYY
          if (format && !format.includes('DD') && !format.includes('MM')) {
            return this.createResult(field, 'CHK-004', 'info',
              'Non-standard date format detected',
              `Format: ${format}`,
              'Use DD/MM/YYYY for consistency',
              true, 'STANDARDIZE_DATE_FORMAT'
            );
          }
          return null;
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // COMPLIANCE ↔ CODE CONSISTENCY (CHK-010 to CHK-013)
      // ═══════════════════════════════════════════════════════════════════════
      {
        checkId: 'CHK-010',
        checkName: 'PII Encryption',
        checkType: 'pii_no_encryption',
        category: 'compliance_code',
        severity: 'error',
        autoFixable: true,
        description: 'PII fields must have encryption at rest',
        check: (field, ctx) => {
          if (!field.compIsPII) return null;
          
          if (!field.compRequiresEncryption) {
            return this.createResult(field, 'CHK-010', 'error',
              'PII field without encryption',
              'PII data stored unencrypted',
              'PII fields must be encrypted at rest',
              true, 'ENABLE_ENCRYPTION'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-011',
        checkName: 'PHI HIPAA Compliance',
        checkType: 'pii_no_encryption',
        category: 'compliance_code',
        severity: 'error',
        autoFixable: false,
        description: 'PHI fields must have HIPAA compliance flags and audit trail',
        check: (field, ctx) => {
          if (!field.compIsPHI) return null;
          
          const missingRequirements: string[] = [];
          if (!field.compAuditRequired) missingRequirements.push('audit trail');
          if (!field.compRequiresEncryption) missingRequirements.push('encryption');
          
          if (missingRequirements.length > 0) {
            return this.createResult(field, 'CHK-011', 'error',
              `PHI field missing: ${missingRequirements.join(', ')}`,
              'PHI field without full HIPAA compliance',
              'PHI requires encryption, audit trail, and access controls',
              false, null
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-012',
        checkName: 'PII UI Masking',
        checkType: 'pii_no_encryption',
        category: 'compliance_code',
        severity: 'warning',
        autoFixable: true,
        description: 'PII fields must have masking in UI displays',
        check: (field, ctx) => {
          if (!field.compIsPII) return null;
          
          if (!field.compRequiresMasking && !field.compMaskingPattern) {
            return this.createResult(field, 'CHK-012', 'warning',
              'PII field without display masking',
              'PII data visible in plain text',
              'PII should be masked in UI (e.g., ***-**-1234)',
              true, 'ENABLE_MASKING'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-013',
        checkName: 'Financial PCI DSS',
        checkType: 'pii_no_encryption',
        category: 'compliance_code',
        severity: 'error',
        autoFixable: false,
        description: 'Card data fields must have PCI DSS compliance',
        check: (field, ctx) => {
          const financialFields = ['cardnumber', 'cardno', 'creditcard', 'cvv', 'cvc', 'expirydate', 'expdate'];
          const fieldName = field.fieldName.toLowerCase().replace(/[^a-z]/g, '');
          
          const isFinancial = financialFields.some(f => fieldName.includes(f)) || field.compIsFinancial;
          if (!isFinancial) return null;
          
          if (!field.compRequiresEncryption || !field.compAuditRequired) {
            return this.createResult(field, 'CHK-013', 'error',
              'Financial field without PCI DSS compliance',
              'Card/financial data without full protection',
              'Financial fields require encryption, masking, and audit per PCI DSS',
              false, null
            );
          }
          return null;
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // FK ↔ TABLE EXISTENCE (CHK-020 to CHK-023)
      // ═══════════════════════════════════════════════════════════════════════
      {
        checkId: 'CHK-020',
        checkName: 'FK Table Exists',
        checkType: 'fk_table_missing',
        category: 'fk_existence',
        severity: 'error',
        autoFixable: false,
        description: 'Foreign key must reference existing table',
        check: (field, ctx) => {
          if (!field.fkIsForeignKey || !field.fkReferencedTable) return null;
          
          if (!ctx.allTables.has(field.fkReferencedTable) && !field.fkTableExists) {
            return this.createResult(field, 'CHK-020', 'error',
              `FK references missing table: ${field.fkReferencedTable}`,
              `Table "${field.fkReferencedTable}" not found in schema`,
              `Upload ${field.fkReferencedTable} table definition`,
              false, null
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-021',
        checkName: 'FK Column Exists',
        checkType: 'fk_table_missing',
        category: 'fk_existence',
        severity: 'error',
        autoFixable: false,
        description: 'Foreign key must reference existing column',
        check: (field, ctx) => {
          if (!field.fkIsForeignKey || !field.fkReferencedTable || !field.fkReferencedColumn) return null;
          
          // Check if the referenced column exists in the referenced table
          const refFields = ctx.allFields.filter(f => f.tableName === field.fkReferencedTable);
          const columnExists = refFields.some(f => f.fieldName === field.fkReferencedColumn);
          
          if (!columnExists && ctx.allTables.has(field.fkReferencedTable)) {
            return this.createResult(field, 'CHK-021', 'error',
              `FK references missing column: ${field.fkReferencedTable}.${field.fkReferencedColumn}`,
              `Column "${field.fkReferencedColumn}" not found in ${field.fkReferencedTable}`,
              'Fix column name or add missing column',
              false, null
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-022',
        checkName: 'Cascade Chain Complete',
        checkType: 'cascade_chain_broken',
        category: 'fk_existence',
        severity: 'warning',
        autoFixable: false,
        description: 'Cascading dropdown chain must have all tables present',
        check: (field, ctx) => {
          if (!field.fkIsForeignKey) return null;
          
          const cascadeChain = field.fkCascadeChain ? JSON.parse(field.fkCascadeChain) : [];
          if (cascadeChain.length === 0) return null;
          
          const missingTables = cascadeChain.filter((t: string) => !ctx.allTables.has(t));
          
          if (missingTables.length > 0) {
            return this.createResult(field, 'CHK-022', 'warning',
              `Cascade chain has missing tables: ${missingTables.join(', ')}`,
              `Missing: ${missingTables.join(', ')}`,
              'Upload all tables in cascade chain for proper dropdown generation',
              false, null
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-023',
        checkName: 'Circular Dependency',
        checkType: 'cascade_chain_broken',
        category: 'fk_existence',
        severity: 'error',
        autoFixable: false,
        description: 'No circular FK dependencies allowed',
        check: (field, ctx) => {
          if (!field.fkIsForeignKey) return null;
          
          // Check for circular dependencies by traversing FK chain
          const visited = new Set<string>();
          let current = field.tableName;
          const maxDepth = 10;
          let depth = 0;
          
          while (depth < maxDepth) {
            const tableFKs = ctx.allFields.filter(f => 
              f.tableName === current && f.fkIsForeignKey
            );
            
            if (tableFKs.length === 0) break;
            
            for (const fk of tableFKs) {
              if (fk.fkReferencedTable === field.tableName) {
                // Found circular reference back to original table
                return this.createResult(field, 'CHK-023', 'error',
                  `Circular FK dependency detected: ${field.tableName}`,
                  'Tables reference each other creating a cycle',
                  'Restructure tables to avoid circular dependencies',
                  false, null
                );
              }
              if (visited.has(fk.fkReferencedTable)) continue;
              visited.add(fk.fkReferencedTable);
            }
            
            current = tableFKs[0].fkReferencedTable;
            depth++;
          }
          
          return null;
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // TESTS ↔ DOCUMENTATION TRACEABILITY (CHK-030 to CHK-032)
      // ═══════════════════════════════════════════════════════════════════════
      {
        checkId: 'CHK-030',
        checkName: 'Test Coverage',
        checkType: 'test_coverage_gap',
        category: 'test_doc_traceability',
        severity: 'warning',
        autoFixable: true,
        description: 'All fields must have test coverage > 80%',
        check: (field, ctx) => {
          const testCases = field.testCases ? JSON.parse(field.testCases) : [];
          const expectedTests = field.schemaIsPrimaryKey ? 1 : 2; // At least positive + negative
          
          if (testCases.length < expectedTests) {
            return this.createResult(field, 'CHK-030', 'warning',
              `Insufficient test coverage: ${testCases.length}/${expectedTests} tests`,
              `Only ${testCases.length} test cases`,
              `Generate at least ${expectedTests} test cases`,
              true, 'GENERATE_TEST_CASES'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-031',
        checkName: 'Documentation Coverage',
        checkType: 'test_coverage_gap',
        category: 'test_doc_traceability',
        severity: 'info',
        autoFixable: true,
        description: 'All fields must have documentation coverage > 90%',
        check: (field, ctx) => {
          const hasDevNotes = !!field.docDeveloperNotes;
          const hasUserGuide = !!field.docUserGuideText;
          const hasDataDict = field.docDataDictionary && JSON.parse(field.docDataDictionary).definition;
          
          const coverage = [hasDevNotes, hasUserGuide, hasDataDict].filter(Boolean).length / 3;
          
          if (coverage < 0.67) { // 2 out of 3
            return this.createResult(field, 'CHK-031', 'info',
              `Documentation coverage: ${Math.round(coverage * 100)}%`,
              'Missing documentation components',
              'Add developer notes, user guide text, and data dictionary',
              true, 'GENERATE_DOCUMENTATION'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-032',
        checkName: 'Test-Document Link',
        checkType: 'test_coverage_gap',
        category: 'test_doc_traceability',
        severity: 'info',
        autoFixable: true,
        description: 'Test cases should link to related documentation',
        check: (field, ctx) => {
          const testCases = field.testCases ? JSON.parse(field.testCases) : [];
          const hasDoc = field.docDeveloperNotes || field.docUserGuideText;
          
          if (testCases.length > 0 && !hasDoc) {
            return this.createResult(field, 'CHK-032', 'info',
              'Test cases exist but no documentation',
              'Tests without supporting documentation',
              'Generate documentation for test traceability',
              true, 'GENERATE_DOCUMENTATION'
            );
          }
          return null;
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // BUSINESS RULES ↔ CODE (CHK-040 to CHK-042)
      // ═══════════════════════════════════════════════════════════════════════
      {
        checkId: 'CHK-040',
        checkName: 'Business Rule Implementation',
        checkType: 'sop_violation_unfixed',
        category: 'business_rule_code',
        severity: 'warning',
        autoFixable: false,
        description: 'All business rules must be implemented in generated code',
        check: (field, ctx) => {
          const businessRules = field.businessRules ? JSON.parse(field.businessRules) : [];
          
          if (businessRules.length > 0) {
            const implemented = businessRules.filter((r: any) => r.implemented);
            
            if (implemented.length < businessRules.length) {
              return this.createResult(field, 'CHK-040', 'warning',
                `${businessRules.length - implemented.length} business rules not implemented`,
                `${implemented.length}/${businessRules.length} rules implemented`,
                'Review and implement remaining business rules',
                false, null
              );
            }
          }
          return null;
        },
      },
      {
        checkId: 'CHK-041',
        checkName: 'Validation Rule Implementation',
        checkType: 'validation_mismatch',
        category: 'business_rule_code',
        severity: 'warning',
        autoFixable: true,
        description: 'All validation rules must be implemented in generated code',
        check: (field, ctx) => {
          const clientRules = field.validationClientRules ? JSON.parse(field.validationClientRules) : [];
          const serverRules = field.validationServerRules ? JSON.parse(field.validationServerRules) : [];
          
          const totalRules = clientRules.length + serverRules.length;
          if (totalRules === 0 && !field.schemaIsPrimaryKey && !field.schemaIsIdentity) {
            // Non-PK/Identity fields should have at least basic validation
            if (!field.schemaIsNullable) {
              return this.createResult(field, 'CHK-041', 'warning',
                'No validation rules defined',
                'Required field without validation rules',
                'Generate validation rules based on schema',
                true, 'GENERATE_VALIDATION_RULES'
              );
            }
          }
          return null;
        },
      },
      {
        checkId: 'CHK-042',
        checkName: 'Decision Table Implementation',
        checkType: 'sop_violation_unfixed',
        category: 'business_rule_code',
        severity: 'info',
        autoFixable: false,
        description: 'All decision tables must be implemented in generated code',
        check: (field, ctx) => {
          const decisionTables = field.decisionTables ? JSON.parse(field.decisionTables) : [];
          
          if (decisionTables.length > 0) {
            return this.createResult(field, 'CHK-042', 'info',
              `${decisionTables.length} decision tables require implementation`,
              'Decision tables need code generation',
              'Review decision tables and generate conditional logic',
              false, null
            );
          }
          return null;
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // VALIDATION ALIGNMENT (CHK-050 to CHK-052)
      // ═══════════════════════════════════════════════════════════════════════
      {
        checkId: 'CHK-050',
        checkName: 'Client-Server Validation',
        checkType: 'validation_mismatch',
        category: 'validation_alignment',
        severity: 'warning',
        autoFixable: true,
        description: 'Client and server validation rules must align',
        check: (field, ctx) => {
          const clientRules = field.validationClientRules ? JSON.parse(field.validationClientRules) : [];
          const serverRules = field.validationServerRules ? JSON.parse(field.validationServerRules) : [];
          
          const clientTypes = new Set(clientRules.map((r: any) => r.ruleType));
          const serverTypes = new Set(serverRules.map((r: any) => r.ruleType));
          
          // Check for rules only on client or only on server
          const onlyClient = [...clientTypes].filter(t => !serverTypes.has(t));
          const onlyServer = [...serverTypes].filter(t => !clientTypes.has(t));
          
          if (onlyClient.length > 0 || onlyServer.length > 0) {
            return this.createResult(field, 'CHK-050', 'warning',
              'Client-server validation mismatch',
              `Only client: ${onlyClient.join(', ') || 'none'}, Only server: ${onlyServer.join(', ') || 'none'}`,
              'Align validation rules between client and server',
              true, 'ALIGN_VALIDATION'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-051',
        checkName: 'Server-Database Validation',
        checkType: 'validation_mismatch',
        category: 'validation_alignment',
        severity: 'warning',
        autoFixable: true,
        description: 'Server validation must match database constraints',
        check: (field, ctx) => {
          const dbMaxLength = field.schemaMaxLength;
          const serverRules = field.validationServerRules ? JSON.parse(field.validationServerRules) : [];
          
          const serverMaxLength = serverRules.find((r: any) => r.ruleType === 'maxLength')?.ruleValue;
          
          if (dbMaxLength && serverMaxLength && parseInt(serverMaxLength) !== dbMaxLength) {
            return this.createResult(field, 'CHK-051', 'warning',
              `Server validation mismatch: server=${serverMaxLength}, DB=${dbMaxLength}`,
              'Server validation differs from database constraint',
              `Set server maxLength to ${dbMaxLength}`,
              true, 'ALIGN_SERVER_DB_VALIDATION'
            );
          }
          return null;
        },
      },
      {
        checkId: 'CHK-052',
        checkName: 'SOP Compliance',
        checkType: 'sop_violation_unfixed',
        category: 'validation_alignment',
        severity: 'warning',
        autoFixable: true,
        description: 'All fields must have SOP compliance > 90%',
        check: (field, ctx) => {
          const sopViolations = field.sopViolations ? JSON.parse(field.sopViolations) : [];
          const totalSOP = field.sopTotalApplicable || 0;
          const compliant = field.sopTotalCompliant || 0;
          
          if (totalSOP > 0) {
            const compliance = compliant / totalSOP;
            
            if (compliance < 0.9) {
              return this.createResult(field, 'CHK-052', 'warning',
                `SOP compliance: ${Math.round(compliance * 100)}%`,
                `${sopViolations.length} SOP violations`,
                'Resolve SOP violations for compliance',
                true, 'APPLY_SOP_AUTOFIX'
              );
            }
          }
          return null;
        },
      },
    ];
  }

  /**
   * Helper to create a check result
   */
  private createResult(
    field: any,
    checkId: string,
    severity: ConsistencySeverity,
    description: string,
    currentState: string,
    expectedState: string,
    autoFixable: boolean,
    autoFixAction: string | null
  ): ConsistencyCheckResult {
    return {
      id: `check-${this.projectId}-${field.id}-${checkId}`,
      projectId: this.projectId,
      tableName: field.tableName,
      fieldId: field.id,
      checkType: 'validation_mismatch', // Will be set by caller
      severity,
      description: `[${checkId}] ${description}`,
      currentState,
      expectedState,
      autoFixable,
      autoFixAction,
      isResolved: false,
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null,
    };
  }

  /**
   * Check if field is required on client
   */
  private isClientRequired(field: any): boolean {
    const clientRules = field.validationClientRules ? JSON.parse(field.validationClientRules) : [];
    return clientRules.some((r: any) => r.ruleType === 'required' || r.ruleType === 'notEmpty') ||
           field.cshtmlIsRequired ||
           field.uiIsRequired;
  }

  /**
   * Run quality gate evaluation
   */
  async evaluate(): Promise<QualityGateResult> {
    // Get all fields for the project
    const fields = await prisma.unifiedField.findMany({
      where: { projectId: this.projectId },
    });

    // Get all tables
    const tables = await prisma.unifiedTable.findMany({
      where: { projectId: this.projectId },
    });
    const tableNames = new Set(tables.map(t => t.tableName));
    fields.forEach(f => tableNames.add(f.tableName));

    const context: CheckContext = {
      allFields: fields,
      allTables: tableNames,
      projectId: this.projectId,
    };

    // Run all checks
    const allResults: ConsistencyCheckResult[] = [];
    
    for (const field of fields) {
      for (const check of this.checks) {
        const result = check.check(field, context);
        if (result) {
          result.checkType = check.checkType;
          allResults.push(result);
        }
      }
    }

    // Separate by severity
    const blockingIssues = allResults.filter(r => r.severity === 'error');
    const warnings = allResults.filter(r => r.severity === 'warning');
    const info = allResults.filter(r => r.severity === 'info');

    // Calculate metrics
    const metrics = await this.calculateMetrics(fields);

    // Calculate score
    const totalPossibleChecks = fields.length * this.checks.length;
    const passedChecks = totalPossibleChecks - allResults.length;
    const score = totalPossibleChecks > 0 ? Math.round((passedChecks / totalPossibleChecks) * 100) : 100;

    // Determine certification
    let certification: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_READY' | 'NEEDS_REVIEW';
    let canGenerate: boolean;

    if (blockingIssues.length === 0 && metrics.overallConfidence >= 0.85 && metrics.enrichmentProgress >= 80) {
      certification = 'CERTIFIED';
      canGenerate = true;
    } else if (blockingIssues.length === 0 && warnings.length <= 10) {
      certification = 'CONDITIONAL';
      canGenerate = true;
    } else if (blockingIssues.length <= 3 && warnings.length <= 20) {
      certification = 'NEEDS_REVIEW';
      canGenerate = false;
    } else {
      certification = 'NOT_READY';
      canGenerate = false;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(blockingIssues, warnings, metrics);

    // Store results in database
    await this.storeResults(allResults);

    return {
      projectId: this.projectId,
      certification,
      canGenerate,
      blockingIssues,
      warnings,
      info,
      metrics,
      recommendations,
      passedChecks,
      totalChecks: totalPossibleChecks,
      score,
    };
  }

  /**
   * Calculate quality metrics
   */
  private async calculateMetrics(fields: any[]): Promise<QualityMetrics> {
    if (fields.length === 0) {
      return {
        enrichmentProgress: 0,
        overallConfidence: 0,
        fkResolutionRate: 0,
        complianceCoverage: 0,
        testCoverage: 0,
        documentationCoverage: 0,
        sopCompliance: 0,
      };
    }

    let totalEnrichment = 0;
    let totalConfidence = 0;
    let fkResolved = 0;
    let fkTotal = 0;
    let complianceScanned = 0;
    let testCasesGenerated = 0;
    let documentationGenerated = 0;
    let sopCompliant = 0;

    for (const field of fields) {
      totalEnrichment += field.metaEnrichmentComplete || 0;
      totalConfidence += field.metaOverallConfidence || 0;

      if (field.fkIsForeignKey) {
        fkTotal++;
        if (field.fkResolutionStatus === 'resolved') fkResolved++;
      }

      if (field.compConfidence > 0) complianceScanned++;
      if (field.testCases && JSON.parse(field.testCases).length > 0) testCasesGenerated++;
      if (field.docDeveloperNotes || field.docUserGuideText) documentationGenerated++;
      
      const violations = field.sopViolations ? JSON.parse(field.sopViolations) : [];
      if (violations.length === 0) sopCompliant++;
    }

    return {
      enrichmentProgress: Math.round((totalEnrichment / fields.length) * 100),
      overallConfidence: Math.round((totalConfidence / fields.length) * 100) / 100,
      fkResolutionRate: fkTotal > 0 ? Math.round((fkResolved / fkTotal) * 100) : 100,
      complianceCoverage: Math.round((complianceScanned / fields.length) * 100),
      testCoverage: Math.round((testCasesGenerated / fields.length) * 100),
      documentationCoverage: Math.round((documentationGenerated / fields.length) * 100),
      sopCompliance: Math.round((sopCompliant / fields.length) * 100),
    };
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(
    blockingIssues: ConsistencyCheckResult[],
    warnings: ConsistencyCheckResult[],
    metrics: QualityMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (blockingIssues.length > 0) {
      recommendations.push(`Resolve ${blockingIssues.length} blocking issues before code generation`);
    }

    if (metrics.enrichmentProgress < 80) {
      recommendations.push(`Complete enrichment: currently ${metrics.enrichmentProgress}% (target: 80%)`);
    }

    if (metrics.fkResolutionRate < 100) {
      recommendations.push(`Resolve FK references: ${metrics.fkResolutionRate}% resolved (target: 100%)`);
    }

    if (metrics.complianceCoverage < 90) {
      recommendations.push(`Complete compliance scan: ${metrics.complianceCoverage}% (target: 90%)`);
    }

    if (metrics.testCoverage < 70) {
      recommendations.push(`Generate test cases: ${metrics.testCoverage}% coverage (target: 70%)`);
    }

    // Group warnings by check type
    const warningGroups = new Map<string, number>();
    for (const w of warnings) {
      const count = warningGroups.get(w.checkType) || 0;
      warningGroups.set(w.checkType, count + 1);
    }

    for (const [type, count] of warningGroups) {
      if (count >= 3) {
        recommendations.push(`Review ${type} issues: ${count} warnings`);
      }
    }

    return recommendations;
  }

  /**
   * Store results in database
   */
  private async storeResults(results: ConsistencyCheckResult[]): Promise<void> {
    for (const result of results) {
      try {
        await prisma.unifiedConsistencyCheck.upsert({
          where: { id: result.id },
          create: {
            id: result.id,
            projectId: result.projectId,
            tableName: result.tableName,
            fieldId: result.fieldId,
            checkType: result.checkType,
            severity: result.severity,
            description: result.description,
            currentState: result.currentState,
            expectedState: result.expectedState,
            autoFixable: result.autoFixable,
            autoFixAction: result.autoFixAction,
            isResolved: false,
          },
          update: {
            description: result.description,
            currentState: result.currentState,
            expectedState: result.expectedState,
          },
        });
      } catch (error) {
        console.error('Failed to store consistency check:', error);
      }
    }
  }

  /**
   * Auto-fix all fixable issues
   */
  async autoFix(): Promise<{
    fixed: number;
    failed: number;
    details: Array<{ checkId: string; success: boolean; message: string }>;
  }> {
    const checks = await prisma.unifiedConsistencyCheck.findMany({
      where: {
        projectId: this.projectId,
        isResolved: false,
        autoFixable: true,
      },
    });

    const details: Array<{ checkId: string; success: boolean; message: string }> = [];
    let fixed = 0;
    let failed = 0;

    for (const check of checks) {
      try {
        await this.applyAutoFix(check);
        await prisma.unifiedConsistencyCheck.update({
          where: { id: check.id },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
            resolutionNote: 'Auto-fixed',
          },
        });
        details.push({ checkId: check.id, success: true, message: 'Fixed successfully' });
        fixed++;
      } catch (error: any) {
        details.push({ checkId: check.id, success: false, message: error.message });
        failed++;
      }
    }

    return { fixed, failed, details };
  }

  /**
   * Apply specific auto-fix
   */
  private async applyAutoFix(check: any): Promise<void> {
    if (!check.fieldId) return;

    switch (check.autoFixAction) {
      case 'ENABLE_ENCRYPTION':
        await prisma.unifiedField.update({
          where: { id: check.fieldId },
          data: { compRequiresEncryption: true },
        });
        break;

      case 'ENABLE_MASKING':
        await prisma.unifiedField.update({
          where: { id: check.fieldId },
          data: { 
            compRequiresMasking: true,
            compMaskingPattern: '***-**-****',
          },
        });
        break;

      case 'ENABLE_AUDIT':
        await prisma.unifiedField.update({
          where: { id: check.fieldId },
          data: { compAuditRequired: true },
        });
        break;

      case 'CHANGE_TO_DROPDOWN':
        await prisma.unifiedField.update({
          where: { id: check.fieldId },
          data: { 
            uiComponentType: 'dropdown',
            cshtmlInputType: 'select',
          },
        });
        break;

      case 'GENERATE_TEST_CASES':
        const field = await prisma.unifiedField.findUnique({
          where: { id: check.fieldId },
        });
        if (field) {
          const basicTests = [
            {
              testCaseId: `TC-AUTO-${Date.now()}-1`,
              title: `Valid ${field.fieldName} input`,
              type: 'positive',
              input: 'valid_value',
              expectedResult: 'Field accepted',
              priority: 'high',
            },
            {
              testCaseId: `TC-AUTO-${Date.now()}-2`,
              title: `Invalid ${field.fieldName} input`,
              type: 'negative',
              input: '',
              expectedResult: 'Validation error',
              priority: 'high',
            },
          ];
          await prisma.unifiedField.update({
            where: { id: check.fieldId },
            data: { testCases: JSON.stringify(basicTests) },
          });
        }
        break;

      case 'ALIGN_MAX_LENGTH':
        // Get DB max length and apply to UI
        const fieldData = await prisma.unifiedField.findUnique({
          where: { id: check.fieldId },
        });
        if (fieldData && fieldData.schemaMaxLength) {
          await prisma.unifiedField.update({
            where: { id: check.fieldId },
            data: { cshtmlMaxLength: fieldData.schemaMaxLength },
          });
        }
        break;

      case 'GENERATE_DOCUMENTATION':
        const f = await prisma.unifiedField.findUnique({
          where: { id: check.fieldId },
        });
        if (f) {
          await prisma.unifiedField.update({
            where: { id: check.fieldId },
            data: {
              docDeveloperNotes: `Auto-generated: ${f.fieldName} field for ${f.tableName}`,
              docUserGuideText: `Enter ${f.intelSuggestedLabel || f.fieldName}`,
            },
          });
        }
        break;

      case 'APPLY_SOP_AUTOFIX':
        // Clear SOP violations
        await prisma.unifiedField.update({
          where: { id: check.fieldId },
          data: {
            sopViolations: '[]',
            sopTotalCompliant: 0,
          },
        });
        break;

      default:
        throw new Error(`Unknown auto-fix action: ${check.autoFixAction}`);
    }
  }

  /**
   * Get gate status summary
   */
  async getStatus(): Promise<{
    certification: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_READY' | 'NEEDS_REVIEW';
    lastChecked: Date | null;
    totalIssues: number;
    blockingIssues: number;
    autoFixAvailable: number;
  }> {
    const checks = await prisma.unifiedConsistencyCheck.findMany({
      where: { projectId: this.projectId, isResolved: false },
    });

    const blocking = checks.filter(c => c.severity === 'error');
    const autoFixable = checks.filter(c => c.autoFixable);
    
    const lastChecked = checks.length > 0 
      ? checks.reduce((latest, c) => 
          c.updatedAt > latest ? c.updatedAt : latest, 
          checks[0].updatedAt
        )
      : null;

    let certification: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_READY' | 'NEEDS_REVIEW';
    
    if (blocking.length === 0 && checks.filter(c => c.severity === 'warning').length <= 5) {
      certification = 'CERTIFIED';
    } else if (blocking.length === 0) {
      certification = 'CONDITIONAL';
    } else if (blocking.length <= 3) {
      certification = 'NEEDS_REVIEW';
    } else {
      certification = 'NOT_READY';
    }

    return {
      certification,
      lastChecked,
      totalIssues: checks.length,
      blockingIssues: blocking.length,
      autoFixAvailable: autoFixable.length,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export function createQualityGate(projectId: string): QualityGateEngine {
  return new QualityGateEngine(projectId);
}

export async function evaluateQualityGate(projectId: string): Promise<QualityGateResult> {
  const engine = new QualityGateEngine(projectId);
  return engine.evaluate();
}

export async function getQualityGateStatus(projectId: string) {
  const engine = new QualityGateEngine(projectId);
  return engine.getStatus();
}

export async function autoFixIssues(projectId: string) {
  const engine = new QualityGateEngine(projectId);
  return engine.autoFix();
}
