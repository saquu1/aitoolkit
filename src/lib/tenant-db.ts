// =============================================================================
// Multi-Tenant Database Service
// Step 5: Database operations for multi-tenant architecture
// =============================================================================

import { prisma } from './db';
import { RBACEngine, ROLE_DEFINITIONS, SUBSCRIPTION_TIERS, type CompanyRole, type ProjectRole, type SubscriptionTier } from './multi-tenant';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateCompanyInput {
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  domain?: string;
  subscriptionTier?: SubscriptionTier;
  billingEmail?: string;
}

export interface CreateWorkspaceInput {
  companyId: string;
  name: string;
  slug: string;
  description?: string;
}

export interface CreateProjectInput {
  companyId: string;
  workspaceId?: string;
  name: string;
  slug: string;
  description?: string;
  softwareType?: string;
  createdBy?: string;
}

export interface InviteUserInput {
  companyId: string;
  email: string;
  role: CompanyRole;
  projectId?: string;
  projectRole?: ProjectRole;
  invitedBy: string;
}

export interface UpdateCompanyUsageInput {
  projects?: number;
  users?: number;
  tables?: number;
  storage?: number;
}

// =============================================================================
// COMPANY SERVICE
// =============================================================================

export class CompanyService {
  /**
   * Create a new company with owner
   */
  static async createCompany(input: CreateCompanyInput, ownerId: string) {
    // Check if slug is unique
    const existing = await prisma.company.findUnique({
      where: { slug: input.slug }
    });
    
    if (existing) {
      throw new Error(`Company slug "${input.slug}" is already taken`);
    }

    // Create company and add owner in transaction
    const company = await prisma.$transaction(async (tx) => {
      // Create company
      const newCompany = await tx.company.create({
        data: {
          name: input.name,
          slug: input.slug,
          logo: input.logo,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          domain: input.domain,
          subscriptionTier: input.subscriptionTier || 'free',
          subscriptionStatus: 'trialing',
          billingEmail: input.billingEmail,
          settings: JSON.stringify({
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            currency: 'USD',
            language: 'en',
            twoFactorRequired: false,
            sessionTimeout: 30,
            notifications: { email: true, push: false, digest: 'daily' }
          }),
          limits: JSON.stringify(SUBSCRIPTION_TIERS[input.subscriptionTier || 'free'].limits),
          usage: JSON.stringify({
            projects: 0,
            users: 1,
            tables: 0,
            modules: 0,
            exportsThisMonth: 0,
            apiCallsToday: 0,
            storageUsed: 0,
            lastUpdated: new Date().toISOString()
          }),
          isActive: true
        }
      });

      // Add owner to company
      await tx.userCompany.create({
        data: {
          userId: ownerId,
          companyId: newCompany.id,
          role: 'owner',
          status: 'active',
          joinedAt: new Date()
        }
      });

      // Create default workspace
      await tx.workspace.create({
        data: {
          companyId: newCompany.id,
          name: 'Default Workspace',
          slug: 'default',
          description: 'Default workspace for the company',
          settings: JSON.stringify({
            isVisible: true,
            defaultProjectRole: 'developer',
            autoAddNewMembers: true
          }),
          isActive: true
        }
      });

      return newCompany;
    });

    return company;
  }

