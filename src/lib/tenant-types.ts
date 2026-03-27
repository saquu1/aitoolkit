// ============================================================================
// MULTI-TENANT TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'
export type CompanyRole = 'owner' | 'admin' | 'member'
export type ProjectRole = 'manager' | 'developer' | 'viewer'
export type ProjectStatus = 'planning' | 'in_development' | 'testing' | 'production' | 'archived'
export type SoftwareType = 'HIS' | 'ERP' | 'CRM' | 'E-Commerce' | 'LMS' | 'Custom'

// ============================================================================
// COMPANY / TENANT TYPES
// ============================================================================

export interface CompanySettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  numberFormat: string
  aiEngine: 'offline' | 'openai' | 'anthropic' | 'azure'
  aiModel?: string
  features: {
    schemaParser: boolean
    erdGenerator: boolean
    prismaGenerator: boolean
    uatGenerator: boolean
    aiQuestions: boolean
    multiTenant: boolean
  }
}

export interface TenantLimits {
  maxProjects: number
  maxTablesPerProject: number
  maxUsers: number
  maxWorkspaces: number
  maxApiKeys: number
  aiCallsPerMonth: number
  storageLimitMB: number
}

export interface TenantUsage {
  projectsCount: number
  tablesCount: number
  usersCount: number
  workspacesCount: number
  apiKeysCount: number
  aiCallsThisMonth: number
  storageUsedMB: number
}

export interface Company {
  id: string
  name: string
  slug: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  domain?: string
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  trialEndsAt?: Date
  settings: CompanySettings
  limits: TenantLimits
  usage: TenantUsage
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

export interface WorkspaceSettings {
  defaultSoftwareType: SoftwareType
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
}

export interface Workspace {
  id: string
  companyId: string
  name: string
  slug: string
  description?: string
  settings: WorkspaceSettings
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface ProjectSettings {
  schemaDialect: 'mssql' | 'postgresql' | 'mysql' | 'sqlite'
  targetFramework: 'nextjs' | 'nestjs' | 'express'
  generateApiRoutes: boolean
  generateTests: boolean
  generateDocs: boolean
}

export interface ProjectStatistics {
  tablesCount: number
  columnsCount: number
  foreignKeysCount: number
  resolvedFKs: number
  missingTables: number
  modulesLinked: number
  lastAnalysisAt?: Date
  healthScore: number
}

export interface Project {
  id: string
  workspaceId?: string
  companyId: string
  name: string
  slug: string
  description?: string
  softwareType: SoftwareType
  status: ProjectStatus
  settings: ProjectSettings
  statistics: ProjectStatistics
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// USER MEMBERSHIP TYPES
// ============================================================================

export interface UserCompany {
  id: string
  userId: string
  companyId: string
  role: CompanyRole
  status: 'pending' | 'active' | 'suspended' | 'removed'
  invitedBy?: string
  invitedAt?: Date
  joinedAt?: Date
}

export interface UserProject {
  id: string
  userId: string
  projectId: string
  role: ProjectRole
  status: 'pending' | 'active' | 'suspended' | 'removed'
  permissions: string[]
}

// ============================================================================
// TENANT CONTEXT TYPE
// ============================================================================

export interface TenantContext {
  user: {
    id: string
    email: string
    name: string
  }
  company: Company
  workspace?: Workspace
  project?: Project
  membership: {
    companyRole: CompanyRole
    projectRole?: ProjectRole
    permissions: string[]
  }
}

// ============================================================================
// DEFAULT VALUES BY TIER
// ============================================================================

export const DEFAULT_LIMITS: Record<SubscriptionTier, TenantLimits> = {
  free: {
    maxProjects: 3,
    maxTablesPerProject: 50,
    maxUsers: 2,
    maxWorkspaces: 1,
    maxApiKeys: 2,
    aiCallsPerMonth: 100,
    storageLimitMB: 100,
  },
  starter: {
    maxProjects: 10,
    maxTablesPerProject: 200,
    maxUsers: 5,
    maxWorkspaces: 3,
    maxApiKeys: 5,
    aiCallsPerMonth: 1000,
    storageLimitMB: 500,
  },
  professional: {
    maxProjects: 50,
    maxTablesPerProject: 1000,
    maxUsers: 25,
    maxWorkspaces: 10,
    maxApiKeys: 20,
    aiCallsPerMonth: 10000,
    storageLimitMB: 2000,
  },
  enterprise: {
    maxProjects: -1, // Unlimited
    maxTablesPerProject: -1,
    maxUsers: -1,
    maxWorkspaces: -1,
    maxApiKeys: -1,
    aiCallsPerMonth: -1,
    storageLimitMB: -1,
  },
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: 'en-US',
  aiEngine: 'offline',
  features: {
    schemaParser: true,
    erdGenerator: true,
    prismaGenerator: true,
    uatGenerator: true,
    aiQuestions: true,
    multiTenant: false,
  },
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  schemaDialect: 'mssql',
  targetFramework: 'nextjs',
  generateApiRoutes: true,
  generateTests: true,
  generateDocs: true,
}

export const DEFAULT_PROJECT_STATISTICS: ProjectStatistics = {
  tablesCount: 0,
  columnsCount: 0,
  foreignKeysCount: 0,
  resolvedFKs: 0,
  missingTables: 0,
  modulesLinked: 0,
  healthScore: 0,
}
