'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/useTheme'
import { useSchema, type ParsedTable, type ParsedColumn, type ParsedFK } from '@/hooks/useSchema'
import { 
  BookOpen,
  Download,
  FileText,
  Table2,
  Columns,
  Key,
  Link2,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Database,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileJson
} from 'lucide-react'

interface LivingDataDictionaryTabProps {
  onNavigate?: (tab: string) => void
}

export function LivingDataDictionaryTab({ onNavigate }: LivingDataDictionaryTabProps) {
  const { colors } = useTheme()
  const { parseResult, totalTables, totalColumns, fkRelationships, fkResolved, fkResolvedPercent, missingTables, linkedModules, moduleSummary } = useSchema()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')

  // Filter tables based on search
  const filteredTables = useMemo(() => {
    if (!parseResult?.tables) return []
    if (!searchTerm) return parseResult.tables

    const term = searchTerm.toLowerCase()
    return parseResult.tables.filter(table => 
      table.tableName.toLowerCase().includes(term) ||
      table.schemaName.toLowerCase().includes(term) ||
      table.columns.some(col => col.name.toLowerCase().includes(term))
    )
  }, [parseResult, searchTerm])

  // Toggle table expansion
  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName)
    } else {
      newExpanded.add(tableName)
    }
    setExpandedTables(newExpanded)
  }

  // Expand all tables
  const expandAll = () => {
    setExpandedTables(new Set(filteredTables.map(t => t.tableName)))
  }

  // Collapse all tables
  const collapseAll = () => {
    setExpandedTables(new Set())
  }

  // Generate Markdown output
  const generateMarkdown = (): string => {
    if (!parseResult) return ''

    const lines: string[] = []
    const timestamp = new Date().toISOString()

    // Header
    lines.push(`# Living Data Dictionary`)
    lines.push(``)
    lines.push(`> **Generated:** ${timestamp}`)
    lines.push(`> **Source:** AI Enterprise Architect - SPDLL Unified Intelligence Bank`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)

    // Statistics Summary
    lines.push(`## Statistics Summary`)
    lines.push(``)
    lines.push(`| Metric | Value |`)
    lines.push(`|--------|-------|`)
    lines.push(`| Total Tables | ${totalTables} |`)
    lines.push(`| Total Columns | ${totalColumns} |`)
    lines.push(`| Foreign Keys | ${fkRelationships} |`)
    lines.push(`| FK Resolved | ${fkResolved} (${fkResolvedPercent}%) |`)
    lines.push(`| Missing Tables | ${missingTables.length} |`)
    lines.push(`| Modules Linked | ${linkedModules.length} |`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)

    // Missing Tables (if any)
    if (missingTables.length > 0) {
      lines.push(`## Missing Tables (FK References)`)
      lines.push(``)
      lines.push(`These tables are referenced by foreign keys but not present in the schema:`)
      lines.push(``)
      missingTables.forEach(table => {
        lines.push(`- \`${table}\``)
      })
      lines.push(``)
      lines.push(`---`)
      lines.push(``)
    }

    // Modules Summary
    if (moduleSummary) {
      lines.push(`## Module Coverage`)
      lines.push(``)
      lines.push(`| Layer | Tables Linked |`)
      lines.push(`|-------|--------------|`)
      Object.entries(moduleSummary.byLayer).forEach(([layer, count]) => {
        lines.push(`| Layer ${layer} | ${count} |`)
      })
      lines.push(`| **Total** | **${moduleSummary.totalLinked}** |`)
      lines.push(``)
      lines.push(`---`)
      lines.push(``)
    }

    // Table Definitions
    lines.push(`## Table Definitions`)
    lines.push(``)

    filteredTables.forEach(table => {
      lines.push(`### ${table.schemaName}.${table.tableName}`)
      lines.push(``)

      // Columns table
      lines.push(`#### Columns`)
      lines.push(``)
      lines.push(`| Column | Data Type | Nullable | Default | Key |`)
      lines.push(`|--------|-----------|----------|----------|-----|`)

      table.columns.forEach(col => {
        const dataType = col.maxLength 
          ? `${col.dataType}(${col.maxLength})`
          : col.dataType
        const nullable = col.nullable ? 'YES' : 'NO'
        const defaultVal = col.defaultValue || '-'
        const key = col.isPrimaryKey ? 'PK' : col.isIdentity ? 'IDENTITY' : '-'
        
        lines.push(`| \`${col.name}\` | \`${dataType}\` | ${nullable} | ${defaultVal} | ${key} |`)
      })
      lines.push(``)

      // Foreign Keys
      if (table.foreignKeys.length > 0) {
        lines.push(`#### Foreign Keys`)
        lines.push(``)
        lines.push(`| Column | References | Constraint |`)
        lines.push(`|--------|-----------|------------|`)

        table.foreignKeys.forEach(fk => {
          const constraint = fk.constraintName || '-'
          lines.push(`| \`${fk.columnName}\` | \`${fk.referencesTable}.${fk.referencesColumn}\` | ${constraint} |`)
        })
        lines.push(``)
      }

      lines.push(`---`)
      lines.push(``)
    })

    // Stored Procedures (if any)
    if (parseResult.storedProcedures && parseResult.storedProcedures.length > 0) {
      lines.push(`## Stored Procedures`)
      lines.push(``)
      lines.push(`| Procedure | Type | Tables |`)
      lines.push(`|-----------|------|--------|`)
      
      parseResult.storedProcedures.forEach((sp: any) => {
        const name = sp.name || sp.procedureName || 'Unknown'
        const type = sp.type || 'Unknown'
        const tables = sp.tables?.join(', ') || '-'
        lines.push(`| \`${name}\` | ${type} | ${tables} |`)
      })
      lines.push(``)
      lines.push(`---`)
      lines.push(``)
    }

    // Footer
    lines.push(`*Generated by AI Enterprise Architect - Living Data Dictionary*`)

    return lines.join('\n')
  }

  // Generate JSON output
  const generateJSON = (): string => {
    if (!parseResult) return ''

    const output = {
      generated: new Date().toISOString(),
      source: 'AI Enterprise Architect - SPDLL Unified Intelligence Bank',
      statistics: {
        totalTables,
        totalColumns,
        foreignKeys: fkRelationships,
        fkResolved,
        fkResolvedPercent,
        missingTables,
        modulesLinked: linkedModules.length
      },
      moduleCoverage: moduleSummary,
      tables: filteredTables.map(table => ({
        schema: table.schemaName,
        name: table.tableName,
        columns: table.columns.map(col => ({
          name: col.name,
          dataType: col.dataType,
          maxLength: col.maxLength,
          nullable: col.nullable,
          isPrimaryKey: col.isPrimaryKey,
          isIdentity: col.isIdentity,
          defaultValue: col.defaultValue
        })),
        foreignKeys: table.foreignKeys.map(fk => ({
          constraintName: fk.constraintName,
          columnName: fk.columnName,
          referencesTable: fk.referencesTable,
          referencesColumn: fk.referencesColumn
        }))
      }))
    }

    return JSON.stringify(output, null, 2)
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Download Markdown file
  const downloadMarkdown = () => {
    const markdown = generateMarkdown()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `living-data-dictionary-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download JSON file
  const downloadJSON = () => {
    const json = generateJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `living-data-dictionary-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get column badge style
  const getColumnBadgeStyle = (col: ParsedColumn) => {
    if (col.isPrimaryKey) {
      return {
        backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
        color: colors.warning,
        text: 'PK'
      }
    }
    if (col.isIdentity) {
      return {
        backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
        color: colors.primary,
        text: 'IDENTITY'
      }
    }
    if (!col.nullable) {
      return {
        backgroundColor: `color-mix(in srgb, ${colors.error} 20%, transparent)`,
        color: colors.error,
        text: 'NOT NULL'
      }
    }
    return null
  }

  // If no data
  if (!parseResult || totalTables === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
              <BookOpen className="w-7 h-7" style={{ color: colors.primary }} />
              Living Data Dictionary
            </h2>
            <p className="mt-1" style={{ color: colors.textMuted }}>
              Complete schema documentation with export capabilities
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="w-16 h-16 mb-4" style={{ color: colors.textMuted }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>
              No Schema Data Available
            </h3>
            <p className="text-center max-w-md mb-4" style={{ color: colors.textMuted }}>
              Upload SQL schema files using the Universal Upload or Schema Toolkit to generate the Living Data Dictionary.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => onNavigate?.('smart-upload')}
                style={{ backgroundColor: colors.primary, color: '#ffffff' }}
              >
                Universal Upload
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate?.('upload')}
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                Schema Toolkit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <BookOpen className="w-7 h-7" style={{ color: colors.primary }} />
            Living Data Dictionary
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Complete schema documentation with export capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(generateMarkdown())}
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy MD
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadMarkdown}
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadJSON}
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            <FileJson className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)` }}
              >
                <Table2 className="w-5 h-5" style={{ color: colors.primary }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{totalTables}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Tables</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.accent} 20%, transparent)` }}
              >
                <Columns className="w-5 h-5" style={{ color: colors.accent }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{totalColumns}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Columns</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)` }}
              >
                <Key className="w-5 h-5" style={{ color: colors.warning }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{fkRelationships}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>FKs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)` }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: colors.success }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{fkResolvedPercent}%</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>FK Resolved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.error} 20%, transparent)` }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: colors.error }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{missingTables.length}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Missing</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)` }}
              >
                <Link2 className="w-5 h-5" style={{ color: colors.primary }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{linkedModules.length}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Modules</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
          <Input
            placeholder="Search tables, columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            style={{ 
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Missing Tables Warning */}
      {missingTables.length > 0 && (
        <Card 
          style={{ 
            borderColor: `color-mix(in srgb, ${colors.warning} 50%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${colors.warning} 5%, transparent)`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2" style={{ color: colors.warning }}>
              <AlertTriangle className="w-4 h-4" />
              Missing Table References ({missingTables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missingTables.map(table => (
                <Badge 
                  key={table}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                    color: colors.warning
                  }}
                >
                  {table}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables List */}
      <ScrollArea className="h-[calc(100vh-450px)]">
        <div className="space-y-3">
          {filteredTables.map(table => {
            const isExpanded = expandedTables.has(table.tableName)
            const pkCount = table.columns.filter(c => c.isPrimaryKey).length
            const fkCount = table.foreignKeys.length

            return (
              <Card 
                key={table.tableName}
                className="overflow-hidden"
                style={{ borderColor: isExpanded ? colors.primary : colors.border }}
              >
                {/* Table Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleTable(table.tableName)}
                  style={{ 
                    backgroundColor: isExpanded 
                      ? `color-mix(in srgb, ${colors.primary} 10%, transparent)` 
                      : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" style={{ color: colors.primary }} />
                    ) : (
                      <ChevronRight className="w-5 h-5" style={{ color: colors.textMuted }} />
                    )}
                    <Table2 className="w-5 h-5" style={{ color: colors.accent }} />
                    <div>
                      <span className="font-semibold" style={{ color: colors.text }}>{table.tableName}</span>
                      <span className="text-sm ml-2" style={{ color: colors.textMuted }}>
                        {table.schemaName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      style={{
                        backgroundColor: `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                        color: colors.textMuted
                      }}
                    >
                      {table.columns.length} cols
                    </Badge>
                    {pkCount > 0 && (
                      <Badge 
                        style={{
                          backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                          color: colors.warning
                        }}
                      >
                        <Key className="w-3 h-3 mr-1" />
                        {pkCount} PK
                      </Badge>
                    )}
                    {fkCount > 0 && (
                      <Badge 
                        style={{
                          backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                          color: colors.primary
                        }}
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        {fkCount} FK
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Table Content (Expanded) */}
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: colors.border }}>
                    {/* Columns */}
                    <div className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                        <Columns className="w-4 h-4" style={{ color: colors.accent }} />
                        Columns
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                              <th className="text-left p-2" style={{ color: colors.textMuted }}>Column</th>
                              <th className="text-left p-2" style={{ color: colors.textMuted }}>Data Type</th>
                              <th className="text-center p-2" style={{ color: colors.textMuted }}>Nullable</th>
                              <th className="text-left p-2" style={{ color: colors.textMuted }}>Default</th>
                              <th className="text-center p-2" style={{ color: colors.textMuted }}>Key</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.columns.map(col => {
                              const badge = getColumnBadgeStyle(col)
                              const dataType = col.maxLength 
                                ? `${col.dataType}(${col.maxLength})`
                                : col.dataType

                              return (
                                <tr 
                                  key={col.name}
                                  className="hover:bg-opacity-50"
                                  style={{ 
                                    borderBottom: `1px solid color-mix(in srgb, ${colors.border} 50%, transparent)`,
                                    backgroundColor: col.isPrimaryKey 
                                      ? `color-mix(in srgb, ${colors.warning} 5%, transparent)`
                                      : 'transparent'
                                  }}
                                >
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono" style={{ color: colors.text }}>{col.name}</span>
                                      {badge && (
                                        <Badge className="text-xs" style={badge}>
                                          {badge.text}
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <code 
                                      className="text-xs px-2 py-0.5 rounded"
                                      style={{ 
                                        backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                                        color: colors.primary
                                      }}
                                    >
                                      {dataType}
                                    </code>
                                  </td>
                                  <td className="p-2 text-center">
                                    {col.nullable ? (
                                      <CheckCircle className="w-4 h-4 mx-auto" style={{ color: colors.success }} />
                                    ) : (
                                      <XCircle className="w-4 h-4 mx-auto" style={{ color: colors.error }} />
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {col.defaultValue && (
                                      <code 
                                        className="text-xs px-2 py-0.5 rounded"
                                        style={{ 
                                          backgroundColor: `color-mix(in srgb, ${colors.textMuted} 10%, transparent)`,
                                          color: colors.textMuted
                                        }}
                                      >
                                        {col.defaultValue}
                                      </code>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    {col.isPrimaryKey && (
                                      <Key className="w-4 h-4 mx-auto" style={{ color: colors.warning }} />
                                    )}
                                    {col.isIdentity && !col.isPrimaryKey && (
                                      <Info className="w-4 h-4 mx-auto" style={{ color: colors.primary }} />
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Foreign Keys */}
                    {table.foreignKeys.length > 0 && (
                      <div className="p-4 border-t" style={{ borderColor: colors.border }}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                          <Link2 className="w-4 h-4" style={{ color: colors.primary }} />
                          Foreign Keys
                        </h4>
                        <div className="space-y-2">
                          {table.foreignKeys.map((fk, idx) => {
                            const isResolved = parseResult.tables.some(
                              t => t.tableName.toLowerCase() === fk.referencesTable.toLowerCase()
                            )

                            return (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                              >
                                <div className="flex items-center gap-3">
                                  <code 
                                    className="text-sm font-medium"
                                    style={{ color: colors.text }}
                                  >
                                    {fk.columnName}
                                  </code>
                                  <span style={{ color: colors.textMuted }}>→</span>
                                  <code 
                                    className="text-sm"
                                    style={{ color: isResolved ? colors.success : colors.error }}
                                  >
                                    {fk.referencesTable}.{fk.referencesColumn}
                                  </code>
                                </div>
                                <div className="flex items-center gap-2">
                                  {fk.constraintName && (
                                    <Badge 
                                      style={{
                                        backgroundColor: `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                                        color: colors.textMuted
                                      }}
                                    >
                                      {fk.constraintName}
                                    </Badge>
                                  )}
                                  {isResolved ? (
                                    <Badge 
                                      style={{
                                        backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`,
                                        color: colors.success
                                      }}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Resolved
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      style={{
                                        backgroundColor: `color-mix(in srgb, ${colors.error} 20%, transparent)`,
                                        color: colors.error
                                      }}
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Missing
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
