'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { 
  Search, Shield, Eye, EyeOff, Lock, AlertTriangle, CheckCircle, 
  Filter, Download, RefreshCw, Info, Database, Columns 
} from 'lucide-react'
import { ColumnIntelligenceEngine, type ColumnIntelligenceResult } from '@/lib/column-intelligence'
import { PIIPhidDetector, type PIIDetectionResult, type DataSensitivity } from '@/lib/pii-phi-detector'
import type { ColumnDef, TableDef } from '@/lib/types'

// =============================================================================
// Types
// =============================================================================

interface ColumnWithIntelligence {
  column: ColumnDef
  intelligence: ColumnIntelligenceResult
  piiDetection: PIIDetectionResult
}

interface TableWithIntelligence {
  schemaName?: string
  tableName: string
  columns: ColumnWithIntelligence[]
  complianceSummary: {
    totalColumns: number
    phiColumns: number
    piiColumns: number
    secretColumns: number
    confidentialColumns: number
    encryptionRequired: number
    auditRequired: number
    frameworks: string[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }
}

interface ColumnIntelligenceViewerProps {
  tables: TableDef[]
  onExport?: (data: TableWithIntelligence[]) => void
}

// =============================================================================
// Sensitivity Badge Component
// =============================================================================

function SensitivityBadge({ sensitivity }: { sensitivity: DataSensitivity }) {
  const config = {
    secret: { label: '🔴 SECRET', color: 'bg-red-600 text-white', icon: Lock },
    phi: { label: '🔴 PHI', color: 'bg-red-500 text-white', icon: Shield },
    pii: { label: '🟡 PII', color: 'bg-yellow-500 text-black', icon: Eye },
    confidential: { label: '🟡 CONFIDENTIAL', color: 'bg-orange-500 text-white', icon: Lock },
    internal: { label: '🟢 Internal', color: 'bg-blue-500 text-white', icon: Database },
    public: { label: '⚪ Public', color: 'bg-gray-400 text-white', icon: Eye }
  }

  const { label, color, icon: Icon } = config[sensitivity] || config.internal

  return (
    <Badge className={`${color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

// =============================================================================
// UI Type Badge Component
// =============================================================================

function UITypeBadge({ uiType }: { uiType: string }) {
  const icons: Record<string, string> = {
    text_input: '📝',
    email_input: '📧',
    password_input: '🔒',
    phone_input: '📞',
    number_input: '🔢',
    currency_input: '💰',
    percentage_input: '%',
    date_picker: '📅',
    time_picker: '⏰',
    datetime_picker: '🕐',
    toggle: '🔘',
    checkbox: '☑️',
    dropdown: '📋',
    multi_select: '📑',
    textarea: '📄',
    file_upload: '📎',
    image_upload: '🖼️',
    url_input: '🔗',
    color_picker: '🎨',
    hidden: '🙈',
    read_only: '👁️',
    auto_generated: '⚡'
  }

  return (
    <Badge variant="outline" className="font-mono text-xs">
      {icons[uiType] || '❓'} {uiType}
    </Badge>
  )
}

// =============================================================================
// Column Row Component
// =============================================================================

function ColumnRow({ columnData, onClick }: { columnData: ColumnWithIntelligence; onClick?: () => void }) {
  const { column, intelligence, piiDetection } = columnData
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b last:border-b-0">
      <div 
        className="grid grid-cols-12 gap-2 p-3 hover:bg-muted/50 cursor-pointer items-center"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Column Name */}
        <div className="col-span-3 flex items-center gap-2">
          <span className="font-mono text-sm">{column.name}</span>
          {column.isPrimaryKey && <Badge variant="outline" className="text-xs">PK</Badge>}
          {column.isIdentity && <Badge variant="outline" className="text-xs">Auto</Badge>}
        </div>

        {/* Data Type */}
        <div className="col-span-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {column.dataType}
            {column.maxLength && `(${column.maxLength})`}
          </Badge>
        </div>

        {/* UI Type */}
        <div className="col-span-2">
          <UITypeBadge uiType={intelligence.column.inferredUIType} />
        </div>

        {/* Sensitivity */}
        <div className="col-span-2">
          <SensitivityBadge sensitivity={piiDetection.sensitivity} />
        </div>

        {/* Confidence */}
        <div className="col-span-1">
          <div className="flex items-center gap-1">
            <div 
              className={`w-2 h-2 rounded-full ${
                intelligence.column.confidence >= 90 ? 'bg-green-500' :
                intelligence.column.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`} 
            />
            <span className="text-xs text-muted-foreground">{intelligence.column.confidence}%</span>
          </div>
        </div>

        {/* Flags */}
        <div className="col-span-2 flex gap-1 flex-wrap">
          {column.isNullable ? (
            <Badge variant="outline" className="text-xs">Nullable</Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-red-500 text-red-500">Required</Badge>
          )}
          {intelligence.column.isSearchable && <Badge variant="outline" className="text-xs">🔍</Badge>}
          {intelligence.column.isFilterable && <Badge variant="outline" className="text-xs">📊</Badge>}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="bg-muted/30 p-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Intelligence */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4" /> Column Intelligence
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semantic Type:</span>
                  <Badge variant="outline">{intelligence.column.inferredSemanticType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Label:</span>
                  <span>{intelligence.column.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Placeholder:</span>
                  <span className="font-mono text-xs">{intelligence.column.placeholder || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Display in List:</span>
                  <span>{intelligence.column.displayInList ? '✓' : '✗'}</span>
                </div>
              </div>

              {intelligence.column.validationRules.length > 0 && (
                <div>
                  <h5 className="font-medium text-xs mb-2">Validation Rules</h5>
                  <div className="space-y-1">
                    {intelligence.column.validationRules.map((rule, i) => (
                      <Badge key={i} variant="secondary" className="text-xs mr-1">
                        {rule.type}: {rule.message || rule.value || ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {intelligence.column.suggestions.length > 0 && (
                <div>
                  <h5 className="font-medium text-xs mb-2">💡 Suggestions</h5>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {intelligence.column.suggestions.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column - PII/PHI Details */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" /> Compliance Details
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline">{piiDetection.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Masking Strategy:</span>
                  <span>{piiDetection.maskingStrategy || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Encryption Required:</span>
                  <span>{piiDetection.encryptionRequired ? '✓ Yes' : '✗ No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audit Required:</span>
                  <span>{piiDetection.auditRequired ? '✓ Yes' : '✗ No'}</span>
                </div>
              </div>

              {piiDetection.complianceFrameworks.length > 0 && (
                <div>
                  <h5 className="font-medium text-xs mb-2">Applicable Frameworks</h5>
                  <div className="flex flex-wrap gap-1">
                    {piiDetection.complianceFrameworks.map((fw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {fw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {piiDetection.recommendations.length > 0 && (
                <div>
                  <h5 className="font-medium text-xs mb-2">⚠️ Recommendations</h5>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {piiDetection.recommendations.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Compliance Summary Card
// =============================================================================

function ComplianceSummaryCard({ tables }: { tables: TableWithIntelligence[] }) {
  const totals = useMemo(() => {
    let totalColumns = 0
    let phiColumns = 0
    let piiColumns = 0
    let secretColumns = 0
    let confidentialColumns = 0
    let encryptionRequired = 0
    let auditRequired = 0
    const frameworks = new Set<string>()

    tables.forEach(t => {
      totalColumns += t.complianceSummary.totalColumns
      phiColumns += t.complianceSummary.phiColumns
      piiColumns += t.complianceSummary.piiColumns
      secretColumns += t.complianceSummary.secretColumns
      confidentialColumns += t.complianceSummary.confidentialColumns
      encryptionRequired += t.complianceSummary.encryptionRequired
      auditRequired += t.complianceSummary.auditRequired
      t.complianceSummary.frameworks.forEach(f => frameworks.add(f))
    })

    return {
      totalColumns,
      phiColumns,
      piiColumns,
      secretColumns,
      confidentialColumns,
      encryptionRequired,
      auditRequired,
      frameworks: Array.from(frameworks),
      riskLevel: secretColumns > 0 || phiColumns > 10 ? 'critical' :
                 phiColumns > 0 || piiColumns > 20 ? 'high' :
                 piiColumns > 0 ? 'medium' : 'low'
    }
  }, [tables])

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.totalColumns}</div>
          <p className="text-xs text-muted-foreground">{tables.length} tables analyzed</p>
        </CardContent>
      </Card>

      <Card className={totals.phiColumns > 0 ? 'border-red-500' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            PHI Columns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{totals.phiColumns}</div>
          <p className="text-xs text-muted-foreground">HIPAA protected</p>
        </CardContent>
      </Card>

      <Card className={totals.piiColumns > 0 ? 'border-yellow-500' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4 text-yellow-500" />
            PII Columns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-500">{totals.piiColumns}</div>
          <p className="text-xs text-muted-foreground">GDPR protected</p>
        </CardContent>
      </Card>

      <Card className={totals.encryptionRequired > 0 ? 'border-orange-500' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4 text-orange-500" />
            Encryption Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">{totals.encryptionRequired}</div>
          <p className="text-xs text-muted-foreground">Columns need encryption</p>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function ColumnIntelligenceViewer({ tables, onExport }: ColumnIntelligenceViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sensitivityFilter, setSensitivityFilter] = useState<string>('all')
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  // Initialize engines
  const columnEngine = useMemo(() => new ColumnIntelligenceEngine(), [])
  const piiDetector = useMemo(() => new PIIPhidDetector(), [])

  // Analyze all tables
  const analyzedTables = useMemo((): TableWithIntelligence[] => {
    return tables.map(table => {
      const columnsWithIntel: ColumnWithIntelligence[] = table.columns.map(col => ({
        column: col,
        intelligence: columnEngine.analyzeColumn(col, table.tableName),
        piiDetection: piiDetector.detect(col, table.tableName)
      }))

      const complianceSummary = piiDetector.getComplianceSummary(
        columnsWithIntel.map(c => c.piiDetection)
      )

      return {
        schemaName: table.schemaName,
        tableName: table.tableName,
        columns: columnsWithIntel,
        complianceSummary
      }
    })
  }, [tables, columnEngine, piiDetector])

  // Filter tables
  const filteredTables = useMemo(() => {
    return analyzedTables.filter(table => {
      // Search filter
      if (searchTerm && !table.tableName.toLowerCase().includes(searchTerm.toLowerCase())) {
        const hasMatchingColumn = table.columns.some(c => 
          c.column.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        if (!hasMatchingColumn) return false
      }

      // Sensitivity filter
      if (sensitivityFilter !== 'all') {
        const hasSensitivity = table.columns.some(c => 
          c.piiDetection.sensitivity === sensitivityFilter
        )
        if (!hasSensitivity) return false
      }

      return true
    })
  }, [analyzedTables, searchTerm, sensitivityFilter])

  // Export handler
  const handleExport = () => {
    if (onExport) {
      onExport(analyzedTables)
    }
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Tables to Analyze</h3>
          <p className="text-muted-foreground text-sm">
            Upload SQL schema to see column intelligence analysis
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Columns className="h-6 w-6" />
            Column Intelligence Viewer
          </h2>
          <p className="text-muted-foreground">
            AI-powered column analysis with PII/PHI detection and compliance recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Compliance Summary */}
      <ComplianceSummaryCard tables={analyzedTables} />

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables or columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={sensitivityFilter}
            onChange={(e) => setSensitivityFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Sensitivities</option>
            <option value="secret">🔴 Secret</option>
            <option value="phi">🔴 PHI</option>
            <option value="pii">🟡 PII</option>
            <option value="confidential">🟡 Confidential</option>
            <option value="internal">🟢 Internal</option>
          </select>
        </div>
      </div>

      {/* Tables with Analysis */}
      <Accordion type="multiple" className="space-y-2">
        {filteredTables.map((table, index) => {
          // Use schemaName + tableName for unique key, fallback to index
          const uniqueKey = table.schemaName 
            ? `${table.schemaName}.${table.tableName}` 
            : `${table.tableName}_${index}`
          return (
          <AccordionItem key={uniqueKey} value={uniqueKey} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-semibold">{table.tableName}</span>
                  <Badge variant="outline">{table.columns.length} columns</Badge>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {table.complianceSummary.phiColumns > 0 && (
                    <Badge className="bg-red-500 text-white">
                      {table.complianceSummary.phiColumns} PHI
                    </Badge>
                  )}
                  {table.complianceSummary.piiColumns > 0 && (
                    <Badge className="bg-yellow-500 text-black">
                      {table.complianceSummary.piiColumns} PII
                    </Badge>
                  )}
                  {table.complianceSummary.encryptionRequired > 0 && (
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      <Lock className="h-3 w-3 mr-1" />
                      {table.complianceSummary.encryptionRequired} encrypt
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0">
              <div className="border-t">
                {/* Column Header */}
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 font-medium text-sm">
                  <div className="col-span-3">Column Name</div>
                  <div className="col-span-2">Data Type</div>
                  <div className="col-span-2">UI Component</div>
                  <div className="col-span-2">Sensitivity</div>
                  <div className="col-span-1">Confidence</div>
                  <div className="col-span-2">Flags</div>
                </div>
                
                {/* Column Rows */}
                <ScrollArea className="max-h-[500px]">
                  {table.columns.map((colData) => (
                    <ColumnRow key={colData.column.name} columnData={colData} />
                  ))}
                </ScrollArea>
              </div>
            </AccordionContent>
          </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

export default ColumnIntelligenceViewer
