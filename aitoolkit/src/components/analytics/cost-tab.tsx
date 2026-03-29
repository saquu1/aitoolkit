/**
 * COST TAB
 * ========
 * Cost breakdown and analysis
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, StatCard } from './ui';
import { SimpleBarChart, SimplePieChart, SimpleLineChart } from './charts';
import { useCostAnalysis, useDashboard, formatCurrency, formatNumber } from '@/hooks/use-analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeSelector } from './ui';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  Calculator,
  BarChart3,
  PieChart
} from 'lucide-react';

export function CostTab() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const { data: dashboard } = useDashboard();
  const { data: costData, loading, error, refetch } = useCostAnalysis();

  if (loading) return <LoadingState message="Loading cost analysis..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const summary = dashboard?.summary;
  const dailyStats = dashboard?.dailyStats || {};

  // Prepare chart data
  const costTrend = Object.entries(dailyStats)
    .slice(-30)
    .map(([date, stats]) => ({
      label: date.slice(5),
      value: stats.cost * 1000, // Convert to mills for better visualization
    }));

  const modelCostData = costData?.byModel 
    ? Object.entries(costData.byModel).map(([model, data]) => ({
        label: model,
        value: data.cost,
      }))
    : [];

  const categoryCostData = costData?.byCategory
    ? Object.entries(costData.byCategory).map(([cat, data]) => ({
        label: cat,
        value: data.cost,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cost Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Track your AI usage costs and optimize spending
          </p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.totalCost || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cost/Feature</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(costData?.costPerFeature || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <PiggyBank className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cost/Issue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(costData?.costPerIssue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Projected Monthly</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(costData?.projectedMonthlyCost || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Cost Trend (Last 30 Days)
          </CardTitle>
          <CardDescription>Daily spending in dollars</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleLineChart 
            data={costTrend} 
            color="#22c55e" 
            height={200} 
          />
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Model */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Cost by Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            {modelCostData.length > 0 ? (
              <>
                <SimplePieChart
                  data={modelCostData}
                  colors={['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444']}
                  size={180}
                />
                <div className="mt-4 space-y-2">
                  {Object.entries(costData?.byModel || {}).map(([model, data]) => (
                    <div key={model} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{model}</span>
                      <div className="flex items-center gap-4">
                        <span>{data.sessions} sessions</span>
                        <span className="font-medium">{formatCurrency(data.cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No model data available</p>
            )}
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Cost by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryCostData.length > 0 ? (
              <>
                <SimpleBarChart
                  data={categoryCostData}
                  color="#8b5cf6"
                  height={200}
                  horizontal
                />
                <div className="mt-4 space-y-2">
                  {Object.entries(costData?.byCategory || {}).map(([cat, data]) => (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{cat}</span>
                      <div className="flex items-center gap-4">
                        <span>{data.sessions} sessions</span>
                        <span className="font-medium">{formatCurrency(data.cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No category data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Cost Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">💡 Use Smaller Models</h4>
              <p className="text-sm text-green-700">
                Consider using smaller models for simple tasks. They can be 10x cheaper while still effective.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">🎯 Batch Requests</h4>
              <p className="text-sm text-blue-700">
                Combine multiple related tasks into single sessions to reduce overhead and improve context.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <h4 className="font-medium text-purple-800 mb-2">📝 Better Prompts</h4>
              <p className="text-sm text-purple-700">
                Clear, specific prompts reduce the need for multiple iterations and corrections.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">🔄 Reuse Patterns</h4>
              <p className="text-sm text-amber-700">
                Save and reuse successful prompts and patterns to avoid regenerating similar content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
