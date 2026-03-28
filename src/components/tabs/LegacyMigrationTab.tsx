'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { 
  FileCode,
  Database,
  ArrowRightLeft,
  Code2,
  Layout,
  FileText,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
  Braces,
  Table2,
  Eye,
  Lock,
  Zap
} from 'lucide-react'
import { CSHTMLParser, type ParsedCSHTMLView, type ReactBlueprint } from '@/lib/cshtml-parser'
import { DBConverter, type ConversionResult, type ConvertedTable } from '@/lib/db-converter'

interface LegacyMigrationTabProps {
  onNavigate?: (tab: string) => void
}

export function LegacyMigrationTab({ onNavigate }: LegacyMigrationTabProps) {
  const { colors } = useTheme()
  // Connect to shared schema state
  const { 
    parseResult, 
    totalTables: sharedTotalTables,
    totalColumns: sharedTotalColumns,
    fkResolvedPercent
  } = useSchema()
  
  const [activeTab, setActiveTab] = useState<'cshtml' | 'dbconverter'>('cshtml')
  
  // CSHTML State
  const [cshtmlInput, setCshtmlInput] = useState('')
  const [cshtmlResults, setCshtmlResults] = useState<ParsedCSHTMLView[]>([])
  const [selectedView, setSelectedView] = useState<string | null>(null)
  
  // DB Converter State
  const [sqlServerInput, setSqlServerInput] = useState('')
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null)
  const [showPostgres, setShowPostgres] = useState(true)
  const [showPrisma, setShowPrisma] = useState(true)

  // Parse CSHTML
  const parseCSHTML = () => {
    if (!cshtmlInput.trim()) return
    
    const files = cshtmlInput.split(/(?=@model|@{)/).filter(f => f.trim())
    const results: ParsedCSHTMLView[] = []
    
    for (const file of files) {
      const parser = new CSHTMLParser(file)
      results.push(parser.parse())
    }
    
    if (results.length === 0 && cshtmlInput.includes('<')) {
      // Single file without @model
      const parser = new CSHTMLParser(cshtmlInput)
      results.push(parser.parse())
    }
    
    setCshtmlResults(results)
    if (results.length > 0) {
      setSelectedView(results[0].viewName)
    }
  }

  // Convert SQL Server DDL
  const convertDDL = () => {
    if (!sqlServerInput.trim()) return
    
    const converter = new DBConverter()
    const result = converter.convert(sqlServerInput)
    setConversionResult(result)
  }

  // Generate PostgreSQL DDL
  const generatePostgresDDL = (): string => {
    if (!conversionResult) return ''
    const converter = new DBConverter()
    return converter.generatePostgreSQLDDL(conversionResult.tables)
  }

  // Generate Prisma Schema
  const generatePrismaSchema = (): string => {
    if (!conversionResult) return ''
    const converter = new DBConverter()
    return converter.generatePrismaSchema(conversionResult.tables)
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Get selected view blueprint
  const selectedViewData = cshtmlResults.find(v => v.viewName === selectedView)
  const selectedBlueprint = selectedViewData ? new CSHTMLParser('').generateReactBlueprint(selectedViewData) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <ArrowRightLeft className="w-7 h-7" style={{ color: colors.primary }} />
            Legacy Migration
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Convert ASP.NET Razor views to React & SQL Server to PostgreSQL/Prisma
          </p>
        </div>
      </div>

      {/* Tab Selection */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="border">
          <TabsTrigger value="cshtml" className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            CSHTML to React
          </TabsTrigger>
          <TabsTrigger value="dbconverter" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            SQL Server to PostgreSQL
          </TabsTrigger>
        </TabsList>

        {/* CSHTML Parser Tab */}
        <TabsContent value="cshtml" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Input */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4" style={{ color: colors.primary }} />
                  CSHTML Input
                </CardTitle>
                <CardDescription>
                  Paste your ASP.NET Razor view (.cshtml) content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={cshtmlInput}
                  onChange={(e) => setCshtmlInput(e.target.value)}
                  placeholder={`@model PatientViewModel
@{
    ViewBag.Title = "Patient Registration";
}

@using (Html.BeginForm())
{
    <div class="form-group">
        <label asp-for="FirstName"></label>
        <input asp-for="FirstName" class="form-control" required />
    </div>
    <div class="form-group">
        <label asp-for="Email"></label>
        <input asp-for="Email" type="email" class="form-control" />
    </div>
    <div class="form-group">
        <label asp-for="DateOfBirth"></label>
        <input asp-for="DateOfBirth" type="date" class="form-control" />
    </div>
    <button type="submit" class="btn btn-primary">Save</button>
}`}
                  className="font-mono text-xs min-h-[400px]"
                />
                <Button 
                  onClick={parseCSHTML}
                  className="mt-2"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Parse & Convert
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code2 className="w-4 h-4" style={{ color: colors.accent }} />
                  Analysis Results ({cshtmlResults.length} views)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cshtmlResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileCode className="w-12 h-12 mb-4" style={{ color: colors.textMuted }} />
                    <p style={{ color: colors.textMuted }}>Paste CSHTML and click Parse</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[450px]">
                    <div className="space-y-2">
                      {cshtmlResults.map((view) => (
                        <div
                          key={view.viewName}
                          className={`rounded-lg p-3 cursor-pointer transition-all ${
                            selectedView === view.viewName ? 'ring-2' : ''
                          }`}
                          style={{
                            backgroundColor: selectedView === view.viewName 
                              ? `color-mix(in srgb, ${colors.primary} 10%, transparent)`
                              : `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
                            ringColor: selectedView === view.viewName ? colors.primary : undefined,
                          }}
                          onClick={() => setSelectedView(view.viewName)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium" style={{ color: colors.text }}>
                              {view.viewName}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge style={{
                                backgroundColor: `color-mix(in srgb, ${colors.accent} 20%, transparent)`,
                                color: colors.accent,
                              }}>
                                {view.viewType}
                              </Badge>
                              <Badge variant="outline" style={{ borderColor: colors.border }}>
                                {view.fields.length} fields
                              </Badge>
                            </div>
                          </div>
                          {view.model && (
                            <div className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                              Model: {view.model.name} → {view.model.linkedTable || 'No table linked'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed View */}
          {selectedViewData && selectedBlueprint && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="w-5 h-5" style={{ color: colors.primary }} />
                      {selectedBlueprint.componentName}
                    </CardTitle>
                    <CardDescription>
                      View Type: {selectedBlueprint.viewType} | 
                      Table: {selectedBlueprint.tableName || 'Not linked'} |
                      Route: {selectedBlueprint.suggestedPath}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(selectedBlueprint, null, 2))}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Blueprint
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="fields">
                  <TabsList className="mb-4">
                    <TabsTrigger value="fields">
                      <Table2 className="w-3 h-3 mr-1" />
                      Fields ({selectedBlueprint.fields.length})
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <Eye className="w-3 h-3 mr-1" />
                      List Config
                    </TabsTrigger>
                    <TabsTrigger value="permissions">
                      <Lock className="w-3 h-3 mr-1" />
                      Permissions ({selectedBlueprint.permissions.length})
                    </TabsTrigger>
                    <TabsTrigger value="react">
                      <Braces className="w-3 h-3 mr-1" />
                      React Outline
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="fields">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {selectedBlueprint.fields.map((field) => (
                          <div 
                            key={field.name}
                            className="rounded-lg p-3 flex items-center justify-between"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono" style={{ color: colors.text }}>{field.name}</span>
                              <Badge variant="outline" style={{ borderColor: colors.border }}>
                                {field.type}
                              </Badge>
                              {field.required && (
                                <Badge style={{ 
                                  backgroundColor: `color-mix(in srgb, ${colors.error} 20%, transparent)`,
                                  color: colors.error,
                                }}>
                                  Required
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: colors.textMuted }}>
                              Col: {field.colSpan}
                              {field.permission && (
                                <Badge variant="outline" style={{ borderColor: colors.warning, color: colors.warning }}>
                                  {field.permission.value}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="list">
                    {selectedBlueprint.list ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                                {selectedBlueprint.list.columns.length}
                              </div>
                              <div className="text-xs" style={{ color: colors.textMuted }}>Columns</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                                {selectedBlueprint.list.actions.length}
                              </div>
                              <div className="text-xs" style={{ color: colors.textMuted }}>Actions</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-lg font-bold" style={{ color: colors.text }}>
                                {[
                                  selectedBlueprint.list.hasPagination ? 'Page' : '',
                                  selectedBlueprint.list.hasSearch ? 'Search' : '',
                                  selectedBlueprint.list.hasSorting ? 'Sort' : ''
                                ].filter(Boolean).join('+') || 'Basic'}
                              </div>
                              <div className="text-xs" style={{ color: colors.textMuted }}>Features</div>
                            </CardContent>
                          </Card>
                        </div>
                        <pre 
                          className="p-4 rounded-lg text-xs overflow-auto"
                          style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)` }}
                        >
                          {JSON.stringify(selectedBlueprint.list, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: colors.textMuted }}>
                        No list view configuration detected
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="permissions">
                    {selectedBlueprint.permissions.length > 0 ? (
                      <div className="space-y-2">
                        {selectedBlueprint.permissions.map((perm, i) => (
                          <div 
                            key={i}
                            className="rounded-lg p-3 flex items-center justify-between"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)` }}
                          >
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4" style={{ color: colors.warning }} />
                              <span style={{ color: colors.text }}>{perm.value}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{perm.type}</Badge>
                              <Badge variant="outline">{perm.action}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: colors.textMuted }}>
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-2" style={{ color: colors.success }} />
                        No permission restrictions detected
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="react">
                    <pre 
                      className="p-4 rounded-lg text-xs overflow-auto max-h-[400px]"
                      style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)` }}
                    >
{`// ${selectedBlueprint.componentName}.tsx
// Auto-generated from CSHTML: ${selectedViewData.viewName}
// Route: ${selectedBlueprint.suggestedPath}

${selectedBlueprint.imports.join('\n')}

export function ${selectedBlueprint.componentName}() {
  ${selectedBlueprint.hooks.join('\n  ')}

  return (
    <div className="container mx-auto p-4">
      {/* TODO: Implement ${selectedBlueprint.viewType} view */}
      ${selectedBlueprint.fields.slice(0, 3).map(f => `
      <div className="mb-4">
        <label>${f.label}</label>
        {/* ${f.type} - ${f.required ? 'Required' : 'Optional'} */}
      </div>`).join('')}
    </div>
  );
}

// Fields: ${selectedBlueprint.fields.length}
// Layout: ${selectedBlueprint.layout}
// Permissions: ${selectedBlueprint.permissions.map(p => p.value).join(', ') || 'None'}
`}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DB Converter Tab */}
        <TabsContent value="dbconverter" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Input */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: colors.primary }} />
                  SQL Server DDL Input
                </CardTitle>
                <CardDescription>
                  Paste your SQL Server CREATE TABLE statements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sqlServerInput}
                  onChange={(e) => setSqlServerInput(e.target.value)}
                  placeholder={`CREATE TABLE [dbo].[Patients] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [FirstName] NVARCHAR(100) NOT NULL,
    [LastName] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(255),
    [DateOfBirth] DATE,
    [MRN] NVARCHAR(20) UNIQUE,
    [IsActive] BIT DEFAULT 1,
    [CreatedOn] DATETIME DEFAULT GETDATE(),
    [CreatedBy] UNIQUEIDENTIFIER
);

CREATE TABLE [dbo].[Appointments] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [PatientId] INT NOT NULL,
    [DoctorId] UNIQUEIDENTIFIER,
    [AppointmentDate] DATETIME2 NOT NULL,
    [Status] NVARCHAR(20) DEFAULT 'Scheduled',
    FOREIGN KEY ([PatientId]) REFERENCES [Patients]([Id])
);`}
                  className="font-mono text-xs min-h-[400px]"
                />
                <Button 
                  onClick={convertDDL}
                  className="mt-2"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Convert to PostgreSQL/Prisma
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: colors.success }} />
                  Conversion Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!conversionResult ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Database className="w-12 h-12 mb-4" style={{ color: colors.textMuted }} />
                    <p style={{ color: colors.textMuted }}>Paste SQL Server DDL and click Convert</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-5 gap-2">
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <div className="text-lg font-bold" style={{ color: colors.text }}>{conversionResult.stats.tablesProcessed}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>Tables</div>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <div className="text-lg font-bold" style={{ color: colors.text }}>{conversionResult.stats.columnsConverted}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>Columns</div>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <div className="text-lg font-bold" style={{ color: colors.text }}>{conversionResult.stats.foreignKeysConverted}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>FKs</div>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <div className="text-lg font-bold" style={{ color: colors.text }}>{conversionResult.stats.storedProceduresConverted}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>SPs</div>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <div className="text-lg font-bold" style={{ color: colors.text }}>{conversionResult.stats.viewsConverted}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>Views</div>
                      </div>
                    </div>

                    {/* Type Conversions */}
                    {conversionResult.typeConversions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-sm" style={{ color: colors.text }}>Type Conversions</h4>
                        <div className="flex flex-wrap gap-1">
                          {conversionResult.typeConversions.map((tc, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tc.original} → {tc.converted} ({tc.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tables List */}
                    <div>
                      <h4 className="font-medium mb-2 text-sm" style={{ color: colors.text }}>Converted Tables</h4>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-1">
                          {conversionResult.tables.map((table) => (
                            <div 
                              key={table.prismaName}
                              className="rounded-lg p-2 flex items-center justify-between"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs" style={{ color: colors.textMuted }}>
                                  {table.originalName}
                                </span>
                                <ArrowRightLeft className="w-3 h-3" style={{ color: colors.textMuted }} />
                                <span className="font-mono text-xs" style={{ color: colors.text }}>
                                  {table.prismaName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {table.columns.length} cols
                                </Badge>
                                {table.foreignKeys.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {table.foreignKeys.length} FKs
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Warnings */}
                    {conversionResult.warnings.length > 0 && (
                      <div className="rounded-lg p-3" style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)` }}>
                        <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                          Warnings ({conversionResult.warnings.length})
                        </h4>
                        <ul className="text-xs space-y-1" style={{ color: colors.textSecondary }}>
                          {conversionResult.warnings.slice(0, 5).map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generated Output */}
          {conversionResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" style={{ color: colors.primary }} />
                    Generated Output
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPostgres(!showPostgres)}
                    >
                      {showPostgres ? 'Hide' : 'Show'} PostgreSQL
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPrisma(!showPrisma)}
                    >
                      {showPrisma ? 'Hide' : 'Show'} Prisma
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="postgres">
                  <TabsList className="mb-4">
                    <TabsTrigger value="postgres">
                      <Database className="w-3 h-3 mr-1" />
                      PostgreSQL DDL
                    </TabsTrigger>
                    <TabsTrigger value="prisma">
                      <Braces className="w-3 h-3 mr-1" />
                      Prisma Schema
                    </TabsTrigger>
                    <TabsTrigger value="sps">
                      <Code2 className="w-3 h-3 mr-1" />
                      SP Outlines ({conversionResult.storedProcedures.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="postgres">
                    <div className="relative">
                      <pre 
                        className="p-4 rounded-lg text-xs overflow-auto max-h-[400px]"
                        style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)` }}
                      >
                        {generatePostgresDDL()}
                      </pre>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatePostgresDDL())}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="prisma">
                    <div className="relative">
                      <pre 
                        className="p-4 rounded-lg text-xs overflow-auto max-h-[400px]"
                        style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)` }}
                      >
                        {generatePrismaSchema()}
                      </pre>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatePrismaSchema())}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="sps">
                    {conversionResult.storedProcedures.length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {conversionResult.storedProcedures.map((sp) => (
                            <div key={sp.originalName}>
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Code2 className="w-4 h-4" style={{ color: colors.primary }} />
                                {sp.originalName}
                              </h4>
                              <pre 
                                className="p-3 rounded-lg text-xs overflow-auto"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)` }}
                              >
                                {sp.nodeJSOutline}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8" style={{ color: colors.textMuted }}>
                        No stored procedures detected
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
