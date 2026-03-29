/**
 * OVERVIEW TAB
 * ============
 * KPIs and daily charts for analytics overview
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard, StatCard, SectionHeader, LoadingState, ErrorState } from './ui';
import { SimpleLineChart, SimpleBarChart, SimplePieChart, ActivityHeatmap } from './charts';
import { useDashboard, useEfficiencyMetrics, formatNumber, formatCurrency } from '@/hooks/use-analytics';
import { RefreshCw, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OverviewTabProps {
  dateRange: '7d' | '30d' | '90d' | 'all';
}

export function OverviewTab({ dateRange }: OverviewTabProps) {
  const { data: dashboard, loading, error, refetch } = useDashboard();
  const { data: efficiency } = useEfficiencyMetrics(
    dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
  );

  if (loading) return <LoadingState message="Loading analytics overview..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  if (!dashboard) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No analytics data available. Start by importing some sessions.
        </CardContent>
      </Card>
    );
  }

  const { summary, distributions, dailyStats, recentSessions } = dashboard;

  // Prepare chart data
  const tokenTrend = Object.entries(dailyStats)
    .slice(-14)
    .map(([date, stats]) => ({
      label: date.slice(5),
      value: stats.tokens,
    }));

  const modelDistribution = Object.entries(distributions.models).map(([name, count]) => ({
    label: name,
    value: count,
  }));

  const categoryDistribution = Object.entries(distributions.categories).map(([cat, count]) => ({
    label: cat,
    value: count,
  }));

  const issueDistribution = Object.entries(distributions.issues).map(([type, count]) => ({
    label: type,
    value: count,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          title="Sessions"
          value={summary.totalSessions}
          icon="📝"
          color="#3b82f6"
        />
        <SummaryCard
          title="Tokens"
          value={formatNumber(summary.totalTokens)}
          icon="🔢"
          color="#8b5cf6"
        />
        <SummaryCard
          title="Cost"
          value={formatCurrency(summary.totalCost)}
          icon="💰"
          color="#22c55e"
        />
        <SummaryCard
          title="Issues"
          value={`${summary.resolvedIssues}/${summary.totalIssues}`}
          icon="🐛"
          color="#f59e0b"
          subtitle={summary.totalIssues > 0 ? `${Math.round(summary.resolvedIssues / summary.totalIssues * 100)}% resolved` : undefined}
        />
        <SummaryCard
          title="Features"
          value={summary.totalFeatures}
          icon="✨"
          color="#06b6d4"
        />
        <SummaryCard
          title="Efficiency"
          value={efficiency ? Math.round(efficiency.efficiencyScore) : '-'}
          icon="🎯"
          color="#22c55e"
          subtitle="/100 score"
        />
      </div>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap dailyStats={dailyStats} color="#3b82f6" />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Token Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={tokenTrend} color="#3b82f6" height={200} />
          </CardContent>
        </Card>

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart 
              data={modelDistribution} 
              colors={['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899']}
              size={180}
            />
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={categoryDistribution} 
              color="#8b5cf6" 
              height={180}
              horizontal
            />
          </CardContent>
        </Card>

        {/* Issue Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue Types</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart 
              data={issueDistribution} 
              colors={['#f59e0b', '#ef4444', '#f97316', '#ca8a04', '#65a30d']}
              size={180}
            />
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Metrics */}
      {efficiency && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Efficiency Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                label="Avg Tokens/Feature" 
                value={Math.round(efficiency.avgTokensPerFeature)} 
              />
              <StatCard 
                label="Avg Tokens/Issue" 
                value={Math.round(efficiency.avgTokensPerIssue)} 
              />
              <StatCard 
                label="Avg Cost/Feature" 
                value={formatCurrency(efficiency.avgCostPerFeature)}
              />
              <StatCard 
                label="Resolution Rate" 
                value={Math.round(efficiency.resolutionRate)}
                suffix="%"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
