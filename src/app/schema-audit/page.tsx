'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Download,
  Zap,
  Database,
  Play,
  FileCode,
  Copy,
  Search,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────
interface InferredField {
  name: string
  type: string
  source: string
}

interface MissingModel {
  name: string
  count: number
  files: string[]
  issues: any[]
  inferredFields: InferredField[]
}

interface AuditData {
  generatedAt: string
  schemaModelCount: number
  schemaModels: string[]
  totalRealIssues: number
  issuesBySeverity: { CRITICAL?: number; HIGH?: number; MEDIUM?: number }
  issues: any[]
  missingModels: MissingModel[]
  error?: string
}

interface ActionLogEntry {
  time: string
  msg: string
  type: 'success' | 'error' | 'info' | 'warn'
}

// ─── Utility ───────────────────────────────────────────────────────
function generateSchemaDef(modelName: string, fields: InferredField[]): string {
  const pascal = modelName.charAt(0).toUpperCase() + modelName.slice(1)
  const body = fields
    .filter(f => f.source !== 'standard')
    .map(f => {
      let t = f.type
      if (t.includes('@default("[]")') && f.source.startsWith('relation:')) {
        t = 'String?'
      }
      return `  ${f.name} ${t}`
    })
    .join('\n')

  const indexFields = fields
    .filter(f => ['projectId', 'scanId', 'sessionId', 'entityId', 'tableName', 'columnId'].includes(f.name))
    .map(f => `  @@index([${f.name}])`)
    .join('\n')

  const indexes = indexFields ? '\n' + indexFields : ''

  return `model ${pascal} {\n  id        String   @id @default(cuid())${body ? '\n' + body : ''}${indexes}\n  createdAt DateTime @default(now())\n  updatedAt DateTime\n}`
}

