/**
 * CSHTML ↔ SP Correlation Engine
 * 
 * This engine correlates CSHTML views with their corresponding stored procedures
 * by analyzing field names, URL patterns, AJAX calls, and validation rules.
 * 
 * Key capabilities:
 * - Form to INSERT/UPDATE SP matching
 * - Grid to LIST SP matching  
 * - Dropdown to DDL SP matching
 * - AJAX call to SP mapping
 * - Validation to SP business rule correlation
 */

import type { SPActionType } from './sp-classification-engine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CorrelationType =
  | 'form_to_insert_sp'
  | 'form_to_update_sp'
  | 'grid_to_list_sp'
  | 'dropdown_to_ddl_sp'
  | 'ajax_to_action_sp'
  | 'validation_to_check_sp'
  | 'search_to_search_sp'
  | 'modal_to_detail_sp'
  | 'delete_to_delete_sp';

export type CorrelationMethod =
  | 'url_match'
  | 'field_match'
  | 'pattern_inference'
  | 'ajax_endpoint_match'
  | 'controller_action_match'
  | 'ai_match';

export interface FieldMapping {
  cshtmlField: {
    id: string;
    name: string;
    type: string;
    label: string;
    validation: string[];
    required: boolean;
  };
  spParameter: {
    name: string;
    sqlType: string;
    isOptional: boolean;
    hasDefault: boolean;
  };
  matchMethod: 'exact_name' | 'normalized_name' | 'semantic_match' | 'type_inference' | 'position_match';
  confidence: number;
  typeCompatible: boolean;
  validationAlignment: 'full' | 'partial' | 'mismatch' | 'unknown';
}

export interface CorrelationResult {
  confidence: number;
  cshtmlViewName: string;
  storedProcedureName: string;
  correlationType: CorrelationType;
  correlationMethod: CorrelationMethod;
  fieldMappings: FieldMapping[];
  unmatchedCSHTMLFields: string[];
  unmatchedSPParams: string[];
  suggestedActions: string[];
  confidenceBreakdown: {
    urlMatch: number;
    fieldMatch: number;
    typeMatch: number;
    validationMatch: number;
  };
}

export interface CSHTMLFormField {
  id: string;
  name: string;
  type: string;
  label: string;
  required: boolean;
  validation: string[];
  cssClass: string;
  position: number;
  section?: string;
  dropdownSource?: string;
  cascadeFrom?: string;
}

export interface CSHTMLForm {
  formId: string;
  formName: string;
  actionUrl: string;
  httpMethod: string;
  controllerName: string;
  actionName: string;
  fields: CSHTMLFormField[];
  dropdowns: CSHTMLDropdown[];
  ajaxCalls: CSHTMLAjaxCall[];
  validationRules: Record<string, string[]>;
}

export interface CSHTMLDropdown {
  name: string;
  ddlMethod: string;
  cascadeFrom: string | null;
  cascadeUrl: string | null;
  parameterName: string | null;
}

export interface CSHTMLAjaxCall {
  url: string;
  method: string;
  trigger: string;
  purpose: string;
  parameters: string[];
  successHandler: string | null;
  errorHandler: string | null;
}

export interface SPParameterInfo {
  name: string;
  type: string;
  direction: 'input' | 'output' | 'input_output';
  isOptional: boolean;
  defaultValue: string | null;
}

// ============================================================================
// CORRELATION ENGINE
// ============================================================================

export class CSPCorrelationEngine {
  
