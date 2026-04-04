'use client'

import { useTheme } from '@/hooks/useTheme'
import { useEventStream, type StreamEvent } from '@/hooks/useEventStream'
import {
  Wifi,
  WifiOff,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Activity,
  Zap,
} from 'lucide-react'

const EVENT_ICONS: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  system: Cpu,
}

const EVENT_COLORS = {
  info: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  system: 'var(--color-accent)',
}

function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 5) return 'Just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function RealtimeEventFeed() {
  const { colors } = useTheme()
  const { events, connected, stats } = useEventStream()

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: alpha(colors.card, 50),
        borderColor: colors.border,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: colors.text }}
        >
          <Activity className="w-4 h-4" style={{ color: colors.accent }} />
          Live Event Stream
        </h3>
        <div className="flex items-center gap-2">
          {stats && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{
                backgroundColor: alpha(colors.accent, 10),
                color: colors.accent,
              }}
            >
              {stats.clientCount} client{stats.clientCount !== 1 ? 's' : ''}
            </span>
          )}
          <div
            className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: alpha(
                connected ? colors.success : colors.error,
                15
              ),
              color: connected ? colors.success : colors.error,
            }}
          >
            {connected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span className="font-medium">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span className="font-medium">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <Zap
              className="w-8 h-8 mx-auto mb-2"
              style={{ color: colors.textMuted, opacity: 0.4 }}
            />
            <p className="text-xs" style={{ color: colors.textMuted }}>
              {connected
                ? 'Waiting for events...'
                : 'Connecting to event stream...'}
            </p>
          </div>
        ) : (
          events.map((event) => {
            const Icon = EVENT_ICONS[event.type] || Info
            const eventColor = EVENT_COLORS[event.type]
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-2.5 rounded-lg transition-all duration-200 hover:scale-[1.01] group"
                style={{
                  backgroundColor: alpha(eventColor, 6),
                  borderLeft: `2px solid ${alpha(eventColor, 40)}`,
                }}
              >
                <div
                  className="p-1.5 rounded-md flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: alpha(eventColor, 12),
                  }}
                >
                  <Icon
                    className="w-3 h-3"
                    style={{ color: eventColor }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: colors.text }}
                    >
                      {event.message}
                    </p>
                    <span
                      className="text-[10px] flex-shrink-0 font-mono"
                      style={{ color: colors.textMuted }}
                    >
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                  {event.detail && (
                    <p
                      className="text-[10px] mt-0.5 truncate"
                      style={{ color: colors.textMuted }}
                    >
                      {event.detail}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[9px] px-1.5 py-0 rounded font-medium uppercase tracking-wider"
                      style={{
                        backgroundColor: alpha(eventColor, 15),
                        color: eventColor,
                      }}
                    >
                      {event.source}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
