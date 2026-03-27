// =============================================================================
// CHAT LOGS INTELLIGENCE DASHBOARD API
// =============================================================================
// Provides comprehensive analytics data for the intelligence dashboard
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// =============================================================================
// GET /api/chat-logs/dashboard - Get Dashboard Data
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const sessionId = searchParams.get('sessionId');
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Build where clause
    const where: Prisma.ChatLogWhereInput = {};
    if (projectId) where.projectId = projectId;
    if (sessionId) where.sessionId = sessionId;
    if (range !== 'all') where.sessionDate = { gte: startDate };

    // Fetch sessions with analytics
    const sessions = await db.chatLog.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      take: 100,
      include: {
        analytics: true,
        _count: {
          select: {
            contentBlocks: true,
            toolCalls: true,
            fileOperations: true,
            issues: true,
            features: true,
          },
        },
      },
    });

    // Calculate aggregate stats
    const stats = await calculateStats(sessions, startDate);

    // Transform sessions for frontend
    const transformedSessions = sessions.map(transformSession);

    return NextResponse.json({
      success: true,
      sessions: transformedSessions,
      stats,
      dateRange: range,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function calculateStats(sessions: any[], startDate: Date) {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalTokens: 0,
      totalCost: 0,
      avgEfficiency: 0,
      avgQuality: 0,
      totalFilesModified: 0,
      totalIssues: 0,
      totalFeatures: 0,
      sessionsByType: {},
      sessionsByCategory: {},
      tokensByDay: [],
      costByDay: [],
    };
  }

  // Aggregate totals
  const totalTokens = sessions.reduce((sum, s) => {
    return sum + (s.analytics?.totalTokens || 0);
  }, 0);

  const totalCost = sessions.reduce((sum, s) => {
    return sum + (s.analytics?.estimatedCost || 0);
  }, 0);

  const avgEfficiency = sessions.reduce((sum, s) => {
    return sum + (s.analytics?.efficiencyScore || 0);
  }, 0) / sessions.length;

  const avgQuality = sessions.reduce((sum, s) => {
    return sum + (s.analytics?.qualityScore || 0);
  }, 0) / sessions.length;

  const totalFilesModified = sessions.reduce((sum, s) => {
    return sum + (s._count?.fileOperations || 0);
  }, 0);

  const totalIssues = sessions.reduce((sum, s) => {
    return sum + (s._count?.issues || 0);
  }, 0);

  const totalFeatures = sessions.reduce((sum, s) => {
    return sum + (s._count?.features || 0);
  }, 0);

  // Group by type
  const sessionsByType: Record<string, number> = {};
  sessions.forEach(s => {
    const type = s.sessionType || 'UNKNOWN';
    sessionsByType[type] = (sessionsByType[type] || 0) + 1;
  });

  // Group by category
  const sessionsByCategory: Record<string, number> = {};
  sessions.forEach(s => {
    const cat = s.category || 'general';
    sessionsByCategory[cat] = (sessionsByCategory[cat] || 0) + 1;
  });

  // Group tokens by day
  const tokensByDayMap = new Map<string, number>();
  const costByDayMap = new Map<string, number>();

  sessions.forEach(s => {
    const date = new Date(s.sessionDate).toISOString().split('T')[0];
    tokensByDayMap.set(date, (tokensByDayMap.get(date) || 0) + (s.analytics?.totalTokens || 0));
    costByDayMap.set(date, (costByDayMap.get(date) || 0) + (s.analytics?.estimatedCost || 0));
  });

  const tokensByDay = Array.from(tokensByDayMap.entries())
    .map(([date, tokens]) => ({ date, tokens }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const costByDay = Array.from(costByDayMap.entries())
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalSessions: sessions.length,
    totalTokens,
    totalCost,
    avgEfficiency: Math.round(avgEfficiency),
    avgQuality: Math.round(avgQuality),
    totalFilesModified,
    totalIssues,
    totalFeatures,
    sessionsByType,
    sessionsByCategory,
    tokensByDay,
    costByDay,
  };
}

function transformSession(session: any) {
  const analytics = session.analytics || {};

  return {
    id: session.id,
    sessionId: session.sessionId,
    title: session.title || 'Untitled Session',
    summary: session.summary || '',
    sessionDate: session.sessionDate,
    model: analytics.model || 'unknown',
    modelName: analytics.modelName || analytics.model || 'unknown',
    sessionType: session.sessionType || 'UNKNOWN',
    category: session.category || 'general',
    tags: session.tags || [],
    status: session.status || 'completed',

    // Token Metrics
    inputTokens: analytics.inputTokens || 0,
    outputTokens: analytics.outputTokens || 0,
    totalTokens: analytics.totalTokens || 0,
    cachedTokens: analytics.cachedTokens || 0,
    cacheHitRate: analytics.cacheHitRate || 0,
    reasoningTokens: analytics.reasoningTokens || 0,
    estimatedCost: analytics.estimatedCost || 0,

    // Message Counts
    totalMessages: analytics.totalMessages || 0,
    userMessages: analytics.userMessages || 0,
    assistantMessages: analytics.assistantMessages || 0,

    // Timing
    duration: analytics.duration || 0,
    durationMs: analytics.durationMs || 0,
    totalReasoningMs: analytics.totalReasoningMs || 0,
    totalToolCallMs: analytics.totalToolCallMs || 0,

    // Commands
    commandsRun: analytics.commandsRun || 0,
    commandsFailed: analytics.commandsFailed || 0,
    gitCommits: analytics.gitCommits || 0,
    buildAttempts: analytics.buildAttempts || 0,

    // Code Metrics
    linesAdded: analytics.linesAdded || 0,
    linesDeleted: analytics.linesDeleted || 0,
    linesOfCode: analytics.linesOfCode || 0,
    complexityScore: analytics.complexityScore || 0,

    // Quality
    efficiencyScore: analytics.efficiencyScore || 0,
    qualityScore: analytics.qualityScore || 0,

    // File Metrics
    filesModified: analytics.filesModified || 0,
    filesCreated: analytics.filesCreated || 0,
    filesRead: analytics.filesRead || 0,

    // Counts
    contentBlocks: session._count?.contentBlocks || 0,
    toolCalls: session._count?.toolCalls || 0,
    issues: session._count?.issues || 0,
    features: session._count?.features || 0,
  };
}
