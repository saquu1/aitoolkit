// =============================================================================
// Multi-Tenant API Route
// Step 5: API endpoints for multi-tenant management
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_TIERS, ROLE_DEFINITIONS } from '@/lib/multi-tenant';
import { prisma } from '@/lib/db';

// =============================================================================
// MAIN ROUTER
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // Company actions
      case 'create-company':
        return await createCompany(body);
      case 'get-company':
        return await getCompany(body);
      case 'update-company':
        return await updateCompany(body);
      case 'get-user-companies':
        return await getUserCompanies(body);
      case 'update-usage':
        return await updateUsage(body);
      
      // Workspace actions
      case 'create-workspace':
        return await createWorkspace(body);
      case 'get-workspace':
        return await getWorkspace(body);
      case 'get-company-workspaces':
        return await getCompanyWorkspaces(body);
      case 'update-workspace':
        return await updateWorkspace(body);
      case 'delete-workspace':
        return await deleteWorkspace(body);
      
      // Project actions
      case 'create-project':
        return await createProject(body);
      case 'get-project':
        return await getProject(body);
      case 'get-company-projects':
        return await getCompanyProjects(body);
      case 'get-user-projects':
        return await getUserProjects(body);
      case 'update-project':
        return await updateProject(body);
      case 'archive-project':
        return await archiveProject(body);
      case 'delete-project':
        return await deleteProject(body);
      
      // User membership actions
      case 'add-user-to-company':
        return await addUserToCompany(body);
      case 'update-user-company-role':
        return await updateUserCompanyRole(body);
      case 'remove-user-from-company':
        return await removeUserFromCompany(body);
      case 'add-user-to-project':
        return await addUserToProject(body);
      case 'update-user-project-role':
        return await updateUserProjectRole(body);
      case 'remove-user-from-project':
        return await removeUserFromProject(body);
      case 'get-user-permissions':
        return await getUserPermissions(body);
      
      // API Key actions
      case 'create-api-key':
        return await createAPIKey(body);
      case 'revoke-api-key':
        return await revokeAPIKey(body);
      case 'get-company-api-keys':
        return await getCompanyAPIKeys(body);
      
      // Invitation actions
      case 'create-invitation':
        return await createInvitation(body);
      case 'accept-invitation':
        return await acceptInvitation(body);
      case 'decline-invitation':
        return await declineInvitation(body);
      case 'get-pending-invitations':
        return await getPendingInvitations(body);
      
      // Audit logs
      case 'get-audit-logs':
        return await getAuditLogs(body);
      
      // Subscription tiers
      case 'get-subscription-tiers':
        return NextResponse.json({ success: true, tiers: SUBSCRIPTION_TIERS });
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Multi-tenant API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'get-company':
        return await getCompany({ companyId: searchParams.get('companyId')! });
      case 'get-user-companies':
        return await getUserCompanies({ userId: searchParams.get('userId')! });
      case 'get-company-workspaces':
        return await getCompanyWorkspaces({ companyId: searchParams.get('companyId')! });
      case 'get-company-projects':
        return await getCompanyProjects({ 
          companyId: searchParams.get('companyId')!,
          workspaceId: searchParams.get('workspaceId') || undefined
        });
      case 'get-user-projects':
        return await getUserProjects({ userId: searchParams.get('userId')! });
      case 'get-project':
        return await getProject({ projectId: searchParams.get('projectId')! });
      case 'get-subscription-tiers':
        return NextResponse.json({ success: true, tiers: SUBSCRIPTION_TIERS });
      case 'get-role-definitions':
        return NextResponse.json({ success: true, roles: ROLE_DEFINITIONS });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// =============================================================================
// COMPANY HANDLERS
// =============================================================================

