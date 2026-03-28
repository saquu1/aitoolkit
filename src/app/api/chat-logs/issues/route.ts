// =============================================================================
// ISSUES API
// =============================================================================
// Provides issues data for the intelligence dashboard
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatLogId = searchParams.get('chatLogId');

    if (!sessionId && !chatLogId) {
      return NextResponse.json({ 
        success: false, 
        error: 'sessionId or chatLogId required' 
      }, { status: 400 });
    }

    // Find chat log
    const chatLog = chatLogId 
      ? await db.chatLog.findUnique({ where: { id: chatLogId } })
      : await db.chatLog.findFirst({ where: { sessionId: sessionId! } });

    if (!chatLog) {
      return NextResponse.json({ 
        success: true, 
        issues: [] 
      });
    }

    // Fetch issues
    const issues = await db.aIIssue.findMany({
      where: { chatLogId: chatLog.id },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Transform for frontend
    const transformed = issues.map(issue => ({
      id: issue.id,
      issueType: issue.issueType || 'other',
      severity: issue.severity || 'medium',
      title: issue.title || 'Unknown Issue',
      description: issue.description || undefined,
      category: issue.category || 'general',
      tags: issue.tags || [],
      fileAffected: issue.fileAffected || undefined,
      lineNumber: issue.lineNumber || undefined,
      errorMessage: issue.errorMessage || undefined,
      filesInvolved: issue.filesInvolved || [],
      resolution: issue.resolution || undefined,
      resolutionTime: issue.resolutionTime || 0,
      resolutionTimeMs: issue.resolutionTimeMs || 0,
      attemptsToFix: issue.attemptsToFix || 1,
      resolvedBy: issue.resolvedBy || 'ai',
      status: issue.status || 'resolved',
      isRepeat: issue.isRepeat || false,
      recurrenceCount: issue.recurrenceCount || 0,
      rootCause: issue.rootCause || undefined,
      preventionTips: issue.preventionTips || [],
      relatedIssues: issue.relatedIssues || [],
      confidenceLevel: issue.confidenceLevel || 'MEDIUM',
    }));

    return NextResponse.json({
      success: true,
      issues: transformed,
      total: transformed.length,
    });
  } catch (error) {
    console.error('Issues API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
