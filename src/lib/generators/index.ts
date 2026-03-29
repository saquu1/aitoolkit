/**
 * Code Generators Index
 * 
 * Central export point for all code generation functionality.
 * 
 * Generators:
 * - React Form Generator: Creates form components with React Hook Form
 * - React Table Generator: Creates data tables with TanStack Table
 * - React Page Generator: Creates complete CRUD pages
 * - Prisma Generator: Creates Prisma schema from UnifiedField
 * - TypeScript Generator: Creates TypeScript type definitions
 * - Zod Generator: Creates Zod validation schemas
 * - API Route Generator: Creates Next.js API routes for CRUD operations
 */

// React Form Generator
export {
  generateReactForm,
  generateModelForm,
  wrapInModal,
  type ReactFormGeneratorConfig,
  type ReactFormGenerationResult,
  type FormField,
  type FormFieldType,
  type FieldValidation,
  type FKFieldConfig,
  type CascadeFieldConfig,
  type PIIFieldConfig,
} from './react-form-generator';

// React Table Generator
export {
  generateReactTable,
  generateModelTable,
  generateActionColumn,
  type ReactTableGeneratorConfig,
  type ReactTableGenerationResult,
  type TableColumn,
} from './react-table-generator';

// React Page Generator
export {
  generatePages,
  generateFullCRUD,
  generateCombinedPage,
  type PageGeneratorConfig,
  type GeneratedPage,
  type PageGenerationResult,
} from './react-page-generator';

// Prisma Generator
export {
  generatePrismaSchema,
  generatePrismaModel,
  getMissingFKReferences,
  validateFKReferences,
  type PrismaGeneratorConfig,
  type PrismaModel,
  type PrismaField,
  type PrismaRelation,
  type PrismaIndex,
  type PrismaGenerationResult,
} from './prisma-generator';

// TypeScript Generator
export {
  generateTypeScriptTypes,
  generateModelTypeScript,
  type TypeScriptGeneratorConfig,
  type TypeScriptType,
  type TypeScriptGenerationResult,
} from './typescript-generator';

// Zod Generator
export {
  generateZodSchemas,
  generateModelZod,
  type ZodGeneratorConfig,
  type ZodSchema,
  type ZodGenerationResult,
} from './zod-generator';

// API Route Generator
export {
  generateAPIRoutes,
  generateCascadeDropdownRoute,
  generateAllAPIRoutes,
  type APIRouteGeneratorConfig,
  type GeneratedAPIRoute,
  type APIRouteGenerationResult,
  type APIField,
  type CascadeConfig,
  type FullAPIGenerationConfig,
  type FullAPIGenerationResult,
} from './api-route-generator';

// Type Mappings (shared utilities)
export {
  SQL_TO_PRISMA,
  SQL_TO_TYPESCRIPT,
  SQL_TO_ZOD,
  SEMANTIC_TO_UI,
  SEMANTIC_VALIDATION,
  getPrismaType,
  getTypeScriptType,
  getZodType,
  getUIComponent,
  getValidationPattern,
  isNumericType,
  isStringType,
  isDateType,
  isBooleanType,
  getDefaultValue,
  toPrismaModelName,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  type UIComponentConfig,
  type ValidationPattern,
} from './type-mappings';

// ══════════════════════════════════════════════════════════════════════════════
// UNIFIED GENERATION API
// ══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/db';
import type { UnifiedField } from '@prisma/client';
import { generateReactForm } from './react-form-generator';
import { generateReactTable } from './react-table-generator';
import { generatePages } from './react-page-generator';
import { generatePrismaSchema } from './prisma-generator';
import { generateTypeScriptTypes } from './typescript-generator';
import { generateZodSchemas } from './zod-generator';
import { generateAPIRoutes } from './api-route-generator';

export interface FullGenerationConfig {
  projectId: string;
  tableName: string;
  generateForm?: boolean;
  generateTable?: boolean;
  generatePages?: boolean;
  generatePrisma?: boolean;
  generateTypes?: boolean;
  generateZod?: boolean;
  generateAPI?: boolean;
  formOptions?: Record<string, any>;
  tableOptions?: Record<string, any>;
  pageOptions?: Record<string, any>;
  prismaOptions?: Record<string, any>;
  apiOptions?: Record<string, any>;
}

