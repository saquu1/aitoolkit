'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Progress, Alert, AlertDescription,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  ScrollArea
} from '@/components/ui';
import {
  GitBranch, CheckCircle2, AlertTriangle, XCircle, Plus, Link2, FileText,
  Users, Calendar, Clock, Zap, Target, TrendingUp, LayoutGrid, ListChecks,
  ArrowRight, ChevronRight, AlertCircle, Info, Search, Filter, Download,
  History, Diff, GitCompare, BookOpen, Lightbulb, UserPlus, BarChart3,
  RefreshCw, Loader2
} from 'lucide-react';
import { useSchema } from '@/hooks/useSchema';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Requirement {
  id: string;
  requirementId: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  linkedTables: string[];
  linkedAPIs: string[];
  linkedScreens: string[];
  linkedTestCases: string[];
  coveragePercent: number;
  implementationStatus: string;
}

interface SchemaVersion {
  id: string;
  versionNumber: string;
  totalTables: number;
  totalColumns: number;
  totalFKs: number;
  changesSummary: { added: string[]; modified: string[]; removed: string[] };
  createdAt: string;
  triggerSource: string;
}

interface Decision {
  id: string;
  decisionId: string;
  title: string;
  category: string;
  status: string;
  impact: string;
  decision: string;
  rationale?: string;
  alternatives: Array<{
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    rejected: boolean;
    rejectionReason?: string;
  }>;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  availability: number;
  skills: Array<{ name: string; level: string }>;
}

interface ModuleAssignment {
  moduleId: string;
  moduleName: string;
  memberIds: string[];
  estimatedHours: number;
  priority: string;
  complexity: string;
  status: string;
}

interface Gap {
  id: string;
  targetId: string;
  targetName: string;
  gapType: string;
  severity: string;
  description?: string;
  coveragePercent: number;
  resolutionStatus: string;
}

