// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - TypeScript Types
// =============================================================================
// Master types for the unified field intelligence record system
// =============================================================================

// ─────────────────────────────────────────────
// SCHEMA LAYER TYPES
// ─────────────────────────────────────────────

export type SchemaSource = 'sql_ddl' | 'sp_inference' | 'cshtml_inference' | 'ai_inference' | 'unknown';

export interface SchemaLayer {
  dataType: string;              // "INT", "NVARCHAR(100)"
  baseType: string;              // "int", "string"
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  isComputed: boolean;
  defaultValue: string | null;
  checkConstraint: string | null;
  source: SchemaSource;
  confidence: number;            // 0.0 - 1.0
}

// ─────────────────────────────────────────────
// FK LAYER TYPES
// ─────────────────────────────────────────────

export type FKResolutionStatus = 'resolved' | 'unresolved' | 'missing_table' | 'not_fk';
export type RelationshipType = 'one_to_many' | 'many_to_many' | 'one_to_one';

export interface FKSources {
  sqlDDL: boolean;               // FK found in CREATE TABLE
  spReference: boolean;          // FK used in SP JOINs
  cshtmlDropdown: boolean;       // Field rendered as dropdown
  namingPattern: boolean;        // ends with "Id"
}

export interface FKLayer {
  isForeignKey: boolean;
  referencedTable: string | null;
  referencedColumn: string | null;
  referencedTableExists: boolean;
  relationshipType: RelationshipType | null;
  onDelete: string | null;
  onUpdate: string | null;
  resolutionStatus: FKResolutionStatus;
  lookupValues: any[] | null;    // if small lookup, cache values
  cascadeChain: string[];        // ["Country", "Province", "City"]
  sources: FKSources;
  confidence: number;
}

// ─────────────────────────────────────────────
// INTELLIGENCE LAYER TYPES
// ─────────────────────────────────────────────

export interface IntelligenceLayer {
  semanticType: string;          // "email", "phone", "name", "code", "date", "boolean_toggle"
  semanticCategory: string;      // "contact_info", "identifier", "status", "geographic"
  businessMeaning: string;       // "Organization's primary email address"
  dataPattern: string | null;    // "###-###-####" for phone
  exampleValues: string[];       // ["admin@hospital.com", "info@clinic.com"]
  suggestedLabel: string;        // "Email Address"
  suggestedPlaceholder: string;  // "Enter email address"
  suggestedHelpText: string;     // "Primary contact email for the organization"
  isSystemField: boolean;        // CreatedBy, ModifiedDate etc.
  isAuditField: boolean;         // audit trail fields
  isCalculated: boolean;         // computed/derived fields
  confidence: number;
}

// ─────────────────────────────────────────────
// UI COMPONENT LAYER TYPES
// ─────────────────────────────────────────────

export interface DropdownConfig {
  sourceType: 'static' | 'api' | 'sp' | 'enum' | null;
  sourceEndpoint: string | null;   // "/api/organization-types/dropdown"
  sourceSP: string | null;         // "SP_DDL_OrganizationTypes"
  valueField: string;              // "Id"
  displayField: string;            // "Name"
  hasSearch: boolean;              // searchable dropdown
  isMultiSelect: boolean;
  cascadeParent: string | null;    // "CountryId"
  cascadeChild: string | null;     // "ProvinceId"
  defaultText: string;             // "Select Organization Type"
}

export interface DateConfig {
  format: string;                  // "DD/MM/YYYY"
  minDate: string | null;          // "01/01/1900"
  maxDate: string | null;          // "today"
  hasTimePicker: boolean;
}

export interface FileConfig {
  accept: string;                  // "image/*"
  maxSize: number;                 // bytes
  multiple: boolean;
}

export interface FrameworkComponents {
  react: string;               // "<Input type='text' />"
  nextjs: string;              // same as react
  vue: string;                 // "<el-input />"
  angular: string;             // "<mat-input />"
}

export interface UIComponentLayer {
  componentType: string;         // "text_input", "dropdown", "datepicker", "checkbox", "file_upload"
  htmlInputType: string;         // "text", "email", "password", "number", "date", "file"
  renderAs: string;              // "TextInput", "Select", "DatePicker", "Toggle"
  framework: FrameworkComponents;
  gridWidth: string;             // "col-md-6", "col-md-4"
  labelPosition: string;         // "left", "top"
  displayOrder: number;
  groupName: string | null;      // "Organization Information", "Admin Information"
  tabName: string | null;        // if in tabs
  sectionName: string | null;    // nested section
  isHidden: boolean;             // for PK fields, system fields
  isReadOnly: boolean;           // for code fields on update
  isDisabled: boolean;
  conditionalDisplay: string | null;  // show/hide condition
  dropdownConfig: DropdownConfig | null;
  dateConfig: DateConfig | null;
  fileConfig: FileConfig | null;
  confidence: number;
  sopRulesApplied: string[];         // ["SOP-ACTION-ALIGN", "SOP-INPUT-MAX"]
}