// ─── Main Component ───────────────────────────────────────────────
export function SchemaAuditDashboard() {
  const { colors } = useTheme()
  const alpha = (c: string, o: number) => `color-mix(in srgb, ${c} ${o}%, transparent)`

  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<MissingModel | null>(null)
  const [loadingFields, setLoadingFields] = useState<string | null>(null)
  const [addedModels, setAddedModels] = useState<Set<string>>(new Set())
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [filterText, setFilterText] = useState('')
  const [showOnlyCritical, setShowOnlyCritical] = useState(true)
  const [step, setStep] = useState<'scan' | 'review' | 'apply' | 'generate' | 'push' | 'done'>('scan')

  const addLog = (msg: string, type: ActionLogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString()
    setActionLog(prev => [...prev.slice(-80), { time, msg, type }])
  }

  // Fetch audit data
  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/schema-audit')
      const json = await res.json()
      setData(json)
      if (json.missingModels?.length === 0) {
        addLog('No missing models found — schema is clean!', 'success')
        setStep('done')
      } else if (json.missingModels?.length > 0) {
        setStep('review')
      }
    } catch (e: any) {
      addLog(`Fetch error: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  // Load inferred fields for a model
  const loadModelFields = async (model: MissingModel) => {
    if (model.inferredFields.length > 0) return // already loaded
    setLoadingFields(model.name)
    try {
      const res = await fetch(`/api/schema-audit?action=missing-model-fields&model=${encodeURIComponent(model.name)}`)
      const json = await res.json()
      if (json.fields) {
        // Update the model in state
        setSelectedModel({ ...model, inferredFields: json.fields })
        addLog(`Loaded ${json.fields.length} inferred fields for ${model.name}`, 'info')
      }
    } catch (e: any) {
      addLog(`Field inference error: ${e.message}`, 'error')
    } finally {
      setLoadingFields(null)
    }
  }

  // Handle model selection
  const handleSelectModel = (model: MissingModel) => {
    if (selectedModel?.name === model.name) {
      setSelectedModel(null)
    } else {
      setSelectedModel(model)
      loadModelFields(model)
    }
  }

  // Run scanner
  const runScan = async () => {
    setScanning(true)
    addLog('Starting schema audit scan...', 'info')
    try {
      const res = await fetch('/api/schema-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-scan' }),
      })
      const json = await res.json()
      if (json.success) {
        addLog(`Scan complete: ${json.issues} issues found`, 'success')
        await fetchAudit()
      } else {
        addLog(`Scan error: ${json.error}`, 'error')
      }
    } catch (e: any) {
      addLog(`Scan failed: ${e.message}`, 'error')
    } finally {
      setScanning(false)
    }
  }

  // Add single model
  const addSingleModel = async (model: MissingModel) => {
    const pascal = model.name.charAt(0).toUpperCase() + model.name.slice(1)
    setApplying(pascal)
    const fields = selectedModel?.name === model.name ? selectedModel.inferredFields : model.inferredFields
    const def = generateSchemaDef(model.name, fields)
    addLog(`Adding model ${pascal} to schema...`, 'info')
    try {
      const res = await fetch('/api/schema-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-model', modelName: pascal, schemaDefinition: def }),
      })
      const json = await res.json()
      if (json.success) {
        addLog(`${pascal} added to schema.prisma`, 'success')
        setAddedModels(prev => new Set([...prev, pascal]))
        // Refresh audit data
        await fetchAudit()
      } else {
        addLog(`${pascal}: ${json.error}`, 'error')
      }
    } catch (e: any) {
      addLog(`${pascal}: ${e.message}`, 'error')
    } finally {
      setApplying(null)
    }
  }

  // Add ALL models
  const addAllModels = async () => {
    if (!data?.missingModels) return
    addLog(`Adding all ${data.missingModels.length} missing models...`, 'info')
    for (const model of data.missingModels) {
      const pascal = model.name.charAt(0).toUpperCase() + model.name.slice(1)
      if (addedModels.has(pascal)) continue
      setApplying(pascal)
      const def = generateSchemaDef(model.name, model.inferredFields)
      try {
        const res = await fetch('/api/schema-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add-model', modelName: pascal, schemaDefinition: def }),
        })
        const json = await res.json()
        if (json.success) {
          addLog(`${pascal} added`, 'success')
          setAddedModels(prev => new Set([...prev, pascal]))
        } else {
          addLog(`${pascal} skipped: ${json.error}`, 'warn')
        }
      } catch (e: any) {
        addLog(`${pascal}: ${e.message}`, 'error')
      }
    }
    setApplying(null)
    setStep('generate')
    addLog('All models added! Next: run prisma generate', 'success')
  }

  // Prisma generate
  const runGenerate = async () => {
    setApplying('prisma-generate')
    addLog('Running prisma generate...', 'info')
    try {
      const res = await fetch('/api/schema-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prisma-generate' }),
      })
      const json = await res.json()
      if (json.success) {
        addLog('Prisma client generated', 'success')
        setStep('push')
      } else {
        addLog(`Prisma generate failed: ${json.error}`, 'error')
      }
    } catch (e: any) {
      addLog(`Generate failed: ${e.message}`, 'error')
    } finally {
      setApplying(null)
    }
  }

  // Prisma db push
  const runPush = async () => {
    setApplying('prisma-push')
    addLog('Running prisma db push...', 'info')
    try {
      const res = await fetch('/api/schema-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prisma-push' }),
      })
      const json = await res.json()
      if (json.success) {
        addLog('Database tables created', 'success')
        setStep('done')
      } else {
        addLog(`Push failed: ${json.error}`, 'error')
      }
    } catch (e: any) {
      addLog(`Push failed: ${e.message}`, 'error')
    } finally {
      setApplying(null)
    }
  }

  // Restart server
  const runRestart = async () => {
    setApplying('restart')
    addLog('Rebuilding and restarting server...', 'info')
    try {
      const res = await fetch('/api/schema-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart-server' }),
      })
      const json = await res.json()
      if (json.success) {
        addLog('Server rebuilt and restarted!', 'success')
      } else {
        addLog(`Restart: ${json.output || json.error}`, 'error')
      }
    } catch (e: any) {
      addLog(`Restart: ${e.message}`, 'error')
    } finally {
      setApplying(null)
    }
  }

  // Export report
  const exportReport = () => {
    if (!data) return
    const lines: string[] = []
    lines.push(`PRISMA SCHEMA-CODE DESYNC REPORT`)
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push(`Schema models: ${data.schemaModelCount}`)
    lines.push(`Missing models: ${data.missingModels.length}`)
    lines.push(`Total issues: ${data.totalRealIssues}`)
    lines.push('')

    for (const model of data.missingModels) {
      const pascal = model.name.charAt(0).toUpperCase() + model.name.slice(1)
      const status = addedModels.has(pascal) ? '[FIXED]' : '[MISSING]'
      lines.push(`${status} ${pascal} (${model.count} refs in ${model.files.length} files)`)
      for (const f of model.files) {
        lines.push(`  - ${f}`)
      }
      lines.push('')
    }

    lines.push('--- NON-MODEL ISSUES ---')
    lines.push('')
    for (const issue of data.issues) {
      if (issue.category === 'MISSING_MODEL') continue
      lines.push(`[${issue.severity}] ${issue.category}: ${issue.file}:${issue.line}`)
      lines.push(`  ${issue.detail}`)
      lines.push(`  FIX: ${issue.fix}`)
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schema-audit-report-${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    addLog('Report downloaded', 'success')
  }

  // Copy schema definition
  const copySchemaDef = (model: MissingModel) => {
    const fields = selectedModel?.name === model.name ? selectedModel.inferredFields : model.inferredFields
    const def = generateSchemaDef(model.name, fields)
    navigator.clipboard.writeText(def)
    addLog(`Schema for ${model.name} copied to clipboard`, 'info')
  }

  // ─── Filtering ──────────────────────────────────────────────────
  const filteredModels = data?.missingModels?.filter(m => {
    if (filterText && !m.name.toLowerCase().includes(filterText.toLowerCase())) return false
    return true
  }) || []

  const criticalCount = data?.issuesBySeverity?.CRITICAL || 0
  const highCount = data?.issuesBySeverity?.HIGH || 0
  const mediumCount = data?.issuesBySeverity?.MEDIUM || 0

  // ─── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: colors.textMuted }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading audit data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: colors.text }}>
            <Database className="w-7 h-7" style={{ color: colors.primary }} />
            Prisma Schema-Code Audit
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Scan, review, and fix schema-code desync issues
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportReport} disabled={!data}
            style={{ borderColor: colors.border, color: colors.textMuted }}>
            <Download className="w-4 h-4 mr-1" /> Export Report
          </Button>
          <Button size="sm" onClick={runScan} disabled={scanning}
            style={{ backgroundColor: colors.primary, color: '#fff' }}>
            {scanning ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            {scanning ? 'Scanning...' : 'Re-Run Scan'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
          <div className="text-2xl font-bold" style={{ color: colors.text }}>{data?.schemaModelCount || 0}</div>
          <div className="text-xs" style={{ color: colors.textMuted }}>Schema Models</div>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: alpha('#ef4444', 8), borderColor: alpha('#ef4444', 20) }}>
          <div className="text-2xl font-bold text-red-400">{data?.missingModels?.length || 0}</div>
          <div className="text-xs text-red-400/70">Missing Models</div>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: alpha('#f59e0b', 8), borderColor: alpha('#f59e0b', 20) }}>
          <div className="text-2xl font-bold text-amber-400">{addedModels.size}</div>
          <div className="text-xs text-amber-400/70">Fixed This Session</div>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: alpha(colors.primary, 8), borderColor: alpha(colors.primary, 20) }}>
          <div className="text-2xl font-bold" style={{ color: colors.primary }}>
            {criticalCount}
            {highCount > 0 && <span className="text-amber-400">+{highCount}</span>}
          </div>
          <div className="text-xs" style={{ color: colors.textMuted }}>Critical+High Issues</div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'scan' as const, label: '1. Scan', icon: Search },
            { id: 'review' as const, label: '2. Review', icon: FileCode },
            { id: 'apply' as const, label: '3. Add Models', icon: Plus },
            { id: 'generate' as const, label: '4. Generate', icon: Database },
            { id: 'push' as const, label: '5. DB Push', icon: Play },
            { id: 'done' as const, label: '6. Restart', icon: CheckCircle2 },
          ].map((s, i) => {
            const stepOrder = ['scan', 'review', 'apply', 'generate', 'push', 'done']
            const isActive = step === s.id
            const isPast = stepOrder.indexOf(step) > stepOrder.indexOf(s.id) || addedModels.size > 0 && ['generate', 'push', 'done'].includes(s.id)
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (s.id === 'scan') runScan()
                    else if (s.id === 'apply') addAllModels()
                    else if (s.id === 'generate') runGenerate()
                    else if (s.id === 'push') runPush()
                    else if (s.id === 'done') runRestart()
                  }}
                  disabled={scanning || applying !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? colors.primary : isPast ? alpha('#22c55e', 15) : alpha(colors.bgSecondary, 80),
                    color: isActive ? '#fff' : isPast ? '#22c55e' : colors.textMuted,
                    border: `1px solid ${isActive ? colors.primary : isPast ? alpha('#22c55e', 30) : colors.border}`,
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
                {i < 5 && <span style={{ color: colors.textMuted }} className="text-xs">→</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {data?.missingModels && data.missingModels.length > 0 && (
          <Button onClick={addAllModels} disabled={applying !== null || addedModels.size === data.missingModels.length}
            style={{ backgroundColor: '#22c55e', color: '#fff' }}>
            {applying ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Adding {applying}...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Add All {data.missingModels.length} Missing Models</>
            )}
          </Button>
        )}
        {addedModels.size > 0 && (
          <>
            <Button onClick={runGenerate} disabled={applying !== null}
              variant="outline" style={{ borderColor: alpha('#a855f7', 40), color: '#a855f7' }}>
              Prisma Generate
            </Button>
            <Button onClick={runPush} disabled={applying !== null}
              variant="outline" style={{ borderColor: alpha('#f97316', 40), color: '#f97316' }}>
              DB Push
            </Button>
            <Button onClick={runRestart} disabled={applying !== null}
              variant="outline" style={{ borderColor: alpha('#ef4444', 40), color: '#ef4444' }}>
              Rebuild & Restart
            </Button>
          </>
        )}
        {addedModels.size > 0 && (
          <Badge className="bg-green-500/15 text-green-400 border border-green-500/25">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {addedModels.size} models fixed
          </Badge>
        )}
      </div>

      {/* Main Content: Model list + Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Model list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
              <input
                type="text"
                placeholder="Filter models..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: colors.inputBg || alpha(colors.bgSecondary, 80),
                  borderColor: colors.border,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>
            <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textMuted }}>
              {filteredModels.length} models
            </Badge>
          </div>

          {/* Empty state */}
          {(!data?.missingModels || data.missingModels.length === 0) && !loading && (
            <div className="rounded-xl border p-12 text-center"
              style={{ backgroundColor: alpha('#22c55e', 5), borderColor: alpha('#22c55e', 20) }}>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <div className="text-lg font-medium text-green-400">No missing models found!</div>
              <div className="text-sm mt-1" style={{ color: colors.textMuted }}>Your schema is in sync with the code.</div>
            </div>
          )}

          {/* Model cards */}
          {filteredModels.map(model => {
            const pascal = model.name.charAt(0).toUpperCase() + model.name.slice(1)
            const isAdded = addedModels.has(pascal)
            const isApplying = applying === pascal
            const isSelected = selectedModel?.name === model.name
            const isFieldsLoading = loadingFields === model.name

            return (
              <div
                key={model.name}
                onClick={() => handleSelectModel(model)}
                className="rounded-xl border p-4 cursor-pointer transition-all"
                style={{
                  backgroundColor: isAdded ? alpha('#22c55e', 5) : isSelected ? alpha(colors.primary, 8) : alpha(colors.card, 50),
                  borderColor: isAdded ? alpha('#22c55e', 20) : isSelected ? alpha(colors.primary, 25) : colors.border,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                    )}
                    {isAdded ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <div className="font-mono font-semibold" style={{ color: colors.text }}>{model.name}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        PascalCase: <span style={{ color: colors.text }}>{pascal}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: colors.textMuted }}>{model.files.length} files</span>
                    <Badge className="bg-red-500/15 text-red-400 border border-red-500/25 text-xs">
                      {model.count} refs
                    </Badge>
                    {!isAdded && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); addSingleModel(model) }}
                        disabled={applying !== null}
                        style={{ borderColor: alpha('#22c55e', 30), color: '#22c55e' }}>
                        {isApplying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        {isApplying ? '' : 'Add'}
                      </Button>
                    )}
                    {isAdded && (
                      <Badge className="bg-green-500/15 text-green-400 border border-green-500/25 text-xs">Done</Badge>
                    )}
                  </div>
                </div>

                {/* Affected files */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {model.files.map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ backgroundColor: alpha(colors.bgSecondary, 80), color: colors.textMuted }}>
                      {f.replace('src/', '')}
                    </span>
                  ))}
                </div>

                {/* Expanded: Inferred fields + schema preview */}
                {isSelected && (
                  <div className="mt-3 pt-3 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                    {isFieldsLoading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" style={{ color: colors.textMuted }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Inferring fields from source code...</span>
                      </div>
                    ) : (
                      <>
                        {/* Inferred fields */}
                        <div>
                          <div className="text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>
                            Inferred Fields ({(selectedModel?.inferredFields || model.inferredFields).length})
                          </div>
                          <div className="rounded-lg p-3 font-mono text-xs max-h-48 overflow-auto"
                            style={{ backgroundColor: alpha(colors.bg, 90) }}>
                            {(selectedModel?.inferredFields || model.inferredFields).map(f => (
                              <div key={f.name} className="flex gap-2">
                                <span style={{ color: colors.primary }}>{f.name}</span>
                                <span style={{ color: colors.textMuted }}>{f.type}</span>
                                <span className="truncate ml-auto max-w-[200px]" style={{ color: alpha(colors.textMuted, 60) }}>
                                  ({f.source === 'standard' ? 'standard' : f.source.replace('src/', '')})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Schema preview */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="text-xs font-medium" style={{ color: colors.textMuted }}>Generated Schema</div>
                            <Button size="sm" variant="ghost" className="h-6 text-xs"
                              onClick={(e) => { e.stopPropagation(); copySchemaDef(model) }}
                              style={{ color: colors.textMuted }}>
                              <Copy className="w-3 h-3 mr-1" /> Copy
                            </Button>
                          </div>
                          <pre className="rounded-lg p-3 font-mono text-xs whitespace-pre-wrap max-h-40 overflow-auto"
                            style={{
                              backgroundColor: alpha(colors.bg, 90),
                              color: '#22c55e',
                              border: `1px solid ${colors.border}`,
                            }}>
                            {generateSchemaDef(model.name, selectedModel?.inferredFields || model.inferredFields)}
                          </pre>
                        </div>

                        {/* Reference details */}
                        <div>
                          <div className="text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>
                            All References ({model.issues.length})
                          </div>
                          <div className="max-h-32 overflow-auto space-y-1">
                            {model.issues.map((issue: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs"
                                style={{ color: colors.textMuted }}>
                                <span className="shrink-0">:</span>
                                <span className="font-mono shrink-0" style={{ color: colors.text }}>
                                  {issue.file}:{issue.line}
                                </span>
                                <span className="truncate">{issue.code}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Action log + Summary */}
        <div className="space-y-4">
          {/* Action Log */}
          <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: colors.text }}>Action Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] overflow-auto rounded-lg p-3 font-mono text-xs space-y-1"
                style={{ backgroundColor: alpha(colors.bg, 90) }}>
                {actionLog.length === 0 ? (
                  <div className="text-center py-8" style={{ color: colors.textMuted }}>
                    No actions yet. Click a model to start.
                  </div>
                ) : (
                  actionLog.map((entry, i) => (
                    <div key={i} className="flex gap-2"
                      style={{
                        color: entry.type === 'error' ? '#ef4444'
                          : entry.type === 'success' ? '#22c55e'
                          : entry.type === 'warn' ? '#f59e0b'
                          : colors.textMuted,
                      }}>
                      <span className="shrink-0 opacity-50">{entry.time}</span>
                      <span>{entry.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {data && (
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm" style={{ color: colors.text }}>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: colors.textMuted }}>Schema models</span>
                  <span style={{ color: colors.text }} className="font-medium">{data.schemaModelCount}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textMuted }}>Missing models</span>
                  <span className="font-medium text-red-400">{data.missingModels?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textMuted }}>CRITICAL issues</span>
                  <span className="font-medium text-red-400">{criticalCount}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textMuted }}>HIGH issues</span>
                  <span className="font-medium text-amber-400">{highCount}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textMuted }}>MEDIUM issues</span>
                  <span className="font-medium text-yellow-400">{mediumCount}</span>
                </div>
                <div className="h-px my-1" style={{ backgroundColor: colors.border }} />
                <div className="flex justify-between">
                  <span style={{ color: colors.textMuted }}>Fixed this session</span>
                  <span className="font-medium text-green-400">{addedModels.size}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textMuted }}>Remaining</span>
                  <span className="font-medium" style={{
                    color: (data.missingModels?.length || 0) - addedModels.size === 0 ? '#22c55e' : '#f59e0b'
                  }}>
                    {Math.max(0, (data.missingModels?.length || 0) - addedModels.size)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: colors.text }}>How to Fix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs" style={{ color: colors.textMuted }}>
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}>1</div>
                <span>Click a model to see its inferred fields from source code</span>
              </div>
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}>2</div>
                <span>Review the generated schema definition, click &quot;Add&quot; to add to schema.prisma</span>
              </div>
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}>3</div>
                <span>Or click &quot;Add All Missing Models&quot; to batch-add everything</span>
              </div>
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}>4</div>
                <span>Run Generate → DB Push → Rebuild & Restart</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SchemaAuditDashboard
