// =============================================================================
// URL Generator Agent - Intelligent Route Generation
// =============================================================================
// Generates routes from controller/action patterns, builds URL registry per
// module, creates navigation structure, and generates route configuration files
// =============================================================================

import { RouteRegistryGenerator, URLRegistry, RouteDefinition, NavigationGroup, RouteConfigFormat } from '../generators/RouteRegistry';
import { WorkflowDefinition } from '../parsers/workflow-builder';
import { TableDef, ModuleDef, ScreenBlueprint, APIEndpointSpec } from '../types';

/**
 * URL Generator Agent Configuration
 */
export interface URLGeneratorConfig {
  projectId: string;
  projectName: string;
  includeAPIRoutes: boolean;
  includeScreenRoutes: boolean;
  includeWorkflowRoutes: boolean;
  generateNavigation: boolean;
  defaultVersion: string;
  basePath: string;
}

/**
 * Discovered Controller/Action Pattern
 */
export interface DiscoveredPattern {
  controller: string;
  action: string;
  suggestedPath: string;
  httpMethod: string;
  confidence: number;
  source: 'cshtml' | 'javascript' | 'stored_procedure' | 'manual';
}

/**
 * URL Generation Result
 */
export interface URLGenerationResult {
  registry: URLRegistry;
  discoveredPatterns: DiscoveredPattern[];
  routeConfig: string;
  navigationConfig: string;
  statistics: {
    totalRoutesGenerated: number;
    newRoutesDiscovered: number;
    deprecatedRoutes: number;
    generationTimeMs: number;
  };
}

/**
 * Navigation Configuration
 */
export interface NavigationConfig {
  groups: NavigationGroup[];
  quickLinks: QuickLink[];
  breadcrumbs: BreadcrumbConfig[];
}

/**
 * Quick Link
 */
export interface QuickLink {
  id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
}

/**
 * Breadcrumb Configuration
 */
export interface BreadcrumbConfig {
  route: string;
  breadcrumbs: { label: string; path: string }[];
}

/**
 * URL Generator Agent
 */
export class URLGeneratorAgent {
  private config: URLGeneratorConfig;
  private registryGenerator: RouteRegistryGenerator;
  private discoveredPatterns: DiscoveredPattern[] = [];

  constructor(config: URLGeneratorConfig) {
    this.config = config;
    this.registryGenerator = new RouteRegistryGenerator();
  }

  /**
   * Generate complete URL infrastructure
   */
  generateURLInfrastructure(
    modules: ModuleDef[],
    tables: TableDef[],
    workflows: WorkflowDefinition[],
    screens: ScreenBlueprint[],
    apiEndpoints: APIEndpointSpec[] = []
  ): URLGenerationResult {
    const startTime = Date.now();

    // Initialize registry generator with data
    this.registryGenerator = new RouteRegistryGenerator(modules, tables, workflows, screens);

    // Generate URL registry
    const registry = this.registryGenerator.generateRegistry(
      this.config.projectId,
      this.config.projectName
    );

    // Discover additional patterns from API endpoints
    const discoveredPatterns = this.discoverPatternsFromAPIs(apiEndpoints);
    this.discoveredPatterns.push(...discoveredPatterns);

    // Generate route configuration
    const routeConfig = this.registryGenerator.generateRouteConfig('typescript');

    // Generate navigation configuration
    const navigationConfig = this.generateNavigationConfig(registry);

    // Calculate statistics
    const statistics = {
      totalRoutesGenerated: registry.routes.length,
      newRoutesDiscovered: discoveredPatterns.length,
      deprecatedRoutes: registry.routes.filter(r => r.metadata.deprecated).length,
      generationTimeMs: Date.now() - startTime,
    };

    return {
      registry,
      discoveredPatterns: this.discoveredPatterns,
      routeConfig,
      navigationConfig,
      statistics,
    };
  }

  /**
   * Discover URL patterns from API endpoints
   */
  private discoverPatternsFromAPIs(endpoints: APIEndpointSpec[]): DiscoveredPattern[] {
    const patterns: DiscoveredPattern[] = [];

    for (const endpoint of endpoints) {
      // Extract controller and action from path
      const parts = endpoint.path.split('/').filter(Boolean);
      const controller = parts[1] || 'home';
      const action = parts[2] || 'index';

      patterns.push({
        controller: this.toPascalCase(controller),
        action: this.toPascalCase(action),
        suggestedPath: endpoint.path,
        httpMethod: endpoint.method,
        confidence: 85,
        source: 'javascript',
      });
    }

    return patterns;
  }

  /**
   * Generate route from controller/action pattern
   */
  generateRouteFromPattern(pattern: DiscoveredPattern): RouteDefinition {
    const basePath = pattern.suggestedPath ||
      `/${this.toKebabCase(pattern.controller)}/${this.toKebabCase(pattern.action)}`;

    return {
      id: `route-${pattern.controller}-${pattern.action}-${Date.now()}`,
      path: basePath,
      name: `${pattern.action} ${pattern.controller}`,
      module: pattern.controller,
      controller: pattern.controller,
      action: pattern.action,
      httpMethod: pattern.httpMethod as RouteDefinition['httpMethod'],
      isPublic: false,
      permissions: [`${pattern.controller}.${pattern.action}`],
      parameters: [],
      children: [],
      metadata: {
        description: `Generated from ${pattern.source}`,
        tags: [pattern.controller, pattern.action],
        version: this.config.defaultVersion,
        deprecated: false,
        cacheEnabled: false,
      },
    };
  }

