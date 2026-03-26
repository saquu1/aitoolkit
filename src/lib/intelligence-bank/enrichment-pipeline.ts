// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - Enrichment Pipeline Orchestrator
// =============================================================================
// Orchestrates the 12-step enrichment pipeline for field records
// Each step enriches a specific layer of the UnifiedFieldRecord
// =============================================================================

import { db } from '@/lib/db';
import {
  UnifiedFieldRecord,
  EnrichmentContext,
  EnrichmentSession,
  EnrichmentSessionStatus,
  PipelineResult,
  EnrichmentLayer,
  SchemaLayer,
  FKLayer,
  IntelligenceLayer,
  UIComponentLayer,
  ValidationLayer,
  ComplianceLayer,
  ComplexityLayer,
  SOPLayer,
  CSHTMLEvidenceLayer,
  SPEvidenceLayer,
  MetaLayer,
} from './types';

// ─────────────────────────────────────────────
// DEFAULT LAYER VALUES
// ─────────────────────────────────────────────

export function createDefaultSchemaLayer(): SchemaLayer {
  return {
    dataType: null as unknown as string,
    baseType: null as unknown as string,
    maxLength: null,
    precision: null,
    scale: null,
    isNullable: true,
    isPrimaryKey: false,
    isIdentity: false,
    isComputed: false,
    defaultValue: null,
    checkConstraint: null,
    source: 'unknown',
    confidence: 0.0,
  };
}

export function createDefaultFKLayer(): FKLayer {
  return {
    isForeignKey: false,
    referencedTable: null,
    referencedColumn: null,
    referencedTableExists: false,
    relationshipType: null,
    onDelete: null,
    onUpdate: null,
    resolutionStatus: 'not_fk',
    lookupValues: null,
    cascadeChain: [],
    sources: {
      sqlDDL: false,
      spReference: false,
      cshtmlDropdown: false,
      namingPattern: false,
    },
    confidence: 0.0,
  };
}

export function createDefaultIntelligenceLayer(): IntelligenceLayer {
  return {
    semanticType: 'unknown',
    semanticCategory: 'general',
    businessMeaning: '',
    dataPattern: null,
    exampleValues: [],
    suggestedLabel: '',
    suggestedPlaceholder: '',
    suggestedHelpText: '',
    isSystemField: false,
    isAuditField: false,
    isCalculated: false,
    confidence: 0.0,
  };
}

export function createDefaultUIComponentLayer(): UIComponentLayer {
  return {
    componentType: 'text_input',
    htmlInputType: 'text',
    renderAs: 'TextInput',
    framework: {
      react: "<Input type='text' />",
      nextjs: "<Input type='text' />",
      vue: "<el-input />",
      angular: "<mat-form-field><input matInput /></mat-form-field>",
    },
    gridWidth: 'col-md-6',
    labelPosition: 'left',
    displayOrder: 0,
    groupName: null,
    tabName: null,
    sectionName: null,
    isHidden: false,
    isReadOnly: false,
    isDisabled: false,
    conditionalDisplay: null,
    dropdownConfig: null,
    dateConfig: null,
    fileConfig: null,
    confidence: 0.0,
    sopRulesApplied: [],
  };
}

export function createDefaultValidationLayer(): ValidationLayer {
  return {
    isRequired: false,
    clientSideRules: [],
    serverSideRules: [],
    crossFieldRules: [],
    databaseConstraints: [],
    validationAlignment: 'unknown',
    missingValidations: [],
    excessiveValidations: [],
    confidence: 0.0,
  };
}

export function createDefaultComplianceLayer(): ComplianceLayer {
  return {
    sensitivityLevel: 'public',
    isPII: false,
    isPHI: false,
    isFinancial: false,
    piiCategory: null,
    phiCategory: null,
    requiresEncryption: false,
    requiresMasking: false,
    maskingPattern: null,
    retentionPolicy: null,
    consentRequired: false,
    auditRequired: false,
    accessRestrictions: [],
    regulatoryFrameworks: [],
    complianceNotes: [],
    confidence: 0.0,
  };
}

export function createDefaultComplexityLayer(): ComplexityLayer {
  return {
    points: 1.0,
    factors: [{ factor: 'base_column', points: 1.0, description: 'Standard column' }],
    developmentEstimate: { frontend: 0.5, backend: 0.25, testing: 0.25, total: 1.0 },
    migrationRisk: 'low',
    migrationNotes: [],
  };
}

export function createDefaultSOPLayer(): SOPLayer {
  return {
    appliedRules: [],
    totalApplicable: 0,
    totalCompliant: 0,
    compliancePercentage: 0,
    violations: [],
    autoFixable: [],
  };
}

export function createDefaultCSHTMLEvidenceLayer(): CSHTMLEvidenceLayer {
  return {
    foundInViews: [],
    ajaxEndpoints: [],
    jsValidationRules: [],
    cssClasses: [],
    inlineStyles: [],
    dataAttributes: {},
  };
}

export function createDefaultSPEvidenceLayer(): SPEvidenceLayer {
  return {
    usedInSPs: [],
    businessRulesInvolving: [],
    errorCodesInvolving: [],
  };
}

export function createDefaultMetaLayer(): MetaLayer {
  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enrichedBy: [],
    enrichmentCompleteness: 0,
    lastEnrichedAt: new Date().toISOString(),
    overallConfidence: 0,
    needsReview: false,
    reviewNotes: [],
    version: 1,
  };
}

// ─────────────────────────────────────────────
// ENRICHMENT PIPELINE CLASS
// ─────────────────────────────────────────────

