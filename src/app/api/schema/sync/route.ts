// =============================================================================
// Schema Sync API Route
// Handles loading persisted schema data from database
// 
// Uses:
// - Principle 2: `satisfies Prisma.*Include` for type safety
// - Principle 3: Centralized error handling
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { Prisma } from '@prisma/client';

// =============================================================================
// TYPE-SAFE INCLUDE DEFINITIONS
// =============================================================================

const projectWithCounts = {
  _count: {
    select: {
      ToolkitTable: true,
      ToolkitProcedure: true,
      ToolkitFile: true,
    },
  },
} satisfies Prisma.ToolkitProjectInclude

const projectWithRelations = {
  ToolkitTable: true,
  ToolkitProcedure: true,
  ToolkitFile: true,
} satisfies Prisma.ToolkitProjectInclude

// ═══════════════════════════════════════════════════════════════════════════
// GET - Load persisted schema data
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const projectId = searchParams.get('projectId');

    switch (action) {
      case 'load-project':
        return await loadProjectData(projectId);
      
      case 'list-projects':
        return await listProjects();
      
      case 'get-active-project':
        return await getActiveProject();
      
      default:
        return await getFullSchemaSync();
    }
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Save/Update schema data
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create-project':
        return await createProject(body);
      
      case 'update-project':
        return await updateProject(body);
      
      case 'set-active-project':
        return await setActiveProject(body);
      
      case 'save-tables':
        return await saveTables(body);
      
      case 'save-procedures':
        return await saveProcedures(body);
      
      case 'clear-all':
        return await clearAllData(body);
      
      default:
        throw ApiError.badRequest('Unknown action');
    }
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function getFullSchemaSync() {
  // Get all projects with type-safe includes
  const projects = await db.toolkitProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: projectWithCounts
  });

  // Get the most recent project as active
  const activeProject = projects[0] || null;

  // Get tables from active project
  let tables: any[] = [];
  let procedures: any[] = [];
  
  if (activeProject) {
    tables = await db.toolkitTable.findMany({
      where: { projectId: activeProject.id },
      orderBy: { tableName: 'asc' }
    });

    procedures = await db.toolkitProcedure.findMany({
      where: { projectId: activeProject.id },
      orderBy: { procedureName: 'asc' }
    });
  }

  // Get all cached tables (fallback if no project)
  if (tables.length === 0) {
    tables = await db.toolkitTable.findMany({
      orderBy: { tableName: 'asc' }
    });
  }

  // Calculate stats
  const totalTables = tables.length;
  const totalColumns = tables.reduce((sum, t) => {
    try {
      const cols = JSON.parse(t.columns || '[]');
      return sum + cols.length;
    } catch {
      return sum;
    }
  }, 0);
  
  const totalFKs = tables.reduce((sum, t) => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      return sum + fks.length;
    } catch {
      return sum;
    }
  }, 0);

  // Calculate FK resolution
  const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));
  let resolvedFKs = 0;
  
  tables.forEach(t => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      fks.forEach((fk: any) => {
        if (tableNames.has(fk.referencesTable?.toLowerCase())) {
          resolvedFKs++;
        }
      });
    } catch {}
  });

  const fkResolvedPercent = totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0;

  return NextResponse.json({
    success: true,
    activeProject: activeProject ? {
      id: activeProject.id,
      name: activeProject.name,
      description: activeProject.description,
      softwareType: activeProject.softwareType,
      color: activeProject.color,
      icon: activeProject.icon,
      status: activeProject.status,
      fileCount: activeProject._count?.ToolkitFile || 0,
      tableCount: activeProject._count?.ToolkitTable || 0,
      procedureCount: activeProject._count?.ToolkitProcedure || 0,
    } : null,
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      softwareType: p.softwareType,
      color: p.color,
      icon: p.icon,
      status: p.status,
      tableCount: p._count?.ToolkitTable || 0,
    })),
    tables: tables.map(t => ({
      id: t.id,
      schemaName: t.schemaName,
      tableName: t.tableName,
      columns: JSON.parse(t.columns || '[]'),
      foreignKeys: JSON.parse(t.foreignKeys || '[]'),
      indexes: JSON.parse(t.indexes || '[]'),
      constraints: JSON.parse(t.constraints || '[]'),
      sourceDDL: t.sourceDDL,
      status: t.status,
      linkedModule: t.linkedModule,
    })),
    procedures: procedures.map(p => ({
      id: p.id,
      schemaName: p.schemaName,
      procedureName: p.procedureName,
      parameters: JSON.parse(p.parameters || '[]'),
      returnType: p.returnType,
      body: p.body,
      operations: JSON.parse(p.operations || '[]'),
      tablesAccessed: JSON.parse(p.tablesAccessed || '[]'),
      tablesModified: JSON.parse(p.tablesModified || '[]'),
      complexity: p.complexity,
    })),
    stats: {
      totalTables,
      totalColumns,
      totalForeignKeys: totalFKs,
      totalStoredProcedures: procedures.length,
      fkResolved: resolvedFKs,
      fkResolvedPercent,
    }
  });
}

