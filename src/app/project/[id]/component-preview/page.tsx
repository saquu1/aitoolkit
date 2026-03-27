'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Code2, Eye, Copy, Download, RefreshCw, 
  Monitor, Tablet, Smartphone, Play, Loader2,
  FileCode, Sparkles, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TableInfo {
  tableName: string;
  schemaName: string;
  columnCount: number;
  hasFK: boolean;
}

interface GeneratedComponent {
  componentName: string;
  tableName: string;
  viewType: 'form' | 'list' | 'detail' | 'dashboard';
  files: {
    path: string;
    content: string;
    language: string;
    description: string;
  }[];
  dependencies: {
    name: string;
    type: string;
    version?: string;
    importPath: string;
  }[];
  estimatedLOC: number;
  confidence: number;
}

interface PreviewData {
  components: GeneratedComponent[];
  sharedTypes: {
    path: string;
    content: string;
    language: string;
    description: string;
  }[];
  summary: {
    totalComponents: number;
    totalFiles: number;
    totalLOC: number;
  };
}

export default function ComponentPreviewPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [viewType, setViewType] = useState<'form' | 'list' | 'detail' | 'dashboard'>('form');
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch(`/api/project/${projectId}/tables`);
        if (response.ok) {
          const data = await response.json();
          setTables(data.tables || []);
          if (data.tables?.length > 0) {
            setSelectedTable(data.tables[0].tableName);
          }
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
      } finally {
        setTablesLoading(false);
      }
    };
    fetchTables();
  }, [projectId]);

  // Generate preview
  const generatePreview = useCallback(async () => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/component-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTable,
          viewType,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setSelectedComponent(0);
        setSelectedFile(0);
        setActiveTab('preview');
      } else {
        toast.error('Failed to generate preview');
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      toast.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedTable, viewType]);

  // Copy code
  const copyCode = async () => {
    if (!previewData) return;
    const content = previewData.components[selectedComponent]?.files[selectedFile]?.content;
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download all files
  const downloadAll = () => {
    if (!previewData) return;
    
    const allFiles = [
      ...previewData.sharedTypes,
      ...previewData.components.flatMap(c => c.files),
    ];
    
    const content = allFiles.map(f => `// File: ${f.path}\n\n${f.content}`).join('\n\n// ========================================\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}-components.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get device width class
  const getDeviceClass = () => {
    switch (previewDevice) {
      case 'tablet': return 'max-w-[768px]';
      case 'mobile': return 'max-w-[375px]';
      default: return 'w-full';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Component Preview</h1>
          <p className="text-muted-foreground">
            Generate and preview React components from your database schema
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          AI-Powered
        </Badge>
      </div>

      <Separator />

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generation Options</CardTitle>
          <CardDescription>
            Select a table and view type to generate React components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Table</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tablesLoading ? (
                    <SelectItem value="_loading" disabled>Loading tables...</SelectItem>
                  ) : tables.length === 0 ? (
                    <SelectItem value="_empty" disabled>No tables available</SelectItem>
                  ) : (
                    tables.map((table) => (
                      <SelectItem key={table.tableName} value={table.tableName}>
                        {table.tableName}
                        <span className="text-muted-foreground ml-2">
                          ({table.columnCount} columns)
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>View Type</Label>
              <Select value={viewType} onValueChange={(v) => setViewType(v as typeof viewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="form">Form Component</SelectItem>
                  <SelectItem value="list">List Component</SelectItem>
                  <SelectItem value="detail">Detail Component</SelectItem>
                  <SelectItem value="dashboard">Dashboard Component</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generatePreview} 
                disabled={!selectedTable || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Generate Preview
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Area */}
      {previewData && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Components</CardTitle>
              <CardDescription>
                {previewData.summary.totalComponents} components generated
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {previewData.components.map((comp, idx) => (
                  <button
                    key={comp.componentName}
                    onClick={() => {
                      setSelectedComponent(idx);
                      setSelectedFile(0);
                    }}
                    className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                      selectedComponent === idx ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium">{comp.componentName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {comp.viewType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {comp.estimatedLOC} LOC
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comp.confidence}% confidence
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Dependencies */}
              <div className="p-4 border-t">
                <h4 className="font-medium mb-2">Dependencies</h4>
                <div className="space-y-1 text-sm">
                  {previewData.components[selectedComponent]?.dependencies.map((dep) => (
                    <div key={dep.name} className="flex items-center justify-between">
                      <code className="text-xs">{dep.name}</code>
                      {dep.version && (
                        <span className="text-muted-foreground text-xs">{dep.version}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Preview */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {previewData.components[selectedComponent]?.componentName}
                  </CardTitle>
                  <CardDescription>
                    {previewData.components[selectedComponent]?.files[selectedFile]?.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'preview')}>
                    <TabsList>
                      <TabsTrigger value="code" className="gap-1">
                        <Code2 className="h-3 w-3" />
                        Code
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-1">
                        <Eye className="h-3 w-3" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* File Tabs */}
              <div className="flex items-center gap-1 mt-3 overflow-x-auto">
                {previewData.components[selectedComponent]?.files.map((file, idx) => (
                  <Button
                    key={file.path}
                    variant={selectedFile === idx ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedFile(idx)}
                    className="gap-1 whitespace-nowrap"
                  >
                    <FileCode className="h-3 w-3" />
                    {file.path.split('/').pop()}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'code' ? (
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={copyCode} className="gap-1">
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={downloadAll} className="gap-1">
                      <Download className="h-3 w-3" />
                      Download All
                    </Button>
                  </div>
                  <div className="rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                    <SyntaxHighlighter
                      language="typescript"
                      style={vscDarkPlus}
                      showLineNumbers
                      customStyle={{
                        margin: 0,
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      {previewData.components[selectedComponent]?.files[selectedFile]?.content || ''}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Device Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 border rounded-lg p-1">
                      <Button
                        variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewDevice('desktop')}
                        className="gap-1"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewDevice('tablet')}
                        className="gap-1"
                      >
                        <Tablet className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewDevice('mobile')}
                        className="gap-1"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={generatePreview} className="gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>

                  {/* Live Preview */}
                  <div className="border rounded-lg bg-muted/30 p-4 overflow-hidden">
                    <div className={`mx-auto ${getDeviceClass()} transition-all duration-300`}>
                      <div className="bg-background border rounded-lg shadow-lg min-h-[400px] p-4">
                        <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                          <div className="text-center">
                            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Interactive Preview</p>
                            <p className="text-sm mt-1">
                              Component would render here with mock data
                            </p>
                            <p className="text-xs mt-2 text-muted-foreground">
                              (Full preview requires component execution environment)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                          {previewData.summary.totalLOC}
                        </div>
                        <p className="text-sm text-muted-foreground">Lines of Code</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                          {previewData.summary.totalFiles}
                        </div>
                        <p className="text-sm text-muted-foreground">Files Generated</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                          {previewData.components[selectedComponent]?.confidence || 0}%
                        </div>
                        <p className="text-sm text-muted-foreground">Confidence Score</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!previewData && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Code2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Preview Generated</h3>
              <p className="text-muted-foreground mb-4">
                Select a table and view type, then click "Generate Preview" to see the React component
              </p>
              <Button variant="outline" onClick={generatePreview} disabled={!selectedTable}>
                <Play className="mr-2 h-4 w-4" />
                Generate Your First Component
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
