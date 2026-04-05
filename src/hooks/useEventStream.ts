'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface StreamEvent {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  source: string
  message: string
  detail?: string
  timestamp: number
}

interface StreamStats {
  totalEvents: number
  clientCount: number
  uptime: number
}

/**
 * Hook for connecting to the real-time event stream via Socket.IO.
 * Handles reconnection, event buffering, and heartbeat.
 */
export function useEventStream() {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState<StreamStats | null>(null)
  const socketRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    let mounted = true

    async function connect() {
      try {
        const { io } = await import('socket.io-client')
        const socket = io('/?XTransformPort=3010', {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 10,
          timeout: 5000,
        })

        socketRef.current = socket

        socket.on('connect', () => {
          if (!mounted) return
          setConnected(true)
          socket.emit('request-stats')
        })

        socket.on('disconnect', () => {
          if (!mounted) return
          setConnected(false)
        })

        socket.on('init', (data: { events: StreamEvent[], clientCount: number }) => {
          if (!mounted) return
          setEvents(data.events)
          setStats(prev => prev ? { ...prev, clientCount: data.clientCount } : null)
        })

        socket.on('event', (event: StreamEvent) => {
          if (!mounted) return
          setEvents(prev => {
            const next = [event, ...prev]
            return next.slice(0, 50) // Keep last 50 events
          })
        })

        socket.on('stats', (data: StreamStats) => {
          if (!mounted) return
          setStats(data)
        })

        socket.on('connect_error', (err: Error) => {
          console.warn('[EventStream] Connection error:', err.message)
          setConnected(false)
        })
      } catch (err) {
        console.warn('[EventStream] Failed to load socket.io-client:', err)
        setConnected(false)
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const postEvent = useCallback((event: Omit<StreamEvent, 'id' | 'timestamp'>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('post-event', event)
    }
  }, [])

  const refreshStats = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-stats')
    }
  }, [])

  return {
    events,
    connected,
    stats,
    postEvent,
    refreshStats,
  }
}
