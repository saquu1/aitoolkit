/**
 * PROJECT ASSEMBLER SERVICE
 * =========================
 * Assembles a complete project from template + generated code.
 * 
 * This is the core service that:
 * 1. Copies template to temp location
 * 2. Inserts generated Prisma models
 * 3. Inserts generated TypeScript types
 * 4. Inserts generated React components
 * 5. Inserts generated API routes
 * 6. Updates package.json with dependencies
 * 7. Updates navigation with new routes
 * 8. Validates the complete project
 */

import fs from 'fs/promises';
import path from 'path';
import { TemplateManager, SupportedFramework, templateManager } from './template-manager';

// Generated content structure
export interface GeneratedContent {
  // Project metadata
  projectName: string;
  projectDescription?: string;
  
  // Prisma models
  prismaModels: string;
  
  // TypeScript types
  types: {
    fileName: string;
    content: string;
    moduleName: string;
  }[];
  
  // Zod validation schemas
  validations: {
    fileName: string;
    content: string;
    moduleName: string;
  }[];
  
  // React components
  components: {
    fileName: string;
    content: string;
    moduleName: string;
    type: 'form' | 'table' | 'card' | 'page';
  }[];
  
  // API routes
  apiRoutes: {
    path: string;        // e.g., 'patients/route.ts'
    content: string;
    moduleName: string;
    methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[];
  }[];
  
  // Pages
  pages: {
    path: string;        // e.g., 'patients/page.tsx'
    content: string;
    moduleName: string;
    type: 'list' | 'form' | 'detail';
  }[];
  
  // Hooks
  hooks: {
    fileName: string;
    content: string;
    moduleName: string;
  }[];
  
  // Navigation items
  navigation: {
    name: string;
    href: string;
    icon: string;
    moduleName: string;
  }[];
  
  // Additional dependencies
  dependencies?: Record<string, string>;
}

// Assembly result
export interface AssemblyResult {
  success: boolean;
  outputPath: string;
  filesCreated: number;
  errors: string[];
  warnings: string[];
  manifest: AssemblyManifest;
}

// Assembly manifest
export interface AssemblyManifest {
  projectName: string;
  templateUsed: SupportedFramework;
  assembledAt: Date;
  modules: string[];
  files: {
    path: string;
    type: 'template' | 'generated';
    size: number;
  }[];
  totalSize: number;
}

/**
 * PROJECT ASSEMBLER CLASS
 */
export class ProjectAssembler {
  private templateManager: TemplateManager;
  private outputBasePath: string;

  constructor() {
    this.templateManager = templateManager;
    this.outputBasePath = path.join(process.cwd(), 'storage', 'assembled');
  }

  /**
   * Assemble a complete project from template and generated content
   */
  async assemble(
    content: GeneratedContent,
    options?: {
      template?: SupportedFramework;
      outputPath?: string;
      includeNodeModules?: boolean;
    }
  ): Promise<AssemblyResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const templateId = options?.template || 'nextjs-react';
    let filesCreated = 0;
    const manifestFiles: AssemblyManifest['files'] = [];

    // Determine output path
    const outputPath = options?.outputPath || 
      path.join(this.outputBasePath, content.projectName, Date.now().toString());

