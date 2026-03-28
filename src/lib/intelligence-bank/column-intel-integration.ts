// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - Column Intelligence Integration Service
// =============================================================================
// Integrates Column Intelligence with UnifiedField records
// =============================================================================

import { db } from '@/lib/db';
import { ColumnIntelligenceEngine, ColumnIntelligenceResult } from '@/lib/column-intelligence';
import { 
  createDefaultIntelligenceLayer,
  createDefaultUIComponentLayer,
  createDefaultValidationLayer,
  IntelligenceLayer,
  UIComponentLayer,
  ValidationLayer,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ColumnIntelIntegrationResult {
  totalFieldsProcessed: number;
  semanticTypesIdentified: number;
  uiComponentsSuggested: number;
  piiFieldsDetected: number;
  phiFieldsDetected: number;
  validationRulesGenerated: number;
  enrichmentLogsCreated: number;
}

export interface ColumnIntelUpdate {
  fieldId: string;
  tableName: string;
  fieldName: string;
  intelligence: IntelligenceLayer;
  uiComponent: Partial<UIComponentLayer>;
  validation: Partial<ValidationLayer>;
  complianceUpdates: Record<string, unknown>;
  confidence: number;
}

// =============================================================================
// COLUMN INTELLIGENCE INTEGRATION SERVICE
// =============================================================================

export class ColumnIntelIntegrationService {
  private projectId: string;
  private engine: ColumnIntelligenceEngine;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.engine = new ColumnIntelligenceEngine({
      strictMode: false,
      inferRelations: true,
      detectPII: true,
      detectPHI: true,
      suggestIndexes: true,
    });
  }

  /**
   * Run Column Intelligence integration for all fields
   */
  async runIntegration(): Promise<ColumnIntelIntegrationResult> {
    const result: ColumnIntelIntegrationResult = {
      totalFieldsProcessed: 0,
      semanticTypesIdentified: 0,
      uiComponentsSuggested: 0,
      piiFieldsDetected: 0,
      phiFieldsDetected: 0,
      validationRulesGenerated: 0,
      enrichmentLogsCreated: 0,
    };

    // Get all tables with column definitions
    const tables = await db.toolkitTable.findMany({
      where: { projectId: this.projectId },
    });

    // Get all UnifiedField records
    const fields = await db.unifiedField.findMany({
      where: { projectId: this.projectId },
    });

    // Process each field
    for (const field of fields) {
      const table = tables.find(t => t.tableName === field.tableName);
      if (!table) continue;

      const columns = JSON.parse(table.columns || '[]');
      const column = columns.find((c: any) => c.name === field.fieldName);
      if (!column) continue;

      // Run column intelligence analysis
      const intelResult = this.engine.analyzeColumn(column, field.tableName);
      const update = this.buildUpdate(field, intelResult, column);

      if (update) {
        result.totalFieldsProcessed++;

        if (update.intelligence.semanticType !== 'unknown') {
          result.semanticTypesIdentified++;
        }

        if (update.uiComponent.componentType) {
          result.uiComponentsSuggested++;
        }

        if (update.complianceUpdates['compIsPII']) {
          result.piiFieldsDetected++;
        }

        if (update.complianceUpdates['compIsPHI']) {
          result.phiFieldsDetected++;
        }

        if (update.validation.validationClientRules) {
          const rules = JSON.parse(update.validation.validationClientRules as string);
          result.validationRulesGenerated += rules.length;
        }

        // Apply updates
        await this.applyUpdate(update);
        result.enrichmentLogsCreated++;
      }
    }

    return result;
  }

  /**
   * Build update from intelligence result
   */
  private buildUpdate(
    field: any,
    intelResult: ColumnIntelligenceResult,
    column: any
  ): ColumnIntelUpdate | null {
    const intel = intelResult.column;

    // Build Intelligence Layer
    const intelligence: IntelligenceLayer = {
      semanticType: intel.inferredSemanticType,
      semanticCategory: this.categorizeSemanticType(intel.inferredSemanticType),
      businessMeaning: this.inferBusinessMeaning(field.fieldName, intel.inferredSemanticType),
      dataPattern: this.getDataPattern(intel.inferredSemanticType),
      exampleValues: [],
      suggestedLabel: intel.label,
      suggestedPlaceholder: intel.placeholder,
      suggestedHelpText: this.generateHelpText(field.fieldName, intel.inferredSemanticType),
      isSystemField: this.isSystemField(field.fieldName),
      isAuditField: this.isAuditField(field.fieldName),
      isCalculated: false,
      confidence: intel.confidence / 100,
    };

    // Build UI Component updates
    const uiComponent: Partial<UIComponentLayer> = {
      componentType: this.mapUIType(intel.inferredUIType),
      htmlInputType: this.mapHtmlInputType(intel.inferredUIType),
      renderAs: this.mapRenderAs(intel.inferredUIType),
      confidence: intel.confidence / 100,
    };

    // Build Validation updates
    const validationRules = intel.validationRules.map(rule => ({
      ruleType: rule.type,
      ruleValue: rule.value || null,
      errorMessage: rule.message,
      source: 'pattern_match',
    }));

    const validation: Partial<ValidationLayer> = {
      isRequired: !column.isNullable && !column.isPrimaryKey,
      clientSideRules: validationRules,
      confidence: 0.85,
    };

    // Build Compliance updates
    const complianceUpdates: Record<string, unknown> = {};
    
    if (intel.sensitivityLevel === 'pii') {
      complianceUpdates['compIsPII'] = true;
      complianceUpdates['compPiiCategory'] = this.mapPIICategory(intel.inferredSemanticType);
      complianceUpdates['compRequiresEncryption'] = true;
      complianceUpdates['compSensitivityLevel'] = 'confidential';
    }

    if (intel.sensitivityLevel === 'phi') {
      complianceUpdates['compIsPHI'] = true;
      complianceUpdates['compPhiCategory'] = this.mapPHICategory(intel.inferredSemanticType);
      complianceUpdates['compRequiresEncryption'] = true;
      complianceUpdates['compAuditRequired'] = true;
      complianceUpdates['compSensitivityLevel'] = 'restricted';
      complianceUpdates['compRegulatoryFrameworks'] = JSON.stringify(['HIPAA']);
    }

    if (intel.sensitivityLevel === 'secret') {
      complianceUpdates['compSensitivityLevel'] = 'restricted';
      complianceUpdates['compRequiresEncryption'] = true;
    }

    return {
      fieldId: field.id,
      tableName: field.tableName,
      fieldName: field.fieldName,
      intelligence,
      uiComponent,
      validation,
      complianceUpdates,
      confidence: intel.confidence / 100,
    };
  }

  /**
   * Apply update to database
   */
  private async applyUpdate(update: ColumnIntelUpdate): Promise<void> {
    // Build update data
    const updateData: Record<string, unknown> = {
      // Intelligence layer
      intelSemanticType: update.intelligence.semanticType,
      intelSemanticCategory: update.intelligence.semanticCategory,
      intelBusinessMeaning: update.intelligence.businessMeaning,
      intelDataPattern: update.intelligence.dataPattern,
      intelSuggestedLabel: update.intelligence.suggestedLabel,
      intelSuggestedPlaceholder: update.intelligence.suggestedPlaceholder,
      intelSuggestedHelpText: update.intelligence.suggestedHelpText,
      intelIsSystemField: update.intelligence.isSystemField,
      intelIsAuditField: update.intelligence.isAuditField,
      intelConfidence: update.intelligence.confidence,

      // UI layer
      ...(update.uiComponent.componentType ? {
        uiComponentType: update.uiComponent.componentType,
      } : {}),
      ...(update.uiComponent.htmlInputType ? {
        uiHtmlInputType: update.uiComponent.htmlInputType,
      } : {}),
      ...(update.uiComponent.renderAs ? {
        uiRenderAs: update.uiComponent.renderAs,
      } : {}),

      // Validation layer
      validationIsRequired: update.validation.isRequired,
      validationClientRules: JSON.stringify(update.validation.clientSideRules || []),
      validationConfidence: update.validation.confidence,

      // Compliance updates
      ...update.complianceUpdates,

      // Meta
      metaEnrichmentComplete: 0.2, // Increment enrichment
      metaOverallConfidence: update.confidence,
      updatedAt: new Date(),
    };

    // Update field
    await db.unifiedField.update({
      where: { id: update.fieldId },
      data: updateData,
    });

    // Create validation rules as separate records
    if (update.validation.clientSideRules && update.validation.clientSideRules.length > 0) {
      for (const rule of update.validation.clientSideRules) {
        await db.unifiedFieldValidation.create({
          data: {
            fieldId: update.fieldId,
            side: 'client',
            ruleType: rule.ruleType,
            ruleValue: rule.ruleValue,
            errorMessage: rule.errorMessage,
            source: rule.source,
            isActive: true,
            confidence: update.confidence,
          },
        });
      }
    }

    // Log enrichment
    await db.unifiedEnrichmentLog.create({
      data: {
        fieldId: update.fieldId,
        projectId: this.projectId,
        agentName: 'ColumnIntelIntegrationService',
        layerEnriched: 'intelligence',
        previousValue: JSON.stringify({ semanticType: 'unknown' }),
        newValue: JSON.stringify(update.intelligence),
        confidenceAfter: update.confidence,
        enrichmentMethod: 'pattern_match',
      },
    });
  }

  /**
   * Categorize semantic type
   */
  private categorizeSemanticType(semanticType: string): string {
    const categories: Record<string, string> = {
      // Contact
      email: 'contact_info',
      phone: 'contact_info',
      
      // Identity
      id: 'identifier',
      foreign_key: 'identifier',
      code: 'identifier',
      medical_record_number: 'identifier',
      national_id: 'identifier',
      
      // Personal
      name: 'personal_info',
      gender: 'personal_info',
      age: 'personal_info',
      date: 'temporal',
      datetime: 'temporal',
      time: 'temporal',
      
      // Location
      address: 'geographic',
      
      // Financial
      amount: 'financial',
      salary: 'financial',
      percentage: 'financial',
      
      // Medical
      diagnosis: 'clinical',
      treatment: 'clinical',
      
      // System
      audit_timestamp: 'system',
      audit_user: 'system',
      boolean_flag: 'system',
      status: 'system',
      type: 'system',
    };

    return categories[semanticType] || 'general';
  }

  /**
   * Infer business meaning
   */
  private inferBusinessMeaning(fieldName: string, semanticType: string): string {
    const name = fieldName.toLowerCase();
    
    // Healthcare-specific
    if (name.includes('patient')) return 'Patient-related identifier';
    if (name.includes('doctor') || name.includes('physician')) return 'Healthcare provider reference';
    if (name.includes('diagnosis')) return 'Medical diagnosis information';
    if (name.includes('prescription') || name.includes('medication')) return 'Medication/prescription data';
    if (name.includes('lab') || name.includes('test')) return 'Laboratory test information';
    
    // Business-specific
    if (name.includes('organization') || name.includes('company')) return 'Organization reference';
    if (name.includes('department')) return 'Department classification';
    if (name.includes('role') || name.includes('permission')) return 'Access control information';
    
    // Financial
    if (name.includes('amount') || name.includes('price')) return 'Financial value';
    if (name.includes('tax')) return 'Tax-related calculation';
    if (name.includes('discount')) return 'Pricing adjustment';
    
    // Temporal
    if (name.includes('created')) return 'Record creation timestamp';
    if (name.includes('modified') || name.includes('updated')) return 'Last modification timestamp';
    
    // Generic
    if (semanticType === 'email') return 'Primary contact email';
    if (semanticType === 'phone') return 'Contact phone number';
    if (semanticType === 'name') return 'Entity name';
    
    return `Stores ${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()} information`;
  }

  /**
   * Get data pattern
   */
  private getDataPattern(semanticType: string): string | null {
    const patterns: Record<string, string> = {
      email: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      phone: '^[+]?[0-9]{10,15}$',
      national_id: '^[0-9]{5}-[0-9]{7}-[0-9]$',
      date: 'DD/MM/YYYY',
      time: 'HH:MM:SS',
      datetime: 'DD/MM/YYYY HH:MM:SS',
      percentage: '0-100%',
      currency: '$###,###,##0.00',
    };

    return patterns[semanticType] || null;
  }

  /**
   * Generate help text
   */
  private generateHelpText(fieldName: string, semanticType: string): string {
    const name = fieldName.toLowerCase();
    
    if (semanticType === 'email') return 'Enter a valid email address for notifications';
    if (semanticType === 'phone') return 'Enter phone number with country code';
    if (semanticType === 'national_id') return 'Enter national ID in format XXXXX-XXXXXXX-X';
    if (semanticType === 'date') return 'Select or enter date in DD/MM/YYYY format';
    if (semanticType === 'amount') return 'Enter monetary value';
    
    return '';
  }

  /**
   * Check if system field
   */
  private isSystemField(fieldName: string): boolean {
    const systemPatterns = [
      /^id$/i,
      /_id$/i,
      /guid$/i,
      /uuid$/i,
    ];
    return systemPatterns.some(p => p.test(fieldName));
  }

  /**
   * Check if audit field
   */
  private isAuditField(fieldName: string): boolean {
    const auditPatterns = [
      /created/i,
      /modified/i,
      /updated/i,
      /deleted/i,
      /archived/i,
    ];
    return auditPatterns.some(p => p.test(fieldName));
  }

  /**
   * Map UI type
   */
  private mapUIType(uiType: string): string {
    const mapping: Record<string, string> = {
      'text_input': 'text_input',
      'email_input': 'text_input',
      'phone_input': 'text_input',
      'password_input': 'text_input',
      'number_input': 'number_input',
      'currency_input': 'number_input',
      'percentage_input': 'number_input',
      'textarea': 'textarea',
      'dropdown': 'dropdown',
      'date_picker': 'datepicker',
      'datetime_picker': 'datepicker',
      'time_picker': 'timepicker',
      'toggle': 'toggle',
      'checkbox': 'checkbox',
      'file_upload': 'file_upload',
      'image_upload': 'file_upload',
      'hidden': 'hidden',
      'read_only': 'readonly',
      'color_picker': 'colorpicker',
      'url_input': 'text_input',
    };
    return mapping[uiType] || 'text_input';
  }

  /**
   * Map HTML input type
   */
  private mapHtmlInputType(uiType: string): string {
    const mapping: Record<string, string> = {
      'text_input': 'text',
      'email_input': 'email',
      'phone_input': 'tel',
      'password_input': 'password',
      'number_input': 'number',
      'currency_input': 'number',
      'percentage_input': 'number',
      'date_picker': 'date',
      'datetime_picker': 'datetime-local',
      'time_picker': 'time',
      'url_input': 'url',
      'file_upload': 'file',
      'image_upload': 'file',
      'checkbox': 'checkbox',
      'toggle': 'checkbox',
    };
    return mapping[uiType] || 'text';
  }

  /**
   * Map render as
   */
  private mapRenderAs(uiType: string): string {
    const mapping: Record<string, string> = {
      'text_input': 'TextInput',
      'textarea': 'Textarea',
      'dropdown': 'Select',
      'date_picker': 'DatePicker',
      'datetime_picker': 'DateTimePicker',
      'time_picker': 'TimePicker',
      'toggle': 'Switch',
      'checkbox': 'Checkbox',
      'file_upload': 'FileUpload',
      'image_upload': 'ImageUpload',
      'color_picker': 'ColorPicker',
      'hidden': 'Hidden',
      'read_only': 'ReadOnly',
    };
    return mapping[uiType] || 'TextInput';
  }

  /**
   * Map PII category
   */
  private mapPIICategory(semanticType: string): string {
    const mapping: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      national_id: 'national_id',
      gender: 'gender',
      age: 'age',
      date_of_birth: 'dob',
    };
    return mapping[semanticType] || 'other';
  }

  /**
   * Map PHI category
   */
  private mapPHICategory(semanticType: string): string {
    const mapping: Record<string, string> = {
      medical_record_number: 'patient_id',
      diagnosis: 'diagnosis',
      treatment: 'treatment',
      prescription: 'medication',
      allergy: 'medical_history',
      lab_result: 'lab_result',
      weight: 'vitals',
      height: 'vitals',
      bmi: 'vitals',
      blood_type: 'medical_history',
    };
    return mapping[semanticType] || 'other_phi';
  }

  /**
   * Get intelligence summary for project
   */
  async getIntelSummary(): Promise<{
    totalFields: number;
    bySemanticCategory: Record<string, number>;
    piiFields: number;
    phiFields: number;
    averageConfidence: number;
  }> {
    const fields = await db.unifiedField.findMany({
      where: { projectId: this.projectId },
      select: {
        intelSemanticCategory: true,
        compIsPII: true,
        compIsPHI: true,
        intelConfidence: true,
      },
    });

    const bySemanticCategory: Record<string, number> = {};
    let piiFields = 0;
    let phiFields = 0;
    let totalConfidence = 0;

    for (const field of fields) {
      const category = field.intelSemanticCategory || 'unknown';
      bySemanticCategory[category] = (bySemanticCategory[category] || 0) + 1;

      if (field.compIsPII) piiFields++;
      if (field.compIsPHI) phiFields++;
      totalConfidence += field.intelConfidence || 0;
    }

    return {
      totalFields: fields.length,
      bySemanticCategory,
      piiFields,
      phiFields,
      averageConfidence: fields.length > 0 ? totalConfidence / fields.length : 0,
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createColumnIntelIntegrationService(projectId: string): ColumnIntelIntegrationService {
  return new ColumnIntelIntegrationService(projectId);
}

export async function runColumnIntelIntegration(projectId: string): Promise<ColumnIntelIntegrationResult> {
  const service = new ColumnIntelIntegrationService(projectId);
  return service.runIntegration();
}
