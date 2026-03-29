// =============================================================================
// Documentation Generator - Multi-Format Documentation Engine
// =============================================================================
// Generates step-by-step tutorials, user manuals, developer documentation
// Supports export to Markdown, PDF, HTML, and DOCX formats
// =============================================================================

import { TableDef, ColumnDef, ModuleDef, ScreenBlueprint, ScreenField } from '../types';
import { WorkflowDefinition } from '../parsers/workflow-builder';

/**
 * Documentation types
 */
export type DocumentationType =
  | 'user_manual'
  | 'developer_guide'
  | 'api_reference'
  | 'tutorial'
  | 'quick_start'
  | 'faq'
  | 'release_notes'
  | 'changelog';

/**
 * Documentation output format
 */
export type DocumentationFormat = 'markdown' | 'html' | 'pdf' | 'docx' | 'json';

/**
 * Documentation section
 */
export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  order: number;
  subsections: DocumentationSection[];
  images?: DocumentationImage[];
  codeBlocks?: CodeBlock[];
  tables?: DocumentationTable[];
  warnings?: string[];
  tips?: string[];
  relatedLinks?: { label: string; url: string }[];
}

/**
 * Documentation image
 */
export interface DocumentationImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

/**
 * Code block
 */
export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  title?: string;
  lineNumbers?: boolean;
  highlightLines?: number[];
}

/**
 * Documentation table
 */
export interface DocumentationTable {
  id: string;
  headers: string[];
  rows: string[][];
  caption?: string;
}

/**
 * Complete document
 */
export interface Document {
  id: string;
  type: DocumentationType;
  title: string;
  description?: string;
  version: string;
  generatedAt: Date;
  author: string;
  sections: DocumentationSection[];
  metadata: DocumentMetadata;
  tableOfContents: TableOfContentsItem[];
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  moduleName?: string;
  targetAudience: 'end_user' | 'developer' | 'administrator' | 'all';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number; // minutes
  tags: string[];
  prerequisites?: string[];
}

/**
 * Table of contents item
 */
export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
  children: TableOfContentsItem[];
}

/**
 * Documentation Generator
 */
export class DocumentationGenerator {
  private documentId: string;

  constructor() {
    this.documentId = `doc-${Date.now()}`;
  }

  /**
   * Generate user manual for a module
   */
  generateUserManual(
    module: ModuleDef,
    screens: ScreenBlueprint[],
    tables: TableDef[]
  ): Document {
    const sections: DocumentationSection[] = [];

    // Introduction
    sections.push(this.generateIntroductionSection(module));

    // Getting Started
    sections.push(this.generateGettingStartedSection(module, screens));

    // Feature documentation
    for (const feature of module.features) {
      sections.push(this.generateFeatureSection(feature, module, screens, tables));
    }

    // Screens/Forms documentation
    for (const screen of screens.filter(s => module.tables.includes(s.tableName))) {
      sections.push(this.generateScreenDocumentation(screen, tables));
    }

    // Troubleshooting
    sections.push(this.generateTroubleshootingSection(module));

    // FAQ
    sections.push(this.generateFAQSection(module));

    // Build table of contents
    const tableOfContents = this.buildTableOfContents(sections);

    return {
      id: this.documentId,
      type: 'user_manual',
      title: `${module.name} - User Manual`,
      description: module.description,
      version: '1.0.0',
      generatedAt: new Date(),
      author: 'AI Enterprise Architect',
      sections,
      metadata: {
        moduleName: module.name,
        targetAudience: 'end_user',
        difficulty: 'beginner',
        estimatedReadTime: this.calculateReadTime(sections),
        tags: [module.key, 'user-manual', 'documentation'],
        prerequisites: [],
      },
      tableOfContents,
    };
  }

