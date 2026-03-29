/**
 * Page Generation API Route
 * 
 * POST /api/generate/page
 * Generates complete CRUD pages for a table
 * 
 * Body:
 * - projectId: string (required)
 * - tableName: string (required)
 * - options: object (optional)
 *   - pageType: 'list' | 'create' | 'edit' | 'detail' | 'full-crud'
 *   - includeBreadcrumbs: boolean
 *   - includePageHeader: boolean
 *   - useModalForms: boolean
 *   - layoutStyle: 'sidebar' | 'topnav' | 'standalone'
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePages, generateFullCRUD, type PageGeneratorConfig } from '@/lib/generators/react-page-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, tableName, options = {} } = body;

    if (!projectId || !tableName) {
      return NextResponse.json(
        { error: 'projectId and tableName are required' },
        { status: 400 }
      );
    }

    const config: PageGeneratorConfig = {
      projectId,
      tableName,
      pageType: options.pageType || 'full-crud',
      includeBreadcrumbs: options.includeBreadcrumbs !== false,
      includePageHeader: options.includePageHeader !== false,
      includeActions: options.includeActions !== false,
      useModalForms: options.useModalForms || false,
      layoutStyle: options.layoutStyle || 'sidebar',
    };

    const result = await generatePages(config);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: 'Generation failed', details: result.errors },
        { status: 400 }
      );
    }

    // Build artifacts from generated pages
    const artifacts = result.pages.map(page => ({
      type: page.type,
      name: page.path.split('/').pop() || 'page.tsx',
      path: page.path,
      content: page.content,
      language: 'typescript',
    }));

    return NextResponse.json({
      success: true,
      artifacts,
      warnings: result.warnings,
      generatedAt: new Date().toISOString(),
      summary: {
        tableName,
        pageType: config.pageType,
        pagesGenerated: artifacts.length,
        pages: result.pages.map(p => ({
          type: p.type,
          path: p.path,
        })),
      },
    });

  } catch (error: any) {
    console.error('Page generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/generate/page',
    description: 'Generate complete CRUD pages for a table',
    requiredParams: ['projectId', 'tableName'],
    options: {
      pageType: {
        type: 'string',
        enum: ['list', 'create', 'edit', 'detail', 'full-crud'],
        default: 'full-crud',
        description: 'Type of page(s) to generate',
      },
      includeBreadcrumbs: {
        type: 'boolean',
        default: true,
        description: 'Include breadcrumb navigation',
      },
      includePageHeader: {
        type: 'boolean',
        default: true,
        description: 'Include page header with title and description',
      },
      useModalForms: {
        type: 'boolean',
        default: false,
        description: 'Use modal dialogs for create/edit forms instead of separate pages',
      },
      layoutStyle: {
        type: 'string',
        enum: ['sidebar', 'topnav', 'standalone'],
        default: 'sidebar',
        description: 'Layout style for generated pages',
      },
    },
    pageTypes: {
      list: {
        description: 'List page with data table',
        generates: ['list page', 'API route'],
      },
      create: {
        description: 'Create page with form',
        generates: ['create page', 'form component'],
      },
      edit: {
        description: 'Edit page with form',
        generates: ['edit page', 'form component'],
      },
      detail: {
        description: 'Detail/View page',
        generates: ['detail page'],
      },
      'full-crud': {
        description: 'Complete CRUD (list, create, edit, detail)',
        generates: ['list page', 'create page', 'edit page', 'detail page', 'API route', 'form component', 'table component'],
      },
    },
    features: [
      'List page with TanStack Table',
      'Create page with React Hook Form',
      'Edit page with data loading',
      'Detail page with read-only view',
      'API route with CRUD operations',
      'Breadcrumb navigation',
      'Responsive layout',
      'Loading states',
      'Error handling',
    ],
    exampleRequest: {
      projectId: 'proj_abc123',
      tableName: 'Organization',
      options: {
        pageType: 'full-crud',
        includeBreadcrumbs: true,
        useModalForms: false,
      },
    },
  });
}
