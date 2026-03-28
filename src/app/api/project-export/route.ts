/**
 * PROJECT EXPORT API
 * ==================
 * Complete end-to-end project export endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { templateManager } from '@/lib/project-generator/template-manager';
import { projectAssembler, GeneratedContent } from '@/lib/project-generator/project-assembler';
import { zipBuilder } from '@/lib/project-generator/zip-builder';
import { validationChecker } from '@/lib/project-generator/validation-checker';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// GET /api/project-export
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'templates':
      const templates = await templateManager.listTemplates();
      return NextResponse.json({ templates });

    case 'template-info':
      const templateId = searchParams.get('templateId') as any;
      if (!templateId) {
        return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      }
      const info = await templateManager.getTemplateInfo(templateId);
      return NextResponse.json({ info });

    case 'status':
      const projectId = searchParams.get('projectId');
      if (!projectId) {
        return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
      }
      const project = await prisma.toolkitProject.findUnique({
        where: { id: projectId },
        include: { files: true, tables: true }
      });
      return NextResponse.json({ project });

    default:
      return NextResponse.json({
        message: 'Project Export API',
        endpoints: {
          'GET ?action=templates': 'List available templates',
          'GET ?action=template-info&templateId={id}': 'Get template details',
          'GET ?action=status&projectId={id}': 'Get project status',
          'POST ?action=validate': 'Validate project before export',
          'POST': 'Export project as ZIP',
        }
      });
  }
}

// POST /api/project-export
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'validate':
        return await handleValidate(body);
      default:
        return await handleExport(body);
    }
  } catch (error: any) {
    console.error('Project Export Error:', error);
    return NextResponse.json(
      { error: 'Export failed', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle validation
 */
