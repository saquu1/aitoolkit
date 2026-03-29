// =============================================================================
// Multi-Tenant Architecture Types and RBAC System
// Step 5: Enterprise-grade multi-tenancy with role-based access control
// =============================================================================

// =============================================================================
// TENANT HIERARCHY
// =============================================================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  domain?: string;
  isActive: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'active' | 'past_due' | 'cancelled' | 'trialing';
  trialEndsAt?: Date;
  billingEmail?: string;
  billingAddress?: Address;
  settings: CompanySettings;
  limits: TenantLimits;
  usage: TenantUsage;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  softwareType: SoftwareType;
  status: 'planning' | 'in_development' | 'testing' | 'production' | 'archived';
  settings: ProjectSettings;
  statistics: ProjectStatistics;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  timezone: string;
  locale: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCompany {
  id: string;
  userId: string;
  companyId: string;
  role: CompanyRole;
  status: 'pending' | 'active' | 'suspended' | 'removed';
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  settings: UserCompanySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProject {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  status: 'pending' | 'active' | 'suspended' | 'removed';
  permissions: string[];
  settings: UserProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// ROLES
// =============================================================================

export type CompanyRole = 'owner' | 'admin' | 'member';
export type ProjectRole = 'manager' | 'developer' | 'viewer';

export interface RoleDefinition {
  name: string;
  displayName: string;
  description: string;
  level: number;
  permissions: Permission[];
  inherits?: string[];
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'export' | 'import';
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'own';
  value: unknown;
}

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  // Company-level roles
  owner: {
    name: 'owner',
    displayName: 'Owner',
    description: 'Full access to company and all projects. Can manage billing and users.',
    level: 100,
    permissions: [
      { resource: '*', action: 'manage' },
      { resource: 'billing', action: 'manage' },
      { resource: 'users', action: 'manage' },
      { resource: 'company', action: 'manage' }
    ]
  },
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Manage users, projects, and settings within the company.',
    level: 80,
    permissions: [
      { resource: 'users', action: 'manage' },
      { resource: 'projects', action: 'manage' },
      { resource: 'workspaces', action: 'manage' },
      { resource: 'settings', action: 'manage' },
      { resource: 'integrations', action: 'manage' }
    ],
    inherits: ['member']
  },
  member: {
    name: 'member',
    displayName: 'Member',
    description: 'Access to assigned projects and company resources.',
    level: 50,
    permissions: [
      { resource: 'projects', action: 'read' },
      { resource: 'workspaces', action: 'read' },
      { resource: 'profile', action: 'manage' }
    ]
  },

  // Project-level roles
  manager: {
    name: 'manager',
    displayName: 'Project Manager',
    description: 'Full project management including assigning tasks and developers.',
    level: 70,
    permissions: [
      { resource: 'project', action: 'manage' },
      { resource: 'modules', action: 'manage' },
      { resource: 'schemas', action: 'manage' },
      { resource: 'blueprints', action: 'manage' },
      { resource: 'rules', action: 'manage' },
      { resource: 'tasks', action: 'manage' },
      { resource: 'team', action: 'manage' },
      { resource: 'exports', action: 'manage' }
    ]
  },
  developer: {
    name: 'developer',
    displayName: 'Developer',
    description: 'Edit modules, generate schemas, and manage technical artifacts.',
    level: 50,
    permissions: [
      { resource: 'project', action: 'read' },
      { resource: 'modules', action: 'manage' },
      { resource: 'schemas', action: 'manage' },
      { resource: 'blueprints', action: 'create' },
      { resource: 'blueprints', action: 'read' },
      { resource: 'blueprints', action: 'update' },
      { resource: 'rules', action: 'create' },
      { resource: 'rules', action: 'read' },
      { resource: 'rules', action: 'update' },
      { resource: 'exports', action: 'create' }
    ]
  },
  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to project information.',
    level: 20,
    permissions: [
      { resource: 'project', action: 'read' },
      { resource: 'modules', action: 'read' },
      { resource: 'schemas', action: 'read' },
      { resource: 'blueprints', action: 'read' },
      { resource: 'rules', action: 'read' }
    ]
  }
};

// =============================================================================
// SUBSCRIPTION TIERS
// =============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface SubscriptionTierDefinition {
  name: string;
  displayName: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  features: TierFeature[];
  limits: TenantLimits;
  recommended?: boolean;
}

