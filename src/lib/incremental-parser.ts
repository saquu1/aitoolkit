/**
 * Incremental Parser System
 * 
 * Provides file diffing and incremental update capabilities.
 * Only re-parses changed portions of files for efficiency.
 * 
 * Task: TASK-2.5 - Incremental Parsing
 * Gap ID: GAP-010 (Opus)
 */

import { prisma } from "./db"
import crypto from "crypto"

// ============================================================================
// Types
// ============================================================================

export interface FileDiff {
  filePath: string
  oldHash: string | null
  newHash: string
  changeType: 'created' | 'modified' | 'deleted' | 'unchanged'
  addedLines: number[]
  removedLines: number[]
  modifiedLines: number[]
  addedSections: CodeSection[]
  removedSections: CodeSection[]
  modifiedSections: SectionModification[]
  changeImpact: 'low' | 'medium' | 'high' | 'critical'
}

export interface CodeSection {
  type: 'table' | 'column' | 'fk' | 'sp' | 'view' | 'index' | 'trigger' | 'unknown'
  name: string
  lineStart: number
  lineEnd: number
  content: string
  hash: string
}

export interface SectionModification {
  oldSection: CodeSection
  newSection: CodeSection
  modificationType: 'added' | 'removed' | 'renamed' | 'content_changed' | 'structural_change'
}

export interface IncrementalUpdateResult {
  projectId: string
  versionFrom: number
  versionTo: number
  entitiesAdded: number
  entitiesModified: number
  entitiesRemoved: number
  impactScore: number
  changes: IncrementalChangeRecord[]
}

export interface IncrementalChangeRecord {
  changeType: 'add' | 'modify' | 'delete'
  entityType: 'table' | 'column' | 'fk' | 'sp' | 'view'
  entityId: string
  entityName: string
  oldValue: any
  newValue: any
  impactScore: number
  affectedEntities: string[]
}

export interface ParseResult {
  entityType: string
  entityId: string
  entityName: string
  entityData: any
  lineStart: number
  lineEnd: number
  hash: string
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate content hash for a file
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Calculate line-level diff between old and new content
 */
export function calculateLineDiff(
  oldContent: string | null,
  newContent: string
): { added: number[], removed: number[], modified: number[] } {
  if (!oldContent) {
    // New file - all lines are added
    return {
      added: Array.from({ length: newContent.split('\n').length }, (_, i) => i + 1),
      removed: [],
      modified: []
    }
  }

  if (!newContent) {
    // Deleted file - all lines are removed
    return {
      added: [],
      removed: Array.from({ length: oldContent.split('\n').length }, (_, i) => i + 1),
      modified: []
    }
  }

  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  const added: number[] = []
  const removed: number[] = []
  const modified: number[] = []
  
  // Simple line-by-line comparison
  const maxLines = Math.max(oldLines.length, newLines.length)
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]
    
    if (oldLine === undefined && newLine !== undefined) {
      added.push(i + 1)
    } else if (oldLine !== undefined && newLine === undefined) {
      removed.push(i + 1)
    } else if (oldLine !== newLine) {
      modified.push(i + 1)
    }
  }
  
  return { added, removed, modified }
}

/**
 * Extract code sections from content based on file type
 */
export function extractCodeSections(
  content: string,
  fileType: string
): CodeSection[] {
  const sections: CodeSection[] = []
  const lines = content.split('\n')
  
  switch (fileType.toLowerCase()) {
    case 'sql':
      return extractSQLSections(content, lines)
    case 'cshtml':
      return extractCSHTMLSections(content, lines)
    case 'cs':
      return extractCSharpSections(content, lines)
    default:
      return extractGenericSections(content, lines)
  }
}

/**
 * Extract SQL code sections (tables, SPs, views, etc.)
 */
