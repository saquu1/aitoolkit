/**
 * Version Comparison System
 * 
 * Provides version tracking, snapshots, and comparison capabilities.
 * Enables historical analysis and change tracking.
 * 
 * Task: TASK-2.6 - Version Comparison
 * Gap ID: GAP-011 (Opus)
 */

import { prisma } from "./db"

// ============================================================================
// Types
// ============================================================================

export interface VersionSnapshot {
  version: number
  name: string | null
  description: string | null
  tables: EntitySnapshot[]
  columns: EntitySnapshot[]
  foreignKeys: EntitySnapshot[]
  storedProcedures: EntitySnapshot[]
  views: EntitySnapshot[]
  modules: EntitySnapshot[]
  forms: EntitySnapshot[]
  apis: EntitySnapshot[]
  metadata: SnapshotMetadata
}

export interface EntitySnapshot {
  id: string
  name: string
  data: Record<string, any>
  confidence: number
  source: string
}

export interface SnapshotMetadata {
  createdAt: Date
  createdBy: string | null
  isAutoSave: boolean
  totalEntities: number
  avgConfidence: number
}

export interface VersionComparison {
  versionFrom: VersionInfo
  versionTo: VersionInfo
  summary: ComparisonSummary
  tableChanges: EntityChange[]
  columnChanges: EntityChange[]
  fkChanges: EntityChange[]
  spChanges: EntityChange[]
  viewChanges: EntityChange[]
  moduleChanges: EntityChange[]
  impactAnalysis: ImpactAnalysis
}

export interface VersionInfo {
  version: number
  name: string | null
  createdAt: Date
  totalEntities: number
  changeCount: number
}

export interface ComparisonSummary {
  totalChanges: number
  additions: number
  modifications: number
  deletions: number
  highImpactChanges: number
  affectedModules: string[]
  confidenceChange: number
  coverageChange: number
}

export interface EntityChange {
  entityType: string
  entityId: string
  entityName: string
  changeType: 'added' | 'modified' | 'deleted'
  oldValue: any
  newValue: any
  impactScore: number
  affectedEntities: string[]
  changeDetails: ChangeDetail[]
}

export interface ChangeDetail {
  field: string
  oldValue: any
  newValue: any
  significance: 'low' | 'medium' | 'high'
}

export interface ImpactAnalysis {
  overallImpact: 'low' | 'medium' | 'high' | 'critical'
  breakingChanges: number
  riskScore: number
  affectedWorkflows: string[]
  affectedAPIs: string[]
  recommendedActions: string[]
}

// ============================================================================
// Version Management Functions
// ============================================================================

/**
 * Create a new version snapshot
 */
export async function createVersion(
  projectId: string,
  name?: string,
  description?: string,
  createdBy?: string,
  isAutoSave: boolean = false
): Promise<{ version: number; snapshot: VersionSnapshot }> {
  // Get current max version
  const latestVersion = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' }
  })
  
  const version = (latestVersion?.version || 0) + 1
  
  // Collect current state
  const snapshot = await createProjectSnapshot(projectId)
  
  // Calculate change summary
  let changeSummary = {}
  let changeCount = 0
  
  if (latestVersion) {
    const oldSnapshot = JSON.parse(latestVersion.snapshot) as VersionSnapshot
    const diff = calculateSnapshotDiff(oldSnapshot, snapshot)
    changeSummary = diff.summary
    changeCount = diff.summary.totalChanges
  }
  
  // Store version
  await prisma.projectVersion.create({
    data: {
      projectId,
      version,
      name: name || `v${version}.0.0`,
      description,
      snapshot: JSON.stringify(snapshot),
      changeSummary: JSON.stringify(changeSummary),
      changeCount,
      tablesAdded: (changeSummary as any).tableAdditions || 0,
      tablesRemoved: (changeSummary as any).tableDeletions || 0,
      tablesModified: (changeSummary as any).tableModifications || 0,
      spsAdded: (changeSummary as any).spAdditions || 0,
      spsRemoved: (changeSummary as any).spDeletions || 0,
      spsModified: (changeSummary as any).spModifications || 0,
      createdBy,
      isAutoSave
    }
  })
  
  return { version, snapshot }
}