// ─────────────────────────────────────────────
// VALIDATION LAYER TYPES
// ─────────────────────────────────────────────

export type ValidationAlignment = 'full' | 'partial' | 'mismatch' | 'unknown';
export type ValidationSourceType = 'cshtml_attribute' | 'cshtml_bootstrapvalidator' | 'cshtml_jquery_validate' | 'sp_body' | 'cshtml_remote' | 'dll_attribute' | 'sop_rule';

export interface ClientValidationRule {
  ruleType: string;               // "notEmpty", "regexp", "remote", "digits", "email"
  ruleValue: string | null;        // regexp pattern, min/max values
  errorMessage: string;
  source: ValidationSourceType;
}

export interface ServerValidationRule {
  ruleType: string;               // "unique_check", "exists_check", "format_check"
  spName: string | null;          // "SP_CheckOrganizationNameExists"
  endpoint: string | null;        // "/Organization/CheckOrganizationAvailibility"
  errorMessage: string;
  errorCode: number | null;
  source: ValidationSourceType;
}

export interface CrossFieldRule {
  ruleType: string;               // "identical", "less_than", "depends_on"
  relatedField: string;           // "User.confirmpassword"
  errorMessage: string;
}

export interface DatabaseConstraint {
  constraintType: string;         // "NOT NULL", "UNIQUE", "CHECK", "FK"
  constraintDefinition: string;
}

export interface ValidationLayer {
  isRequired: boolean;
  clientSideRules: ClientValidationRule[];
  serverSideRules: ServerValidationRule[];
  crossFieldRules: CrossFieldRule[];
  databaseConstraints: DatabaseConstraint[];
  validationAlignment: ValidationAlignment;
  missingValidations: string[];     // ["server_uniqueness_not_on_client"]
  excessiveValidations: string[];   // ["client_rule_not_in_server"]
  confidence: number;
}

// ─────────────────────────────────────────────
// COMPLIANCE LAYER TYPES
// ─────────────────────────────────────────────

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ComplianceLayer {
  sensitivityLevel: SensitivityLevel;
  isPII: boolean;                    // Personally Identifiable Information
  isPHI: boolean;                    // Protected Health Information
  isFinancial: boolean;              // Financial data
  piiCategory: string | null;        // "name", "email", "phone", "address", "dob", "national_id"
  phiCategory: string | null;        // "diagnosis", "medication", "lab_result", "vitals"
  requiresEncryption: boolean;
  requiresMasking: boolean;
  maskingPattern: string | null;     // "***-****" for phone
  retentionPolicy: string | null;    // "7 years" for medical records
  consentRequired: boolean;
  auditRequired: boolean;
  accessRestrictions: string[];      // ["role:admin", "role:privacy_officer"]
  regulatoryFrameworks: string[];    // ["HIPAA", "GDPR", "HITECH"]
  complianceNotes: string[];
  confidence: number;
}

// ─────────────────────────────────────────────
// COMPLEXITY LAYER TYPES
// ─────────────────────────────────────────────

export type MigrationRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ComplexityFactor {
  factor: string;                 // "base_column", "required_field", "fk_relationship"
  points: number;
  description: string;
}

export interface DevelopmentEstimate {
  frontend: number;               // hours
  backend: number;                // hours
  testing: number;                // hours
  total: number;
}

export interface ComplexityLayer {
  points: number;
  factors: ComplexityFactor[];
  developmentEstimate: DevelopmentEstimate;
  migrationRisk: MigrationRisk;
  migrationNotes: string[];
}

// ─────────────────────────────────────────────
// SOP LAYER TYPES
// ─────────────────────────────────────────────

export interface AppliedSOPRule {
  sopId: string;                   // "SOP-ACTION-ALIGN"
  sopName: string;                 // "Action Column Center Alignment"
  category: string;                // "alignment", "typography", "forms"
  priority: number;
  isCompliant: boolean;
  complianceNote: string;
  autoFixAvailable: boolean;
}

export interface SOPLayer {
  appliedRules: AppliedSOPRule[];
  totalApplicable: number;
  totalCompliant: number;
  compliancePercentage: number;
  violations: string[];
  autoFixable: string[];
}

// ─────────────────────────────────────────────
// CSHTML EVIDENCE LAYER TYPES
// ─────────────────────────────────────────────

export interface CSHTMLViewEvidence {
  viewName: string;
  viewPath: string;
  formName: string | null;
  htmlElementId: string | null;
  htmlElementName: string | null;
  htmlElementType: string;         // "input", "select", "textarea"
  lineNumber: number;
  contextHTML: string;             // surrounding HTML snippet
  isInCreateForm: boolean;
  isInUpdateForm: boolean;
  isInGrid: boolean;
  isInFilter: boolean;
  isInModal: boolean;
}

