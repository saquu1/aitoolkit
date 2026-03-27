'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { SessionOverviewCard } from './SessionOverviewCard';
import { TokenMetricsChart } from './TokenMetricsChart';
import { ToolCallsPanel } from './ToolCallsPanel';
import { FileOperationsPanel } from './FileOperationsPanel';
import { IssuesTrackerPanel } from './IssuesTrackerPanel';
import { FeaturesPanel } from './FeaturesPanel';
import { QualityMetricsCard } from './QualityMetricsCard';
import { PerformanceTimeline } from './PerformanceTimeline';
import { ErrorPatternBankPanel } from './ErrorPatternBankPanel';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatLogSession {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  sessionDate: Date;
  model: string;
  modelName: string;
  sessionType: string;
  category: string;
  tags: string[];
  status: string;
  
  // Token Metrics
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
  cacheHitRate: number;
  reasoningTokens: number;
  estimatedCost: number;
  
  // Message Counts
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  
  // Timing
  duration: number;
  durationMs: number;
  totalReasoningMs: number;
  totalToolCallMs: number;
  
  // Commands
  commandsRun: number;
  commandsFailed: number;
  gitCommits: number;
  buildAttempts: number;
  
  // Code Metrics
  linesAdded: number;
  linesDeleted: number;
  linesOfCode: number;
  complexityScore: number;
  
  // Quality
  efficiencyScore: number;
  qualityScore: number;
  
  // File Metrics
  filesModified: number;
  filesCreated: number;
  filesRead: number;
  
  // Counts
  contentBlocks: number;
  toolCalls: number;
  issues: number;
  features: number;
}

export interface DashboardStats {
  totalSessions: number;
  totalTokens: number;
  totalCost: number;
  avgEfficiency: number;
  avgQuality: number;
  totalFilesModified: number;
  totalIssues: number;
  totalFeatures: number;
  sessionsByType: Record<string, number>;
  sessionsByCategory: Record<string, number>;
  tokensByDay: { date: string; tokens: number }[];
  costByDay: { date: string; cost: number }[];
}

interface ChatLogsIntelligenceDashboardProps {
  projectId?: string;
  sessionId?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChatLogsIntelligenceDashboard({ 
  projectId,
  sessionId 
}: ChatLogsIntelligenceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState<ChatLogSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatLogSession | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (sessionId) params.append('sessionId', sessionId);
      params.append('range', dateRange);

      const response = await fetch(`/api/chat-logs/dashboard?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions || []);
        setStats(data.stats || null);
        if (data.sessions?.length > 0 && !selectedSession) {
          setSelectedSession(data.sessions[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, sessionId, dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading Intelligence Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            Chat Logs Intelligence Dashboard
          </h2>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights from AI development sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
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
          />
          <StatCard
            title="Total Tokens"
            value={formatNumber(stats.totalTokens)}
            icon={<Cpu className="h-4 w-4" />}
            color="text-purple-500"
          />
          <StatCard
            title="Total Cost"
            value={`$${stats.totalCost.toFixed(2)}`}
            icon={<DollarSign className="h-4 w-4" />}
            color="text-green-500"
          />
          <StatCard
            title="Avg Efficiency"
            value={`${stats.avgEfficiency}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-cyan-500"
          />
          <StatCard
            title="Avg Quality"
            value={`${stats.avgQuality}%`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-emerald-500"
          />
          <StatCard
            title="Files Changed"
            value={stats.totalFilesModified}
            icon={<FileCode className="h-4 w-4" />}
            color="text-orange-500"
          />
          <StatCard
            title="Issues"
            value={stats.totalIssues}
            icon={<Bug className="h-4 w-4" />}
            color="text-red-500"
          />
          <StatCard
            title="Features"
            value={stats.totalFeatures}
            icon={<Box className="h-4 w-4" />}
            color="text-indigo-500"
          />
        </div>
      )}

      {/* Session Selector */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Session</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedSession?.id || ''}
              onValueChange={(v) => {
                const session = sessions.find(s => s.id === v);
                setSelectedSession(session || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a session to analyze" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map(session => (
                  <SelectItem key={session.id} value={session.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {session.sessionType}
                      </Badge>
                      <span>{session.title}</span>
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
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 min-w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-1">
              <Bug className="h-4 w-4" />
              Patterns
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
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
        <TabsContent value="tokens" className="space-y-4">
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
        <TabsContent value="tools" className="space-y-4">
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
        <TabsContent value="files" className="space-y-4">
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
        <TabsContent value="issues" className="space-y-4">
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
        <TabsContent value="features" className="space-y-4">
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

        {/* Error Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <ErrorPatternBankPanel sessionId={selectedSession?.id} />
        </TabsContent>
      </Tabs>
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
  trend 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down';
}) {
  return (
    <Card>
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

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default ChatLogsIntelligenceDashboard;
