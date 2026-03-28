// =============================================================================
// RBAC GENERATOR - Auto-generate Role-Based Access Control from intelligence
// =============================================================================

import { TableDef } from '../types'
import { ParsedCSHTMLView } from '../cshtml-parser'

// =============================================================================
// TYPES
// =============================================================================

export interface Permission {
  id: string
  name: string
  displayName: string
  description: string
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'approve' | 'reject'
  category: 'data' | 'admin' | 'report' | 'workflow' | 'system'
  isSystem: boolean
}

export interface Role {
  id: string
  name: string
  displayName: string
  description: string
  permissions: string[]
  isSystem: boolean
  level: number
}

export interface RolePermissionMatrix {
  roles: Role[]
  permissions: Permission[]
  matrix: Record<string, Record<string, boolean>>
}

export interface RBACConfig {
  module: string
  permissions: Permission[]
  roles: Role[]
  defaultAssignments: Record<string, string[]>
}

export interface GeneratedRBACFile {
  path: string
  content: string
  type: 'permission' | 'role' | 'middleware' | 'hook' | 'component' | 'api' | 'config'
  description: string
}

export interface RBACGeneratorOptions {
  projectId: string
  moduleName: string
  generateMiddleware?: boolean
  generateHooks?: boolean
  generateComponents?: boolean
  generateAPI?: boolean
  includeWorkflowPermissions?: boolean
}

// =============================================================================
// STANDARD PERMISSION TEMPLATES
// =============================================================================

const CRUD_PERMISSION_TEMPLATE = [
  { action: 'create' as const, displayName: 'Create', description: 'Create new records' },
  { action: 'read' as const, displayName: 'View', description: 'View records' },
  { action: 'update' as const, displayName: 'Edit', description: 'Edit existing records' },
  { action: 'delete' as const, displayName: 'Delete', description: 'Delete records' },
]

const WORKFLOW_PERMISSION_TEMPLATE = [
  { action: 'approve' as const, displayName: 'Approve', description: 'Approve workflow items' },
  { action: 'reject' as const, displayName: 'Reject', description: 'Reject workflow items' },
]

const ADMIN_PERMISSION_TEMPLATE = [
  { action: 'export' as const, displayName: 'Export', description: 'Export data' },
  { action: 'import' as const, displayName: 'Import', description: 'Import data' },
]

// =============================================================================
// STANDARD ROLE DEFINITIONS
// =============================================================================

const STANDARD_ROLES: Omit<Role, 'permissions'>[] = [
  {
    id: 'super-admin',
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    isSystem: true,
    level: 100
  },
  {
    id: 'admin',
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    isSystem: true,
    level: 90
  },
  {
    id: 'manager',
    name: 'manager',
    displayName: 'Manager',
    description: 'Manager access with read/write and approve permissions',
    isSystem: true,
    level: 70
  },
  {
    id: 'supervisor',
    name: 'supervisor',
    displayName: 'Supervisor',
    description: 'Supervisor access with read/write permissions',
    isSystem: true,
    level: 60
  },
  {
    id: 'user',
    name: 'user',
    displayName: 'Standard User',
    description: 'Standard user with basic CRUD permissions',
    isSystem: true,
    level: 50
  },
  {
    id: 'viewer',
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access',
    isSystem: true,
    level: 30
  },
  {
    id: 'guest',
    name: 'guest',
    displayName: 'Guest',
    description: 'Limited guest access',
    isSystem: true,
    level: 10
  }
]

// =============================================================================
// RBAC GENERATOR CLASS
// =============================================================================

export class RBACGenerator {
  private options: RBACGeneratorOptions
  private permissions: Permission[] = []
  private roles: Role[] = []

  constructor(options: RBACGeneratorOptions) {
    this.options = {
      generateMiddleware: true,
      generateHooks: true,
      generateComponents: true,
      generateAPI: true,
      includeWorkflowPermissions: true,
      ...options
    }
  }

  // ===========================================================================
  // MAIN ENTRY POINTS
  // ===========================================================================

  /**
   * Generate complete RBAC system from table definitions
   */
  generateFromTables(tables: TableDef[]): GeneratedRBACFile[] {
    const files: GeneratedRBACFile[] = []
    
    // Generate permissions for each table
    for (const table of tables) {
      this.generatePermissionsForTable(table)
    }

    // Generate roles with permission assignments
    this.generateRoles()

    // Generate all RBAC files
    files.push(this.generatePermissionDefinitions())
    files.push(this.generateRoleDefinitions())
    files.push(this.generatePermissionMatrix())

    if (this.options.generateMiddleware) {
      files.push(this.generatePermissionMiddleware())
    }

    if (this.options.generateHooks) {
      files.push(this.generatePermissionHooks())
    }

    if (this.options.generateComponents) {
      files.push(...this.generatePermissionComponents())
    }

    if (this.options.generateAPI) {
      files.push(...this.generateRBACAPIRoutes())
    }

    return files
  }

  /**
   * Generate RBAC from CSHTML views
   */
  generateFromCSHTMLViews(views: ParsedCSHTMLView[]): GeneratedRBACFile[] {
    const files: GeneratedRBACFile[] = []

    for (const view of views) {
      this.generatePermissionsFromView(view)
    }

    this.generateRoles()

    files.push(this.generatePermissionDefinitions())
    files.push(this.generateRoleDefinitions())
    files.push(this.generatePermissionMatrix())

    if (this.options.generateMiddleware) {
      files.push(this.generatePermissionMiddleware())
    }

    if (this.options.generateHooks) {
      files.push(this.generatePermissionHooks())
    }

    if (this.options.generateComponents) {
      files.push(...this.generatePermissionComponents())
    }

    if (this.options.generateAPI) {
      files.push(...this.generateRBACAPIRoutes())
    }

    return files
  }

