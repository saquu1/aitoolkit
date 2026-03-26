/**
 * ROUTE REGISTRY - Single Source of Truth
 * ========================================
 * All routes defined in ONE place. Navigation, middleware, and types derive from this.
 * 
 * Principle 1 of 3: Route Registry prevents drift between NAV_ITEMS, middleware, and pages
 */

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

export const PUBLIC_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  authError: '/auth/error',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  analytics: '/analytics',
} as const

// =============================================================================
// PROTECTED ROUTES (Authentication required)
// =============================================================================

export const PROTECTED_ROUTES = {
  dashboard: '/dashboard',
  
  // Project routes - all under /project/[id]
  project: {
    // Base project route (overview/status)
    root: '/project',
    detail: (id: string) => `/project/${id}`,
    
    // Project sub-routes
    upload: (id: string) => `/project/${id}/upload`,
    files: (id: string) => `/project/${id}/files`,
    tables: (id: string) => `/project/${id}/tables`,
    procedures: (id: string) => `/project/${id}/procedures`,
    views: (id: string) => `/project/${id}/views`,
    fkResolution: (id: string) => `/project/${id}/fk-resolution`,
    schemaApply: (id: string) => `/project/${id}/schema-apply`,
    intelligence: (id: string) => `/project/${id}/intelligence`,
    modules: (id: string) => `/project/${id}/modules`,
    organization: (id: string) => `/project/${id}/organization`,
    prisma: (id: string) => `/project/${id}/prisma`,
    erdDesigner: (id: string) => `/project/${id}/erd-designer`,
    learning: (id: string) => `/project/${id}/learning`,
    prompts: (id: string) => `/project/${id}/prompts`,
    settings: (id: string) => `/project/${id}/settings`,
    
    // Additional routes found in project/[id]
    componentPreview: (id: string) => `/project/${id}/component-preview`,
    generate: (id: string) => `/project/${id}/generate`,
    parsers: (id: string) => `/project/${id}/parsers`,
    aiSuggestions: (id: string) => `/project/${id}/ai-suggestions`,
    sourceTracking: (id: string) => `/project/${id}/source-tracking`,
  },
  
  settings: '/settings',
  admin: '/admin',
} as const

// =============================================================================
// API ROUTES
// =============================================================================

export const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/auth',
  '/api/public',
  '/api/session-status',
  '/api/memory-stats',
  '/api/system/threads',
  '/api/chat-logs',
  '/api/chat-logs/analyze',  // Analyze and transfer to AI Dashboard
  '/api/raw-data',          // Raw data import - public for batch import
  '/api/raw-data/re-import', // Re-import raw data
  '/api/schema/stats',
  '/api/analytics',
  '/api/api-status',
  '/api/projects',
  '/api/file-system',
] as const

export const PROTECTED_API_ROUTES = [
  '/api/projects',
  '/api/project-status',
  '/api/project-intelligence',
  '/api/project-export',
  '/api/parsers',
  '/api/toolkit',
  '/api/ai',
  '/api/generate',
  '/api/migrate',
  '/api/schema',
  '/api/intelligence',
  '/api/export',
  '/api/download',
  '/api/file-system',
  '/api/file-manager',
  '/api/file-manager-v2',
  '/api/sp-generate',
  '/api/fk-resolution',
  '/api/backup',
  '/api/billing',
  '/api/collaboration',
  '/api/formatting',
  '/api/monitoring',
  '/api/multi-db',
  '/api/multi-tenant',
  '/api/notifications',
  '/api/pipeline',
  '/api/quality',
  '/api/validation',
  '/api/agents',
  '/api/phase2',
  '/api/phase3',
  '/api/session-status',
  '/api/session-actions',
  '/api/organization-building',
  '/api/schema-apply',
  '/api/prompts',
  '/api/memory-stats',
  '/api/system/threads',
  '/api/generators',
  '/api/views',
  '/api/intelligence-bank',
] as const

// =============================================================================
// DERIVED HELPERS FOR MIDDLEWARE
// =============================================================================

/**
 * Get all protected route prefixes for middleware matching
 * Extracts base paths from route definitions
 */
export function getProtectedPrefixes(): string[] {
  return [
    '/dashboard',
    '/project',  // Covers all /project/[id]/* routes
    '/settings',
    '/admin',
  ]
}

/**
 * Get all public page routes
 */
export function getPublicRoutes(): string[] {
  return Object.values(PUBLIC_ROUTES)
}

/**
 * Get all public API route prefixes
 */
export function getPublicApiPrefixes(): string[] {
  return [...PUBLIC_API_ROUTES]
}

// =============================================================================
// NAVIGATION ITEM TYPE AND DATA
// =============================================================================

import {
  Database, FileCode, Table2, Code, FileText, Key, Layers, Settings,
  Upload, Brain, GitBranch, BarChart3, BookOpen, Building2, Play, MessageSquare,
  Eye, Sparkles, Source, LucideIcon
} from 'lucide-react'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  path: string  // Relative path for the route
}

/**
 * Navigation items derived from ROUTES constant
 * This ensures NAV_ITEMS can never drift from actual routes
 */
export const PROJECT_NAV_ITEMS: NavItem[] = [
  { 
    key: 'status', 
    label: 'Status', 
    icon: BarChart3, 
    path: '' 
  },
  { 
    key: 'files', 
    label: 'Files', 
    icon: FileCode, 
    path: '/files' 
  },
  { 
    key: 'tables', 
    label: 'Tables', 
    icon: Table2, 
    path: '/tables' 
  },
  { 
    key: 'erd-designer', 
    label: 'ERD Designer', 
    icon: Layers, 
    path: '/erd-designer' 
  },
  { 
    key: 'procedures', 
    label: 'Procedures', 
    icon: Code, 
    path: '/procedures' 
  },
  { 
    key: 'views', 
    label: 'CSHTML Views', 
    icon: FileText, 
    path: '/views' 
  },
  { 
    key: 'fk-resolution', 
    label: 'FK Resolution', 
    icon: Key, 
    path: '/fk-resolution' 
  },
  { 
    key: 'schema-apply', 
    label: 'Schema Apply', 
    icon: Play, 
    path: '/schema-apply' 
  },
  { 
    key: 'intelligence', 
    label: 'Intelligence', 
    icon: Brain, 
    path: '/intelligence' 
  },
  { 
    key: 'modules', 
    label: 'Modules', 
    icon: GitBranch, 
    path: '/modules' 
  },
  { 
    key: 'organization', 
    label: 'Organization', 
    icon: Building2, 
    path: '/organization' 
  },
  { 
    key: 'prisma', 
    label: 'Prisma Schema', 
    icon: Layers, 
    path: '/prisma' 
  },
  { 
    key: 'learning', 
    label: 'Learning', 
    icon: BookOpen, 
    path: '/learning' 
  },
  { 
    key: 'prompts', 
    label: 'Prompts', 
    icon: MessageSquare, 
    path: '/prompts' 
  },
  { 
    key: 'component-preview', 
    label: 'Component Preview', 
    icon: Eye, 
    path: '/component-preview' 
  },
  { 
    key: 'settings', 
    label: 'Settings', 
    icon: Settings, 
    path: '/settings' 
  },
]

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PublicRoute = typeof PUBLIC_ROUTES[keyof typeof PUBLIC_ROUTES]
export type ProtectedRoute = typeof PROTECTED_ROUTES
