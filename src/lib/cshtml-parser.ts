// =============================================================================
// CSHTML Parser - ASP.NET Razor View to React Blueprint Converter
// =============================================================================
// Converts existing ASP.NET Razor views to React blueprints
// =============================================================================

/**
 * Parsed CSHTML View Model
 */
export interface CSHTMLModel {
  name: string;
  namespace?: string;
  properties: ModelProperty[];
  linkedTable?: string;
}

/**
 * Model Property
 */
export interface ModelProperty {
  name: string;
  type: string;
  isRequired: boolean;
  isNullable: boolean;
  validationAttributes: string[];
}

/**
 * Parsed Form Field
 */
export interface ParsedFormField {
  name: string;
  label: string;
  inputType: ReactInputType;
  aspFor: string;
  isRequired: boolean;
  isReadOnly: boolean;
  placeholder?: string;
  defaultValue?: string;
  cssClass?: string;
  layout: FieldLayout;
  validation: FieldValidation[];
  permission?: PermissionRequirement;
  dropdownSource?: string;
  colSpan: number;
}

/**
 * React Input Type Mapping
 */
export type ReactInputType =
  | 'text_input'
  | 'email_input'
  | 'password_input'
  | 'number_input'
  | 'currency_input'
  | 'date_picker'
  | 'time_picker'
  | 'datetime_picker'
  | 'textarea'
  | 'checkbox'
  | 'toggle'
  | 'dropdown'
  | 'multi_select'
  | 'file_upload'
  | 'hidden'
  | 'radio_group';

/**
 * Field Layout
 */
export interface FieldLayout {
  row: number;
  column: number;
  width: 'full' | 'half' | 'third' | 'quarter';
  cssClass: string;
}

/**
 * Field Validation
 */
export interface FieldValidation {
  type: 'required' | 'email' | 'min_length' | 'max_length' | 'pattern' | 'min_value' | 'max_value';
  value?: string | number;
  message?: string;
}

/**
 * Permission Requirement
 */
export interface PermissionRequirement {
  type: 'role' | 'claim' | 'policy';
  value: string;
  action: 'show' | 'hide' | 'disable';
}

/**
 * Parsed List/Table View
 */
export interface ParsedListView {
  columns: ListColumn[];
  dataSource: string;
  actions: ListAction[];
  hasPagination: boolean;
  hasSearch: boolean;
  hasSorting: boolean;
  emptyMessage?: string;
}

/**
 * List Column
 */
export interface ListColumn {
  fieldName: string;
  header: string;
  isSortable: boolean;
  isLink: boolean;
  linkTarget?: string;
  format?: string;
  cssClass?: string;
}

/**
 * List Action
 */
export interface ListAction {
  type: 'create' | 'edit' | 'delete' | 'details' | 'list' | 'custom';
  label: string;
  controller?: string;
  action?: string;
  routeId?: string;
  cssClass?: string;
  icon?: string;
  permission?: PermissionRequirement;
}

/**
 * Parsed CSHTML View
 */
export interface ParsedCSHTMLView {
  viewName: string;
  viewType: ViewType;
  model?: CSHTMLModel;
  title?: string;
  layout?: string;
  fields: ParsedFormField[];
  list?: ParsedListView;
  sections: ViewSection[];
  scripts: string[];
  styles: string[];
  permissions: PermissionRequirement[];
  rawContent: string;
  // Enhanced extraction
  jsValidations?: JavaScriptValidation[];
  cascadingDropdowns?: CascadingDropdown[];
  ajaxEndpoints?: AjaxEndpoint[];
  formInfo?: FormInfo;
  // Advanced Intelligence
  schemaIntelligence?: SchemaIntelligence;
  securityAnalysis?: SecurityAnalysis;
  rbacPermissions?: RBACPermissions;
  gapAnalysis?: GapAnalysisResult;
  lookupTables?: LookupTable[];
  errorCodes?: ErrorCodeMapping[];
  componentMap?: ComponentMapping[];
}

/**
 * Schema Intelligence - Inferred Database Schema
 */
export interface SchemaIntelligence {
  primaryTable: InferredTable;
  nestedTables: InferredTable[];
  relationships: TableRelationship[];
  indexes: InferredIndex[];
  confidence: number;
}

export interface InferredTable {
  name: string;
  inferredFrom: string;
  columns: InferredColumn[];
  confidence: number;
}

export interface InferredColumn {
  name: string;
  inferredType: string;
  constraints: string[];
  intelligenceSource: string;
  isRequired: boolean;
  isUnique: boolean;
  isFK: boolean;
  fkTarget?: string;
  maxLength?: number;
  minLength?: number;
  defaultValue?: string;
}

export interface TableRelationship {
  parentTable: string;
  childTable: string;
  foreignKey: string;
  relationshipType: 'one-to-many' | 'one-to-one' | 'many-to-many';
}

export interface InferredIndex {
  tableName: string;
  columns: string[];
  isUnique: boolean;
  inferredFrom: string;
}

/**
 * Security Analysis Result
 */
export interface SecurityAnalysis {
  risks: SecurityRisk[];
  piiFields: PIIField[];
  hasCSRFProtection: boolean;
  hasPasswordFields: boolean;
  hasFileUpload: boolean;
  httpsRequired: boolean;
  xssRisks: string[];
}

export interface SecurityRisk {
  id: string;
  category: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location: string;
  recommendation: string;
  owaspCategory?: string;
}

export interface PIIField {
  fieldName: string;
  piiType: 'email' | 'phone' | 'ssn' | 'credit_card' | 'dob' | 'address' | 'name' | 'other';
  sensitivity: 'high' | 'medium' | 'low';
  complianceFlags: string[];
}

/**
 * RBAC Permissions
 */
export interface RBACPermissions {
  permissions: RBACPermission[];
  canAdd: boolean;
  canView: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  missingPermissions: string[];
}

export interface RBACPermission {
  name: string;
  modelProperty: string;
  detectedIn: string;
  isActive: boolean;
}

/**
 * Gap Analysis Result
 */
export interface GapAnalysisResult {
  gaps: GapItem[];
  completeness: number;
  requiredFiles: string[];
  recommendations: string[];
}

export interface GapItem {
  id: string;
  category: 'database' | 'backend' | 'frontend' | 'security' | 'workflow' | 'compliance';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resolution: string;
  resolutionAgent?: string;
}

/**
 * Lookup Table
 */
export interface LookupTable {
  name: string;
  detectedFrom: string;
  endpoint: string;
  inferredColumns: string[];
}

/**
 * Error Code Mapping
 */
export interface ErrorCodeMapping {
  code: number;
  inferredMeaning: string;
  context: string;
}

/**
 * Component Mapping
 */
export interface ComponentMapping {
  name: string;
  type: string;
  library: string;
  configuration: Record<string, unknown>;
  selector?: string;
}

/**
 * JavaScript Validation Rule (from jQuery validate)
 */
export interface JavaScriptValidation {
  fieldName: string;
  rules: {
    required?: boolean;
    email?: boolean;
    url?: boolean;
    date?: boolean;
    number?: boolean;
    digits?: boolean;
    minlength?: number;
    maxlength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    equalTo?: string;
    remote?: string;
  };
  messages?: Record<string, string>;
}

/**
 * Cascading Dropdown Chain
 */
export interface CascadingDropdown {
  parentField: string;
  childField: string;
  ajaxEndpoint: string;
  sourceParam: string;
  textField: string;
  valueField: string;
  grandchild?: CascadingDropdown;
}

/**
 * AJAX Endpoint Discovery
 */
export interface AjaxEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  context: string;
  parameters?: string[];
  isFormData?: boolean;
}

/**
 * Form Information
 */
export interface FormInfo {
  id: string;
  action: string;
  controller: string;
  method: 'GET' | 'POST';
  isMultipart: boolean;
  submitHandler?: string;
}

/**
 * View Type
 */
export type ViewType = 'form' | 'list' | 'details' | 'dashboard' | 'mixed' | 'unknown';

/**
 * View Section
 */
export interface ViewSection {
  id: string;
  title: string;
  fields: string[];
  isCollapsible: boolean;
  permission?: PermissionRequirement;
}

/**
 * React Component Blueprint (Final Output)
 */
export interface ReactBlueprint {
  componentName: string;
  viewType: ViewType;
  tableName?: string;
  fields: ReactFieldBlueprint[];
  list?: ReactListBlueprint;
  imports: string[];
  hooks: string[];
  permissions: PermissionRequirement[];
  layout: 'single_column' | 'two_column' | 'three_column' | 'tabs';
  suggestedPath: string;
}

/**
 * React Field Blueprint
 */
export interface ReactFieldBlueprint {
  name: string;
  label: string;
  type: ReactInputType;
  required: boolean;
  readOnly: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  validation: FieldValidation[];
  colSpan: number;
  permission?: PermissionRequirement;
  options?: { label: string; value: string }[];
}

/**
 * React List Blueprint
 */
export interface ReactListBlueprint {
  columns: { field: string; header: string; sortable: boolean }[];
  actions: { type: string; label: string; path: string }[];
  hasPagination: boolean;
  hasSearch: boolean;
  hasSorting: boolean;
}

/**
 * CSHTML Parser Engine
 */
export class CSHTMLParser {
  private content: string;
  private fileName: string;
  private currentLine: number = 0;

  constructor(content: string, fileName?: string) {
    this.content = content;
    this.fileName = fileName || '';
  }

