// =============================================================================
// WEEKLY SELF-ASSESSMENT REPORT API
// =============================================================================
// Generates weekly summary comparing to previous week
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const weekStart = searchParams.get('weekStart'); // ISO date

    // Calculate week ranges
    const thisWeekStart = weekStart 
      ? new Date(weekStart) 
      : getMonday(new Date());
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    // Fetch data for both weeks in parallel
    const [thisWeekData, lastWeekData, topIssues, topPatterns] = await Promise.all([
      fetchWeekData(projectId, thisWeekStart, thisWeekEnd),
      fetchWeekData(projectId, lastWeekStart, lastWeekEnd),
      fetchTopIssues(projectId, thisWeekStart, thisWeekEnd),
      fetchTopPatterns(),
    ]);

    // Calculate changes
    const metrics = calculateMetrics(thisWeekData, lastWeekData);

    // Generate headline
    const headline = generateHeadline(metrics);

    // Generate insights
    const insights = generateInsights(metrics, topIssues, topPatterns);

    // Generate focus areas
    const focusAreas = generateFocusAreas(metrics, topIssues, topPatterns);

    return NextResponse.json({
      success: true,
      report: {
        weekStart: thisWeekStart.toISOString(),
        weekEnd: thisWeekEnd.toISOString(),
        headline,
        metrics,
        topIssues,
        topPatterns,
        insights,
        focusAreas,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Weekly report API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

async function fetchWeekData(projectId: string | null, start: Date, end: Date) {
  const where: any = {
    sessionDate: {
      gte: start,
      lt: end,
    },
  };
  if (projectId) where.projectId = projectId;

  const sessions = await db.chatLog.findMany({
    where,
    include: {
      analytics: true,
      issues: true,
      features: true,
      _count: {
        select: {
          toolCalls: true,
          fileOperations: true,
        },
      },
    },
  });

  const issues = await db.aIIssue.count({
    where: {
      createdAt: { gte: start, lt: end },
      ...(projectId ? {
        chatLog: { projectId },
      } : {}),
    },
  });

  const resolvedIssues = await db.aIIssue.count({
    where: {
      resolvedAt: { gte: start, lt: end },
      status: 'RESOLVED',
      ...(projectId ? {
        chatLog: { projectId },
      } : {}),
    },
  });

  const repeatIssues = await db.aIIssue.count({
    where: {
      createdAt: { gte: start, lt: end },
      isRepeat: true,
      ...(projectId ? {
        chatLog: { projectId },
      } : {}),
    },
  });

  return {
    sessionsCount: sessions.length,
    issuesDetected: issues,
    issuesResolved: resolvedIssues,
    repeatIssues,
    featuresBuilt: await db.aIFeature.count({
      where: {
        createdAt: { gte: start, lt: end },
        ...(projectId ? {
          chatLog: { projectId },
        } : {}),
      },
    }),
    totalCost: sessions.reduce((sum, s) => 
      sum + (s.analytics?.estimatedCost || 0), 0),
    totalTokens: sessions.reduce((sum, s) => 
      sum + (s.analytics?.totalTokens || 0), 0),
    avgEfficiency: sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.analytics?.efficiencyScore || 0), 0) / sessions.length
      : 0,
    avgQuality: sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.analytics?.qualityScore || 0), 0) / sessions.length
      : 0,
    totalFilesCreated: sessions.reduce((sum, s) => 
      sum + (s.analytics?.filesCreated || 0), 0),
    totalFilesModified: sessions.reduce((sum, s) => 
      sum + (s.analytics?.filesModified || 0), 0),
    totalLinesAdded: sessions.reduce((sum, s) => 
      sum + (s.analytics?.linesAdded || 0), 0),
    toolCalls: sessions.reduce((sum, s) => sum + (s._count?.toolCalls || 0), 0),
    commandsFailed: sessions.reduce((sum, s) => 
      sum + (s.analytics?.commandsFailed || 0), 0),
    commandsRun: sessions.reduce((sum, s) => 
      sum + (s.analytics?.commandsRun || 0), 0),
  };
}

async function fetchTopIssues(projectId: string | null, start: Date, end: Date) {
  const where: any = {
    resolvedAt: { gte: start, lt: end },
    status: 'RESOLVED',
  };
  if (projectId) {
    where.chatLog = { projectId };
  }

  const issues = await db.aIIssue.findMany({
    where,
    orderBy: { resolvedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      severity: true,
      category: true,
      resolution: true,
    },
  });

  return issues;
}

async function fetchTopPatterns() {
  const patterns = await db.aIPattern.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { occurrenceCount: 'desc' },
    take: 5,
    select: {
      id: true,
      patternCode: true,
      patternName: true,
      occurrenceCount: true,
      totalCostWasted: true,
      effectiveness: true,
    },
  });

  return patterns;
}

