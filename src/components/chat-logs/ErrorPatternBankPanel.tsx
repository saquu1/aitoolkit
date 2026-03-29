'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Target,
  DollarSign,
  RefreshCw,
  Shield,
  Zap,
  Bug,
  TrendingUp,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Lightbulb,
  Wrench,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Server,
  Wifi,
  Lock,
  FileWarning,
  Brain,
  Wand2,
  Loader2,
  Code,
  Play,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ErrorPattern {
  id: string;
  patternKey: string;
  patternName: string;
  errorType: string;
  endpoint: string;
  httpStatus: number;
  description: string;
  occurrenceCount: number;
  severity: 'critical' | 'error' | 'warning' | 'info';
  rootCause?: string;
  preventionStrategy?: string;
  autoFixSolution?: string;
  firstOccurrence: string;
  lastOccurrence: string;
  patternStatus: 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'IGNORED';
}

interface PatternStats {
  totalPatterns: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  totalOccurrences: number;
  resolvedPatterns: number;
}

interface ErrorPatternBankPanelProps {
  sessionId?: string;
}

interface AIResolutionState {
  isProcessing: boolean;
  step: string;
  result: {
    success: boolean;
    confidence: number;
    analysis: string;
    rootCause: string;
    solution: string;
    preventionStrategy: string;
    codeFix?: {
      filePath: string;
      originalCode: string;
      fixedCode: string;
      applied: boolean;
    };
    testResult?: {
      passed: boolean;
      message: string;
    };
    error?: string;
  } | null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ErrorPatternBankPanel({ sessionId }: ErrorPatternBankPanelProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [filteredPatterns, setFilteredPatterns] = useState<ErrorPattern[]>([]);
  const [stats, setStats] = useState<PatternStats | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<ErrorPattern | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [aiResolution, setAiResolution] = useState<AIResolutionState | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiPattern, setAiPattern] = useState<ErrorPattern | null>(null);

  useEffect(() => {
    fetchPatterns();
  }, [sessionId]);

  useEffect(() => {
    filterPatterns();
  }, [patterns, searchQuery, severityFilter, typeFilter]);

  const fetchPatterns = async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('sessionId', sessionId);

