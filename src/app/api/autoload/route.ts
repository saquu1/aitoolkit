/**
 * Autoload Configuration API
 * =========================
 * Centralized control for page data fetching behavior.
 * Allows enabling/disabling auto-fetch on specific pages to reduce database load.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Default autoload configurations for all pages
// Note: All pages default to disabled to reduce database load - user can enable as needed
const DEFAULT_AUTOLOAD_CONFIGS = [
  // Core - Essential pages (disabled by default to save resources)
  { pageKey: 'dashboard', pageName: 'Dashboard', category: 'core', description: 'DB stats, health score, quick actions', priority: 1, enabled: false },
  { pageKey: 'projects', pageName: 'Projects', category: 'core', description: 'Project list, workspace data', priority: 2, enabled: false },
  { pageKey: 'modules', pageName: 'Module Registry', category: 'core', description: 'HIS modules, layers, statistics', fetchEndpoint: '/api/ai-engine?action=get-modules', priority: 3, enabled: false },
  { pageKey: 'fk-resolution', pageName: 'FK Resolution', category: 'core', description: 'Foreign key resolution queue', priority: 2, enabled: false },
  { pageKey: 'data-dictionary', pageName: 'Data Dictionary', category: 'core', description: 'Living data dictionary entries', priority: 3, enabled: false },
  { pageKey: 'file-manager', pageName: 'File Manager', category: 'core', description: 'Project files, uploads', priority: 3, enabled: false },
  { pageKey: 'smart-upload', pageName: 'Universal Upload', category: 'core', description: 'File parsing, import data', priority: 3, enabled: false },
  { pageKey: 'upload', pageName: 'Schema Toolkit', category: 'core', description: 'SQL parsing, schema analysis', priority: 3, enabled: false },
  { pageKey: 'pipeline', pageName: 'Pipeline', category: 'core', description: 'Analysis pipeline status', priority: 4, enabled: false },

  // Analytics - Intelligence and analysis pages
  { pageKey: 'intelligence-bank', pageName: 'Intelligence Bank', category: 'analytics', description: 'Unified intelligence data', priority: 4, enabled: false },
  { pageKey: 'intelligence', pageName: 'Intelligence', category: 'analytics', description: 'Column intelligence, PII/PHI detection', priority: 4, enabled: false },
  { pageKey: 'project-intel', pageName: 'Project Intelligence', category: 'analytics', description: 'Project-specific intelligence', priority: 5, enabled: false },
  { pageKey: 'chat-logs', pageName: 'Chat Logs', category: 'analytics', description: 'Session history, analytics', priority: 6, enabled: false },

  // Management - Admin and configuration pages
  { pageKey: 'api-management', pageName: 'API Management', category: 'management', description: 'API status, dev user management', priority: 7, enabled: false },
  { pageKey: 'multi-tenant', pageName: 'Multi-Tenant', category: 'management', description: 'Company, workspace data', priority: 5, enabled: false },
  { pageKey: 'settings', pageName: 'Settings', category: 'management', description: 'User preferences, configuration', priority: 8, enabled: false },
  { pageKey: 'autoload', pageName: 'Autoload Config', category: 'management', description: 'Autoload configuration registry', priority: 9, enabled: false },

  // Migration - Migration and conversion tools
  { pageKey: 'legacy-migration', pageName: 'Legacy Migration', category: 'migration', description: 'Migration tools, progress', priority: 6, enabled: false },
]

// GET - Fetch all autoload configurations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pageKey = searchParams.get('pageKey')
    const category = searchParams.get('category')

    // If specific page requested
    if (pageKey) {
      const config = await prisma.autoloadConfig.findUnique({
        where: { pageKey }
      })

      // If not in DB, create default (uses default enabled value which is false)
      if (!config) {
        const defaultConfig = DEFAULT_AUTOLOAD_CONFIGS.find(c => c.pageKey === pageKey)
        if (defaultConfig) {
          const newConfig = await prisma.autoloadConfig.create({
            data: { ...defaultConfig }
          })
          return NextResponse.json({ config: newConfig })
        }
        return NextResponse.json({ config: null, message: 'Unknown page key' })
      }

      return NextResponse.json({ config })
    }

    // Get all configs
    let configs = await prisma.autoloadConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { priority: 'asc' }]
    })

    // Seed defaults if empty (use enabled value from defaults - all disabled by default)
    if (configs.length === 0) {
      configs = await prisma.autoloadConfig.createMany({
        data: DEFAULT_AUTOLOAD_CONFIGS.map(c => ({ ...c }))
      })
      configs = await prisma.autoloadConfig.findMany({
        orderBy: [{ category: 'asc' }, { priority: 'asc' }]
      })
    }

    // Calculate stats
    const stats = {
      total: configs.length,
      enabled: configs.filter(c => c.enabled).length,
      disabled: configs.filter(c => !c.enabled).length,
      byCategory: configs.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({ configs, stats })
  } catch (error) {
    console.error('[Autoload API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch autoload configurations' },
      { status: 500 }
    )
  }
}

// POST - Toggle autoload for a page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageKey, enabled, reason, action } = body

    // Bulk actions
    if (action === 'enable-all') {
      await prisma.autoloadConfig.updateMany({
        data: { enabled: true, lastToggledAt: new Date() }
      })
      const configs = await prisma.autoloadConfig.findMany({
        orderBy: [{ category: 'asc' }, { priority: 'asc' }]
      })
      return NextResponse.json({ 
        message: 'All autoloads enabled', 
        configs,
        stats: calculateStats(configs)
      })
    }

    if (action === 'disable-all') {
      await prisma.autoloadConfig.updateMany({
        data: { enabled: false, lastToggledAt: new Date() }
      })
      const configs = await prisma.autoloadConfig.findMany({
        orderBy: [{ category: 'asc' }, { priority: 'asc' }]
      })
      return NextResponse.json({ 
        message: 'All autoloads disabled', 
        configs,
        stats: calculateStats(configs)
      })
    }

    if (action === 'disable-category') {
      const { category } = body
      await prisma.autoloadConfig.updateMany({
        where: { category },
        data: { enabled: false, lastToggledAt: new Date() }
      })
      const configs = await prisma.autoloadConfig.findMany({
        orderBy: [{ category: 'asc' }, { priority: 'asc' }]
      })
      return NextResponse.json({ 
        message: `Category '${category}' disabled`, 
        configs,
        stats: calculateStats(configs)
      })
    }

    if (action === 'enable-category') {
      const { category } = body
      await prisma.autoloadConfig.updateMany({
        where: { category },
        data: { enabled: true, lastToggledAt: new Date() }
      })
      const configs = await prisma.autoloadConfig.findMany({
        orderBy: [{ category: 'asc' }, { priority: 'asc' }]
      })
      return NextResponse.json({ 
        message: `Category '${category}' enabled`, 
        configs,
        stats: calculateStats(configs)
      })
    }

    // Single page toggle
    if (!pageKey) {
      return NextResponse.json({ error: 'pageKey is required' }, { status: 400 })
    }

    // Check if config exists
    let config = await prisma.autoloadConfig.findUnique({
      where: { pageKey }
    })

    if (!config) {
      // Create from defaults (uses default enabled value which is false)
      const defaultConfig = DEFAULT_AUTOLOAD_CONFIGS.find(c => c.pageKey === pageKey)
      if (!defaultConfig) {
        return NextResponse.json({ error: 'Unknown page key' }, { status: 400 })
      }
      config = await prisma.autoloadConfig.create({
        data: {
          ...defaultConfig,
          enabled: enabled ?? defaultConfig.enabled ?? false,
          reason,
          lastToggledAt: new Date()
        }
      })
    } else {
      // Update existing
      config = await prisma.autoloadConfig.update({
        where: { pageKey },
        data: {
          enabled: enabled ?? !config.enabled,
          reason,
          lastToggledAt: new Date()
        }
      })
    }

    // Get updated stats
    const allConfigs = await prisma.autoloadConfig.findMany()
    const stats = calculateStats(allConfigs)

    return NextResponse.json({ 
      message: `Autoload ${config.enabled ? 'enabled' : 'disabled'} for ${config.pageName}`,
      config,
      stats
    })
  } catch (error) {
    console.error('[Autoload API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update autoload configuration' },
      { status: 500 }
    )
  }
}

// DELETE - Reset to defaults
export async function DELETE() {
  try {
    await prisma.autoloadConfig.deleteMany()
    await prisma.autoloadConfig.createMany({
      data: DEFAULT_AUTOLOAD_CONFIGS.map(c => ({ ...c }))
    })
    const configs = await prisma.autoloadConfig.findMany({
      orderBy: [{ category: 'asc' }, { priority: 'asc' }]
    })
    return NextResponse.json({ 
      message: 'Reset to defaults', 
      configs,
      stats: calculateStats(configs)
    })
  } catch (error) {
    console.error('[Autoload API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reset autoload configurations' },
      { status: 500 }
    )
  }
}

function calculateStats(configs: any[]) {
  return {
    total: configs.length,
    enabled: configs.filter(c => c.enabled).length,
    disabled: configs.filter(c => !c.enabled).length,
    byCategory: configs.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}
