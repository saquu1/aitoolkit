/**
 * TEMPLATE MANAGER SERVICE
 * ========================
 * Manages project templates: loading, copying, validating, and preparing for generation.
 * 
 * Templates are stored in /templates/{framework}/ and contain:
 * - All configuration files (package.json, tsconfig.json, etc.)
 * - Base application structure
 * - UI components
 * - Placeholder variables that get replaced during generation
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Template root directory
const TEMPLATES_ROOT = path.join(process.cwd(), 'templates');

// Supported frameworks
export type SupportedFramework = 
  | 'nextjs-react'     // Next.js 15 + React 19 + App Router
  | 'nextjs-pages'     // Next.js Pages Router (legacy)
  | 'laravel'          // Laravel PHP
  | 'dotnet-mvc'       // ASP.NET Core MVC
  | 'flutter';         // Flutter/Dart

// Template manifest interface
export interface TemplateManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  framework: string;
  language: string;
  features: string[];
  requiredFiles: string[];
  placeholderVariables: string[];
  generatedDirectories: string[];
}

// Template info
export interface TemplateInfo {
  id: SupportedFramework;
  name: string;
  description: string;
  path: string;
  manifest: TemplateManifest | null;
  fileCount: number;
  isValid: boolean;
  errors: string[];
}

/**
 * TEMPLATE MANAGER CLASS
 */
export class TemplateManager {
  private templatesPath: string;

  constructor(customPath?: string) {
    this.templatesPath = customPath || TEMPLATES_ROOT;
  }

  /**
   * Get list of all available templates
   */
  async listTemplates(): Promise<TemplateInfo[]> {
    const templates: TemplateInfo[] = [];
    
    try {
      const dirs = await fs.readdir(this.templatesPath);
      
      for (const dir of dirs) {
        const templatePath = path.join(this.templatesPath, dir);
        const stat = await fs.stat(templatePath);
        
        if (stat.isDirectory()) {
          const info = await this.getTemplateInfo(dir as SupportedFramework);
          templates.push(info);
        }
      }
    } catch (error) {
      console.error('Error listing templates:', error);
    }
    
    return templates;
  }

  /**
   * Get detailed info about a specific template
   */
  async getTemplateInfo(templateId: SupportedFramework): Promise<TemplateInfo> {
    const templatePath = path.join(this.templatesPath, templateId);
    const errors: string[] = [];
    let manifest: TemplateManifest | null = null;
    let fileCount = 0;
    let isValid = true;

    // Check if template directory exists
    if (!existsSync(templatePath)) {
      errors.push(`Template directory not found: ${templatePath}`);
      isValid = false;
      return {
        id: templateId,
        name: templateId,
        description: '',
        path: templatePath,
        manifest: null,
        fileCount: 0,
        isValid: false,
        errors
      };
    }

    // Load manifest
    try {
      const manifestPath = path.join(templatePath, 'template-manifest.json');
      if (existsSync(manifestPath)) {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
      } else {
        errors.push('Missing template-manifest.json');
        isValid = false;
      }
    } catch (error) {
      errors.push(`Failed to parse manifest: ${error}`);
      isValid = false;
    }

    // Count files
    try {
      fileCount = await this.countFilesRecursive(templatePath);
    } catch (error) {
      errors.push(`Failed to count files: ${error}`);
    }

    // Validate required files
    if (manifest) {
      for (const requiredFile of manifest.requiredFiles) {
        const filePath = path.join(templatePath, requiredFile);
        if (!existsSync(filePath)) {
          errors.push(`Missing required file: ${requiredFile}`);
          isValid = false;
        }
      }
    }

    return {
      id: templateId,
      name: manifest?.name || templateId,
      description: manifest?.description || '',
      path: templatePath,
      manifest,
      fileCount,
      isValid,
      errors
    };
  }

  /**
   * Copy template to a target directory
   */
  async copyTemplate(
    templateId: SupportedFramework,
    targetPath: string,
    options?: {
      includeNodeModules?: boolean;
      overwriteExisting?: boolean;
    }
  ): Promise<{ success: boolean; filesCopied: number; errors: string[] }> {
    const errors: string[] = [];
    let filesCopied = 0;

    const templatePath = path.join(this.templatesPath, templateId);
    
    // Validate template exists
    if (!existsSync(templatePath)) {
      return {
        success: false,
        filesCopied: 0,
        errors: [`Template not found: ${templateId}`]
      };
    }

    // Check target
    if (existsSync(targetPath) && !options?.overwriteExisting) {
      return {
        success: false,
        filesCopied: 0,
        errors: [`Target directory already exists: ${targetPath}`]
      };
    }

    try {
      // Create target directory
      await fs.mkdir(targetPath, { recursive: true });

      // Copy all files recursively
      filesCopied = await this.copyDirectoryRecursive(
        templatePath,
        targetPath,
        options?.includeNodeModules ? [] : ['node_modules', '.next', '.git']
      );

      return { success: true, filesCopied, errors };
    } catch (error) {
      errors.push(`Failed to copy template: ${error}`);
      return { success: false, filesCopied, errors };
    }
  }