/**
 * EnrichmentPipeline - Orchestrates the 12-step enrichment process
 * 
 * Pipeline Steps:
 * 1. CSHTML Parser - Creates initial records from CSHTML views
 * 2. Schema Matcher - Matches to database schema
 * 3. FK Resolver - Resolves foreign key relationships
 * 4. Column Intelligence - Semantic analysis
 * 5. Compliance Scanner - PII/PHI detection
 * 6. Validation Merger - Merges client/server validation
 * 7. UI Component Enrichment - Enhanced UI mapping
 * 8. SOP Compliance Check - Apply SOP rules
 * 9. Complexity Calculator - Calculate field complexity
 * 10. Test Case Generator - Generate test cases
 * 11. Documentation Generator - Create documentation
 * 12. Consistency Validator - Final cross-check
 */
export class EnrichmentPipeline {
  private projectId: string;
  private sessionId: string;
  private session: EnrichmentSession | null = null;
  private fields: Map<string, UnifiedFieldRecord> = new Map();

  constructor(projectId: string) {
    this.projectId = projectId;
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Run the complete enrichment pipeline
   */
  async runPipeline(): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Create session record
      await this.createSession();

      // Step 1: CSHTML Parser
      await this.runStep(1, 'CSHTMLParser', async () => {
        await this.step1_CSHTMLParser();
      });

      // Step 2: Schema Matcher
      await this.runStep(2, 'SchemaMatcher', async () => {
        await this.step2_SchemaMatcher();
      });

      // Step 3: FK Resolver
      await this.runStep(3, 'FKResolver', async () => {
        await this.step3_FKResolver();
      });

      // Step 4: Column Intelligence
      await this.runStep(4, 'ColumnIntelligence', async () => {
        await this.step4_ColumnIntelligence();
      });

      // Step 5: Compliance Scanner
      await this.runStep(5, 'ComplianceScanner', async () => {
        await this.step5_ComplianceScanner();
      });

      // Step 6: Validation Merger
      await this.runStep(6, 'ValidationMerger', async () => {
        await this.step6_ValidationMerger();
      });

      // Step 7: UI Component Enrichment
      await this.runStep(7, 'UIComponentEnricher', async () => {
        await this.step7_UIComponentEnrichment();
      });

      // Step 8: SOP Compliance Check
      await this.runStep(8, 'SOPComplianceChecker', async () => {
        await this.step8_SOPComplianceCheck();
      });

      // Step 9: Complexity Calculator
      await this.runStep(9, 'ComplexityCalculator', async () => {
        await this.step9_ComplexityCalculator();
      });

      // Step 10: Test Case Generator
      await this.runStep(10, 'TestCaseGenerator', async () => {
        await this.step10_TestCaseGenerator();
      });

      // Step 11: Documentation Generator
      await this.runStep(11, 'DocumentationGenerator', async () => {
        await this.step11_DocumentationGenerator();
      });

      // Step 12: Consistency Validator
      await this.runStep(12, 'ConsistencyValidator', async () => {
        await this.step12_ConsistencyValidator();
      });

      // Update session as completed
      await this.completeSession('completed');

      const durationMs = Date.now() - startTime;
      const averageConfidence = this.calculateAverageConfidence();

      return {
        success: true,
        fieldsProcessed: this.fields.size,
        fieldsWithIssues: Array.from(this.fields.values()).filter(f => f.meta.needsReview).length,
        averageConfidence,
        errors,
        warnings,
        durationMs,
      };
    } catch (error) {
      await this.completeSession('failed');
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        success: false,
        fieldsProcessed: this.fields.size,
        fieldsWithIssues: this.fields.size,
        averageConfidence: 0,
        errors,
        warnings,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Create enrichment session record
   */
  private async createSession(): Promise<void> {
    await db.unifiedEnrichmentSession.create({
      data: {
        id: this.sessionId,
        projectId: this.projectId,
        status: 'running',
        currentStep: 0,
        totalSteps: 12,
        currentAgent: null,
        totalFields: 0,
        fieldsEnriched: 0,
        fieldsWithIssues: 0,
        averageConfidence: 0,
        startTime: new Date(),
        errors: '[]',
        warnings: '[]',
      },
    });
  }

  /**
   * Run a single enrichment step
   */
  private async runStep(stepNumber: number, agentName: string, stepFn: () => Promise<void>): Promise<void> {
    // Update session with current step
    await db.unifiedEnrichmentSession.update({
      where: { id: this.sessionId },
      data: {
        currentStep: stepNumber,
        currentAgent: agentName,
      },
    });

    console.log(`[EnrichmentPipeline] Step ${stepNumber}: ${agentName}`);

    await stepFn();

    // Log enrichment for each field
    for (const [qualifiedName, field] of this.fields) {
      await this.logEnrichment(
        field.id,
        agentName,
        this.getLayerForStep(stepNumber),
        field.meta.confidence,
        'pattern_match'
      );

      // Mark as enriched by this agent
      if (!field.meta.enrichedBy.includes(agentName)) {
        field.meta.enrichedBy.push(agentName);
      }
    }
  }

  /**
   * Complete session record
   */
  private async completeSession(status: EnrichmentSessionStatus): Promise<void> {
    await db.unifiedEnrichmentSession.update({
      where: { id: this.sessionId },
      data: {
        status,
        endTime: new Date(),
        durationMs: Date.now() - (this.session?.startTime.getTime() || Date.now()),
        totalFields: this.fields.size,
        fieldsEnriched: this.fields.size,
        fieldsWithIssues: Array.from(this.fields.values()).filter(f => f.meta.needsReview).length,
        averageConfidence: this.calculateAverageConfidence(),
      },
    });
  }

  // ─────────────────────────────────────────────
  // STEP 1: CSHTML Parser
  // ─────────────────────────────────────────────
  
  private async step1_CSHTMLParser(): Promise<void> {
    // Get all CSHTML analysis records for this project
    const cshtmlAnalyses = await db.cSHTMLAnalysisCache.findMany({
      where: { projectId: this.projectId },
    });

    for (const analysis of cshtmlAnalyses) {
      const fields = JSON.parse(analysis.fields || '[]');
      
      for (const field of fields) {
        const qualifiedName = `${analysis.linkedTable || 'Unknown'}.${field.name}`;
        
        // Create initial field record
        const fieldRecord: UnifiedFieldRecord = {
          id: `field-${this.projectId}-${qualifiedName.replace(/\./g, '-')}`,
          projectId: this.projectId,
          tableId: null,
          tableName: analysis.linkedTable || 'Unknown',
          fieldName: field.name,
          qualifiedName,
          displayOrder: field.order || 0,
          
          // Layers
          schema: createDefaultSchemaLayer(),
          foreignKey: createDefaultFKLayer(),
          intelligence: createDefaultIntelligenceLayer(),
          uiComponent: createDefaultUIComponentLayer(),
          validation: createDefaultValidationLayer(),
          compliance: createDefaultComplianceLayer(),
          complexity: createDefaultComplexityLayer(),
          sop: createDefaultSOPLayer(),
          cshtmlEvidence: {
            foundInViews: [{
              viewName: analysis.viewName,
              viewPath: analysis.filePath || '',
              formName: null,
              htmlElementId: field.id || null,
              htmlElementName: field.name,
              htmlElementType: field.type || 'input',
              lineNumber: field.lineNumber || 0,
              contextHTML: field.contextHTML || '',
              isInCreateForm: analysis.viewType === 'form',
              isInUpdateForm: false,
              isInGrid: analysis.viewType === 'list',
              isInFilter: false,
              isInModal: false,
            }],
            ajaxEndpoints: [],
            jsValidationRules: [],
            cssClasses: field.cssClasses || [],
            inlineStyles: [],
            dataAttributes: field.dataAttributes || {},
          },
          spEvidence: createDefaultSPEvidenceLayer(),
          testCases: [],
          documentation: {
            dataDictionary: {
              definition: '',
              businessPurpose: '',
              exampleValues: [],
              relatedFields: [],
              changeHistory: [],
            },
            developerNotes: null,
            userGuideText: null,
            apiDocumentation: null,
          },
          meta: createDefaultMetaLayer(),
        };

        // Set initial UI hints from CSHTML
        fieldRecord.uiComponent.componentType = this.inferComponentType(field.type);
        fieldRecord.uiComponent.htmlInputType = this.inferInputType(field.type);
        fieldRecord.uiComponent.confidence = 0.6;
        
        // Set validation hints
        if (field.required || field.validation?.required) {
          fieldRecord.validation.isRequired = true;
          fieldRecord.validation.clientSideRules.push({
            ruleType: 'notEmpty',
            ruleValue: null,
            errorMessage: `${field.name} is required`,
            source: 'cshtml_attribute',
          });
        }

        fieldRecord.meta.enrichedBy.push('CSHTMLParser');
        fieldRecord.meta.enrichmentCompleteness = 15;
        fieldRecord.meta.overallConfidence = 0.6;
        fieldRecord.schema.confidence = 0.0;
        fieldRecord.foreignKey.confidence = 0.0;
        fieldRecord.intelligence.confidence = 0.0;

        this.fields.set(qualifiedName, fieldRecord);
      }
    }
  }

  // ─────────────────────────────────────────────
  // STEP 2: Schema Matcher
  // ─────────────────────────────────────────────

  private async step2_SchemaMatcher(): Promise<void> {
    // Get all tables for this project
    const tables = await db.toolkitTable.findMany({
      where: { projectId: this.projectId },
    });

    const tableMap = new Map(tables.map(t => [t.tableName, JSON.parse(t.columns || '[]')]));

    for (const [qualifiedName, field] of this.fields) {
      const tableName = field.tableName;
      const fieldName = field.fieldName;
      
      if (tableMap.has(tableName)) {
        const columns = tableMap.get(tableName);
        const column = columns.find((c: any) => c.name === fieldName);
        
        if (column) {
          // Enrich schema layer
          field.schema = {
            dataType: column.dataType || 'UNKNOWN',
            baseType: this.mapBaseType(column.dataType),
            maxLength: column.maxLength || null,
            precision: column.precision || null,
            scale: column.scale || null,
            isNullable: column.isNullable !== false,
            isPrimaryKey: column.isPrimaryKey || false,
            isIdentity: column.isIdentity || false,
            isComputed: column.isComputed || false,
            defaultValue: column.defaultValue || null,
            checkConstraint: null,
            source: 'sql_ddl',
            confidence: 1.0,
          };

          // Update validation layer with DB constraints
          if (!column.isNullable) {
            field.validation.isRequired = true;
            field.validation.databaseConstraints.push({
              constraintType: 'NOT NULL',
              constraintDefinition: `${fieldName} NOT NULL`,
            });
          }

          if (column.isPrimaryKey) {
            field.uiComponent.isHidden = true; // PKs are usually hidden
            field.uiComponent.isReadOnly = true;
          }

          field.meta.enrichmentCompleteness = 30;
          field.schema.confidence = 1.0;
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // STEP 3: FK Resolver
  // ─────────────────────────────────────────────

  private async step3_FKResolver(): Promise<void> {
    // Get all FK information from tables
    const tables = await db.toolkitTable.findMany({
      where: { projectId: this.projectId },
    });

    // Build FK map
    const fkMap = new Map<string, any>();
    for (const table of tables) {
      const fks = JSON.parse(table.foreignKeys || '[]');
      for (const fk of fks) {
        const key = `${table.tableName}.${fk.column}`;
        fkMap.set(key, fk);
      }
    }

    // Get SP usage for cross-reference
    const sps = await db.storedProcedureCache.findMany({
      where: { projectId: this.projectId },
    });

    // Build column usage from SPs
    const spColumnUsage = new Map<string, string[]>();
    for (const sp of sps) {
      const tablesRef = JSON.parse(sp.tablesReferenced || '[]');
      for (const tRef of tablesRef) {
        const key = `${tRef.tableName}`;
        if (!spColumnUsage.has(key)) {
          spColumnUsage.set(key, []);
        }
        spColumnUsage.get(key)!.push(sp.procedureName);
      }
    }

    for (const [qualifiedName, field] of this.fields) {
      const fkKey = `${field.tableName}.${field.fieldName}`;
      
      // Check if field is a FK from DDL
      if (fkMap.has(fkKey)) {
        const fk = fkMap.get(fkKey);
        field.foreignKey = {
          isForeignKey: true,
          referencedTable: fk.referencedTable,
          referencedColumn: fk.referencedColumn || 'Id',
          referencedTableExists: tables.some(t => t.tableName === fk.referencedTable),
          relationshipType: 'one_to_many',
          onDelete: fk.onDelete || null,
          onUpdate: fk.onUpdate || null,
          resolutionStatus: tables.some(t => t.tableName === fk.referencedTable) ? 'resolved' : 'missing_table',
          lookupValues: null,
          cascadeChain: [],
          sources: {
            sqlDDL: true,
            spReference: false,
            cshtmlDropdown: field.cshtmlEvidence.foundInViews.some(v => v.htmlElementType === 'select'),
            namingPattern: field.fieldName.endsWith('Id'),
          },
          confidence: 0.99,
        };
      } else if (field.fieldName.endsWith('Id') && field.fieldName !== 'Id') {
        // Naming convention suggests FK
        const possibleTable = field.fieldName.replace(/Id$/, '');
        const tableExists = tables.some(t => t.tableName === possibleTable);
        
        if (tableExists || field.cshtmlEvidence.foundInViews.some(v => v.htmlElementType === 'select')) {
          field.foreignKey = {
            isForeignKey: true,
            referencedTable: possibleTable,
            referencedColumn: 'Id',
            referencedTableExists: tableExists,
            relationshipType: 'one_to_many',
            onDelete: null,
            onUpdate: null,
            resolutionStatus: tableExists ? 'resolved' : 'unresolved',
            lookupValues: null,
            cascadeChain: [],
            sources: {
              sqlDDL: false,
              spReference: false,
              cshtmlDropdown: field.cshtmlEvidence.foundInViews.some(v => v.htmlElementType === 'select'),
              namingPattern: true,
            },
            confidence: tableExists ? 0.85 : 0.60,
          };
        }
      }

      // Update UI component based on FK
      if (field.foreignKey.isForeignKey) {
        field.uiComponent.componentType = 'dropdown';
        field.uiComponent.renderAs = 'Select';
        field.uiComponent.htmlInputType = 'select';
        field.uiComponent.dropdownConfig = {
          sourceType: 'api',
          sourceEndpoint: `/api/${field.foreignKey.referencedTable?.toLowerCase()}/dropdown`,
          sourceSP: null,
          valueField: 'Id',
          displayField: 'Name',
          hasSearch: true,
          isMultiSelect: false,
          cascadeParent: null,
          cascadeChild: null,
          defaultText: `Select ${field.foreignKey.referencedTable}`,
        };
      }

      field.meta.enrichmentCompleteness = 45;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 4: Column Intelligence
  // ─────────────────────────────────────────────

  private async step4_ColumnIntelligence(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      // Use existing column intelligence patterns
      const intel = this.analyzeColumnIntelligence(field);
      field.intelligence = intel;
      
      // Update UI based on intelligence
      if (intel.semanticType === 'email') {
        field.uiComponent.htmlInputType = 'email';
        field.compliance.isPII = true;
        field.compliance.piiCategory = 'email';
      } else if (intel.semanticType === 'phone' || intel.semanticType === 'phone_number') {
        field.uiComponent.htmlInputType = 'tel';
        field.compliance.isPII = true;
        field.compliance.piiCategory = 'phone';
      } else if (intel.semanticType === 'date' || intel.semanticType === 'date_of_birth') {
        field.uiComponent.componentType = 'datepicker';
        field.uiComponent.renderAs = 'DatePicker';
        field.uiComponent.htmlInputType = 'date';
        if (intel.semanticType === 'date_of_birth') {
          field.compliance.isPII = true;
          field.compliance.piiCategory = 'dob';
        }
      } else if (intel.semanticType === 'boolean' || intel.semanticType === 'boolean_toggle') {
        field.uiComponent.componentType = 'toggle';
        field.uiComponent.renderAs = 'Switch';
        field.uiComponent.htmlInputType = 'checkbox';
      }

      field.meta.enrichmentCompleteness = 55;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 5: Compliance Scanner
  // ─────────────────────────────────────────────

  private async step5_ComplianceScanner(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      // Use intelligence + FK to determine compliance
      if (field.compliance.isPII || field.compliance.isPHI) {
        field.compliance.sensitivityLevel = 'confidential';
        field.compliance.requiresEncryption = true;
        field.compliance.auditRequired = true;
        field.compliance.regulatoryFrameworks = ['GDPR'];
        
        if (field.compliance.isPHI) {
          field.compliance.regulatoryFrameworks.push('HIPAA');
          field.compliance.sensitivityLevel = 'restricted';
        }
      }

      // Check FK - lookup tables are NOT PII
      if (field.foreignKey.isForeignKey) {
        const refTable = field.foreignKey.referencedTable;
        // Lookup tables like Countries, OrganizationTypes are not PII
        const lookupPatterns = ['Countries', 'Types', 'Statuses', 'Categories', 'Roles'];
        const isLookup = lookupPatterns.some(p => refTable?.includes(p));
        
        if (isLookup) {
          field.compliance.isPII = false;
          field.compliance.isPHI = false;
          field.compliance.sensitivityLevel = 'public';
        } else if (refTable?.includes('Patient') || refTable?.includes('User')) {
          // FK to person tables = PII reference
          field.compliance.isPII = true;
          field.compliance.piiCategory = 'person_reference';
        }
      }

      field.meta.enrichmentCompleteness = 65;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 6: Validation Merger
  // ─────────────────────────────────────────────

  private async step6_ValidationMerger(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      // Check alignment
      const clientRequired = field.validation.clientSideRules.some(r => r.ruleType === 'notEmpty');
      const dbRequired = !field.schema.isNullable;
      
      if (clientRequired && dbRequired) {
        field.validation.validationAlignment = 'full';
      } else if (clientRequired !== dbRequired) {
        field.validation.validationAlignment = 'mismatch';
        field.meta.needsReview = true;
        field.meta.reviewNotes.push(
          `Validation mismatch: Client says ${clientRequired ? 'required' : 'optional'}, DB says ${dbRequired ? 'required' : 'optional'}`
        );
      }

      field.meta.enrichmentCompleteness = 75;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 7: UI Component Enrichment
  // ─────────────────────────────────────────────

  private async step7_UIComponentEnrichment(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      // Apply FK data to UI
      if (field.foreignKey.isForeignKey && field.foreignKey.resolutionStatus === 'resolved') {
        if (!field.uiComponent.dropdownConfig) {
          field.uiComponent.dropdownConfig = {
            sourceType: 'api',
            sourceEndpoint: `/api/${field.foreignKey.referencedTable?.toLowerCase()}/dropdown`,
            sourceSP: null,
            valueField: 'Id',
            displayField: 'Name',
            hasSearch: true,
            isMultiSelect: false,
            cascadeParent: null,
            cascadeChild: null,
            defaultText: `Select ${field.foreignKey.referencedTable}`,
          };
        }
      }

      // Apply validation to UI
      if (field.validation.isRequired) {
        field.uiComponent.gridWidth = 'col-md-6'; // Required fields get more space
      }

      field.uiComponent.confidence = 0.95;
      field.meta.enrichmentCompleteness = 85;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 8: SOP Compliance Check
  // ─────────────────────────────────────────────

  private async step8_SOPComplianceCheck(): Promise<void> {
    // Get active SOP rules
    const sopRules = await db.unifiedSOPRule.findMany({
      where: {
        OR: [
          { projectId: this.projectId },
          { projectId: null, isSystemDefault: true },
        ],
        isActive: true,
      },
    });

    for (const [qualifiedName, field] of this.fields) {
      let totalApplicable = 0;
      let totalCompliant = 0;
      const violations: string[] = [];
      const autoFixable: string[] = [];

      for (const rule of sopRules) {
        if (this.sopAppliesToField(rule, field)) {
          totalApplicable++;
          const compliance = this.checkSOPCompliance(rule, field);
          
          if (compliance.isCompliant) {
            totalCompliant++;
          } else {
            violations.push(rule.sopId);
            if (compliance.autoFixAvailable) {
              autoFixable.push(rule.sopId);
            }
          }

          field.sop.appliedRules.push({
            sopId: rule.sopId,
            sopName: rule.name,
            category: rule.category,
            priority: rule.priority,
            isCompliant: compliance.isCompliant,
            complianceNote: compliance.note,
            autoFixAvailable: compliance.autoFixAvailable,
          });
        }
      }

      field.sop.totalApplicable = totalApplicable;
      field.sop.totalCompliant = totalCompliant;
      field.sop.compliancePercentage = totalApplicable > 0 ? (totalCompliant / totalApplicable) * 100 : 100;
      field.sop.violations = violations;
      field.sop.autoFixable = autoFixable;

      if (violations.length > 0) {
        field.meta.needsReview = true;
        field.meta.reviewNotes.push(`${violations.length} SOP violations found`);
      }

      field.meta.enrichmentCompleteness = 90;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 9: Complexity Calculator
  // ─────────────────────────────────────────────

  private async step9_ComplexityCalculator(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      let points = 1.0;
      const factors: { factor: string; points: number; description: string }[] = [
        { factor: 'base_column', points: 1.0, description: 'Standard column' },
      ];

      // FK complexity
      if (field.foreignKey.isForeignKey) {
        points += 1.0;
        factors.push({ factor: 'fk_relationship', points: 1.0, description: `FK to ${field.foreignKey.referencedTable}` });
      }

      // Required field
      if (field.validation.isRequired) {
        points += 0.5;
        factors.push({ factor: 'required_field', points: 0.5, description: 'Required validation' });
      }

      // PII/PHI
      if (field.compliance.isPII) {
        points += 0.5;
        factors.push({ factor: 'pii_field', points: 0.5, description: 'PII handling required' });
      }
      if (field.compliance.isPHI) {
        points += 1.0;
        factors.push({ factor: 'phi_field', points: 1.0, description: 'PHI handling required' });
      }

      // UI complexity
      if (field.uiComponent.dropdownConfig?.hasSearch) {
        points += 0.5;
        factors.push({ factor: 'searchable_dropdown', points: 0.5, description: 'Searchable dropdown' });
      }

      // Validation complexity
      points += field.validation.clientSideRules.length * 0.1;
      points += field.validation.serverSideRules.length * 0.2;

      field.complexity = {
        points,
        factors,
        developmentEstimate: {
          frontend: points * 0.5,
          backend: points * 0.3,
          testing: points * 0.2,
          total: points,
        },
        migrationRisk: points > 3 ? 'high' : points > 1.5 ? 'medium' : 'low',
        migrationNotes: [],
      };

      field.meta.enrichmentCompleteness = 95;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 10: Test Case Generator
  // ─────────────────────────────────────────────

  private async step10_TestCaseGenerator(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      const testCases: any[] = [];
      let tcCount = 1;

      // Positive test
      testCases.push({
        testCaseId: `TC-${field.tableName.substring(0, 3).toUpperCase()}-${field.fieldName.substring(0, 3).toUpperCase()}-${String(tcCount++).padStart(3, '0')}`,
        title: `Valid ${field.fieldName} input`,
        type: 'positive',
        input: this.generateValidInput(field),
        expectedResult: 'Field accepted',
        priority: 'high',
        category: 'validation',
        automatable: true,
        generatedFrom: 'validation',
      });

      // Required test
      if (field.validation.isRequired) {
        testCases.push({
          testCaseId: `TC-${field.tableName.substring(0, 3).toUpperCase()}-${field.fieldName.substring(0, 3).toUpperCase()}-${String(tcCount++).padStart(3, '0')}`,
          title: `Empty ${field.fieldName} validation`,
          type: 'negative',
          input: '',
          expectedResult: 'Validation error: Field is required',
          priority: 'critical',
          category: 'validation',
          automatable: true,
          generatedFrom: 'validation',
        });
      }

      // Max length test
      if (field.schema.maxLength) {
        testCases.push({
          testCaseId: `TC-${field.tableName.substring(0, 3).toUpperCase()}-${field.fieldName.substring(0, 3).toUpperCase()}-${String(tcCount++).padStart(3, '0')}`,
          title: `${field.fieldName} exceeds max length`,
          type: 'boundary',
          input: 'x'.repeat(field.schema.maxLength + 1),
          expectedResult: `Validation error: Max ${field.schema.maxLength} characters`,
          priority: 'medium',
          category: 'validation',
          automatable: true,
          generatedFrom: 'validation',
        });
      }

      // PII security test
      if (field.compliance.isPII) {
        testCases.push({
          testCaseId: `TC-${field.tableName.substring(0, 3).toUpperCase()}-${field.fieldName.substring(0, 3).toUpperCase()}-${String(tcCount++).padStart(3, '0')}`,
          title: `${field.fieldName} PII masking`,
          type: 'security',
          input: 'Verify masking in logs',
          expectedResult: 'Value masked in audit logs',
          priority: 'high',
          category: 'security',
          automatable: true,
          generatedFrom: 'compliance',
        });
      }

      field.testCases = testCases;
      field.meta.enrichmentCompleteness = 98;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 11: Documentation Generator
  // ─────────────────────────────────────────────

  private async step11_DocumentationGenerator(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      field.documentation = {
        dataDictionary: {
          definition: `${field.fieldName} - ${field.intelligence.businessMeaning || field.fieldName}`,
          businessPurpose: field.intelligence.businessMeaning || `Stores ${field.fieldName} information`,
          exampleValues: field.intelligence.exampleValues,
          relatedFields: field.foreignKey.isForeignKey ? [field.foreignKey.referencedTable!] : [],
          changeHistory: [],
        },
        developerNotes: this.generateDeveloperNotes(field),
        userGuideText: this.generateUserGuideText(field),
        apiDocumentation: this.generateApiDocumentation(field),
      };

      field.meta.enrichmentCompleteness = 100;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 12: Consistency Validator
  // ─────────────────────────────────────────────

  private async step12_ConsistencyValidator(): Promise<void> {
    for (const [qualifiedName, field] of this.fields) {
      // Check FK consistency
      if (field.foreignKey.isForeignKey && field.foreignKey.referencedTable) {
        if (!field.foreignKey.referencedTableExists) {
          await this.createConsistencyCheck(field, 'fk_table_missing', 'error',
            `FK references missing table ${field.foreignKey.referencedTable}`,
            `Table ${field.foreignKey.referencedTable} does not exist`,
            `Table ${field.foreignKey.referencedTable} should be created or uploaded`,
            false
          );
        }
      }

      // Check validation alignment
      if (field.validation.validationAlignment === 'mismatch') {
        await this.createConsistencyCheck(field, 'validation_mismatch', 'warning',
          'Validation mismatch between client and server',
          field.validation.isRequired ? 'Client required, DB nullable' : 'DB required, client optional',
          'Validation should be aligned',
          true
        );
      }

      // Check PII without encryption
      if (field.compliance.isPII && !field.compliance.requiresEncryption) {
        await this.createConsistencyCheck(field, 'pii_no_encryption', 'warning',
          'PII field without encryption flag',
          'Field marked as PII but encryption not required',
          'Encryption should be required for PII fields',
          true
        );
      }

      // Check SOP violations
      if (field.sop.violations.length > 0 && field.sop.autoFixable.length === field.sop.violations.length) {
        await this.createConsistencyCheck(field, 'sop_violation_unfixed', 'info',
          `All ${field.sop.violations.length} SOP violations are auto-fixable`,
          `${field.sop.violations.length} SOP violations`,
          'Apply auto-fixes',
          true
        );
      }

      // Calculate final confidence
      field.meta.overallConfidence = this.calculateFieldConfidence(field);
    }
  }

  // ─────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────

  private async logEnrichment(
    fieldId: string,
    agentName: string,
    layer: EnrichmentLayer,
    confidenceAfter: number,
    method: string
  ): Promise<void> {
    await db.unifiedEnrichmentLog.create({
      data: {
        fieldId,
        projectId: this.projectId,
        agentName,
        layerEnriched: layer,
        previousValue: null,
        newValue: '{}',
        confidenceBefore: null,
        confidenceAfter,
        enrichmentMethod: method,
      },
    });
  }

  private getLayerForStep(step: number): EnrichmentLayer {
    const layerMap: Record<number, EnrichmentLayer> = {
      1: 'cshtml_evidence',
      2: 'schema',
      3: 'fk',
      4: 'intelligence',
      5: 'compliance',
      6: 'validation',
      7: 'ui_component',
      8: 'sop',
      9: 'complexity',
      10: 'test_cases',
      11: 'documentation',
      12: 'cshtml_evidence', // Consistency uses all
    };
    return layerMap[step] || 'schema';
  }

  private inferComponentType(htmlType: string): string {
    const typeMap: Record<string, string> = {
      'input': 'text_input',
      'text': 'text_input',
      'select': 'dropdown',
      'textarea': 'textarea',
      'checkbox': 'toggle',
      'radio': 'radio_group',
      'file': 'file_upload',
      'date': 'datepicker',
    };
    return typeMap[htmlType?.toLowerCase()] || 'text_input';
  }

  private inferInputType(htmlType: string): string {
    const typeMap: Record<string, string> = {
      'input': 'text',
      'text': 'text',
      'email': 'email',
      'password': 'password',
      'number': 'number',
      'date': 'date',
      'select': 'select',
      'textarea': 'textarea',
      'checkbox': 'checkbox',
    };
    return typeMap[htmlType?.toLowerCase()] || 'text';
  }

  private mapBaseType(dataType: string): string {
    if (!dataType) return 'unknown';
    const type = dataType.toUpperCase();
    if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'BIT'].includes(type)) return 'int';
    if (['DECIMAL', 'NUMERIC', 'MONEY', 'SMALLMONEY'].includes(type)) return 'decimal';
    if (['FLOAT', 'REAL'].includes(type)) return 'float';
    if (['NVARCHAR', 'VARCHAR', 'CHAR', 'NCHAR', 'TEXT', 'NTEXT'].includes(type)) return 'string';
    if (['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME'].includes(type)) return 'date';
    if (['TIME'].includes(type)) return 'time';
    if (['UNIQUEIDENTIFIER'].includes(type)) return 'guid';
    return 'unknown';
  }

  private analyzeColumnIntelligence(field: UnifiedFieldRecord): IntelligenceLayer {
    const name = field.fieldName.toLowerCase();
    const type = field.schema.dataType?.toLowerCase() || '';

    // Name patterns
    if (name.includes('email')) {
      return {
        semanticType: 'email',
        semanticCategory: 'contact_info',
        businessMeaning: `${field.fieldName} - Email address`,
        dataPattern: '^[^@]+@[^@]+\\.[^@]+$',
        exampleValues: ['user@example.com'],
        suggestedLabel: 'Email Address',
        suggestedPlaceholder: 'Enter email address',
        suggestedHelpText: 'Valid email address',
        isSystemField: false,
        isAuditField: false,
        isCalculated: false,
        confidence: 0.95,
      };
    }

    if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) {
      return {
        semanticType: 'phone_number',
        semanticCategory: 'contact_info',
        businessMeaning: `${field.fieldName} - Phone number`,
        dataPattern: '###-###-####',
        exampleValues: ['123-456-7890'],
        suggestedLabel: 'Phone Number',
        suggestedPlaceholder: 'Enter phone number',
        suggestedHelpText: 'Phone number in format ###-###-####',
        isSystemField: false,
        isAuditField: false,
        isCalculated: false,
        confidence: 0.9,
      };
    }

    if (name === 'name' || name.includes('_name')) {
      return {
        semanticType: 'name',
        semanticCategory: 'identity',
        businessMeaning: `${field.fieldName} - Name field`,
        dataPattern: null,
        exampleValues: [],
        suggestedLabel: field.fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        suggestedPlaceholder: `Enter ${field.fieldName.replace(/_/g, ' ').toLowerCase()}`,
        suggestedHelpText: '',
        isSystemField: false,
        isAuditField: false,
        isCalculated: false,
        confidence: 0.85,
      };
    }

    if (name.includes('date') || type.includes('date')) {
      return {
        semanticType: 'date',
        semanticCategory: 'temporal',
        businessMeaning: `${field.fieldName} - Date field`,
        dataPattern: 'DD/MM/YYYY',
        exampleValues: [],
        suggestedLabel: field.fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        suggestedPlaceholder: 'Select date',
        suggestedHelpText: '',
        isSystemField: false,
        isAuditField: false,
        isCalculated: false,
        confidence: 0.85,
      };
    }

    if (name.includes('is') || name.includes('active') || name.includes('enabled') || type === 'bit') {
      return {
        semanticType: 'boolean_toggle',
        semanticCategory: 'status',
        businessMeaning: `${field.fieldName} - Boolean/flag field`,
        dataPattern: null,
        exampleValues: ['Yes', 'No'],
        suggestedLabel: field.fieldName.replace(/^(Is|Has)/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        suggestedPlaceholder: '',
        suggestedHelpText: '',
        isSystemField: false,
        isAuditField: false,
        isCalculated: false,
        confidence: 0.8,
      };
    }

    // System fields
    if (name.includes('created') || name.includes('modified')) {
      return {
        semanticType: 'audit_timestamp',
        semanticCategory: 'system',
        businessMeaning: `${field.fieldName} - System audit field`,
        dataPattern: null,
        exampleValues: [],
        suggestedLabel: field.fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        suggestedPlaceholder: '',
        suggestedHelpText: '',
        isSystemField: true,
        isAuditField: true,
        isCalculated: false,
        confidence: 0.95,
      };
    }

    return createDefaultIntelligenceLayer();
  }

  private sopAppliesToField(rule: any, field: UnifiedFieldRecord): boolean {
    const appliesTo = rule.appliesTo;
    
    switch (appliesTo) {
      case 'all_fields':
        return true;
      case 'dropdown_fields':
        return field.uiComponent.componentType === 'dropdown';
      case 'date_fields':
        return field.intelligence.semanticType === 'date';
      case 'grid_columns':
        return field.cshtmlEvidence.foundInViews.some(v => v.isInGrid);
      case 'text_inputs':
        return field.uiComponent.componentType === 'text_input';
      case 'required_fields':
        return field.validation.isRequired;
      case 'pii_fields':
        return field.compliance.isPII;
      default:
        return false;
    }
  }

  private checkSOPCompliance(rule: any, field: UnifiedFieldRecord): { isCompliant: boolean; note: string; autoFixAvailable: boolean } {
    // Example: SOP-INPUT-MAX - all text inputs should have maxlength
    if (rule.sopId === 'SOP-INPUT-MAX') {
      const hasMaxLength = field.schema.maxLength !== null;
      return {
        isCompliant: hasMaxLength,
        note: hasMaxLength ? 'Max length defined' : 'Missing max length attribute',
        autoFixAvailable: false,
      };
    }

    // Example: SOP-DROPDOWN-SEARCH - dropdowns with >10 options should be searchable
    if (rule.sopId === 'SOP-DROPDOWN-SEARCH') {
      const isSearchable = field.uiComponent.dropdownConfig?.hasSearch || false;
      return {
        isCompliant: isSearchable,
        note: isSearchable ? 'Dropdown is searchable' : 'Dropdown should be searchable',
        autoFixAvailable: true,
      };
    }

    return { isCompliant: true, note: 'Compliant', autoFixAvailable: false };
  }

  private async createConsistencyCheck(
    field: UnifiedFieldRecord,
    checkType: string,
    severity: string,
    description: string,
    currentState: string,
    expectedState: string,
    autoFixable: boolean
  ): Promise<void> {
    await db.unifiedConsistencyCheck.create({
      data: {
        projectId: this.projectId,
        tableName: field.tableName,
        fieldId: field.id,
        checkType,
        severity,
        description,
        currentState,
        expectedState,
        autoFixable,
        autoFixAction: autoFixable ? '{}' : null,
        isResolved: false,
      },
    });
  }

  private generateValidInput(field: UnifiedFieldRecord): string {
    switch (field.intelligence.semanticType) {
      case 'email':
        return 'test@example.com';
      case 'phone_number':
        return '123-456-7890';
      case 'date':
        return '01/01/2024';
      case 'boolean_toggle':
        return 'true';
      default:
        return `valid_${field.fieldName.toLowerCase()}`;
    }
  }

  private generateDeveloperNotes(field: UnifiedFieldRecord): string {
    const notes: string[] = [];
    
    if (field.foreignKey.isForeignKey) {
      notes.push(`FK to ${field.foreignKey.referencedTable}`);
    }
    if (field.compliance.isPII) {
      notes.push('PII field - handle with care');
    }
    if (field.compliance.isPHI) {
      notes.push('PHI field - HIPAA compliance required');
    }
    if (field.validation.validationAlignment === 'mismatch') {
      notes.push('WARNING: Validation mismatch between client and server');
    }
    
    return notes.join('\n');
  }

  private generateUserGuideText(field: UnifiedFieldRecord): string {
    const label = field.intelligence.suggestedLabel || field.fieldName;
    let text = `Enter the ${label.toLowerCase()}.`;
    
    if (field.validation.isRequired) {
      text += ' This field is required.';
    }
    if (field.schema.maxLength) {
      text += ` Maximum ${field.schema.maxLength} characters.`;
    }
    
    return text;
  }

  private generateApiDocumentation(field: UnifiedFieldRecord): string {
    return `**${field.fieldName}** (${field.schema.dataType || 'unknown'})
- Required: ${field.validation.isRequired}
- Max Length: ${field.schema.maxLength || 'N/A'}
- PII: ${field.compliance.isPII}`;
  }

  private calculateFieldConfidence(field: UnifiedFieldRecord): number {
    const weights = {
      schema: 0.15,
      fk: 0.10,
      intelligence: 0.15,
      uiComponent: 0.10,
      validation: 0.15,
      compliance: 0.15,
      complexity: 0.10,
      sop: 0.10,
    };

    let total = 0;
    total += field.schema.confidence * weights.schema;
    total += field.foreignKey.confidence * weights.fk;
    total += field.intelligence.confidence * weights.intelligence;
    total += field.uiComponent.confidence * weights.uiComponent;
    total += field.validation.confidence * weights.validation;
    total += field.compliance.confidence * weights.compliance;
    
    // SOP compliance percentage as confidence
    total += (field.sop.compliancePercentage / 100) * weights.sop;
    
    return Math.min(total, 1.0);
  }

  private calculateAverageConfidence(): number {
    if (this.fields.size === 0) return 0;
    let sum = 0;
    for (const field of this.fields.values()) {
      sum += field.meta.overallConfidence;
    }
    return sum / this.fields.size;
  }
}

// Export helper function
export async function runEnrichmentPipeline(projectId: string): Promise<PipelineResult> {
  const pipeline = new EnrichmentPipeline(projectId);
  return pipeline.runPipeline();
}
