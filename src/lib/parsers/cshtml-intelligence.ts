// =============================================================================
// CSHTML Intelligence Layer - Unified Parser Integration
// =============================================================================
// Integrates HTML, JavaScript, jQuery, AJAX parsers for comprehensive CSHTML analysis
// Provides complete frontend intelligence for ASP.NET Razor views
// =============================================================================

import { CSHTMLParser, ParsedCSHTMLView, ParsedFormField, AjaxEndpoint as CSHTMLAjaxEndpoint, CascadingDropdown, JavaScriptValidation } from '../cshtml-parser';
import { HTMLParserEngine, HTMLParserResult, FormRelationship, DataTableConfig, Select2Config, ModalDefinition as HTMLModalDefinition, ActionElement, BootstrapComponent } from './html-parser';
import { EnhancedJSParserEngine, EnhancedJSIntelligenceResult, JQueryChain, EventDelegation, TemplateLiteralURL, AjaxInterceptor } from './enhanced-js-parser';

/**
 * Unified CSHTML Intelligence Result
 */
export interface CSHTMLIntelligence {
  // View metadata
  viewName: string;
  viewType: 'form' | 'list' | 'details' | 'dashboard' | 'mixed' | 'unknown';
  model?: {
    name: string;
    linkedTable?: string;
  };
  
  // Combined extraction results
  forms: FormIntelligence[];
  tables: TableIntelligence[];
  endpoints: EndpointIntelligence[];
  events: EventIntelligence[];
  validations: ValidationIntelligence[];
  modals: ModalIntelligence[];
  cascades: CascadeIntelligence[];
  dependencies: DependencyIntelligence[];
  
  // Cross-referenced intelligence
  fieldToEndpoint: FieldEndpointMapping[];
  eventToAction: EventActionMapping[];
  dataTableToAPI: DataTableAPIMapping[];
  
  // Summary
  summary: CSHTMLIntelligenceSummary;
}

/**
 * Form Intelligence
 */
export interface FormIntelligence {
  id: string;
  action: string;
  method: 'GET' | 'POST';
  controller?: string;
  fields: FieldIntelligence[];
  submitHandler?: string;
  hasAjaxSubmit: boolean;
  hasClientValidation: boolean;
  hasFileUpload: boolean;
  relatedModal?: string;
  securityToken?: string;
}

/**
 * Field Intelligence
 */
export interface FieldIntelligence {
  name: string;
  type: string;
  label?: string;
  isRequired: boolean;
  isReadOnly: boolean;
  defaultValue?: string;
  validation: string[];
  dataSource?: string;
  isForeignKey: boolean;
  foreignKeyTarget?: string;
  dependsOn?: string[];
  controls?: string[];
  htmlAttributes: Record<string, string>;
  jqueryValidations: Record<string, unknown>;
}

/**
 * Table Intelligence (DataTables)
 */
export interface TableIntelligence {
  id: string;
  selector: string;
  ajaxUrl?: string;
  columns: TableColumnIntelligence[];
  features: {
    paging: boolean;
    searching: boolean;
    sorting: boolean;
    serverSide: boolean;
    exportButtons: string[];
  };
  events: string[];
}

/**
 * Table Column Intelligence
 */
export interface TableColumnIntelligence {
  data: string;
  title?: string;
  render?: string;
  isSortable: boolean;
  isSearchable: boolean;
  inferredType?: string;
}

/**
 * Endpoint Intelligence
 */
export interface EndpointIntelligence {
  url: string;
  method: string;
  source: 'form' | 'ajax' | 'datatable' | 'select2' | 'cascade';
  parameters: EndpointParameter[];
  context: string;
  confidence: number;
  relatedFields: string[];
}

/**
 * Endpoint Parameter
 */
export interface EndpointParameter {
  name: string;
  type: string;
  source: 'body' | 'query' | 'path';
  required: boolean;
  mappedFrom?: string;
}