  /**
   * Replace placeholder variables in template files
   */
  async replacePlaceholders(
    targetPath: string,
    replacements: Record<string, string>
  ): Promise<{ success: boolean; filesModified: number; errors: string[] }> {
    const errors: string[] = [];
    let filesModified = 0;

    try {
      const files = await this.listFilesRecursive(targetPath);
      
      for (const file of files) {
        // Only process text files
        if (this.isTextFile(file)) {
          const filePath = path.join(targetPath, file);
          try {
            let content = await fs.readFile(filePath, 'utf-8');
            let modified = false;

            for (const [placeholder, value] of Object.entries(replacements)) {
              const placeholderPattern = `{{${placeholder}}}`;
              if (content.includes(placeholderPattern)) {
                content = content.split(placeholderPattern).join(value);
                modified = true;
              }
            }

            if (modified) {
              await fs.writeFile(filePath, content);
              filesModified++;
            }
          } catch (error) {
            // Binary file or permission issue, skip
          }
        }
      }

      return { success: true, filesModified, errors };
    } catch (error) {
      errors.push(`Failed to replace placeholders: ${error}`);
      return { success: false, filesModified, errors };
    }
  }

  /**
   * Validate template structure
   */
  async validateTemplate(templateId: SupportedFramework): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    missingFiles: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFiles: string[] = [];

    const info = await this.getTemplateInfo(templateId);

    if (!info.isValid) {
      errors.push(...info.errors);
      return { isValid: false, errors, warnings, missingFiles };
    }

    // Check essential files
    const essentialFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'tailwind.config.ts',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/lib/prisma.ts',
      'prisma/schema.prisma'
    ];

    for (const file of essentialFiles) {
      const filePath = path.join(info.path, file);
      if (!existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      errors.push(`Missing essential files: ${missingFiles.join(', ')}`);
    }

    // Check package.json structure
    try {
      const packagePath = path.join(info.path, 'package.json');
      const packageContent = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      if (!packageContent.dependencies) {
        warnings.push('package.json missing dependencies');
      }
      if (!packageContent.scripts?.dev) {
        errors.push('package.json missing dev script');
      }
      if (!packageContent.scripts?.build) {
        errors.push('package.json missing build script');
      }

      // Check for version ranges (should use exact versions)
      const deps = { ...packageContent.dependencies, ...packageContent.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string' && version.startsWith('^')) {
          warnings.push(`Consider pinning version: ${name} (${version})`);
        }
      }
    } catch (error) {
      errors.push(`Failed to validate package.json: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingFiles
    };
  }

  /**
   * Get template file content
   */
  async getTemplateFile(
    templateId: SupportedFramework,
    relativePath: string
  ): Promise<string> {
    const filePath = path.join(this.templatesPath, templateId, relativePath);
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Set template file content
   */
  async setTemplateFile(
    templateId: SupportedFramework,
    relativePath: string,
    content: string
  ): Promise<void> {
    const filePath = path.join(this.templatesPath, templateId, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }

  // Helper methods
  private async countFilesRecursive(dir: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += await this.countFilesRecursive(fullPath);
      } else {
        count++;
      }
    }
    
    return count;
  }

  private async copyDirectoryRecursive(
    source: string,
    target: string,
    exclude: string[]
  ): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip excluded directories
      if (exclude.includes(entry.name)) continue;
      
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      
      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        count += await this.copyDirectoryRecursive(sourcePath, targetPath, exclude);
      } else {
        await fs.copyFile(sourcePath, targetPath);
        count++;
      }
    }
    
    return count;
  }

  private async listFilesRecursive(dir: string, basePath: string = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursive(fullPath, relativePath);
          files.push(...subFiles);
        } else {
          files.push(relativePath);
        }
      }
    } catch {}
    
    return files;
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss',
      '.html', '.xml', '.yaml', '.yml', '.txt', '.env', '.prisma',
      '.mdx', '.config', '.eslintrc', '.prettierrc'
    ];
    
    const ext = path.extname(filename).toLowerCase();
    return textExtensions.includes(ext) || 
           filename.startsWith('.') ||
           filename.includes('.config');
  }
}

// Export singleton
export const templateManager = new TemplateManager();
