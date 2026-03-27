/**
 * Session Status API Endpoint
 * Provides container uptime and session information
 * Helps users understand when their session might expire
 */

import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// Session configuration
const SESSION_CONFIG = {
  // Typical session duration in hours (approximate)
  typicalSessionDurationHours: 3.5,
  // Warning threshold in minutes before session ends
  warningThresholdMinutes: 30,
  // Critical threshold in minutes
  criticalThresholdMinutes: 10,
}

interface SessionStatus {
  container: {
    uptime: number // seconds
    uptimeFormatted: string
    startTime: string
    estimatedEndTime: string | null
    estimatedRemainingMinutes: number | null
  }
  session: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown'
    message: string
    progressPercent: number
  }
  persistence: {
    gitCommits: number
    lastCommitTime: string | null
    hasUncommittedChanges: boolean
  }
  storage: {
    persistent: string[]
    ephemeral: string[]
  }
  recommendations: string[]
}

export async function GET(request: NextRequest) {
  try {
    const containerInfo = getContainerInfo()
    const persistenceInfo = getPersistenceInfo()
    const sessionStatus = calculateSessionStatus(containerInfo.uptime)
    
    const response: SessionStatus = {
      container: containerInfo,
      session: sessionStatus,
      persistence: persistenceInfo,
      storage: {
        persistent: [
          '/upload (S3-backed)',
          '/tmp/my-project (JuiceFS)',
          'Git commits',
          'Database files in Git'
        ],
        ephemeral: [
          '/home/z/my-project (root filesystem)',
          'All code changes not in Git',
          'node_modules',
          '.next build cache'
        ]
      },
      recommendations: generateRecommendations(sessionStatus.status, persistenceInfo.hasUncommittedChanges)
    }

    return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get session status', message: error.message },
      { status: 500 }
    )
  }
}

function getContainerInfo() {
  let uptimeSeconds = 0
  let startTime = new Date()
  
  try {
    // Try to get process start time (Node.js process)
    const processUptime = process.uptime()
    uptimeSeconds = Math.floor(processUptime)
    startTime = new Date(Date.now() - uptimeSeconds * 1000)
  } catch {
    // Fallback: use process memory usage to estimate
    uptimeSeconds = Math.floor(process.uptime())
    startTime = new Date(Date.now() - uptimeSeconds * 1000)
  }
  
  // Calculate estimated remaining time
  const typicalDurationSeconds = SESSION_CONFIG.typicalSessionDurationHours * 3600
  const estimatedRemainingSeconds = Math.max(0, typicalDurationSeconds - uptimeSeconds)
  const estimatedEndTime = new Date(Date.now() + estimatedRemainingSeconds * 1000)
  
  return {
    uptime: uptimeSeconds,
    uptimeFormatted: formatUptime(uptimeSeconds),
    startTime: startTime.toISOString(),
    estimatedEndTime: estimatedRemainingSeconds > 0 ? estimatedEndTime.toISOString() : null,
    estimatedRemainingMinutes: estimatedRemainingSeconds > 0 ? Math.floor(estimatedRemainingSeconds / 60) : null
  }
}

function calculateSessionStatus(uptimeSeconds: number): SessionStatus['session'] {
  const typicalDurationSeconds = SESSION_CONFIG.typicalSessionDurationHours * 3600
  const remainingSeconds = typicalDurationSeconds - uptimeSeconds
  const remainingMinutes = remainingSeconds / 60
  const progressPercent = Math.min(100, Math.max(0, (uptimeSeconds / typicalDurationSeconds) * 100))
  
  let status: SessionStatus['session']['status']
  let message: string
  
  if (remainingMinutes <= SESSION_CONFIG.criticalThresholdMinutes) {
    status = 'critical'
    message = `Session may end soon! Only ~${Math.floor(remainingMinutes)} minutes remaining. Save your work immediately!`
  } else if (remainingMinutes <= SESSION_CONFIG.warningThresholdMinutes) {
    status = 'warning'
    message = `Session may end in ~${Math.floor(remainingMinutes)} minutes. Consider saving your work.`
  } else if (remainingMinutes <= 0) {
    status = 'critical'
    message = 'Session has exceeded typical duration. Save your work immediately!'
  } else {
    status = 'healthy'
    message = `Session is healthy. ~${Math.floor(remainingMinutes)} minutes remaining.`
  }
  
  return {
    status,
    message,
    progressPercent
  }
}

function getPersistenceInfo(): SessionStatus['persistence'] {
  let gitCommits = 0
  let lastCommitTime: string | null = null
  let hasUncommittedChanges = false
  
  try {
    // Get git commit count
    const commitCount = execSync('git rev-list --count HEAD 2>/dev/null', { encoding: 'utf-8' }).trim()
    gitCommits = parseInt(commitCount, 10) || 0
    
    // Get last commit time
    const lastCommit = execSync('git log -1 --format=%ci 2>/dev/null', { encoding: 'utf-8' }).trim()
    if (lastCommit) {
      lastCommitTime = new Date(lastCommit).toISOString()
    }
    
    // Check for uncommitted changes
    const status = execSync('git status --porcelain 2>/dev/null', { encoding: 'utf-8' })
    hasUncommittedChanges = status.trim().length > 0
  } catch {
    // Git not available or not a git repo
  }
  
  return {
    gitCommits,
    lastCommitTime,
    hasUncommittedChanges
  }
}

function generateRecommendations(sessionStatus: string, hasUncommittedChanges: boolean): string[] {
  const recommendations: string[] = []
  
  if (hasUncommittedChanges) {
    recommendations.push('Commit your changes now to prevent data loss: git add -A && git commit -m "Save progress"')
  }
  
  if (sessionStatus === 'warning') {
    recommendations.push('Download any important generated files from /download directory')
    recommendations.push('Make sure all important changes are committed to Git')
  }
  
  if (sessionStatus === 'critical') {
    recommendations.push('URGENT: Save all work immediately!')
    recommendations.push('Commit all changes: git add -A && git commit -m "Emergency save"')
    recommendations.push('Download critical files from /download directory')
  }
  
  if (sessionStatus === 'healthy' && !hasUncommittedChanges) {
    recommendations.push('Remember to commit changes periodically to preserve your work')
  }
  
  return recommendations
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ')
}
