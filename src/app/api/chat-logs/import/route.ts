/**
 * CHAT LOG IMPORT API ROUTE
 * =========================
 * Import chat logs by date - can crawl from external sources
 * or accept manual uploads
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Generate unique ID
function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Historical session data for import (March 17-21)
const HISTORICAL_SESSIONS: Record<string, any[]> = {
  '2026-03-17': [
    {
      sessionId: 'log_20260317_001',
      title: 'Project Planning and Architecture Design',
      summary: 'Planned the AI Enterprise Architect project architecture and designed the multi-agent system',
      issuesSolved: [
        'No clear project structure defined',
        'Agent layer architecture not designed',
        'Technology stack decisions needed',
        'Database schema design requirements'
      ],
      featuresAdded: [
        '7-layer agent architecture design',
        'Technology stack selection (Next.js 16, SQLite, Prisma)',
        'Phase-based implementation roadmap',
        'Module registry concept for 35 HIS modules',
        'Multi-tenant architecture planning'
      ],
      filesModified: [
        'IMPLEMENTATION_ROADMAP.md',
        'docs/AGENT_LAYERS_DOCUMENTATION.md',
        'PHASE1_IMPLEMENTATION_SUMMARY.md'
      ],
      commits: ['planning-phase'],
      notes: 'Established the foundation for the AI Enterprise Architect platform with comprehensive planning.'
    },
    {
      sessionId: 'log_20260317_002',
      title: 'Development Environment Setup',
      summary: 'Configured development environment with Bun, Next.js 16, and essential tooling',
      issuesSolved: [
        'Node.js version compatibility issues',
        'ESLint and TypeScript configuration conflicts',
        'Prisma setup with SQLite not working',
        'Hot reload not functioning properly'
      ],
      featuresAdded: [
        'Bun runtime configuration',
        'TypeScript strict mode setup',
        'ESLint flat config with Next.js rules',
        'Prisma with SQLite database',
        'Development scripts and tooling'
      ],
      filesModified: [
        'package.json',
        'tsconfig.json',
        'eslint.config.mjs',
        'prisma/schema.prisma',
        '.env'
      ],
      commits: ['dev-setup'],
      notes: 'Development environment ready for feature development.'
    }
  ],
  '2026-03-18': [
    {
      sessionId: 'log_20260318_001',
      title: 'Initial Project Setup and Architecture',
      summary: 'Set up the AI Enterprise Architect project with Next.js 16, SQLite, Prisma, and NextAuth v5',
      issuesSolved: [
        'Project initialization and folder structure',
        'Database configuration with SQLite and Prisma',
        'Authentication setup with NextAuth v5',
        'Basic UI components and theming system'
      ],
      featuresAdded: [
        'Next.js 16.1.3 project scaffold',
        'Prisma ORM with SQLite database',
        'NextAuth v5 authentication',
        'Theme system with multiple color schemes',
        'Basic dashboard layout with sidebar navigation'
      ],
      filesModified: [
        'package.json',
        'prisma/schema.prisma',
        'src/lib/auth.ts',
        'src/lib/db.ts',
        'src/hooks/useTheme.tsx',
        'src/app/page.tsx',
        'src/app/layout.tsx'
      ],
      commits: ['initial-setup'],
      notes: 'Foundation of the AI Enterprise Architect platform established.'
    },
    {
      sessionId: 'log_20260318_002',
      title: 'SQL Parser and Schema Intelligence',
      summary: 'Implemented SQL DDL parser and schema intelligence features',
      issuesSolved: [
        'SQL parsing not recognizing all DDL statements',
        'Foreign key relationships not being tracked',
        'Column metadata not being extracted properly'
      ],
      featuresAdded: [
        'SQL DDL parser for tables, views, procedures',
        'Foreign key relationship detection',
        'Column intelligence extraction',
        'Schema visualization components',
        'Module registry with 35 HIS modules'
      ],
      filesModified: [
        'src/lib/sql-parser.ts',
        'src/lib/parsers/sql-parser.ts',
        'src/components/tabs/UploadTab.tsx',
        'src/components/tabs/ModulesTab.tsx',
        'src/hooks/useSchema.tsx'
      ],
      commits: ['sql-parser-v1'],
      notes: 'Core parsing engine for SQL schema analysis.'
    }
  ],
  '2026-03-19': [
    {
      sessionId: 'log_20260319_001',
      title: 'FK Resolution and Module Linking',
      summary: 'Built FK resolution queue and automatic module linking system',
      issuesSolved: [
        'Foreign keys pointing to missing tables',
        'Tables not being linked to HIS modules',
        'No visibility into FK resolution status'
      ],
      featuresAdded: [
        'FK Resolution queue tab',
        'Automatic table-to-module linking',
        'Missing table detection and reporting',
        'Module coverage statistics',
        'Dependency chain visualization'
      ],
      filesModified: [
        'src/components/tabs/FKResolutionTab.tsx',
        'src/lib/module-linker.ts',
        'src/config/his-modules.ts',
        'src/app/api/fk-resolution/route.ts'
      ],
      commits: ['fk-resolution'],
      notes: '35 HIS modules configured for auto-linking.'
    },
    {
      sessionId: 'log_20260319_002',
      title: 'Intelligence Layer Implementation',
      summary: 'Added column intelligence, PII/PHI detection, and business rules extraction',
      issuesSolved: [
        'No automated column type inference',
        'PII/PHI columns not being flagged',
        'Business rules hidden in stored procedures'
      ],
      featuresAdded: [
        'Column intelligence inference',
        'PII/PHI automatic detection',
        'Business rules extraction from SPs',
        'Compliance intelligence dashboard',
        'Data sensitivity classification'
      ],
      filesModified: [
        'src/lib/parsers/column-intelligence.ts',
        'src/lib/parsers/pii-detector.ts',
        'src/lib/parsers/business-rules-extractor.ts',
        'src/components/tabs/IntelligenceTab.tsx',
        'src/app/api/intelligence/route.ts'
      ],
      commits: ['intelligence-layer'],
      notes: 'AI-powered column analysis and compliance detection.'
    }
  ],
  '2026-03-20': [
    {
      sessionId: 'log_20260320_001',
      title: 'Code Generation Pipeline',
      summary: 'Built the code generation pipeline for Prisma, API routes, and React components',
      issuesSolved: [
        'Manual code generation was time-consuming',
        'No consistent code patterns across generated files',
        'API routes needed standard CRUD operations'
      ],
      featuresAdded: [
        'Prisma schema generator',
        'TypeScript type generator',
        'API route generator with CRUD',
        'React form and table generators',
        'Zod validation schema generator'
      ],
      filesModified: [
        'src/lib/generators/prisma-generator.ts',
        'src/lib/generators/typescript-generator.ts',
        'src/lib/generators/api-route-generator.ts',
        'src/lib/generators/react-form-generator.ts',
        'src/lib/generators/zod-generator.ts',
        'src/components/tabs/PipelineTab.tsx'
      ],
      commits: ['code-gen-pipeline'],
      notes: 'Full code generation from parsed schemas.'
    },
    {
      sessionId: 'log_20260320_002',
      title: 'Multi-tenant Architecture',
      summary: 'Implemented multi-tenant support with company isolation and RBAC',
      issuesSolved: [
        'No multi-tenant data isolation',
        'Users cannot belong to multiple companies',
        'No role-based access control'
      ],
      featuresAdded: [
        'Company/workspaces model',
        'User-company membership',
        'Role-based access control (RBAC)',
        'Tenant context switching',
        'Per-tenant data isolation'
      ],
      filesModified: [
        'prisma/schema.prisma',
        'src/lib/auth.ts',
        'src/app/api/tenant/route.ts',
        'src/components/tabs/MultiTenantTab.tsx',
        'src/hooks/useTenant.ts'
      ],
      commits: ['multi-tenant'],
      notes: 'Enterprise-grade multi-tenant architecture.'
    },
    {
      sessionId: 'log_20260320_003',
      title: 'Project Manager and File Manager',
      summary: 'Added project management and file browser capabilities',
      issuesSolved: [
        'No way to manage multiple projects',
        'Uploaded files not organized',
        'Project context not persistent'
      ],
      featuresAdded: [
        'Project manager with CRUD',
        'File manager with folder navigation',
        'Project-specific schema storage',
        'Universal upload supporting multiple formats',
        'Project status tracking'
      ],
      filesModified: [
        'src/components/tabs/ProjectManagerTab.tsx',
        'src/components/tabs/FileManagerTab.tsx',
        'src/components/tabs/UniversalUploadTab.tsx',
        'src/app/api/projects/route.ts',
        'src/app/api/files/route.ts'
      ],
      commits: ['project-manager'],
      notes: 'Full project and file management system.'
    }
  ],
  '2026-03-21': [
    {
      sessionId: 'log_20260321_001',
      title: 'MemoryBreakdown Modal & Copyable Links Feature',
      summary: 'Fixed modal positioning issues and implemented copyable links with admin settings control',
      issuesSolved: [
        'MemoryBreakdown popup showing inside topbar instead of center of page',
        'ThreadBreakdown modal also needed portal fix',
        'Modal not using React portal for proper positioning'
      ],
      featuresAdded: [
        'CopyableLink component for hover-to-copy URL functionality',
        'useUISettings hook for global UI preferences in localStorage',
        'Settings panel in Developer tab to toggle copyable links',
        'Browser status bar link support - URL shows on hover',
        'Right-click "Open in new tab" support for NavCards'
      ],
      filesModified: [
        'src/components/CopyableLink.tsx (new)',
        'src/hooks/useUISettings.ts (new)',
        'src/components/MemoryBreakdown.tsx',
        'src/components/ThreadBreakdown.tsx',
        'src/components/tabs/DashboardTab.tsx',
        'src/components/tabs/SettingsTab.tsx'
      ],
      commits: ['1d204da', 'd8dc5b8'],
      notes: 'Both modals now use createPortal for proper full-page overlay.'
    },
    {
      sessionId: 'log_20260321_002',
      title: 'Thread Cleanup & Production Server',
      summary: 'Cleaned up orphaned shell sessions and switched to production server',
      issuesSolved: [
        '452/929 threads (49%) with 65 orphaned shell sessions',
        'Orphaned su + bash pairs from previous commands',
        'Development server running instead of production'
      ],
      featuresAdded: [
        'Cleaned up 135 orphaned shell sessions',
        'Reduced thread count from 452 to 37',
        'Switched to production server (bun run start)'
      ],
      filesModified: [],
      commits: [],
      notes: 'Used pkill to clean orphaned processes. System running efficiently now.'
    },
    {
      sessionId: 'log_20260321_003',
      title: 'API Management Page for Auth Debugging',
      summary: 'Created API Management page to help debug and resolve 401 Unauthorized errors',
      issuesSolved: [
        'POST /api/projects returning 401 Unauthorized',
        'No visibility into API authentication status',
        'No way to create dev user for testing'
      ],
      featuresAdded: [
        'API Management tab in sidebar',
        'Auth status display with dev user info',
        'Database connection status and latency',
        'API endpoints list with auth requirements',
        'Create dev user feature',
        'Instructions to disable auth'
      ],
      filesModified: [
        'src/app/api/api-status/route.ts (new)',
        'src/components/tabs/ApiManagementTab.tsx (new)',
        'src/app/page.tsx'
      ],
      commits: ['179ecda'],
      notes: 'Users can now debug API errors from UI.'
    },
    {
      sessionId: 'log_20260321_004',
      title: 'Chat Log Page for Session History',
      summary: 'Created Chat Log page to track work done, issues solved, and features added with date-based import',
      issuesSolved: [
        'No way to track what was done in previous sessions',
        'No history of issues solved and features added',
        'No import functionality for historical logs'
      ],
      featuresAdded: [
        'Chat Logs tab in sidebar',
        'Pre-populated session history (March 17-21)',
        'Stats dashboard showing totals',
        'Search and date range filter',
        'Expandable log cards with details',
        'Export logs to JSON',
        'Date-based import functionality',
        'Import from historical sessions'
      ],
      filesModified: [
        'prisma/schema.prisma (ChatLog model)',
        'src/app/api/chat-logs/route.ts (new)',
        'src/app/api/chat-logs/import/route.ts (new)',
        'src/components/tabs/ChatLogTab.tsx (new)',
        'src/config/routes.ts',
        'src/app/page.tsx'
      ],
      commits: ['94ebbe7', 'a43f562'],
      notes: 'Sessions logged with issues, features, files, and commits. Database-backed storage.'
    }
  ]
}

// POST - Import logs for a specific date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, dates, logs, source = 'import' } = body

    // If specific logs are provided, import them directly
    if (logs && Array.isArray(logs)) {
      return await importLogs(logs, source)
    }

    // If specific date(s) are provided, import from historical data
    const datesToImport: string[] = []
    
    if (date) {
      datesToImport.push(date)
    } else if (dates && Array.isArray(dates)) {
      datesToImport.push(...dates)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Please provide a date, dates array, or logs array'
      }, { status: 400 })
    }

    // Collect logs for the specified dates
    const logsToImport: any[] = []
    for (const d of datesToImport) {
      if (HISTORICAL_SESSIONS[d]) {
        logsToImport.push(...HISTORICAL_SESSIONS[d].map(log => ({
          ...log,
          sessionDate: d
        })))
      }
    }

    if (logsToImport.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No historical data found for date(s): ${datesToImport.join(', ')}`
      }, { status: 404 })
    }

    return await importLogs(logsToImport, source)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Import logs into database
async function importLogs(logs: any[], source: string) {
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
    importedLogs: [] as any[]
  }

  for (const log of logs) {
    try {
      const logId = log.id || generateId()
      const logSessionId = log.sessionId || logId

      // Check if already exists
      const existing = await prisma.chatLog.findFirst({
        where: {
          OR: [
            { id: logId },
            { sessionId: logSessionId }
          ]
        }
      })

      if (existing) {
        results.skipped++
        continue
      }

      const created = await prisma.chatLog.create({
        data: {
          id: logId,
          sessionId: logSessionId,
          sessionDate: log.sessionDate || new Date().toISOString().split('T')[0],
          title: log.title || 'Chat Session',
          summary: log.summary || '',
          issuesSolved: JSON.stringify(log.issuesSolved || []),
          featuresAdded: JSON.stringify(log.featuresAdded || []),
          filesModified: JSON.stringify(log.filesModified || []),
          commits: JSON.stringify(log.commits || []),
          notes: log.notes || '',
          source: source,
          updatedAt: new Date()
        } as any
      })

      results.imported++
      results.importedLogs.push({
        id: created.id,
        sessionDate: created.sessionDate,
        title: created.title
      })
    } catch (e) {
      results.errors.push(`Failed to import: ${log.title || log.id || 'unknown'}`)
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Imported ${results.imported} logs, skipped ${results.skipped} duplicates`
  })
}

// GET - Get available dates for import
export async function GET(request: NextRequest) {
  const availableDates = Object.keys(HISTORICAL_SESSIONS).map(date => ({
    date,
    count: HISTORICAL_SESSIONS[date].length,
    titles: HISTORICAL_SESSIONS[date].map(l => l.title)
  }))

  return NextResponse.json({
    success: true,
    availableDates,
    message: 'These dates have historical chat logs available for import'
  })
}
