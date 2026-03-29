'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  Cpu,
  DollarSign,
  TrendingUp,
  Zap,
  Clock,
} from 'lucide-react';
import type { ChatLogSession, DashboardStats } from './ChatLogsIntelligenceDashboard';

interface TokenMetricsChartProps {
  session: ChatLogSession;
  stats: DashboardStats | null;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export function TokenMetricsChart({ session, stats }: TokenMetricsChartProps) {
  const [activeView, setActiveView] = useState<'breakdown' | 'history' | 'comparison'>('breakdown');

  // Token breakdown data
  const tokenBreakdown = [
    { name: 'Input', value: session.inputTokens, color: '#3b82f6' },
    { name: 'Output', value: session.outputTokens, color: '#10b981' },
    { name: 'Cached', value: session.cachedTokens, color: '#f59e0b' },
    { name: 'Reasoning', value: session.reasoningTokens, color: '#8b5cf6' },
  ];

  // Token distribution by type
  const tokenDistribution = [
    { category: 'User Prompts', tokens: Math.round(session.inputTokens * 0.6) },
    { category: 'System Prompts', tokens: Math.round(session.inputTokens * 0.4) },
    { category: 'Reasoning', tokens: session.reasoningTokens },
    { category: 'Code Generated', tokens: Math.round(session.outputTokens * 0.7) },
    { category: 'Explanations', tokens: Math.round(session.outputTokens * 0.3) },
  ];

  // Cost breakdown
  const costBreakdown = [
    { name: 'Input Cost', value: session.estimatedCost * (session.inputTokens / session.totalTokens) || 0 },
    { name: 'Output Cost', value: session.estimatedCost * (session.outputTokens / session.totalTokens) || 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Token Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Tokens</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatTokens(session.totalTokens)}
                </p>
              </div>
              <Cpu className="h-6 w-6 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Input Tokens</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatTokens(session.inputTokens)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Output Tokens</p>
                <p className="text-xl font-bold text-green-600">
                  {formatTokens(session.outputTokens)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Estimated Cost</p>
                <p className="text-xl font-bold text-emerald-600">
                  ${session.estimatedCost.toFixed(4)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="breakdown">Token Breakdown</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="comparison">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Token Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={tokenBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {tokenBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatTokens(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Token Usage by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={tokenDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatTokens(v)} />
                    <YAxis type="category" dataKey="category" width={100} fontSize={12} />
                    <Tooltip formatter={(value: number) => formatTokens(value)} />
                    <Bar dataKey="tokens" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Token Usage Over Time</CardTitle>
              <CardDescription>Daily token consumption trends</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.tokensByDay && stats.tokensByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.tokensByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis tickFormatter={(v) => formatTokens(v)} />
                    <Tooltip formatter={(value: number) => formatTokens(value)} />
                    <Area 
                      type="monotone" 
                      dataKey="tokens" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No historical data available
                </div>
              )}
            </CardContent>
          </Card>

          {stats?.costByDay && stats.costByDay.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.costByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(4)}`} />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input vs Output */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Input vs Output Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Input Tokens</span>
                      <span className="font-medium">{formatTokens(session.inputTokens)}</span>
                    </div>
                    <div className="h-8 bg-muted rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${(session.inputTokens / session.totalTokens) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Output Tokens</span>
                      <span className="font-medium">{formatTokens(session.outputTokens)}</span>
                    </div>
                    <div className="h-8 bg-muted rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${(session.outputTokens / session.totalTokens) * 100}%` }}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ratio (Output/Input):</span>
                    <span className="font-bold">
                      {session.inputTokens > 0 
                        ? (session.outputTokens / session.inputTokens).toFixed(2)
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cache Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cache Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-amber-600">
                      {(session.cacheHitRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Cache Hit Rate</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cached Tokens:</span>
                      <p className="font-medium">{formatTokens(session.cachedTokens)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fresh Tokens:</span>
                      <p className="font-medium">{formatTokens(session.inputTokens - session.cachedTokens)}</p>
                    </div>
                  </div>
                  {session.cacheHitRate > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Zap className="h-4 w-4" />
                      Cache saved ~${(session.estimatedCost * session.cacheHitRate * 0.5).toFixed(4)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatTokens(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default TokenMetricsChart;
