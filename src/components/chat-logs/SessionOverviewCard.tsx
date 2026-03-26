'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  MessageSquare,
  Zap,
  Cpu,
  Timer,
  GitBranch,
  Terminal,
  Code,
  FileCode,
  Database,
  Tag,
} from 'lucide-react';
import type { ChatLogSession } from './ChatLogsIntelligenceDashboard';

interface SessionOverviewCardProps {
  session: ChatLogSession;
}

export function SessionOverviewCard({ session }: SessionOverviewCardProps) {
  const durationMinutes = Math.round(session.durationMs / 60000);
  const durationSeconds = Math.round((session.durationMs % 60000) / 1000);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-500" />
          Session Overview
        </CardTitle>
        <CardDescription>
          {session.title || 'Development Session'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">
              {new Date(session.sessionDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">
              {durationMinutes > 0 ? `${durationMinutes}m ` : ''}{durationSeconds}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Model:</span>
            <Badge variant="outline" className="text-xs">
              {session.modelName || session.model}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="secondary" className="text-xs">
              {session.sessionType}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Message Counts */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Messages</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-lg font-bold">{session.totalMessages}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{session.userMessages}</p>
              <p className="text-xs text-muted-foreground">User</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <p className="text-lg font-bold text-purple-600">{session.assistantMessages}</p>
              <p className="text-xs text-muted-foreground">Assistant</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Token Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-medium">Token Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatTokens(session.totalTokens)} total
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Input</span>
                <span>{formatTokens(session.inputTokens)}</span>
              </div>
              <Progress 
                value={(session.inputTokens / session.totalTokens) * 100} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Output</span>
                <span>{formatTokens(session.outputTokens)}</span>
              </div>
              <Progress 
                value={(session.outputTokens / session.totalTokens) * 100} 
                className="h-2 bg-muted [&>div]:bg-green-500"
              />
            </div>
          </div>
          {session.cacheHitRate > 0 && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Cache hit rate: {(session.cacheHitRate * 100).toFixed(1)}%
            </div>
          )}
        </div>

        <Separator />

        {/* Commands & Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Commands</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Run:</span>
                <span className="font-medium">{session.commandsRun}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Failed:</span>
                <span className={`font-medium ${session.commandsFailed > 0 ? 'text-red-500' : ''}`}>
                  {session.commandsFailed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Git Commits:</span>
                <span className="font-medium">{session.gitCommits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Builds:</span>
                <span className="font-medium">{session.buildAttempts}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Code Stats</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lines Added:</span>
                <span className="font-medium text-green-600">+{session.linesAdded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lines Deleted:</span>
                <span className="font-medium text-red-600">-{session.linesDeleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net LOC:</span>
                <span className="font-medium">{session.linesOfCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Complexity:</span>
                <span className="font-medium">{session.complexityScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-1">
              {session.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatTokens(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default SessionOverviewCard;