  /**
   * Parse CSHTML content
   */
  parse(): ParsedCSHTMLView {
    const viewName = this.extractViewName();
    const viewType = this.determineViewType();
    const model = this.extractModel();
    const title = this.extractTitle();
    const layout = this.extractLayout();
    const formInfo = this.extractFormInfo();
    let fields = this.extractFormFields();
    const list = this.extractListView();
    const sections = this.extractSections();
    const scripts = this.extractScripts();
    const styles = this.extractStyles();
    const permissions = this.extractPermissions();
    
    // Enhanced extraction
    const jsValidations = this.extractJavaScriptValidations();
    const cascadingDropdowns = this.extractCascadingDropdowns();
    const ajaxEndpoints = this.extractAjaxEndpoints();
    
    // Merge JS validations with fields
    fields = this.mergeValidationsFromJS(fields, jsValidations);
    
    // Advanced Intelligence Extraction
    const lookupTables = this.extractLookupTables();
    const schemaIntelligence = this.extractSchemaIntelligence(fields, formInfo, lookupTables);
    const securityAnalysis = this.extractSecurityAnalysis(fields, scripts);
    const rbacPermissions = this.extractRBACPermissions();
    const errorCodes = this.extractErrorCodes();
    const componentMap = this.extractComponentMap();
    const gapAnalysis = this.generateGapAnalysis(
      schemaIntelligence, 
      securityAnalysis, 
      rbacPermissions, 
      formInfo
    );

    return {
      viewName,
      viewType,
      model,
      title,
      layout,
      fields,
      list,
      sections,
      scripts,
      styles,
      permissions,
      rawContent: this.content,
      jsValidations,
      cascadingDropdowns,
      ajaxEndpoints,
      formInfo,
      // Advanced Intelligence
      schemaIntelligence,
      securityAnalysis,
      rbacPermissions,
      gapAnalysis,
      lookupTables,
      errorCodes,
      componentMap,
    };
  }

  /**
   * Extract view name from file path or content
   */
  private extractViewName(): string {
    // First, try to find from ViewBag.Title
    const titleMatch = this.content.match(/ViewBag\.Title\s*=\s*"([^"]+)"/i);
    if (titleMatch) return titleMatch[1];

    // Second, try to extract from @model directive
    const modelMatch = this.content.match(/@model\s+([\w.]+)/);
    if (modelMatch) {
      // Extract just the class name from full namespace
      const fullName = modelMatch[1];
      const parts = fullName.split('.');
      const className = parts[parts.length - 1];
      return `${className}View`;
    }

    // Third, try to use the file name
    if (this.fileName) {
      // Extract base name without ANY extension
      const baseName = this.fileName
        .replace(/\.cshtml$/i, '')
        .replace(/\.vbhtml$/i, '')
        .replace(/\.md$/i, '')
        .replace(/\.txt$/i, '')
        .replace(/\.[^.]+$/, ''); // Remove any other extension
      // Convert to title case (e.g., "organization" -> "Organization")
      if (baseName && baseName.length > 0) {
        const viewName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        return viewName;
      }
    }

