// Project components for Unified Intelligence Bank
// This module provides project selection and context management functionality

// Components
export { ProjectSelector, default as ProjectSelectorDefault } from './ProjectSelector'
export type { ProjectInfo, ProjectScope, ScopeType } from './ProjectSelector'

export { ContextToggle, DEFAULT_CONTEXT_SETTINGS, default as ContextToggleDefault } from './ContextToggle'
export type { 
  ContextMode, 
  ErrorPatternScope, 
  IntelligenceScope, 
  ProjectContextSettings 
} from './ContextToggle'

export { ProjectScopeHeader, default as ProjectScopeHeaderDefault } from './ProjectScopeHeader'
