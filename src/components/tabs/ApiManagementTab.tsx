'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ApiStatus,
  Database,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  User,
  Key,
  Server,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Settings,
  Zap,
  Plus,
  Trash2,
  Lock,
  Unlock,
  HelpCircle
} from 'lucide-react'
import { ApiErrorHelpSection } from '@/components/api-management'

interface ApiEndpoint {
  path: string
  methods: string[]
  auth: boolean
}

interface ApiStatusResponse {
  success: boolean
  timestamp: string
  auth: {
    required: boolean
    hasDevUser: boolean
    devUser: { id: string; email: string; name: string; role: string; isActive: boolean } | null
  }
  database: {
    status: string
    latency: number
  }
  endpoints: ApiEndpoint[]
  recentErrors: Array<{
    timestamp: string
    endpoint: string
    method: string
    status: number
    error: string
  }>
}

export function ApiManagementTab() {
  const { colors } = useTheme()
  const [status, setStatus] = useState<ApiStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newRoutePath, setNewRoutePath] = useState('')
  const [addingRoute, setAddingRoute] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/api-status')
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      console.error('Failed to fetch API status:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const createDevUser = async () => {
    setCreatingUser(true)
    try {
      const res = await fetch('/api/api-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-dev-user' })
      })
      const data = await res.json()
      if (data.success) {
        fetchStatus()
      }
    } catch (e) {
      console.error('Failed to create dev user:', e)
    } finally {
      setCreatingUser(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const addPublicRoute = async () => {
    if (!newRoutePath.trim()) return
    
    setAddingRoute(true)
    setMessage(null)
    try {
      const res = await fetch('/api/api-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-public-route', routePath: newRoutePath.trim() })
      })
      const data = await res.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || `Route ${newRoutePath} added successfully` })
        setNewRoutePath('')
        fetchStatus()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add route' })
      }
    } catch (e) {
      console.error('Failed to add public route:', e)
      setMessage({ type: 'error', text: 'Failed to add route' })
    } finally {
      setAddingRoute(false)
    }
  }

  const removePublicRoute = async (routePath: string) => {
    if (!confirm(`Remove ${routePath} from public routes?`)) return
    
    try {
      const res = await fetch('/api/api-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-public-route', routePath })
      })
      const data = await res.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || `Route ${routePath} removed` })
        fetchStatus()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to remove route' })
      }
    } catch (e) {
      console.error('Failed to remove public route:', e)
      setMessage({ type: 'error', text: 'Failed to remove route' })
    }
  }

  const toggleRouteAuth = async (routePath: string, isCurrentlyPublic: boolean) => {
    if (isCurrentlyPublic) {
      await removePublicRoute(routePath)
    } else {
      setNewRoutePath(routePath)
      await addPublicRoute()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>API Management</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>Monitor API health, authentication, and resolve errors</p>
        </div>
        <Button onClick={fetchStatus} style={{ backgroundColor: colors.primary }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-4 gap-4">
        {/* Auth Status */}
        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5" style={{ color: status?.auth.required ? colors.warning : colors.success }} />
            <Badge style={{ 
              backgroundColor: status?.auth.required ? alpha(colors.warning, 20) : alpha(colors.success, 20),
              color: status?.auth.required ? colors.warning : colors.success
            }}>
              {status?.auth.required ? 'Required' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Authentication</p>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            {status?.auth.hasDevUser ? 'Dev user available' : 'No dev user'}
          </p>
        </div>

        {/* Database Status */}
        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5" style={{ color: status?.database.status === 'connected' ? colors.success : colors.error }} />
            <Badge style={{ 
              backgroundColor: status?.database.status === 'connected' ? alpha(colors.success, 20) : alpha(colors.error, 20),
              color: status?.database.status === 'connected' ? colors.success : colors.error
            }}>
              {status?.database.status === 'connected' ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Database</p>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            {status?.database.latency}ms latency
          </p>
        </div>

        {/* API Endpoints */}
        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Server className="w-5 h-5" style={{ color: colors.primary }} />
            <Badge style={{ 
              backgroundColor: alpha(colors.primary, 20),
              color: colors.primary
            }}>
              {status?.endpoints.length || 0}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>API Endpoints</p>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            {status?.endpoints.filter(e => e.auth).length || 0} require auth
          </p>
        </div>

        {/* Errors */}
        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5" style={{ color: status?.recentErrors.length ? colors.error : colors.success }} />
            <Badge style={{ 
              backgroundColor: status?.recentErrors.length ? alpha(colors.error, 20) : alpha(colors.success, 20),
              color: status?.recentErrors.length ? colors.error : colors.success
            }}>
              {status?.recentErrors.length || 0}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Recent Errors</p>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            {status?.recentErrors.length ? 'Issues detected' : 'All clear'}
          </p>
        </div>
      </div>

      {/* Authentication Section */}
      <div 
        className="rounded-xl border p-6"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: colors.text }}>
          <User className="w-5 h-5" style={{ color: colors.primary }} />
          Authentication Settings
        </h3>

        {/* Current Auth Status */}
        <div 
          className="p-4 rounded-lg mb-4"
          style={{ 
            backgroundColor: status?.auth.required ? alpha(colors.warning, 10) : alpha(colors.success, 10),
            border: `1px solid ${status?.auth.required ? alpha(colors.warning, 30) : alpha(colors.success, 30)}`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.auth.required ? (
                <AlertTriangle className="w-5 h-5" style={{ color: colors.warning }} />
              ) : (
                <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
              )}
              <div>
                <p className="font-medium" style={{ color: colors.text }}>
                  Authentication is {status?.auth.required ? 'Required' : 'Disabled'}
                </p>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  {status?.auth.required 
                    ? 'API calls require valid session token'
                    : 'API calls bypass authentication'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dev User Section */}
        <div className="space-y-4">
          <h4 className="font-medium" style={{ color: colors.text }}>Development User</h4>
          
          {status?.auth.devUser ? (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs" style={{ color: colors.textMuted }}>Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value="dev@localhost" 
                      readOnly 
                      className="font-mono text-sm"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    />
                    <button 
                      onClick={() => copyToClipboard('dev@localhost')}
                      className="p-2 rounded hover:bg-white/10"
                      style={{ color: colors.textMuted }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs" style={{ color: colors.textMuted }}>Password</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      value="dev123" 
                      readOnly 
                      className="font-mono text-sm"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 rounded hover:bg-white/10"
                      style={{ color: colors.textMuted }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => copyToClipboard('dev123')}
                      className="p-2 rounded hover:bg-white/10"
                      style={{ color: colors.textMuted }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: alpha(colors.success, 10) }}>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  <strong style={{ color: colors.text }}>Login Instructions:</strong> Use the credentials above to log in at{' '}
                  <a href="/login" className="underline" style={{ color: colors.primary }}>/login</a>
                </p>
              </div>
            </div>
          ) : (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
            >
              <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                Create a development user to bypass authentication for testing
              </p>
              <Button 
                onClick={createDevUser}
                disabled={creatingUser}
                style={{ backgroundColor: colors.primary }}
              >
                {creatingUser ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <User className="w-4 h-4 mr-2" />
                )}
                Create Dev User
              </Button>
            </div>
          )}
        </div>

        {/* Disable Auth */}
        <div 
          className="mt-4 p-4 rounded-lg"
          style={{ 
            backgroundColor: alpha(colors.error, 5),
            border: `1px solid ${alpha(colors.error, 20)}`
          }}
        >
          <h4 className="font-medium mb-2" style={{ color: colors.text }}>Disable Authentication (Server)</h4>
          <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
            Add this to your <code className="px-1 py-0.5 rounded" style={{ backgroundColor: alpha(colors.bgSecondary, 50) }}>.env</code> file and restart the server:
          </p>
          <div 
            className="p-3 rounded font-mono text-sm"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            AUTH_REQUIRED=false
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: message.type === 'success' ? alpha(colors.success, 10) : alpha(colors.error, 10),
            borderColor: message.type === 'success' ? alpha(colors.success, 30) : alpha(colors.error, 30)
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
              ) : (
                <AlertCircle className="w-5 h-5" style={{ color: colors.error }} />
              )}
              <span style={{ color: colors.text }}>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-sm" style={{ color: colors.textMuted }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Public Routes Management */}
      <div 
        data-section="public-routes"
        className="rounded-xl border p-6"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: colors.text }}>
          <Unlock className="w-5 h-5" style={{ color: colors.success }} />
          Public API Routes Management
        </h3>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Add or remove API routes from public access. Public routes don't require authentication.
        </p>

        {/* Add Route Form */}
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="/api/your-route"
            value={newRoutePath}
            onChange={(e) => setNewRoutePath(e.target.value)}
            className="flex-1 font-mono"
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            onKeyDown={(e) => e.key === 'Enter' && addPublicRoute()}
          />
          <Button 
            onClick={addPublicRoute}
            disabled={addingRoute || !newRoutePath.trim()}
            style={{ backgroundColor: colors.primary }}
          >
            {addingRoute ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Public Route
          </Button>
        </div>

        <div 
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: alpha(colors.warning, 10), border: `1px solid ${alpha(colors.warning, 30)}` }}
        >
          <strong style={{ color: colors.warning }}>⚠️ Note:</strong>
          <span style={{ color: colors.textMuted }}> Changes require server restart to take effect. The routes.ts file will be modified.</span>
        </div>
      </div>

      {/* API Endpoints */}
      <div 
        className="rounded-xl border p-6"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: colors.text }}>
          <Server className="w-5 h-5" style={{ color: colors.accent }} />
          API Endpoints
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: colors.textMuted }}>
                <th className="text-left p-2">Endpoint</th>
                <th className="text-left p-2">Methods</th>
                <th className="text-center p-2">Auth</th>
                <th className="text-center p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {status?.endpoints.map((endpoint, i) => (
                <tr 
                  key={endpoint.path}
                  className="border-t"
                  style={{ borderColor: alpha(colors.border, 30) }}
                >
                  <td className="p-2 font-mono" style={{ color: colors.text }}>
                    {endpoint.path}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {endpoint.methods.map(method => (
                        <Badge 
                          key={method}
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            borderColor: method === 'GET' ? colors.success : method === 'POST' ? colors.primary : method === 'DELETE' ? colors.error : colors.warning,
                            color: method === 'GET' ? colors.success : method === 'POST' ? colors.primary : method === 'DELETE' ? colors.error : colors.warning
                          }}
                        >
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    {endpoint.auth ? (
                      <div className="flex items-center justify-center gap-1">
                        <Lock className="w-4 h-4" style={{ color: colors.warning }} />
                        <span className="text-xs" style={{ color: colors.warning }}>Protected</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <Unlock className="w-4 h-4" style={{ color: colors.success }} />
                        <span className="text-xs" style={{ color: colors.success }}>Public</span>
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleRouteAuth(endpoint.path, !endpoint.auth)}
                      style={{ 
                        borderColor: endpoint.auth ? colors.success : colors.warning,
                        color: endpoint.auth ? colors.success : colors.warning
                      }}
                    >
                      {endpoint.auth ? (
                        <>
                          <Unlock className="w-3 h-3 mr-1" />
                          Make Public
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Make Protected
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Errors */}
      {status?.recentErrors && status.recentErrors.length > 0 && (
        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: colors.text }}>
            <AlertCircle className="w-5 h-5" style={{ color: colors.error }} />
            Recent Errors
          </h3>

          <div className="space-y-2">
            {status.recentErrors.map((err, i) => (
              <div 
                key={i}
                className="p-3 rounded-lg"
                style={{ 
                  backgroundColor: alpha(colors.error, 5),
                  border: `1px solid ${alpha(colors.error, 20)}`
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge 
                      style={{ 
                        backgroundColor: alpha(colors.error, 20),
                        color: colors.error 
                      }}
                    >
                      {err.status}
                    </Badge>
                    <span className="font-mono text-sm" style={{ color: colors.text }}>
                      {err.method} {err.endpoint}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm" style={{ color: colors.textMuted }}>{err.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Error Help Section */}
      <ApiErrorHelpSection 
        currentError={status?.recentErrors?.[0] ? {
          code: String(status.recentErrors[0].status),
          endpoint: status.recentErrors[0].endpoint,
          message: status.recentErrors[0].error
        } : undefined}
        onFixApplied={fetchStatus}
      />

      {/* Quick Actions */}
      <div 
        className="rounded-xl border p-6"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Quick Actions</h3>
        <div className="flex gap-3">
          <a href="/login">
            <Button style={{ backgroundColor: colors.primary }}>
              <Key className="w-4 h-4 mr-2" />
              Go to Login
            </Button>
          </a>
          <a href="/register">
            <Button variant="outline" style={{ borderColor: colors.border, color: colors.text }}>
              <User className="w-4 h-4 mr-2" />
              Register Account
            </Button>
          </a>
          <a href="/settings">
            <Button variant="outline" style={{ borderColor: colors.border, color: colors.text }}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