async function loadProjectData(projectId: string | null) {
  if (!projectId) {
    throw ApiError.badRequest('projectId is required');
  }

  const project = await db.toolkitProject.findUnique({
    where: { id: projectId },
    include: projectWithRelations
  });

  if (!project) {
    throw ApiError.notFound('Project not found');
  }

  // Calculate stats
  const tables = project.ToolkitTable;
  const totalTables = tables.length;
  const totalColumns = tables.reduce((sum, t) => {
    try {
      const cols = JSON.parse(t.columns || '[]');
      return sum + cols.length;
    } catch {
      return sum;
    }
  }, 0);
  
  const totalFKs = tables.reduce((sum, t) => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      return sum + fks.length;
    } catch {
      return sum;
    }
  }, 0);

  // Calculate FK resolution
  const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));
  let resolvedFKs = 0;
  
  tables.forEach(t => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      fks.forEach((fk: any) => {
        if (tableNames.has(fk.referencesTable?.toLowerCase())) {
          resolvedFKs++;
        }
      });
    } catch {}
  });

  const fkResolvedPercent = totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0;

  return NextResponse.json({
    success: true,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      softwareType: project.softwareType,
      color: project.color,
      icon: project.icon,
      status: project.status,
    },
    tables: tables.map(t => ({
      id: t.id,
      schemaName: t.schemaName,
      tableName: t.tableName,
      columns: JSON.parse(t.columns || '[]'),
      foreignKeys: JSON.parse(t.foreignKeys || '[]'),
      indexes: JSON.parse(t.indexes || '[]'),
      constraints: JSON.parse(t.constraints || '[]'),
      sourceDDL: t.sourceDDL,
      status: t.status,
      linkedModule: t.linkedModule,
    })),
    procedures: project.ToolkitProcedure.map(p => ({
      id: p.id,
      schemaName: p.schemaName,
      procedureName: p.procedureName,
      parameters: JSON.parse(p.parameters || '[]'),
      returnType: p.returnType,
      body: p.body,
      operations: JSON.parse(p.operations || '[]'),
      tablesAccessed: JSON.parse(p.tablesAccessed || '[]'),
      tablesModified: JSON.parse(p.tablesModified || '[]'),
      complexity: p.complexity,
    })),
    files: project.ToolkitFile.map(f => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      lineCount: f.lineCount,
      parseStatus: f.parseStatus,
      tablesFound: f.tablesFound,
      proceduresFound: f.proceduresFound,
    })),
    stats: {
      totalTables,
      totalColumns,
      totalForeignKeys: totalFKs,
      totalStoredProcedures: project.ToolkitProcedure.length,
      fkResolved: resolvedFKs,
      fkResolvedPercent,
    }
  });
}

async function listProjects() {
  const projects = await db.toolkitProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: projectWithCounts
  });

  return NextResponse.json({
    success: true,
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      softwareType: p.softwareType,
      color: p.color,
      icon: p.icon,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tableCount: p._count?.ToolkitTable || 0,
      procedureCount: p._count?.ToolkitProcedure || 0,
      fileCount: p._count?.ToolkitFile || 0,
    }))
  });
}

async function getActiveProject() {
  // Get the most recently updated project as active
  const project = await db.toolkitProject.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: projectWithCounts
  });

  if (!project) {
    return NextResponse.json({
      success: true,
      activeProject: null,
    });
  }

  return NextResponse.json({
    success: true,
    activeProject: {
      id: project.id,
      name: project.name,
      description: project.description,
      softwareType: project.softwareType,
      color: project.color,
      icon: project.icon,
      status: project.status,
      tableCount: project._count?.ToolkitTable || 0,
      procedureCount: project._count?.ToolkitProcedure || 0,
      fileCount: project._count?.ToolkitFile || 0,
    }
  });
}

