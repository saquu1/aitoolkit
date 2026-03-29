/**
 * Tenant Context Library
 * Provides multi-tenant isolation and context extraction
 */

import { auth } from "./auth"
import { prisma } from "./db"

export interface TenantContext {
  userId: string
  email: string
  name?: string | null
  role: "owner" | "admin" | "member"
  companyId: string
  company: {
    id: string
    name: string
    slug: string
    subscriptionTier: string
    subscriptionStatus: string
    isActive: boolean
  }
  permissions: string[]
}

export interface ProjectContext extends TenantContext {
  projectId: string
  project: {
    id: string
    name: string
    slug: string
    status: string
    softwareType: string
  }
  projectRole: "manager" | "developer" | "viewer"
}

/**
 * Extract tenant context from the current request
 * Returns null if user is not authenticated or not associated with a company
 */
export async function extractTenantContext(): Promise<TenantContext | null> {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return null
    }

    // Get user with company information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userCompanies: {
          where: { status: 'active' },
          include: { company: true }
        }
      }
    })

    if (!user || !user.isActive) {
      return null
    }

    // Get primary company
    const userCompany = user.userCompanies[0]
    
    if (!userCompany || !userCompany.company.isActive) {
      return null
    }

    const company = userCompany.company

    return {
      userId: user.id,
      email: user.email,
      name: user.displayName || user.name,
      role: userCompany.role as "owner" | "admin" | "member",
      companyId: company.id,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        subscriptionTier: company.subscriptionTier,
        subscriptionStatus: company.subscriptionStatus,
        isActive: company.isActive
      },
      permissions: await getUserPermissions(user.id, company.id)
    }
  } catch (error) {
    console.error("[TenantContext] Error extracting context:", error)
    return null
  }
}

/**
 * Extract project context for project-specific operations
 */
export async function extractProjectContext(
  projectId: string
): Promise<ProjectContext | null> {
  try {
    const tenantContext = await extractTenantContext()
    
    if (!tenantContext) {
      return null
    }

    // Get project with user access
    const userProject = await prisma.userProject.findFirst({
      where: {
        userId: tenantContext.userId,
        projectId,
        status: 'active'
      },
      include: {
        project: {
          include: { company: true }
        }
      }
    })

    // Also check if user is company owner/admin
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return null
    }

    // User has access if:
    // 1. They have a project assignment
    // 2. They are owner/admin of the company
    const hasAccess = userProject || 
      tenantContext.role === 'owner' || 
      tenantContext.role === 'admin'

    if (!hasAccess) {
      return null
    }

    // Determine project role
    let projectRole: "manager" | "developer" | "viewer" = "viewer"
    
    if (tenantContext.role === 'owner') {
      projectRole = 'manager'
    } else if (tenantContext.role === 'admin') {
      projectRole = 'manager'
    } else if (userProject) {
      projectRole = userProject.role as "manager" | "developer" | "viewer"
    }

    return {
      ...tenantContext,
      projectId: project.id,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        softwareType: project.softwareType
      },
      projectRole
    }
  } catch (error) {
    console.error("[TenantContext] Error extracting project context:", error)
    return null
  }
}

/**
 * Get user permissions for a company
 */
async function getUserPermissions(userId: string, companyId: string): Promise<string[]> {
  // Base permissions by role
  const rolePermissions: Record<string, string[]> = {
    owner: [
      "company:*",
      "users:*",
      "projects:*",
      "settings:*",
      "billing:*",
      "api_keys:*"
    ],
    admin: [
      "company:read",
      "company:update",
      "users:read",
      "users:create",
      "users:update",
      "projects:*",
      "settings:read",
      "settings:update"
    ],
    member: [
      "company:read",
      "projects:read",
      "projects:update"
    ]
  }

  // Get user's role in company
  const userCompany = await prisma.userCompany.findFirst({
    where: { userId, companyId }
  })

  if (!userCompany) {
    return []
  }

  // Get base permissions for role
  const basePermissions = rolePermissions[userCompany.role] || []
  
  // Get any custom permissions
  let customPermissions: string[] = []
  try {
    customPermissions = JSON.parse(userCompany.settings || '{}').customPermissions || []
  } catch {}

  return [...basePermissions, ...customPermissions]
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  context: TenantContext,
  permission: string
): boolean {
  const { permissions } = context
  
  // Check for wildcard permission
  const [resource, action] = permission.split(':')
  
  // Check for exact match
  if (permissions.includes(permission)) {
    return true
  }
  
  // Check for wildcard on resource
  if (permissions.includes(`${resource}:*`)) {
    return true
  }
  
  // Check for global wildcard
  if (permissions.includes('*:*')) {
    return true
  }
  
  return false
}

/**
 * Require a specific permission, throw error if not granted
 */
export async function requirePermission(
  permission: string
): Promise<TenantContext> {
  const context = await extractTenantContext()
  
  if (!context) {
    throw new Error("Unauthorized")
  }
  
  if (!hasPermission(context, permission)) {
    throw new Error("Permission denied")
  }
  
  return context
}

/**
 * Require project access, throw error if no access
 */
export async function requireProjectAccess(
  projectId: string,
  minRole: "viewer" | "developer" | "manager" = "viewer"
): Promise<ProjectContext> {
  const context = await extractProjectContext(projectId)
  
  if (!context) {
    throw new Error("Unauthorized")
  }
  
  const roleHierarchy = { viewer: 0, developer: 1, manager: 2 }
  
  if (roleHierarchy[context.projectRole] < roleHierarchy[minRole]) {
    throw new Error("Insufficient project permissions")
  }
  
  return context
}

/**
 * Filter query by company for multi-tenant isolation
 */
export function withTenantFilter<T extends { companyId?: string }>(
  context: TenantContext,
  query: T
): T & { companyId: string } {
  return {
    ...query,
    companyId: context.companyId
  }
}

/**
 * Verify company ownership of a resource
 */
export async function verifyCompanyOwnership(
  context: TenantContext,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  // Map resource types to their table names
  const resourceMap: Record<string, string> = {
    project: 'Project',
    toolkit_project: 'ToolkitProject',
    user: 'User',
    api_key: 'APIKey'
  }

  const tableName = resourceMap[resourceType]
  
  if (!tableName) {
    return false
  }

  // Use raw query for flexibility
  const result = await prisma.$queryRaw<{ companyId: string }[]>`
    SELECT companyId FROM ${Prisma.raw(tableName)} WHERE id = ${resourceId}
  `

  if (!result || result.length === 0) {
    return false
  }

  return result[0].companyId === context.companyId
}

/**
 * Get company usage stats
 */
export async function getCompanyUsage(companyId: string) {
  const [users, projects, storage] = await Promise.all([
    prisma.userCompany.count({
      where: { companyId, status: 'active' }
    }),
    prisma.project.count({
      where: { companyId }
    }),
    prisma.sourceFile.count({
      where: { 
        // Note: would need to add companyId to SourceFile model
      }
    })
  ])

  return {
    users,
    projects,
    storage
  }
}

// Import Prisma for raw queries
import { Prisma } from '@prisma/client'
