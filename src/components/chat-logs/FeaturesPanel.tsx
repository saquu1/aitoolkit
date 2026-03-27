'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Box,
  FileCode,
  Code,
  Clock,
  DollarSign,
  CheckCircle2,
  TestTube,
  FileText,
  RefreshCw,
  ArrowUpRight,
  Zap,
  TrendingUp,
  Layers,
} from 'lucide-react';

interface FeaturesPanelProps {
  sessionId: string;
}

interface Feature {
  id: string;
  featureName: string;
  featureType: string;
  description?: string;
  category: string;
  tags: string[];
  module?: string;
  complexity: 'simple' | 'moderate' | 'complex';
  filesCreated: string[];
  filesModified: string[];
  linesAdded: number;
  linesDeleted: number;
  linesOfCode: number;
  developmentTime: number;
  developmentTimeMs: number;
  complexityScore: number;
  testCoverage: number;
  tokensConsumed: number;
  costUSD: number;
  hasTests: boolean;
  hasDocs: boolean;
  reviewStatus: 'pending' | 'approved' | 'needs_changes';
  dependencies: string[];
  dependents: string[];
}

const COMPLEXITY_COLORS: Record<string, string> = {
  'simple': '#10b981',
  'moderate': '#f59e0b',
  'complex': '#ef4444',
};

const REVIEW_STATUS_COLORS: Record<string, string> = {
  'pending': 'bg-amber-100 text-amber-800',
  'approved': 'bg-green-100 text-green-800',
  'needs_changes': 'bg-red-100 text-red-800',
};

