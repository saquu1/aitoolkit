/**
 * API Route Generator
 * 
 * Generates Next.js API route handlers from stored procedure definitions.
 * Includes Zod validation, error handling, and middleware integration.
 */

import type { SPActionType, HTTPMethod } from './sp-classification-engine';
import type { SPParameterInfo } from './csp-correlation-engine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface APIRouteConfig {
  spName: string;
  httpMethod: HTTPMethod;
  routePath: string;
  moduleName: string;
  entityName: string;
  parameters: SPParameterInfo[];
  errorMappings: ErrorMapping[];
  requiredMiddleware: string[];
  requiredPermissions: string[];
  generateSwagger: boolean;
}

export interface ErrorMapping {
  errorCode: number;
  httpStatus: number;
  message: string;
  messageKey?: string;
}

export interface GeneratedAPIRoute {
  routePath: string;
  fileName: string;
  imports: string;
  zodSchema: string;
  types: string;
  handler: string;
  middleware: string;
  errorHandling: string;
  fullCode: string;
}

export interface ParameterMapping {
  spParam: string;
  httpSource: 'body' | 'query' | 'path' | 'header';
  tsType: string;
  zodType: string;
  required: boolean;
  defaultValue: string | null;
  validation: string[];
}

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

const SQL_TO_TS_TYPE_MAP: Record<string, string> = {
  'uniqueidentifier': 'string',
  'varchar': 'string',
  'nvarchar': 'string',
  'char': 'string',
  'nchar': 'string',
  'text': 'string',
  'ntext': 'string',
  'int': 'number',
  'bigint': 'number',
  'smallint': 'number',
  'tinyint': 'number',
  'bit': 'boolean',
  'decimal': 'number',
  'numeric': 'number',
  'money': 'number',
  'smallmoney': 'number',
  'float': 'number',
  'real': 'number',
  'date': 'string', // ISO date string
  'datetime': 'string', // ISO datetime string
  'datetime2': 'string',
  'smalldatetime': 'string',
  'time': 'string',
  'datetimeoffset': 'string',
  'binary': 'Buffer',
  'varbinary': 'Buffer',
  'image': 'Buffer',
  'xml': 'string',
  'json': 'any'
};

const SQL_TO_ZOD_MAP: Record<string, string> = {
  'uniqueidentifier': 'z.string().uuid()',
  'varchar': 'z.string()',
  'nvarchar': 'z.string()',
  'char': 'z.string()',
  'nchar': 'z.string()',
  'text': 'z.string()',
  'ntext': 'z.string()',
  'int': 'z.number().int()',
  'bigint': 'z.number().int()',
  'smallint': 'z.number().int()',
  'tinyint': 'z.number().int().min(0).max(255)',
  'bit': 'z.boolean()',
  'decimal': 'z.number()',
  'numeric': 'z.number()',
  'money': 'z.number()',
  'smallmoney': 'z.number()',
  'float': 'z.number()',
  'real': 'z.number()',
  'date': 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Invalid date format")',
  'datetime': 'z.string().datetime()',
  'datetime2': 'z.string().datetime()',
  'smalldatetime': 'z.string().datetime()',
  'time': 'z.string().regex(/^\\d{2}:\\d{2}:\\d{2}/)',
  'datetimeoffset': 'z.string().datetime({ offset: true })',
  'binary': 'z.any()',
  'varbinary': 'z.any()',
  'image': 'z.any()',
  'xml': 'z.string()',
  'json': 'z.any()'
};

// ============================================================================
// API ROUTE GENERATOR
// ============================================================================

export class APIRouteGenerator {
  
  /**
   * Generate a complete Next.js API route from SP configuration
   */
  generateRoute(config: APIRouteConfig): GeneratedAPIRoute {
    const fileName = this.generateFileName(config.routePath);
    const imports = this.generateImports(config);
    const parameterMappings = this.generateParameterMappings(config.parameters);
    const zodSchema = this.generateZodSchema(config, parameterMappings);
    const types = this.generateTypes(config, parameterMappings);
    const middleware = this.generateMiddleware(config);
    const errorHandling = this.generateErrorHandling(config.errorMappings);
    const handler = this.generateHandler(config, parameterMappings);
    
    const fullCode = this.assembleFullCode({
      imports,
      zodSchema,
      types,
      middleware,
      errorHandling,
      handler
    });
    
    return {
      routePath: config.routePath,
      fileName,
      imports,
      zodSchema,
      types,
      handler,
      middleware,
      errorHandling,
      fullCode
    };
  }
  
