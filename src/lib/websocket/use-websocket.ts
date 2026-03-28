'use client'

/**
 * WebSocket Client Hook for React Components
 * Provides real-time progress updates in the browser
 * 
 * TASK-4.3: Real-time Progress Updates
 * Part of Phase 4: Features & User Experience
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export interface WebSocketStatus {
  connected: boolean
  connecting: boolean
  error: string | null
  lastMessage: Date | null
}

export interface ProgressEvent {
  type: string
  projectId: string
  runId?: string
  agentId?: string
  agentName?: string
  timestamp: string
  data: any
}

export interface UseWebSocketOptions {
  url?: string
  projectId: string
  autoConnect?: boolean
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onMessage?: (event: ProgressEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export interface WebSocketHookResult {
  status: WebSocketStatus
  subscribe: (projectId: string) => void
  unsubscribe: (projectId: string) => void
  send: (message: any) => void
  disconnect: () => void
  reconnect: () => void
  events: ProgressEvent[]
  clearEvents: () => void
}

/**
 * WebSocket Hook for Real-time Updates
 */
export function useWebSocket(options: UseWebSocketOptions): WebSocketHookResult {
  const {
    url,
    projectId,
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null
  })

  const [events, setEvents] = useState<ProgressEvent[]>([])

  // Determine WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (url) return url

    // Auto-detect based on current location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${window.location.host}/ws?projectId=${projectId}`
    }
    return ''
  }, [url, projectId])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = getWebSocketUrl()
    if (!wsUrl) return

    setStatus(prev => ({ ...prev, connecting: true, error: null }))

    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setStatus({
          connected: true,
          connecting: false,
          error: null,
          lastMessage: null
        })
        reconnectAttempts.current = 0

        // Subscribe to project
        if (projectId) {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            projectId
          }))
        }

        onConnect?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          setStatus(prev => ({ ...prev, lastMessage: new Date() }))

          if (message.event) {
            const progressEvent: ProgressEvent = {
              ...message,
              timestamp: message.timestamp || new Date().toISOString()
            }

            setEvents(prev => [...prev.slice(-99), progressEvent])
            onMessage?.(progressEvent)
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      wsRef.current.onclose = () => {
        setStatus(prev => ({
          ...prev,
          connected: false,
          connecting: false
        }))

        onDisconnect?.()

        // Attempt reconnect
        if (reconnect && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current.onerror = (error) => {
        setStatus(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: 'WebSocket connection error'
        }))

        onError?.(error)
      }
    } catch (error: any) {
      setStatus(prev => ({
        ...prev,
        connecting: false,
        error: error.message
      }))
    }
  }, [getWebSocketUrl, projectId, reconnect, reconnectInterval, maxReconnectAttempts, onConnect, onDisconnect, onError, onMessage])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    wsRef.current = null
    setStatus(prev => ({ ...prev, connected: false, connecting: false }))
  }, [])

  // Reconnect
  const reconnectFn = useCallback(() => {
    disconnect()
    reconnectAttempts.current = 0
    connect()
  }, [connect, disconnect])

  // Subscribe to a project
  const subscribe = useCallback((projId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        projectId: projId
      }))
    }
  }, [])

  // Unsubscribe from a project
  const unsubscribe = useCallback((projId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        projectId: projId
      }))
    }
  }, [])

  // Send message
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    status,
    subscribe,
    unsubscribe,
    send,
    disconnect,
    reconnect: reconnectFn,
    events,
    clearEvents
  }
}

/**
 * Hook for agent progress updates
 */
export function useAgentProgress(projectId: string, runId?: string) {
  const [agentStates, setAgentStates] = useState<Map<string, any>>(new Map())
  const [pipelineState, setPipelineState] = useState<any>(null)

  const { status, events } = useWebSocket({
    projectId,
    onMessage: (event) => {
      if (runId && event.runId !== runId) return

      switch (event.type) {
        case 'agent-start':
        case 'agent-progress':
        case 'agent-complete':
          if (event.agentId) {
            setAgentStates(prev => {
              const next = new Map(prev)
              next.set(event.agentId!, event.data)
              return next
            })
          }
          break

        case 'pipeline-start':
        case 'pipeline-complete':
          setPipelineState(event.data)
          break
      }
    }
  })

  return {
    connected: status.connected,
    agentStates,
    pipelineState,
    events
  }
}

/**
 * Progress Bar Component Helper
 */
export function calculateProgress(events: ProgressEvent[], runId: string): number {
  const relevantEvents = events.filter(e => e.runId === runId)
  if (relevantEvents.length === 0) return 0

  const latestPipelineEvent = relevantEvents
    .filter(e => e.type === 'pipeline-start' || e.type === 'pipeline-complete')
    .pop()

  if (latestPipelineEvent?.type === 'pipeline-complete') {
    return 100
  }

  const agentEvents = relevantEvents.filter(e =>
    e.type === 'agent-progress' || e.type === 'agent-complete'
  )

  if (agentEvents.length === 0) return 0

  // Average progress across all agents
  const agentProgress = new Map<string, number>()
  agentEvents.forEach(event => {
    if (event.agentId && typeof event.data?.progress === 'number') {
      agentProgress.set(event.agentId, event.data.progress)
    }
  })

  if (agentProgress.size === 0) return 0

  const total = Array.from(agentProgress.values()).reduce((a, b) => a + b, 0)
  return Math.round(total / agentProgress.size)
}
