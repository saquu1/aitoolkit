/**
 * Session Actions API
 * Provides endpoints for git commit and server restart
 */

import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'git-commit':
        return handleGitCommit(body.message)
      
      case 'restart-server':
        return handleRestartServer()
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Session action error:', error)
    return NextResponse.json(
      { error: 'Failed to execute action', message: error.message },
      { status: 500 }
    )
  }
}

function handleGitCommit(message: string = 'Save progress') {
  try {
    // Check git status
    const status = execSync('git status --porcelain 2>/dev/null', { encoding: 'utf-8' })
    
    if (!status.trim()) {
      return NextResponse.json({
        success: true,
        message: 'No changes to commit',
        hasChanges: false
      })
    }

    // Add all changes
    execSync('git add -A', { encoding: 'utf-8' })
    
    // Commit with message
    const commitMessage = message || `Auto-save: ${new Date().toISOString()}`
    const result = execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf-8' })
    
    // Get commit hash
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    
    return NextResponse.json({
      success: true,
      message: 'Changes committed successfully',
      hasChanges: true,
      commitHash: hash,
      output: result
    })
  } catch (error: any) {
    // Check if it's just "nothing to commit"
    if (error.message?.includes('nothing to commit')) {
      return NextResponse.json({
        success: true,
        message: 'No changes to commit',
        hasChanges: false
      })
    }
    throw error
  }
}

function handleRestartServer() {
  try {
    // This will kill the Next.js process
    // The container should auto-restart or the user can restart manually
    
    // First, commit any pending changes
    try {
      const status = execSync('git status --porcelain 2>/dev/null', { encoding: 'utf-8' })
      if (status.trim()) {
        execSync('git add -A', { encoding: 'utf-8' })
        execSync(`git commit -m "Auto-save before restart: ${new Date().toISOString()}"`, { encoding: 'utf-8' })
      }
    } catch {
      // Ignore commit errors
    }

    // Schedule the kill after response is sent
    setTimeout(() => {
      try {
        // Kill Next.js process
        execSync('pkill -f "next dev" || pkill -f "next start" || true', { encoding: 'utf-8' })
      } catch {
        // Ignore kill errors
      }
    }, 1000)

    return NextResponse.json({
      success: true,
      message: 'Server restart initiated. Changes saved to git.',
      instructions: [
        '1. Wait 5-10 seconds for server to stop',
        '2. Run: npm install && npm run dev',
        '3. Server will restart with all changes preserved'
      ]
    })
  } catch (error: any) {
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get git status
    const status = execSync('git status --porcelain 2>/dev/null', { encoding: 'utf-8' })
    const branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf-8' }).trim()
    const lastCommit = execSync('git log -1 --format="%h - %s (%cr)" 2>/dev/null', { encoding: 'utf-8' }).trim()
    const commitCount = execSync('git rev-list --count HEAD 2>/dev/null', { encoding: 'utf-8' }).trim()
    
    return NextResponse.json({
      branch,
      lastCommit,
      commitCount: parseInt(commitCount, 10),
      hasUncommittedChanges: status.trim().length > 0,
      uncommittedFiles: status.trim().split('\n').filter(Boolean).length
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get git status', message: error.message },
      { status: 500 }
    )
  }
}
