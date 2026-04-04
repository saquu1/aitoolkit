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
    type: 'info',
    title: 'System Ready',
    message: 'All 35 agent modules initialized and ready for execution.',
    time: 'Just now',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'Database Connected',
    message: 'SQLite connection established. Schema sync complete.',
    time: '2m ago',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'Welcome Back',
    message: 'Press Ctrl+K to open the command palette and navigate quickly.',
    time: '5m ago',
    read: false,
  },
  {
    id: '4',
    type: 'warning',
    title: 'No Schema Data',
    message: 'Upload SQL files to enable schema analysis features.',
    time: '10m ago',
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: 'Theme Updated',
    message: 'Midnight Purple theme applied successfully.',
    time: '1h ago',
    read: true,
  },
]

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { colors } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const panelRef = useRef<HTMLDivElement>(null)

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
      {/* Bell Button */}
      <button
        className="relative p-2 rounded-lg transition-all duration-200 hover:scale-105"
        style={{ color: colors.textMuted }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-in zoom-in duration-200"
            style={{ backgroundColor: colors.error }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: colors.bgSecondary,
            borderColor: colors.border,
            boxShadow: `0 25px 50px -12px ${alpha(colors.bg, 80)}`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: alpha(colors.border, 50) }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: colors.primary }} />
              <h3 className="text-sm font-semibold" style={{ color: colors.text }}>Notifications</h3>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: alpha(colors.error, 15), color: colors.error }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  className="p-1 rounded-md transition-colors text-[11px] hover:underline"
                  style={{ color: colors.primary }}
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="p-1 rounded-md transition-colors"
                  style={{ color: colors.textMuted }}
                  onClick={clearAll}
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                className="p-1 rounded-md transition-colors"
                style={{ color: colors.textMuted }}
                onClick={() => setIsOpen(false)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: alpha(colors.primary, 10) }}
                >
                  <Bell className="w-6 h-6" style={{ color: colors.textMuted }} />
                </div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>All caught up!</p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>No new notifications</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: alpha(colors.border, 30) }}>
                {notifications.map((notification) => {
                  const Icon = getIcon(notification.type)
                  const color = getColor(notification.type)
                  return (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                      style={{
                        backgroundColor: notification.read ? 'transparent' : alpha(color, 4),
                      }}
                      onClick={() => markRead(notification.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = alpha(color, 8)
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : alpha(color, 4)
                      }}
                    >
                      <div
                        className="p-1.5 rounded-lg mt-0.5 flex-shrink-0"
                        style={{ backgroundColor: alpha(color, 12) }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          )}
                          <p className="text-xs font-semibold truncate" style={{ color: colors.text }}>
                            {notification.title}
                          </p>
                        </div>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: colors.textMuted }}>
                          {notification.message}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: alpha(colors.textMuted, 70) }}>
                          {notification.time}
                        </p>
                      </div>
                      <button
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                        style={{ color: colors.textMuted }}
                        onClick={(e) => dismissNotification(notification.id, e)}
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
              className="px-4 py-2.5 border-t text-center"
              style={{ borderColor: alpha(colors.border, 50) }}
            >
              <button
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: colors.primary }}
                onClick={() => setIsOpen(false)}
              >
                Close notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
