'use client';

import React, { useState, useMemo } from 'react';
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
  History, Diff, GitCompare, BookOpen, Lightbulb, UserPlus, BarChart3
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

// ============================================================================
// MOCK DATA
// ============================================================================

const mockRequirements: Requirement[] = [
  {
    id: '1',
    requirementId: 'REQ-001',
    title: 'Patient Registration',
    category: 'functional',
    priority: 'critical',
    status: 'approved',
    linkedTables: ['Patients', 'PatientDemographics', 'InsuranceInfo'],
    linkedAPIs: ['/api/patients', '/api/patients/register'],
    linkedScreens: ['PatientRegistrationForm', 'PatientList'],
    linkedTestCases: ['TC-001', 'TC-002', 'TC-003'],
    coveragePercent: 100,
    implementationStatus: 'complete'
  },
  {
    id: '2',
    requirementId: 'REQ-002',
    title: 'Appointment Scheduling',
    category: 'functional',
    priority: 'high',
    status: 'in_progress',
    linkedTables: ['Appointments', 'AppointmentTypes'],
    linkedAPIs: ['/api/appointments'],
    linkedScreens: ['AppointmentCalendar'],
    linkedTestCases: [],
    coveragePercent: 60,
    implementationStatus: 'partial'
  },
  {
    id: '3',
    requirementId: 'REQ-003',
    title: 'Electronic Health Records',
    category: 'functional',
    priority: 'critical',
    status: 'approved',
    linkedTables: [],
    linkedAPIs: [],
    linkedScreens: [],
    linkedTestCases: [],
    coveragePercent: 0,
    implementationStatus: 'not_started'
  },
  {
    id: '4',
    requirementId: 'REQ-004',
    title: 'HIPAA Compliance',
    category: 'compliance',
    priority: 'critical',
    status: 'approved',
    linkedTables: ['AuditLogs', 'PatientConsent'],
    linkedAPIs: [],
    linkedScreens: [],
    linkedTestCases: ['TC-010'],
    coveragePercent: 40,
    implementationStatus: 'partial'
  }
];

const mockSchemaVersions: SchemaVersion[] = [
  {
    id: 'v1',
    versionNumber: '1.0.0',
    totalTables: 45,
    totalColumns: 320,
    totalFKs: 67,
    changesSummary: { added: [], modified: [], removed: [] },
    createdAt: '2024-01-15T10:00:00Z',
    triggerSource: 'upload'
  },
  {
    id: 'v2',
    versionNumber: '1.1.0',
    totalTables: 48,
    totalColumns: 345,
    totalFKs: 72,
    changesSummary: { 
      added: ['PatientConsent', 'AuditLogs', 'NotificationTemplates'], 
      modified: ['Patients', 'Appointments'], 
      removed: [] 
    },
    createdAt: '2024-01-20T14:30:00Z',
    triggerSource: 'upload'
  },
  {
    id: 'v3',
    versionNumber: '1.2.0',
    totalTables: 50,
    totalColumns: 362,
    totalFKs: 78,
    changesSummary: { 
      added: ['LabResults', 'RadiologyReports'], 
      modified: ['PatientConsent'], 
      removed: ['TempTable'] 
    },
    createdAt: '2024-01-28T09:15:00Z',
    triggerSource: 'migration'
  }
];

