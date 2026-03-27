'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Bug,
  Target,
  DollarSign,
  Zap,
} from 'lucide-react';

interface WeeklyReportCardProps {
  projectId?: string;
}

export function WeeklyReportCard({ projectId }: WeeklyReportCardProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetchReport();
  }, [projectId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);

      const response = await fetch(`/api/automation/reports?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Failed to fetch weekly report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChangeIcon = (change: number, isInverse = false) => {
    const isPositive = isInverse ? change < 0 : change > 0;
    return isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getChangeColor = (change: number, isInverse = false) => {
    const isPositive = isInverse ? change < 0 : change > 0;
    return isPositive ? 'text-green-600' : 'text-red-600';
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

  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No report data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Self-Assessment</CardTitle>
          <CardDescription>
            Week of {new Date(report.weekStart).toLocaleDateString()} - {new Date(report.weekEnd).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{report.headline}</p>
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">This Week</TableHead>
                <TableHead className="text-right">Last Week</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.metrics?.map((metric: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell className="text-right">{metric.thisWeek}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{metric.lastWeek}</TableCell>
                  <TableCell className={`text-right ${getChangeColor(metric.change, ['Repeat Issues', 'Total Cost'].includes(metric.name))}`}>
                    <div className="flex items-center justify-end gap-1">
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                      {getChangeIcon(metric.change, ['Repeat Issues', 'Total Cost'].includes(metric.name))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="h-4 w-4 text-red-500" />
              Top Issues Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {report.topIssues?.length > 0 ? (
                <div className="space-y-2">
                  {report.topIssues.map((issue: any, i: number) => (
                    <div key={issue.id || i} className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{issue.title}</span>
                        <Badge 
                          className={`text-xs ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                      {issue.resolution && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {issue.resolution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  No issues resolved this week
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Active Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {report.topPatterns?.length > 0 ? (
                <div className="space-y-2">
                  {report.topPatterns.map((pattern: any, i: number) => (
                    <div key={pattern.id || i} className="p-2 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{pattern.patternName}</span>
                        <Badge variant="outline" className="text-xs">{pattern.patternCode}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{pattern.occurrenceCount} occurrences</span>
                        <span>${pattern.totalCostWasted?.toFixed(2) || '0.00'} wasted</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs">Effectiveness:</span>
                        <Progress value={(pattern.effectiveness || 0) * 100} className="h-1 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  No active patterns
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600">Top Wins</CardTitle>
          </CardHeader>
          <CardContent>
            {report.insights?.length > 0 ? (
              <ul className="space-y-2">
                {report.insights.map((insight: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No major wins this week</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-amber-600">Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            {report.focusAreas?.length > 0 ? (
              <ul className="space-y-2">
                {report.focusAreas.map((area: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-amber-500" />
                    {area}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific focus areas identified</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button variant="outline" size="sm">
          Share Report
        </Button>
      </div>
    </div>
  );
}

export default WeeklyReportCard;
