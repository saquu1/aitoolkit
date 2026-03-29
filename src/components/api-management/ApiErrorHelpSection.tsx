'use client'

import React, { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertCircle,
  CheckCircle2,
  Zap,
  Database,
  Shield,
  Server,
  Key,
  FileWarning,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Wrench,
  ExternalLink,
  Info,
  XCircle,
  Loader2
} from 'lucide-react'

// =============================================================================
// ERROR DEFINITIONS
// =============================================================================

interface ApiError {
  code: string
  name: string
  description: string
  causes: string[]
  solutions: string[]
  autoFixAvailable: boolean
  autoFixAction?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'database' | 'auth' | 'config' | 'network' | 'code'
}

const API_ERRORS: ApiError[] = [
  {
    code: '500',
    name: 'Internal Server Error',
    description: 'The server encountered an unexpected condition that prevented it from fulfilling the request.',
    causes: [
      'Database connection failure or timeout',
      'Missing environment variables (DATABASE_URL, AUTH_SECRET)',
      'Uncaught exception in API route handler',
      'Prisma client not initialized properly',
      'Type mismatch in database query'
    ],
    solutions: [
      'Check database connection string in .env file',
      'Run `npx prisma generate` to regenerate Prisma client',
      'Verify all required environment variables are set',
      'Check server logs for detailed error stack trace'
    ],
    autoFixAvailable: true,
    autoFixAction: 'check-database',
    severity: 'critical',
    category: 'database'
  },
  {
    code: 'ROUTE_AUTH',
    name: 'Route Requires Authentication',
    description: 'The API route requires authentication but the user is not logged in or the route is not in the public routes list.',
    causes: [
      'AUTH_REQUIRED is set to true in environment',
      'Route is not added to PUBLIC_API_ROUTES',
      'User session has expired',
      'Accessing protected API from external tool without credentials'
    ],
    solutions: [
      'Add the route to Public API Routes via API Management page',
      'Log in at /login to get a valid session',
      'Set AUTH_REQUIRED=false in .env for development',
      'Use the "Make Public" button next to the endpoint'
    ],
    autoFixAvailable: true,
    autoFixAction: 'show-route-manager',
    severity: 'high',
    category: 'auth'
  },
  {
    code: 'PUBLIC_ROUTE_401',
    name: 'Public Route Still Requires Auth',
    description: 'The route was added to PUBLIC_API_ROUTES but still returns 401 Unauthorized.',
    causes: [
      'Server not restarted after adding the route',
      'routes.ts file not properly saved',
      'Middleware not respecting PUBLIC_API_ROUTES',
      'Cache issue with route configuration'
    ],
    solutions: [
      'Restart the Next.js development server',
      'Verify the route is in src/config/routes.ts',
      'Check middleware.ts for correct public route handling',
      'Clear browser cache and try again'
    ],
    autoFixAvailable: true,
    autoFixAction: 'check-public-routes',
    severity: 'high',
    category: 'config'
  },
  {
    code: 'ROUTE_NOT_FOUND_AFTER_ADD',
    name: 'Route Added But Still 404',
    description: 'A route was added to public routes but the API endpoint still returns 404.',
    causes: [
      'Route file does not exist in /src/app/api/',
      'Typo in route path when adding',
      'Dynamic route segment not properly formatted',
      'Server not restarted after creating the route file'
    ],
    solutions: [
      'Create the route file in /src/app/api/[route-name]/route.ts',
      'Verify the route path matches exactly',
      'For dynamic routes, use the correct format: /api/users/[id]',
      'Restart the server after creating new route files'
    ],
    autoFixAvailable: false,
    severity: 'medium',
    category: 'code'
  },
  {
    code: '401',
    name: 'Unauthorized',
    description: 'The request requires user authentication.',
    causes: [
      'Missing or invalid session token',
      'Expired authentication session',
      'AUTH_REQUIRED is set to true but no user is logged in',
      'Invalid or expired JWT token'
    ],
    solutions: [
      'Log in at /login page',
      'Add the route to public routes in routes.ts',
      'Set AUTH_REQUIRED=false in .env for development',
      'Clear browser cookies and re-authenticate'
    ],
    autoFixAvailable: true,
    autoFixAction: 'create-dev-user',
    severity: 'high',
    category: 'auth'
  },
  {
    code: '403',
    name: 'Forbidden',
    description: 'The server understood the request but refuses to authorize it.',
    causes: [
      'User does not have required role/permissions',
      'CSRF token mismatch',
      'IP restriction in production',
      'Tenant isolation blocking cross-tenant access'
    ],
    solutions: [
      'Check user role in database',
      'Verify CSRF configuration',
      'Check tenant context if using multi-tenant',
      'Contact administrator for access'
    ],
    autoFixAvailable: false,
    severity: 'high',
    category: 'auth'
  },
  {
    code: '404',
    name: 'Not Found',
    description: 'The requested resource could not be found on this server.',
    causes: [
      'Incorrect API endpoint path',
      'Missing or deleted route file',
      'Dynamic route parameter missing',
      'Typo in URL path'
    ],
    solutions: [
      'Verify the API route file exists in /src/app/api/',
      'Check route parameters in the URL',
      'Ensure Next.js server has reloaded after file changes',
      'Check /api/api-status for list of available endpoints'
    ],
    autoFixAvailable: false,
    severity: 'medium',
    category: 'code'
  },
  {
    code: 'ECONNREFUSED',
    name: 'Connection Refused',
    description: 'The database server is not accepting connections.',
    causes: [
      'Database server is not running',
      'Wrong host or port in DATABASE_URL',
      'Firewall blocking the connection',
      'Database container not started'
    ],
    solutions: [
      'Start the database server (e.g., docker-compose up -d)',
      'Verify DATABASE_URL format: postgresql://user:pass@host:port/db',
      'Check if port 5432 is open and accessible',
      'Run database migrations: npx prisma migrate dev'
    ],
    autoFixAvailable: true,
    autoFixAction: 'check-database',
    severity: 'critical',
    category: 'database'
  },
  {
    code: 'P2002',
    name: 'Unique Constraint Violation',
    description: 'A database operation violated a unique constraint.',
    causes: [
      'Trying to create a record that already exists',
      'Duplicate key in unique field',
      'Race condition in concurrent requests'
    ],
    solutions: [
      'Check if record already exists before creating',
      'Use upsert instead of create for idempotent operations',
      'Add proper error handling for duplicate entries'
    ],
    autoFixAvailable: false,
    severity: 'medium',
    category: 'database'
  },
  {
    code: 'P2021',
    name: 'Table Does Not Exist',
    description: 'The database table referenced in the query does not exist.',
    causes: [
      'Migrations not run yet',
      'Wrong database selected',
      'Table dropped accidentally',
      'Schema drift between code and database'
    ],
    solutions: [
      'Run migrations: npx prisma migrate dev',
      'Push schema: npx prisma db push',
      'Verify database connection and name',
      'Check Prisma schema for typos'
    ],
    autoFixAvailable: true,
    autoFixAction: 'run-migrations',
    severity: 'critical',
    category: 'database'
  },
  {
    code: 'ENV_MISSING',
    name: 'Missing Environment Variable',
    description: 'Required environment variable is not set.',
    causes: [
      '.env file not created',
      'Variable name typo',
      'Variable not loaded (restart needed)',
      'Different .env file used in production'
    ],
    solutions: [
      'Create .env file in project root',
      'Copy from .env.example if available',
      'Restart Next.js development server',
      'Check variable name spelling exactly'
    ],
    autoFixAvailable: true,
    autoFixAction: 'check-env',
    severity: 'critical',
    category: 'config'
  },
  {
    code: 'TIMEOUT',
    name: 'Request Timeout',
    description: 'The server did not receive a complete request within the timeout period.',
    causes: [
      'Slow database query',
      'Large file upload',
      'External API call hanging',
      'Resource-intensive operation'
    ],
    solutions: [
      'Optimize database queries with indexes',
      'Increase timeout in API route config',
      'Add pagination for large datasets',
      'Use streaming for large responses'
    ],
    autoFixAvailable: false,
    severity: 'medium',
    category: 'network'
  }
]

