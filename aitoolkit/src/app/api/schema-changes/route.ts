// =============================================================================
// API Route - Schema Change Detection
// =============================================================================
// Detects schema changes between uploads
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  SchemaChangeDetector, 
  createSchemaChangeDetector,
  SchemaSnapshot
} from '@/lib/parsers/schema-change-detector';
import { parseSqlServer } from '@/lib/sql-parser';

// POST /api/schema-changes/detect
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, sqlContent, uploadId, previousUploadId } = body;

    if (!projectId || !sqlContent || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, sqlContent, uploadId' },
        { status: 400 }
      );
    }

    // Parse the new SQL content
    const parseResult = parseSqlServer(sqlContent);

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'SQL parsing errors', details: parseResult.errors },
        { status: 400 }
      );
    }

    // Create change detector
    const detector = createSchemaChangeDetector(projectId);

    // Load previous snapshot if provided
    let previousSnapshot: SchemaSnapshot | undefined;
    if (previousUploadId) {
      try {
        const previousUpload = await prisma.toolkitTable.findFirst({
          where: { 
            projectId,
            sourceDDL: { contains: previousUploadId }
          }
        });
        
        if (previousUpload) {
          // Reconstruct snapshot from stored data
          // In production, would have proper snapshot storage
        }
      } catch (e) {
        // Continue without previous snapshot
      }
    }

    // Create new snapshot
    const currentSnapshot = detector.createSnapshot(
      parseResult.tables,
      parseResult.storedProcedures,
      uploadId,
      'sql_upload'
    );

    // Detect changes
    const changeResult = detector.detectChanges(currentSnapshot, previousSnapshot);

    return NextResponse.json({
      success: true,
      uploadId,
      previousUploadId: previousSnapshot?.uploadId || null,
      snapshot: {
        tables: currentSnapshot.tables.size,
        sps: currentSnapshot.storedProcedures.size,
        fks: currentSnapshot.foreignKeys.size,
        checksum: currentSnapshot.checksum
      },
      changes: changeResult
    });

  } catch (error) {
    console.error('Schema change detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect schema changes', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/schema-changes/history?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Get tables for this project
    const tables = await prisma.toolkitTable.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tableName: true,
        tableSchema: true,
        columnCount: true,
        hasPK: true,
        sourceDDL: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      projectId,
      tables,
      totalTables: tables.length
    });

  } catch (error) {
    console.error('Schema change history error:', error);
    return NextResponse.json(
      { error: 'Failed to get change history', message: (error as Error).message },
      { status: 500 }
    );
  }
}