export interface FullGenerationResult {
  success: boolean;
  artifacts: GeneratedArtifact[];
  errors: string[];
  warnings: string[];
  summary: {
    tableName: string;
    totalArtifacts: number;
    generatedAt: string;
    duration: number;
  };
}

export interface GeneratedArtifact {
  type: 'component' | 'page' | 'api' | 'schema' | 'types' | 'validation';
  name: string;
  path: string;
  content: string;
  language: string;
}

/**
 * Generate all artifacts for a table
 */
export async function generateAllArtifacts(
  config: FullGenerationConfig
): Promise<FullGenerationResult> {
  const startTime = Date.now();
  const result: FullGenerationResult = {
    success: true,
    artifacts: [],
    errors: [],
    warnings: [],
    summary: {
      tableName: config.tableName,
      totalArtifacts: 0,
      generatedAt: new Date().toISOString(),
      duration: 0,
    },
  };

  try {
    // Check if table has fields
    const fieldCount = await prisma.unifiedField.count({
      where: {
        projectId: config.projectId,
        tableName: config.tableName,
      },
    });

    if (fieldCount === 0) {
      result.errors.push(`No fields found for table ${config.tableName}`);
      result.success = false;
      return result;
    }

    // Generate in parallel for efficiency
    const generationPromises: Promise<void>[] = [];

    // Form generation
    if (config.generateForm !== false) {
      generationPromises.push(
        generateReactForm({
          projectId: config.projectId,
          tableName: config.tableName,
          ...config.formOptions,
        }).then(formResult => {
          if (formResult.errors.length > 0) {
            result.errors.push(...formResult.errors);
          } else {
            result.artifacts.push({
              type: 'component',
              name: `${config.tableName}Form.tsx`,
              path: `components/forms/${kebabCase(config.tableName)}-form.tsx`,
              content: formResult.formComponent,
              language: 'typescript',
            });
          }
          result.warnings.push(...formResult.warnings);
        })
      );
    }

    // Table generation
    if (config.generateTable !== false) {
      generationPromises.push(
        generateReactTable({
          projectId: config.projectId,
          tableName: config.tableName,
          ...config.tableOptions,
        }).then(tableResult => {
          if (tableResult.errors.length > 0) {
            result.errors.push(...tableResult.errors);
          } else {
            result.artifacts.push({
              type: 'component',
              name: `${config.tableName}Table.tsx`,
              path: `components/tables/${kebabCase(config.tableName)}-table.tsx`,
              content: tableResult.tableComponent,
              language: 'typescript',
            });
          }
          result.warnings.push(...tableResult.warnings);
        })
      );
    }

    // Pages generation
    if (config.generatePages !== false) {
      generationPromises.push(
        generatePages({
          projectId: config.projectId,
          tableName: config.tableName,
          pageType: 'full-crud',
          ...config.pageOptions,
        }).then(pageResult => {
          if (pageResult.errors.length > 0) {
            result.errors.push(...pageResult.errors);
          } else {
            for (const page of pageResult.pages) {
              result.artifacts.push({
                type: page.type as any,
                name: page.path.split('/').pop() || 'page.tsx',
                path: page.path,
                content: page.content,
                language: 'typescript',
              });
            }
          }
          result.warnings.push(...pageResult.warnings);
        })
      );
    }

    // Prisma generation
    if (config.generatePrisma !== false) {
      generationPromises.push(
        generatePrismaSchema({
          projectId: config.projectId,
          tableName: config.tableName,
          ...config.prismaOptions,
        }).then(prismaResult => {
          if (prismaResult.errors.length > 0) {
            result.errors.push(...prismaResult.errors);
          } else {
            result.artifacts.push({
              type: 'schema',
              name: 'schema.prisma',
              path: `prisma/schema.prisma`,
              content: prismaResult.schema,
              language: 'prisma',
            });
          }
          result.warnings.push(...prismaResult.warnings);
        })
      );
    }

    // TypeScript types generation
    if (config.generateTypes !== false) {
      generationPromises.push(
        generateTypeScriptTypes({
          projectId: config.projectId,
          tableName: config.tableName,
        }).then(tsResult => {
          if (tsResult.errors.length > 0) {
            result.errors.push(...tsResult.errors);
          } else {
            result.artifacts.push({
              type: 'types',
              name: `${config.tableName}.ts`,
              path: `types/${kebabCase(config.tableName)}.ts`,
              content: tsResult.content,
              language: 'typescript',
            });
          }
        })
      );
    }

    // Zod schemas generation
    if (config.generateZod !== false) {
      generationPromises.push(
        generateZodSchemas({
          projectId: config.projectId,
          tableName: config.tableName,
        }).then(zodResult => {
          if (zodResult.errors.length > 0) {
            result.errors.push(...zodResult.errors);
          } else {
            result.artifacts.push({
              type: 'validation',
              name: `${config.tableName}.ts`,
              path: `lib/validations/${kebabCase(config.tableName)}.ts`,
              content: zodResult.content,
              language: 'typescript',
            });
          }
        })
      );
    }

    // API routes generation
    if (config.generateAPI !== false) {
      generationPromises.push(
        generateAPIRoutes({
          projectId: config.projectId,
          tableName: config.tableName,
          includeSearch: true,
          includeFilter: true,
          includePagination: true,
          includeRelations: true,
          includeBulkOperations: true,
          includeDropdownAPI: true,
          ...config.apiOptions,
        }).then(apiResult => {
          if (apiResult.errors.length > 0) {
            result.errors.push(...apiResult.errors);
          } else {
            // Add each generated route as an artifact
            for (const route of apiResult.routes) {
              result.artifacts.push({
                type: 'api',
                name: route.path.split('/').pop() || 'route.ts',
                path: route.path,
                content: route.content,
                language: 'typescript',
              });
            }
          }
          result.warnings.push(...apiResult.warnings);
        })
      );
    }

    // Wait for all generations to complete
    await Promise.all(generationPromises);

    // Update summary
    result.success = result.errors.length === 0;
    result.summary.totalArtifacts = result.artifacts.length;
    result.summary.duration = Date.now() - startTime;

  } catch (error: any) {
    result.errors.push(`Generation failed: ${error.message}`);
    result.success = false;
  }

  return result;
}

