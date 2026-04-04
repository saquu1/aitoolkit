/**
 * API HEALTH TAB
 * ==============
 * API health checks and status monitoring
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, StatusBadge, EmptyState } from './ui';
import { useApiHealth } from '@/hooks/use-analytics';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  Zap,
  Server,
  TrendingUp
} from 'lucide-react';

export function ApiHealthTab() {
  const { data: endpoints, loading, error, refetch } = useApiHealth();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    setLastRefresh(new Date());
  }, [endpoints]);

  if (loading) return <LoadingState message="Checking API health..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  // Calculate overall health
  const healthyCount = endpoints.filter(e => e.status === 'healthy').length;
  const degradedCount = endpoints.filter(e => e.status === 'degraded').length;
  const downCount = endpoints.filter(e => e.status === 'down').length;
  const totalCount = endpoints.length;

  const overallHealth = totalCount > 0 
    ? Math.round((healthyCount / totalCount) * 100) 
    : 0;

  const avgResponseTime = endpoints.length > 0
    ? Math.round(endpoints.reduce((sum, e) => sum + e.responseTime, 0) / endpoints.length)
    : 0;

  const avgErrorRate = endpoints.length > 0
    ? Math.round(endpoints.reduce((sum, e) => sum + e.errorRate, 0) / endpoints.length * 100) / 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Health Status</h2>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of API endpoints
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={`${overallHealth >= 90 ? 'border-green-200 bg-green-50' : overallHealth >= 70 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              {overallHealth >= 90 ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : overallHealth >= 70 ? (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <p className="text-2xl font-bold">{overallHealth}%</p>
                <p className="text-xs text-muted-foreground">Overall Health</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{healthyCount}</p>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{degradedCount}</p>
                <p className="text-xs text-muted-foreground">Degraded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{downCount}</p>
                <p className="text-xs text-muted-foreground">Down</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xl font-bold">{avgResponseTime}ms</p>
                <p className="text-xs text-muted-foreground">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xl font-bold">{avgErrorRate}%</p>
                <p className="text-xs text-muted-foreground">Avg Error Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Endpoints</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoints Status</CardTitle>
          <CardDescription>
            Detailed status of all monitored API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          {endpoints.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No Endpoints Monitored"
              description="Add endpoints to monitor their health status."
            />
          ) : (
            <div className="space-y-3">
              {endpoints.map((endpoint, i) => (
                <div 
                  key={i}
                  className={`p-4 rounded-lg border ${
                    endpoint.status === 'healthy' ? 'border-green-200 bg-green-50/50' :
                    endpoint.status === 'degraded' ? 'border-yellow-200 bg-yellow-50/50' :
                    'border-red-200 bg-red-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {endpoint.status === 'healthy' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : endpoint.status === 'degraded' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{endpoint.endpoint}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {endpoint.responseTime}ms
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {endpoint.totalRequests?.toLocaleString()} requests
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {endpoint.errorRate}% errors
                          </span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={endpoint.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Healthy Endpoints</span>
                <span className="text-sm font-medium">{healthyCount}/{totalCount}</span>
              </div>
              <Progress value={(healthyCount / totalCount) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Response Time Score</span>
                <span className="text-sm font-medium">
                  {avgResponseTime < 100 ? 'Excellent' : avgResponseTime < 300 ? 'Good' : avgResponseTime < 1000 ? 'Fair' : 'Poor'}
                </span>
              </div>
              <Progress 
                value={Math.max(0, 100 - (avgResponseTime / 10))} 
                className="h-2" 
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Error Rate Score</span>
                <span className="text-sm font-medium">{(100 - avgErrorRate).toFixed(1)}%</span>
              </div>
              <Progress value={100 - avgErrorRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
