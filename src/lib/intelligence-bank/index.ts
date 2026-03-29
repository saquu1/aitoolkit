// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - Index
// =============================================================================
// Export all intelligence bank modules
// =============================================================================

// Types
export * from './types';

// Enrichment Pipeline
export {
  EnrichmentPipeline,
  runEnrichmentPipeline,
  createDefaultSchemaLayer,
  createDefaultFKLayer,
  createDefaultIntelligenceLayer,
  createDefaultUIComponentLayer,
  createDefaultValidationLayer,
  createDefaultComplianceLayer,
  createDefaultComplexityLayer,
  createDefaultSOPLayer,
  createDefaultCSHTMLEvidenceLayer,
  createDefaultSPEvidenceLayer,
  createDefaultMetaLayer,
} from './enrichment-pipeline';

// SOP Engine
export {
  SOPEngine,
  createSOPEngine,
  initializeDefaultSOPRules,
  DEFAULT_SOP_RULES,
} from './sop-engine';

// Auto-Fix Engine
export {
  AutoFixEngine,
  createAutoFixEngine,
  runAutoFixForProject,
  previewAutoFixes,
  type AutoFixAction,
  type AutoFixResult,
  type AutoFixBatchResult,
} from './autofix-engine';

// Integration Services
export {
  FKIntegrationService,
  createFKIntegrationService,
  runFKIntegration,
  type FKIntegrationResult,
  type FKFieldUpdate,
} from './fk-integration';

export {
  ColumnIntelIntegrationService,
  createColumnIntelIntegrationService,
  runColumnIntelIntegration,
  type ColumnIntelIntegrationResult,
  type ColumnIntelUpdate,
} from './column-intel-integration';

export {
  ComplianceIntegrationService,
  createComplianceIntegrationService,
  runComplianceIntegration,
  type ComplianceIntegrationResult,
} from './compliance-integration';