    return 'UnknownView';
  }

  /**
   * Determine view type from content
   */
  private determineViewType(): ViewType {
    const hasForm = /<form|@using\s*\(\s*Html\.BeginForm/i.test(this.content);
    const hasTable = /<table[^>]*>[\s\S]*?@foreach/i.test(this.content);
    const hasList = /@foreach|@for\s*\(|@while\s*\(/i.test(this.content);
    const hasDetails = /<dl\s+class="dl-horizontal"|DisplayFor|DisplayNameFor/i.test(this.content);
    const hasDashboard = /chart|dashboard|statistics|metric|kpi/i.test(this.content);

    if (hasDashboard) return 'dashboard';
    if (hasForm && hasList) return 'mixed';
    if (hasTable || (hasList && !hasForm)) return 'list';
    if (hasDetails && !hasForm) return 'details';
    if (hasForm) return 'form';

    return 'unknown';
  }

  /**
   * Extract model declaration
   */
  private extractModel(): CSHTMLModel | undefined {
    const modelMatch = this.content.match(/@model\s+([\w.]+)/);
    
    if (modelMatch) {
      const fullName = modelMatch[1];
      const parts = fullName.split('.');
      const name = parts[parts.length - 1];

      // Try to infer linked table from model name
      const linkedTable = this.inferTableFromModel(name);

      return {
        name,
        namespace: parts.length > 1 ? parts.slice(0, -1).join('.') : undefined,
        properties: [],
        linkedTable,
      };
    }

    // If no @model directive, try to infer from view name or content
    const inferredTable = this.inferTableFromContent();
    if (inferredTable) {
      return {
        name: inferredTable + 'Model',
        properties: [],
        linkedTable: inferredTable,
      };
    }

    return undefined;
  }

  /**
   * Infer table from content when no @model is present
   */
  private inferTableFromContent(): string | undefined {
    // Try to find table from ActionLink patterns
    const actionLinkMatch = this.content.match(/@Html\.ActionLink\s*\([^)]*"[^"]+"[^)]*,\s*"(\w+)"/);
    if (actionLinkMatch) {
      // Controller name often maps to table name
      return this.pluralize(actionLinkMatch[1]);
    }

    // Try to find from asp-controller attributes
    const controllerMatch = this.content.match(/asp-controller="(\w+)"/);
    if (controllerMatch) {
      return this.pluralize(controllerMatch[1]);
    }

    // Try to find from foreach pattern
    const foreachMatch = this.content.match(/@foreach\s*\(\s*var\s+\w+\s+in\s+Model(\.\w+)?/);
    if (foreachMatch) {
      // The view name often matches the table
      const viewNameMatch = this.content.match(/ViewBag\.Title\s*=\s*"([^"]+)"/);
      if (viewNameMatch) {
        return this.pluralize(viewNameMatch[1].replace(/\s+/g, ''));
      }
    }

    // Try to find from table id or class patterns
    const tableIdMatch = this.content.match(/<table[^>]*id="(\w+)"/);
    if (tableIdMatch) {
      const id = tableIdMatch[1];
      // Remove common suffixes like 'Table', 'List', 'Grid'
      const cleanName = id.replace(/Table$/i, '').replace(/List$/i, '').replace(/Grid$/i, '');
      if (cleanName.length > 2) {
        return this.pluralize(cleanName);
      }
    }

    // Try to find from DisplayFor patterns that might indicate entity
    const displayForMatch = this.content.match(/DisplayFor\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/);
    if (displayForMatch) {
      // This gives us a field name, but not the table
      // Fall back to view name inference
    }

    // Try to extract from the viewName itself
    const viewName = this.extractViewName();
    if (viewName && viewName !== 'UnknownView') {
      // Extract potential entity name from view name
      // Patterns like "Organizations", "OrganizationEdit", "EditOrganization"
      const entityName = viewName
        .replace(/Edit$/i, '')
        .replace(/Create$/i, '')
        .replace(/Delete$/i, '')
        .replace(/Details$/i, '')
        .replace(/Index$/i, '')
        .replace(/List$/i, '')
        .replace(/View$/i, '');
      
      if (entityName.length > 2) {
        return this.pluralize(entityName);
      }
    }

    return undefined;
  }

  /**
   * Simple pluralization helper
   */
  private pluralize(word: string): string {
    if (!word) return word;
    
    // Common irregular plurals
    const irregulars: Record<string, string> = {
      'person': 'People',
      'child': 'Children',
      'foot': 'Feet',
      'tooth': 'Teeth',
      'goose': 'Geese',
      'mouse': 'Mice',
      'man': 'Men',
      'woman': 'Women',
      'data': 'Data',
      'info': 'Info',
      'equipment': 'Equipment',
    };
    
    const lower = word.toLowerCase();
    if (irregulars[lower]) {
      return irregulars[lower];
    }
    
    // Already plural indicators
    if (word.endsWith('s') || word.endsWith('S')) {
      return word;
    }
    
    // Standard pluralization rules
    if (word.endsWith('y') && !'aeiou'.includes(word.slice(-2, -1).toLowerCase())) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    }
    
    return word + 's';
  }

  /**
   * Infer table name from model name
   */
  private inferTableFromModel(modelName: string): string | undefined {
    // Common patterns: PatientViewModel → Patients, UserEditModel → Users
    const cleanName = modelName
      .replace(/ViewModel$/, '')
      .replace(/EditModel$/, '')
      .replace(/CreateModel$/, '')
      .replace(/DetailModel$/, '')
      .replace(/ListModel$/, '')
      .replace(/Model$/, '');

    // Use shared pluralize method
    return this.pluralize(cleanName);
  }

  /**
   * Extract page title
   */
  private extractTitle(): string | undefined {
    const titleMatch = this.content.match(/ViewBag\.Title\s*=\s*"([^"]+)"/i);
    return titleMatch ? titleMatch[1] : undefined;
  }

  /**
   * Extract layout reference
   */
  private extractLayout(): string | undefined {
    const layoutMatch = this.content.match(/Layout\s*=\s*"([^"]+)"/i);
    return layoutMatch ? layoutMatch[1] : undefined;
  }

  /**
   * Extract form fields from CSHTML
   */
  private extractFormFields(): ParsedFormField[] {
    const fields: ParsedFormField[] = [];

    // Pattern 1: <input asp-for="Field" />
    const inputAspForRegex = /<input[^>]*asp-for="([^"]+)"[^>]*\/?>/gi;
    let match;

    while ((match = inputAspForRegex.exec(this.content)) !== null) {
      fields.push(this.parseInputTag(match[0], match[1]));
    }

    // Pattern 2: <input name="field" /> (plain HTML inputs)
    const inputNameRegex = /<input[^>]*name="([^"]+)"[^>]*\/?>/gi;
    while ((match = inputNameRegex.exec(this.content)) !== null) {
      // Skip if already captured by asp-for
      const existingField = fields.find(f => f.name === match[1] || f.aspFor === match[1]);
      if (!existingField) {
        fields.push(this.parsePlainInputTag(match[0], match[1]));
      }
    }

    // Pattern 3: <textarea asp-for="Field">
    const textareaAspForRegex = /<textarea[^>]*asp-for="([^"]+)"[^>]*>/gi;
    while ((match = textareaAspForRegex.exec(this.content)) !== null) {
      fields.push(this.parseTextareaTag(match[0], match[1]));
    }

    // Pattern 4: <textarea name="field">
    const textareaNameRegex = /<textarea[^>]*name="([^"]+)"[^>]*>/gi;
    while ((match = textareaNameRegex.exec(this.content)) !== null) {
      const existingField = fields.find(f => f.name === match[1]);
      if (!existingField) {
        fields.push(this.parseTextareaTag(match[0], match[1]));
      }
    }

    // Pattern 5: <select asp-for="Field">
    const selectAspForRegex = /<select[^>]*asp-for="([^"]+)"[^>]*>/gi;
    while ((match = selectAspForRegex.exec(this.content)) !== null) {
      fields.push(this.parseSelectTag(match[0], match[1]));
    }

    // Pattern 6: <select name="field">
    const selectNameRegex = /<select[^>]*name="([^"]+)"[^>]*>/gi;
    while ((match = selectNameRegex.exec(this.content)) !== null) {
      const existingField = fields.find(f => f.name === match[1]);
      if (!existingField) {
        fields.push(this.parseSelectTag(match[0], match[1]));
      }
    }

    // Pattern 7: @Html.EditorFor(m => m.Field)
    const editorForRegex = /@Html\.EditorFor\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/gi;
    while ((match = editorForRegex.exec(this.content)) !== null) {
      fields.push(this.parseEditorFor(match[0], match[1]));
    }

    // Pattern 8: @Html.TextBoxFor(m => m.Field)
    const textBoxForRegex = /@Html\.TextBoxFor\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/gi;
    while ((match = textBoxForRegex.exec(this.content)) !== null) {
      fields.push(this.parseTextBoxFor(match[0], match[1]));
    }

    // Pattern 9: @Html.DropDownListFor(m => m.Field, ...)
    const dropDownRegex = /@Html\.DropDownListFor\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/gi;
    while ((match = dropDownRegex.exec(this.content)) !== null) {
      fields.push(this.parseDropDownFor(match[0], match[1]));
    }

    // Pattern 10: @Html.DropDownList("FieldName", ...)
    const dropDownListRegex = /@Html\.DropDownList\s*\(\s*"([^"]+)"/gi;
    while ((match = dropDownListRegex.exec(this.content)) !== null) {
      const existingField = fields.find(f => f.name === match[1]);
      if (!existingField) {
        fields.push(this.parseHtmlDropDown(match[0], match[1]));
      }
    }

    // Pattern 11: @Html.CheckBoxFor(m => m.Field)
    const checkBoxRegex = /@Html\.CheckBoxFor\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/gi;
    while ((match = checkBoxRegex.exec(this.content)) !== null) {
      fields.push(this.parseCheckBoxFor(match[0], match[1]));
    }

    // Pattern 12: @Html.PasswordFor(m => m.Field)
    const passwordRegex = /@Html\.PasswordFor\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/gi;
    while ((match = passwordRegex.exec(this.content)) !== null) {
      fields.push(this.parsePasswordFor(match[0], match[1]));
    }

    // Pattern 13: <input type="file" name="field">
    const fileInputRegex = /<input[^>]*type="file"[^>]*name="([^"]+)"[^>]*\/?>/gi;
    while ((match = fileInputRegex.exec(this.content)) !== null) {
      const existingField = fields.find(f => f.name === match[1]);
      if (!existingField) {
        fields.push(this.parseFileInput(match[0], match[1]));
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    return fields.filter(field => {
      if (seen.has(field.name)) return false;
      seen.add(field.name);
      return true;
    });
  }

  /**
   * Parse plain HTML input tag with name attribute
   */
  private parsePlainInputTag(tag: string, name: string): ParsedFormField {
    const inputType = this.mapInputType(tag);
    const isRequired = /required|data-val-required/i.test(tag);
    const isReadOnly = /readonly|disabled/i.test(tag);
    const cssClass = this.extractClass(tag);
    const placeholder = this.extractAttribute(tag, 'placeholder');
    const defaultValue = this.extractAttribute(tag, 'value');
    const minLength = this.extractAttribute(tag, 'minlength');
    const maxLength = this.extractAttribute(tag, 'maxlength');
    const permission = this.extractPermission(tag);

    // Build validations from HTML attributes
    const validations: FieldValidation[] = [];
    if (isRequired) {
      validations.push({ type: 'required', message: 'This field is required' });
    }
    if (minLength) {
      validations.push({ type: 'min_length', value: parseInt(minLength) });
    }
    if (maxLength) {
      validations.push({ type: 'max_length', value: parseInt(maxLength) });
    }

    // Determine colSpan from parent div structure
    const colSpan = this.determineColSpan(tag);

    return {
      name,
      label: this.extractLabelFromContext(tag, name),
      inputType,
      aspFor: name,
      isRequired,
      isReadOnly,
      placeholder,
      defaultValue,
      cssClass,
      layout: this.extractFieldLayout(tag, cssClass),
      validation: validations,
      permission,
      colSpan,
    };
  }

  /**
   * Parse file input
   */
  private parseFileInput(tag: string, name: string): ParsedFormField {
    const cssClass = this.extractClass(tag);
    const accept = this.extractAttribute(tag, 'accept');

    return {
      name,
      label: this.extractLabelFromContext(tag, name),
      inputType: 'file_upload',
      aspFor: name,
      isRequired: /required/i.test(tag),
      isReadOnly: false,
      cssClass,
      layout: this.extractFieldLayout(tag, cssClass),
      validation: [],
      colSpan: this.determineColSpan(tag),
    };
  }

  /**
   * Parse @Html.DropDownList
   */
  private parseHtmlDropDown(tag: string, fieldName: string): ParsedFormField {
    return {
      name: fieldName,
      label: this.formatLabel(fieldName),
      inputType: 'dropdown',
      aspFor: fieldName,
      isRequired: false,
      isReadOnly: false,
      layout: { row: 0, column: 0, width: 'full', cssClass: '' },
      validation: [],
      colSpan: 12,
    };
  }

  /**
   * Extract label from surrounding context
   */
  private extractLabelFromContext(tag: string, fieldName: string): string {
    // Try to find a label in the surrounding context
    const index = this.content.indexOf(tag);
    if (index !== -1) {
      const start = Math.max(0, index - 500);
      const context = this.content.substring(start, index);
      
      // Look for <label> tag
      const labelMatch = context.match(/<label[^>]*>([^<]+)<\/label>\s*$/i);
      if (labelMatch) {
        let label = labelMatch[1].trim();
        // Remove mandatory asterisk markers
        label = label.replace(/<mandatory>\*<\/mandatory>/gi, '').trim();
        label = label.replace(/<manndatory>\*<\/manndatory>/gi, '').trim();
        label = label.replace(/\*/g, '').trim();
        return label;
      }
    }
    
    // Fall back to formatted field name
    return this.formatLabel(fieldName);
  }

  /**
   * Determine colSpan from parent div structure
   */
  private determineColSpan(tag: string): number {
    const index = this.content.indexOf(tag);
    if (index === -1) return 12;

    // Look backwards for col-md-X or col-lg-X patterns
    const beforeTag = this.content.substring(Math.max(0, index - 1000), index);
    const colMatches = beforeTag.match(/col-(?:md|lg|sm)-(\d+)/g);
    
    if (colMatches && colMatches.length > 0) {
      // Get the last col class
      const lastCol = colMatches[colMatches.length - 1];
      const numMatch = lastCol.match(/(\d+)/);
      if (numMatch) {
        return parseInt(numMatch[1]);
      }
    }

    return 12;
  }

  /**
   * Parse input tag
   */
  private parseInputTag(tag: string, aspFor: string): ParsedFormField {
    const inputType = this.mapInputType(tag);
    const isRequired = /required|data-val-required/i.test(tag);
    const isReadOnly = /readonly|disabled/i.test(tag);
    const cssClass = this.extractClass(tag);
    const placeholder = this.extractAttribute(tag, 'placeholder');
    const defaultValue = this.extractAttribute(tag, 'value');
    const permission = this.extractPermission(tag);

    return {
      name: aspFor,
      label: this.formatLabel(aspFor),
      inputType,
      aspFor,
      isRequired,
      isReadOnly,
      placeholder,
      defaultValue,
      cssClass,
      layout: this.extractFieldLayout(tag, cssClass),
      validation: this.extractValidations(tag),
      permission,
      colSpan: this.calculateColSpan(cssClass),
    };
  }

  /**
   * Parse textarea tag
   */
  private parseTextareaTag(tag: string, aspFor: string): ParsedFormField {
    const isRequired = /required|data-val-required/i.test(tag);
    const cssClass = this.extractClass(tag);
    const rows = this.extractAttribute(tag, 'rows');

    return {
      name: aspFor,
      label: this.formatLabel(aspFor),
      inputType: 'textarea',
      aspFor,
      isRequired,
      isReadOnly: /readonly|disabled/i.test(tag),
      cssClass,
      layout: this.extractFieldLayout(tag, cssClass),
      validation: this.extractValidations(tag),
      colSpan: this.calculateColSpan(cssClass),
    };
  }

  /**
   * Parse select tag
   */
  private parseSelectTag(tag: string, aspFor: string): ParsedFormField {
    const isRequired = /required|data-val-required/i.test(tag);
    const cssClass = this.extractClass(tag);

    // Extract asp-items source
    const aspItemsMatch = tag.match(/asp-items="([^"]+)"/);
    const dropdownSource = aspItemsMatch ? aspItemsMatch[1] : undefined;

    return {
      name: aspFor,
      label: this.formatLabel(aspFor),
      inputType: 'dropdown',
      aspFor,
      isRequired,
      isReadOnly: /readonly|disabled/i.test(tag),
      cssClass,
      dropdownSource,
      layout: this.extractFieldLayout(tag, cssClass),
      validation: this.extractValidations(tag),
      colSpan: this.calculateColSpan(cssClass),
    };
  }

  /**
   * Parse EditorFor helper
   */
  private parseEditorFor(tag: string, fieldName: string): ParsedFormField {
    return {
      name: fieldName,
      label: this.formatLabel(fieldName),
      inputType: 'text_input', // Default, could be enhanced
      aspFor: fieldName,
      isRequired: false,
      isReadOnly: false,
      layout: { row: 0, column: 0, width: 'full', cssClass: '' },
      validation: [],
      colSpan: 12,
    };
  }

  /**
   * Parse TextBoxFor helper
   */
  private parseTextBoxFor(tag: string, fieldName: string): ParsedFormField {
    const inputType = /type="email"/i.test(tag) ? 'email_input' :
                      /type="number"/i.test(tag) ? 'number_input' :
                      /type="date"/i.test(tag) ? 'date_picker' :
                      'text_input';

    return {
      name: fieldName,
      label: this.formatLabel(fieldName),
      inputType,
      aspFor: fieldName,
      isRequired: /required/i.test(tag),
      isReadOnly: false,
      layout: { row: 0, column: 0, width: 'full', cssClass: '' },
      validation: [],
      colSpan: 12,
    };
  }

  /**
   * Parse DropDownListFor helper
   */
  private parseDropDownFor(tag: string, fieldName: string): ParsedFormField {
    const sourceMatch = tag.match(/(?:SelectList|ViewBag)\.(\w+)/);
    return {
      name: fieldName,
      label: this.formatLabel(fieldName),
      inputType: 'dropdown',
      aspFor: fieldName,
      isRequired: false,
      isReadOnly: false,
      dropdownSource: sourceMatch ? sourceMatch[1] : undefined,
      layout: { row: 0, column: 0, width: 'full', cssClass: '' },
      validation: [],
      colSpan: 12,
    };
  }

  /**
   * Parse CheckBoxFor helper
   */
  private parseCheckBoxFor(tag: string, fieldName: string): ParsedFormField {
    return {
      name: fieldName,
      label: this.formatLabel(fieldName),
      inputType: 'checkbox',
      aspFor: fieldName,
      isRequired: false,
      isReadOnly: false,
      layout: { row: 0, column: 0, width: 'full', cssClass: '' },
      validation: [],
      colSpan: 12,
    };
  }

  /**
   * Parse PasswordFor helper
   */
  private parsePasswordFor(tag: string, fieldName: string): ParsedFormField {
    return {
      name: fieldName,
      label: this.formatLabel(fieldName),
      inputType: 'password_input',
      aspFor: fieldName,
      isRequired: false,
      isReadOnly: false,
      layout: { row: 0, column: 0, width: 'full', cssClass: '' },
      validation: [],
      colSpan: 12,
    };
  }

  /**
   * Map HTML input type to React component
   */
  private mapInputType(tag: string): ReactInputType {
    const typeMatch = tag.match(/type="([^"]+)"/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';

    const typeMap: Record<string, ReactInputType> = {
      'text': 'text_input',
      'email': 'email_input',
      'password': 'password_input',
      'number': 'number_input',
      'tel': 'text_input',
      'url': 'text_input',
      'date': 'date_picker',
      'time': 'time_picker',
      'datetime-local': 'datetime_picker',
      'checkbox': 'checkbox',
      'radio': 'radio_group',
      'file': 'file_upload',
      'hidden': 'hidden',
    };

    return typeMap[type] || 'text_input';
  }

  /**
   * Extract CSS class from tag
   */
  private extractClass(tag: string): string {
    const classMatch = tag.match(/class="([^"]+)"/i);
    return classMatch ? classMatch[1] : '';
  }

  /**
   * Extract attribute value from tag
   */
  private extractAttribute(tag: string, attr: string): string | undefined {
    const attrMatch = tag.match(new RegExp(`${attr}="([^"]+)"`, 'i'));
    return attrMatch ? attrMatch[1] : undefined;
  }

  /**
   * Extract field layout from CSS class
   */
  private extractFieldLayout(tag: string, cssClass: string | undefined): FieldLayout {
    // Handle undefined or empty cssClass
    const safeCssClass = cssClass || '';
    
    // Parse Bootstrap grid classes
    const colMatch = safeCssClass.match(/col-(?:md|lg|sm)-(\d+)/);
    const colWidth = colMatch ? parseInt(colMatch[1]) : 12;

    return {
      row: 0, // Would need line number tracking
      column: 0,
      width: colWidth <= 3 ? 'quarter' :
             colWidth <= 4 ? 'third' :
             colWidth <= 6 ? 'half' : 'full',
      cssClass: safeCssClass,
    };
  }

  /**
   * Calculate column span from CSS class
   */
  private calculateColSpan(cssClass: string | undefined): number {
    const safeCssClass = cssClass || '';
    const colMatch = safeCssClass.match(/col-(?:md|lg|sm)-(\d+)/);
    return colMatch ? parseInt(colMatch[1]) : 12;
  }

  /**
   * Extract validations from tag
   */
  private extractValidations(tag: string): FieldValidation[] {
    const validations: FieldValidation[] = [];

    if (/required|data-val-required/i.test(tag)) {
      const msgMatch = tag.match(/data-val-required="([^"]+)"/);
      validations.push({
        type: 'required',
        message: msgMatch ? msgMatch[1] : 'This field is required',
      });
    }

    if (/data-val-email/i.test(tag)) {
      validations.push({ type: 'email' });
    }

    const minLengthMatch = tag.match(/data-val-length-min="(\d+)"/);
    if (minLengthMatch) {
      validations.push({ type: 'min_length', value: parseInt(minLengthMatch[1]) });
    }

    const maxLengthMatch = tag.match(/data-val-length-max="(\d+)"/);
    if (maxLengthMatch) {
      validations.push({ type: 'max_length', value: parseInt(maxLengthMatch[1]) });
    }

    const patternMatch = tag.match(/data-val-regex-pattern="([^"]+)"/);
    if (patternMatch) {
      validations.push({ type: 'pattern', value: patternMatch[1] });
    }

    return validations;
  }

  /**
   * Extract permission from tag
   */
  private extractPermission(tag: string): PermissionRequirement | undefined {
    // Check for role-based visibility
    const surroundingContext = this.getSurroundingContext(tag);

    const roleMatch = surroundingContext.match(/User\.IsInRole\s*\(\s*"([^"]+)"\)/);
    if (roleMatch) {
      return {
        type: 'role',
        value: roleMatch[1],
        action: 'show',
      };
    }

    return undefined;
  }

  /**
   * Get surrounding context for a tag
   */
  private getSurroundingContext(tag: string): string {
    const index = this.content.indexOf(tag);
    if (index === -1) return '';

    const start = Math.max(0, index - 200);
    const end = Math.min(this.content.length, index + tag.length + 200);

    return this.content.substring(start, end);
  }

  /**
   * Extract list view configuration
   */
  private extractListView(): ParsedListView | undefined {
    if (!/<table[^>]*>[\s\S]*?@foreach/i.test(this.content)) return undefined;

    const columns = this.extractListColumns();
    const dataSource = this.extractDataSource();
    const actions = this.extractListActions();

    return {
      columns,
      dataSource,
      actions,
      hasPagination: /PagedList|pagination|page-size/i.test(this.content),
      hasSearch: /search|filter|SearchString/i.test(this.content),
      hasSorting: /sort|order-by|OrderBy/i.test(this.content),
      emptyMessage: this.extractEmptyMessage(),
    };
  }

  /**
   * Extract list columns from table
   */
  private extractListColumns(): ListColumn[] {
    const columns: ListColumn[] = [];

    // Extract <th> headers
    const thRegex = /<th[^>]*>([^<]+)<\/th>/gi;
    let match;

    while ((match = thRegex.exec(this.content)) !== null) {
      const header = match[1].trim();
      const isSortable = /data-sort|asp-sort/i.test(match[0]);

      columns.push({
        fieldName: this.inferFieldName(header),
        header,
        isSortable,
        isLink: false,
      });
    }

    // Extract <td> with DisplayFor
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let colIndex = 0;

    while ((match = tdRegex.exec(this.content)) !== null) {
      const cell = match[1];
      const displayMatch = cell.match(/DisplayFor\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/);

      if (displayMatch && columns[colIndex]) {
        columns[colIndex].fieldName = displayMatch[1];
      }

      const linkMatch = cell.match(/<a[^>]*href/i);
      if (linkMatch && columns[colIndex]) {
        columns[colIndex].isLink = true;
      }

      colIndex = (colIndex + 1) % columns.length;
    }

    return columns;
  }

  /**
   * Infer field name from header
   */
  private inferFieldName(header: string): string {
    return header
      .replace(/\s+/g, '')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * Extract data source from foreach
   */
  private extractDataSource(): string {
    const foreachMatch = this.content.match(/@foreach\s*\(\s*var\s+(\w+)\s+in\s+Model\.?(\w*)/i);
    if (foreachMatch) {
      return foreachMatch[2] || 'Items';
    }

    const modelMatch = this.content.match(/@foreach\s*\(\s*var\s+\w+\s+in\s+Model/i);
    if (modelMatch) return 'Model';

    return 'Items';
  }

  /**
   * Extract list actions
   */
  private extractListActions(): ListAction[] {
    const actions: ListAction[] = [];

    // Look for action links
    const actionLinkRegex = /@Html\.ActionLink\s*\(\s*"([^"]+)"\s*,\s*"(\w+)"\s*,\s*"(\w+)"/gi;
    let match;

    while ((match = actionLinkRegex.exec(this.content)) !== null) {
      const [, label, action, controller] = match;

      actions.push({
        type: this.mapActionToType(action),
        label,
        controller,
        action,
        cssClass: this.extractClass(match[0]),
      });
    }

    // Look for anchor tags with asp-action
    const anchorRegex = /<a[^>]*asp-action="(\w+)"[^>]*asp-controller="(\w+)"[^>]*>([^<]+)<\/a>/gi;
    while ((match = anchorRegex.exec(this.content)) !== null) {
      const [, action, controller, label] = match;

      actions.push({
        type: this.mapActionToType(action),
        label: label.trim(),
        controller,
        action,
      });
    }

    return actions;
  }

  /**
   * Map action name to type
   */
  private mapActionToType(action: string): ListAction['type'] {
    const actionMap: Record<string, ListAction['type']> = {
      'Create': 'create',
      'Edit': 'edit',
      'Delete': 'delete',
      'Details': 'details',
      'Index': 'list',
    };

    return actionMap[action] || 'custom';
  }

  /**
   * Extract empty message
   */
  private extractEmptyMessage(): string | undefined {
    const emptyMatch = this.content.match(/No\s+(?:records|items|data)\s+found|empty[^.]*\./i);
    return emptyMatch ? emptyMatch[0] : undefined;
  }

  /**
   * Extract sections from CSHTML
   */
  private extractSections(): ViewSection[] {
    const sections: ViewSection[] = [];

    // Look for fieldset or div with role="group"
    const sectionRegex = /<(?:fieldset|div)[^>]*>([\s\S]*?)<\/(?:fieldset|div)>/gi;
    let match;
    let sectionId = 1;

    while ((match = sectionRegex.exec(this.content)) !== null) {
      const sectionContent = match[1];

      // Check if it has a legend or title
      const titleMatch = sectionContent.match(/<legend[^>]*>([^<]+)<\/legend>/);

      if (titleMatch) {
        sections.push({
          id: `section-${sectionId++}`,
          title: titleMatch[1],
          fields: this.extractFieldNames(sectionContent),
          isCollapsible: /collapse|accordion/i.test(match[0]),
        });
      }
    }

    return sections;
  }

  /**
   * Extract field names from content
   */
  private extractFieldNames(content: string): string[] {
    const names: string[] = [];
    const aspForRegex = /asp-for="([^"]+)"/gi;
    let match;

    while ((match = aspForRegex.exec(content)) !== null) {
      names.push(match[1]);
    }

    return Array.from(new Set(names));
  }

  /**
   * Extract scripts
   */
  private extractScripts(): string[] {
    const scripts: string[] = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(this.content)) !== null) {
      scripts.push(match[1].trim());
    }

    return scripts;
  }

  /**
   * Extract styles
   */
  private extractStyles(): string[] {
    const styles: string[] = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;

    while ((match = styleRegex.exec(this.content)) !== null) {
      styles.push(match[1].trim());
    }

    return styles;
  }

  /**
   * Extract permissions from content
   */
  private extractPermissions(): PermissionRequirement[] {
    const permissions: PermissionRequirement[] = [];

    // Look for role checks
    const roleRegex = /User\.IsInRole\s*\(\s*"([^"]+)"\)/gi;
    let match;

    while ((match = roleRegex.exec(this.content)) !== null) {
      permissions.push({
        type: 'role',
        value: match[1],
        action: 'show',
      });
    }

    // Look for authorization attributes
    const authRegex = /\[Authorize\s*\(\s*Roles\s*=\s*"([^"]+)"\s*\)\]/gi;
    while ((match = authRegex.exec(this.content)) !== null) {
      const roles = match[1].split(',').map(r => r.trim());
      roles.forEach(role => {
        permissions.push({
          type: 'role',
          value: role,
          action: 'show',
        });
      });
    }

    return Array.from(new Map(permissions.map(p => [p.value, p])).values());
  }

  /**
   * Format label from field name
   */
  private formatLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // ============================================================================
  // ENHANCED EXTRACTION METHODS
  // ============================================================================

  /**
   * Extract form information from Html.BeginForm
   */
  private extractFormInfo(): FormInfo | undefined {
    // Pattern: Html.BeginForm("Action", "Controller", FormMethod.Post, ...)
    const beginFormMatch = this.content.match(
      /Html\.BeginForm\s*\(\s*"(\w+)"\s*,\s*"(\w+)"\s*(?:,\s*FormMethod\.(\w+))?\s*(?:,\s*new\s*\{[^}]*id\s*=\s*"([^"]+)"[^}]*\})?/i
    );
    
    if (beginFormMatch) {
      const [, action, controller, method, id] = beginFormMatch;
      const isMultipart = /enctype\s*=\s*"multipart\/form-data"/i.test(this.content);
      
      return {
        id: id || `${controller}Form`,
        action,
        controller,
        method: (method as 'GET' | 'POST') || 'POST',
        isMultipart,
      };
    }

    // Pattern: <form action="..." method="...">
    const formTagMatch = this.content.match(/<form[^>]*action="([^"]*)"[^>]*method="(\w+)"[^>]*>/i);
    if (formTagMatch) {
      const [, action, method] = formTagMatch;
      const idMatch = this.content.match(/<form[^>]*id="([^"]+)"[^>]*>/i);
      const isMultipart = /enctype\s*=\s*"multipart\/form-data"/i.test(this.content);
      
      return {
        id: idMatch ? idMatch[1] : 'form',
        action,
        controller: action.split('/')[0] || '',
        method: method as 'GET' | 'POST',
        isMultipart,
      };
    }

    return undefined;
  }

  /**
   * Extract JavaScript validation rules (jQuery validate pattern)
   */
  private extractJavaScriptValidations(): JavaScriptValidation[] {
    const validations: JavaScriptValidation[] = [];
    
    // Extract all script content
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    let allScriptContent = '';
    
    while ((scriptMatch = scriptRegex.exec(this.content)) !== null) {
      allScriptContent += scriptMatch[1] + '\n';
    }

    if (!allScriptContent) return validations;

    // Pattern 1: jQuery validate rules object
    // $("#formId").validate({ rules: { fieldName: { required: true, ... } } })
    const rulesMatch = allScriptContent.match(/rules\s*:\s*\{([\s\S]*?)\}/);
    if (rulesMatch) {
      const rulesBlock = rulesMatch[1];
      
      // Parse each field's rules
      // Pattern: fieldName: { required: true, minlength: 5, ... }
      const fieldRuleRegex = /['"]?([a-zA-Z_][a-zA-Z0-9_.]*)['"]?\s*:\s*\{([^}]+)\}/g;
      let fieldMatch;
      
      while ((fieldMatch = fieldRuleRegex.exec(rulesBlock)) !== null) {
        const fieldName = fieldMatch[1];
        const rulesContent = fieldMatch[2];
        
        const jsValidation: JavaScriptValidation = {
          fieldName,
          rules: {},
        };

        // Extract individual rules
        if (/required\s*:\s*true/i.test(rulesContent)) {
          jsValidation.rules.required = true;
        }
        if (/email\s*:\s*true/i.test(rulesContent)) {
          jsValidation.rules.email = true;
        }
        if (/url\s*:\s*true/i.test(rulesContent)) {
          jsValidation.rules.url = true;
        }
        if (/date\s*:\s*true/i.test(rulesContent)) {
          jsValidation.rules.date = true;
        }
        if (/number\s*:\s*true/i.test(rulesContent)) {
          jsValidation.rules.number = true;
        }
        if (/digits\s*:\s*true/i.test(rulesContent)) {
          jsValidation.rules.digits = true;
        }
        
        const minlengthMatch = rulesContent.match(/minlength\s*:\s*(\d+)/i);
        if (minlengthMatch) {
          jsValidation.rules.minlength = parseInt(minlengthMatch[1]);
        }
        
        const maxlengthMatch = rulesContent.match(/maxlength\s*:\s*(\d+)/i);
        if (maxlengthMatch) {
          jsValidation.rules.maxlength = parseInt(maxlengthMatch[1]);
        }
        
        const minMatch = rulesContent.match(/min\s*:\s*(\d+)/i);
        if (minMatch) {
          jsValidation.rules.min = parseInt(minMatch[1]);
        }
        
        const maxMatch = rulesContent.match(/max\s*:\s*(\d+)/i);
        if (maxMatch) {
          jsValidation.rules.max = parseInt(maxMatch[1]);
        }
        
        const patternMatch = rulesContent.match(/pattern\s*:\s*['"]([^'"]+)['"]/i);
        if (patternMatch) {
          jsValidation.rules.pattern = patternMatch[1];
        }
        
        const equalToMatch = rulesContent.match(/equalTo\s*:\s*['"]([^'"]+)['"]/i);
        if (equalToMatch) {
          jsValidation.rules.equalTo = equalToMatch[1];
        }

        validations.push(jsValidation);
      }
    }

    return validations;
  }

  /**
   * Extract cascading dropdown configurations
   */
  private extractCascadingDropdowns(): CascadingDropdown[] {
    const cascades: CascadingDropdown[] = [];
    
    // Extract all script content
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    let allScriptContent = '';
    
    while ((scriptMatch = scriptRegex.exec(this.content)) !== null) {
      allScriptContent += scriptMatch[1] + '\n';
    }

    if (!allScriptContent) return cascades;

    // Pattern: $("#ParentId").change(function() { ... load ChildId ... })
    // Look for Select2/AJAX cascade patterns
    const changeHandlerRegex = /\$\(["']#(\w+)["']\)\.(?:change|on\s*\(\s*['"]change['"])/g;
    let changeMatch;

    while ((changeMatch = changeHandlerRegex.exec(allScriptContent)) !== null) {
      const parentField = changeMatch[1];
      
      // Find the AJAX call inside this change handler
      const handlerStart = changeMatch.index;
      const nextHandler = allScriptContent.indexOf('$(', handlerStart + 1);
      const handlerEnd = nextHandler === -1 ? allScriptContent.length : nextHandler;
      const handlerContent = allScriptContent.substring(handlerStart, handlerEnd);

      // Look for target selector
      const targetMatch = handlerContent.match(/TargetSelector\s*:\s*['"]#(\w+)['"]/i);
      if (targetMatch) {
        const childField = targetMatch[1];
        
        // Look for URL/endpoint
        const urlMatch = handlerContent.match(/URL\s*:\s*['"]([^'"]+)['"]/i);
        const ajaxUrl = urlMatch ? urlMatch[1] : '';
        
        // Look for source parameter name
        const sourceMatch = handlerContent.match(/SourceName\s*:\s*['"](\w+)['"]/i);
        const sourceParam = sourceMatch ? sourceMatch[1] : 'id';

        // Look for text/value fields
        const textFieldMatch = handlerContent.match(/ReturnFieldNameText\s*:\s*['"](\w+)['"]/i);
        const valueFieldMatch = handlerContent.match(/ReturnFieldNameId\s*:\s*['"](\w+)['"]/i);

        cascades.push({
          parentField,
          childField,
          ajaxEndpoint: ajaxUrl,
          sourceParam,
          textField: textFieldMatch ? textFieldMatch[1] : 'Name',
          valueField: valueFieldMatch ? valueFieldMatch[1] : 'Id',
        });
      }
    }

    // Also look for simpler AJAX cascade patterns
    const ajaxCascadeRegex = /url\s*:\s*['"]([^'"]+)['"][^}]*data\s*:\s*\{[^}]*([a-zA-Z_]+)\s*:/gi;
    let ajaxMatch;
    while ((ajaxMatch = ajaxCascadeRegex.exec(allScriptContent)) !== null) {
      const url = ajaxMatch[1];
      // Check if this URL is already captured
      if (!cascades.some(c => c.ajaxEndpoint === url)) {
        // Try to infer parent/child from surrounding context
        const contextStart = Math.max(0, ajaxMatch.index - 200);
        const context = allScriptContent.substring(contextStart, ajaxMatch.index);
        const parentMatch = context.match(/\$\(["']#(\w+)["']\)/);
        if (parentMatch) {
          // This is a potential cascade, but we don't have complete info
          // Skip for now as the structured pattern above captures most cases
        }
      }
    }

    return cascades;
  }

  /**
   * Extract AJAX endpoints from scripts
   */
  private extractAjaxEndpoints(): AjaxEndpoint[] {
    const endpoints: AjaxEndpoint[] = [];
    const seen = new Set<string>();

    // Extract all script content
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    let allScriptContent = '';
    
    while ((scriptMatch = scriptRegex.exec(this.content)) !== null) {
      allScriptContent += scriptMatch[1] + '\n';
    }

    // Helper to extract URL and method from an ajax block
    const extractAjaxDetails = (block: string): { url: string; method: string; isFormData: boolean } | null => {
      const urlMatch = block.match(/url\s*:\s*['"`]([^'"`]+)['"`]/i);
      if (!urlMatch) return null;
      
      const typeMatch = block.match(/type\s*:\s*['"`](\w+)['"`]/i);
      const method = typeMatch ? typeMatch[1].toUpperCase() : 'GET';
      const isFormData = /FormData|contentType\s*:\s*false/i.test(block);
      
      return { url: urlMatch[1], method, isFormData };
    };

    // Pattern 1: $.ajax({ ... }) and jQuery.ajax({ ... }) - with nested brace handling
    // We need to properly match the ajax object including nested braces
    const ajaxPatterns = [
      /\$\s*\.\s*ajax\s*\(\s*\{/gi,           // $.ajax({
      /jQuery\s*\.\s*ajax\s*\(\s*\{/gi,       // jQuery.ajax({
    ];
    
    for (const pattern of ajaxPatterns) {
      let match;
      while ((match = pattern.exec(allScriptContent)) !== null) {
        // Find the matching closing brace by counting braces
        const startIndex = match.index + match[0].length;
        let braceCount = 1;
        let endIndex = startIndex;
        
        while (braceCount > 0 && endIndex < allScriptContent.length) {
          const char = allScriptContent[endIndex];
          if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
          endIndex++;
        }
        
        // Extract the full ajax block content
        const ajaxBlock = allScriptContent.substring(match.index, endIndex);
        const details = extractAjaxDetails(ajaxBlock);
        
        if (details && !seen.has(details.url)) {
          seen.add(details.url);
          endpoints.push({
            url: details.url,
            method: details.method as AjaxEndpoint['method'],
            context: pattern.source.includes('jQuery') ? 'jQuery.ajax' : '$.ajax',
            isFormData: details.isFormData,
          });
        }
      }
    }

    // Pattern 2: jQuery.post("/Controller/Action", ...) and $.post(...)
    const postRegex = /(?:jQuery|\$)\s*\.\s*(?:post|get)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let postMatch;
    
    while ((postMatch = postRegex.exec(allScriptContent)) !== null) {
      const url = postMatch[1];
      if (!seen.has(url)) {
        seen.add(url);
        const isPost = /\.post\s*\(/i.test(postMatch[0]);
        endpoints.push({
          url,
          method: isPost ? 'POST' : 'GET',
          context: isPost ? 'jQuery.post' : 'jQuery.get',
        });
      }
    }

    // Pattern 3: fetch("/api/endpoint", { method: "POST", ... })
    const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let fetchMatch;
    
    while ((fetchMatch = fetchRegex.exec(allScriptContent)) !== null) {
      const url = fetchMatch[1];
      if (!seen.has(url)) {
        seen.add(url);
        endpoints.push({
          url,
          method: 'GET', // Default, actual method would be in options
          context: 'fetch',
        });
      }
    }

    // Pattern 4: DataTable ajax configuration: ajax: { url: "/Controller/Action", type: "POST" }
    const dataTableAjaxRegex = /['"]ajax['"]\s*:\s*\{([^}]+)\}/gi;
    let dtMatch;
    while ((dtMatch = dataTableAjaxRegex.exec(allScriptContent)) !== null) {
      const block = dtMatch[1];
      const urlMatch = block.match(/['"]url['"]\s*:\s*['"`]([^'"`]+)['"`]/i);
      const typeMatch = block.match(/['"]type['"]\s*:\s*['"`](\w+)['"`]/i);
      
      if (urlMatch && !seen.has(urlMatch[1])) {
        seen.add(urlMatch[1]);
        endpoints.push({
          url: urlMatch[1],
          method: (typeMatch ? typeMatch[1].toUpperCase() : 'GET') as AjaxEndpoint['method'],
          context: 'DataTables.ajax',
        });
      }
    }

    // Pattern 5: url: "/Controller/Action" patterns (for form submits, etc.)
    const urlPatternRegex = /url\s*:\s*['"`]([^'"`]+\/\w+\/\w+\/?)['"`]/gi;
    let urlMatch;
    while ((urlMatch = urlPatternRegex.exec(allScriptContent)) !== null) {
      const url = urlMatch[1];
      if (!seen.has(url)) {
        seen.add(url);
        endpoints.push({
          url,
          method: 'POST',
          context: 'ajax-url',
          isFormData: true,
        });
      }
    }

    // Pattern 6: Load methods - .load("/Controller/Action")
    const loadRegex = /\.\s*load\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let loadMatch;
    while ((loadMatch = loadRegex.exec(allScriptContent)) !== null) {
      const url = loadMatch[1];
      if (!seen.has(url)) {
        seen.add(url);
        endpoints.push({
          url,
          method: 'GET',
          context: 'jQuery.load',
        });
      }
    }

    return endpoints;
  }

  /**
   * Merge JavaScript validations with field definitions
   */
  private mergeValidationsFromJS(
    fields: ParsedFormField[],
    jsValidations: JavaScriptValidation[]
  ): ParsedFormField[] {
    if (!jsValidations || jsValidations.length === 0) return fields;

    const validationMap = new Map<string, JavaScriptValidation>();
    jsValidations.forEach(v => validationMap.set(v.fieldName, v));

    return fields.map(field => {
      // Try exact match first, then try without nested prefix
      let jsVal = validationMap.get(field.name);
      
      if (!jsVal) {
        // Try matching "User.firstname" pattern
        validationMap.forEach((val, key) => {
          if (field.name === key || field.name.endsWith('.' + key) || key.endsWith('.' + field.name)) {
            jsVal = val;
          }
        });
      }

      if (!jsVal) return field;

      // Merge validations
      const mergedValidations: FieldValidation[] = [...field.validation];
      
      if (jsVal.rules.required && !mergedValidations.some(v => v.type === 'required')) {
        mergedValidations.push({ type: 'required', message: 'This field is required' });
      }
      
      if (jsVal.rules.email && !mergedValidations.some(v => v.type === 'email')) {
        mergedValidations.push({ type: 'email' });
      }
      
      if (jsVal.rules.minlength && !mergedValidations.some(v => v.type === 'min_length')) {
        mergedValidations.push({ type: 'min_length', value: jsVal.rules.minlength });
      }
      
      if (jsVal.rules.maxlength && !mergedValidations.some(v => v.type === 'max_length')) {
        mergedValidations.push({ type: 'max_length', value: jsVal.rules.maxlength });
      }
      
      if (jsVal.rules.pattern && !mergedValidations.some(v => v.type === 'pattern')) {
        mergedValidations.push({ type: 'pattern', value: jsVal.rules.pattern });
      }

      return {
        ...field,
        isRequired: field.isRequired || jsVal.rules.required === true,
        validation: mergedValidations,
      };
    });
  }

  /**
   * Generate React Blueprint
   */
  generateReactBlueprint(parsed: ParsedCSHTMLView): ReactBlueprint {
    const componentName = this.toPascalCase(parsed.viewName);
    const layout = this.determineLayout(parsed);

    const fields: ReactFieldBlueprint[] = parsed.fields.map(f => ({
      name: f.name,
      label: f.label,
      type: f.inputType,
      required: f.isRequired,
      readOnly: f.isReadOnly,
      placeholder: f.placeholder,
      validation: f.validation,
      colSpan: f.colSpan,
      permission: f.permission,
    }));

    const list: ReactListBlueprint | undefined = parsed.list ? {
      columns: parsed.list.columns.map(c => ({
        field: c.fieldName,
        header: c.header,
        sortable: c.isSortable,
      })),
      actions: parsed.list.actions.map(a => ({
        type: a.type,
        label: a.label,
        path: `/${a.controller}/${a.action}`,
      })),
      hasPagination: parsed.list.hasPagination,
      hasSearch: parsed.list.hasSearch,
      hasSorting: parsed.list.hasSorting,
    } : undefined;

    const imports = this.generateImports(parsed, list !== undefined);
    const hooks = this.generateHooks(parsed);
    const suggestedPath = this.suggestRoute(parsed);

    return {
      componentName,
      viewType: parsed.viewType,
      tableName: parsed.model?.linkedTable,
      fields,
      list,
      imports,
      hooks,
      permissions: parsed.permissions,
      layout,
      suggestedPath,
    };
  }

  /**
   * Determine layout from parsed content
   */
  private determineLayout(parsed: ParsedCSHTMLView): ReactBlueprint['layout'] {
    const hasTwoColumn = parsed.fields.some(f => f.colSpan <= 6);
    const hasThreeColumn = parsed.fields.some(f => f.colSpan <= 4);
    const hasSections = parsed.sections.length > 1;

    if (hasSections) return 'tabs';
    if (hasThreeColumn) return 'three_column';
    if (hasTwoColumn) return 'two_column';
    return 'single_column';
  }

  /**
   * Generate import statements
   */
  private generateImports(parsed: ParsedCSHTMLView, hasList: boolean): string[] {
    const imports: string[] = [
      'import React from \'react\'',
      'import { useForm } from \'react-hook-form\'',
    ];

    if (hasList) {
      imports.push('import { useTable, usePagination, useSortBy } from \'react-table\'');
    }

    if (parsed.permissions.length > 0) {
      imports.push('import { useAuth } from \'@/hooks/useAuth\'');
    }

    return imports;
  }

  /**
   * Generate hooks
   */
  private generateHooks(parsed: ParsedCSHTMLView): string[] {
    const hooks: string[] = ['const { register, handleSubmit, formState: { errors } } = useForm()'];

    if (parsed.permissions.length > 0) {
      hooks.push('const { hasRole } = useAuth()');
    }

    return hooks;
  }

  /**
   * Suggest route path
   */
  private suggestRoute(parsed: ParsedCSHTMLView): string {
    const tableName = parsed.model?.linkedTable || 'resource';
    const viewType = parsed.viewType;

    switch (viewType) {
      case 'list':
        return `/${tableName.toLowerCase()}`;
      case 'form':
        return `/${tableName.toLowerCase()}/new`;
      case 'details':
        return `/${tableName.toLowerCase()}/:id`;
      default:
        return `/${tableName.toLowerCase()}`;
    }
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toUpperCase());
  }

  // ============================================================================
  // ADVANCED INTELLIGENCE EXTRACTION METHODS
  // ============================================================================

  /**
   * Extract lookup tables from DropDownList helpers
   */
  private extractLookupTables(): LookupTable[] {
    const lookupTables: LookupTable[] = [];
    const seen = new Set<string>();

    // Pattern: DDLManager.GetXxxDDL() or GetXxxForDDL()
    const ddlPattern = /DDLManager\.(Get\w+DDL|Get\w+ForDDL)\s*\(\)/g;
    let match;

    while ((match = ddlPattern.exec(this.content)) !== null) {
      const methodName = match[1];
      // Convert GetOrganizationTypesDDL -> OrganizationTypes
      const tableName = methodName
        .replace(/^Get/, '')
        .replace(/DDL$/, '')
        .replace(/ForDDL$/, '');
      
      if (!seen.has(tableName)) {
        seen.add(tableName);
        lookupTables.push({
          name: tableName,
          detectedFrom: `DDLManager.${methodName}()`,
          endpoint: `/api/lookup/${tableName.toLowerCase()}`,
          inferredColumns: ['Id', 'Name'],
        });
      }
    }

    // Pattern: @Html.DropDownList("Field", ViewBag.XXX)
    const viewBagPattern = /ViewBag\.(\w+)\s*(?:,|\))/g;
    while ((match = viewBagPattern.exec(this.content)) !== null) {
      const tableName = match[1];
      if (!seen.has(tableName) && !tableName.endsWith('Title') && !tableName.endsWith('Message')) {
        seen.add(tableName);
        lookupTables.push({
          name: tableName,
          detectedFrom: `ViewBag.${tableName}`,
          endpoint: `/api/lookup/${tableName.toLowerCase()}`,
          inferredColumns: ['Id', 'Name'],
        });
      }
    }

    return lookupTables;
  }

  /**
   * Extract schema intelligence from fields
   */
  private extractSchemaIntelligence(
    fields: ParsedFormField[],
    formInfo: FormInfo | undefined,
    lookupTables: LookupTable[]
  ): SchemaIntelligence {
    const tableName = this.extractViewName() || 'Unknown';
    
    // Map fields to columns
    const columns: InferredColumn[] = fields.map(field => {
      const inferredType = this.inferColumnType(field);
      const constraints: string[] = [];
      
      if (field.isRequired) constraints.push('NOT NULL');
      if (field.inputType === 'dropdown') constraints.push(`FK → ${field.name.replace(/Id$/, '')}`);
      
      // Check for AJAX uniqueness checks
      const isUnique = this.checkFieldUniqueness(field.name);
      if (isUnique) constraints.push('UNIQUE');

      return {
        name: field.name,
        inferredType,
        constraints,
        intelligenceSource: field.inputType,
        isRequired: field.isRequired,
        isUnique,
        isFK: field.inputType === 'dropdown',
        fkTarget: field.inputType === 'dropdown' ? field.name.replace(/Id$/, '') : undefined,
        maxLength: this.extractMaxLength(field),
        minLength: this.extractMinLength(field),
      };
    });

    // Detect nested entities (fields with dot notation like User.firstname)
    const nestedEntities = this.detectNestedEntities(fields);

    const primaryTable: InferredTable = {
      name: this.pluralize(tableName),
      inferredFrom: 'Form fields and model',
      columns,
      confidence: 0.85,
    };

    return {
      primaryTable,
      nestedTables: nestedEntities,
      relationships: nestedEntities.map(nested => ({
        parentTable: primaryTable.name,
        childTable: nested.name,
        foreignKey: `${tableName}Id`,
        relationshipType: 'one-to-many' as const,
      })),
      indexes: columns
        .filter(c => c.isUnique)
        .map(c => ({
          tableName: primaryTable.name,
          columns: [c.name],
          isUnique: true,
          inferredFrom: 'AJAX uniqueness check',
        })),
      confidence: 0.85,
    };
  }

  private inferColumnType(field: ParsedFormField): string {
    const baseName = field.name.toLowerCase();
    
    if (field.inputType === 'checkbox') return 'BIT';
    if (field.inputType === 'date_picker') return 'DATE';
    if (field.inputType === 'datetime_picker') return 'DATETIME';
    if (field.inputType === 'dropdown') return 'INT';
    if (field.inputType === 'file_upload') return 'NVARCHAR(255)';
    if (field.inputType === 'number_input') return 'DECIMAL(18,2)';
    if (field.inputType === 'password_input') return 'NVARCHAR(255)';
    if (field.inputType === 'textarea') return 'NVARCHAR(MAX)';
    if (field.inputType === 'email_input') return 'NVARCHAR(100)';
    
    // Infer from field name patterns
    if (baseName.includes('id') && !baseName.includes('guid')) return 'INT';
    if (baseName.includes('guid') || baseName.includes('uuid')) return 'UNIQUEIDENTIFIER';
    if (baseName.includes('amount') || baseName.includes('price') || baseName.includes('total')) return 'DECIMAL(18,2)';
    if (baseName.includes('date') || baseName.includes('time')) return 'DATETIME';
    if (baseName.includes('phone') || baseName.includes('tel') || baseName.includes('cell')) return 'NVARCHAR(20)';
    if (baseName.includes('email')) return 'NVARCHAR(100)';
    if (baseName.includes('code')) return 'NVARCHAR(50)';
    if (baseName.includes('name')) return 'NVARCHAR(100)';
    if (baseName.includes('description') || baseName.includes('note') || baseName.includes('address')) return 'NVARCHAR(MAX)';
    
    // Use maxlength from validation
    const maxLen = this.extractMaxLength(field);
    if (maxLen) return `NVARCHAR(${maxLen})`;
    
    return 'NVARCHAR(255)';
  }

  private extractMaxLength(field: ParsedFormField): number | undefined {
    const maxValidation = field.validation.find(v => v.type === 'max_length');
    return maxValidation ? maxValidation.value as number : undefined;
  }

  private extractMinLength(field: ParsedFormField): number | undefined {
    const minValidation = field.validation.find(v => v.type === 'min_length');
    return minValidation ? minValidation.value as number : undefined;
  }

  private checkFieldUniqueness(fieldName: string): boolean {
    // Check if there's an AJAX uniqueness check for this field
    const uniqueCheckPattern = new RegExp(
      `Check\\w*${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}.*Availabilit`,
      'i'
    );
    return uniqueCheckPattern.test(this.content);
  }

  private detectNestedEntities(fields: ParsedFormField[]): InferredTable[] {
    const nestedMap = new Map<string, InferredColumn[]>();
    
    fields.forEach(field => {
      if (field.name.includes('.')) {
        const [entity, column] = field.name.split('.');
        if (!nestedMap.has(entity)) {
          nestedMap.set(entity, []);
        }
        nestedMap.get(entity)!.push({
          name: column,
          inferredType: this.inferColumnType(field),
          constraints: field.isRequired ? ['NOT NULL'] : [],
          intelligenceSource: field.inputType,
          isRequired: field.isRequired,
          isUnique: false,
          isFK: false,
        });
      }
    });

    return Array.from(nestedMap.entries()).map(([name, columns]) => ({
      name: this.pluralize(name),
      inferredFrom: 'Nested form fields',
      columns,
      confidence: 0.75,
    }));
  }

  /**
   * Extract security analysis
   */
  private extractSecurityAnalysis(fields: ParsedFormField[], scripts: string[]): SecurityAnalysis {
    const risks: SecurityRisk[] = [];
    const piiFields: PIIField[] = [];
    
    // Check for password fields
    const hasPasswordFields = fields.some(f => f.inputType === 'password_input');
    if (hasPasswordFields) {
      risks.push({
        id: 'SEC-001',
        category: 'critical',
        description: 'Password field detected. Ensure passwords are hashed before storage.',
        location: 'Form fields',
        recommendation: 'Implement password hashing (bcrypt, Argon2) on backend.',
        owaspCategory: 'A02:2021 - Cryptographic Failures',
      });
    }

    // Check for CSRF protection
    const hasCSRFProtection = /AntiForgeryToken|__RequestVerificationToken/i.test(this.content);
    if (!hasCSRFProtection) {
      risks.push({
        id: 'SEC-002',
        category: 'critical',
        description: 'No CSRF protection detected. Form is vulnerable to Cross-Site Request Forgery attacks.',
        location: 'Form element',
        recommendation: 'Add @Html.AntiForgeryToken() to form.',
        owaspCategory: 'A01:2021 - Broken Access Control',
      });
    }

    // Check for file upload
    const hasFileUpload = fields.some(f => f.inputType === 'file_upload');
    if (hasFileUpload) {
      risks.push({
        id: 'SEC-003',
        category: 'high',
        description: 'File upload detected. Ensure proper validation and storage.',
        location: 'Form fields',
        recommendation: 'Validate file types, scan for malware, use secure storage.',
        owaspCategory: 'A04:2021 - Insecure Design',
      });
    }

    // Detect PII fields
    fields.forEach(field => {
      const lowerName = field.name.toLowerCase();
      
      if (lowerName.includes('email')) {
        piiFields.push({
          fieldName: field.name,
          piiType: 'email',
          sensitivity: 'high',
          complianceFlags: ['GDPR', 'CCPA'],
        });
      } else if (lowerName.includes('phone') || lowerName.includes('tel') || lowerName.includes('cell') || lowerName.includes('uan')) {
        piiFields.push({
          fieldName: field.name,
          piiType: 'phone',
          sensitivity: 'medium',
          complianceFlags: ['GDPR'],
        });
      } else if (lowerName.includes('dob') || lowerName.includes('birthdate') || lowerName.includes('dateofbirth')) {
        piiFields.push({
          fieldName: field.name,
          piiType: 'dob',
          sensitivity: 'high',
          complianceFlags: ['GDPR', 'HIPAA'],
        });
      } else if (lowerName.includes('address')) {
        piiFields.push({
          fieldName: field.name,
          piiType: 'address',
          sensitivity: 'medium',
          complianceFlags: ['GDPR'],
        });
      } else if (lowerName.includes('ssn') || lowerName.includes('social')) {
        piiFields.push({
          fieldName: field.name,
          piiType: 'ssn',
          sensitivity: 'high',
          complianceFlags: ['GDPR', 'HIPAA', 'PCI-DSS'],
        });
      }
    });

    // Check for XSS risks
    const xssRisks: string[] = [];
    if (/@Model\.\w+[^.]/.test(this.content)) {
      xssRisks.push('Direct model output detected. Ensure proper HTML encoding.');
    }

    return {
      risks,
      piiFields,
      hasCSRFProtection,
      hasPasswordFields,
      hasFileUpload,
      httpsRequired: hasPasswordFields || piiFields.length > 0,
      xssRisks,
    };
  }

  /**
   * Extract RBAC permissions
   */
  private extractRBACPermissions(): RBACPermissions {
    const permissions: RBACPermission[] = [];
    const missingPermissions: string[] = [];

    // Check for CanAdd, CanView, CanUpdate, CanDelete patterns
    const permissionPatterns = [
      { name: 'CanAdd', modelProperty: 'Model.CanAdd' },
      { name: 'CanView', modelProperty: 'Model.CanView' },
      { name: 'CanUpdate', modelProperty: 'Model.CanUpdate' },
      { name: 'CanDelete', modelProperty: 'Model.CanDelete' },
    ];

    permissionPatterns.forEach(perm => {
      const pattern = new RegExp(`@if\\s*\\(\\s*${perm.modelProperty}\\s*\\)`, 'i');
      if (pattern.test(this.content)) {
        permissions.push({
          name: perm.name,
          modelProperty: perm.modelProperty,
          detectedIn: 'Razor conditional',
          isActive: true,
        });
      } else {
        missingPermissions.push(perm.name);
      }
    });

    return {
      permissions,
      canAdd: permissions.some(p => p.name === 'CanAdd'),
      canView: permissions.some(p => p.name === 'CanView'),
      canUpdate: permissions.some(p => p.name === 'CanUpdate'),
      canDelete: permissions.some(p => p.name === 'CanDelete'),
      missingPermissions,
    };
  }

  /**
   * Extract error codes from JavaScript
   */
  private extractErrorCodes(): ErrorCodeMapping[] {
    const errorCodes: ErrorCodeMapping[] = [];
    
    // Look for error code patterns in scripts
    const errorCodePattern = /data\.id\s*==\s*(-?\d+)|data\s*==\s*(-?\d+)|result\s*==\s*(-?\d+)/g;
    let match;

    while ((match = errorCodePattern.exec(this.content)) !== null) {
      const code = parseInt(match[1] || match[2] || match[3]);
      if (!isNaN(code) && code < 0) {
        errorCodes.push({
          code,
          inferredMeaning: this.inferErrorCodeMeaning(code),
          context: 'JavaScript response handling',
        });
      }
    }

    return errorCodes;
  }

  private inferErrorCodeMeaning(code: number): string {
    const meanings: Record<number, string> = {
      '-1': 'General error / Duplicate entry',
      '-2': 'Validation failed',
      '-3': 'Unauthorized / Permission denied',
      '-4': 'Not found / Invalid reference',
      '-5': 'Business rule violation',
    };
    return meanings[code.toString()] || 'Unknown error';
  }

  /**
   * Extract component mapping
   */
  private extractComponentMap(): ComponentMapping[] {
    const components: ComponentMapping[] = [];

    // DataTables
    if (/DataTable|dataTables/i.test(this.content)) {
      components.push({
        name: 'DataTable',
        type: 'Grid',
        library: 'DataTables',
        configuration: { serverSide: false },
      });
    }

    // Select2
    if (/select2|selectpicker/i.test(this.content)) {
      components.push({
        name: 'Select2',
        type: 'Dropdown',
        library: 'Select2',
        configuration: { ajax: true },
      });
    }

    // Datepicker
    if (/datepicker|datetimepicker/i.test(this.content)) {
      components.push({
        name: 'DatePicker',
        type: 'Input',
        library: 'Bootstrap Datepicker',
        configuration: { format: 'DD/MM/YYYY' },
      });
    }

    // Input Mask
    if (/mask|inputmask/i.test(this.content)) {
      components.push({
        name: 'InputMask',
        type: 'Input',
        library: 'jQuery Mask',
        configuration: {},
      });
    }

    // Bootstrap Modal
    if (/modal|#\w+Modal/i.test(this.content)) {
      components.push({
        name: 'Modal',
        type: 'Dialog',
        library: 'Bootstrap',
        configuration: {},
      });
    }

    return components;
  }

  /**
   * Generate gap analysis
   */
  private generateGapAnalysis(
    schemaIntelligence: SchemaIntelligence,
    securityAnalysis: SecurityAnalysis,
    rbacPermissions: RBACPermissions,
    formInfo: FormInfo | undefined
  ): GapAnalysisResult {
    const gaps: GapItem[] = [];
    let completeness = 0.6; // Base completeness from CSHTML

    // Database gaps
    gaps.push({
      id: 'DB-01',
      category: 'database',
      description: 'Exact data types need verification from SQL DDL',
      severity: 'medium',
      resolution: 'Upload SQL DDL or Entity Framework context file',
      resolutionAgent: 'SchemaExtractorAgent',
    });

    gaps.push({
      id: 'DB-02',
      category: 'database',
      description: 'Foreign key constraints need verification',
      severity: 'high',
      resolution: 'Analyze database schema or EF model relationships',
      resolutionAgent: 'SchemaExtractorAgent',
    });

    // Backend gaps
    if (formInfo) {
      const hasNestedEntities = schemaIntelligence.nestedTables.length > 0;
      if (hasNestedEntities) {
        gaps.push({
          id: 'BE-01',
          category: 'backend',
          description: 'Transaction logic required for creating parent + nested entities',
          severity: 'critical',
          resolution: 'Verify controller uses TransactionScope or UnitOfWork pattern',
          resolutionAgent: 'ControllerAnalyzerAgent',
        });
      }
    }

    // Security gaps
    if (!securityAnalysis.hasCSRFProtection) {
      gaps.push({
        id: 'SEC-01',
        category: 'security',
        description: 'Missing CSRF protection',
        severity: 'critical',
        resolution: 'Add AntiForgeryToken to form',
        resolutionAgent: 'SecurityAuditorAgent',
      });
      completeness -= 0.1;
    }

    if (securityAnalysis.hasPasswordFields) {
      gaps.push({
        id: 'SEC-02',
        category: 'security',
        description: 'Password handling needs verification - confirm hashing is used',
        severity: 'critical',
        resolution: 'Verify password hashing in controller/service layer',
        resolutionAgent: 'SecurityAuditorAgent',
      });
    }

    // RBAC gaps
    if (!rbacPermissions.canDelete) {
      gaps.push({
        id: 'WF-01',
        category: 'workflow',
        description: 'Delete functionality not found - is deletion forbidden or using soft delete?',
        severity: 'medium',
        resolution: 'Clarify deletion requirements with business stakeholders',
        resolutionAgent: 'ControllerAnalyzerAgent',
      });
    }

    // PII compliance
    if (securityAnalysis.piiFields.length > 0) {
      gaps.push({
        id: 'CMP-01',
        category: 'compliance',
        description: `PII fields detected: ${securityAnalysis.piiFields.map(f => f.fieldName).join(', ')}. Review data handling for compliance.`,
        severity: 'high',
        resolution: 'Implement PII encryption, access controls, and audit logging',
        resolutionAgent: 'SecurityAuditorAgent',
      });
    }

    // Calculate completeness
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    completeness = Math.max(0.3, completeness - (criticalGaps * 0.1));

    // Required files
    const requiredFiles: string[] = [];
    if (formInfo?.controller) {
      requiredFiles.push(`${formInfo.controller}Controller.cs`);
    }
    requiredFiles.push('SQL DDL or Entity Framework DbContext');

    // Recommendations
    const recommendations = [
      'Upload the corresponding Controller file to verify backend logic',
      'Upload SQL DDL or Entity Framework models for schema verification',
      'Review security implementation (CSRF, password hashing)',
    ];

    return {
      gaps,
      completeness,
      requiredFiles,
      recommendations,
    };
  }
}

/**
 * Parse multiple CSHTML files
 */
export function parseCSHTMLFiles(files: { name: string; content: string }[]): ParsedCSHTMLView[] {
  return files.map(file => {
    const parser = new CSHTMLParser(file.content, file.name);
    return parser.parse();
  });
}

/**
 * Generate React blueprints from CSHTML files
 */
export function generateReactBlueprints(files: { name: string; content: string }[]): ReactBlueprint[] {
  return files.map(file => {
    const parser = new CSHTMLParser(file.content, file.name);
    const parsed = parser.parse();
    return parser.generateReactBlueprint(parsed);
  });
}
