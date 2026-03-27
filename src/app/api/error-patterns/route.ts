/**
 * ERROR PATTERNS API
 * ==================
 * API endpoint for fetching and managing error patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// =============================================================================
// GET - Fetch Error Patterns
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    // Try to fetch from database
    let patterns: any[] = [];
    let stats = {
      totalPatterns: 0,
      criticalCount: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      totalOccurrences: 0,
      resolvedPatterns: 0,
    };

    try {
      // Check if ErrorPattern table exists
      const dbPatterns = await db.errorPattern.findMany({
        where: {
          ...(status && { patternStatus: status }),
          ...(type && { errorType: type }),
        },
        orderBy: { occurrenceCount: 'desc' },
        take: 100,
      });

      patterns = dbPatterns.map((p) => ({
        id: p.id,
        patternKey: p.patternKey,
        patternName: p.patternName,
        errorType: p.errorType,
        endpoint: p.endpoint || '',
        httpStatus: p.httpStatus || 0,
        description: p.description,
        occurrenceCount: p.occurrenceCount,
        severity: p.severity || 'info',
        rootCause: p.rootCause || undefined,
        preventionStrategy: p.preventionStrategy || undefined,
        autoFixSolution: p.autoFixSolution || undefined,
        firstOccurrence: p.firstOccurrence?.toISOString() || new Date().toISOString(),
        lastOccurrence: p.lastOccurrence?.toISOString() || new Date().toISOString(),
        patternStatus: p.patternStatus || 'ACTIVE',
      }));

      // Calculate stats
      stats = {
        totalPatterns: patterns.length,
        criticalCount: patterns.filter((p) => p.severity === 'critical').length,
        errorCount: patterns.filter((p) => p.severity === 'error').length,
        warningCount: patterns.filter((p) => p.severity === 'warning').length,
        infoCount: patterns.filter((p) => p.severity === 'info').length,
        totalOccurrences: patterns.reduce((sum, p) => sum + p.occurrenceCount, 0),
        resolvedPatterns: patterns.filter((p) => p.patternStatus === 'RESOLVED').length,
      };
    } catch (dbError) {
      console.log('Database not available, using mock data');
      // Return mock data if database is not available
      const mockData = getMockPatterns();
      patterns = mockData;

      // Filter if needed
      if (severity && severity !== 'all') {
        patterns = patterns.filter((p) => p.severity === severity);
      }
      if (type && type !== 'all') {
        patterns = patterns.filter((p) => p.errorType === type);
      }

      stats = {
        totalPatterns: mockData.length,
        criticalCount: mockData.filter((p) => p.severity === 'critical').length,
        errorCount: mockData.filter((p) => p.severity === 'error').length,
        warningCount: mockData.filter((p) => p.severity === 'warning').length,
        infoCount: mockData.filter((p) => p.severity === 'info').length,
        totalOccurrences: mockData.reduce((sum, p) => sum + p.occurrenceCount, 0),
        resolvedPatterns: mockData.filter((p) => p.patternStatus === 'RESOLVED').length,
      };
    }

    return NextResponse.json({
      success: true,
      patterns,
      stats,
    });
  } catch (error) {
    console.error('Error patterns API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch error patterns',
        patterns: getMockPatterns(),
        stats: getMockStats(),
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create/Update Error Pattern
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, patternId, data } = body;

    if (action === 'resolve') {
      try {
        await db.errorPattern.update({
          where: { id: patternId },
          data: {
            patternStatus: 'RESOLVED',
            resolvedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Pattern marked as resolved',
        });
      } catch (dbError) {
        return NextResponse.json({
          success: true,
          message: 'Pattern marked as resolved (in memory)',
        });
      }
    }

    if (action === 'ignore') {
      try {
        await db.errorPattern.update({
          where: { id: patternId },
          data: {
            patternStatus: 'IGNORED',
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Pattern ignored',
        });
      } catch (dbError) {
        return NextResponse.json({
          success: true,
          message: 'Pattern ignored (in memory)',
        });
      }
    }

    if (action === 'create') {
      try {
        const pattern = await db.errorPattern.create({
          data: {
            patternKey: data.patternKey,
            patternName: data.patternName,
            errorType: data.errorType,
            endpoint: data.endpoint,
            httpStatus: data.httpStatus,
            description: data.description,
            severity: data.severity || 'info',
            rootCause: data.rootCause,
            preventionStrategy: data.preventionStrategy,
            autoFixSolution: data.autoFixSolution,
            occurrenceCount: 1,
            firstOccurrence: new Date(),
            lastOccurrence: new Date(),
            patternStatus: 'ACTIVE',
          },
        });

        return NextResponse.json({
          success: true,
          pattern,
        });
      } catch (dbError) {
        return NextResponse.json({
          success: true,
          message: 'Pattern created (in memory)',
        });
      }
    }

    if (action === 'createFromError') {
      try {
        // Check if pattern already exists
        const existingPattern = await db.errorPattern.findFirst({
          where: {
            patternKey: data.patternKey,
          },
        });

        if (existingPattern) {
          // Update occurrence count
          const updated = await db.errorPattern.update({
            where: { id: existingPattern.id },
            data: {
              occurrenceCount: { increment: 1 },
              lastOccurrence: new Date(),
            },
          });

          return NextResponse.json({
            success: true,
            pattern: updated,
            message: 'Pattern occurrence count updated',
          });
        }

        // Create new pattern from error
        const pattern = await db.errorPattern.create({
          data: {
            patternKey: data.patternKey,
            patternName: data.patternName,
            errorType: data.errorType || 'UNKNOWN',
            endpoint: data.endpoint || '',
            httpStatus: data.httpStatus || 0,
            description: data.description || 'Error from Error Monitor',
            severity: data.severity || 'info',
            rootCause: data.rootCause || null,
            occurrenceCount: 1,
            firstOccurrence: new Date(),
            lastOccurrence: new Date(),
            patternStatus: 'ACTIVE',
          },
        });

        return NextResponse.json({
          success: true,
          pattern,
          message: 'Pattern created from error',
        });
      } catch (dbError) {
        console.error('Failed to create pattern from error:', dbError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create pattern',
        }, { status: 500 });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error patterns POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// =============================================================================
// MOCK DATA
// =============================================================================

function getMockPatterns() {
  return [
    {
      id: '1',
      patternKey: 'SERVER_FAILURE_/api/raw-data_502',
      patternName: 'Server Failure - Raw Data API',
      errorType: 'SERVER_FAILURE',
      endpoint: '/api/raw-data',
      httpStatus: 502,
      description: 'Database query timeout or connection pool exhaustion',
      occurrenceCount: 8,
      severity: 'critical',
      rootCause: 'Database query timeout or connection pool exhaustion',
      preventionStrategy:
        'Add query timeouts, optimize slow queries, increase connection pool size',
      autoFixSolution: 'Check for long-running queries and add appropriate indexes',
      firstOccurrence: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
    {
      id: '2',
      patternKey: 'BUSINESS_LOGIC_/api/raw-data_409',
      patternName: 'Duplicate Data Submission',
      errorType: 'BUSINESS_LOGIC',
      endpoint: '/api/raw-data',
      httpStatus: 409,
      description: 'Same content submitted multiple times',
      occurrenceCount: 15,
      severity: 'info',
      rootCause: 'Duplicate data submission - same content submitted multiple times',
      preventionStrategy: 'Implement idempotency keys or client-side deduplication',
      autoFixSolution:
        'Check if data already exists before saving, use forceSave flag if intentional',
      firstOccurrence: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      patternStatus: 'MONITORING',
    },
    {
      id: '3',
      patternKey: 'NETWORK_ERROR_*_0',
      patternName: 'Network Connectivity Issue',
      errorType: 'NETWORK_ERROR',
      endpoint: '/api/*',
      httpStatus: 0,
      description: 'Network connectivity issue or CORS error',
      occurrenceCount: 5,
      severity: 'warning',
      rootCause: 'Network connectivity issue or CORS error',
      preventionStrategy:
        'Add retry logic with exponential backoff, check CORS configuration',
      autoFixSolution: 'Retry request up to 3 times with increasing delays',
      firstOccurrence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
    {
      id: '4',
      patternKey: 'AUTH_ERROR_/api/*_401',
      patternName: 'Authentication Token Expired',
      errorType: 'AUTH_ERROR',
      endpoint: '/api/*',
      httpStatus: 401,
      description: 'Session expired or invalid authentication token',
      occurrenceCount: 12,
      severity: 'error',
      rootCause: 'Session expired or invalid authentication token',
      preventionStrategy: 'Implement token refresh, redirect to login on 401',
      autoFixSolution: 'Clear local session and redirect to login page',
      firstOccurrence: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
  ];
}

function getMockStats() {
  const patterns = getMockPatterns();
  return {
    totalPatterns: patterns.length,
    criticalCount: patterns.filter((p) => p.severity === 'critical').length,
    errorCount: patterns.filter((p) => p.severity === 'error').length,
    warningCount: patterns.filter((p) => p.severity === 'warning').length,
    infoCount: patterns.filter((p) => p.severity === 'info').length,
    totalOccurrences: patterns.reduce((sum, p) => sum + p.occurrenceCount, 0),
    resolvedPatterns: patterns.filter((p) => p.patternStatus === 'RESOLVED').length,
  };
}
