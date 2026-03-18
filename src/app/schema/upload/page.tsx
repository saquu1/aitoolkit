'use client';

import { useState, useCallback } from 'react';
import {
  Database,
  Upload,
  Link,
  Server,
  FileCode,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Shield,
  Eye,
  EyeOff,
  Download,
  FileText,
  Code2,
  GitBranch,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Types
type DatabaseType = 'sqlserver' | 'mysql' | 'postgresql' | 'sqlite';

interface DatabaseConnectionConfig {
  type: DatabaseType;
  database: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  schema?: string;
  ssl?: boolean;
}

interface ParseResult {
  tables: Array<{
    tableName: string;
    schemaName: string;
    columns: Array<{
      name: string;
      dataType: string;
      isNullable: boolean;
      isPrimaryKey: boolean;
    }>;
    foreignKeys: Array<{
      columnName: string;
      referencesTable: string;
    }>;
  }>;
  storedProcedures: Array<{
    procedureName: string;
    parameters: Array<{ name: string; dataType: string }>;
  }>;
  errors: string[];
  warnings: string[];
  stats: {
    totalTables: number;
    totalColumns: number;
    totalForeignKeys: number;
    parseTimeMs: number;
  };
  meta?: {
    detectedType?: DatabaseType | null;
    effectiveType: DatabaseType;
    inputLength: number;
    inputLines: number;
  };
}

const DATABASE_TYPES: { value: DatabaseType; label: string; icon: string; defaultPort: number | null; description: string }[] = [
  { value: 'sqlserver', label: 'SQL Server', icon: '🗄️', defaultPort: 1433, description: 'Microsoft SQL Server 2008+' },
  { value: 'mysql', label: 'MySQL', icon: '🐬', defaultPort: 3306, description: 'MySQL 5.7+ / MariaDB' },
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘', defaultPort: 5432, description: 'PostgreSQL 12+' },
  { value: 'sqlite', label: 'SQLite', icon: '📁', defaultPort: null, description: 'SQLite 3.x file database' },
];

export default function MultiDatabaseUploadPage() {
  // State
  const [activeTab, setActiveTab] = useState<'ddl' | 'connection'>('ddl');
  const [ddlInput, setDdlInput] = useState('');
  const [selectedDbType, setSelectedDbType] = useState<DatabaseType>('sqlserver');
  const [autoDetect, setAutoDetect] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Connection form state
  const [connectionConfig, setConnectionConfig] = useState<DatabaseConnectionConfig>({
    type: 'sqlserver',
    database: '',
    host: 'localhost',
    port: 1433,
    username: '',
    password: '',
    ssl: false,
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [connectionTest, setConnectionTest] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
    details?: Record<string, unknown>;
  }>({ status: 'idle' });

  const [detectionResult, setDetectionResult] = useState<{
    detectedType: DatabaseType | null;
    confidence: number;
    indicators: Record<string, string[]>;
  } | null>(null);

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setDdlInput(content);
        if (autoDetect) {
          detectDatabase(content);
        }
      };
      reader.readAsText(file);
    }
  }, [autoDetect]);

  // Detect database type
  const detectDatabase = async (ddl: string) => {
    try {
      const response = await fetch('/api/multi-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detect', ddl }),
      });
      
      const result = await response.json();
      setDetectionResult({
        detectedType: result.detectedType,
        confidence: result.confidence,
        indicators: result.indicators,
      });
      
      if (result.detectedType && autoDetect) {
        setSelectedDbType(result.detectedType);
      }
    } catch (error) {
      console.error('Detection failed:', error);
    }
  };

  // Handle DDL input change
  const handleDdlChange = (value: string) => {
    setDdlInput(value);
    setDetectionResult(null);
    setParseResult(null);
  };

  // Test database connection
  const testConnection = async () => {
    setConnectionTest({ status: 'testing' });
    
    try {
      const response = await fetch('/api/multi-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-connection',
          config: connectionConfig,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConnectionTest({
          status: 'success',
          message: result.message,
          details: {
            serverVersion: result.serverVersion,
            tableCount: result.tableCount,
          },
        });
      } else {
        setConnectionTest({
          status: 'error',
          message: result.message || result.error,
        });
      }
    } catch (error) {
      setConnectionTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    }
  };

  // Parse DDL
  const parseDdl = async () => {
    if (!ddlInput.trim()) return;
    
    setIsProcessing(true);
    setParseResult(null);
    
    try {
      const response = await fetch('/api/multi-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse',
          ddl: ddlInput,
          dbType: selectedDbType,
          autoDetect,
        }),
      });
      
      const result = await response.json();
      setParseResult(result);
    } catch (error) {
      console.error('Parse failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Introspect live database
  const introspectDatabase = async () => {
    setIsProcessing(true);
    setParseResult(null);
    
    try {
      const response = await fetch('/api/multi-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'introspect',
          config: connectionConfig,
        }),
      });
      
      const result = await response.json();
      setParseResult({
        tables: result.tables || [],
        storedProcedures: result.storedProcedures || [],
        errors: result.error ? [result.error] : [],
        warnings: [],
        stats: {
          totalTables: result.tables?.length || 0,
          totalColumns: result.tables?.reduce((a: number, t: { columns: { length: number }[] }) => a + (t.columns?.length || 0), 0) || 0,
          totalForeignKeys: result.tables?.reduce((a: number, t: { foreignKeys: { length: number }[] }) => a + (t.foreignKeys?.length || 0), 0) || 0,
          parseTimeMs: result.stats?.introspectionTimeMs || 0,
        },
      });
    } catch (error) {
      console.error('Introspection failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update connection config
  const updateConnectionConfig = (updates: Partial<DatabaseConnectionConfig>) => {
    setConnectionConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Auto-set default port when type changes
      if (updates.type) {
        const dbType = DATABASE_TYPES.find(t => t.value === updates.type);
        if (dbType?.defaultPort !== null && dbType?.defaultPort !== undefined) {
          newConfig.port = dbType.defaultPort;
        }
      }
      
      return newConfig;
    });
    setConnectionTest({ status: 'idle' });
  };

  // Export to file
  const exportResult = (format: 'json' | 'sql' | 'prisma') => {
    if (!parseResult) return;
    
    let content = '';
    let filename = '';
    
    switch (format) {
      case 'json':
        content = JSON.stringify(parseResult, null, 2);
        filename = 'schema.json';
        break;
      case 'sql':
        content = parseResult.tables.map(t => 
          `CREATE TABLE ${t.schemaName}.${t.tableName} (\n` +
          t.columns.map(c => 
            `  ${c.name} ${c.dataType}${c.isNullable ? '' : ' NOT NULL'}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}`
          ).join(',\n') + '\n);'
        ).join('\n\n');
        filename = 'schema.sql';
        break;
      case 'prisma':
        content = parseResult.tables.map(t => {
          const modelName = t.tableName.charAt(0).toUpperCase() + t.tableName.slice(1);
          return `model ${modelName} {\n` +
            t.columns.map(c => {
              let prismaType = 'String';
              if (c.dataType.includes('INT')) prismaType = 'Int';
              else if (c.dataType.includes('BIGINT')) prismaType = 'BigInt';
              else if (c.dataType.includes('DECIMAL') || c.dataType.includes('FLOAT')) prismaType = 'Float';
              else if (c.dataType.includes('BOOL')) prismaType = 'Boolean';
              else if (c.dataType.includes('DATE') || c.dataType.includes('TIME')) prismaType = 'DateTime';
              
              return `  ${c.name}${c.isPrimaryKey ? '  ' + prismaType + ' @id' : '  ' + prismaType + (c.isNullable ? '?' : '')}`;
            }).join('\n') +
            '\n  @@map("' + t.tableName + '")\n}';
        }).join('\n\n');
        filename = 'schema.prisma';
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600" />
          Multi-Database Import
        </h1>
        <p className="text-gray-600 mt-2">
          Import your database schema from DDL scripts or connect to a live database for real-time introspection.
          Supports SQL Server, MySQL, PostgreSQL, and SQLite.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Source Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Database Source
              </CardTitle>
              <CardDescription>
                Choose how you want to import your database schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ddl' | 'connection')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ddl" className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    DDL Script
                  </TabsTrigger>
                  <TabsTrigger value="connection" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Live Connection
                  </TabsTrigger>
                </TabsList>

                {/* DDL Tab */}
                <TabsContent value="ddl" className="space-y-4 mt-4">
                  {/* Database Type Selection */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label>Database Type:</Label>
                      <Select value={selectedDbType} onValueChange={(v) => setSelectedDbType(v as DatabaseType)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATABASE_TYPES.map((db) => (
                            <SelectItem key={db.value} value={db.value}>
                              <span className="flex items-center gap-2">
                                <span>{db.icon}</span>
                                <span>{db.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={autoDetect}
                        onChange={(e) => setAutoDetect(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Auto-detect type
                    </label>
                  </div>

                  {/* Detection Result */}
                  {detectionResult && autoDetect && (
                    <Alert className={detectionResult.confidence > 70 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>
                        Detected: {DATABASE_TYPES.find(t => t.value === detectionResult.detectedType)?.label || detectionResult.detectedType}
                      </AlertTitle>
                      <AlertDescription>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline">Confidence: {detectionResult.confidence}%</Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".sql,.ddl,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="ddl-file-upload"
                    />
                    <label htmlFor="ddl-file-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload SQL file or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        .sql, .ddl, .txt files supported
                      </p>
                    </label>
                  </div>

                  {/* DDL Textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ddl-input">Or paste DDL script:</Label>
                      <span className="text-xs text-gray-500">
                        {ddlInput.length.toLocaleString()} chars | {ddlInput.split('\n').length} lines
                      </span>
                    </div>
                    <Textarea
                      id="ddl-input"
                      placeholder={`CREATE TABLE Employees (
  Id INT PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  DepartmentId INT FOREIGN KEY REFERENCES Departments(Id)
);`}
                      value={ddlInput}
                      onChange={(e) => handleDdlChange(e.target.value)}
                      className="font-mono text-sm min-h-[200px]"
                    />
                  </div>

                  {/* Parse Button */}
                  <Button
                    onClick={parseDdl}
                    disabled={!ddlInput.trim() || isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="mr-2 h-4 w-4" />
                        Parse DDL
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* Live Connection Tab */}
                <TabsContent value="connection" className="space-y-4 mt-4">
                  {/* Database Type Buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DATABASE_TYPES.map((db) => (
                      <Button
                        key={db.value}
                        variant={connectionConfig.type === db.value ? 'default' : 'outline'}
                        onClick={() => updateConnectionConfig({ type: db.value })}
                        className="h-auto py-3 flex-col"
                      >
                        <span className="text-2xl mb-1">{db.icon}</span>
                        <span className="text-xs">{db.label}</span>
                      </Button>
                    ))}
                  </div>

                  {/* Connection Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connectionConfig.type !== 'sqlite' && (
                      <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                          id="host"
                          value={connectionConfig.host || ''}
                          onChange={(e) => updateConnectionConfig({ host: e.target.value })}
                          placeholder="localhost"
                        />
                      </div>
                    )}

                    {connectionConfig.type !== 'sqlite' && DATABASE_TYPES.find(t => t.value === connectionConfig.type)?.defaultPort !== null && (
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          type="number"
                          value={connectionConfig.port || ''}
                          onChange={(e) => updateConnectionConfig({ port: parseInt(e.target.value) || undefined })}
                          placeholder={String(DATABASE_TYPES.find(t => t.value === connectionConfig.type)?.defaultPort || '')}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="database">
                        {connectionConfig.type === 'sqlite' ? 'Database File' : 'Database Name'}
                      </Label>
                      <Input
                        id="database"
                        value={connectionConfig.database}
                        onChange={(e) => updateConnectionConfig({ database: e.target.value })}
                        placeholder={connectionConfig.type === 'sqlite' ? '/path/to/database.db' : 'my_database'}
                      />
                    </div>

                    {connectionConfig.type !== 'sqlite' && (
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={connectionConfig.username || ''}
                          onChange={(e) => updateConnectionConfig({ username: e.target.value })}
                          placeholder="root"
                        />
                      </div>
                    )}

                    {connectionConfig.type !== 'sqlite' && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={connectionConfig.password || ''}
                            onChange={(e) => updateConnectionConfig({ password: e.target.value })}
                            placeholder="••••••••"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SSL Option */}
                  {connectionConfig.type !== 'sqlite' && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={connectionConfig.ssl}
                        onChange={(e) => updateConnectionConfig({ ssl: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Shield className="h-4 w-4" />
                      Use SSL connection
                    </label>
                  )}

                  {/* Connection Test Result */}
                  {connectionTest.status !== 'idle' && (
                    <Alert
                      className={
                        connectionTest.status === 'success'
                          ? 'border-green-200 bg-green-50'
                          : connectionTest.status === 'error'
                          ? 'border-red-200 bg-red-50'
                          : ''
                      }
                    >
                      {connectionTest.status === 'testing' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : connectionTest.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertTitle>
                        {connectionTest.status === 'testing'
                          ? 'Testing connection...'
                          : connectionTest.status === 'success'
                          ? 'Connection successful'
                          : 'Connection failed'}
                      </AlertTitle>
                      <AlertDescription>
                        {connectionTest.message}
                        {connectionTest.details && (
                          <div className="text-xs mt-1 text-gray-500">
                            Server: {String(connectionTest.details.serverVersion || 'Unknown')}
                            {connectionTest.details.tableCount !== undefined && (
                              <> | Tables: {String(connectionTest.details.tableCount)}</>
                            )}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={testConnection}
                      disabled={!connectionConfig.database || connectionTest.status === 'testing'}
                    >
                      {connectionTest.status === 'testing' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Server className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </Button>

                    <Button
                      onClick={introspectDatabase}
                      disabled={!connectionConfig.database || isProcessing}
                      className="flex-1"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Introspecting...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Introspect Schema
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-1">
          {parseResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Parse Results
                </CardTitle>
                <CardDescription>
                  {parseResult.meta?.effectiveType && (
                    <Badge variant="outline" className="mr-2">
                      {DATABASE_TYPES.find(t => t.value === parseResult.meta?.effectiveType)?.label}
                    </Badge>
                  )}
                  Parsed in {parseResult.stats.parseTimeMs}ms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{parseResult.stats.totalTables}</div>
                    <div className="text-xs text-blue-500">Tables</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{parseResult.stats.totalColumns}</div>
                    <div className="text-xs text-green-500">Columns</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{parseResult.stats.totalForeignKeys}</div>
                    <div className="text-xs text-purple-500">Foreign Keys</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{parseResult.storedProcedures.length}</div>
                    <div className="text-xs text-orange-500">Procedures</div>
                  </div>
                </div>

                {/* Errors */}
                {parseResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{parseResult.errors.length} Error(s)</AlertTitle>
                    <AlertDescription>
                      <ul className="text-xs list-disc pl-4 mt-1">
                        {parseResult.errors.slice(0, 3).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                        {parseResult.errors.length > 3 && (
                          <li>...and {parseResult.errors.length - 3} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Export Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Export</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportResult('json')}>
                      <Download className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportResult('sql')}>
                      <FileText className="h-4 w-4 mr-1" />
                      SQL
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportResult('prisma')}>
                      <Code2 className="h-4 w-4 mr-1" />
                      Prisma
                    </Button>
                  </div>
                </div>

                {/* Table List */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tables Found</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {parseResult.tables.slice(0, 10).map((table, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium">{table.tableName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {table.columns.length} cols
                        </Badge>
                      </div>
                    ))}
                    {parseResult.tables.length > 10 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        + {parseResult.tables.length - 10} more tables
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Steps */}
                <Separator />
                <Button className="w-full" variant="default">
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Continue to Schema Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Parse your database schema to see results</p>
                <p className="text-xs mt-2">Upload DDL or connect to a live database</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Supported Databases Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Supported Databases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DATABASE_TYPES.map((db) => (
              <div key={db.value} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl">{db.icon}</span>
                <div>
                  <div className="font-medium">{db.label}</div>
                  <div className="text-xs text-gray-500">{db.description}</div>
                  {db.defaultPort && (
                    <div className="text-xs text-gray-400 mt-1">Port: {db.defaultPort}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