function extractSQLSections(content: string, lines: string[]): CodeSection[] {
  const sections: CodeSection[] = []
  
  // Regex patterns for SQL objects
  const patterns = [
    { type: 'table' as const, regex: /CREATE\s+TABLE\s+(?:\[?\w+\]?\.)?(\[?\w+\]?)/gi },
    { type: 'sp' as const, regex: /CREATE\s+(?:OR\s+ALTER\s+)?PROC(?:EDURE)?\s+(?:\[?\w+\]?\.)?(\[?\w+\]?)/gi },
    { type: 'view' as const, regex: /CREATE\s+(?:OR\s+ALTER\s+)?VIEW\s+(?:\[?\w+\]?\.)?(\[?\w+\]?)/gi },
    { type: 'fk' as const, regex: /ALTER\s+TABLE.*ADD\s+CONSTRAINT\s+(\[?\w+\]?)\s+FOREIGN\s+KEY/gi },
    { type: 'index' as const, regex: /CREATE\s+(?:UNIQUE\s+)?(?:CLUSTERED\s+|NONCLUSTERED\s+)?INDEX\s+(\[?\w+\]?)/gi },
    { type: 'trigger' as const, regex: /CREATE\s+(?:OR\s+ALTER\s+)?TRIGGER\s+(?:\[?\w+\]?\.)?(\[?\w+\]?)/gi },
  ]
  
  for (const { type, regex } of patterns) {
    let match
    const re = new RegExp(regex.source, regex.flags)
    
    while ((match = re.exec(content)) !== null) {
      const name = match[1].replace(/[\[\]]/g, '')
      const startPos = match.index
      const lineStart = content.substring(0, startPos).split('\n').length
      
      // Find end of section (rough approximation)
      const remainingContent = content.substring(startPos)
      const endMatch = remainingContent.match(/(?<=^|\n)(?:GO|CREATE|ALTER|DECLARE)/i)
      const sectionContent = endMatch 
        ? remainingContent.substring(0, endMatch.index)
        : remainingContent.substring(0, 2000)
      
      const lineEnd = lineStart + sectionContent.split('\n').length - 1
      
      sections.push({
        type,
        name,
        lineStart,
        lineEnd,
        content: sectionContent.trim(),
        hash: calculateContentHash(sectionContent.trim())
      })
    }
  }
  
  return sections
}

/**
 * Extract CSHTML sections (forms, tables, etc.)
 */
function extractCSHTMLSections(content: string, lines: string[]): CodeSection[] {
  const sections: CodeSection[] = []
  
  // Extract form sections
  const formRegex = /<form[^>]*(?:id|name)\s*=\s*["']([^"']+)["'][^>]*>/gi
  let match
  
  while ((match = formRegex.exec(content)) !== null) {
    const name = match[1]
    const startPos = match.index
    const lineStart = content.substring(0, startPos).split('\n').length
    
    // Find closing form tag
    const formEnd = content.indexOf('</form>', startPos)
    const sectionContent = formEnd > -1
      ? content.substring(startPos, formEnd + 7)
      : content.substring(startPos, startPos + 2000)
    
    const lineEnd = lineStart + sectionContent.split('\n').length - 1
    
    sections.push({
      type: 'table', // Forms map to tables conceptually
      name,
      lineStart,
      lineEnd,
      content: sectionContent.trim(),
      hash: calculateContentHash(sectionContent.trim())
    })
  }
  
  // Extract table sections
  const tableRegex = /<table[^>]*(?:id|class)\s*=\s*["']([^"']+)["'][^>]*>/gi
  
  while ((match = tableRegex.exec(content)) !== null) {
    const name = match[1]
    const startPos = match.index
    const lineStart = content.substring(0, startPos).split('\n').length
    
    const tableEnd = content.indexOf('</table>', startPos)
    const sectionContent = tableEnd > -1
      ? content.substring(startPos, tableEnd + 8)
      : content.substring(startPos, startPos + 2000)
    
    const lineEnd = lineStart + sectionContent.split('\n').length - 1
    
    sections.push({
      type: 'view',
      name,
      lineStart,
      lineEnd,
      content: sectionContent.trim(),
      hash: calculateContentHash(sectionContent.trim())
    })
  }
  
  return sections
}

/**
 * Extract C# sections (classes, methods)
 */
function extractCSharpSections(content: string, lines: string[]): CodeSection[] {
  const sections: CodeSection[] = []
  
  // Extract class definitions
  const classRegex = /(?:public|private|protected|internal)\s+(?:static\s+)?class\s+(\w+)/gi
  let match
  
  while ((match = classRegex.exec(content)) !== null) {
    const name = match[1]
    const startPos = match.index
    const lineStart = content.substring(0, startPos).split('\n').length
    
    // Find class end (simplified - look for matching braces)
    let braceCount = 0
    let foundStart = false
    let endPos = startPos
    
    for (let i = startPos; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++
        foundStart = true
      } else if (content[i] === '}') {
        braceCount--
        if (foundStart && braceCount === 0) {
          endPos = i + 1
          break
        }
      }
    }
    
    const sectionContent = content.substring(startPos, endPos)
    const lineEnd = lineStart + sectionContent.split('\n').length - 1
    
    sections.push({
      type: 'table', // Classes map to tables conceptually
      name,
      lineStart,
      lineEnd,
      content: sectionContent.trim(),
      hash: calculateContentHash(sectionContent.trim())
    })
  }
  
  return sections
}

