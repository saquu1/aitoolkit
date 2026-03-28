// =============================================================================
// PRE-SESSION CHECKLIST API
// =============================================================================
// Generates a smart checklist before starting a new coding session
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Parallel data fetching
    const [
      unresolvedIssues,
      highRiskFiles,
      activePatterns,
      recentSessions,
      todayBudget,
    ] = await Promise.all([
      // Get unresolved issues from recent sessions
      getUnresolvedIssues(projectId),
      
      // Get high-risk files (most edited with errors)
      getHighRiskFiles(projectId),
      
      // Get active patterns to avoid
      getActivePatterns(),
      
      // Get recent session stats
      getRecentSessions(projectId),
      
      // Get today's budget
      getTodayBudget(projectId),
    ]);

    // Generate recommendations
    const recommendations = generateRecommendations(
      unresolvedIssues,
      highRiskFiles,
      recentSessions
    );

    // Calculate budget status
    const budgetStatus = calculateBudgetStatus(todayBudget, recentSessions);

    return NextResponse.json({
      success: true,
      checklist: {
        unresolvedIssues,
        highRiskFiles,
        activePatterns,
        budgetStatus,
        recommendations,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Pre-session checklist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getUnresolvedIssues(projectId: string | null) {
  const where: any = { status: { not: 'RESOLVED' } };
  if (projectId) {
    // Get chat log IDs for this project
    const chatLogs = await db.chatLog.findMany({
      where: { projectId },
      select: { id: true },
    });
    where.chatLogId = { in: chatLogs.map(c => c.id) };
  }

  const issues = await db.aIIssue.findMany({
    where,
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 10,
  });

  return issues.map(issue => ({
    id: issue.id,
    title: issue.title,
    severity: issue.severity,
    category: issue.category,
    fileAffected: issue.fileAffected,
    detectedAt: issue.createdAt,
  }));
}

async function getHighRiskFiles(projectId: string | null) {
  // Aggregate file operations to find high-risk files
  const fileOps = await db.fileOperation.groupBy({
    by: ['filepath'],
    _count: {
      id: true,
    },
    _sum: {
      errorCount: true,
    },
    where: projectId ? {
      chatLog: { projectId },
    } : {},
    orderBy: {
      _count: { id: 'desc' },
    },
    take: 10,
  });

  // Calculate risk score
  return fileOps.map(f => {
    const editCount = f._count.id;
    const errorCount = f._sum.errorCount || 0;
    const riskScore = Math.min(100, Math.round(
      editCount * 5 + errorCount * 20
    ));

    return {
      filepath: f.filepath,
      editCount,
      errorCount,
      riskScore,
      riskLevel: riskScore >= 80 ? 'HIGH' : riskScore >= 50 ? 'MEDIUM' : 'LOW',
    };
  }).filter(f => f.riskScore >= 20); // Only show files with some risk
}

async function getActivePatterns() {
  const patterns = await db.aIPattern.findMany({
    where: {
      status: 'ACTIVE',
      autoDetectionEnabled: true,
    },
    orderBy: {
      occurrenceCount: 'desc',
    },
    take: 10,
    select: {
      id: true,
      patternCode: true,
      patternName: true,
      detectionKeywords: true,
      preventionStrategies: true,
      occurrenceCount: true,
      totalCostWasted: true,
    },
  });

  return patterns.map(p => ({
    id: p.id,
    code: p.patternCode,
    name: p.patternName,
    keywords: JSON.parse(p.detectionKeywords || '[]'),
    prevention: JSON.parse(p.preventionStrategies || '[]'),
    occurrenceCount: p.occurrenceCount,
    costWasted: p.totalCostWasted,
  }));
}

async function getRecentSessions(projectId: string | null) {
  const where: any = {};
  if (projectId) where.projectId = projectId;

  const sessions = await db.chatLog.findMany({
    where,
    orderBy: { sessionDate: 'desc' },
    take: 10,
    include: {
      analytics: true,
    },
  });

  return {
    count: sessions.length,
    avgQuality: sessions.reduce((sum, s) => 
      sum + (s.analytics?.qualityScore || 0), 0) / Math.max(1, sessions.length),
    avgEfficiency: sessions.reduce((sum, s) => 
      sum + (s.analytics?.efficiencyScore || 0), 0) / Math.max(1, sessions.length),
    totalCost: sessions.reduce((sum, s) => 
      sum + (s.analytics?.estimatedCost || 0), 0),
  };
}

async function getTodayBudget(projectId: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: any = {
    createdAt: { gte: today },
  };
  if (projectId) {
    const chatLogs = await db.chatLog.findMany({
      where: { projectId },
      select: { id: true },
    });
    where.chatLogId = { in: chatLogs.map(c => c.id) };
  }

  const records = await db.aICostRecord.findMany({ where });

  return {
    spent: records.reduce((sum, r) => sum + (r.costUSD || 0), 0),
    tokenCount: records.reduce((sum, r) => sum + (r.totalTokens || 0), 0),
  };
}

function generateRecommendations(
  issues: any[],
  highRiskFiles: any[],
  sessions: any
) {
  const recommendations: string[] = [];

  // Check unresolved issues
  if (issues.length > 0) {
    const highSeverity = issues.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    );
    if (highSeverity.length > 0) {
      recommendations.push(
        `Fix ${highSeverity.length} high-severity issue(s) before adding new features`
      );
    } else {
      recommendations.push(
        `Address ${issues.length} unresolved issue(s) to maintain code quality`
      );
    }
  }

  // Check high-risk files
  const veryHighRisk = highRiskFiles.filter(f => f.riskScore >= 80);
  if (veryHighRisk.length > 0) {
    recommendations.push(
      `Consider refactoring ${veryHighRisk[0].filepath} (Risk: ${veryHighRisk[0].riskScore})`
    );
  }

  // Check quality trends
  if (sessions.avgQuality < 50) {
    recommendations.push(
      'Recent sessions show low quality scores - review patterns before continuing'
    );
  }

  // Default
  if (recommendations.length === 0) {
    recommendations.push('Session looks good to proceed');
  }

  return recommendations;
}

function calculateBudgetStatus(budget: any, sessions: any) {
  const dailyBudget = 5.0; // Default $5/day budget
  
  return {
    dailyBudget,
    spent: budget.spent,
    remaining: Math.max(0, dailyBudget - budget.spent),
    percentUsed: Math.round((budget.spent / dailyBudget) * 100),
    avgCostPerSession: sessions.count > 0 
      ? sessions.totalCost / sessions.count 
      : 0,
  };
}
