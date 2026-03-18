// =============================================================================
// Generation Agents API Route
// Handles URL Generation, Tutorial Generation, and UAT Test Generation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  URLGeneratorAgent,
  createURLGeneratorAgent,
  URLGeneratorConfig,
} from '@/lib/agents/URLGeneratorAgent';
import {
  TutorialGeneratorAgent,
  createTutorialGeneratorAgent,
  TutorialGeneratorConfig,
} from '@/lib/agents/TutorialGeneratorAgent';
import {
  UATGeneratorAgent,
  createUATGeneratorAgent,
  UATGeneratorConfig,
} from '@/lib/agents/UATGeneratorAgent';
import { RouteRegistryGenerator } from '@/lib/generators/RouteRegistry';
import { DocumentationGenerator } from '@/lib/generators/DocumentationGenerator';
import { TestStepGenerator } from '@/lib/generators/TestStepGeneration';
import { ExpectedResultGenerator } from '@/lib/generators/ExpectedResultGenerator';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'generate-url-registry':
        return await generateURLRegistry(body);

      case 'generate-navigation':
        return await generateNavigation(body);

      case 'generate-route-config':
        return await generateRouteConfig(body);

      case 'generate-tutorial':
        return await generateTutorial(body);

      case 'generate-user-manual':
        return await generateUserManual(body);

      case 'generate-developer-docs':
        return await generateDeveloperDocs(body);

      case 'generate-uat-tests':
        return await generateUATTests(body);

      case 'generate-test-steps':
        return await generateTestSteps(body);

      case 'generate-expected-results':
        return await generateExpectedResults(body);

      case 'generate-all':
        return await generateAll(body);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generator API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// URL GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateURLRegistry(body: {
  projectId: string;
  projectName: string;
  modules: any[];
  tables: any[];
  workflows?: any[];
  screens?: any[];
}) {
  const { projectId, projectName, modules = [], tables = [], workflows = [], screens = [] } = body;

  const generator = new RouteRegistryGenerator(modules, tables, workflows, screens);
  const registry = generator.generateRegistry(projectId, projectName);

  return NextResponse.json({
    success: true,
    registry: {
      ...registry,
      routes: registry.routes.slice(0, 50), // Limit for response
    },
    statistics: registry.statistics,
  });
}

async function generateNavigation(body: {
  projectId: string;
  projectName: string;
  modules: any[];
  tables: any[];
}) {
  const { projectId, projectName, modules = [], tables = [] } = body;

  const generator = new RouteRegistryGenerator(modules, tables, [], []);
  const registry = generator.generateRegistry(projectId, projectName);

  return NextResponse.json({
    success: true,
    navigation: registry.navigation,
    statistics: {
      totalGroups: registry.navigation.length,
      totalItems: registry.navigation.reduce((sum, g) => sum + g.items.length, 0),
    },
  });
}

