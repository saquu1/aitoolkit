/**
 * PATTERNS TAB
 * ============
 * Pattern library and recurring issues
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from './ui';
import { SimpleBarChart } from './charts';
import { usePatterns, formatDate } from '@/hooks/use-analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Zap,
  ChevronRight,
  Clock,
  DollarSign
} from 'lucide-react';

export function PatternsTab() {
  const [activeView, setActiveView] = useState<'all' | 'issues' | 'stored'>('all');
  const { data, loading, error, refetch } = usePatterns();

  if (loading) return <LoadingState message="Loading patterns..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const fromIssues = data?.fromIssues || [];
  const stored = data?.stored || [];

  // Prepare chart data
  const patternChartData = stored.slice(0, 10).map(p => ({
    label: p.patternName || p.patternCode || 'Unknown',
    value: p.occurrenceCount || p.count || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stored.length}</p>
                <p className="text-xs text-muted-foreground">Stored Patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fromIssues.length}</p>
                <p className="text-xs text-muted-foreground">From Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stored.reduce((sum, p) => sum + (p.occurrenceCount || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Occurrences</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All Patterns</TabsTrigger>
          <TabsTrigger value="issues">From Issues</TabsTrigger>
          <TabsTrigger value="stored">Stored Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Chart */}
          {patternChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pattern Frequency</CardTitle>
                <CardDescription>Top 10 recurring patterns by occurrence count</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={patternChartData} 
                  color="#f59e0b" 
                  height={200}
                  horizontal
                />
              </CardContent>
            </Card>
          )}

          {/* Patterns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stored.slice(0, 8).map((pattern: any) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issues">
          {fromIssues.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No Issue Patterns"
              description="No recurring issue patterns have been detected yet."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {fromIssues.map((pattern: any, i: number) => (
                      <div key={i} className="p-4 hover:bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{pattern.type}</Badge>
                              <Badge variant="secondary">{pattern.count}x</Badge>
                            </div>
                            <p className="text-sm font-medium">{pattern.pattern}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last seen: {formatDate(pattern.lastSeen)}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stored">
          {stored.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No Stored Patterns"
              description="No patterns have been saved to the pattern library yet."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stored.map((pattern: any) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// PATTERN CARD COMPONENT
// =============================================================================

function PatternCard({ pattern }: { pattern: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {pattern.patternName || 'Unnamed Pattern'}
          </CardTitle>
          <Badge variant="outline">{pattern.patternCode}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>{pattern.occurrenceCount || 0} occurrences</span>
          </div>
          {pattern.totalCostWasted && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>${pattern.totalCostWasted.toFixed(2)} wasted</span>
            </div>
          )}
        </div>

        {/* Effectiveness */}
        {pattern.effectiveness !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Effectiveness</span>
              <span>{Math.round(pattern.effectiveness * 100)}%</span>
            </div>
            <Progress value={pattern.effectiveness * 100} className="h-1" />
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={pattern.status === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {pattern.status || 'active'}
          </Badge>
          <Button variant="ghost" size="sm" className="text-xs">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
