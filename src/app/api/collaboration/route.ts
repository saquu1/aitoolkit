/**
 * Team Collaboration API Routes
 * TASK-5.5: Team Collaboration
 */

import { NextRequest, NextResponse } from 'next/server'
import { teamCollaborationService } from '@/lib/collaboration/team-collaboration'

// GET /api/collaboration
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  const teamId = request.nextUrl.searchParams.get('teamId')
  const projectId = request.nextUrl.searchParams.get('projectId')
  const companyId = request.nextUrl.searchParams.get('companyId')

  try {
    switch (action) {
      case 'teams':
        if (!companyId) {
          return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
        }
        const teams = await teamCollaborationService.getTeams(companyId)
        return NextResponse.json({ success: true, data: teams })

      case 'team':
        if (!teamId) {
          return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })
        }
        const team = await teamCollaborationService.getTeam(teamId)
        return NextResponse.json({ success: true, data: team })

      case 'members':
        if (!teamId) {
          return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })
        }
        const members = await teamCollaborationService.getTeamMembers(teamId)
        return NextResponse.json({ success: true, data: members })

      case 'stats':
        if (!teamId) {
          return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })
        }
        const stats = await teamCollaborationService.getTeamStats(teamId)
        return NextResponse.json({ success: true, data: stats })

      case 'activity':
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
        const activities = await teamCollaborationService.getActivityFeed(projectId || undefined, limit)
        return NextResponse.json({ success: true, data: activities })

      case 'comments':
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
        }
        const entityType = request.nextUrl.searchParams.get('entityType') as any
        const entityId = request.nextUrl.searchParams.get('entityId')
        const comments = await teamCollaborationService.getComments(projectId, entityType, entityId)
        return NextResponse.json({ success: true, data: comments })

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['teams', 'team', 'members', 'stats', 'activity', 'comments']
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: 'Operation failed',
      message: error.message
    }, { status: 500 })
  }
}

// POST /api/collaboration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create-team':
        return await createTeam(body)

      case 'invite-member':
        return await inviteMember(body)

      case 'accept-invite':
        return await acceptInvite(body)

      case 'update-role':
        return await updateRole(body)

      case 'remove-member':
        return await removeMember(body)

      case 'log-activity':
        return await logActivity(body)

      case 'add-comment':
        return await addComment(body)

      case 'resolve-comment':
        return await resolveComment(body)

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['create-team', 'invite-member', 'accept-invite', 'update-role', 'remove-member', 'log-activity', 'add-comment', 'resolve-comment']
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: 'Operation failed',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Create team
 */
async function createTeam(body: any) {
  const { companyId, name, description, ownerId, user } = body

  if (!companyId || !name || !ownerId) {
    return NextResponse.json({
      error: 'Missing required fields',
      required: ['companyId', 'name', 'ownerId']
    }, { status: 400 })
  }

  const team = await teamCollaborationService.createTeam(
    companyId,
    name,
    description,
    ownerId,
    user || { id: ownerId, name: 'Owner', email: '' }
  )

  return NextResponse.json({
    success: true,
    data: team
  })
}

/**
 * Invite member
 */
async function inviteMember(body: any) {
  const { teamId, email, role, invitedBy, user } = body

  if (!teamId || !email || !invitedBy) {
    return NextResponse.json({
      error: 'Missing required fields',
      required: ['teamId', 'email', 'invitedBy']
    }, { status: 400 })
  }

  const invite = await teamCollaborationService.inviteMember(
    teamId,
    email,
    role || 'member',
    invitedBy,
    user || { id: invitedBy, name: 'User' }
  )

  return NextResponse.json({
    success: true,
    data: invite
  })
}

/**
 * Accept invite
 */
async function acceptInvite(body: any) {
  const { token, userId, user } = body

  if (!token || !userId) {
    return NextResponse.json({
      error: 'Missing token or userId'
    }, { status: 400 })
  }

  const member = await teamCollaborationService.acceptInvite(
    token,
    userId,
    user || { id: userId, name: 'User', email: '' }
  )

  return NextResponse.json({
    success: true,
    data: member
  })
}

/**
 * Update member role
 */
async function updateRole(body: any) {
  const { teamId, userId, role, updatedBy } = body

  if (!teamId || !userId || !role) {
    return NextResponse.json({
      error: 'Missing required fields'
    }, { status: 400 })
  }

  const success = await teamCollaborationService.updateMemberRole(teamId, userId, role, updatedBy)

  return NextResponse.json({
    success,
    message: success ? 'Role updated' : 'Failed to update role'
  })
}

/**
 * Remove member
 */
async function removeMember(body: any) {
  const { teamId, userId, removedBy } = body

  if (!teamId || !userId) {
    return NextResponse.json({
      error: 'Missing teamId or userId'
    }, { status: 400 })
  }

  const success = await teamCollaborationService.removeMember(teamId, userId, removedBy)

  return NextResponse.json({
    success,
    message: success ? 'Member removed' : 'Failed to remove member'
  })
}

/**
 * Log activity
 */
async function logActivity(body: any) {
  const { projectId, teamId, userId, action, entityType, entityId, entityName, description, metadata, user } = body

  if (!userId || !action || !entityType || !entityId) {
    return NextResponse.json({
      error: 'Missing required fields'
    }, { status: 400 })
  }

  const activity = await teamCollaborationService.logActivity({
    projectId,
    teamId,
    userId,
    action,
    entityType,
    entityId,
    entityName: entityName || entityId,
    description,
    metadata,
    user: user || { id: userId, name: 'User' }
  })

  return NextResponse.json({
    success: true,
    data: activity
  })
}

/**
 * Add comment
 */
async function addComment(body: any) {
  const { projectId, entityType, entityId, userId, content, parentId, user } = body

  if (!projectId || !entityType || !entityId || !userId || !content) {
    return NextResponse.json({
      error: 'Missing required fields'
    }, { status: 400 })
  }

  const comment = await teamCollaborationService.addComment(
    projectId,
    entityType,
    entityId,
    userId,
    content,
    parentId,
    user
  )

  return NextResponse.json({
    success: true,
    data: comment
  })
}

/**
 * Resolve comment
 */
async function resolveComment(body: any) {
  const { projectId, commentId, resolvedBy } = body

  if (!projectId || !commentId || !resolvedBy) {
    return NextResponse.json({
      error: 'Missing required fields'
    }, { status: 400 })
  }

  const success = await teamCollaborationService.resolveComment(projectId, commentId, resolvedBy)

  return NextResponse.json({
    success,
    message: success ? 'Comment resolved' : 'Failed to resolve comment'
  })
}