  // ===========================================================================
  // PERMISSION GENERATION
  // ===========================================================================

  private generatePermissionsForTable(table: TableDef): void {
    const resourceName = table.tableName.toLowerCase()
    const module = this.getResourceModule(table.tableName)

    // Generate CRUD permissions
    for (const template of CRUD_PERMISSION_TEMPLATE) {
      this.permissions.push({
        id: `${resourceName}.${template.action}`,
        name: `${resourceName}_${template.action}`,
        displayName: `${this.toTitleCase(table.tableName)} - ${template.displayName}`,
        description: `${template.description} ${table.tableName} records`,
        resource: resourceName,
        action: template.action,
        category: 'data',
        isSystem: false
      })
    }

    // Generate admin permissions
    for (const template of ADMIN_PERMISSION_TEMPLATE) {
      this.permissions.push({
        id: `${resourceName}.${template.action}`,
        name: `${resourceName}_${template.action}`,
        displayName: `${this.toTitleCase(table.tableName)} - ${template.displayName}`,
        description: `${template.description} ${table.tableName} data`,
        resource: resourceName,
        action: template.action,
        category: 'admin',
        isSystem: false
      })
    }

    // Generate workflow permissions if applicable
    if (this.options.includeWorkflowPermissions && this.isWorkflowTable(table)) {
      for (const template of WORKFLOW_PERMISSION_TEMPLATE) {
        this.permissions.push({
          id: `${resourceName}.${template.action}`,
          name: `${resourceName}_${template.action}`,
          displayName: `${this.toTitleCase(table.tableName)} - ${template.displayName}`,
          description: `${template.description} ${table.tableName} items`,
          resource: resourceName,
          action: template.action,
          category: 'workflow',
          isSystem: false
        })
      }
    }
  }

  private generatePermissionsFromView(view: ParsedCSHTMLView): void {
    const resourceName = view.viewName.toLowerCase().replace(/_?view$/i, '')
    
    // Detect view type and generate appropriate permissions
    const viewType = this.detectViewType(view)
    
    if (viewType === 'list') {
      this.permissions.push({
        id: `${resourceName}.read`,
        name: `${resourceName}_read`,
        displayName: `${this.toTitleCase(resourceName)} - View List`,
        description: `View ${resourceName} list`,
        resource: resourceName,
        action: 'read',
        category: 'data',
        isSystem: false
      })
    } else if (viewType === 'form') {
      for (const template of CRUD_PERMISSION_TEMPLATE.slice(0, 3)) { // create, read, update
        this.permissions.push({
          id: `${resourceName}.${template.action}`,
          name: `${resourceName}_${template.action}`,
          displayName: `${this.toTitleCase(resourceName)} - ${template.displayName}`,
          description: `${template.description} ${resourceName}`,
          resource: resourceName,
          action: template.action,
          category: 'data',
          isSystem: false
        })
      }
    }

    // Check for AJAX endpoints that indicate additional permissions
    if (view.ajaxEndpoints) {
      for (const endpoint of view.ajaxEndpoints) {
        const action = this.inferActionFromEndpoint(endpoint.url)
        if (action && !this.permissions.find(p => p.id === `${resourceName}.${action}`)) {
          this.permissions.push({
            id: `${resourceName}.${action}`,
            name: `${resourceName}_${action}`,
            displayName: `${this.toTitleCase(resourceName)} - ${this.toTitleCase(action)}`,
            description: `${action} ${resourceName}`,
            resource: resourceName,
            action: action as any,
            category: 'data',
            isSystem: false
          })
        }
      }
    }
  }

  // ===========================================================================
  // ROLE GENERATION
  // ===========================================================================

  private generateRoles(): void {
    const resources = Array.from(new Set(this.permissions.map(p => p.resource)))

    for (const roleTemplate of STANDARD_ROLES) {
      const assignedPermissions = this.assignPermissionsToRole(roleTemplate.level, resources)
      
      this.roles.push({
        ...roleTemplate,
        permissions: assignedPermissions
      })
    }
  }

  private assignPermissionsToRole(roleLevel: number, resources: string[]): string[] {
    const permissions: string[] = []

    for (const resource of resources) {
      const resourcePermissions = this.permissions.filter(p => p.resource === resource)

      if (roleLevel >= 90) {
        // Super Admin / Admin: All permissions
        permissions.push(...resourcePermissions.map(p => p.id))
      } else if (roleLevel >= 70) {
        // Manager: CRUD + Approve/Reject
        permissions.push(...resourcePermissions
          .filter(p => ['create', 'read', 'update', 'approve', 'reject', 'export'].includes(p.action))
          .map(p => p.id))
      } else if (roleLevel >= 60) {
        // Supervisor: CRUD
        permissions.push(...resourcePermissions
          .filter(p => ['create', 'read', 'update'].includes(p.action))
          .map(p => p.id))
      } else if (roleLevel >= 50) {
        // User: Read + Create + Update own
        permissions.push(...resourcePermissions
          .filter(p => ['create', 'read', 'update'].includes(p.action))
          .map(p => p.id))
      } else if (roleLevel >= 30) {
        // Viewer: Read only
        permissions.push(...resourcePermissions
          .filter(p => p.action === 'read')
          .map(p => p.id))
      } else if (roleLevel >= 10) {
        // Guest: Limited read
        permissions.push(...resourcePermissions
          .filter(p => p.action === 'read')
          .slice(0, 1)
          .map(p => p.id))
      }
    }

    return permissions
  }