// =============================================================================
// COMPONENT
// =============================================================================

interface ApiErrorHelpSectionProps {
  currentError?: {
    code: string
    endpoint: string
    message: string
  }
  onFixApplied?: () => void
}

export function ApiErrorHelpSection({ currentError, onFixApplied }: ApiErrorHelpSectionProps) {
  const { colors } = useTheme()
  const [expandedError, setExpandedError] = useState<string | null>(currentError?.code || null)
  const [fixing, setFixing] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<{ error: string; success: boolean; message: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [runningDiag, setRunningDiag] = useState(false)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const filteredErrors = API_ERRORS.filter(error =>
    error.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    error.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    error.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const runDiagnostics = async () => {
    setRunningDiag(true)
    try {
      const response = await fetch('/api/api-status?action=diagnostics')
      const data = await response.json()
      setDiagnostics(data)
    } catch (e) {
      console.error('Failed to run diagnostics:', e)
    } finally {
      setRunningDiag(false)
    }
  }

  const applyAutoFix = async (error: ApiError) => {
    if (!error.autoFixAction) return

    setFixing(error.code)
    setFixResult(null)

    // Handle show-route-manager action locally
    if (error.autoFixAction === 'show-route-manager') {
      setFixResult({
        error: error.code,
        success: true,
        message: 'Scroll down to "Public API Routes Management" section to add the route to public access.'
      })
      setFixing(null)
      // Scroll to the routes management section
      setTimeout(() => {
        document.querySelector('[data-section="public-routes"]')?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
      return
    }

    // Handle check-public-routes action
    if (error.autoFixAction === 'check-public-routes') {
      try {
        // First verify the routes file
        const response = await fetch('/api/api-status')
        const data = await response.json()
        
        const currentRoute = currentError?.endpoint
        const isPublic = data.endpoints?.find((e: any) => e.path === currentRoute)?.auth === false
        
        if (isPublic) {
          setFixResult({
            error: error.code,
            success: true,
            message: 'Route is in public routes. Please restart the server for changes to take effect.'
          })
        } else {
          setFixResult({
            error: error.code,
            success: false,
            message: 'Route is not in public routes. Add it via the "Public API Routes Management" section.'
          })
        }
      } catch (e) {
        setFixResult({
          error: error.code,
          success: false,
          message: 'Failed to check public routes status.'
        })
      }
      setFixing(null)
      return
    }

    try {
      const response = await fetch('/api/api-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: error.autoFixAction })
      })
      const data = await response.json()

      setFixResult({
        error: error.code,
        success: data.success,
        message: data.message || (data.success ? 'Fix applied successfully!' : 'Failed to apply fix')
      })

      if (data.success && onFixApplied) {
        onFixApplied()
      }
    } catch (e) {
      setFixResult({
        error: error.code,
        success: false,
        message: 'Failed to apply fix. Check server logs.'
      })
    } finally {
      setFixing(null)
    }
  }

  const copySolution = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return colors.error
      case 'high': return '#f97316' // orange
      case 'medium': return colors.warning
      default: return colors.primary
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database': return <Database className="w-4 h-4" />
      case 'auth': return <Shield className="w-4 h-4" />
      case 'config': return <Server className="w-4 h-4" />
      case 'network': return <Clock className="w-4 h-4" />
      default: return <FileWarning className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
            <Wrench className="w-5 h-5" style={{ color: colors.primary }} />
            API Error Help &amp; Quick Fixes
          </h3>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Diagnose and fix common API errors with one click
          </p>
        </div>
        <Button
          onClick={runDiagnostics}
          disabled={runningDiag}
          variant="outline"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          {runningDiag ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          Run Diagnostics
        </Button>
      </div>

      {/* Current Error Banner */}
      {currentError && (
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: alpha(colors.error, 10),
            borderColor: alpha(colors.error, 30)
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" style={{ color: colors.error }} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: alpha(colors.error, 20), color: colors.error }}>
                  {currentError.code}
                </Badge>
                <span className="font-mono text-sm" style={{ color: colors.text }}>
                  {currentError.endpoint}
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                {currentError.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Result */}
      {diagnostics && (
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border
          }}
        >
          <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Info className="w-4 h-4" style={{ color: colors.primary }} />
            Diagnostic Results
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" style={{ color: diagnostics.database?.connected ? colors.success : colors.error }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Database</span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {diagnostics.database?.connected ? `Connected (${diagnostics.database.latency}ms)` : 'Disconnected'}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" style={{ color: diagnostics.env?.authSecret ? colors.success : colors.error }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Auth Secret</span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {diagnostics.env?.authSecret ? 'Configured' : 'Missing'}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" style={{ color: colors.primary }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Prisma</span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {diagnostics.prisma?.clientReady ? 'Ready' : 'Not initialized'}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: diagnostics.auth?.required ? colors.warning : colors.success }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Auth Mode</span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {diagnostics.auth?.required ? 'Required' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search errors by code, name, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
            color: colors.text
          }}
        />
      </div>

      {/* Error List */}
      <div className="space-y-2">
        {filteredErrors.map((error) => {
          const isExpanded = expandedError === error.code
          const severityColor = getSeverityColor(error.severity)

          return (
            <div
              key={error.code}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: alpha(colors.card, 50),
                borderColor: currentError?.code === error.code
                  ? alpha(colors.error, 30)
                  : colors.border
              }}
            >
              {/* Error Header */}
              <button
                className="w-full p-4 flex items-center justify-between text-left"
                onClick={() => setExpandedError(isExpanded ? null : error.code)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: alpha(severityColor, 20) }}
                  >
                    {getCategoryIcon(error.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        style={{
                          backgroundColor: alpha(severityColor, 20),
                          color: severityColor
                        }}
                      >
                        {error.code}
                      </Badge>
                      <span className="font-medium" style={{ color: colors.text }}>
                        {error.name}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
                      {error.description.slice(0, 60)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {error.autoFixAvailable && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: colors.success, color: colors.success }}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      1-Click Fix
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" style={{ color: colors.textMuted }} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{ color: colors.textMuted }} />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: alpha(colors.border, 30) }}>
                  {/* Description */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-1" style={{ color: colors.text }}>
                      Description
                    </h5>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {error.description}
                    </p>
                  </div>

                  {/* Causes */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Common Causes
                    </h5>
                    <ul className="space-y-1">
                      {error.causes.map((cause, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: colors.textMuted }}
                        >
                          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.error }} />
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Solutions */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Solutions
                    </h5>
                    <ul className="space-y-2">
                      {error.solutions.map((solution, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg"
                          style={{ backgroundColor: alpha(colors.success, 5) }}
                        >
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.success }} />
                            <span style={{ color: colors.text }}>{solution}</span>
                          </div>
                          <button
                            onClick={() => copySolution(solution)}
                            className="p-1 rounded hover:bg-white/10"
                            style={{ color: colors.textMuted }}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Auto Fix */}
                  {error.autoFixAvailable && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                        <Zap className="w-4 h-4" style={{ color: colors.warning }} />
                        Quick Fix
                      </h5>
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: alpha(colors.warning, 5) }}
                      >
                        <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                          This error can be automatically resolved. Click the button below to apply the fix.
                        </p>

                        {fixResult?.error === error.code ? (
                          <div
                            className="p-3 rounded-lg mb-3"
                            style={{
                              backgroundColor: alpha(fixResult.success ? colors.success : colors.error, 10)
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {fixResult.success ? (
                                <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                              ) : (
                                <AlertCircle className="w-4 h-4" style={{ color: colors.error }} />
                              )}
                              <span
                                className="text-sm"
                                style={{ color: fixResult.success ? colors.success : colors.error }}
                              >
                                {fixResult.message}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <Button
                          onClick={() => applyAutoFix(error)}
                          disabled={fixing === error.code}
                          style={{ backgroundColor: colors.warning }}
                        >
                          {fixing === error.code ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Wrench className="w-4 h-4 mr-2" />
                          )}
                          Apply Fix
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Links */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border
        }}
      >
        <h4 className="font-medium mb-3" style={{ color: colors.text }}>Quick Links</h4>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/api-status"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: alpha(colors.bgSecondary, 30), color: colors.text }}
          >
            <ExternalLink className="w-3 h-3" />
            API Status
          </a>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: alpha(colors.bgSecondary, 30), color: colors.text }}
          >
            <ExternalLink className="w-3 h-3" />
            Health Check
          </a>
          <a
            href="/settings"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: alpha(colors.bgSecondary, 30), color: colors.text }}
          >
            <Server className="w-3 h-3" />
            Settings
          </a>
        </div>
      </div>
    </div>
  )
}

export default ApiErrorHelpSection
