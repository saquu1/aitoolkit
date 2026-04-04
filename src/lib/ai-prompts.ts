// =============================================================================
// AI PROMPTS MODULE - PROMPT ENGINEERING FOR SCHEMA INFERENCE
// =============================================================================
// This module contains carefully crafted prompts for AI-based schema analysis
// including type inference, FK resolution, relationship detection, and more.
// =============================================================================

// =============================================================================
// TYPE INFERENCE PROMPTS
// =============================================================================

export const TYPE_INFERENCE_SYSTEM_PROMPT = `You are an expert database schema analyst specializing in SQL Server and healthcare information systems. Your task is to analyze field definitions and infer the most appropriate SQL data type.

Guidelines:
1. Consider the field name, validation rules, and context
2. Prefer more specific types over generic ones when evidence supports it
3. Consider SQL Server specific types (NVARCHAR, DATETIME2, UNIQUEIDENTIFIER, etc.)
4. For healthcare systems, be aware of HIPAA/PHI considerations
5. Provide confidence scores (0-100) based on strength of evidence

Output format: JSON object with:
- suggestedType: The SQL Server data type (e.g., "NVARCHAR(100)", "DECIMAL(18,2)", "DATETIME2")
- confidence: 0-100
- reason: Brief explanation
- evidence: Array of evidence items supporting this inference`;

export const TYPE_INFERENCE_USER_PROMPT = `Analyze this field and suggest the optimal SQL Server data type:

Field: {{fieldName}}
Entity: {{entityName}}
Current Type: {{currentType}}
Validation Rules: {{validationRules}}
UI Context: {{uiContext}}
Related Fields: {{relatedFields}}
Sample Values: {{sampleValues}}

Consider:
1. Name patterns (Email, Phone, Price, Date, etc.)
2. Validation constraints (maxLength, range, pattern)
3. UI input type (dropdown, text, date picker)
4. Entity context (what kind of data this table stores)
5. Related field names for context clues`;

// =============================================================================
// FK RESOLUTION PROMPTS
// =============================================================================

export const FK_RESOLUTION_SYSTEM_PROMPT = `You are an expert database relationship analyst. Your task is to analyze field patterns and determine if a field is a foreign key, what table it references, and the nature of the relationship.

Guidelines:
1. Consider naming conventions (EntityId, EntityCode patterns)
2. Analyze UI context (dropdown = likely FK)
3. Check for cascade patterns (Country -> Province -> City)
4. Detect polymorphic relationships (EntityType + EntityId)
5. Identify self-referencing relationships (ParentId, ManagerId)
6. Consider junction tables for M:N relationships

Relationship Types:
- 1:1 - One-to-one (unique FK, shared PK)
- 1:N - One-to-many (standard FK)
- N:1 - Many-to-one (reverse of 1:N)
- N:M - Many-to-many (junction table)
- SELF_REF - Self-referencing (hierarchy)
- POLYMORPHIC - References multiple tables (type column)
- CASCADE - Chain of dependencies (geographic, organizational)

Output format: JSON object with:
- isFK: boolean
- referencedTable: string (if FK)
- relationshipType: string (1:1, 1:N, N:1, N:M, SELF_REF, POLYMORPHIC, CASCADE)
- confidence: 0-100
- reason: Brief explanation
- cascadeChain: Array of tables in order (if CASCADE type)`;

export const FK_RESOLUTION_USER_PROMPT = `Analyze this field to determine if it's a foreign key and identify the relationship:

Field: {{fieldName}}
Entity: {{entityName}}
FieldType: {{fieldType}}
UIContext: {{uiContext}}
DropdownOptions: {{dropdownOptions}}
RelatedFields: {{relatedFields}}
ExistingTables: {{existingTables}}

Analyze:
1. Does the name end in Id/Code suggesting FK?
2. Is it a dropdown/select in the UI?
3. Does the name match a known entity table?
4. Are there cascade patterns with other fields?
5. Is this part of a composite key?`;

// =============================================================================
// RELATIONSHIP INFERENCE PROMPTS
// =============================================================================

export const RELATIONSHIP_INFERENCE_SYSTEM_PROMPT = `You are a database relationship expert. Analyze entities and their fields to discover hidden relationships that may not be explicit in the schema.

Look for:
1. Naming patterns suggesting relationships (same prefix, shared columns)
2. Junction table patterns (two FK columns, minimal other columns)
3. Cascade dropdown chains in UI code
4. Shared lookup tables across entities
5. Parent-child hierarchies

Output format: JSON array of relationships, each with:
- fromTable: string
- toTable: string
- type: string (1:1, 1:N, N:M, SELF_REF, POLYMORPHIC, CASCADE)
- fkColumn: string
- confidence: 0-100
- evidence: Array of evidence
- source: "explicit" | "inferred" | "pattern"`;

