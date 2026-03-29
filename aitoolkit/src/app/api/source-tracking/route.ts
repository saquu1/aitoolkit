// =============================================================================
import { prisma } from '@/lib/db'
// Source Tracking API Routes
// =============================================================================
// API routes for managing source files, table discovery, and verification
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

import { createSourceTracker } from '@/lib/source-tracker';

;

// Helper to get project ID from request
function getProjectId(request: NextRequest): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('projectId');
}

// =============================================================================
// GET - Get source tracking statistics
// =============================================================================
export async function GET(request: NextRequest) {
  const projectId = getProjectId(request);
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'statistics';

  try {
    const tracker = createSourceTracker(projectId);

    switch (action) {
      case 'source-files': {
        const files = await tracker.getSourceFiles();
        return NextResponse.json({ success: true, data: files });
      }

      case 'tables': {
        const verificationStatus = url.searchParams.get('verificationStatus') || undefined;
        const hasCRUD_SPs = url.searchParams.get('hasCRUD_SPs');
        const discoveryMethod = url.searchParams.get('discoveryMethod') || undefined;

        const tables = await tracker.getTableSourceRecords({
          verificationStatus,
          hasCRUD_SPs: hasCRUD_SPs ? hasCRUD_SPs === 'true' : undefined,
          discoveryMethod,
        });

        // Enrich with SP mappings
        const enrichedTables = await Promise.all(
          tables.map(async (table) => {
            const spMappings = await tracker.getSPMappingsForTable(table.tableName);
            return { ...table, spMappings };
          })
        );

        return NextResponse.json({ success: true, data: enrichedTables });
      }

      case 'verification-queue': {
        const status = url.searchParams.get('status') || undefined;
        const priority = url.searchParams.get('priority') || undefined;
        const entityType = url.searchParams.get('entityType') || undefined;

        const queue = await tracker.getVerificationQueue({
          status,
          priority,
          entityType,
        });

        return NextResponse.json({ success: true, data: queue });
      }

      case 'table-detail': {
        const tableName = url.searchParams.get('tableName');
        if (!tableName) {
          return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
        }

        // Get table source record
        const tableSource = await prisma.tableSourceRecord.findUnique({
          where: {
            projectId_tableName: { projectId, tableName },
          },
        });

        if (!tableSource) {
          return NextResponse.json({ error: 'Table not found' }, { status: 404 });
        }

        // Get column sources
        const columnSources = await prisma.columnSourceRecord.findMany({
          where: { projectId, tableName },
        });

        // Get SP mappings
        const spMappings = await prisma.sPTableMapping.findMany({
          where: { projectId, tableName },
        });

        // Get verification queue items
        const verificationItems = await prisma.verificationQueue.findMany({
          where: { projectId, entityType: 'table', entityId: tableSource.id },
        });

        // Get source file details
        const discoverySourceIds = JSON.parse(tableSource.discoverySources || '[]');
        const sourceFiles = await prisma.sourceFileRegistry.findMany({
          where: { id: { in: discoverySourceIds } },
        });

        return NextResponse.json({
          success: true,
          data: {
            table: tableSource,
            columns: columnSources,
            spMappings,
            verificationItems,
            sourceFiles,
          },
        });
      }

      case 'sp-mappings': {
        const spName = url.searchParams.get('spName');
        if (!spName) {
          return NextResponse.json({ error: 'spName is required' }, { status: 400 });
        }

        const mappings = await prisma.sPTableMapping.findMany({
          where: { projectId, spName },
        });

        return NextResponse.json({ success: true, data: mappings });
      }

      case 'statistics':
      default: {
        const stats = await tracker.getStatistics();
        return NextResponse.json({ success: true, data: stats });
      }
    }
  } catch (error) {
    console.error('Source tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Resolve verification or process files
// =============================================================================
export async function POST(request: NextRequest) {
  const projectId = getProjectId(request);
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Resolve verification
    if (body.action === 'resolve-verification') {
      const { verificationId, action, resolvedBy, resolutionData, reviewNotes } = body;

      if (!verificationId || !action || !resolvedBy) {
        return NextResponse.json(
          { error: 'verificationId, action, and resolvedBy are required' },
          { status: 400 }
        );
      }

      // Get the queue item first
      const queueItem = await prisma.verificationQueue.findUnique({
        where: { id: verificationId },
      });

      if (!queueItem) {
        return NextResponse.json({ error: 'Verification item not found' }, { status: 404 });
      }

      const tracker = createSourceTracker(queueItem.projectId);
      await tracker.resolveVerification({
        verificationId,
        action,
        resolvedBy,
        resolutionData,
        reviewNotes,
      });

      return NextResponse.json({
        success: true,
        message: `Verification item ${action}d successfully`,
      });
    }

    // Process files
    if (body.action === 'process-files') {
      // This would integrate with the parser integration engine
      // For now, return a placeholder
      return NextResponse.json({
        success: true,
        message: 'File processing initiated',
        note: 'Use the full parser integration endpoint for file processing',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Source tracking POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
