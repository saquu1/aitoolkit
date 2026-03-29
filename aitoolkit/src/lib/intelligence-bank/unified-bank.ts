/**
 * Unified Intelligence Bank Service
 * 
 * This is the CENTRAL SERVICE for all module intelligence.
 * Every parser, analyzer, and generator reads from and writes to this bank.
 * 
 * Architecture:
 *   SQL Parser ─────┐
 *   CSHTML Parser ──┤
 *   SP Parser ──────┼──→ UnifiedField (Single Source of Truth)
 *   FK Resolver ────┤
 *   Column Intel ───┤
 *   PII Detector ───┘
 *   
 *   Code Generators ←── UnifiedField
 */

import { PrismaClient, UnifiedField, UnifiedTable } from '@prisma/client';

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateFieldInput {
  projectId: string;
  tableName: string;
  fieldName: string;
  qualifiedName?: string;
  displayOrder?: number;
}

export interface SQLParserData {
  schemaDataType: string;
  schemaBaseType: string;
  schemaMaxLength?: number | null;
  schemaPrecision?: number | null;
  schemaScale?: number | null;
  schemaIsNullable: boolean;
  schemaIsPrimaryKey: boolean;
  schemaIsIdentity: boolean;
  schemaIsComputed: boolean;
  schemaDefaultValue?: string | null;
  schemaCheckConstraint?: string | null;
  schemaSource: string;
  schemaConfidence: number;
}

export interface CSHTMLParserData {
  uiComponentType?: string;
  uiHtmlInputType?: string;
  uiRenderAs?: string;
  uiGridWidth?: string;
  uiLabelPosition?: string;
  uiGroupName?: string;
  uiTabName?: string;
  uiSectionName?: string;
  uiIsHidden?: boolean;
  uiIsReadOnly?: boolean;
  uiIsDisabled?: boolean;
  uiConditionalDisplay?: string;
  uiDropdownConfig?: string;
  uiDateConfig?: string;
  uiFileConfig?: string;
  uiConfidence: number;
  
  // Validation from CSHTML
  validationIsRequired?: boolean;
  validationClientRules?: string;
  validationConfidence: number;
  
  // CSHTML Evidence
  cshtmlFoundInViews?: string;
  cshtmlAjaxEndpoints?: string;
  cshtmlJsValidation?: string;
  cshtmlCssClasses?: string;
  cshtmlInlineStyles?: string;
  cshtmlDataAttributes?: string;
}

export interface ColumnIntelligenceData {
  intelSemanticType?: string;
  intelSemanticCategory?: string;
  intelBusinessMeaning?: string;
  intelDataPattern?: string;
  intelExampleValues?: string;
  intelSuggestedLabel?: string;
  intelSuggestedPlaceholder?: string;
  intelSuggestedHelpText?: string;
  intelIsSystemField?: boolean;
  intelIsAuditField?: boolean;
  intelIsCalculated?: boolean;
  intelConfidence: number;
}

export interface FKResolverData {
  fkIsForeignKey: boolean;
  fkReferencedTable?: string | null;
  fkReferencedColumn?: string | null;
  fkTableExists: boolean;
  fkRelationshipType?: string | null;
  fkOnDelete?: string | null;
  fkOnUpdate?: string | null;
  fkResolutionStatus: string;
  fkCascadeChain?: string;
  fkSources?: string;
  fkConfidence: number;
}

export interface ComplianceData {
  compSensitivityLevel: string;
  compIsPII: boolean;
  compIsPHI: boolean;
  compIsFinancial: boolean;
  compPiiCategory?: string | null;
  compPhiCategory?: string | null;
  compRequiresEncryption: boolean;
  compRequiresMasking: boolean;
  compMaskingPattern?: string | null;
  compRetentionPolicy?: string | null;
  compConsentRequired: boolean;
  compAuditRequired: boolean;
  compAccessRestrictions?: string;
  compRegulatoryFrameworks?: string;
  compConfidence: number;
}

export interface BusinessRuleData {
  spUsedInSPs?: string;
  spBusinessRules?: string;
  spErrorCodes?: string;
}

