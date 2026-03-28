/**
 * ISSUES TAB
 * ==========
 * Issue board with filters
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState, SeverityBadge, StatusBadge } from './ui';
import { SimplePieChart } from './charts';
import { useIssues, formatDate } from '@/hooks/use-analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bug, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function IssuesTab() {
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const { data, loading, error, refetch } = useIssues({
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    limit: 100,
  });

  if (loading) return <LoadingState message="Loading issues..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const issues = data?.issues || [];
  const distribution = data?.distribution || [];

  // Group issues by status
  const openIssues = issues.filter(i => i.status !== 'resolved');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');
  const recurringIssues = issues.filter(i => i.recurrenceCount > 0);

  // Get unique types
  const issueTypes = distribution.map(d => d.type);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Bug className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{issues.length}</p>
                <p className="text-xs text-muted-foreground">Total Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openIssues.length}</p>
                <p className="text-xs text-muted-foreground">Open Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedIssues.length}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <RefreshCw className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recurringIssues.length}</p>
                <p className="text-xs text-muted-foreground">Recurring</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart
              data={distribution.map(d => ({ label: d.type, value: d.count }))}
              colors={['#f59e0b', '#ef4444', '#f97316', '#ca8a04', '#65a30d']}
              size={160}
            />
          </CardContent>
        </Card>

        {/* Resolution Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart
              data={[
                { label: 'Resolved', value: resolvedIssues.length },
                { label: 'Open', value: openIssues.length },
              ]}
              colors={['#22c55e', '#f59e0b']}
              size={160}
            />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Severity</p>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={severityFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter('')}
                >
                  All
                </Button>
                {['critical', 'high', 'medium', 'low'].map(sev => (
                  <Button
                    key={sev}
                    variant={severityFilter === sev ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeverityFilter(sev)}
                  >
                    {sev}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Status</p>
              <div className="flex gap-1">
                <Button
                  variant={statusFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('open')}
                >
                  Open
                </Button>
                <Button
                  variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('resolved')}
                >
                  Resolved
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Type</p>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={typeFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('')}
                >
                  All
                </Button>
                {issueTypes.slice(0, 4).map(type => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Issues ({issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <EmptyState
              icon="✅"
              title="No Issues Found"
              description="No issues match your current filters."
            />
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityBadge severity={issue.severity as any} />
                          <Badge variant="outline" className="text-xs">
                            {issue.issueType}
                          </Badge>
                          {issue.recurrenceCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {issue.recurrenceCount}x
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        {expandedIssue === issue.id && issue.errorMessage && (
                          <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-x-auto">
                            {issue.errorMessage}
                          </pre>
                        )}
                        {issue.resolution && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {issue.resolution}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(issue.session?.sessionDate)}
                        </p>
                        {expandedIssue === issue.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground mt-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
