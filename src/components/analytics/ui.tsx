/**
 * ANALYTICS UI COMPONENTS
 * =======================
 * Shared UI components for analytics dashboard
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, FileJson, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// =============================================================================
// SUMMARY CARD
// =============================================================================

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
}

export function SummaryCard({ 
  title, 
  value, 
  icon, 
  color = '#3b82f6', 
  subtitle,
  trend,
  trendLabel,
  onClick 
}: SummaryCardProps) {
  return (
    <Card 
      className={`transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {icon && (
            <span className="text-2xl opacity-50">{icon}</span>
          )}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-500" />
            ) : (
              <Minus className="h-3 w-3 text-gray-400" />
            )}
            <span className={`text-xs ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {trend > 0 ? '+' : ''}{trend}% {trendLabel || 'vs last period'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
}

export function StatCard({ label, value, change, prefix = '', suffix = '' }: StatCardProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 border">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="text-xl font-bold mt-1">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
      {change !== undefined && (
        <p className={`text-xs mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </p>
      )}
    </div>
  );
}

// =============================================================================
// SECTION HEADER
// =============================================================================

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-3" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-red-800">Error Loading Data</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="font-medium text-lg">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// =============================================================================
// EXPORT BUTTONS
// =============================================================================

interface ExportButtonsProps {
  onExportJSON?: () => void;
  onExportPDF?: () => void;
  loading?: boolean;
}

export function ExportButtons({ onExportJSON, onExportPDF, loading }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      {onExportJSON && (
        <Button variant="outline" size="sm" onClick={onExportJSON} disabled={loading}>
          <FileJson className="h-4 w-4 mr-2" />
          JSON
        </Button>
      )}
      {onExportPDF && (
        <Button variant="outline" size="sm" onClick={onExportPDF} disabled={loading}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// DATE RANGE SELECTOR
// =============================================================================

interface DateRangeSelectorProps {
  value: '7d' | '30d' | '90d' | 'all';
  onChange: (value: '7d' | '30d' | '90d' | 'all') => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const options = [
    { value: '7d' as const, label: '7 Days' },
    { value: '30d' as const, label: '30 Days' },
    { value: '90d' as const, label: '90 Days' },
    { value: 'all' as const, label: 'All Time' },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

// =============================================================================
// METRIC BAR
// =============================================================================

interface MetricBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  showValue?: boolean;
}

export function MetricBar({ label, value, max, color = '#3b82f6', showValue = true }: MetricBarProps) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        {showValue && <span className="font-medium">{value.toLocaleString()}</span>}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// STATUS BADGE
// =============================================================================

interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'down' | 'active' | 'inactive' | 'resolved' | 'open';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    resolved: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    open: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
    inactive: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
      {status}
    </Badge>
  );
}

// =============================================================================
// SEVERITY BADGE
// =============================================================================

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  return (
    <Badge className={styles[severity]}>
      {severity}
    </Badge>
  );
}

// =============================================================================
// PROGRESS RING
// =============================================================================

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({ 
  value, 
  max = 100, 
  size = 80, 
  strokeWidth = 8, 
  color = '#3b82f6',
  label 
}: ProgressRingProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-300"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{Math.round(percentage)}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
