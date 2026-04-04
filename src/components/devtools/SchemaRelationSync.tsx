'use client'

import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { 
  RefreshCw, 
  Wrench, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  FileCode,
  ArrowRight,
  Zap
} from 'lucide-react'

interface Mismatch {
  file: string
  line: number
  modelUsed: string
  relationUsed: string
  correctRelation: string
  code: string
}

interface FixResult {
  file: string
  fixed: boolean
  changes: Array<{
    oldRelation: string
    newRelation: string
    line: number
  }>
  error?: string
}

interface ScanResult {
  success: boolean
  schema?: {
    path: string
    modelCount: number
    relations: Record<string, string[]>
  }
  codeFiles?: number
  mismatches: Mismatch[]
  mismatchCount: number
  canAutoFix: boolean
  error?: string
}

interface FixResponse {
  success: boolean
  message: string
  mismatches: Mismatch[]
  fixResults: FixResult[]
  summary?: {
    totalMismatches: number
    filesFixed: number
    filesFailed: number
  }
  error?: string
}

export default function SchemaRelationSync() {
  const { colors } = useTheme()
  const [scanning, setScanning] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [fixResult, setFixResult] = useState<FixResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    setScanResult(null)
    setFixResult(null)

    try {
      const response = await fetch('/api/schema-relation-sync')
      const data: ScanResult = await response.json()
      setScanResult(data)
      
      if (!data.success) {
        setError(data.error || 'Scan failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleFix = async () => {
    if (!scanResult?.mismatches.length) return
    
    if (!confirm(`This will modify ${scanResult.mismatchCount} code locations. Continue?`)) {
      return
    }

    setFixing(true)
    setError(null)

    try {
      const response = await fetch('/api/schema-relation-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      })
      const data: FixResponse = await response.json()
      setFixResult(data)
      
      if (!data.success) {
        setError(data.error || 'Fix failed')
      }
      
      // Re-scan after fix
      if (data.summary?.filesFixed && data.summary.filesFixed > 0) {
        setTimeout(() => handleScan(), 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fix failed')
    } finally {
      setFixing(false)
    }
  }

  const handleDryRun = async () => {
    setFixing(true)
    setError(null)

    try {
      const response = await fetch('/api/schema-relation-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Dry run preview:\n\n${JSON.stringify(data.wouldFix, null, 2)}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dry run failed')
    } finally {
      setFixing(false)
    }
  }

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || filePath
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Zap className="w-5 h-5" style={{ color: colors.primary }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: colors.text }}>
              Schema Relation Sync
            </h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Auto-detect and fix Prisma schema relation mismatches
            </p>
          </div>
        </div>
        
        <button
          onClick={handleScan}
          disabled={scanning || fixing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ 
            backgroundColor: colors.primary, 
            color: '#fff',
            opacity: scanning || fixing ? 0.6 : 1
          }}
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Scan Now
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-500">Error</p>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Scan Result */}
      {scanResult?.success && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-xl border text-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                {scanResult.schema?.modelCount || 0}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>Models</p>
            </div>
            <div 
              className="p-4 rounded-xl border text-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {scanResult.codeFiles || 0}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>Code Files</p>
            </div>
            <div 
              className="p-4 rounded-xl border text-center"
              style={{ 
                backgroundColor: scanResult.mismatchCount > 0 ? `${colors.primary}10` : colors.card, 
                borderColor: scanResult.mismatchCount > 0 ? colors.primary : colors.border 
              }}
            >
              <p className="text-2xl font-bold" style={{ color: scanResult.mismatchCount > 0 ? colors.primary : colors.text }}>
                {scanResult.mismatchCount}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>Mismatches</p>
            </div>
          </div>

          {/* Mismatches List */}
          {scanResult.mismatches.length > 0 && (
            <div 
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div 
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium" style={{ color: colors.text }}>
                    Found {scanResult.mismatchCount} Relation Mismatches
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDryRun}
                    disabled={fixing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                    style={{ backgroundColor: colors.bg, color: colors.textMuted }}
                  >
                    Preview Changes
                  </button>
                  <button
                    onClick={handleFix}
                    disabled={fixing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: colors.primary, color: '#fff' }}
                  >
                    {fixing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        Fix All
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="divide-y" style={{ borderColor: colors.border }}>
                {scanResult.mismatches.map((mismatch, index) => (
                  <div key={index} className="p-4 hover:bg-black/5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 shrink-0" style={{ color: colors.textMuted }} />
                        <span className="text-sm font-mono" style={{ color: colors.text }}>
                          {getFileName(mismatch.file)}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                          Line {mismatch.line}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono line-through text-red-400">
                          {mismatch.relationUsed}
                        </span>
                        <ArrowRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                        <span className="font-mono text-green-400">
                          {mismatch.correctRelation}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 rounded text-xs font-mono overflow-x-auto" style={{ backgroundColor: colors.bg }}>
                      <pre style={{ color: colors.textMuted }}>{mismatch.code}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Issues */}
          {scanResult.mismatches.length === 0 && (
            <div 
              className="p-6 rounded-xl border text-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium" style={{ color: colors.text }}>
                All Relations Synchronized!
              </p>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Your Prisma schema and API code are in sync.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Fix Result */}
      {fixResult?.success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-500">{fixResult.message}</p>
            {fixResult.summary && (
              <p className="text-sm text-green-400 mt-1">
                Fixed {fixResult.summary.filesFixed} files, {fixResult.summary.filesFailed} failed.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div 
        className="p-4 rounded-xl border"
        style={{ backgroundColor: `${colors.primary}05`, borderColor: `${colors.primary}30` }}
      >
        <h4 className="font-medium mb-2" style={{ color: colors.text }}>
          How it works
        </h4>
        <ul className="space-y-1 text-sm" style={{ color: colors.textMuted }}>
          <li>• Scans your Prisma schema for model relations</li>
          <li>• Checks all API routes for Prisma client usage</li>
          <li>• Detects relation field name mismatches (e.g., files → ToolkitFile)</li>
          <li>• One-click fix updates all affected files automatically</li>
        </ul>
      </div>
    </div>
  )
}