  /**
   * Generate file name from route path
   */
  private generateFileName(routePath: string): string {
    const cleanPath = routePath
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[{}]/g, '');
    
    return `${cleanPath || 'route'}.ts`;
  }
  
  /**
   * Generate import statements
   */
  private generateImports(config: APIRouteConfig): string {
    const imports: string[] = [
      `import { NextRequest, NextResponse } from 'next/server';`,
      `import { prisma } from '@/lib/prisma';`,
      `import { z } from 'zod';`,
      `import { withAuth } from '@/lib/middleware/auth';`,
      `import { withErrorHandler } from '@/lib/middleware/error-handler';`,
    ];
    
    if (config.requiredPermissions.length > 0) {
      imports.push(`import { withPermission } from '@/lib/middleware/permission';`);
    }
    
    if (config.requiredMiddleware.includes('audit')) {
      imports.push(`import { withAudit } from '@/lib/middleware/audit';`);
    }
    
    if (config.requiredMiddleware.includes('validation')) {
      imports.push(`import { withValidation } from '@/lib/middleware/validation';`);
    }
    
    return imports.join('\n');
  }
  
  /**
   * Generate parameter mappings from SP parameters
   */
  private generateParameterMappings(params: SPParameterInfo[]): ParameterMapping[] {
    return params
      .filter(p => p.direction === 'input')
      .map(p => {
        const normalizedType = p.type.toLowerCase().replace(/\([^)]*\)/g, '');
        const tsType = SQL_TO_TS_TYPE_MAP[normalizedType] || 'any';
        const zodBase = SQL_TO_ZOD_MAP[normalizedType] || 'z.any()';
        
        // Determine HTTP source based on name patterns
        let httpSource: ParameterMapping['httpSource'] = 'body';
        if (p.name.toLowerCase().includes('id') && !p.name.toLowerCase().startsWith('@')) {
          httpSource = 'path';
        }
        if (['page', 'size', 'q', 'sort', 'filter'].some(k => p.name.toLowerCase().includes(k))) {
          httpSource = 'query';
        }
        
        const validation: string[] = [];
        if (!p.isOptional && p.defaultValue === null) {
          validation.push('required');
        }
        
        return {
          spParam: p.name.startsWith('@') ? p.name : `@${p.name}`,
          httpSource,
          tsType,
          zodType: p.isOptional ? `${zodBase}.optional().nullable()` : zodBase,
          required: !p.isOptional && p.defaultValue === null,
          defaultValue: p.defaultValue,
          validation
        };
      });
  }
  
  /**
   * Generate Zod validation schema
   */
  private generateZodSchema(config: APIRouteConfig, mappings: ParameterMapping[]): string {
    const schemaName = `${this.toPascalCase(config.entityName)}InputSchema`;
    
    const fields = mappings.map(m => {
      let fieldDef = `  ${m.spParam.replace('@', '').replace(/Id$/, '')}: ${m.zodType}`;
      
      // Add description if needed
      if (m.required) {
        fieldDef += `.describe("${this.generateFieldDescription(m.spParam)}")`;
      }
      
      return fieldDef;
    });
    
    // Add nested object handling for User.* patterns
    const nestedFields = mappings
      .filter(m => m.spParam.includes('.'))
      .map(m => {
        const [parent, child] = m.spParam.replace('@', '').split('.');
        return { parent, child, mapping: m };
      });
    
    if (nestedFields.length > 0) {
      // Group by parent
      const grouped = nestedFields.reduce((acc, { parent, child, mapping }) => {
        if (!acc[parent]) acc[parent] = [];
        acc[parent].push({ child, mapping });
        return acc;
      }, {} as Record<string, Array<{ child: string; mapping: ParameterMapping }>>);
      
      // Remove nested fields from main list
      const mainFields = fields.filter(f => !f.includes('.'));
      
      // Add nested schemas
      for (const [parent, children] of Object.entries(grouped)) {
        const nestedFields = children.map(({ child, mapping }) => 
          `    ${child}: ${mapping.zodType}`
        ).join(',\n');
        
        mainFields.push(`  ${parent}: z.object({\n${nestedFields}\n  })${children.some(c => !c.mapping.required) ? '.optional()' : ''}`);
      }
      
      return `const ${schemaName} = z.object({\n${mainFields.join(',\n')}\n});`;
    }
    
    return `const ${schemaName} = z.object({\n${fields.join(',\n')}\n});`;
  }
  
  /**
   * Generate TypeScript types
   */
  private generateTypes(config: APIRouteConfig, mappings: ParameterMapping[]): string {
    const typeName = `${this.toPascalCase(config.entityName)}Input`;
    
    const fields = mappings.map(m => {
      const fieldName = m.spParam.replace('@', '').replace(/Id$/, '');
      const optionalMarker = m.required ? '' : '?';
      return `  ${fieldName}${optionalMarker}: ${m.tsType};`;
    });
    
    return `interface ${typeName} {\n${fields.join('\n')}\n}\n\ninterface ${typeName}Response {\n  id: string | number;\n  message?: string;\n}`;
  }
  
  /**
   * Generate middleware chain
   */
  private generateMiddleware(config: APIRouteConfig): string {
    const middlewareChain: string[] = ['withErrorHandler'];
    
    // Add auth
    middlewareChain.push('withAuth');
    
    // Add permission check
    if (config.requiredPermissions.length > 0) {
      const permissions = config.requiredPermissions.map(p => `'${p}'`).join(', ');
      middlewareChain.push(`withPermission(${permissions})`);
    }
    
    // Add audit
    if (config.requiredMiddleware.includes('audit')) {
      middlewareChain.push(`withAudit('${config.entityName}', '${config.httpMethod}')`);
    }
    
    return middlewareChain.join('(\n  ');
  }
  
  /**
   * Generate error handling code
   */
  private generateErrorHandling(errorMappings: ErrorMapping[]): string {
    if (errorMappings.length === 0) {
      return `const ERROR_MESSAGES: Record<number, string> = {};`;
    }
    
    const mappings = errorMappings.map(e => 
      `  [${e.errorCode}]: '${e.message}'`
    ).join(',\n');
    
    return `const ERROR_MESSAGES: Record<number, string> = {\n${mappings}\n};`;
  }
  
  /**
   * Generate handler function
   */
  private generateHandler(config: APIRouteConfig, mappings: ParameterMapping[]): string {
    const handlerName = this.getHandlerName(config.httpMethod);
    const entityVar = config.entityName.toLowerCase();
    
    // Extract parameters based on HTTP source
    const bodyParams = mappings.filter(m => m.httpSource === 'body');
    const queryParams = mappings.filter(m => m.httpSource === 'query');
    const pathParams = mappings.filter(m => m.httpSource === 'path');
    
    let handlerBody = '';
    
    // Parse request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(config.httpMethod)) {
      handlerBody += `  const body = await req.json();\n`;
      handlerBody += `  const parsed = ${this.toPascalCase(config.entityName)}InputSchema.parse(body);\n\n`;
    }
    
    // Extract query params for GET
    if (config.httpMethod === 'GET' && queryParams.length > 0) {
      handlerBody += `  const { searchParams } = new URL(req.url);\n`;
      for (const param of queryParams) {
        const paramName = param.spParam.replace('@', '');
        handlerBody += `  const ${paramName} = searchParams.get('${paramName}')${param.required ? '' : ' || null'};\n`;
      }
      handlerBody += '\n';
    }
    
    // Generate Prisma query
    handlerBody += this.generatePrismaQuery(config, mappings);
    
    // Add error handling
    handlerBody += `  if (result[0]?.ResultId < 0) {\n`;
    handlerBody += `    return NextResponse.json(\n`;
    handlerBody += `      { id: result[0].ResultId, message: ERROR_MESSAGES[result[0].ResultId] || result[0].ResultMessage || 'Operation failed' },\n`;
    handlerBody += `      { status: 400 }\n`;
    handlerBody += `    );\n`;
    handlerBody += `  }\n\n`;
    
    // Return success response
    const statusCode = config.httpMethod === 'POST' ? 201 : config.httpMethod === 'DELETE' ? 204 : 200;
    handlerBody += `  return NextResponse.json(\n`;
    handlerBody += `    { id: result[0]?.ResultId, message: '${config.entityName} ${this.getSuccessMessage(config.httpMethod)}' },\n`;
    handlerBody += `    { status: ${statusCode} }\n`;
    handlerBody += `  );\n`;
    
    return `async function ${handlerName}(req: NextRequest${pathParams.length > 0 ? ', { params }: { params: { id: string } }' : ''}) {\n${handlerBody}}`;
  }
  
  /**
   * Generate Prisma raw query
   */
  private generatePrismaQuery(config: APIRouteConfig, mappings: ParameterMapping[]): string {
    const spCall = `EXEC ${config.spName}`;
    
    // Build parameter list
    const paramList = mappings.map(m => {
      const paramName = m.spParam;
      let paramValue: string;
      
      if (m.httpSource === 'body') {
        const fieldName = paramName.replace('@', '').replace(/Id$/, '');
        paramValue = `parsed.${fieldName}`;
      } else if (m.httpSource === 'query') {
        const fieldName = paramName.replace('@', '');
        paramValue = fieldName;
      } else if (m.httpSource === 'path') {
        paramValue = 'params.id';
      } else {
        paramValue = 'null';
      }
      
      return `    ${paramName} = \${${paramValue}}`;
    });
    
    // Add system parameters
    paramList.push(`    @UserId = \${req.headers.get('x-user-id')}`);
    
    return `  const result = await prisma.$queryRaw\`\n    ${spCall}\n${paramList.join(',\n')}\n  \`;\n\n`;
  }
  
  /**
   * Assemble full code from components
   */
  private assembleFullCode(components: {
    imports: string;
    zodSchema: string;
    types: string;
    middleware: string;
    errorHandling: string;
    handler: string;
  }): string {
    return `// ============================================
// GENERATED CODE - DO NOT EDIT MANUALLY
// Generated by SPDLL Intelligence Engine
// ============================================

${components.imports}

// ============================================
// TYPES
// ============================================
${components.types}

// ============================================
// VALIDATION SCHEMA
// ============================================
${components.zodSchema}

// ============================================
// ERROR MAPPINGS
// ============================================
${components.errorHandling}

// ============================================
// HANDLER
// ============================================
${components.handler}

// ============================================
// EXPORTS
// ============================================
export const ${components.handler.match(/async function (\w+)/)?.[1] || 'handler'} = ${components.middleware}(
  ${components.handler.match(/async function (\w+)/)?.[1] || 'handler'}
);
`;
  }
  
  // Helper methods
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toUpperCase());
  }
  
  private getHandlerName(httpMethod: HTTPMethod): string {
    const handlers: Record<HTTPMethod, string> = {
      'GET': 'getHandler',
      'POST': 'createHandler',
      'PUT': 'updateHandler',
      'DELETE': 'deleteHandler',
      'PATCH': 'patchHandler'
    };
    return handlers[httpMethod] || 'handler';
  }
  
  private getSuccessMessage(httpMethod: HTTPMethod): string {
    const messages: Record<HTTPMethod, string> = {
      'GET': 'retrieved successfully',
      'POST': 'created successfully',
      'PUT': 'updated successfully',
      'DELETE': 'deleted successfully',
      'PATCH': 'updated successfully'
    };
    return messages[httpMethod] || 'operation completed';
  }
  
  private generateFieldDescription(paramName: string): string {
    const name = paramName.replace('@', '').toLowerCase();
    const descriptions: Record<string, string> = {
      'name': 'The name of the entity',
      'email': 'Email address',
      'phone': 'Phone number',
      'address': 'Physical address',
      'isactive': 'Whether the record is active'
    };
    return descriptions[name] || `${paramName} field`;
  }
}

// Export singleton instance
export const apiRouteGenerator = new APIRouteGenerator();

// Export utility functions
export function generateAPIRoute(config: APIRouteConfig): GeneratedAPIRoute {
  return apiRouteGenerator.generateRoute(config);
}
