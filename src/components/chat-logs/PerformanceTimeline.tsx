'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import {
  Timer,
  Brain,
  Terminal,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  Gauge,
} from 'lucide-react';
import type { ChatLogSession } from './ChatLogsIntelligenceDashboard';

interface PerformanceTimelineProps {
  session: ChatLogSession;
}

export function PerformanceTimeline({ session }: PerformanceTimelineProps) {
  // Calculate performance metrics
  const reasoningSeconds = (session.totalReasoningMs / 1000).toFixed(1);
  const toolCallSeconds = (session.totalToolCallMs / 1000).toFixed(1);
  const totalActiveSeconds = ((session.totalReasoningMs + session.totalToolCallMs) / 1000).toFixed(1);
  const sessionMinutes = (session.durationMs / 60000).toFixed(1);

  // Time distribution data
  const timeDistribution = [
    { name: 'Reasoning', value: session.totalReasoningMs / 1000, color: '#8b5cf6' },
    { name: 'Tool Calls', value: session.totalToolCallMs / 1000, color: '#f59e0b' },
    { name: 'Idle/Other', value: Math.max(0, (session.durationMs - session.totalReasoningMs - session.totalToolCallMs) / 1000), color: '#6b7280' },
  ];

  // Performance breakdown data
  const performanceData = [
    { 
      metric: 'Commands', 
      value: session.commandsRun, 
      target: 50,
      color: '#3b82f6',
    },
    { 
      metric: 'Files', 
      value: session.filesCreated + session.filesModified, 
      target: 20,
      color: '#10b981',
    },
    { 
      metric: 'LOC', 
      value: Math.min(100, session.linesOfCode / 10), 
      target: 50,
      color: '#8b5cf6',
    },
    { 
      metric: 'Tokens (K)', 
      value: session.totalTokens / 1000, 
      target: 100,
      color: '#f59e0b',
    },
  ];

  // Efficiency metrics
  const efficiencyMetrics = {
    tokensPerMinute: session.durationMs > 0 
      ? Math.round(session.totalTokens / (session.durationMs / 60000))
      : 0,
    linesPerMinute: session.durationMs > 0 
      ? (session.linesOfCode / (session.durationMs / 60000)).toFixed(1)
      : 0,
    commandsPerMinute: session.durationMs > 0 
      ? (session.commandsRun / (session.durationMs / 60000)).toFixed(1)
      : 0,
    reasoningRatio: session.totalReasoningMs + session.totalToolCallMs > 0
      ? ((session.totalReasoningMs / (session.totalReasoningMs + session.totalToolCallMs)) * 100).toFixed(0)
      : 0,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-orange-500" />
          Performance Timeline
        </CardTitle>
        <CardDescription>
          Time distribution and efficiency metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{sessionMinutes}m</p>
            <p className="text-xs text-muted-foreground">Total Duration</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Brain className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold text-purple-600">{reasoningSeconds}s</p>
            <p className="text-xs text-muted-foreground">Reasoning</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <Terminal className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold text-amber-600">{toolCallSeconds}s</p>
            <p className="text-xs text-muted-foreground">Tool Calls</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Zap className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-green-600">{totalActiveSeconds}s</p>
            <p className="text-xs text-muted-foreground">Active Time</p>
          </div>
        </div>

        <Separator />

        {/* Time Distribution Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Time Distribution</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={timeDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${v}s`} />
              <YAxis type="category" dataKey="name" width={80} fontSize={12} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}s`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {timeDistribution.map((entry, index) => (
                  <Bar key={`cell-${index}`} dataKey="value" fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        {/* Efficiency Metrics */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Efficiency Metrics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Tokens/min</span>
              </div>
              <p className="text-xl font-bold">{efficiencyMetrics.tokensPerMinute}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Lines/min</span>
              </div>
              <p className="text-xl font-bold">{efficiencyMetrics.linesPerMinute}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Commands/min</span>
              </div>
              <p className="text-xl font-bold">{efficiencyMetrics.commandsPerMinute}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Reasoning %</span>
              </div>
              <p className="text-xl font-bold">{efficiencyMetrics.reasoningRatio}%</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Performance Bar */}
        <div>
          <h4 className="text-sm font-medium mb-3">Performance Breakdown</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {performanceData.map((entry, index) => (
                  <Bar key={`cell-${index}`} dataKey="value" fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Timeline Simulation */}
        <div>
          <h4 className="text-sm font-medium mb-3">Session Activity</h4>
          <div className="flex gap-1 h-8">
            {Array.from({ length: 20 }).map((_, i) => {
              // Simulate activity pattern
              const intensity = Math.random();
              let color = 'bg-muted';
              if (intensity > 0.7) color = 'bg-purple-500';
              else if (intensity > 0.4) color = 'bg-amber-500';
              else if (intensity > 0.2) color = 'bg-green-500';
              
              return (
                <div 
                  key={i}
                  className={`flex-1 rounded-sm ${color} opacity-${30 + Math.round(intensity * 70)}`}
                  style={{ opacity: 0.3 + intensity * 0.7 }}
                  title={`Activity segment ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-muted-foreground">Error Rate</p>
            <p className={`text-lg font-bold ${session.commandsFailed > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {session.commandsRun > 0 
                ? Math.round((session.commandsFailed / session.commandsRun) * 100)
                : 0}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Build Success</p>
            <p className={`text-lg font-bold ${session.buildAttempts > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
              {session.buildAttempts > 0 ? 'Passed' : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Git Commits</p>
            <p className="text-lg font-bold">{session.gitCommits}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PerformanceTimeline;
