/**
 * Backup API Routes
 * TASK-5.3: Backup & Recovery
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  backupService,
  BackupConfig,
  RestoreConfig
} from '@/lib/backup/backup-service'

// GET /api/backup
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  const projectId = request.nextUrl.searchParams.get('projectId')

  switch (action) {
    case 'list':
      if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
      }
      const backups = await backupService.listBackups(projectId)
      return NextResponse.json({ success: true, data: backups })

    case 'get':
      const backupId = request.nextUrl.searchParams.get('backupId')
      if (!projectId || !backupId) {
        return NextResponse.json({ error: 'Missing projectId or backupId' }, { status: 400 })
      }
      const backup = (await backupService.listBackups(projectId)).find(b => b.id === backupId)
      return NextResponse.json({ success: true, data: backup })

    case 'usage':
      const usageProjectId = request.nextUrl.searchParams.get('projectId') || undefined
      const usage = await backupService.getStorageUsage(usageProjectId)
      return NextResponse.json({ success: true, data: usage })

    default:
      return NextResponse.json({
        error: 'Invalid action',
        availableActions: ['list', 'get', 'usage']
      }, { status: 400 })
  }
}

// POST /api/backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create':
        return await createBackup(body)

      case 'restore':
        return await restoreBackup(body)

      case 'delete':
        return await deleteBackup(body)

      case 'schedule':
        return await scheduleBackup(body)

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['create', 'restore', 'delete', 'schedule']
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Backup API error:', error)
    return NextResponse.json({
      error: 'Operation failed',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Create backup
 */
async function createBackup(body: any) {
  const { projectId, includeFiles, includeDatabase, destination, s3Bucket, retention, compress } = body

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const config: BackupConfig = {
    projectId,
    includeFiles: includeFiles ?? true,
    includeDatabase: includeDatabase ?? true,
    destination: destination || 'local',
    s3Bucket,
    retention: retention || 30,
    compress: compress ?? true
  }

  const result = await backupService.createBackup(config)

  return NextResponse.json({
    success: result.status === 'success',
    data: result
  })
}

/**
 * Restore from backup
 */
async function restoreBackup(body: any) {
  const { backupId, projectId, overwriteExisting, dryRun } = body

  if (!backupId || !projectId) {
    return NextResponse.json({ error: 'Missing backupId or projectId' }, { status: 400 })
  }

  const config: RestoreConfig = {
    backupId,
    projectId,
    overwriteExisting: overwriteExisting ?? false,
    dryRun: dryRun ?? false
  }

  const result = await backupService.restoreBackup(config)

  return NextResponse.json({
    success: result.status === 'success',
    data: result
  })
}

/**
 * Delete backup
 */
async function deleteBackup(body: any) {
  const { projectId, backupId } = body

  if (!projectId || !backupId) {
    return NextResponse.json({ error: 'Missing projectId or backupId' }, { status: 400 })
  }

  const success = await backupService.deleteBackup(projectId, backupId)

  return NextResponse.json({
    success,
    message: success ? 'Backup deleted' : 'Failed to delete backup'
  })
}

/**
 * Schedule backup
 */
async function scheduleBackup(body: any) {
  const { projectId, cronExpression, config } = body

  if (!projectId || !cronExpression) {
    return NextResponse.json({ error: 'Missing projectId or cronExpression' }, { status: 400 })
  }

  // In production, this would integrate with a job scheduler
  return NextResponse.json({
    success: true,
    message: 'Backup scheduled',
    data: {
      scheduleId: `schedule_${Date.now()}`,
      projectId,
      cronExpression
    }
  })
}
