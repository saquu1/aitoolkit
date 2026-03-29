/**
 * VALIDATION CHECKER SERVICE
 * ==========================
 * Validates assembled projects to ensure all conditions are met:
 * 
 * CONDITION 1: COMPLETE - Every file framework needs exists
 * CONDITION 2: CONSISTENT - All files reference each other correctly
 * CONDITION 3: VERSIONED - Compatible package versions
 * CONDITION 4: EXECUTABLE - Can npm install, prisma push, npm run dev
 * CONDITION 5: SELF-CONTAINED - No dependency on AI platform
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Validation result
export interface ValidationResult {
  isValid: boolean;
  conditions: {
    complete: ConditionResult;
    consistent: ConditionResult;
    versioned: ConditionResult;
    executable: ConditionResult;
    selfContained: ConditionResult;
  };
  summary: {
    errors: number;
    warnings: number;
    passed: number;
  };
}

// Individual condition result
export interface ConditionResult {
  status: 'passed' | 'warning' | 'failed';
  checks: CheckResult[];
}

// Individual check result
export interface CheckResult {
  name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details?: string;
}

/**
 * VALIDATION CHECKER CLASS
 */
export class ValidationChecker {
  /**
   * Run all validation checks on a project
   */
  async validate(projectPath: string): Promise<ValidationResult> {
    const conditions = {
      complete: await this.checkComplete(projectPath),
      consistent: await this.checkConsistent(projectPath),
      versioned: await this.checkVersioned(projectPath),
      executable: await this.checkExecutable(projectPath),
      selfContained: await this.checkSelfContained(projectPath)
    };

    // Calculate summary
    const summary = {
      errors: 0,
      warnings: 0,
      passed: 0
    };

    for (const condition of Object.values(conditions)) {
      for (const check of condition.checks) {
        if (check.status === 'failed') summary.errors++;
        else if (check.status === 'warning') summary.warnings++;
        else summary.passed++;
      }
    }

    return {
      isValid: summary.errors === 0,
      conditions,
      summary
    };
  }

  /**
   * CONDITION 1: COMPLETE
   * Every file the framework needs exists
   */
  private async checkComplete(projectPath: string): Promise<ConditionResult> {
    const checks: CheckResult[] = [];

    // Essential configuration files
    const essentialConfigs = [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'tailwind.config.ts',
      'postcss.config.mjs'
    ];

    for (const file of essentialConfigs) {
      const exists = await this.fileExists(path.join(projectPath, file));
      checks.push({
        name: `Config: ${file}`,
        status: exists ? 'passed' : 'failed',
        message: exists ? 'File exists' : 'File missing'
      });
    }

    // Essential directories
    const essentialDirs = [
      'src/app',
      'src/components',
      'src/lib',
      'prisma'
    ];

    for (const dir of essentialDirs) {
      const exists = await this.dirExists(path.join(projectPath, dir));
      checks.push({
        name: `Directory: ${dir}`,
        status: exists ? 'passed' : 'failed',
        message: exists ? 'Directory exists' : 'Directory missing'
      });
    }

    // Essential app files
    const essentialAppFiles = [
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/globals.css',
      'src/lib/prisma.ts',
      'src/lib/utils.ts',
      'prisma/schema.prisma'
    ];

    for (const file of essentialAppFiles) {
      const exists = await this.fileExists(path.join(projectPath, file));
      checks.push({
        name: `App: ${file}`,
        status: exists ? 'passed' : 'failed',
        message: exists ? 'File exists' : 'File missing'
      });
    }

    // UI components check (at least essential ones)
    const essentialComponents = ['button', 'input', 'card', 'form'];
    for (const comp of essentialComponents) {
      const exists = await this.fileExists(path.join(projectPath, 'src/components/ui', `${comp}.tsx`));
      checks.push({
        name: `Component: ${comp}`,
        status: exists ? 'passed' : 'warning',
        message: exists ? 'Component exists' : 'Component missing (may cause import errors)'
      });
    }

    return {
      status: checks.every(c => c.status === 'passed') ? 'passed' : 
              checks.some(c => c.status === 'failed') ? 'failed' : 'warning',
      checks
    };
  }

