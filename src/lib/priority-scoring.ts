/**
 * PRIORITY SCORING ENGINE
 * ======================
 * Intelligent priority scoring for contract issues
 * 
 * Factors considered:
 * - Impact: User/business impact (high for frequently used entities)
 * - Frequency: How often the issue/entity is used
 * - Risk: Risk of breaking or data corruption
 * - Effort: Development effort to fix (inverse priority)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface IssueContext {
  issueType: 'missing_param' | 'type_mismatch' | 'undefined_access' | 'unknown_endpoint' | 'extra_param'
  severity: 'error' | 'warning' | 'info'
  affectedEntityId?: string
  affectedFiles: string[]
  dataFlowImpact: 'low' | 'medium' | 'high' | 'critical'
}

export interface PriorityResult {
  score: number           // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low'
  factors: {
    impact: number        // 0-100
    frequency: number     // 0-100
    risk: number          // 0-100
    effort: number        // 0-100
  }
  reason: string
  dependencies: string[]  // Affected entities
}

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

const WEIGHTS = {
  impact: 0.35,
  frequency: 0.25,
  risk: 0.25,
  effort: 0.15
}

// =============================================================================
// PRIORITY SCORING ENGINE
// =============================================================================

export class PriorityScoringEngine {
  /**
   * Calculate priority score for an issue
   */
  async calculateIssuePriority(context: IssueContext): Promise<PriorityResult> {
    // Calculate individual factors
    const impact = await this.calculateImpact(context)
    const frequency = await this.calculateFrequency(context)
    const risk = await this.calculateRisk(context)
    const effort = await this.calculateEffort(context)

    // Calculate weighted total (effort is inverse)
    const score = Math.round(
      impact * WEIGHTS.impact +
      frequency * WEIGHTS.frequency +
      risk * WEIGHTS.risk +
      (100 - effort) * WEIGHTS.effort
    )

    // Determine priority level
    let priority: PriorityResult['priority']
    if (score >= 75) priority = 'critical'
    else if (score >= 50) priority = 'high'
    else if (score >= 25) priority = 'medium'
    else priority = 'low'

    // Get affected dependencies
    const dependencies = await this.getAffectedDependencies(context)

    // Generate reason
    const reason = this.generateReason(context, { impact, frequency, risk, effort }, priority)

    return {
      score,
      priority,
      factors: { impact, frequency, risk, effort },
      reason,
      dependencies
    }
  }

  /**
   * Calculate impact score based on usage and importance
   */
  private async calculateImpact(context: IssueContext): Promise<number> {
    let score = 0

    // Base impact from data flow
    const dataFlowScores = {
      'critical': 40,
      'high': 30,
      'medium': 20,
      'low': 10
    }
    score += dataFlowScores[context.dataFlowImpact] || 20

    // Check if affecting frequently used entity
    if (context.affectedEntityId) {
      const entity = await prisma.entityRegistry.findUnique({
        where: { id: context.affectedEntityId }
      })
      if (entity) {
        // Add points based on usage count
        if (entity.usageCount > 50) score += 30
        else if (entity.usageCount > 20) score += 20
        else if (entity.usageCount > 5) score += 10

        // Add points based on entity priority
        if (entity.priority === 'critical') score += 20
        else if (entity.priority === 'high') score += 15
        else if (entity.priority === 'medium') score += 5
      }
    }

    // Severity adds to impact
    if (context.severity === 'error') score += 10
    else if (context.severity === 'warning') score += 5

    return Math.min(100, score)
  }

  /**
   * Calculate frequency score based on how often the issue occurs
   */
  private async calculateFrequency(context: IssueContext): Promise<number> {
    let score = 0

    // Count occurrences across affected files
    const fileCount = context.affectedFiles.length
    if (fileCount > 10) score += 40
    else if (fileCount > 5) score += 30
    else if (fileCount > 2) score += 20
    else if (fileCount > 0) score += 10

    // Check usage frequency of affected entity
    if (context.affectedEntityId) {
      const usages = await prisma.entityUsage.count({
        where: { entityId: context.affectedEntityId }
      })
      if (usages > 20) score += 40
      else if (usages > 10) score += 30
      else if (usages > 5) score += 20
      else if (usages > 0) score += 10
    }

    // Issue type affects frequency estimation
    const issueTypeScores: Record<string, number> = {
      'undefined_access': 20,  // Common runtime issue
      'missing_param': 15,     // Can cause multiple failures
      'type_mismatch': 10,     // May work partially
      'unknown_endpoint': 10,  // Clear failure path
      'extra_param': 5         // Usually harmless
    }
    score += issueTypeScores[context.issueType] || 10

    return Math.min(100, score)
  }

  /**
   * Calculate risk score based on potential damage
   */
  private async calculateRisk(context: IssueContext): Promise<number> {
    let score = 0

    // Issue type risk levels
    const issueRiskScores: Record<string, number> = {
      'undefined_access': 40,  // Can crash app
      'missing_param': 35,     // Can cause data loss
      'type_mismatch': 30,     // Can corrupt data
      'unknown_endpoint': 25,  // Clear failure
      'extra_param': 10        // Usually ignored
    }
    score += issueRiskScores[context.issueType] || 20

    // Severity affects risk
    if (context.severity === 'error') score += 20
    else if (context.severity === 'warning') score += 10

    // Data flow impact affects risk
    if (context.dataFlowImpact === 'critical') score += 30
    else if (context.dataFlowImpact === 'high') score += 20
    else if (context.dataFlowImpact === 'medium') score += 10

    // Check if affecting critical entities (API routes, core components)
    if (context.affectedEntityId) {
      const entity = await prisma.entityRegistry.findUnique({
        where: { id: context.affectedEntityId }
      })
      if (entity) {
        if (entity.entityType === 'api_route') score += 15
        else if (entity.entityType === 'page') score += 10
        else if (entity.entityType === 'component' && entity.usageCount > 10) score += 10
      }
    }

    return Math.min(100, score)
  }

  /**
   * Calculate effort score (higher = more effort = lower priority)
   */
  private async calculateEffort(context: IssueContext): Promise<number> {
    let score = 50 // Default medium effort

    // Issue type effort estimation
    const issueEffortScores: Record<string, number> = {
      'extra_param': 20,       // Easy: just remove extra param
      'missing_param': 40,     // Medium: add param handling
      'type_mismatch': 50,     // Medium: may need type conversion
      'unknown_endpoint': 60,  // Higher: need to create endpoint
      'undefined_access': 70   // High: need to trace and add null checks
    }
    score = issueEffortScores[context.issueType] || 50

    // More affected files = more effort
    const fileCount = context.affectedFiles.length
    if (fileCount > 10) score += 20
    else if (fileCount > 5) score += 10
    else if (fileCount > 2) score += 5

    // Check if fix affects multiple entities
    if (context.affectedEntityId) {
      const relationships = await prisma.entityRelationship.count({
        where: {
          OR: [
            { sourceEntityId: context.affectedEntityId },
            { targetEntityId: context.affectedEntityId }
          ]
        }
      })
      if (relationships > 10) score += 15
      else if (relationships > 5) score += 10
      else if (relationships > 0) score += 5
    }

    return Math.min(100, score)
  }

  /**
   * Get entities affected by this issue
   */
  private async getAffectedDependencies(context: IssueContext): Promise<string[]> {
    const dependencies: string[] = []

    if (context.affectedEntityId) {
      // Get downstream dependencies
      const related = await prisma.entityRelationship.findMany({
        where: { sourceEntityId: context.affectedEntityId },
        include: { targetEntity: true }
      })

      for (const rel of related) {
        dependencies.push(`${rel.targetEntity.entityType}:${rel.targetEntity.entityName}`)
      }

      // Get upstream dependencies
      const dependedOn = await prisma.entityRelationship.findMany({
        where: { targetEntityId: context.affectedEntityId },
        include: { sourceEntity: true }
      })

      for (const rel of dependedOn) {
        dependencies.push(`${rel.sourceEntity.entityType}:${rel.sourceEntity.entityName}`)
      }
    }

    return [...new Set(dependencies)]
  }

  /**
   * Generate human-readable reason for priority
   */
  private generateReason(
    context: IssueContext,
    factors: { impact: number; frequency: number; risk: number; effort: number },
    priority: string
  ): string {
    const reasons: string[] = []

    // Impact reasoning
    if (factors.impact >= 70) {
      reasons.push(`High impact: affects critical data flow (${context.dataFlowImpact})`)
    } else if (factors.impact >= 50) {
      reasons.push(`Moderate impact on ${context.affectedFiles.length} file(s)`)
    }

    // Frequency reasoning
    if (factors.frequency >= 70) {
      reasons.push('Frequently occurring issue in multiple locations')
    } else if (factors.frequency >= 50) {
      reasons.push('Common pattern across codebase')
    }

    // Risk reasoning
    if (factors.risk >= 70) {
      reasons.push(`High risk: ${context.issueType} can cause runtime errors`)
    } else if (factors.risk >= 50) {
      reasons.push('Moderate risk of data corruption or failures')
    }

    // Effort reasoning
    if (factors.effort >= 70) {
      reasons.push('Complex fix requiring changes across multiple files')
    } else if (factors.effort <= 30) {
      reasons.push('Quick fix available')
    }

    const prefix = priority === 'critical' ? 'CRITICAL: ' :
                   priority === 'high' ? 'IMPORTANT: ' : ''
    
    return prefix + reasons.join('; ')
  }

  /**
   * Batch calculate priorities for multiple issues
   */
  async batchCalculatePriorities(
    issues: IssueContext[]
  ): Promise<Map<string, PriorityResult>> {
    const results = new Map<string, PriorityResult>()

    for (const issue of issues) {
      const key = `${issue.issueType}:${issue.affectedFiles.join(',')}`
      const result = await this.calculateIssuePriority(issue)
      results.set(key, result)
    }

    return results
  }

  /**
   * Get priority recommendations for a set of issues
   */
  async getPriorityRecommendations(issues: IssueContext[]): Promise<{
    critical: IssueContext[]
    high: IssueContext[]
    medium: IssueContext[]
    low: IssueContext[]
  }> {
    const sorted = {
      critical: [] as IssueContext[],
      high: [] as IssueContext[],
      medium: [] as IssueContext[],
      low: [] as IssueContext[]
    }

    for (const issue of issues) {
      const result = await this.calculateIssuePriority(issue)
      sorted[result.priority].push(issue)
    }

    return sorted
  }

  /**
   * Get overall project health score based on open issues
   */
  async getProjectHealthScore(): Promise<{
    score: number
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    breakdown: {
      critical: number
      high: number
      medium: number
      low: number
    }
    recommendation: string
  }> {
    // Get counts by priority
    const critical = await prisma.priorityScore.count({
      where: { entityType: 'issue', priority: 'critical' }
    })
    const high = await prisma.priorityScore.count({
      where: { entityType: 'issue', priority: 'high' }
    })
    const medium = await prisma.priorityScore.count({
      where: { entityType: 'issue', priority: 'medium' }
    })
    const low = await prisma.priorityScore.count({
      where: { entityType: 'issue', priority: 'low' }
    })

    // Calculate health score (weighted)
    const penalty = critical * 25 + high * 10 + medium * 3 + low * 1
    const score = Math.max(0, 100 - penalty)

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (score >= 90) grade = 'A'
    else if (score >= 80) grade = 'B'
    else if (score >= 70) grade = 'C'
    else if (score >= 60) grade = 'D'
    else grade = 'F'

    // Generate recommendation
    let recommendation: string
    if (critical > 0) {
      recommendation = `Fix ${critical} critical issue(s) immediately - they can cause runtime errors`
    } else if (high > 0) {
      recommendation = `Address ${high} high priority issue(s) to prevent data integrity problems`
    } else if (medium > 0) {
      recommendation = `Consider fixing ${medium} medium priority issue(s) during next sprint`
    } else if (low > 0) {
      recommendation = `${low} low priority issue(s) can be addressed as time permits`
    } else {
      recommendation = 'All contract issues resolved! Great job!'
    }

    return {
      score,
      grade,
      breakdown: { critical, high, medium, low },
      recommendation
    }
  }
}

// Export singleton instance
export const priorityScoringEngine = new PriorityScoringEngine()