/**
 * Event Intelligence
 */
export interface EventIntelligence {
  eventType: string;
  selector: string;
  handlerType: 'inline' | 'jquery' | 'vanilla' | 'anonymous';
  isDelegated: boolean;
  parentSelector?: string;
  code: string;
  relatedEndpoint?: string;
  relatedField?: string;
}

/**
 * Validation Intelligence
 */
export interface ValidationIntelligence {
  formSelector: string;
  fieldValidations: FieldValidationIntelligence[];
  customRules: string[];
  remoteValidations: RemoteValidationIntelligence[];
}

/**
 * Field Validation Intelligence
 */
export interface FieldValidationIntelligence {
  fieldName: string;
  rules: string[];
  messages: Record<string, string>;
}

/**
 * Remote Validation Intelligence
 */
export interface RemoteValidationIntelligence {
  fieldName: string;
  url: string;
  additionalFields: string[];
}

/**
 * Modal Intelligence
 */
export interface ModalIntelligence {
  id: string;
  title?: string;
  triggerSelectors: string[];
  hasForm: boolean;
  formId?: string;
  loadRemoteContent: boolean;
  remoteUrl?: string;
  size: 'small' | 'default' | 'large' | 'fullscreen';
}

/**
 * Cascade Intelligence
 */
export interface CascadeIntelligence {
  parentField: string;
  childField: string;
  endpoint: string;
  parameterName: string;
  textField: string;
  valueField: string;
  levels: number;
}

/**
 * Dependency Intelligence
 */
export interface DependencyIntelligence {
  type: 'library' | 'plugin' | 'component';
  name: string;
  version?: string;
  source: 'cdn' | 'local' | 'npm';
  usage: string[];
}

/**
 * Field to Endpoint Mapping
 */
export interface FieldEndpointMapping {
  fieldName: string;
  endpointUrl: string;
  endpointMethod: string;
  purpose: 'cascade' | 'remote-validation' | 'autocomplete' | 'lookup';
}

/**
 * Event to Action Mapping
 */
export interface EventActionMapping {
  event: string;
  selector: string;
  action: string;
  controller?: string;
  endpoint?: string;
}

/**
 * DataTable to API Mapping
 */
export interface DataTableAPIMapping {
  tableSelector: string;
  apiUrl: string;
  method: string;
  columns: string[];
}

/**
 * CSHTML Intelligence Summary
 */
export interface CSHTMLIntelligenceSummary {
  totalForms: number;
  totalFields: number;
  totalEndpoints: number;
  totalEvents: number;
  totalTables: number;
  totalModals: number;
  totalCascades: number;
  hasAjax: boolean;
  hasValidation: boolean;
  hasFileUpload: boolean;
  usesjQuery: boolean;
  usesBootstrap: boolean;
  usesModernJS: boolean;
  complexity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * CSHTML Intelligence Engine
 */
export class CSHTMLIntelligenceEngine {
  private content: string;
  private fileName: string;

  constructor(content: string, fileName?: string) {
    this.content = content;
    this.fileName = fileName || '';
  }