const mockDecisions: Decision[] = [
  {
    id: '1',
    decisionId: 'DEC-001',
    title: 'Use PostgreSQL over MySQL',
    category: 'database',
    status: 'approved',
    impact: 'high',
    decision: 'PostgreSQL will be used as the primary database',
    rationale: 'Better support for JSON types, full-text search, and extensibility required for healthcare data',
    alternatives: [
      {
        title: 'MySQL',
        description: 'Popular open-source RDBMS',
        pros: ['Wider adoption', 'Easier hiring'],
        cons: ['Limited JSON support', 'No native full-text search'],
        rejected: true,
        rejectionReason: 'Limited advanced features needed for HIS'
      },
      {
        title: 'SQL Server',
        description: 'Microsoft enterprise database',
        pros: ['Enterprise features', 'Excellent tooling'],
        cons: ['Licensing costs', 'Platform lock-in'],
        rejected: true,
        rejectionReason: 'Cost prohibitive for initial deployment'
      }
    ],
    createdAt: '2024-01-10T11:00:00Z'
  },
  {
    id: '2',
    decisionId: 'DEC-002',
    title: 'REST API over GraphQL',
    category: 'api',
    status: 'approved',
    impact: 'medium',
    decision: 'REST API architecture will be used for all external APIs',
    rationale: 'Team expertise and simpler caching strategy',
    alternatives: [],
    createdAt: '2024-01-12T14:00:00Z'
  },
  {
    id: '3',
    decisionId: 'DEC-003',
    title: 'Multi-tenant Architecture',
    category: 'architecture',
    status: 'proposed',
    impact: 'critical',
    decision: 'Implement shared database multi-tenancy with row-level security',
    rationale: 'Cost-effective scaling with proper data isolation',
    alternatives: [
      {
        title: 'Separate Database per Tenant',
        description: 'Complete isolation with separate databases',
        pros: ['Maximum isolation', 'Easy backup/restore'],
        cons: ['Higher costs', 'Complex maintenance'],
        rejected: false
      }
    ],
    createdAt: '2024-01-25T09:00:00Z'
  }
];

const mockTeamMembers: TeamMember[] = [
  { id: 'tm1', name: 'John Smith', role: 'tech_lead', availability: 80, skills: [{ name: 'TypeScript', level: 'expert' }, { name: 'React', level: 'expert' }] },
  { id: 'tm2', name: 'Sarah Johnson', role: 'senior_developer', availability: 100, skills: [{ name: 'TypeScript', level: 'advanced' }, { name: 'PostgreSQL', level: 'advanced' }] },
  { id: 'tm3', name: 'Mike Chen', role: 'developer', availability: 100, skills: [{ name: 'React', level: 'intermediate' }, { name: 'Node.js', level: 'intermediate' }] },
  { id: 'tm4', name: 'Emily Davis', role: 'architect', availability: 60, skills: [{ name: 'System Design', level: 'expert' }, { name: 'Healthcare IT', level: 'expert' }] },
  { id: 'tm5', name: 'Alex Turner', role: 'qa', availability: 100, skills: [{ name: 'Test Automation', level: 'advanced' }, { name: 'Cypress', level: 'advanced' }] }
];

const mockGaps: Gap[] = [
  { id: 'g1', targetId: 'REQ-003', targetName: 'Electronic Health Records', gapType: 'missing_implementation', severity: 'critical', description: 'No tables or APIs implemented', coveragePercent: 0, resolutionStatus: 'open' },
  { id: 'g2', targetId: 'REQ-004', targetName: 'HIPAA Compliance', gapType: 'missing_tests', severity: 'high', description: 'Only 1 test case for compliance', coveragePercent: 40, resolutionStatus: 'in_progress' },
  { id: 'g3', targetId: 'REQ-002', targetName: 'Appointment Scheduling', gapType: 'missing_docs', severity: 'medium', description: 'Missing API documentation', coveragePercent: 60, resolutionStatus: 'open' }
];

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

function TraceabilityMatrixTab() {
  // Connect to shared schema state
  const { 
    parseResult, 
    totalTables, 
    totalColumns, 
    fkResolvedPercent, 
    modulesLinked, 
    linkedModules, 
    missingTables 
  } = useSchema()
  
  const [requirements] = useState<Requirement[]>(mockRequirements);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requirementId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.implementationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requirements, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const total = requirements.length;
    const complete = requirements.filter(r => r.implementationStatus === 'complete').length;
    const partial = requirements.filter(r => r.implementationStatus === 'partial').length;
    const notStarted = requirements.filter(r => r.implementationStatus === 'not_started').length;
    const avgCoverage = requirements.length > 0
      ? Math.round(requirements.reduce((sum, r) => sum + r.coveragePercent, 0) / requirements.length)
      : 0;

    return { total, complete, partial, notStarted, avgCoverage };
  }, [requirements]);

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
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SCHEMA VERSION CONTROL COMPONENT
// ============================================================================