  /**
   * Correlate a CSHTML form with a stored procedure
   */
  correlateFormToSP(
    form: CSHTMLForm,
    spName: string,
    spParams: SPParameterInfo[],
    spActionType: SPActionType
  ): CorrelationResult {
    const fieldMappings: FieldMapping[] = [];
    const unmatchedCSHTMLFields: string[] = [];
    const unmatchedSPParams: string[] = [...spParams.filter(p => p.direction === 'input').map(p => p.name)];
    
    // Track confidence components
    let urlMatchScore = 0;
    let fieldMatchScore = 0;
    let typeMatchScore = 0;
    let validationMatchScore = 0;
    
    // 1. Check URL match (controller/action vs SP name)
    urlMatchScore = this.calculateURLMatchScore(
      form.controllerName,
      form.actionName,
      spName,
      spActionType
    );
    
    // 2. Match fields to parameters
    for (const field of form.fields) {
      const matchResult = this.matchFieldToParameter(field, spParams);
      
      if (matchResult) {
        fieldMappings.push(matchResult.mapping);
        
        // Remove from unmatched SP params
        const paramIndex = unmatchedSPParams.indexOf(matchResult.mapping.spParameter.name);
        if (paramIndex > -1) {
          unmatchedSPParams.splice(paramIndex, 1);
        }
        
        fieldMatchScore += matchResult.confidence;
        if (matchResult.mapping.typeCompatible) {
          typeMatchScore += 0.1;
        }
        if (matchResult.mapping.validationAlignment === 'full') {
          validationMatchScore += 0.1;
        }
      } else {
        unmatchedCSHTMLFields.push(field.name);
      }
    }
    
    // Normalize scores
    const totalFields = form.fields.length;
    fieldMatchScore = totalFields > 0 ? fieldMatchScore / totalFields : 0;
    typeMatchScore = totalFields > 0 ? Math.min(1, typeMatchScore) : 0;
    validationMatchScore = totalFields > 0 ? Math.min(1, validationMatchScore) : 0;
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence({
      urlMatch: urlMatchScore,
      fieldMatch: fieldMatchScore,
      typeMatch: typeMatchScore,
      validationMatch: validationMatchScore
    });
    
    // Determine correlation type
    const correlationType = this.determineCorrelationType(spActionType, form);
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(
      unmatchedCSHTMLFields,
      unmatchedSPParams,
      fieldMappings,
      correlationType
    );
    
    return {
      confidence,
      cshtmlViewName: form.formName,
      storedProcedureName: spName,
      correlationType,
      correlationMethod: urlMatchScore > 0.8 ? 'url_match' : 'field_match',
      fieldMappings,
      unmatchedCSHTMLFields,
      unmatchedSPParams,
      suggestedActions,
      confidenceBreakdown: {
        urlMatch: urlMatchScore,
        fieldMatch: fieldMatchScore,
        typeMatch: typeMatchScore,
        validationMatch: validationMatchScore
      }
    };
  }
  
  /**
   * Calculate URL match score between form action and SP name
   */
  private calculateURLMatchScore(
    controllerName: string,
    actionName: string,
    spName: string,
    spActionType: SPActionType
  ): number {
    // Remove SP_ prefix
    const spBase = spName.replace(/^SP_/i, '');
    
    // Check if controller name matches SP entity
    const controllerMatch = spBase.toLowerCase().includes(controllerName.toLowerCase());
    
    // Check if action name matches SP action type
    const actionToSPActionMap: Record<string, SPActionType[]> = {
      'create': ['create'],
      'add': ['create'],
      'insert': ['create'],
      'update': ['update'],
      'edit': ['update'],
      'save': ['upsert'],
      'delete': ['delete'],
      'remove': ['delete'],
      'index': ['read_list', 'read_paginated'],
      'list': ['read_list', 'read_paginated'],
      'details': ['read_single'],
      'get': ['read_single', 'read_list']
    };
    
    const expectedActionTypes = actionToSPActionMap[actionName.toLowerCase()] || [];
    const actionMatch = expectedActionTypes.includes(spActionType);
    
    let score = 0;
    if (controllerMatch) score += 0.5;
    if (actionMatch) score += 0.5;
    
    return score;
  }
  
  /**
   * Match a CSHTML field to an SP parameter
   */
  private matchFieldToParameter(
    field: CSHTMLFormField,
    params: SPParameterInfo[]
  ): { mapping: FieldMapping; confidence: number } | null {
    
    // 1. Try exact name match
    const exactMatch = params.find(p => 
      p.name.toLowerCase() === field.name.toLowerCase() ||
      p.name.toLowerCase() === `@${field.name.toLowerCase()}`
    );
    
    if (exactMatch) {
      return {
        mapping: {
          cshtmlField: {
            id: field.id,
            name: field.name,
            type: field.type,
            label: field.label,
            validation: field.validation,
            required: field.required
          },
          spParameter: {
            name: exactMatch.name,
            sqlType: exactMatch.type,
            isOptional: exactMatch.isOptional,
            hasDefault: exactMatch.defaultValue !== null
          },
          matchMethod: 'exact_name',
          confidence: 0.95,
          typeCompatible: this.checkTypeCompatibility(field.type, exactMatch.type),
          validationAlignment: this.checkValidationAlignment(field, exactMatch)
        },
        confidence: 0.95
      };
    }
    
    // 2. Try normalized name match (remove underscores, camelCase variations)
    const normalizedFieldName = this.normalizeFieldName(field.name);
    
    for (const param of params) {
      const normalizedParamName = this.normalizeFieldName(param.name);
      
      if (normalizedFieldName === normalizedParamName) {
        return {
          mapping: {
            cshtmlField: {
              id: field.id,
              name: field.name,
              type: field.type,
              label: field.label,
              validation: field.validation,
              required: field.required
            },
            spParameter: {
              name: param.name,
              sqlType: param.type,
              isOptional: param.isOptional,
              hasDefault: param.defaultValue !== null
            },
            matchMethod: 'normalized_name',
            confidence: 0.85,
            typeCompatible: this.checkTypeCompatibility(field.type, param.type),
            validationAlignment: this.checkValidationAlignment(field, param)
          },
          confidence: 0.85
        };
      }
    }
    
    // 3. Try semantic match (field name is contained in param name or vice versa)
    for (const param of params) {
      if (param.name.toLowerCase().includes(field.name.toLowerCase()) ||
          field.name.toLowerCase().includes(param.name.toLowerCase().replace('@', ''))) {
        return {
          mapping: {
            cshtmlField: {
              id: field.id,
              name: field.name,
              type: field.type,
              label: field.label,
              validation: field.validation,
              required: field.required
            },
            spParameter: {
              name: param.name,
              sqlType: param.type,
              isOptional: param.isOptional,
              hasDefault: param.defaultValue !== null
            },
            matchMethod: 'semantic_match',
            confidence: 0.7,
            typeCompatible: this.checkTypeCompatibility(field.type, param.type),
            validationAlignment: this.checkValidationAlignment(field, param)
          },
          confidence: 0.7
        };
      }
    }
    
    return null;
  }
  
