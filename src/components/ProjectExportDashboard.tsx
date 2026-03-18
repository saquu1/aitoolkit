'use client';

/**
 * PROJECT EXPORT DASHBOARD
 * =======================
 * UI component for configuring and exporting generated projects
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Package,
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  FolderOpen,
  FileCode,
  Database,
  Server,
} from 'lucide-react';

// Template types
type TemplateType = 'nextjs-react' | 'nextjs-pages' | 'laravel' | 'dotnet-mvc' | 'flutter';

// Export options
interface ExportOptions {
  projectName: string;
  template: TemplateType;
  includeNodeModules: boolean;
  includeEnvExample: boolean;
  includeReadme: boolean;
  includeGitIgnore: boolean;
  database: 'sqlite' | 'mysql' | 'postgresql';
}

// Export status
type ExportStatus = 'idle' | 'preparing' | 'copying' | 'generating' | 'validating' | 'packaging' | 'complete' | 'error';

// Validation result
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function ProjectExportDashboard({
  projectId,
  projectName: initialProjectName,
  onExport,
}: {
  projectId: string;
  projectName?: string;
  onExport?: (result: { downloadUrl: string; manifest: any }) => void;
}) {
  // State
  const [options, setOptions] = useState<ExportOptions>({
    projectName: initialProjectName || 'my-project',
    template: 'nextjs-react',
    includeNodeModules: false,
    includeEnvExample: true,
    includeReadme: true,
    includeGitIgnore: true,
    database: 'sqlite',
  });

  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Template options
  const templates = [
    { id: 'nextjs-react', name: 'Next.js 15 + React 19', description: 'App Router, TypeScript, Prisma', icon: '⚛️' },
    { id: 'nextjs-pages', name: 'Next.js Pages Router', description: 'Legacy pages router', icon: '📄' },
    { id: 'laravel', name: 'Laravel', description: 'PHP framework', icon: '🧱' },
    { id: 'dotnet-mvc', name: '.NET Core MVC', description: 'C# ASP.NET', icon: '🔷' },
    { id: 'flutter', name: 'Flutter', description: 'Cross-platform mobile', icon: '📱' },
  ];

  // Database options
  const databases = [
    { id: 'sqlite', name: 'SQLite', description: 'File-based, no server needed' },
    { id: 'mysql', name: 'MySQL', description: 'Production database' },
    { id: 'postgresql', name: 'PostgreSQL', description: 'Advanced features' },
  ];

  // Handle export
  const handleExport = useCallback(async () => {
    setStatus('preparing');
    setProgress(0);
    setError(null);
    setValidation(null);
    setDownloadUrl(null);

    try {
      // Step 1: Prepare
      setProgress(10);
      setStatus('copying');

      // Simulate copy progress
      await new Promise(r => setTimeout(r, 500));
      setProgress(30);

      // Step 2: Generate
      setStatus('generating');
      await new Promise(r => setTimeout(r, 500));
      setProgress(50);

      // Step 3: Validate
      setStatus('validating');
      await new Promise(r => setTimeout(r, 500));
      setProgress(70);

      // Call validation API
      const validateResponse = await fetch('/api/project-export?action=validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...options }),
      });
      
      const validateResult = await validateResponse.json();
      setValidation(validateResult.validation);
      setProgress(85);

      if (!validateResult.validation?.isValid) {
        throw new Error('Validation failed. Please check errors.');
      }

      // Step 4: Package
      setStatus('packaging');
      await new Promise(r => setTimeout(r, 500));
      setProgress(95);

      // Call export API
      const exportResponse = await fetch('/api/project-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...options }),
      });

      const exportResult = await exportResponse.json();

      if (!exportResult.success) {
        throw new Error(exportResult.error || 'Export failed');
      }

      setProgress(100);
      setStatus('complete');
      setDownloadUrl(exportResult.downloadUrl);

      if (onExport) {
        onExport({
          downloadUrl: exportResult.downloadUrl,
          manifest: exportResult.manifest,
        });
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
    }
  }, [projectId, options, onExport]);

  // Get status info
  const getStatusInfo = () => {
    switch (status) {
      case 'preparing':
        return { icon: Loader2, text: 'Preparing template...', color: 'text-blue-400' };
      case 'copying':
        return { icon: FolderOpen, text: 'Copying files...', color: 'text-blue-400' };
      case 'generating':
        return { icon: FileCode, text: 'Generating code...', color: 'text-purple-400' };
      case 'validating':
        return { icon: CheckCircle, text: 'Validating project...', color: 'text-yellow-400' };
      case 'packaging':
        return { icon: Package, text: 'Creating ZIP...', color: 'text-orange-400' };
      case 'complete':
        return { icon: CheckCircle, text: 'Export complete!', color: 'text-green-400' };
      case 'error':
        return { icon: XCircle, text: 'Export failed', color: 'text-red-400' };
      default:
        return { icon: Download, text: 'Ready to export', color: 'text-slate-400' };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const isExporting = ['preparing', 'copying', 'generating', 'validating', 'packaging'].includes(status);
  const isComplete = status === 'complete';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Export Project</h2>
          <p className="text-slate-400">Generate and download your application</p>
        </div>
        <Badge variant={isComplete ? 'default' : 'secondary'}>
          {statusInfo.text}
        </Badge>
      </div>

      {/* Main Options */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Export Configuration
          </CardTitle>
          <CardDescription>Configure your project export settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={options.projectName}
              onChange={(e) => setOptions({ ...options, projectName: e.target.value })}
              placeholder="my-project"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOptions({ ...options, template: t.id as TemplateType })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    options.template === t.id
                      ? 'border-primary bg-primary/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="text-lg">{t.icon}</div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Database Selection */}
          <div className="space-y-2">
            <Label>Database</Label>
            <Select
              value={options.database}
              onValueChange={(v) => setOptions({ ...options, database: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {databases.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-slate-400">{d.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Export Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeNodeModules}
              onChange={(e) => setOptions({ ...options, includeNodeModules: e.target.checked })}
              className="rounded border-slate-600"
            />
            <div>
              <div className="font-medium">Include node_modules</div>
              <div className="text-sm text-slate-400">
                Not recommended - large file size
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeEnvExample}
              onChange={(e) => setOptions({ ...options, includeEnvExample: e.target.checked })}
              className="rounded border-slate-600"
            />
            <div>
              <div className="font-medium">Include .env.example</div>
              <div className="text-sm text-slate-400">
                Template for environment variables
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeReadme}
              onChange={(e) => setOptions({ ...options, includeReadme: e.target.checked })}
              className="rounded border-slate-600"
            />
            <div>
              <div className="font-medium">Include README.md</div>
              <div className="text-sm text-slate-400">
                Setup instructions for the project
              </div>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Progress */}
      {isExporting && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 animate-spin ${statusInfo.color}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{statusInfo.text}</div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-slate-400">{progress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validation && (
        <Card className={`bg-slate-800/50 border-slate-700 ${validation.isValid ? 'border-green-500/50' : 'border-red-500/50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              )}
              Validation {validation.isValid ? 'Passed' : 'Issues Found'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validation.errors.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-medium text-red-400 mb-1">Errors ({validation.errors.length})</div>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {validation.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div>
                <div className="text-sm font-medium text-yellow-400 mb-1">Warnings ({validation.warnings.length})</div>
                <ul className="text-sm text-slate-400 list-disc list-inside">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Button */}
      {isComplete && downloadUrl && (
        <Card className="bg-green-900/20 border-green-500/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Project exported successfully!</span>
              </div>
              <a
                href={downloadUrl}
                download={`${options.projectName}.zip`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download ZIP
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setOptions({
              projectName: initialProjectName || 'my-project',
              template: 'nextjs-react',
              includeNodeModules: false,
              includeEnvExample: true,
              includeReadme: true,
              includeGitIgnore: true,
              database: 'sqlite',
            });
            setStatus('idle');
            setProgress(0);
            setValidation(null);
            setDownloadUrl(null);
            setError(null);
          }}
          disabled={status === 'idle'}
        >
          Reset
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting || !options.projectName}
          className="min-w-[150px]"
        >
          {isExporting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Project
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
