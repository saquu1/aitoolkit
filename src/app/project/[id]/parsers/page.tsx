'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Code, Database, FileCode, GitBranch, Settings,
  Zap, Layers, Search, Table, Link2, FileText, ScrollText,
  ChevronDown, ChevronRight, Play, CheckCircle, AlertCircle,
  Info, Cpu, FileSearch, Workflow, Braces, ToggleLeft
} from 'lucide-react'

interface ParserFeature {
  name: string
  description: string
  status: 'active' | 'beta' | 'planned'
}

interface ParserProperty {
  name: string
  type: string
  default: string
  description: string
}

interface ParserFunction {
  name: string
  signature: string
  description: string
  returnType: string
}

interface ParserInfo {
  id: string
  name: string
  version: string
  description: string
  icon: string
  status: 'active' | 'beta' | 'planned'
  supportedExtensions: string[]
  features: ParserFeature[]
  properties: ParserProperty[]
  functions: ParserFunction[]
  stats: {
    filesProcessed: number
    successRate: number
    avgParseTime: number
  }
}

interface ParsersData {
  parsers: ParserInfo[]
  overallStats: {
    totalParsers: number
    activeParsers: number
    totalFilesProcessed: number
    avgSuccessRate: number
  }
}

export default function ParserDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [parsersData, setParsersData] = useState<ParsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedParser, setExpandedParser] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'features' | 'properties' | 'functions'>('features')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadParsersData()
  }, [projectId])

  const loadParsersData = async () => {
    try {
      const response = await fetch(`/api/project/${projectId}/parsers`)
      if (response.ok) {
        const data = await response.json()
        setParsersData(data)
      } else {
        // Use static data if API not available
        setParsersData(getStaticParsersData())
      }
    } catch (error) {
      console.error('Error loading parsers:', error)
      setParsersData(getStaticParsersData())
    } finally {
      setLoading(false)
    }
  }

  const getStaticParsersData = (): ParsersData => {
    return {
      parsers: [
        {
          id: 'sql-ddl',
          name: 'SQL DDL Parser',
          version: '2.1.0',
          description: 'Parses SQL Data Definition Language statements including CREATE TABLE, ALTER TABLE, indexes, and constraints. Extracts complete table schemas with columns, data types, defaults, and foreign key relationships.',
          icon: 'Database',
          status: 'active',
          supportedExtensions: ['.sql'],
          features: [
            { name: 'CREATE TABLE Parsing', description: 'Extracts table definitions with all columns, data types, and constraints', status: 'active' },
            { name: 'Foreign Key Detection', description: 'Identifies FK relationships between tables with cascade rules', status: 'active' },
            { name: 'Index Extraction', description: 'Parses CREATE INDEX and PRIMARY KEY constraints', status: 'active' },
            { name: 'Default Values', description: 'Extracts column default values including functions', status: 'active' },
            { name: 'Computed Columns', description: 'Detects computed/virtual column definitions', status: 'beta' },
            { name: 'Partition Schemes', description: 'Parses table partition definitions', status: 'planned' },
          ],
          properties: [
            { name: 'caseSensitive', type: 'boolean', default: 'false', description: 'Whether table/column names are case sensitive' },
            { name: 'schemaAware', type: 'boolean', default: 'true', description: 'Parse with schema context (dbo, etc.)' },
            { name: 'extractSourceDDL', type: 'boolean', default: 'true', description: 'Include original DDL in parsed output' },
            { name: 'maxTableSize', type: 'number', default: '500', description: 'Maximum columns per table to parse' },
            { name: 'dialect', type: 'string', default: 'mssql', description: 'SQL dialect (mssql, mysql, postgresql)' },
          ],
          functions: [
            { name: 'parseSQLContent', signature: 'parseSQLContent(content: string): SQLResult', description: 'Main parsing function for SQL DDL content', returnType: 'SQLResult' },
            { name: 'extractTables', signature: 'extractTables(content: string): TableDef[]', description: 'Extract all CREATE TABLE definitions', returnType: 'TableDef[]' },
            { name: 'extractForeignKeys', signature: 'extractForeignKeys(tableDef: TableDef): FKDef[]', description: 'Extract foreign key constraints from table', returnType: 'FKDef[]' },
            { name: 'parseColumnDefinition', signature: 'parseColumnDefinition(columnStr: string): ColumnDef', description: 'Parse individual column definition string', returnType: 'ColumnDef' },
            { name: 'inferSqlType', signature: 'inferSqlType(fieldName: string, helperType?: string): TypeInfo', description: 'Infer SQL type from field name patterns', returnType: 'TypeInfo' },
          ],
          stats: { filesProcessed: 156, successRate: 98.7, avgParseTime: 45 }
        },
        {
          id: 'sql-sp',
          name: 'Stored Procedure Parser',
          version: '2.0.0',
          description: 'Analyzes SQL stored procedures to extract parameters, return types, tables referenced, and business logic. Detects CRUD operations and infers API schemas from procedure signatures.',
          icon: 'ScrollText',
          status: 'active',
          supportedExtensions: ['.sql'],
          features: [
            { name: 'Parameter Extraction', description: 'Extracts all parameters with types, defaults, and direction', status: 'active' },
            { name: 'Action Type Detection', description: 'Classifies SP as create/read/update/delete/process', status: 'active' },
            { name: 'Table Reference Analysis', description: 'Identifies all tables referenced in SP body', status: 'active' },
            { name: 'Module Detection', description: 'Infers module name from SP naming patterns', status: 'active' },
            { name: 'Dynamic SQL Detection', description: 'Identifies sp_executesql and dynamic queries', status: 'active' },
            { name: 'Complexity Scoring', description: 'Calculates complexity based on control flow and operations', status: 'active' },
            { name: 'Business Rule Extraction', description: 'Extracts validation rules from WHERE clauses', status: 'beta' },
          ],
          properties: [
            { name: 'analyzeComplexity', type: 'boolean', default: 'true', description: 'Calculate complexity scores for SPs' },
            { name: 'extractBusinessRules', type: 'boolean', default: 'true', description: 'Extract business validation rules' },
            { name: 'maxBodyLength', type: 'number', default: '10000', description: 'Maximum characters to store from SP body' },
            { name: 'detectDynamicSQL', type: 'boolean', default: 'true', description: 'Flag dynamic SQL usage' },
          ],
          functions: [
            { name: 'analyzeProcedures', signature: 'analyzeProcedures(sps: StoredProcedureDef[]): SPIntelligenceResult[]', description: 'Analyze array of stored procedures', returnType: 'SPIntelligenceResult[]' },
            { name: 'detectActionType', signature: 'detectActionType(body: string): SPActionType', description: 'Determine CRUD action type from body', returnType: 'SPActionType' },
            { name: 'extractParameters', signature: 'extractParameters(paramsStr: string): Parameter[]', description: 'Parse SP parameter definitions', returnType: 'Parameter[]' },
            { name: 'findTablesReferenced', signature: 'findTablesReferenced(body: string): string[]', description: 'Extract table names from SP body', returnType: 'string[]' },
          ],
          stats: { filesProcessed: 89, successRate: 96.5, avgParseTime: 120 }
        },
        {
          id: 'cshtml',
          name: 'CSHTML/Razor Parser',
          version: '3.0.0',
          description: '5-Layer deep extraction engine for ASP.NET Razor views. Extracts form fields, model bindings, validation rules, AJAX calls, event handlers, and infers database schema from view definitions.',
          icon: 'FileCode',
          status: 'active',
          supportedExtensions: ['.cshtml', '.vbhtml'],
          features: [
            { name: 'Layer 1: Element Extraction', description: 'Extracts Razor helpers, Tag Helpers, and HTML inputs', status: 'active' },
            { name: 'Layer 2: Constraint Extraction', description: 'Parses validation attributes and HTML5 constraints', status: 'active' },
            { name: 'Layer 3: Relationship Detection', description: 'Detects FKs, M:M relationships, self-references', status: 'active' },
            { name: 'Layer 4: Type Inference', description: 'Intelligent SQL type inference from 40+ name patterns', status: 'active' },
            { name: 'Layer 5: Script Analysis', description: 'Extracts AJAX endpoints, event handlers, partials', status: 'active' },
            { name: 'Cascade Dropdown Detection', description: 'Identifies Country->Province->City patterns', status: 'active' },
            { name: 'Child Table Discovery', description: 'Detects collection indexers for child tables', status: 'active' },
            { name: 'Soft Delete Detection', description: 'Identifies soft delete columns from field names', status: 'active' },
          ],
          properties: [
            { name: 'extractScripts', type: 'boolean', default: 'true', description: 'Extract inline JavaScript from views' },
            { name: 'inferTypes', type: 'boolean', default: 'true', description: 'Apply intelligent type inference rules' },
            { name: 'detectPartials', type: 'boolean', default: 'true', description: 'Track partial view references' },
            { name: 'maxScriptLength', type: 'number', default: '2000', description: 'Maximum script content to extract' },
            { name: 'trackCascades', type: 'boolean', default: 'true', description: 'Detect cascading dropdown patterns' },
          ],
          functions: [
            { name: 'parseCSHTMLContent', signature: 'parseCSHTMLContent(content: string, fileName: string): CSHTMLResult', description: 'Main 5-layer parsing function', returnType: 'CSHTMLResult' },
            { name: 'extractRazorHelpers', signature: 'extractRazorHelpers(content: string): FieldDef[]', description: 'Extract TextBoxFor, DropDownListFor, etc.', returnType: 'FieldDef[]' },
            { name: 'extractTagHelpers', signature: 'extractTagHelpers(content: string): FieldDef[]', description: 'Parse asp-for tag helper attributes', returnType: 'FieldDef[]' },
            { name: 'inferSqlType', signature: 'inferSqlType(fieldName: string, helperType?: string): TypeInfo', description: 'Apply 40+ type inference rules', returnType: 'TypeInfo' },
            { name: 'detectRelationships', signature: 'detectRelationships(fields: FieldDef[]): Relationship[]', description: 'Detect FK and M:M relationships', returnType: 'Relationship[]' },
          ],
          stats: { filesProcessed: 234, successRate: 97.2, avgParseTime: 85 }
        },
        {
          id: 'javascript',
          name: 'JavaScript Intelligence Agent',
          version: '1.5.0',
          description: 'Analyzes JavaScript code to extract AJAX calls, event handlers, dependencies, and form validations. Detects jQuery plugins and Bootstrap components in use.',
          icon: 'Braces',
          status: 'active',
          supportedExtensions: ['.js', '.jsx', '.ts', '.tsx'],
          features: [
            { name: 'AJAX Call Extraction', description: 'Extracts $.ajax, $.get, $.post, fetch, XMLHttpRequest', status: 'active' },
            { name: 'Event Handler Detection', description: 'Identifies jQuery and vanilla event bindings', status: 'active' },
            { name: 'Dependency Analysis', description: 'Extracts imports, requires, CDN references', status: 'active' },
            { name: 'jQuery Plugin Detection', description: 'Identifies 15+ common jQuery plugins', status: 'active' },
            { name: 'Form Validation Extraction', description: 'Parses jQuery Validation rules', status: 'active' },
            { name: 'Bootstrap Component Detection', description: 'Identifies Bootstrap UI components', status: 'active' },
            { name: 'API Endpoint Discovery', description: 'Extracts REST endpoints from AJAX calls', status: 'active' },
          ],
          properties: [
            { name: 'extractDependencies', type: 'boolean', default: 'true', description: 'Extract import/require dependencies' },
            { name: 'detectPlugins', type: 'boolean', default: 'true', description: 'Identify jQuery plugins in use' },
            { name: 'maxCodeLength', type: 'number', default: '500', description: 'Maximum handler code to store' },
          ],
          functions: [
            { name: 'analyze', signature: 'analyze(content: string, fileName: string): JSIntelligenceResult', description: 'Main analysis function for JavaScript', returnType: 'JSIntelligenceResult' },
            { name: 'extractAjaxCalls', signature: 'extractAjaxCalls(content: string, fileName: string): AjaxCall[]', description: 'Extract all AJAX/API calls', returnType: 'AjaxCall[]' },
            { name: 'extractEventHandlers', signature: 'extractEventHandlers(content: string, fileName: string): EventHandler[]', description: 'Find all event bindings', returnType: 'EventHandler[]' },
            { name: 'detectJQueryPlugins', signature: 'detectJQueryPlugins(content: string): string[]', description: 'Identify jQuery plugins used', returnType: 'string[]' },
          ],
          stats: { filesProcessed: 178, successRate: 94.8, avgParseTime: 35 }
        },
        {
          id: 'file-classifier',
          name: 'File Classification Engine',
          version: '1.2.0',
          description: 'Intelligent file type detection system that analyzes file extensions and content to classify files and route them to appropriate parsers. Detects frameworks and languages automatically.',
          icon: 'FileSearch',
          status: 'active',
          supportedExtensions: ['*'],
          features: [
            { name: 'Extension Mapping', description: 'Maps file extensions to file types and languages', status: 'active' },
            { name: 'Content-Based Detection', description: 'Analyzes content for accurate type detection', status: 'active' },
            { name: 'Framework Detection', description: 'Identifies ASP.NET, React, Vue, Angular, etc.', status: 'active' },
            { name: 'Confidence Scoring', description: 'Calculates confidence level for classification', status: 'active' },
            { name: 'Parser Routing', description: 'Suggests appropriate parser for each file', status: 'active' },
            { name: 'Complexity Estimation', description: 'Estimates file complexity from content', status: 'active' },
          ],
          properties: [
            { name: 'useContentAnalysis', type: 'boolean', default: 'true', description: 'Analyze content for better classification' },
            { name: 'detectFramework', type: 'boolean', default: 'true', description: 'Identify target framework' },
            { name: 'minConfidence', type: 'number', default: '50', description: 'Minimum confidence threshold' },
          ],
          functions: [
            { name: 'classify', signature: 'classify(fileName: string, content: string): FileClassification', description: 'Classify a single file', returnType: 'FileClassification' },
            { name: 'classifyBatch', signature: 'classifyBatch(files: File[]): FileClassification[]', description: 'Classify multiple files', returnType: 'FileClassification[]' },
            { name: 'detectFramework', signature: 'detectFramework(content: string): Framework', description: 'Identify code framework', returnType: 'Framework' },
            { name: 'getSuggestedParser', signature: 'getSuggestedParser(fileType: FileType): string', description: 'Get parser name for file type', returnType: 'string' },
          ],
          stats: { filesProcessed: 657, successRate: 99.1, avgParseTime: 8 }
        },
        {
          id: 'workflow-builder',
          name: 'Workflow Builder Agent',
          version: '1.0.0',
          description: 'Discovers and reconstructs business workflows from stored procedure chains. Analyzes naming patterns, dependencies, and action sequences to create workflow definitions.',
          icon: 'Workflow',
          status: 'active',
          supportedExtensions: ['.sql'],
          features: [
            { name: 'Module Grouping', description: 'Groups SPs by module prefix patterns', status: 'active' },
            { name: 'Action Sequencing', description: 'Orders SPs by typical workflow order', status: 'active' },
            { name: 'Cross-Module Detection', description: 'Identifies workflows spanning modules', status: 'active' },
            { name: 'Mermaid Diagram Generation', description: 'Generates visual workflow diagrams', status: 'active' },
            { name: 'Complexity Analysis', description: 'Determines workflow complexity level', status: 'active' },
            { name: 'Template Matching', description: 'Matches against known workflow patterns', status: 'beta' },
          ],
          properties: [
            { name: 'minProcedures', type: 'number', default: '2', description: 'Minimum SPs to form a workflow' },
            { name: 'confidenceThreshold', type: 'number', default: '60', description: 'Minimum confidence for workflow' },
            { name: 'crossModuleAnalysis', type: 'boolean', default: 'true', description: 'Detect cross-module workflows' },
          ],
          functions: [
            { name: 'buildWorkflows', signature: 'buildWorkflows(spResults: SPIntelligenceResult[]): WorkflowDefinition[]', description: 'Build workflows from SP analysis', returnType: 'WorkflowDefinition[]' },
            { name: 'groupByModulePrefix', signature: 'groupByModulePrefix(sps: SPResult[]): WorkflowChain[]', description: 'Group SPs by naming prefix', returnType: 'WorkflowChain[]' },
            { name: 'generateMermaidDiagram', signature: 'generateMermaidDiagram(workflow: WorkflowDefinition): string', description: 'Create Mermaid flowchart', returnType: 'string' },
            { name: 'generateDocumentation', signature: 'generateDocumentation(workflow: WorkflowDefinition): string', description: 'Generate markdown docs', returnType: 'string' },
          ],
          stats: { filesProcessed: 45, successRate: 92.3, avgParseTime: 150 }
        },
        {
          id: 'orchestrator',
          name: 'Intelligence Orchestrator',
          version: '1.1.0',
          description: 'Central orchestrator that coordinates all parsers and agents. Routes files to appropriate parsers, builds cross-references, and produces complete system intelligence map.',
          icon: 'Cpu',
          status: 'active',
          supportedExtensions: ['*'],
          features: [
            { name: 'Multi-Parser Coordination', description: 'Routes and executes multiple parsers', status: 'active' },
            { name: 'Cross-Reference Building', description: 'Links pages, SPs, and tables', status: 'active' },
            { name: 'Discovered Table Tracking', description: 'Tracks tables found but not uploaded', status: 'active' },
            { name: 'Module Suggestion', description: 'Suggests module for discovered tables', status: 'active' },
            { name: 'Summary Report Generation', description: 'Generates system intelligence reports', status: 'active' },
            { name: 'Parallel Processing', description: 'Process multiple file types concurrently', status: 'beta' },
          ],
          properties: [
            { name: 'parseSQL', type: 'boolean', default: 'true', description: 'Enable SQL DDL parsing' },
            { name: 'parseCSHTML', type: 'boolean', default: 'true', description: 'Enable CSHTML parsing' },
            { name: 'parseJS', type: 'boolean', default: 'true', description: 'Enable JavaScript parsing' },
            { name: 'parseSP', type: 'boolean', default: 'true', description: 'Enable SP analysis' },
            { name: 'buildWorkflows', type: 'boolean', default: 'true', description: 'Build workflow definitions' },
            { name: 'crossReference', type: 'boolean', default: 'true', description: 'Build cross-references' },
          ],
          functions: [
            { name: 'processFiles', signature: 'processFiles(files: File[]): SystemParseResult', description: 'Process multiple files of different types', returnType: 'SystemParseResult' },
            { name: 'buildCrossReferences', signature: 'buildCrossReferences(): void', description: 'Link all parsed results', returnType: 'void' },
            { name: 'generateSummaryReport', signature: 'generateSummaryReport(result: SystemParseResult): string', description: 'Generate summary report', returnType: 'string' },
          ],
          stats: { filesProcessed: 412, successRate: 98.5, avgParseTime: 250 }
        },
        {
          id: 'laravel',
          name: 'Laravel Parser',
          version: '1.0.0',
          description: 'Parses Laravel Blade templates, Eloquent models, and migrations to extract table schemas, relationships, and form definitions.',
          icon: 'Code',
          status: 'beta',
          supportedExtensions: ['.blade.php', '.php'],
          features: [
            { name: 'Blade Template Parsing', description: 'Extract form fields from Blade views', status: 'active' },
            { name: 'Eloquent Model Analysis', description: 'Parse model relationships and fillable', status: 'active' },
            { name: 'Migration Parsing', description: 'Extract schema from migration files', status: 'active' },
            { name: 'Relationship Detection', description: 'Identify hasMany, belongsTo, etc.', status: 'beta' },
            { name: 'Validation Rule Extraction', description: 'Extract rules from model validation', status: 'planned' },
          ],
          properties: [
            { name: 'parseModels', type: 'boolean', default: 'true', description: 'Parse Eloquent model files' },
            { name: 'parseMigrations', type: 'boolean', default: 'true', description: 'Parse migration files' },
            { name: 'detectRelationships', type: 'boolean', default: 'true', description: 'Detect Eloquent relationships' },
          ],
          functions: [
            { name: 'parseLaravelBlade', signature: 'parseLaravelBlade(content: string, fileName: string): BladeResult', description: 'Parse Blade template', returnType: 'BladeResult' },
            { name: 'parseLaravelModel', signature: 'parseLaravelModel(content: string, fileName: string): ModelResult', description: 'Parse Eloquent model', returnType: 'ModelResult' },
            { name: 'parseLaravelMigration', signature: 'parseLaravelMigration(content: string, fileName: string): TableDef', description: 'Parse migration file', returnType: 'TableDef' },
          ],
          stats: { filesProcessed: 23, successRate: 88.5, avgParseTime: 65 }
        }
      ],
      overallStats: {
        totalParsers: 8,
        activeParsers: 7,
        totalFilesProcessed: 1794,
        avgSuccessRate: 95.6
      }
    }
  }

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Database, ScrollText, FileCode, Braces, FileSearch, Workflow, Cpu, Code
    }
    return icons[iconName] || Database
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'beta': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'planned': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredParsers = parsersData?.parsers.filter(parser =>
    parser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parser.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parser.features.some(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Parser Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/project/${projectId}`)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Settings className="h-7 w-7 text-blue-500" />
                  Parser Dashboard
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Manage and configure parsing engines
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            {parsersData && (
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{parsersData.overallStats.totalParsers}</div>
                  <div className="text-xs text-gray-500">Total Parsers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{parsersData.overallStats.activeParsers}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{parsersData.overallStats.totalFilesProcessed.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Files Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{parsersData.overallStats.avgSuccessRate}%</div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search parsers, features, or functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Parsers Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="space-y-4">
          {filteredParsers.map((parser) => {
            const IconComponent = getIconComponent(parser.icon)
            const isExpanded = expandedParser === parser.id

            return (
              <div
                key={parser.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              >
                {/* Parser Header */}
                <div
                  className="px-6 py-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedParser(isExpanded ? null : parser.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{parser.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(parser.status)}`}>
                            {parser.status}
                          </span>
                          <span className="text-xs text-gray-500">v{parser.version}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5 max-w-2xl truncate">
                          {parser.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Mini Stats */}
                      <div className="hidden lg:flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-white">{parser.stats.filesProcessed}</div>
                          <div className="text-xs text-gray-500">Files</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-green-400">{parser.stats.successRate}%</div>
                          <div className="text-xs text-gray-500">Success</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-blue-400">{parser.stats.avgParseTime}ms</div>
                          <div className="text-xs text-gray-500">Avg Time</div>
                        </div>
                      </div>

                      {/* Extensions */}
                      <div className="hidden md:flex items-center gap-1">
                        {parser.supportedExtensions.map((ext, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
                            {ext}
                          </span>
                        ))}
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-800">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-800">
                      <button
                        onClick={() => setActiveTab('features')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          activeTab === 'features'
                            ? 'text-blue-400 border-b-2 border-blue-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Features ({parser.features.length})
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('properties')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          activeTab === 'properties'
                            ? 'text-blue-400 border-b-2 border-blue-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ToggleLeft className="h-4 w-4" />
                          Properties ({parser.properties.length})
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('functions')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          activeTab === 'functions'
                            ? 'text-blue-400 border-b-2 border-blue-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Functions ({parser.functions.length})
                        </div>
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                      {activeTab === 'features' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {parser.features.map((feature, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-white">{feature.name}</h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(feature.status)}`}>
                                  {feature.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 mt-2">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'properties' && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-800">
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-400">Property</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-400">Type</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-400">Default</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-400">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parser.properties.map((prop, i) => (
                                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                  <td className="py-3 px-4">
                                    <code className="text-blue-400 text-sm">{prop.name}</code>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-purple-400 text-sm">{prop.type}</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <code className="text-gray-400 text-sm">{prop.default}</code>
                                  </td>
                                  <td className="py-3 px-4 text-gray-400 text-sm">{prop.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {activeTab === 'functions' && (
                        <div className="space-y-4">
                          {parser.functions.map((func, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                              <div className="flex items-start justify-between">
                                <code className="text-blue-400 font-mono text-sm">{func.signature}</code>
                                <span className="text-xs text-gray-500">→ {func.returnType}</span>
                              </div>
                              <p className="text-sm text-gray-400 mt-2">{func.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Info className="h-4 w-4" />
                        <span>
                          {parser.features.filter(f => f.status === 'active').length} active features,{' '}
                          {parser.functions.length} exported functions
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/project/${projectId}/upload?parser=${parser.id}`}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Play className="h-4 w-4 inline mr-1" />
                          Run Parser
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredParsers.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400">No parsers found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search query</p>
          </div>
        )}
      </div>
    </div>
  )
}