  /**
   * Generate URL registry for a specific module
   */
  generateModuleURLRegistry(
    module: ModuleDef,
    tables: TableDef[],
    workflows: WorkflowDefinition[]
  ): URLRegistry {
    const generator = new RouteRegistryGenerator([module], tables, workflows, []);
    return generator.generateRegistry(this.config.projectId, module.name);
  }

  /**
   * Build navigation structure from routes
   */
  private generateNavigationConfig(registry: URLRegistry): string {
    const config: NavigationConfig = {
      groups: registry.navigation,
      quickLinks: this.buildQuickLinks(registry.routes),
      breadcrumbs: this.buildBreadcrumbConfigs(registry.routes),
    };

    return this.toNavigationTypeScript(config);
  }

  /**
   * Build quick links from most used routes
   */
  private buildQuickLinks(routes: RouteDefinition[]): QuickLink[] {
    return routes
      .filter(r =>
        r.httpMethod === 'GET' &&
        !r.path.includes('/api/') &&
        !r.path.includes('/:')
      )
      .slice(0, 10)
      .map((route, index) => ({
        id: `quicklink-${route.id}`,
        label: route.name,
        path: route.path,
        icon: this.inferIcon(route),
        order: index,
      }));
  }

  /**
   * Build breadcrumb configurations
   */
  private buildBreadcrumbConfigs(routes: RouteDefinition[]): BreadcrumbConfig[] {
    return routes
      .filter(r => r.path.includes('/:') && r.httpMethod === 'GET')
      .map(route => ({
        route: route.path,
        breadcrumbs: this.generateBreadcrumbs(route),
      }));
  }

  /**
   * Generate breadcrumbs for a route
   */
  private generateBreadcrumbs(route: RouteDefinition): { label: string; path: string }[] {
    const parts = route.path.split('/').filter(Boolean);
    const breadcrumbs: { label: string; path: string }[] = [];

    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;

      if (!part.startsWith(':')) {
        breadcrumbs.push({
          label: this.toTitleCase(part),
          path: currentPath,
        });
      } else {
        breadcrumbs.push({
          label: `:${part.slice(1)}`,
          path: currentPath,
        });
      }
    }