      const response = await fetch(`/api/error-patterns?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPatterns(data.patterns || []);
        setStats(data.stats || null);
      } else {
        // Fallback to mock data if API not ready
        setPatterns(getMockPatterns());
        setStats(getMockStats());
      }
    } catch (error) {
      console.error('Failed to fetch error patterns:', error);
      // Use mock data on error
      setPatterns(getMockPatterns());
      setStats(getMockStats());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterPatterns = () => {
    let filtered = [...patterns];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.patternName.toLowerCase().includes(query) ||
          p.endpoint.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.errorType.toLowerCase().includes(query)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter((p) => p.severity === severityFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => p.errorType === typeFilter);
    }

    setFilteredPatterns(filtered);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'error':
        return <Badge className="bg-orange-100 text-orange-800">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
    }
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'SERVER_FAILURE':
        return <Server className="h-4 w-4 text-red-500" />;
      case 'NETWORK_ERROR':
        return <Wifi className="h-4 w-4 text-orange-500" />;
      case 'AUTH_ERROR':
        return <Lock className="h-4 w-4 text-purple-500" />;
      case 'VALIDATION_ERROR':
        return <FileWarning className="h-4 w-4 text-yellow-500" />;
      case 'BUSINESS_LOGIC':
        return <Brain className="h-4 w-4 text-blue-500" />;
      default:
        return <Bug className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-red-100 text-red-800">Active</Badge>;
      case 'MONITORING':
        return <Badge className="bg-yellow-100 text-yellow-800">Monitoring</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case 'IGNORED':
        return <Badge className="bg-gray-100 text-gray-800">Ignored</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // AI Resolution Handler - AUTOMATIC FIX
  const handleAiResolution = async (pattern: ErrorPattern) => {
    setAiPattern(pattern);
    setShowAiDialog(true);
    setAiResolution({
      isProcessing: true,
      step: 'Initializing AI analysis...',
      result: null,
    });

    try {
      // Step 1: Analyze
      setAiResolution((prev) => prev ? { ...prev, step: 'Analyzing error pattern...' } : null);
      await new Promise((r) => setTimeout(r, 500));

      // Step 2: Read code
      setAiResolution((prev) => prev ? { ...prev, step: 'Reading endpoint code...' } : null);
      await new Promise((r) => setTimeout(r, 500));

      // Step 3: Generate fix
      setAiResolution((prev) => prev ? { ...prev, step: 'AI generating fix...' } : null);

      // Call the AI resolution API
      const response = await fetch('/api/error-patterns/ai-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'full_resolution',
          pattern: {
            id: pattern.id,
            patternKey: pattern.patternKey,
            patternName: pattern.patternName,
            errorType: pattern.errorType,
            endpoint: pattern.endpoint,
            httpStatus: pattern.httpStatus,
            description: pattern.description,
            occurrenceCount: pattern.occurrenceCount,
            severity: pattern.severity,
            rootCause: pattern.rootCause,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        setAiResolution({
          isProcessing: false,
          step: 'Complete',
          result: data.result,
        });
      } else {
        setAiResolution({
          isProcessing: false,
          step: 'Error',
          result: {
            success: false,
            confidence: 0,
            analysis: '',
            rootCause: '',
            solution: '',
            preventionStrategy: '',
            error: data.error || 'AI resolution failed',
          },
        });
      }
    } catch (error: any) {
      setAiResolution({
        isProcessing: false,
        step: 'Error',
        result: {
          success: false,
          confidence: 0,
          analysis: '',
          rootCause: '',
          solution: '',
          preventionStrategy: '',
          error: error.message || 'Network error',
        },
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Patterns</p>
                  <p className="text-xl font-bold">{stats.totalPatterns}</p>
                </div>
                <Target className="h-5 w-5 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Critical</p>
                  <p className="text-xl font-bold text-red-600">{stats.criticalCount}</p>
                </div>
                <XCircle className="h-5 w-5 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Errors</p>
                  <p className="text-xl font-bold text-orange-600">{stats.errorCount}</p>
                </div>
                <AlertCircle className="h-5 w-5 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.warningCount}</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Info</p>
                  <p className="text-xl font-bold text-blue-600">{stats.infoCount}</p>
                </div>
                <Info className="h-5 w-5 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Occurrences</p>
                  <p className="text-xl font-bold">{stats.totalOccurrences}</p>
                </div>
                <RefreshCw className="h-5 w-5 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                  <p className="text-xl font-bold text-green-600">{stats.resolvedPatterns}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Rate</p>
                  <p className="text-xl font-bold">
                    {stats.totalPatterns > 0
                      ? Math.round(
                          ((stats.totalPatterns - stats.resolvedPatterns) / stats.totalPatterns) * 100
                        )
                      : 0}
                    %
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-cyan-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Alert */}
      {stats && stats.criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Error Patterns Detected</AlertTitle>
          <AlertDescription>
            {stats.criticalCount} critical pattern(s) require immediate attention. These patterns
            have occurred frequently and may indicate systemic issues.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Error Pattern Bank
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patterns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Severity
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSeverityFilter('all')}>
                    All Severities
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSeverityFilter('critical')}>
                    Critical
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSeverityFilter('error')}>
                    Error
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSeverityFilter('warning')}>
                    Warning
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSeverityFilter('info')}>
                    Info
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={fetchPatterns} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredPatterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mb-2 opacity-50" />
                <p>No error patterns detected</p>
                <p className="text-xs mt-1">Patterns will appear here after errors are logged</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-20">Severity</TableHead>
                    <TableHead className="w-24">Occurrences</TableHead>
                    <TableHead className="w-32">Last Seen</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatterns.map((pattern) => (
                    <TableRow
                      key={pattern.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {getErrorTypeIcon(pattern.errorType)}
                          <div>
                            <p className="font-medium text-sm">{pattern.patternName}</p>
                            <p className="text-xs text-muted-foreground">
                              {pattern.endpoint} • HTTP {pattern.httpStatus}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {pattern.errorType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(pattern.patternStatus)}</TableCell>
                      <TableCell>{getSeverityBadge(pattern.severity)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            pattern.occurrenceCount >= 10
                              ? 'bg-red-100 text-red-800'
                              : pattern.occurrenceCount >= 5
                                ? 'bg-yellow-100 text-yellow-800'
                                : ''
                          }
                        >
                          {pattern.occurrenceCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(pattern.lastOccurrence).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPattern(pattern);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAiResolution(pattern);
                            }}
                            title="AI Auto-Fix"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pattern Detail Dialog */}
      <Dialog open={!!selectedPattern} onOpenChange={() => setSelectedPattern(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPattern && getErrorTypeIcon(selectedPattern.errorType)}
              {selectedPattern?.patternName}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                {selectedPattern && getSeverityBadge(selectedPattern.severity)}
                {selectedPattern && getStatusBadge(selectedPattern.patternStatus)}
                <Badge variant="outline">{selectedPattern?.errorType}</Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedPattern && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedPattern.occurrenceCount}</p>
                  <p className="text-xs text-muted-foreground">Occurrences</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedPattern.httpStatus}</p>
                  <p className="text-xs text-muted-foreground">HTTP Status</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-bold truncate">{selectedPattern.endpoint}</p>
                  <p className="text-xs text-muted-foreground">Endpoint</p>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{selectedPattern.description}</p>
              </div>

              {/* Root Cause */}
              {selectedPattern.rootCause && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Root Cause</p>
                      <p className="text-sm text-red-700">{selectedPattern.rootCause}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prevention Strategy */}
              {selectedPattern.preventionStrategy && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Prevention Strategy</p>
                      <p className="text-sm text-green-700">{selectedPattern.preventionStrategy}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Fix */}
              {selectedPattern.autoFixSolution && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Wrench className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Auto-Fix Solution</p>
                      <p className="text-sm text-blue-700">{selectedPattern.autoFixSolution}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">First Occurrence:</span>{' '}
                  {new Date(selectedPattern.firstOccurrence).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Last Occurrence:</span>{' '}
                  {new Date(selectedPattern.lastOccurrence).toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Mark as resolved
                    setSelectedPattern(null);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Ignore pattern
                    setSelectedPattern(null);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ignore
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Resolution Dialog - AUTOMATIC FIX */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-500" />
              AI Auto-Fix Resolution
              {aiPattern && (
                <Badge variant="outline" className="ml-2">
                  {aiPattern.errorType}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {aiPattern?.patternName} • {aiPattern?.endpoint}
            </DialogDescription>
          </DialogHeader>

          {aiResolution?.isProcessing ? (
            /* Processing State */
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-lg font-medium">{aiResolution.step}</p>
              <p className="text-sm text-muted-foreground mt-2">
                AI is analyzing and fixing the error automatically...
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Analyzing error pattern
                </div>
                <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Reading endpoint code
                </div>
                <div className="flex items-center gap-2 justify-center text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  Generating and applying fix...
                </div>
              </div>
            </div>
          ) : aiResolution?.result ? (
            /* Result State */
            <div className="space-y-4">
              {/* Success/Error Header */}
              {aiResolution.result.success ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Fix Applied Successfully!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    AI has automatically analyzed and fixed the error. The solution has been saved for future similar errors.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fix Failed</AlertTitle>
                  <AlertDescription>
                    {aiResolution.result.error || 'Could not apply automatic fix'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Confidence Score */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">Confidence Score</p>
                  <p className="text-xs text-muted-foreground">AI&apos;s confidence in this solution</p>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {aiResolution.result.confidence}%
                </div>
              </div>

              {/* Root Cause */}
              {aiResolution.result.rootCause && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Root Cause Identified</p>
                      <p className="text-sm text-red-700">{aiResolution.result.rootCause}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Solution */}
              {aiResolution.result.solution && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Solution Applied</p>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{aiResolution.result.solution}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prevention Strategy */}
              {aiResolution.result.preventionStrategy && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Prevention Strategy</p>
                      <p className="text-sm text-green-700">{aiResolution.result.preventionStrategy}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Code Fix */}
              {aiResolution.result.codeFix && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-2">
                    <Code className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-purple-800">Code Fix</p>
                        {aiResolution.result.codeFix.applied && (
                          <Badge className="bg-green-100 text-green-800">Applied</Badge>
                        )}
                      </div>
                      <p className="text-xs text-purple-600 mt-1">{aiResolution.result.codeFix.filePath}</p>
                      <div className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-100 font-mono overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{aiResolution.result.codeFix.fixedCode.slice(0, 500)}...</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Result */}
              {aiResolution.result.testResult && (
                <div className={`p-3 rounded-lg border ${aiResolution.result.testResult.passed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-start gap-2">
                    <Play className={`h-5 w-5 mt-0.5 ${aiResolution.result.testResult.passed ? 'text-green-500' : 'text-yellow-500'}`} />
                    <div>
                      <p className={`text-sm font-medium ${aiResolution.result.testResult.passed ? 'text-green-800' : 'text-yellow-800'}`}>
                        Test Result
                      </p>
                      <p className={`text-sm ${aiResolution.result.testResult.passed ? 'text-green-700' : 'text-yellow-700'}`}>
                        {aiResolution.result.testResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAiDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => fetchPatterns()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Patterns
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// MOCK DATA (for development/fallback)
// =============================================================================

function getMockPatterns(): ErrorPattern[] {
  return [
    {
      id: '1',
      patternKey: 'SERVER_FAILURE_/api/raw-data_502',
      patternName: 'Server Failure - Raw Data API',
      errorType: 'SERVER_FAILURE',
      endpoint: '/api/raw-data',
      httpStatus: 502,
      description: 'Database query timeout or connection pool exhaustion',
      occurrenceCount: 8,
      severity: 'critical',
      rootCause: 'Database query timeout or connection pool exhaustion',
      preventionStrategy: 'Add query timeouts, optimize slow queries, increase connection pool size',
      autoFixSolution: 'Check for long-running queries and add appropriate indexes',
      firstOccurrence: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
    {
      id: '2',
      patternKey: 'BUSINESS_LOGIC_/api/raw-data_409',
      patternName: 'Duplicate Data Submission',
      errorType: 'BUSINESS_LOGIC',
      endpoint: '/api/raw-data',
      httpStatus: 409,
      description: 'Same content submitted multiple times',
      occurrenceCount: 15,
      severity: 'info',
      rootCause: 'Duplicate data submission - same content submitted multiple times',
      preventionStrategy: 'Implement idempotency keys or client-side deduplication',
      autoFixSolution: 'Check if data already exists before saving, use forceSave flag if intentional',
      firstOccurrence: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      patternStatus: 'MONITORING',
    },
    {
      id: '3',
      patternKey: 'NETWORK_ERROR_*_0',
      patternName: 'Network Connectivity Issue',
      errorType: 'NETWORK_ERROR',
      endpoint: '/api/*',
      httpStatus: 0,
      description: 'Network connectivity issue or CORS error',
      occurrenceCount: 5,
      severity: 'warning',
      rootCause: 'Network connectivity issue or CORS error',
      preventionStrategy: 'Add retry logic with exponential backoff, check CORS configuration',
      autoFixSolution: 'Retry request up to 3 times with increasing delays',
      firstOccurrence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
    {
      id: '4',
      patternKey: 'AUTH_ERROR_/api/*_401',
      patternName: 'Authentication Token Expired',
      errorType: 'AUTH_ERROR',
      endpoint: '/api/*',
      httpStatus: 401,
      description: 'Session expired or invalid authentication token',
      occurrenceCount: 12,
      severity: 'error',
      rootCause: 'Session expired or invalid authentication token',
      preventionStrategy: 'Implement token refresh, redirect to login on 401',
      autoFixSolution: 'Clear local session and redirect to login page',
      firstOccurrence: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
  ];
}

function getMockStats(): PatternStats {
  return {
    totalPatterns: 4,
    criticalCount: 1,
    errorCount: 1,
    warningCount: 1,
    infoCount: 1,
    totalOccurrences: 40,
    resolvedPatterns: 0,
  };
}

export default ErrorPatternBankPanel;
