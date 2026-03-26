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
  RefreshCw,
  CheckSquare,
  AlertTriangle,
  FileWarning,
  Shield,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Bug,
  Box,
  BarChart3,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { PreSessionChecklist } from './PreSessionChecklist';
import { PatternAlertsPanel } from './PatternAlertsPanel';
import { WeeklyReportCard } from './WeeklyReportCard';
import { PreventionRulesPanel } from './PreventionRulesPanel';
import { SessionComparisonTool } from './SessionComparisonTool';

interface AutomationDashboardProps {
  projectId?: string;
}

export function AutomationDashboard({ projectId }: AutomationDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checklist');
  const [stats, setStats] = useState({
    unresolvedIssues: 0,
    activePatterns: 0,
    weeklyCost: 0,
    efficiencyTrend: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);

      const response = await fetch(`/api/automation/checklist?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setStats({
          unresolvedIssues: data.checklist?.unresolvedIssues?.length || 0,
          activePatterns: data.checklist?.activePatterns?.length || 0,
          weeklyCost: data.checklist?.budgetStatus?.spent || 0,
          efficiencyTrend: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch automation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Automation Hub
          </h2>
          <p className="text-muted-foreground">
            Smart checklists, pattern alerts, and prevention rules
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unresolved Issues</p>
                <p className="text-2xl font-bold text-red-600">{stats.unresolvedIssues}</p>
              </div>
              <Bug className="h-6 w-6 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Patterns</p>
                <p className="text-2xl font-bold text-amber-600">{stats.activePatterns}</p>
              </div>
              <Target className="h-6 w-6 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today's Cost</p>
                <p className="text-2xl font-bold text-green-600">${stats.weeklyCost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Efficiency Trend</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.efficiencyTrend > 0 ? '+' : ''}{stats.efficiencyTrend}%
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="checklist">
            <CheckSquare className="h-4 w-4 mr-2" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="prevention">
            <Shield className="h-4 w-4 mr-2" />
            Prevention
          </TabsTrigger>
          <TabsTrigger value="compare">
            <TrendingUp className="h-4 w-4 mr-2" />
            Compare
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <PreSessionChecklist projectId={projectId} />
        </TabsContent>

        <TabsContent value="patterns" className="mt-4">
          <PatternAlertsPanel projectId={projectId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <WeeklyReportCard projectId={projectId} />
        </TabsContent>

        <TabsContent value="prevention" className="mt-4">
          <PreventionRulesPanel />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <SessionComparisonTool projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AutomationDashboard;
