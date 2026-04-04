/**
 * SPDLL Intelligence Engine - Main Entry Point
 * 
 * This module provides comprehensive intelligence extraction from
 * SQL Server stored procedures and CSHTML views for legacy system migration.
 * 
 * Key capabilities:
 * - SP Classification with 30+ naming patterns
 * - SP Body Analysis (GAP-SP-002)
 * - CSHTML ↔ SP Correlation
 * - API Route Generation
 * - Business Rule Extraction
 * - Dropdown Registry
 * - Error Code Mapping
 * - SQL Server Connection Pooling (GAP-SP-008)
 * - Redis Caching Infrastructure (GAP-SP-012)
 */

// ============================================================================
// EXPORTS
// ============================================================================

// Classification Engine
export {
  SPClassificationEngine,
  spClassificationEngine,
  SP_CLASSIFICATION_RULES,
  classifySP,
  extractModuleFromSP,
  type SPActionType,
  type HTTPMethod,
  type SPClassificationRule,
  type SPParameter,
  type SPTableAccess,
  type SPBusinessRule,
  type SPClassificationResult
} from './sp-classification-engine';

// SP Body Analyzer (GAP-SP-002)
export {
  SPBodyAnalyzer,
  spBodyAnalyzer,
  analyzeSPBody,
  type SPBodyAnalysis,
  type SPParameterDetail,
  type SPTableAccessPattern,
  type SPBusinessRuleDetail,
  type SPBusinessRuleType,
  type SPErrorCodeDetail,
  type SPTransactionInfo,
  type SPFlowControl,
  type SPDynamicSQLInfo,
  type SPComplexityMetrics,
  type SPSubProcedureCall,
  type SPTempTable,
  type SPCTEDefinition
} from './sp-body-analyzer';

// Correlation Engine
export {
  CSPCorrelationEngine,
  cspCorrelationEngine,
  correlateFormToSP,
  findBestMatchingSP,
  type CorrelationType,
  type CorrelationMethod,
  type FieldMapping,
  type CorrelationResult,
  type CSHTMLFormField,
  type CSHTMLForm,
  type CSHTMLDropdown,
  type CSHTMLAjaxCall,
  type SPParameterInfo
} from './csp-correlation-engine';

// API Route Generator
export {
  APIRouteGenerator,
  apiRouteGenerator,
  generateAPIRoute,
  type APIRouteConfig,
  type ErrorMapping,
  type GeneratedAPIRoute,
  type ParameterMapping
} from './api-route-generator';

// SQL Server Connection Pool (GAP-SP-008)
export {
  SQLServerConnectionPool,
  SQLServerConnectionManager,
  connectionManager,
  createPoolFromEnv,
  quickQuery,
  quickExecuteSP,
  type SQLServerConfig,
  type ConnectionPoolStats,
  type QueryResult,
  type ColumnMetadata,
  type SPMetadata,
  type QueryMetrics,
  type ConnectionHealth,
  type PoolEvent,
  type PoolEventListener
} from './sql-server-connection';

// Redis Cache Manager (GAP-SP-012)
export {
  RedisCacheManager,
  CacheManager,
  cacheManager,
  Cached,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheGetOrSet,
  createCacheFromEnv,
  type RedisConfig,
  type CacheEntry,
  type CacheStats,
  type CacheOptions,
  type RateLimitConfig,
  type RateLimitResult,
  type DistributedLockOptions,
  type DistributedLock,
  type CacheEvent,
  type CacheEventListener
} from './redis-cache';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { spClassificationEngine, type SPClassificationRule } from './sp-classification-engine';
import { spBodyAnalyzer } from './sp-body-analyzer';
import { cspCorrelationEngine, type CSHTMLForm, type SPParameterInfo } from './csp-correlation-engine';
import { apiRouteGenerator, type APIRouteConfig, type GeneratedAPIRoute, type ErrorMapping } from './api-route-generator';

/**
 * Full SPDLL analysis pipeline
 */
export interface SPDLLAnalysisResult {
  procedureName: string;
  
  // Classification results
  actionType: string;
  httpMethod: string;
  suggestedRoute: string;
  moduleName: string | null;
  classificationConfidence: number;
  
  // Body analysis results
  bodyAnalysis?: {
    parameters: number;
    tableAccess: number;
    businessRules: number;
    errorCodes: number;
    complexity: string;
    riskLevel: string;
  };
  
  // Correlation results (if CSHTML provided)
  correlation?: {
    confidence: number;
    fieldMappings: number;
    unmatchedFields: string[];
  };
  
  // Generated code (if requested)
  generatedCode?: GeneratedAPIRoute;
}

