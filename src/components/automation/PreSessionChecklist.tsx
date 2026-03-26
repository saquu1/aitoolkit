'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Bug,
  AlertTriangle,
  FileWarning,
  Shield,
  Target,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';

interface PreSessionChecklistProps {
  projectId?: string;
}

export function PreSessionChecklist({ projectId }: PreSessionChecklistProps) {
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<any>(null);

  useEffect(() => {
    fetchChecklist();
  }, [projectId]);

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);

      const response = await fetch(`/api/automation/checklist?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setChecklist(data.checklist);
      }
    } catch (error) {
      console.error('Failed to fetch checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Zap className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checklist) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No checklist data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unresolved Issues Alert */}
      {checklist.unresolvedIssues?.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unresolved Issues Detected</AlertTitle>
          <AlertDescription>
            {checklist.unresolvedIssues.length} issue(s) from previous sessions need attention
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unresolved Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="h-4 w-4 text-red-500" />
              Unresolved Issues
            </CardTitle>
            <CardDescription>Issues from previous sessions that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {checklist.unresolvedIssues?.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {checklist.unresolvedIssues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className={`mt-0.5 ${
                        issue.severity === 'critical' ? 'text-red-500' :
                        issue.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                      }`}>
                        {issue.severity === 'critical' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{issue.category}</Badge>
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
                        {issue.fileAffected && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                            {issue.fileAffected}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                <p>All issues resolved!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* High-Risk Files */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-orange-500" />
              High-Risk Files
            </CardTitle>
            <CardDescription>Files with frequent modifications or errors</CardDescription>
          </CardHeader>
          <CardContent>
            {checklist.highRiskFiles?.length > 0 ? (
              <ScrollArea className="h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead className="w-20">Risk</TableHead>
                      <TableHead className="w-20">Edits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklist.highRiskFiles.map((file: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs truncate max-w-[200px]">
                          {file.filepath.split('/').pop()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`text-xs ${
                              file.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {file.riskScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{file.editCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mb-2 text-green-500" />
                <p>No high-risk files detected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            Active Patterns to Avoid
          </CardTitle>
          <CardDescription>Known problematic patterns with prevention strategies</CardDescription>
        </CardHeader>
        <CardContent>
          {checklist.activePatterns?.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {checklist.activePatterns.map((pattern: any) => (
                  <div
                    key={pattern.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pattern.name}</span>
                        <Badge variant="outline" className="text-xs">{pattern.code}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Occurred {pattern.occurrenceCount} times • Cost: ${pattern.costWasted?.toFixed(2) || 0}
                      </p>
                      {pattern.prevention?.length > 0 && (
                        <p className="text-xs mt-2 text-green-600">
                          ✓ {pattern.prevention[0]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Target className="h-8 w-8 mb-2 opacity-50" />
              <p>No active patterns</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-sm">Daily Budget</p>
              <p className="text-xl font-bold">${checklist.budgetStatus?.dailyBudget?.toFixed(2) || '5.00'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Spent Today</p>
              <p className="text-xl font-bold text-red-600">${checklist.budgetStatus?.spent?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Remaining</p>
              <p className="text-xl font-bold text-green-600">${checklist.budgetStatus?.remaining?.toFixed(2) || '5.00'}</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={checklist.budgetStatus?.percentUsed || 0} />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {checklist.budgetStatus?.percentUsed || 0}% used
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {checklist.recommendations?.length > 0 && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertTitle>Recommended Focus</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {checklist.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {rec}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default PreSessionChecklist;
