'use client';

import React, { useState, useCallback } from 'react';
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
import type { DatabaseType, DatabaseConnectionConfig } from '@/lib/db-connection';

interface DatabaseSourceSelectorProps {
  onSourceSelected: (source: DatabaseSource) => void;
  onParseComplete: (result: ParseResult) => void;
  isProcessing?: boolean;
}

export interface DatabaseSource {
  type: 'ddl' | 'connection';
  dbType: DatabaseType;
  ddl?: string;
  config?: DatabaseConnectionConfig;
}

export interface ParseResult {
  tables: unknown[];
  storedProcedures: unknown[];
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

const DATABASE_TYPES: { value: DatabaseType; label: string; icon: string; defaultPort: number | null }[] = [
  { value: 'sqlserver', label: 'SQL Server', icon: '🗄️', defaultPort: 1433 },
  { value: 'mysql', label: 'MySQL', icon: '🐬', defaultPort: 3306 },
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘', defaultPort: 5432 },
  { value: 'sqlite', label: 'SQLite', icon: '📁', defaultPort: null },
];

export function DatabaseSourceSelector({
  onSourceSelected,
  onParseComplete,
  isProcessing = false,
}: DatabaseSourceSelectorProps) {
  const [activeTab, setActiveTab] = useState<'ddl' | 'connection'>('ddl');
  const [ddlInput, setDdlInput] = useState('');
  const [selectedDbType, setSelectedDbType] = useState<DatabaseType>('sqlserver');
  const [autoDetect, setAutoDetect] = useState(true);

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

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setDdlInput(content);
        
        // Auto-detect on file load
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
    
    // Debounced auto-detect
    if (autoDetect && value.length > 50) {
      const timeoutId = setTimeout(() => detectDatabase(value), 500);
      return () => clearTimeout(timeoutId);
    }
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
    
    const source: DatabaseSource = {
      type: 'ddl',
      dbType: selectedDbType,
      ddl: ddlInput,
    };
    
    onSourceSelected(source);
    
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
      onParseComplete(result);
    } catch (error) {
      console.error('Parse failed:', error);
    }
  };

  // Introspect live database
  const introspectDatabase = async () => {
    const source: DatabaseSource = {
      type: 'connection',
      dbType: connectionConfig.type,
      config: connectionConfig,
    };
    
    onSourceSelected(source);
    
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
      onParseComplete(result);
    } catch (error) {
      console.error('Introspection failed:', error);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Source
        </CardTitle>
        <CardDescription>
          Import your database schema from DDL scripts or connect to a live database
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
                <Select
                  value={selectedDbType}
                  onValueChange={(v) => setSelectedDbType(v as DatabaseType)}
                >
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
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">Confidence: {detectionResult.confidence}%</Badge>
                    {Object.entries(detectionResult.indicators).map(([type, matches]) => (
                      matches.length > 0 && (
                        <Badge key={type} variant="secondary">
                          {type}: {matches.length}
                        </Badge>
                      )
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors">
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
              <Label htmlFor="ddl-input">Or paste DDL script:</Label>
              <Textarea
                id="ddl-input"
                placeholder="CREATE TABLE Employees (
  Id INT PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  DepartmentId INT FOREIGN KEY REFERENCES Departments(Id)
);"
                value={ddlInput}
                onChange={(e) => handleDdlChange(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />
              <p className="text-xs text-gray-500">
                {ddlInput.length.toLocaleString()} characters | {ddlInput.split('\n').length} lines
              </p>
            </div>

            {/* Parse Button */}
            <Button
              onClick={parseDdl}
              disabled={!ddlInput.trim() || isProcessing}
              className="w-full"
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
            {/* Database Type */}
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
              {/* Host */}
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

              {/* Port */}
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

              {/* Database Name / File Path */}
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

              {/* Schema (PostgreSQL only) */}
              {connectionConfig.type === 'postgresql' && (
                <div className="space-y-2">
                  <Label htmlFor="schema">Schema</Label>
                  <Input
                    id="schema"
                    value={connectionConfig.schema || ''}
                    onChange={(e) => updateConnectionConfig({ schema: e.target.value })}
                    placeholder="public"
                  />
                </div>
              )}

              {/* Username */}
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

              {/* Password */}
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
                      Server version: {String(connectionTest.details.serverVersion || 'Unknown')}
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
                disabled={!connectionConfig.database || isProcessing || connectionTest.status === 'error'}
                className="flex-1"
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
  );
}