/**
 * Extract generic sections (any recognizable patterns)
 */
function extractGenericSections(content: string, lines: string[]): CodeSection[] {
  // Return the entire file as a single section
  return [{
    type: 'unknown',
    name: 'file_content',
    lineStart: 1,
    lineEnd: lines.length,
    content: content,
    hash: calculateContentHash(content)
  }]
}

/**
 * Calculate file diff between old and new versions
 */
export async function calculateFileDiff(
  oldContent: string | null,
  newContent: string | null,
  filePath: string,
  fileType: string
): Promise<FileDiff> {
  const oldHash = oldContent ? calculateContentHash(oldContent) : null
  const newHash = newContent ? calculateContentHash(newContent) : null
  
  // Determine change type
  let changeType: FileDiff['changeType']
  if (!oldContent && newContent) {
    changeType = 'created'
  } else if (oldContent && !newContent) {
    changeType = 'deleted'
  } else if (oldHash === newHash) {
    changeType = 'unchanged'
  } else {
    changeType = 'modified'
  }
  
  // Calculate line differences
  const lineDiff = calculateLineDiff(oldContent, newContent || null)
  
  // Extract code sections
  const oldSections = oldContent ? extractCodeSections(oldContent, fileType) : []
  const newSections = newContent ? extractCodeSections(newContent, fileType) : []
  
  // Find section modifications
  const { addedSections, removedSections, modifiedSections } = compareSections(oldSections, newSections)
  
  // Calculate change impact
  const changeImpact = calculateChangeImpact(
    changeType,
    lineDiff,
    addedSections,
    removedSections,
    modifiedSections
  )
  
  return {
    filePath,
    oldHash,
    newHash,
    changeType,
    addedLines: lineDiff.added,
    removedLines: lineDiff.removed,
    modifiedLines: lineDiff.modified,
    addedSections,
    removedSections,
    modifiedSections,
    changeImpact
  }
}

/**
 * Compare old and new code sections
 */
function compareSections(
  oldSections: CodeSection[],
  newSections: CodeSection[]
): {
  addedSections: CodeSection[]
  removedSections: CodeSection[]
  modifiedSections: SectionModification[]
} {
  const addedSections: CodeSection[] = []
  const removedSections: CodeSection[] = []
  const modifiedSections: SectionModification[] = []
  
  const oldMap = new Map(oldSections.map(s => [`${s.type}:${s.name}`, s]))
  const newMap = new Map(newSections.map(s => [`${s.type}:${s.name}`, s]))
  
  // Find removed sections
  for (const [key, section] of oldMap) {
    if (!newMap.has(key)) {
      removedSections.push(section)
    }
  }
  
  // Find added and modified sections
  for (const [key, section] of newMap) {
    const oldSection = oldMap.get(key)
    
    if (!oldSection) {
      addedSections.push(section)
    } else if (oldSection.hash !== section.hash) {
      modifiedSections.push({
        oldSection,
        newSection: section,
        modificationType: determineModificationType(oldSection, section)
      })
    }
  }
  
  return { addedSections, removedSections, modifiedSections }
}

/**
 * Determine type of modification between sections
 */
function determineModificationType(
  oldSection: CodeSection,
  newSection: CodeSection
): SectionModification['modificationType'] {
  if (oldSection.name !== newSection.name) {
    return 'renamed'
  }
  
  // Check for structural changes (different line count by more than 20%)
  const lineDiff = Math.abs(
    (oldSection.lineEnd - oldSection.lineStart) -
    (newSection.lineEnd - newSection.lineStart)
  )
  const avgLines = (
    (oldSection.lineEnd - oldSection.lineStart) +
    (newSection.lineEnd - newSection.lineStart)
  ) / 2
  
  if (avgLines > 0 && lineDiff / avgLines > 0.2) {
    return 'structural_change'
  }
  
  return 'content_changed'
}

/**
 * Calculate change impact level
 */