async function generateRouteConfig(body: {
  projectId: string;
  projectName: string;
  modules: any[];
  tables: any[];
  format?: 'typescript' | 'javascript' | 'json' | 'yaml';
  framework?: 'nextjs' | 'react-router' | 'vue-router' | 'angular';
}) {
  const {
    projectId,
    projectName,
    modules = [],
    tables = [],
    format = 'typescript',
    framework,
  } = body;

  const generator = new RouteRegistryGenerator(modules, tables, [], []);
  const registry = generator.generateRegistry(projectId, projectName);

  let config = '';
  if (framework) {
    const agent = createURLGeneratorAgent({
      projectId,
      projectName,
      includeAPIRoutes: true,
      includeScreenRoutes: true,
      includeWorkflowRoutes: true,
      generateNavigation: true,
      defaultVersion: '1.0',
      basePath: '/',
    });
    config = agent.generateFrameworkRoutes(framework, registry.routes);
  } else {
    config = generator.generateRouteConfig(format);
  }

  return NextResponse.json({
    success: true,
    config,
    format: framework || format,
    routeCount: registry.routes.length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TUTORIAL & DOCUMENTATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateTutorial(body: {
  projectId: string;
  projectName: string;
  module: any;
  screen?: any;
  table?: any;
  workflow?: any;
  outputFormats?: string[];
}) {
  const {
    projectId,
    projectName,
    module,
    screen,
    table,
    workflow,
    outputFormats = ['markdown'],
  } = body;

  const config: TutorialGeneratorConfig = {
    projectId,
    projectName,
    includeScreenshots: false,
    includeCodeExamples: true,
    includeTroubleshooting: true,
    defaultLanguage: 'en',
    outputFormats: outputFormats as any,
  };

  const agent = createTutorialGeneratorAgent(config);

  let result;
  if (workflow) {
    const tutorial = agent.generateTutorialFromWorkflow(workflow, module);
    result = tutorial ? [tutorial] : [];
  } else if (screen && table) {
    const tutorial = agent.generateTutorialFromScreen(screen, module, [table]);
    result = tutorial ? [tutorial] : [];
  } else {
    return NextResponse.json({
      error: 'Either workflow or screen+table must be provided',
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    tutorials: result,
    statistics: {
      totalTutorials: result.length,
      totalSteps: result.reduce((sum, t) => sum + t.steps.length, 0),
    },
  });
}

async function generateUserManual(body: {
  projectId: string;
  projectName: string;
  module: any;
  screens?: any[];
  tables?: any[];
  outputFormat?: string;
}) {
  const {
    projectId,
    projectName,
    module,
    screens = [],
    tables = [],
    outputFormat = 'markdown',
  } = body;

  const generator = new DocumentationGenerator();
  const document = generator.generateUserManual(module, screens, tables);
  const exported = generator.exportDocument(document, outputFormat as any);

  return NextResponse.json({
    success: true,
    document: {
      id: document.id,
      title: document.title,
      type: document.type,
      sections: document.sections.length,
      estimatedReadTime: document.metadata.estimatedReadTime,
    },
    content: exported,
    format: outputFormat,
  });
}

async function generateDeveloperDocs(body: {
  projectId: string;
  projectName: string;
  module: any;
  tables?: any[];
  workflows?: any[];
  outputFormat?: string;
}) {
  const {
    projectId,
    projectName,
    module,
    tables = [],
    workflows = [],
    outputFormat = 'markdown',
  } = body;

  const generator = new DocumentationGenerator();
  const document = generator.generateDeveloperDocumentation(module, tables, workflows);
  const exported = generator.exportDocument(document, outputFormat as any);

  return NextResponse.json({
    success: true,
    document: {
      id: document.id,
      title: document.title,
      type: document.type,
      sections: document.sections.length,
      estimatedReadTime: document.metadata.estimatedReadTime,
    },
    content: exported,
    format: outputFormat,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// UAT TEST GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateUATTests(body: {
  projectId: string;
  projectName: string;
  modules: any[];
  tables: any[];
  screens?: any[];
  workflows?: any[];
  options?: {
    includePositiveTests?: boolean;
    includeNegativeTests?: boolean;
    includeBoundaryTests?: boolean;
    includeWorkflowTests?: boolean;
  };
  outputFormat?: string;
}) {
  const {
    projectId,
    projectName,
    modules = [],
    tables = [],
    screens = [],
    workflows = [],
    options = {},
    outputFormat = 'markdown',
  } = body;

  const config: UATGeneratorConfig = {
    projectId,
    projectName,
    includePositiveTests: options.includePositiveTests ?? true,
    includeNegativeTests: options.includeNegativeTests ?? true,
    includeBoundaryTests: options.includeBoundaryTests ?? false,
    includeWorkflowTests: options.includeWorkflowTests ?? true,
    defaultPriority: 'High',
    outputFormats: [outputFormat as any],
  };

  const agent = createUATGeneratorAgent(config);
  const result = agent.generateUATSuites(modules, tables, screens, workflows);

  return NextResponse.json({
    success: true,
    testSuites: result.testSuites.map(suite => ({
      id: suite.id,
      name: suite.name,
      moduleId: suite.moduleId,
      testCaseCount: suite.testCases.length,
      statistics: suite.statistics,
    })),
    allTestCases: result.allTestCases.slice(0, 100), // Limit for response
    statistics: result.statistics,
    export: result.exports.get(outputFormat as any)?.slice(0, 5000), // First 5000 chars
  });
}

async function generateTestSteps(body: {
  screen: any;
  table: any;
  operation?: 'create' | 'read' | 'update' | 'delete';
  workflow?: any;
  outputFormat?: string;
}) {
  const { screen, table, operation = 'create', workflow, outputFormat = 'markdown' } = body;

  const generator = new TestStepGenerator();
  let groups;

  if (workflow) {
    groups = generator.generateFromWorkflow(workflow);
  } else if (screen && table) {
    groups = generator.generateFromScreen(screen, table, operation);
  } else {
    return NextResponse.json({
      error: 'Either workflow or screen+table must be provided',
    }, { status: 400 });
  }

  const exported = generator.exportToFormat(groups, outputFormat as any);

  return NextResponse.json({
    success: true,
    groups: groups.map(g => ({
      id: g.id,
      name: g.name,
      stepCount: g.steps.length,
      isOptional: g.isOptional,
    })),
    content: exported,
    format: outputFormat,
  });
}

async function generateExpectedResults(body: {
  testStep?: any;
  screen?: any;
  table?: any;
  operation?: 'create' | 'read' | 'update' | 'delete';
  workflow?: any;
  outputFormat?: string;
}) {
  const {
    testStep,
    screen,
    table,
    operation = 'create',
    workflow,
    outputFormat = 'markdown',
  } = body;

  const generator = new ExpectedResultGenerator();
  let results;

  if (workflow) {
    results = generator.generateForWorkflow(workflow).flatMap(s => s.expectedResults);
  } else if (screen && table) {
    const scenario = generator.generateForCRUD(screen, table, operation);
    results = scenario.expectedResults;
  } else if (testStep) {
    results = generator.generateForTestStep(testStep, screen, table);
  } else {
    return NextResponse.json({
      error: 'workflow, screen+table, or testStep must be provided',
    }, { status: 400 });
  }

  const exported = generator.exportToFormat(results, outputFormat as any);

  return NextResponse.json({
    success: true,
    results: results.slice(0, 20), // Limit for response
    content: exported,
    format: outputFormat,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE ALL (Comprehensive Generation)
// ═══════════════════════════════════════════════════════════════════════════

async function generateAll(body: {
  projectId: string;
  projectName: string;
  modules: any[];
  tables: any[];
  screens?: any[];
  workflows?: any[];
  outputFormats?: string[];
}) {
  const startTime = Date.now();
  const {
    projectId,
    projectName,
    modules = [],
    tables = [],
    screens = [],
    workflows = [],
    outputFormats = ['markdown'],
  } = body;

  const results: Record<string, any> = {};

  // 1. URL Registry
  const routeGenerator = new RouteRegistryGenerator(modules, tables, workflows || [], screens);
  results.urlRegistry = routeGenerator.generateRegistry(projectId, projectName);

  // 2. Tutorials & Documentation
  const tutorialConfig: TutorialGeneratorConfig = {
    projectId,
    projectName,
    includeScreenshots: false,
    includeCodeExamples: true,
    includeTroubleshooting: true,
    defaultLanguage: 'en',
    outputFormats: outputFormats as any,
  };
  const tutorialAgent = createTutorialGeneratorAgent(tutorialConfig);
  results.documentation = tutorialAgent.generateAll(modules, tables, screens, workflows || []);

  // 3. UAT Tests
  const uatConfig: UATGeneratorConfig = {
    projectId,
    projectName,
    includePositiveTests: true,
    includeNegativeTests: true,
    includeBoundaryTests: true,
    includeWorkflowTests: true,
    defaultPriority: 'High',
    outputFormats: outputFormats as any,
  };
  const uatAgent = createUATGeneratorAgent(uatConfig);
  results.uat = uatAgent.generateUATSuites(modules, tables, screens, workflows || []);

  return NextResponse.json({
    success: true,
    summary: {
      urlRegistry: {
        totalRoutes: results.urlRegistry.statistics.totalRoutes,
        moduleCount: results.urlRegistry.statistics.moduleCount,
      },
      documentation: {
        tutorials: results.documentation.statistics.totalTutorials,
        documents: results.documentation.statistics.totalDocuments,
      },
      uat: {
        testCases: results.uat.statistics.totalTestCases,
        testSuites: results.uat.statistics.totalSuites,
      },
      generationTimeMs: Date.now() - startTime,
    },
    projectId,
    projectName,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'list-generators':
      return NextResponse.json({
        success: true,
        generators: [
          {
            name: 'URLGeneratorAgent',
            actions: ['generate-url-registry', 'generate-navigation', 'generate-route-config'],
            description: 'Generates routes, URLs, and navigation structures',
          },
          {
            name: 'TutorialGeneratorAgent',
            actions: ['generate-tutorial', 'generate-user-manual', 'generate-developer-docs'],
            description: 'Generates tutorials and documentation',
          },
          {
            name: 'UATGeneratorAgent',
            actions: ['generate-uat-tests', 'generate-test-steps', 'generate-expected-results'],
            description: 'Generates UAT test cases and test steps',
          },
        ],
        outputFormats: ['markdown', 'json', 'csv', 'html', 'pdf', 'testrail', 'xray'],
      });

    case 'list-frameworks':
      return NextResponse.json({
        success: true,
        frameworks: [
          { id: 'nextjs', name: 'Next.js', description: 'React framework with App Router' },
          { id: 'react-router', name: 'React Router', description: 'React routing library' },
          { id: 'vue-router', name: 'Vue Router', description: 'Vue.js official router' },
          { id: 'angular', name: 'Angular Router', description: 'Angular built-in router' },
        ],
      });

    default:
      return NextResponse.json({
        success: true,
        message: 'Generator API is ready',
        endpoints: {
          POST: [
            'generate-url-registry',
            'generate-navigation',
            'generate-route-config',
            'generate-tutorial',
            'generate-user-manual',
            'generate-developer-docs',
            'generate-uat-tests',
            'generate-test-steps',
            'generate-expected-results',
            'generate-all',
          ],
          GET: ['list-generators', 'list-frameworks'],
        },
      });
  }
}
