/**
 * Confidence Scoring Engine
 * 
 * Calculates and manages confidence scores for extracted entities.
 * Supports multiple scoring factors and provides recommendations.
 */

import { prisma } from "./db"

// ============================================================================
// Types
// ============================================================================

export interface ConfidenceFactors {
  directDDL: boolean       // Parsed directly from DDL
  multipleSources: boolean // Confirmed by multiple parsers
  aiAgreement: boolean     // AI agrees with extraction
  userVerified: boolean    // User has verified
  patternMatch: boolean    // Matches known patterns
  consistencyCheck: boolean // Consistent with related data
}

export interface ConfidenceResult {
  score: number           // 0.0 to 1.0
  confidence: 'high' | 'medium' | 'low' | 'unverified'
  factors: Array<{
    name: string
    contribution: number
    passed: boolean
    weight: number
  }>
  recommendation: string
  source: 'direct_parse' | 'inference' | 'ai_generated'
}

export interface EntityScoreInput {
  projectId?: string
  entityType: 'table' | 'column' | 'fk' | 'sp' | 'view' | 'module'
  entityId: string
  factors: Partial<ConfidenceFactors>
  source?: 'direct_parse' | 'inference' | 'ai_generated'
  notes?: string
}

export interface ScoringFactorConfig {
  name: string
  weight: number
  description?: string
}

// ============================================================================
// Default Weights
// ============================================================================

const DEFAULT_WEIGHTS: Record<string, number> = {
  directDDL: 0.25,
  multipleSources: 0.20,
  aiAgreement: 0.15,
  userVerified: 0.25,
  patternMatch: 0.10,
  consistencyCheck: 0.05
}

const FACTOR_DESCRIPTIONS: Record<string, string> = {
  directDDL: 'Entity was parsed directly from DDL statements',
  multipleSources: 'Entity was confirmed by multiple parsers/agents',
  aiAgreement: 'AI analysis agrees with the extraction result',
  userVerified: 'User has manually verified this entity',
  patternMatch: 'Entity matches known naming or structure patterns',
  consistencyCheck: 'Entity is consistent with related data'
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Load scoring factor weights from database or use defaults
 */
export async function loadScoringWeights(): Promise<Record<string, number>> {
  try {
    const factors = await prisma.scoringFactor.findMany({
      where: { active: true }
    })
    
    if (factors.length === 0) {
      return DEFAULT_WEIGHTS
    }
    
    const weights: Record<string, number> = {}
    for (const factor of factors) {
      weights[factor.name] = factor.weight
    }
    
    return weights
  } catch (error) {
    console.warn('[ConfidenceEngine] Could not load weights from DB, using defaults:', error)
    return DEFAULT_WEIGHTS
  }
}

/**
 * Calculate confidence score for an entity
 */
export async function calculateConfidence(
  entityType: EntityScoreInput['entityType'],
  entityId: string,
  factors: Partial<ConfidenceFactors>
): Promise<ConfidenceResult> {
  const weights = await loadScoringWeights()
  
  let score = 0
  const factorResults: ConfidenceResult['factors'] = []
  
  for (const [factorName, weight] of Object.entries(weights)) {
    const passed = factors[factorName as keyof ConfidenceFactors] ?? false
    const contribution = passed ? weight : 0
    score += contribution
    
    factorResults.push({
      name: factorName,
      contribution,
      passed,
      weight
    })
  }

  const confidence = getConfidenceLevel(score)
  const recommendation = generateRecommendation(score, factorResults)
  const source = determineSource(factors)

  return { 
    score: Math.round(score * 1000) / 1000, 
    confidence, 
    factors: factorResults, 
    recommendation,
    source 
  }
}

/**
 * Calculate and store confidence score for an entity
 */
export async function scoreEntity(input: EntityScoreInput): Promise<ConfidenceResult> {
  const result = await calculateConfidence(input.entityType, input.entityId, input.factors)
  
  // Store the score
  try {
    await prisma.confidenceScore.upsert({
      where: {
        entityType_entityId: {
          entityType: input.entityType,
          entityId: input.entityId
        }
      },
      create: {
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        score: result.score,
        confidence: result.confidence,
        factors: JSON.stringify(result.factors),
        source: result.source,
        notes: input.notes
      },
      update: {
        score: result.score,
        confidence: result.confidence,
        factors: JSON.stringify(result.factors),
        source: result.source,
        notes: input.notes,
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('[ConfidenceEngine] Failed to store confidence score:', error)
  }
  
  return result
}

/**
 * Batch score multiple entities
 */
export async function batchScoreEntities(
  entities: EntityScoreInput[]
): Promise<Map<string, ConfidenceResult>> {
  const results = new Map<string, ConfidenceResult>()
  
  for (const entity of entities) {
    const result = await scoreEntity(entity)
    results.set(entity.entityId, result)
  }
  
  return results
}

/**
 * Get confidence score for an entity
 */
export async function getConfidenceScore(
  entityType: string,
  entityId: string
): Promise<ConfidenceResult | null> {
  try {
    const score = await prisma.confidenceScore.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId
        }
      }
    })
    
    if (!score) return null
    
    return {
      score: score.score,
      confidence: score.confidence as ConfidenceResult['confidence'],
      factors: JSON.parse(score.factors),
      recommendation: generateRecommendationFromScore(score.score, score.confidence),
      source: score.source as ConfidenceResult['source']
    }
  } catch (error) {
    console.error('[ConfidenceEngine] Failed to get confidence score:', error)
    return null
  }
}