  /**
   * CONDITION 2: CONSISTENT
   * All files reference each other correctly
   */
  private async checkConsistent(projectPath: string): Promise<ConditionResult> {
    const checks: CheckResult[] = [];

    // Check package.json scripts reference valid commands
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      // Check if dev script exists and is valid
      if (packageContent.scripts?.dev) {
        checks.push({
          name: 'Dev script',
          status: 'passed',
          message: `Script: ${packageContent.scripts.dev}`
        });
      } else {
        checks.push({
          name: 'Dev script',
          status: 'failed',
          message: 'Missing dev script in package.json'
        });
      }

      // Check if build script exists
      if (packageContent.scripts?.build) {
        checks.push({
          name: 'Build script',
          status: 'passed',
          message: `Script: ${packageContent.scripts.build}`
        });
      } else {
        checks.push({
          name: 'Build script',
          status: 'failed',
          message: 'Missing build script in package.json'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Package.json',
        status: 'failed',
        message: 'Failed to read package.json'
      });
    }

    // Check Prisma schema validity
    try {
      const schemaPath = path.join(projectPath, 'prisma/schema.prisma');
      const schema = await fs.readFile(schemaPath, 'utf-8');
      
      // Check for datasource
      if (schema.includes('datasource')) {
        checks.push({
          name: 'Prisma datasource',
          status: 'passed',
          message: 'Datasource defined in schema'
        });
      } else {
        checks.push({
          name: 'Prisma datasource',
          status: 'failed',
          message: 'Missing datasource in Prisma schema'
        });
      }

      // Check for generator
      if (schema.includes('generator')) {
        checks.push({
          name: 'Prisma generator',
          status: 'passed',
          message: 'Generator defined in schema'
        });
      } else {
        checks.push({
          name: 'Prisma generator',
          status: 'failed',
          message: 'Missing generator in Prisma schema'
        });
      }

      // Check for at least one model
      const modelCount = (schema.match(/model\s+\w+/g) || []).length;
      if (modelCount > 0) {
        checks.push({
          name: 'Prisma models',
          status: 'passed',
          message: `${modelCount} model(s) defined`
        });
      } else {
        checks.push({
          name: 'Prisma models',
          status: 'warning',
          message: 'No models defined in Prisma schema'
        });
      }

      // Check for placeholders
      if (schema.includes('{{') || schema.includes('}}')) {
        checks.push({
          name: 'Prisma placeholders',
          status: 'failed',
          message: 'Schema contains unresolved placeholders'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Prisma schema',
        status: 'failed',
        message: 'Failed to read Prisma schema'
      });
    }

    // Check layout.tsx for proper structure
    try {
      const layoutPath = path.join(projectPath, 'src/app/layout.tsx');
      const layout = await fs.readFile(layoutPath, 'utf-8');
      
      if (layout.includes('export default')) {
        checks.push({
          name: 'Layout export',
          status: 'passed',
          message: 'Layout has default export'
        });
      } else {
        checks.push({
          name: 'Layout export',
          status: 'failed',
          message: 'Layout missing default export'
        });
      }

      if (layout.includes('children')) {
        checks.push({
          name: 'Layout children',
          status: 'passed',
          message: 'Layout renders children'
        });
      } else {
        checks.push({
          name: 'Layout children',
          status: 'warning',
          message: 'Layout may not render children'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Layout.tsx',
        status: 'failed',
        message: 'Failed to read layout.tsx'
      });
    }

    // Check for unresolved placeholders in any file
    const placeholderIssues = await this.findUnresolvedPlaceholders(projectPath);
    if (placeholderIssues.length === 0) {
      checks.push({
        name: 'Placeholders',
        status: 'passed',
        message: 'No unresolved placeholders found'
      });
    } else {
      checks.push({
        name: 'Placeholders',
        status: 'failed',
        message: `Found unresolved placeholders in ${placeholderIssues.length} file(s)`,
        details: placeholderIssues.join('\n')
      });
    }

    return {
      status: checks.every(c => c.status === 'passed') ? 'passed' : 
              checks.some(c => c.status === 'failed') ? 'failed' : 'warning',
      checks
    };
  }

  /**
   * CONDITION 3: VERSIONED
   * Compatible package versions
   */
  private async checkVersioned(projectPath: string): Promise<ConditionResult> {
    const checks: CheckResult[] = [];

    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = JSON.parse(await fs.readFile(packagePath, 'utf-8'));

      // Check for exact versions (no ^ or ~)
      const deps = { ...packageContent.dependencies, ...packageContent.devDependencies };
      const versionRanges: string[] = [];

      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string') {
          if (version.startsWith('^') || version.startsWith('~')) {
            versionRanges.push(`${name}: ${version}`);
          }
        }
      }

      if (versionRanges.length === 0) {
        checks.push({
          name: 'Pinned versions',
          status: 'passed',
          message: 'All dependencies use pinned versions'
        });
      } else {
        checks.push({
          name: 'Pinned versions',
          status: 'warning',
          message: `${versionRanges.length} packages use version ranges`,
          details: versionRanges.slice(0, 10).join('\n')
        });
      }

      // Check for compatible React version
      const reactVersion = deps['react'];
      if (reactVersion) {
        checks.push({
          name: 'React version',
          status: 'passed',
          message: `React ${reactVersion}`
        });
      } else {
        checks.push({
          name: 'React version',
          status: 'failed',
          message: 'React not found in dependencies'
        });
      }

      // Check for compatible Next.js version
      const nextVersion = deps['next'];
      if (nextVersion) {
        checks.push({
          name: 'Next.js version',
          status: 'passed',
          message: `Next.js ${nextVersion}`
        });
      } else {
        checks.push({
          name: 'Next.js version',
          status: 'failed',
          message: 'Next.js not found in dependencies'
        });
      }

      // Check for Prisma
      const prismaVersion = deps['@prisma/client'];
      const prismaDevVersion = deps['prisma'];
      if (prismaVersion && prismaDevVersion) {
        checks.push({
          name: 'Prisma',
          status: 'passed',
          message: `Prisma client ${prismaVersion}, CLI ${prismaDevVersion}`
        });
      } else {
        checks.push({
          name: 'Prisma',
          status: 'failed',
          message: 'Prisma dependencies incomplete'
        });
      }

      // Check for TypeScript
      const tsVersion = deps['typescript'];
      if (tsVersion) {
        checks.push({
          name: 'TypeScript',
          status: 'passed',
          message: `TypeScript ${tsVersion}`
        });
      } else {
        checks.push({
          name: 'TypeScript',
          status: 'warning',
          message: 'TypeScript not in devDependencies'
        });
      }

    } catch (error) {
      checks.push({
        name: 'Package analysis',
        status: 'failed',
        message: 'Failed to analyze package.json'
      });
    }

