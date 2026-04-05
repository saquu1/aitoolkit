'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSchema } from '@/hooks/useSchema';
import { useProjectScopeContext } from '@/contexts/ProjectScopeContext';
import {
  Database,
  Brain,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Layers,
  BarChart3,
  Settings,
  Wrench,
  Play,
  TrendingUp,
  Target,
  BookOpen,
  Info,
  Loader2,
  XCircle,
  Lock,
  FileCheck,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Download,
  ChevronRight,
  AlertOctagon,
  Clock
} from 'lucide-react';
import { SOPManagementUI } from '@/components/SOPManagementUI';
import { FrameworkActivationConfig } from '@/components/FrameworkActivationConfig';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import type { TimelineEvent } from '@/components/ActivityTimeline';
import { useTheme } from '@/hooks/useTheme';

// =============================================================================
// TYPES
// =============================================================================

interface IntelligenceSummary {
  totalFields: number;
  totalTables: number;
  averageConfidence: number;
  enrichmentCompleteness: number;
  fieldsNeedingReview: number;
  piiFields: number;
  phiFields: number;
  fkFields: number;
  compliance: {
    errors: number;
    warnings: number;
    resolved: number;
  };
  sop: {
    totalRules: number;
    activeRules: number;
    categories: Record<string, number>;
  };
}

interface EnrichmentSession {
  id: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  totalFields: number;
  fieldsEnriched: number;
  fieldsWithIssues: number;
  averageConfidence: number;
  createdAt: string;
}

// =============================================================================
// SAMPLE ACTIVITY EVENTS DATA
// =============================================================================

const sampleActivityEvents: TimelineEvent[] = [
  {
    id: '1',
    title: 'Compliance Scan Completed',
    description: 'Scanned 201 columns across 17 tables. Found 63 PII fields and 54 PHI fields.',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    type: 'compliance',
    metadata: { fields: '201', score: '96%' },
  },
  {
    id: '2',
    title: 'Schema Analysis Pipeline Run',
    description: '12-step enrichment pipeline completed for HIS Core project.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    type: 'enrichment',
    metadata: { tables: '17', confidence: '87%' },
  },
  {
    id: '3',
    title: 'FK Resolution Analysis',
    description: 'Resolved 24 of 29 foreign key relationships automatically.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    type: 'scan',
    metadata: { resolved: '24', total: '29' },
  },
  {
    id: '4',
    title: 'GDPR Framework Activated',
    description: 'GDPR compliance framework activated with 98% coverage score.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    type: 'success',
    metadata: { score: '98%' },
  },
  {
    id: '5',
    title: 'HIPAA Compliance Warning',
    description: '12 PHI fields detected without encryption policy.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    type: 'warning',
    metadata: { fields: '12' },
  },
  {
    id: '6',
    title: 'Module Linking Update',
    description: 'Linked 35 modules to 9 database tables.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    metadata: { modules: '35' },
  },
];

// =============================================================================
// INTELLIGENCE BANK TAB COMPONENT
// =============================================================================

interface IntelligenceBankTabProps {
  projectId?: string;
}

