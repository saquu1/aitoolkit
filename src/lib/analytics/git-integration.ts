/**
 * GIT INTEGRATION SERVICE
 * =======================
 * Parses git history and links commits to AI coding sessions
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { db } from '@/lib/db'

const execAsync = promisify(exec)

// =============================================================================
// TYPES
// =============================================================================

export interface GitCommit {
  hash: string
  shortHash: string
  author: string
  date: Date
  message: string
  files: string[]
  additions: number
  deletions: number
  totalChanges: number
}

export interface GitSessionLink {
  sessionId: string
  commits: string[]
  filesInCommon: string[]
  timeProximity: number  // minutes between session and commit
  confidence: number     // 0-1
}

export interface GitAnalysisResult {
  commits: GitCommit[]
  sessionsLinked: number
  totalCommits: number
  totalChanges: number
  topFiles: Array<{ file: string; changes: number }>
  topAuthors: Array<{ author: string; commits: number }>
  commitFrequencyByDay: Record<string, number>
  commitFrequencyByHour: Record<number, number>
}

// =============================================================================
// GIT COMMANDS
// =============================================================================

async function runGitCommand(command: string, cwd: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${command}`, {
      cwd,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })
    return stdout.trim()
  } catch (error: any) {
    console.error(`Git command failed: git ${command}`, error.message)
    return ''
  }
}

export async function getGitLog(
  since?: Date,
  until?: Date,
  cwd: string = process.cwd()
): Promise<GitCommit[]> {
  const commits: GitCommit[] = []
  
  // Build date range
  let dateFilter = ''
  if (since) {
    dateFilter += ` --since="${since.toISOString()}"`
  }
  if (until) {
    dateFilter += ` --until="${until.toISOString()}"`
  }
  
  // Get commit log with stats
  const logFormat = '--pretty=format:"%H|%h|%an|%at|%s"'
  const log = await runGitCommand(`log ${logFormat}${dateFilter} --numstat`, cwd)
  
  if (!log) return []
  
  // Parse commits
  const lines = log.split('\n')
  let currentCommit: Partial<GitCommit> | null = null
  
  for (const line of lines) {
    if (line.includes('|') && line.split('|').length === 5) {
      // This is a commit header
      if (currentCommit && currentCommit.hash) {
        commits.push(currentCommit as GitCommit)
      }
      
      const [hash, shortHash, author, timestamp, message] = line.split('|')
      currentCommit = {
        hash: hash.replace(/"/g, ''),
        shortHash: shortHash.replace(/"/g, ''),
        author,
        date: new Date(parseInt(timestamp) * 1000),
        message: message.replace(/"/g, ''),
        files: [],
        additions: 0,
        deletions: 0,
        totalChanges: 0
      }
    } else if (currentCommit && line.trim()) {
      // This is a file stat line
      const parts = line.trim().split('\t')
      if (parts.length === 3) {
        const [additions, deletions, file] = parts
        currentCommit.files!.push(file)
        currentCommit.additions! += parseInt(additions) || 0
        currentCommit.deletions! += parseInt(deletions) || 0
        currentCommit.totalChanges! = currentCommit.additions! + currentCommit.deletions!
      }
    }
  }
  
  // Add last commit
  if (currentCommit && currentCommit.hash) {
    commits.push(currentCommit as GitCommit)
  }
  
  return commits
}

export async function getGitStatus(cwd: string = process.cwd()): Promise<{
  branch: string
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
}> {
  const status = await runGitCommand('status --porcelain', cwd)
  const result = {
    branch: '',
    modified: [] as string[],
    added: [] as string[],
    deleted: [] as string[],
    untracked: [] as string[]
  }
  
  // Get current branch
  result.branch = await runGitCommand('rev-parse --abbrev-ref HEAD', cwd)
  
  // Parse status
  for (const line of status.split('\n')) {
    if (!line.trim()) continue
    
    const code = line.slice(0, 2)
    const file = line.slice(3)
    
    if (code.includes('M')) {
      result.modified.push(file)
    } else if (code.includes('A')) {
      result.added.push(file)
    } else if (code.includes('D')) {
      result.deleted.push(file)
    } else if (code.includes('?')) {
      result.untracked.push(file)
    }
  }
  
  return result
}

// =============================================================================
// SESSION LINKING
// =============================================================================

export async function linkCommitsToSessions(
  commits: GitCommit[],
  sessions?: any[]
): Promise<GitSessionLink[]> {
  const links: GitSessionLink[] = []
  
  // Get sessions if not provided
  const sessionList = sessions || await db.aISession.findMany({
    include: {
      features: true
    },
    orderBy: { sessionDate: 'desc' },
    take: 100
  })
  
  for (const commit of commits) {
    for (const session of sessionList) {
      const link = analyzeCommitSessionMatch(commit, session)
      if (link && link.confidence > 0.3) {
        links.push(link)
      }
    }
  }
  
  return links
}

function analyzeCommitSessionMatch(commit: GitCommit, session: any): GitSessionLink | null {
  // Get files from session
  const sessionFiles: string[] = []
  for (const feature of session.features || []) {
    const created = JSON.parse(feature.filesCreated || '[]')
    const modified = JSON.parse(feature.filesModified || '[]')
    sessionFiles.push(...created, ...modified)
  }
  
  // Find common files
  const commitFileNames = commit.files.map(f => f.split('/').pop())
  const sessionFileNames = sessionFiles.map((f: string) => f.split('/').pop())
  const filesInCommon = commit.files.filter(f => 
    sessionFileNames.includes(f.split('/').pop())
  )
  
  // Calculate time proximity
  const sessionDate = new Date(session.sessionDate)
  const commitDate = commit.date
  const timeDiffMs = Math.abs(commitDate.getTime() - sessionDate.getTime())
  const timeProximity = Math.round(timeDiffMs / 60000) // minutes
  
  // Calculate confidence
  let confidence = 0
  
  // File match score (0-0.5)
  if (commit.files.length > 0) {
    confidence += (filesInCommon.length / commit.files.length) * 0.5
  }
  
  // Time proximity score (0-0.3)
  if (timeProximity < 60) {
    confidence += 0.3 * (1 - timeProximity / 60)
  } else if (timeProximity < 180) {
    confidence += 0.15 * (1 - (timeProximity - 60) / 120)
  }
  
  // Message match score (0-0.2)
  if (session.title && commit.message.toLowerCase().includes(session.title.toLowerCase().slice(0, 20))) {
    confidence += 0.2
  }
  
  if (confidence < 0.1) return null
  
  return {
    sessionId: session.id,
    commits: [commit.hash],
    filesInCommon,
    timeProximity,
    confidence: Math.round(confidence * 100) / 100
  }
}

// =============================================================================
// ANALYSIS
// =============================================================================

export async function analyzeGitHistory(
  since?: Date,
  until?: Date,
  cwd: string = process.cwd()
): Promise<GitAnalysisResult> {
  const commits = await getGitLog(since, until, cwd)
  
  // Calculate top files
  const fileChanges = new Map<string, number>()
  for (const commit of commits) {
    for (const file of commit.files) {
      fileChanges.set(file, (fileChanges.get(file) || 0) + 1)
    }
  }
  const topFiles = [...fileChanges.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([file, changes]) => ({ file, changes }))
  
  // Calculate top authors
  const authorCommits = new Map<string, number>()
  for (const commit of commits) {
    authorCommits.set(commit.author, (authorCommits.get(commit.author) || 0) + 1)
  }
  const topAuthors = [...authorCommits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([author, commits]) => ({ author, commits }))
  
  // Calculate commit frequency by day
  const commitsByDay: Record<string, number> = {}
  for (const commit of commits) {
    const day = commit.date.toISOString().split('T')[0]
    commitsByDay[day] = (commitsByDay[day] || 0) + 1
  }
  
  // Calculate commit frequency by hour
  const commitsByHour: Record<number, number> = {}
  for (let i = 0; i < 24; i++) {
    commitsByHour[i] = 0
  }
  for (const commit of commits) {
    const hour = commit.date.getHours()
    commitsByHour[hour] = (commitsByHour[hour] || 0) + 1
  }
  
  // Link to sessions
  const links = await linkCommitsToSessions(commits)
  const sessionsLinked = new Set(links.map(l => l.sessionId)).size
  
  const totalChanges = commits.reduce((sum, c) => sum + c.totalChanges, 0)
  
  return {
    commits,
    sessionsLinked,
    totalCommits: commits.length,
    totalChanges,
    topFiles,
    topAuthors,
    commitFrequencyByDay: commitsByDay,
    commitFrequencyByHour: commitsByHour
  }
}

// =============================================================================
// DATABASE SYNC
// =============================================================================

export async function syncGitCommitsToDatabase(
  since?: Date,
  until?: Date,
  cwd: string = process.cwd()
): Promise<{ commitsAdded: number; sessionsLinked: number }> {
  const commits = await getGitLog(since, until, cwd)
  const sessions = await db.aISession.findMany({
    include: { features: true },
    orderBy: { sessionDate: 'desc' },
    take: 100
  })
  
  let commitsAdded = 0
  let sessionsLinked = 0
  
  for (const commit of commits) {
    try {
      // Check if commit already exists
      const existing = await db.aIGitCommit.findUnique({
        where: { commitHash: commit.hash }
      })
      
      if (!existing) {
        // Find matching session
        const links = await linkCommitsToSessions([commit], sessions)
        const bestLink = links.sort((a, b) => b.confidence - a.confidence)[0]
        
        await db.aIGitCommit.create({
          data: {
            commitHash: commit.hash,
            shortHash: commit.shortHash,
            author: commit.author,
            commitDate: commit.date,
            message: commit.message,
            files: JSON.stringify(commit.files),
            additions: commit.additions,
            deletions: commit.deletions,
            totalChanges: commit.totalChanges,
            sessionId: bestLink?.confidence && bestLink.confidence > 0.5 
              ? bestLink.sessionId 
              : null,
            linkedAt: bestLink ? new Date() : null,
            linkConfidence: bestLink?.confidence || 0
          }
        })
        
        commitsAdded++
        if (bestLink?.confidence && bestLink.confidence > 0.5) {
          sessionsLinked++
        }
      }
    } catch (error) {
      console.error('Failed to sync commit:', commit.hash, error)
    }
  }
  
  return { commitsAdded, sessionsLinked }
}

// =============================================================================
// QUICK STATS
// =============================================================================

export async function getGitQuickStats(cwd: string = process.cwd()): Promise<{
  totalCommits: number
  totalAuthors: number
  totalFiles: number
  avgCommitSize: number
  mostActiveDay: string
  mostActiveHour: number
}> {
  const commits = await getGitLog(undefined, undefined, cwd)
  
  const authors = new Set(commits.map(c => c.author))
  const files = new Set(commits.flatMap(c => c.files))
  const avgCommitSize = commits.length > 0 
    ? commits.reduce((sum, c) => sum + c.totalChanges, 0) / commits.length 
    : 0
  
  // Most active day
  const dayCounts: Record<string, number> = {}
  for (const commit of commits) {
    const day = commit.date.toISOString().split('T')[0]
    dayCounts[day] = (dayCounts[day] || 0) + 1
  }
  const mostActiveDay = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  
  // Most active hour
  const hourCounts: Record<number, number> = {}
  for (const commit of commits) {
    const hour = commit.date.getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }
  const mostActiveHour = parseInt(
    Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '0'
  )
  
  return {
    totalCommits: commits.length,
    totalAuthors: authors.size,
    totalFiles: files.size,
    avgCommitSize: Math.round(avgCommitSize),
    mostActiveDay,
    mostActiveHour
  }
}
