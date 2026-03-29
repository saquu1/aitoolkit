'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Brain, 
  Database, 
  Shield, 
  ShieldOff,
  Bell, 
  Code,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  LogOut
} from 'lucide-react'

export function SettingsTab() {
  const { colors } = useTheme()
  const { isAuthenticated, user, loginEnabled, logout, checkAuth } = useAuth()
  const [loginToggle, setLoginToggle] = useState(loginEnabled)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [authMsg, setAuthMsg] = useState<string | null>(null)

  // Sync toggle state with auth status
  useEffect(() => {
    setLoginToggle(loginEnabled)
  }, [loginEnabled])
  // Connect to shared schema state
  const { 
    parseResult, 
    totalTables, 
    totalColumns, 
    fkResolvedPercent, 
    modulesLinked, 
    missingTables,
    clearAll
  } = useSchema()

  // Helper function to create semi-transparent colors
  const alpha = (color: string, opacity: number) => 
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // ── Toggle login on/off ──
  const handleLoginToggle = async (checked: boolean) => {
    setToggleLoading(true)
    setAuthMsg(null)
    try {
      const res = await fetch("/api/settings/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginEnabled: checked }),
      })
      const data = await res.json()
      if (data.success) {
        setLoginToggle(data.loginEnabled)
        setAuthMsg(data.message)
        await checkAuth() // refresh auth state
      } else {
        setAuthMsg(data.error || "Failed to toggle login")
        setLoginToggle(!checked) // revert
      }
    } catch (err) {
      setAuthMsg("Network error")
      setLoginToggle(!checked)
    } finally {
      setToggleLoading(false)
      setTimeout(() => setAuthMsg(null), 4000)
    }
  }

  // ── Logout ──
  const handleLogout = () => {
    logout()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
            Settings
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Configure your AI Enterprise Architect preferences
          </p>
        </div>
        <Button style={{ backgroundColor: colors.primary }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border }}>
          <TabsTrigger 
            value="ai" 
            className="data-[state=active]:text-white"
            style={{
              color: colors.textMuted,
            }}
          >
            <Brain className="w-4 h-4 mr-2" style={{ color: colors.primary }} />
            AI Engine
          </TabsTrigger>
          <TabsTrigger 
            value="database"
            style={{ color: colors.textMuted }}
          >
            <Database className="w-4 h-4 mr-2" style={{ color: colors.accent }} />
            Database
          </TabsTrigger>
          <TabsTrigger 
            value="security"
            style={{ color: colors.textMuted }}
          >
            <Shield className="w-4 h-4 mr-2" style={{ color: colors.warning }} />
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="notifications"
            style={{ color: colors.textMuted }}
          >
            <Bell className="w-4 h-4 mr-2" style={{ color: colors.success }} />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="developer"
            style={{ color: colors.textMuted }}
          >
            <Code className="w-4 h-4 mr-2" style={{ color: colors.accentLight }} />
            Developer
          </TabsTrigger>
        </TabsList>

        {/* AI Engine Settings */}
        <TabsContent value="ai">
          <div className="grid gap-4">
            {/* Mode Selection */}
            <div 
              className="rounded-lg border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border 
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <Brain className="w-5 h-5" style={{ color: colors.primary }} />
                  AI Engine Mode
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Choose how AI analysis is performed
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className="p-4 rounded-lg border-2 cursor-pointer"
                    style={{ 
                      backgroundColor: alpha(colors.primary, 10),
                      borderColor: colors.primary 
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: colors.text }}>Offline</span>
                      <Badge style={{ 
                        backgroundColor: alpha(colors.success, 20),
                        color: colors.success,
                        border: `1px solid ${alpha(colors.success, 30)}`
                      }}>
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Rule-based analysis without external API calls
                    </p>
                  </div>
                  <div 
                    className="p-4 rounded-lg border cursor-pointer transition-colors"
                    style={{ 
                      backgroundColor: alpha(colors.bgSecondary, 30),
                      borderColor: colors.border 
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: colors.text }}>Local LLM</span>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: colors.border,
                          color: colors.textMuted 
                        }}
                      >
                        Unavailable
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Use local Ollama or LM Studio
                    </p>
                  </div>
                  <div 
                    className="p-4 rounded-lg border cursor-pointer transition-colors"
                    style={{ 
                      backgroundColor: alpha(colors.bgSecondary, 30),
                      borderColor: colors.border 
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: colors.text }}>Cloud</span>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: colors.border,
                          color: colors.textMuted 
                        }}
                      >
                        Config Required
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Use cloud LLM APIs (OpenAI, Anthropic)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Auto-analyze on upload', desc: 'Automatically run AI analysis when SQL is uploaded' },
                    { title: 'Smart suggestions', desc: 'Show AI-powered suggestions in the interface' },
                    { title: 'PII/PHI Detection', desc: 'Automatically detect sensitive data columns' },
                  ].map((item) => (
                    <div 
                      key={item.title}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                    >
                      <div>
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                        <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column Intelligence */}
            <div 
              className="rounded-lg border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border 
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                Column Intelligence
              </h3>
              <p className="text-sm mt-1 mb-4" style={{ color: colors.textMuted }}>
                Configure how column metadata is inferred
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label style={{ color: colors.textSecondary }}>Confidence Threshold</Label>
                  <Input 
                    type="number" 
                    defaultValue="65" 
                    style={{ 
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text 
                    }}
                  />
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Minimum confidence for auto-apply (0-100)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: colors.textSecondary }}>Max Suggestions</Label>
                  <Input 
                    type="number" 
                    defaultValue="5" 
                    style={{ 
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text 
                    }}
                  />
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Maximum suggestions per column
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Database Settings */}
        <TabsContent value="database">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Database className="w-5 h-5" style={{ color: colors.accent }} />
                Database Configuration
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Connection and storage settings
              </p>
            </div>
            <div className="space-y-4">
              <div 
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ 
                  backgroundColor: alpha(colors.success, 10),
                  border: `1px solid ${alpha(colors.success, 20)}`
                }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
                  <div>
                    <span className="font-medium" style={{ color: colors.text }}>
                      SQLite Database Connected
                    </span>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Location: /db/custom.db
                    </p>
                  </div>
                </div>
                <Badge style={{ 
                  backgroundColor: alpha(colors.success, 20),
                  color: colors.success,
                  border: `1px solid ${alpha(colors.success, 30)}`
                }}>
                  Active
                </Badge>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Auto-backup', desc: 'Automatically backup database daily' },
                  { title: 'Cache parsed results', desc: 'Store parsed schemas for faster loading' },
                ].map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  Export Database
                </Button>
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  Clear Cache
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Shield className="w-5 h-5" style={{ color: colors.warning }} />
                Security &amp; Authentication
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Control login requirements and access settings
              </p>
            </div>
            <div className="space-y-4">

              {/* ── Login Enable/Disable Toggle ── */}
              <div 
                className="p-4 rounded-lg border-2"
                style={{ 
                  backgroundColor: loginToggle ? alpha(colors.success, 5) : alpha(colors.card, 20),
                  borderColor: loginToggle ? alpha(colors.success, 30) : colors.border
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    {loginToggle ? (
                      <Shield className="w-5 h-5 mt-0.5" style={{ color: colors.success }} />
                    ) : (
                      <ShieldOff className="w-5 h-5 mt-0.5" style={{ color: colors.textMuted }} />
                    )}
                    <div>
                      <span className="font-medium" style={{ color: colors.text }}>
                        Require Login
                      </span>
                      <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                        {loginToggle
                          ? "Login is required. All API routes need a valid token."
                          : "Login is disabled. All routes are open (no auth needed)."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {toggleLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Switch
                      checked={loginToggle}
                      onCheckedChange={handleLoginToggle}
                      disabled={toggleLoading}
                    />
                  </div>
                </div>

                {authMsg && (
                  <p className="text-sm mt-3 ml-8" style={{ color: colors.primary }}>
                    {authMsg}
                  </p>
                )}
              </div>

              {/* ── Current Session Info ── */}
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
              >
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  Current Session
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm" style={{ color: colors.textMuted }}>
                    {isAuthenticated ? (
                      <>
                        <Badge variant="outline" style={{ color: colors.success, borderColor: alpha(colors.success, 30) }}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Logged in
                        </Badge>
                        <span className="ml-2">{user?.name} ({user?.email})</span>
                      </>
                    ) : (
                      <Badge variant="outline" style={{ color: colors.textMuted }}>
                        Not logged in
                      </Badge>
                    )}
                  </div>
                  {isAuthenticated && (
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-1" />
                      Logout
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Data Sensitivity Notice ── */}
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: alpha(colors.warning, 10),
                  border: `1px solid ${alpha(colors.warning, 20)}`
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: colors.warning }} />
                  <div>
                    <span className="font-medium" style={{ color: colors.text }}>
                      Data Sensitivity Notice
                    </span>
                    <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                      This system processes SQL schemas that may contain PII/PHI field definitions.
                      Ensure compliance with HIPAA, GDPR, and local regulations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Log all schema access', desc: 'Keep audit trail of all operations' },
                  { title: 'Anonymize sample data', desc: 'Remove sensitive data from exports' },
                ].map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Bell className="w-5 h-5" style={{ color: colors.success }} />
                Notifications
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Configure alerts and notifications
              </p>
            </div>
            <div className="space-y-3">
              {[
                { title: 'Parse errors', desc: 'Alert when SQL parsing fails' },
                { title: 'Missing FK tables', desc: 'Alert when foreign key tables are missing' },
                { title: 'Generation complete', desc: 'Notify when artifact generation finishes' },
              ].map((item) => (
                <div 
                  key={item.title}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                >
                  <div>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                    <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Developer Settings */}
        <TabsContent value="developer">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Code className="w-5 h-5" style={{ color: colors.accentLight }} />
                Developer Options
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Advanced settings for developers
              </p>
            </div>
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: alpha(colors.accent, 10),
                  border: `1px solid ${alpha(colors.accent, 20)}`
                }}
              >
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 mt-0.5" style={{ color: colors.accent }} />
                  <div>
                    <span className="font-medium" style={{ color: colors.text }}>
                      API Access
                    </span>
                    <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                      All features are available via REST API. See documentation for endpoints.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Debug mode', desc: 'Show detailed error messages and logs' },
                  { title: 'Export API logs', desc: 'Download detailed API request/response logs' },
                ].map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                    </div>
                    <Switch />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  View API Docs
                </Button>
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  Export Logs
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* System Info */}
      <div 
        className="rounded-lg border p-6"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
          System Information
        </h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Version', value: '1.0.0' },
            { label: 'AI Mode', value: 'Offline' },
            { label: 'Modules Loaded', value: '32' },
            { label: 'Database', value: 'SQLite' },
          ].map((item) => (
            <div key={item.label}>
              <span style={{ color: colors.textMuted }}>{item.label}</span>
              <p className="font-medium" style={{ color: colors.text }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