async function createCompany(body: { name: string; slug: string; ownerId: string; logo?: string; subscriptionTier?: string }) {
  const { name, slug, ownerId, logo, subscriptionTier } = body;
  
  if (!name || !slug || !ownerId) {
    return NextResponse.json({ error: 'name, slug, and ownerId are required' }, { status: 400 });
  }

  // Check if slug is unique
  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: `Company slug "${slug}" is already taken` }, { status: 400 });
  }

  const tier = subscriptionTier || 'free';
  const tierLimits = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]?.limits;

  // Create company with owner in transaction
  const company = await prisma.$transaction(async (tx) => {
    const newCompany = await tx.company.create({
      data: {
        name,
        slug,
        logo,
        subscriptionTier: tier,
        subscriptionStatus: 'trialing',
        settings: JSON.stringify({
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          currency: 'USD',
          language: 'en',
          twoFactorRequired: false,
          sessionTimeout: 30,
          notifications: { email: true, push: false, digest: 'daily' }
        }),
        limits: JSON.stringify(tierLimits),
        usage: JSON.stringify({
          projects: 0,
          users: 1,
          tables: 0,
          modules: 0,
          exportsThisMonth: 0,
          apiCallsToday: 0,
          storageUsed: 0,
          lastUpdated: new Date().toISOString()
        }),
        isActive: true
      }
    });

    // Add owner to company
    await tx.userCompany.create({
      data: {
        userId: ownerId,
        companyId: newCompany.id,
        role: 'owner',
        status: 'active',
        joinedAt: new Date()
      }
    });

    // Create default workspace
    await tx.workspace.create({
      data: {
        companyId: newCompany.id,
        name: 'Default Workspace',
        slug: 'default',
        description: 'Default workspace for the company',
        settings: JSON.stringify({
          isVisible: true,
          defaultProjectRole: 'developer',
          autoAddNewMembers: true
        }),
        isActive: true
      }
    });

    return newCompany;
  });

  return NextResponse.json({ success: true, company });
}

async function getCompany(body: { companyId: string }) {
  const { companyId } = body;
  
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      workspaces: {
        where: { isActive: true },
        orderBy: { name: 'asc' }
      },
      _count: {
        select: {
          userCompanies: { where: { status: 'active' } },
          projects: true,
          apiKeys: { where: { isActive: true } }
        }
      }
    }
  });
  
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json({ 
    success: true, 
    company: {
      ...company,
      settings: JSON.parse(company.settings),
      limits: JSON.parse(company.limits),
      usage: JSON.parse(company.usage)
    }
  });
}

async function updateCompany(body: { companyId: string; data: Record<string, unknown> }) {
  const { companyId, data } = body;
  
  if (!companyId || !data) {
    return NextResponse.json({ error: 'companyId and data are required' }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: data as any
  });
  
  return NextResponse.json({ success: true, company });
}