  /**
   * Generate developer documentation
   */
  generateDeveloperDocumentation(
    module: ModuleDef,
    tables: TableDef[],
    workflows: WorkflowDefinition[]
  ): Document {
    const sections: DocumentationSection[] = [];

    // Architecture Overview
    sections.push(this.generateArchitectureSection(module, tables));

    // Database Schema
    sections.push(this.generateDatabaseSchemaSection(module, tables));

    // API Documentation
    sections.push(this.generateAPIDocumentationSection(module, tables));

    // Workflow Documentation
    for (const workflow of workflows.filter(w => w.module === module.key)) {
      sections.push(this.generateWorkflowDocumentationSection(workflow));
    }

    // Code Examples
    sections.push(this.generateCodeExamplesSection(module, tables));

    // Best Practices
    sections.push(this.generateBestPracticesSection(module));

    const tableOfContents = this.buildTableOfContents(sections);

    return {
      id: this.documentId,
      type: 'developer_guide',
      title: `${module.name} - Developer Guide`,
      description: `Technical documentation for ${module.name} module`,
      version: '1.0.0',
      generatedAt: new Date(),
      author: 'AI Enterprise Architect',
      sections,
      metadata: {
        moduleName: module.name,
        targetAudience: 'developer',
        difficulty: 'intermediate',
        estimatedReadTime: this.calculateReadTime(sections),
        tags: [module.key, 'developer-guide', 'api', 'technical'],
        prerequisites: ['Basic programming knowledge', 'Familiarity with SQL'],
      },
      tableOfContents,
    };
  }