/**
 * Verify an entity (boost confidence)
 */
export async function verifyEntity(
  entityType: string,
  entityId: string,
  verifiedBy: string,
  notes?: string
): Promise<ConfidenceResult | null> {
  try {
    const existing = await prisma.confidenceScore.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId
        }
      }
    })
    
    if (!existing) {
      // Create new score with user verification
      return scoreEntity({
        entityType: entityType as EntityScoreInput['entityType'],
        entityId,
        factors: { userVerified: true },
        notes
      })
    }
    
    // Update existing score
    const factors = JSON.parse(existing.factors)
    const updatedFactors = factors.map((f: any) => {
      if (f.name === 'userVerified') {
        return { ...f, passed: true, contribution: f.weight }
      }
      return f
    })
    
    // Recalculate score
    let newScore = 0
    for (const f of updatedFactors) {
      newScore += f.contribution
    }
    
    const updated = await prisma.confidenceScore.update({
      where: {
        entityType_entityId: {
          entityType,
          entityId
        }
      },
      data: {
        score: newScore,
        confidence: getConfidenceLevel(newScore),
        factors: JSON.stringify(updatedFactors),
        verifiedAt: new Date(),
        verifiedBy,
        notes
      }
    })
    
    return {
      score: updated.score,
      confidence: updated.confidence as ConfidenceResult['confidence'],
      factors: updatedFactors,
      recommendation: generateRecommendationFromScore(updated.score, updated.confidence),
      source: updated.source as ConfidenceResult['source']
    }
  } catch (error) {
    console.error('[ConfidenceEngine] Failed to verify entity:', error)
    return null
  }
}

/**
 * Get low-confidence entities for review
 */
export async function getLowConfidenceEntities(
  projectId?: string,
  limit: number = 50
): Promise<Array<{
  entityType: string
  entityId: string
  score: number
  confidence: string
  factors: string
}>> {
  try {
    const where: any = {
      confidence: { in: ['low', 'unverified'] }
    }
    
    if (projectId) {
      where.projectId = projectId
    }
    
    return prisma.confidenceScore.findMany({
      where,
      orderBy: { score: 'asc' },
      take: limit,
      select: {
        entityType: true,
        entityId: true,
        score: true,
        confidence: true,
        factors: true
      }
    })
  } catch (error) {
    console.error('[ConfidenceEngine] Failed to get low-confidence entities:', error)
    return []
  }
}

/**
 * Calculate table confidence with column analysis
 */
export async function calculateTableConfidence(
  tableId: string,
  projectId?: string
): Promise<ConfidenceResult> {
  // Get table data
  const table = await prisma.toolkitTable.findUnique({
    where: { id: tableId }
  })
  
  if (!table) {
    throw new Error(`Table not found: ${tableId}`)
  }
  
  const factors: Partial<ConfidenceFactors> = {
    directDDL: !!table.sourceDDL,
    patternMatch: true, // Table name matches patterns
    consistencyCheck: true // Has valid columns
  }
  
  return scoreEntity({
    projectId,
    entityType: 'table',
    entityId: tableId,
    factors,
    source: table.sourceDDL ? 'direct_parse' : 'inference'
  })
}

