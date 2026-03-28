/**
 * SMART FIXER API
 * ===============
 * REST API for Phase 3 Smart Fixer operations
 * 
 * GET Endpoints:
 * - suggestions: Get fix suggestions for an issue
 * - history: Get fix history for a scan
 * - backups: Get backups for a scan
 * - compare: Compare current file with backup
 * - patterns: Get learned fix patterns
 * - rules: Get auto-apply rules
 * 
 * POST Endpoints:
 * - generate: Generate fix suggestions for an issue
 * - apply: Apply a fix
 * - apply-multiple: Apply multiple fixes
 * - auto-apply: Auto-apply all safe fixes
 * - restore: Restore from backup
 * - compare-fixes: Compare multiple fix options
 * - learn-pattern: Learn a new fix pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { smartFixer, IssueAnalysis } from '@/lib/smart-fixer'
import { autoApplyEngine, backupRestoreService, ApplyFixRequest } from '@/lib/auto-apply'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'suggestions'
  const issueId = request.nextUrl.searchParams.get('issueId')
  const scanId = request.nextUrl.searchParams.get('scanId')
  const backupId = request.nextUrl.searchParams.get('backupId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

  try {
    switch (action) {
      case 'suggestions':
        if (!issueId) {
          return NextResponse.json({ success: false, error: 'issueId required' }, { status: 400 })
        }
        return NextResponse.json(await getFixSuggestions(issueId))

      case 'history':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        return NextResponse.json(await getFixHistory(scanId))

      case 'backups':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          backups: await autoApplyEngine.getBackups(scanId)
        })

      case 'compare':
        if (!backupId) {
          return NextResponse.json({ success: false, error: 'backupId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          comparison: await backupRestoreService.compareWithBackup(backupId)
        })

      case 'patterns':
        return NextResponse.json(await getFixPatterns(limit))

      case 'rules':
        return NextResponse.json(await getAutoApplyRules())

      case 'stats':
        return NextResponse.json(await getFixStats())

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Smart Fixer API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'generate':
        return NextResponse.json(await generateFixes(body.issue))

      case 'apply':
        return NextResponse.json(await applyFix(body))

      case 'apply-multiple':
        return NextResponse.json(await applyMultipleFixes(body.fixes, body.options))

      case 'auto-apply':
        return NextResponse.json(await autoApplySafeFixes(body.scanId))

      case 'restore':
        return NextResponse.json(await restoreBackup(body))

      case 'compare-fixes':
        return NextResponse.json(await compareFixes(body.fixIds))

      case 'learn-pattern':
        return NextResponse.json(await learnPattern(body))

      case 'create-rule':
        return NextResponse.json(await createAutoApplyRule(body.rule))

      case 'preview':
        return NextResponse.json(await previewFix(body))

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Smart Fixer POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getFixSuggestions(issueId: string) {
  const suggestions = await prisma.fixSuggestion.findMany({
    where: { issueId },
    orderBy: [
      { preferredFix: 'desc' },
      { confidence: 'desc' }
    ]
  })

  return {
    success: true,
    suggestions: suggestions.map(s => ({
      ...s,
      codeChange: JSON.parse(s.codeChange),
      affectedFiles: JSON.parse(s.affectedFiles),
      affectedEntities: JSON.parse(s.affectedEntities),
      alternatives: JSON.parse(s.alternatives)
    }))
  }
}

async function getFixHistory(scanId: string) {
  const history = await prisma.fixHistory.findMany({
    where: { scanId },
    orderBy: { appliedAt: 'desc' },
    include: {
      suggestion: {
        select: {
          fixType: true,
          description: true,
          confidence: true
        }
      }
    }
  })

  return {
    success: true,
    history
  }
}

async function getFixPatterns(limit: number) {
  const patterns = await prisma.fixPattern.findMany({
    where: { isActive: true },
    take: limit,
    orderBy: [
      { successRate: 'desc' },
      { timesApplied: 'desc' }
    ]
  })

  return {
    success: true,
    patterns: patterns.map(p => ({
      ...p,
      triggerCondition: JSON.parse(p.triggerCondition)
    }))
  }
}

async function getAutoApplyRules() {
  const rules = await prisma.autoApplyRule.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  return {
    success: true,
    rules: rules.map(r => ({
      ...r,
      issueTypes: JSON.parse(r.issueTypes),
      filePatterns: JSON.parse(r.filePatterns)
    }))
  }
}

async function getFixStats() {
  const [
    totalSuggestions,
    appliedSuggestions,
    revertedSuggestions,
    totalBackups,
    totalPatterns,
    autoAppliedCount
  ] = await Promise.all([
    prisma.fixSuggestion.count(),
    prisma.fixSuggestion.count({ where: { status: 'applied' } }),
    prisma.fixSuggestion.count({ where: { status: 'reverted' } }),
    prisma.backupSnapshot.count(),
    prisma.fixPattern.count({ where: { isActive: true } }),
    prisma.fixSuggestion.count({ where: { status: 'applied', autoSafe: true } })
  ])

  return {
    success: true,
    stats: {
      totalSuggestions,
      appliedSuggestions,
      revertedSuggestions,
      totalBackups,
      totalPatterns,
      autoAppliedCount,
      applyRate: totalSuggestions > 0 ? (appliedSuggestions / totalSuggestions * 100).toFixed(1) : '0',
      revertRate: appliedSuggestions > 0 ? (revertedSuggestions / appliedSuggestions * 100).toFixed(1) : '0'
    }
  }
}

async function generateFixes(issue: IssueAnalysis) {
  if (!issue.issueId || !issue.issueType) {
    return { success: false, error: 'issueId and issueType are required' }
  }

  const fixes = await smartFixer.generateFixes(issue)

  return {
    success: true,
    fixes,
    count: fixes.length
  }
}

async function applyFix(request: ApplyFixRequest) {
  if (!request.suggestionId || !request.scanId) {
    return { success: false, error: 'suggestionId and scanId are required' }
  }

  const result = await autoApplyEngine.applyFix(request)
  return result
}

async function applyMultipleFixes(
  fixes: ApplyFixRequest[],
  options: { stopOnError?: boolean; dryRun?: boolean } = {}
) {
  if (!fixes || !Array.isArray(fixes) || fixes.length === 0) {
    return { success: false, error: 'fixes array is required' }
  }

  const result = await autoApplyEngine.applyMultipleFixes(fixes, options)
  return {
    success: result.success,
    results: result.results,
    applied: result.results.filter(r => r.success).length,
    failed: result.results.filter(r => !r.success).length
  }
}

async function autoApplySafeFixes(scanId: string) {
  if (!scanId) {
    return { success: false, error: 'scanId is required' }
  }

  const results = await autoApplyEngine.autoApplySafeFixes(scanId)

  return {
    success: results.every(r => r.success),
    results,
    applied: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  }
}

async function restoreBackup(request: { scanId?: string; backupId?: string; filePath?: string }) {
  if (!request.scanId && !request.backupId) {
    return { success: false, error: 'scanId or backupId is required' }
  }

  if (request.backupId) {
    const result = await backupRestoreService.restoreBackup(request.backupId)
    return result
  }

  const result = await backupRestoreService.restoreScan({
    scanId: request.scanId!,
    filePath: request.filePath
  })

  return result
}

async function compareFixes(fixIds: string[]) {
  if (!fixIds || !Array.isArray(fixIds) || fixIds.length === 0) {
    return { success: false, error: 'fixIds array is required' }
  }

  const suggestions = await prisma.fixSuggestion.findMany({
    where: { id: { in: fixIds } }
  })

  const fixes = suggestions.map(s => ({
    id: s.id,
    fixType: s.fixType,
    description: s.description,
    codeChange: JSON.parse(s.codeChange),
    affectedFiles: JSON.parse(s.affectedFiles),
    affectedEntities: JSON.parse(s.affectedEntities),
    impactScore: s.impactScore,
    effortLevel: s.effortLevel,
    confidence: s.confidence,
    autoSafe: s.autoSafe,
    preferredFix: s.preferredFix,
    alternatives: JSON.parse(s.alternatives)
  }))

  const comparison = await smartFixer.compareFixes(fixes)

  return {
    success: true,
    fixes,
    comparison
  }
}

async function learnPattern(request: {
  issueType: string
  patternName: string
  triggerCondition: object
  fixTemplate: string
  source: string
}) {
  if (!request.issueType || !request.patternName || !request.fixTemplate) {
    return { success: false, error: 'issueType, patternName, and fixTemplate are required' }
  }

  await smartFixer.learnPattern(
    request.issueType,
    request.patternName,
    request.triggerCondition,
    request.fixTemplate,
    request.source
  )

  return {
    success: true,
    message: `Pattern "${request.patternName}" learned for ${request.issueType}`
  }
}

async function createAutoApplyRule(rule: {
  name: string
  description?: string
  issueTypes: string[]
  severityMax?: string
  confidenceMin?: number
  requireBackup?: boolean
  maxFiles?: number
}) {
  if (!rule.name || !rule.issueTypes) {
    return { success: false, error: 'name and issueTypes are required' }
  }

  const created = await prisma.autoApplyRule.create({
    data: {
      name: rule.name,
      description: rule.description,
      issueTypes: JSON.stringify(rule.issueTypes),
      severityMax: rule.severityMax || 'warning',
      confidenceMin: rule.confidenceMin || 0.9,
      requireBackup: rule.requireBackup ?? true,
      maxFiles: rule.maxFiles || 5,
      filePatterns: '[]'
    }
  })

  return {
    success: true,
    rule: {
      ...created,
      issueTypes: JSON.parse(created.issueTypes),
      filePatterns: JSON.parse(created.filePatterns)
    }
  }
}

async function previewFix(request: ApplyFixRequest) {
  const result = await autoApplyEngine.applyFix({
    ...request,
    dryRun: true
  })

  return result
}