  // ===========================================================================
  // FILE GENERATION
  // ===========================================================================

  generatePermissionDefinitions(): GeneratedRBACFile {
    const module = this.options.moduleName
    
    return {
      path: `modules/${module}/rbac/permissions.ts`,
      content: `// =============================================================================
// AUTO-GENERATED PERMISSION DEFINITIONS
// Generated: ${new Date().toISOString()}
// Module: ${module}
// =============================================================================

export interface Permission {
  id: string
  name: string
  displayName: string
  description: string
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'approve' | 'reject'
  category: 'data' | 'admin' | 'report' | 'workflow' | 'system'
  isSystem: boolean
}

export const PERMISSIONS: Permission[] = [
${this.permissions.map(p => `  {
    id: '${p.id}',
    name: '${p.name}',
    displayName: '${p.displayName}',
    description: '${p.description}',
    resource: '${p.resource}',
    action: '${p.action}',
    category: '${p.category}',
    isSystem: ${p.isSystem}
  }`).join(',\n')}
]

// Permission ID constants for type-safe usage
export const PERMISSION_IDS = {
${this.permissions.map(p => `  ${this.toConstantCase(p.id)}: '${p.id}'`).join(',\n')}
} as const

// Permissions grouped by resource
export const PERMISSIONS_BY_RESOURCE = {
${this.groupPermissionsByResource()}
}

// Permissions grouped by action
export const PERMISSIONS_BY_ACTION = {
${this.groupPermissionsByAction()}
}

// Helper functions
export function getPermissionById(id: string): Permission | undefined {
  return PERMISSIONS.find(p => p.id === id)
}

export function getPermissionsByResource(resource: string): Permission[] {
  return PERMISSIONS.filter(p => p.resource === resource)
}

export function getPermissionsByCategory(category: string): Permission[] {
  return PERMISSIONS.filter(p => p.category === category)
}

export function hasPermission(userPermissions: string[], permissionId: string): boolean {
  return userPermissions.includes(permissionId)
}

export function hasAnyPermission(userPermissions: string[], permissionIds: string[]): boolean {
  return permissionIds.some(id => userPermissions.includes(id))
}

export function hasAllPermissions(userPermissions: string[], permissionIds: string[]): boolean {
  return permissionIds.every(id => userPermissions.includes(id))
}
`,
      type: 'permission',
      description: `Permission definitions for ${module}`
    }
  }

  generateRoleDefinitions(): GeneratedRBACFile {
    const module = this.options.moduleName

    return {
      path: `modules/${module}/rbac/roles.ts`,
      content: `// =============================================================================
// AUTO-GENERATED ROLE DEFINITIONS
// Generated: ${new Date().toISOString()}
// Module: ${module}
// =============================================================================

import { Permission, PERMISSIONS } from './permissions'

export interface Role {
  id: string
  name: string
  displayName: string
  description: string
  permissions: string[]
  isSystem: boolean
  level: number
}

export const ROLES: Role[] = [
${this.roles.map(r => `  {
    id: '${r.id}',
    name: '${r.name}',
    displayName: '${r.displayName}',
    description: '${r.description}',
    permissions: [${r.permissions.map(p => `'${p}'`).join(', ')}],
    isSystem: ${r.isSystem},
    level: ${r.level}
  }`).join(',\n')}
]

// Role ID constants
export const ROLE_IDS = {
${this.roles.map(r => `  ${this.toConstantCase(r.id)}: '${r.id}'`).join(',\n')}
} as const

// Helper functions
export function getRoleById(id: string): Role | undefined {
  return ROLES.find(r => r.id === id)
}

export function getRoleByName(name: string): Role | undefined {
  return ROLES.find(r => r.name === name)
}

export function getRolePermissions(roleId: string): Permission[] {
  const role = getRoleById(roleId)
  if (!role) return []
  return PERMISSIONS.filter(p => role.permissions.includes(p.id))
}

export function getRolesByPermission(permissionId: string): Role[] {
  return ROLES.filter(r => r.permissions.includes(permissionId))
}

export function isHigherRole(roleId1: string, roleId2: string): boolean {
  const role1 = getRoleById(roleId1)
  const role2 = getRoleById(roleId2)
  return (role1?.level || 0) > (role2?.level || 0)
}

export function getHighestRole(roleIds: string[]): Role | undefined {
  const roles = roleIds.map(id => getRoleById(id)).filter(Boolean) as Role[]
  if (roles.length === 0) return undefined
  return roles.reduce((highest, role) => role.level > highest.level ? role : highest)
}
`,
      type: 'role',
      description: `Role definitions for ${module}`
    }
  }