    try {
      // Step 1: Copy template
      const copyResult = await this.templateManager.copyTemplate(
        templateId,
        outputPath,
        { includeNodeModules: options?.includeNodeModules || false }
      );

      if (!copyResult.success) {
        return {
          success: false,
          outputPath,
          filesCreated: 0,
          errors: copyResult.errors,
          warnings: [],
          manifest: this.createEmptyManifest(content.projectName, templateId)
        };
      }

      filesCreated += copyResult.filesCopied;

      // Step 2: Replace base placeholders
      const baseReplacements = {
        PROJECT_NAME: content.projectName,
        PROJECT_DESCRIPTION: content.projectDescription || `Generated application for ${content.projectName}`,
        MODELS: content.prismaModels,
        NAVIGATION_CARDS: this.generateNavigationCards(content.navigation)
      };

      await this.templateManager.replacePlaceholders(outputPath, baseReplacements);

      // Step 3: Write Prisma models
      await this.writePrismaModels(outputPath, content.prismaModels);

      // Step 4: Write TypeScript types
      for (const type of content.types) {
        const filePath = await this.writeTypeFile(outputPath, type);
        manifestFiles.push({ path: filePath, type: 'generated', size: type.content.length });
        filesCreated++;
      }

      // Step 5: Write validation schemas
      for (const validation of content.validations) {
        const filePath = await this.writeValidationFile(outputPath, validation);
        manifestFiles.push({ path: filePath, type: 'generated', size: validation.content.length });
        filesCreated++;
      }

      // Step 6: Write React components
      for (const component of content.components) {
        const filePath = await this.writeComponentFile(outputPath, component);
        manifestFiles.push({ path: filePath, type: 'generated', size: component.content.length });
        filesCreated++;
      }

      // Step 7: Write API routes
      for (const route of content.apiRoutes) {
        const filePath = await this.writeApiRoute(outputPath, route);
        manifestFiles.push({ path: filePath, type: 'generated', size: route.content.length });
        filesCreated++;
      }

      // Step 8: Write pages
      for (const page of content.pages) {
        const filePath = await this.writePageFile(outputPath, page);
        manifestFiles.push({ path: filePath, type: 'generated', size: page.content.length });
        filesCreated++;
      }

      // Step 9: Write hooks
      for (const hook of content.hooks) {
        const filePath = await this.writeHookFile(outputPath, hook);
        manifestFiles.push({ path: filePath, type: 'generated', size: hook.content.length });
        filesCreated++;
      }

      // Step 10: Update package.json with additional dependencies
      if (content.dependencies && Object.keys(content.dependencies).length > 0) {
        await this.updatePackageJson(outputPath, content.dependencies);
      }

      // Step 11: Write navigation configuration
      await this.writeNavigationConfig(outputPath, content.navigation);

      // Step 12: Write assembly manifest
      const manifest: AssemblyManifest = {
        projectName: content.projectName,
        templateUsed: templateId,
        assembledAt: new Date(),
        modules: [...new Set(content.types.map(t => t.moduleName))],
        files: manifestFiles,
        totalSize: manifestFiles.reduce((sum, f) => sum + f.size, 0)
      };

      await fs.writeFile(
        path.join(outputPath, 'assembly-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Step 13: Validate the assembled project
      const validationResult = await this.validateAssembledProject(outputPath);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      return {
        success: errors.length === 0,
        outputPath,
        filesCreated,
        errors,
        warnings,
        manifest
      };
    } catch (error) {
      errors.push(`Assembly failed: ${error}`);
      return {
        success: false,
        outputPath,
        filesCreated,
        errors,
        warnings,
        manifest: this.createEmptyManifest(content.projectName, templateId)
      };
    }
  }

  /**
   * Generate navigation cards for home page
   */
  private generateNavigationCards(navigation: GeneratedContent['navigation']): string {
    if (navigation.length === 0) {
      return `
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Your application is ready</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400">No modules generated yet. Start by creating your first module.</p>
          </CardContent>
        </Card>
      `;
    }

    return navigation.map(nav => `
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary">${nav.icon}</span>
              ${nav.name}
            </CardTitle>
            <CardDescription>Manage ${nav.name.toLowerCase()} records</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="${nav.href}">
              <Button className="w-full">View ${nav.name}</Button>
            </Link>
          </CardContent>
        </Card>
    `).join('\n');
  }

  /**
   * Write Prisma models to schema file
   */
  private async writePrismaModels(outputPath: string, models: string): Promise<void> {
    const prismaPath = path.join(outputPath, 'prisma', 'schema.prisma');
    
    // Read existing schema template
    let schema = await fs.readFile(prismaPath, 'utf-8');
    
    // Replace MODELS placeholder
    schema = schema.replace('{{MODELS}}', models);
    
    await fs.writeFile(prismaPath, schema);
  }

  /**
   * Write TypeScript type file
   */
  private async writeTypeFile(
    outputPath: string,
    type: GeneratedContent['types'][0]
  ): Promise<string> {
    const dirPath = path.join(outputPath, 'src', 'types');
    await fs.mkdir(dirPath, { recursive: true });
    
    const filePath = path.join(dirPath, type.fileName);
    await fs.writeFile(filePath, type.content);
    
    return `src/types/${type.fileName}`;
  }

  /**
   * Write validation schema file
   */
  private async writeValidationFile(
    outputPath: string,
    validation: GeneratedContent['validations'][0]
  ): Promise<string> {
    const dirPath = path.join(outputPath, 'src', 'lib', 'validations');
    await fs.mkdir(dirPath, { recursive: true });
    
    const filePath = path.join(dirPath, validation.fileName);
    await fs.writeFile(filePath, validation.content);
    
    return `src/lib/validations/${validation.fileName}`;
  }

  /**
   * Write React component file
   */
  private async writeComponentFile(
    outputPath: string,
    component: GeneratedContent['components'][0]
  ): Promise<string> {
    const dirPath = path.join(outputPath, 'src', 'components', component.moduleName);
    await fs.mkdir(dirPath, { recursive: true });
    
    const filePath = path.join(dirPath, component.fileName);
    await fs.writeFile(filePath, component.content);
    
    return `src/components/${component.moduleName}/${component.fileName}`;
  }

  /**
   * Write API route file
   */
  private async writeApiRoute(
    outputPath: string,
    route: GeneratedContent['apiRoutes'][0]
  ): Promise<string> {
    const dirPath = path.join(outputPath, 'src', 'app', 'api', route.path);
    await fs.mkdir(dirPath, { recursive: true });
    
    const filePath = path.join(dirPath, 'route.ts');
    await fs.writeFile(filePath, route.content);
    
    return `src/app/api/${route.path}/route.ts`;
  }

  /**
   * Write page file
   */
  private async writePageFile(
    outputPath: string,
    page: GeneratedContent['pages'][0]
  ): Promise<string> {
    const dirPath = path.join(outputPath, 'src', 'app', path.dirname(page.path));
    await fs.mkdir(dirPath, { recursive: true });
    
    const fileName = path.basename(page.path);
    const filePath = path.join(dirPath, fileName);
    await fs.writeFile(filePath, page.content);
    
    return `src/app/${page.path}`;
  }

  /**
   * Write hook file
   */
  private async writeHookFile(
    outputPath: string,
    hook: GeneratedContent['hooks'][0]
  ): Promise<string> {
    const dirPath = path.join(outputPath, 'src', 'hooks');
    await fs.mkdir(dirPath, { recursive: true });
    
    const filePath = path.join(dirPath, hook.fileName);
    await fs.writeFile(filePath, hook.content);
    
    return `src/hooks/${hook.fileName}`;
  }

  /**
   * Update package.json with additional dependencies
   */
  private async updatePackageJson(
    outputPath: string,
    dependencies: Record<string, string>
  ): Promise<void> {
    const packagePath = path.join(outputPath, 'package.json');
    const packageContent = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
    
    // Add new dependencies
    packageContent.dependencies = {
      ...packageContent.dependencies,
      ...dependencies
    };
    
    await fs.writeFile(packagePath, JSON.stringify(packageContent, null, 2));
  }

  /**
   * Write navigation configuration
   */
  private async writeNavigationConfig(
    outputPath: string,
    navigation: GeneratedContent['navigation']
  ): Promise<string> {
    const configPath = path.join(outputPath, 'src', 'lib', 'navigation.ts');
    
    const configContent = `/**
 * Navigation Configuration
 * Generated by AI Enterprise Architect
 */

import { ${navigation.map(n => n.icon).join(', ')} } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

export const mainNavigation: NavItem[] = [
  ${navigation.map(n => `{
    name: '${n.name}',
    href: '${n.href}',
    icon: ${n.icon},
  },`).join('\n  ')}
];

export default mainNavigation;
`;

    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, configContent);
    
    return 'src/lib/navigation.ts';
  }