export interface TierFeature {
  name: string;
  description: string;
  included: boolean;
  limit?: number;
  unit?: string;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierDefinition> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    billingPeriod: 'monthly',
    features: [
      { name: 'Projects', description: 'Number of projects', included: true, limit: 1 },
      { name: 'Users', description: 'Team members', included: true, limit: 2 },
      { name: 'Tables', description: 'Tables per project', included: true, limit: 10 },
      { name: 'Modules', description: 'Module registry access', included: true, limit: 10 },
      { name: 'Basic AI', description: 'Column intelligence', included: true },
      { name: 'Export', description: 'Export schemas', included: true, limit: 5, unit: '/month' },
      { name: 'Support', description: 'Email support', included: false },
      { name: 'API Access', description: 'REST API access', included: false }
    ],
    limits: {
      maxProjects: 1,
      maxUsers: 2,
      maxTables: 10,
      maxModules: 10,
      maxExports: 5,
      maxApiCalls: 100,
      maxStorage: 100 // MB
    }
  },
  starter: {
    name: 'starter',
    displayName: 'Starter',
    price: 29,
    billingPeriod: 'monthly',
    features: [
      { name: 'Projects', description: 'Number of projects', included: true, limit: 5 },
      { name: 'Users', description: 'Team members', included: true, limit: 10 },
      { name: 'Tables', description: 'Tables per project', included: true, limit: 50 },
      { name: 'Modules', description: 'Full module registry', included: true, limit: 460 },
      { name: 'AI Questions', description: 'Intelligent Q&A', included: true },
      { name: 'Screen Blueprints', description: 'Auto-generate UI designs', included: true },
      { name: 'Business Rules', description: 'Rule engine', included: true },
      { name: 'Export', description: 'Unlimited exports', included: true },
      { name: 'Support', description: 'Priority email support', included: true },
      { name: 'API Access', description: 'REST API access', included: true, limit: 1000, unit: '/day' }
    ],
    limits: {
      maxProjects: 5,
      maxUsers: 10,
      maxTables: 50,
      maxModules: 460,
      maxExports: -1, // unlimited
      maxApiCalls: 1000,
      maxStorage: 1024 // MB
    }
  },
  professional: {
    name: 'professional',
    displayName: 'Professional',
    price: 99,
    billingPeriod: 'monthly',
    recommended: true,
    features: [
      { name: 'Projects', description: 'Number of projects', included: true, limit: 25 },
      { name: 'Users', description: 'Team members', included: true, limit: 50 },
      { name: 'Tables', description: 'Tables per project', included: true, limit: -1 },
      { name: 'Modules', description: 'Full module registry', included: true, limit: 460 },
      { name: 'All AI Features', description: 'Questions, Blueprints, Rules, Stories', included: true },
      { name: 'Multi-workspace', description: 'Organize projects by team', included: true },
      { name: 'Custom Modules', description: 'Create custom module templates', included: true },
      { name: 'Version Control', description: 'Schema versioning', included: true },
      { name: 'Integrations', description: 'Jira, Confluence, GitHub', included: true },
      { name: 'API Access', description: 'Unlimited API calls', included: true }
    ],
    limits: {
      maxProjects: 25,
      maxUsers: 50,
      maxTables: -1, // unlimited
      maxModules: 460,
      maxExports: -1,
      maxApiCalls: -1,
      maxStorage: 10240 // MB
    }
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 0, // Contact sales
    billingPeriod: 'yearly',
    features: [
      { name: 'Projects', description: 'Unlimited projects', included: true },
      { name: 'Users', description: 'Unlimited users', included: true },
      { name: 'Everything in Professional', description: 'All pro features', included: true },
      { name: 'SSO', description: 'SAML/SSO integration', included: true },
      { name: 'SCIM', description: 'User provisioning', included: true },
      { name: 'Custom Branding', description: 'White-label options', included: true },
      { name: 'Dedicated Support', description: '24/7 phone support', included: true },
      { name: 'SLA', description: '99.9% uptime SLA', included: true },
      { name: 'On-premise', description: 'Self-hosted option', included: true },
      { name: 'Custom AI', description: 'Train custom models', included: true }
    ],
    limits: {
      maxProjects: -1,
      maxUsers: -1,
      maxTables: -1,
      maxModules: 460,
      maxExports: -1,
      maxApiCalls: -1,
      maxStorage: -1
    }
  }
};

