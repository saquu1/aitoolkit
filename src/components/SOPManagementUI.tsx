'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  Upload, 
  Settings,
  Shield,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Wrench,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  Layers
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type SOPCategory = 'alignment' | 'typography' | 'forms' | 'validation' | 'reports' | 'security' | 'compliance';
type SOPAppliesTo = 'all_fields' | 'dropdown_fields' | 'date_fields' | 'grid_columns' | 'text_inputs' | 'required_fields' | 'pii_fields';

interface SOPRule {
  id: string;
  projectId: string | null;
  sopId: string;
  name: string;
  description: string;
  category: SOPCategory;
  priority: number;
  isActive: boolean;
  appliesTo: SOPAppliesTo;
  condition: Record<string, any>;
  expectedValue: string | null;
  autoFixAction: Record<string, any> | null;
  sourceDocument: string | null;
  sourceVersion: string | null;
  isSystemDefault: boolean;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SOPViolation {
  fieldId: string;
  fieldName: string;
  tableName: string;
  sopId: string;
  sopName: string;
  category: string;
  priority: number;
  complianceNote: string;
  autoFixAvailable: boolean;
}

interface AutoFixResult {
  sopId: string;
  fieldId: string;
  success: boolean;
  message: string;
  appliedChanges: string[];
}

// =============================================================================
// CATEGORY CONFIG
// =============================================================================

const CATEGORY_CONFIG: Record<SOPCategory, { label: string; color: string; icon: React.ReactNode }> = {
  alignment: { label: 'Alignment', color: 'bg-blue-500', icon: <Layers className="h-4 w-4" /> },
  typography: { label: 'Typography', color: 'bg-purple-500', icon: <FileText className="h-4 w-4" /> },
  forms: { label: 'Forms', color: 'bg-green-500', icon: <Settings className="h-4 w-4" /> },
  validation: { label: 'Validation', color: 'bg-orange-500', icon: <CheckCircle2 className="h-4 w-4" /> },
  reports: { label: 'Reports', color: 'bg-cyan-500', icon: <BookOpen className="h-4 w-4" /> },
  security: { label: 'Security', color: 'bg-red-500', icon: <Shield className="h-4 w-4" /> },
  compliance: { label: 'Compliance', color: 'bg-yellow-500', icon: <AlertCircle className="h-4 w-4" /> },
};

const APPLIES_TO_OPTIONS: { value: SOPAppliesTo; label: string }[] = [
  { value: 'all_fields', label: 'All Fields' },
  { value: 'dropdown_fields', label: 'Dropdown Fields' },
  { value: 'date_fields', label: 'Date Fields' },
  { value: 'grid_columns', label: 'Grid Columns' },
  { value: 'text_inputs', label: 'Text Inputs' },
  { value: 'required_fields', label: 'Required Fields' },
  { value: 'pii_fields', label: 'PII Fields' },
];

// =============================================================================
// SOP MANAGEMENT UI COMPONENT
// =============================================================================

export function SOPManagementUI({ projectId }: { projectId: string }) {
  // State
  const [rules, setRules] = useState<SOPRule[]>([]);
  const [violations, setViolations] = useState<SOPViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingRule, setEditingRule] = useState<SOPRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [autoFixResults, setAutoFixResults] = useState<AutoFixResult[]>([]);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState({
    totalRules: 0,
    activeRules: 0,
    totalViolations: 0,
    autoFixable: 0,
    categories: {} as Record<string, number>
  });

  // Form state
  const [formData, setFormData] = useState<Partial<SOPRule>>({
    name: '',
    description: '',
    category: 'forms',
    priority: 50,
    isActive: true,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: '',
    autoFixAction: null,
  });