  /**
   * Generate step-by-step tutorial
   */
  generateTutorial(
    title: string,
    steps: TutorialStep[],
    moduleName: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Document {
    const sections: DocumentationSection[] = [];

    // Overview
    sections.push({
      id: 'tutorial-overview',
      title: 'Tutorial Overview',
      content: `This tutorial will guide you through: ${title}`,
      order: 1,
      subsections: [],
      tips: ['Take your time with each step', 'Don\'t hesitate to ask for help'],
    });

    // Prerequisites
    sections.push({
      id: 'tutorial-prerequisites',
      title: 'Prerequisites',
      content: 'Before starting this tutorial, ensure you have:',
      order: 2,
      subsections: [],
      warnings: ['Make sure you have the necessary permissions'],
    });

    // Tutorial steps
    for (let i = 0; i < steps.length; i++) {
      sections.push(this.tutorialStepToSection(steps[i], i + 3));
    }

    // Summary
    sections.push({
      id: 'tutorial-summary',
      title: 'Summary',
      content: 'Congratulations! You have completed this tutorial.',
      order: sections.length + 3,
      subsections: [],
    });

    const tableOfContents = this.buildTableOfContents(sections);

    return {
      id: this.documentId,
      type: 'tutorial',
      title,
      description: `Step-by-step tutorial: ${title}`,
      version: '1.0.0',
      generatedAt: new Date(),
      author: 'AI Enterprise Architect',
      sections,
      metadata: {
        moduleName,
        targetAudience: 'end_user',
        difficulty,
        estimatedReadTime: this.calculateReadTime(sections),
        tags: [moduleName, 'tutorial', 'step-by-step'],
      },
      tableOfContents,
    };
  }

  /**
   * Generate quick start guide
   */
  generateQuickStartGuide(
    module: ModuleDef,
    screens: ScreenBlueprint[]
  ): Document {
    const sections: DocumentationSection[] = [];

    // Welcome
    sections.push({
      id: 'qs-welcome',
      title: 'Welcome',
      content: `Get started with ${module.name} in just a few minutes.`,
      order: 1,
      subsections: [],
    });

    // Quick Setup
    sections.push({
      id: 'qs-setup',
      title: 'Quick Setup',
      content: 'Follow these simple steps to get started:',
      order: 2,
      subsections: [],
      codeBlocks: [{
        id: 'qs-setup-code',
        language: 'bash',
        code: `# Navigate to ${module.name}\nClick on ${module.name} in the navigation menu`,
      }],
    });

    // First Action
    const firstScreen = screens[0];
    if (firstScreen) {
      sections.push({
        id: 'qs-first-action',
        title: 'Your First Action',
        content: `Learn how to ${firstScreen.screenType === 'form' ? 'create' : 'view'} your first record.`,
        order: 3,
        subsections: [],
        tips: [
          'Look for the "Add New" button to create records',
          'Use the search bar to find existing records',
        ],
      });
    }

    const tableOfContents = this.buildTableOfContents(sections);

    return {
      id: this.documentId,
      type: 'quick_start',
      title: `${module.name} - Quick Start Guide`,
      version: '1.0.0',
      generatedAt: new Date(),
      author: 'AI Enterprise Architect',
      sections,
      metadata: {
        moduleName: module.name,
        targetAudience: 'end_user',
        difficulty: 'beginner',
        estimatedReadTime: 5,
        tags: [module.key, 'quick-start'],
      },
      tableOfContents,
    };
  }

  /**
   * Generate API reference documentation
   */
  generateAPIReference(
    module: ModuleDef,
    tables: TableDef[]
  ): Document {
    const sections: DocumentationSection[] = [];

    // API Overview
    sections.push({
      id: 'api-overview',
      title: 'API Overview',
      content: `RESTful API documentation for ${module.name} module.`,
      order: 1,
      subsections: [],
      codeBlocks: [{
        id: 'api-base-url',
        language: 'http',
        code: `Base URL: /api/${module.key.toLowerCase()}`,
      }],
    });

    // Endpoints for each table
    for (const tableName of module.tables) {
      const table = tables.find(t => t.tableName === tableName);
      if (table) {
        sections.push(this.generateTableAPIDocumentation(table, module));
      }
    }

    // Authentication
    sections.push({
      id: 'api-authentication',
      title: 'Authentication',
      content: 'All API requests require authentication.',
      order: sections.length + 1,
      subsections: [],
      codeBlocks: [{
        id: 'auth-example',
        language: 'http',
        code: `Authorization: Bearer <your-token>`,
      }],
    });

    // Error handling
    sections.push({
      id: 'api-errors',
      title: 'Error Handling',
      content: 'API returns standard HTTP status codes.',
      order: sections.length + 2,
      subsections: [],
      tables: [{
        id: 'error-codes-table',
        headers: ['Code', 'Description'],
        rows: [
          ['200', 'Success'],
          ['201', 'Created'],
          ['400', 'Bad Request'],
          ['401', 'Unauthorized'],
          ['403', 'Forbidden'],
          ['404', 'Not Found'],
          ['500', 'Internal Server Error'],
        ],
      }],
    });

    const tableOfContents = this.buildTableOfContents(sections);

    return {
      id: this.documentId,
      type: 'api_reference',
      title: `${module.name} - API Reference`,
      version: '1.0.0',
      generatedAt: new Date(),
      author: 'AI Enterprise Architect',
      sections,
      metadata: {
        moduleName: module.name,
        targetAudience: 'developer',
        difficulty: 'intermediate',
        estimatedReadTime: this.calculateReadTime(sections),
        tags: [module.key, 'api', 'reference', 'rest'],
      },
      tableOfContents,
    };
  }

  /**
   * Export document to specified format
   */
  exportDocument(document: Document, format: DocumentationFormat): string {
    switch (format) {
      case 'markdown':
        return this.toMarkdown(document);
      case 'html':
        return this.toHTML(document);
      case 'json':
        return this.toJSON(document);
      case 'pdf':
        return this.toPDFReady(document);
      case 'docx':
        return this.toDOCXReady(document);
      default:
        return this.toMarkdown(document);
    }
  }

  /**
   * Convert document to Markdown
   */
  private toMarkdown(document: Document): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${document.title}`);
    lines.push('');
    if (document.description) {
      lines.push(`> ${document.description}`);
      lines.push('');
    }
    lines.push(`**Version:** ${document.version}`);
    lines.push(`**Generated:** ${document.generatedAt.toISOString().split('T')[0]}`);
    lines.push(`**Estimated Read Time:** ${document.metadata.estimatedReadTime} minutes`);
    lines.push('');

    // Table of Contents
    lines.push('## Table of Contents');
    lines.push('');
    for (const item of document.tableOfContents) {
      this.addTOCItemToMarkdown(lines, item, 0);
    }
    lines.push('');

    // Sections
    for (const section of document.sections) {
      this.addSectionToMarkdown(lines, section, 2);
    }

    return lines.join('\n');
  }

  /**
   * Add TOC item to Markdown
   */
  private addTOCItemToMarkdown(lines: string[], item: TableOfContentsItem, level: number): void {
    const indent = '  '.repeat(level);
    lines.push(`${indent}- [${item.title}](#${item.id})`);
    for (const child of item.children) {
      this.addTOCItemToMarkdown(lines, child, level + 1);
    }
  }

  /**
   * Add section to Markdown
   */
  private addSectionToMarkdown(lines: string[], section: DocumentationSection, level: number): void {
    const heading = '#'.repeat(level);
    lines.push(`${heading} ${section.title}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');

    // Warnings
    if (section.warnings && section.warnings.length > 0) {
      for (const warning of section.warnings) {
        lines.push(`> ⚠️ **Warning:** ${warning}`);
        lines.push('');
      }
    }

    // Tips
    if (section.tips && section.tips.length > 0) {
      for (const tip of section.tips) {
        lines.push(`> 💡 **Tip:** ${tip}`);
        lines.push('');
      }
    }

    // Code blocks
    if (section.codeBlocks) {
      for (const block of section.codeBlocks) {
        if (block.title) {
          lines.push(`**${block.title}:**`);
          lines.push('');
        }
        lines.push(`\`\`\`${block.language}`);
        lines.push(block.code);
        lines.push('```');
        lines.push('');
      }
    }

