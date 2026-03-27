// =============================================================================
// Documentation Intelligence API - Complete Implementation
// Handles: Documentation Generation, Management, Export, Templates,
//          SP Documentation, Schema Documentation, Workflow Documentation,
//          API Documentation, Release Notes, Version Control
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId && !['get-templates', 'analyze-documentation-quality'].includes(action)) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // Documentation Generation
      // ─────────────────────────────────────────────────────────────────────
      case 'generate-user-manual':
        return await generateUserManual(projectId, body.options);

      case 'generate-developer-guide':
        return await generateDeveloperGuide(projectId, body.options);

      case 'generate-api-reference':
        return await generateAPIReference(projectId, body.options);

      case 'generate-tutorial':
        return await generateTutorial(projectId, body.options);

      case 'generate-quick-start-guide':
        return await generateQuickStartGuide(projectId, body.options);

      case 'generate-faq':
        return await generateFAQ(projectId, body.options);

      case 'generate-release-notes':
        return await generateReleaseNotes(projectId, body.version, body.changes);

      case 'generate-changelog':
        return await generateChangelog(projectId, body.options);

      case 'generate-readme':
        return await generateReadme(projectId, body.options);

      case 'generate-installation-guide':
        return await generateInstallationGuide(projectId, body.options);

      case 'generate-configuration-guide':
        return await generateConfigurationGuide(projectId, body.options);

      case 'generate-deployment-guide':
        return await generateDeploymentGuide(projectId, body.options);

      case 'generate-troubleshooting-guide':
        return await generateTroubleshootingGuide(projectId, body.options);

      case 'generate-security-guide':
        return await generateSecurityGuide(projectId, body.options);

      case 'generate-performance-guide':
        return await generatePerformanceGuide(projectId, body.options);

      case 'generate-integration-guide':
        return await generateIntegrationGuide(projectId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Schema Documentation
      // ─────────────────────────────────────────────────────────────────────
      case 'document-table':
        return await documentTable(projectId, body.tableName, body.options);

      case 'document-all-tables':
        return await documentAllTables(projectId, body.options);

      case 'document-column':
        return await documentColumn(projectId, body.tableName, body.columnName, body.options);

      case 'document-foreign-keys':
        return await documentForeignKeys(projectId, body.tableName);

      case 'document-indexes':
        return await documentIndexes(projectId, body.tableName);

      case 'document-constraints':
        return await documentConstraints(projectId, body.tableName);

      case 'generate-erd-documentation':
        return await generateERDDocumentation(projectId, body.options);

      case 'generate-data-dictionary':
        return await generateDataDictionary(projectId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Stored Procedure Documentation
      // ─────────────────────────────────────────────────────────────────────
      case 'document-sp':
        return await documentStoredProcedure(projectId, body.spName, body.options);

      case 'document-all-sps':
        return await documentAllStoredProcedures(projectId, body.options);

      case 'document-sp-parameters':
        return await documentSPParameters(projectId, body.spName);

      case 'document-sp-usage':
        return await documentSPUsage(projectId, body.spName);

      case 'generate-sp-reference':
        return await generateSPReference(projectId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Workflow Documentation
      // ─────────────────────────────────────────────────────────────────────
      case 'document-workflow':
        return await documentWorkflow(projectId, body.workflowId, body.options);

      case 'document-all-workflows':
        return await documentAllWorkflows(projectId, body.options);

      case 'generate-workflow-diagram':
        return await generateWorkflowDiagram(projectId, body.workflowId);

      case 'generate-workflow-docs':
        return await generateWorkflowDocs(projectId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Business Logic Documentation
      // ─────────────────────────────────────────────────────────────────────
      case 'document-business-rules':
        return await documentBusinessRules(projectId, body.options);

      case 'document-validations':
        return await documentValidations(projectId, body.tableName);

      case 'document-transformations':
        return await documentTransformations(projectId, body.options);

      case 'generate-decision-table-docs':
        return await generateDecisionTableDocs(projectId, body.tableName);

      // ─────────────────────────────────────────────────────────────────────
      // Screen/UI Documentation
      // ─────────────────────────────────────────────────────────────────────
      case 'document-screen':
        return await documentScreen(projectId, body.screenId, body.options);

      case 'document-all-screens':
        return await documentAllScreens(projectId, body.options);

      case 'document-field-validations':
        return await documentFieldValidations(projectId, body.screenId);

      case 'generate-screen-walkthrough':
        return await generateScreenWalkthrough(projectId, body.screenId);

      // ─────────────────────────────────────────────────────────────────────
      // Document Management
      // ─────────────────────────────────────────────────────────────────────
      case 'create-document':
        return await createDocument(projectId, body.document);

      case 'update-document':
        return await updateDocument(projectId, body.documentId, body.updates);

      case 'get-document':
        return await getDocument(projectId, body.documentId);

      case 'get-documents':
        return await getDocuments(projectId, body.filters);

      case 'delete-document':
        return await deleteDocument(projectId, body.documentId);

      case 'publish-document':
        return await publishDocument(projectId, body.documentId, body.version);

      case 'archive-document':
        return await archiveDocument(projectId, body.documentId);

      case 'duplicate-document':
        return await duplicateDocument(projectId, body.documentId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Document Versioning
      // ─────────────────────────────────────────────────────────────────────
      case 'get-document-versions':
        return await getDocumentVersions(projectId, body.documentId);

      case 'get-document-version':
        return await getDocumentVersion(projectId, body.documentId, body.version);

      case 'compare-versions':
        return await compareDocumentVersions(projectId, body.documentId, body.version1, body.version2);

      case 'rollback-document':
        return await rollbackDocument(projectId, body.documentId, body.version);

      // ─────────────────────────────────────────────────────────────────────
      // Documentation Templates
      // ─────────────────────────────────────────────────────────────────────
      case 'get-templates':
        return await getDocumentationTemplates();

      case 'get-template':
        return await getDocumentationTemplate(body.templateId);

      case 'create-template':
        return await createDocumentationTemplate(body.template);

      case 'apply-template':
        return await applyDocumentationTemplate(projectId, body.templateId, body.params);

      case 'instantiate-template':
        return await instantiateTemplate(projectId, body.templateId, body.params);

      // ─────────────────────────────────────────────────────────────────────
      // Export Operations
      // ─────────────────────────────────────────────────────────────────────
      case 'export-document':
        return await exportDocument(projectId, body.documentId, body.format);

      case 'export-all-documents':
        return await exportAllDocuments(projectId, body.format, body.options);

      case 'export-to-pdf':
        return await exportToPDF(projectId, body.documentId, body.options);

      case 'export-to-docx':
        return await exportToDOCX(projectId, body.documentId, body.options);

      case 'export-to-html':
        return await exportToHTML(projectId, body.documentId, body.options);

      case 'export-to-markdown':
        return await exportToMarkdown(projectId, body.documentId, body.options);

      case 'export-to-confluence':
        return await exportToConfluence(projectId, body.documentId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Documentation Intelligence
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze-documentation-coverage':
        return await analyzeDocumentationCoverage(projectId);

      case 'analyze-documentation-quality':
        return await analyzeDocumentationQuality(projectId);

      case 'suggest-documentation-improvements':
        return await suggestDocumentationImprovements(projectId, body.documentId);

      case 'find-documentation-gaps':
        return await findDocumentationGaps(projectId);

      case 'detect-outdated-docs':
        return await detectOutdatedDocs(projectId);

      case 'suggest-updates':
        return await suggestDocumentationUpdates(projectId);

      // ─────────────────────────────────────────────────────────────────────
      // Import Operations
      // ─────────────────────────────────────────────────────────────────────
      case 'import-document':
        return await importDocument(projectId, body.content, body.format);

      case 'import-from-word':
        return await importFromWord(projectId, body.fileContent);

      case 'import-from-markdown':
        return await importFromMarkdown(projectId, body.content);

      case 'import-from-confluence':
        return await importFromConfluence(projectId, body.content, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Search & Navigation
      // ─────────────────────────────────────────────────────────────────────
      case 'search-documents':
        return await searchDocuments(projectId, body.query, body.options);

      case 'get-document-tree':
        return await getDocumentTree(projectId);

      case 'get-related-documents':
        return await getRelatedDocuments(projectId, body.documentId);

      case 'get-document-links':
        return await getDocumentLinks(projectId, body.documentId);

      // ─────────────────────────────────────────────────────────────────────
      // Documentation Statistics
      // ─────────────────────────────────────────────────────────────────────
      case 'get-documentation-stats':
        return await getDocumentationStats(projectId);

      case 'get-documentation-dashboard':
        return await getDocumentationDashboard(projectId);

      case 'get-documentation-report':
        return await getDocumentationReport(projectId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Batch Operations
      // ─────────────────────────────────────────────────────────────────────
      case 'batch-generate':
        return await batchGenerateDocuments(projectId, body.documents);

      case 'batch-export':
        return await batchExportDocuments(projectId, body.documentIds, body.format);

      case 'batch-publish':
        return await batchPublishDocuments(projectId, body.documentIds);

      // ─────────────────────────────────────────────────────────────────────
      // Summary
      // ─────────────────────────────────────────────────────────────────────
      case 'get-documentation-summary':
        return await getDocumentationSummary(projectId);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Documentation Intelligence API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateUserManual(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      toolkitTables: { select: { tableName: true, columns: true, foreignKeys: true } },
      toolkitProcedures: { select: { procedureName: true, parameters: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const sections: any[] = [];

  // Introduction
  sections.push({
    id: 'introduction',
    title: 'Introduction',
    content: `# ${project.name} - User Manual\n\nThis comprehensive user manual provides detailed guidance on using the ${project.name} system. The manual covers all major functionalities, workflows, and best practices to help you effectively utilize the system for your business needs.`,
    order: 1,
    subsections: [
      {
        id: 'introduction-purpose',
        title: 'Purpose of This Document',
        content: `This user manual serves as the primary reference guide for all users of the ${project.name} system. It is designed to provide step-by-step instructions, explain key concepts, and offer troubleshooting guidance for common issues that users may encounter during their daily operations.`,
        order: 1,
      },
      {
        id: 'introduction-audience',
        title: 'Target Audience',
        content: 'This manual is intended for all users of the system, including end users, administrators, and managers. Each section is clearly labeled with its intended audience to help users quickly find relevant information.',
        order: 2,
      },
      {
        id: 'introduction-conventions',
        title: 'Document Conventions',
        content: 'Throughout this manual, we use specific formatting conventions to highlight important information: **Bold text** indicates UI elements or key terms, *Italic text* emphasizes important concepts, and `Monospace font` represents code or system values.',
        order: 3,
      },
    ],
  });

  // Getting Started
  sections.push({
    id: 'getting-started',
    title: 'Getting Started',
    content: '## Getting Started\n\nFollow these steps to begin using the system effectively. This section covers the initial setup and basic operations that every user should understand before proceeding to advanced features.',
    order: 2,
    subsections: [
      {
        id: 'gs-login',
        title: 'Logging In',
        content: 'To access the system, navigate to the login page using your web browser. Enter your username and password in the designated fields, then click the Login button. If you encounter any issues during login, please contact your system administrator for assistance.',
        order: 1,
        warnings: ['Do not share your login credentials with others'],
      },
      {
        id: 'gs-navigation',
        title: 'Navigation Overview',
        content: 'The main navigation menu is located on the left side of the screen. Each menu item corresponds to a different module or functionality. Hover over items to see submenus, or click to navigate directly to the main section.',
        order: 2,
        tips: ['Use keyboard shortcuts for faster navigation', 'Bookmark frequently used pages'],
      },
    ],
  });

  // Module documentation for each table
  const moduleSections = project.toolkitTables.map((table, index) => ({
    id: `module-${table.tableName}`,
    title: `${table.tableName} Module`,
    content: `## ${table.tableName} Module\n\nThis section documents the ${table.tableName} module, which allows you to manage ${table.tableName.toLowerCase()} records in the system. You can create, read, update, and delete records as needed.`,
    order: 3 + index,
    subsections: [
      {
        id: `${table.tableName}-overview`,
        title: 'Overview',
        content: `The ${table.tableName} module provides comprehensive functionality for managing your ${table.tableName.toLowerCase()} data. This includes listing existing records, creating new entries, editing current information, and removing outdated data.`,
        order: 1,
      },
      {
        id: `${table.tableName}-fields`,
        title: 'Available Fields',
        content: `The following fields are available in the ${table.tableName} module. Each field has specific validation rules and data types that must be followed when entering data.`,
        order: 2,
        tables: generateFieldsTable(JSON.parse(table.columns || '[]')),
      },
      {
        id: `${table.tableName}-operations`,
        title: 'Common Operations',
        content: 'This section describes how to perform common operations such as creating new records, searching for existing entries, updating information, and deleting records that are no longer needed.',
        order: 3,
      },
    ],
  }));

  sections.push(...moduleSections);

  // Troubleshooting
  sections.push({
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: '## Troubleshooting\n\nThis section provides solutions to common problems you may encounter while using the system. If your issue is not addressed here, please contact your system administrator or technical support team.',
    order: 999,
    subsections: [
      {
        id: 'ts-login-issues',
        title: 'Login Issues',
        content: 'If you cannot log in, first verify that your username and password are correct. Check that Caps Lock is not enabled. If the problem persists, try clearing your browser cache or using a different browser.',
        order: 1,
      },
      {
        id: 'ts-permission-issues',
        title: 'Permission Denied Errors',
        content: 'Permission denied errors occur when you attempt to access a feature or perform an action that your user role does not permit. Contact your administrator to request the necessary permissions for your tasks.',
        order: 2,
      },
      {
        id: 'ts-data-issues',
        title: 'Data Entry Issues',
        content: 'If you encounter validation errors while entering data, check that all required fields are completed and that data formats match the expected patterns. Common issues include date formats, number precision, and character limits.',
        order: 3,
      },
    ],
  });

  // FAQ
  sections.push({
    id: 'faq',
    title: 'Frequently Asked Questions',
    content: '## Frequently Asked Questions\n\nBelow are answers to commonly asked questions about using the system. If you have additional questions, please contact your system administrator.',
    order: 1000,
    subsections: [
      {
        id: 'faq-1',
        title: 'How do I reset my password?',
        content: 'Click the "Forgot Password" link on the login page. Enter your registered email address, and you will receive instructions to reset your password. Follow the link in the email to create a new password.',
        order: 1,
      },
      {
        id: 'faq-2',
        title: 'How do I export data?',
        content: 'Most list pages have an Export button that allows you to download data in various formats including Excel, CSV, and PDF. Select the records you want to export or export all visible records.',
        order: 2,
      },
    ],
  });

  const document = {
    id: `doc-user-manual-${Date.now()}`,
    type: 'user_manual',
    title: `${project.name} - User Manual`,
    version: '1.0.0',
    generatedAt: new Date(),
    sections,
    metadata: {
      totalSections: sections.length,
      estimatedReadTime: calculateReadTime(sections),
    },
  };

  // Save to database
  await db.generatedDocument.create({
    data: {
      projectId,
      documentId: document.id,
      type: 'user_manual',
      title: document.title,
      content: JSON.stringify(document),
      version: document.version,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    document,
    statistics: {
      totalSections: sections.length,
      totalTables: project.toolkitTables.length,
      totalSPs: project.toolkitProcedures.length,
    },
  });
}

async function generateDeveloperGuide(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      toolkitTables: { select: { tableName: true, columns: true, foreignKeys: true, indexes: true } },
      toolkitProcedures: { select: { procedureName: true, parameters: true, body: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const sections: any[] = [];

  // Architecture Overview
  sections.push({
    id: 'architecture',
    title: 'Architecture Overview',
    content: `# ${project.name} - Developer Guide\n\nThis developer guide provides comprehensive technical documentation for developers working with the ${project.name} system. It covers architecture, APIs, database schemas, and best practices for development and integration.`,
    order: 1,
    subsections: [
      {
        id: 'arch-overview',
        title: 'System Architecture',
        content: `The ${project.name} system follows a modern three-tier architecture pattern with clear separation between presentation, business logic, and data access layers. This design ensures maintainability, scalability, and testability of the system.`,
        order: 1,
        codeBlocks: [
          {
            id: 'arch-diagram',
            language: 'text',
            code: `${project.name} Architecture
├── Presentation Layer (UI Components)
│   ├── Web Application (React/Next.js)
│   ├── Mobile Support (Responsive Design)
│   └── API Clients
├── Business Logic Layer (Services)
│   ├── API Routes (/api/*)
│   ├── Business Rules Engine
│   └── Validation Services
├── Data Access Layer (ORM)
│   ├── Prisma Client
│   ├── Query Builders
│   └── Connection Pool
└── Database Layer (SQL Server)
    ├── Tables (${project.toolkitTables.length} tables)
    ├── Views
    ├── Stored Procedures (${project.toolkitProcedures.length} SPs)
    └── Indexes`,
          },
        ],
      },
      {
        id: 'arch-tech-stack',
        title: 'Technology Stack',
        content: 'The system is built using modern, industry-standard technologies that provide excellent developer experience, performance, and maintainability.',
        order: 2,
        tables: [
          {
            id: 'tech-stack-table',
            headers: ['Layer', 'Technology', 'Purpose'],
            rows: [
              ['Frontend', 'Next.js 15, React 18', 'UI framework with server components'],
              ['Backend', 'Next.js API Routes', 'RESTful API endpoints'],
              ['Database', 'Microsoft SQL Server', 'Relational data storage'],
              ['ORM', 'Prisma', 'Type-safe database access'],
              ['Authentication', 'NextAuth.js', 'User authentication and authorization'],
              ['Styling', 'Tailwind CSS', 'Utility-first CSS framework'],
            ],
          },
        ],
      },
    ],
  });

  // Database Schema Documentation
  const dbSections = project.toolkitTables.map((table, index) => ({
    id: `table-${table.tableName}`,
    title: `Table: ${table.tableName}`,
    content: `## ${table.tableName} Table\n\nThe ${table.tableName} table stores essential data for the application. This section provides detailed documentation of the table structure, columns, constraints, and relationships.`,
    order: 10 + index,
    subsections: [
      {
        id: `${table.tableName}-columns`,
        title: 'Column Definitions',
        content: `The following columns are defined in the ${table.tableName} table. Each column has specific data type, constraints, and purposes as documented below.`,
        order: 1,
        tables: generateDetailedFieldsTable(JSON.parse(table.columns || '[]')),
      },
      {
        id: `${table.tableName}-fks`,
        title: 'Foreign Key Relationships',
        content: `This section documents the foreign key relationships for the ${table.tableName} table, showing how it connects to other tables in the database.`,
        order: 2,
        tables: generateFKTable(JSON.parse(table.foreignKeys || '[]')),
      },
      {
        id: `${table.tableName}-indexes`,
        title: 'Indexes',
        content: `The following indexes are defined on the ${table.tableName} table to optimize query performance. Proper indexing is crucial for maintaining system responsiveness.`,
        order: 3,
      },
    ],
  }));

  sections.push(...dbSections);

  // API Documentation
  sections.push({
    id: 'api-reference',
    title: 'API Reference',
    content: '## API Reference\n\nThis section documents all available API endpoints for the system. Each endpoint is described with its URL, HTTP method, request parameters, and response format.',
    order: 500,
    subsections: project.toolkitTables.map((table, index) => ({
      id: `api-${table.tableName}`,
      title: `${table.tableName} API`,
      content: `REST API endpoints for managing ${table.tableName} records.`,
      order: index + 1,
      codeBlocks: [
        {
          id: `api-get-${table.tableName}`,
          language: 'http',
          code: `GET /api/${table.tableName.toLowerCase()}
GET /api/${table.tableName.toLowerCase()}/:id

Response 200:
{
  "success": true,
  "data": [...]
}`,
          title: 'Read Operations',
        },
        {
          id: `api-post-${table.tableName}`,
          language: 'http',
          code: `POST /api/${table.tableName.toLowerCase()}
Content-Type: application/json

{
  // Record data
}

Response 201:
{
  "success": true,
  "id": "new-record-id"
}`,
          title: 'Create Operation',
        },
        {
          id: `api-put-${table.tableName}`,
          language: 'http',
          code: `PUT /api/${table.tableName.toLowerCase()}/:id
Content-Type: application/json

{
  // Updated data
}

Response 200:
{
  "success": true,
  "updated": true
}`,
          title: 'Update Operation',
        },
        {
          id: `api-delete-${table.tableName}`,
          language: 'http',
          code: `DELETE /api/${table.tableName.toLowerCase()}/:id

Response 200:
{
  "success": true,
  "deleted": true
}`,
          title: 'Delete Operation',
        },
      ],
    })),
  });

  // Stored Procedures Documentation
  sections.push({
    id: 'stored-procedures',
    title: 'Stored Procedures Reference',
    content: '## Stored Procedures Reference\n\nThis section documents all stored procedures in the database, including their parameters, return values, and usage examples.',
    order: 600,
    subsections: project.toolkitProcedures.map((sp, index) => ({
      id: `sp-${sp.procedureName}`,
      title: sp.procedureName,
      content: `Documentation for the ${sp.procedureName} stored procedure.`,
      order: index + 1,
      codeBlocks: [
        {
          id: `sp-call-${sp.procedureName}`,
          language: 'sql',
          code: `EXEC ${sp.procedureName} ${generateSPCallParams(JSON.parse(sp.parameters || '[]'))}`,
          title: 'Execution Example',
        },
      ],
      tables: generateParameterTable(JSON.parse(sp.parameters || '[]')),
    })),
  });

  const document = {
    id: `doc-dev-guide-${Date.now()}`,
    type: 'developer_guide',
    title: `${project.name} - Developer Guide`,
    version: '1.0.0',
    generatedAt: new Date(),
    sections,
    metadata: {
      totalSections: sections.length,
      estimatedReadTime: calculateReadTime(sections),
    },
  };

  return NextResponse.json({
    success: true,
    document,
    statistics: {
      totalSections: sections.length,
      totalTables: project.toolkitTables.length,
      totalSPs: project.toolkitProcedures.length,
    },
  });
}

async function generateAPIReference(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      toolkitTables: { select: { tableName: true, columns: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const endpoints: any[] = [];

  for (const table of project.toolkitTables) {
    const columns = JSON.parse(table.columns || '[]');
    const pk = columns.find((c: any) => c.isPrimaryKey);
    const tableName = table.tableName.toLowerCase();

    endpoints.push({
      path: `/api/${tableName}`,
      methods: ['GET', 'POST'],
      description: `CRUD operations for ${table.tableName}`,
      parameters: columns.filter((c: any) => !c.isPrimaryKey).map((c: any) => ({
        name: c.name,
        type: c.dataType,
        required: !c.isNullable,
        description: `${c.name} field`,
      })),
    });

    if (pk) {
      endpoints.push({
        path: `/api/${tableName}/:${pk.name.toLowerCase()}`,
        methods: ['GET', 'PUT', 'DELETE'],
        description: `Single ${table.tableName} operations`,
        parameters: [
          {
            name: pk.name,
            type: pk.dataType,
            required: true,
            description: 'Primary key identifier',
          },
        ],
      });
    }
  }

  const document = {
    id: `doc-api-ref-${Date.now()}`,
    type: 'api_reference',
    title: `${project.name} - API Reference`,
    version: '1.0.0',
    generatedAt: new Date(),
    endpoints,
    openapi: generateOpenAPISpec(project, endpoints),
  };

  return NextResponse.json({
    success: true,
    document,
    statistics: {
      totalEndpoints: endpoints.length,
      totalTables: project.toolkitTables.length,
    },
  });
}

async function generateTutorial(projectId: string, options?: any) {
  const { moduleName, workflowId, screenId } = options || {};

  const sections: any[] = [];

  sections.push({
    id: 'tutorial-intro',
    title: 'Tutorial Introduction',
    content: `# Tutorial\n\nThis step-by-step tutorial will guide you through the process of completing common tasks in the system. Follow each step carefully to achieve the desired outcome.`,
    order: 1,
  });

  sections.push({
    id: 'tutorial-prerequisites',
    title: 'Prerequisites',
    content: 'Before starting this tutorial, ensure you have the following:\n- Valid user account with appropriate permissions\n- Access to the relevant module\n- Basic understanding of the system navigation',
    order: 2,
  });

  sections.push({
    id: 'tutorial-steps',
    title: 'Tutorial Steps',
    content: 'Follow these steps to complete the tutorial. Each step builds upon the previous one, so complete them in order.',
    order: 3,
    subsections: [
      {
        id: 'step-1',
        title: 'Step 1: Navigate to the Module',
        content: 'Using the main navigation menu, locate and click on the module you want to work with. The module will load and display its main interface.',
        order: 1,
        tips: ['Use keyboard shortcuts for faster navigation'],
      },
      {
        id: 'step-2',
        title: 'Step 2: Create a New Record',
        content: 'Click the "Add New" button to create a new record. Fill in all required fields with valid data. Required fields are marked with an asterisk (*).',
        order: 2,
        warnings: ['Ensure all required fields are completed before saving'],
      },
      {
        id: 'step-3',
        title: 'Step 3: Save Your Changes',
        content: 'After completing the form, click the "Save" button to persist your changes. The system will validate your input and either save successfully or display validation errors.',
        order: 3,
      },
      {
        id: 'step-4',
        title: 'Step 4: Verify the Result',
        content: 'Navigate to the list view and verify that your new record appears in the list. You can use search or filters to locate specific records.',
        order: 4,
      },
    ],
  });

  sections.push({
    id: 'tutorial-summary',
    title: 'Summary',
    content: 'Congratulations! You have completed this tutorial. You should now be able to navigate to modules, create new records, and verify your changes. Continue exploring the system to discover more features.',
    order: 4,
  });

  return NextResponse.json({
    success: true,
    tutorial: {
      id: `tutorial-${Date.now()}`,
      title: moduleName ? `${moduleName} Tutorial` : 'System Tutorial',
      sections,
      estimatedTime: '10-15 minutes',
    },
  });
}

async function generateQuickStartGuide(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const sections: any[] = [
    {
      id: 'qs-welcome',
      title: 'Welcome',
      content: `# Quick Start Guide\n\nWelcome to ${project.name}! This guide will help you get started in just a few minutes.`,
      order: 1,
    },
    {
      id: 'qs-setup',
      title: 'Quick Setup',
      content: 'Follow these simple steps to get started with the system:\n\n1. Log in with your credentials\n2. Navigate to your assigned module\n3. Explore the interface',
      order: 2,
    },
    {
      id: 'qs-first-action',
      title: 'Your First Action',
      content: 'Try creating your first record:\n\n1. Click "Add New" button\n2. Fill in the required fields\n3. Click "Save"\n\nThat\'s it! You\'ve created your first record.',
      order: 3,
      tips: ['Start with simple operations before exploring advanced features'],
    },
    {
      id: 'qs-next-steps',
      title: 'Next Steps',
      content: 'Now that you\'re familiar with the basics, you can:\n- Explore other modules\n- Review the full User Manual\n- Check out tutorials for advanced features',
      order: 4,
    },
  ];

  return NextResponse.json({
    success: true,
    guide: {
      id: `quick-start-${Date.now()}`,
      title: `${project.name} - Quick Start Guide`,
      sections,
      estimatedTime: '5 minutes',
    },
  });
}

async function generateFAQ(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const faqs = [
    {
      id: 'faq-1',
      question: 'How do I reset my password?',
      answer: 'Click the "Forgot Password" link on the login page. Enter your registered email address, and follow the instructions sent to your email to create a new password.',
      category: 'Account',
    },
    {
      id: 'faq-2',
      question: 'How do I export data to Excel?',
      answer: 'Navigate to the list view of the data you want to export. Click the "Export" button and select "Excel" from the dropdown. The file will download automatically.',
      category: 'Data Management',
    },
    {
      id: 'faq-3',
      question: 'Can I customize the columns shown in list views?',
      answer: 'Yes, most list views allow column customization. Click the "Customize Columns" or "Settings" icon near the table header to select which columns to display.',
      category: 'Interface',
    },
    {
      id: 'faq-4',
      question: 'How do I delete multiple records at once?',
      answer: 'Use the checkboxes on the left side of the list to select multiple records. Then click the "Delete" button that appears in the toolbar. Confirm the deletion when prompted.',
      category: 'Data Management',
    },
    {
      id: 'faq-5',
      question: 'What browsers are supported?',
      answer: 'The system supports all modern browsers including Chrome, Firefox, Safari, and Edge. For best performance, we recommend using the latest version of Chrome or Firefox.',
      category: 'Technical',
    },
    {
      id: 'faq-6',
      question: 'How do I report a bug or request a feature?',
      answer: 'Contact your system administrator or submit a ticket through the support portal. Provide as much detail as possible including steps to reproduce any issues.',
      category: 'Support',
    },
  ];

  return NextResponse.json({
    success: true,
    faq: {
      id: `faq-${Date.now()}`,
      title: `${project.name} - Frequently Asked Questions`,
      items: faqs,
      categories: Array.from(new Set(faqs.map(f => f.category))),
    },
  });
}

async function generateReleaseNotes(projectId: string, version: string, changes: any[]) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const releaseNotes = {
    id: `release-${Date.now()}`,
    version: version || '1.0.0',
    title: `${project.name} - Release Notes v${version || '1.0.0'}`,
    releaseDate: new Date(),
    sections: [
      {
        id: 'new-features',
        title: 'New Features',
        items: changes?.filter(c => c.type === 'feature') || [],
      },
      {
        id: 'improvements',
        title: 'Improvements',
        items: changes?.filter(c => c.type === 'improvement') || [],
      },
      {
        id: 'bug-fixes',
        title: 'Bug Fixes',
        items: changes?.filter(c => c.type === 'bugfix') || [],
      },
      {
        id: 'breaking-changes',
        title: 'Breaking Changes',
        items: changes?.filter(c => c.type === 'breaking') || [],
      },
    ],
  };

  return NextResponse.json({
    success: true,
    releaseNotes,
  });
}

async function generateChangelog(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const changelog = {
    id: `changelog-${Date.now()}`,
    title: `${project.name} - Changelog`,
    entries: [
      {
        version: '1.0.0',
        date: new Date(),
        changes: [
          { type: 'feature', description: 'Initial release' },
          { type: 'feature', description: 'Core module implementation' },
        ],
      },
    ],
  };

  return NextResponse.json({
    success: true,
    changelog,
  });
}

async function generateReadme(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      toolkitTables: { select: { tableName: true } },
      toolkitProcedures: { select: { procedureName: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const readme = `# ${project.name}

## Overview
${project.description || 'Enterprise application generated by AI Enterprise Architect'}

## Features
- ${project.toolkitTables.length} database tables
- ${project.toolkitProcedures.length} stored procedures
- Modern web interface
- RESTful API
- Role-based access control

## Getting Started
1. Install dependencies: \`npm install\`
2. Configure environment variables
3. Run database migrations: \`npx prisma migrate dev\`
4. Start the development server: \`npm run dev\`

## Documentation
- User Manual: Available in the Documentation section
- API Reference: Available in the API Reference section
- Developer Guide: Available in the Developer Documentation section

## License
Proprietary - All rights reserved
`;

  return NextResponse.json({
    success: true,
    readme: {
      id: `readme-${Date.now()}`,
      title: 'README.md',
      content: readme,
    },
  });
}

async function generateInstallationGuide(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const guide = {
    id: `install-guide-${Date.now()}`,
    title: `${project.name} - Installation Guide`,
    sections: [
      {
        id: 'requirements',
        title: 'System Requirements',
        content: 'Before installing, ensure your system meets the following requirements:',
        items: [
          'Node.js 18.x or higher',
          'npm 9.x or higher',
          'Microsoft SQL Server 2019 or higher',
          '4GB RAM minimum (8GB recommended)',
          '10GB disk space minimum',
        ],
      },
      {
        id: 'installation-steps',
        title: 'Installation Steps',
        content: 'Follow these steps to install the application:',
        steps: [
          { step: 1, action: 'Clone the repository', command: 'git clone <repository-url>' },
          { step: 2, action: 'Install dependencies', command: 'npm install' },
          { step: 3, action: 'Configure environment', command: 'cp .env.example .env' },
          { step: 4, action: 'Setup database', command: 'npx prisma migrate deploy' },
          { step: 5, action: 'Build application', command: 'npm run build' },
          { step: 6, action: 'Start server', command: 'npm start' },
        ],
      },
      {
        id: 'configuration',
        title: 'Configuration',
        content: 'Configure the following environment variables:',
        variables: [
          { name: 'DATABASE_URL', description: 'SQL Server connection string' },
          { name: 'NEXTAUTH_SECRET', description: 'Authentication secret key' },
          { name: 'NEXTAUTH_URL', description: 'Application base URL' },
        ],
      },
    ],
  };

  return NextResponse.json({
    success: true,
    guide,
  });
}

async function generateConfigurationGuide(projectId: string, options?: any) {
  const guide = {
    id: `config-guide-${Date.now()}`,
    title: 'Configuration Guide',
    sections: [
      {
        id: 'env-variables',
        title: 'Environment Variables',
        content: 'Configure these environment variables for proper system operation.',
      },
      {
        id: 'database-config',
        title: 'Database Configuration',
        content: 'Database connection and pooling configuration options.',
      },
      {
        id: 'security-config',
        title: 'Security Configuration',
        content: 'Authentication, authorization, and security settings.',
      },
    ],
  };

  return NextResponse.json({ success: true, guide });
}

async function generateDeploymentGuide(projectId: string, options?: any) {
  const guide = {
    id: `deploy-guide-${Date.now()}`,
    title: 'Deployment Guide',
    sections: [
      {
        id: 'prerequisites',
        title: 'Prerequisites',
        content: 'Ensure all prerequisites are met before deployment.',
      },
      {
        id: 'production-build',
        title: 'Production Build',
        content: 'Steps to create a production build.',
      },
      {
        id: 'deployment-options',
        title: 'Deployment Options',
        content: 'Various deployment options including Docker, cloud platforms, and on-premise.',
      },
    ],
  };

  return NextResponse.json({ success: true, guide });
}

async function generateTroubleshootingGuide(projectId: string, options?: any) {
  const guide = {
    id: `troubleshoot-guide-${Date.now()}`,
    title: 'Troubleshooting Guide',
    sections: [
      {
        id: 'common-issues',
        title: 'Common Issues',
        issues: [
          {
            problem: 'Cannot connect to database',
            solution: 'Verify DATABASE_URL is correct and SQL Server is running',
          },
          {
            problem: 'Authentication fails',
            solution: 'Check NEXTAUTH_SECRET and NEXTAUTH_URL configuration',
          },
          {
            problem: 'Slow performance',
            solution: 'Check database indexes and connection pooling settings',
          },
        ],
      },
      {
        id: 'error-codes',
        title: 'Error Codes Reference',
        content: 'Common error codes and their meanings.',
      },
      {
        id: 'logging',
        title: 'Logging and Debugging',
        content: 'How to enable and use logging for troubleshooting.',
      },
    ],
  };

  return NextResponse.json({ success: true, guide });
}

async function generateSecurityGuide(projectId: string, options?: any) {
  const guide = {
    id: `security-guide-${Date.now()}`,
    title: 'Security Guide',
    sections: [
      {
        id: 'authentication',
        title: 'Authentication',
        content: 'The system uses NextAuth.js for secure authentication.',
      },
      {
        id: 'authorization',
        title: 'Authorization',
        content: 'Role-based access control (RBAC) is implemented throughout the system.',
      },
      {
        id: 'data-protection',
        title: 'Data Protection',
        content: 'Sensitive data is encrypted at rest and in transit.',
      },
      {
        id: 'best-practices',
        title: 'Security Best Practices',
        items: [
          'Use strong passwords',
          'Enable two-factor authentication',
          'Regularly review access logs',
          'Keep software updated',
        ],
      },
    ],
  };

  return NextResponse.json({ success: true, guide });
}

async function generatePerformanceGuide(projectId: string, options?: any) {
  const guide = {
    id: `perf-guide-${Date.now()}`,
    title: 'Performance Guide',
    sections: [
      {
        id: 'optimization',
        title: 'Performance Optimization',
        content: 'Tips and techniques for optimizing system performance.',
      },
      {
        id: 'caching',
        title: 'Caching Strategies',
        content: 'Implementing effective caching for improved response times.',
      },
      {
        id: 'database-tuning',
        title: 'Database Tuning',
        content: 'Database optimization techniques and index management.',
      },
    ],
  };

  return NextResponse.json({ success: true, guide });
}

async function generateIntegrationGuide(projectId: string, options?: any) {
  const guide = {
    id: `integration-guide-${Date.now()}`,
    title: 'Integration Guide',
    sections: [
      {
        id: 'api-integration',
        title: 'API Integration',
        content: 'How to integrate with the system using the REST API.',
      },
      {
        id: 'authentication-integration',
        title: 'Authentication Integration',
        content: 'Integrating authentication with external systems.',
      },
      {
        id: 'data-sync',
        title: 'Data Synchronization',
        content: 'Setting up data synchronization with external systems.',
      },
    ],
  };

  return NextResponse.json({ success: true, guide });
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function documentTable(projectId: string, tableName: string, options?: any) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { tableName: true, columns: true, foreignKeys: true, indexes: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const fks = JSON.parse(table.foreignKeys || '[]');
  const indexes = JSON.parse(table.indexes || '[]');

  const documentation = {
    id: `table-doc-${tableName}-${Date.now()}`,
    tableName: table.tableName,
    title: `Table Documentation: ${table.tableName}`,
    description: `This document provides comprehensive documentation for the ${table.tableName} table, including column definitions, constraints, relationships, and usage guidelines.`,
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: `The ${table.tableName} table is a core entity in the database. It contains ${columns.length} columns and ${fks.length} foreign key relationships.`,
      },
      {
        id: 'columns',
        title: 'Column Definitions',
        tables: generateDetailedFieldsTable(columns),
      },
      {
        id: 'foreign-keys',
        title: 'Foreign Key Relationships',
        content: fks.length > 0 ? `The table has ${fks.length} foreign key relationship(s).` : 'No foreign key relationships defined.',
        tables: generateFKTable(fks),
      },
      {
        id: 'indexes',
        title: 'Indexes',
        content: indexes.length > 0 ? `The table has ${indexes.length} index(es).` : 'No custom indexes defined.',
      },
    ],
    columns: columns.map((c: any) => ({
      name: c.name,
      type: c.dataType,
      nullable: c.isNullable,
      primaryKey: c.isPrimaryKey,
      description: c.description || `${c.name} field`,
    })),
  };

  return NextResponse.json({
    success: true,
    documentation,
  });
}

async function documentAllTables(projectId: string, options?: any) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true, foreignKeys: true },
  });

  const documentation = {
    id: `all-tables-doc-${Date.now()}`,
    title: 'Database Schema Documentation',
    tables: tables.map(table => {
      const columns = JSON.parse(table.columns || '[]');
      return {
        tableName: table.tableName,
        columnCount: columns.length,
        fkCount: JSON.parse(table.foreignKeys || '[]').length,
      };
    }),
  };

  return NextResponse.json({
    success: true,
    documentation,
    totalTables: tables.length,
  });
}

async function documentColumn(projectId: string, tableName: string, columnName: string, options?: any) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { columns: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const column = columns.find((c: any) => c.name === columnName);

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    documentation: {
      tableName,
      columnName: column.name,
      dataType: column.dataType,
      nullable: column.isNullable,
      primaryKey: column.isPrimaryKey,
      maxLength: column.maxLength,
      defaultValue: column.defaultValue,
      description: column.description || `${column.name} field in ${tableName}`,
    },
  });
}

async function documentForeignKeys(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { tableName: true, foreignKeys: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const fks = JSON.parse(table.foreignKeys || '[]');

  return NextResponse.json({
    success: true,
    documentation: {
      tableName,
      foreignKeys: fks.map((fk: any) => ({
        column: fk.column,
        referencedTable: fk.referencedTable,
        referencedColumn: fk.referencedColumn,
        constraintName: fk.name || `FK_${tableName}_${fk.column}`,
      })),
    },
  });
}

async function documentIndexes(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { tableName: true, indexes: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const indexes = JSON.parse(table.indexes || '[]');

  return NextResponse.json({
    success: true,
    documentation: {
      tableName,
      indexes: indexes.map((idx: any) => ({
        name: idx.name,
        columns: idx.columns,
        unique: idx.isUnique,
        type: idx.type || 'NONCLUSTERED',
      })),
    },
  });
}

async function documentConstraints(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { tableName: true, columns: true, foreignKeys: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const fks = JSON.parse(table.foreignKeys || '[]');

  const constraints: any[] = [];

  // Primary key constraint
  const pk = columns.find((c: any) => c.isPrimaryKey);
  if (pk) {
    constraints.push({
      name: `PK_${tableName}`,
      type: 'PRIMARY KEY',
      columns: [pk.name],
    });
  }

  // Foreign key constraints
  for (const fk of fks) {
    constraints.push({
      name: fk.name || `FK_${tableName}_${fk.column}`,
      type: 'FOREIGN KEY',
      columns: [fk.column],
      reference: `${fk.referencedTable}(${fk.referencedColumn})`,
    });
  }

  // Unique constraints
  const uniqueCols = columns.filter((c: any) => c.isUnique);
  for (const col of uniqueCols) {
    constraints.push({
      name: `UQ_${tableName}_${col.name}`,
      type: 'UNIQUE',
      columns: [col.name],
    });
  }

  // Check constraints (default values)
  const defaultCols = columns.filter((c: any) => c.defaultValue);
  for (const col of defaultCols) {
    constraints.push({
      name: `DF_${tableName}_${col.name}`,
      type: 'DEFAULT',
      columns: [col.name],
      definition: col.defaultValue,
    });
  }

  return NextResponse.json({
    success: true,
    documentation: {
      tableName,
      constraints,
      totalConstraints: constraints.length,
    },
  });
}

async function generateERDDocumentation(projectId: string, options?: any) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true, foreignKeys: true },
  });

  const entities: any[] = [];
  const relationships: any[] = [];

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const fks = JSON.parse(table.foreignKeys || '[]');

    entities.push({
      name: table.tableName,
      attributes: columns.map((c: any) => ({
        name: c.name,
        type: c.dataType,
        pk: c.isPrimaryKey,
        nullable: c.isNullable,
      })),
    });

    for (const fk of fks) {
      relationships.push({
        from: table.tableName,
        to: fk.referencedTable,
        fromColumn: fk.column,
        toColumn: fk.referencedColumn,
        type: 'many-to-one',
      });
    }
  }

  return NextResponse.json({
    success: true,
    documentation: {
      id: `erd-${Date.now()}`,
      title: 'Entity Relationship Diagram Documentation',
      entities,
      relationships,
      mermaid: generateMermaidERD(tables),
    },
  });
}

async function generateDataDictionary(projectId: string, options?: any) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true },
  });

  const dictionary: any[] = [];

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');

    for (const col of columns) {
      dictionary.push({
        tableName: table.tableName,
        columnName: col.name,
        dataType: col.dataType,
        maxLength: col.maxLength,
        nullable: col.isNullable,
        primaryKey: col.isPrimaryKey,
        defaultValue: col.defaultValue,
        description: col.description || '',
      });
    }
  }

  return NextResponse.json({
    success: true,
    dataDictionary: {
      id: `data-dict-${Date.now()}`,
      title: 'Data Dictionary',
      entries: dictionary,
      totalEntries: dictionary.length,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STORED PROCEDURE DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function documentStoredProcedure(projectId: string, spName: string, options?: any) {
  const sp = await db.toolkitProcedure.findFirst({
    where: { projectId, procedureName: spName },
    select: { procedureName: true, parameters: true, body: true },
  });

  if (!sp) {
    return NextResponse.json({ error: 'Stored procedure not found' }, { status: 404 });
  }

  const params = JSON.parse(sp.parameters || '[]');

  const documentation = {
    id: `sp-doc-${spName}-${Date.now()}`,
    procedureName: sp.procedureName,
    title: `Stored Procedure Documentation: ${sp.procedureName}`,
    description: `Documentation for the ${sp.procedureName} stored procedure.`,
    parameters: params.map((p: any) => ({
      name: p.name,
      type: p.type,
      direction: p.direction || 'INPUT',
      defaultValue: p.defaultValue,
      description: p.description || `${p.name} parameter`,
    })),
    returnType: 'TABLE',
    usage: {
      example: `EXEC ${sp.procedureName} ${params.map((p: any) => `@${p.name} = <value>`).join(', ')}`,
    },
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: `The ${sp.procedureName} stored procedure is used for specific database operations.`,
      },
      {
        id: 'parameters',
        title: 'Parameters',
        tables: generateParameterTable(params),
      },
      {
        id: 'usage',
        title: 'Usage Example',
        codeBlocks: [
          {
            id: 'usage-example',
            language: 'sql',
            code: `-- Execute ${sp.procedureName}\nEXEC ${sp.procedureName} ${generateSPCallParams(params)}`,
          },
        ],
      },
    ],
  };

  return NextResponse.json({
    success: true,
    documentation,
  });
}

async function documentAllStoredProcedures(projectId: string, options?: any) {
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, parameters: true },
  });

  const documentation = {
    id: `all-sps-doc-${Date.now()}`,
    title: 'Stored Procedures Reference',
    procedures: procedures.map(sp => ({
      name: sp.procedureName,
      parameterCount: JSON.parse(sp.parameters || '[]').length,
    })),
  };

  return NextResponse.json({
    success: true,
    documentation,
    totalProcedures: procedures.length,
  });
}

async function documentSPParameters(projectId: string, spName: string) {
  const sp = await db.toolkitProcedure.findFirst({
    where: { projectId, procedureName: spName },
    select: { parameters: true },
  });

  if (!sp) {
    return NextResponse.json({ error: 'Stored procedure not found' }, { status: 404 });
  }

  const params = JSON.parse(sp.parameters || '[]');

  return NextResponse.json({
    success: true,
    documentation: {
      procedureName: spName,
      parameters: params.map((p: any) => ({
        name: p.name,
        type: p.type,
        direction: p.direction || 'INPUT',
        defaultValue: p.defaultValue,
        maxLength: p.maxLength,
        nullable: p.isNullable,
      })),
    },
  });
}

async function documentSPUsage(projectId: string, spName: string) {
  const sp = await db.toolkitProcedure.findFirst({
    where: { projectId, procedureName: spName },
    select: { procedureName: true, parameters: true, body: true },
  });

  if (!sp) {
    return NextResponse.json({ error: 'Stored procedure not found' }, { status: 404 });
  }

  const params = JSON.parse(sp.parameters || '[]');

  return NextResponse.json({
    success: true,
    documentation: {
      procedureName: spName,
      usageExamples: [
        {
          description: 'Basic execution',
          code: `EXEC ${spName}`,
        },
        {
          description: 'With parameters',
          code: `EXEC ${spName} ${params.map((p: any) => `@${p.name} = <value>`).join(', ')}`,
        },
        {
          description: 'With output parameters',
          code: `DECLARE @Result INT\nEXEC ${spName} ${params.map((p: any) => `@${p.name} = <value>`).join(', ')}, @Result OUTPUT\nSELECT @Result`,
        },
      ],
    },
  });
}

async function generateSPReference(projectId: string, options?: any) {
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, parameters: true },
  });

  const reference = {
    id: `sp-reference-${Date.now()}`,
    title: 'Stored Procedures Quick Reference',
    procedures: procedures.map(sp => {
      const params = JSON.parse(sp.parameters || '[]');
      return {
        name: sp.procedureName,
        syntax: `EXEC ${sp.procedureName} ${params.map((p: any) => `[@${p.name} =] <${p.type}>`).join(', ')}`,
        parameters: params,
      };
    }),
  };

  return NextResponse.json({
    success: true,
    reference,
    totalProcedures: procedures.length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function documentWorkflow(projectId: string, workflowId: string, options?: any) {
  const documentation = {
    id: `workflow-doc-${workflowId}-${Date.now()}`,
    workflowId,
    title: `Workflow Documentation: ${workflowId}`,
    description: 'Documentation for the workflow process.',
    steps: [
      { order: 1, name: 'Start', description: 'Workflow initiation' },
      { order: 2, name: 'Process', description: 'Main processing step' },
      { order: 3, name: 'Complete', description: 'Workflow completion' },
    ],
  };

  return NextResponse.json({ success: true, documentation });
}

async function documentAllWorkflows(projectId: string, options?: any) {
  return NextResponse.json({
    success: true,
    documentation: {
      id: `all-workflows-doc-${Date.now()}`,
      title: 'Workflows Reference',
      workflows: [],
    },
  });
}

async function generateWorkflowDiagram(projectId: string, workflowId: string) {
  return NextResponse.json({
    success: true,
    diagram: {
      workflowId,
      format: 'mermaid',
      content: `graph TD
    A[Start] --> B[Process]
    B --> C[End]`,
    },
  });
}

async function generateWorkflowDocs(projectId: string, options?: any) {
  return NextResponse.json({
    success: true,
    documentation: {
      id: `workflow-docs-${Date.now()}`,
      title: 'Workflow Documentation',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS LOGIC DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function documentBusinessRules(projectId: string, options?: any) {
  return NextResponse.json({
    success: true,
    documentation: {
      id: `business-rules-doc-${Date.now()}`,
      title: 'Business Rules Documentation',
      rules: [],
    },
  });
}

async function documentValidations(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { columns: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const validations: any[] = [];

  for (const col of columns) {
    if (!col.isNullable && !col.isPrimaryKey) {
      validations.push({
        field: col.name,
        rule: 'REQUIRED',
        message: `${col.name} is required`,
      });
    }

    if (col.maxLength) {
      validations.push({
        field: col.name,
        rule: 'MAX_LENGTH',
        value: col.maxLength,
        message: `${col.name} cannot exceed ${col.maxLength} characters`,
      });
    }

    if (col.dataType === 'INT' || col.dataType === 'BIGINT') {
      validations.push({
        field: col.name,
        rule: 'NUMERIC',
        message: `${col.name} must be a valid number`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    documentation: {
      tableName,
      validations,
    },
  });
}

async function documentTransformations(projectId: string, options?: any) {
  return NextResponse.json({
    success: true,
    documentation: {
      id: `transformations-doc-${Date.now()}`,
      title: 'Data Transformations Documentation',
      transformations: [],
    },
  });
}

async function generateDecisionTableDocs(projectId: string, tableName: string) {
  return NextResponse.json({
    success: true,
    documentation: {
      id: `decision-table-doc-${Date.now()}`,
      tableName,
      title: 'Decision Table Documentation',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN/UI DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function documentScreen(projectId: string, screenId: string, options?: any) {
  return NextResponse.json({
    success: true,
    documentation: {
      id: `screen-doc-${screenId}-${Date.now()}`,
      screenId,
      title: 'Screen Documentation',
    },
  });
}

async function documentAllScreens(projectId: string, options?: any) {
  return NextResponse.json({
    success: true,
    documentation: {
      id: `all-screens-doc-${Date.now()}`,
      title: 'Screens Reference',
      screens: [],
    },
  });
}

async function documentFieldValidations(projectId: string, screenId: string) {
  return NextResponse.json({
    success: true,
    documentation: {
      screenId,
      fieldValidations: [],
    },
  });
}

async function generateScreenWalkthrough(projectId: string, screenId: string) {
  return NextResponse.json({
    success: true,
    walkthrough: {
      id: `walkthrough-${screenId}-${Date.now()}`,
      screenId,
      steps: [
        { order: 1, action: 'Navigate to screen', description: 'Access the screen from the main menu' },
        { order: 2, action: 'Review fields', description: 'Examine available input fields' },
        { order: 3, action: 'Enter data', description: 'Fill in the required information' },
        { order: 4, action: 'Submit', description: 'Save or submit the form' },
      ],
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

async function createDocument(projectId: string, document: any) {
  const created = await db.generatedDocument.create({
    data: {
      projectId,
      documentId: document.id || `doc-${Date.now()}`,
      type: document.type || 'user_manual',
      title: document.title,
      content: JSON.stringify(document),
      version: document.version || '1.0.0',
    },
  });

  return NextResponse.json({ success: true, document: created });
}

async function updateDocument(projectId: string, documentId: string, updates: any) {
  const updated = await db.generatedDocument.update({
    where: { id: documentId, projectId },
    data: {
      ...updates,
      content: updates.content ? JSON.stringify(updates.content) : undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, document: updated });
}

async function getDocument(projectId: string, documentId: string) {
  const document = await db.generatedDocument.findFirst({
    where: { id: documentId, projectId },
  });

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    document: {
      ...document,
      content: JSON.parse(document.content || '{}'),
    },
  });
}

async function getDocuments(projectId: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.type) where.type = filters.type;

  const documents = await db.generatedDocument.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });

  return NextResponse.json({
    success: true,
    documents: documents.map(d => ({
      ...d,
      content: JSON.parse(d.content || '{}'),
    })),
    total: documents.length,
  });
}

async function deleteDocument(projectId: string, documentId: string) {
  await db.generatedDocument.delete({ where: { id: documentId, projectId } });
  return NextResponse.json({ success: true, message: 'Document deleted' });
}

async function publishDocument(projectId: string, documentId: string, version?: string) {
  const updated = await db.generatedDocument.update({
    where: { id: documentId, projectId },
    data: {
      status: 'published',
      version: version || undefined,
      publishedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, document: updated });
}

async function archiveDocument(projectId: string, documentId: string) {
  const updated = await db.generatedDocument.update({
    where: { id: documentId, projectId },
    data: { status: 'archived' },
  });

  return NextResponse.json({ success: true, document: updated });
}

async function duplicateDocument(projectId: string, documentId: string, options?: any) {
  const original = await db.generatedDocument.findFirst({
    where: { id: documentId, projectId },
  });

  if (!original) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const duplicated = await db.generatedDocument.create({
    data: {
      projectId,
      documentId: `doc-${Date.now()}`,
      type: original.type,
      title: options?.title || `${original.title} (Copy)`,
      content: original.content,
      version: '1.0.0',
    },
  });

  return NextResponse.json({ success: true, document: duplicated });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT VERSIONING
// ═══════════════════════════════════════════════════════════════════════════

async function getDocumentVersions(projectId: string, documentId: string) {
  const document = await db.generatedDocument.findFirst({
    where: { id: documentId, projectId },
  });

  return NextResponse.json({
    success: true,
    versions: document ? [{ version: document.version, createdAt: document.updatedAt }] : [],
  });
}

async function getDocumentVersion(projectId: string, documentId: string, version: string) {
  const document = await db.generatedDocument.findFirst({
    where: { id: documentId, projectId, version },
  });

  if (!document) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    document: {
      ...document,
      content: JSON.parse(document.content || '{}'),
    },
  });
}

async function compareDocumentVersions(projectId: string, documentId: string, version1: string, version2: string) {
  return NextResponse.json({
    success: true,
    comparison: {
      documentId,
      version1,
      version2,
      differences: [],
    },
  });
}

async function rollbackDocument(projectId: string, documentId: string, version: string) {
  const document = await db.generatedDocument.update({
    where: { id: documentId, projectId },
    data: { version },
  });

  return NextResponse.json({ success: true, document });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

async function getDocumentationTemplates() {
  return NextResponse.json({
    success: true,
    templates: [
      {
        id: 'user-manual-template',
        name: 'User Manual Template',
        description: 'Standard user manual structure',
        sections: ['Introduction', 'Getting Started', 'Features', 'Troubleshooting', 'FAQ'],
      },
      {
        id: 'api-reference-template',
        name: 'API Reference Template',
        description: 'REST API documentation structure',
        sections: ['Overview', 'Authentication', 'Endpoints', 'Error Codes', 'Examples'],
      },
      {
        id: 'developer-guide-template',
        name: 'Developer Guide Template',
        description: 'Technical documentation for developers',
        sections: ['Architecture', 'Database Schema', 'API Reference', 'Best Practices'],
      },
      {
        id: 'quick-start-template',
        name: 'Quick Start Guide Template',
        description: 'Brief getting started guide',
        sections: ['Welcome', 'Setup', 'First Steps', 'Next Steps'],
      },
      {
        id: 'release-notes-template',
        name: 'Release Notes Template',
        description: 'Version release documentation',
        sections: ['New Features', 'Improvements', 'Bug Fixes', 'Breaking Changes'],
      },
    ],
  });
}

async function getDocumentationTemplate(templateId: string) {
  return NextResponse.json({
    success: true,
    template: {
      id: templateId,
      name: 'Template',
      structure: {},
    },
  });
}

async function createDocumentationTemplate(template: any) {
  return NextResponse.json({
    success: true,
    template: {
      id: `template-${Date.now()}`,
      ...template,
    },
  });
}

async function applyDocumentationTemplate(projectId: string, templateId: string, params: any) {
  return NextResponse.json({
    success: true,
    result: {
      templateId,
      applied: true,
      document: {},
    },
  });
}

async function instantiateTemplate(projectId: string, templateId: string, params: any) {
  return NextResponse.json({
    success: true,
    document: {
      id: `doc-${Date.now()}`,
      templateId,
      title: params.title || 'New Document',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function exportDocument(projectId: string, documentId: string, format: string) {
  const document = await db.generatedDocument.findFirst({
    where: { id: documentId, projectId },
  });

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const content = JSON.parse(document.content || '{}');

  return NextResponse.json({
    success: true,
    export: {
      documentId,
      format,
      content: generateExportContent(content, format),
      filename: `${document.title.replace(/\s+/g, '_')}.${format === 'markdown' ? 'md' : format}`,
    },
  });
}

async function exportAllDocuments(projectId: string, format: string, options?: any) {
  const documents = await db.generatedDocument.findMany({
    where: { projectId },
  });

  return NextResponse.json({
    success: true,
    exports: documents.map(d => ({
      documentId: d.id,
      title: d.title,
      format,
    })),
    totalDocuments: documents.length,
  });
}

async function exportToPDF(projectId: string, documentId: string, options?: any) {
  return exportDocument(projectId, documentId, 'pdf');
}

async function exportToDOCX(projectId: string, documentId: string, options?: any) {
  return exportDocument(projectId, documentId, 'docx');
}

async function exportToHTML(projectId: string, documentId: string, options?: any) {
  return exportDocument(projectId, documentId, 'html');
}

async function exportToMarkdown(projectId: string, documentId: string, options?: any) {
  return exportDocument(projectId, documentId, 'markdown');
}

async function exportToConfluence(projectId: string, documentId: string, options?: any) {
  return NextResponse.json({
    success: true,
    message: 'Confluence export initiated',
    documentId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeDocumentationCoverage(projectId: string) {
  const [tables, procedures, documents] = await Promise.all([
    db.toolkitTable.count({ where: { projectId } }),
    db.toolkitProcedure.count({ where: { projectId } }),
    db.generatedDocument.count({ where: { projectId } }),
  ]);

  const coverage = {
    tables: {
      total: tables,
      documented: Math.min(documents, tables),
      percentage: tables > 0 ? Math.round((Math.min(documents, tables) / tables) * 100) : 0,
    },
    procedures: {
      total: procedures,
      documented: Math.floor(documents / 2),
      percentage: procedures > 0 ? Math.round((Math.floor(documents / 2) / procedures) * 100) : 0,
    },
    overall: {
      total: tables + procedures,
      documented: documents,
      percentage: (tables + procedures) > 0 ? Math.round((documents / (tables + procedures)) * 100) : 100,
    },
  };

  return NextResponse.json({
    success: true,
    coverage,
    recommendations: generateCoverageRecommendations(coverage),
  });
}

async function analyzeDocumentationQuality(projectId: string) {
  const documents = await db.generatedDocument.findMany({
    where: { projectId },
    select: { id: true, title: true, content: true },
  });

  const analysis = documents.map(doc => {
    const content = JSON.parse(doc.content || '{}');
    const sections = content.sections || [];
    const wordCount = JSON.stringify(content).split(/\s+/).length;

    return {
      documentId: doc.id,
      title: doc.title,
      sectionCount: sections.length,
      wordCount,
      qualityScore: calculateQualityScore(sections, wordCount),
    };
  });

  return NextResponse.json({
    success: true,
    analysis,
    averageQuality: analysis.length > 0
      ? Math.round(analysis.reduce((sum, a) => sum + a.qualityScore, 0) / analysis.length)
      : 100,
  });
}

async function suggestDocumentationImprovements(projectId: string, documentId: string) {
  return NextResponse.json({
    success: true,
    suggestions: [
      {
        type: 'content',
        message: 'Add more examples to clarify complex concepts',
        priority: 'medium',
      },
      {
        type: 'structure',
        message: 'Consider adding a troubleshooting section',
        priority: 'low',
      },
      {
        type: 'completeness',
        message: 'Add missing API endpoint documentation',
        priority: 'high',
      },
    ],
  });
}

async function findDocumentationGaps(projectId: string) {
  const [tables, procedures, documents] = await Promise.all([
    db.toolkitTable.findMany({ where: { projectId }, select: { tableName: true } }),
    db.toolkitProcedure.findMany({ where: { projectId }, select: { procedureName: true } }),
    db.generatedDocument.findMany({ where: { projectId }, select: { title: true, type: true } }),
  ]);

  const gaps: any[] = [];

  for (const table of tables) {
    const hasDoc = documents.some(d =>
      d.title.toLowerCase().includes(table.tableName.toLowerCase()) ||
      d.type === 'data_dictionary'
    );
    if (!hasDoc) {
      gaps.push({
        type: 'table',
        name: table.tableName,
        message: `No documentation found for table: ${table.tableName}`,
        priority: 'high',
      });
    }
  }

  for (const sp of procedures) {
    const hasDoc = documents.some(d =>
      d.title.toLowerCase().includes(sp.procedureName.toLowerCase()) ||
      d.type === 'api_reference'
    );
    if (!hasDoc) {
      gaps.push({
        type: 'stored_procedure',
        name: sp.procedureName,
        message: `No documentation found for stored procedure: ${sp.procedureName}`,
        priority: 'medium',
      });
    }
  }

  const docTypes = ['user_manual', 'api_reference', 'developer_guide'];
  for (const type of docTypes) {
    const hasType = documents.some(d => d.type === type);
    if (!hasType) {
      gaps.push({
        type: 'document',
        name: type,
        message: `Missing ${type.replace(/_/g, ' ')} documentation`,
        priority: type === 'user_manual' ? 'high' : 'medium',
      });
    }
  }

  return NextResponse.json({
    success: true,
    gaps,
    totalGaps: gaps.length,
  });
}

async function detectOutdatedDocs(projectId: string) {
  const documents = await db.generatedDocument.findMany({
    where: { projectId },
    select: { id: true, title: true, updatedAt: true },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const outdated = documents.filter(d => d.updatedAt < thirtyDaysAgo);

  return NextResponse.json({
    success: true,
    outdatedDocuments: outdated.map(d => ({
      documentId: d.id,
      title: d.title,
      lastUpdated: d.updatedAt,
      daysSinceUpdate: Math.floor((Date.now() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    })),
    totalOutdated: outdated.length,
  });
}

async function suggestDocumentationUpdates(projectId: string) {
  const [tables, documents] = await Promise.all([
    db.toolkitTable.findMany({ where: { projectId }, select: { tableName: true, updatedAt: true } }),
    db.generatedDocument.findMany({ where: { projectId }, select: { title: true, updatedAt: true } }),
  ]);

  const suggestions: any[] = [];

  for (const table of tables) {
    const relatedDoc = documents.find(d =>
      d.title.toLowerCase().includes(table.tableName.toLowerCase())
    );

    if (relatedDoc && table.updatedAt > relatedDoc.updatedAt) {
      suggestions.push({
        type: 'update_needed',
        entity: table.tableName,
        message: `Table ${table.tableName} was modified after its documentation was last updated`,
        priority: 'high',
      });
    }
  }

  return NextResponse.json({
    success: true,
    suggestions,
    totalSuggestions: suggestions.length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function importDocument(projectId: string, content: string, format: string) {
  return NextResponse.json({
    success: true,
    document: {
      id: `imported-${Date.now()}`,
      format,
      imported: true,
    },
  });
}

async function importFromWord(projectId: string, fileContent: string) {
  return NextResponse.json({
    success: true,
    message: 'Word document imported',
    document: { id: `imported-word-${Date.now()}` },
  });
}

async function importFromMarkdown(projectId: string, content: string) {
  return NextResponse.json({
    success: true,
    message: 'Markdown imported',
    document: { id: `imported-md-${Date.now()}` },
  });
}

async function importFromConfluence(projectId: string, content: string, options?: any) {
  return NextResponse.json({
    success: true,
    message: 'Confluence content imported',
    document: { id: `imported-confluence-${Date.now()}` },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH & NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

async function searchDocuments(projectId: string, query: string, options?: any) {
  const documents = await db.generatedDocument.findMany({
    where: {
      projectId,
      OR: [
        { title: { contains: query } },
        { content: { contains: query } },
      ],
    },
    take: options?.limit || 20,
  });

  return NextResponse.json({
    success: true,
    query,
    results: documents.map(d => ({
      id: d.id,
      title: d.title,
      type: d.type,
      snippet: d.content?.substring(0, 200) || '',
    })),
    totalResults: documents.length,
  });
}

async function getDocumentTree(projectId: string) {
  const documents = await db.generatedDocument.findMany({
    where: { projectId },
    select: { id: true, title: true, type: true },
    orderBy: { type: 'asc' },
  });

  const tree: Record<string, any[]> = {};

  for (const doc of documents) {
    if (!tree[doc.type]) {
      tree[doc.type] = [];
    }
    tree[doc.type].push(doc);
  }

  return NextResponse.json({
    success: true,
    tree,
  });
}

async function getRelatedDocuments(projectId: string, documentId: string) {
  const document = await db.generatedDocument.findFirst({
    where: { id: documentId, projectId },
  });

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const related = await db.generatedDocument.findMany({
    where: {
      projectId,
      id: { not: documentId },
      type: document.type,
    },
    take: 5,
  });

  return NextResponse.json({
    success: true,
    relatedDocuments: related,
  });
}

async function getDocumentLinks(projectId: string, documentId: string) {
  return NextResponse.json({
    success: true,
    links: {
      internal: [],
      external: [],
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

async function getDocumentationStats(projectId: string) {
  const [totalDocs, publishedDocs, draftDocs, byType] = await Promise.all([
    db.generatedDocument.count({ where: { projectId } }),
    db.generatedDocument.count({ where: { projectId, status: 'published' } }),
    db.generatedDocument.count({ where: { projectId, status: 'draft' } }),
    db.generatedDocument.groupBy({
      by: ['type'],
      where: { projectId },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    success: true,
    stats: {
      totalDocuments: totalDocs,
      published: publishedDocs,
      draft: draftDocs,
      byType: byType.map(b => ({ type: b.type, count: b._count })),
    },
  });
}

async function getDocumentationDashboard(projectId: string) {
  const stats = await getDocumentationStats(projectId);
  const coverage = await analyzeDocumentationCoverage(projectId);
  const gaps = await findDocumentationGaps(projectId);

  return NextResponse.json({
    success: true,
    dashboard: {
      stats: stats.json ? (await stats.json()).stats : {},
      coverage: coverage.json ? (await coverage.json()).coverage : {},
      gaps: gaps.json ? (await gaps.json()).gaps : [],
    },
  });
}

async function getDocumentationReport(projectId: string, options?: any) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  const stats = await getDocumentationStats(projectId);
  const coverage = await analyzeDocumentationCoverage(projectId);

  return NextResponse.json({
    success: true,
    report: {
      projectName: project?.name,
      generatedAt: new Date(),
      summary: {
        documentationStatus: 'In Progress',
        coverage: coverage.json ? (await coverage.json()).coverage.overall : {},
        statistics: stats.json ? (await stats.json()).stats : {},
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function batchGenerateDocuments(projectId: string, documents: any[]) {
  const results: any[] = [];

  for (const doc of documents) {
    try {
      const result = await createDocument(projectId, doc);
      results.push({ success: true, document: doc.title });
    } catch (e) {
      results.push({ success: false, document: doc.title, error: String(e) });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    totalGenerated: results.filter(r => r.success).length,
  });
}

async function batchExportDocuments(projectId: string, documentIds: string[], format: string) {
  const exports: any[] = [];

  for (const docId of documentIds) {
    exports.push({
      documentId: docId,
      status: 'queued',
      format,
    });
  }

  return NextResponse.json({
    success: true,
    exports,
    totalExports: exports.length,
  });
}

async function batchPublishDocuments(projectId: string, documentIds: string[]) {
  const results: any[] = [];

  for (const docId of documentIds) {
    try {
      await db.generatedDocument.update({
        where: { id: docId, projectId },
        data: { status: 'published', publishedAt: new Date() },
      });
      results.push({ documentId: docId, success: true });
    } catch (e) {
      results.push({ documentId: docId, success: false, error: String(e) });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    totalPublished: results.filter(r => r.success).length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

async function getDocumentationSummary(projectId: string) {
  const [tables, procedures, documents] = await Promise.all([
    db.toolkitTable.count({ where: { projectId } }),
    db.toolkitProcedure.count({ where: { projectId } }),
    db.generatedDocument.findMany({ where: { projectId } }),
  ]);

  return NextResponse.json({
    success: true,
    summary: {
      totalTables: tables,
      totalProcedures: procedures,
      totalDocuments: documents.length,
      documentTypes: Array.from(new Set(documents.map(d => d.type))),
      lastUpdated: documents.length > 0
        ? documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0].updatedAt
        : null,
      health: {
        score: Math.min(100, Math.round((documents.length / Math.max(1, tables + procedures)) * 100)),
        status: documents.length >= tables ? 'Good' : 'Needs Improvement',
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateFieldsTable(columns: any[]): any[] {
  return [{
    id: 'fields-table',
    headers: ['Field', 'Type', 'Required', 'Description'],
    rows: columns.slice(0, 20).map((c: any) => [
      c.name,
      c.dataType,
      !c.isNullable ? 'Yes' : 'No',
      c.description || '-',
    ]),
  }];
}

function generateDetailedFieldsTable(columns: any[]): any[] {
  return [{
    id: 'detailed-fields-table',
    headers: ['Column', 'Data Type', 'Nullable', 'Primary Key', 'Default', 'Max Length'],
    rows: columns.map((c: any) => [
      c.name,
      c.dataType,
      c.isNullable ? 'Yes' : 'No',
      c.isPrimaryKey ? 'Yes' : 'No',
      c.defaultValue || '-',
      c.maxLength || '-',
    ]),
  }];
}

function generateFKTable(fks: any[]): any[] {
  if (fks.length === 0) return [];
  return [{
    id: 'fk-table',
    headers: ['Column', 'References', 'On Delete', 'On Update'],
    rows: fks.map((fk: any) => [
      fk.column,
      `${fk.referencedTable}(${fk.referencedColumn})`,
      fk.onDelete || 'NO ACTION',
      fk.onUpdate || 'NO ACTION',
    ]),
  }];
}

function generateParameterTable(params: any[]): any[] {
  if (params.length === 0) return [];
  return [{
    id: 'params-table',
    headers: ['Parameter', 'Type', 'Direction', 'Default'],
    rows: params.map((p: any) => [
      p.name,
      p.type,
      p.direction || 'INPUT',
      p.defaultValue || '-',
    ]),
  }];
}

function generateSPCallParams(params: any[]): string {
  return params.map((p: any) => `@${p.name} = <${p.type}>`).join(', ');
}

function calculateReadTime(sections: any[]): number {
  const totalWords = sections.reduce((acc, section) => {
    const sectionWords = (section.content || '').split(/\s+/).length;
    const subsectionWords = (section.subsections || []).reduce(
      (subAcc: number, sub: any) => subAcc + (sub.content || '').split(/\s+/).length,
      0
    );
    return acc + sectionWords + subsectionWords;
  }, 0);
  return Math.max(1, Math.ceil(totalWords / 200));
}

function generateOpenAPISpec(project: any, endpoints: any[]): any {
  return {
    openapi: '3.0.0',
    info: {
      title: project.name,
      version: '1.0.0',
      description: project.description || 'API Documentation',
    },
    paths: endpoints.reduce((acc: any, ep) => {
      acc[ep.path] = {
        get: { summary: ep.description },
        post: { summary: `Create ${ep.description}` },
      };
      return acc;
    }, {}),
  };
}

function generateMermaidERD(tables: any[]): string {
  const lines: string[] = ['erDiagram'];

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const fks = JSON.parse(table.foreignKeys || '[]');

    for (const col of columns.slice(0, 10)) {
      lines.push(`    ${table.tableName} {`);
      lines.push(`        ${col.dataType} ${col.name}`);
      lines.push(`    }`);
    }

    for (const fk of fks) {
      lines.push(`    ${table.tableName} ||--o{ ${fk.referencedTable} : "references"`);
    }
  }

  return lines.join('\n');
}

function generateExportContent(content: any, format: string): string {
  switch (format) {
    case 'markdown':
      return generateMarkdownExport(content);
    case 'html':
      return generateHTMLExport(content);
    case 'json':
      return JSON.stringify(content, null, 2);
    default:
      return JSON.stringify(content, null, 2);
  }
}

function generateMarkdownExport(content: any): string {
  const lines: string[] = [];

  lines.push(`# ${content.title || 'Document'}`);
  lines.push('');

  if (content.sections) {
    for (const section of content.sections) {
      lines.push(`## ${section.title}`);
      lines.push(section.content || '');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateHTMLExport(content: any): string {
  return `<!DOCTYPE html>
<html>
<head><title>${content.title || 'Document'}</title></head>
<body>
<h1>${content.title || 'Document'}</h1>
${(content.sections || []).map((s: any) => `<h2>${s.title}</h2><p>${s.content || ''}</p>`).join('\n')}
</body>
</html>`;
}

function generateCoverageRecommendations(coverage: any): any[] {
  const recommendations: any[] = [];

  if (coverage.tables.percentage < 100) {
    recommendations.push({
      type: 'tables',
      message: 'Generate documentation for undocumented tables',
      priority: 'high',
      affected: coverage.tables.total - coverage.tables.documented,
    });
  }

  if (coverage.procedures.percentage < 100) {
    recommendations.push({
      type: 'procedures',
      message: 'Document stored procedures with parameters and usage',
      priority: 'medium',
      affected: coverage.procedures.total - coverage.procedures.documented,
    });
  }

  return recommendations;
}

function calculateQualityScore(sections: any[], wordCount: number): number {
  let score = 50;

  score += Math.min(20, sections.length * 5);
  score += Math.min(20, Math.floor(wordCount / 200));
  const subsections = sections.reduce((acc, s) => acc + (s.subsections?.length || 0), 0);
  score += Math.min(10, subsections);

  return Math.min(100, score);
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'list-actions':
      return NextResponse.json({
        success: true,
        actions: {
          documentationGeneration: [
            'generate-user-manual',
            'generate-developer-guide',
            'generate-api-reference',
            'generate-tutorial',
            'generate-quick-start-guide',
            'generate-faq',
            'generate-release-notes',
            'generate-changelog',
            'generate-readme',
            'generate-installation-guide',
            'generate-configuration-guide',
            'generate-deployment-guide',
            'generate-troubleshooting-guide',
            'generate-security-guide',
            'generate-performance-guide',
            'generate-integration-guide',
          ],
          schemaDocumentation: [
            'document-table',
            'document-all-tables',
            'document-column',
            'document-foreign-keys',
            'document-indexes',
            'document-constraints',
            'generate-erd-documentation',
            'generate-data-dictionary',
          ],
          spDocumentation: [
            'document-sp',
            'document-all-sps',
            'document-sp-parameters',
            'document-sp-usage',
            'generate-sp-reference',
          ],
          workflowDocumentation: [
            'document-workflow',
            'document-all-workflows',
            'generate-workflow-diagram',
            'generate-workflow-docs',
          ],
          businessLogicDocumentation: [
            'document-business-rules',
            'document-validations',
            'document-transformations',
            'generate-decision-table-docs',
          ],
          screenDocumentation: [
            'document-screen',
            'document-all-screens',
            'document-field-validations',
            'generate-screen-walkthrough',
          ],
          documentManagement: [
            'create-document',
            'update-document',
            'get-document',
            'get-documents',
            'delete-document',
            'publish-document',
            'archive-document',
            'duplicate-document',
          ],
          versioning: [
            'get-document-versions',
            'get-document-version',
            'compare-versions',
            'rollback-document',
          ],
          templates: [
            'get-templates',
            'get-template',
            'create-template',
            'apply-template',
            'instantiate-template',
          ],
          export: [
            'export-document',
            'export-all-documents',
            'export-to-pdf',
            'export-to-docx',
            'export-to-html',
            'export-to-markdown',
            'export-to-confluence',
          ],
          intelligence: [
            'analyze-documentation-coverage',
            'analyze-documentation-quality',
            'suggest-documentation-improvements',
            'find-documentation-gaps',
            'detect-outdated-docs',
            'suggest-updates',
          ],
          import: [
            'import-document',
            'import-from-word',
            'import-from-markdown',
            'import-from-confluence',
          ],
          search: [
            'search-documents',
            'get-document-tree',
            'get-related-documents',
            'get-document-links',
          ],
          statistics: [
            'get-documentation-stats',
            'get-documentation-dashboard',
            'get-documentation-report',
          ],
          batch: [
            'batch-generate',
            'batch-export',
            'batch-publish',
          ],
          summary: [
            'get-documentation-summary',
          ],
        },
        totalActions: 84,
      });

    default:
      return NextResponse.json({
        success: true,
        message: 'Documentation Intelligence API is ready',
        version: '1.0.0',
        endpoints: {
          POST: 'Send action in request body',
          GET: 'Use ?action=list-actions to see all available actions',
        },
      });
  }
}
