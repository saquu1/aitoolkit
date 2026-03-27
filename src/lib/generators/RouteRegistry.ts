// =============================================================================
// Route Registry Generator - URL and Navigation Intelligence
// =============================================================================
// Generates routes from controller/action patterns, builds URL registry,
// creates navigation structure, and generates route configuration files
// =============================================================================

import { WorkflowDefinition } from '../parsers/workflow-builder';
import { TableDef, ModuleDef, ScreenBlueprint } from '../types';

/**
 * Route definition
 */
export interface RouteDefinition {
  id: string;
  path: string;
  name: string;
  module: string;
  controller?: string;
  action?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  isPublic: boolean;
  permissions: string[];
  parameters: RouteParameter[];
  relatedTable?: string;
  parentRoute?: string;
  children: string[];
  metadata: RouteMetadata;
}

/**
 * Route parameter
 */
export interface RouteParameter {
  name: string;
  type: 'path' | 'query' | 'body';
  dataType: string;
  isRequired: boolean;
  description?: string;
}

/**
 * Route metadata
 */
export interface RouteMetadata {
  description?: string;
  tags: string[];
  version: string;
  deprecated: boolean;
  deprecationMessage?: string;
  rateLimit?: number;
  cacheEnabled: boolean;
  cacheTTL?: number;
}

/**
 * Navigation item
 */
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  order: number;
  module: string;
  permissions: string[];
  children: NavigationItem[];
  badge?: string;
  external?: boolean;
  description?: string;
}

/**
 * Navigation group
 */
export interface NavigationGroup {
  id: string;
  title: string;
  icon?: string;
  order: number;
  items: NavigationItem[];
  permissions: string[];
  isExpanded: boolean;
}

/**
 * URL registry
 */
export interface URLRegistry {
  projectId: string;
  projectName: string;
  generatedAt: Date;
  routes: RouteDefinition[];
  navigation: NavigationGroup[];
  modules: ModuleRouteSummary[];
  statistics: URLRegistryStats;
}

/**
 * Module route summary
 */
export interface ModuleRouteSummary {
  moduleKey: string;
  moduleName: string;
  totalRoutes: number;
  publicRoutes: number;
  authenticatedRoutes: number;
  routes: string[];
}

/**
 * URL registry statistics
 */
export interface URLRegistryStats {
  totalRoutes: number;
  publicRoutes: number;
  authenticatedRoutes: number;
  moduleCount: number;
  avgRoutesPerModule: number;
  deprecatedRoutes: number;
}

/**
 * Route configuration output format
 */
export type RouteConfigFormat = 'typescript' | 'javascript' | 'json' | 'yaml';

/**
 * Route Registry Generator
 */
export class RouteRegistryGenerator {
  private routes: RouteDefinition[] = [];
  private modules: Map<string, ModuleDef> = new Map();
  private tables: Map<string, TableDef> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private screens: Map<string, ScreenBlueprint> = new Map();

  constructor(
    modules: ModuleDef[] = [],
    tables: TableDef[] = [],
    workflows: WorkflowDefinition[] = [],
    screens: ScreenBlueprint[] = []
  ) {
    modules.forEach(m => this.modules.set(m.key, m));
    tables.forEach(t => this.tables.set(t.tableName, t));
    workflows.forEach(w => this.workflows.set(w.id, w));
    screens.forEach(s => this.screens.set(s.tableName, s));
  }

  /**
   * Generate complete URL registry
   */
  generateRegistry(projectId: string, projectName: string): URLRegistry {
    this.routes = [];

    // Generate routes from modules
    for (const [key, module] of this.modules) {
      this.generateModuleRoutes(module);
    }

    // Generate routes from tables (CRUD)
    for (const [name, table] of this.tables) {
      this.generateTableRoutes(table);
    }

    // Generate routes from workflows
    for (const [id, workflow] of this.workflows) {
      this.generateWorkflowRoutes(workflow);
    }

    // Generate routes from screens
    for (const [name, screen] of this.screens) {
      this.generateScreenRoutes(screen);
    }

    // Build navigation structure
    const navigation = this.buildNavigation();

    // Build module summaries
    const moduleSummaries = this.buildModuleSummaries();

    // Calculate statistics
    const statistics = this.calculateStatistics();

    return {
      projectId,
      projectName,
      generatedAt: new Date(),
      routes: this.routes,
      navigation,
      modules: moduleSummaries,
      statistics,
    };
  }