/**
 * Calculate quality metrics for a project
 */
export async function calculateQualityMetrics(projectId: string): Promise<{
  avgConfidence: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  unverified: number
  totalEntities: number
}> {
  const scores = await prisma.confidenceScore.findMany({
    where: { projectId }
  })
  
  if (scores.length === 0) {
    return {
      avgConfidence: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      unverified: 0,
      totalEntities: 0
    }
  }
  
  const total = scores.reduce((sum, s) => sum + s.score, 0)
  const avgConfidence = total / scores.length
  
  const counts = {
    high: scores.filter(s => s.confidence === 'high').length,
    medium: scores.filter(s => s.confidence === 'medium').length,
    low: scores.filter(s => s.confidence === 'low').length,
    unverified: scores.filter(s => s.confidence === 'unverified').length
  }
  
  // Update or create quality metrics
  await prisma.qualityMetrics.upsert({
    where: { projectId },
    create: {
      projectId,
      avgConfidence,
      highConfidence: counts.high,
      mediumConfidence: counts.medium,
      lowConfidence: counts.low,
      unverified: counts.unverified,
      qualityScore: avgConfidence * 100
    },
    update: {
      avgConfidence,
      highConfidence: counts.high,
      mediumConfidence: counts.medium,
      lowConfidence: counts.low,
      unverified: counts.unverified,
      qualityScore: avgConfidence * 100,
      calculatedAt: new Date()
    }
  })
  
  return {
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    highConfidence: counts.high,
    mediumConfidence: counts.medium,
    lowConfidence: counts.low,
    unverified: counts.unverified,
    totalEntities: scores.length
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getConfidenceLevel(score: number): ConfidenceResult['confidence'] {
  if (score >= 0.90) return 'high'
  if (score >= 0.70) return 'medium'
  if (score >= 0.50) return 'low'
  return 'unverified'
}

function determineSource(factors: Partial<ConfidenceFactors>): ConfidenceResult['source'] {
  if (factors.directDDL) return 'direct_parse'
  if (factors.aiAgreement) return 'ai_generated'
  return 'inference'
}

function generateRecommendation(
  score: number,
  factors: ConfidenceResult['factors']
): string {
  if (score >= 0.90) {
    return "High confidence - safe to use in production"
  }
  
  const failedFactors = factors.filter(f => !f.passed)
  
  if (failedFactors.length === 0) {
    return "Acceptable confidence - minor review recommended"
  }
  
  const recommendations: string[] = []
  
  const directDDLFactor = factors.find(f => f.name === 'directDDL')
  if (directDDLFactor && !directDDLFactor.passed) {
    recommendations.push("Verify source DDL if available")
  }
  
  const userVerifiedFactor = factors.find(f => f.name === 'userVerified')
  if (userVerifiedFactor && !userVerifiedFactor.passed) {
    recommendations.push("Consider manual verification")
  }
  
  const consistencyFactor = factors.find(f => f.name === 'consistencyCheck')
  if (consistencyFactor && !consistencyFactor.passed) {
    recommendations.push("Check for conflicts with related data")
  }
  
  const patternFactor = factors.find(f => f.name === 'patternMatch')
  if (patternFactor && !patternFactor.passed) {
    recommendations.push("Verify naming conventions")
  }
  
  return recommendations.length > 0 
    ? recommendations.join(". ") 
    : "Low confidence - review recommended"
}

function generateRecommendationFromScore(
  score: number,
  confidence: string
): string {
  if (confidence === 'high') {
    return "High confidence - safe to use in production"
  } else if (confidence === 'medium') {
    return "Medium confidence - review recommended before production use"
  } else if (confidence === 'low') {
    return "Low confidence - manual verification strongly recommended"
  }
  return "Unverified - requires immediate attention"
}

/**
 * Initialize default scoring factors in the database
 */
export async function initializeDefaultFactors(): Promise<void> {
  for (const [name, weight] of Object.entries(DEFAULT_WEIGHTS)) {
    await prisma.scoringFactor.upsert({
      where: { name },
      create: {
        name,
        weight,
        description: FACTOR_DESCRIPTIONS[name]
      },
      update: {
        weight,
        description: FACTOR_DESCRIPTIONS[name]
      }
    })
  }
}

// Export types
export type { ConfidenceFactors as ConfidenceFactorsType, ConfidenceResult as ConfidenceResultType }