  /**
   * Validate assembled project
   */
  private async validateAssembledProject(outputPath: string): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check essential files exist
    const essentialFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'prisma/schema.prisma'
    ];

    for (const file of essentialFiles) {
      const filePath = path.join(outputPath, file);
      try {
        await fs.access(filePath);
      } catch {
        errors.push(`Missing essential file: ${file}`);
      }
    }

    // Check Prisma schema is valid (basic check)
    try {
      const schemaPath = path.join(outputPath, 'prisma', 'schema.prisma');
      const schema = await fs.readFile(schemaPath, 'utf-8');
      
      if (schema.includes('{{MODELS}}')) {
        warnings.push('Prisma schema still contains {{MODELS}} placeholder');
      }
      
      if (!schema.includes('model ')) {
        warnings.push('Prisma schema contains no models');
      }
    } catch {
      errors.push('Failed to read Prisma schema');
    }

    // Check package.json has required scripts
    try {
      const packagePath = path.join(outputPath, 'package.json');
      const packageContent = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      if (!packageContent.scripts?.dev) {
        errors.push('package.json missing dev script');
      }
      if (!packageContent.scripts?.build) {
        errors.push('package.json missing build script');
      }
    } catch {
      errors.push('Failed to read package.json');
    }

    return { errors, warnings };
  }

  /**
   * Create empty manifest for error cases
   */
  private createEmptyManifest(projectName: string, templateId: SupportedFramework): AssemblyManifest {
    return {
      projectName,
      templateUsed: templateId,
      assembledAt: new Date(),
      modules: [],
      files: [],
      totalSize: 0
    };
  }
}

// Export singleton
export const projectAssembler = new ProjectAssembler();
