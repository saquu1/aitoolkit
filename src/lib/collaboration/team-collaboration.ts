/**
 * Team Collaboration Service
 * Activity feed, team management, and collaboration features
 * 
 * TASK-5.5: Team Collaboration
 * Part of Phase 5: Production & Scale
 */

// Types
export interface TeamMember {
  id: string
  userId: string
  teamId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  joinedAt: Date
  lastActiveAt?: Date
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

export interface Team {
  id: string
  companyId: string
  name: string
  description?: string
  avatar?: string
  createdById: string
  createdAt: Date
  updatedAt: Date
  memberCount: number
  projectCount: number
  settings: TeamSettings
}

export interface TeamSettings {
  allowMemberInvite: boolean
  requireApproval: boolean
  defaultRole: 'member' | 'viewer'
  notifications: {
    mention: boolean
    comment: boolean
    projectUpdate: boolean
  }
}

export interface ActivityFeedItem {
  id: string
  projectId?: string
  userId: string
  teamId?: string
  action: ActivityAction
  entityType: EntityType
  entityId: string
  entityName: string
  description: string
  metadata?: Record<string, any>
  createdAt: Date
  user: {
    id: string
    name: string
    avatar?: string
  }
}

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'comment'
  | 'mention'
  | 'assign'
  | 'complete'
  | 'approve'
  | 'reject'
  | 'invite'
  | 'join'
  | 'leave'
  | 'export'
  | 'import'
  | 'generate'
  | 'parse'

export type EntityType =
  | 'project'
  | 'table'
  | 'column'
  | 'procedure'
  | 'view'
  | 'module'
  | 'agent'
  | 'team'
  | 'comment'
  | 'export'
  | 'generation'

export interface Comment {
  id: string
  projectId: string
  entityType: EntityType
  entityId: string
  userId: string
  parentId?: string
  content: string
  mentions: string[]
  createdAt: Date
  updatedAt: Date
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  user: {
    id: string
    name: string
    avatar?: string
  }
}

export interface TeamInvite {
  id: string
  teamId: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  token: string
  invitedBy: string
  expiresAt: Date
  acceptedAt?: Date
  status: 'pending' | 'accepted' | 'expired'
}

// In-memory storage
class CollaborationStore {
  private teams: Map<string, Team> = new Map()
  private members: Map<string, TeamMember[]> = new Map()
  private activities: Map<string, ActivityFeedItem[]> = new Map()
  private comments: Map<string, Comment[]> = new Map()
  private invites: Map<string, TeamInvite> = new Map()

  // Teams
  addTeam(team: Team): void {
    this.teams.set(team.id, team)
  }

  getTeam(id: string): Team | undefined {
    return this.teams.get(id)
  }

  getTeamsByCompany(companyId: string): Team[] {
    return Array.from(this.teams.values()).filter(t => t.companyId === companyId)
  }

  updateTeam(id: string, updates: Partial<Team>): Team | undefined {
    const team = this.teams.get(id)
    if (team) {
      const updated = { ...team, ...updates, updatedAt: new Date() }
      this.teams.set(id, updated)
      return updated
    }
    return undefined
  }

  deleteTeam(id: string): boolean {
    return this.teams.delete(id)
  }

  // Members
  addMember(teamId: string, member: TeamMember): void {
    const members = this.members.get(teamId) || []
    members.push(member)
    this.members.set(teamId, members)
  }

  getMembers(teamId: string): TeamMember[] {
    return this.members.get(teamId) || []
  }

  getMemberByUser(teamId: string, userId: string): TeamMember | undefined {
    return (this.members.get(teamId) || []).find(m => m.userId === userId)
  }

  updateMember(teamId: string, userId: string, updates: Partial<TeamMember>): boolean {
    const members = this.members.get(teamId)
    if (members) {
      const idx = members.findIndex(m => m.userId === userId)
      if (idx > -1) {
        members[idx] = { ...members[idx], ...updates }
        return true
      }
    }
    return false
  }

  removeMember(teamId: string, userId: string): boolean {
    const members = this.members.get(teamId)
    if (members) {
      const idx = members.findIndex(m => m.userId === userId)
      if (idx > -1) {
        members.splice(idx, 1)
        return true
      }
    }
    return false
  }

  // Activities
  addActivity(projectId: string | undefined, activity: ActivityFeedItem): void {
    const key = projectId || 'global'
    const activities = this.activities.get(key) || []
    activities.unshift(activity)
    if (activities.length > 100) {
      activities.pop()
    }
    this.activities.set(key, activities)
  }

