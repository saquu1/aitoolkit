'use client'

import { useState, useCallback, useRef } from 'react'

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
 * Does NOT auto-connect to reduce server load.
 * Call `connect()` manually when real-time events are needed.
 */
export function useEventStream() {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState<StreamStats | null>(null)
  const socketRef = useRef<any>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    async function doConnect() {
      try {
        const { io } = await import('socket.io-client')
        const socket = io('/?XTransformPort=3010', {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
          timeout: 5000,
        })

        socketRef.current = socket

        socket.on('connect', () => {
          if (!mountedRef.current) return
          setConnected(true)
          socket.emit('request-stats')
        })

        socket.on('disconnect', () => {
          if (!mountedRef.current) return
          setConnected(false)
        })

        socket.on('init', (data: { events: StreamEvent[], clientCount: number }) => {
          if (!mountedRef.current) return
          setEvents(data.events)
          setStats(prev => prev ? { ...prev, clientCount: data.clientCount } : null)
        })

        socket.on('event', (event: StreamEvent) => {
          if (!mountedRef.current) return
          setEvents(prev => {
            const next = [event, ...prev]
            return next.slice(0, 50) // Keep last 50 events
          })
        })

        socket.on('stats', (data: StreamStats) => {
          if (!mountedRef.current) return
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

    doConnect()
  }, [])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setConnected(false)
  }, [])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    mountedRef.current = false
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
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
    connect,
    disconnect,
    cleanup,
    postEvent,
    refreshStats,
  }
}
