// =============================================================================
// FK Resolution API Route
// Handles missing table detection, resolution queue, and 3 resolution paths
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { FKResolver, ResolutionQueue, ManualTableDesign } from '@/lib/fk-resolver';
import { parseSqlServer } from '@/lib/sql-parser';
import { prisma } from '@/lib/db';

// Store resolvers in memory per project (in production, use Redis or similar)
const resolvers = new Map<string, FKResolver>();

function getResolver(projectId: string): FKResolver {
  if (!resolvers.has(projectId)) {
    resolvers.set(projectId, new FKResolver(projectId));
  }
  return resolvers.get(projectId)!;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      case 'analyze':
        return await analyzeFKs(body);
      
      case 'resolve-upload':
        return await resolveViaUpload(body);
      
      case 'resolve-manual':
        return await resolveViaManual(body);
      
      case 'resolve-ai':
        return await resolveViaAI(body);
      
      case 'get-unlock-chain':
        return await getUnlockChain(body);
      
      case 'get-dependency-chain':
        return await getDependencyChain(body);
      
      case 'save-session':
        return await saveSession(body);
      
      case 'load-session':
        return await loadSession(body);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('FK Resolution API error:', error);
    return NextResponse.json({ 
      error: errorMessage || 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      case 'get-queue':
        return await getResolutionQueue(projectId);
      
      case 'get-statistics':
        return await getStatistics(projectId);
      
      case 'get-missing-tables':
        return await getMissingTables(projectId);
      
      case 'get-table-status':
        const tableName = searchParams.get('tableName');
        if (!tableName) {
          return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
        }
        return await getTableStatus(projectId, tableName);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('FK Resolution API error:', error);
    return NextResponse.json({ 
      error: errorMessage || 'Internal server error' 
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYZE FK DEPENDENCIES
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeFKs(body: { projectId: string; sql: string }) {
  const { projectId, sql } = body;
  
  if (!sql) {
    return NextResponse.json({ error: 'SQL is required for analysis' }, { status: 400 });
  }

  // Parse SQL
  const parseResult = parseSqlServer(sql);
  
  if (parseResult.errors.length > 0) {
    return NextResponse.json({ 
      error: 'Parse errors', 
      errors: parseResult.errors 
    }, { status: 400 });
  }

  // Get or create resolver
  const resolver = getResolver(projectId);
  
  // Analyze tables
  const queue = await resolver.analyzeTables(parseResult.tables);
  
  // Save to database
  await saveResolutionData(projectId, queue, parseResult.tables);

  return NextResponse.json({
    success: true,
    queue,
    statistics: resolver.getStatistics(),
    tables: resolver.getAllTables()
  });
}

async function saveResolutionData(projectId: string, queue: ResolutionQueue, tables: any[]) {
  // Save missing table resolutions
  for (const item of queue.items) {
    await prisma.missingTableResolution.upsert({
      where: {
        projectId_tableName: {
          projectId,
          tableName: item.tableName
        }
      },
      create: {
        projectId,
        tableName: item.tableName,
        status: item.status,
        priority: item.priority,
        blocksCount: item.blocksCount,
        referencedBy: JSON.stringify(item.referencedBy),
        suggestedColumns: JSON.stringify(item.suggestedColumns || []),
        aiSuggestion: JSON.stringify(item.aiSuggestion || {})
      },
      update: {
        status: item.status,
        priority: item.priority,
        blocksCount: item.blocksCount,
        referencedBy: JSON.stringify(item.referencedBy),
        suggestedColumns: JSON.stringify(item.suggestedColumns || []),
        aiSuggestion: JSON.stringify(item.aiSuggestion || {})
      }
    });
  }

  // Create or update session
  const existingSession = await prisma.fKResolutionSession.findFirst({
    where: { projectId, status: 'active' }
  });

  if (existingSession) {
    await prisma.fKResolutionSession.update({
      where: { id: existingSession.id },
      data: {
        totalMissing: queue.totalMissing,
        totalResolved: queue.totalResolved,
        totalBlocked: queue.totalBlocked,
        buildOrder: JSON.stringify(queue.buildOrder),
        circularDeps: JSON.stringify(queue.circularDependencies)
      }
    });
  } else {
    await prisma.fKResolutionSession.create({
      data: {
        projectId,
        totalMissing: queue.totalMissing,
        totalResolved: queue.totalResolved,
        totalBlocked: queue.totalBlocked,
        buildOrder: JSON.stringify(queue.buildOrder),
        circularDeps: JSON.stringify(queue.circularDependencies)
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLUTION PATHS
// ═══════════════════════════════════════════════════════════════════════════

async function resolveViaUpload(body: { projectId: string; tableName: string; sqlContent: string }) {
  const { projectId, tableName, sqlContent } = body;
  
  if (!tableName || !sqlContent) {
    return NextResponse.json({ error: 'tableName and sqlContent are required' }, { status: 400 });
  }

  const resolver = getResolver(projectId);
  const result = await resolver.resolveViaUpload(tableName, sqlContent);

  // Log action
  await logResolutionAction(projectId, tableName, 'upload', result.success, result.error);

  if (result.success) {
    // Update database
    await prisma.missingTableResolution.update({
      where: {
        projectId_tableName: { projectId, tableName }
      },
      data: {
        status: 'complete',
        resolutionPath: 'upload_sql',
        resolutionStatus: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'upload'
      }
    });

    // Update session
    await updateSessionStats(projectId, resolver);
  }

  return NextResponse.json({
    success: result.success,
    table: result.table,
    unlockedTables: result.unlockedTables,
    remainingMissing: result.remainingMissing,
    error: result.error
  });
}

async function resolveViaManual(body: { projectId: string; design: ManualTableDesign }) {
  const { projectId, design } = body;
  
  if (!design || !design.tableName || !design.columns) {
    return NextResponse.json({ error: 'Valid design with tableName and columns is required' }, { status: 400 });
  }

  const resolver = getResolver(projectId);
  const result = await resolver.resolveViaManual(design);

  // Log action
  await logResolutionAction(projectId, design.tableName, 'manual', result.success, result.error);

  if (result.success) {
    // Update database
    await prisma.missingTableResolution.update({
      where: {
        projectId_tableName: { projectId, tableName: design.tableName }
      },
      data: {
        status: 'complete',
        resolutionPath: 'manual_design',
        resolutionStatus: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'manual'
      }
    });

    await updateSessionStats(projectId, resolver);
  }

  return NextResponse.json({
    success: result.success,
    table: result.table,
    unlockedTables: result.unlockedTables,
    remainingMissing: result.remainingMissing,
    error: result.error
  });
}

async function resolveViaAI(body: { projectId: string; tableName: string }) {
  const { projectId, tableName } = body;
  
  if (!tableName) {
    return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
  }

  const resolver = getResolver(projectId);
  const result = await resolver.resolveViaAI(tableName);

  // Log action
  await logResolutionAction(projectId, tableName, 'ai_design', result.success, result.error);

  if (result.success) {
    // Update database
    await prisma.missingTableResolution.update({
      where: {
        projectId_tableName: { projectId, tableName }
      },
      data: {
        status: 'complete',
        resolutionPath: 'ai_design',
        resolutionStatus: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'ai'
      }
    });

    await updateSessionStats(projectId, resolver);
  }

  return NextResponse.json({
    success: result.success,
    table: result.table,
    unlockedTables: result.unlockedTables,
    remainingMissing: result.remainingMissing,
    error: result.error
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAIN & STATUS
// ═══════════════════════════════════════════════════════════════════════════

async function getUnlockChain(body: { projectId: string; tableName: string }) {
  const { projectId, tableName } = body;
  
  const resolver = getResolver(projectId);
  const chain = resolver.getUnlockChain(tableName);

  return NextResponse.json({
    success: true,
    tableName,
    unlockChain: chain,
    totalUnlocked: chain.flat().length
  });
}

async function getDependencyChain(body: { projectId: string; tableName: string }) {
  const { projectId, tableName } = body;
  
  const resolver = getResolver(projectId);
  const chain = resolver.getDependencyChain(tableName);

  return NextResponse.json({
    success: true,
    tableName,
    dependencyChain: chain,
    totalMissing: chain.flat().length
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET METHODS
// ═══════════════════════════════════════════════════════════════════════════

async function getResolutionQueue(projectId: string) {
  const resolver = getResolver(projectId);
  const queue = resolver.getQueue();

  if (queue) {
    return NextResponse.json({
      success: true,
      queue
    });
  }

  // Load from database
  const session = await prisma.fKResolutionSession.findFirst({
    where: { projectId, status: 'active' }
  });

  const missingTables = await prisma.missingTableResolution.findMany({
    where: { projectId },
    orderBy: [
      { priority: 'desc' },
      { blocksCount: 'desc' }
    ]
  });

  return NextResponse.json({
    success: true,
    queue: {
      items: missingTables.map(t => ({
        tableName: t.tableName,
        status: t.status,
        priority: t.priority,
        blocksCount: t.blocksCount,
        referencedBy: JSON.parse(t.referencedBy),
        resolutionPath: t.resolutionPath,
        resolutionStatus: t.resolutionStatus,
        suggestedColumns: JSON.parse(t.suggestedColumns),
        aiSuggestion: JSON.parse(t.aiSuggestion),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      totalMissing: session?.totalMissing || missingTables.length,
      totalResolved: session?.totalResolved || 0,
      totalBlocked: session?.totalBlocked || 0,
      circularDependencies: session ? JSON.parse(session.circularDeps) : [],
      buildOrder: session ? JSON.parse(session.buildOrder) : []
    }
  });
}

async function getStatistics(projectId: string) {
  const resolver = getResolver(projectId);
  const stats = resolver.getStatistics();

  return NextResponse.json({
    success: true,
    statistics: stats
  });
}

async function getMissingTables(projectId: string) {
  const missingTables = await prisma.missingTableResolution.findMany({
    where: { 
      projectId,
      resolutionStatus: 'pending'
    },
    orderBy: [
      { priority: 'desc' },
      { blocksCount: 'desc' }
    ]
  });

  return NextResponse.json({
    success: true,
    missingTables,
    count: missingTables.length
  });
}

async function getTableStatus(projectId: string, tableName: string) {
  const resolver = getResolver(projectId);
  const status = resolver.getTableStatus(tableName);

  return NextResponse.json({
    success: true,
    tableName,
    status
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

async function saveSession(body: { projectId: string }) {
  const { projectId } = body;
  const resolver = getResolver(projectId);
  const queue = resolver.getQueue();
  const tables = resolver.getAllTables();

  // Save all data
  if (queue) {
    await saveResolutionData(projectId, queue, tables);
  }

  return NextResponse.json({
    success: true,
    message: 'Session saved successfully'
  });
}

async function loadSession(body: { projectId: string }) {
  const { projectId } = body;

  const session = await prisma.fKResolutionSession.findFirst({
    where: { projectId, status: 'active' },
    orderBy: { createdAt: 'desc' }
  });

  if (!session) {
    return NextResponse.json({
      success: false,
      error: 'No active session found'
    });
  }

  const missingTables = await prisma.missingTableResolution.findMany({
    where: { projectId }
  });

  return NextResponse.json({
    success: true,
    session: {
      ...session,
      buildOrder: JSON.parse(session.buildOrder),
      circularDeps: JSON.parse(session.circularDeps)
    },
    missingTables
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function logResolutionAction(projectId: string, tableName: string, action: string, success: boolean, error?: string) {
  await prisma.fKResolutionLog.create({
    data: {
      projectId,
      tableName,
      action,
      success,
      error,
      metadata: JSON.stringify({ timestamp: new Date().toISOString() })
    }
  });
}

async function updateSessionStats(projectId: string, resolver: FKResolver) {
  const stats = resolver.getStatistics();
  const queue = resolver.getQueue();

  await prisma.fKResolutionSession.updateMany({
    where: { projectId, status: 'active' },
    data: {
      totalMissing: stats.missing,
      totalResolved: stats.complete + stats.standalone,
      totalBlocked: stats.partial,
      buildOrder: JSON.stringify(queue?.buildOrder || [])
    }
  });
}