  generatePermissionMatrix(): GeneratedRBACFile {
    const module = this.options.moduleName
    const resources = Array.from(new Set(this.permissions.map(p => p.resource)))

    return {
      path: `modules/${module}/rbac/matrix.ts`,
      content: `// =============================================================================
// AUTO-GENERATED PERMISSION MATRIX
// Generated: ${new Date().toISOString()}
// Module: ${module}
// =============================================================================

import { ROLES } from './roles'
import { PERMISSIONS } from './permissions'

export interface PermissionMatrixCell {
  allowed: boolean
  permissionId: string
  roleId: string
}

// Generate permission matrix
export const PERMISSION_MATRIX: Record<string, Record<string, boolean>> = {
${this.roles.map(role => `  '${role.id}': {
${this.permissions.map(p => `    '${p.id}': ${role.permissions.includes(p.id)}`).join(',\n')}
  }`).join(',\n')}
}

// Check if role has specific permission
export function roleHasPermission(roleId: string, permissionId: string): boolean {
  return PERMISSION_MATRIX[roleId]?.[permissionId] ?? false
}

// Check if role has any of the specified permissions
export function roleHasAnyPermission(roleId: string, permissionIds: string[]): boolean {
  return permissionIds.some(pid => roleHasPermission(roleId, pid))
}

// Check if role has all of the specified permissions
export function roleHasAllPermissions(roleId: string, permissionIds: string[]): boolean {
  return permissionIds.every(pid => roleHasPermission(roleId, pid))
}

// Get all allowed permissions for a role
export function getAllowedPermissions(roleId: string): string[] {
  const roleMatrix = PERMISSION_MATRIX[roleId]
  if (!roleMatrix) return []
  return Object.entries(roleMatrix)
    .filter(([_, allowed]) => allowed)
    .map(([pid]) => pid)
}

// Get all roles that have a specific permission
export function getRolesWithPermission(permissionId: string): string[] {
  return Object.entries(PERMISSION_MATRIX)
    .filter(([_, permissions]) => permissions[permissionId])
    .map(([roleId]) => roleId)
}

// Resource-level access check
export function canAccessResource(roleId: string, resource: string, action: string): boolean {
  const permissionId = \`\${resource}.\${action}\`
  return roleHasPermission(roleId, permissionId)
}

// Generate matrix for display
export function getMatrixForDisplay() {
  const resources = [${resources.map(r => `'${r}'`).join(', ')}]
  const actions = ['create', 'read', 'update', 'delete', 'export', 'import', 'approve', 'reject'] as const
  
  return {
    roles: ROLES.map(r => ({ id: r.id, name: r.displayName, level: r.level })),
    resources: resources.map(resource => ({
      name: resource,
      actions: actions.map(action => {
        const permissionId = \`\${resource}.\${action}\`
        const permission = PERMISSIONS.find(p => p.id === permissionId)
        return {
          action,
          permissionId,
          displayName: permission?.displayName || action,
          roles: ROLES.map(r => ({
            roleId: r.id,
            allowed: roleHasPermission(r.id, permissionId)
          }))
        }
      }).filter(a => PERMISSIONS.some(p => p.id === a.permissionId))
    }))
  }
}
`,
      type: 'config',
      description: `Permission matrix for ${module}`
    }
  }

  generatePermissionMiddleware(): GeneratedRBACFile {
    const module = this.options.moduleName

    return {
      path: `modules/${module}/rbac/middleware.ts`,
      content: `// =============================================================================
// AUTO-GENERATED PERMISSION MIDDLEWARE
// Generated: ${new Date().toISOString()}
// Module: ${module}
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { roleHasPermission, canAccessResource } from './matrix'
import { PERMISSIONS } from './permissions'

// =============================================================================
// TYPES
// =============================================================================

export interface PermissionCheckOptions {
  permissionId?: string
  resource?: string
  action?: string
  allowAdmin?: boolean
  errorMessage?: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string
  role: string
  permissions: string[]
}

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Check if user has required permission
 */
export async function checkPermission(
  req: NextRequest,
  options: PermissionCheckOptions
): Promise<{ allowed: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return { allowed: false, error: 'Authentication required' }
    }

    const user = session.user as AuthenticatedUser
    
    // Super admin bypass
    if (options.allowAdmin !== false && user.role === 'super_admin') {
      return { allowed: true, user }
    }

    // Check specific permission
    if (options.permissionId) {
      const hasPermission = user.permissions.includes(options.permissionId) ||
        roleHasPermission(user.role, options.permissionId)
      
      if (!hasPermission) {
        return { 
          allowed: false, 
          user, 
          error: options.errorMessage || \`Permission denied: \${options.permissionId}\` 
        }
      }
    }

    // Check resource/action
    if (options.resource && options.action) {
      const hasAccess = user.permissions.includes(\`\${options.resource}.\${options.action}\`) ||
        canAccessResource(user.role, options.resource, options.action)
      
      if (!hasAccess) {
        return { 
          allowed: false, 
          user, 
          error: options.errorMessage || \`Access denied: \${options.action} \${options.resource}\` 
        }
      }
    }

    return { allowed: true, user }
  } catch (error) {
    return { allowed: false, error: 'Permission check failed' }
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withPermission(options: PermissionCheckOptions) {
  return function (
    handler: (req: NextRequest, context: any) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context: any) => {
      const { allowed, user, error } = await checkPermission(req, options)
      
      if (!allowed) {
        return NextResponse.json(
          { error: error || 'Permission denied' },
          { status: 403 }
        )
      }

      // Attach user to context
      context.user = user
      
      return handler(req, context)
    }
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const session = await getServerSession()
    if (!session?.user) return null
    return session.user as AuthenticatedUser
  } catch {
    return null
  }
}

/**
 * Require specific role middleware
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: NextRequest) => {
    const user = await requireAuth(req)
    if (!user) return { allowed: false, error: 'Authentication required' }
    if (!allowedRoles.includes(user.role)) {
      return { allowed: false, error: 'Role not authorized' }
    }
    return { allowed: true, user }
  }
}

/**
 * Resource-based permission middleware factory
 */
export function createResourceMiddleware(resource: string) {
  return {
    canCreate: withPermission({ resource, action: 'create' }),
    canRead: withPermission({ resource, action: 'read' }),
    canUpdate: withPermission({ resource, action: 'update' }),
    canDelete: withPermission({ resource, action: 'delete' }),
    canExport: withPermission({ resource, action: 'export' }),
    canImport: withPermission({ resource, action: 'import' }),
    canApprove: withPermission({ resource, action: 'approve' }),
    canReject: withPermission({ resource, action: 'reject' }),
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract user permissions from session
 */
export async function getUserPermissions(req: NextRequest): Promise<string[]> {
  const user = await requireAuth(req)
  if (!user) return []
  return user.permissions
}

/**
 * Check multiple permissions (any)
 */
export async function hasAnyPermission(
  req: NextRequest, 
  permissionIds: string[]
): Promise<boolean> {
  const user = await requireAuth(req)
  if (!user) return false
  return permissionIds.some(pid => 
    user.permissions.includes(pid) || roleHasPermission(user.role, pid)
  )
}

/**
 * Check multiple permissions (all)
 */
export async function hasAllPermissions(
  req: NextRequest, 
  permissionIds: string[]
): Promise<boolean> {
  const user = await requireAuth(req)
  if (!user) return false
  return permissionIds.every(pid => 
    user.permissions.includes(pid) || roleHasPermission(user.role, pid)
  )
}
`,
      type: 'middleware',
      description: `Permission middleware for ${module}`
    }
  }