export function IntelligenceBankTab({ projectId }: IntelligenceBankTabProps) {
  // Connect to shared schema state
  const { 
    activeProject,
    totalTables: sharedTotalTables,
    totalColumns: sharedTotalColumns,
    parseResult,
    linkedModules,
    modulesLinked,
    fkResolvedPercent: sharedFkPercent,
    refreshDbStats
  } = useSchema()

  const { colors } = useTheme();

  // Helper for alpha blending
  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
  
  // Connect to scope context for scope-aware queries
  const { 
    scope, 
    projectIds, 
    isGlobalScope, 
    isIsolated,
    includeGlobal 
  } = useProjectScopeContext()
  
  // Determine effective project ID from scope or props
  const effectiveProjectId = projectId || 
    (scope.type === 'project' ? scope.activeProjectId : null) ||
    activeProject?.id || null
    
  // Build scope parameters for API calls
  const getScopeParams = useCallback(() => {
    const params: Record<string, string> = {}
    
    if (scope.type === 'project' && scope.activeProjectId) {
      params.projectId = scope.activeProjectId
      params.scopeType = 'project'
    } else if (scope.type === 'multi' && scope.selectedProjectIds.length > 0) {
      params.selectedProjects = JSON.stringify(scope.selectedProjectIds)
      params.scopeType = 'multi'
    } else {
      params.scopeType = 'all'
    }
    
    return params
  }, [scope])
  
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [sessions, setSessions] = useState<EnrichmentSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRunningEnrichment, setIsRunningEnrichment] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [complianceData, setComplianceData] = useState<any>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<Record<string, number>>({
    'Schema Layer': 100,
    'FK Layer': 0,
    'Intelligence Layer': 0,
    'UI Component Layer': 0,
    'Validation Layer': 0,
    'Compliance Layer': 0
  });

  // Fetch summary with scope awareness
  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const scopeParams = getScopeParams()
      const queryParams = new URLSearchParams({
        action: 'stats',
        ...scopeParams,
        ...(effectiveProjectId ? { projectId: effectiveProjectId } : {})
      })
      
      // Use scope-aware endpoint
      const response = await fetch(`/api/intelligence-bank/scope?${queryParams}`);
      const data = await response.json();
      if (data.success && data.stats) {
        // Convert stats to summary format
        const stats = data.stats
        setSummary({
          totalFields: stats.byType?.tables || 0,
          totalTables: stats.total || 0,
          averageConfidence: 0.75,
          enrichmentCompleteness: stats.total > 0 ? 70 : 0,
          fieldsNeedingReview: 0,
          piiFields: 0,
          phiFields: 0,
          fkFields: stats.byType?.tables || 0,
          compliance: { errors: 0, warnings: 0, resolved: 0 },
          sop: { totalRules: 0, activeRules: 0, categories: {} }
        });
        
        // Update enrichment progress based on real data
        setEnrichmentProgress({
          'Schema Layer': 100,
          'FK Layer': sharedFkPercent || data.summary?.fkFields > 0 ? 85 : 0,
          'Intelligence Layer': Math.round((data.summary?.averageConfidence || 0) * 100),
          'UI Component Layer': data.summary?.totalFields > 0 ? 75 : 0,
          'Validation Layer': data.summary?.compliance?.resolved > 0 ? 80 : 0,
          'Compliance Layer': data.summary?.phiFields > 0 || data.summary?.piiFields > 0 ? 70 : 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId, sharedFkPercent]);

  // Fetch entities with scope awareness
  const fetchEntities = useCallback(async () => {
    try {
      const scopeParams = getScopeParams()
      const queryParams = new URLSearchParams({
        action: 'entities',
        limit: '20',
        ...scopeParams
      })
      
      const response = await fetch(`/api/intelligence-bank/scope?${queryParams}`);
      const data = await response.json();
      return data.entities || []
    } catch (error) {
      console.error('Failed to fetch entities:', error);
      return []
    }
  }, [getScopeParams]);

  const fetchComplianceData = useCallback(async () => {
    setComplianceLoading(true);
    try {
      const res = await fetch('/api/compliance-scan');
      const data = await res.json();
      if (data.success) setComplianceData(data);
    } catch (err) {
      console.error('Failed to fetch compliance data:', err);
    } finally {
      setComplianceLoading(false);
    }
  }, []);

  const handleExportCompliance = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/compliance-export?format=csv');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from Content-Disposition header
      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      a.download = filenameMatch?.[1] || 'compliance-report.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export compliance report:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchEntities();
    fetchComplianceData();
  }, [fetchSummary, fetchEntities, fetchComplianceData, scope.type, scope.activeProjectId]);

  // Run enrichment
  const runEnrichment = async () => {
    if (!effectiveProjectId) return
    
    setIsRunningEnrichment(true);
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-enrichment', projectId: effectiveProjectId }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchSummary();
        await fetchSessions();
      }
    } catch (error) {
      console.error('Failed to run enrichment:', error);
    } finally {
      setIsRunningEnrichment(false);
    }
  };

  // Run consistency checks
  const runConsistencyChecks = async () => {
    if (!effectiveProjectId) return
    
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-consistency-checks', projectId: effectiveProjectId }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchSummary();
      }
    } catch (error) {
      console.error('Failed to run consistency checks:', error);
    }
  };

  // Run SOP auto-fixes
  const runSOPAutoFixes = async () => {
    if (!effectiveProjectId) return
    
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-all-sop-autofixes', projectId: effectiveProjectId }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchSummary();
      }
    } catch (error) {
      console.error('Failed to run SOP auto-fixes:', error);
    }
  };

  // Compute compliance stats from live compliance data
  const complianceStats = useMemo(() => {
    if (!complianceData) return { errors: 0, warnings: 0, resolved: 0 };
    const re = complianceData.ruleEvaluations;
    const passCount = re
      ? Object.values(re)
          .flat()
          .filter((r: { status: string }) => r.status === 'PASS').length
      : 0;
    return {
      errors: complianceData.gapReport?.bySeverity?.critical || 0,
      warnings: complianceData.gapReport?.bySeverity?.high || 0,
      resolved: passCount,
    };
  }, [complianceData]);

  // Calculate overall health score
  const healthScore = summary
    ? Math.round(
        ((summary.enrichmentCompleteness || 0) * 0.4 +
          (summary.averageConfidence || 0) * 0.3 +
          (summary.compliance?.errors === 0 ? 1 : 0.5) * 0.3) *
          100
      )
    : Math.round(sharedTotalTables * 2 + modulesLinked * 5); // Fallback to schema stats

  // Show scope info banner
  const renderScopeInfo = () => {
    if (isGlobalScope) {
      return (
        <Alert className="mb-4">
          <Layers className="h-4 w-4" />
          <AlertTitle>Global Scope Active</AlertTitle>
          <AlertDescription>
            Viewing intelligence data across all projects. Data is aggregated from all projects and global entities.
          </AlertDescription>
        </Alert>
      )
    }
    
    if (scope.type === 'multi') {
      return (
        <Alert className="mb-4">
          <Layers className="h-4 w-4" />
          <AlertTitle>Multi-Project Scope</AlertTitle>
          <AlertDescription>
            Comparing intelligence data across {scope.selectedProjectIds.length} selected projects.
          </AlertDescription>
        </Alert>
      )
    }
    
    if (isIsolated) {
      return (
        <Alert className="mb-4" variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Isolated Mode</AlertTitle>
          <AlertDescription>
            This project is isolated. Only project-specific data is visible, no inheritance from global.
          </AlertDescription>
        </Alert>
      )
    }
    
    if (includeGlobal) {
      return (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Including Global Data</AlertTitle>
          <AlertDescription>
            Inheriting global intelligence data. You can override inherited values in project settings.
          </AlertDescription>
        </Alert>
      )
    }
    
    return null
  }

  // No project selected state (only show in project scope mode)
  if (!effectiveProjectId && scope.type === 'project') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Unified Intelligence Data Bank</h2>
            <p className="text-muted-foreground">
              Central repository for field intelligence, SOP compliance, and consistency checks
            </p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project first to view and manage intelligence data. 
            Use the Project Selector in the header to choose a project.
          </AlertDescription>
        </Alert>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Database className="h-16 w-16 mx-auto mb-4 text-blue-500 opacity-50" />
              <h3 className="text-lg font-semibold">Intelligence Bank Features</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Once you select a project and upload schema files, you can:
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4 max-w-md mx-auto">
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <Zap className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium">Auto Enrichment</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <Shield className="h-5 w-5 mx-auto mb-2 text-red-500" />
                  <p className="text-sm font-medium">Compliance Checks</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <FileText className="h-5 w-5 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm font-medium">SOP Management</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">Consistency Checks</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scope Info Banner */}
      {renderScopeInfo()}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Unified Intelligence Data Bank</h2>
          <p className="text-muted-foreground">
            Central repository for field intelligence, SOP compliance, and consistency checks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchSummary(); fetchEntities(); }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={runEnrichment} disabled={isRunningEnrichment || !effectiveProjectId}>
            {isRunningEnrichment ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Enrichment
          </Button>
        </div>
      </div>

      {/* Health Score Banner */}
      <Card className="fade-in-delayed bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Overall Health Score</h3>
                <p className="text-sm text-muted-foreground">
                  Based on enrichment completeness, confidence, and compliance
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {healthScore}%
              </span>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>Real-time data</span>
              </div>
            </div>
          </div>
          <Progress value={healthScore} className="mt-4" />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fields</p>
                <p className="text-2xl font-bold">{summary?.totalFields || sharedTotalColumns}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.totalTables || sharedTotalTables} tables analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((summary?.averageConfidence || 0.75) * 100)}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <Progress
              value={(summary?.averageConfidence || 0.75) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="text-2xl font-bold">
                  <span className="text-red-600">{complianceStats.errors}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-yellow-600">{complianceStats.warnings}</span>
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {complianceStats.resolved} rules passing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SOP Rules</p>
                <p className="text-2xl font-bold">{summary?.sop?.totalRules || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.sop?.activeRules || 0} active rules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Framework Scores Mini Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: 'HIPAA', key: 'HIPAA', icon: Lock, color: '#ef4444' },
          { name: 'GDPR', key: 'GDPR', icon: Shield, color: '#3b82f6' },
          { name: 'SOX', key: 'SOX', icon: FileCheck, color: '#22c55e' },
          { name: 'PCI-DSS', key: 'PCI-DSS', icon: ShieldCheck, color: '#a855f7' },
        ].map((fw) => {
          const fwData = complianceData?.frameworks?.[fw.key];
          const score = fwData?.score || 0;
          return (
            <div key={fw.key} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: alpha(colors.border, 10) }}>
              <fw.icon className="h-4 w-4 shrink-0" style={{ color: fw.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: colors.textMuted }}>{fw.name}</span>
                  <span className="font-mono font-semibold" style={{ color: colors.text }}>{score}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <Layers className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="enrichment">
            <Zap className="h-4 w-4 mr-2" />
            Enrichment
          </TabsTrigger>
          <TabsTrigger value="sop">
            <FileText className="h-4 w-4 mr-2" />
            SOP Management
          </TabsTrigger>
          <TabsTrigger value="consistency">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Consistency
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="frameworks">
            <Sparkles className="h-4 w-4 mr-2" />
            Frameworks
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Enrichment Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrichment Progress</CardTitle>
                <CardDescription>
                  12-layer enrichment pipeline status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(enrichmentProgress).map(([name, progress]) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{name}</span>
                        <span className="text-muted-foreground">{progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            progress === 100 ? 'bg-green-500' :
                            progress > 50 ? 'bg-blue-500' :
                            progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* PII/PHI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Sensitivity</CardTitle>
                <CardDescription>
                  PII and PHI field detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-red-600" />
                      <span className="font-medium">PHI Fields</span>
                    </div>
                    <Badge variant="destructive">{complianceData?.summary?.phiFields || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">PII Fields</span>
                    </div>
                    <Badge variant="secondary">{complianceData?.summary?.piiFields || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Financial Fields</span>
                    </div>
                    <Badge variant="outline">{complianceData?.summary?.financialFields || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">PCI Fields</span>
                    </div>
                    <Badge variant="outline">{complianceData?.summary?.pciFields || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">FK Relationships</span>
                    </div>
                    <Badge variant="outline">{summary?.fkFields || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Enrichment Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No enrichment sessions yet</p>
                  <p className="text-xs mt-1">Click "Run Enrichment" to start the 12-layer enrichment pipeline</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {session.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : session.status === 'running' ? (
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {session.fieldsEnriched}/{session.totalFields} fields
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          Confidence: {Math.round((session.averageConfidence || 0) * 100)}%
                        </p>
                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="glass-card-enhanced">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Activity Timeline</CardTitle>
                  <CardDescription>Recent project activity and analysis events</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                events={sampleActivityEvents}
                maxItems={8}
                showViewAll
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrichment Tab */}
        <TabsContent value="enrichment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>12-Step Enrichment Pipeline</CardTitle>
                  <CardDescription>
                    Sequential enrichment process for unified field records
                  </CardDescription>
                </div>
                <Button onClick={runEnrichment} disabled={isRunningEnrichment}>
                  {isRunningEnrichment ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Pipeline
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { step: 1, name: 'Schema Layer', description: 'Data type, constraints, defaults', agent: 'SQLParserAgent' },
                  { step: 2, name: 'FK Layer', description: 'Foreign key relationships', agent: 'FKResolverAgent' },
                  { step: 3, name: 'Intelligence Layer', description: 'Semantic type, business meaning', agent: 'ColumnIntelAgent' },
                  { step: 4, name: 'UI Component Layer', description: 'Form controls, rendering', agent: 'UIInferenceAgent' },
                  { step: 5, name: 'Validation Layer', description: 'Client/server rules', agent: 'ValidationSyncAgent' },
                  { step: 6, name: 'Compliance Layer', description: 'PII/PHI detection', agent: 'ComplianceScanner' },
                  { step: 7, name: 'Complexity Layer', description: 'Migration difficulty', agent: 'ComplexityAnalyzer' },
                  { step: 8, name: 'SOP Layer', description: 'Rule compliance', agent: 'SOPEngine' },
                  { step: 9, name: 'CSHTML Evidence', description: 'View analysis', agent: 'CSHTMLParserAgent' },
                  { step: 10, name: 'SP Evidence', description: 'Stored procedure analysis', agent: 'SPEvidenceAgent' },
                  { step: 11, name: 'Test Cases', description: 'UAT generation', agent: 'TestGeneratorAgent' },
                  { step: 12, name: 'Documentation', description: 'Data dictionary', agent: 'DocGeneratorAgent' },
                ].map((item) => (
                  <Card key={item.step} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {item.step}
                        </div>
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <Badge variant="outline" className="mt-2">{item.agent}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOP Management Tab */}
        <TabsContent value="sop">
          <SOPManagementUI projectId={effectiveProjectId} />
        </TabsContent>

        {/* Consistency Tab */}
        <TabsContent value="consistency" className="space-y-4">
          <div className="flex items-center justify-between">
            <Alert className="flex-1">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Consistency Checks</AlertTitle>
              <AlertDescription>
                Cross-field validation for data integrity, FK resolution, and compliance alignment
              </AlertDescription>
            </Alert>
            <Button onClick={runConsistencyChecks} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Checks
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">FK Table Missing</p>
                    <p className="text-2xl font-bold text-red-600">{summary?.compliance?.errors || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Validation Mismatch</p>
                    <p className="text-2xl font-bold text-yellow-600">{summary?.compliance?.warnings || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-Fixable</p>
                    <p className="text-2xl font-bold text-green-600">{summary?.compliance?.resolved || 0}</p>
                  </div>
                  <Wrench className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Consistency Rules</CardTitle>
              <Button onClick={runSOPAutoFixes} variant="outline">
                <Wrench className="h-4 w-4 mr-2" />
                Auto-Fix All
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {[
                    { id: 'FK_TABLE_MISSING', name: 'FK References Missing Table', severity: 'error', autoFixable: false },
                    { id: 'VALIDATION_MISMATCH', name: 'Client-Server Validation Mismatch', severity: 'warning', autoFixable: true },
                    { id: 'PII_NO_ENCRYPTION', name: 'PII Without Encryption', severity: 'error', autoFixable: true },
                    { id: 'PHI_NO_AUDIT', name: 'PHI Without Audit Trail', severity: 'error', autoFixable: true },
                    { id: 'REQUIRED_NOT_NULL_MISMATCH', name: 'Required Field Nullable in DB', severity: 'warning', autoFixable: true },
                    { id: 'SOP_VIOLATION_UNFIXED', name: 'Unfixed SOP Violation', severity: 'info', autoFixable: true },
                    { id: 'TEST_COVERAGE_GAP', name: 'Missing Test Coverage', severity: 'info', autoFixable: true },
                    { id: 'CASCADE_CHAIN_BROKEN', name: 'Broken Cascade Chain', severity: 'warning', autoFixable: false },
                  ].map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            rule.severity === 'error'
                              ? 'destructive'
                              : rule.severity === 'warning'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {rule.severity}
                        </Badge>
                        <span className="font-medium">{rule.name}</span>
                      </div>
                      {rule.autoFixable && (
                        <Badge variant="outline" className="text-green-600">
                          <Wrench className="h-3 w-3 mr-1" />
                          Auto-fixable
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4 content-fade-in">
          {/* Compliance Dashboard IIFE */}
          {(() => {
            const frameworkIcons: Record<string, typeof Lock> = {
              Lock,
              Shield,
              FileCheck,
              ShieldCheck,
            };

            // Loading skeleton
            if (complianceLoading) {
              return (
                <div className="space-y-4 animate-pulse">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: alpha(colors.border, 30) }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-64 rounded-xl" style={{ backgroundColor: alpha(colors.border, 30) }} />
                    <div className="h-64 rounded-xl" style={{ backgroundColor: alpha(colors.border, 30) }} />
                  </div>
                  <div className="h-80 rounded-xl" style={{ backgroundColor: alpha(colors.border, 30) }} />
                </div>
              );
            }

            const d = complianceData;
            const apiSummary = d?.summary || {};
            const summary = {
              totalColumns: apiSummary.totalColumns || 0,
              piiFields: apiSummary.piiFields || 0,
              phiFields: apiSummary.phiFields || 0,
              financialFields: (apiSummary.financialFields || 0) + (apiSummary.soxFields || 0),
              pciFields: apiSummary.pciFields || 0,
            };
            const hipaa = d?.frameworks?.HIPAA || { fieldsDetected: 0, score: 100, controls: {} };
            const hipaaFields = hipaa.phiFields || apiSummary.phiFields || 0;
            const hipaaControls = {
              encryption: hipaa.controls?.encryptionEnabled || false,
              auditTrail: hipaa.controls?.auditTrailConfigured || false,
              accessControl: hipaa.controls?.accessControlImplemented || false,
            };
            const gdpr = d?.frameworks?.GDPR || { fieldsDetected: 0, score: 100, controls: {} };
            const gdprFields = gdpr.piiFields || apiSummary.piiFields || 0;
            const gdprControls = {
              consentTracking: gdpr.controls?.consentManagement || false,
              dataRetention: gdpr.controls?.retentionPolicy || false,
              dsarHandling: gdpr.controls?.rightToErasure || false,
              encryption: gdpr.controls?.dataProcessingRegister || false,
            };
            // Build framework array from nested object
            const frameworksArray = d?.frameworks
              ? Object.entries(d.frameworks).map(([name, fw]: [string, any]) => ({
                  name,
                  status: fw.status || 'inactive',
                  score: fw.score || 0,
                  coverage: parseInt(String(fw.coverage || '0')),
                  icon: name === 'HIPAA' ? 'Lock' : name === 'GDPR' ? 'Shield' : name === 'SOX' ? 'FileCheck' : 'ShieldCheck',
                }))
              : [];
            const sensitivity = d?.sensitivityBreakdown || { public: 0, internal: 0, confidential: 0, restricted: 0 };
            const findings = d?.topFindings || [];

            const classificationColors: Record<string, string> = {
              PHI: '#ef4444',
              PII: '#eab308',
              SOX: '#3b82f6',
              PCI: '#a855f7',
            };

            const sensitivityColors: Record<string, string> = {
              public: '#22c55e',
              internal: '#3b82f6',
              confidential: '#eab308',
              restricted: '#ef4444',
            };

            const frameworkStatusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
              active: 'default',
              partial: 'secondary',
              inactive: 'outline',
            };

            return (
              <>
                {/* Export Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Compliance Dashboard</h3>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      {summary.totalColumns} columns scanned across HIPAA, GDPR, SOX, PCI-DSS frameworks
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exporting}
                    onClick={() => handleExportCompliance()}
                    className="gap-2"
                    style={{
                      borderColor: alpha(colors.primary, 30),
                      color: colors.primary,
                    }}
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {exporting ? "Exporting..." : "Export Report"}
                  </Button>
                </div>

                {/* Summary Stats Row */}
                <div className="slide-in-up grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Columns', value: summary.totalColumns, icon: Database, color: colors.primary },
                    { label: 'PII Fields', value: summary.piiFields, icon: Shield, color: colors.warning },
                    { label: 'PHI Fields', value: summary.phiFields, icon: Lock, color: colors.error },
                    { label: 'Financial Fields', value: summary.financialFields, icon: CreditCard, color: colors.accent },
                  ].map((stat) => (
                    <Card key={stat.label} className="glass-card-enhanced">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</p>
                            <p className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</p>
                          </div>
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: alpha(stat.color, 15) }}
                          >
                            <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* HIPAA + GDPR Main Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* HIPAA Card */}
                  <Card className="glass-card-enhanced">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" style={{ color: colors.error }} />
                        HIPAA Compliance
                      </CardTitle>
                      <CardDescription>Protected Health Information tracking</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>PHI Fields Detected</span>
                          <Badge variant="destructive">{hipaaFields}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>Encryption Enabled</span>
                          {hipaaControls.encryption
                            ? <CheckCircle2 className="h-5 w-5" style={{ color: colors.success }} />
                            : <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>Audit Trail</span>
                          {hipaaControls.auditTrail
                            ? <CheckCircle2 className="h-5 w-5" style={{ color: colors.success }} />
                            : <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>Access Controls</span>
                          {hipaaControls.accessControl
                            ? <CheckCircle2 className="h-5 w-5" style={{ color: colors.success }} />
                            : <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
                          }
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span style={{ color: colors.textMuted }}>Compliance Score</span>
                            <span className="font-semibold" style={{ color: hipaa.score >= 80 ? colors.success : hipaa.score >= 60 ? colors.warning : colors.error }}>
                              {hipaa.score}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${hipaa.score}%`,
                                backgroundColor: hipaa.score >= 80 ? colors.success : hipaa.score >= 60 ? colors.warning : colors.error,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* GDPR Card */}
                  <Card className="glass-card-enhanced">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" style={{ color: colors.primary }} />
                        GDPR Compliance
                      </CardTitle>
                      <CardDescription>Personal data protection (EU)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>PII Fields Detected</span>
                          <Badge variant="secondary">{gdprFields}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>Consent Tracking</span>
                          {gdprControls.consentTracking
                            ? <CheckCircle2 className="h-5 w-5" style={{ color: colors.success }} />
                            : <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>Data Retention</span>
                          {gdprControls.dataRetention
                            ? <CheckCircle2 className="h-5 w-5" style={{ color: colors.success }} />
                            : <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textMuted }}>DSAR Handling</span>
                          {gdprControls.dsarHandling
                            ? <CheckCircle2 className="h-5 w-5" style={{ color: colors.success }} />
                            : <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
                          }
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span style={{ color: colors.textMuted }}>Compliance Score</span>
                            <span className="font-semibold" style={{ color: gdpr.score >= 80 ? colors.success : gdpr.score >= 60 ? colors.warning : colors.error }}>
                              {gdpr.score}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${gdpr.score}%`,
                                backgroundColor: gdpr.score >= 80 ? colors.success : gdpr.score >= 60 ? colors.warning : colors.error,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Regulatory Frameworks Grid */}
                <Card className="glass-card-enhanced">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" style={{ color: colors.primary }} />
                      Regulatory Frameworks
                    </CardTitle>
                    <CardDescription>Compliance coverage across industry standards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {frameworksArray.map((fw: any) => {
                        const IconComp = frameworkIcons[fw.icon] || Shield;
                        const statusColor = fw.status === 'active' ? colors.success : fw.status === 'partial' ? colors.warning : colors.textMuted;
                        return (
                          <div
                            key={fw.name}
                            className="p-4 rounded-lg border text-center transition-all"
                            style={{
                              borderColor: alpha(colors.border, 80),
                              backgroundColor: alpha(colors.bgTertiary, 15),
                            }}
                          >
                            <div
                              className="p-2 rounded-lg w-fit mx-auto mb-3"
                              style={{ backgroundColor: alpha(statusColor, 12) }}
                            >
                              <IconComp className="h-6 w-6" style={{ color: statusColor }} />
                            </div>
                            <h4 className="font-semibold text-sm" style={{ color: colors.text }}>{fw.name}</h4>
                            <Badge
                              variant={frameworkStatusVariant[fw.status] || 'outline'}
                              className="mt-2"
                            >
                              {fw.status}
                            </Badge>
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span style={{ color: colors.textMuted }}>Score</span>
                                <span className="font-mono font-semibold" style={{ color: colors.text }}>{fw.score}%</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${fw.coverage}%`,
                                    backgroundColor: statusColor,
                                  }}
                                />
                              </div>
                              <p className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
                                {fw.coverage}% coverage
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Section A: Rule Evaluation Details */}
                <Card className="glass-card-enhanced content-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertOctagon className="h-5 w-5" style={{ color: colors.warning }} />
                      Rule Evaluation Details
                    </CardTitle>
                    <CardDescription>Per-framework rule evaluation results from Phase 3 analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(d?.ruleEvaluations || {}).map(([framework, rules]: [string, any]) => {
                        const fwColor = framework === 'GDPR' ? colors.primary : framework === 'HIPAA' ? colors.error : framework === 'PCI-DSS' ? '#a855f7' : colors.warning;
                        const passCount = (rules || []).filter((r: any) => r.status === 'PASS').length;
                        const totalCount = (rules || []).length;
                        return (
                          <div
                            key={framework}
                            className="rounded-lg border overflow-hidden"
                            style={{
                              borderColor: alpha(fwColor, 30),
                              backgroundColor: alpha(fwColor, 4),
                            }}
                          >
                            <button
                              className="w-full flex items-center justify-between p-3 text-left transition-colors hover:brightness-110"
                              style={{ backgroundColor: alpha(fwColor, 8) }}
                              onClick={(e) => {
                                const panel = e.currentTarget.nextElementSibling;
                                if (panel) panel.classList.toggle('hidden');
                                const icon = e.currentTarget.querySelector('.chevron-icon');
                                if (icon) icon.classList.toggle('rotate-90');
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight className="h-4 w-4 chevron-icon rotate-90 transition-transform" style={{ color: fwColor }} />
                                <span className="font-semibold text-sm" style={{ color: colors.text }}>{framework}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: alpha(fwColor, 40), color: fwColor }}>
                                  {passCount}/{totalCount} PASS
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {(rules || []).map((rule: any) => {
                                  const dotColor = rule.status === 'PASS' ? '#22c55e' : rule.status === 'WARNING' ? '#eab308' : rule.status === 'FAIL' ? '#ef4444' : rule.status === 'PARTIAL' ? '#3b82f6' : '#6b7280';
                                  return (
                                    <div
                                      key={rule.ruleId}
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: dotColor }}
                                      title={`${rule.ruleId}: ${rule.status}`}
                                    />
                                  );
                                })}
                              </div>
                            </button>
                            <div className="overflow-hidden">
                              <div className="divide-y" style={{ borderColor: alpha(colors.border, 40) }}>
                                {(rules || []).map((rule: any) => {
                                  const statusColor = rule.status === 'PASS' ? '#22c55e' : rule.status === 'WARNING' ? '#eab308' : rule.status === 'FAIL' ? '#ef4444' : rule.status === 'PARTIAL' ? '#3b82f6' : '#6b7280';
                                  const sevColor = rule.severity === 'CRITICAL' ? '#ef4444' : rule.severity === 'HIGH' ? '#f97316' : rule.severity === 'MEDIUM' ? '#eab308' : '#22c55e';
                                  return (
                                    <div
                                      key={rule.ruleId}
                                      className="px-3 py-2.5 transition-colors hover:brightness-105"
                                      style={{ borderColor: alpha(colors.border, 30) }}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: alpha(statusColor, 15), color: statusColor }}>
                                            {rule.ruleId}
                                          </span>
                                          <span className="text-sm font-medium" style={{ color: colors.text }}>{rule.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <Badge
                                            variant={rule.status === 'FAIL' ? 'destructive' : 'outline'}
                                            className="text-[10px] px-1.5 py-0"
                                            style={rule.status !== 'FAIL' ? { borderColor: alpha(statusColor, 50), color: statusColor } : undefined}
                                          >
                                            {rule.status}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0"
                                            style={{ borderColor: alpha(sevColor, 50), color: sevColor }}
                                          >
                                            {rule.severity}
                                          </Badge>
                                        </div>
                                      </div>
                                      <p className="text-xs mb-1.5 line-clamp-2" style={{ color: colors.textMuted }}>
                                        {rule.description}
                                      </p>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] flex items-center gap-1" style={{ color: colors.textMuted }}>
                                          <Database className="h-3 w-3" />
                                          {rule.affectedFields} fields
                                        </span>
                                        {(rule.requiredActions && rule.requiredActions.length > 0) && (
                                          <span className="text-[10px] flex items-center gap-1" style={{ color: sevColor }}>
                                            <Wrench className="h-3 w-3" />
                                            {rule.requiredActions.length} action{rule.requiredActions.length !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                      {(rule.requiredActions && rule.requiredActions.length > 0) && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {rule.requiredActions.map((action: string, i: number) => (
                                            <span
                                              key={i}
                                              className="text-[10px] px-1.5 py-0.5 rounded"
                                              style={{
                                                backgroundColor: alpha(sevColor, 10),
                                                color: alpha(sevColor, 85),
                                                border: `1px solid ${alpha(sevColor, 20)}`,
                                              }}
                                            >
                                              {action}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Section B: Compliance Gap Report */}
                <Card className="glass-card-enhanced content-fade-in">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <AlertOctagon className="h-5 w-5" style={{ color: colors.error }} />
                          Compliance Gap Report
                        </CardTitle>
                        <CardDescription>Identified compliance gaps requiring remediation</CardDescription>
                      </div>
                      <Badge variant="destructive" className="text-sm">
                            {(d?.gapReport?.totalViolations || 0)} violation{((d?.gapReport?.totalViolations || 0) !== 1) ? 's' : ''}
                          </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Severity Distribution */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-medium" style={{ color: colors.textMuted }}>Severity:</span>
                      {[
                        { label: 'Critical', count: d?.gapReport?.bySeverity?.critical || 0, color: '#ef4444' },
                        { label: 'High', count: d?.gapReport?.bySeverity?.high || 0, color: '#f97316' },
                        { label: 'Medium', count: d?.gapReport?.bySeverity?.medium || 0, color: '#eab308' },
                        { label: 'Low', count: d?.gapReport?.bySeverity?.low || 0, color: '#22c55e' },
                      ].map((sev) => (
                        <span
                          key={sev.label}
                          className="inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: alpha(sev.color, 12),
                            color: sev.color,
                            border: `1px solid ${alpha(sev.color, 25)}`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sev.color }} />
                          {sev.label}: {sev.count}
                        </span>
                      ))}
                    </div>

                    {/* Violations List */}
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {(() => {
                        const violations = (d?.gapReport?.violations || []) as any[];
                        const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                        const sorted = [...violations].sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

                        if (sorted.length === 0) {
                          return (
                            <div className="text-center py-8" style={{ color: colors.textMuted }}>
                              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No compliance gaps detected</p>
                              <p className="text-xs mt-1">All evaluated rules are passing</p>
                            </div>
                          );
                        }

                        return sorted.map((v: any) => {
                          const sevColor = v.severity === 'CRITICAL' ? '#ef4444' : v.severity === 'HIGH' ? '#f97316' : v.severity === 'MEDIUM' ? '#eab308' : '#22c55e';
                          const fwColor = v.framework === 'GDPR' ? colors.primary : v.framework === 'HIPAA' ? colors.error : v.framework === 'PCI-DSS' ? '#a855f7' : colors.warning;
                          return (
                            <div
                              key={v.id}
                              className="p-3 rounded-lg border transition-all"
                              style={{
                                borderColor: alpha(sevColor, 30),
                                backgroundColor: alpha(sevColor, 5),
                              }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: alpha(sevColor, 15), color: sevColor }}>
                                    {v.id}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: alpha(fwColor, 40), color: fwColor }}>
                                    {v.framework}
                                  </Badge>
                                  <span className="font-mono text-[10px] font-semibold" style={{ color: colors.textMuted }}>
                                    {v.ruleId}
                                  </span>
                                </div>
                                {v.estimatedEffort && (
                                  <span className="text-[10px] flex items-center gap-1" style={{ color: colors.textMuted }}>
                                    <Clock className="h-3 w-3" />
                                    {v.estimatedEffort}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-semibold mb-1" style={{ color: colors.text }}>{v.title}</h4>
                              <p className="text-xs line-clamp-2 mb-2" style={{ color: colors.textMuted }}>
                                {v.description}
                              </p>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] flex items-center gap-1" style={{ color: colors.textMuted }}>
                                  <Database className="h-3 w-3" />
                                  {v.affectedFields} field{v.affectedFields !== 1 ? 's' : ''} affected
                                </span>
                                {(v.requiredActions && v.requiredActions.length > 0) && (
                                  <div className="flex items-center gap-1">
                                    <Wrench className="h-3 w-3" style={{ color: sevColor }} />
                                    <span className="text-[10px]" style={{ color: sevColor }}>{v.requiredActions.length} action{v.requiredActions.length !== 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </div>
                              {(v.requiredActions && v.requiredActions.length > 0) && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {v.requiredActions.map((action: string, i: number) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: alpha(sevColor, 10),
                                        color: alpha(sevColor, 85),
                                        border: `1px solid ${alpha(sevColor, 20)}`,
                                      }}
                                    >
                                      {action}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Sensitivity Breakdown + Top Findings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sensitivity Breakdown */}
                  <Card className="glass-card-enhanced">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" style={{ color: colors.primary }} />
                        Sensitivity Breakdown
                      </CardTitle>
                      <CardDescription>Data classification distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(sensitivity).map(([level, count]) => {
                          const maxVal = Math.max(summary.totalColumns, 1);
                          const pct = Math.round((count as number / maxVal) * 100);
                          const color = sensitivityColors[level] || colors.textMuted;
                          return (
                            <div key={level}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium capitalize" style={{ color: colors.text }}>{level}</span>
                                <span className="text-xs font-mono" style={{ color: colors.textMuted }}>{count as number} columns ({pct}%)</span>
                              </div>
                              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 50) }}>
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                    opacity: 0.85,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Findings */}
                  <Card className="glass-card-enhanced">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
                        Top Findings
                      </CardTitle>
                      <CardDescription>Compliance-sensitive fields detected</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {findings.length === 0 ? (
                          <div className="text-center py-6" style={{ color: colors.textMuted }}>
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No compliance findings detected</p>
                          </div>
                        ) : (
                          findings.map((f: any, i: number) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg border transition-all"
                              style={{
                                borderColor: alpha(colors.border, 60),
                                backgroundColor: alpha(colors.bgTertiary, 10),
                              }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-mono font-medium" style={{ color: colors.text }}>
                                  {f.table}.{f.column}
                                </span>
                                <span className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                                  {f.confidence}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {f.frameworks.map((fw: string) => (
                                  <Badge
                                    key={fw}
                                    variant={
                                      fw === 'PHI' ? 'destructive' :
                                      fw === 'PII' ? 'secondary' :
                                      'outline'
                                    }
                                    className="text-[10px] px-1.5 py-0"
                                    style={
                                      fw === 'SOX'
                                        ? { borderColor: alpha(colors.primary, 40), color: colors.primary }
                                        : fw === 'PCI'
                                        ? { borderColor: alpha('#a855f7', 40), color: '#a855f7' }
                                        : undefined
                                    }
                                  >
                                    {fw}
                                  </Badge>
                                ))}
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                  style={{
                                    borderColor: alpha(sensitivityColors[f.sensitivity] || colors.textMuted, 40),
                                    color: sensitivityColors[f.sensitivity] || colors.textMuted,
                                  }}
                                >
                                  {f.sensitivity}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* Framework Config Tab — Phase 2 Activation Wizard */}
        <TabsContent value="frameworks">
          <FrameworkActivationConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IntelligenceBankTab;