  /**
   * Generate routes for a module
   */
  private generateModuleRoutes(module: ModuleDef): void {
    const basePath = this.toKebabCase(module.key);

    // Module dashboard/list route
    this.addRoute({
      id: `route-${module.key}-list`,
      path: `/${basePath}`,
      name: `${module.name} List`,
      module: module.key,
      httpMethod: 'GET',
      isPublic: false,
      permissions: [`${module.key}.view`],
      parameters: [],
      children: [],
      metadata: {
        tags: [module.key, 'list'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: true,
        cacheTTL: 300,
      },
    });

    // Generate routes for each API endpoint in module
    for (const endpoint of module.apiEndpoints) {
      this.parseAndAddEndpointRoute(endpoint, module);
    }

    // Generate feature routes
    for (const feature of module.features) {
      this.generateFeatureRoute(feature, module);
    }
  }

  /**
   * Parse and add endpoint route
   */
  private parseAndAddEndpointRoute(endpoint: string, module: ModuleDef): void {
    // Parse endpoint patterns like "POST /api/patients" or "GET /api/patients/:id"
    const match = endpoint.match(/^(GET|POST|PUT|DELETE|PATCH)?\s*(\/\S*)?/i);
    if (!match) return;

    const httpMethod = (match[1]?.toUpperCase() || 'GET') as RouteDefinition['httpMethod'];
    const path = match[2] || `/api/${this.toKebabCase(module.key)}`;

    this.addRoute({
      id: `route-${module.key}-api-${this.routes.length}`,
      path,
      name: this.generateRouteName(path, httpMethod),
      module: module.key,
      httpMethod,
      isPublic: false,
      permissions: [`${module.key}.api`],
      parameters: this.extractPathParameters(path),
      children: [],
      metadata: {
        description: `API endpoint for ${module.name}`,
        tags: [module.key, 'api'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: httpMethod === 'GET',
      },
    });
  }

  /**
   * Generate feature route
   */
  private generateFeatureRoute(feature: string, module: ModuleDef): void {
    const featurePath = this.featureToPath(feature);
    const basePath = `/${this.toKebabCase(module.key)}`;

    this.addRoute({
      id: `route-${module.key}-feature-${this.slugify(feature)}`,
      path: `${basePath}/${featurePath}`,
      name: `${this.toTitleCase(feature)}`,
      module: module.key,
      httpMethod: 'GET',
      isPublic: false,
      permissions: [`${module.key}.${this.slugify(feature)}`],
      parameters: [],
      children: [],
      metadata: {
        description: feature,
        tags: [module.key, 'feature'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: true,
      },
    });
  }

  /**
   * Generate CRUD routes for a table
   */
  private generateTableRoutes(table: TableDef): void {
    const basePath = `/api/${this.toKebabCase(table.tableName)}`;
    const moduleName = table.linkedModule || 'core';
    const modelName = this.toSingularPascal(table.tableName);

    // GET - List
    this.addRoute({
      id: `route-${table.tableName}-list`,
      path: basePath,
      name: `List ${modelName}`,
      module: moduleName,
      httpMethod: 'GET',
      isPublic: false,
      permissions: [`${moduleName}.view`],
      parameters: [
        { name: 'page', type: 'query', dataType: 'number', isRequired: false },
        { name: 'limit', type: 'query', dataType: 'number', isRequired: false },
        { name: 'search', type: 'query', dataType: 'string', isRequired: false },
        { name: 'sort', type: 'query', dataType: 'string', isRequired: false },
        { name: 'order', type: 'query', dataType: 'string', isRequired: false },
      ],
      relatedTable: table.tableName,
      children: [],
      metadata: {
        description: `List all ${modelName} records with pagination`,
        tags: [moduleName, table.tableName, 'list'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: true,
        cacheTTL: 60,
      },
    });

    // GET - By ID
    const pkColumn = table.columns.find(c => c.isPrimaryKey);
    if (pkColumn) {
      this.addRoute({
        id: `route-${table.tableName}-get`,
        path: `${basePath}/:id`,
        name: `Get ${modelName}`,
        module: moduleName,
        httpMethod: 'GET',
        isPublic: false,
        permissions: [`${moduleName}.view`],
        parameters: [
          { name: 'id', type: 'path', dataType: pkColumn.dataType, isRequired: true, description: pkColumn.name },
        ],
        relatedTable: table.tableName,
        children: [],
        metadata: {
          description: `Get a single ${modelName} by ID`,
          tags: [moduleName, table.tableName, 'read'],
          version: '1.0',
          deprecated: false,
          cacheEnabled: true,
          cacheTTL: 120,
        },
      });
    }

    // POST - Create
    this.addRoute({
      id: `route-${table.tableName}-create`,
      path: basePath,
      name: `Create ${modelName}`,
      module: moduleName,
      httpMethod: 'POST',
      isPublic: false,
      permissions: [`${moduleName}.create`],
      parameters: [
        { name: 'body', type: 'body', dataType: modelName, isRequired: true },
      ],
      relatedTable: table.tableName,
      children: [],
      metadata: {
        description: `Create a new ${modelName} record`,
        tags: [moduleName, table.tableName, 'create'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: false,
      },
    });

    // PUT - Update
    if (pkColumn) {
      this.addRoute({
        id: `route-${table.tableName}-update`,
        path: `${basePath}/:id`,
        name: `Update ${modelName}`,
        module: moduleName,
        httpMethod: 'PUT',
        isPublic: false,
        permissions: [`${moduleName}.edit`],
        parameters: [
          { name: 'id', type: 'path', dataType: pkColumn.dataType, isRequired: true },
          { name: 'body', type: 'body', dataType: modelName, isRequired: true },
        ],
        relatedTable: table.tableName,
        children: [],
        metadata: {
          description: `Update an existing ${modelName} record`,
          tags: [moduleName, table.tableName, 'update'],
          version: '1.0',
          deprecated: false,
          cacheEnabled: false,
        },
      });

      // DELETE
      this.addRoute({
        id: `route-${table.tableName}-delete`,
        path: `${basePath}/:id`,
        name: `Delete ${modelName}`,
        module: moduleName,
        httpMethod: 'DELETE',
        isPublic: false,
        permissions: [`${moduleName}.delete`],
        parameters: [
          { name: 'id', type: 'path', dataType: pkColumn.dataType, isRequired: true },
        ],
        relatedTable: table.tableName,
        children: [],
        metadata: {
          description: `Delete a ${modelName} record`,
          tags: [moduleName, table.tableName, 'delete'],
          version: '1.0',
          deprecated: false,
          cacheEnabled: false,
        },
      });
    }
  }

  /**
   * Generate routes for a workflow
   */
  private generateWorkflowRoutes(workflow: WorkflowDefinition): void {
    const basePath = `/api/workflows/${this.toKebabCase(workflow.id)}`;

    // Start workflow
    this.addRoute({
      id: `route-wf-${workflow.id}-start`,
      path: `${basePath}/start`,
      name: `Start ${workflow.name}`,
      module: workflow.module,
      httpMethod: 'POST',
      isPublic: false,
      permissions: [`${workflow.module}.workflow.start`],
      parameters: [
        { name: 'body', type: 'body', dataType: 'object', isRequired: true },
      ],
      children: [],
      metadata: {
        description: `Start a new ${workflow.name} workflow instance`,
        tags: [workflow.module, 'workflow', 'start'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: false,
      },
    });

    // Get workflow status
    this.addRoute({
      id: `route-wf-${workflow.id}-status`,
      path: `${basePath}/:instanceId/status`,
      name: `Get ${workflow.name} Status`,
      module: workflow.module,
      httpMethod: 'GET',
      isPublic: false,
      permissions: [`${workflow.module}.workflow.view`],
      parameters: [
        { name: 'instanceId', type: 'path', dataType: 'string', isRequired: true },
      ],
      children: [],
      metadata: {
        description: `Get the current status of a ${workflow.name} workflow instance`,
        tags: [workflow.module, 'workflow', 'status'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: true,
        cacheTTL: 30,
      },
    });

    // Execute workflow step
    this.addRoute({
      id: `route-wf-${workflow.id}-step`,
      path: `${basePath}/:instanceId/step/:stepId`,
      name: `Execute ${workflow.name} Step`,
      module: workflow.module,
      httpMethod: 'POST',
      isPublic: false,
      permissions: [`${workflow.module}.workflow.execute`],
      parameters: [
        { name: 'instanceId', type: 'path', dataType: 'string', isRequired: true },
        { name: 'stepId', type: 'path', dataType: 'string', isRequired: true },
        { name: 'body', type: 'body', dataType: 'object', isRequired: true },
      ],
      children: [],
      metadata: {
        description: `Execute a step in the ${workflow.name} workflow`,
        tags: [workflow.module, 'workflow', 'step'],
        version: '1.0',
        deprecated: false,
        cacheEnabled: false,
      },
    });
  }

  /**
   * Generate routes for a screen
   */
  private generateScreenRoutes(screen: ScreenBlueprint): void {
    const basePath = `/${this.toKebabCase(screen.tableName)}`;
    const moduleName = screen.tableName;

    switch (screen.screenType) {
      case 'list':
        this.addRoute({
          id: `route-screen-${screen.tableName}-list`,
          path: basePath,
          name: screen.title,
          module: moduleName,
          httpMethod: 'GET',
          isPublic: false,
          permissions: [`${moduleName}.view`],
          parameters: [],
          relatedTable: screen.tableName,
          children: [],
          metadata: {
            description: `List view for ${screen.title}`,
            tags: [moduleName, 'screen', 'list'],
            version: '1.0',
            deprecated: false,
            cacheEnabled: true,
          },
        });
        break;

      case 'form':
        this.addRoute({
          id: `route-screen-${screen.tableName}-create`,
          path: `${basePath}/create`,
          name: `Create ${screen.title}`,
          module: moduleName,
          httpMethod: 'GET',
          isPublic: false,
          permissions: [`${moduleName}.create`],
          parameters: [],
          relatedTable: screen.tableName,
          children: [],
          metadata: {
            description: `Create form for ${screen.title}`,
            tags: [moduleName, 'screen', 'form', 'create'],
            version: '1.0',
            deprecated: false,
            cacheEnabled: false,
          },
        });

        this.addRoute({
          id: `route-screen-${screen.tableName}-edit`,
          path: `${basePath}/:id/edit`,
          name: `Edit ${screen.title}`,
          module: moduleName,
          httpMethod: 'GET',
          isPublic: false,
          permissions: [`${moduleName}.edit`],
          parameters: [
            { name: 'id', type: 'path', dataType: 'string', isRequired: true },
          ],
          relatedTable: screen.tableName,
          children: [],
          metadata: {
            description: `Edit form for ${screen.title}`,
            tags: [moduleName, 'screen', 'form', 'edit'],
            version: '1.0',
            deprecated: false,
            cacheEnabled: false,
          },
        });
        break;

      case 'detail':
        this.addRoute({
          id: `route-screen-${screen.tableName}-detail`,
          path: `${basePath}/:id`,
          name: `${screen.title} Detail`,
          module: moduleName,
          httpMethod: 'GET',
          isPublic: false,
          permissions: [`${moduleName}.view`],
          parameters: [
            { name: 'id', type: 'path', dataType: 'string', isRequired: true },
          ],
          relatedTable: screen.tableName,
          children: [],
          metadata: {
            description: `Detail view for ${screen.title}`,
            tags: [moduleName, 'screen', 'detail'],
            version: '1.0',
            deprecated: false,
            cacheEnabled: true,
          },
        });
        break;

      case 'dashboard':
        this.addRoute({
          id: `route-screen-${screen.tableName}-dashboard`,
          path: `${basePath}/dashboard`,
          name: `${screen.title} Dashboard`,
          module: moduleName,
          httpMethod: 'GET',
          isPublic: false,
          permissions: [`${moduleName}.view`],
          parameters: [],
          relatedTable: screen.tableName,
          children: [],
          metadata: {
            description: `Dashboard for ${screen.title}`,
            tags: [moduleName, 'screen', 'dashboard'],
            version: '1.0',
            deprecated: false,
            cacheEnabled: true,
            cacheTTL: 60,
          },
        });
        break;
    }
  }

  /**
   * Build navigation structure
   */
  private buildNavigation(): NavigationGroup[] {
    const groups = new Map<string, NavigationGroup>();

    for (const [key, module] of this.modules) {
      const moduleRoutes = this.routes.filter(r => r.module === key);

      if (moduleRoutes.length === 0) continue;

      // Determine navigation group
      const groupKey = this.getNavigationGroupKey(module);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: `nav-group-${groupKey}`,
          title: this.getNavigationGroupTitle(groupKey),
          icon: this.getNavigationGroupIcon(groupKey),
          order: this.getNavigationGroupOrder(groupKey),
          items: [],
          permissions: [],
          isExpanded: true,
        });
      }

      const group = groups.get(groupKey)!;

      // Add navigation items for this module
      const mainRoute = moduleRoutes.find(r =>
        r.httpMethod === 'GET' &&
        !r.path.includes('/:') &&
        !r.path.includes('/api/')
      );

      if (mainRoute) {
        group.items.push({
          id: `nav-${key}`,
          label: module.name,
          path: mainRoute.path,
          icon: this.getModuleIcon(module),
          order: module.layer * 100 + groups.get(groupKey)!.items.length,
          module: key,
          permissions: mainRoute.permissions,
          children: this.buildNavigationChildren(moduleRoutes, mainRoute.path),
          description: module.description,
        });
      }
    }

    // Sort and return
    return Array.from(groups.values())
      .sort((a, b) => a.order - b.order)
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => a.order - b.order),
      }));
  }

