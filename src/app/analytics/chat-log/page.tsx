/**
 * CHAT LOG ANALYTICS PAGE
 * =======================
 * Analytics for AI development sessions, token metrics, and performance insights
 * Route: /analytics/chat-log
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  Brain,
  MessageSquare,
  Zap,
  FileCode,
  GitBranch,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Code,
  Bug,
  Box,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  DollarSign,
  Cpu,
  HardDrive,
  Terminal,
  FolderOpen,
  Settings,
  MessageCircle,
  Sparkles,
  Target,
  Layers,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  SessionOverviewCard,
  TokenMetricsChart,
  ToolCallsPanel,
  FileOperationsPanel,
  IssuesTrackerPanel,
  FeaturesPanel,
  QualityMetricsCard,
  PerformanceTimeline,
} from '@/components/chat-logs';
import type { ChatLogSession, DashboardStats } from '@/components/chat-logs';

// =============================================================================
// TYPES
// =============================================================================

interface AnalyticsState {
  sessions: ChatLogSession[];
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ChatLogAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatLogSession | null>(null);
  const [state, setState] = useState<AnalyticsState>({
    sessions: [],
    stats: null,
    loading: true,
    error: null,
  });

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params = new URLSearchParams();
      params.append('range', dateRange);

      const response = await fetch(`/api/chat-logs/dashboard?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setState({
          sessions: data.sessions || [],
          stats: data.stats || null,
          loading: false,
          error: null,
        });
        // Auto-select first session if none selected
        if (data.sessions?.length > 0 && !selectedSession) {
          setSelectedSession(data.sessions[0]);
        }
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to load analytics',
        }));
      }
    } catch (e: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: e.message || 'Network error',
      }));
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const { sessions, stats, loading, error } = state;

  // Loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Analytics</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Chat Log Analytics</h1>
              <p className="text-muted-foreground">
                AI development session analytics, token metrics, and performance insights
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Navigation Links */}
          <Link href="/analytics/api">
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              API Analytics
            </Button>
          </Link>

          <Button size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard
            title="Sessions"
            value={stats.totalSessions}
            icon={<Activity className="h-4 w-4" />}
            color="text-blue-500"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="Total Tokens"
            value={formatNumber(stats.totalTokens)}
            icon={<Cpu className="h-4 w-4" />}
            color="text-purple-500"
            bgColor="bg-purple-50"
          />
          <StatCard
            title="Total Cost"
            value={`$${stats.totalCost.toFixed(2)}`}
            icon={<DollarSign className="h-4 w-4" />}
            color="text-green-500"
            bgColor="bg-green-50"
          />
          <StatCard
            title="Avg Efficiency"
            value={`${stats.avgEfficiency}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-cyan-500"
            bgColor="bg-cyan-50"
          />
          <StatCard
            title="Avg Quality"
            value={`${stats.avgQuality}%`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-emerald-500"
            bgColor="bg-emerald-50"
          />
          <StatCard
            title="Files Changed"
            value={stats.totalFilesModified}
            icon={<FileCode className="h-4 w-4" />}
            color="text-orange-500"
            bgColor="bg-orange-50"
          />
          <StatCard
            title="Issues"
            value={stats.totalIssues}
            icon={<Bug className="h-4 w-4" />}
            color="text-red-500"
            bgColor="bg-red-50"
          />
          <StatCard
            title="Features"
            value={stats.totalFeatures}
            icon={<Box className="h-4 w-4" />}
            color="text-indigo-500"
            bgColor="bg-indigo-50"
          />
        </div>
      )}

      {/* Session Selector */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Select Session
            </CardTitle>
            <CardDescription>
              Choose a session to analyze detailed metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedSession?.id || ''}
              onValueChange={(v) => {
                const session = sessions.find(s => s.id === v);
                setSelectedSession(session || null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a session to analyze" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map(session => (
                  <SelectItem key={session.id} value={session.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {session.sessionType}
                      </Badge>
                      <span className="truncate max-w-[300px]">{session.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {selectedSession ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SessionOverviewCard session={selectedSession} />
                <QualityMetricsCard session={selectedSession} />
              </div>
              <PerformanceTimeline session={selectedSession} />
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session to view overview
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4 mt-4">
          {selectedSession ? (
            <TokenMetricsChart session={selectedSession} stats={stats} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session to view token metrics
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4 mt-4">
          {selectedSession ? (
            <ToolCallsPanel sessionId={selectedSession.id} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session to view tool calls
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4 mt-4">
          {selectedSession ? (
            <FileOperationsPanel sessionId={selectedSession.id} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session to view file operations
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4 mt-4">
          {selectedSession ? (
            <IssuesTrackerPanel sessionId={selectedSession.id} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session to view issues
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4 mt-4">
          {selectedSession ? (
            <FeaturesPanel sessionId={selectedSession.id} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session to view features
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Session Type Distribution */}
      {stats && Object.keys(stats.sessionsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Session Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of sessions by type and category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Type */}
              <div>
                <h4 className="text-sm font-medium mb-3">By Type</h4>
                <div className="space-y-2">
                  {Object.entries(stats.sessionsByType).map(([type, count]) => {
                    const total = stats.totalSessions;
                    const percentage = (count / total) * 100;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{type}</span>
                          <span className="text-muted-foreground">
                            {count} sessions ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Category */}
              <div>
                <h4 className="text-sm font-medium mb-3">By Category</h4>
                <div className="space-y-2">
                  {Object.entries(stats.sessionsByCategory).map(([category, count]) => {
                    const total = stats.totalSessions;
                    const percentage = (count / total) * 100;
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{category}</span>
                          <span className="text-muted-foreground">
                            {count} sessions ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token & Cost Trend */}
      {stats && stats.tokensByDay && stats.tokensByDay.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Token & Cost Trend
            </CardTitle>
            <CardDescription>
              Daily token usage and estimated cost over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tokens by Day */}
              <div>
                <h4 className="text-sm font-medium mb-3">Tokens by Day</h4>
                <div className="h-[150px] flex items-end gap-1">
                  {stats.tokensByDay.slice(-30).map((item, i) => {
                    const maxTokens = Math.max(...stats.tokensByDay.map(d => d.tokens), 1);
                    const height = (item.tokens / maxTokens) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-purple-500 rounded-t transition-all hover:bg-purple-400"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${formatNumber(item.tokens)} tokens on ${item.date}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{stats.tokensByDay[0]?.date || '-'}</span>
                  <span>{stats.tokensByDay[stats.tokensByDay.length - 1]?.date || '-'}</span>
                </div>
              </div>

              {/* Cost by Day */}
              <div>
                <h4 className="text-sm font-medium mb-3">Cost by Day</h4>
                <div className="h-[150px] flex items-end gap-1">
                  {stats.costByDay.slice(-30).map((item, i) => {
                    const maxCost = Math.max(...stats.costByDay.map(d => d.cost), 0.01);
                    const height = (item.cost / maxCost) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-green-500 rounded-t transition-all hover:bg-green-400"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`$${item.cost.toFixed(2)} on ${item.date}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{stats.costByDay[0]?.date || '-'}</span>
                  <span>{stats.costByDay[stats.costByDay.length - 1]?.date || '-'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links Footer */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                Auto-refresh: Off
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              <Link href="/analytics/api" className="text-blue-600 hover:underline flex items-center gap-1">
                <Activity className="h-4 w-4" />
                API Analytics
              </Link>
              <Link href="/analysis/chat-logs" className="text-blue-600 hover:underline flex items-center gap-1">
                <Brain className="h-4 w-4" />
                Full Dashboard
              </Link>
              <span className="text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatCard({
  title,
  value,
  icon,
  color,
  bgColor,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <Card className={`border-l-4 ${bgColor || ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
          <div className={`${color} opacity-50`}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