export function FeaturesPanel({ sessionId }: FeaturesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [filter, setFilter] = useState<'all' | 'with_tests' | 'with_docs'>('all');

  useEffect(() => {
    fetchFeatures();
  }, [sessionId]);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat-logs/features?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setFeatures(data.features || []);
      }
    } catch (error) {
      console.error('Failed to fetch features:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: features.length,
    withTests: features.filter(f => f.hasTests).length,
    withDocs: features.filter(f => f.hasDocs).length,
    totalLinesAdded: features.reduce((sum, f) => sum + f.linesAdded, 0),
    totalLinesDeleted: features.reduce((sum, f) => sum + f.linesDeleted, 0),
    totalLOC: features.reduce((sum, f) => sum + f.linesOfCode, 0),
    totalTokens: features.reduce((sum, f) => sum + f.tokensConsumed, 0),
    totalCost: features.reduce((sum, f) => sum + f.costUSD, 0),
    avgComplexity: features.length > 0 
      ? Math.round(features.reduce((sum, f) => sum + f.complexityScore, 0) / features.length)
      : 0,
    avgTestCoverage: features.filter(f => f.testCoverage > 0).length > 0
      ? Math.round(features.filter(f => f.testCoverage > 0).reduce((sum, f) => sum + f.testCoverage, 0) / features.filter(f => f.testCoverage > 0).length)
      : 0,
    simple: features.filter(f => f.complexity === 'simple').length,
    moderate: features.filter(f => f.complexity === 'moderate').length,
    complex: features.filter(f => f.complexity === 'complex').length,
    byCategory: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    pending: features.filter(f => f.reviewStatus === 'pending').length,
    approved: features.filter(f => f.reviewStatus === 'approved').length,
  };

  features.forEach(f => {
    stats.byCategory[f.category] = (stats.byCategory[f.category] || 0) + 1;
    stats.byType[f.featureType] = (stats.byType[f.featureType] || 0) + 1;
  });

  // Filter features
  const filteredFeatures = filter === 'all' 
    ? features 
    : filter === 'with_tests' 
      ? features.filter(f => f.hasTests)
      : features.filter(f => f.hasDocs);

  // Chart data
  const complexityChartData = [
    { name: 'Simple', value: stats.simple, color: COMPLEXITY_COLORS['simple'] },
    { name: 'Moderate', value: stats.moderate, color: COMPLEXITY_COLORS['moderate'] },
    { name: 'Complex', value: stats.complex, color: COMPLEXITY_COLORS['complex'] },
  ];

  const categoryChartData = Object.entries(stats.byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Radar chart data for feature analysis
  const radarData = [
    { subject: 'Code Quality', A: stats.avgComplexity, fullMark: 100 },
    { subject: 'Test Coverage', A: stats.avgTestCoverage, fullMark: 100 },
    { subject: 'Documentation', A: Math.round((stats.withDocs / Math.max(1, stats.total)) * 100), fullMark: 100 },
    { subject: 'Tests', A: Math.round((stats.withTests / Math.max(1, stats.total)) * 100), fullMark: 100 },
    { subject: 'Reviews', A: Math.round((stats.approved / Math.max(1, stats.total)) * 100), fullMark: 100 },
  ];

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
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Features</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.withTests}</p>
              <p className="text-xs text-muted-foreground">With Tests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.withDocs}</p>
              <p className="text-xs text-muted-foreground">With Docs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.totalLOC}</p>
              <p className="text-xs text-muted-foreground">Lines of Code</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.avgComplexity}</p>
              <p className="text-xs text-muted-foreground">Avg Complexity</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Score */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <TestTube className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Test Coverage</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.avgTestCoverage}%</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Feature className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Features w/ Tests</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.withTests / stats.total) * 100) : 0}%
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Documentation</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.withDocs / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Complexity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complexityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {complexityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'with_tests', 'with_docs'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Features' : f === 'with_tests' ? 'With Tests' : 'With Docs'}
            <Badge variant="secondary" className="ml-2">
              {f === 'all' ? stats.total : f === 'with_tests' ? stats.withTests : stats.withDocs}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Features Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features Detail</CardTitle>
          <CardDescription>
            {filteredFeatures.length} feature(s) implemented
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredFeatures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Box className="h-12 w-12 mb-2 text-indigo-500 opacity-50" />
                <p>No features found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature Name</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[100px]">Complexity</TableHead>
                    <TableHead className="w-[100px]">LOC</TableHead>
                    <TableHead className="w-[80px]">Tests</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeatures.map((feature, index) => (
                    <TableRow 
                      key={feature.id || index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedFeature(feature)}
                    >
                      <TableCell>
                        <div className="font-medium">{feature.featureName}</div>
                        {feature.module && (
                          <div className="text-xs text-muted-foreground">
                            {feature.module}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {feature.featureType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: COMPLEXITY_COLORS[feature.complexity],
                            color: 'white'
                          }}
                          className="text-xs"
                        >
                          {feature.complexity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{feature.linesOfCode}</span>
                      </TableCell>
                      <TableCell>
                        {feature.hasTests ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${REVIEW_STATUS_COLORS[feature.reviewStatus]}`}>
                          {feature.reviewStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Feature Detail Dialog */}
      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-indigo-500" />
              {selectedFeature?.featureName}
            </DialogTitle>
            <DialogDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{selectedFeature?.featureType}</Badge>
                <Badge 
                  style={{ 
                    backgroundColor: COMPLEXITY_COLORS[selectedFeature?.complexity || 'simple'],
                    color: 'white'
                  }}
                >
                  {selectedFeature?.complexity}
                </Badge>
                <Badge className={REVIEW_STATUS_COLORS[selectedFeature?.reviewStatus || 'pending']}>
                  {selectedFeature?.reviewStatus}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedFeature && (
            <div className="space-y-4">
              {selectedFeature.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="mt-1 text-sm">{selectedFeature.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">+{selectedFeature.linesAdded}</p>
                  <p className="text-xs text-muted-foreground">Lines Added</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xl font-bold text-red-600">-{selectedFeature.linesDeleted}</p>
                  <p className="text-xs text-muted-foreground">Lines Deleted</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xl font-bold text-purple-600">{selectedFeature.linesOfCode}</p>
                  <p className="text-xs text-muted-foreground">Net LOC</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Complexity Score:</span>
                  <span className="font-medium">{selectedFeature.complexityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Test Coverage:</span>
                  <span className="font-medium">{selectedFeature.testCoverage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens Used:</span>
                  <span className="font-medium">{selectedFeature.tokensConsumed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">${selectedFeature.costUSD.toFixed(4)}</span>
                </div>
              </div>

              <Separator />

              {/* Files */}
              <div className="grid grid-cols-2 gap-4">
                {selectedFeature.filesCreated.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">Files Created ({selectedFeature.filesCreated.length}):</span>
                    <ScrollArea className="h-24 mt-1">
                      <div className="space-y-1">
                        {selectedFeature.filesCreated.map((file, i) => (
                          <Badge key={i} variant="secondary" className="mr-1 mb-1 font-mono text-xs">
                            <FileCode className="h-3 w-3 mr-1" />
                            {file.split('/').pop()}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                {selectedFeature.filesModified.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">Files Modified ({selectedFeature.filesModified.length}):</span>
                    <ScrollArea className="h-24 mt-1">
                      <div className="space-y-1">
                        {selectedFeature.filesModified.map((file, i) => (
                          <Badge key={i} variant="outline" className="mr-1 mb-1 font-mono text-xs">
                            <FileCode className="h-3 w-3 mr-1" />
                            {file.split('/').pop()}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Quality indicators */}
              <div className="flex gap-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${selectedFeature.hasTests ? 'bg-green-50' : 'bg-muted'}`}>
                  <TestTube className={`h-4 w-4 ${selectedFeature.hasTests ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm">{selectedFeature.hasTests ? 'Has Tests' : 'No Tests'}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${selectedFeature.hasDocs ? 'bg-blue-50' : 'bg-muted'}`}>
                  <FileText className={`h-4 w-4 ${selectedFeature.hasDocs ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm">{selectedFeature.hasDocs ? 'Has Docs' : 'No Docs'}</span>
                </div>
              </div>

              {/* Tags */}
              {selectedFeature.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedFeature.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
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

export default FeaturesPanel;