  /**
   * Analyze CSHTML content with all parsers
   */
  analyze(): CSHTMLIntelligence {
    // Run all parsers
    const cshtmlParser = new CSHTMLParser(this.content, this.fileName);
    const cshtmlResult = cshtmlParser.parse();
    
    const htmlParser = new HTMLParserEngine(this.content, this.fileName);
    const htmlResult = htmlParser.parse();
    
    const jsParser = new EnhancedJSParserEngine(this.fileName);
    const jsResult = jsParser.analyze(this.content, this.fileName);

    // Combine and cross-reference results
    const forms = this.extractFormIntelligence(cshtmlResult, htmlResult, jsResult);
    const tables = this.extractTableIntelligence(htmlResult, jsResult);
    const endpoints = this.extractEndpointIntelligence(cshtmlResult, htmlResult, jsResult);
    const events = this.extractEventIntelligence(cshtmlResult, jsResult);
    const validations = this.extractValidationIntelligence(cshtmlResult, htmlResult, jsResult);
    const modals = this.extractModalIntelligence(htmlResult);
    const cascades = this.extractCascadeIntelligence(cshtmlResult, jsResult);
    const dependencies = this.extractDependencyIntelligence(htmlResult, jsResult);

    // Cross-reference
    const fieldToEndpoint = this.mapFieldsToEndpoints(forms, endpoints, cascades);
    const eventToAction = this.mapEventsToActions(events, endpoints, htmlResult);
    const dataTableToAPI = this.mapDataTablesToAPI(tables, endpoints);

    // Generate summary
    const summary = this.generateSummary(
      forms, tables, endpoints, events, modals, cascades, 
      htmlResult, jsResult
    );

    return {
      viewName: cshtmlResult.viewName,
      viewType: cshtmlResult.viewType,
      model: cshtmlResult.model ? {
        name: cshtmlResult.model.name,
        linkedTable: cshtmlResult.model.linkedTable,
      } : undefined,
      forms,
      tables,
      endpoints,
      events,
      validations,
      modals,
      cascades,
      dependencies,
      fieldToEndpoint,
      eventToAction,
      dataTableToAPI,
      summary,
    };
  }

  /**
   * Extract form intelligence
   */
  private extractFormIntelligence(
    cshtmlResult: ParsedCSHTMLView,
    htmlResult: HTMLParserResult,
    jsResult: EnhancedJSIntelligenceResult
  ): FormIntelligence[] {
    const forms: FormIntelligence[] = [];

    // From CSHTML parser
    if (cshtmlResult.formInfo) {
      const formInfo = cshtmlResult.formInfo;
      const htmlForm = htmlResult.formRelationships.find(f => f.formId === formInfo.id);
      
      forms.push({
        id: formInfo.id,
        action: formInfo.action,
        method: formInfo.method,
        controller: formInfo.controller,
        fields: this.extractFieldIntelligence(cshtmlResult.fields, cshtmlResult.jsValidations || [], htmlForm),
        submitHandler: this.findSubmitHandler(jsResult, formInfo.id),
        hasAjaxSubmit: this.hasAjaxSubmit(jsResult, formInfo.id),
        hasClientValidation: htmlForm?.hasClientValidation || false,
        hasFileUpload: formInfo.isMultipart || cshtmlResult.fields.some(f => f.inputType === 'file_upload'),
        relatedModal: this.findRelatedModal(htmlResult, formInfo.id),
        securityToken: htmlResult.hiddenFields.find(h => h.purpose === 'token')?.name,
      });
    }

    // From HTML parser forms not captured by CSHTML parser
    for (const htmlForm of htmlResult.formRelationships) {
      if (!forms.some(f => f.id === htmlForm.formId)) {
        forms.push({
          id: htmlForm.formId,
          action: htmlForm.formAction,
          method: htmlForm.method,
          fields: htmlForm.fields.map(f => ({
            name: f.name,
            type: f.type,
            label: f.label,
            isRequired: f.isRequired,
            isReadOnly: f.isReadOnly,
            validation: f.hasRemoteValidation ? ['remote'] : [],
            dataSource: undefined,
            isForeignKey: false,
            foreignKeyTarget: undefined,
            dependsOn: f.dependsOn,
            controls: [],
            htmlAttributes: {},
            jqueryValidations: {},
          })),
          submitHandler: undefined,
          hasAjaxSubmit: false,
          hasClientValidation: htmlForm.hasClientValidation,
          hasFileUpload: false,
          relatedModal: undefined,
          securityToken: undefined,
        });
      }
    }

    return forms;
  }