function calculateMetrics(thisWeek: any, lastWeek: any) {
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return [
    {
      name: 'Sessions',
      thisWeek: thisWeek.sessionsCount,
      lastWeek: lastWeek.sessionsCount,
      change: calcChange(thisWeek.sessionsCount, lastWeek.sessionsCount),
      trend: thisWeek.sessionsCount >= lastWeek.sessionsCount ? 'up' : 'down',
    },
    {
      name: 'Issues Fixed',
      thisWeek: thisWeek.issuesResolved,
      lastWeek: lastWeek.issuesResolved,
      change: calcChange(thisWeek.issuesResolved, lastWeek.issuesResolved),
      trend: thisWeek.issuesResolved >= lastWeek.issuesResolved ? 'up' : 'down',
    },
    {
      name: 'Repeat Issues',
      thisWeek: thisWeek.repeatIssues,
      lastWeek: lastWeek.repeatIssues,
      change: calcChange(thisWeek.repeatIssues, lastWeek.repeatIssues),
      trend: thisWeek.repeatIssues <= lastWeek.repeatIssues ? 'up' : 'down', // Less is better
    },
    {
      name: 'Features Built',
      thisWeek: thisWeek.featuresBuilt,
      lastWeek: lastWeek.featuresBuilt,
      change: calcChange(thisWeek.featuresBuilt, lastWeek.featuresBuilt),
      trend: thisWeek.featuresBuilt >= lastWeek.featuresBuilt ? 'up' : 'down',
    },
    {
      name: 'Total Cost',
      thisWeek: `$${thisWeek.totalCost.toFixed(2)}`,
      lastWeek: `$${lastWeek.totalCost.toFixed(2)}`,
      change: calcChange(thisWeek.totalCost, lastWeek.totalCost),
      trend: thisWeek.totalCost <= lastWeek.totalCost ? 'up' : 'down', // Less is better
    },
    {
      name: 'Efficiency Score',
      thisWeek: Math.round(thisWeek.avgEfficiency),
      lastWeek: Math.round(lastWeek.avgEfficiency),
      change: calcChange(thisWeek.avgEfficiency, lastWeek.avgEfficiency),
      trend: thisWeek.avgEfficiency >= lastWeek.avgEfficiency ? 'up' : 'down',
    },
    {
      name: 'Quality Score',
      thisWeek: Math.round(thisWeek.avgQuality),
      lastWeek: Math.round(lastWeek.avgQuality),
      change: calcChange(thisWeek.avgQuality, lastWeek.avgQuality),
      trend: thisWeek.avgQuality >= lastWeek.avgQuality ? 'up' : 'down',
    },
    {
      name: 'First-Attempt Rate',
      thisWeek: thisWeek.commandsRun > 0 
        ? Math.round(((thisWeek.commandsRun - thisWeek.commandsFailed) / thisWeek.commandsRun) * 100)
        : 100,
      lastWeek: lastWeek.commandsRun > 0
        ? Math.round(((lastWeek.commandsRun - lastWeek.commandsFailed) / lastWeek.commandsRun) * 100)
        : 100,
      change: 0,
      trend: 'neutral',
    },
  ];
}

function generateHeadline(metrics: any[]): string {
  const efficiencyMetric = metrics.find(m => m.name === 'Efficiency Score');
  const repeatMetric = metrics.find(m => m.name === 'Repeat Issues');

  if (efficiencyMetric && efficiencyMetric.change > 20) {
    return `Efficiency improved ${efficiencyMetric.change}% but repeat issues still need attention`;
  }

  if (repeatMetric && repeatMetric.thisWeek > repeatMetric.lastWeek) {
    return `Productivity up but repeat issues increased by ${Math.abs(repeatMetric.change)}%`;
  }

  return `Week-over-week performance: ${metrics.filter(m => m.trend === 'up').length} metrics improved`;
}

function generateInsights(metrics: any[], issues: any[], patterns: any[]): string[] {
  const insights: string[] = [];

  // Top wins
  const improvedMetrics = metrics.filter(m => m.trend === 'up' && m.change > 10);
  if (improvedMetrics.length > 0) {
    insights.push(`${improvedMetrics[0].name} improved by ${improvedMetrics[0].change}%`);
  }

  // Pattern effectiveness
  const effectivePattern = patterns.find(p => p.effectiveness > 0.8);
  if (effectivePattern) {
    insights.push(`${effectivePattern.patternName} pattern is ${Math.round(effectivePattern.effectiveness * 100)}% effective`);
  }

  // Cost savings
  const costMetric = metrics.find(m => m.name === 'Total Cost');
  if (costMetric && costMetric.trend === 'up') {
    insights.push(`Cost reduced by ${Math.abs(costMetric.change)}% compared to last week`);
  }

  return insights.slice(0, 3);
}

function generateFocusAreas(metrics: any[], issues: any[], patterns: any[]): string[] {
  const focus: string[] = [];

  // Repeat issues
  const repeatMetric = metrics.find(m => m.name === 'Repeat Issues');
  if (repeatMetric && repeatMetric.thisWeek > 2) {
    focus.push(`Reduce repeat issues to <3 (currently ${repeatMetric.thisWeek})`);
  }

  // Ineffective patterns
  const ineffectivePattern = patterns.find(p => p.occurrenceCount > 3 && p.effectiveness < 0.5);
  if (ineffectivePattern) {
    focus.push(`Improve prevention for: ${ineffectivePattern.patternName}`);
  }

  // Efficiency improvement
  const efficiencyMetric = metrics.find(m => m.name === 'Efficiency Score');
  if (efficiencyMetric && efficiencyMetric.thisWeek < 70) {
    focus.push(`Improve efficiency score to >70 (currently ${efficiencyMetric.thisWeek})`);
  }

  if (focus.length === 0) {
    focus.push('Maintain current performance levels');
  }

  return focus;
}
