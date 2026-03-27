'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  Target,
  DollarSign,
  RefreshCw,
  Shield,
  Zap,
  Bug,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface PatternAlertsPanelProps {
  projectId?: string;
}

export function PatternAlertsPanel({ projectId }: PatternAlertsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<any>(null);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/automation/patterns');
      const data = await response.json();

      if (data.success) {
        setPatterns(data.patterns || []);
      }
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800';
      default: return 'bg-blue-100 text-blue-800';
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
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Patterns</p>
                <p className="text-xl font-bold">{patterns.length}</p>
              </div>
              <Target className="h-5 w-5 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Occurrences</p>
                <p className="text-xl font-bold">
                  {patterns.reduce((sum, p) => sum + p.occurrenceCount, 0)}
                </p>
              </div>
              <RefreshCw className="h-5 w-5 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Cost Wasted</p>
                <p className="text-xl font-bold text-red-600">
                  ${patterns.reduce((sum, p) => sum + p.costWasted, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {patterns.filter(p => p.occurrenceCount >= 3).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High-Occurrence Patterns Detected</AlertTitle>
          <AlertDescription>
            {patterns.filter(p => p.occurrenceCount >= 3).length} pattern(s) have occurred 3+ times.
            Consider creating prevention rules.
          </AlertDescription>
        </Alert>
      )}

      {/* Patterns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detected Patterns</CardTitle>
          <CardDescription>
            Known patterns with detection rules and prevention strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {patterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mb-2 opacity-50" />
                <p>No active patterns detected</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead className="w-24">Occurrences</TableHead>
                    <TableHead className="w-24">Cost Wasted</TableHead>
                    <TableHead className="w-24">Effectiveness</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((pattern) => (
                    <TableRow
                      key={pattern.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pattern.name}</span>
                            <Badge variant="outline" className="text-xs">{pattern.code}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{pattern.type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={pattern.occurrenceCount >= 5 ? 'bg-red-100 text-red-800' : ''}>
                          {pattern.occurrenceCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-red-600">
                        ${pattern.costWasted?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {pattern.effectiveness > 0 ? (
                          <span className="text-green-600">
                            {Math.round(pattern.effectiveness * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {pattern.autoDetectionEnabled ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Paused</Badge>
                          )}
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
              <Target className="h-5 w-5 text-purple-500" />
              {selectedPattern?.name}
            </DialogTitle>
            <DialogDescription>
              <Badge variant="outline">{selectedPattern?.code}</Badge>
            </DialogDescription>
          </DialogHeader>
          {selectedPattern && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedPattern.occurrenceCount}</p>
                  <p className="text-xs text-muted-foreground">Occurrences</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    ${selectedPattern.costWasted?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground">Cost Wasted</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round((selectedPattern.effectiveness || 0) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Effectiveness</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Detection Keywords:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPattern.keywords?.map((kw: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>

                {selectedPattern.prevention?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Prevention Strategies:</span>
                    <ul className="mt-1 space-y-1">
                      {selectedPattern.prevention.map((p: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-green-600">
                          <Shield className="h-3 w-3" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PatternAlertsPanel;
