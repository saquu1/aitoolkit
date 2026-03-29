/**
 * API MANAGEMENT ANALYTICS PAGE
 * =============================
 * Analytics for API endpoints, routes, health, and performance
 * Route: /analytics/api
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Server,
  Activity,
  Shield,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Globe,
  Lock,
  Unlock,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

interface ApiEndpoint {
  path: string;
  methods: string[];
  auth: boolean;
  requestCount?: number;
  avgResponseTime?: number;
  errorCount?: number;
  lastAccessed?: string;
}

interface ApiStatusResponse {
  success: boolean;
  timestamp: string;
  auth: {
    required: boolean;
    hasDevUser: boolean;
    devUser: { id: string; email: string; name: string; role: string } | null;
  };
  database: {
    status: string;
    latency: number;
  };
  endpoints: ApiEndpoint[];
  recentErrors: Array<{
    timestamp: string;
    endpoint: string;
    method: string;
    status: number;
    error: string;
  }>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ApiAnalyticsPage() {
  const [status, setStatus] = useState<ApiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{ time: Date; latency: number }[]>([]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/api-status');
      const data = await res.json();
      setStatus(data);
      
      // Track latency history
      setHistory(prev => {
        const newHistory = [...prev, { time: new Date(), latency: data.database?.latency || 0 }];
        return newHistory.slice(-20); // Keep last 20 readings
      });
    } catch (e) {
      console.error('Failed to fetch API status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Calculate stats
  const totalEndpoints = status?.endpoints?.length || 0;
  const protectedEndpoints = status?.endpoints?.filter(e => e.auth).length || 0;
  const publicEndpoints = totalEndpoints - protectedEndpoints;
  const errorCount = status?.recentErrors?.length || 0;
  const dbLatency = status?.database?.latency || 0;

  // Get method distribution
  const methodCounts: Record<string, number> = {};
  status?.endpoints?.forEach(e => {
    e.methods.forEach(m => {
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    });
  });

  // Get error distribution by endpoint
  const errorByEndpoint: Record<string, number> = {};
  status?.recentErrors?.forEach(e => {
    errorByEndpoint[e.endpoint] = (errorByEndpoint[e.endpoint] || 0) + 1;
  });

  if (loading && !status) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">API Management Analytics</h1>
              <p className="text-muted-foreground">
                Monitor endpoints, performance, and health
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/analytics/chat-log">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Chat Log Analytics
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              API Settings
            </Button>
          </Link>
          <Button size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalEndpoints}</p>
                <p className="text-xs text-muted-foreground">Total Endpoints</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Unlock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{publicEndpoints}</p>
                <p className="text-xs text-muted-foreground">Public Routes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{protectedEndpoints}</p>
                <p className="text-xs text-muted-foreground">Protected Routes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${status?.database?.status === 'connected' ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Database className={`h-5 w-5 ${status?.database?.status === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <p className="text-2xl font-bold">{dbLatency}ms</p>
                <p className="text-xs text-muted-foreground">DB Latency</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${errorCount === 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              {errorCount === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-2xl font-bold">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Recent Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {status?.auth?.required ? 'ON' : 'OFF'}
                </p>
                <p className="text-xs text-muted-foreground">Auth Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Endpoints */}
        <div className="lg:col-span-2 space-y-6">
          {/* Endpoints Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                API Endpoints
              </CardTitle>
              <CardDescription>
                All registered API endpoints and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Endpoint</th>
                      <th className="text-left p-2 font-medium">Methods</th>
                      <th className="text-center p-2 font-medium">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status?.endpoints?.map((endpoint) => (
                      <tr key={endpoint.path} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono text-xs">{endpoint.path}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {endpoint.methods.map(method => (
                              <Badge 
                                key={method}
                                variant="outline"
                                className={`text-xs ${
                                  method === 'GET' ? 'border-green-500 text-green-600' :
                                  method === 'POST' ? 'border-blue-500 text-blue-600' :
                                  method === 'PUT' ? 'border-amber-500 text-amber-600' :
                                  method === 'DELETE' ? 'border-red-500 text-red-600' :
                                  'border-gray-500 text-gray-600'
                                }`}
                              >
                                {method}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {endpoint.auth ? (
                            <Badge className="bg-amber-100 text-amber-800">
                              <Lock className="h-3 w-3 mr-1" />
                              Protected
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              <Unlock className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* HTTP Methods Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                HTTP Methods Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(methodCounts).map(([method, count]) => {
                  const total = Object.values(methodCounts).reduce((a, b) => a + b, 0);
                  const percentage = (count / total) * 100;
                  const colors: Record<string, string> = {
                    GET: 'bg-green-500',
                    POST: 'bg-blue-500',
                    PUT: 'bg-amber-500',
                    DELETE: 'bg-red-500',
                    PATCH: 'bg-purple-500',
                  };
                  
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{method}</span>
                        <span className="text-muted-foreground">{count} endpoints ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[method] || 'bg-gray-500'} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats */}
        <div className="space-y-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Database */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge className={status?.database?.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {status?.database?.status === 'connected' ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              {/* Authentication */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Authentication</span>
                </div>
                <Badge className={status?.auth?.required ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                  {status?.auth?.required ? 'Required' : 'Disabled'}
                </Badge>
              </div>

              {/* Dev User */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Dev User</span>
                </div>
                <Badge className={status?.auth?.hasDevUser ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {status?.auth?.hasDevUser ? 'Available' : 'Not Created'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Latency Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Latency Trend
              </CardTitle>
              <CardDescription>Last {history.length} readings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[100px] flex items-end gap-1">
                {history.map((h, i) => {
                  const maxLatency = Math.max(...history.map(x => x.latency), 100);
                  const height = (h.latency / maxLatency) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-400"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${h.latency}ms at ${h.time.toLocaleTimeString()}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{history[0]?.time?.toLocaleTimeString() || '-'}</span>
                <span>{history[history.length - 1]?.time?.toLocaleTimeString() || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Errors */}
          {errorCount > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {status?.recentErrors?.slice(0, 10).map((err, i) => (
                      <div key={i} className="p-2 rounded-lg bg-red-50 border border-red-100 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-red-100 text-red-800">{err.status}</Badge>
                          <span className="font-mono text-xs">{err.method} {err.endpoint}</span>
                        </div>
                        <p className="text-xs text-red-600 truncate">{err.error}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(err.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Error Distribution */}
          {Object.keys(errorByEndpoint).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Error Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(errorByEndpoint).map(([endpoint, count]) => (
                    <div key={endpoint} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs truncate max-w-[150px]">{endpoint}</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                Auto-refreshes every 10s
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              <Link href="/analytics/chat-log" className="text-blue-600 hover:underline flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Chat Log Analytics
              </Link>
              <Link href="/settings" className="text-blue-600 hover:underline">
                API Settings
              </Link>
              <Link href="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
              <span className="text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