    return breadcrumbs;
  }

  /**
   * Convert navigation config to TypeScript
   */
  private toNavigationTypeScript(config: NavigationConfig): string {
    const lines: string[] = [];

    lines.push('// =============================================================');
    lines.push('// Auto-generated Navigation Configuration');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// =============================================================');
    lines.push('');
    lines.push('import { NavigationGroup, QuickLink, BreadcrumbConfig } from "./types";');
    lines.push('');
    lines.push('export const navigationGroups: NavigationGroup[] = ');
    lines.push(JSON.stringify(config.groups, null, 2));
    lines.push(';');
    lines.push('');
    lines.push('export const quickLinks: QuickLink[] = ');
    lines.push(JSON.stringify(config.quickLinks, null, 2));
    lines.push(';');
    lines.push('');
    lines.push('export const breadcrumbConfigs: BreadcrumbConfig[] = ');
    lines.push(JSON.stringify(config.breadcrumbs, null, 2));
    lines.push(';');
    lines.push('');
    lines.push('export default {');
    lines.push('  navigationGroups,');
    lines.push('  quickLinks,');
    lines.push('  breadcrumbConfigs,');
    lines.push('};');

    return lines.join('\n');
  }

  /**
   * Generate route configuration file for specific framework
   */
  generateFrameworkRoutes(
    framework: 'nextjs' | 'react-router' | 'vue-router' | 'angular',
    routes: RouteDefinition[]
  ): string {
    switch (framework) {
      case 'nextjs':
        return this.generateNextJSRoutes(routes);
      case 'react-router':
        return this.generateReactRouterRoutes(routes);
      case 'vue-router':
        return this.generateVueRouterRoutes(routes);
      case 'angular':
        return this.generateAngularRoutes(routes);
      default:
        return this.generateNextJSRoutes(routes);
    }
  }

  /**
   * Generate Next.js route configuration
   */
  private generateNextJSRoutes(routes: RouteDefinition[]): string {
    const lines: string[] = [];

    lines.push('// Next.js Route Configuration');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('import { NextRequest, NextResponse } from "next/server";');
    lines.push('');

    for (const route of routes.filter(r => r.path.startsWith('/api/'))) {
      const functionName = `${route.httpMethod.toLowerCase()}Handler_${this.sanitizeForFunction(route.id)}`;
      lines.push(`export async function ${functionName}(req: NextRequest) {`);
      lines.push(`  // Handler for ${route.name}`);
      lines.push(`  // Path: ${route.path}`);
      lines.push(`  // Permissions: ${route.permissions.join(', ')}`);
      lines.push(`  return NextResponse.json({ message: "${route.name}" });`);
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate React Router configuration
   */
  private generateReactRouterRoutes(routes: RouteDefinition[]): string {
    const lines: string[] = [];

    lines.push('// React Router Configuration');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('import { createBrowserRouter } from "react-router-dom";');
    lines.push('');

    lines.push('export const router = createBrowserRouter([');
    for (const route of routes.filter(r => r.httpMethod === 'GET' && !r.path.startsWith('/api/'))) {
      lines.push('  {');
      lines.push(`    path: "${route.path}",`);
      lines.push(`    element: <${this.toComponentName(route.name)} />,`);
      if (route.permissions.length > 0) {
        lines.push(`    // Required permissions: ${route.permissions.join(', ')}`);
      }
      lines.push('  },');
    }
    lines.push(']);');

    return lines.join('\n');
  }

  /**
   * Generate Vue Router configuration
   */
  private generateVueRouterRoutes(routes: RouteDefinition[]): string {
    const lines: string[] = [];

    lines.push('// Vue Router Configuration');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('import { createRouter, createWebHistory } from "vue-router";');
    lines.push('');

    lines.push('const routes = [');
    for (const route of routes.filter(r => r.httpMethod === 'GET' && !r.path.startsWith('/api/'))) {
      lines.push('  {');
      lines.push(`    path: "${route.path}",`);
      lines.push(`    name: "${route.id}",`);
      lines.push(`    component: () => import("@/views/${this.toComponentName(route.name)}.vue"),`);
      if (route.permissions.length > 0) {
        lines.push(`    meta: { permissions: ${JSON.stringify(route.permissions)} },`);
      }
      lines.push('  },');
    }
    lines.push('];');
    lines.push('');
    lines.push('const router = createRouter({');
    lines.push('  history: createWebHistory(),');
    lines.push('  routes,');
    lines.push('});');
    lines.push('');
    lines.push('export default router;');

    return lines.join('\n');
  }

  /**
   * Generate Angular route configuration
   */
  private generateAngularRoutes(routes: RouteDefinition[]): string {
    const lines: string[] = [];

    lines.push('// Angular Route Configuration');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('import { Routes } from "@angular/router";');
    lines.push('');

    lines.push('export const routes: Routes = [');
    for (const route of routes.filter(r => r.httpMethod === 'GET' && !r.path.startsWith('/api/'))) {
      lines.push('  {');
      lines.push(`    path: "${route.path.slice(1)}",`);
      lines.push(`    component: ${this.toComponentName(route.name)}Component,`);
      if (route.permissions.length > 0) {
        lines.push(`    canActivate: [AuthGuard],`);
        lines.push(`    data: { permissions: ${JSON.stringify(route.permissions)} },`);
      }
      lines.push('  },');
    }
    lines.push('];');

    return lines.join('\n');
  }

  /**
   * Generate sitemap.xml content
   */
  generateSitemap(baseUrl: string, routes: RouteDefinition[]): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    for (const route of routes.filter(r => r.httpMethod === 'GET' && r.isPublic)) {
      lines.push('  <url>');
      lines.push(`    <loc>${baseUrl}${route.path}</loc>`);
      lines.push(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
      lines.push(`    <changefreq>weekly</changefreq>`);
      lines.push(`    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>`);
      lines.push('  </url>');
    }

    lines.push('</urlset>');

    return lines.join('\n');
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(baseUrl: string, publicPaths: string[]): string {
    const lines: string[] = [];

    lines.push('User-agent: *');
    lines.push('Allow: /');

    for (const path of publicPaths) {
      lines.push(`Allow: ${path}`);
    }

    lines.push('');
    lines.push('Disallow: /api/');
    lines.push('Disallow: /admin/');
    lines.push('Disallow: /private/');
    lines.push('');
    lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);

    return lines.join('\n');
  }

  // Helper methods
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, c => c.toUpperCase());
  }

  private toTitleCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  private toComponentName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private sanitizeForFunction(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private inferIcon(route: RouteDefinition): string {
    const path = route.path.toLowerCase();
    if (path.includes('patient')) return 'Users';
    if (path.includes('appointment')) return 'Calendar';
    if (path.includes('billing')) return 'CreditCard';
    if (path.includes('lab')) return 'FlaskConical';
    if (path.includes('report')) return 'FileText';
    if (path.includes('dashboard')) return 'LayoutDashboard';
    if (path.includes('settings')) return 'Settings';
    return 'File';
  }
}

/**
 * Create URL Generator Agent
 */
export function createURLGeneratorAgent(config: URLGeneratorConfig): URLGeneratorAgent {
  return new URLGeneratorAgent(config);
}

/**
 * Quick URL registry generation
 */
export function generateQuickURLRegistry(
  projectId: string,
  projectName: string,
  modules: ModuleDef[],
  tables: TableDef[]
): URLRegistry {
  const generator = new RouteRegistryGenerator(modules, tables, [], []);
  return generator.generateRegistry(projectId, projectName);
}
