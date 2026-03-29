/**
 * Form Generation API Route
 * 
 * POST /api/generate/form
 * Generates React form components with React Hook Form integration
 * 
 * Body:
 * - projectId: string (required)
 * - tableName: string (required)
 * - options: object (optional)
 *   - formType: 'create' | 'edit' | 'both'
 *   - useModal: boolean
 *   - responsiveLayout: boolean
 *   - columns: 1 | 2 | 3
 *   - includeCancelButton: boolean
 *   - includeResetButton: boolean
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateReactForm, type ReactFormGeneratorConfig } from '@/lib/generators/react-form-generator';

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

    const config: ReactFormGeneratorConfig = {
      projectId,
      tableName,
      formType: options.formType || 'both',
      includeRelations: options.includeRelations !== false,
      includeValidation: options.includeValidation !== false,
      includePIIMasking: options.includePIIMasking !== false,
      useModal: options.useModal || false,
      responsiveLayout: options.responsiveLayout !== false,
      columns: options.columns || 2,
      includeCancelButton: options.includeCancelButton !== false,
      includeResetButton: options.includeResetButton || false,
      submitLabel: options.submitLabel || 'Save',
    };

    const result = await generateReactForm(config);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: 'Generation failed', details: result.errors },
        { status: 400 }
      );
    }

    // Build artifacts
    const artifacts = [
      {
        type: 'component',
        name: `${toPascalCase(tableName)}Form.tsx`,
        path: `components/forms/${kebabCase(tableName)}-form.tsx`,
        content: result.formComponent,
        language: 'typescript',
        imports: result.imports,
      },
    ];

    if (result.types) {
      artifacts.push({
        type: 'types',
        name: `${toPascalCase(tableName)}FormTypes.ts`,
        path: `types/forms/${kebabCase(tableName)}-form.ts`,
        content: result.types,
        language: 'typescript',
      });
    }

    return NextResponse.json({
      success: true,
      artifacts,
      fields: result.fields,
      warnings: result.warnings,
      generatedAt: new Date().toISOString(),
      summary: {
        tableName,
        fieldCount: result.fields.length,
        hasCascade: result.fields.some(f => f.cascadeConfig),
        hasFKFields: result.fields.some(f => f.fkConfig),
        hasPIIFields: result.fields.some(f => f.piiConfig?.isPII),
      },
    });

  } catch (error: any) {
    console.error('Form generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/generate/form',
    description: 'Generate React form components with React Hook Form integration',
    requiredParams: ['projectId', 'tableName'],
    options: {
      formType: {
        type: 'string',
        enum: ['create', 'edit', 'both'],
        default: 'both',
        description: 'Type of form to generate',
      },
      useModal: {
        type: 'boolean',
        default: false,
        description: 'Generate as modal dialog',
      },
      responsiveLayout: {
        type: 'boolean',
        default: true,
        description: 'Use responsive grid layout',
      },
      columns: {
        type: 'number',
        enum: [1, 2, 3],
        default: 2,
        description: 'Number of columns in form grid',
      },
      includeCancelButton: {
        type: 'boolean',
        default: true,
        description: 'Include cancel button',
      },
      includePIIMasking: {
        type: 'boolean',
        default: true,
        description: 'Include PII masking for sensitive fields',
      },
    },
    features: [
      'React Hook Form integration',
      'Zod validation resolver',
      'Semantic type to component mapping',
      'FK dropdown support',
      'Cascade dropdown logic',
      'PII/PHI masking',
      'Required field indicators',
      'Responsive grid layout',
    ],
    exampleRequest: {
      projectId: 'proj_abc123',
      tableName: 'Organization',
      options: {
        formType: 'both',
        useModal: false,
        columns: 2,
      },
    },
  });
}

function kebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-')
    .toLowerCase();
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
