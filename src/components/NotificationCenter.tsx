'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Bell, CheckCircle2, AlertTriangle, Info, X, Trash2, Settings, ChevronDown } from 'lucide-react'

export interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  time: string
  read: boolean
}

interface NotificationCenterProps {
  onNavigate?: (tab: string) => void
}

// Simulated notifications
const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Schema Analysis Complete',
    message: '17 tables parsed with 201 columns and 29 FK relationships.',
    time: 'Just now',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'FK Resolution: 76% Complete',
    message: '22 of 29 foreign keys resolved successfully.',
    time: '2m ago',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: '6 Modules Linked',
    message: 'Patient Management, Order Management, and 4 more modules linked.',
    time: '5m ago',
    read: false,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Agent Run Failed',
    message: 'fk-resolver agent failed: timeout after 30s. Retry recommended.',
    time: '15m ago',
    read: false,
  },
  {
    id: '5',
    type: 'info',
    title: 'Pipeline Running',
    message: 'code-generator agent is processing 4 items.',
    time: '20m ago',
    read: true,
  },
  {
    id: '6',
    type: 'success',
    title: 'Database Connected',
    message: 'SQLite connection established via Prisma ORM.',
    time: '1h ago',
    read: true,
  },
  {
    id: '7',
    type: 'info',
    title: 'Welcome Back',
    message: 'Press Ctrl+K to open the command palette for quick navigation.',
    time: '2h ago',
    read: true,
  },
]

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { colors } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const panelRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const unreadCount = notifications.filter(n => !n.read).length

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const dismissNotification = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return CheckCircle2
      case 'warning': return AlertTriangle
      case 'error': return X
      default: return Info
    }
  }

  const getColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return colors.success
      case 'warning': return colors.warning
      case 'error': return colors.error
      default: return colors.primary
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button with glow ring */}
      <button
        className="relative p-2 rounded-lg transition-all duration-200 hover:scale-105 group"
        style={{ color: colors.textMuted }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0 && (
          <span
            className="absolute inset-0 rounded-lg animate-pulse-ring"
            style={{ backgroundColor: alpha(colors.error, 20) }}
          />
        )}
        <Bell className="w-4 h-4 relative z-10 transition-transform group-hover:scale-110" />
        {unreadCount > 0 && (
          <span
            className="notification-badge-count"
            style={{
              backgroundColor: colors.error,
              boxShadow: `0 0 8px ${alpha(colors.error, 40)}`,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border z-50 glass-card-enhanced animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: alpha(colors.bgSecondary, 95),
            borderColor: alpha(colors.border, 60),
            boxShadow: `0 25px 60px -12px ${alpha(colors.bg, 90)}, 0 0 0 1px ${alpha(colors.border, 20)}`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: alpha(colors.border, 40) }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: alpha(colors.primary, 12) }}>
                <Bell className="w-3.5 h-3.5" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: colors.text }}>Notifications</h3>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: alpha(colors.error, 15),
                    color: colors.error,
                    border: `1px solid ${alpha(colors.error, 20)}`,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {unreadCount > 0 && (
                <button
                  className="px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    color: colors.primary,
                    backgroundColor: alpha(colors.primary, 8),
                  }}
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="p-1.5 rounded-md transition-all duration-200 hover:scale-105"
                  style={{ color: colors.textMuted, backgroundColor: alpha(colors.bgTertiary, 20) }}
                  onClick={clearAll}
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                className="p-1.5 rounded-md transition-all duration-200 hover:scale-105"
                style={{ color: colors.textMuted, backgroundColor: alpha(colors.bgTertiary, 20) }}
                onClick={() => setIsOpen(false)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-3 animate-float-subtle"
                  style={{ backgroundColor: alpha(colors.success, 10) }}
                >
                  <CheckCircle2 className="w-7 h-7" style={{ color: colors.success }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: colors.text }}>All caught up!</p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>No new notifications</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: alpha(colors.border, 20) }}>
                {notifications.map((notification, index) => {
                  const Icon = getIcon(notification.type)
                  const color = getColor(notification.type)
                  const isHovered = hoveredId === notification.id
                  return (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 px-4 py-3 transition-all duration-200 cursor-pointer relative group"
                      style={{
                        backgroundColor: isHovered
                          ? alpha(color, 8)
                          : notification.read
                            ? 'transparent'
                            : alpha(color, 3),
                      }}
                      onClick={() => markRead(notification.id)}
                      onMouseEnter={() => setHoveredId(notification.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Unread indicator line */}
                      {!notification.read && (
                        <div
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full animate-in slide-in-from-left duration-300"
                          style={{
                            backgroundColor: color,
                            animationDelay: `${index * 50}ms`,
                          }}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className="p-1.5 rounded-lg mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{
                          backgroundColor: alpha(color, 12),
                          boxShadow: isHovered ? `0 0 12px ${alpha(color, 15)}` : 'none',
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-breathe"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          <p className="text-xs font-semibold truncate" style={{ color: colors.text }}>
                            {notification.title}
                          </p>
                        </div>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: colors.textMuted }}>
                          {notification.message}
                        </p>
                        <p className="text-[10px] mt-1.5 font-mono" style={{ color: alpha(colors.textMuted, 60) }}>
                          {notification.time}
                        </p>
                      </div>

                      {/* Dismiss button */}
                      <button
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 mt-0.5 hover:scale-110"
                        style={{ color: colors.textMuted, backgroundColor: alpha(colors.bgTertiary, 30) }}
                        onClick={(e) => dismissNotification(notification.id, e)}
                        aria-label="Dismiss notification"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 border-t flex items-center justify-between"
              style={{ borderColor: alpha(colors.border, 40) }}
            >
              <span className="text-[10px]" style={{ color: colors.textMuted }}>
                {notifications.filter(n => n.read).length} read, {unreadCount} unread
              </span>
              <button
                className="text-xs font-medium transition-all duration-200 hover:underline"
                style={{ color: colors.primary }}
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
