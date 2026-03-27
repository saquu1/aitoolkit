/**
 * WebSocket Server for Real-time Progress Updates
 * Custom server implementation for Next.js
 * 
 * TASK-4.3: Real-time Progress Updates
 * Part of Phase 4: Features & User Experience
 * 
 * Note: This requires running Next.js with a custom server
 * or can be deployed as a separate WebSocket service.
 */

import { Server as HttpServer } from 'http'
import { Server as HttpsServer } from 'https'
import { EventEmitter } from 'events'

// WebSocket types (avoiding external dependency for now)
interface WebSocket {
  send(data: string): void
  close(): void
  on(event: 'message' | 'close' | 'error', callback: (data?: any) => void): void
  readyState: number
}

interface WebSocketServer {
  on(event: 'connection', callback: (ws: WebSocket, req: any) => void): void
  close(): void
  clients: Set<WebSocket>
}

// WebSocket states
const WS_OPEN = 1

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'event'
  projectId?: string
  runId?: string
  event?: string
  data?: any
}

export interface WebSocketClient {
  id: string
  ws: WebSocket
  projectId?: string
  subscriptions: Set<string>
  lastPing: Date
}

/**
 * WebSocket Manager Class
 * Manages WebSocket connections and subscriptions
 */
export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer | null = null
  private clients: Map<string, WebSocketClient> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null

  /**
   * Initialize WebSocket server
   */
  initialize(server: HttpServer | HttpsServer): WebSocketServer | null {
    try {
      // Dynamic import to avoid errors if ws is not installed
      const WebSocketModule = require('ws')
      const WebSocketServerClass = WebSocketModule.Server

      this.wss = new WebSocketServerClass({ server, path: '/ws' }) as WebSocketServer

      this.wss.on('connection', (ws: WebSocket, req: any) => {
        this.handleConnection(ws, req)
      })

      // Start heartbeat
      this.heartbeatInterval = setInterval(() => {
        this.checkClients()
      }, 30000)

      console.log('WebSocket server initialized on /ws')
      return this.wss
    } catch (error) {
      console.warn('WebSocket server not available:', error)
      return null
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = this.generateId()
    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastPing: new Date()
    }

    this.clients.set(clientId, client)

    // Extract project ID from URL query if present
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const projectId = url.searchParams.get('projectId')
    if (projectId) {
      client.projectId = projectId
      client.subscriptions.add(projectId)
    }

    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data)
    })

    ws.on('close', () => {
      this.handleDisconnect(clientId)
    })

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for client ${clientId}:`, error)
      this.handleDisconnect(clientId)
    })

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'event',
      event: 'connected',
      data: { clientId }
    })
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString())
      const client = this.clients.get(clientId)

      if (!client) return

      switch (message.type) {
        case 'subscribe':
          if (message.projectId) {
            client.subscriptions.add(message.projectId)
            this.sendToClient(clientId, {
              type: 'event',
              event: 'subscribed',
              data: { projectId: message.projectId }
            })
          }
          break

        case 'unsubscribe':
          if (message.projectId) {
            client.subscriptions.delete(message.projectId)
          }
          break

        case 'ping':
          client.lastPing = new Date()
          this.sendToClient(clientId, {
            type: 'pong',
            data: { timestamp: new Date().toISOString() }
          })
          break
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    this.clients.delete(clientId)
  }

  /**
   * Send message to client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (client && client.ws.readyState === WS_OPEN) {
      client.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Broadcast to all clients subscribed to a project
   */
  broadcast(projectId: string, event: string, data: any): void {
    const message: WebSocketMessage = {
      type: 'event',
      projectId,
      event,
      data
    }

    const messageStr = JSON.stringify(message)

    this.clients.forEach(client => {
      if (client.subscriptions.has(projectId) && client.ws.readyState === WS_OPEN) {
        client.ws.send(messageStr)
      }
    })
  }

  /**
   * Broadcast to specific run subscribers
   */
  broadcastToRun(projectId: string, runId: string, event: string, data: any): void {
    const message: WebSocketMessage = {
      type: 'event',
      projectId,
      runId,
      event,
      data
    }

    const messageStr = JSON.stringify(message)

    this.clients.forEach(client => {
      if (client.subscriptions.has(projectId) && client.ws.readyState === WS_OPEN) {
        client.ws.send(messageStr)
      }
    })
  }

  /**
   * Check client health
   */
  private checkClients(): void {
    const now = new Date()
    const timeout = 60000 // 60 seconds

    this.clients.forEach((client, clientId) => {
      const elapsed = now.getTime() - client.lastPing.getTime()
      if (elapsed > timeout) {
        console.log(`Client ${clientId} timed out, disconnecting`)
        client.ws.close()
        this.clients.delete(clientId)
      }
    })
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Get subscriptions count
   */
  getSubscriptionCount(projectId: string): number {
    let count = 0
    this.clients.forEach(client => {
      if (client.subscriptions.has(projectId)) count++
    })
    return count
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    if (this.wss) {
      this.wss.close()
    }
    this.clients.clear()
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
export const wsManager = new WebSocketManager()

/**
 * Custom server setup helper
 */
export function setupWebSocket(server: HttpServer | HttpsServer): WebSocketServer | null {
  return wsManager.initialize(server)
}

/**
 * Integration with Progress Broadcaster
 */
export function connectProgressToWebSocket(
  projectId: string,
  runId: string,
  event: string,
  data: any
): void {
  wsManager.broadcastToRun(projectId, runId, event, data)
}