  /**
   * Get company by ID
   */
  static async getCompany(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspaces: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            userCompanies: { where: { status: 'active' } },
            projects: true,
            apiKeys: { where: { isActive: true } }
          }
        }
      }
    });
  }

  /**
   * Get company by slug
   */
  static async getCompanyBySlug(slug: string) {
    return prisma.company.findUnique({
      where: { slug },
      include: {
        workspaces: {
          where: { isActive: true }
        }
      }
    });
  }

  /**
   * Update company
   */
  static async updateCompany(companyId: string, data: Partial<CreateCompanyInput> & { isActive?: boolean }) {
    return prisma.company.update({
      where: { id: companyId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor !== undefined && { secondaryColor: data.secondaryColor }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.billingEmail !== undefined && { billingEmail: data.billingEmail }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }

  /**
   * Update company subscription
   */
  static async updateSubscription(
    companyId: string, 
    tier: SubscriptionTier, 
    status: string,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ) {
    const tierLimits = SUBSCRIPTION_TIERS[tier].limits;
    
    return prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: status,
        stripeCustomerId,
        stripeSubscriptionId,
        limits: JSON.stringify(tierLimits)
      }
    });
  }

  /**
   * Update company usage
   */
  static async updateUsage(companyId: string, input: UpdateCompanyUsageInput) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { usage: true }
    });

    if (!company) throw new Error('Company not found');

    const usage = JSON.parse(company.usage);
    const updatedUsage = {
      ...usage,
      ...(input.projects !== undefined && { projects: input.projects }),
      ...(input.users !== undefined && { users: input.users }),
      ...(input.tables !== undefined && { tables: input.tables }),
      ...(input.storage !== undefined && { storageUsed: input.storage }),
      lastUpdated: new Date().toISOString()
    };

    return prisma.company.update({
      where: { id: companyId },
      data: { usage: JSON.stringify(updatedUsage) }
    });
  }

  /**
   * Get companies for a user
   */
  static async getUserCompanies(userId: string) {
    return prisma.userCompany.findMany({
      where: { 
        userId,
        status: { in: ['active', 'pending'] }
      },
      include: {
        company: {
          include: {
            _count: {
              select: {
                projects: true,
                userCompanies: { where: { status: 'active' } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// =============================================================================
// WORKSPACE SERVICE
// =============================================================================

export class WorkspaceService {
  /**
   * Create a new workspace
   */
  static async createWorkspace(input: CreateWorkspaceInput) {
    // Check if slug is unique within company
    const existing = await prisma.workspace.findFirst({
      where: { 
        companyId: input.companyId,
        slug: input.slug 
      }
    });
    
    if (existing) {
      throw new Error(`Workspace slug "${input.slug}" already exists in this company`);
    }

    return prisma.workspace.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        settings: JSON.stringify({
          isVisible: true,
          defaultProjectRole: 'developer',
          autoAddNewMembers: true
        }),
        isActive: true
      }
    });
  }

  /**
   * Get workspace by ID
   */
  static async getWorkspace(workspaceId: string) {
    return prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        company: true,
        projects: {
          where: { status: { not: 'archived' } },
          orderBy: { name: 'asc' }
        }
      }
    });
  }

  /**
   * Get workspaces for a company
   */
  static async getCompanyWorkspaces(companyId: string) {
    return prisma.workspace.findMany({
      where: { 
        companyId,
        isActive: true 
      },
      include: {
        _count: {
          select: { projects: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(workspaceId: string, data: Partial<CreateWorkspaceInput> & { isActive?: boolean }) {
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }

  /**
   * Delete workspace
   */
  static async deleteWorkspace(workspaceId: string) {
    // Check if workspace has projects
    const projects = await prisma.project.count({
      where: { workspaceId }
    });

    if (projects > 0) {
      throw new Error('Cannot delete workspace with existing projects. Move or delete projects first.');
    }

    return prisma.workspace.delete({
      where: { id: workspaceId }
    });
  }
}

// =============================================================================
// PROJECT SERVICE
// =============================================================================

export class ProjectService {
  /**
   * Create a new project
   */
  static async createProject(input: CreateProjectInput) {
    // Check company limits
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
      select: { subscriptionTier: true, usage: true, isActive: true }
    });

    if (!company) throw new Error('Company not found');
    if (!company.isActive) throw new Error('Company is not active');

    const usage = JSON.parse(company.usage);
    const limits = SUBSCRIPTION_TIERS[company.subscriptionTier as SubscriptionTier]?.limits;

    if (limits && limits.maxProjects !== -1 && usage.projects >= limits.maxProjects) {
      throw new Error(`Project limit reached (${limits.maxProjects}). Please upgrade your plan.`);
    }

    // Check if slug is unique within company
    const existing = await prisma.project.findFirst({
      where: { 
        companyId: input.companyId,
        slug: input.slug 
      }
    });
    
    if (existing) {
      throw new Error(`Project slug "${input.slug}" already exists in this company`);
    }

    // Create project and update usage
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          companyId: input.companyId,
          workspaceId: input.workspaceId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          softwareType: input.softwareType || 'Custom',
          status: 'planning',
          createdBy: input.createdBy,
          settings: JSON.stringify({
            softwareType: input.softwareType || 'Custom',
            targetDatabase: 'postgresql',
            useUUID: true,
            softDelete: true,
            auditFields: true,
            generateApi: true,
            generateUI: true
          }),
          statistics: JSON.stringify({
            totalTables: 0,
            totalColumns: 0,
            totalFKs: 0,
            fkResolutionPercentage: 0,
            modulesCovered: 0,
            rulesGenerated: 0,
            storiesGenerated: 0
          })
        }
      });

      // Update company usage
      await tx.company.update({
        where: { id: input.companyId },
        data: {
          usage: JSON.stringify({
            ...usage,
            projects: usage.projects + 1,
            lastUpdated: new Date().toISOString()
          })
        }
      });

      return newProject;
    });

    return project;
  }

  /**
   * Get project by ID
   */
  static async getProject(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: true,
        workspace: true,
        userProjects: {
          where: { status: 'active' },
          include: {
            user: {
              select: { id: true, email: true, name: true, firstName: true, lastName: true, avatar: true }
            }
          }
        }
      }
    });
  }

  /**
   * Get projects for a company
   */
  static async getCompanyProjects(companyId: string, workspaceId?: string) {
    return prisma.project.findMany({
      where: { 
        companyId,
        ...(workspaceId && { workspaceId }),
        status: { not: 'archived' }
      },
      include: {
        workspace: { select: { id: true, name: true } },
        _count: {
          select: { userProjects: { where: { status: 'active' } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Get projects for a user
   */
  static async getUserProjects(userId: string) {
    return prisma.userProject.findMany({
      where: { 
        userId,
        status: 'active'
      },
      include: {
        project: {
          include: {
            company: { select: { id: true, name: true, logo: true } },
            workspace: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update project
   */
  static async updateProject(projectId: string, data: Partial<CreateProjectInput> & { status?: string }) {
    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.softwareType && { softwareType: data.softwareType }),
        ...(data.workspaceId !== undefined && { workspaceId: data.workspaceId }),
        ...(data.status && { status: data.status })
      }
    });
  }

  /**
   * Update project statistics
   */
  static async updateStatistics(projectId: string, stats: Record<string, number>) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { statistics: true, companyId: true }
    });

    if (!project) throw new Error('Project not found');

    const currentStats = JSON.parse(project.statistics);
    const updatedStats = { ...currentStats, ...stats };

    // Update project stats
    await prisma.project.update({
      where: { id: projectId },
      data: { statistics: JSON.stringify(updatedStats) }
    });

    // Update company usage if tables changed
    if (stats.totalTables !== undefined) {
      const company = await prisma.company.findUnique({
        where: { id: project.companyId },
        select: { usage: true }
      });

      if (company) {
        const usage = JSON.parse(company.usage);
        await prisma.company.update({
          where: { id: project.companyId },
          data: {
            usage: JSON.stringify({
              ...usage,
              tables: stats.totalTables,
              lastUpdated: new Date().toISOString()
            })
          }
        });
      }
    }
  }

  /**
   * Archive project
   */
  static async archiveProject(projectId: string) {
    return prisma.project.update({
      where: { id: projectId },
      data: { status: 'archived' }
    });
  }

  /**
   * Delete project
   */
  static async deleteProject(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true }
    });

    if (!project) throw new Error('Project not found');

    return prisma.$transaction(async (tx) => {
      // Delete project
      await tx.project.delete({
        where: { id: projectId }
      });

      // Update company usage
      const company = await tx.company.findUnique({
        where: { id: project.companyId },
        select: { usage: true }
      });

      if (company) {
        const usage = JSON.parse(company.usage);
        await tx.company.update({
          where: { id: project.companyId },
          data: {
            usage: JSON.stringify({
              ...usage,
              projects: Math.max(0, usage.projects - 1),
              lastUpdated: new Date().toISOString()
            })
          }
        });
      }
    });
  }
}

// =============================================================================
// USER COMPANY SERVICE
// =============================================================================

export class UserCompanyService {
  /**
   * Add user to company
   */
  static async addUserToCompany(userId: string, companyId: string, role: CompanyRole, invitedBy?: string) {
    // Check if user is already in company
    const existing = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } }
    });

    if (existing) {
      // Update existing membership
      return prisma.userCompany.update({
        where: { id: existing.id },
        data: {
          role,
          status: 'active',
          joinedAt: existing.joinedAt || new Date()
        }
      });
    }

    // Check company limits
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { subscriptionTier: true, usage: true, isActive: true }
    });

    if (!company) throw new Error('Company not found');
    if (!company.isActive) throw new Error('Company is not active');

    const usage = JSON.parse(company.usage);
    const limits = SUBSCRIPTION_TIERS[company.subscriptionTier as SubscriptionTier]?.limits;

    if (limits && limits.maxUsers !== -1 && usage.users >= limits.maxUsers) {
      throw new Error(`User limit reached (${limits.maxUsers}). Please upgrade your plan.`);
    }

    // Add user and update usage
    return prisma.$transaction(async (tx) => {
      const userCompany = await tx.userCompany.create({
        data: {
          userId,
          companyId,
          role,
          status: 'active',
          invitedBy,
          invitedAt: new Date(),
          joinedAt: new Date()
        }
      });

      // Update company usage
      await tx.company.update({
        where: { id: companyId },
        data: {
          usage: JSON.stringify({
            ...usage,
            users: usage.users + 1,
            lastUpdated: new Date().toISOString()
          })
        }
      });

      return userCompany;
    });
  }

  /**
   * Update user role in company
   */
  static async updateUserRole(userId: string, companyId: string, role: CompanyRole) {
    return prisma.userCompany.update({
      where: { userId_companyId: { userId, companyId } },
      data: { role }
    });
  }

  /**
   * Remove user from company
   */
  static async removeUserFromCompany(userId: string, companyId: string) {
    const membership = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } }
    });

    if (!membership) throw new Error('User is not a member of this company');
    if (membership.role === 'owner') throw new Error('Cannot remove the owner from the company');

    return prisma.$transaction(async (tx) => {
      // Remove user's project memberships
      await tx.userProject.deleteMany({
        where: { 
          userId,
          project: { companyId }
        }
      });

      // Remove user from company
      await tx.userCompany.delete({
        where: { id: membership.id }
      });

      // Update company usage
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { usage: true }
      });

      if (company) {
        const usage = JSON.parse(company.usage);
        await tx.company.update({
          where: { id: companyId },
          data: {
            usage: JSON.stringify({
              ...usage,
              users: Math.max(0, usage.users - 1),
              lastUpdated: new Date().toISOString()
            })
          }
        });
      }
    });
  }

  /**
   * Get user's role in company
   */
  static async getUserRole(userId: string, companyId: string) {
    const membership = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } }
    });

    return membership?.role as CompanyRole | null;
  }

  /**
   * Check if user has access to company
   */
  static async hasCompanyAccess(userId: string, companyId: string) {
    const membership = await prisma.userCompany.findFirst({
      where: { 
        userId, 
        companyId,
        status: 'active'
      }
    });

    return !!membership;
  }
}

