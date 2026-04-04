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
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Legend,
} from 'recharts';
import {
  Terminal,
  FileCode,
  FileEdit,
  FileSearch,
  CheckSquare,
  GitBranch,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface ToolCallsPanelProps {
  sessionId: string;
}

interface ToolCall {
  id: string;
  toolName: string;
  description: string;
  command?: string;
  filepath?: string;
  resultStatus: string;
  durationMs: number;
  isGitOperation: boolean;
  isBuildCommand: boolean;
  isFileOperation: boolean;
  isDangerous: boolean;
  startedAt?: Date;
  endedAt?: Date;
}

const TOOL_COLORS: Record<string, string> = {
  'BASH': '#f59e0b',
  'WRITE': '#10b981',
  'READ': '#3b82f6',
  'EDIT': '#8b5cf6',
  'TODO_WRITE': '#ec4899',
  'OTHER': '#6b7280',
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  'BASH': <Terminal className="h-4 w-4" />,
  'WRITE': <FileCode className="h-4 w-4" />,
  'READ': <FileSearch className="h-4 w-4" />,
  'EDIT': <FileEdit className="h-4 w-4" />,
  'TODO_WRITE': <CheckSquare className="h-4 w-4" />,
  'OTHER': <ChevronRight className="h-4 w-4" />,
};

export function ToolCallsPanel({ sessionId }: ToolCallsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);

  useEffect(() => {
    fetchToolCalls();
  }, [sessionId]);

  const fetchToolCalls = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat-logs/tool-calls?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setToolCalls(data.toolCalls || []);
      }
    } catch (error) {
      console.error('Failed to fetch tool calls:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: toolCalls.length,
    success: toolCalls.filter(t => t.resultStatus === 'completed' || t.resultStatus === 'success').length,
    failed: toolCalls.filter(t => t.resultStatus === 'error').length,
    avgDuration: toolCalls.length > 0 
      ? Math.round(toolCalls.reduce((sum, t) => sum + (t.durationMs || 0), 0) / toolCalls.length)
      : 0,
    byType: {} as Record<string, number>,
    gitOps: toolCalls.filter(t => t.isGitOperation).length,
    buildOps: toolCalls.filter(t => t.isBuildCommand).length,
    dangerousOps: toolCalls.filter(t => t.isDangerous).length,
  };

  toolCalls.forEach(t => {
    stats.byType[t.toolName] = (stats.byType[t.toolName] || 0) + 1;
  });

  const typeChartData = Object.entries(stats.byType).map(([name, count]) => ({
    name,
    count,
    color: TOOL_COLORS[name] || TOOL_COLORS['OTHER'],
  }));

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
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Calls</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              <p className="text-xs text-muted-foreground">Success</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${stats.failed > 0 ? 'text-red-600' : ''}`}>
                {stats.failed}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.avgDuration}ms</p>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.gitOps}</p>
              <p className="text-xs text-muted-foreground">Git Operations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tool Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calls by Tool Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tool Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Calls Detail</CardTitle>
          <CardDescription>
            {toolCalls.length} tool operations executed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Tool</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Duration</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toolCalls.map((tool, index) => (
                  <TableRow 
                    key={tool.id || index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTool(tool)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div style={{ color: TOOL_COLORS[tool.toolName] || TOOL_COLORS['OTHER'] }}>
                          {TOOL_ICONS[tool.toolName] || TOOL_ICONS['OTHER']}
                        </div>
                        <Badge 
                          variant="outline" 
                          style={{ 
                            borderColor: TOOL_COLORS[tool.toolName] || TOOL_COLORS['OTHER'],
                            color: TOOL_COLORS[tool.toolName] || TOOL_COLORS['OTHER']
                          }}
                        >
                          {tool.toolName}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {tool.description || tool.filepath || tool.command?.slice(0, 50) || '-'}
                    </TableCell>
                    <TableCell>
                      {tool.resultStatus === 'completed' || tool.resultStatus === 'success' ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Success</span>
                        </div>
                      ) : tool.resultStatus === 'error' ? (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">Error</span>
                        </div>
                      ) : (
                        <Badge variant="secondary">{tool.resultStatus}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{tool.durationMs || 0}ms</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {tool.isGitOperation && (
                          <GitBranch className="h-3 w-3 text-orange-500" />
                        )}
                        {tool.isDangerous && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTool} onOpenChange={() => setSelectedTool(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTool && TOOL_ICONS[selectedTool.toolName]}
              {selectedTool?.toolName} Call
            </DialogTitle>
            <DialogDescription>
              {selectedTool?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedTool && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge 
                    className="ml-2" 
                    variant={selectedTool.resultStatus === 'error' ? 'destructive' : 'default'}
                  >
                    {selectedTool.resultStatus}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2 font-medium">{selectedTool.durationMs}ms</span>
                </div>
              </div>
              {selectedTool.filepath && (
                <div>
                  <span className="text-muted-foreground text-sm">File Path:</span>
                  <code className="block mt-1 p-2 bg-muted rounded text-xs">
                    {selectedTool.filepath}
                  </code>
                </div>
              )}
              {selectedTool.command && (
                <div>
                  <span className="text-muted-foreground text-sm">Command:</span>
                  <code className="block mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {selectedTool.command}
                  </code>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ToolCallsPanel;
