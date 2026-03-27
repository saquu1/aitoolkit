import { NextRequest, NextResponse } from 'next/server';
import { parseMySQL } from '@/lib/parsers/mysql-parser';
import { parseSqlServer } from '@/lib/sql-parser';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Get project
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId },
      include: {
        ToolkitTable: true,
      },
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Build tables list from stored data
    const tables = project.ToolkitTable.map(t => ({
      tableName: t.tableName,
      schemaName: t.schemaName || 'dbo',
      columnCount: t.columns ? JSON.parse(t.columns as string).length : 0,
      hasFK: t.foreignKeys ? JSON.parse(t.foreignKeys as string).length > 0 : false,
    }));
    
    // Sort by table name
    tables.sort((a, b) => a.tableName.localeCompare(b.tableName));
    
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
