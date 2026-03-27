/**
 * CHAT LOGS ERROR DETECTION API
 * ==============================
 * Phase 2: Enhanced Detection - Auto-detect errors from chat logs
 *
 * Endpoints:
 * - GET  ?action=scan              - Scan chat logs for errors
 * - GET  ?action=patterns          - Get common error patterns
 * - GET  ?action=session&id=xxx    - Get error patterns for a session
 * - POST ?action=log               - Log detected errors to registry
 * - POST ?action=scan-and-log      - Scan and log in one operation
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  chatLogErrorDetector,
  DetectionOptions,
  DetectedError
} from '@/lib/error-management/chat-log-error-detector'

// =============================================================================
// GET HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'scan'

  try {
    switch (action) {
      case 'scan':
        return handleScan(searchParams)

      case 'patterns':
        return handleGetPatterns()

      case 'session':
        return handleGetSessionPatterns(searchParams)

      case 'stats':
        return handleGetStats(searchParams)

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error Detection API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'scan-and-log'

  try {
    const body = await request.json()

    switch (action) {
      case 'log':
        return handleLogErrors(body)

      case 'scan-and-log':
        return handleScanAndLog(searchParams)

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error Detection API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function handleScan(searchParams: URLSearchParams) {
  const options: DetectionOptions = {
    sessionId: searchParams.get('sessionId') || undefined,
    scanLimit: parseInt(searchParams.get('limit') || '100'),
    includeResolved: searchParams.get('includeResolved') === 'true'
  }

  // Parse dates
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (dateFrom) {
    options.dateFrom = new Date(dateFrom)
  }
  if (dateTo) {
    options.dateTo = new Date(dateTo)
  }

  const result = await chatLogErrorDetector.scanChatLogs(options)

  return NextResponse.json({
    success: true,
    data: result
  })
}

async function handleGetPatterns() {
  const patterns = await chatLogErrorDetector.getCommonErrorPatterns()

  return NextResponse.json({
    success: true,
    data: {
      patterns,
      total: patterns.length
    }
  })
}

async function handleGetSessionPatterns(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('id') || searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({
      success: false,
      error: 'sessionId or id parameter required'
    }, { status: 400 })
  }

  const result = await chatLogErrorDetector.getSessionErrorPatterns(sessionId)

  return NextResponse.json({
    success: true,
    data: result
  })
}

async function handleGetStats(searchParams: URLSearchParams) {
  const options: DetectionOptions = {
    scanLimit: parseInt(searchParams.get('limit') || '200')
  }

  const result = await chatLogErrorDetector.scanChatLogs(options)

  // Calculate additional stats
  const stats = {
    totalSessions: result.totalScanned,
    totalErrors: result.errorsDetected,
    newErrors: result.newErrors,
    repeatedErrors: result.repeatedErrors,
    byCategory: result.byCategory,
    bySeverity: result.bySeverity,
    topErrors: result.errors.slice(0, 10),
    errorRate: result.totalScanned > 0
      ? (result.errorsDetected / result.totalScanned).toFixed(2)
      : '0',
    repeatRate: result.errorsDetected > 0
      ? ((result.repeatedErrors / result.errorsDetected) * 100).toFixed(1)
      : '0'
  }

  return NextResponse.json({
    success: true,
    data: stats
  })
}

async function handleLogErrors(body: { errors: DetectedError[] }) {
  if (!body.errors || !Array.isArray(body.errors)) {
    return NextResponse.json({
      success: false,
      error: 'errors array is required'
    }, { status: 400 })
  }

  const result = await chatLogErrorDetector.logDetectedErrors(body.errors)

  return NextResponse.json({
    success: true,
    data: result
  })
}

async function handleScanAndLog(searchParams: URLSearchParams) {
  const options: DetectionOptions = {
    sessionId: searchParams.get('sessionId') || undefined,
    scanLimit: parseInt(searchParams.get('limit') || '100'),
    includeResolved: searchParams.get('includeResolved') === 'true'
  }

  // Parse dates
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (dateFrom) {
    options.dateFrom = new Date(dateFrom)
  }
  if (dateTo) {
    options.dateTo = new Date(dateTo)
  }

  // Scan for errors
  const scanResult = await chatLogErrorDetector.scanChatLogs(options)

  // Log detected errors to registry
  const logResult = await chatLogErrorDetector.logDetectedErrors(scanResult.errors)

  return NextResponse.json({
    success: true,
    data: {
      scan: {
        totalScanned: scanResult.totalScanned,
        errorsDetected: scanResult.errorsDetected,
        newErrors: scanResult.newErrors,
        repeatedErrors: scanResult.repeatedErrors,
        byCategory: scanResult.byCategory,
        bySeverity: scanResult.bySeverity
      },
      log: logResult
    }
  })
}