export interface AjaxEndpoint {
  url: string;
  method: string;
  purpose: string;                 // "remote_validation", "cascading_load", "submit"
}

export interface CSHTMLEvidenceLayer {
  foundInViews: CSHTMLViewEvidence[];
  ajaxEndpoints: AjaxEndpoint[];
  jsValidationRules: any[];
  cssClasses: string[];
  inlineStyles: string[];
  dataAttributes: Record<string, string>;
}

// ─────────────────────────────────────────────
// SP EVIDENCE LAYER TYPES
// ─────────────────────────────────────────────

export type SPUsageType = 'parameter' | 'select_column' | 'where_condition' | 'insert_column'
  | 'update_column' | 'join_column' | 'order_by' | 'group_by';
export type ParameterDirection = 'input' | 'output';

export interface SPUsageEvidence {
  spName: string;
  usage: SPUsageType;
  parameterName: string | null;
  parameterDirection: ParameterDirection | null;
}

export interface SPBusinessRuleEvidence {
  spName: string;
  ruleDescription: string;
  ruleType: string;
}

export interface SPErrorCodeEvidence {
  spName: string;
  errorCode: number;
  errorMessage: string;
  condition: string;
}

export interface SPEvidenceLayer {
  usedInSPs: SPUsageEvidence[];
  businessRulesInvolving: SPBusinessRuleEvidence[];
  errorCodesInvolving: SPErrorCodeEvidence[];
}

// ─────────────────────────────────────────────
// TEST CASE LAYER TYPES
// ─────────────────────────────────────────────

export type TestCaseType = 'positive' | 'negative' | 'boundary' | 'security' | 'compliance';
export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';

export interface FieldTestCase {
  testCaseId: string;
  title: string;
  type: TestCaseType;
  input: string;
  expectedResult: string;
  priority: TestCasePriority;
}

// ─────────────────────────────────────────────
// DOCUMENTATION LAYER TYPES
// ─────────────────────────────────────────────

export interface DataDictionaryEntry {
  definition: string;
  businessPurpose: string;
  exampleValues: string[];
  relatedFields: string[];
  changeHistory: string[];
}

export interface DocumentationLayer {
  dataDictionary: DataDictionaryEntry;
  developerNotes: string;
  userGuideText: string;
  apiDocumentation: string;
}

// ─────────────────────────────────────────────
// META LAYER TYPES
// ─────────────────────────────────────────────

export interface MetaLayer {
  createdAt: string;
  updatedAt: string;
  enrichedBy: string[];              // which agents have enriched this record
  enrichmentCompleteness: number;    // 0-100%
  lastEnrichedAt: string;
  overallConfidence: number;         // weighted average of all confidence scores
  needsReview: boolean;
  reviewNotes: string[];
  version: number;
}

// ─────────────────────────────────────────────
// MASTER UNIFIED FIELD RECORD
// ─────────────────────────────────────────────

/**
 * THE MASTER FIELD RECORD
 * Every field in the system gets ONE of these
 * ALL features enrich this SAME record
 */
export interface UnifiedFieldRecord {
  // Identity
  id: string;
  projectId: string;
  tableId: string | null;
  tableName: string;
  fieldName: string;
  qualifiedName: string;           // "Organization.CountryId"
  displayOrder: number;

  // Layers
  schema: SchemaLayer;
  foreignKey: FKLayer;
  intelligence: IntelligenceLayer;
  uiComponent: UIComponentLayer;
  validation: ValidationLayer;
  compliance: ComplianceLayer;
  complexity: ComplexityLayer;
  sop: SOPLayer;
  cshtmlEvidence: CSHTMLEvidenceLayer;
  spEvidence: SPEvidenceLayer;
  testCases: FieldTestCase[];
  documentation: DocumentationLayer;
  meta: MetaLayer;
}

// ─────────────────────────────────────────────
// SOP RULE DEFINITION TYPES
// ─────────────────────────────────────────────

export type SOPCategory = 'alignment' | 'typography' | 'forms' | 'validation' | 'reports' | 'security' | 'compliance';
export type SOPAppliesTo = 'all_fields' | 'dropdown_fields' | 'date_fields' | 'grid_columns' | 'text_inputs' | 'required_fields' | 'pii_fields';