export const RELATIONSHIP_INFERENCE_USER_PROMPT = `Analyze these entities and discover relationships:

Entities:
{{entitiesJson}}

UI Patterns Detected:
{{uiPatterns}}

Known Tables:
{{knownTables}}

Find all relationships including:
1. Explicit FKs (already marked as FK)
2. Inferred FKs (EntityId patterns without explicit constraint)
3. Junction tables (M:N relationships)
4. Self-referencing (ParentId patterns)
5. Cascade chains (geographic, organizational)`;

// =============================================================================
// CONSTRAINT INFERENCE PROMPTS
// =============================================================================

export const CONSTRAINT_INFERENCE_SYSTEM_PROMPT = `You are a database constraint expert. Analyze field definitions and infer appropriate constraints based on business logic and data integrity requirements.

Constraint Types:
- NOT NULL - Required field
- UNIQUE - No duplicates allowed
- CHECK - Value validation rules
- DEFAULT - Default value for new records
- PRIMARY KEY - Main identifier
- FOREIGN KEY - Reference to another table

Output format: JSON object with:
- constraints: Array of constraint objects
- each constraint has: type, definition, confidence, reason`;

export const CONSTRAINT_INFERENCE_USER_PROMPT = `Analyze this field and suggest appropriate constraints:

Field: {{fieldName}}
Entity: {{entityName}}
FieldType: {{fieldType}}
ValidationRules: {{validationRules}}
UIContext: {{uiContext}}
BusinessContext: {{businessContext}}

Consider:
1. Required fields (validation, UI required attribute)
2. Unique fields (email, username, code)
3. Range checks (age, quantity, percentage)
4. Default values (status, created date, boolean flags)
5. Business rules (status transitions, soft delete)`;

// =============================================================================
// ENUM DETECTION PROMPTS
// =============================================================================

export const ENUM_DETECTION_SYSTEM_PROMPT = `You are an expert at detecting enumeration patterns in database fields. Analyze field values, UI patterns, and validation rules to identify fields that should be enums.

Indicators:
1. Dropdown with fixed options
2. Field name ends in Type, Status, Category, Level, Priority
3. String field with consistent limited values
4. Check constraint with value list
5. UI shows radio buttons or fixed dropdown

Output format: JSON object with:
- isEnum: boolean
- enumName: string (suggested enum name)
- values: Array of { name: string, value: string, description?: string }
- confidence: 0-100
- reason: string`;

export const ENUM_DETECTION_USER_PROMPT = `Analyze this field to determine if it should be an enum:

Field: {{fieldName}}
Entity: {{entityName}}
FieldType: {{fieldType}}
UIContext: {{uiContext}}
DropdownOptions: {{dropdownOptions}}
SampleValues: {{sampleValues}}
ValidationRules: {{validationRules}}

Determine:
1. Does the field have a fixed set of values?
2. Are the values meaningful (not just IDs)?
3. Would an enum improve type safety?
4. What should the enum values be named?`;

// =============================================================================
// COMPOSITE KEY DETECTION PROMPTS
// =============================================================================

export const COMPOSITE_KEY_SYSTEM_PROMPT = `You are an expert at detecting composite primary keys in database tables. Analyze table structure and field patterns to identify composite keys.

Patterns:
1. Junction tables (two FKs together form PK)
2. Link tables (entity relationships)
3. Historical tables (entity + date/timestamp)
4. Multi-tenant tables (tenant + local ID)

Output format: JSON object with:
- isCompositePK: boolean
- keyFields: Array of field names
- keyType: string (junction, historical, multi_tenant, custom)
- confidence: 0-100
- reason: string`;

export const COMPOSITE_KEY_USER_PROMPT = `Analyze this table to detect composite primary keys:

Entity: {{entityName}}
Fields:
{{fieldsJson}}

ForeignKeys:
{{foreignKeysJson}}

RelatedTables:
{{relatedTables}}

Determine:
1. Is this a junction/link table?
2. Do multiple fields together uniquely identify rows?
3. Are there exactly 2 FK fields with few other columns?
4. Is there a historical/versioning pattern?`;

// =============================================================================
// BATCH ANALYSIS PROMPT
// =============================================================================

export const BATCH_ANALYSIS_SYSTEM_PROMPT = `You are an expert database schema analyst. Analyze multiple fields/entities and provide comprehensive suggestions for improvements.

Focus on:
1. Type consistency and precision
2. Missing relationships
3. Constraint completeness
4. Naming convention adherence
5. Performance considerations

Output format: JSON object with:
- suggestions: Array of suggestion objects
- each suggestion has: type, target, current, suggested, confidence, reason, evidence
- summary: Brief overall assessment
- priority: Array of high-priority items`;