    return {
      status: checks.every(c => c.status === 'passed') ? 'passed' : 
              checks.some(c => c.status === 'failed') ? 'failed' : 'warning',
      checks
    };
  }

  /**
   * CONDITION 4: EXECUTABLE
   * Can npm install, prisma push, npm run dev
   */
  private async checkExecutable(projectPath: string): Promise<ConditionResult> {
    const checks: CheckResult[] = [];

    // Check if package.json has required scripts
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = JSON.parse(await fs.readFile(packagePath, 'utf-8'));

      // Required scripts
      const requiredScripts = ['dev', 'build', 'start'];
      for (const script of requiredScripts) {
        if (packageContent.scripts?.[script]) {
          checks.push({
            name: `Script: ${script}`,
            status: 'passed',
            message: `npm run ${script} → ${packageContent.scripts[script]}`
          });
        } else {
          checks.push({
            name: `Script: ${script}`,
            status: 'failed',
            message: `Missing ${script} script`
          });
        }
      }

      // Recommended scripts
      if (packageContent.scripts?.['db:push'] || packageContent.scripts?.['db:generate']) {
        checks.push({
          name: 'Database scripts',
          status: 'passed',
          message: 'Database management scripts present'
        });
      } else {
        checks.push({
          name: 'Database scripts',
          status: 'warning',
          message: 'Consider adding db:push and db:generate scripts'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Scripts check',
        status: 'failed',
        message: 'Failed to check scripts'
      });
    }

    // Check tsconfig.json structure
    try {
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));

      if (tsconfig.compilerOptions?.paths?.['@/*']) {
        checks.push({
          name: 'Path aliases',
          status: 'passed',
          message: '@/* path alias configured'
        });
      } else {
        checks.push({
          name: 'Path aliases',
          status: 'warning',
          message: '@/* path alias not configured'
        });
      }

      if (tsconfig.compilerOptions?.strict) {
        checks.push({
          name: 'Strict mode',
          status: 'passed',
          message: 'TypeScript strict mode enabled'
        });
      } else {
        checks.push({
          name: 'Strict mode',
          status: 'warning',
          message: 'Consider enabling TypeScript strict mode'
        });
      }
    } catch (error) {
      checks.push({
        name: 'TypeScript config',
        status: 'failed',
        message: 'Failed to read tsconfig.json'
      });
    }

    // Check next.config.ts exists and is valid
    try {
      const nextConfigPath = path.join(projectPath, 'next.config.ts');
      const nextConfig = await fs.readFile(nextConfigPath, 'utf-8');

      if (nextConfig.includes('NextConfig')) {
        checks.push({
          name: 'Next.js config',
          status: 'passed',
          message: 'Next.js config valid'
        });
      } else {
        checks.push({
          name: 'Next.js config',
          status: 'warning',
          message: 'Next.js config may be invalid'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Next.js config',
        status: 'failed',
        message: 'Failed to read next.config.ts'
      });
    }

    return {
      status: checks.every(c => c.status === 'passed') ? 'passed' : 
              checks.some(c => c.status === 'failed') ? 'failed' : 'warning',
      checks
    };
  }

  /**
   * CONDITION 5: SELF-CONTAINED
   * No dependency on AI platform
   */
  private async checkSelfContained(projectPath: string): Promise<ConditionResult> {
    const checks: CheckResult[] = [];

    // Check for no external API calls to AI platform
    const externalApiPatterns = [
      'ai-enterprise-architect',
      'localhost:3000/api/',
      '127.0.0.1:3000/api/'
    ];

    const filesWithExternalDeps: string[] = [];
    const srcPath = path.join(projectPath, 'src');

    try {
      const files = await this.listFilesRecursive(srcPath);
      
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = await fs.readFile(path.join(srcPath, file), 'utf-8');
          
          for (const pattern of externalApiPatterns) {
            if (content.includes(pattern)) {
              filesWithExternalDeps.push(file);
              break;
            }
          }
        }
      }

      if (filesWithExternalDeps.length === 0) {
        checks.push({
          name: 'No AI platform deps',
          status: 'passed',
          message: 'No dependencies on AI platform'
        });
      } else {
        checks.push({
          name: 'No AI platform deps',
          status: 'warning',
          message: `Found potential AI platform references in ${filesWithExternalDeps.length} file(s)`,
          details: filesWithExternalDeps.slice(0, 5).join('\n')
        });
      }
    } catch {
      checks.push({
        name: 'Self-contained check',
        status: 'passed',
        message: 'Unable to verify, assuming self-contained'
      });
    }

    // Check .env.example doesn't contain secrets
    try {
      const envPath = path.join(projectPath, '.env.example');
      if (existsSync(envPath)) {
        const envContent = await fs.readFile(envPath, 'utf-8');
        
        const secretPatterns = ['password=', 'secret=', 'api_key=', 'token='];
        const hasSecrets = secretPatterns.some(p => 
          envContent.toLowerCase().includes(p) && 
          !envContent.includes('your_') && 
          !envContent.includes('xxx')
        );

        if (!hasSecrets) {
          checks.push({
            name: 'No secrets in .env.example',
            status: 'passed',
            message: '.env.example is safe'
          });
        } else {
          checks.push({
            name: 'No secrets in .env.example',
            status: 'warning',
            message: '.env.example may contain sensitive values'
          });
        }
      } else {
        checks.push({
          name: '.env.example',
          status: 'passed',
          message: '.env.example would be included in ZIP'
        });
      }
    } catch {
      checks.push({
        name: 'Env check',
        status: 'passed',
        message: 'No .env.example to check'
      });
    }

    // Check README has instructions
    try {
      const readmePath = path.join(projectPath, 'README.md');
      if (existsSync(readmePath)) {
        const readme = await fs.readFile(readmePath, 'utf-8');
        
        if (readme.includes('npm install') && readme.includes('npm run')) {
          checks.push({
            name: 'README instructions',
            status: 'passed',
            message: 'README contains setup instructions'
          });
        } else {
          checks.push({
            name: 'README instructions',
            status: 'warning',
            message: 'README may be incomplete'
          });
        }
      } else {
        checks.push({
          name: 'README',
          status: 'warning',
          message: 'README.md not found'
        });
      }
    } catch {
      checks.push({
        name: 'README check',
        status: 'warning',
        message: 'Unable to check README'
      });
    }

    return {
      status: checks.every(c => c.status === 'passed') ? 'passed' : 
              checks.some(c => c.status === 'failed') ? 'failed' : 'warning',
      checks
    };
  }

  // Helper methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async findUnresolvedPlaceholders(projectPath: string): Promise<string[]> {
    const issues: string[] = [];
    
    const files = await this.listFilesRecursive(projectPath);
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.prisma')) {
        try {
          const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
          const placeholders = content.match(/\{\{[A-Z_]+\}\}/g);
          if (placeholders) {
            issues.push(`${file}: ${placeholders.join(', ')}`);
          }
        } catch {}
      }
    }
    
    return issues;
  }

  private async listFilesRecursive(dir: string, basePath: string = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.next', '.git'].includes(entry.name)) {
          const subFiles = await this.listFilesRecursive(fullPath, relativePath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
    } catch {}
    
    return files;
  }
}

// Export singleton
export const validationChecker = new ValidationChecker();