async function getUserCompanies(body: { userId: string }) {
  const { userId } = body;
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const userCompanies = await prisma.userCompany.findMany({
    where: { 
      userId,
      status: { in: ['active', 'pending'] }
    },
    include: {
      company: {
        include: {
          _count: {
            select: {
              projects: true,
              userCompanies: { where: { status: 'active' } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json({ success: true, userCompanies });
}

async function updateUsage(body: { companyId: string; input: Record<string, number> }) {
  const { companyId, input } = body;
  
  if (!companyId || !input) {
    return NextResponse.json({ error: 'companyId and input are required' }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { usage: true }
  });

  if (!company) throw new Error('Company not found');

  const usage = JSON.parse(company.usage);
  const updatedUsage = {
    ...usage,
    ...input,
    lastUpdated: new Date().toISOString()
  };

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { usage: JSON.stringify(updatedUsage) }
  });
  
  return NextResponse.json({ success: true, company: updated });
}

// =============================================================================
// WORKSPACE HANDLERS
// =============================================================================

async function createWorkspace(body: { companyId: string; name: string; slug: string; description?: string }) {
  const { companyId, name, slug, description } = body;
  
  if (!companyId || !name || !slug) {
    return NextResponse.json({ error: 'companyId, name, and slug are required' }, { status: 400 });
  }

  // Check if slug is unique within company
  const existing = await prisma.workspace.findFirst({
    where: { companyId, slug }
  });
  
  if (existing) {
    return NextResponse.json({ error: `Workspace slug "${slug}" already exists in this company` }, { status: 400 });
  }

  const workspace = await prisma.workspace.create({
    data: {
      companyId,
      name,
      slug,
      description,
      settings: JSON.stringify({
        isVisible: true,
        defaultProjectRole: 'developer',
        autoAddNewMembers: true
      }),
      isActive: true
    }
  });
  
  return NextResponse.json({ success: true, workspace });
}

async function getWorkspace(body: { workspaceId: string }) {
  const { workspaceId } = body;
  
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      company: true,
      projects: {
        where: { status: { not: 'archived' } },
        orderBy: { name: 'asc' }
      }
    }
  });
  
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  return NextResponse.json({ 
    success: true, 
    workspace: {
      ...workspace,
      settings: JSON.parse(workspace.settings)
    }
  });
}

async function getCompanyWorkspaces(body: { companyId: string }) {
  const { companyId } = body;
  
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: { companyId, isActive: true },
    include: {
      _count: {
        select: { projects: true }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  return NextResponse.json({ success: true, workspaces });
}

async function updateWorkspace(body: { workspaceId: string; data: Record<string, unknown> }) {
  const { workspaceId, data } = body;
  
  if (!workspaceId || !data) {
    return NextResponse.json({ error: 'workspaceId and data are required' }, { status: 400 });
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: data as any
  });
  
  return NextResponse.json({ success: true, workspace });
}

async function deleteWorkspace(body: { workspaceId: string }) {
  const { workspaceId } = body;
  
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  }

  // Check if workspace has projects
  const projects = await prisma.project.count({
    where: { workspaceId }
  });

  if (projects > 0) {
    return NextResponse.json({ 
      error: 'Cannot delete workspace with existing projects. Move or delete projects first.' 
    }, { status: 400 });
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });
  
  return NextResponse.json({ success: true });
}

// =============================================================================
// PROJECT HANDLERS
// =============================================================================

async function createProject(body: { companyId: string; name: string; slug: string; workspaceId?: string; description?: string; softwareType?: string; createdBy?: string }) {
  const { companyId, name, slug, workspaceId, description, softwareType, createdBy } = body;
  
  if (!companyId || !name || !slug) {
    return NextResponse.json({ error: 'companyId, name, and slug are required' }, { status: 400 });
  }

  // Check company limits
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { subscriptionTier: true, usage: true, isActive: true }
  });

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  if (!company.isActive) {
    return NextResponse.json({ error: 'Company is not active' }, { status: 400 });
  }

  const usage = JSON.parse(company.usage);
  const limits = SUBSCRIPTION_TIERS[company.subscriptionTier as keyof typeof SUBSCRIPTION_TIERS]?.limits;

  if (limits && limits.maxProjects !== -1 && usage.projects >= limits.maxProjects) {
    return NextResponse.json({ 
      error: `Project limit reached (${limits.maxProjects}). Please upgrade your plan.` 
    }, { status: 400 });
  }

  // Check if slug is unique within company
  const existing = await prisma.project.findFirst({
    where: { companyId, slug }
  });
  
  if (existing) {
    return NextResponse.json({ error: `Project slug "${slug}" already exists in this company` }, { status: 400 });
  }

  // Create project and update usage
  const project = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: {
        companyId,
        workspaceId,
        name,
        slug,
        description,
        softwareType: softwareType || 'Custom',
        status: 'planning',
        createdBy,
        settings: JSON.stringify({
          softwareType: softwareType || 'Custom',
          targetDatabase: 'postgresql',
          useUUID: true,
          softDelete: true,
          auditFields: true,
          generateApi: true,
          generateUI: true
        }),
        statistics: JSON.stringify({
          totalTables: 0,
          totalColumns: 0,
          totalFKs: 0,
          fkResolutionPercentage: 0,
          modulesCovered: 0,
          rulesGenerated: 0,
          storiesGenerated: 0
        })
      }
    });

    // Update company usage
    await tx.company.update({
      where: { id: companyId },
      data: {
        usage: JSON.stringify({
          ...usage,
          projects: usage.projects + 1,
          lastUpdated: new Date().toISOString()
        })
      }
    });

    return newProject;
  });

  return NextResponse.json({ success: true, project });
}