export interface ValidationRule {
  side: 'client' | 'server' | 'database' | 'cross_field';
  ruleType: string;
  ruleValue?: string | null;
  errorMessage?: string | null;
  errorCode?: number | null;
  relatedField?: string | null;
  spName?: string | null;
  endpoint?: string | null;
  source: string;
  isActive: boolean;
  confidence: number;
}

export interface EnrichmentResult {
  fieldId: string;
  qualifiedName: string;
  layer: string;
  previousConfidence: number;
  newConfidence: number;
  enrichmentProgress: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CORE CRUD OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new UnifiedField record
 */
export async function createField(input: CreateFieldInput): Promise<UnifiedField> {
  const qualifiedName = input.qualifiedName || `${input.tableName}.${input.fieldName}`;
  
  return prisma.unifiedField.create({
    data: {
      projectId: input.projectId,
      tableName: input.tableName,
      fieldName: input.fieldName,
      qualifiedName,
      displayOrder: input.displayOrder ?? 0,
    },
  });
}

/**
 * Get a single field by table and name
 */
export async function getField(
  projectId: string,
  tableName: string,
  fieldName: string
): Promise<UnifiedField | null> {
  return prisma.unifiedField.findFirst({
    where: {
      projectId,
      tableName,
      fieldName,
    },
    include: {
      validationRules: true,
      testCasesRel: true,
      sopComplianceRecords: true,
      cshtmlEvidenceRecords: true,
      spEvidenceRecords: true,
      documentationRecords: true,
    },
  });
}

/**
 * Get field by ID
 */
export async function getFieldById(fieldId: string): Promise<UnifiedField | null> {
  return prisma.unifiedField.findUnique({
    where: { id: fieldId },
  });
}

/**
 * Get all fields for a table
 */
export async function getTableFields(
  projectId: string,
  tableName: string
): Promise<UnifiedField[]> {
  return prisma.unifiedField.findMany({
    where: {
      projectId,
      tableName,
    },
    orderBy: {
      displayOrder: 'asc',
    },
  });
}

/**
 * Get all fields for a project
 */
export async function getProjectFields(projectId: string): Promise<UnifiedField[]> {
  return prisma.unifiedField.findMany({
    where: {
      projectId,
    },
    orderBy: [
      { tableName: 'asc' },
      { displayOrder: 'asc' },
    ],
  });
}

/**
 * Update a field with any data
 */
export async function updateField(
  fieldId: string,
  data: Partial<UnifiedField>
): Promise<UnifiedField> {
  return prisma.unifiedField.update({
    where: { id: fieldId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Upsert a field - create if not exists, update if exists
 */
export async function upsertField(
  projectId: string,
  tableName: string,
  fieldName: string,
  data: Partial<UnifiedField>
): Promise<UnifiedField> {
  const qualifiedName = `${tableName}.${fieldName}`;
  
  return prisma.unifiedField.upsert({
    where: {
      projectId_tableName_fieldName: {
        projectId,
        tableName,
        fieldName,
      },
    },
    create: {
      projectId,
      tableName,
      fieldName,
      qualifiedName,
      ...data,
    },
    update: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a field
 */
export async function deleteField(fieldId: string): Promise<void> {
  await prisma.unifiedField.delete({
    where: { id: fieldId },
  });
}

/**
 * Delete all fields for a table
 */
export async function deleteTableFields(projectId: string, tableName: string): Promise<number> {
  const result = await prisma.unifiedField.deleteMany({
    where: {
      projectId,
      tableName,
    },
  });
  return result.count;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENRICHMENT FUNCTIONS - Each parser has its own enrichment function
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Enrich field with SQL Parser data
 * Layer: schema
 */
export async function enrichFromSQL(
  projectId: string,
  tableName: string,
  fieldName: string,
  data: SQLParserData,
  displayOrder?: number
): Promise<EnrichmentResult> {
  // Get existing field or create new one
  let field = await getField(projectId, tableName, fieldName);
  const previousConfidence = field?.schemaConfidence ?? 0;
  
  if (!field) {
    field = await createField({
      projectId,
      tableName,
      fieldName,
      displayOrder,
    });
  }
  
  // Update with SQL data
  const updated = await updateField(field.id, {
    schemaDataType: data.schemaDataType,
    schemaBaseType: data.schemaBaseType,
    schemaMaxLength: data.schemaMaxLength,
    schemaPrecision: data.schemaPrecision,
    schemaScale: data.schemaScale,
    schemaIsNullable: data.schemaIsNullable,
    schemaIsPrimaryKey: data.schemaIsPrimaryKey,
    schemaIsIdentity: data.schemaIsIdentity,
    schemaIsComputed: data.schemaIsComputed,
    schemaDefaultValue: data.schemaDefaultValue,
    schemaCheckConstraint: data.schemaCheckConstraint,
    schemaSource: data.schemaSource,
    schemaConfidence: data.schemaConfidence,
    displayOrder: displayOrder ?? field.displayOrder,
  });
  
  // Calculate new enrichment progress
  const enrichmentProgress = await calculateFieldEnrichment(updated.id);
  
  return {
    fieldId: updated.id,
    qualifiedName: updated.qualifiedName,
    layer: 'schema',
    previousConfidence,
    newConfidence: data.schemaConfidence,
    enrichmentProgress,
  };
}

/**
 * Enrich field with CSHTML Parser data
 * Layer: ui, validation, cshtml_evidence
 */
export async function enrichFromCSHTML(
  projectId: string,
  tableName: string,
  fieldName: string,
  data: CSHTMLParserData
): Promise<EnrichmentResult> {
  let field = await getField(projectId, tableName, fieldName);
  const previousConfidence = field?.uiConfidence ?? 0;
  
  if (!field) {
    // CSHTML might have fields not in SQL - still create them
    field = await createField({ projectId, tableName, fieldName });
  }
  
  const updateData: Partial<UnifiedField> = {};
  
  // UI Layer
  if (data.uiComponentType) updateData.uiComponentType = data.uiComponentType;
  if (data.uiHtmlInputType) updateData.uiHtmlInputType = data.uiHtmlInputType;
  if (data.uiRenderAs) updateData.uiRenderAs = data.uiRenderAs;
  if (data.uiGridWidth) updateData.uiGridWidth = data.uiGridWidth;
  if (data.uiLabelPosition) updateData.uiLabelPosition = data.uiLabelPosition;
  if (data.uiGroupName) updateData.uiGroupName = data.uiGroupName;
  if (data.uiTabName) updateData.uiTabName = data.uiTabName;
  if (data.uiSectionName) updateData.uiSectionName = data.uiSectionName;
  if (data.uiIsHidden !== undefined) updateData.uiIsHidden = data.uiIsHidden;
  if (data.uiIsReadOnly !== undefined) updateData.uiIsReadOnly = data.uiIsReadOnly;
  if (data.uiIsDisabled !== undefined) updateData.uiIsDisabled = data.uiIsDisabled;
  if (data.uiConditionalDisplay) updateData.uiConditionalDisplay = data.uiConditionalDisplay;
  if (data.uiDropdownConfig) updateData.uiDropdownConfig = data.uiDropdownConfig;
  if (data.uiDateConfig) updateData.uiDateConfig = data.uiDateConfig;
  if (data.uiFileConfig) updateData.uiFileConfig = data.uiFileConfig;
  updateData.uiConfidence = data.uiConfidence;
  
  // Validation Layer
  if (data.validationIsRequired !== undefined) {
    updateData.validationIsRequired = data.validationIsRequired;
  }
  if (data.validationClientRules) {
    updateData.validationClientRules = data.validationClientRules;
  }
  updateData.validationConfidence = data.validationConfidence;
  
  // CSHTML Evidence
  if (data.cshtmlFoundInViews) updateData.cshtmlFoundInViews = data.cshtmlFoundInViews;
  if (data.cshtmlAjaxEndpoints) updateData.cshtmlAjaxEndpoints = data.cshtmlAjaxEndpoints;
  if (data.cshtmlJsValidation) updateData.cshtmlJsValidation = data.cshtmlJsValidation;
  if (data.cshtmlCssClasses) updateData.cshtmlCssClasses = data.cshtmlCssClasses;
  if (data.cshtmlInlineStyles) updateData.cshtmlInlineStyles = data.cshtmlInlineStyles;
  if (data.cshtmlDataAttributes) updateData.cshtmlDataAttributes = data.cshtmlDataAttributes;
  
  const updated = await updateField(field.id, updateData);
  const enrichmentProgress = await calculateFieldEnrichment(updated.id);
  
  return {
    fieldId: updated.id,
    qualifiedName: updated.qualifiedName,
    layer: 'ui',
    previousConfidence,
    newConfidence: data.uiConfidence,
    enrichmentProgress,
  };
}

/**
 * Enrich field with Column Intelligence data
 * Layer: intelligence
 */
export async function enrichFromIntelligence(
  projectId: string,
  tableName: string,
  fieldName: string,
  data: ColumnIntelligenceData
): Promise<EnrichmentResult> {
  let field = await getField(projectId, tableName, fieldName);
  const previousConfidence = field?.intelConfidence ?? 0;
  
  if (!field) {
    field = await createField({ projectId, tableName, fieldName });
  }
  
  const updateData: Partial<UnifiedField> = {};
  
  if (data.intelSemanticType) updateData.intelSemanticType = data.intelSemanticType;
  if (data.intelSemanticCategory) updateData.intelSemanticCategory = data.intelSemanticCategory;
  if (data.intelBusinessMeaning) updateData.intelBusinessMeaning = data.intelBusinessMeaning;
  if (data.intelDataPattern) updateData.intelDataPattern = data.intelDataPattern;
  if (data.intelExampleValues) updateData.intelExampleValues = data.intelExampleValues;
  if (data.intelSuggestedLabel) updateData.intelSuggestedLabel = data.intelSuggestedLabel;
  if (data.intelSuggestedPlaceholder) updateData.intelSuggestedPlaceholder = data.intelSuggestedPlaceholder;
  if (data.intelSuggestedHelpText) updateData.intelSuggestedHelpText = data.intelSuggestedHelpText;
  if (data.intelIsSystemField !== undefined) updateData.intelIsSystemField = data.intelIsSystemField;
  if (data.intelIsAuditField !== undefined) updateData.intelIsAuditField = data.intelIsAuditField;
  if (data.intelIsCalculated !== undefined) updateData.intelIsCalculated = data.intelIsCalculated;
  updateData.intelConfidence = data.intelConfidence;
  
  const updated = await updateField(field.id, updateData);
  const enrichmentProgress = await calculateFieldEnrichment(updated.id);
  
  return {
    fieldId: updated.id,
    qualifiedName: updated.qualifiedName,
    layer: 'intelligence',
    previousConfidence,
    newConfidence: data.intelConfidence,
    enrichmentProgress,
  };
}

/**
 * Enrich field with FK Resolver data
 * Layer: fk
 */
export async function enrichFromFKResolver(
  projectId: string,
  tableName: string,
  fieldName: string,
  data: FKResolverData
): Promise<EnrichmentResult> {
  let field = await getField(projectId, tableName, fieldName);
  const previousConfidence = field?.fkConfidence ?? 0;
  
  if (!field) {
    field = await createField({ projectId, tableName, fieldName });
  }
  
  const updated = await updateField(field.id, {
    fkIsForeignKey: data.fkIsForeignKey,
    fkReferencedTable: data.fkReferencedTable,
    fkReferencedColumn: data.fkReferencedColumn,
    fkTableExists: data.fkTableExists,
    fkRelationshipType: data.fkRelationshipType,
    fkOnDelete: data.fkOnDelete,
    fkOnUpdate: data.fkOnUpdate,
    fkResolutionStatus: data.fkResolutionStatus,
    fkCascadeChain: data.fkCascadeChain,
    fkSources: data.fkSources,
    fkConfidence: data.fkConfidence,
  });
  
  const enrichmentProgress = await calculateFieldEnrichment(updated.id);
  
  return {
    fieldId: updated.id,
    qualifiedName: updated.qualifiedName,
    layer: 'fk',
    previousConfidence,
    newConfidence: data.fkConfidence,
    enrichmentProgress,
  };
}

/**
 * Enrich field with Compliance data
 * Layer: compliance
 */
export async function enrichFromCompliance(
  projectId: string,
  tableName: string,
  fieldName: string,
  data: ComplianceData
): Promise<EnrichmentResult> {
  let field = await getField(projectId, tableName, fieldName);
  const previousConfidence = field?.compConfidence ?? 0;
  
  if (!field) {
    field = await createField({ projectId, tableName, fieldName });
  }
  
  const updated = await updateField(field.id, {
    compSensitivityLevel: data.compSensitivityLevel,
    compIsPII: data.compIsPII,
    compIsPHI: data.compIsPHI,
    compIsFinancial: data.compIsFinancial,
    compPiiCategory: data.compPiiCategory,
    compPhiCategory: data.compPhiCategory,
    compRequiresEncryption: data.compRequiresEncryption,
    compRequiresMasking: data.compRequiresMasking,
    compMaskingPattern: data.compMaskingPattern,
    compRetentionPolicy: data.compRetentionPolicy,
    compConsentRequired: data.compConsentRequired,
    compAuditRequired: data.compAuditRequired,
    compAccessRestrictions: data.compAccessRestrictions,
    compRegulatoryFrameworks: data.compRegulatoryFrameworks,
    compConfidence: data.compConfidence,
  });
  
  const enrichmentProgress = await calculateFieldEnrichment(updated.id);
  
  return {
    fieldId: updated.id,
    qualifiedName: updated.qualifiedName,
    layer: 'compliance',
    previousConfidence,
    newConfidence: data.compConfidence,
    enrichmentProgress,
  };
}

/**
 * Enrich field with Business Rule data
 * Layer: sp_evidence
 */
export async function enrichFromBusinessRules(
  projectId: string,
  tableName: string,
  fieldName: string,
  data: BusinessRuleData
): Promise<EnrichmentResult> {
  let field = await getField(projectId, tableName, fieldName);
  
  if (!field) {
    field = await createField({ projectId, tableName, fieldName });
  }
  
  const updateData: Partial<UnifiedField> = {};
  
  if (data.spUsedInSPs) updateData.spUsedInSPs = data.spUsedInSPs;
  if (data.spBusinessRules) updateData.spBusinessRules = data.spBusinessRules;
  if (data.spErrorCodes) updateData.spErrorCodes = data.spErrorCodes;
  
  const updated = await updateField(field.id, updateData);
  const enrichmentProgress = await calculateFieldEnrichment(updated.id);
  
  return {
    fieldId: updated.id,
    qualifiedName: updated.qualifiedName,
    layer: 'sp_evidence',
    previousConfidence: field.metaOverallConfidence,
    newConfidence: updated.metaOverallConfidence,
    enrichmentProgress,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CALCULATION FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate enrichment progress for a single field
 * Returns 0-100 percentage of how complete the field's intelligence is
 */
export async function calculateFieldEnrichment(fieldId: string): Promise<number> {
  const field = await prisma.unifiedField.findUnique({
    where: { id: fieldId },
  });
  
  if (!field) return 0;
  
  // Define which fields constitute "enriched" status
  const layers = [
    // Schema layer (25 points)
    { name: 'schema', weight: 25, 
      hasData: !!(field.schemaDataType && field.schemaBaseType) },
    
    // Intelligence layer (20 points)
    { name: 'intelligence', weight: 20,
      hasData: !!(field.intelSemanticType) },
    
    // FK layer (15 points)
    { name: 'fk', weight: 15,
      hasData: field.fkIsForeignKey ? !!(field.fkReferencedTable && field.fkTableExists) : true },
    
    // UI layer (15 points)
    { name: 'ui', weight: 15,
      hasData: !!(field.uiComponentType) },
    
    // Validation layer (10 points)
    { name: 'validation', weight: 10,
      hasData: field.validationAlignment !== 'unknown' },
    
    // Compliance layer (10 points)
    { name: 'compliance', weight: 10,
      hasData: !!(field.compSensitivityLevel !== 'public' || field.compIsPII || field.compIsPHI) },
    
    // CSHTML evidence (5 points) - bonus
    { name: 'cshtml', weight: 5,
      hasData: !!(field.cshtmlFoundInViews && field.cshtmlFoundInViews !== '[]') },
  ];
  
  const totalWeight = layers.reduce((sum, l) => sum + l.weight, 0);
  const enrichedWeight = layers.reduce((sum, l) => sum + (l.hasData ? l.weight : 0), 0);
  
  return Math.round((enrichedWeight / totalWeight) * 100);
}

/**
 * Calculate overall confidence for a field
 * Aggregates all layer confidences with weighting
 */
export async function calculateOverallConfidence(fieldId: string): Promise<number> {
  const field = await prisma.unifiedField.findUnique({
    where: { id: fieldId },
  });
  
  if (!field) return 0;
  
  const confidences = [
    { confidence: field.schemaConfidence, weight: 25 },
    { confidence: field.intelConfidence, weight: 20 },
    { confidence: field.fkConfidence, weight: 15 },
    { confidence: field.uiConfidence, weight: 15 },
    { confidence: field.validationConfidence, weight: 10 },
    { confidence: field.compConfidence, weight: 10 },
    { confidence: field.sopCompliancePercent / 100, weight: 5 },
  ];
  
  const totalWeight = confidences.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = confidences.reduce((sum, c) => sum + (c.confidence * c.weight), 0);
  
  return weightedSum / totalWeight;
}

/**
 * Calculate enrichment progress for an entire project
 */
export async function calculateProjectEnrichment(projectId: string): Promise<{
  totalFields: number;
  enrichedFields: number;
  averageProgress: number;
  averageConfidence: number;
}> {
  const fields = await prisma.unifiedField.findMany({
    where: { projectId },
  });
  
  if (fields.length === 0) {
    return {
      totalFields: 0,
      enrichedFields: 0,
      averageProgress: 0,
      averageConfidence: 0,
    };
  }
  
  let totalProgress = 0;
  let totalConfidence = 0;
  let enrichedCount = 0;
  
  for (const field of fields) {
    const progress = await calculateFieldEnrichment(field.id);
    const confidence = await calculateOverallConfidence(field.id);
    
    totalProgress += progress;
    totalConfidence += confidence;
    
    if (progress >= 80) enrichedCount++;
  }
  
  return {
    totalFields: fields.length,
    enrichedFields: enrichedCount,
    averageProgress: Math.round(totalProgress / fields.length),
    averageConfidence: Math.round((totalConfidence / fields.length) * 100) / 100,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get fields needing review (low confidence or incomplete enrichment)
 */
export async function getFieldsNeedingReview(
  projectId: string,
  confidenceThreshold: number = 0.7,
  enrichmentThreshold: number = 50
): Promise<UnifiedField[]> {
  return prisma.unifiedField.findMany({
    where: {
      projectId,
      OR: [
        { metaOverallConfidence: { lt: confidenceThreshold } },
        { metaNeedsReview: true },
      ],
    },
    orderBy: {
      metaOverallConfidence: 'asc',
    },
  });
}

/**
 * Get all FK fields with missing tables
 */
export async function getMissingFKTables(projectId: string): Promise<UnifiedField[]> {
  return prisma.unifiedField.findMany({
    where: {
      projectId,
      fkIsForeignKey: true,
      fkTableExists: false,
    },
  });
}

/**
 * Get all PII/PHI fields
 */
export async function getSensitiveFields(projectId: string): Promise<UnifiedField[]> {
  return prisma.unifiedField.findMany({
    where: {
      projectId,
      OR: [
        { compIsPII: true },
        { compIsPHI: true },
      ],
    },
  });
}

/**
 * Get fields by semantic type
 */
export async function getFieldsBySemanticType(
  projectId: string,
  semanticType: string
): Promise<UnifiedField[]> {
  return prisma.unifiedField.findMany({
    where: {
      projectId,
      intelSemanticType: semanticType,
    },
  });
}

/**
 * Get fields by table with full enrichment for code generation
 */
export async function getFieldsForGeneration(
  projectId: string,
  tableName: string
): Promise<{
  fields: UnifiedField[];
  tableName: string;
  readyForGeneration: boolean;
  blockingIssues: string[];
}> {
  const fields = await prisma.unifiedField.findMany({
    where: {
      projectId,
      tableName,
    },
    orderBy: {
      displayOrder: 'asc',
    },
  });
  
  const blockingIssues: string[] = [];
  
  // Check for blocking issues
  const missingFKTables = fields.filter(f => f.fkIsForeignKey && !f.fkTableExists);
  if (missingFKTables.length > 0) {
    blockingIssues.push(
      `Missing FK tables: ${missingFKTables.map(f => f.fkReferencedTable).join(', ')}`
    );
  }
  
  const noTypeFields = fields.filter(f => !f.schemaBaseType && !f.schemaDataType);
  if (noTypeFields.length > 0) {
    blockingIssues.push(
      `Fields without type: ${noTypeFields.map(f => f.fieldName).join(', ')}`
    );
  }
  
  return {
    fields,
    tableName,
    readyForGeneration: blockingIssues.length === 0,
    blockingIssues,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create or update UnifiedTable record
 */
export async function upsertTable(
  projectId: string,
  tableName: string,
  data?: Partial<UnifiedTable>
): Promise<UnifiedTable> {
  return prisma.unifiedTable.upsert({
    where: {
      projectId_tableName: {
        projectId,
        tableName,
      },
    },
    create: {
      projectId,
      tableName,
      ...data,
    },
    update: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Update table statistics from fields
 */
export async function updateTableStatistics(
  projectId: string,
  tableName: string
): Promise<UnifiedTable> {
  const fields = await prisma.unifiedField.findMany({
    where: {
      projectId,
      tableName,
    },
  });
  
  const totalColumns = fields.length;
  const requiredColumns = fields.filter(f => !f.schemaIsNullable).length;
  const fkColumns = fields.filter(f => f.fkIsForeignKey).length;
  const piiColumns = fields.filter(f => f.compIsPII).length;
  const phiColumns = fields.filter(f => f.compIsPHI).length;
  
  const avgConfidence = fields.reduce((sum, f) => sum + f.metaOverallConfidence, 0) / totalColumns;
  const avgEnrichment = fields.reduce((sum, f) => sum + f.enrichmentProgress, 0) / totalColumns;
  
  return upsertTable(projectId, tableName, {
    totalColumns,
    requiredColumns,
    fkColumns,
    piiColumns,
    phiColumns,
    overallConfidence: avgConfidence,
    overallEnrichment: avgEnrichment,
  });
}

/**
 * Get all tables for a project with statistics
 */
export async function getProjectTables(projectId: string): Promise<UnifiedTable[]> {
  return prisma.unifiedTable.findMany({
    where: {
      projectId,
    },
    orderBy: {
      tableName: 'asc',
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT FOR CODE GENERATION
// ══════════════════════════════════════════════════════════════════════════════

export interface FieldForGeneration {
  fieldName: string;
  tableName: string;
  qualifiedName: string;
  
  // Schema
  schemaDataType: string | null;
  schemaBaseType: string | null;
  schemaMaxLength: number | null;
  schemaIsNullable: boolean;
  schemaIsPrimaryKey: boolean;
  schemaIsIdentity: boolean;
  schemaDefaultValue: string | null;
  
  // Intelligence
  intelSemanticType: string | null;
  intelBusinessMeaning: string | null;
  intelSuggestedLabel: string | null;
  
  // FK
  fkIsForeignKey: boolean;
  fkReferencedTable: string | null;
  fkReferencedColumn: string | null;
  fkTableExists: boolean;
  
  // UI
  uiComponentType: string | null;
  uiHtmlInputType: string | null;
  uiGridWidth: string;
  uiIsHidden: boolean;
  uiIsReadOnly: boolean;
  uiDropdownConfig: string | null;
  
  // Validation
  validationIsRequired: boolean;
  validationClientRules: string;
  
  // Compliance
  compIsPII: boolean;
  compIsPHI: boolean;
  compRequiresEncryption: boolean;
  compRequiresMasking: boolean;
  compMaskingPattern: string | null;
  
  // Meta
  metaOverallConfidence: number;
  enrichmentProgress: number;
}

/**
 * Export all field intelligence for code generation
 */
export async function exportForGeneration(
  projectId: string,
  tableName?: string
): Promise<FieldForGeneration[]> {
  const where: any = { projectId };
  if (tableName) where.tableName = tableName;
  
  const fields = await prisma.unifiedField.findMany({
    where,
    orderBy: [
      { tableName: 'asc' },
      { displayOrder: 'asc' },
    ],
  });
  
  return fields.map(field => ({
    fieldName: field.fieldName,
    tableName: field.tableName,
    qualifiedName: field.qualifiedName,
    
    schemaDataType: field.schemaDataType,
    schemaBaseType: field.schemaBaseType,
    schemaMaxLength: field.schemaMaxLength,
    schemaIsNullable: field.schemaIsNullable,
    schemaIsPrimaryKey: field.schemaIsPrimaryKey,
    schemaIsIdentity: field.schemaIsIdentity,
    schemaDefaultValue: field.schemaDefaultValue,
    
    intelSemanticType: field.intelSemanticType,
    intelBusinessMeaning: field.intelBusinessMeaning,
    intelSuggestedLabel: field.intelSuggestedLabel,
    
    fkIsForeignKey: field.fkIsForeignKey,
    fkReferencedTable: field.fkReferencedTable,
    fkReferencedColumn: field.fkReferencedColumn,
    fkTableExists: field.fkTableExists,
    
    uiComponentType: field.uiComponentType,
    uiHtmlInputType: field.uiHtmlInputType,
    uiGridWidth: field.uiGridWidth,
    uiIsHidden: field.uiIsHidden,
    uiIsReadOnly: field.uiIsReadOnly,
    uiDropdownConfig: field.uiDropdownConfig,
    
    validationIsRequired: field.validationIsRequired,
    validationClientRules: field.validationClientRules,
    
    compIsPII: field.compIsPII,
    compIsPHI: field.compIsPHI,
    compRequiresEncryption: field.compRequiresEncryption,
    compRequiresMasking: field.compRequiresMasking,
    compMaskingPattern: field.compMaskingPattern,
    
    metaOverallConfidence: field.metaOverallConfidence,
    enrichmentProgress: field.enrichmentProgress,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════════════════════

export interface ProjectStatistics {
  totalTables: number;
  totalFields: number;
  totalFKFields: number;
  resolvedFKFields: number;
  missingFKTables: number;
  piiFields: number;
  phiFields: number;
  averageEnrichment: number;
  averageConfidence: number;
  fieldsNeedingReview: number;
}

export async function getProjectStatistics(projectId: string): Promise<ProjectStatistics> {
  const fields = await prisma.unifiedField.findMany({
    where: { projectId },
  });
  
  const tables = await prisma.unifiedTable.findMany({
    where: { projectId },
  });
  
  const totalFields = fields.length;
  
  return {
    totalTables: tables.length,
    totalFields,
    totalFKFields: fields.filter(f => f.fkIsForeignKey).length,
    resolvedFKFields: fields.filter(f => f.fkIsForeignKey && f.fkTableExists).length,
    missingFKTables: fields.filter(f => f.fkIsForeignKey && !f.fkTableExists).length,
    piiFields: fields.filter(f => f.compIsPII).length,
    phiFields: fields.filter(f => f.compIsPHI).length,
    averageEnrichment: totalFields > 0 
      ? Math.round(fields.reduce((sum, f) => sum + f.enrichmentProgress, 0) / totalFields)
      : 0,
    averageConfidence: totalFields > 0
      ? Math.round(fields.reduce((sum, f) => sum + f.metaOverallConfidence, 0) / totalFields * 100) / 100
      : 0,
    fieldsNeedingReview: fields.filter(f => f.metaNeedsReview).length,
  };
}