  /**
   * Extract field intelligence
   */
  private extractFieldIntelligence(
    cshtmlFields: ParsedFormField[],
    jsValidations: JavaScriptValidation[],
    htmlForm?: FormRelationship
  ): FieldIntelligence[] {
    return cshtmlFields.map(field => {
      const jsVal = jsValidations.find(v => v.fieldName === field.name);
      const htmlField = htmlForm?.fields.find(f => f.name === field.name);
      
      return {
        name: field.name,
        type: field.inputType,
        label: field.label,
        isRequired: field.isRequired || jsVal?.rules.required === true,
        isReadOnly: field.isReadOnly,
        defaultValue: field.defaultValue,
        validation: field.validation.map(v => v.type),
        dataSource: field.dropdownSource,
        isForeignKey: this.isForeignKeyField(field.name),
        foreignKeyTarget: this.inferFKTarget(field.name),
        dependsOn: field.dependsOn,
        controls: [],
        htmlAttributes: htmlField?.htmlAttributes || {},
        jqueryValidations: jsVal?.rules || {},
      };
    });
  }

  /**
   * Check if field name indicates foreign key
   */
  private isForeignKeyField(fieldName: string): boolean {
    return /(?:Id|_ID|_id)$/i.test(fieldName);
  }

  /**
   * Infer foreign key target from field name
   */
  private inferFKTarget(fieldName: string): string | undefined {
    const match = fieldName.match(/^(.+)Id$/i);
    return match ? match[1] : undefined;
  }

  
  private findSubmitHandler(jsResult: EnhancedJSIntelligenceResult, formId: string): string | undefined {
    const formEvents = jsResult.eventHandlers.filter(e => 
      e.eventType === 'submit' && e.selector.includes(formId)
    );
    
    if (formEvents.length > 0) {
      const handler = formEvents[0];
      return handler.functionName || 'anonymous';
    }
    return undefined;
  }

  /**
   * Check if form has AJAX submit
   */
  private hasAjaxSubmit(jsResult: EnhancedJSIntelligenceResult, formId: string): boolean {
    const formAjax = jsResult.ajaxCalls.find(call => 
      call.context.includes(formId) && call.method === 'POST'
    );
    return !!formAjax;
  }

  /**
   * Find related modal for form
   */
  private findRelatedModal(htmlResult: HTMLParserResult, formId: string): string | undefined {
    for (const modal of htmlResult.modals) {
      if (modal.formInside === formId) {
        return modal.id;
      }
    }
    return undefined;
  }

  /**
   * Extract table intelligence
   */
  private extractTableIntelligence(
    htmlResult: HTMLParserResult,
    jsResult: EnhancedJSIntelligenceResult
  ): TableIntelligence[] {
    return htmlResult.dataTables.map(dt => ({
      id: dt.selector.replace(/[^a-zA-Z0-9]/g, '_'),
      selector: dt.selector,
      ajaxUrl: dt.ajaxUrl,
      columns: dt.columns.map(col => ({
        data: col.data,
        title: col.title,
        render: col.render,
        isSortable: col.isSortable,
        isSearchable: col.isSearchable,
        inferredType: this.inferColumnType(col.data),
      })),
      features: dt.features,
      events: dt.events,
    }));
  }

  /**
   * Infer column type from data field name
   */
  private inferColumnType(dataField: string): string {
    const lower = dataField.toLowerCase();
    if (lower.includes('id')) return 'id';
    if (lower.includes('date')) return 'date';
    if (lower.includes('amount') || lower.includes('price') || lower.includes('cost')) return 'currency';
    if (lower.includes('is_') || lower.includes('has_')) return 'boolean';
    if (lower.includes('count') || lower.includes('quantity')) return 'number';
    return 'text';
  }

