/**
 * Notification Service
 * In-app and email notifications for users
 * 
 * TASK-5.6: Notification System
 * Part of Phase 5: Production & Scale
 */

// Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system'
export type NotificationCategory = 
  | 'agent' 
  | 'generation' 
  | 'validation' 
  | 'billing' 
  | 'team' 
  | 'system'
  | 'workflow'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  link?: string
  data?: Record<string, any>
  read: boolean
  readAt?: Date
  createdAt: Date
  expiresAt?: Date
}

export interface NotificationPreference {
  userId: string
  email: boolean
  push: boolean
  inApp: boolean
  categories: {
    [key in NotificationCategory]?: {
      email: boolean
      push: boolean
      inApp: boolean
    }
  }
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  category: NotificationCategory
  titleTemplate: string
  messageTemplate: string
  variables: string[]
}

// Default notification preferences
export const DEFAULT_PREFERENCES: NotificationPreference = {
  userId: '',
  email: true,
  push: true,
  inApp: true,
  categories: {
    agent: { email: true, push: false, inApp: true },
    generation: { email: true, push: false, inApp: true },
    validation: { email: false, push: false, inApp: true },
    billing: { email: true, push: true, inApp: true },
    team: { email: true, push: true, inApp: true },
    system: { email: true, push: true, inApp: true },
    workflow: { email: true, push: true, inApp: true }
  }
}

// Notification templates
export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'agent_complete',
    type: 'success',
    category: 'agent',
    titleTemplate: 'Agent Completed: {{agentName}}',
    messageTemplate: 'Successfully processed {{itemsProcessed}} items in {{duration}}ms',
    variables: ['agentName', 'itemsProcessed', 'duration']
  },
  {
    id: 'agent_failed',
    type: 'error',
    category: 'agent',
    titleTemplate: 'Agent Failed: {{agentName}}',
    messageTemplate: 'Agent execution failed: {{errorMessage}}',
    variables: ['agentName', 'errorMessage']
  },
  {
    id: 'generation_complete',
    type: 'success',
    category: 'generation',
    titleTemplate: 'Generation Complete: {{artifactName}}',
    messageTemplate: 'Generated {{fileCount}} files ({{totalSize}})',
    variables: ['artifactName', 'fileCount', 'totalSize']
  },
  {
    id: 'validation_error',
    type: 'warning',
    category: 'validation',
    titleTemplate: 'Validation Issues Found',
    messageTemplate: 'Found {{errorCount}} errors and {{warningCount}} warnings',
    variables: ['errorCount', 'warningCount']
  },
  {
    id: 'billing_payment_success',
    type: 'success',
    category: 'billing',
    titleTemplate: 'Payment Successful',
    messageTemplate: 'Your payment of {{amount}} {{currency}} has been processed',
    variables: ['amount', 'currency']
  },
  {
    id: 'billing_payment_failed',
    type: 'error',
    category: 'billing',
    titleTemplate: 'Payment Failed',
    messageTemplate: 'Payment of {{amount}} {{currency}} failed. Please update your payment method.',
    variables: ['amount', 'currency']
  },
  {
    id: 'team_invite',
    type: 'info',
    category: 'team',
    titleTemplate: 'Team Invitation',
    messageTemplate: '{{inviterName}} invited you to join {{teamName}}',
    variables: ['inviterName', 'teamName']
  },
  {
    id: 'workflow_state_change',
    type: 'info',
    category: 'workflow',
    titleTemplate: '{{workflowName}} Updated',
    messageTemplate: 'Status changed from {{fromState}} to {{toState}}',
    variables: ['workflowName', 'fromState', 'toState']
  }
]

/**
 * In-memory notification store (replace with database in production)
 */
class NotificationStore {
  private notifications: Map<string, Notification[]> = new Map()
  private preferences: Map<string, NotificationPreference> = new Map()
  private maxPerUser = 100

  add(userId: string, notification: Notification): void {
    const userNotifications = this.notifications.get(userId) || []
    
    userNotifications.unshift(notification)
    
    // Trim to max
    if (userNotifications.length > this.maxPerUser) {
      userNotifications.pop()
    }
    
    this.notifications.set(userId, userNotifications)
  }

  get(userId: string, limit?: number): Notification[] {
    const notifications = this.notifications.get(userId) || []
    return limit ? notifications.slice(0, limit) : notifications
  }

  markAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId)
    if (!notifications) return false

    const notification = notifications.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      notification.read = true
      notification.readAt = new Date()
      return true
    }
    return false
  }

  markAllAsRead(userId: string): number {
    const notifications = this.notifications.get(userId)
    if (!notifications) return 0

    let count = 0
    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true
        notification.readAt = new Date()
        count++
      }
    }
    return count
  }

  delete(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId)
    if (!notifications) return false

    const index = notifications.findIndex(n => n.id === notificationId)
    if (index > -1) {
      notifications.splice(index, 1)
      return true
    }
    return false
  }

  getUnreadCount(userId: string): number {
    const notifications = this.notifications.get(userId) || []
    return notifications.filter(n => !n.read).length
  }

  getPreferences(userId: string): NotificationPreference {
    return this.preferences.get(userId) || { ...DEFAULT_PREFERENCES, userId }
  }

  setPreferences(userId: string, preferences: Partial<NotificationPreference>): void {
    const current = this.getPreferences(userId)
    this.preferences.set(userId, { ...current, ...preferences, userId })
  }

  clearExpired(userId: string): number {
    const notifications = this.notifications.get(userId)
    if (!notifications) return 0

    const now = new Date()
    const initialLength = notifications.length
    const filtered = notifications.filter(n => !n.expiresAt || n.expiresAt > now)
    this.notifications.set(userId, filtered)
    return initialLength - filtered.length
  }
}