// =============================================================================
// USER PROJECT SERVICE
// =============================================================================

export class UserProjectService {
  /**
   * Add user to project
   */
  static async addUserToProject(
    userId: string, 
    projectId: string, 
    role: ProjectRole,
    permissions: string[] = []
  ) {
    // Check if user is already in project
    const existing = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });

    if (existing) {
      return prisma.userProject.update({
        where: { id: existing.id },
        data: {
          role,
          permissions: JSON.stringify(permissions),
          status: 'active'
        }
      });
    }

    return prisma.userProject.create({
      data: {
        userId,
        projectId,
        role,
        permissions: JSON.stringify(permissions),
        status: 'active'
      }
    });
  }

  /**
   * Update user role in project
   */
  static async updateUserRole(userId: string, projectId: string, role: ProjectRole, permissions?: string[]) {
    const data: { role: string; permissions?: string } = { role };
    if (permissions) data.permissions = JSON.stringify(permissions);

    return prisma.userProject.update({
      where: { userId_projectId: { userId, projectId } },
      data
    });
  }

  /**
   * Remove user from project
   */
  static async removeUserFromProject(userId: string, projectId: string) {
    return prisma.userProject.delete({
      where: { userId_projectId: { userId, projectId } }
    });
  }

  /**
   * Get user's role in project
   */
  static async getUserRole(userId: string, projectId: string) {
    const membership = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });

    return membership?.role as ProjectRole | null;
  }

  /**
   * Check if user has access to project
   */
  static async hasProjectAccess(userId: string, projectId: string) {
    // Check direct project access
    const projectMembership = await prisma.userProject.findFirst({
      where: { 
        userId, 
        projectId,
        status: 'active'
      }
    });

    if (projectMembership) return true;

    // Check company access (company owner/admin has access to all projects)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true }
    });

    if (!project) return false;

    const companyMembership = await prisma.userCompany.findFirst({
      where: { 
        userId, 
        companyId: project.companyId,
        status: 'active',
        role: { in: ['owner', 'admin'] }
      }
    });

    return !!companyMembership;
  }

  /**
   * Get user permissions for project
   */
  static async getUserPermissions(userId: string, projectId: string) {
    const projectMembership = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });

    const projectRole = projectMembership?.role as ProjectRole | null;
    const customPermissions = projectMembership?.permissions 
      ? JSON.parse(projectMembership.permissions) 
      : [];

    // Get company role for broader permissions
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true }
    });

    let companyRole: CompanyRole | null = null;
    if (project) {
      const companyMembership = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId, companyId: project.companyId } }
      });
      companyRole = companyMembership?.role as CompanyRole | null;
    }

    // Get role permissions
    const rolePermissions = projectRole 
      ? RBACEngine.getRolePermissions(projectRole) 
      : [];

    return {
      projectRole,
      companyRole,
      rolePermissions,
      customPermissions,
      hasFullAccess: companyRole === 'owner' || companyRole === 'admin'
    };
  }
}

