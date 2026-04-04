/**
 * SESSIONS TAB
 * ============
 * Session list and details
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState, EmptyState } from './ui';
import { useSessions, useSessionDetails, formatNumber, formatCurrency, formatDate, formatDateTime } from '@/hooks/use-analytics';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Clock, 
  FileText, 
  Bug, 
  Sparkles,
  MessageSquare 
} from 'lucide-react';

export function SessionsTab() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const limit = 20;

  const { data, loading, error, refetch } = useSessions({
    limit,
    offset: page * limit,
    category: categoryFilter || undefined,
  });

  const { data: sessionDetails, loading: loadingDetails } = useSessionDetails(selectedSessionId);

  const sessions = data?.sessions || [];
  const pagination = data?.pagination || { total: 0, hasMore: false };

  if (loading) return <LoadingState message="Loading sessions..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  // Get unique categories for filter
  const categories = [...new Set(sessions.map(s => s.category))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-1">
          <Button
            variant={categoryFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('')}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No Sessions Found"
          description="Import some chat logs to see sessions here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Tokens</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Files</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Issues</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.map((session) => (
                    <tr 
                      key={session.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(session.sessionDate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">
                        {session.title || 'Untitled Session'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {session.model}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {session.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {formatNumber(session.totalTokens)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">
                        {formatCurrency(session.estimatedCost)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {session.filesCreated + session.filesModified}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="text-green-600">{session.issuesResolved}</span>
                        <span className="text-muted-foreground">/{session.issuesCreated}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1} - {Math.min((page + 1) * limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasMore}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSessionId} onOpenChange={() => setSelectedSessionId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {sessionDetails?.title || 'Session Details'}
            </DialogTitle>
            <DialogDescription>
              {sessionDetails && formatDateTime(sessionDetails.sessionDate)}
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetails ? (
            <LoadingState message="Loading session details..." />
          ) : sessionDetails ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Session Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium">{sessionDetails.duration}m</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Files</p>
                      <p className="font-medium">{sessionDetails.filesCreated + sessionDetails.filesModified}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Issues</p>
                      <p className="font-medium">{sessionDetails.issuesResolved}/{sessionDetails.issuesCreated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Features</p>
                      <p className="font-medium">{sessionDetails.featuresImplemented}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Summary */}
                {sessionDetails.summary && (
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{sessionDetails.summary}</p>
                  </div>
                )}

                {/* Issues */}
                {sessionDetails.issues && sessionDetails.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Issues ({sessionDetails.issues.length})
                    </h4>
                    <div className="space-y-2">
                      {sessionDetails.issues.map((issue: any) => (
                        <div key={issue.id} className="p-2 rounded-lg bg-muted/50 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{issue.severity}</Badge>
                            <Badge variant="outline">{issue.issueType}</Badge>
                          </div>
                          <p className="mt-1">{issue.title}</p>
                          {issue.resolution && (
                            <p className="text-green-600 text-xs mt-1">✓ {issue.resolution}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {sessionDetails.features && sessionDetails.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Features ({sessionDetails.features.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {sessionDetails.features.map((feature: any) => (
                        <Badge key={feature.id} variant="secondary">
                          {feature.featureName || feature.featureType}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