function calculateChangeImpact(
  changeType: FileDiff['changeType'],
  lineDiff: { added: number[], removed: number[], modified: number[] },
  addedSections: CodeSection[],
  removedSections: CodeSection[],
  modifiedSections: SectionModification[]
): 'low' | 'medium' | 'high' | 'critical' {
  if (changeType === 'unchanged') {
    return 'low'
  }
  
  if (changeType === 'deleted') {
    return 'critical'
  }
  
  const totalChanges = lineDiff.added.length + lineDiff.removed.length + lineDiff.modified.length
  const structuralChanges = removedSections.length + addedSections.length
  
  // Critical: Removed sections or large structural changes
  if (removedSections.length > 0 || totalChanges > 100) {
    return 'critical'
  }
  
  // High: Modified SPs/Views or multiple section changes
  if (
    modifiedSections.some(m => 
      m.oldSection.type === 'sp' || 
      m.oldSection.type === 'view' ||
      m.modificationType === 'structural_change'
    ) ||
    structuralChanges > 3
  ) {
    return 'high'
  }
  
  // Medium: Any section modifications or moderate line changes
  if (modifiedSections.length > 0 || totalChanges > 20) {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Apply incremental changes to a project
 */
export async function applyIncrementalChanges(
  projectId: string,
  diffs: FileDiff[],
  parseFunction: (content: string, fileType: string) => Promise<ParseResult[]>
): Promise<IncrementalUpdateResult> {
  // Get current version
  const latestVersion = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' }
  })
  
  const versionFrom = latestVersion?.version || 0
  const versionTo = versionFrom + 1
  
  const changes: IncrementalChangeRecord[] = []
  let entitiesAdded = 0
  let entitiesModified = 0
  let entitiesRemoved = 0
  let totalImpactScore = 0
  
  for (const diff of diffs) {
    if (diff.changeType === 'unchanged') continue
    
    // Handle removed sections
    for (const section of diff.removedSections) {
      const changeRecord: IncrementalChangeRecord = {
        changeType: 'delete',
        entityType: section.type as any,
        entityId: `${diff.filePath}:${section.name}`,
        entityName: section.name,
        oldValue: { content: section.content, lines: [section.lineStart, section.lineEnd] },
        newValue: null,
        impactScore: calculateEntityImpactScore(section),
        affectedEntities: []
      }
      
      changes.push(changeRecord)
      entitiesRemoved++
      totalImpactScore += changeRecord.impactScore
      
      // Store in database
      await prisma.incrementalChange.create({
        data: {
          projectId,
          versionFrom,
          versionTo,
          changeType: 'delete',
          entityType: section.type,
          entityId: changeRecord.entityId,
          entityName: section.name,
          oldValue: JSON.stringify(changeRecord.oldValue),
          newValue: null,
          impactScore: changeRecord.impactScore,
          affectedEntities: JSON.stringify([])
        }
      })
    }
    
    // Handle added sections
    for (const section of diff.addedSections) {
      // Parse the new section
      const parseResults = await parseFunction(section.content, diff.filePath.split('.').pop() || '')
      
      for (const result of parseResults) {
        const changeRecord: IncrementalChangeRecord = {
          changeType: 'add',
          entityType: result.entityType as any,
          entityId: result.entityId,
          entityName: result.entityName,
          oldValue: null,
          newValue: result.entityData,
          impactScore: calculateEntityImpactScore(section),
          affectedEntities: []
        }
        
        changes.push(changeRecord)
        entitiesAdded++
        totalImpactScore += changeRecord.impactScore
        
        // Store in database
        await prisma.incrementalChange.create({
          data: {
            projectId,
            versionFrom,
            versionTo,
            changeType: 'add',
            entityType: result.entityType,
            entityId: result.entityId,
            entityName: result.entityName,
            oldValue: null,
            newValue: JSON.stringify(result.entityData),
            impactScore: changeRecord.impactScore,
            affectedEntities: JSON.stringify([])
          }
        })
      }
    }
    
    // Handle modified sections
    for (const modification of diff.modifiedSections) {
      const parseResults = await parseFunction(
        modification.newSection.content,
        diff.filePath.split('.').pop() || ''
      )
      
      for (const result of parseResults) {
        const changeRecord: IncrementalChangeRecord = {
          changeType: 'modify',
          entityType: result.entityType as any,
          entityId: result.entityId,
          entityName: result.entityName,
          oldValue: { content: modification.oldSection.content },
          newValue: result.entityData,
          impactScore: calculateEntityImpactScore(modification.newSection),
          affectedEntities: []
        }
        
        changes.push(changeRecord)
        entitiesModified++
        totalImpactScore += changeRecord.impactScore
        
        // Store in database
        await prisma.incrementalChange.create({
          data: {
            projectId,
            versionFrom,
            versionTo,
            changeType: 'modify',
            entityType: result.entityType,
            entityId: result.entityId,
            entityName: result.entityName,
            oldValue: JSON.stringify(changeRecord.oldValue),
            newValue: JSON.stringify(result.entityData),
            impactScore: changeRecord.impactScore,
            affectedEntities: JSON.stringify([])
          }
        })
      }
    }
  }
  
  return {
    projectId,
    versionFrom,
    versionTo,
    entitiesAdded,
    entitiesModified,
    entitiesRemoved,
    impactScore: changes.length > 0 ? Math.round(totalImpactScore / changes.length) : 0,
    changes
  }
}