export const BATCH_ANALYSIS_USER_PROMPT = `Perform a comprehensive analysis of these schema elements:

Tables:
{{tablesJson}}

Views:
{{viewsJson}}

StoredProcedures:
{{storedProceduresJson}}

DetectedRelationships:
{{relationshipsJson}}

Provide suggestions for:
1. Type improvements (more precise types)
2. Missing FK relationships
3. Constraint additions
4. Index recommendations
5. Naming improvements`;

// =============================================================================
// PROMPT HELPER FUNCTIONS
// =============================================================================

export function formatTypeInferencePrompt(context: {
  fieldName: string
  entityName: string
  currentType: string
  validationRules?: string[]
  uiContext?: string
  relatedFields?: string[]
  sampleValues?: string[]
}): string {
  return TYPE_INFERENCE_USER_PROMPT
    .replace('{{fieldName}}', context.fieldName)
    .replace('{{entityName}}', context.entityName)
    .replace('{{currentType}}', context.currentType || 'unknown')
    .replace('{{validationRules}}', JSON.stringify(context.validationRules || []))
    .replace('{{uiContext}}', context.uiContext || 'unknown')
    .replace('{{relatedFields}}', JSON.stringify(context.relatedFields || []))
    .replace('{{sampleValues}}', JSON.stringify(context.sampleValues || []))
}

export function formatFKResolutionPrompt(context: {
  fieldName: string
  entityName: string
  fieldType: string
  uiContext?: string
  dropdownOptions?: string[]
  relatedFields?: string[]
  existingTables?: string[]
}): string {
  return FK_RESOLUTION_USER_PROMPT
    .replace('{{fieldName}}', context.fieldName)
    .replace('{{entityName}}', context.entityName)
    .replace('{{fieldType}}', context.fieldType)
    .replace('{{uiContext}}', context.uiContext || 'unknown')
    .replace('{{dropdownOptions}}', JSON.stringify(context.dropdownOptions || []))
    .replace('{{relatedFields}}', JSON.stringify(context.relatedFields || []))
    .replace('{{existingTables}}', JSON.stringify(context.existingTables || []))
}

export function formatEnumDetectionPrompt(context: {
  fieldName: string
  entityName: string
  fieldType: string
  uiContext?: string
  dropdownOptions?: string[]
  sampleValues?: string[]
  validationRules?: string[]
}): string {
  return ENUM_DETECTION_USER_PROMPT
    .replace('{{fieldName}}', context.fieldName)
    .replace('{{entityName}}', context.entityName)
    .replace('{{fieldType}}', context.fieldType)
    .replace('{{uiContext}}', context.uiContext || 'unknown')
    .replace('{{dropdownOptions}}', JSON.stringify(context.dropdownOptions || []))
    .replace('{{sampleValues}}', JSON.stringify(context.sampleValues || []))
    .replace('{{validationRules}}', JSON.stringify(context.validationRules || []))
}

// =============================================================================
// PROMPT VALIDATION FUNCTIONS
// =============================================================================

export function validateAIResponse(response: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'type_inference':
      return response.suggestedType && typeof response.confidence === 'number'
    case 'fk_resolution':
      return typeof response.isFK === 'boolean'
    case 'enum_detection':
      return typeof response.isEnum === 'boolean'
    case 'relationship':
      return Array.isArray(response)
    default:
      return typeof response === 'object'
  }
}

// =============================================================================
// PROMPT EXPORTS
// =============================================================================

export const AI_PROMPTS = {
  typeInference: {
    system: TYPE_INFERENCE_SYSTEM_PROMPT,
    user: TYPE_INFERENCE_USER_PROMPT,
    format: formatTypeInferencePrompt
  },
  fkResolution: {
    system: FK_RESOLUTION_SYSTEM_PROMPT,
    user: FK_RESOLUTION_USER_PROMPT,
    format: formatFKResolutionPrompt
  },
  relationshipInference: {
    system: RELATIONSHIP_INFERENCE_SYSTEM_PROMPT,
    user: RELATIONSHIP_INFERENCE_USER_PROMPT
  },
  constraintInference: {
    system: CONSTRAINT_INFERENCE_SYSTEM_PROMPT,
    user: CONSTRAINT_INFERENCE_USER_PROMPT
  },
  enumDetection: {
    system: ENUM_DETECTION_SYSTEM_PROMPT,
    user: ENUM_DETECTION_USER_PROMPT,
    format: formatEnumDetectionPrompt
  },
  compositeKeyDetection: {
    system: COMPOSITE_KEY_SYSTEM_PROMPT,
    user: COMPOSITE_KEY_USER_PROMPT
  },
  batchAnalysis: {
    system: BATCH_ANALYSIS_SYSTEM_PROMPT,
    user: BATCH_ANALYSIS_USER_PROMPT
  }
}

export default AI_PROMPTS
