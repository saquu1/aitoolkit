'use client'

/**
 * Connected Generation Studio
 * Code generation interface with real pipeline integration
 * 
 * Connected to: /api/pipeline
 * Generates: Prisma, TypeScript, Zod, API, Form, Table, Pages
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Code2,
  FileCode,
  Database,
  FileJson,
  FileText,
  Download,
  Copy,
  Check,
  Play,
  Settings,
  Sparkles,
  File,
  Folder,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  FileSql,
  Braces,
  Table,
  FormInput,
  Page
} from 'lucide-react'

// Types from pipeline
interface PipelineResult {
  success: boolean
  parsing: {
    tables: any[]
    storedProcedures: any[]
    views: any[]
    statistics: {
      totalFiles: number
      tablesFound: number
      spsFound: number
      viewsFound: number
      parseErrors: string[]
    }
  }
  intelligence: {
    statistics: {
      totalValidationRules: number
      totalIndexRecommendations: number
      totalMissingConstraints: number
      totalUISuggestions: number
      modulesIdentified: string[]
    }
  }
  generation: {
    prisma?: any[]
    typescript?: any[]
    zod?: any[]
    api?: any[]
    form?: any[]
    table?: any[]
    pages?: any[]
  }
  export: {
    files: GeneratedFile[]
    statistics: {
      totalFiles: number
      totalLines: number
      byType: Record<string, number>
    }
  }
  errors: string[]
  warnings: string[]
}

interface GeneratedFile {
  path: string
  name: string
  content: string
  type: 'prisma' | 'typescript' | 'api' | 'component' | 'page' | 'hook'
}

interface GenerationConfig {
  generatePrisma: boolean
  generateTypes: boolean
  generateZod: boolean
  generateAPI: boolean
  generateForm: boolean
  generateTable: boolean
  generatePages: boolean
  targetFramework: 'nextjs' | 'nestjs' | 'express'
}

// File type icons
const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  prisma: Database,
  typescript: Code2,
  json: FileJson,
  markdown: FileText,
  sql: FileSql,
  yaml: FileCode,
  api: Braces,
  component: FormInput,
  page: Page,
  hook: FileCode
}

// Sample files for testing
const SAMPLE_DDL = `CREATE TABLE Patients (
  PatientID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  MRN VARCHAR(20) NOT NULL UNIQUE,
  FirstName NVARCHAR(100) NOT NULL,
  LastName NVARCHAR(100) NOT NULL,
  DateOfBirth DATE NOT NULL,
  Gender CHAR(1) NOT NULL,
  Phone VARCHAR(20),
  Email VARCHAR(100),
  BranchID UNIQUEIDENTIFIER NOT NULL,
  IsActive BIT DEFAULT 1,
  IsDeleted BIT DEFAULT 0,
  CreatedBy UNIQUEIDENTIFIER,
  CreatedOn DATETIME DEFAULT GETDATE(),
  ModifiedBy UNIQUEIDENTIFIER,
  ModifiedOn DATETIME
)

CREATE TABLE Visits (
  VisitID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  PatientID UNIQUEIDENTIFIER NOT NULL,
  DoctorID UNIQUEIDENTIFIER,
  VisitDate DATETIME NOT NULL,
  Status VARCHAR(20) DEFAULT 'Scheduled',
  Notes NVARCHAR(MAX),
  BranchID UNIQUEIDENTIFIER NOT NULL,
  CreatedOn DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (PatientID) REFERENCES Patients(PatientID)
)`

const SAMPLE_SP = `CREATE PROCEDURE sp_Patient_Create
  @MRN VARCHAR(20),
  @FirstName NVARCHAR(100),
  @LastName NVARCHAR(100),
  @DateOfBirth DATE,
  @Gender CHAR(1),
  @Phone VARCHAR(20) = NULL,
  @Email VARCHAR(100) = NULL,
  @BranchID UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  
  -- Validate required fields
  IF @MRN IS NULL OR @MRN = ''
  BEGIN
    RAISERROR('MRN is required', 16, 1)
    RETURN -1
  END
  
  -- Check uniqueness
  IF EXISTS (SELECT 1 FROM Patients WHERE MRN = @MRN AND IsDeleted = 0)
  BEGIN
    RAISERROR('Patient with this MRN already exists', 16, 1)
    RETURN -5
  END
  
  -- Insert patient
  INSERT INTO Patients (
    MRN, FirstName, LastName, DateOfBirth, Gender, Phone, Email, BranchID,
    CreatedBy, CreatedOn, IsActive, IsDeleted
  )
  VALUES (
    @MRN, @FirstName, @LastName, @DateOfBirth, @Gender, @Phone, @Email, @BranchID,
    @CurrentUserID, GETDATE(), 1, 0
  )
  
  RETURN 0
END`

export function ConnectedGenerationStudio() {
  const [inputFiles, setInputFiles] = useState<{ name: string; content: string; type: string }[]>([
    { name: 'schema.sql', content: SAMPLE_DDL, type: 'sql_ddl' },
    { name: 'sp_Patient_Create.sql', content: SAMPLE_SP, type: 'sql_sp' }
  ])
  const [files, setFiles] = useState<GeneratedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('input')
  const [config, setConfig] = useState<GenerationConfig>({
    generatePrisma: true,
    generateTypes: true,
    generateZod: true,
    generateAPI: true,
    generateForm: true,
    generateTable: true,
    generatePages: true,
    targetFramework: 'nextjs'
  })
  const [result, setResult] = useState<PipelineResult | null>(null)

  // Handle generate
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setActiveTab('output')
    
    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: inputFiles.map(f => ({
            name: f.name,
            content: f.content,
            type: f.type === 'auto' ? 'auto' : f.type
          })),
          options: config
        })
      })
      
      if (!response.ok) {
        throw new Error('Pipeline failed')
      }
      
      const data: PipelineResult = await response.json()
      setResult(data)
      setFiles(data.export.files)
      if (data.export.files.length > 0) {
        setSelectedFile(data.export.files[0])
      }
    } catch (error: any) {
      console.error('Generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [inputFiles, config])

  // Handle copy
  const handleCopy = useCallback(async (content: string, fileId: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(fileId)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  // Handle download
  const handleDownload = useCallback((file: GeneratedFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Handle download all
  const handleDownloadAll = useCallback(() => {
    const content = files.map(f => `// ${f.path}\n${f.content}`).join('\n\n// ---\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-code.zip.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [files])

  // Add file
  const handleAddFile = useCallback(() => {
    setInputFiles(prev => [...prev, { name: 'new.sql', content: '', type: 'auto' }])
  }, [])

  // Remove file
  const handleRemoveFile = useCallback((index: number) => {
    setInputFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Update file
  const handleUpdateFile = useCallback((index: number, field: 'name' | 'content' | 'type', value: string) => {
    setInputFiles(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f))
  }, [])

  // Get file icon
  const FileIcon = selectedFile ? FILE_ICONS[selectedFile.type] : File

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] gap-4">
      {/* Statistics Bar */}
      {result && (
        <div className="flex gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-300">
              <span className="font-medium text-slate-100">{result.parsing.statistics.tablesFound}</span> Tables
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileSql className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-300">
              <span className="font-medium text-slate-100">{result.parsing.statistics.spsFound}</span> SPs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-300">
              <span className="font-medium text-slate-100">{result.intelligence.statistics.totalValidationRules}</span> Validations
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-300">
              <span className="font-medium text-slate-100">{result.export.statistics.totalFiles}</span> Files Generated
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-slate-300">
              <span className="font-medium text-slate-100">{result.export.statistics.totalLines}</span> Lines
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 gap-4">
        {/* Tabs for Input/Output */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="input">
              <Upload className="w-4 h-4 mr-2" />
              Input Files
            </TabsTrigger>
            <TabsTrigger value="output" disabled={files.length === 0}>
              <FileCode className="w-4 h-4 mr-2" />
              Generated ({files.length})
            </TabsTrigger>
          </TabsList>

          {/* Input Tab */}
          <TabsContent value="input" className="flex-1 mt-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* File List */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Source Files</CardTitle>
                    <Button size="sm" variant="outline" onClick={handleAddFile}>
                      <Upload className="w-4 h-4 mr-1" />
                      Add File
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {inputFiles.map((file, index) => (
                      <div key={index} className="p-3 border-b border-slate-700 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            value={file.name}
                            onChange={(e) => handleUpdateFile(index, 'name', e.target.value)}
                            className="flex-1 h-8 bg-slate-700/50 border-slate-600"
                            placeholder="filename.sql"
                          />
                          <Select
                            value={file.type}
                            onValueChange={(v) => handleUpdateFile(index, 'type', v)}
                          >
                            <SelectTrigger className="w-[120px] h-8 bg-slate-700/50 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto Detect</SelectItem>
                              <SelectItem value="sql_ddl">SQL DDL</SelectItem>
                              <SelectItem value="sql_sp">Stored Proc</SelectItem>
                              <SelectItem value="razor_view">Razor View</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveFile(index)}
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                          >
                            ×
                          </Button>
                        </div>
                        <Textarea
                          value={file.content}
                          onChange={(e) => handleUpdateFile(index, 'content', e.target.value)}
                          className="h-[100px] bg-slate-700/50 border-slate-600 font-mono text-xs"
                          placeholder="Paste SQL, SP, or CSHTML content..."
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Generation Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Target Framework</label>
                    <Select
                      value={config.targetFramework}
                      onValueChange={(v) => setConfig(prev => ({ ...prev, targetFramework: v as any }))}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nextjs">Next.js App Router</SelectItem>
                        <SelectItem value="nestjs">NestJS Modules</SelectItem>
                        <SelectItem value="express">Express.js Routes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.generatePrisma}
                        onChange={(e) => setConfig(prev => ({ ...prev, generatePrisma: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <Database className="w-4 h-4 text-purple-400" />
                      Prisma Schema
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.generateTypes}
                        onChange={(e) => setConfig(prev => ({ ...prev, generateTypes: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <Code2 className="w-4 h-4 text-blue-400" />
                      TypeScript Types
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.generateZod}
                        onChange={(e) => setConfig(prev => ({ ...prev, generateZod: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <Braces className="w-4 h-4 text-green-400" />
                      Zod Validation
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.generateAPI}
                        onChange={(e) => setConfig(prev => ({ ...prev, generateAPI: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <FileCode className="w-4 h-4 text-yellow-400" />
                      API Routes
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.generateForm}
                        onChange={(e) => setConfig(prev => ({ ...prev, generateForm: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <FormInput className="w-4 h-4 text-pink-400" />
                      React Forms
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.generateTable}
                        onChange={(e) => setConfig(prev => ({ ...prev, generateTable: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <Table className="w-4 h-4 text-cyan-400" />
                      Data Tables
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.generatePages}
                        onChange={(e) => setConfig(prev => ({ ...prev, generatePages: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <Page className="w-4 h-4 text-orange-400" />
                      Full Pages
                    </label>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={isGenerating || inputFiles.length === 0 || !inputFiles.some(f => f.content.trim())}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Code
                      </>
                    )}
                  </Button>

                  {result?.errors && result.errors.length > 0 && (
                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                      {result.errors.map((e, i) => (
                        <div key={i}>{e}</div>
                      ))}
                    </div>
                  )}

                  {result?.warnings && result.warnings.length > 0 && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
                      {result.warnings.map((w, i) => (
                        <div key={i}>{w}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Output Tab */}
          <TabsContent value="output" className="flex-1 mt-4">
            <div className="flex h-full gap-4">
              {/* File Explorer */}
              <div className="w-72 border border-slate-700 rounded-lg bg-slate-800/50 flex flex-col">
                <div className="p-3 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-200">Generated Files</h3>
                    <Badge variant="secondary" className="text-xs">
                      {files.length} files
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {files.map((file, index) => {
                      const Icon = FILE_ICONS[file.type] || File
                      const isSelected = selectedFile?.path === file.path

                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedFile(file)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'hover:bg-slate-700/50 text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{file.name}</div>
                            <div className="text-xs text-slate-500 truncate">{file.path}</div>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-slate-700">
                  <Button
                    className="w-full"
                    onClick={handleDownloadAll}
                    disabled={files.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 flex flex-col">
                {selectedFile ? (
                  <>
                    {/* Editor Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/30 rounded-t-lg">
                      <div className="flex items-center gap-3">
                        <FileIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-slate-200">{selectedFile.path}</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedFile.content.split('\n').length} lines
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedFile.content, selectedFile.path)}
                        >
                          {copied === selectedFile.path ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(selectedFile)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Editor Content */}
                    <div className="flex-1 relative">
                      <ScrollArea className="h-full">
                        <pre className="p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap">
                          {selectedFile.content}
                        </pre>
                      </ScrollArea>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a file to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ConnectedGenerationStudio
