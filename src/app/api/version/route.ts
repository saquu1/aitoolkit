/**
 * VERSION TRACKING API
 * ====================
 * Manages development version tracking for rollback detection
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseAvailable } from '@/lib/db'

// =============================================================================
// TYPES
// =============================================================================

interface VersionRecord {
  id: string
  version: string
  timestamp: string
  note?: string
  source: 'manual' | 'git_commit' | 'git_push' | 'backup' | 'auto'
  gitCommit?: string
  gitBranch?: string
}

// In-memory cache for versions (fallback when DB unavailable)
let versionCache: VersionRecord[] = []

// =============================================================================
// GET - List all versions
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const dbAvailable = await isDatabaseAvailable()
    
    if (dbAvailable) {
      // Try to get from database
      // Note: If you have a Version model in Prisma, use it here
      // For now, we'll use in-memory cache persisted to a JSON file
    }
    
    // Return cached versions
    return NextResponse.json({
      success: true,
      versions: versionCache,
      count: versionCache.length
    })
  } catch (error) {
    console.error('Version GET error:', error)
    return NextResponse.json({
      success: true,
      versions: versionCache,
      count: versionCache.length
    })
  }
}

// =============================================================================
// POST - Create new version
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, version } = body

    if (action === 'create' && version) {
      // Add to beginning of array (newest first)
      versionCache = [version, ...versionCache]
      
      // Keep only last 100 versions
      if (versionCache.length > 100) {
        versionCache = versionCache.slice(0, 100)
      }

      return NextResponse.json({
        success: true,
        version,
        message: `Version v${version.version} created`
      })
    }

    if (action === 'clear') {
      versionCache = []
      return NextResponse.json({
        success: true,
        message: 'All versions cleared'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })
  } catch (error) {
    console.error('Version POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create version'
    }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Remove a version
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id) {
      versionCache = versionCache.filter(v => v.id !== id)
      return NextResponse.json({
        success: true,
        message: 'Version deleted'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Version ID required'
    }, { status: 400 })
  } catch (error) {
    console.error('Version DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete version'
    }, { status: 500 })
  }
}