async function getProject(body: { projectId: string }) {
  const { projectId } = body;
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      workspace: true,
      userProjects: {
        where: { status: 'active' },
        include: {
          user: {
            select: { id: true, email: true, name: true, firstName: true, lastName: true, avatar: true }
          }
        }
      }
    }
  });
  
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ 
    success: true, 
    project: {
      ...project,
      settings: JSON.parse(project.settings),
      statistics: JSON.parse(project.statistics)
    }
  });
}

async function getCompanyProjects(body: { companyId: string; workspaceId?: string }) {
  const { companyId, workspaceId } = body;
  
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const projects = await prisma.project.findMany({
    where: { 
      companyId,
      ...(workspaceId && { workspaceId }),
      status: { not: 'archived' }
    },
    include: {
      workspace: { select: { id: true, name: true } },
      _count: {
        select: { userProjects: { where: { status: 'active' } } }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  return NextResponse.json({ success: true, projects });
}

async function getUserProjects(body: { userId: string }) {
  const { userId } = body;
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const userProjects = await prisma.userProject.findMany({
    where: { userId, status: 'active' },
    include: {
      project: {
        include: {
          company: { select: { id: true, name: true, logo: true } },
          workspace: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json({ success: true, userProjects });
}

async function updateProject(body: { projectId: string; data: Record<string, unknown> }) {
  const { projectId, data } = body;
  
  if (!projectId || !data) {
    return NextResponse.json({ error: 'projectId and data are required' }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: data as any
  });
  
  return NextResponse.json({ success: true, project });
}

async function archiveProject(body: { projectId: string }) {
  const { projectId } = body;
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'archived' }
  });
  
  return NextResponse.json({ success: true });
}

async function deleteProject(body: { projectId: string }) {
  const { projectId } = body;
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { companyId: true }
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.delete({ where: { id: projectId } });

    const company = await tx.company.findUnique({
      where: { id: project.companyId },
      select: { usage: true }
    });

    if (company) {
      const usage = JSON.parse(company.usage);
      await tx.company.update({
        where: { id: project.companyId },
        data: {
          usage: JSON.stringify({
            ...usage,
            projects: Math.max(0, usage.projects - 1),
            lastUpdated: new Date().toISOString()
          })
        }
      });
    }
  });
  
  return NextResponse.json({ success: true });
}

// =============================================================================
// USER COMPANY HANDLERS
// =============================================================================

async function addUserToCompany(body: { userId: string; companyId: string; role: string; invitedBy?: string }) {
  const { userId, companyId, role, invitedBy } = body;
  
  if (!userId || !companyId || !role) {
    return NextResponse.json({ error: 'userId, companyId, and role are required' }, { status: 400 });
  }

  // Check if user is already in company
  const existing = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } }
  });

  if (existing) {
    const updated = await prisma.userCompany.update({
      where: { id: existing.id },
      data: {
        role,
        status: 'active',
        joinedAt: existing.joinedAt || new Date()
      }
    });
    return NextResponse.json({ success: true, userCompany: updated });
  }

  // Check company limits
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { subscriptionTier: true, usage: true, isActive: true }
  });

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  if (!company.isActive) {
    return NextResponse.json({ error: 'Company is not active' }, { status: 400 });
  }

  const usage = JSON.parse(company.usage);
  const limits = SUBSCRIPTION_TIERS[company.subscriptionTier as keyof typeof SUBSCRIPTION_TIERS]?.limits;

  if (limits && limits.maxUsers !== -1 && usage.users >= limits.maxUsers) {
    return NextResponse.json({ 
      error: `User limit reached (${limits.maxUsers}). Please upgrade your plan.` 
    }, { status: 400 });
  }

  // Add user and update usage
  const userCompany = await prisma.$transaction(async (tx) => {
    const uc = await tx.userCompany.create({
      data: {
        userId,
        companyId,
        role,
        status: 'active',
        invitedBy,
        invitedAt: new Date(),
        joinedAt: new Date()
      }
    });

    await tx.company.update({
      where: { id: companyId },
      data: {
        usage: JSON.stringify({
          ...usage,
          users: usage.users + 1,
          lastUpdated: new Date().toISOString()
        })
      }
    });

    return uc;
  });

  return NextResponse.json({ success: true, userCompany });
}

