/**
 * Audit Logging Library
 * Provides comprehensive audit logging for security and compliance
 */

import { prisma } from "./db"
import { headers } from "next/headers"
import { nanoid } from "nanoid"

export interface AuditLogInput {
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  companyId: string
  userId?: string
  oldValue?: any
  newValue?: any
  metadata?: Record<string, any>
}

export type AuditAction =
  // Authentication
  | "login"
  | "logout"
  | "login_failed"
  | "password_reset"
  | "password_changed"
  | "mfa_enabled"
  | "mfa_disabled"
  
  // User management
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_deactivated"
  | "user_reactivated"
  | "role_changed"
  
  // Company management
  | "company_created"
  | "company_updated"
  | "company_deleted"
  | "settings_changed"
  | "billing_updated"
  
  // Project management
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "project_archived"
  
  // File operations
  | "file_uploaded"
  | "file_deleted"
  | "file_downloaded"
  
  // Schema operations
  | "schema_parsed"
  | "schema_generated"
  | "migration_created"
  | "migration_applied"
  
  // API key operations
  | "api_key_created"
  | "api_key_revoked"
  | "api_key_used"
  
  // Security events
  | "permission_denied"
  | "suspicious_activity"
  | "rate_limit_exceeded"
  | "invalid_token"
  
  // Data operations
  | "data_exported"
  | "data_imported"
  | "data_deleted"

export type AuditResource =
  | "user"
  | "company"
  | "project"
  | "file"
  | "schema"
  | "migration"
  | "api_key"
  | "settings"
  | "session"
  | "system"

/**
 * Log an audit event
 */
export async function logAudit(input: AuditLogInput): Promise<string> {
  try {
    // Get request context
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") ||
                      headersList.get("x-real-ip") ||
                      "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"
    
    // Create audit log entry
    const log = await prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
        ipAddress: ipAddress.split(",")[0].trim(),
        userAgent,
      }
    })
    
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Audit] ${input.action} on ${input.resource}`, {
        companyId: input.companyId,
        userId: input.userId,
        resourceId: input.resourceId
      })
    }
    
    return log.id
  } catch (error) {
    console.error("[Audit] Failed to log audit event:", error)
    // Don't throw - audit logging should not break the main flow
    return "error"
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  action: "login" | "logout" | "login_failed" | "password_reset" | "password_changed",
  userId: string | undefined,
  companyId: string | undefined,
  metadata?: Record<string, any>
) {
  if (!companyId) return
  
  return logAudit({
    action,
    resource: "session",
    userId,
    companyId,
    metadata
  })
}

/**
 * Log file operation
 */
export async function logFileOperation(
  action: "file_uploaded" | "file_deleted" | "file_downloaded",
  userId: string,
  companyId: string,
  fileName: string,
  fileSize?: number,
  fileType?: string
) {
  return logAudit({
    action,
    resource: "file",
    resourceId: fileName,
    userId,
    companyId,
    metadata: { fileName, fileSize, fileType }
  })
}

/**
 * Log schema operation
 */
export async function logSchemaOperation(
  action: "schema_parsed" | "schema_generated" | "migration_created" | "migration_applied",
  userId: string,
  companyId: string,
  projectId: string,
  details: {
    tablesCount?: number
    proceduresCount?: number
    viewsCount?: number
    errors?: string[]
  }
) {
  return logAudit({
    action,
    resource: "schema",
    resourceId: projectId,
    userId,
    companyId,
    metadata: details
  })
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  action: "permission_denied" | "suspicious_activity" | "rate_limit_exceeded" | "invalid_token",
  companyId: string,
  userId: string | undefined,
  details: Record<string, any>
) {
  return logAudit({
    action,
    resource: "system",
    userId,
    companyId,
    metadata: details
  })
}

/**
 * Get audit logs for a company
 */
export async function getAuditLogs(
  companyId: string,
  options?: {
    userId?: string
    action?: AuditAction
    resource?: AuditResource
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  }
) {
  const where: any = { companyId }
  
  if (options?.userId) where.userId = options.userId
  if (options?.action) where.action = options.action
  if (options?.resource) where.resource = options.resource
  if (options?.startDate || options?.endDate) {
    where.createdAt = {}
    if (options?.startDate) where.createdAt.gte = options.startDate
    if (options?.endDate) where.createdAt.lte = options.endDate
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.auditLog.count({ where })
  ])
  
  return { logs, total }
}

/**
 * Get audit statistics for a company
 */
export async function getAuditStats(companyId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const logs = await prisma.auditLog.findMany({
    where: {
      companyId,
      createdAt: { gte: startDate }
    },
    select: {
      action: true,
      resource: true,
      createdAt: true
    }
  })
  
  // Group by action
  const actionCounts: Record<string, number> = {}
  logs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
  })
  
  // Group by day
  const dailyCounts: Record<string, number> = {}
  logs.forEach(log => {
    const day = log.createdAt.toISOString().split("T")[0]
    dailyCounts[day] = (dailyCounts[day] || 0) + 1
  })
  
  // Security events count
  const securityActions = ["login_failed", "permission_denied", "suspicious_activity", "rate_limit_exceeded", "invalid_token"]
  const securityEvents = logs.filter(l => securityActions.includes(l.action)).length
  
  return {
    total: logs.length,
    byAction: actionCounts,
    byDay: dailyCounts,
    securityEvents,
    period: { days, startDate, endDate: new Date() }
  }
}

/**
 * Clean up old audit logs (for data retention)
 */
export async function cleanupOldAuditLogs(
  companyId: string,
  retentionDays: number = 365
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  const result = await prisma.auditLog.deleteMany({
    where: {
      companyId,
      createdAt: { lt: cutoffDate }
    }
  })
  
  console.log(`[Audit] Cleaned up ${result.count} old logs for company ${companyId}`)
  return result.count
}

/**
 * Generate a unique reference ID for audit events
 */
export function generateAuditRef(): string {
  return `AUD-${Date.now()}-${nanoid(8)}`
}