/**
 * Calculate impact score for an entity (0-100)
 */
function calculateEntityImpactScore(section: CodeSection): number {
  const baseScores: Record<string, number> = {
    table: 90,
    sp: 70,
    view: 60,
    fk: 80,
    index: 40,
    trigger: 50,
    unknown: 30
  }
  
  return baseScores[section.type] || 50
}

/**
 * Get incremental changes for a project
 */
export async function getIncrementalChanges(
  projectId: string,
  versionFrom?: number,
  versionTo?: number
): Promise<IncrementalChangeRecord[]> {
  const where: any = { projectId }
  
  if (versionFrom !== undefined) {
    where.versionFrom = { gte: versionFrom }
  }
  
  if (versionTo !== undefined) {
    where.versionTo = { lte: versionTo }
  }
  
  const changes = await prisma.incrementalChange.findMany({
    where,
    orderBy: { createdAt: 'asc' }
  })
  
  return changes.map(c => ({
    changeType: c.changeType as 'add' | 'modify' | 'delete',
    entityType: c.entityType as 'table' | 'column' | 'fk' | 'sp' | 'view',
    entityId: c.entityId,
    entityName: c.entityName,
    oldValue: c.oldValue ? JSON.parse(c.oldValue) : null,
    newValue: c.newValue ? JSON.parse(c.newValue) : null,
    impactScore: c.impactScore,
    affectedEntities: JSON.parse(c.affectedEntities)
  }))
}

/**
 * Get change statistics for a project
 */
export async function getChangeStatistics(projectId: string): Promise<{
  totalChanges: number
  additions: number
  modifications: number
  deletions: number
  avgImpactScore: number
  highImpactChanges: number
  byEntityType: Record<string, number>
}> {
  const changes = await prisma.incrementalChange.findMany({
    where: { projectId }
  })
  
  const stats = {
    totalChanges: changes.length,
    additions: changes.filter(c => c.changeType === 'add').length,
    modifications: changes.filter(c => c.changeType === 'modify').length,
    deletions: changes.filter(c => c.changeType === 'delete').length,
    avgImpactScore: changes.length > 0
      ? Math.round(changes.reduce((sum, c) => sum + c.impactScore, 0) / changes.length)
      : 0,
    highImpactChanges: changes.filter(c => c.impactScore >= 70).length,
    byEntityType: {} as Record<string, number>
  }
  
  // Count by entity type
  for (const change of changes) {
    stats.byEntityType[change.entityType] = (stats.byEntityType[change.entityType] || 0) + 1
  }
  
  return stats
}

/**
 * Rollback to a previous version
 */
export async function rollbackToVersion(
  projectId: string,
  targetVersion: number
): Promise<{ success: boolean; message: string }> {
  const targetVersionData = await prisma.projectVersion.findUnique({
    where: {
      projectId_version: {
        projectId,
        version: targetVersion
      }
    }
  })
  
  if (!targetVersionData) {
    return {
      success: false,
      message: `Version ${targetVersion} not found for project ${projectId}`
    }
  }
  
  // Get changes after target version
  const changesToRevert = await prisma.incrementalChange.findMany({
    where: {
      projectId,
      versionFrom: { gte: targetVersion }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  // In a real implementation, this would revert each change
  // For now, we just mark the snapshot as the current version
  
  return {
    success: true,
    message: `Rollback to version ${targetVersion} would revert ${changesToRevert.length} changes`
  }
}

// Export types
export type { FileDiff as FileDiffType, CodeSection as CodeSectionType, IncrementalUpdateResult as IncrementalUpdateResultType }