async function createProject(body: {
  name: string;
  description?: string;
  softwareType?: string;
  color?: string;
  icon?: string;
}) {
  const { name, description, softwareType = 'Custom', color = '#3b82f6', icon = 'Database' } = body;

  if (!name?.trim()) {
    throw ApiError.badRequest('Project name is required');
  }

  const project = await db.toolkitProject.create({
    data: {
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      softwareType,
      color,
      icon,
      status: 'active',
    }
  });

  return NextResponse.json({
    success: true,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      softwareType: project.softwareType,
      color: project.color,
      icon: project.icon,
      status: project.status,
    }
  });
}

async function updateProject(body: {
  projectId: string;
  name?: string;
  description?: string;
  softwareType?: string;
  color?: string;
  icon?: string;
  status?: string;
}) {
  const { projectId, ...updates } = body;

  const project = await db.toolkitProject.update({
    where: { id: projectId },
    data: updates
  });

  return NextResponse.json({
    success: true,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      softwareType: project.softwareType,
      color: project.color,
      icon: project.icon,
      status: project.status,
    }
  });
}

async function setActiveProject(body: { projectId: string }) {
  const { projectId } = body;

  // Just return the project data - the concept of "active" is handled by the client
  const project = await db.toolkitProject.findUnique({
    where: { id: projectId },
    include: projectWithRelations
  });

  if (!project) {
    throw ApiError.notFound('Project not found');
  }

  // Calculate stats
  const tables = project.ToolkitTable;
  const totalTables = tables.length;
  const totalColumns = tables.reduce((sum, t) => {
    try {
      const cols = JSON.parse(t.columns || '[]');
      return sum + cols.length;
    } catch {
      return sum;
    }
  }, 0);
  
  const totalFKs = tables.reduce((sum, t) => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      return sum + fks.length;
    } catch {
      return sum;
    }
  }, 0);

  // Calculate FK resolution
  const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));
  let resolvedFKs = 0;
  
  tables.forEach(t => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      fks.forEach((fk: any) => {
        if (tableNames.has(fk.referencesTable?.toLowerCase())) {
          resolvedFKs++;
        }
      });
    } catch {}
  });

  const fkResolvedPercent = totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0;

  return NextResponse.json({
    success: true,
    activeProject: {
      id: project.id,
      name: project.name,
      description: project.description,
      softwareType: project.softwareType,
      color: project.color,
      icon: project.icon,
      status: project.status,
    },
    tables: tables.map(t => ({
      id: t.id,
      schemaName: t.schemaName,
      tableName: t.tableName,
      columns: JSON.parse(t.columns || '[]'),
      foreignKeys: JSON.parse(t.foreignKeys || '[]'),
      indexes: JSON.parse(t.indexes || '[]'),
      constraints: JSON.parse(t.constraints || '[]'),
      sourceDDL: t.sourceDDL,
      status: t.status,
      linkedModule: t.linkedModule,
    })),
    procedures: project.ToolkitProcedure.map(p => ({
      id: p.id,
      schemaName: p.schemaName,
      procedureName: p.procedureName,
      parameters: JSON.parse(p.parameters || '[]'),
      returnType: p.returnType,
      body: p.body,
      operations: JSON.parse(p.operations || '[]'),
      tablesAccessed: JSON.parse(p.tablesAccessed || '[]'),
      tablesModified: JSON.parse(p.tablesModified || '[]'),
      complexity: p.complexity,
    })),
    stats: {
      totalTables,
      totalColumns,
      totalForeignKeys: totalFKs,
      totalStoredProcedures: project.ToolkitProcedure.length,
      fkResolved: resolvedFKs,
      fkResolvedPercent,
    }
  });
}

