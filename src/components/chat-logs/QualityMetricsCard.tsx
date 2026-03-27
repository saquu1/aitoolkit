'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  TrendingUp,
  Gauge,
  Target,
  Award,
  AlertTriangle,
  Zap,
  Timer,
} from 'lucide-react';
import type { ChatLogSession } from './ChatLogsIntelligenceDashboard';

interface QualityMetricsCardProps {
  session: ChatLogSession;
}

export function QualityMetricsCard({ session }: QualityMetricsCardProps) {
  const efficiencyColor = getScoreColor(session.efficiencyScore);
  const qualityColor = getScoreColor(session.qualityScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-purple-500" />
          Quality Metrics
        </CardTitle>
        <CardDescription>
          Performance and quality indicators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900">
            <div className={`text-3xl font-bold ${efficiencyColor}`}>
              {session.efficiencyScore}%
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">Efficiency</span>
            </div>
            <Progress 
              value={session.efficiencyScore} 
              className="h-2 mt-2"
            />
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <div className={`text-3xl font-bold ${qualityColor}`}>
              {session.qualityScore}%
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Award className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">Quality</span>
            </div>
            <Progress 
              value={session.qualityScore} 
              className="h-2 mt-2 [&>div]:bg-emerald-500"
            />
          </div>
        </div>

        <Separator />

        {/* Detailed Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Detailed Breakdown</h4>
          
          {/* Command Success Rate */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Command Success Rate
              </span>
              <span className="font-medium">
                {session.commandsRun > 0 
                  ? Math.round(((session.commandsRun - session.commandsFailed) / session.commandsRun) * 100)
                  : 100}%
              </span>
            </div>
            <Progress 
              value={session.commandsRun > 0 
                ? ((session.commandsRun - session.commandsFailed) / session.commandsRun) * 100
                : 100} 
              className="h-2"
            />
          </div>

          {/* Reasoning vs Tool Time */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                Reasoning Time Ratio
              </span>
              <span className="font-medium">
                {session.totalReasoningMs + session.totalToolCallMs > 0
                  ? Math.round((session.totalReasoningMs / (session.totalReasoningMs + session.totalToolCallMs)) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex gap-1 h-2">
              <div 
                className="bg-purple-500 rounded-l-full"
                style={{ width: `${session.totalReasoningMs + session.totalToolCallMs > 0
                  ? (session.totalReasoningMs / (session.totalReasoningMs + session.totalToolCallMs)) * 100
                  : 0}%` }}
              />
              <div 
                className="bg-orange-500 rounded-r-full flex-1"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Reasoning</span>
              <span>Tool Calls</span>
            </div>
          </div>

          {/* Token Efficiency */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Output/Input Ratio
              </span>
              <span className="font-medium">
                {session.inputTokens > 0 
                  ? (session.outputTokens / session.inputTokens).toFixed(2)
                  : 0}
              </span>
            </div>
            <Progress 
              value={session.inputTokens > 0 
                ? Math.min(100, (session.outputTokens / session.inputTokens) * 50)
                : 0} 
              className="h-2"
            />
          </div>
        </div>

        <Separator />

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-2">
          <StatusIndicator
            label="All Tests Passed"
            status={session.commandsFailed === 0 ? 'success' : 'warning'}
          />
          <StatusIndicator
            label="Git Committed"
            status={session.gitCommits > 0 ? 'success' : 'neutral'}
          />
          <StatusIndicator
            label="Build Success"
            status={session.buildAttempts > 0 ? 'success' : 'neutral'}
          />
          <StatusIndicator
            label="No Errors"
            status={session.commandsFailed === 0 ? 'success' : 'error'}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ 
  label, 
  status 
}: { 
  label: string; 
  status: 'success' | 'warning' | 'error' | 'neutral' 
}) {
  const config = {
    success: { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, bg: 'bg-green-50' },
    warning: { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, bg: 'bg-yellow-50' },
    error: { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, bg: 'bg-red-50' },
    neutral: { icon: <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />, bg: 'bg-muted' },
  };

  const { icon, bg } = config[status];

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${bg}`}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export default QualityMetricsCard;
