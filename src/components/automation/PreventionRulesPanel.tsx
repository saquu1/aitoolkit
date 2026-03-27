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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Code,
  Terminal,
  DollarSign,
  RefreshCw,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PreventionRulesPanelProps {}

export function PreventionRulesPanel({}: PreventionRulesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<any>(null);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/automation/prevention');
      const data = await response.json();

      if (data.success) {
        setPatterns(data.patterns || []);
      }
    } catch (error) {
      console.error('Failed to fetch prevention patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Prevention Rules Generator</AlertTitle>
        <AlertDescription>
          Generate ESLint rules and pre-commit hooks from patterns with 3+ occurrences.
          These rules help prevent recurring issues automatically.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Patterns Ready</p>
                <p className="text-xl font-bold">{patterns.length}</p>
              </div>
              <Shield className="h-5 w-5 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Potential Savings</p>
                <p className="text-xl font-bold text-green-600">
                  ${patterns.reduce((sum, p) => sum + (p.suggestedRule?.impact?.projectedSavings || 0), 0).toFixed(2)}/mo
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Occurrences</p>
                <p className="text-xl font-bold">{patterns.reduce((sum, p) => sum + p.occurrenceCount, 0)}</p>
              </div>
              <RefreshCw className="h-5 w-5 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patterns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patterns Needing Prevention</CardTitle>
          <CardDescription>
            Click on a pattern to generate prevention rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {patterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-2 text-green-500 opacity-50" />
                <p>No patterns need prevention rules</p>
                <p className="text-sm">Great job! Keep up the good work.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead className="w-24">Occurrences</TableHead>
                    <TableHead className="w-24">Cost Wasted</TableHead>
                    <TableHead className="w-32">Projected Savings</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((pattern) => (
                    <TableRow
                      key={pattern.patternId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <div>
                            <span className="font-medium">{pattern.patternName}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{pattern.patternCode}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pattern.occurrenceCount}</Badge>
                      </TableCell>
                      <TableCell className="text-red-600">
                        ${pattern.costWasted?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-green-600">
                        ${pattern.suggestedRule?.impact?.projectedSavings?.toFixed(2) || '0.00'}/mo
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Generate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rule Detail Dialog */}
      <Dialog open={!!selectedPattern} onOpenChange={() => setSelectedPattern(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Prevention Rules: {selectedPattern?.patternName}
            </DialogTitle>
            <DialogDescription>
              Generated rules to prevent this pattern from occurring again
            </DialogDescription>
          </DialogHeader>
          {selectedPattern && (
            <div className="space-y-4">
              {/* Impact */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-600">${selectedPattern.costWasted?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-muted-foreground">Total Wasted</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-lg font-bold text-amber-600">{selectedPattern.occurrenceCount}</p>
                  <p className="text-xs text-muted-foreground">Occurrences</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    ${selectedPattern.suggestedRule?.impact?.projectedSavings?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground">Projected Savings/mo</p>
                </div>
              </div>

              {/* Rule Tabs */}
              <Tabs defaultValue="eslint" value={selectedRule || 'eslint'} onValueChange={setSelectedRule}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="eslint">
                    <Code className="h-4 w-4 mr-2" />
                    ESLint Rule
                  </TabsTrigger>
                  <TabsTrigger value="preCommit">
                    <Terminal className="h-4 w-4 mr-2" />
                    Pre-Commit Hook
                  </TabsTrigger>
                  <TabsTrigger value="vscode">
                    VS Code Snippet
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="eslint" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">ESLint Rule</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(selectedPattern.suggestedRule?.eslint || '')}
                        >
                          {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                        {selectedPattern.suggestedRule?.eslint}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preCommit" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Pre-Commit Hook</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(selectedPattern.suggestedRule?.preCommit || '')}
                        >
                          {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                        {selectedPattern.suggestedRule?.preCommit}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vscode" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">VS Code Snippet</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(selectedPattern.suggestedRule?.vsCode || '')}
                        >
                          {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                        {selectedPattern.suggestedRule?.vsCode}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex gap-2">
                <Button>Apply ESLint Rule</Button>
                <Button variant="outline">Apply Pre-Commit Hook</Button>
                <Button variant="ghost">Skip</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PreventionRulesPanel;
