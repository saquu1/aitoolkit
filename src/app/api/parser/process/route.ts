// =============================================================================
import { prisma } from '@/lib/db'
// Unified Parser API - Process files and build unified schema
// =============================================================================
// Integrates SQL, CSHTML, and JS parsers with source tracking
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createParserIntegration } from '@/lib/parsers/parser-integration';
import { createSourceTracker } from '@/lib/source-tracker';


;

interface ProcessFilesRequest {
  projectId: string;
  files: Array<{
    name: string;
    content: string;
    type: 'sql' | 'cshtml' | 'js' | 'unknown';
  }>;
  options?: {
    trackSources?: boolean;
    addToVerificationQueue?: boolean;
    detectConflicts?: boolean;
  };
}

/**
 * POST /api/parser/process
 * Process multiple files and build unified schema with source tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body: ProcessFilesRequest = await request.json();

    // Validate request
    if (!body.projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!body.files || body.files.length === 0) {
      return NextResponse.json(
        { error: 'files array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Create parser integration engine
    const engine = createParserIntegration(body.projectId);

    // Process files
    const result = await engine.processFiles({
      projectId: body.projectId,
      files: body.files,
    });

    // Get current verification queue count
    const tracker = createSourceTracker(body.projectId);
    const stats = await tracker.getStatistics();

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        verificationQueueTotal: stats.verificationQueue.total,
      },
    });
  } catch (error) {
    console.error('Parser integration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process files',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/parser/process?projectId=xxx
 * Get parser status for a project
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  try {
    const tracker = createSourceTracker(projectId);
    const stats = await tracker.getStatistics();

    // Get recent source files
    const sourceFiles = await prisma.sourceFileRegistry.findMany({
      where: { projectId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        parseStatus: true,
        tablesExtracted: true,
        spsExtracted: true,
        endpointsFound: true,
        uploadedAt: true,
        parsedAt: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: 20,
    });

    // Get table summary
    const tables = await prisma.tableSourceRecord.findMany({
      where: { projectId },
      select: {
        tableName: true,
        discoveryMethod: true,
        hasCRUD_SPs: true,
        verificationStatus: true,
        columnCount: true,
      },
      orderBy: { tableName: 'asc' },
    });

    // Get pending verifications count
    const pendingVerifications = await prisma.verificationQueue.count({
      where: {
        projectId,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        statistics: stats,
        recentFiles: sourceFiles,
        tables,
        pendingVerifications,
      },
    });
  } catch (error) {
    console.error('Parser status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get parser status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