export interface SOPRuleDefinition {
  id: string;
  projectId: string | null;         // null = global, set = project-specific
  sopId: string;                    // "SOP-ACTION-ALIGN"
  name: string;
  description: string;
  category: SOPCategory;
  priority: number;
  isActive: boolean;
  appliesTo: SOPAppliesTo;
  condition: Record<string, any>;   // JSON condition definition
  expectedValue: string | null;     // what the field should have
  autoFixAction: Record<string, any> | null;  // auto-fix definition
  sourceDocument: string | null;    // which document this SOP came from
  sourceVersion: string | null;
  isSystemDefault: boolean;
  isCustom: boolean;
}

// ─────────────────────────────────────────────
// ENRICHMENT TYPES
// ─────────────────────────────────────────────

export type EnrichmentMethod = 'pattern_match' | 'ai_inference' | 'sql_parse' | 'correlation' | 'cross_reference';
export type EnrichmentLayer = 'schema' | 'fk' | 'intelligence' | 'ui_component' | 'validation' | 'compliance' | 'complexity' | 'sop' | 'cshtml_evidence' | 'sp_evidence' | 'test_cases' | 'documentation';

export interface EnrichmentLogEntry {
  id: string;
  fieldId: string;
  projectId: string;
  agentName: string;
  layerEnriched: EnrichmentLayer;
  previousValue: any;
  newValue: any;
  confidenceBefore: number | null;
  confidenceAfter: number;
  enrichmentMethod: EnrichmentMethod;
  createdAt: Date;
}

// ─────────────────────────────────────────────
// CONSISTENCY CHECK TYPES
// ─────────────────────────────────────────────

export type ConsistencyCheckType = 
  | 'fk_table_missing' 
  | 'validation_mismatch' 
  | 'pii_no_encryption'
  | 'required_not_null_mismatch' 
  | 'cascade_chain_broken'
  | 'test_coverage_gap' 
  | 'sop_violation_unfixed';

export type ConsistencySeverity = 'error' | 'warning' | 'info';

export interface ConsistencyCheckResult {
  id: string;
  projectId: string;
  tableName: string | null;
  fieldId: string | null;
  checkType: ConsistencyCheckType;
  severity: ConsistencySeverity;
  description: string;
  currentState: string;
  expectedState: string;
  autoFixable: boolean;
  autoFixAction: string | null;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

// ─────────────────────────────────────────────
// UNIFIED TABLE TYPES
// ─────────────────────────────────────────────

export type ComplexityRating = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'VERY_COMPLEX';

export interface UnifiedTableRecord {
  id: string;
  projectId: string;
  tableName: string;
  schemaName: string;

  // Aggregated metrics
  totalColumns: number;
  requiredColumns: number;
  fkColumns: number;
  piiColumns: number;
  phiColumns: number;

  // Complexity
  totalComplexityPoints: number;
  complexityRating: ComplexityRating;
  estimatedDevDays: number;

  // Compliance
  complianceScore: number;
  sopComplianceScore: number;
  hasComplianceAlert: boolean;
  complianceAlertText: string | null;

  // Status
  schemaComplete: boolean;
  fkResolved: boolean;
  intelligenceComplete: boolean;
  complianceScanned: boolean;
  sopChecked: boolean;
  testsGenerated: boolean;
  docsGenerated: boolean;

  // Module mapping
  moduleName: string | null;
  submoduleName: string | null;
  moduleConfidence: number;

  // Overall
  overallEnrichment: number;
  overallConfidence: number;
  issueCount: number;
  warningCount: number;
}

// ─────────────────────────────────────────────
// ENRICHMENT SESSION TYPES
// ─────────────────────────────────────────────

export type EnrichmentSessionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EnrichmentSession {
  id: string;
  projectId: string;

  // Pipeline progress
  status: EnrichmentSessionStatus;
  currentStep: number;
  totalSteps: number;
  currentAgent: string | null;

  // Statistics
  totalFields: number;
  fieldsEnriched: number;
  fieldsWithIssues: number;
  averageConfidence: number;

  // Timing
  startTime: Date;
  endTime: Date | null;
  durationMs: number | null;

  // Errors
  errors: string[];
  warnings: string[];
}

// ─────────────────────────────────────────────
// PIPELINE AGENT TYPES
// ─────────────────────────────────────────────

export interface EnrichmentAgent {
  name: string;
  layer: EnrichmentLayer;
  dependencies: EnrichmentLayer[];
  enrich: (field: Partial<UnifiedFieldRecord>, context: EnrichmentContext) => Promise<Partial<UnifiedFieldRecord>>;
}

export interface EnrichmentContext {
  projectId: string;
  sessionId: string;
  existingFields: Map<string, UnifiedFieldRecord>;
  tables: Map<string, any>;
  storedProcedures: Map<string, any>;
  cshtmlViews: Map<string, any>;
  sopRules: SOPRuleDefinition[];
  globalConfig: Record<string, any>;
}

export interface PipelineResult {
  success: boolean;
  fieldsProcessed: number;
  fieldsWithIssues: number;
  averageConfidence: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
}