function SchemaVersionTab() {
  const [versions] = useState<SchemaVersion[]>(mockSchemaVersions);
  const [selectedFromVersion, setSelectedFromVersion] = useState<string>('');
  const [selectedToVersion, setSelectedToVersion] = useState<string>('');

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

function DecisionLogTab() {
  const [decisions] = useState<Decision[]>(mockDecisions);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);

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
            {decisions.map((decision) => (
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
            ))}
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

function TeamAllocationTab() {
  const [teamMembers] = useState<TeamMember[]>(mockTeamMembers);

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
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 border rounded-lg p-4">
              <h4 className="font-medium mb-3">Suggested Assignments</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">Patient Registration Module</div>
                    <div className="text-xs text-muted-foreground">Complexity: High | Est: 40h</div>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white">JS</div>
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white text-xs flex items-center justify-center border-2 border-white">SJ</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">Appointment Scheduling</div>
                    <div className="text-xs text-muted-foreground">Complexity: Medium | Est: 24h</div>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white">MC</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">EHR Module</div>
                    <div className="text-xs text-muted-foreground">Complexity: Very High | Est: 80h</div>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center border-2 border-white">ED</div>
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white">JS</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Allocation Stats</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Hours</span>
                    <span className="font-medium">144h</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Team Utilization</span>
                    <span className="font-medium">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Story Points</span>
                    <span className="font-medium">36</span>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4">Apply Suggestions</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// GAP ANALYSIS COMPONENT
// ============================================================================

function GapAnalysisTab() {
  const [gaps] = useState<Gap[]>(mockGaps);

  const summary = useMemo(() => {
    return {
      total: gaps.length,
      critical: gaps.filter(g => g.severity === 'critical').length,
      high: gaps.filter(g => g.severity === 'high').length,
      open: gaps.filter(g => g.resolutionStatus === 'open').length
    };
  }, [gaps]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Gaps</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">High</p>
                <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{summary.open}</p>
              </div>
              <ListChecks className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap List */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Gap Analysis Results</CardTitle>
            <Button size="sm" variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Run Analysis
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Target</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead className="w-36">Gap Type</TableHead>
                <TableHead className="w-24">Severity</TableHead>
                <TableHead className="w-24">Coverage</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gaps.map((gap) => (
                <TableRow key={gap.id}>
                  <TableCell className="font-mono text-xs">{gap.targetId}</TableCell>
                  <TableCell>
                    <div className="font-medium">{gap.targetName}</div>
                    {gap.description && (
                      <div className="text-xs text-muted-foreground">{gap.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{gap.gapType.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(gap.severity)}>{gap.severity}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={gap.coveragePercent} className="w-12 h-2" />
                      <span className="text-xs">{gap.coveragePercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(gap.resolutionStatus)}>
                      {gap.resolutionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">Resolve</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectIntelligenceTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Project Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">
            Requirement traceability, version control, decisions, and team allocation
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">Phase 5</Badge>
      </div>

      <Tabs defaultValue="traceability" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="traceability" className="flex items-center gap-1">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Traceability</span>
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Versions</span>
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Decisions</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Gap Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traceability" className="mt-4">
          <TraceabilityMatrixTab />
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <SchemaVersionTab />
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <DecisionLogTab />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamAllocationTab />
        </TabsContent>

        <TabsContent value="gaps" className="mt-4">
          <GapAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectIntelligenceTab;