/**
 * Quick generation for a single artifact type
 */
export async function generateArtifact(
  projectId: string,
  tableName: string,
  artifactType: 'form' | 'table' | 'page' | 'prisma' | 'typescript' | 'zod' | 'api',
  options: Record<string, any> = {}
): Promise<GeneratedArtifact | null> {
  switch (artifactType) {
    case 'form': {
      const result = await generateReactForm({ projectId, tableName, ...options });
      if (result.errors.length > 0) return null;
      return {
        type: 'component',
        name: `${tableName}Form.tsx`,
        path: `components/forms/${kebabCase(tableName)}-form.tsx`,
        content: result.formComponent,
        language: 'typescript',
      };
    }
    case 'table': {
      const result = await generateReactTable({ projectId, tableName, ...options });
      if (result.errors.length > 0) return null;
      return {
        type: 'component',
        name: `${tableName}Table.tsx`,
        path: `components/tables/${kebabCase(tableName)}-table.tsx`,
        content: result.tableComponent,
        language: 'typescript',
      };
    }
    case 'prisma': {
      const result = await generatePrismaSchema({ projectId, tableName, ...options });
      if (result.errors.length > 0) return null;
      return {
        type: 'schema',
        name: 'schema.prisma',
        path: 'prisma/schema.prisma',
        content: result.schema,
        language: 'prisma',
      };
    }
    case 'typescript': {
      const result = await generateTypeScriptTypes({ projectId, tableName });
      if (result.errors.length > 0) return null;
      return {
        type: 'types',
        name: `${tableName}.ts`,
        path: `types/${kebabCase(tableName)}.ts`,
        content: result.content,
        language: 'typescript',
      };
    }
    case 'zod': {
      const result = await generateZodSchemas({ projectId, tableName });
      if (result.errors.length > 0) return null;
      return {
        type: 'validation',
        name: `${tableName}.ts`,
        path: `lib/validations/${kebabCase(tableName)}.ts`,
        content: result.content,
        language: 'typescript',
      };
    }
    case 'api': {
      const result = await generateAPIRoutes({ projectId, tableName, ...options });
      if (result.errors.length > 0) return null;
      // Return the main route (first one)
      const mainRoute = result.routes.find(r => r.type === 'main');
      if (!mainRoute) return null;
      return {
        type: 'api',
        name: 'route.ts',
        path: mainRoute.path,
        content: mainRoute.content,
        language: 'typescript',
      };
    }
    default:
      return null;
  }
}

// Helper function
function kebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-')
    .toLowerCase();
}
