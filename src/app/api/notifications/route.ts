/**
 * Notifications API Routes
 * TASK-5.6: Notification System
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  notificationService,
  notificationBroadcaster,
  NotificationType,
  NotificationCategory
} from '@/lib/notifications/notification-service'

// GET /api/notifications
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  const userId = request.nextUrl.searchParams.get('userId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

  if (!userId && action !== 'preferences') {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  switch (action) {
    case 'list':
      const notifications = notificationService.getNotifications(userId!, limit)
      return NextResponse.json({
        success: true,
        data: notifications,
        unreadCount: notificationService.getUnreadCount(userId!)
      })

    case 'unread':
      const unreadCount = notificationService.getUnreadCount(userId!)
      return NextResponse.json({
        success: true,
        data: { unreadCount }
      })

    case 'preferences':
      const prefUserId = request.nextUrl.searchParams.get('userId')
      if (!prefUserId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
      }
      const preferences = notificationService.getPreferences(prefUserId)
      return NextResponse.json({
        success: true,
        data: preferences
      })

    default:
      return NextResponse.json({
        error: 'Invalid action',
        availableActions: ['list', 'unread', 'preferences']
      }, { status: 400 })
  }
}

// POST /api/notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create':
        return await createNotification(body)

      case 'mark-read':
        return await markAsRead(body)

      case 'mark-all-read':
        return await markAllAsRead(body)

      case 'delete':
        return await deleteNotification(body)

      case 'update-preferences':
        return await updatePreferences(body)

      case 'bulk':
        return await bulkNotify(body)

      case 'template':
        return await notifyFromTemplate(body)

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['create', 'mark-read', 'mark-all-read', 'delete', 'update-preferences', 'bulk', 'template']
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Notifications API error:', error)
    return NextResponse.json({
      error: 'Operation failed',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Create notification
 */
async function createNotification(body: any) {
  const { userId, type, category, title, message, link, data, expiresAt } = body

  if (!userId || !type || !category || !title || !message) {
    return NextResponse.json({
      error: 'Missing required fields',
      required: ['userId', 'type', 'category', 'title', 'message']
    }, { status: 400 })
  }

  const notification = await notificationService.notify({
    userId,
    type: type as NotificationType,
    category: category as NotificationCategory,
    title,
    message,
    link,
    data,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  })

  // Broadcast to real-time connections
  notificationBroadcaster.broadcast(userId, notification)

  return NextResponse.json({
    success: true,
    data: notification
  })
}

/**
 * Mark notification as read
 */
async function markAsRead(body: any) {
  const { userId, notificationId } = body

  if (!userId || !notificationId) {
    return NextResponse.json({ error: 'Missing userId or notificationId' }, { status: 400 })
  }

  const success = notificationService.markAsRead(userId, notificationId)

  return NextResponse.json({
    success,
    message: success ? 'Notification marked as read' : 'Notification not found'
  })
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(body: any) {
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const count = notificationService.markAllAsRead(userId)

  return NextResponse.json({
    success: true,
    data: { markedCount: count }
  })
}

/**
 * Delete notification
 */
async function deleteNotification(body: any) {
  const { userId, notificationId } = body

  if (!userId || !notificationId) {
    return NextResponse.json({ error: 'Missing userId or notificationId' }, { status: 400 })
  }

  const success = notificationService.deleteNotification(userId, notificationId)

  return NextResponse.json({
    success,
    message: success ? 'Notification deleted' : 'Notification not found'
  })
}

/**
 * Update notification preferences
 */
async function updatePreferences(body: any) {
  const { userId, preferences } = body

  if (!userId || !preferences) {
    return NextResponse.json({ error: 'Missing userId or preferences' }, { status: 400 })
  }

  notificationService.updatePreferences(userId, preferences)

  return NextResponse.json({
    success: true,
    message: 'Preferences updated'
  })
}

/**
 * Bulk notify multiple users
 */
async function bulkNotify(body: any) {
  const { userIds, type, category, title, message, link, data, expiresAt } = body

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid userIds' }, { status: 400 })
  }

  if (!type || !category || !title || !message) {
    return NextResponse.json({
      error: 'Missing required fields',
      required: ['userIds', 'type', 'category', 'title', 'message']
    }, { status: 400 })
  }

  const successCount = await notificationService.bulkNotify(
    userIds,
    {
      type: type as NotificationType,
      category: category as NotificationCategory,
      title,
      message,
      link,
      data,
      read: false,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    }
  )

  return NextResponse.json({
    success: true,
    data: {
      totalRecipients: userIds.length,
      successCount,
      failureCount: userIds.length - successCount
    }
  })
}

/**
 * Notify from template
 */
async function notifyFromTemplate(body: any) {
  const { userId, templateId, variables, link } = body

  if (!userId || !templateId) {
    return NextResponse.json({
      error: 'Missing userId or templateId'
    }, { status: 400 })
  }

  const notification = await notificationService.notifyFromTemplate(
    userId,
    templateId,
    variables || {},
    link
  )

  if (!notification) {
    return NextResponse.json({
      error: 'Template not found or notification failed'
    }, { status: 400 })
  }

  // Broadcast to real-time connections
  notificationBroadcaster.broadcast(userId, notification)

  return NextResponse.json({
    success: true,
    data: notification
  })
}

/**
 * SSE endpoint for real-time notifications
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