  /**
   * Normalize field name for comparison
   */
  private normalizeFieldName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[_\-\s]/g, '')
      .replace(/id$/i, '') // Remove trailing 'Id'
      .replace(/^user\./i, ''); // Remove 'User.' prefix for nested models
  }
  
  /**
   * Check type compatibility between HTML field and SQL type
   */
  private checkTypeCompatibility(htmlType: string, sqlType: string): boolean {
    const typeCompatibilityMap: Record<string, string[]> = {
      'text': ['varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext'],
      'email': ['varchar', 'nvarchar'],
      'password': ['varchar', 'nvarchar'],
      'number': ['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'money', 'float'],
      'date': ['date', 'datetime', 'datetime2', 'smalldatetime'],
      'datetime-local': ['datetime', 'datetime2'],
      'checkbox': ['bit', 'tinyint', 'boolean'],
      'select': ['int', 'bigint', 'uniqueidentifier', 'varchar', 'nvarchar'], // FK dropdowns
      'textarea': ['varchar', 'nvarchar', 'text', 'ntext'],
      'file': ['varbinary', 'image', 'varchar', 'nvarchar'] // File path or binary
    };
    
    const compatibleTypes = typeCompatibilityMap[htmlType.toLowerCase()] || [];
    const normalizedSqlType = sqlType.toLowerCase().replace(/\([^)]*\)/g, '');
    
    return compatibleTypes.some(t => normalizedSqlType.includes(t));
  }
  
  /**
   * Check validation alignment between field and parameter
   */
  private checkValidationAlignment(
    field: CSHTMLFormField,
    param: SPParameterInfo
  ): 'full' | 'partial' | 'mismatch' | 'unknown' {
    // Check required alignment
    const fieldRequired = field.required || field.validation.includes('required');
    const paramRequired = !param.isOptional && param.defaultValue === null;
    
    if (fieldRequired === paramRequired) {
      // Both required or both optional
      return 'full';
    }
    
    if (fieldRequired && !paramRequired) {
      // Field is required but SP allows null - might be okay (SP has default)
      return 'partial';
    }
    
    if (!fieldRequired && paramRequired) {
      // Field optional but SP requires value - potential mismatch
      return 'mismatch';
    }
    
    return 'unknown';
  }
  
  /**
   * Calculate overall confidence from components
   */
  private calculateOverallConfidence(scores: {
    urlMatch: number;
    fieldMatch: number;
    typeMatch: number;
    validationMatch: number;
  }): number {
    // Weighted average
    const weights = {
      urlMatch: 0.3,
      fieldMatch: 0.4,
      typeMatch: 0.15,
      validationMatch: 0.15
    };
    
    return (
      scores.urlMatch * weights.urlMatch +
      scores.fieldMatch * weights.fieldMatch +
      scores.typeMatch * weights.typeMatch +
      scores.validationMatch * weights.validationMatch
    );
  }
  
  /**
   * Determine correlation type based on SP action type and form configuration
   */
  private determineCorrelationType(
    spActionType: SPActionType,
    form: CSHTMLForm
  ): CorrelationType {
    switch (spActionType) {
      case 'create':
        return 'form_to_insert_sp';
      case 'update':
      case 'upsert':
        return 'form_to_update_sp';
      case 'read_list':
      case 'read_paginated':
        return 'grid_to_list_sp';
      case 'read_single':
        return 'modal_to_detail_sp';
      case 'delete':
        return 'delete_to_delete_sp';
      case 'dropdown':
        return 'dropdown_to_ddl_sp';
      case 'search':
        return 'search_to_search_sp';
      case 'validate':
      case 'exists_check':
        return 'validation_to_check_sp';
      default:
        // Infer from form method
        if (form.httpMethod === 'POST') {
          return 'form_to_insert_sp';
        } else if (form.httpMethod === 'PUT') {
          return 'form_to_update_sp';
        } else if (form.httpMethod === 'GET') {
          return 'grid_to_list_sp';
        }
        return 'ajax_to_action_sp';
    }
  }
  
  /**
   * Generate suggested actions for resolving correlation issues
   */
  private generateSuggestedActions(
    unmatchedCSHTMLFields: string[],
    unmatchedSPParams: string[],
    fieldMappings: FieldMapping[],
    correlationType: CorrelationType
  ): string[] {
    const actions: string[] = [];
    
    if (unmatchedCSHTMLFields.length > 0) {
      actions.push(
        `Review unmatched CSHTML fields: ${unmatchedCSHTMLFields.join(', ')}. ` +
        `These may need to be added to the SP or mapped to existing parameters.`
      );
    }
    
    if (unmatchedSPParams.length > 0) {
      // Filter out system parameters (UserId, OrganizationId, etc.)
      const systemParams = ['UserId', 'OrganizationId', 'BranchId', 'CreatedBy', 'ModifiedBy'];
      const nonSystemParams = unmatchedSPParams.filter(p => 
        !systemParams.some(sp => p.toLowerCase().includes(sp.toLowerCase()))
      );
      
      if (nonSystemParams.length > 0) {
        actions.push(
          `Add missing fields to CSHTML form: ${nonSystemParams.join(', ')}. ` +
          `These SP parameters don't have corresponding form fields.`
        );
      }
    }
    
    // Check for type conflicts
    const typeConflicts = fieldMappings.filter(m => !m.typeCompatible);
    if (typeConflicts.length > 0) {
      actions.push(
        `Type conflicts detected for: ${typeConflicts.map(m => m.cshtmlField.name).join(', ')}. ` +
        `Review field types in form and adjust as needed.`
      );
    }
    
    // Check for validation mismatches
    const validationMismatches = fieldMappings.filter(m => m.validationAlignment === 'mismatch');
    if (validationMismatches.length > 0) {
      actions.push(
        `Validation mismatch for: ${validationMismatches.map(m => m.cshtmlField.name).join(', ')}. ` +
        `Required field might allow null in SP, or optional field might require value.`
      );
    }
    
    return actions;
  }
  
  /**
   * Find the best matching SP for a CSHTML form
   */
  findBestMatchingSP(
    form: CSHTMLForm,
    spList: Array<{ name: string; params: SPParameterInfo[]; actionType: SPActionType }>
  ): CorrelationResult | null {
    let bestMatch: CorrelationResult | null = null;
    let bestConfidence = 0;
    
    for (const sp of spList) {
      const result = this.correlateFormToSP(form, sp.name, sp.params, sp.actionType);
      
      if (result.confidence > bestConfidence) {
        bestConfidence = result.confidence;
        bestMatch = result;
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Batch correlate multiple forms to multiple SPs
   */
  batchCorrelate(
    forms: CSHTMLForm[],
    spList: Array<{ name: string; params: SPParameterInfo[]; actionType: SPActionType }>
  ): Map<string, CorrelationResult> {
    const results = new Map<string, CorrelationResult>();
    
    for (const form of forms) {
      const match = this.findBestMatchingSP(form, spList);
      if (match) {
        results.set(form.formName, match);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const cspCorrelationEngine = new CSPCorrelationEngine();

// Export utility functions
export function correlateFormToSP(
  form: CSHTMLForm,
  spName: string,
  spParams: SPParameterInfo[],
  spActionType: SPActionType
): CorrelationResult {
  return cspCorrelationEngine.correlateFormToSP(form, spName, spParams, spActionType);
}

export function findBestMatchingSP(
  form: CSHTMLForm,
  spList: Array<{ name: string; params: SPParameterInfo[]; actionType: SPActionType }>
): CorrelationResult | null {
  return cspCorrelationEngine.findBestMatchingSP(form, spList);
}
