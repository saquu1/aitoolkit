/**
 * TEST GENERATOR API
 * ==================
 * REST API for Phase 4 Test Generator operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { testGenerator, TestSuiteConfig } from '@/lib/test-generator'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'tests'
  const scanId = request.nextUrl.searchParams.get('scanId')
  const testId = request.nextUrl.searchParams.get('testId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

  try {
    switch (action) {
      case 'tests':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          tests: await testGenerator.getTests(scanId)
        })

      case 'stats':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          stats: await testGenerator.getTestStats(scanId)
        })

      case 'test':
        if (!testId) {
          return NextResponse.json({ success: false, error: 'testId required' }, { status: 400 })
        }
        const test = await prisma.generatedTest.findUnique({ where: { id: testId } })
        return NextResponse.json({ success: !!test, test })

      case 'suites':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const suites = await prisma.testSuite.findMany({
          where: { scanId },
          include: { _count: { select: { tests: true } } }
        })
        return NextResponse.json({ success: true, suites })

      case 'runs':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const runs = await prisma.testRun.findMany({
          where: { scanId },
          orderBy: { createdAt: 'desc' },
          take: limit
        })
        return NextResponse.json({ success: true, runs })

      case 'contracts':
        const contracts = await prisma.contractDefinition.findMany({
          take: limit,
          orderBy: { updatedAt: 'desc' }
        })
        return NextResponse.json({
          success: true,
          contracts: contracts.map(c => ({
            ...c,
            schema: JSON.parse(c.schema),
            examples: JSON.parse(c.examples)
          }))
        })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Test Generator API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, scanId } = body

  try {
    switch (action) {
      case 'generate-contracts':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const contractTests = await testGenerator.generateContractTests(scanId)
        return NextResponse.json({
          success: true,
          tests: contractTests,
          count: contractTests.length,
          message: `Generated ${contractTests.length} contract tests`
        })

      case 'generate-from-issues':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const issueTests = await testGenerator.generateTestsFromIssues(scanId)
        return NextResponse.json({
          success: true,
          tests: issueTests,
          count: issueTests.length
        })

      case 'generate-suite':
        if (!scanId || !body.config) {
          return NextResponse.json({ success: false, error: 'scanId and config required' }, { status: 400 })
        }
        const suite = await testGenerator.generateTestSuite(scanId, body.config as TestSuiteConfig)
        return NextResponse.json({
          success: true,
          suiteId: suite.suiteId,
          testCount: suite.tests.length
        })

      case 'save-tests':
        if (!body.tests || !Array.isArray(body.tests)) {
          return NextResponse.json({ success: false, error: 'tests array required' }, { status: 400 })
        }
        const saveResult = await testGenerator.saveTestsToFilesystem(body.tests)
        return NextResponse.json({
          success: true,
          saved: saveResult.saved,
          errors: saveResult.errors
        })

      case 'record-run':
        if (!scanId || !body.results) {
          return NextResponse.json({ success: false, error: 'scanId and results required' }, { status: 400 })
        }
        const runId = await testGenerator.recordTestRun(
          scanId,
          body.suiteId,
          body.results
        )
        return NextResponse.json({
          success: true,
          runId
        })

      case 'update-test-status':
        if (!body.testId || !body.status) {
          return NextResponse.json({ success: false, error: 'testId and status required' }, { status: 400 })
        }
        await prisma.generatedTest.update({
          where: { id: body.testId },
          data: {
            status: body.status,
            lastRunAt: new Date(),
            lastResult: body.result,
            errorMessage: body.error,
            runCount: { increment: 1 },
            ...(body.status === 'passed' ? { passCount: { increment: 1 } } : {}),
            ...(body.status === 'failed' ? { failCount: { increment: 1 } } : {})
          }
        })
        return NextResponse.json({ success: true })

      case 'create-contract':
        if (!body.contract) {
          return NextResponse.json({ success: false, error: 'contract required' }, { status: 400 })
        }
        const contract = await prisma.contractDefinition.create({
          data: {
            contractType: body.contract.contractType,
            name: body.contract.name,
            version: body.contract.version || '1.0.0',
            schema: JSON.stringify(body.contract.schema),
            examples: JSON.stringify(body.contract.examples || []),
            sourceFile: body.contract.sourceFile,
            autoGenerated: body.contract.autoGenerated ?? true
          }
        })
        return NextResponse.json({
          success: true,
          contract: {
            ...contract,
            schema: JSON.parse(contract.schema),
            examples: JSON.parse(contract.examples)
          }
        })

      case 'delete-tests':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const deleted = await prisma.generatedTest.deleteMany({ where: { scanId } })
        return NextResponse.json({
          success: true,
          deleted: deleted.count
        })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Test Generator POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
