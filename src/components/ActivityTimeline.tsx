'use client'

import { useMemo } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface Activity {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  time: string
  icon: any // Lucide React icon component
  detail?: string
}

interface ActivityTimelineProps {
  activities: Activity[]
  maxItems?: number
}

export function ActivityTimeline({ activities, maxItems = 8 }: ActivityTimelineProps) {
  const { colors } = useTheme()

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const displayedActivities = useMemo(
    () => activities.slice(0, maxItems),
    [activities, maxItems]
  )

  const getTypeColor = (type: Activity['type']): string => {
    switch (type) {
      case 'success': return colors.success
      case 'warning': return colors.warning
      case 'error': return colors.error
      default: return colors.primary
    }
  }

  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${alpha(colors.border, 40)}`,
        padding: '1.25rem',
      }}
    >
      {/* Scrollable timeline container */}
      <div className="max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex flex-col gap-3">
          {displayedActivities.map((activity, index) => {
            const typeColor = getTypeColor(activity.type)
            const Icon = activity.icon
            const isUnread = index === 0 // First item is considered "active/unread"

            return (
              <div
                key={activity.id}
                className="flex items-stretch gap-3 group"
              >
                {/* Timeline column: dot + connecting line */}
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: '20px' }}>
                  {/* Dot with optional pulse ring */}
                  <div className="relative flex items-center justify-center" style={{ width: '20px', height: '20px' }}>
                    {isUnread && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                          backgroundColor: alpha(typeColor, 30),
                        }}
                      />
                    )}
                    <span
                      className="absolute inset-[3px] rounded-full"
                      style={{
                        backgroundColor: typeColor,
                        boxShadow: `0 0 6px ${alpha(typeColor, 40)}`,
                      }}
                    />
                  </div>

                  {/* Connecting line */}
                  {index < displayedActivities.length - 1 && (
                    <div
                      className="flex-1 min-h-[20px]"
                      style={{
                        width: '2px',
                        marginLeft: '9px',
                        background: `linear-gradient(to bottom, ${alpha(colors.border, 50)}, ${alpha(colors.primary, 20)})`,
                      }}
                    />
                  )}
                </div>

                {/* Activity card */}
                <div
                  className="flex-1 rounded-lg transition-all duration-200 hover:scale-[1.01] cursor-default"
                  style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${alpha(colors.border, 25)}`,
                    borderLeft: `3px solid ${alpha(typeColor, 60)}`,
                    padding: '0.75rem',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 16px ${alpha(colors.bg, 20)}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon container */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-lg"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: alpha(typeColor, 12),
                      }}
                    >
                      {Icon && (
                        <Icon
                          className="w-4 h-4"
                          style={{ color: typeColor }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm leading-snug"
                        style={{ color: colors.text }}
                      >
                        {activity.message}
                      </p>
                      {activity.detail && (
                        <p
                          className="text-xs mt-1 leading-relaxed"
                          style={{ color: colors.textMuted }}
                        >
                          {activity.detail}
                        </p>
                      )}
                      <p
                        className="text-xs mt-1.5"
                        style={{ color: alpha(colors.textMuted, 65) }}
                      >
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state */}
      {displayedActivities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: alpha(colors.primary, 10) }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: colors.textMuted }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            No recent activity
          </p>
          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
            New activities will appear here
          </p>
        </div>
      )}
    </div>
  )
}