async function handleValidate(body: any) {
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const project = await prisma.toolkitProject.findUnique({
    where: { id: projectId },
    include: { tables: true, procedures: true }
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const generatedContent = await buildGeneratedContent(project);
  const validation = await validationChecker.validate(generatedContent);

  return NextResponse.json({
    success: true,
    validation: {
      isValid: validation.isValid,
      errors: Object.values(validation.conditions)
        .flatMap(c => c.checks)
        .filter(c => c.status === 'failed')
        .map(c => c.message),
      warnings: Object.values(validation.conditions)
        .flatMap(c => c.checks)
        .filter(c => c.status === 'warning')
        .map(c => c.message)
    }
  });
}

/**
 * Handle project export
 */
async function handleExport(body: any) {
  const {
    projectId,
    projectName = 'my-project',
    template = 'nextjs-react',
    includeNodeModules = false,
    includeEnvExample = true,
    includeReadme = true,
    database = 'sqlite'
  } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const project = await prisma.toolkitProject.findUnique({
    where: { id: projectId },
    include: { tables: true, procedures: true, files: true }
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Build generated content
  const generatedContent = await buildGeneratedContent(project);

  // Assemble project
  const outputPath = path.join(process.cwd(), 'storage', 'assembled', projectName, Date.now().toString());
  const assemblyResult = await projectAssembler.assemble(generatedContent, {
    template,
    outputPath
  });

  if (!assemblyResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Assembly failed',
      errors: assemblyResult.errors
    }, { status: 500 });
  }

  // Create ZIP
  const zipResult = await zipBuilder.createFromDirectory(assemblyResult.outputPath, {
    projectName,
    includeNodeModules,
    includeEnvExample,
    includeReadme,
    database
  });

  if (!zipResult.success) {
    return NextResponse.json({
      success: false,
      error: 'ZIP creation failed',
      errors: zipResult.errors
    }, { status: 500 });
  }

  // Save ZIP to downloads
  const zipFileName = `${projectName}-${Date.now()}.zip`;
  const zipPath = path.join(process.cwd(), 'download', zipFileName);
  await fs.mkdir(path.dirname(zipPath), { recursive: true });
  await fs.writeFile(zipPath, zipResult.buffer!);

  return NextResponse.json({
    success: true,
    downloadUrl: `/api/file-system/download?file=${zipFileName}`,
    manifest: zipResult.manifest
  });
}

/**
 * Build generated content from project data
 */
async function buildGeneratedContent(project: any): Promise<GeneratedContent> {
  const tables = project.tables || [];
  const projectName = project.name;

  // Generate Prisma models
  let prismaModels = '';
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    prismaModels += `\nmodel ${toPascalCase(table.tableName)} {\n`;
    prismaModels += `  id        String   @id @default(cuid())\n`;
    for (const col of columns) {
      prismaModels += `  ${col.name}        ${mapToPrismaType(col.type, col.name)}${col.nullable ? '?' : ''}\n`;
    }
    prismaModels += `  createdAt DateTime @default(now())\n`;
    prismaModels += `  updatedAt DateTime @updatedAt\n`;
    prismaModels += `}\n`;
  }

  // Generate types
  const types: GeneratedContent['types'] = tables.map((table: any) => ({
    fileName: `${toKebabCase(table.tableName)}.ts`,
    content: generateTypeFile(table.tableName, JSON.parse(table.columns || '[]')),
    moduleName: toPascalCase(table.tableName)
  }));

  // Generate validations
  const validations: GeneratedContent['validations'] = tables.map((table: any) => ({
    fileName: `${toKebabCase(table.tableName)}.ts`,
    content: generateValidationFile(table.tableName, JSON.parse(table.columns || '[]')),
    moduleName: toPascalCase(table.tableName)
  }));

  // Generate components
  const components: GeneratedContent['components'] = [];
  for (const table of tables) {
    const moduleName = toPascalCase(table.tableName);
    const columns = JSON.parse(table.columns || '[]');
    components.push({
      fileName: `${moduleName}Form.tsx`,
      content: generateFormComponent(moduleName, columns),
      moduleName,
      type: 'form'
    });
    components.push({
      fileName: `${moduleName}Table.tsx`,
      content: generateTableComponent(moduleName, columns),
      moduleName,
      type: 'table'
    });
  }

  // Generate API routes
  const apiRoutes: GeneratedContent['apiRoutes'] = tables.map((table: any) => ({
    path: toKebabCase(table.tableName),
    content: generateApiRoute(table.tableName, JSON.parse(table.columns || '[]')),
    moduleName: toPascalCase(table.tableName),
    methods: ['GET', 'POST', 'PUT', 'DELETE'] as const
  }));

  // Generate pages
  const pages: GeneratedContent['pages'] = [];
  for (const table of tables) {
    const moduleName = toPascalCase(table.tableName);
    const routePath = toKebabCase(table.tableName);
    const columns = JSON.parse(table.columns || '[]');
    
    pages.push({
      path: `${routePath}/page.tsx`,
      content: generateListPage(moduleName, routePath, columns),
      moduleName,
      type: 'list'
    });
    pages.push({
      path: `${routePath}/new/page.tsx`,
      content: generateFormPage(moduleName, routePath, 'create'),
      moduleName,
      type: 'form'
    });
  }

  // Generate hooks
  const hooks: GeneratedContent['hooks'] = tables.map((table: any) => ({
    fileName: `use${toPascalCase(table.tableName)}.ts`,
    content: generateHook(toPascalCase(table.tableName), toKebabCase(table.tableName)),
    moduleName: toPascalCase(table.tableName)
  }));

  // Generate navigation
  const navigation: GeneratedContent['navigation'] = tables.map((table: any) => ({
    name: toPascalCase(table.tableName),
    href: `/${toKebabCase(table.tableName)}`,
    icon: 'Database',
    moduleName: toPascalCase(table.tableName)
  }));

  return {
    projectName,
    prismaModels,
    types,
    validations,
    components,
    apiRoutes,
    pages,
    hooks,
    navigation
  };
}

// Helper generators
function generateTypeFile(tableName: string, columns: any[]): string {
  const name = toPascalCase(tableName);
  return `export interface ${name} {
  id: string;
${columns.map(c => `  ${c.name}: ${mapToTypeScript(c.type)};`).join('\n')}
  createdAt: Date;
  updatedAt: Date;
}

export interface Create${name}Input {
${columns.map(c => `  ${c.name}${c.nullable ? '?' : ''}: ${mapToTypeScript(c.type)};`).join('\n')}
}

export interface Update${name}Input {
  id: string;
${columns.map(c => `  ${c.name}?: ${mapToTypeScript(c.type)};`).join('\n')}
}`;
}

function generateValidationFile(tableName: string, columns: any[]): string {
  const name = toPascalCase(tableName);
  return `import { z } from 'zod';

export const ${name}Schema = z.object({
${columns.map(c => `  ${c.name}: ${mapToZod(c.type, c.nullable)},`).join('\n')}
});

export const create${name}Schema = ${name}Schema;
export const update${name}Schema = ${name}Schema.partial();`;
}

function generateFormComponent(moduleName: string, columns: any[]): string {
  return `'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ${moduleName}FormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isEditing?: boolean;
}

export function ${moduleName}Form({ initialData, onSubmit, isEditing }: ${moduleName}FormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initialData || {}
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
${columns.slice(0, 5).map(c => `      <div>
        <Label htmlFor="${c.name}">${toLabel(c.name)}</Label>
        <Input id="${c.name}" {...register('${c.name}')} />
      </div>`).join('\n')}
      <Button type="submit" disabled={isSubmitting}>
        {isEditing ? 'Update' : 'Create'} ${moduleName}
      </Button>
    </form>
  );
}`;
}

function generateTableComponent(moduleName: string, columns: any[]): string {
  return `'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface ${moduleName}TableProps {
  data: any[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ${moduleName}Table({ data, onEdit, onDelete }: ${moduleName}TableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
${columns.slice(0, 5).map(c => `          <TableHead>${toLabel(c.name)}</TableHead>`).join('\n')}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
${columns.slice(0, 5).map(c => `            <TableCell>{item.${c.name}}</TableCell>`).join('\n')}
            <TableCell>
              {onEdit && <Button variant="outline" size="sm" onClick={() => onEdit(item.id)}>Edit</Button>}
              {onDelete && <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>Delete</Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}`;
}

function generateApiRoute(tableName: string, columns: any[]): string {
  const name = toPascalCase(tableName);
  const route = toKebabCase(tableName);
  return `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const ${route} = await prisma.${route}.findMany();
  return NextResponse.json({ ${route} });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ${route} = await prisma.${route}.create({ data: body });
  return NextResponse.json(${route});
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const ${route} = await prisma.${route}.update({ where: { id: body.id }, data: body });
  return NextResponse.json(${route});
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  await prisma.${route}.delete({ where: { id } });
  return NextResponse.json({ success: true });
}`;
}

function generateListPage(moduleName: string, routePath: string, columns: any[]): string {
  return `'use client';

import { use${moduleName}List } from '@/hooks/use${moduleName}';
import { ${moduleName}Table } from '@/components/${moduleName}/${moduleName}Table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ${moduleName}ListPage() {
  const { ${routePath}, isLoading } = use${moduleName}List();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">${moduleName}</h1>
        <Link href="/${routePath}/new">
          <Button>Create ${moduleName}</Button>
        </Link>
      </div>
      {isLoading ? <p>Loading...</p> : <${moduleName}Table data={${routePath}} />}
    </div>
  );
}`;
}

function generateFormPage(moduleName: string, routePath: string, mode: 'create' | 'edit'): string {
  return `'use client';

import { ${moduleName}Form } from '@/components/${moduleName}/${moduleName}Form';
import { use${moduleName}Mutations } from '@/hooks/use${moduleName}';
import { useRouter } from 'next/navigation';

export default function ${moduleName}FormPage() {
  const router = useRouter();
  const { createItem } = use${moduleName}Mutations();

  const handleSubmit = async (data: any) => {
    await createItem(data);
    router.push('/${routePath}');
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Create ${moduleName}</h1>
      <${moduleName}Form onSubmit={handleSubmit} />
    </div>
  );
}`;
}

function generateHook(moduleName: string, routePath: string): string {
  return `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function use${moduleName}List() {
  return useQuery({
    queryKey: ['${routePath}', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/${routePath}');
      return res.json();
    }
  });
}

export function use${moduleName}Mutations() {
  const queryClient = useQueryClient();
  
  const createItem = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/${routePath}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${routePath}'] })
  });

  return { createItem: createItem.mutateAsync };
}`;
}

// Type mapping helpers
function mapToPrismaType(sqlType: string, colName: string): string {
  const type = sqlType?.toLowerCase() || 'string';
  if (type.includes('int') || type.includes('decimal')) return 'Int';
  if (type.includes('date') || type.includes('time')) return 'DateTime';
  if (type.includes('bool')) return 'Boolean';
  return 'String';
}

function mapToTypeScript(sqlType: string): string {
  const type = sqlType?.toLowerCase() || 'string';
  if (type.includes('int') || type.includes('decimal')) return 'number';
  if (type.includes('date') || type.includes('time')) return 'Date';
  if (type.includes('bool')) return 'boolean';
  return 'string';
}

function mapToZod(sqlType: string, nullable: boolean): string {
  const type = sqlType?.toLowerCase() || 'string';
  let zodType = 'z.string()';
  if (type.includes('int') || type.includes('decimal')) zodType = 'z.number()';
  if (type.includes('date') || type.includes('time')) zodType = 'z.date()';
  if (type.includes('bool')) zodType = 'z.boolean()';
  return nullable ? `${zodType}.optional()` : zodType;
}

function toPascalCase(name: string): string {
  return name.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
}

function toKebabCase(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function toLabel(name: string): string {
  return name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}
