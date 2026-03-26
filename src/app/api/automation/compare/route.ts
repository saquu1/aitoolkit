// =============================================================================
// SESSION COMPARISON TOOL API
// =============================================================================
// Compare two sessions side by side
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionAId = searchParams.get('sessionA');
    const sessionBId = searchParams.get('sessionB');

    if (!sessionAId || !sessionBId) {
      return NextResponse.json(
        { error: 'Both sessionA and sessionB IDs are required' },
        { status: 400 }
      );
    }

    // Fetch both sessions with all related data
    const [sessionA, sessionB] = await Promise.all([
      fetchSessionData(sessionAId),
      fetchSessionData(sessionBId),
    ]);

    if (!sessionA || !sessionB) {
      return NextResponse.json(
        { error: 'One or both sessions not found' },
        { status: 404 }
      );
    }

    // Calculate comparison
    const comparison = compareSessions(sessionA, sessionB);

    // Analyze what changed
    const changes = analyzeChanges(sessionA, sessionB);

    return NextResponse.json({
      success: true,
      sessionA: {
        id: sessionA.id,
        title: sessionA.title,
        date: sessionA.sessionDate,
      },
      sessionB: {
        id: sessionB.id,
        title: sessionB.title,
        date: sessionB.sessionDate,
      },
      comparison,
      changes,
    });
  } catch (error) {
    console.error('Session comparison API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function fetchSessionData(sessionId: string) {
  const session = await db.chatLog.findUnique({
    where: { id: sessionId },
    include: {
      analytics: true,
      issues: true,
      features: true,
      toolCalls: {
        take: 100,
        orderBy: { startedAt: 'asc' },
      },
      fileOperations: {
        take: 100,
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          toolCalls: true,
          fileOperations: true,
          issues: true,
          features: true,
        },
      },
    },
  });

  return session;
}

function compareSessions(sessionA: any, sessionB: any) {
  const analyticsA = sessionA.analytics || {};
  const analyticsB = sessionB.analytics || {};

  const calcChange = (a: number, b: number) => {
    if (a === 0) return b > 0 ? 100 : 0;
    return Math.round(((b - a) / a) * 100);
  };

  return {
    duration: {
      sessionA: analyticsA.durationMs || 0,
      sessionB: analyticsB.durationMs || 0,
      changePercent: calcChange(
        analyticsA.durationMs || 0,
        analyticsB.durationMs || 0
      ),
      improvement: (analyticsB.durationMs || 0) < (analyticsA.durationMs || 0),
    },
    issues: {
      sessionA: sessionA._count?.issues || 0,
      sessionB: sessionB._count?.issues || 0,
      changePercent: calcChange(
        sessionA._count?.issues || 0,
        sessionB._count?.issues || 0
      ),
      improvement: (sessionB._count?.issues || 0) < (sessionA._count?.issues || 0),
    },
    errors: {
      sessionA: analyticsA.commandsFailed || 0,
      sessionB: analyticsB.commandsFailed || 0,
      changePercent: calcChange(
        analyticsA.commandsFailed || 0,
        analyticsB.commandsFailed || 0
      ),
      improvement: (analyticsB.commandsFailed || 0) < (analyticsA.commandsFailed || 0),
    },
    cost: {
      sessionA: analyticsA.estimatedCost || 0,
      sessionB: analyticsB.estimatedCost || 0,
      changePercent: calcChange(
        analyticsA.estimatedCost || 0,
        analyticsB.estimatedCost || 0
      ),
      improvement: (analyticsB.estimatedCost || 0) < (analyticsA.estimatedCost || 0),
    },
    quality: {
      sessionA: analyticsA.qualityScore || 0,
      sessionB: analyticsB.qualityScore || 0,
      changePercent: calcChange(
        analyticsA.qualityScore || 0,
        analyticsB.qualityScore || 0
      ),
      improvement: (analyticsB.qualityScore || 0) > (analyticsA.qualityScore || 0),
    },
    efficiency: {
      sessionA: analyticsA.efficiencyScore || 0,
      sessionB: analyticsB.efficiencyScore || 0,
      changePercent: calcChange(
        analyticsA.efficiencyScore || 0,
        analyticsB.efficiencyScore || 0
      ),
      improvement: (analyticsB.efficiencyScore || 0) > (analyticsA.efficiencyScore || 0),
    },
    tokens: {
      sessionA: analyticsA.totalTokens || 0,
      sessionB: analyticsB.totalTokens || 0,
      changePercent: calcChange(
        analyticsA.totalTokens || 0,
        analyticsB.totalTokens || 0
      ),
      improvement: (analyticsB.totalTokens || 0) < (analyticsA.totalTokens || 0),
    },
    files: {
      sessionA: sessionA._count?.fileOperations || 0,
      sessionB: sessionB._count?.fileOperations || 0,
      changePercent: calcChange(
        sessionA._count?.fileOperations || 0,
        sessionB._count?.fileOperations || 0
      ),
    },
    toolCalls: {
      sessionA: sessionA._count?.toolCalls || 0,
      sessionB: sessionB._count?.toolCalls || 0,
      changePercent: calcChange(
        sessionA._count?.toolCalls || 0,
        sessionB._count?.toolCalls || 0
      ),
    },
  };
}

function analyzeChanges(sessionA: any, sessionB: any) {
  const changes: string[] = [];
  const analyticsA = sessionA.analytics || {};
  const analyticsB = sessionB.analytics || {};

  // Check error reduction
  if ((analyticsB.commandsFailed || 0) < (analyticsA.commandsFailed || 0)) {
    const reduction = (analyticsA.commandsFailed || 0) - (analyticsB.commandsFailed || 0);
    changes.push(`✅ Error count reduced by ${reduction}`);
  }

  // Check quality improvement
  if ((analyticsB.qualityScore || 0) > (analyticsA.qualityScore || 0)) {
    const increase = (analyticsB.qualityScore || 0) - (analyticsA.qualityScore || 0);
    changes.push(`✅ Quality score improved by ${increase} points`);
  }

  // Check efficiency improvement
  if ((analyticsB.efficiencyScore || 0) > (analyticsA.efficiencyScore || 0)) {
    const increase = (analyticsB.efficiencyScore || 0) - (analyticsA.efficiencyScore || 0);
    changes.push(`✅ Efficiency improved by ${increase} points`);
  }

  // Check cost reduction
  if ((analyticsB.estimatedCost || 0) < (analyticsA.estimatedCost || 0)) {
    const savings = (analyticsA.estimatedCost || 0) - (analyticsB.estimatedCost || 0);
    changes.push(`✅ Cost reduced by $${savings.toFixed(4)}`);
  }

  // Check token reduction
  if ((analyticsB.totalTokens || 0) < (analyticsA.totalTokens || 0)) {
    const reduction = (analyticsA.totalTokens || 0) - (analyticsB.totalTokens || 0);
    changes.push(`✅ Token usage reduced by ${reduction}`);
  }

  // Check issues
  const issuesA = sessionA._count?.issues || 0;
  const issuesB = sessionB._count?.issues || 0;
  if (issuesB < issuesA) {
    changes.push(`✅ Issue count reduced by ${issuesA - issuesB}`);
  }

  // Analyze patterns that were avoided
  if (changes.length === 0 && (analyticsB.qualityScore || 0) > (analyticsA.qualityScore || 0)) {
    changes.push('✅ Overall quality improved without specific metric changes');
  }

  if (changes.length === 0) {
    changes.push('No significant improvements detected');
  }

  return changes;
}
