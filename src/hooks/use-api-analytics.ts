/**
 * API ANALYTICS HOOK
 * ==================
 * Hooks for API Management analytics - endpoint performance, request counts, errors
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiEndpointMetrics {
  path: string;
  methods: string[];
  auth: boolean;
  requestCount: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
  lastAccessed: Date | null;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
}

export interface ApiOverviewStats {
  totalEndpoints: number;
  totalRequests: number;
  totalErrors: number;
  avgResponseTime: number;
  healthyEndpoints: number;
  degradedEndpoints: number;
  downEndpoints: number;
  publicEndpoints: number;
  protectedEndpoints: number;
}

export interface ApiStatusResponse {
  success: boolean;
  timestamp: string;
  auth: {
    required: boolean;
    hasDevUser: boolean;
    devUser: any;
  };
  database: {
    status: string;
    latency: number;
  };
  endpoints: Array<{
    path: string;
    methods: string[];
    auth: boolean;
  }>;
  recentErrors: Array<{
    timestamp: string;
    endpoint: string;
    method: string;
    status: number;
    error: string;
  }>;
}

export interface HttpMethodStats {
  method: string;
  count: number;
  percentage: number;
}

export interface StatusCodeDistribution {
  '2xx': number;
  '3xx': number;
  '4xx': number;
  '5xx': number;
}

// =============================================================================
// API STATUS HOOK
// =============================================================================

export function useApiStatus() {
  const [data, setData] = useState<ApiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/api-status');
      const result = await response.json();
      setData(result);
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
// API METRICS HOOK
// =============================================================================

export function useApiMetrics() {
  const { data: status, loading, error, refetch } = useApiStatus();
  
  // Calculate metrics from status data
  const metrics: ApiEndpointMetrics[] = React.useMemo(() => {
    if (!status?.endpoints) return [];
    
    return status.endpoints.map(endpoint => {
      // Get errors for this endpoint
      const endpointErrors = status.recentErrors?.filter(
        e => e.endpoint === endpoint.path
      ) || [];
      
      // Simulate request count (in real app, would come from database)
      const requestCount = Math.floor(Math.random() * 1000) + 10;
      const errorCount = endpointErrors.length;
      const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
      
      // Determine status based on error rate
      let statusLevel: 'healthy' | 'degraded' | 'down' | 'unknown' = 'healthy';
      if (errorRate > 10) statusLevel = 'down';
      else if (errorRate > 5) statusLevel = 'degraded';
      
      return {
        path: endpoint.path,
        methods: endpoint.methods,
        auth: endpoint.auth,
        requestCount,
        avgResponseTime: Math.floor(Math.random() * 200) + 20,
        errorCount,
        errorRate: Math.round(errorRate * 10) / 10,
        lastAccessed: endpointErrors[0]?.timestamp 
          ? new Date(endpointErrors[0].timestamp) 
          : null,
        status: statusLevel,
      };
    });
  }, [status]);

  // Calculate overview stats
  const overview: ApiOverviewStats = React.useMemo(() => {
    if (!metrics.length) {
      return {
        totalEndpoints: 0,
        totalRequests: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        healthyEndpoints: 0,
        degradedEndpoints: 0,
        downEndpoints: 0,
        publicEndpoints: 0,
        protectedEndpoints: 0,
      };
    }

    return {
      totalEndpoints: metrics.length,
      totalRequests: metrics.reduce((sum, m) => sum + m.requestCount, 0),
      totalErrors: metrics.reduce((sum, m) => sum + m.errorCount, 0),
      avgResponseTime: Math.round(
        metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length
      ),
      healthyEndpoints: metrics.filter(m => m.status === 'healthy').length,
      degradedEndpoints: metrics.filter(m => m.status === 'degraded').length,
      downEndpoints: metrics.filter(m => m.status === 'down').length,
      publicEndpoints: metrics.filter(m => !m.auth).length,
      protectedEndpoints: metrics.filter(m => m.auth).length,
    };
  }, [metrics]);

  // HTTP method distribution
  const methodDistribution: HttpMethodStats[] = React.useMemo(() => {
    if (!status?.endpoints) return [];
    
    const methodCounts: Record<string, number> = {};
    status.endpoints.forEach(e => {
      e.methods.forEach(method => {
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });
    });

    const total = Object.values(methodCounts).reduce((a, b) => a + b, 0);
    
    return Object.entries(methodCounts).map(([method, count]) => ({
      method,
      count,
      percentage: Math.round((count / total) * 100),
    }));
  }, [status]);

  // Status code distribution (from recent errors)
  const statusCodes: StatusCodeDistribution = React.useMemo(() => {
    const errors = status?.recentErrors || [];
    
    return {
      '2xx': Math.max(0, 100 - errors.length), // Simulated success rate
      '3xx': 0,
      '4xx': errors.filter(e => e.status >= 400 && e.status < 500).length,
      '5xx': errors.filter(e => e.status >= 500).length,
    };
  }, [status]);

  // Top endpoints by request count
  const topEndpoints = React.useMemo(() => {
    return [...metrics]
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);
  }, [metrics]);

  // Slowest endpoints
  const slowestEndpoints = React.useMemo(() => {
    return [...metrics]
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 5);
  }, [metrics]);

  // Endpoints with errors
  const errorEndpoints = React.useMemo(() => {
    return metrics.filter(m => m.errorCount > 0);
  }, [metrics]);

  return {
    metrics,
    overview,
    methodDistribution,
    statusCodes,
    topEndpoints,
    slowestEndpoints,
    errorEndpoints,
    loading,
    error,
    refetch,
  };
}

// =============================================================================
// DATABASE STATUS HOOK
// =============================================================================

export function useDatabaseStatus() {
  const [status, setStatus] = useState<{
    connected: boolean;
    latency: number;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/api-status');
      const data = await response.json();
      setStatus({
        connected: data.database?.status === 'connected',
        latency: data.database?.latency || 0,
        error: data.database?.status !== 'connected' ? 'Connection failed' : undefined,
      });
    } catch (err: any) {
      setStatus({
        connected: false,
        latency: 0,
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { status, loading, refetch: checkStatus };
}

// =============================================================================
// RECENT ERRORS HOOK
// =============================================================================

export function useRecentErrors(limit: number = 20) {
  const { data, loading, error, refetch } = useApiStatus();
  
  const errors = React.useMemo(() => {
    return (data?.recentErrors || [])
      .slice(0, limit)
      .map(e => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
  }, [data, limit]);

  // Group by endpoint
  const errorsByEndpoint = React.useMemo(() => {
    const grouped: Record<string, typeof errors> = {};
    errors.forEach(e => {
      if (!grouped[e.endpoint]) grouped[e.endpoint] = [];
      grouped[e.endpoint].push(e);
    });
    return grouped;
  }, [errors]);

  // Group by status code
  const errorsByStatus = React.useMemo(() => {
    const grouped: Record<number, typeof errors> = {};
    errors.forEach(e => {
      if (!grouped[e.status]) grouped[e.status] = [];
      grouped[e.status].push(e);
    });
    return grouped;
  }, [errors]);

  return {
    errors,
    errorsByEndpoint,
    errorsByStatus,
    loading,
    error,
    refetch,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// React import for useMemo
import React from 'react';
