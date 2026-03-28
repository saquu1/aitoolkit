/**
 * Scope Utilities API Index
 * 
 * This module exports all scope-aware API utilities and types.
 */

// Types
export type {
  ScopeType,
  ProjectScope,
  ContextSettings,
  ScopeContext
} from './scope-utils'

// Constants
export { DEFAULT_CONTEXT_SETTINGS } from './scope-utils'

// Functions
export {
  parseScopeFromRequest,
  loadContextSettings,
  buildScopeContext,
  buildProjectFilter,
  buildEntityFilter,
  buildErrorPatternFilter,
  canPromoteToGlobal,
  getSharedProjectIds,
  createScopeBuilder
} from './scope-utils'

// Classes
export { ScopeAwareQueryBuilder } from './scope-utils'

// Default export
export { default as scopeUtils } from './scope-utils'