  // Fetch SOP rules
  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-sop-rules', projectId }),
      });
      const data = await response.json();
      if (data.success) {
        setRules(data.rules);
        setSummary(prev => ({
          ...prev,
          totalRules: data.rules.length,
          activeRules: data.rules.filter((r: SOPRule) => r.isActive).length,
          categories: data.rules.reduce((acc: Record<string, number>, r: SOPRule) => {
            acc[r.category] = (acc[r.category] || 0) + 1;
            return acc;
          }, {}),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch SOP rules:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch violations
  const fetchViolations = useCallback(async () => {
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-sop-violations', projectId }),
      });
      const data = await response.json();
      if (data.success) {
        setViolations(data.violations);
        setSummary(prev => ({
          ...prev,
          totalViolations: data.violations.length,
          autoFixable: data.violations.filter((v: SOPViolation) => v.autoFixAvailable).length,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch violations:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRules();
    fetchViolations();
  }, [fetchRules, fetchViolations]);

  // Save SOP rule
  const saveRule = async () => {
    try {
      const action = editingRule ? 'update-sop-rule' : 'create-sop-rule';
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          projectId,
          rule: {
            ...formData,
            id: editingRule?.id,
            sopId: editingRule?.sopId || `SOP-CUSTOM-${Date.now()}`,
            isCustom: true,
            isSystemDefault: false,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchRules();
        setIsDialogOpen(false);
        setEditingRule(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save SOP rule:', error);
    }
  };

  // Delete SOP rule
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this SOP rule?')) return;
    
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-sop-rule', ruleId }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete SOP rule:', error);
    }
  };

  // Toggle rule active state
  const toggleRuleActive = async (rule: SOPRule) => {
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-sop-rule',
          projectId,
          rule: { ...rule, isActive: !rule.isActive },
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  // Run auto-fix
  const runAutoFix = async (violation?: SOPViolation) => {
    setIsAutoFixing(true);
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-sop-autofix',
          projectId,
          violationId: violation?.fieldId,
          sopId: violation?.sopId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAutoFixResults(data.results);
        await fetchViolations();
      }
    } catch (error) {
      console.error('Failed to run auto-fix:', error);
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Run all auto-fixes
  const runAllAutoFixes = async () => {
    setIsAutoFixing(true);
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-all-sop-autofixes', projectId }),
      });
      const data = await response.json();
      if (data.success) {
        setAutoFixResults(data.results);
        await fetchViolations();
      }
    } catch (error) {
      console.error('Failed to run all auto-fixes:', error);
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Export SOP rules
  const exportRules = async () => {
    const exportData = rules.map(r => ({
      sopId: r.sopId,
      name: r.name,
      description: r.description,
      category: r.category,
      priority: r.priority,
      isActive: r.isActive,
      appliesTo: r.appliesTo,
      condition: r.condition,
      expectedValue: r.expectedValue,
      autoFixAction: r.autoFixAction,
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sop-rules-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import SOP rules
  const importRules = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        const response = await fetch('/api/intelligence-bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import-sop-rules', projectId, rules: importData }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchRules();
          alert(`Imported ${data.imported} SOP rules`);
        }
      } catch (error) {
        console.error('Failed to import SOP rules:', error);
        alert('Failed to import SOP rules');
      }
    };
    reader.readAsText(file);
  };

  // Initialize default rules
  const initializeDefaultRules = async () => {
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize-default-sop-rules' }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchRules();
        alert(`Initialized ${data.initialized} default SOP rules`);
      }
    } catch (error) {
      console.error('Failed to initialize default rules:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'forms',
      priority: 50,
      isActive: true,
      appliesTo: 'all_fields',
      condition: {},
      expectedValue: '',
      autoFixAction: null,
    });
  };

  // Filtered rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rule.sopId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || rule.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Toggle violation expansion
  const toggleViolationExpand = (fieldId: string) => {
    const newExpanded = new Set(expandedViolations);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedViolations(newExpanded);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SOP Management</h2>
          <p className="text-muted-foreground">Manage Standard Operating Procedure rules and compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={initializeDefaultRules}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Initialize Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={exportRules}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
            <input type="file" className="hidden" accept=".json" onChange={importRules} />
          </label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{summary.totalRules}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">{summary.activeRules}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Violations</p>
                <p className="text-2xl font-bold text-red-600">{summary.totalViolations}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-fixable</p>
                <p className="text-2xl font-bold text-orange-600">{summary.autoFixable}</p>
              </div>
              <Wrench className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">
            <FileText className="h-4 w-4 mr-2" />
            SOP Rules
          </TabsTrigger>
          <TabsTrigger value="violations">
            <AlertCircle className="h-4 w-4 mr-2" />
            Violations ({violations.length})
          </TabsTrigger>
          <TabsTrigger value="autofix">
            <Wrench className="h-4 w-4 mr-2" />
            Auto-Fix Engine
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SOP rules..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingRule(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Edit SOP Rule' : 'Create SOP Rule'}</DialogTitle>
                  <DialogDescription>
                    Define a Standard Operating Procedure rule for field compliance
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sopId">SOP ID</Label>
                      <Input
                        id="sopId"
                        value={editingRule?.sopId || 'Auto-generated'}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Rule Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Email Format Validation"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the SOP rule..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v as SOPCategory })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority (1-100)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Applies To</Label>
                      <Select
                        value={formData.appliesTo}
                        onValueChange={(v) => setFormData({ ...formData, appliesTo: v as SOPAppliesTo })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLIES_TO_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Expected Value</Label>
                    <Input
                      value={formData.expectedValue || ''}
                      onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })}
                      placeholder="e.g., email validation rule"
                    />
                  </div>
                  <div>
                    <Label>Condition (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(formData.condition || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          setFormData({ ...formData, condition: JSON.parse(e.target.value) });
                        } catch {}
                      }}
                      className="font-mono text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Auto-Fix Action (JSON)</Label>
                    <Textarea
                      value={formData.autoFixAction ? JSON.stringify(formData.autoFixAction, null, 2) : ''}
                      onChange={(e) => {
                        try {
                          setFormData({ ...formData, autoFixAction: JSON.parse(e.target.value) });
                        } catch {}
                      }}
                      placeholder='{"setProperty": {"dropdownConfig.hasSearch": true}}'
                      className="font-mono text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveRule} disabled={!formData.name}>
                    {editingRule ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Rules List */}
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No SOP rules found. Click "Add Rule" to create one.
                </div>
              ) : (
                filteredRules.map((rule) => (
                  <Card key={rule.id} className={!rule.isActive ? 'opacity-60' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded ${CATEGORY_CONFIG[rule.category].color} text-white`}>
                            {CATEGORY_CONFIG[rule.category].icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{rule.name}</h4>
                              <Badge variant="outline" className="text-xs">{rule.sopId}</Badge>
                              {rule.isSystemDefault && (
                                <Badge variant="secondary" className="text-xs">System</Badge>
                              )}
                              {rule.isCustom && (
                                <Badge variant="outline" className="text-xs">Custom</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Priority: {rule.priority}</span>
                              <span>Applies: {APPLIES_TO_OPTIONS.find(o => o.value === rule.appliesTo)?.label}</span>
                              {rule.autoFixAction && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  <Wrench className="h-3 w-3 mr-1" />
                                  Auto-fix available
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => toggleRuleActive(rule)}
                            disabled={rule.isSystemDefault}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingRule(rule);
                              setFormData({
                                name: rule.name,
                                description: rule.description,
                                category: rule.category,
                                priority: rule.priority,
                                isActive: rule.isActive,
                                appliesTo: rule.appliesTo,
                                condition: rule.condition,
                                expectedValue: rule.expectedValue,
                                autoFixAction: rule.autoFixAction,
                              });
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!rule.isSystemDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-4">
          <div className="flex items-center justify-between">
            <Alert className="flex-1">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>SOP Violations Detected</AlertTitle>
              <AlertDescription>
                {summary.totalViolations} fields have SOP violations. {summary.autoFixable} can be auto-fixed.
              </AlertDescription>
            </Alert>
            <Button onClick={runAllAutoFixes} disabled={isAutoFixing || summary.autoFixable === 0}>
              {isAutoFixing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              Fix All ({summary.autoFixable})
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {violations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No SOP violations detected!</p>
                </div>
              ) : (
                violations.map((violation) => (
                  <Card key={`${violation.fieldId}-${violation.sopId}`}>
                    <CardContent className="pt-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleViolationExpand(violation.fieldId)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${CATEGORY_CONFIG[violation.category as SOPCategory]?.color || 'bg-gray-500'} text-white`}>
                            <AlertCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{violation.tableName}.{violation.fieldName}</h4>
                              <Badge variant="outline">{violation.sopId}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{violation.sopName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {violation.autoFixAvailable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                runAutoFix(violation);
                              }}
                              disabled={isAutoFixing}
                            >
                              <Wrench className="h-4 w-4 mr-1" />
                              Fix
                            </Button>
                          )}
                          {expandedViolations.has(violation.fieldId) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                      {expandedViolations.has(violation.fieldId) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Category:</span>{' '}
                              <Badge variant="secondary">{violation.category}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Priority:</span>{' '}
                              <span className={violation.priority >= 90 ? 'text-red-600 font-semibold' : ''}>
                                {violation.priority}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-sm">{violation.complianceNote}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Auto-Fix Tab */}
        <TabsContent value="autofix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Auto-Fix Engine
              </CardTitle>
              <CardDescription>
                Automatically apply SOP fixes to non-compliant fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={runAllAutoFixes} disabled={isAutoFixing || summary.autoFixable === 0}>
                  {isAutoFixing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run All Auto-Fixes
                </Button>
                <Button variant="outline" onClick={fetchViolations}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Violations
                </Button>
              </div>

              <Separator />

              {/* Auto-Fix Results */}
              {autoFixResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Auto-Fix Results</h4>
                  <div className="space-y-2">
                    {autoFixResults.map((result, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium">{result.sopId}</span>
                          <span className="text-muted-foreground">on {result.fieldId}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                        {result.appliedChanges.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {result.appliedChanges.map((change, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {change}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How Auto-Fix Works</AlertTitle>
                <AlertDescription className="text-sm">
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Auto-fix analyzes each SOP violation</li>
                    <li>If the SOP rule has an auto-fix action defined, it applies the fix</li>
                    <li>Changes include: setting properties, adding validations, CSS classes</li>
                    <li>All fixes are logged and can be reviewed</li>
                    <li>Some violations require manual review (no auto-fix available)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SOPManagementUI;