// =============================================================================
// TENANT LIMITS & USAGE
// =============================================================================

export interface TenantLimits {
  maxProjects: number;
  maxUsers: number;
  maxTables: number;
  maxModules: number;
  maxExports: number;
  maxApiCalls: number;
  maxStorage: number; // MB
}

export interface TenantUsage {
  projects: number;
  users: number;
  tables: number;
  modules: number;
  exportsThisMonth: number;
  apiCallsToday: number;
  storageUsed: number; // MB
  lastUpdated: Date;
}

// =============================================================================
// SETTINGS TYPES
// =============================================================================

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface CompanySettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  language: string;
  twoFactorRequired: boolean;
  sessionTimeout: number; // minutes
  ipWhitelist?: string[];
  allowedDomains?: string[];
  notifications: NotificationSettings;
}

export interface WorkspaceSettings {
  isVisible: boolean;
  defaultProjectRole: ProjectRole;
  autoAddNewMembers: boolean;
}

export interface ProjectSettings {
  softwareType: SoftwareType;
  targetDatabase: 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite';
  useUUID: boolean;
  softDelete: boolean;
  auditFields: boolean;
  generateApi: boolean;
  generateUI: boolean;
}

export interface ProjectStatistics {
  totalTables: number;
  totalColumns: number;
  totalFKs: number;
  fkResolutionPercentage: number;
  modulesCovered: number;
  rulesGenerated: number;
  storiesGenerated: number;
  lastActivity: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  defaultView: string;
  editorSettings: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
  };
  notifications: NotificationSettings;
}

export interface UserCompanySettings {
  defaultWorkspace?: string;
  notifications: NotificationSettings;
}

export interface UserProjectSettings {
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  slack?: string;
  digest: 'instant' | 'daily' | 'weekly' | 'none';
}

export type SoftwareType = 'HIS' | 'ERP' | 'CRM' | 'E-Commerce' | 'LMS' | 'Custom';

// =============================================================================
// RBAC ENGINE
// =============================================================================