  getActivities(projectId?: string, limit?: number): ActivityFeedItem[] {
    const key = projectId || 'global'
    const activities = this.activities.get(key) || []
    return limit ? activities.slice(0, limit) : activities
  }

  // Comments
  addComment(projectId: string, comment: Comment): void {
    const comments = this.comments.get(projectId) || []
    comments.push(comment)
    this.comments.set(projectId, comments)
  }

  getComments(projectId: string, entityType?: EntityType, entityId?: string): Comment[] {
    const comments = this.comments.get(projectId) || []
    if (entityType && entityId) {
      return comments.filter(c => c.entityType === entityType && c.entityId === entityId)
    }
    return comments
  }

  updateComment(projectId: string, commentId: string, updates: Partial<Comment>): boolean {
    const comments = this.comments.get(projectId)
    if (comments) {
      const idx = comments.findIndex(c => c.id === commentId)
      if (idx > -1) {
        comments[idx] = { ...comments[idx], ...updates, updatedAt: new Date() }
        return true
      }
    }
    return false
  }

  // Invites
  addInvite(invite: TeamInvite): void {
    this.invites.set(invite.id, invite)
  }

  getInvite(id: string): TeamInvite | undefined {
    return this.invites.get(id)
  }

  getInviteByToken(token: string): TeamInvite | undefined {
    return Array.from(this.invites.values()).find(i => i.token === token)
  }

  updateInvite(id: string, updates: Partial<TeamInvite>): boolean {
    const invite = this.invites.get(id)
    if (invite) {
      this.invites.set(id, { ...invite, ...updates })
      return true
    }
    return false
  }
}

// Singleton store
const store = new CollaborationStore()

/**
 * Team Collaboration Service
 */
export class TeamCollaborationService {
  /**
   * Create a new team
   */
  async createTeam(
    companyId: string,
    name: string,
    description: string,
    ownerId: string,
    user: { id: string; name: string; email: string; avatar?: string }
  ): Promise<Team> {
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const team: Team = {
      id: teamId,
      companyId,
      name,
      description,
      createdById: ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberCount: 1,
      projectCount: 0,
      settings: {
        allowMemberInvite: true,
        requireApproval: false,
        defaultRole: 'member',
        notifications: {
          mention: true,
          comment: true,
          projectUpdate: true
        }
      }
    }

    store.addTeam(team)

    // Add owner as first member
    const ownerMember: TeamMember = {
      id: `member_${Date.now()}`,
      userId: ownerId,
      teamId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      user
    }
    store.addMember(teamId, ownerMember)

    // Log activity
    await this.logActivity({
      teamId,
      userId: ownerId,
      action: 'create',
      entityType: 'team',
      entityId: teamId,
      entityName: name,
      description: `Created team "${name}"`,
      user
    })

    return team
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    return store.getTeam(teamId) || null
  }

  /**
   * Get teams for a company
   */
  async getTeams(companyId: string): Promise<Team[]> {
    return store.getTeamsByCompany(companyId)
  }

