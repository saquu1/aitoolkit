/**
 * SESSION TIMELINE API
 * ====================
 * F11: Visual timeline of every action within a session
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export interface TimelineEvent {
  time: string
  timestamp: Date
  type: 'reasoning' | 'text' | 'bash' | 'write' | 'edit' | 'read' | 'todo' | 'git'
  icon: string
  description: string
  duration?: number
  status: 'completed' | 'error' | 'pending'
  details?: {
    command?: string
    filepath?: string
    lines?: number
    result?: string
    error?: string
  }
}

export interface SessionTimeline {
  sessionId: string
  sessionDate: Date
  title: string
  totalDuration: number
  events: TimelineEvent[]
  summary: {
    reasoningMs: number
    toolMs: number
    linesWritten: number
    filesCreated: number
    filesEdited: number
    gitCommits: number
    gitPushes: number
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const chatId = searchParams.get('chatId')
  
  try {
    // Find session
    let session
    if (sessionId) {
      session = await db.aISession.findUnique({
        where: { id: sessionId },
        include: {
          contentBlocks: { orderBy: { blockIndex: 'asc' } },
          toolCalls: { orderBy: { createdAt: 'asc' } },
          fileOperations: { orderBy: { createdAt: 'asc' } }
        }
      })
    } else if (chatId) {
      session = await db.aISession.findFirst({
        where: { chatId },
        include: {
          contentBlocks: { orderBy: { blockIndex: 'asc' } },
          toolCalls: { orderBy: { createdAt: 'asc' } },
          fileOperations: { orderBy: { createdAt: 'asc' } }
        }
      })
    }
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // Build timeline events
    const events: TimelineEvent[] = []
    const baseTime = session.startTime || session.sessionDate
    
    // Process content blocks
    for (const block of session.contentBlocks) {
      const eventTime = block.startedAt || baseTime
      const duration = block.durationMs || 0
      
      let type: TimelineEvent['type'] = 'text'
      let icon = '📝'
      let description = ''
      
      switch (block.blockType) {
        case 'REASONING':
          type = 'reasoning'
          icon = '🧠'
          description = block.content.slice(0, 60) + (block.content.length > 60 ? '…' : '')
          break
        case 'TEXT':
          type = 'text'
          icon = '📝'
          description = block.content.slice(0, 60) + (block.content.length > 60 ? '…' : '')
          break
        case 'TOOL_CALLS':
          type = 'bash'
          icon = '🔧'
          description = 'Tool execution'
          break
      }
      
      events.push({
        time: formatTime(eventTime),
        timestamp: eventTime,
        type,
        icon,
        description,
        duration: duration || undefined,
        status: block.containsError ? 'error' : 'completed',
        details: {
          lines: block.contentLength
        }
      })
    }
    
    // Process tool calls
    for (const tc of session.toolCalls) {
      const eventTime = tc.startedAt || tc.createdAt
      let type: TimelineEvent['type'] = 'bash'
      let icon = '🔧'
      let description = tc.description || ''
      
      switch (tc.toolName) {
        case 'BASH':
          type = tc.isGitOperation ? 'git' : 'bash'
          icon = tc.isGitOperation ? '🔀' : '🔧'
          if (tc.command?.includes('commit')) {
            description = `git commit: ${extractCommitMessage(tc.result || '')}`
          } else if (tc.command?.includes('push')) {
            description = `git push`
          } else {
            description = tc.command?.slice(0, 50) || 'bash command'
          }
          break
        case 'WRITE':
          type = 'write'
          icon = '📄'
          description = `Write: ${tc.filepath?.split('/').pop() || 'file'}`
          break
        case 'EDIT':
          type = 'edit'
          icon = '✏️'
          description = `Edit: ${tc.filepath?.split('/').pop() || 'file'}`
          break
        case 'READ':
          type = 'read'
          icon = '📖'
          description = `Read: ${tc.filepath?.split('/').pop() || 'file'}`
          break
      }
      
      events.push({
        time: formatTime(eventTime),
        timestamp: eventTime,
        type,
        icon,
        description,
        duration: tc.durationMs || undefined,
        status: tc.resultStatus === 'error' ? 'error' : 'completed',
        details: {
          command: tc.command?.slice(0, 100),
          filepath: tc.filepath,
          lines: tc.newContent?.split('\n').length,
          result: tc.result?.slice(0, 100),
          error: tc.resultStatus === 'error' ? tc.result || 'Error' : undefined
        }
      })
    }
    
    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    // Calculate summary
    const reasoningMs = session.totalReasoningMs || 
      events.filter(e => e.type === 'reasoning').reduce((sum, e) => sum + (e.duration || 0), 0)
    const toolMs = session.totalToolCallMs ||
      events.filter(e => e.type !== 'reasoning' && e.type !== 'text').reduce((sum, e) => sum + (e.duration || 0), 0)
    
    const summary = {
      reasoningMs,
      toolMs,
      linesWritten: session.fileOperations.reduce((sum, f) => sum + f.linesAdded, 0),
      filesCreated: session.fileOperations.filter(f => f.operation === 'CREATED').length,
      filesEdited: session.fileOperations.filter(f => f.operation === 'MODIFIED').length,
      gitCommits: session.gitCommits,
      gitPushes: session.toolCalls.filter(tc => tc.command?.includes('git push')).length
    }
    
    const timeline: SessionTimeline = {
      sessionId: session.id,
      sessionDate: session.sessionDate,
      title: session.title || 'Untitled Session',
      totalDuration: session.durationMs || (session.duration * 60000),
      events,
      summary
    }
    
    return NextResponse.json({
      success: true,
      timeline
    })
    
  } catch (error) {
    console.error('Timeline API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

function extractCommitMessage(result: string): string {
  const match = result.match(/\] (.+)/)
  return match ? match[1].slice(0, 40) : 'commit'
}