    // Tables
    if (section.tables) {
      for (const table of section.tables) {
        if (table.caption) {
          lines.push(`*${table.caption}*`);
          lines.push('');
        }
        lines.push(`| ${table.headers.join(' | ')} |`);
        lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
        for (const row of table.rows) {
          lines.push(`| ${row.join(' | ')} |`);
        }
        lines.push('');
      }
    }

    // Images
    if (section.images) {
      for (const image of section.images) {
        lines.push(`![${image.alt}](${image.src})`);
        if (image.caption) {
          lines.push(`*${image.caption}*`);
        }
        lines.push('');
      }
    }

    // Subsections
    for (const subsection of section.subsections) {
      this.addSectionToMarkdown(lines, subsection, level + 1);
    }

    lines.push('---');
    lines.push('');
  }

  /**
   * Convert document to HTML
   */
  private toHTML(document: Document): string {
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('<meta charset="UTF-8">');
    lines.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    lines.push(`<title>${document.title}</title>`);
    lines.push('<style>');
    lines.push('body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }');
    lines.push('h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }');
    lines.push('h2 { color: #2d3748; margin-top: 30px; }');
    lines.push('pre { background: #f7fafc; padding: 15px; border-radius: 5px; overflow-x: auto; }');
    lines.push('code { background: #f7fafc; padding: 2px 6px; border-radius: 3px; }');
    lines.push('.warning { background: #fef3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }');
    lines.push('.tip { background: #d4edda; border-left: 4px solid #28a745; padding: 10px; margin: 10px 0; }');
    lines.push('</style>');
    lines.push('</head>');
    lines.push('<body>');

    lines.push(`<h1>${document.title}</h1>`);
    if (document.description) {
      lines.push(`<p><em>${document.description}</em></p>`);
    }

    // Table of Contents
    lines.push('<h2>Table of Contents</h2>');
    lines.push('<nav>');
    for (const item of document.tableOfContents) {
      this.addTOCItemToHTML(lines, item);
    }
    lines.push('</nav>');

    // Sections
    for (const section of document.sections) {
      this.addSectionToHTML(lines, section, 2);
    }

    lines.push('<footer>');
    lines.push(`<p><small>Generated: ${document.generatedAt.toISOString()}</small></p>`);
    lines.push('</footer>');
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Add TOC item to HTML
   */
  private addTOCItemToHTML(lines: string[], item: TableOfContentsItem): void {
    lines.push(`<a href="#${item.id}">${item.title}</a>`);
    if (item.children.length > 0) {
      lines.push('<ul>');
      for (const child of item.children) {
        lines.push('<li>');
        this.addTOCItemToHTML(lines, child);
        lines.push('</li>');
      }
      lines.push('</ul>');
    }
  }

  /**
   * Add section to HTML
   */
  private addSectionToHTML(lines: string[], section: DocumentationSection, level: number): void {
    lines.push(`<h${level} id="${section.id}">${section.title}</h${level}>`);
    lines.push(`<p>${section.content}</p>`);

    if (section.warnings) {
      for (const warning of section.warnings) {
        lines.push(`<div class="warning"><strong>⚠️ Warning:</strong> ${warning}</div>`);
      }
    }

    if (section.tips) {
      for (const tip of section.tips) {
        lines.push(`<div class="tip"><strong>💡 Tip:</strong> ${tip}</div>`);
      }
    }

    if (section.codeBlocks) {
      for (const block of section.codeBlocks) {
        lines.push(`<pre><code class="language-${block.language}">${this.escapeHTML(block.code)}</code></pre>`);
      }
    }

    if (section.tables) {
      for (const table of section.tables) {
        lines.push('<table>');
        lines.push('<thead><tr>');
        for (const header of table.headers) {
          lines.push(`<th>${header}</th>`);
        }
        lines.push('</tr></thead>');
        lines.push('<tbody>');
        for (const row of table.rows) {
          lines.push('<tr>');
          for (const cell of row) {
            lines.push(`<td>${cell}</td>`);
          }
          lines.push('</tr>');
        }
        lines.push('</tbody>');
        lines.push('</table>');
      }
    }

    for (const subsection of section.subsections) {
      this.addSectionToHTML(lines, subsection, level + 1);
    }
  }

  /**
   * Convert document to JSON
   */
  private toJSON(document: Document): string {
    return JSON.stringify(document, null, 2);
  }

  /**
   * Generate PDF-ready content (HTML formatted for PDF conversion)
   */
  private toPDFReady(document: Document): string {
    return this.toHTML(document); // PDF is typically generated from HTML
  }

  /**
   * Generate DOCX-ready content (structured for DOCX conversion)
   */
  private toDOCXReady(document: Document): string {
    return this.toMarkdown(document); // DOCX tools often accept Markdown
  }

  // Section generation helpers
  private generateIntroductionSection(module: ModuleDef): DocumentationSection {
    return {
      id: 'introduction',
      title: 'Introduction',
      content: `${module.name} is a module for ${module.description}. This user manual will guide you through all the features and functionality available.`,
      order: 1,
      subsections: [
        {
          id: 'introduction-purpose',
          title: 'Purpose',
          content: `The ${module.name} module helps you manage ${module.tables.join(', ')} data efficiently.`,
          order: 1,
          subsections: [],
        },
        {
          id: 'introduction-features',
          title: 'Key Features',
          content: module.features.join('\n- '),
          order: 2,
          subsections: [],
        },
      ],
    };
  }

  private generateGettingStartedSection(module: ModuleDef, screens: ScreenBlueprint[]): DocumentationSection {
    return {
      id: 'getting-started',
      title: 'Getting Started',
      content: 'Follow these steps to start using this module.',
      order: 2,
      subsections: [
        {
          id: 'gs-access',
          title: 'Accessing the Module',
          content: `To access ${module.name}, navigate to the ${module.name} menu item in the main navigation.`,
          order: 1,
          subsections: [],
          tips: ['Bookmark frequently used pages for quick access'],
        },
        {
          id: 'gs-permissions',
          title: 'Required Permissions',
          content: 'Contact your administrator if you need access to this module.',
          order: 2,
          subsections: [],
        },
      ],
    };
  }

  private generateFeatureSection(
    feature: string,
    module: ModuleDef,
    screens: ScreenBlueprint[],
    tables: TableDef[]
  ): DocumentationSection {
    return {
      id: `feature-${this.slugify(feature)}`,
      title: feature,
      content: `This section describes the ${feature} feature.`,
      order: 3 + module.features.indexOf(feature),
      subsections: [],
      tips: [`Use this feature to enhance your ${module.name} workflow`],
    };
  }

  private generateScreenDocumentation(screen: ScreenBlueprint, tables: TableDef[]): DocumentationSection {
    const table = tables.find(t => t.tableName === screen.tableName);

    return {
      id: `screen-${screen.tableName}`,
      title: screen.title,
      content: `Documentation for the ${screen.screenType} screen: ${screen.title}.`,
      order: 100 + screen.fields.length,
      subsections: [
        {
          id: `screen-${screen.tableName}-fields`,
          title: 'Fields',
          content: 'The following fields are available on this screen.',
          order: 1,
          subsections: [],
          tables: [{
            id: 'fields-table',
            headers: ['Field', 'Type', 'Required', 'Description'],
            rows: screen.fields.map(f => [
              f.label,
              f.uiType,
              f.isRequired ? 'Yes' : 'No',
              f.placeholder || '',
            ]),
          }],
        },
      ],
    };
  }

  private generateTroubleshootingSection(module: ModuleDef): DocumentationSection {
    return {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: 'Common issues and their solutions.',
      order: 999,
      subsections: [
        {
          id: 'ts-permission',
          title: 'Permission Denied',
          content: 'If you see a permission denied error, contact your administrator.',
          order: 1,
          subsections: [],
        },
        {
          id: 'ts-notfound',
          title: 'Record Not Found',
          content: 'The record you are looking for may have been deleted or you may not have access.',
          order: 2,
          subsections: [],
        },
      ],
    };
  }

  private generateFAQSection(module: ModuleDef): DocumentationSection {
    return {
      id: 'faq',
      title: 'Frequently Asked Questions',
      content: 'Common questions about this module.',
      order: 1000,
      subsections: [],
    };
  }

  private generateArchitectureSection(module: ModuleDef, tables: TableDef[]): DocumentationSection {
    return {
      id: 'architecture',
      title: 'Architecture Overview',
      content: `The ${module.name} module follows a layered architecture pattern.`,
      order: 1,
      subsections: [],
      codeBlocks: [{
        id: 'arch-diagram',
        language: 'text',
        code: `${module.name}\n├── Presentation Layer (UI)\n├── Business Logic Layer (Services)\n├── Data Access Layer (Repositories)\n└── Database Layer (${tables.length} tables)`,
      }],
    };
  }

  private generateDatabaseSchemaSection(module: ModuleDef, tables: TableDef[]): DocumentationSection {
    const moduleTables = tables.filter(t => module.tables.includes(t.tableName));

    return {
      id: 'database-schema',
      title: 'Database Schema',
      content: `The ${module.name} module uses ${moduleTables.length} database tables.`,
      order: 2,
      subsections: moduleTables.map((table, index) => ({
        id: `table-${table.tableName}`,
        title: table.tableName,
        content: `Table: ${table.tableName} (${table.columns.length} columns)`,
        order: index + 1,
        subsections: [],
        tables: [{
          id: `columns-${table.tableName}`,
          headers: ['Column', 'Type', 'Nullable', 'PK'],
          rows: table.columns.slice(0, 10).map(c => [
            c.name,
            c.dataType,
            c.isNullable ? 'Yes' : 'No',
            c.isPrimaryKey ? 'Yes' : 'No',
          ]),
        }],
      })),
    };
  }

  private generateAPIDocumentationSection(module: ModuleDef, tables: TableDef[]): DocumentationSection {
    return {
      id: 'api-documentation',
      title: 'API Endpoints',
      content: `RESTful API endpoints for ${module.name}.`,
      order: 3,
      subsections: [],
    };
  }

  private generateWorkflowDocumentationSection(workflow: WorkflowDefinition): DocumentationSection {
    return {
      id: `workflow-${workflow.id}`,
      title: workflow.name,
      content: workflow.description,
      order: 200 + workflow.steps.length,
      subsections: workflow.steps.map((step, index) => ({
        id: `step-${step.id}`,
        title: `Step ${step.order}: ${step.name}`,
        content: step.description,
        order: index + 1,
        subsections: [],
      })),
    };
  }

  private generateCodeExamplesSection(module: ModuleDef, tables: TableDef[]): DocumentationSection {
    const table = tables.find(t => module.tables.includes(t.tableName));

    return {
      id: 'code-examples',
      title: 'Code Examples',
      content: 'Example code for common operations.',
      order: 5,
      subsections: [
        {
          id: 'example-create',
          title: 'Creating a Record',
          content: 'Example API call to create a new record.',
          order: 1,
          subsections: [],
          codeBlocks: [{
            id: 'create-code',
            language: 'javascript',
            code: `// Create a new ${table?.tableName || 'record'}\nconst response = await fetch('/api/${module.key.toLowerCase()}', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    // Add your data here\n  })\n});`,
          }],
        },
      ],
    };
  }

  private generateBestPracticesSection(module: ModuleDef): DocumentationSection {
    return {
      id: 'best-practices',
      title: 'Best Practices',
      content: `Recommended practices for working with ${module.name}.`,
      order: 6,
      subsections: [],
      tips: [
        'Always validate input data before submission',
        'Use transactions for operations that modify multiple tables',
        'Implement proper error handling',
        'Follow the principle of least privilege for permissions',
      ],
    };
  }

  private generateTableAPIDocumentation(table: TableDef, module: ModuleDef): DocumentationSection {
    const basePath = `/api/${table.tableName.toLowerCase()}`;

    return {
      id: `api-${table.tableName}`,
      title: `${table.tableName} API`,
      content: `CRUD operations for ${table.tableName}.`,
      order: 10 + module.tables.indexOf(table.tableName),
      subsections: [],
      codeBlocks: [
        {
          id: 'api-get',
          language: 'http',
          code: `GET ${basePath}\nGET ${basePath}/:id`,
          title: 'Read Operations',
        },
        {
          id: 'api-post',
          language: 'http',
          code: `POST ${basePath}\nContent-Type: application/json\n\n{ /* record data */ }`,
          title: 'Create Operation',
        },
        {
          id: 'api-put',
          language: 'http',
          code: `PUT ${basePath}/:id\nContent-Type: application/json\n\n{ /* updated data */ }`,
          title: 'Update Operation',
        },
        {
          id: 'api-delete',
          language: 'http',
          code: `DELETE ${basePath}/:id`,
          title: 'Delete Operation',
        },
      ],
    };
  }

  private tutorialStepToSection(step: TutorialStep, order: number): DocumentationSection {
    return {
      id: `step-${step.id}`,
      title: step.title,
      content: step.description,
      order,
      subsections: [],
      tips: step.tips,
      warnings: step.warnings,
      images: step.screenshot ? [{
        id: `img-${step.id}`,
        src: step.screenshot,
        alt: step.title,
      }] : undefined,
    };
  }

  // Utility methods
  private buildTableOfContents(sections: DocumentationSection[]): TableOfContentsItem[] {
    return sections.map(section => ({
      id: section.id,
      title: section.title,
      level: 1,
      children: section.subsections.map(sub => ({
        id: sub.id,
        title: sub.title,
        level: 2,
        children: sub.subsections.map(s => ({
          id: s.id,
          title: s.title,
          level: 3,
          children: [],
        })),
      })),
    }));
  }

  private calculateReadTime(sections: DocumentationSection[]): number {
    const totalWords = sections.reduce((acc, section) => {
      const sectionWords = section.content.split(/\s+/).length;
      const subsectionWords = section.subsections.reduce(
        (subAcc, sub) => subAcc + sub.content.split(/\s+/).length,
        0
      );
      return acc + sectionWords + subsectionWords;
    }, 0);

    // Average reading speed: 200 words per minute
    return Math.max(1, Math.ceil(totalWords / 200));
  }

  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Tutorial step interface
 */
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  tips?: string[];
  warnings?: string[];
  screenshot?: string;
  expectedOutcome?: string;
}

/**
 * Create documentation generator
 */
export function createDocumentationGenerator(): DocumentationGenerator {
  return new DocumentationGenerator();
}

/**
 * Quick documentation generation
 */
export function generateQuickUserManual(
  module: ModuleDef,
  screens: ScreenBlueprint[],
  tables: TableDef[]
): string {
  const generator = new DocumentationGenerator();
  const document = generator.generateUserManual(module, screens, tables);
  return generator.exportDocument(document, 'markdown');
}