async function saveTables(body: {
  projectId?: string;
  tables: any[];
  createProjectIfNotExists?: boolean;
  projectName?: string;
}) {
  let { projectId, tables, createProjectIfNotExists = true, projectName } = body;

  // Create project if not exists
  if (!projectId && createProjectIfNotExists) {
    const project = await db.toolkitProject.create({
      data: {
        id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: projectName || `Project ${new Date().toISOString().slice(0, 10)}`,
        softwareType: 'Custom',
        status: 'active',
      }
    });
    projectId = project.id;
  }

  if (!projectId) {
    throw ApiError.badRequest('projectId is required');
  }

  let created = 0;
  let updated = 0;

  for (const table of tables) {
    try {
      const existing = await db.toolkitTable.findUnique({
        where: {
          projectId_schemaName_tableName: {
            projectId,
            schemaName: table.schemaName || 'dbo',
            tableName: table.tableName
          }
        }
      });

      if (existing) {
        await db.toolkitTable.update({
          where: { id: existing.id },
          data: {
            schemaName: table.schemaName || 'dbo',
            columns: JSON.stringify(table.columns || []),
            foreignKeys: JSON.stringify(table.foreignKeys || []),
            indexes: JSON.stringify(table.indexes || []),
            constraints: JSON.stringify(table.constraints || []),
            sourceDDL: table.sourceDDL,
            status: table.status || 'standalone',
            linkedModule: table.linkedModule,
          }
        });
        updated++;
      } else {
        await db.toolkitTable.create({
          data: {
            projectId,
            tableName: table.tableName,
            schemaName: table.schemaName || 'dbo',
            columns: JSON.stringify(table.columns || []),
            foreignKeys: JSON.stringify(table.foreignKeys || []),
            indexes: JSON.stringify(table.indexes || []),
            constraints: JSON.stringify(table.constraints || []),
            sourceDDL: table.sourceDDL,
            status: table.status || 'standalone',
            linkedModule: table.linkedModule,
          }
        });
        created++;
      }
    } catch (error) {
      console.error(`Failed to save table ${table.tableName}:`, error);
    }
  }

  return NextResponse.json({
    success: true,
    projectId,
    created,
    updated,
    total: tables.length
  });
}

async function saveProcedures(body: {
  projectId?: string;
  procedures: any[];
}) {
  let { projectId, procedures } = body;

  if (!projectId) {
    // Get or create default project
    let project = await db.toolkitProject.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!project) {
      project = await db.toolkitProject.create({
        data: {
          name: `Project ${new Date().toISOString().slice(0, 10)}`,
          softwareType: 'Custom',
          status: 'active',
        }
      });
    }
    projectId = project.id;
  }

  let created = 0;
  let updated = 0;

  for (const proc of procedures) {
    try {
      const existing = await db.toolkitProcedure.findUnique({
        where: {
          projectId_schemaName_procedureName: {
            projectId,
            schemaName: proc.schemaName || 'dbo',
            procedureName: proc.procedureName
          }
        }
      });

      if (existing) {
        await db.toolkitProcedure.update({
          where: { id: existing.id },
          data: {
            schemaName: proc.schemaName || 'dbo',
            parameters: JSON.stringify(proc.parameters || []),
            returnType: proc.returnType,
            body: proc.body,
            operations: JSON.stringify(proc.operations || []),
            tablesAccessed: JSON.stringify(proc.tablesAccessed || []),
            tablesModified: JSON.stringify(proc.tablesModified || []),
            complexity: proc.complexity || 0,
          }
        });
        updated++;
      } else {
        await db.toolkitProcedure.create({
          data: {
            projectId,
            procedureName: proc.procedureName,
            schemaName: proc.schemaName || 'dbo',
            parameters: JSON.stringify(proc.parameters || []),
            returnType: proc.returnType,
            body: proc.body,
            operations: JSON.stringify(proc.operations || []),
            tablesAccessed: JSON.stringify(proc.tablesAccessed || []),
            tablesModified: JSON.stringify(proc.tablesModified || []),
            complexity: proc.complexity || 0,
          }
        });
        created++;
      }
    } catch (error) {
      console.error(`Failed to save procedure ${proc.procedureName}:`, error);
    }
  }

  return NextResponse.json({
    success: true,
    projectId,
    created,
    updated,
    total: procedures.length
  });
}

async function clearAllData(body: { projectId?: string }) {
  const { projectId } = body;

  if (projectId) {
    // Delete specific project and all its data
    await db.toolkitProject.delete({
      where: { id: projectId }
    });
  } else {
    // Delete all data
    await db.toolkitTable.deleteMany({});
    await db.toolkitProcedure.deleteMany({});
    await db.toolkitFile.deleteMany({});
    await db.toolkitProject.deleteMany({});
  }

  return NextResponse.json({
    success: true,
    message: projectId ? 'Project deleted' : 'All data cleared'
  });
}