  /**
   * Build navigation children
   */
  private buildNavigationChildren(routes: RouteDefinition[], parentPath: string): NavigationItem[] {
    return routes
      .filter(r =>
        r.httpMethod === 'GET' &&
        r.path.startsWith(parentPath) &&
        r.path !== parentPath &&
        !r.path.includes('/api/')
      )
      .slice(0, 5) // Limit to 5 children
      .map((route, index) => ({
        id: `nav-${route.id}`,
        label: route.name,
        path: route.path,
        order: index,
        module: route.module,
        permissions: route.permissions,
        children: [],
      }));
  }

  /**
   * Build module summaries
   */
  private buildModuleSummaries(): ModuleRouteSummary[] {
    const summaries = new Map<string, ModuleRouteSummary>();

    for (const route of this.routes) {
      const existing = summaries.get(route.module) || {
        moduleKey: route.module,
        moduleName: this.modules.get(route.module)?.name || route.module,
        totalRoutes: 0,
        publicRoutes: 0,
        authenticatedRoutes: 0,
        routes: [],
      };

      existing.totalRoutes++;
      if (route.isPublic) {
        existing.publicRoutes++;
      } else {
        existing.authenticatedRoutes++;
      }
      existing.routes.push(route.id);

      summaries.set(route.module, existing);
    }

    return Array.from(summaries.values());
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(): URLRegistryStats {
    const publicRoutes = this.routes.filter(r => r.isPublic).length;
    const deprecatedRoutes = this.routes.filter(r => r.metadata.deprecated).length;
    const moduleCount = new Set(this.routes.map(r => r.module)).size;

    return {
      totalRoutes: this.routes.length,
      publicRoutes,
      authenticatedRoutes: this.routes.length - publicRoutes,
      moduleCount,
      avgRoutesPerModule: moduleCount > 0 ? Math.round(this.routes.length / moduleCount) : 0,
      deprecatedRoutes,
    };
  }

  /**
   * Add route to registry
   */
  private addRoute(route: RouteDefinition): void {
    // Check for duplicates
    const exists = this.routes.some(r =>
      r.path === route.path && r.httpMethod === route.httpMethod
    );
    if (!exists) {
      this.routes.push(route);
    }
  }

  /**
   * Generate route configuration file
   */
  generateRouteConfig(format: RouteConfigFormat = 'typescript'): string {
    switch (format) {
      case 'typescript':
        return this.generateTypeScriptConfig();
      case 'javascript':
        return this.generateJavaScriptConfig();
      case 'json':
        return this.generateJSONConfig();
      case 'yaml':
        return this.generateYAMLConfig();
      default:
        return this.generateTypeScriptConfig();
    }
  }

  /**
   * Generate TypeScript route configuration
   */
  private generateTypeScriptConfig(): string {
    const lines: string[] = [];

    lines.push('// =============================================================');
    lines.push('// Auto-generated Route Configuration');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// =============================================================');
    lines.push('');
    lines.push('import { RouteConfig } from "./types";');
    lines.push('');
    lines.push('export const routes: RouteConfig[] = [');

    for (const route of this.routes) {
      lines.push('  {');
      lines.push(`    id: "${route.id}",`);
      lines.push(`    path: "${route.path}",`);
      lines.push(`    name: "${route.name}",`);
      lines.push(`    module: "${route.module}",`);
      lines.push(`    httpMethod: "${route.httpMethod}",`);
      lines.push(`    isPublic: ${route.isPublic},`);
      lines.push(`    permissions: ${JSON.stringify(route.permissions)},`);
      if (route.parameters.length > 0) {
        lines.push(`    parameters: ${JSON.stringify(route.parameters, null, 2).split('\n').join('\n    ')},`);
      }
      lines.push('  },');
    }

    lines.push('];');
    lines.push('');
    lines.push('export default routes;');

    return lines.join('\n');
  }

  /**
   * Generate JavaScript route configuration
   */
  private generateJavaScriptConfig(): string {
    const lines: string[] = [];

    lines.push('// =============================================================');
    lines.push('// Auto-generated Route Configuration');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// =============================================================');
    lines.push('');

    lines.push('const routes = [');
    for (const route of this.routes) {
      lines.push('  {');
      lines.push(`    id: "${route.id}",`);
      lines.push(`    path: "${route.path}",`);
      lines.push(`    name: "${route.name}",`);
      lines.push(`    module: "${route.module}",`);
      lines.push(`    httpMethod: "${route.httpMethod}",`);
      lines.push(`    isPublic: ${route.isPublic},`);
      lines.push(`    permissions: ${JSON.stringify(route.permissions)},`);
      lines.push('  },');
    }
    lines.push('];');
    lines.push('');
    lines.push('module.exports = routes;');

    return lines.join('\n');
  }

  /**
   * Generate JSON route configuration
   */
  private generateJSONConfig(): string {
    return JSON.stringify({
      generated: new Date().toISOString(),
      routes: this.routes.map(r => ({
        id: r.id,
        path: r.path,
        name: r.name,
        module: r.module,
        httpMethod: r.httpMethod,
        isPublic: r.isPublic,
        permissions: r.permissions,
        parameters: r.parameters,
      })),
    }, null, 2);
  }

  /**
   * Generate YAML route configuration
   */
  private generateYAMLConfig(): string {
    const lines: string[] = [];

    lines.push(`# Auto-generated Route Configuration`);
    lines.push(`generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('routes:');

    for (const route of this.routes) {
      lines.push(`  - id: ${route.id}`);
      lines.push(`    path: ${route.path}`);
      lines.push(`    name: ${route.name}`);
      lines.push(`    module: ${route.module}`);
      lines.push(`    httpMethod: ${route.httpMethod}`);
      lines.push(`    isPublic: ${route.isPublic}`);
      lines.push(`    permissions:`);
      for (const perm of route.permissions) {
        lines.push(`      - ${perm}`);
      }
    }

    return lines.join('\n');
  }

  // Helper methods
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private toTitleCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  private toSingularPascal(name: string): string {
    let singular = name;
    if (singular.endsWith('ies')) {
      singular = singular.slice(0, -3) + 'y';
    } else if (singular.endsWith('ses') || singular.endsWith('xes')) {
      singular = singular.slice(0, -2);
    } else if (singular.endsWith('s') && !singular.endsWith('ss') && !singular.endsWith('us')) {
      singular = singular.slice(0, -1);
    }
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }

  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private featureToPath(feature: string): string {
    return this.slugify(feature);
  }

  private generateRouteName(path: string, method: string): string {
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || 'index';
    return `${method} ${this.toTitleCase(lastPart.replace(/:/g, ''))}`;
  }

  private extractPathParameters(path: string): RouteParameter[] {
    const params: RouteParameter[] = [];
    const matches = path.matchAll(/:(\w+)/g);
    for (const match of matches) {
      params.push({
        name: match[1],
        type: 'path',
        dataType: 'string',
        isRequired: true,
      });
    }
    return params;
  }

  private getNavigationGroupKey(module: ModuleDef): string {
    // Group by layer or priority
    if (module.layer <= 2) return 'core';
    if (module.priority === 'critical') return 'administration';
    if (module.revenue) return 'clinical';
    return 'support';
  }

  private getNavigationGroupTitle(key: string): string {
    const titles: Record<string, string> = {
      core: 'Core Modules',
      administration: 'Administration',
      clinical: 'Clinical Operations',
      support: 'Support Services',
    };
    return titles[key] || key;
  }

  private getNavigationGroupIcon(key: string): string {
    const icons: Record<string, string> = {
      core: 'LayoutDashboard',
      administration: 'Settings',
      clinical: 'Stethoscope',
      support: 'LifeBuoy',
    };
    return icons[key] || 'Folder';
  }

  private getNavigationGroupOrder(key: string): number {
    const orders: Record<string, number> = {
      core: 1,
      clinical: 2,
      administration: 3,
      support: 4,
    };
    return orders[key] || 5;
  }

  private getModuleIcon(module: ModuleDef): string {
    const key = module.key.toLowerCase();
    if (key.includes('patient')) return 'Users';
    if (key.includes('appointment')) return 'Calendar';
    if (key.includes('billing')) return 'CreditCard';
    if (key.includes('lab')) return 'FlaskConical';
    if (key.includes('pharmacy')) return 'Pill';
    if (key.includes('radiology')) return 'Scan';
    if (key.includes('nursing')) return 'HeartPulse';
    if (key.includes('inventory')) return 'Package';
    if (key.includes('report')) return 'FileText';
    if (key.includes('user')) return 'UserCog';
    return 'FolderOpen';
  }
}

/**
 * Create route registry generator
 */
export function createRouteRegistryGenerator(
  modules: ModuleDef[] = [],
  tables: TableDef[] = [],
  workflows: WorkflowDefinition[] = [],
  screens: ScreenBlueprint[] = []
): RouteRegistryGenerator {
  return new RouteRegistryGenerator(modules, tables, workflows, screens);
}