async function updateUserCompanyRole(body: { userId: string; companyId: string; role: string }) {
  const { userId, companyId, role } = body;
  
  if (!userId || !companyId || !role) {
    return NextResponse.json({ error: 'userId, companyId, and role are required' }, { status: 400 });
  }

  const userCompany = await prisma.userCompany.update({
    where: { userId_companyId: { userId, companyId } },
    data: { role }
  });
  
  return NextResponse.json({ success: true, userCompany });
}

async function removeUserFromCompany(body: { userId: string; companyId: string }) {
  const { userId, companyId } = body;
  
  if (!userId || !companyId) {
    return NextResponse.json({ error: 'userId and companyId are required' }, { status: 400 });
  }

  const membership = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } }
  });

  if (!membership) {
    return NextResponse.json({ error: 'User is not a member of this company' }, { status: 404 });
  }
  
  if (membership.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the owner from the company' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.userProject.deleteMany({
      where: { userId, project: { companyId } }
    });

    await tx.userCompany.delete({ where: { id: membership.id } });

    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { usage: true }
    });

    if (company) {
      const usage = JSON.parse(company.usage);
      await tx.company.update({
        where: { id: companyId },
        data: {
          usage: JSON.stringify({
            ...usage,
            users: Math.max(0, usage.users - 1),
            lastUpdated: new Date().toISOString()
          })
        }
      });
    }
  });
  
  return NextResponse.json({ success: true });
}

// =============================================================================
// USER PROJECT HANDLERS
// =============================================================================

async function addUserToProject(body: { userId: string; projectId: string; role: string; permissions?: string[] }) {
  const { userId, projectId, role, permissions } = body;
  
  if (!userId || !projectId || !role) {
    return NextResponse.json({ error: 'userId, projectId, and role are required' }, { status: 400 });
  }

  const existing = await prisma.userProject.findUnique({
    where: { userId_projectId: { userId, projectId } }
  });

  if (existing) {
    const updated = await prisma.userProject.update({
      where: { id: existing.id },
      data: {
        role,
        permissions: JSON.stringify(permissions || []),
        status: 'active'
      }
    });
    return NextResponse.json({ success: true, userProject: updated });
  }

  const userProject = await prisma.userProject.create({
    data: {
      userId,
      projectId,
      role,
      permissions: JSON.stringify(permissions || []),
      status: 'active'
    }
  });
  
  return NextResponse.json({ success: true, userProject });
}

async function updateUserProjectRole(body: { userId: string; projectId: string; role: string; permissions?: string[] }) {
  const { userId, projectId, role, permissions } = body;
  
  if (!userId || !projectId || !role) {
    return NextResponse.json({ error: 'userId, projectId, and role are required' }, { status: 400 });
  }

  const data: { role: string; permissions?: string } = { role };
  if (permissions) data.permissions = JSON.stringify(permissions);

  const userProject = await prisma.userProject.update({
    where: { userId_projectId: { userId, projectId } },
    data
  });
  
  return NextResponse.json({ success: true, userProject });
}

async function removeUserFromProject(body: { userId: string; projectId: string }) {
  const { userId, projectId } = body;
  
  if (!userId || !projectId) {
    return NextResponse.json({ error: 'userId and projectId are required' }, { status: 400 });
  }

  await prisma.userProject.delete({
    where: { userId_projectId: { userId, projectId } }
  });
  
  return NextResponse.json({ success: true });
}

async function getUserPermissions(body: { userId: string; projectId: string }) {
  const { userId, projectId } = body;
  
  if (!userId || !projectId) {
    return NextResponse.json({ error: 'userId and projectId are required' }, { status: 400 });
  }

  const projectMembership = await prisma.userProject.findUnique({
    where: { userId_projectId: { userId, projectId } }
  });

  const projectRole = projectMembership?.role || null;
  const customPermissions = projectMembership?.permissions 
    ? JSON.parse(projectMembership.permissions) 
    : [];

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { companyId: true }
  });

  let companyRole = null;
  if (project) {
    const companyMembership = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId: project.companyId } }
    });
    companyRole = companyMembership?.role || null;
  }

  return NextResponse.json({ 
    success: true, 
    permissions: {
      projectRole,
      companyRole,
      customPermissions,
      hasFullAccess: companyRole === 'owner' || companyRole === 'admin'
    }
  });
}