/**
 * Create a project snapshot
 */
async function createProjectSnapshot(projectId: string): Promise<VersionSnapshot> {
  // Collect all entities
  const [
    tables,
    columns,
    foreignKeys,
    storedProcedures,
    views,
    modules,
    forms,
    apis
  ] = await Promise.all([
    collectTableSnapshot(projectId),
    collectColumnSnapshot(projectId),
    collectFKSnapshot(projectId),
    collectSPSnapshot(projectId),
    collectViewSnapshot(projectId),
    collectModuleSnapshot(projectId),
    collectFormSnapshot(projectId),
    collectAPISnapshot(projectId)
  ])
  
  // Calculate metadata
  const allEntities = [
    ...tables,
    ...columns,
    ...foreignKeys,
    ...storedProcedures,
    ...views
  ]
  
  const avgConfidence = allEntities.length > 0
    ? allEntities.reduce((sum, e) => sum + e.confidence, 0) / allEntities.length
    : 0
  
  return {
    version: 0, // Will be set by createVersion
    name: null,
    description: null,
    tables,
    columns,
    foreignKeys,
    storedProcedures,
    views,
    modules,
    forms,
    apis,
    metadata: {
      createdAt: new Date(),
      createdBy: null,
      isAutoSave: false,
      totalEntities: allEntities.length,
      avgConfidence
    }
  }
}

/**
 * Collect table snapshot
 */