// Singleton store
const notificationStore = new NotificationStore()

/**
 * Notification Service Class
 */
export class NotificationService {
  private emailEnabled: boolean
  private pushEnabled: boolean

  constructor() {
    this.emailEnabled = !!process.env.SMTP_HOST || !!process.env.RESEND_API_KEY
    this.pushEnabled = false // Would require push service setup
  }

  /**
   * Create and send notification
   */
  async notify(input: {
    userId: string
    type: NotificationType
    category: NotificationCategory
    title: string
    message: string
    link?: string
    data?: Record<string, any>
    expiresAt?: Date
  }): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: input.userId,
      type: input.type,
      category: input.category,
      title: input.title,
      message: input.message,
      link: input.link,
      data: input.data,
      read: false,
      createdAt: new Date(),
      expiresAt: input.expiresAt
    }

    // Store notification
    notificationStore.add(input.userId, notification)

    // Get user preferences
    const preferences = notificationStore.getPreferences(input.userId)
    const categoryPrefs = preferences.categories[input.category] || preferences

    // Send via different channels based on preferences
    if (categoryPrefs.inApp) {
      // Already stored for in-app
    }

    if (categoryPrefs.email && this.emailEnabled) {
      await this.sendEmailNotification(input.userId, notification)
    }

    if (categoryPrefs.push && this.pushEnabled) {
      await this.sendPushNotification(input.userId, notification)
    }

    return notification
  }

  /**
   * Create notification from template
   */
  async notifyFromTemplate(
    userId: string,
    templateId: string,
    variables: Record<string, string>,
    link?: string
  ): Promise<Notification | null> {
    const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      console.error(`Template not found: ${templateId}`)
      return null
    }

    // Replace variables in templates
    let title = template.titleTemplate
    let message = template.messageTemplate

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      title = title.replace(regex, value)
      message = message.replace(regex, value)
    }

    return this.notify({
      userId,
      type: template.type,
      category: template.category,
      title,
      message,
      link
    })
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, limit?: number): Notification[] {
    // Clear expired first
    notificationStore.clearExpired(userId)
    return notificationStore.get(userId, limit)
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    return notificationStore.getUnreadCount(userId)
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): boolean {
    return notificationStore.markAsRead(userId, notificationId)
  }

  /**
   * Mark all as read
   */
  markAllAsRead(userId: string): number {
    return notificationStore.markAllAsRead(userId)
  }

  /**
   * Delete notification
   */
  deleteNotification(userId: string, notificationId: string): boolean {
    return notificationStore.delete(userId, notificationId)
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreference {
    return notificationStore.getPreferences(userId)
  }

  /**
   * Update notification preferences
   */
  updatePreferences(userId: string, preferences: Partial<NotificationPreference>): void {
    notificationStore.setPreferences(userId, preferences)
  }

  /**
   * Bulk notify multiple users
   */
  async bulkNotify(
    userIds: string[],
    notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>
  ): Promise<number> {
    let successCount = 0

    for (const userId of userIds) {
      try {
        await this.notify({
          userId,
          type: notification.type,
          category: notification.category,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          data: notification.data,
          expiresAt: notification.expiresAt
        })
        successCount++
      } catch (error) {
        console.error(`Failed to notify user ${userId}:`, error)
      }
    }

    return successCount
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(userId: string, notification: Notification): Promise<void> {
    // In a real implementation, use Resend or other email service
    console.log(`[EMAIL] To: ${userId}, Subject: ${notification.title}`)
    
    // Example with Resend:
    // const { Resend } = await import('resend')
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'notifications@example.com',
    //   to: userEmail,
    //   subject: notification.title,
    //   html: `<p>${notification.message}</p>`
    // })
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(userId: string, notification: Notification): Promise<void> {
    // In a real implementation, use Firebase Cloud Messaging or similar
    console.log(`[PUSH] To: ${userId}, Title: ${notification.title}`)
  }
}

// Export singleton
export const notificationService = new NotificationService()

/**
 * Real-time notification broadcaster
 * For WebSocket-based live updates
 */
export class NotificationBroadcaster {
  private connections: Map<string, Set<(notification: Notification) => void>> = new Map()

  /**
   * Subscribe to real-time notifications
   */
  subscribe(userId: string, callback: (notification: Notification) => void): () => void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set())
    }
    this.connections.get(userId)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.connections.get(userId)?.delete(callback)
    }
  }

  /**
   * Broadcast notification to user
   */
  broadcast(userId: string, notification: Notification): void {
    const callbacks = this.connections.get(userId)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(notification)
        } catch (error) {
          console.error('Notification callback error:', error)
        }
      })
    }
  }

  /**
   * Get connected users count
   */
  getConnectedCount(): number {
    return this.connections.size
  }
}

export const notificationBroadcaster = new NotificationBroadcaster()