  generatePermissionHooks(): GeneratedRBACFile {
    const module = this.options.moduleName
    const entityName = this.toPascalCase(module)

    return {
      path: `modules/${module}/rbac/hooks.ts`,
      content: `'use client'

// =============================================================================
// AUTO-GENERATED PERMISSION REACT HOOKS
// Generated: ${new Date().toISOString()}
// Module: ${module}
// =============================================================================

import { useSession } from 'next-auth/react'
import { useMemo, useCallback } from 'react'
import { PERMISSIONS, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions'
import { ROLES, getRoleById, getRolePermissions } from './roles'
import { roleHasPermission, canAccessResource, getAllowedPermissions } from './matrix'

// =============================================================================
// TYPES
// =============================================================================

export interface UsePermissionsReturn {
  isLoading: boolean
  isAuthenticated: boolean
  user: any
  role: string
  permissions: string[]
  
  // Permission checks
  hasPermission: (permissionId: string) => boolean
  hasAnyPermission: (permissionIds: string[]) => boolean
  hasAllPermissions: (permissionIds: string[]) => boolean
  
  // Resource checks
  canAccess: (resource: string, action: string) => boolean
  canCreate: (resource: string) => boolean
  canRead: (resource: string) => boolean
  canUpdate: (resource: string) => boolean
  canDelete: (resource: string) => boolean
  canExport: (resource: string) => boolean
  canImport: (resource: string) => boolean
  canApprove: (resource: string) => boolean
  canReject: (resource: string) => boolean
  
  // Role checks
  isSuperAdmin: boolean
  isAdmin: boolean
  isManager: boolean
  isSupervisor: boolean
  isUser: boolean
  isViewer: boolean
  isGuest: boolean
  
  // Role comparison
  isRole: (roleId: string) => boolean
  isHigherThan: (roleId: string) => boolean
  getRoleLevel: () => number
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession()
  
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const user = session?.user
  const role = (user as any)?.role || 'guest'
  const userPermissions = (user as any)?.permissions || []

  // Get all effective permissions (user + role permissions)
  const effectivePermissions = useMemo(() => {
    const rolePerms = getAllowedPermissions(role)
    return [...new Set([...userPermissions, ...rolePerms])]
  }, [role, userPermissions])

  // Permission check functions
  const checkPermission = useCallback((permissionId: string): boolean => {
    return effectivePermissions.includes(permissionId) || roleHasPermission(role, permissionId)
  }, [effectivePermissions, role])

  const checkAnyPermission = useCallback((permissionIds: string[]): boolean => {
    return permissionIds.some(pid => checkPermission(pid))
  }, [checkPermission])

  const checkAllPermissions = useCallback((permissionIds: string[]): boolean => {
    return permissionIds.every(pid => checkPermission(pid))
  }, [checkPermission])

  // Resource access checks
  const checkAccess = useCallback((resource: string, action: string): boolean => {
    return canAccessResource(role, resource, action) || 
      effectivePermissions.includes(\`\${resource}.\${action}\`)
  }, [role, effectivePermissions])

  // Role checks
  const roleLevel = useMemo(() => {
    const roleObj = getRoleById(role)
    return roleObj?.level || 0
  }, [role])

  const isRoleCheck = useCallback((checkRoleId: string): boolean => {
    return role === checkRoleId
  }, [role])

  const isHigherThan = useCallback((compareRoleId: string): boolean => {
    const compareRole = getRoleById(compareRoleId)
    return roleLevel > (compareRole?.level || 0)
  }, [roleLevel])

  return {
    isLoading,
    isAuthenticated,
    user,
    role,
    permissions: effectivePermissions,
    
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    
    canAccess: checkAccess,
    canCreate: (resource) => checkAccess(resource, 'create'),
    canRead: (resource) => checkAccess(resource, 'read'),
    canUpdate: (resource) => checkAccess(resource, 'update'),
    canDelete: (resource) => checkAccess(resource, 'delete'),
    canExport: (resource) => checkAccess(resource, 'export'),
    canImport: (resource) => checkAccess(resource, 'import'),
    canApprove: (resource) => checkAccess(resource, 'approve'),
    canReject: (resource) => checkAccess(resource, 'reject'),
    
    isSuperAdmin: isRoleCheck('super-admin'),
    isAdmin: isRoleCheck('admin') || isRoleCheck('super-admin'),
    isManager: isRoleCheck('manager') || isHigherThan('manager'),
    isSupervisor: isRoleCheck('supervisor') || isHigherThan('supervisor'),
    isUser: isRoleCheck('user') || isHigherThan('user'),
    isViewer: isRoleCheck('viewer') || isHigherThan('viewer'),
    isGuest: isRoleCheck('guest'),
    
    isRole: isRoleCheck,
    isHigherThan,
    getRoleLevel: () => roleLevel,
  }
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook to check a single permission
 */
export function useHasPermission(permissionId: string): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(permissionId)
}

/**
 * Hook for resource-specific permissions
 */
export function useResourcePermissions(resource: string) {
  const perms = usePermissions()
  
  return useMemo(() => ({
    canCreate: perms.canCreate(resource),
    canRead: perms.canRead(resource),
    canUpdate: perms.canUpdate(resource),
    canDelete: perms.canDelete(resource),
    canExport: perms.canExport(resource),
    canImport: perms.canImport(resource),
    canApprove: perms.canApprove(resource),
    canReject: perms.canReject(resource),
  }), [perms, resource])
}

/**
 * Hook for conditional rendering based on permission
 */
export function useCanRender(permissionId: string): boolean {
  const { isAuthenticated, hasPermission } = usePermissions()
  return isAuthenticated && hasPermission(permissionId)
}

/**
 * Hook to get user's allowed resources
 */
export function useAllowedResources(): string[] {
  const { permissions } = usePermissions()
  
  return useMemo(() => {
    const resources = new Set<string>()
    for (const permId of permissions) {
      const [resource] = permId.split('.')
      if (resource) resources.add(resource)
    }
    return Array.from(resources)
  }, [permissions])
}
`,
      type: 'hook',
      description: `Permission React hooks for ${module}`
    }
  }