// =============================================================================
// API KEY HANDLERS
// =============================================================================

async function createAPIKey(body: { companyId: string; name: string; permissions?: string[]; rateLimit?: number }) {
  const { companyId, name, permissions, rateLimit } = body;
  
  if (!companyId || !name) {
    return NextResponse.json({ error: 'companyId and name are required' }, { status: 400 });
  }

  const crypto = require('crypto');
  const key = `sk_${crypto.randomBytes(32).toString('base64url')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);

  await prisma.aPIKey.create({
    data: {
      companyId,
      name,
      keyHash: hash,
      prefix,
      permissions: JSON.stringify(permissions || []),
      rateLimit: rateLimit || 1000,
      isActive: true
    }
  });

  return NextResponse.json({ success: true, key, prefix });
}

async function revokeAPIKey(body: { apiKeyId: string }) {
  const { apiKeyId } = body;
  
  if (!apiKeyId) {
    return NextResponse.json({ error: 'apiKeyId is required' }, { status: 400 });
  }

  await prisma.aPIKey.update({
    where: { id: apiKeyId },
    data: { isActive: false }
  });
  
  return NextResponse.json({ success: true });
}

async function getCompanyAPIKeys(body: { companyId: string }) {
  const { companyId } = body;
  
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const apiKeys = await prisma.aPIKey.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json({ success: true, apiKeys });
}

// =============================================================================
// INVITATION HANDLERS
// =============================================================================

async function createInvitation(body: { companyId: string; email: string; role: string; projectId?: string; projectRole?: string; invitedBy: string }) {
  const { companyId, email, role, projectId, projectRole, invitedBy } = body;
  
  if (!companyId || !email || !role || !invitedBy) {
    return NextResponse.json({ error: 'companyId, email, role, and invitedBy are required' }, { status: 400 });
  }

  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: {
      companyId,
      projectId,
      email,
      role: projectRole || role,
      roleType: projectId ? 'project' : 'company',
      token,
      expiresAt,
      invitedBy,
      status: 'pending'
    }
  });
  
  return NextResponse.json({ success: true, invitation });
}

async function acceptInvitation(body: { token: string; userId: string }) {
  const { token, userId } = body;
  
  if (!token || !userId) {
    return NextResponse.json({ error: 'token and userId are required' }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }
  
  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation already processed' }, { status: 400 });
  }
  
  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Add user to company
    const existing = await tx.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId: invitation.companyId } }
    });

    if (!existing) {
      await tx.userCompany.create({
        data: {
          userId,
          companyId: invitation.companyId,
          role: invitation.role as any,
          status: 'active',
          joinedAt: new Date()
        }
      });
    }

    // Add user to project if applicable
    if (invitation.projectId) {
      const existingProject = await tx.userProject.findUnique({
        where: { userId_projectId: { userId, projectId: invitation.projectId } }
      });

      if (!existingProject) {
        await tx.userProject.create({
          data: {
            userId,
            projectId: invitation.projectId,
            role: invitation.role as any,
            status: 'active'
          }
        });
      }
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' }
    });
  });
  
  return NextResponse.json({ success: true });
}

async function declineInvitation(body: { token: string }) {
  const { token } = body;
  
  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  await prisma.invitation.update({
    where: { token },
    data: { status: 'declined' }
  });
  
  return NextResponse.json({ success: true });
}

async function getPendingInvitations(body: { email: string }) {
  const { email } = body;
  
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { 
      email,
      status: 'pending',
      expiresAt: { gt: new Date() }
    },
    include: {
      company: { select: { id: true, name: true, logo: true } }
    }
  });
  
  return NextResponse.json({ success: true, invitations });
}

// =============================================================================
// AUDIT LOG HANDLERS
// =============================================================================

async function getAuditLogs(body: { companyId: string; userId?: string; action?: string; resource?: string; limit?: number; offset?: number }) {
  const { companyId, userId, action, resource, limit, offset } = body;
  
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const where: any = { companyId };
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit || 50,
    skip: offset || 0
  });
  
  return NextResponse.json({ success: true, logs });
}
