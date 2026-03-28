// =============================================================================
// FILE OPERATIONS API
// =============================================================================
// Provides file operation data for the intelligence dashboard
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
        fileOperations: [] 
      });
    }

    // Fetch file operations
    const fileOps = await db.fileOperation.findMany({
      where: { chatLogId: chatLog.id },
      orderBy: { createdAt: 'asc' },
    });

    // Transform for frontend
    const transformed = fileOps.map(fo => ({
      id: fo.id,
      filepath: fo.filepath,
      operation: fo.operation,
      linesAdded: fo.linesAdded || 0,
      linesRemoved: fo.linesRemoved || 0,
      netLines: (fo.linesAdded || 0) - (fo.linesRemoved || 0),
      contentSize: fo.contentSize || 0,
      fileType: extractFileType(fo.filepath),
      fileCategory: fo.fileCategory || categorizeFile(fo.filepath),
      errorCount: fo.errorCount || 0,
      editCount: fo.editCount || 1,
      tokensConsumed: fo.tokensConsumed || 0,
      costUSD: fo.costUSD || 0,
    }));

    return NextResponse.json({
      success: true,
      fileOperations: transformed,
      total: transformed.length,
    });
  } catch (error) {
    console.error('File operations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractFileType(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase();
  return ext || 'unknown';
}

function categorizeFile(filepath: string): string {
  const lower = filepath.toLowerCase();
  if (lower.includes('/api/') || lower.includes('route.ts')) return 'API_ROUTE';
  if (lower.includes('components/') || lower.endsWith('.tsx')) return 'COMPONENT';
  if (lower.includes('/lib/') || lower.includes('/services/')) return 'SERVICE';
  if (lower.includes('/hooks/')) return 'HOOK';
  if (lower.includes('/utils/') || lower.includes('/helpers/')) return 'UTILITY';
  if (lower.endsWith('.d.ts') || lower.includes('/types/')) return 'TYPE_DEFINITION';
  if (lower.includes('config') || lower.endsWith('.config.')) return 'CONFIG';
  if (lower.includes('.test.') || lower.includes('.spec.')) return 'TEST';
  if (lower.includes('prisma') || lower.endsWith('.prisma')) return 'SCHEMA';
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'STYLE';
  return 'OTHER';
}