  generatePermissionComponents(): GeneratedRBACFile[] {
    const module = this.options.moduleName
    const entityName = this.toPascalCase(module)

    const canComponent: GeneratedRBACFile = {
      path: `modules/${module}/rbac/components/Can.tsx`,
      content: `'use client'

// =============================================================================
// AUTO-GENERATED PERMISSION COMPONENTS
// Generated: ${new Date().toISOString()}
// Module: ${module}
// =============================================================================

import { ReactNode } from 'react'
import { usePermissions } from '../hooks'

// =============================================================================
// CAN COMPONENT - Conditional rendering based on permission
// =============================================================================

interface CanProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  resource?: string
  action?: 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'approve' | 'reject'
  role?: string
  minRoleLevel?: number
  fallback?: ReactNode
  children: ReactNode
}

export function Can({
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  role,
  minRoleLevel,
  fallback = null,
  children
}: CanProps) {
  const perms = usePermissions()

  // Check loading state
  if (perms.isLoading) {
    return <>{fallback}</>
  }

  // Check authentication
  if (!perms.isAuthenticated) {
    return <>{fallback}</>
  }

  // Check single permission
  if (permission && !perms.hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasPerms = requireAll 
      ? perms.hasAllPermissions(permissions)
      : perms.hasAnyPermission(permissions)
    if (!hasPerms) {
      return <>{fallback}</>
    }
  }

  // Check resource/action
  if (resource && action && !perms.canAccess(resource, action)) {
    return <>{fallback}</>
  }

  // Check role
  if (role && !perms.isRole(role)) {
    return <>{fallback}</>
  }

  // Check minimum role level
  if (minRoleLevel !== undefined && perms.getRoleLevel() < minRoleLevel) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

interface CanCreateProps {
  resource: string
  fallback?: ReactNode
  children: ReactNode
}

export function CanCreate({ resource, fallback, children }: CanCreateProps) {
  const { canCreate } = usePermissions()
  return canCreate(resource) ? <>{children}</> : <>{fallback}</>
}

interface CanReadProps {
  resource: string
  fallback?: ReactNode
  children: ReactNode
}

export function CanRead({ resource, fallback, children }: CanReadProps) {
  const { canRead } = usePermissions()
  return canRead(resource) ? <>{children}</> : <>{fallback}</>
}

interface CanUpdateProps {
  resource: string
  fallback?: ReactNode
  children: ReactNode
}

export function CanUpdate({ resource, fallback, children }: CanUpdateProps) {
  const { canUpdate } = usePermissions()
  return canUpdate(resource) ? <>{children}</> : <>{fallback}</>
}

interface CanDeleteProps {
  resource: string
  fallback?: ReactNode
  children: ReactNode
}

export function CanDelete({ resource, fallback, children }: CanDeleteProps) {
  const { canDelete } = usePermissions()
  return canDelete(resource) ? <>{children}</> : <>{fallback}</>
}

// =============================================================================
// ROLE-BASED COMPONENTS
// =============================================================================

interface IsAdminProps {
  fallback?: ReactNode
  children: ReactNode
}

export function IsAdmin({ fallback, children }: IsAdminProps) {
  const { isAdmin } = usePermissions()
  return isAdmin ? <>{children}</> : <>{fallback}</>
}

interface IsManagerProps {
  fallback?: ReactNode
  children: ReactNode
}

export function IsManager({ fallback, children }: IsManagerProps) {
  const { isManager } = usePermissions()
  return isManager ? <>{children}</> : <>{fallback}</>
}

// =============================================================================
// PERMISSION GATE - Full page/section gate
// =============================================================================

interface PermissionGateProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  resource?: string
  action?: string
  fallback?: ReactNode
  children: ReactNode
  showUnauthorized?: boolean
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  fallback,
  children,
  showUnauthorized = true
}: PermissionGateProps) {
  const perms = usePermissions()

  if (perms.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!perms.isAuthenticated) {
    if (fallback) return <>{fallback}</>
    if (showUnauthorized) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to access this content.</p>
        </div>
      )
    }
    return null
  }

  let hasAccess = true

  if (permission) {
    hasAccess = perms.hasPermission(permission)
  }

  if (hasAccess && permissions && permissions.length > 0) {
    hasAccess = requireAll 
      ? perms.hasAllPermissions(permissions)
      : perms.hasAnyPermission(permissions)
  }

  if (hasAccess && resource && action) {
    hasAccess = perms.canAccess(resource, action)
  }

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>
    if (showUnauthorized) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access this content.</p>
        </div>
      )
    }
    return null
  }

  return <>{children}</>
}
`,
      type: 'component',
      description: `Permission components for ${module}`
    }

    const permissionBadge: GeneratedRBACFile = {
      path: `modules/${module}/rbac/components/PermissionBadge.tsx`,
      content: `'use client'

// =============================================================================
// AUTO-GENERATED PERMISSION BADGE COMPONENT
// Generated: ${new Date().toISOString()}
// =============================================================================

import { usePermissions } from '../hooks'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

interface PermissionBadgeProps {
  permission?: string
  resource?: string
  action?: string
  showLabel?: boolean
}

export function PermissionBadge({ 
  permission, 
  resource, 
  action,
  showLabel = true 
}: PermissionBadgeProps) {
  const { hasPermission, canAccess, isLoading } = usePermissions()

  if (isLoading) {
    return <Badge variant="outline"><Shield className="h-3 w-3" /></Badge>
  }

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (resource && action) {
    hasAccess = canAccess(resource, action)
  }

  if (hasAccess) {
    return (
      <Badge variant="default" className="bg-green-500">
        <ShieldCheck className="h-3 w-3 mr-1" />
        {showLabel && 'Allowed'}
      </Badge>
    )
  }

  return (
    <Badge variant="destructive">
      <ShieldX className="h-3 w-3 mr-1" />
      {showLabel && 'Denied'}
    </Badge>
  )
}

// Role Badge Component
interface RoleBadgeProps {
  role: string
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const { isRole, isHigherThan, role: userRole } = usePermissions()

  const roleColors: Record<string, string> = {
    'super-admin': 'bg-purple-500',
    'admin': 'bg-red-500',
    'manager': 'bg-orange-500',
    'supervisor': 'bg-yellow-500',
    'user': 'bg-blue-500',
    'viewer': 'bg-gray-500',
    'guest': 'bg-gray-400',
  }

  return (
    <Badge className={roleColors[userRole] || 'bg-gray-500'}>
      <Shield className="h-3 w-3 mr-1" />
      {userRole}
    </Badge>
  )
}
`,
      type: 'component',
      description: `Permission badge component for ${module}`
    }

    return [canComponent, permissionBadge]
  }