  /**
   * Extract endpoint intelligence
   */
  private extractEndpointIntelligence(
    cshtmlResult: ParsedCSHTMLView,
    htmlResult: HTMLParserResult,
    jsResult: EnhancedJSIntelligenceResult
  ): EndpointIntelligence[] {
    const endpoints: EndpointIntelligence[] = [];
    const seen = new Set<string>();

    // From AJAX calls
    for (const call of jsResult.ajaxCalls) {
      const key = `${call.method}:${call.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        endpoints.push({
          url: call.url,
          method: call.method,
          source: 'ajax',
          parameters: call.parameters.map(p => ({
            name: p.name,
            type: p.inferredType,
            source: p.source,
            required: p.isRequired,
          })),
          context: call.context,
          confidence: 90,
          relatedFields: [],
        });
      }
    }

    // From DataTables
    for (const dt of htmlResult.dataTables) {
      if (dt.ajaxUrl && !seen.has(dt.ajaxUrl)) {
        seen.add(dt.ajaxUrl);
        endpoints.push({
          url: dt.ajaxUrl,
          method: dt.ajaxMethod || 'POST',
          source: 'datatable',
          parameters: [],
          context: `DataTable: ${dt.selector}`,
          confidence: 85,
          relatedFields: dt.columns.map(c => c.data),
        });
      }
    }

    // From cascading dropdowns
    for (const cascade of cshtmlResult.cascadingDropdowns || []) {
      if (cascade.ajaxEndpoint && !seen.has(cascade.ajaxEndpoint)) {
        seen.add(cascade.ajaxEndpoint);
        endpoints.push({
          url: cascade.ajaxEndpoint,
          method: 'GET',
          source: 'cascade',
          parameters: [{
            name: cascade.sourceParam,
            type: 'string',
            source: 'query',
            required: true,
          }],
          context: `Cascade: ${cascade.parentField} -> ${cascade.childField}`,
          confidence: 80,
          relatedFields: [cascade.childField],
        });
      }
    }

    
    // From Select2 configs
    for (const s2 of htmlResult.select2Configs) {
      if (s2.ajaxUrl && !seen.has(s2.ajaxUrl)) {
        seen.add(s2.ajaxUrl);
        endpoints.push({
          url: s2.ajaxUrl,
          method: s2.ajaxMethod || 'GET',
          source: 'select2',
          parameters: [],
          context: `Select2: ${s2.selector}`,
          confidence: 85,
          relatedFields: [],
        });
      }
    }

    return endpoints;
  }

  /**
   * Extract event intelligence
   */
  private extractEventIntelligence(
    cshtmlResult: ParsedCSHTMLView,
    jsResult: EnhancedJSIntelligenceResult
  ): EventIntelligence[] {
    return jsResult.eventHandlers.map(handler => ({
      eventType: handler.eventType,
      selector: handler.selector,
      handlerType: handler.handlerType as EventIntelligence['handlerType'],
      isDelegated: false,
      parentSelector: undefined,
      code: handler.code,
      relatedEndpoint: this.findRelatedEndpoint(handler.code, jsResult),
      relatedField: this.extractRelatedField(handler.code),
    }));
  }

  /**
   * Find related endpoint in code
   */
  private findRelatedEndpoint(code: string, jsResult: EnhancedJSIntelligenceResult): string | undefined {
    for (const call of jsResult.ajaxCalls) {
      if (code.includes(call.url)) {
        return call.url;
      }
    }
    return undefined;
  }

  /**
   * Extract related field from code
   */
  private extractRelatedField(code: string): string | undefined {
    const fieldMatch = code.match(/\$\(["']#(\w+)["']\)/);
    return fieldMatch?.[1];
  }

  
  private extractValidationIntelligence(
    cshtmlResult: ParsedCSHTMLView,
    htmlResult: HTMLParserResult,
    jsResult: EnhancedJSIntelligenceResult
  ): ValidationIntelligence[] {
    return jsResult.formValidations.map(fv => ({
      formSelector: fv.formSelector,
      fieldValidations: this.groupValidationsByField(fv.rules),
      customRules: [],
      remoteValidations: fv.rules
        .filter(r => r.ruleType === 'remote' || r.ruleType === 'custom')
        .map(r => ({
          fieldName: r.fieldName,
          url: r.value?.toString() || '',
          additionalFields: [],
        })),
    }));
  }

  /**
   * Group validations by field
   */
  private groupValidationsByField(rules: { fieldName: string; ruleType: string; value?: string | number }[]): FieldValidationIntelligence[] {
    const grouped = new Map<string, string[]>();
    
    for (const rule of rules) {
      const existing = grouped.get(rule.fieldName) || [];
      existing.push(rule.ruleType);
      grouped.set(rule.fieldName, existing);
    }
    
    return Array.from(grouped.entries()).map(([fieldName, ruleList]) => ({
      fieldName,
      rules: ruleList,
      messages: {},
    }));
  }

  /**
   * Extract modal intelligence
   */
  private extractModalIntelligence(htmlResult: HTMLParserResult): ModalIntelligence[] {
    return htmlResult.modals.map(modal => ({
      id: modal.id,
      title: modal.title,
      triggerSelectors: modal.triggerSelectors,
      hasForm: !!modal.formInside,
      formId: modal.formInside,
      loadRemoteContent: modal.hasDynamicContent,
      remoteUrl: undefined,
      size: modal.size as ModalIntelligence['size'],
    }));
  }

  
  private extractCascadeIntelligence(
    cshtmlResult: ParsedCSHTMLView,
    jsResult: EnhancedJSIntelligenceResult
  ): CascadeIntelligence[] {
    return (cshtmlResult.cascadingDropdowns || []).map(cascade => ({
      parentField: cascade.parentField,
      childField: cascade.childField,
      endpoint: cascade.ajaxEndpoint,
      parameterName: cascade.sourceParam,
      textField: cascade.textField,
      valueField: cascade.valueField,
      levels: cascade.grandchild ? 3 : 2,
    }));
  }

  
  private extractDependencyIntelligence(
    htmlResult: HTMLParserResult,
    jsResult: EnhancedJSIntelligenceResult
  ): DependencyIntelligence[] {
    const dependencies: DependencyIntelligence[] = [];

    for (const dep of jsResult.dependencies) {
      dependencies.push({
        type: 'library',
        name: dep.name,
        version: dep.version,
        source: dep.type,
        usage: [],
      });
    }

    for (const plugin of jsResult.jqueryPlugins) {
      if (!dependencies.some(d => d.name === plugin)) {
        dependencies.push({
          type: 'plugin',
          name: plugin,
          source: 'cdn',
          usage: [],
        });
      }
    }

    for (const component of jsResult.bootstrapComponents) {
      if (!dependencies.some(d => d.name === `Bootstrap ${component}`)) {
        dependencies.push({
          type: 'component',
          name: `Bootstrap ${component}`,
          source: 'cdn',
          usage: [],
        });
      }
    }

    for (const custom of htmlResult.customComponents) {
      dependencies.push({
        type: 'component',
        name: custom.type,
        source: 'cdn',
        usage: [custom.selector],
      });
    }

    return dependencies;
  }

  
  private mapFieldsToEndpoints(
    forms: FormIntelligence[],
    endpoints: EndpointIntelligence[],
    cascades: CascadeIntelligence[]
  ): FieldEndpointMapping[] {
    const mappings: FieldEndpointMapping[] = [];

    for (const cascade of cascades) {
      mappings.push({
        fieldName: cascade.childField,
        endpointUrl: cascade.endpoint,
        endpointMethod: 'GET',
        purpose: 'cascade',
      });
    }

    for (const form of forms) {
      for (const field of form.fields) {
        if (field.jqueryValidations && field.jqueryValidations['remote']) {
          const remoteUrl = field.jqueryValidations['remote'] as string;
          mappings.push({
            fieldName: field.name,
            endpointUrl: remoteUrl,
            endpointMethod: 'GET',
            purpose: 'remote-validation',
          });
        }
      }
    }

    return mappings;
  }

  
  private mapEventsToActions(
    events: EventIntelligence[],
    endpoints: EndpointIntelligence[],
    htmlResult: HTMLParserResult
  ): EventActionMapping[] {
    const mappings: EventActionMapping[] = [];

    for (const event of events) {
      if (event.relatedEndpoint) {
        mappings.push({
          event: event.eventType,
          selector: event.selector,
          action: '',
          endpoint: event.relatedEndpoint,
        });
      }
    }

    for (const action of htmlResult.actionElements) {
      mappings.push({
        event: action.type === 'link' ? 'click' : 'submit',
        selector: action.selector,
        action: action.action,
        controller: action.controller,
        endpoint: action.controller && action.action ? `/${action.controller}/${action.action}` : undefined,
      });
    }

    return mappings;
  }

  
  private mapDataTablesToAPI(
    tables: TableIntelligence[],
    endpoints: EndpointIntelligence[]
  ): DataTableAPIMapping[] {
    return tables
      .filter(t => t.ajaxUrl)
      .map(table => ({
        tableSelector: table.selector,
        apiUrl: table.ajaxUrl!,
        method: endpoints.find(e => e.url === table.ajaxUrl)?.method || 'POST',
        columns: table.columns.map(c => c.data),
      }));
  }

  /**
   * Generate summary
   */
  private generateSummary(
    forms: FormIntelligence[],
    tables: TableIntelligence[],
    endpoints: EndpointIntelligence[],
    events: EventIntelligence[],
    modals: ModalIntelligence[],
    cascades: CascadeIntelligence[],
    htmlResult: HTMLParserResult,
    jsResult: EnhancedJSIntelligenceResult
  ): CSHTMLIntelligenceSummary {
    const totalFields = forms.reduce((sum, f) => sum + f.fields.length, 0);
    
    const recommendations: string[] = [];
    
    if (forms.some(f => f.hasClientValidation && !f.hasAjaxSubmit)) {
      recommendations.push('Consider adding AJAX form submission for better UX');
    }
    
    if (cascades.length > 2) {
      recommendations.push('Multiple cascading dropdowns detected - consider caching lookup data');
    }
    
    if (jsResult.summary.potentialIssues.length > 0) {
      recommendations.push(...jsResult.summary.potentialIssues);
    }

    return {
      totalForms: forms.length,
      totalFields,
      totalEndpoints: endpoints.length,
      totalEvents: events.length,
      totalTables: tables.length,
      totalModals: modals.length,
      totalCascades: cascades.length,
      hasAjax: endpoints.length > 0,
      hasValidation: forms.some(f => f.hasClientValidation),
      hasFileUpload: forms.some(f => f.hasFileUpload),
      usesjQuery: jsResult.summary.usesjQuery,
      usesBootstrap: htmlResult.bootstrapComponents.length > 0,
      usesModernJS: jsResult.summary.usesModernJS,
      complexity: this.calculateComplexity(forms, tables, endpoints, events, jsResult),
      recommendations,
    };
  }

  /**
   * Calculate overall complexity
   */
  private calculateComplexity(
    forms: FormIntelligence[],
    tables: TableIntelligence[],
    endpoints: EndpointIntelligence[],
    events: EventIntelligence[],
    jsResult: EnhancedJSIntelligenceResult
  ): 'low' | 'medium' | 'high' {
    let score = 0;

    score += forms.length * 2;
    score += forms.reduce((sum, f) => sum + f.fields.length, 0) * 0.5;
    score += tables.length * 3;
    score += endpoints.length;
    score += events.length * 0.5;
    score += jsResult.complexity * 0.1;

    if (score > 30) return 'high';
    if (score > 15) return 'medium';
    return 'low';
  }
}

// Export convenience function
export function analyzeCSHTML(content: string, fileName?: string): CSHTMLIntelligence {
  const engine = new CSHTMLIntelligenceEngine(content, fileName);
  return engine.analyze();
}