/**
 * Analyze a stored procedure and optionally generate code
 */
export function analyzeStoredProc(
  procedureName: string,
  params: SPParameterInfo[],
  form?: CSHTMLForm,
  errorMappings?: ErrorMapping[],
  generateCode: boolean = true
): SPDLLAnalysisResult {
  // Step 1: Classify the SP
  const classification = spClassificationEngine.classifyByName(procedureName);
  const moduleName = spClassificationEngine.extractModule(procedureName);
  
  // Determine route
  const suggestedRoute = classification.rule
    ? spClassificationEngine.generateRoute(
        procedureName,
        classification.rule,
        moduleName || undefined
      )
    : '/api/unknown';
  
  const result: SPDLLAnalysisResult = {
    procedureName,
    actionType: classification.rule?.actionType || 'unknown',
    httpMethod: classification.rule?.httpMethod || 'POST',
    suggestedRoute,
    moduleName,
    classificationConfidence: classification.confidence
  };
  
  // Step 2: Correlate with CSHTML form (if provided)
  if (form && classification.rule) {
    const correlation = cspCorrelationEngine.correlateFormToSP(
      form,
      procedureName,
      params,
      classification.rule.actionType
    );
    
    result.correlation = {
      confidence: correlation.confidence,
      fieldMappings: correlation.fieldMappings.length,
      unmatchedFields: [
        ...correlation.unmatchedCSHTMLFields,
        ...correlation.unmatchedSPParams
      ]
    };
  }
  
  // Step 3: Generate API code (if requested)
  if (generateCode && classification.rule) {
    const config: APIRouteConfig = {
      spName: procedureName,
      httpMethod: classification.rule.httpMethod,
      routePath: suggestedRoute,
      moduleName: moduleName || 'unknown',
      entityName: moduleName || 'Entity',
      parameters: params,
      errorMappings: errorMappings || [],
      requiredMiddleware: ['auth'],
      requiredPermissions: classification.rule.requiresAuth
        ? [`${moduleName}.Can${classification.rule.actionType === 'create' ? 'Add' : classification.rule.actionType === 'update' ? 'Edit' : 'View'}`]
        : [],
      generateSwagger: true
    };
    
    result.generatedCode = apiRouteGenerator.generateRoute(config);
  }
  
  return result;
}

/**
 * Full analysis including SP body parsing
 */
export function analyzeStoredProcWithBody(
  procedureName: string,
  schema: string,
  bodyText: string,
  params?: SPParameterInfo[],
  form?: CSHTMLForm,
  errorMappings?: ErrorMapping[],
  generateCode: boolean = true
): SPDLLAnalysisResult {
  // Get basic analysis
  const result = analyzeStoredProc(procedureName, params || [], form, errorMappings, generateCode);
  
  // Perform body analysis
  const bodyAnalysis = spBodyAnalyzer.analyze(procedureName, schema, bodyText);
  
  result.bodyAnalysis = {
    parameters: bodyAnalysis.parameters.length,
    tableAccess: bodyAnalysis.tableAccess.length,
    businessRules: bodyAnalysis.businessRules.length,
    errorCodes: bodyAnalysis.errorCodes.length,
    complexity: bodyAnalysis.complexity.migrationComplexity,
    riskLevel: bodyAnalysis.complexity.riskLevel
  };
  
  return result;
}

/**
 * Batch analyze multiple stored procedures
 */
export function batchAnalyze(
  procedures: Array<{
    name: string;
    params: SPParameterInfo[];
    form?: CSHTMLForm;
    errorMappings?: ErrorMapping[];
  }>,
  generateCode: boolean = true
): SPDLLAnalysisResult[] {
  return procedures.map(p => 
    analyzeStoredProc(p.name, p.params, p.form, p.errorMappings, generateCode)
  );
}

/**
 * Get classification rules by category
 */
export function getRulesByCategory(
  category: SPClassificationRule['category']
): SPClassificationRule[] {
  return spClassificationEngine.getRulesByCategory(category);
}

/**
 * Get all dropdown-related SP rules
 */
export function getDropdownRules(): SPClassificationRule[] {
  return spClassificationEngine.getRulesByCategory('dropdown');
}

/**
 * Get all CRUD-related SP rules
 */
export function getCRDRules(): SPClassificationRule[] {
  return spClassificationEngine.getRulesByCategory('crud');
}

/**
 * Get all workflow-related SP rules
 */
export function getWorkflowRules(): SPClassificationRule[] {
  return spClassificationEngine.getRulesByCategory('workflow');
}

/**
 * Get all report-related SP rules
 */
export function getReportRules(): SPClassificationRule[] {
  return spClassificationEngine.getRulesByCategory('report');
}
