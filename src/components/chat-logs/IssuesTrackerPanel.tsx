'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Bug,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  FileCode,
  Tag,
  TrendingUp,
  Info,
  XCircle,
} from 'lucide-react';

interface IssuesTrackerPanelProps {
  sessionId: string;
}

interface Issue {
  id: string;
  issueType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description?: string;
  category: string;
  tags: string[];
  fileAffected?: string;
  lineNumber?: number;
  errorMessage?: string;
  filesInvolved: string[];
  resolution?: string;
  resolutionTime: number;
  resolutionTimeMs: number;
  attemptsToFix: number;
  resolvedBy: string;
  status: 'resolved' | 'unresolved' | 'in_progress';
  isRepeat: boolean;
  recurrenceCount: number;
  rootCause?: string;
  preventionTips: string[];
  relatedIssues: string[];
  confidenceLevel?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  'critical': '#ef4444',
  'high': '#f97316',
  'medium': '#f59e0b',
  'low': '#3b82f6',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  'critical': <XCircle className="h-4 w-4 text-red-500" />,
  'high': <AlertTriangle className="h-4 w-4 text-orange-500" />,
  'medium': <AlertCircle className="h-4 w-4 text-amber-500" />,
  'low': <Info className="h-4 w-4 text-blue-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  'resolved': 'bg-green-100 text-green-800',
  'unresolved': 'bg-red-100 text-red-800',
  'in_progress': 'bg-amber-100 text-amber-800',
};

export function IssuesTrackerPanel({ sessionId }: IssuesTrackerPanelProps) {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');

  useEffect(() => {
    fetchIssues();
  }, [sessionId]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat-logs/issues?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setIssues(data.issues || []);
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: issues.length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    unresolved: issues.filter(i => i.status === 'unresolved').length,
    inProgress: issues.filter(i => i.status === 'in_progress').length,
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
    avgResolutionTime: issues.filter(i => i.resolutionTimeMs > 0).length > 0
      ? Math.round(issues.filter(i => i.resolutionTimeMs > 0).reduce((sum, i) => sum + i.resolutionTimeMs, 0) / issues.filter(i => i.resolutionTimeMs > 0).length / 1000)
      : 0,
    repeatIssues: issues.filter(i => i.isRepeat).length,
    byCategory: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  };

  issues.forEach(i => {
    stats.byCategory[i.category] = (stats.byCategory[i.category] || 0) + 1;
    stats.byType[i.issueType] = (stats.byType[i.issueType] || 0) + 1;
  });

  // Filter issues
  const filteredIssues = filter === 'all' 
    ? issues 
    : issues.filter(i => i.status === filter);

  // Chart data
  const severityChartData = [
    { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS['critical'] },
    { name: 'High', value: stats.high, color: SEVERITY_COLORS['high'] },
    { name: 'Medium', value: stats.medium, color: SEVERITY_COLORS['medium'] },
    { name: 'Low', value: stats.low, color: SEVERITY_COLORS['low'] },
  ].filter(d => d.value > 0);

  const categoryChartData = Object.entries(stats.byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

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
      {/* Alert for unresolved issues */}
      {stats.unresolved > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention Required</AlertTitle>
          <AlertDescription>
            {stats.unresolved} unresolved issue(s) need your attention
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Issues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${stats.unresolved > 0 ? 'text-red-600' : ''}`}>
                {stats.unresolved}
              </p>
              <p className="text-xs text-muted-foreground">Unresolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.avgResolutionTime}s</p>
              <p className="text-xs text-muted-foreground">Avg Resolution</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Rate */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Resolution Rate</span>
              <span>{stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 100}%</span>
            </div>
            <Progress 
              value={stats.total > 0 ? (stats.resolved / stats.total) * 100 : 100} 
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {severityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 mr-2" />
                No issues found
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'resolved', 'unresolved'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All Issues' : status.charAt(0).toUpperCase() + status.slice(1)}
            <Badge variant="secondary" className="ml-2">
              {status === 'all' ? stats.total : stats[status]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issues Detail</CardTitle>
          <CardDescription>
            {filteredIssues.length} issue(s) {filter !== 'all' ? filter : 'tracked'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                <p>No issues found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Severity</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Category</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues
                    .sort((a, b) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3 };
                      return order[a.severity] - order[b.severity];
                    })
                    .map((issue, index) => (
                      <TableRow 
                        key={issue.id || index}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <TableCell>
                          <div 
                            className="p-1 rounded"
                            style={{ backgroundColor: `${SEVERITY_COLORS[issue.severity]}20` }}
                          >
                            {SEVERITY_ICONS[issue.severity]}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="truncate font-medium">{issue.title}</div>
                          {issue.fileAffected && (
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {issue.fileAffected}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {issue.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${STATUS_COLORS[issue.status]}`}>
                            {issue.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{issue.attemptsToFix}</span>
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

      {/* Issue Detail Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIssue && SEVERITY_ICONS[selectedIssue.severity]}
              {selectedIssue?.title}
            </DialogTitle>
            <DialogDescription>
              <div className="flex gap-2 mt-2">
                <Badge 
                  style={{ backgroundColor: SEVERITY_COLORS[selectedIssue?.severity || 'low'], color: 'white' }}
                >
                  {selectedIssue?.severity}
                </Badge>
                <Badge variant="outline">{selectedIssue?.category}</Badge>
                <Badge className={STATUS_COLORS[selectedIssue?.status || 'unresolved']}>
                  {selectedIssue?.status}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              {selectedIssue.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="mt-1 text-sm">{selectedIssue.description}</p>
                </div>
              )}
              
              {selectedIssue.errorMessage && (
                <div>
                  <span className="text-muted-foreground text-sm">Error Message:</span>
                  <code className="block mt-1 p-2 bg-red-50 rounded text-xs text-red-800">
                    {selectedIssue.errorMessage}
                  </code>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Issue Type:</span>
                  <Badge variant="outline" className="ml-2">{selectedIssue.issueType}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Attempts to Fix:</span>
                  <span className="ml-2 font-medium">{selectedIssue.attemptsToFix}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolution Time:</span>
                  <span className="ml-2 font-medium">
                    {selectedIssue.resolutionTimeMs > 0 
                      ? `${(selectedIssue.resolutionTimeMs / 1000).toFixed(1)}s`
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolved By:</span>
                  <span className="ml-2 font-medium">{selectedIssue.resolvedBy}</span>
                </div>
              </div>

              {selectedIssue.filesInvolved.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Files Involved:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedIssue.filesInvolved.map((file, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-mono">
                        <FileCode className="h-3 w-3 mr-1" />
                        {file.split('/').pop()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedIssue.resolution && (
                <div>
                  <span className="text-muted-foreground text-sm">Resolution:</span>
                  <Alert className="mt-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {selectedIssue.resolution}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {selectedIssue.rootCause && (
                <div>
                  <span className="text-muted-foreground text-sm">Root Cause:</span>
                  <p className="mt-1 text-sm">{selectedIssue.rootCause}</p>
                </div>
              )}

              {selectedIssue.preventionTips.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Prevention Tips:</span>
                  <ul className="mt-1 list-disc list-inside text-sm space-y-1">
                    {selectedIssue.preventionTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedIssue.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedIssue.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IssuesTrackerPanel;
