// =============================================================================
// FEATURES API
// =============================================================================
// Provides features data for the intelligence dashboard
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
        features: [] 
      });
    }

    // Fetch features
    const features = await db.aIFeature.findMany({
      where: { chatLogId: chatLog.id },
      orderBy: { createdAt: 'asc' },
    });

    // Transform for frontend
    const transformed = features.map(feature => ({
      id: feature.id,
      featureName: feature.featureName || 'Unnamed Feature',
      featureType: feature.featureType || 'unknown',
      description: feature.description || undefined,
      category: feature.category || 'general',
      tags: feature.tags || [],
      module: feature.module || undefined,
      complexity: feature.complexity || 'moderate',
      filesCreated: feature.filesCreated || [],
      filesModified: feature.filesModified || [],
      linesAdded: feature.linesAdded || 0,
      linesDeleted: feature.linesDeleted || 0,
      linesOfCode: feature.linesOfCode || 0,
      developmentTime: feature.developmentTime || 0,
      developmentTimeMs: feature.developmentTimeMs || 0,
      complexityScore: feature.complexityScore || 0,
      testCoverage: feature.testCoverage || 0,
      tokensConsumed: feature.tokensConsumed || 0,
      costUSD: feature.costUSD || 0,
      hasTests: feature.hasTests || false,
      hasDocs: feature.hasDocs || false,
      reviewStatus: feature.reviewStatus || 'pending',
      dependencies: feature.dependencies || [],
      dependents: feature.dependents || [],
    }));

    return NextResponse.json({
      success: true,
      features: transformed,
      total: transformed.length,
    });
  } catch (error) {
    console.error('Features API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