async function collectTableSnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const tables = await prisma.toolkitTable.findMany({
      where: { projectId }
    })
    
    return tables.map(t => ({
      id: t.id,
      name: t.tableName,
      data: {
        schema: t.tableSchema,
        rowCount: t.rowCount,
        columnCount: t.columnCount,
        hasPK: t.hasPK,
        sourceDDL: t.sourceDDL ? 'present' : null
      },
      confidence: 0.85,
      source: t.sourceDDL ? 'ddl' : 'inference'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Collect column snapshot
 */
async function collectColumnSnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const columns = await prisma.toolkitColumn.findMany({
      where: { projectId }
    })
    
    return columns.map(c => ({
      id: c.id,
      name: c.columnName,
      data: {
        tableName: c.tableName,
        dataType: c.dataType,
        isNullable: c.isNullable,
        isPK: c.isPK,
        isFK: c.isFK,
        position: c.ordinalPosition
      },
      confidence: 0.9,
      source: 'ddl'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Collect foreign key snapshot
 */
async function collectFKSnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const fks = await prisma.toolkitFK.findMany({
      where: { projectId }
    })
    
    return fks.map(fk => ({
      id: fk.id,
      name: fk.fkName,
      data: {
        fromTable: fk.fromTable,
        fromColumn: fk.fromColumn,
        toTable: fk.toTable,
        toColumn: fk.toColumn
      },
      confidence: 0.85,
      source: 'ddl'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Collect stored procedure snapshot
 */
async function collectSPSnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const sps = await prisma.toolkitSP.findMany({
      where: { projectId }
    })
    
    return sps.map(sp => ({
      id: sp.id,
      name: sp.spName,
      data: {
        schema: sp.spSchema,
        paramCount: sp.paramCount,
        hasResultSet: sp.hasResultSet,
        returnType: sp.returnType
      },
      confidence: 0.8,
      source: 'ddl'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Collect view snapshot
 */
async function collectViewSnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const views = await prisma.toolkitView.findMany({
      where: { projectId }
    })
    
    return views.map(v => ({
      id: v.id,
      name: v.viewName,
      data: {
        schema: v.viewSchema,
        columnCount: v.columnCount,
        sourceDDL: v.sourceDDL ? 'present' : null
      },
      confidence: 0.85,
      source: 'ddl'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Collect module snapshot
 */
async function collectModuleSnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const modules = await prisma.toolkitModule.findMany({
      where: { projectId }
    })
    
    return modules.map(m => ({
      id: m.id,
      name: m.moduleName,
      data: {
        description: m.description,
        tableCount: m.tableCount,
        spCount: m.spCount
      },
      confidence: 0.9,
      source: 'inference'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Collect form snapshot
 */
async function collectFormSnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const forms = await prisma.form.findMany({
      where: { projectId }
    })
    
    return forms.map(f => ({
      id: f.id,
      name: f.name,
      data: {
        formKey: f.formKey,
        method: f.method,
        actionUrl: f.actionUrl,
        sourceTable: f.sourceTable
      },
      confidence: 0.8,
      source: 'cshtml'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Collect API snapshot
 */
async function collectAPISnapshot(projectId: string): Promise<EntitySnapshot[]> {
  try {
    const endpoints = await prisma.aPIEndpoint.findMany({
      where: { controller: { projectId } },
      include: { controller: true }
    })
    
    return endpoints.map(e => ({
      id: e.id,
      name: e.name || e.route,
      data: {
        method: e.method,
        route: e.route,
        controller: e.controller?.name
      },
      confidence: 0.85,
      source: 'cs'
    }))
  } catch (error) {
    return []
  }
}

// ============================================================================
// Comparison Functions
// ============================================================================

/**
 * Compare two versions
 */
export async function compareVersions(
  projectId: string,
  versionFrom: number,
  versionTo: number
): Promise<VersionComparison> {
  // Get version data
  const fromVersion = await prisma.projectVersion.findUnique({
    where: {
      projectId_version: {
        projectId,
        version: versionFrom
      }
    }
  })
  
  const toVersion = await prisma.projectVersion.findUnique({
    where: {
      projectId_version: {
        projectId,
        version: versionTo
      }
    }
  })
  
  if (!fromVersion || !toVersion) {
    throw new Error(`Version not found: ${!fromVersion ? versionFrom : versionTo}`)
  }
  
  const fromSnapshot = JSON.parse(fromVersion.snapshot) as VersionSnapshot
  const toSnapshot = JSON.parse(toVersion.snapshot) as VersionSnapshot
  
  // Calculate differences
  const diff = calculateSnapshotDiff(fromSnapshot, toSnapshot)
  
  return {
    versionFrom: {
      version: versionFrom,
      name: fromVersion.name,
      createdAt: fromVersion.createdAt,
      totalEntities: fromSnapshot.metadata.totalEntities,
      changeCount: fromVersion.changeCount
    },
    versionTo: {
      version: versionTo,
      name: toVersion.name,
      createdAt: toVersion.createdAt,
      totalEntities: toSnapshot.metadata.totalEntities,
      changeCount: toVersion.changeCount
    },
    summary: diff.summary,
    tableChanges: diff.tableChanges,
    columnChanges: diff.columnChanges,
    fkChanges: diff.fkChanges,
    spChanges: diff.spChanges,
    viewChanges: diff.viewChanges,
    moduleChanges: diff.moduleChanges,
    impactAnalysis: diff.impactAnalysis
  }
}

/**
 * Calculate diff between two snapshots
 */
function calculateSnapshotDiff(
  fromSnapshot: VersionSnapshot,
  toSnapshot: VersionSnapshot
): {
  summary: ComparisonSummary
  tableChanges: EntityChange[]
  columnChanges: EntityChange[]
  fkChanges: EntityChange[]
  spChanges: EntityChange[]
  viewChanges: EntityChange[]
  moduleChanges: EntityChange[]
  impactAnalysis: ImpactAnalysis
} {
  // Compare each entity type
  const tableChanges = compareEntities(fromSnapshot.tables, toSnapshot.tables, 'table')
  const columnChanges = compareEntities(fromSnapshot.columns, toSnapshot.columns, 'column')
  const fkChanges = compareEntities(fromSnapshot.foreignKeys, toSnapshot.foreignKeys, 'fk')
  const spChanges = compareEntities(fromSnapshot.storedProcedures, toSnapshot.storedProcedures, 'sp')
  const viewChanges = compareEntities(fromSnapshot.views, toSnapshot.views, 'view')
  const moduleChanges = compareEntities(fromSnapshot.modules, toSnapshot.modules, 'module')
  
  // Calculate summary
  const allChanges = [
    ...tableChanges,
    ...columnChanges,
    ...fkChanges,
    ...spChanges,
    ...viewChanges,
    ...moduleChanges
  ]
  
  const summary: ComparisonSummary = {
    totalChanges: allChanges.length,
    additions: allChanges.filter(c => c.changeType === 'added').length,
    modifications: allChanges.filter(c => c.changeType === 'modified').length,
    deletions: allChanges.filter(c => c.changeType === 'deleted').length,
    highImpactChanges: allChanges.filter(c => c.impactScore >= 70).length,
    affectedModules: extractAffectedModules(allChanges),
    confidenceChange: toSnapshot.metadata.avgConfidence - fromSnapshot.metadata.avgConfidence,
    coverageChange: calculateCoverageChange(fromSnapshot, toSnapshot)
  }
  
  // Calculate impact analysis
  const impactAnalysis = calculateImpactAnalysis(allChanges, fromSnapshot, toSnapshot)
  
  return {
    summary,
    tableChanges,
    columnChanges,
    fkChanges,
    spChanges,
    viewChanges,
    moduleChanges,
    impactAnalysis
  }
}

/**
 * Compare entities between snapshots
 */
function compareEntities(
  fromEntities: EntitySnapshot[],
  toEntities: EntitySnapshot[],
  entityType: string
): EntityChange[] {
  const changes: EntityChange[] = []
  
  const fromMap = new Map(fromEntities.map(e => [e.id, e]))
  const toMap = new Map(toEntities.map(e => [e.id, e]))
  
  // Find deleted entities
  for (const [id, entity] of fromMap) {
    if (!toMap.has(id)) {
      changes.push({
        entityType,
        entityId: id,
        entityName: entity.name,
        changeType: 'deleted',
        oldValue: entity.data,
        newValue: null,
        impactScore: calculateImpactScore('deleted', entityType),
        affectedEntities: [],
        changeDetails: []
      })
    }
  }
  
  // Find added entities
  for (const [id, entity] of toMap) {
    if (!fromMap.has(id)) {
      changes.push({
        entityType,
        entityId: id,
        entityName: entity.name,
        changeType: 'added',
        oldValue: null,
        newValue: entity.data,
        impactScore: calculateImpactScore('added', entityType),
        affectedEntities: [],
        changeDetails: []
      })
    }
  }
  
  // Find modified entities
  for (const [id, toEntity] of toMap) {
    const fromEntity = fromMap.get(id)
    
    if (fromEntity) {
      const changeDetails = findFieldChanges(fromEntity.data, toEntity.data)
      
      if (changeDetails.length > 0) {
        changes.push({
          entityType,
          entityId: id,
          entityName: toEntity.name,
          changeType: 'modified',
          oldValue: fromEntity.data,
          newValue: toEntity.data,
          impactScore: calculateImpactScore('modified', entityType, changeDetails),
          affectedEntities: [],
          changeDetails
        })
      }
    }
  }
  
  return changes
}

/**
 * Find field-level changes
 */
function findFieldChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>
): ChangeDetail[] {
  const changes: ChangeDetail[] = []
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  
  for (const key of allKeys) {
    const oldValue = oldData[key]
    const newValue = newData[key]
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue,
        significance: determineSignificance(key, oldValue, newValue)
      })
    }
  }
  
  return changes
}

/**
 * Determine significance of a field change
 */
function determineSignificance(
  field: string,
  oldValue: any,
  newValue: any
): 'low' | 'medium' | 'high' {
  const highImpactFields = ['dataType', 'isNullable', 'isPK', 'isFK', 'fromTable', 'toTable']
  const mediumImpactFields = ['columnName', 'tableName', 'spName', 'paramCount']
  
  if (highImpactFields.includes(field)) {
    return 'high'
  }
  
  if (mediumImpactFields.includes(field)) {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Calculate impact score for a change
 */
function calculateImpactScore(
  changeType: 'added' | 'modified' | 'deleted',
  entityType: string,
  changeDetails?: ChangeDetail[]
): number {
  const baseScores: Record<string, number> = {
    table: 90,
    column: 60,
    fk: 80,
    sp: 70,
    view: 60,
    module: 50
  }
  
  const typeMultipliers: Record<string, number> = {
    added: 0.8,
    modified: 1.0,
    deleted: 1.2
  }
  
  let score = baseScores[entityType] || 50
  score *= typeMultipliers[changeType]
  
  // Adjust based on change details
  if (changeDetails && changeDetails.length > 0) {
    const highImpactCount = changeDetails.filter(d => d.significance === 'high').length
    score += highImpactCount * 5
  }
  
  return Math.min(100, Math.round(score))
}

/**
 * Extract affected modules from changes
 */
function extractAffectedModules(changes: EntityChange[]): string[] {
  const modules = new Set<string>()
  
  for (const change of changes) {
    if (change.entityType === 'module') {
      modules.add(change.entityName)
    }
    if (change.newValue?.module) {
      modules.add(change.newValue.module)
    }
  }
  
  return Array.from(modules)
}

/**
 * Calculate coverage change between snapshots
 */
function calculateCoverageChange(
  fromSnapshot: VersionSnapshot,
  toSnapshot: VersionSnapshot
): number {
  const fromCoverage = calculateCoverage(fromSnapshot)
  const toCoverage = calculateCoverage(toSnapshot)
  return toCoverage - fromCoverage
}

/**
 * Calculate coverage for a snapshot
 */
function calculateCoverage(snapshot: VersionSnapshot): number {
  const tableCount = snapshot.tables.length
  const spCount = snapshot.storedProcedures.length
  const moduleCount = snapshot.modules.length
  
  // Simplified coverage calculation
  const expectedEntities = 100 // Baseline expectation
  const actualEntities = tableCount + spCount + moduleCount
  
  return Math.min(100, (actualEntities / expectedEntities) * 100)
}

/**
 * Calculate impact analysis
 */
function calculateImpactAnalysis(
  changes: EntityChange[],
  fromSnapshot: VersionSnapshot,
  toSnapshot: VersionSnapshot
): ImpactAnalysis {
  const breakingChanges = changes.filter(c => 
    c.changeType === 'deleted' ||
    c.changeDetails.some(d => d.significance === 'high')
  ).length
  
  const riskScore = calculateRiskScore(changes)
  
  const overallImpact = determineOverallImpact(breakingChanges, riskScore)
  
  return {
    overallImpact,
    breakingChanges,
    riskScore,
    affectedWorkflows: extractAffectedWorkflows(changes),
    affectedAPIs: extractAffectedAPIs(changes),
    recommendedActions: generateRecommendedActions(changes, overallImpact)
  }
}

/**
 * Calculate risk score (0-100)
 */
function calculateRiskScore(changes: EntityChange[]): number {
  if (changes.length === 0) return 0
  
  const weights = {
    deleted: 40,
    modified: 20,
    added: 10
  }
  
  let score = 0
  for (const change of changes) {
    score += weights[change.changeType] || 10
    score += change.impactScore * 0.3
  }
  
  return Math.min(100, Math.round(score / changes.length))
}

/**
 * Determine overall impact level
 */
function determineOverallImpact(
  breakingChanges: number,
  riskScore: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (breakingChanges > 10 || riskScore > 80) return 'critical'
  if (breakingChanges > 5 || riskScore > 60) return 'high'
  if (breakingChanges > 0 || riskScore > 40) return 'medium'
  return 'low'
}

/**
 * Extract affected workflows
 */
function extractAffectedWorkflows(changes: EntityChange[]): string[] {
  const workflows = new Set<string>()
  
  for (const change of changes) {
    if (change.entityType === 'sp') {
      // SP changes often affect workflows
      workflows.add(`Workflow using ${change.entityName}`)
    }
  }
  
  return Array.from(workflows)
}

/**
 * Extract affected APIs
 */
function extractAffectedAPIs(changes: EntityChange[]): string[] {
  const apis = new Set<string>()
  
  for (const change of changes) {
    if (change.entityType === 'sp') {
      apis.add(`API endpoint calling ${change.entityName}`)
    }
    if (change.entityType === 'table') {
      apis.add(`CRUD operations on ${change.entityName}`)
    }
  }
  
  return Array.from(apis)
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(
  changes: EntityChange[],
  impact: string
): string[] {
  const actions: string[] = []
  
  if (impact === 'critical') {
    actions.push('Review all breaking changes before proceeding')
    actions.push('Run comprehensive test suite')
  }
  
  const deletedSPs = changes.filter(c => 
    c.entityType === 'sp' && c.changeType === 'deleted'
  )
  if (deletedSPs.length > 0) {
    actions.push(`Verify ${deletedSPs.length} deleted stored procedures are no longer needed`)
  }
  
  const modifiedFKs = changes.filter(c =>
    c.entityType === 'fk' && c.changeType === 'modified'
  )
  if (modifiedFKs.length > 0) {
    actions.push('Validate foreign key relationships still correct')
  }
  
  if (changes.length > 20) {
    actions.push('Consider breaking changes into smaller deployments')
  }
  
  return actions
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get version history for a project
 */
export async function getVersionHistory(
  projectId: string,
  limit: number = 20
): Promise<VersionInfo[]> {
  const versions = await prisma.projectVersion.findMany({
    where: { projectId },
    orderBy: { version: 'desc' },
    take: limit
  })
  
  return versions.map(v => ({
    version: v.version,
    name: v.name,
    createdAt: v.createdAt,
    totalEntities: 0, // Would need to parse snapshot
    changeCount: v.changeCount
  }))
}

/**
 * Get specific version details
 */
export async function getVersionDetails(
  projectId: string,
  version: number
): Promise<VersionSnapshot | null> {
  const versionData = await prisma.projectVersion.findUnique({
    where: {
      projectId_version: {
        projectId,
        version
      }
    }
  })
  
  if (!versionData) return null
  
  const snapshot = JSON.parse(versionData.snapshot) as VersionSnapshot
  snapshot.version = version
  snapshot.name = versionData.name
  snapshot.description = versionData.description
  
  return snapshot
}

/**
 * Delete old versions (cleanup)
 */
export async function cleanupOldVersions(
  projectId: string,
  keepVersions: number = 10
): Promise<{ deleted: number }> {
  const versions = await prisma.projectVersion.findMany({
    where: { projectId },
    orderBy: { version: 'desc' },
    select: { version: true }
  })
  
  if (versions.length <= keepVersions) {
    return { deleted: 0 }
  }
  
  const versionsToKeep = versions.slice(0, keepVersions).map(v => v.version)
  
  const result = await prisma.projectVersion.deleteMany({
    where: {
      projectId,
      version: { notIn: versionsToKeep }
    }
  })
  
  return { deleted: result.count }
}

// Export types
export type { VersionSnapshot as VersionSnapshotType, VersionComparison as VersionComparisonType, EntityChange as EntityChangeType }