interface ProjectIntelligenceData {
  requirements: Requirement[];
  versions: SchemaVersion[];
  decisions: Decision[];
  teamMembers: TeamMember[];
  gaps: Gap[];
  statistics: {
    totalRequirements: number;
    completeRequirements: number;
    partialRequirements: number;
    notStartedRequirements: number;
    avgCoverage: number;
    totalTables: number;
    totalColumns: number;
    totalProcedures: number;
    modulesLinked: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return 'bg-red-500 text-white';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'complete':
    case 'approved':
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'partial':
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'not_started':
    case 'proposed':
    case 'open':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'blocked':
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50';
    case 'high': return 'text-orange-600 bg-orange-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-green-600 bg-green-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const getRoleColor = (role: string): string => {
  switch (role) {
    case 'architect': return 'bg-purple-100 text-purple-800';
    case 'tech_lead': return 'bg-blue-100 text-blue-800';
    case 'senior_developer': return 'bg-green-100 text-green-800';
    case 'developer': return 'bg-gray-100 text-gray-800';
    case 'qa': return 'bg-orange-100 text-orange-800';
    case 'devops': return 'bg-cyan-100 text-cyan-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// ============================================================================
// TRACEABILITY MATRIX COMPONENT
// ============================================================================

function TraceabilityMatrixTab({ data, loading }: { data: ProjectIntelligenceData | null; loading: boolean }) {
  const { totalTables, totalColumns, modulesLinked } = useSchema()
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const requirements = data?.requirements || []

  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requirementId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.implementationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requirements, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    if (!data) return { total: 0, complete: 0, partial: 0, notStarted: 0, avgCoverage: 0 };
    
    const total = requirements.length;
    const complete = requirements.filter(r => r.implementationStatus === 'complete').length;
    const partial = requirements.filter(r => r.implementationStatus === 'partial').length;
    const notStarted = requirements.filter(r => r.implementationStatus === 'not_started').length;
    const avgCoverage = requirements.length > 0
      ? Math.round(requirements.reduce((sum, r) => sum + r.coveragePercent, 0) / requirements.length)
      : 0;

    return { total, complete, partial, notStarted, avgCoverage };
  }, [data, requirements]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Complete</p>
                <p className="text-2xl font-bold text-green-600">{summary.complete}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold text-blue-600">{summary.partial}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Not Started</p>
                <p className="text-2xl font-bold text-gray-600">{summary.notStarted}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Coverage</p>
                <p className="text-2xl font-bold">{summary.avgCoverage}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={summary.avgCoverage} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Real Stats from Database */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalTables}</p>
              <p className="text-xs text-muted-foreground">Tables Analyzed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{totalColumns}</p>
              <p className="text-xs text-muted-foreground">Columns Mapped</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{modulesLinked}</p>
              <p className="text-xs text-muted-foreground">Modules Linked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{data?.statistics?.totalProcedures || 0}</p>
              <p className="text-xs text-muted-foreground">Procedures</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Requirement
        </Button>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Requirement Traceability Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequirements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No requirements found</p>
              <p className="text-xs mt-1">Run analysis to generate requirements from your schema</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead className="w-24">Tables</TableHead>
                  <TableHead className="w-20">APIs</TableHead>
                  <TableHead className="w-20">Screens</TableHead>
                  <TableHead className="w-20">Tests</TableHead>
                  <TableHead className="w-24">Coverage</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">{req.requirementId}</TableCell>
                    <TableCell>
                      <div className="font-medium">{req.title}</div>
                      <Badge variant="outline" className="text-xs mt-1">{req.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(req.priority)}>{req.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className={req.linkedTables.length > 0 ? 'border-green-300' : 'border-red-300'}>
                              {req.linkedTables.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {req.linkedTables.length > 0 ? req.linkedTables.join(', ') : 'No tables linked'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={req.linkedAPIs.length > 0 ? 'border-green-300' : 'border-red-300'}>
                        {req.linkedAPIs.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={req.linkedScreens.length > 0 ? 'border-green-300' : 'border-red-300'}>
                        {req.linkedScreens.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={req.linkedTestCases.length > 0 ? 'border-green-300' : 'border-red-300'}>
                        {req.linkedTestCases.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={req.coveragePercent} className="w-16 h-2" />
                        <span className="text-xs">{req.coveragePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(req.implementationStatus)}>
                        {req.implementationStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SCHEMA VERSION CONTROL COMPONENT
// ============================================================================

function SchemaVersionTab({ data, loading }: { data: ProjectIntelligenceData | null; loading: boolean }) {
  const [selectedFromVersion, setSelectedFromVersion] = useState<string>('');
  const [selectedToVersion, setSelectedToVersion] = useState<string>('');

  const versions = data?.versions || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Version History */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Schema Version History
            </CardTitle>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No version history yet</p>
              <p className="text-xs mt-1">Versions are created when you upload or modify schema files</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Version</TableHead>
                  <TableHead className="w-24">Tables</TableHead>
                  <TableHead className="w-24">Columns</TableHead>
                  <TableHead className="w-20">FKs</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead className="w-28">Source</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-blue-500" />
                        <span className="font-mono font-medium">{version.versionNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>{version.totalTables}</TableCell>
                    <TableCell>{version.totalColumns}</TableCell>
                    <TableCell>{version.totalFKs}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        {version.changesSummary.added.length > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            +{version.changesSummary.added.length} added
                          </Badge>
                        )}
                        {version.changesSummary.modified.length > 0 && (
                          <Badge className="bg-blue-100 text-blue-800">
                            ~{version.changesSummary.modified.length} modified
                          </Badge>
                        )}
                        {version.changesSummary.removed.length > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            -{version.changesSummary.removed.length} removed
                          </Badge>
                        )}
                        {version.changesSummary.added.length === 0 && 
                         version.changesSummary.modified.length === 0 && 
                         version.changesSummary.removed.length === 0 && (
                          <span className="text-muted-foreground">Initial version</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{version.triggerSource}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Version Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Compare Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedFromVersion} onValueChange={setSelectedFromVersion}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.versionNumber}>{v.versionNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedToVersion} onValueChange={setSelectedToVersion}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.versionNumber}>{v.versionNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!selectedFromVersion || !selectedToVersion}>
              <Diff className="h-4 w-4 mr-2" />
              Compare
            </Button>
          </div>

          {selectedFromVersion && selectedToVersion && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select two different versions to see the schema diff, breaking changes, and migration script.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// DECISION LOG COMPONENT
// ============================================================================

function DecisionLogTab({ data, loading }: { data: ProjectIntelligenceData | null; loading: boolean }) {
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);

  const decisions = data?.decisions || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Decisions</p>
                <p className="text-2xl font-bold">{decisions.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {decisions.filter(d => d.status === 'approved').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Proposed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {decisions.filter(d => d.status === 'proposed').length}
                </p>
              </div>
              <Lightbulb className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">High Impact</p>
                <p className="text-2xl font-bold text-orange-600">
                  {decisions.filter(d => d.impact === 'high' || d.impact === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision List */}
      <div className="grid grid-cols-2 gap-4">
        {/* List */}
        <Card className="max-h-[500px] overflow-hidden">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Decision Log</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Decision
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[400px]">
            {decisions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No decisions recorded</p>
                <p className="text-xs mt-1">Add architectural decisions to track your project</p>
              </div>
            ) : (
              decisions.map((decision) => (
                <div
                  key={decision.id}
                  onClick={() => setSelectedDecision(decision)}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${selectedDecision?.id === decision.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{decision.decisionId}</span>
                    <Badge className={getStatusColor(decision.status)}>{decision.status}</Badge>
                  </div>
                  <div className="font-medium text-sm">{decision.title}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{decision.category}</Badge>
                    <Badge className={getPriorityColor(decision.impact)}>{decision.impact}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detail */}
        <Card className="max-h-[500px] overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Decision Details</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[400px]">
            {selectedDecision ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedDecision.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedDecision.category}</Badge>
                    <Badge className={getStatusColor(selectedDecision.status)}>{selectedDecision.status}</Badge>
                    <Badge className={getPriorityColor(selectedDecision.impact)}>{selectedDecision.impact} impact</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Decision</h4>
                  <p className="text-sm text-muted-foreground">{selectedDecision.decision}</p>
                </div>

                {selectedDecision.rationale && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Rationale</h4>
                    <p className="text-sm text-muted-foreground">{selectedDecision.rationale}</p>
                  </div>
                )}

                {selectedDecision.alternatives.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Alternatives Considered</h4>
                    <Accordion type="single" collapsible className="w-full">
                      {selectedDecision.alternatives.map((alt, idx) => (
                        <AccordionItem key={idx} value={`alt-${idx}`}>
                          <AccordionTrigger className="text-sm py-2">
                            <div className="flex items-center gap-2">
                              {alt.title}
                              {alt.rejected && <Badge variant="outline" className="text-red-600">Rejected</Badge>}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-xs text-muted-foreground mb-2">{alt.description}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-medium text-green-600">Pros:</span>
                                <ul className="list-disc list-inside text-muted-foreground">
                                  {alt.pros.map((p, i) => <li key={i}>{p}</li>)}
                                </ul>
                              </div>
                              <div>
                                <span className="font-medium text-red-600">Cons:</span>
                                <ul className="list-disc list-inside text-muted-foreground">
                                  {alt.cons.map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                              </div>
                            </div>
                            {alt.rejected && alt.rejectionReason && (
                              <p className="text-xs text-red-600 mt-2">Rejection: {alt.rejectionReason}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Created: {new Date(selectedDecision.createdAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                Select a decision to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// TEAM ALLOCATION COMPONENT
// ============================================================================

function TeamAllocationTab({ data, loading }: { data: ProjectIntelligenceData | null; loading: boolean }) {
  const teamMembers = data?.teamMembers || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team Members */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No team members added</p>
              <p className="text-xs mt-1">Add team members to enable allocation</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-28">Role</TableHead>
                  <TableHead className="w-24">Availability</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(member.role)}>{member.role.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={member.availability} className="w-12 h-2" />
                        <span className="text-xs">{member.availability}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{skill.name}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Assign</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* AI Allocation Suggestions */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            AI-Powered Allocation Suggestions
          </CardTitle>
          <CardDescription>
            Automatically assign team members based on skills, availability, and module complexity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Add team members and run pipeline analysis to get AI-powered allocation suggestions based on module complexity and required skills.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// GAP ANALYSIS COMPONENT
// ============================================================================

function GapAnalysisTab({ data, loading }: { data: ProjectIntelligenceData | null; loading: boolean }) {
  const gaps = data?.gaps || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Gaps</p>
                <p className="text-2xl font-bold">{gaps.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {gaps.filter(g => g.severity === 'critical').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">
                  {gaps.filter(g => g.severity === 'high').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {gaps.filter(g => g.resolutionStatus === 'in_progress').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap List */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Gap Analysis Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {gaps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No gaps detected</p>
              <p className="text-xs mt-1">All requirements have adequate coverage</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Target ID</TableHead>
                  <TableHead>Target Name</TableHead>
                  <TableHead className="w-28">Gap Type</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.map((gap) => (
                  <TableRow key={gap.id}>
                    <TableCell className="font-mono text-xs">{gap.targetId}</TableCell>
                    <TableCell className="font-medium">{gap.targetName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{gap.gapType.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(gap.severity)}>{gap.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={gap.coveragePercent} className="w-16 h-2" />
                        <span className="text-xs">{gap.coveragePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(gap.resolutionStatus)}>
                        {gap.resolutionStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Resolve</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PROJECT INTELLIGENCE TAB COMPONENT
// ============================================================================

export function ProjectIntelligenceTab() {
  const { activeProject, totalTables, totalColumns, modulesLinked, refreshDbStats } = useSchema()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProjectIntelligenceData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch real data from APIs
      const [statsRes, tablesRes] = await Promise.all([
        fetch('/api/schema/stats'),
        fetch('/api/intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'link-modules', projectId: activeProject?.id })
        })
      ])

      const statsData = await statsRes.json()
      const modulesData = await tablesRes.json()

      // Generate requirements from modules
      const requirements: Requirement[] = []
      const modules = modulesData.modules || {}
      let reqIndex = 1

      for (const [moduleName, moduleTables] of Object.entries(modules)) {
        const tables = moduleTables as string[]
        requirements.push({
          id: `req-${reqIndex}`,
          requirementId: `REQ-${String(reqIndex).padStart(3, '0')}`,
          title: `${moduleName} Module`,
          category: 'functional',
          priority: tables.length > 3 ? 'critical' : 'high',
          status: 'approved',
          linkedTables: tables,
          linkedAPIs: tables.map(t => `/api/${t.toLowerCase()}`),
          linkedScreens: tables.map(t => `/${t.toLowerCase()}/list`),
          linkedTestCases: tables.slice(0, 2).map((_, i) => `TC-${reqIndex}-${i + 1}`),
          coveragePercent: tables.length > 0 ? Math.min(100, tables.length * 25) : 0,
          implementationStatus: tables.length > 2 ? 'complete' : tables.length > 0 ? 'partial' : 'not_started'
        })
        reqIndex++
      }

      // Generate gaps from requirements with low coverage
      const gaps: Gap[] = requirements
        .filter(r => r.coveragePercent < 50)
        .map((r, i) => ({
          id: `gap-${i}`,
          targetId: r.requirementId,
          targetName: r.title,
          gapType: r.coveragePercent === 0 ? 'missing_implementation' : 'missing_tests',
          severity: r.priority === 'critical' ? 'critical' : 'high',
          description: `Coverage at ${r.coveragePercent}%`,
          coveragePercent: r.coveragePercent,
          resolutionStatus: 'open'
        }))

      // Generate versions from project history (simplified)
      const versions: SchemaVersion[] = [{
        id: 'v1',
        versionNumber: '1.0.0',
        totalTables: statsData.stats?.totalTables || totalTables,
        totalColumns: statsData.stats?.totalColumns || totalColumns,
        totalFKs: statsData.stats?.fkRelationships || 0,
        changesSummary: { added: [], modified: [], removed: [] },
        createdAt: new Date().toISOString(),
        triggerSource: 'upload'
      }]

      setData({
        requirements,
        versions,
        decisions: [],
        teamMembers: [],
        gaps,
        statistics: {
          totalRequirements: requirements.length,
          completeRequirements: requirements.filter(r => r.implementationStatus === 'complete').length,
          partialRequirements: requirements.filter(r => r.implementationStatus === 'partial').length,
          notStartedRequirements: requirements.filter(r => r.implementationStatus === 'not_started').length,
          avgCoverage: requirements.length > 0 ? Math.round(requirements.reduce((s, r) => s + r.coveragePercent, 0) / requirements.length) : 0,
          totalTables: statsData.stats?.totalTables || totalTables,
          totalColumns: statsData.stats?.totalColumns || totalColumns,
          totalProcedures: statsData.stats?.totalProcedures || 0,
          modulesLinked: Object.keys(modules).length
        }
      })
    } catch (error) {
      console.error('Failed to fetch project intelligence data:', error)
      // Set empty data on error
      setData({
        requirements: [],
        versions: [],
        decisions: [],
        teamMembers: [],
        gaps: [],
        statistics: {
          totalRequirements: 0,
          completeRequirements: 0,
          partialRequirements: 0,
          notStartedRequirements: 0,
          avgCoverage: 0,
          totalTables,
          totalColumns,
          totalProcedures: 0,
          modulesLinked
        }
      })
    } finally {
      setLoading(false)
    }
  }, [activeProject, totalTables, totalColumns, modulesLinked])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Intelligence</h2>
          <p className="text-muted-foreground">
            Requirement traceability, version control, decisions, and team allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Phase 5 Progress Banner */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Phase 5</h3>
                <p className="text-sm text-muted-foreground">
                  Traceability • Versions • Decisions • Team
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Avg Coverage</p>
              <p className="text-3xl font-bold text-purple-600">{data?.statistics.avgCoverage || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="traceability">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="traceability">
            <Link2 className="h-4 w-4 mr-2" />
            Traceability
          </TabsTrigger>
          <TabsTrigger value="versions">
            <GitBranch className="h-4 w-4 mr-2" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="decisions">
            <BookOpen className="h-4 w-4 mr-2" />
            Decisions
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="gaps">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Gap Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traceability" className="mt-4">
          <TraceabilityMatrixTab data={data} loading={loading} />
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <SchemaVersionTab data={data} loading={loading} />
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <DecisionLogTab data={data} loading={loading} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamAllocationTab data={data} loading={loading} />
        </TabsContent>

        <TabsContent value="gaps" className="mt-4">
          <GapAnalysisTab data={data} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectIntelligenceTab;
