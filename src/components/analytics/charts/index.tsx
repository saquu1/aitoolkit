/**
 * ANALYTICS CHART COMPONENTS
 * ==========================
 * Simple chart components for analytics visualization
 */

'use client';

import React from 'react';

// =============================================================================
// SIMPLE LINE CHART
// =============================================================================

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
}

export function SimpleLineChart({ 
  data, 
  color = '#3b82f6', 
  height = 200,
  showLabels = true,
  showValues = false
}: LineChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  
  // Create SVG path
  const width = 100;
  const chartHeight = 80;
  const padding = 10;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = chartHeight - padding - ((d.value - minValue) / range) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${chartHeight - padding} ${points} ${width - padding},${chartHeight - padding}`;

  return (
    <div style={{ height }}>
      <svg 
        viewBox={`0 0 ${width} ${chartHeight}`} 
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <line
            key={pct}
            x1="0"
            y1={chartHeight * (pct / 100)}
            x2={width}
            y2={chartHeight * (pct / 100)}
            stroke="currentColor"
            strokeOpacity="0.1"
          />
        ))}
        
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={color}
          fillOpacity="0.1"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
          const y = chartHeight - padding - ((d.value - minValue) / range) * (chartHeight - 2 * padding);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill={color}
            />
          );
        })}
      </svg>
      
      {/* X-axis labels */}
      {showLabels && data.length > 0 && (
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{data[0]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SIMPLE BAR CHART
// =============================================================================

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  horizontal?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  maxBars?: number;
}

export function SimpleBarChart({ 
  data, 
  color = '#3b82f6', 
  height = 200,
  horizontal = false,
  showLabels = true,
  showValues = true,
  maxBars = 10
}: BarChartProps) {
  const displayData = data.slice(0, maxBars);
  
  if (!displayData || displayData.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No data available</div>;
  }

  const maxValue = Math.max(...displayData.map(d => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-2" style={{ height, overflowY: 'auto' }}>
        {displayData.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 truncate">{d.label}</span>
            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{ 
                  width: `${(d.value / maxValue) * 100}%`, 
                  backgroundColor: color 
                }}
              />
            </div>
            {showValues && (
              <span className="text-xs font-medium w-12 text-right">{d.value.toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <div className="flex items-end justify-between gap-1 h-full pb-6">
        {displayData.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div 
              className="w-full rounded-t transition-all"
              style={{ 
                height: `${Math.max(4, (d.value / maxValue) * (height - 30))}px`,
                backgroundColor: color,
                opacity: 0.8 + (d.value / maxValue) * 0.2
              }}
            />
            {showLabels && (
              <span className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                {d.label.length > 6 ? d.label.slice(0, 6) + '...' : d.label}
              </span>
            )}
            {showValues && (
              <span className="text-xs font-medium">{d.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SIMPLE PIE CHART
// =============================================================================

interface PieChartProps {
  data: { label: string; value: number }[];
  colors?: string[];
  size?: number;
  showLegend?: boolean;
  showLabels?: boolean;
}

export function SimplePieChart({ 
  data, 
  colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  size = 200,
  showLegend = true,
  showLabels = true
}: PieChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No data available</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const centerX = 50;
  const centerY = 50;
  const radius = 40;

  // Create pie segments
  let currentAngle = -90; // Start from top
  const segments = data.map((d, i) => {
    const percentage = (d.value / total) * 100;
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc path
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      path,
      color: colors[i % colors.length],
      label: d.label,
      value: d.value,
      percentage,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg 
        viewBox="0 0 100 100" 
        style={{ width: size, height: size }}
        className="shrink-0"
      >
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
      
      {showLegend && (
        <div className="space-y-1 text-sm">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-muted-foreground">{seg.label}</span>
              <span className="font-medium ml-auto">{seg.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ACTIVITY HEATMAP
// =============================================================================

interface HeatmapProps {
  dailyStats: Record<string, { sessions: number; tokens: number; cost: number }>;
  color?: string;
  weeks?: number;
}

export function ActivityHeatmap({ dailyStats, color = '#3b82f6', weeks = 12 }: HeatmapProps) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7));

  // Generate all dates
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= today) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...Object.values(dailyStats).map(d => d.sessions),
    1
  );

  // Get color intensity
  const getIntensity = (value: number): string => {
    const ratio = value / maxValue;
    if (ratio === 0) return 'bg-muted';
    if (ratio < 0.25) return `bg-${color}-100`;
    if (ratio < 0.5) return `bg-${color}-200`;
    if (ratio < 0.75) return `bg-${color}-300`;
    return `bg-${color}-400`;
  };

  const getColorStyle = (value: number): React.CSSProperties => {
    const ratio = value / maxValue;
    const opacity = ratio === 0 ? 0.05 : 0.1 + ratio * 0.9;
    return {
      backgroundColor: color,
      opacity,
    };
  };

  // Group by weeks
  const weeksArray: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeksArray.push(dates.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {days.map((day, i) => (
            <div key={day} className="h-3 text-xs text-muted-foreground flex items-center">
              {i % 2 === 1 ? day : ''}
            </div>
          ))}
        </div>
        
        {/* Weeks */}
        {weeksArray.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5">
            {week.map((date, dayIndex) => {
              const dateKey = date.toISOString().split('T')[0];
              const stats = dailyStats[dateKey];
              const sessions = stats?.sessions || 0;
              
              return (
                <div
                  key={dayIndex}
                  className="w-3 h-3 rounded-sm"
                  style={getColorStyle(sessions)}
                  title={`${dateKey}: ${sessions} sessions`}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.2 }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.4 }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.6 }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.9 }} />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// =============================================================================
// SPARKLINE
// =============================================================================

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

export function Sparkline({ 
  data, 
  color = '#3b82f6', 
  width = 100, 
  height = 20,
  showArea = true 
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      {showArea && (
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={color}
          fillOpacity="0.1"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}