// =============================================================================
// API KEY SERVICE
// =============================================================================

export class APIKeyService {
  /**
   * Generate a new API key
   */
  static generateKey(): { key: string; hash: string; prefix: string } {
    const crypto = require('crypto');
    const key = `sk_${crypto.randomBytes(32).toString('base64url')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12);
    
    return { key, hash, prefix };
  }

  /**
   * Create API key for company
   */
  static async createAPIKey(companyId: string, name: string, permissions: string[] = [], rateLimit: number = 1000) {
    const { key, hash, prefix } = this.generateKey();

    await prisma.aPIKey.create({
      data: {
        companyId,
        name,
        keyHash: hash,
        prefix,
        permissions: JSON.stringify(permissions),
        rateLimit,
        isActive: true
      }
    });

    // Return the actual key only once
    return { key, prefix };
  }

  /**
   * Validate API key
   */
  static async validateAPIKey(key: string) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await prisma.aPIKey.findUnique({
      where: { keyHash: hash },
      include: { company: true }
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used
    await prisma.aPIKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      apiKey,
      company: apiKey.company,
      permissions: JSON.parse(apiKey.permissions)
    };
  }

  /**
   * Revoke API key
   */
  static async revokeAPIKey(apiKeyId: string) {
    return prisma.aPIKey.update({
      where: { id: apiKeyId },
      data: { isActive: false }
    });
  }

  /**
   * Get API keys for company
   */
  static async getCompanyAPIKeys(companyId: string) {
    return prisma.aPIKey.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// =============================================================================
// AUDIT LOG SERVICE
// =============================================================================

export class AuditLogService {
  /**
   * Log an action
   */
  static async log(
    companyId: string,
    action: string,
    resource: string,
    options: {
      userId?: string;
      resourceId?: string;
      oldValue?: unknown;
      newValue?: unknown;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ) {
    return prisma.auditLog.create({
      data: {
        companyId,
        userId: options.userId,
        action,
        resource,
        resourceId: options.resourceId,
        oldValue: options.oldValue ? JSON.stringify(options.oldValue) : null,
        newValue: options.newValue ? JSON.stringify(options.newValue) : null,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      }
    });
  }

  /**
   * Get audit logs for company
   */
  static async getCompanyLogs(companyId: string, options: {
    userId?: string;
    action?: string;
    resource?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const where: any = { companyId };
    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.resource) where.resource = options.resource;

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    });
  }
}

// =============================================================================
// INVITATION SERVICE
// =============================================================================

export class InvitationService {
  /**
   * Create invitation
   */
  static async createInvitation(input: InviteUserInput) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return prisma.invitation.create({
      data: {
        companyId: input.companyId,
        projectId: input.projectId,
        email: input.email,
        role: input.projectRole || input.role,
        roleType: input.projectId ? 'project' : 'company',
        token,
        expiresAt,
        invitedBy: input.invitedBy,
        status: 'pending'
      }
    });
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    });

    if (!invitation) throw new Error('Invitation not found');
    if (invitation.status !== 'pending') throw new Error('Invitation already processed');
    if (invitation.expiresAt < new Date()) throw new Error('Invitation has expired');

    return prisma.$transaction(async (tx) => {
      // Add user to company
      await UserCompanyService.addUserToCompany(
        userId, 
        invitation.companyId, 
        invitation.role as CompanyRole
      );

      // Add user to project if applicable
      if (invitation.projectId) {
        await UserProjectService.addUserToProject(
          userId,
          invitation.projectId,
          invitation.role as ProjectRole
        );
      }

      // Update invitation status
      return tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' }
      });
    });
  }

  /**
   * Decline invitation
   */
  static async declineInvitation(token: string) {
    return prisma.invitation.update({
      where: { token },
      data: { status: 'declined' }
    });
  }

  /**
   * Get pending invitations for email
   */
  static async getPendingInvitations(email: string) {
    return prisma.invitation.findMany({
      where: { 
        email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        company: { select: { id: true, name: true, logo: true } }
      }
    });
  }
}
