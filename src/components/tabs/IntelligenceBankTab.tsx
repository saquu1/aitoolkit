'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSchema } from '@/hooks/useSchema';
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
} from 'lucide-react';
import { SOPManagementUI } from '@/components/SOPManagementUI';

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
// INTELLIGENCE BANK TAB COMPONENT
// =============================================================================

interface IntelligenceBankTabProps {
  projectId?: string;
}

export function IntelligenceBankTab({ projectId = 'default-project' }: IntelligenceBankTabProps) {
  // Connect to shared schema state
  const { 
    totalTables: sharedTotalTables,
    totalColumns: sharedTotalColumns,
    parseResult,
    linkedModules,
    modulesLinked,
    fkResolvedPercent: sharedFkPercent
  } = useSchema()
  
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [sessions, setSessions] = useState<EnrichmentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunningEnrichment, setIsRunningEnrichment] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/intelligence-bank?projectId=${projectId}&action=summary`);
      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch enrichment sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/intelligence-bank?projectId=${projectId}&action=enrichment-sessions`);
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSummary();
    fetchSessions();
  }, [fetchSummary, fetchSessions]);

  // Run enrichment
  const runEnrichment = async () => {
    setIsRunningEnrichment(true);
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-enrichment', projectId }),
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
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-consistency-checks', projectId }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchSummary();
      }
    } catch (error) {
      console.error('Failed to run consistency checks:', error);
    }
  };

  // Calculate overall health score
  const healthScore = summary
    ? Math.round(
        (summary.enrichmentCompleteness * 0.4 +
          summary.averageConfidence * 0.3 +
          (summary.compliance.errors === 0 ? 1 : 0.5) * 0.3) *
          100
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Unified Intelligence Data Bank</h2>
          <p className="text-muted-foreground">
            Central repository for field intelligence, SOP compliance, and consistency checks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSummary}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runEnrichment} disabled={isRunningEnrichment}>
            {isRunningEnrichment ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Enrichment
          </Button>
        </div>
      </div>

      {/* Health Score Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
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
                <span>+5% from last run</span>
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
                <p className="text-2xl font-bold">{summary?.totalFields || 0}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.totalTables || 0} tables analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((summary?.averageConfidence || 0) * 100)}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <Progress
              value={(summary?.averageConfidence || 0) * 100}
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
                  <span className="text-red-600">{summary?.compliance.errors || 0}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-yellow-600">{summary?.compliance.warnings || 0}</span>
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.compliance.resolved || 0} issues resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SOP Rules</p>
                <p className="text-2xl font-bold">{summary?.sop.totalRules || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.sop.activeRules || 0} active rules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
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
                  {[
                    { name: 'Schema Layer', progress: 100, color: 'bg-green-500' },
                    { name: 'FK Layer', progress: 85, color: 'bg-blue-500' },
                    { name: 'Intelligence Layer', progress: 90, color: 'bg-purple-500' },
                    { name: 'UI Component Layer', progress: 75, color: 'bg-orange-500' },
                    { name: 'Validation Layer', progress: 80, color: 'bg-yellow-500' },
                    { name: 'Compliance Layer', progress: 70, color: 'bg-red-500' },
                  ].map((layer) => (
                    <div key={layer.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{layer.name}</span>
                        <span className="text-muted-foreground">{layer.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${layer.color} transition-all`}
                          style={{ width: `${layer.progress}%` }}
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
                      <Shield className="h-5 w-5 text-red-600" />
                      <span className="font-medium">PHI Fields</span>
                    </div>
                    <Badge variant="destructive">{summary?.phiFields || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">PII Fields</span>
                    </div>
                    <Badge variant="secondary">{summary?.piiFields || 0}</Badge>
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
                <p className="text-muted-foreground text-center py-4">
                  No enrichment sessions yet. Click "Run Enrichment" to start.
                </p>
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
                          <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
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
                          Confidence: {Math.round(session.averageConfidence * 100)}%
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
        </TabsContent>

        {/* Enrichment Tab */}
        <TabsContent value="enrichment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>12-Step Enrichment Pipeline</CardTitle>
              <CardDescription>
                Sequential enrichment process for unified field records
              </CardDescription>
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
                  <Card key={item.step}>
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
          <SOPManagementUI projectId={projectId} />
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
                    <p className="text-2xl font-bold text-red-600">{summary?.compliance.errors || 0}</p>
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
                    <p className="text-2xl font-bold text-yellow-600">{summary?.compliance.warnings || 0}</p>
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
                    <p className="text-2xl font-bold text-green-600">{summary?.compliance.resolved || 0}</p>
                  </div>
                  <Wrench className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Consistency Rules</CardTitle>
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
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>HIPAA Compliance</CardTitle>
                <CardDescription>Protected Health Information tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>PHI Fields Detected</span>
                    <Badge variant="destructive">{summary?.phiFields || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Encryption Enabled</span>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Audit Trail Configured</span>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <Progress value={85} className="mt-2" />
                  <p className="text-sm text-muted-foreground">85% HIPAA compliant</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GDPR Compliance</CardTitle>
                <CardDescription>Personal data protection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>PII Fields Detected</span>
                    <Badge variant="secondary">{summary?.piiFields || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Consent Tracking</span>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Retention Policy</span>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <Progress value={70} className="mt-2" />
                  <p className="text-sm text-muted-foreground">70% GDPR compliant</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regulatory Frameworks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { name: 'HIPAA', status: 'active', coverage: 85 },
                  { name: 'GDPR', status: 'partial', coverage: 70 },
                  { name: 'SOX', status: 'inactive', coverage: 0 },
                  { name: 'PCI-DSS', status: 'partial', coverage: 45 },
                ].map((framework) => (
                  <div key={framework.name} className="p-4 border rounded-lg text-center">
                    <h4 className="font-semibold">{framework.name}</h4>
                    <Badge
                      variant={
                        framework.status === 'active'
                          ? 'default'
                          : framework.status === 'partial'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="mt-2"
                    >
                      {framework.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      {framework.coverage}% coverage
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IntelligenceBankTab;