  /**
   * Invite member to team
   */
  async inviteMember(
    teamId: string,
    email: string,
    role: 'admin' | 'member' | 'viewer',
    invitedBy: string,
    user: { id: string; name: string; avatar?: string }
  ): Promise<TeamInvite> {
    const team = store.getTeam(teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    const inviteId = `invite_${Date.now()}`
    const token = Math.random().toString(36).substr(2, 32)

    const invite: TeamInvite = {
      id: inviteId,
      teamId,
      email,
      role,
      token,
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending'
    }

    store.addInvite(invite)

    // Log activity
    await this.logActivity({
      teamId,
      userId: invitedBy,
      action: 'invite',
      entityType: 'team',
      entityId: teamId,
      entityName: team.name,
      description: `Invited ${email} to join the team`,
      metadata: { email, role },
      user
    })

    return invite
  }

  /**
   * Accept team invite
   */
  async acceptInvite(
    token: string,
    userId: string,
    user: { id: string; name: string; email: string; avatar?: string }
  ): Promise<TeamMember> {
    const invite = store.getInviteByToken(token)
    if (!invite) {
      throw new Error('Invalid invite')
    }

    if (invite.expiresAt < new Date()) {
      store.updateInvite(invite.id, { status: 'expired' })
      throw new Error('Invite has expired')
    }

    if (invite.status !== 'pending') {
      throw new Error('Invite already processed')
    }

    const team = store.getTeam(invite.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    // Create member
    const member: TeamMember = {
      id: `member_${Date.now()}`,
      userId,
      teamId: invite.teamId,
      role: invite.role,
      status: 'active',
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      user
    }

    store.addMember(invite.teamId, member)
    store.updateInvite(invite.id, { status: 'accepted', acceptedAt: new Date() })

    // Update team member count
    store.updateTeam(invite.teamId, {
      memberCount: team.memberCount + 1
    })

    // Log activity
    await this.logActivity({
      teamId: invite.teamId,
      userId,
      action: 'join',
      entityType: 'team',
      entityId: invite.teamId,
      entityName: team.name,
      description: `${user.name} joined the team`,
      user
    })

    return member
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return store.getMembers(teamId)
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: TeamMember['role'],
    updatedBy: string
  ): Promise<boolean> {
    const member = store.getMemberByUser(teamId, userId)
    if (!member) {
      throw new Error('Member not found')
    }

    if (member.role === 'owner') {
      throw new Error('Cannot change owner role')
    }

    return store.updateMember(teamId, userId, { role: newRole })
  }

  /**
   * Remove member from team
   */
  async removeMember(
    teamId: string,
    userId: string,
    removedBy: string
  ): Promise<boolean> {
    const member = store.getMemberByUser(teamId, userId)
    if (!member) {
      throw new Error('Member not found')
    }

    if (member.role === 'owner') {
      throw new Error('Cannot remove owner')
    }

    return store.removeMember(teamId, userId)
  }

  /**
   * Log activity
   */
  async logActivity(input: {
    projectId?: string
    teamId?: string
    userId: string
    action: ActivityAction
    entityType: EntityType
    entityId: string
    entityName: string
    description: string
    metadata?: Record<string, any>
    user: { id: string; name: string; avatar?: string }
  }): Promise<ActivityFeedItem> {
    const activity: ActivityFeedItem = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: input.projectId,
      userId: input.userId,
      teamId: input.teamId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      description: input.description,
      metadata: input.metadata,
      createdAt: new Date(),
      user: input.user
    }

    store.addActivity(input.projectId, activity)
    return activity
  }

  /**
   * Get activity feed
   */
  async getActivityFeed(projectId?: string, limit: number = 50): Promise<ActivityFeedItem[]> {
    return store.getActivities(projectId, limit)
  }

  /**
   * Add comment
   */
  async addComment(
    projectId: string,
    entityType: EntityType,
    entityId: string,
    userId: string,
    content: string,
    parentId?: string,
    user?: { id: string; name: string; avatar?: string }
  ): Promise<Comment> {
    // Extract mentions from content (@username pattern)
    const mentionRegex = /@(\w+)/g
    const mentions = (content.match(mentionRegex) || []).map(m => m.slice(1))

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      entityType,
      entityId,
      userId,
      parentId,
      content,
      mentions,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolved: false,
      user: user || { id: userId, name: 'Unknown' }
    }

    store.addComment(projectId, comment)

    // Log activity
    await this.logActivity({
      projectId,
      userId,
      action: 'comment',
      entityType,
      entityId,
      entityName: entityId,
      description: `Commented: ${content.substring(0, 50)}...`,
      metadata: { commentId: comment.id },
      user: user || { id: userId, name: 'Unknown' }
    })

    return comment
  }

  /**
   * Get comments
   */
  async getComments(
    projectId: string,
    entityType?: EntityType,
    entityId?: string
  ): Promise<Comment[]> {
    return store.getComments(projectId, entityType, entityId)
  }

  /**
   * Resolve comment
   */
  async resolveComment(
    projectId: string,
    commentId: string,
    resolvedBy: string
  ): Promise<boolean> {
    return store.updateComment(projectId, commentId, {
      resolved: true,
      resolvedBy,
      resolvedAt: new Date()
    })
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<{
    memberCount: number
    activeMembers: number
    pendingInvites: number
    projectCount: number
  }> {
    const team = store.getTeam(teamId)
    const members = store.getMembers(teamId)

    return {
      memberCount: members.length,
      activeMembers: members.filter(m => m.status === 'active').length,
      pendingInvites: 0, // Would query invites
      projectCount: team?.projectCount || 0
    }
  }
}

// Export singleton
export const teamCollaborationService = new TeamCollaborationService()
