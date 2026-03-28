'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  GitCompare,
  Clock,
  DollarSign,
  Bug,
  Shield,
  Zap,
} from 'lucide-react';

interface SessionComparisonToolProps {
  projectId?: string;
}

interface Session {
  id: string;
  title: string;
  date: string;
}

export function SessionComparisonTool({ projectId }: SessionComparisonToolProps) {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionA, setSessionA] = useState<string>('');
  const [sessionB, setSessionB] = useState<string>('');
  const [comparison, setComparison] = useState<any>(null);
  const [changes, setChanges] = useState<string[]>([]);

  useEffect(() => {
    fetchSessions();
  }, [projectId]);

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);

      const response = await fetch(`/api/chat-logs/dashboard?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions?.map((s: any) => ({
          id: s.id,
          title: s.title || 'Untitled Session',
          date: new Date(s.sessionDate).toLocaleDateString(),
        })) || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const compareSessions = async () => {
    if (!sessionA || !sessionB) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/automation/compare?sessionA=${sessionA}&sessionB=${sessionB}`
      );
      const data = await response.json();

      if (data.success) {
        setComparison(data.comparison);
        setChanges(data.changes || []);
      }
    } catch (error) {
      console.error('Failed to compare sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChangeIcon = (change: number, isInverse = false) => {
    const isPositive = isInverse ? change < 0 : change > 0;
    if (change === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    return isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getChangeColor = (change: number, isInverse = false) => {
    const isPositive = isInverse ? change < 0 : change > 0;
    if (change === 0) return 'text-gray-500';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      if (value >= 1000) return value.toLocaleString();
      if (value < 1) return value.toFixed(2);
      return Math.round(value);
    }
    return value;
  };

  return (
    <div className="space-y-4">
      {/* Session Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-blue-500" />
            Select Sessions to Compare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">Session A (Earlier)</label>
              <Select value={sessionA} onValueChange={setSessionA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session A" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[300px]">{s.title}</span>
                        <span className="text-muted-foreground text-xs">{s.date}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />
            
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">Session B (Later)</label>
              <Select value={sessionB} onValueChange={setSessionB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session B" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[300px]">{s.title}</span>
                        <span className="text-muted-foreground text-xs">{s.date}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              className="mt-6" 
              onClick={compareSessions}
              disabled={!sessionA || !sessionB || loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GitCompare className="h-4 w-4 mr-2" />
              )}
              Compare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-4">
          {/* Side-by-Side Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparison Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Session A</TableHead>
                    <TableHead className="text-right">Session B</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(comparison).map(([key, data]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(data.sessionA)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(data.sessionB)}
                      </TableCell>
                      <TableCell className={`text-right ${getChangeColor(data.changePercent, !data.improvement)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {data.changePercent > 0 ? '+' : ''}{data.changePercent}%
                          {getChangeIcon(data.changePercent, !data.improvement)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* What Changed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                What Changed
              </CardTitle>
              <CardDescription>
                Analysis of improvements between sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changes.length > 0 ? (
                <div className="space-y-2">
                  {changes.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-green-50 text-green-700"
                    >
                      <TrendingUp className="h-4 w-4" />
                      {change}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No significant improvements detected
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Best Improvement</p>
                    <p className="text-lg font-bold">
                      {Math.max(...Object.values(comparison).map((d: any) => Math.abs(d.changePercent)))}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-lg font-bold">
                      {comparison.duration?.changePercent > 0 
                        ? `${Math.abs(comparison.duration.changePercent)}%` 
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Saved</p>
                    <p className="text-lg font-bold">
                      {comparison.cost?.improvement 
                        ? `$${Math.abs(comparison.cost.sessionA - comparison.cost.sessionB).toFixed(2)}` 
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!comparison && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <GitCompare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select two sessions to compare</p>
              <p className="text-sm mt-2">
                Compare metrics between sessions to see what changed and what improved
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SessionComparisonTool;