export class RBACEngine {
  /**
   * Check if user has permission for a specific action on a resource
   */
  static hasPermission(
    userRole: string,
    resource: string,
    action: Permission['action'],
    context?: Record<string, unknown>
  ): boolean {
    const roleDef = ROLE_DEFINITIONS[userRole];
    if (!roleDef) return false;

    // Check direct permissions
    for (const permission of roleDef.permissions) {
      if (this.matchesPermission(permission, resource, action)) {
        // Check conditions if any
        if (permission.conditions && context) {
          return this.checkConditions(permission.conditions, context);
        }
        return true;
      }
    }

    // Check inherited roles
    if (roleDef.inherits) {
      for (const inheritedRole of roleDef.inherits) {
        if (this.hasPermission(inheritedRole, resource, action, context)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if permission matches resource and action
   */
  private static matchesPermission(
    permission: Permission,
    resource: string,
    action: Permission['action']
  ): boolean {
    // Wildcard resource matches everything
    if (permission.resource === '*') return true;

    // Exact resource match
    if (permission.resource === resource) {
      // Wildcard action matches everything
      if (permission.action === 'manage') return true;
      return permission.action === action;
    }

    return false;
  }

  /**
   * Check permission conditions against context
   */
  private static checkConditions(
    conditions: PermissionCondition[],
    context: Record<string, unknown>
  ): boolean {
    for (const condition of conditions) {
      const value = context[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'not_equals':
          if (value === condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false;
          break;
        case 'not_in':
          if (Array.isArray(condition.value) && condition.value.includes(value)) return false;
          break;
        case 'own':
          if (value !== context.userId) return false;
          break;
      }
    }
    return true;
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(roleName: string): Permission[] {
    const roleDef = ROLE_DEFINITIONS[roleName];
    if (!roleDef) return [];

    const permissions = [...roleDef.permissions];

    // Add inherited permissions
    if (roleDef.inherits) {
      for (const inheritedRole of roleDef.inherits) {
        permissions.push(...this.getRolePermissions(inheritedRole));
      }
    }

    return permissions;
  }

  /**
   * Check if user can access a project
   */
  static canAccessProject(
    userCompanyRole: CompanyRole,
    userProjectRole: ProjectRole | null,
    resource: string,
    action: Permission['action']
  ): boolean {
    // Company owner has full access
    if (userCompanyRole === 'owner') return true;
    
    // Company admin has full access
    if (userCompanyRole === 'admin') return true;

    // Check project-level role
    if (userProjectRole) {
      return this.hasPermission(userProjectRole, resource, action);
    }

    // Member with no project role has read-only access
    if (userCompanyRole === 'member') {
      return action === 'read';
    }

    return false;
  }

  /**
   * Check if user has higher or equal role
   */
  static compareRoles(role1: string, role2: string): number {
    const def1 = ROLE_DEFINITIONS[role1];
    const def2 = ROLE_DEFINITIONS[role2];
    
    if (!def1 || !def2) return 0;
    return def1.level - def2.level;
  }
}

// =============================================================================
// TENANT SERVICE
// =============================================================================

export class TenantService {
  /**
   * Check if tenant can create a new project
   */
  static canCreateProject(company: Company): { allowed: boolean; reason?: string } {
    if (!company.isActive) {
      return { allowed: false, reason: 'Company account is not active' };
    }

    if (company.subscriptionStatus === 'cancelled') {
      return { allowed: false, reason: 'Subscription is cancelled' };
    }

    const tier = SUBSCRIPTION_TIERS[company.subscriptionTier];
    const limits = tier.limits;

    if (limits.maxProjects !== -1 && company.usage.projects >= limits.maxProjects) {
      return { 
        allowed: false, 
        reason: `Project limit reached (${limits.maxProjects}). Upgrade your plan.` 
      };
    }

    return { allowed: true };
  }

  /**
   * Check if tenant can add a new user
   */
  static canAddUser(company: Company): { allowed: boolean; reason?: string } {
    if (!company.isActive) {
      return { allowed: false, reason: 'Company account is not active' };
    }

    const tier = SUBSCRIPTION_TIERS[company.subscriptionTier];
    const limits = tier.limits;

    if (limits.maxUsers !== -1 && company.usage.users >= limits.maxUsers) {
      return { 
        allowed: false, 
        reason: `User limit reached (${limits.maxUsers}). Upgrade your plan.` 
      };
    }

    return { allowed: true };
  }

  /**
   * Check if tenant can upload more tables
   */
  static canUploadTables(company: Company, additionalTables: number): { allowed: boolean; reason?: string } {
    if (!company.isActive) {
      return { allowed: false, reason: 'Company account is not active' };
    }

    const tier = SUBSCRIPTION_TIERS[company.subscriptionTier];
    const limits = tier.limits;

    if (limits.maxTables !== -1 && company.usage.tables + additionalTables > limits.maxTables) {
      return { 
        allowed: false, 
        reason: `Table limit would be exceeded. Current: ${company.usage.tables}, Limit: ${limits.maxTables}` 
      };
    }

    return { allowed: true };
  }

  /**
   * Get tenant limits for display
   */
  static getTenantLimitsDisplay(company: Company): Record<string, { current: number; limit: number | 'unlimited'; percentage?: number }> {
    const tier = SUBSCRIPTION_TIERS[company.subscriptionTier];
    const limits = tier.limits;

    return {
      projects: {
        current: company.usage.projects,
        limit: limits.maxProjects === -1 ? 'unlimited' : limits.maxProjects,
        percentage: limits.maxProjects === -1 ? undefined : (company.usage.projects / limits.maxProjects) * 100
      },
      users: {
        current: company.usage.users,
        limit: limits.maxUsers === -1 ? 'unlimited' : limits.maxUsers,
        percentage: limits.maxUsers === -1 ? undefined : (company.usage.users / limits.maxUsers) * 100
      },
      tables: {
        current: company.usage.tables,
        limit: limits.maxTables === -1 ? 'unlimited' : limits.maxTables,
        percentage: limits.maxTables === -1 ? undefined : (company.usage.tables / limits.maxTables) * 100
      },
      storage: {
        current: company.usage.storageUsed,
        limit: limits.maxStorage === -1 ? 'unlimited' : limits.maxStorage,
        percentage: limits.maxStorage === -1 ? undefined : (company.usage.storageUsed / limits.maxStorage) * 100
      }
    };
  }
}
