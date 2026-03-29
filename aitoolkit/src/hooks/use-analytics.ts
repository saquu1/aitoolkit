/**
 * USE ANALYTICS HOOK
 * ==================
 * Centralized API hooks for analytics data fetching
 * Uses React Query patterns for caching and state management
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface SessionSummary {
  id: string;
  chatId: string;
  sessionDate: Date;
  title: string | null;
  summary: string | null;
  duration: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  category: string;
  tags: string | null;
  filesModified: number;
  filesCreated: number;
  featuresImplemented: number;
  issuesResolved: number;
  issuesCreated: number;
  status: string;
}

export interface SessionDetails extends SessionSummary {
  issues: any[];
  features: any[];
  costs: any[];
  messages: any[];
}

export interface IssueRecord {
  id: string;
  issueType: string;
  severity: string;
  title: string;
  description?: string;
  errorMessage?: string;
  resolution?: string;
  status: string;
  recurrenceCount: number;
  session: { title: string | null; sessionDate: Date };
}

export interface FeatureRecord {
  id: string;
  featureName: string;
  featureType: string;
  description?: string;
  filesCreated: string;
  filesModified: string;
  session: { title: string | null; sessionDate: Date };
}

export interface Pattern {
  pattern: string;
  type: string;
  count: number;
  lastSeen: Date;
}

export interface EfficiencyMetrics {
  avgTokensPerFeature: number;
  avgTokensPerIssue: number;
  avgCostPerFeature: number;
  resolutionRate: number;
  efficiencyScore: number;
  totalSessions: number;
  totalFeatures: number;
  totalIssues: number;
  resolvedIssues: number;
}

export interface DashboardData {
  summary: {
    totalSessions: number;
    totalTokens: number;
    totalCost: number;
    totalIssues: number;
    resolvedIssues: number;
    totalFeatures: number;
    avgSessionDuration: number;
  };
  distributions: {
    models: Record<string, number>;
    issues: Record<string, number>;
    categories: Record<string, number>;
  };
  dailyStats: Record<string, { sessions: number; tokens: number; cost: number }>;
  recentSessions: SessionSummary[];
  recentIssues: IssueRecord[];
  recentFeatures: FeatureRecord[];
  topPatterns: Pattern[];
}

export interface CostAnalysis {
  totalCost: number;
  byModel: Record<string, { cost: number; sessions: number; tokens: number }>;
  byCategory: Record<string, { cost: number; sessions: number }>;
  dailyCosts: { date: string; cost: number; tokens: number }[];
  costPerFeature: number;
  costPerIssue: number;
  projectedMonthlyCost: number;
}

export interface ApiHealthStatus {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: Date;
  errorRate: number;
  totalRequests: number;
}

interface UseAnalyticsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// =============================================================================
// BASE FETCH HELPER
// =============================================================================

async function fetchAnalytics<T>(
  action: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const url = new URL('/api/analytics', window.location.origin);
  url.searchParams.set('action', action);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Unknown error');
  }

  return result.data || result;
}

// =============================================================================
// INDIVIDUAL HOOKS
// =============================================================================

/**
 * Hook for dashboard overview data
 */
export function useDashboard(): UseAnalyticsState<DashboardData> {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics<DashboardData>('dashboard');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for efficiency metrics
 */
export function useEfficiencyMetrics(days: number = 30): UseAnalyticsState<EfficiencyMetrics> {
  const [data, setData] = useState<EfficiencyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics<EfficiencyMetrics>('efficiency-metrics', { days });
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for sessions list
 */
export function useSessions(options?: {
  limit?: number;
  offset?: number;
  category?: string;
  model?: string;
}): UseAnalyticsState<{ sessions: SessionSummary[]; pagination: any }> {
  const [data, setData] = useState<{ sessions: SessionSummary[]; pagination: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics<{ sessions: SessionSummary[]; pagination: any }>('sessions', options);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options?.limit, options?.offset, options?.category, options?.model]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for session details
 */
export function useSessionDetails(sessionId: string | null): UseAnalyticsState<SessionDetails> {
  const [data, setData] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!sessionId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics<SessionDetails>('session-details', { sessionId });
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for issues list
 */
export function useIssues(options?: {
  limit?: number;
  type?: string;
  severity?: string;
  status?: string;
  recurring?: boolean;
}): UseAnalyticsState<{ issues: IssueRecord[]; distribution: any[] }> {
  const [data, setData] = useState<{ issues: IssueRecord[]; distribution: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics<{ issues: IssueRecord[]; distribution: any[] }>('issues', options || {});
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for cost analysis
 */
export function useCostAnalysis(startDate?: Date, endDate?: Date): UseAnalyticsState<CostAnalysis> {
  const [data, setData] = useState<CostAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const result = await fetchAnalytics<CostAnalysis>('cost-analysis', params);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate?.getTime(), endDate?.getTime()]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for patterns
 */
export function usePatterns(): UseAnalyticsState<{ fromIssues: any[]; stored: any[] }> {
  const [data, setData] = useState<{ fromIssues: any[]; stored: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics<{ patterns: { fromIssues: any[]; stored: any[] } }>('patterns');
      setData(result.patterns || result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for API health status
 */
export function useApiHealth(): UseAnalyticsState<ApiHealthStatus[]> {
  const [data, setData] = useState<ApiHealthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from api-status endpoint
      const response = await fetch('/api/api-status');
      const result = await response.json();
      
      if (result.success) {
        setData(result.endpoints || []);
      } else {
        // Fallback to basic health check
        const healthResult = await fetchAnalytics<ApiHealthStatus>('health');
        setData([healthResult] as any);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// =============================================================================
// COMBINED HOOK
// =============================================================================

/**
 * Combined hook for all analytics data
 */
export function useAnalytics() {
  const dashboard = useDashboard();
  const efficiency = useEfficiencyMetrics();
  const patterns = usePatterns();
  const apiHealth = useApiHealth();

  return {
    dashboard,
    efficiency,
    patterns,
    apiHealth,
    // Utility functions
    refetchAll: () => {
      dashboard.refetch();
      efficiency.refetch();
      patterns.refetch();
      apiHealth.refetch();
    },
    isLoading: dashboard.loading || efficiency.loading || patterns.loading,
    hasError: !!(dashboard.error || efficiency.error || patterns.error),
  };
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook for updating an issue
 */
export function useUpdateIssue() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateIssue = useCallback(async (issueId: string, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-issue', issueId, updates }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update issue');
      }

      return result.issue;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateIssue, loading, error };
}

/**
 * Hook for importing batch data
 */
export function useImportBatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importBatch = useCallback(async (chatId: string, messages: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-batch', chatId, messages }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to import batch');
      }

      return result.imported;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { importBatch, loading, error };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
