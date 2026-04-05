'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Shield,
  Upload,
  Download,
  ScanSearch,
  Info,
  Rocket,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/useTheme';

// =============================================================================
// TYPES
// =============================================================================

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type:
    | 'scan'
    | 'enrichment'
    | 'compliance'
    | 'error'
    | 'success'
    | 'info'
    | 'warning'
    | 'deployment';
  user?: string;
  metadata?: Record<string, string | number>;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
  showViewAll?: boolean;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const alpha = (color: string, opacity: number) =>
  `color-mix(in srgb, ${color} ${opacity}%, transparent)`;

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 30) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

// =============================================================================
// EVENT TYPE CONFIG
// =============================================================================

function getTypeConfig(type: TimelineEvent['type'], colors: ReturnType<typeof useTheme>['colors']) {
  const configs: Record<
    TimelineEvent['type'],
    {
      color: string;
      bgColor: string;
      borderColor: string;
      badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: typeof Activity;
      label: string;
    }
  > = {
    scan: {
      color: colors.primary,
      bgColor: alpha(colors.primary, 15),
      borderColor: alpha(colors.primary, 30),
      badgeVariant: 'default',
      icon: ScanSearch,
      label: 'Scan',
    },
    enrichment: {
      color: '#a855f7',
      bgColor: alpha('#a855f7', 15),
      borderColor: alpha('#a855f7', 30),
      badgeVariant: 'secondary',
      icon: Zap,
      label: 'Enrichment',
    },
    compliance: {
      color: colors.success,
      bgColor: alpha(colors.success, 15),
      borderColor: alpha(colors.success, 30),
      badgeVariant: 'outline',
      icon: Shield,
      label: 'Compliance',
    },
    error: {
      color: colors.error,
      bgColor: alpha(colors.error, 15),
      borderColor: alpha(colors.error, 30),
      badgeVariant: 'destructive',
      icon: XCircle,
      label: 'Error',
    },
    success: {
      color: colors.success,
      bgColor: alpha(colors.success, 15),
      borderColor: alpha(colors.success, 30),
      badgeVariant: 'outline',
      icon: CheckCircle2,
      label: 'Success',
    },
    info: {
      color: colors.primary,
      bgColor: alpha(colors.primary, 15),
      borderColor: alpha(colors.primary, 30),
      badgeVariant: 'default',
      icon: Info,
      label: 'Info',
    },
    warning: {
      color: colors.warning,
      bgColor: alpha(colors.warning, 15),
      borderColor: alpha(colors.warning, 30),
      badgeVariant: 'secondary',
      icon: AlertTriangle,
      label: 'Warning',
    },
    deployment: {
      color: colors.primary,
      bgColor: alpha(colors.primary, 15),
      borderColor: alpha(colors.primary, 30),
      badgeVariant: 'default',
      icon: Rocket,
      label: 'Deployment',
    },
  };
  return configs[type];
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyTimeline() {
  const { colors, mounted } = useTheme();
  if (!mounted) {
    return (
      <div className="animate-pulse space-y-3 py-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl"
            style={{ backgroundColor: alpha(colors.border, 30) }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div
        className="relative mb-4"
        style={{ color: alpha(colors.textMuted, 40) }}
      >
        <Activity className="h-12 w-12" strokeWidth={1.5} />
        <div
          className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full"
          style={{ backgroundColor: alpha(colors.primary, 20) }}
        />
      </div>
      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>
        No activity yet
      </p>
      <p className="text-xs mt-1" style={{ color: alpha(colors.textMuted, 60) }}>
        Events will appear here as your project is analyzed
      </p>
    </div>
  );
}

// =============================================================================
// TIMELINE ITEM
// =============================================================================

interface TimelineItemProps {
  event: TimelineEvent;
  isLast: boolean;
  index: number;
  compact: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function TimelineItem({ event, isLast, index, compact, colors }: TimelineItemProps) {
  const config = getTypeConfig(event.type, colors);
  const Icon = config.icon;
  const relTime = getRelativeTime(event.timestamp);

  return (
    <div
      className="relative flex gap-3 md:gap-4 content-fade-in"
      style={{
        animationDelay: `${index * 70}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Timeline rail */}
      <div className="relative flex flex-col items-center">
        {/* Dot */}
        <div
          className="relative z-10 flex-shrink-0 rounded-full flex items-center justify-center"
          style={{
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            backgroundColor: config.bgColor,
            border: `2px solid ${config.borderColor}`,
            boxShadow: `0 0 8px ${alpha(config.color, 25)}`,
          }}
        >
          <Icon
            className={compact ? 'h-3 w-3' : 'h-4 w-4'}
            style={{ color: config.color }}
          />
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div
            className="flex-1 w-px min-h-[12px]"
            style={{
              backgroundColor: alpha(colors.border, 40),
            }}
          />
        )}
      </div>

      {/* Content card */}
      <div
        className={`flex-1 min-w-0 pb-4 ${compact ? '' : ''}`}
      >
        <div
          className="glass-card-enhanced card-interactive rounded-xl transition-all duration-200"
          style={{
            padding: compact ? '10px 14px' : '14px 18px',
            borderLeft: `3px solid ${config.color}`,
          }}
        >
          {/* Top row: title + badge + timestamp */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h4
                className={`font-semibold leading-tight ${compact ? 'text-xs' : 'text-sm'}`}
                style={{ color: colors.text }}
              >
                {event.title}
              </h4>
              <Badge
                variant={config.badgeVariant}
                className="text-[10px] px-1.5 py-0 h-4 font-medium flex-shrink-0"
                style={
                  config.badgeVariant === 'outline'
                    ? {
                        borderColor: alpha(config.color, 40),
                        color: config.color,
                        backgroundColor: alpha(config.color, 10),
                      }
                    : config.badgeVariant === 'secondary'
                      ? {
                          backgroundColor: config.bgColor,
                          color: config.color,
                        }
                      : undefined
                }
              >
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3" style={{ color: alpha(colors.textMuted, 50) }} />
              <span
                className="text-[11px] whitespace-nowrap"
                style={{ color: alpha(colors.textMuted, 70) }}
              >
                {relTime}
              </span>
            </div>
          </div>

          {/* Description */}
          <p
            className={`mt-1.5 leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'}`}
            style={{ color: colors.textMuted }}
          >
            {event.description}
          </p>

          {/* Metadata chips + user */}
          {(event.metadata && Object.keys(event.metadata).length > 0) ||
          event.user ? (
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {event.user && (
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: alpha(colors.primary, 10),
                    color: colors.primaryLight,
                    border: `1px solid ${alpha(colors.primary, 20)}`,
                  }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                  {event.user}
                </span>
              )}
              {event.metadata &&
                Object.entries(event.metadata).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: alpha(colors.textMuted, 8),
                      color: colors.textSecondary,
                      border: `1px solid ${alpha(colors.border, 50)}`,
                    }}
                  >
                    <span style={{ color: alpha(colors.textMuted, 60) }}>{key}:</span>
                    <span className="font-semibold" style={{ color: colors.text }}>{value}</span>
                  </span>
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ActivityTimeline({
  events,
  maxItems = 8,
  showViewAll = false,
  compact = false,
  className = '',
}: ActivityTimelineProps) {
  const { colors, mounted } = useTheme();

  // SSR skeleton
  if (!mounted) {
    return (
      <div className={`space-y-0 ${className}`}>
        <div className="animate-pulse space-y-3 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div
                className="flex-shrink-0 rounded-full"
                style={{
                  width: compact ? 28 : 36,
                  height: compact ? 28 : 36,
                  backgroundColor: alpha(colors.border, 30),
                }}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="h-3 rounded-md"
                  style={{
                    width: `${70 + (i * 7) % 20}%`,
                    backgroundColor: alpha(colors.border, 30),
                  }}
                />
                <div
                  className="h-2 rounded-md"
                  style={{
                    width: `${85 + (i * 11) % 15}%`,
                    backgroundColor: alpha(colors.border, 20),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayEvents = (events ?? []).slice(0, maxItems);
  const hasEvents = displayEvents.length > 0;

  return (
    <div className={className}>
      {!hasEvents ? (
        <EmptyTimeline />
      ) : (
        <div className="relative">
          {/* Timeline events */}
          <div className="space-y-0">
            {displayEvents.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={index === displayEvents.length - 1}
                index={index}
                compact={compact}
                colors={colors}
              />
            ))}
          </div>

          {/* View All footer */}
          {showViewAll && (events ?? []).length > maxItems && (
            <div className="relative flex gap-3 md:gap-4 mt-1">
              <div className="relative flex flex-col items-center">
                <div
                  className="flex-shrink-0 rounded-full flex items-center justify-center"
                  style={{
                    width: compact ? 28 : 36,
                    height: compact ? 28 : 36,
                    backgroundColor: alpha(colors.border, 20),
                    border: `2px solid ${alpha(colors.border, 40)}`,
                  }}
                >
                  <span
                    className={`font-semibold ${compact ? 'text-[10px]' : 'text-xs'}`}
                    style={{ color: colors.textMuted }}
                  >
                    +{events.length - maxItems}
                  </span>
                </div>
              </div>
              <div className="flex-1 flex items-center">
                <button
                  className="text-xs font-medium transition-colors duration-150 hover:underline"
                  style={{ color: colors.primaryLight }}
                >
                  View all {events.length} events
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { TimelineEvent, ActivityTimelineProps };
