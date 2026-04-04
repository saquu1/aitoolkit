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
  Treemap,
} from 'recharts';
import {
  FileCode,
  FilePlus,
  FileEdit,
  FileSearch,
  FolderOpen,
  Code,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
} from 'lucide-react';

interface FileOperationsPanelProps {
  sessionId: string;
}

interface FileOperation {
  id: string;
  filepath: string;
  operation: 'CREATED' | 'MODIFIED' | 'READ' | 'DELETED';
  linesAdded: number;
  linesRemoved: number;
  netLines: number;
  contentSize: number;
  fileType: string;
  fileCategory: string;
  errorCount: number;
  editCount: number;
  tokensConsumed: number;
  costUSD: number;
}

const OPERATION_COLORS: Record<string, string> = {
  'CREATED': '#10b981',
  'MODIFIED': '#f59e0b',
  'READ': '#3b82f6',
  'DELETED': '#ef4444',
};

const OPERATION_ICONS: Record<string, React.ReactNode> = {
  'CREATED': <FilePlus className="h-4 w-4 text-green-500" />,
  'MODIFIED': <FileEdit className="h-4 w-4 text-amber-500" />,
  'READ': <FileSearch className="h-4 w-4 text-blue-500" />,
  'DELETED': <FileCode className="h-4 w-4 text-red-500" />,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'API_ROUTE': <Code className="h-3 w-3" />,
  'COMPONENT': <FileCode className="h-3 w-3" />,
  'SERVICE': <FolderOpen className="h-3 w-3" />,
  'UTILITY': <Code className="h-3 w-3" />,
  'SCHEMA': <FileCode className="h-3 w-3" />,
  'TEST': <FileCode className="h-3 w-3" />,
  'OTHER': <FileCode className="h-3 w-3" />,
};

export function FileOperationsPanel({ sessionId }: FileOperationsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [fileOps, setFileOps] = useState<FileOperation[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileOperation | null>(null);
  const [filter, setFilter] = useState<'all' | 'CREATED' | 'MODIFIED' | 'READ'>('all');

  useEffect(() => {
    fetchFileOps();
  }, [sessionId]);

  const fetchFileOps = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat-logs/file-operations?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setFileOps(data.fileOperations || []);
      }
    } catch (error) {
      console.error('Failed to fetch file operations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: fileOps.length,
    created: fileOps.filter(f => f.operation === 'CREATED').length,
    modified: fileOps.filter(f => f.operation === 'MODIFIED').length,
    read: fileOps.filter(f => f.operation === 'READ').length,
    totalLinesAdded: fileOps.reduce((sum, f) => sum + f.linesAdded, 0),
    totalLinesRemoved: fileOps.reduce((sum, f) => sum + f.linesRemoved, 0),
    totalNetLines: fileOps.reduce((sum, f) => sum + f.netLines, 0),
    totalTokens: fileOps.reduce((sum, f) => sum + f.tokensConsumed, 0),
    totalCost: fileOps.reduce((sum, f) => sum + f.costUSD, 0),
    byCategory: {} as Record<string, number>,
    byFileType: {} as Record<string, number>,
  };

  fileOps.forEach(f => {
    stats.byCategory[f.fileCategory] = (stats.byCategory[f.fileCategory] || 0) + 1;
    stats.byFileType[f.fileType] = (stats.byFileType[f.fileType] || 0) + 1;
  });

  // Filter files
  const filteredFiles = filter === 'all' 
    ? fileOps 
    : fileOps.filter(f => f.operation === filter);

  // Chart data
  const operationChartData = [
    { name: 'Created', value: stats.created, color: OPERATION_COLORS['CREATED'] },
    { name: 'Modified', value: stats.modified, color: OPERATION_COLORS['MODIFIED'] },
    { name: 'Read', value: stats.read, color: OPERATION_COLORS['READ'] },
  ];

  const categoryChartData = Object.entries(stats.byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

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
              <p className="text-xs text-muted-foreground">Files Touched</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.created}</p>
              <p className="text-xs text-muted-foreground">Created</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.modified}</p>
              <p className="text-xs text-muted-foreground">Modified</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-center gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">+{stats.totalLinesAdded}</p>
                <p className="text-xs text-muted-foreground">Lines Added</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-center gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">-{stats.totalLinesRemoved}</p>
                <p className="text-xs text-muted-foreground">Lines Removed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Lines Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Net Lines of Code</span>
            </div>
            <div className="flex items-center gap-2">
              {stats.totalNetLines >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-2xl font-bold ${stats.totalNetLines >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalNetLines >= 0 ? '+' : ''}{stats.totalNetLines}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operations by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={operationChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {operationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Files by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'CREATED', 'MODIFIED', 'READ'] as const).map((op) => (
          <Button
            key={op}
            variant={filter === op ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(op)}
          >
            {op === 'all' ? 'All' : op}
            <Badge variant="secondary" className="ml-2">
              {op === 'all' ? stats.total : stats[op.toLowerCase() as keyof typeof stats] || 0}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">File Operations Detail</CardTitle>
          <CardDescription>
            {filteredFiles.length} files {filter !== 'all' ? `${filter.toLowerCase()}` : 'touched'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Op</TableHead>
                  <TableHead>File Path</TableHead>
                  <TableHead className="w-[80px]">Lines</TableHead>
                  <TableHead className="w-[80px]">Category</TableHead>
                  <TableHead className="w-[80px]">Edits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file, index) => (
                  <TableRow 
                    key={file.id || index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedFile(file)}
                  >
                    <TableCell>
                      {OPERATION_ICONS[file.operation]}
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate font-mono text-xs">
                      {file.filepath}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-green-600">+{file.linesAdded}</span>
                        <span className="text-red-600">-{file.linesRemoved}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {CATEGORY_ICONS[file.fileCategory] || CATEGORY_ICONS['OTHER']}
                        <span className="text-xs">{file.fileCategory}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {file.editCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* File Detail Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile && OPERATION_ICONS[selectedFile.operation]}
              File Details
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selectedFile?.filepath}
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Operation:</span>
                  <Badge 
                    className="ml-2" 
                    style={{ backgroundColor: OPERATION_COLORS[selectedFile.operation], color: 'white' }}
                  >
                    {selectedFile.operation}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">File Type:</span>
                  <Badge variant="outline" className="ml-2">{selectedFile.fileType}</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">+{selectedFile.linesAdded}</p>
                  <p className="text-xs text-muted-foreground">Lines Added</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xl font-bold text-red-600">-{selectedFile.linesRemoved}</p>
                  <p className="text-xs text-muted-foreground">Lines Removed</p>
                </div>
                <div className={`p-3 rounded-lg ${selectedFile.netLines >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-xl font-bold ${selectedFile.netLines >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedFile.netLines >= 0 ? '+' : ''}{selectedFile.netLines}
                  </p>
                  <p className="text-xs text-muted-foreground">Net Lines</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Edit Count:</span>
                  <span className="font-medium">{selectedFile.editCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Content Size:</span>
                  <span className="font-medium">{(selectedFile.contentSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens Used:</span>
                  <span className="font-medium">{selectedFile.tokensConsumed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">${selectedFile.costUSD.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileOperationsPanel;
