/**
 * SCOPE-AWARE CONTRACT VALIDATOR API
 * ===================================
 * REST API for Contract Validator with project scope support
 * 
 * This API respects:
 * - Project scope (all, single, multi)
 * - Context settings (global, isolated)
 * - Test inheritance and sharing
 * 
 * GET Endpoints:
 * - stats: Get validation statistics for current scope
 * - scans: List scans with scope filtering
 * - scan: Get single scan with scope context
 * - tests: List contract tests with scope
 * - issues: List validation issues within scope
 * - comparison: Compare scans across projects
 * 
 * POST Endpoints:
 * - create-scan: Create scan with project scope
 * - create-test: Create contract test with scope
 * - run-validation: Run validation for scope
 * - promote-test: Promote test template to global
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  parseScopeFromRequest,
  buildScopeContext,
  buildEntityFilter,
  promoteToGlobal,
  ScopeContext
} from '@/lib/api/scope-utils'

// Helper function to build project filter
function buildProjectFilter(scopeContext: ScopeContext) {
  return buildEntityFilter(scopeContext, 'projectId')
}

// Helper function to check if promotion to global is allowed
function canPromoteToGlobal(scopeContext: ScopeContext, entityType: string): boolean {
  return scopeContext.scope.type === 'project' && 
         (scopeContext.settings?.allowGlobalPromotion ?? true)
}

// =============================================================================
// GET HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'stats'
  const scanId = request.nextUrl.searchParams.get('scanId')
  const testId = request.nextUrl.searchParams.get('testId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')
  const status = request.nextUrl.searchParams.get('status')
  const severity = request.nextUrl.searchParams.get('severity')

  try {
    // Build scope context from request
    const scope = parseScopeFromRequest(request)
    const scopeContext = await buildScopeContext(scope)

    switch (action) {
      case 'stats':
        return NextResponse.json(await getValidationStats(scopeContext))

      case 'scans':
        return NextResponse.json(await listScansWithScope(scopeContext, status, limit, offset))

      case 'scan':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        return NextResponse.json(await getScanWithScope(scanId, scopeContext))

      case 'tests':
        return NextResponse.json(await listTestsWithScope(scopeContext, limit, offset))

      case 'test':
        if (!testId) {
          return NextResponse.json({ success: false, error: 'testId required' }, { status: 400 })
        }
        return NextResponse.json(await getTestWithScope(testId, scopeContext))

      case 'issues':
        return NextResponse.json(await listIssuesWithScope(scopeContext, severity, limit, offset))

      case 'comparison':
        return NextResponse.json(await compareAcrossProjects(scopeContext))

      case 'scope-info':
        return NextResponse.json({
          success: true,
          scope: scopeContext.scope,
          settings: scopeContext.settings,
          inheritTests: scopeContext.settings?.inheritTests ?? false
        })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Scope-aware Contract Validator API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// =============================================================================
// POST HANDLERS
// =============================================================================

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    // Build scope context from request
    const scope = parseScopeFromRequest(request)
    const scopeContext = await buildScopeContext(scope)

    switch (action) {
      case 'create-scan':
        return NextResponse.json(await createScanWithScope(body.scan, scopeContext))

      case 'update-scan':
        return NextResponse.json(await updateScanWithScope(body.scanId, body.updates, scopeContext))

      case 'create-test':
        return NextResponse.json(await createTestWithScope(body.test, scopeContext))

      case 'update-test':
        return NextResponse.json(await updateTestWithScope(body.testId, body.updates, scopeContext))

      case 'run-validation':
        return NextResponse.json(await runValidation(body.scanId, scopeContext))

      case 'promote-test':
        return NextResponse.json(await promoteTestToGlobal(body.testId, scopeContext))

      case 'create-issue':
        return NextResponse.json(await createIssueWithScope(body.issue, scopeContext))

      case 'resolve-issue':
        return NextResponse.json(await resolveIssue(body.issueId, body.resolution, scopeContext))

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Scope-aware Contract Validator POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// =============================================================================
// HELPER FUNCTIONS - GET
// =============================================================================

async function getValidationStats(scopeContext: ScopeContext) {
  const projectFilter = buildProjectFilter(scopeContext)
  
  // Get scan counts
  const [
    totalScans,
    passedScans,
    failedScans,
    pendingScans,
    totalTests,
    totalIssues,
    issuesBySeverity,
    byProject
  ] = await Promise.all([
    // Total scans
    prisma.contractScan.count({ where: projectFilter }),
    // Passed scans
    prisma.contractScan.count({ 
      where: { ...projectFilter, status: 'passed' } 
    }),
    // Failed scans
    prisma.contractScan.count({ 
      where: { ...projectFilter, status: 'failed' } 
    }),
    // Pending scans
    prisma.contractScan.count({ 
      where: { ...projectFilter, status: 'pending' } 
    }),
    // Total tests
    prisma.contractTest.count({ where: projectFilter }),
    // Total issues
    prisma.contractIssueTest.count({ where: projectFilter }),
    // Issues by severity
    prisma.contractIssueTest.groupBy({
      by: ['severity'],
      where: projectFilter,
      _count: { id: true }
    }),
    // By project
    prisma.contractScan.groupBy({
      by: ['projectId'],
      where: projectFilter,
      _count: { id: true }
    })
  ])

  // Calculate pass rate
  const passRate = totalScans > 0 
    ? Math.round((passedScans / totalScans) * 100) 
    : 0

  return {
    success: true,
    stats: {
      scans: {
        total: totalScans,
        passed: passedScans,
        failed: failedScans,
        pending: pendingScans,
        passRate
      },
      tests: totalTests,
      issues: {
        total: totalIssues,
        bySeverity: issuesBySeverity.reduce((acc, item) => {
          acc[item.severity || 'unknown'] = item._count.id
          return acc
        }, {} as Record<string, number>)
      },
      byProject: byProject.reduce((acc, item) => {
        acc[item.projectId || 'global'] = item._count.id
        return acc
      }, {} as Record<string, number>),
      scope: {
        type: scopeContext.scope.type,
        projectIds: scopeContext.projectIds,
        includeGlobal: scopeContext.includeGlobal
      }
    }
  }
}

async function listScansWithScope(
  scopeContext: ScopeContext,
  status: string | null,
  limit: number,
  offset: number
) {
  const projectFilter = buildProjectFilter(scopeContext)
  const statusFilter = status ? { status } : {}
  const where = { ...projectFilter, ...statusFilter }

  const [scans, total] = await Promise.all([
    prisma.contractScan.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { issues: true, tests: true }
        }
      }
    }),
    prisma.contractScan.count({ where })
  ])

  return {
    success: true,
    scans: scans.map(s => ({
      id: s.id,
      scanId: s.scanId,
      projectId: s.projectId,
      status: s.status,
      endpointCount: s.endpointCount,
      passedCount: s.passedCount,
      failedCount: s.failedCount,
      warningCount: s.warningCount,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
      issueCount: s._count?.issues || 0,
      testCount: s._count?.tests || 0,
      isGlobal: s.projectId === null,
      scanScope: s.scanScope
    })),
    total,
    hasMore: offset + limit < total,
    scope: {
      type: scopeContext.scope.type,
      projectIds: scopeContext.projectIds
    }
  }
}

async function getScanWithScope(scanId: string, scopeContext: ScopeContext) {
  const scan = await prisma.contractScan.findUnique({
    where: { id: scanId },
    include: {
      issues: {
        take: 50,
        orderBy: { severity: 'desc' }
      },
      tests: {
        take: 50
      }
    }
  })

  if (!scan) {
    return { success: false, error: 'Scan not found' }
  }

  // Check scope access
  const inScope = scopeContext.isGlobalView ||
    scopeContext.projectIds.includes(scan.projectId || '') ||
    (scopeContext.includeGlobal && scan.projectId === null)

  if (!inScope) {
    return { success: false, error: 'Scan not in current scope' }
  }

  return {
    success: true,
    scan: {
      ...scan,
      config: scan.config ? JSON.parse(scan.config) : null,
      issues: scan.issues?.map(i => ({
        id: i.id,
        issueType: i.issueType,
        severity: i.severity,
        message: i.message,
        endpoint: i.endpoint,
        resolved: i.resolved
      })),
      tests: scan.tests?.map(t => ({
        id: t.id,
        testName: t.testName,
        testType: t.testType,
        status: t.status
      })),
      isGlobal: scan.projectId === null
    }
  }
}

async function listTestsWithScope(
  scopeContext: ScopeContext,
  limit: number,
  offset: number
) {
  // Include inherited tests if context settings allow
  const testFilter = buildEntityFilter(scopeContext, {
    projectIdField: 'projectId',
    includeInherited: scopeContext.settings?.inheritTests ?? false
  })

  const [tests, total] = await Promise.all([
    prisma.contractTest.findMany({
      where: testFilter,
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.contractTest.count({ where: testFilter })
  ])

  return {
    success: true,
    tests: tests.map(t => ({
      id: t.id,
      testName: t.testName,
      testType: t.testType,
      projectId: t.projectId,
      endpoint: t.endpoint,
      method: t.method,
      status: t.status,
      lastRunAt: t.lastRunAt,
      isGlobal: t.projectId === null,
      isInherited: scopeContext.includeGlobal && t.projectId === null
    })),
    total,
    hasMore: offset + limit < total
  }
}

async function getTestWithScope(testId: string, scopeContext: ScopeContext) {
  const test = await prisma.contractTest.findUnique({
    where: { id: testId }
  })

  if (!test) {
    return { success: false, error: 'Test not found' }
  }

  // Check scope
  const inScope = scopeContext.isGlobalView ||
    scopeContext.projectIds.includes(test.projectId || '') ||
    (scopeContext.includeGlobal && test.projectId === null)

  if (!inScope) {
    return { success: false, error: 'Test not in current scope' }
  }

  return {
    success: true,
    test: {
      ...test,
      requestSchema: test.requestSchema ? JSON.parse(test.requestSchema) : null,
      responseSchema: test.responseSchema ? JSON.parse(test.responseSchema) : null,
      expectedResponse: test.expectedResponse ? JSON.parse(test.expectedResponse) : null,
      headers: test.headers ? JSON.parse(test.headers) : null,
      isGlobal: test.projectId === null,
      isInherited: scopeContext.includeGlobal && test.projectId === null
    }
  }
}

async function listIssuesWithScope(
  scopeContext: ScopeContext,
  severity: string | null,
  limit: number,
  offset: number
) {
  const projectFilter = buildProjectFilter(scopeContext)
  const severityFilter = severity ? { severity } : {}
  const where = { ...projectFilter, ...severityFilter, resolved: false }

  const [issues, total] = await Promise.all([
    prisma.contractIssueTest.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    }),
    prisma.contractIssueTest.count({ where })
  ])

  return {
    success: true,
    issues: issues.map(i => ({
      id: i.id,
      issueType: i.issueType,
      severity: i.severity,
      message: i.message,
      endpoint: i.endpoint,
      method: i.method,
      projectId: i.projectId,
      scanId: i.scanId,
      createdAt: i.createdAt,
      resolved: i.resolved,
      isGlobal: i.projectId === null
    })),
    total,
    hasMore: offset + limit < total
  }
}

async function compareAcrossProjects(scopeContext: ScopeContext) {
  if (scopeContext.scope.type !== 'multi' || scopeContext.projectIds.length < 2) {
    return {
      success: false,
      error: 'Comparison requires multi-project scope with at least 2 projects'
    }
  }

  // Get stats for each project
  const projectStats = await Promise.all(
    scopeContext.projectIds.map(async projectId => {
      const [scans, tests, issues] = await Promise.all([
        prisma.contractScan.count({ where: { projectId } }),
        prisma.contractTest.count({ where: { projectId } }),
        prisma.contractIssueTest.count({ where: { projectId, resolved: false } })
      ])

      const project = await prisma.toolkitProject.findUnique({
        where: { id: projectId },
        select: { name: true }
      })

      return {
        projectId,
        projectName: project?.name || 'Unknown',
        scans,
        tests,
        openIssues: issues
      }
    })
  )

  // Find common issues across projects
  const commonIssues = await prisma.contractIssueTest.groupBy({
    by: ['issueType', 'message'],
    where: {
      projectId: { in: scopeContext.projectIds },
      resolved: false
    },
    having: {
      id: { _count: { gte: 2 } }
    },
    _count: { id: true }
  })

  return {
    success: true,
    comparison: {
      projects: projectStats,
      commonIssues: commonIssues.map(i => ({
        issueType: i.issueType,
        message: i.message,
        affectedProjects: i._count.id
      })),
      totalProjects: scopeContext.projectIds.length
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS - POST
// =============================================================================

async function createScanWithScope(
  scan: any,
  scopeContext: ScopeContext
) {
  const { scanId, endpoints, config, projectId } = scan

  if (!scanId) {
    return { success: false, error: 'scanId is required' }
  }

  // Determine project ID
  let entityProjectId = projectId
  if (!entityProjectId && scopeContext.scope.type === 'project') {
    entityProjectId = scopeContext.projectIds[0]
  }

  const created = await prisma.contractScan.create({
    data: {
      scanId,
      projectId: entityProjectId,
      scanScope: entityProjectId ? 'project' : 'global',
      status: 'pending',
      endpointCount: endpoints?.length || 0,
      passedCount: 0,
      failedCount: 0,
      warningCount: 0,
      config: config ? JSON.stringify(config) : null
    }
  })

  return {
    success: true,
    scanId: created.id,
    projectId: entityProjectId,
    isGlobal: entityProjectId === null
  }
}

async function updateScanWithScope(
  scanId: string,
  updates: any,
  scopeContext: ScopeContext
) {
  const scan = await prisma.contractScan.findUnique({
    where: { id: scanId }
  })

  if (!scan) {
    return { success: false, error: 'Scan not found' }
  }

  // Check scope
  const inScope = scopeContext.isGlobalView ||
    scopeContext.projectIds.includes(scan.projectId || '') ||
    (scopeContext.includeGlobal && scan.projectId === null)

  if (!inScope) {
    return { success: false, error: 'Scan not in current scope' }
  }

  const updated = await prisma.contractScan.update({
    where: { id: scanId },
    data: {
      ...updates,
      config: updates.config ? JSON.stringify(updates.config) : undefined,
      completedAt: updates.status === 'completed' ? new Date() : undefined,
      updatedAt: new Date()
    }
  })

  return {
    success: true,
    scan: updated
  }
}

async function createTestWithScope(
  test: any,
  scopeContext: ScopeContext
) {
  const {
    testName,
    testType,
    projectId,
    endpoint,
    method,
    requestSchema,
    responseSchema,
    expectedResponse,
    headers
  } = test

  if (!testName || !testType) {
    return { success: false, error: 'testName and testType are required' }
  }

  // Determine project ID
  let entityProjectId = projectId
  if (!entityProjectId && scopeContext.scope.type === 'project') {
    entityProjectId = scopeContext.projectIds[0]
  }

  const created = await prisma.contractTest.create({
    data: {
      testName,
      testType,
      projectId: entityProjectId,
      endpoint,
      method: method || 'GET',
      requestSchema: requestSchema ? JSON.stringify(requestSchema) : null,
      responseSchema: responseSchema ? JSON.stringify(responseSchema) : null,
      expectedResponse: expectedResponse ? JSON.stringify(expectedResponse) : null,
      headers: headers ? JSON.stringify(headers) : null,
      status: 'active'
    }
  })

  return {
    success: true,
    testId: created.id,
    projectId: entityProjectId,
    isGlobal: entityProjectId === null
  }
}

async function updateTestWithScope(
  testId: string,
  updates: any,
  scopeContext: ScopeContext
) {
  const test = await prisma.contractTest.findUnique({
    where: { id: testId }
  })

  if (!test) {
    return { success: false, error: 'Test not found' }
  }

  // Check scope
  const inScope = scopeContext.isGlobalView ||
    scopeContext.projectIds.includes(test.projectId || '') ||
    (scopeContext.includeGlobal && test.projectId === null)

  if (!inScope) {
    return { success: false, error: 'Test not in current scope' }
  }

  const updated = await prisma.contractTest.update({
    where: { id: testId },
    data: {
      ...updates,
      requestSchema: updates.requestSchema ? JSON.stringify(updates.requestSchema) : undefined,
      responseSchema: updates.responseSchema ? JSON.stringify(updates.responseSchema) : undefined,
      expectedResponse: updates.expectedResponse ? JSON.stringify(updates.expectedResponse) : undefined,
      headers: updates.headers ? JSON.stringify(updates.headers) : undefined,
      updatedAt: new Date()
    }
  })

  return {
    success: true,
    test: updated
  }
}

async function runValidation(scanId: string, scopeContext: ScopeContext) {
  // In production, this would trigger actual validation
  // For now, return mock result
  const scan = await prisma.contractScan.findUnique({
    where: { id: scanId }
  })

  if (!scan) {
    return { success: false, error: 'Scan not found' }
  }

  // Update scan status
  const updated = await prisma.contractScan.update({
    where: { id: scanId },
    data: {
      status: 'running',
      updatedAt: new Date()
    }
  })

  return {
    success: true,
    scan: updated,
    message: 'Validation started'
  }
}

async function promoteTestToGlobal(testId: string, scopeContext: ScopeContext) {
  if (!canPromoteToGlobal(scopeContext, 'test')) {
    return { success: false, error: 'Promotion to global is not allowed' }
  }

  const test = await prisma.contractTest.findUnique({
    where: { id: testId }
  })

  if (!test) {
    return { success: false, error: 'Test not found' }
  }

  if (test.projectId === null) {
    return { success: false, error: 'Test is already global' }
  }

  // Create global version
  const promoted = await prisma.contractTest.create({
    data: {
      testName: test.testName,
      testType: test.testType,
      projectId: null,
      endpoint: test.endpoint,
      method: test.method,
      requestSchema: test.requestSchema,
      responseSchema: test.responseSchema,
      expectedResponse: test.expectedResponse,
      headers: test.headers,
      status: 'active'
    }
  })

  return {
    success: true,
    promotedTest: promoted,
    sourceProjectId: test.projectId,
    message: 'Test promoted to global template'
  }
}

async function createIssueWithScope(
  issue: any,
  scopeContext: ScopeContext
) {
  const {
    scanId,
    issueType,
    severity,
    message,
    endpoint,
    method,
    projectId
  } = issue

  if (!issueType || !message) {
    return { success: false, error: 'issueType and message are required' }
  }

  // Determine project ID
  let entityProjectId = projectId
  if (!entityProjectId && scopeContext.scope.type === 'project') {
    entityProjectId = scopeContext.projectIds[0]
  }

  const created = await prisma.contractIssueTest.create({
    data: {
      scanId,
      issueType,
      severity: severity || 'medium',
      message,
      endpoint,
      method,
      projectId: entityProjectId,
      resolved: false
    }
  })

  return {
    success: true,
    issueId: created.id,
    projectId: entityProjectId
  }
}

async function resolveIssue(
  issueId: string,
  resolution: any,
  scopeContext: ScopeContext
) {
  const issue = await prisma.contractIssueTest.findUnique({
    where: { id: issueId }
  })

  if (!issue) {
    return { success: false, error: 'Issue not found' }
  }

  const updated = await prisma.contractIssueTest.update({
    where: { id: issueId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: resolution.resolvedBy,
      resolution: resolution.notes
    }
  })

  return {
    success: true,
    issue: updated,
    message: 'Issue resolved'
  }
}