  generateRBACAPIRoutes(): GeneratedRBACFile[] {
    const module = this.options.moduleName

    const mainRoute: GeneratedRBACFile = {
      path: `app/api/${module}/rbac/route.ts`,
      content: `// =============================================================================
// AUTO-GENERATED RBAC API ROUTES
// Generated: ${new Date().toISOString()}
// Module: ${module}
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { PERMISSIONS, getPermissionById, getPermissionsByResource, getPermissionsByCategory } from '@/modules/${module}/rbac/permissions'
import { ROLES, getRoleById, getRoleByName, getRolePermissions, getRolesByPermission } from '@/modules/${module}/rbac/roles'
import { PERMISSION_MATRIX, roleHasPermission, getAllowedPermissions, getRolesWithPermission, getMatrixForDisplay } from '@/modules/${module}/rbac/matrix'
import { requireAuth, checkPermission } from '@/modules/${module}/rbac/middleware'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'permissions':
        return NextResponse.json({
          permissions: PERMISSIONS,
          categories: [...new Set(PERMISSIONS.map(p => p.category))],
          resources: [...new Set(PERMISSIONS.map(p => p.resource))]
        })

      case 'roles':
        return NextResponse.json({
          roles: ROLES
        })

      case 'matrix':
        return NextResponse.json(getMatrixForDisplay())

      case 'my-permissions': {
        const user = await requireAuth(request)
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const rolePerms = getAllowedPermissions(user.role)
        return NextResponse.json({
          role: user.role,
          permissions: [...new Set([...user.permissions, ...rolePerms])]
        })
      }

      case 'check-permission': {
        const permissionId = searchParams.get('permissionId')
        if (!permissionId) {
          return NextResponse.json({ error: 'permissionId required' }, { status: 400 })
        }
        const user = await requireAuth(request)
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const hasPermission = user.permissions.includes(permissionId) || 
          roleHasPermission(user.role, permissionId)
        return NextResponse.json({ hasPermission })
      }

      case 'role-permissions': {
        const roleId = searchParams.get('roleId')
        if (!roleId) {
          return NextResponse.json({ error: 'roleId required' }, { status: 400 })
        }
        return NextResponse.json({
          roleId,
          permissions: getRolePermissions(roleId)
        })
      }

      default:
        return NextResponse.json({
          permissions: PERMISSIONS,
          roles: ROLES,
          matrix: getMatrixForDisplay()
        })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, ...data } = body

  try {
    switch (action) {
      case 'check-permissions': {
        const { permissionIds, requireAll } = data
        const user = await requireAuth(request)
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        const results = permissionIds.map((pid: string) => ({
          permissionId: pid,
          hasPermission: user.permissions.includes(pid) || roleHasPermission(user.role, pid)
        }))

        const hasAll = results.every((r: any) => r.hasPermission)
        const hasAny = results.some((r: any) => r.hasPermission)

        return NextResponse.json({
          results,
          hasAll,
          hasAny,
          satisfies: requireAll ? hasAll : hasAny
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `RBAC API routes for ${module}`
    }

    const checkRoute: GeneratedRBACFile = {
      path: `app/api/${module}/rbac/check/route.ts`,
      content: `// =============================================================================
// AUTO-GENERATED RBAC CHECK API ROUTE
// Generated: ${new Date().toISOString()}
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/modules/${this.options.moduleName}/rbac/middleware'
import { roleHasPermission, canAccessResource } from '@/modules/${this.options.moduleName}/rbac/matrix'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ 
        allowed: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { permissionId, resource, action } = body

    let allowed = false

    if (permissionId) {
      allowed = user.permissions.includes(permissionId) || 
        roleHasPermission(user.role, permissionId)
    } else if (resource && action) {
      allowed = user.permissions.includes(\`\${resource}.\${action}\`) ||
        canAccessResource(user.role, resource, action)
    } else {
      return NextResponse.json({ 
        error: 'permissionId or (resource and action) required' 
      }, { status: 400 })
    }

    return NextResponse.json({
      allowed,
      user: {
        id: user.id,
        role: user.role
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      allowed: false, 
      error: error.message 
    }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `RBAC check API route for ${module}`
    }

    return [mainRoute, checkRoute]
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private toTitleCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
  }

  private toConstantCase(str: string): string {
    return str
      .replace(/\./g, '_')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toUpperCase()
  }

  private getResourceModule(tableName: string): string {
    // Infer module from table name patterns
    const lowerName = tableName.toLowerCase()
    
    if (lowerName.includes('patient')) return 'patients'
    if (lowerName.includes('doctor') || lowerName.includes('physician')) return 'staff'
    if (lowerName.includes('appointment')) return 'appointments'
    if (lowerName.includes('lab')) return 'laboratory'
    if (lowerName.includes('pharmacy')) return 'pharmacy'
    if (lowerName.includes('billing') || lowerName.includes('invoice')) return 'billing'
    if (lowerName.includes('user') || lowerName.includes('role')) return 'admin'
    if (lowerName.includes('audit') || lowerName.includes('log')) return 'audit'
    
    return tableName.toLowerCase()
  }

  private isWorkflowTable(table: TableDef): boolean {
    const workflowPatterns = ['status', 'workflow', 'approval', 'request', 'order', 'application']
    const tableName = table.tableName.toLowerCase()
    
    // Check table name
    if (workflowPatterns.some(p => tableName.includes(p))) return true
    
    // Check for status column
    const statusColumn = table.columns.find(c => 
      c.name.toLowerCase().includes('status') || 
      c.name.toLowerCase().includes('state')
    )
    
    return !!statusColumn
  }

  private detectViewType(view: ParsedCSHTMLView): 'list' | 'form' | 'detail' | 'mixed' {
    const viewName = view.viewName.toLowerCase()
    
    if (viewName.includes('list') || viewName.includes('index')) return 'list'
    if (viewName.includes('create') || viewName.includes('edit') || viewName.includes('form')) return 'form'
    if (viewName.includes('detail') || viewName.includes('view')) return 'detail'
    
    // Infer from fields
    const fields = view.fields || []
    if (fields.length > 10) return 'list'
    if (fields.some(f => f.inputType === 'textarea' || f.inputType === 'dropdown')) return 'form'
    
    return 'mixed'
  }

  private inferActionFromEndpoint(url: string): string | null {
    const lowerUrl = url.toLowerCase()
    
    if (lowerUrl.includes('delete') || lowerUrl.includes('remove')) return 'delete'
    if (lowerUrl.includes('update') || lowerUrl.includes('edit')) return 'update'
    if (lowerUrl.includes('create') || lowerUrl.includes('add') || lowerUrl.includes('insert')) return 'create'
    if (lowerUrl.includes('approve')) return 'approve'
    if (lowerUrl.includes('reject')) return 'reject'
    if (lowerUrl.includes('export')) return 'export'
    if (lowerUrl.includes('import')) return 'import'
    
    return null
  }

  private groupPermissionsByResource(): string {
    const resources = Array.from(new Set(this.permissions.map(p => p.resource)))
    
    return resources.map(resource => {
      const perms = this.permissions.filter(p => p.resource === resource)
      return `  '${resource}': [${perms.map(p => `'${p.id}'`).join(', ')}]`
    }).join(',\n')
  }

  private groupPermissionsByAction(): string {
    const actions = ['create', 'read', 'update', 'delete', 'export', 'import', 'approve', 'reject'] as const
    
    return actions.map(action => {
      const perms = this.permissions.filter(p => p.action === action)
      if (perms.length === 0) return `  ${action}: []`
      return `  ${action}: [${perms.map(p => `'${p.id}'`).join(', ')}]`
    }).join(',\n')
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createRBACGenerator(options: RBACGeneratorOptions): RBACGenerator {
  return new RBACGenerator(options)
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export {
  STANDARD_ROLES,
  CRUD_PERMISSION_TEMPLATE,
  WORKFLOW_PERMISSION_TEMPLATE,
  ADMIN_PERMISSION_TEMPLATE
}
