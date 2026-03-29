// =============================================================================
// TOOL CALLS API
// =============================================================================
// Provides tool call data for the intelligence dashboard
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
        toolCalls: [] 
      });
    }

    // Fetch tool calls
    const toolCalls = await db.toolCall.findMany({
      where: { chatLogId: chatLog.id },
      orderBy: { startedAt: 'asc' },
    });

    // Transform for frontend
    const transformed = toolCalls.map(tc => ({
      id: tc.id,
      toolName: tc.toolName,
      description: tc.description || generateDescription(tc),
      command: tc.command || undefined,
      filepath: tc.filepath || undefined,
      resultStatus: tc.resultStatus || 'completed',
      durationMs: tc.durationMs || 0,
      isGitOperation: tc.isGitOperation || false,
      isBuildCommand: tc.isBuildCommand || false,
      isFileOperation: tc.isFileOperation || false,
      isDangerous: tc.isDangerous || false,
      startedAt: tc.startedAt,
      endedAt: tc.endedAt,
    }));

    return NextResponse.json({
      success: true,
      toolCalls: transformed,
      total: transformed.length,
    });
  } catch (error) {
    console.error('Tool calls API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateDescription(tc: any): string {
  switch (tc.toolName) {
    case 'BASH':
      return tc.command ? `Execute: ${tc.command.slice(0, 50)}` : 'Execute command';
    case 'WRITE':
      return tc.filepath ? `Create: ${tc.filepath.split('/').pop()}` : 'Write file';
    case 'READ':
      return tc.filepath ? `Read: ${tc.filepath.split('/').pop()}` : 'Read file';
    case 'EDIT':
      return tc.filepath ? `Edit: ${tc.filepath.split('/').pop()}` : 'Edit file';
    case 'TODO_WRITE':
      return 'Update todo list';
    default:
      return tc.toolName || 'Unknown operation';
  }
}
