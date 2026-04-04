// =============================================================================
// Phase 5 Schema API Route
// Handles CRUD operations for Page Intelligence, Forms, Workflows, Reports, Test Cases
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // Page Intelligence
      case 'create-page':
        return await createPage(body);
      case 'update-page':
        return await updatePage(body);
      case 'get-pages':
        return await getPages(body);
      case 'get-page':
        return await getPage(body);
      case 'delete-page':
        return await deletePage(body);

      // Page Components
      case 'create-component':
        return await createComponent(body);
      case 'get-components':
        return await getComponents(body);

      // Forms
      case 'create-form':
        return await createForm(body);
      case 'get-forms':
        return await getForms(body);
      case 'get-form':
        return await getForm(body);

      // Form Fields
      case 'create-field':
        return await createField(body);
      case 'get-fields':
        return await getFields(body);

      // Controllers
      case 'create-controller':
        return await createController(body);
      case 'get-controllers':
        return await getControllers(body);

      // API Endpoints
      case 'create-endpoint':
        return await createEndpoint(body);
      case 'get-endpoints':
        return await getEndpoints(body);

      // Workflows
      case 'create-workflow':
        return await createWorkflow(body);
      case 'get-workflows':
        return await getWorkflows(body);
      case 'get-workflow':
        return await getWorkflow(body);

      // Workflow States
      case 'create-state':
        return await createState(body);
      case 'get-states':
        return await getStates(body);

      // Workflow Transitions
      case 'create-transition':
        return await createTransition(body);
      case 'get-transitions':
        return await getTransitions(body);

      // Reports
      case 'create-report':
        return await createReport(body);
      case 'get-reports':
        return await getReports(body);
      case 'get-report':
        return await getReport(body);

      // Test Cases
      case 'create-test-case':
        return await createTestCase(body);
      case 'get-test-cases':
        return await getTestCases(body);
      case 'get-test-case':
        return await getTestCase(body);

      // Agent Runs
      case 'create-agent-run':
        return await createAgentRun(body);
      case 'get-agent-runs':
        return await getAgentRuns(body);
      case 'complete-agent-run':
        return await completeAgentRun(body);

      // Agent Messages
      case 'log-agent-message':
        return await logAgentMessage(body);
      case 'get-agent-messages':
        return await getAgentMessages(body);

      // Bulk Operations
      case 'bulk-create-pages':
        return await bulkCreatePages(body);
      case 'bulk-create-forms':
        return await bulkCreateForms(body);
      case 'bulk-create-endpoints':
        return await bulkCreateEndpoints(body);
      case 'bulk-create-workflows':
        return await bulkCreateWorkflows(body);
      case 'bulk-create-test-cases':
        return await bulkCreateTestCases(body);

      // Statistics
      case 'get-schema-stats':
        return await getSchemaStats(body);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Schema API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════

async function createPage(body: {
  projectId: string;
  moduleId?: string;
  name: string;
  urlSlug: string;
  title?: string;
  layout?: string;
  pageType?: string;
  sourceFile?: string;
  sourceTable?: string;
}) {
  const page = await db.page.create({
    data: {
      projectId: body.projectId,
      moduleId: body.moduleId,
      name: body.name,
      urlSlug: body.urlSlug,
      title: body.title,
      layout: body.layout,
      pageType: body.pageType || 'form',
      sourceFile: body.sourceFile,
      sourceTable: body.sourceTable,
    },
  });

  return NextResponse.json({ success: true, page });
}

async function updatePage(body: {
  pageId: string;
  data: Record<string, unknown>;
}) {
  const page = await db.page.update({
    where: { id: body.pageId },
    data: body.data,
  });

  return NextResponse.json({ success: true, page });
}

async function getPages(body: { projectId: string; pageType?: string }) {
  const pages = await db.page.findMany({
    where: {
      projectId: body.projectId,
      ...(body.pageType && { pageType: body.pageType }),
    },
    include: {
      components: true,
      forms: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, pages });
}

async function getPage(body: { pageId: string }) {
  const page = await db.page.findUnique({
    where: { id: body.pageId },
    include: {
      components: {
        include: {
          children: true,
        },
      },
      forms: {
        include: {
          fields: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, page });
}

async function deletePage(body: { pageId: string }) {
  await db.page.delete({
    where: { id: body.pageId },
  });

  return NextResponse.json({ success: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

async function createComponent(body: {
  pageId: string;
  componentType: string;
  componentName: string;
  parentComponentId?: string;
  position?: number;
  props?: Record<string, unknown>;
  content?: string;
}) {
  const component = await db.pageComponent.create({
    data: {
      pageId: body.pageId,
      componentType: body.componentType,
      componentName: body.componentName,
      parentComponentId: body.parentComponentId,
      position: body.position || 0,
      props: JSON.stringify(body.props || {}),
      content: body.content,
    },
  });

  return NextResponse.json({ success: true, component });
}

async function getComponents(body: { pageId: string }) {
  const components = await db.pageComponent.findMany({
    where: { pageId: body.pageId },
    orderBy: { position: 'asc' },
  });

  return NextResponse.json({
    success: true,
    components: components.map(c => ({
      ...c,
      props: JSON.parse(c.props),
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════

async function createForm(body: {
  projectId: string;
  pageId?: string;
  name: string;
  method?: string;
  actionUrl?: string;
  sourceTable?: string;
  sourceSP?: string;
}) {
  const formKey = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const form = await db.form.create({
    data: {
      projectId: body.projectId,
      pageId: body.pageId,
      name: body.name,
      formKey,
      method: body.method || 'POST',
      actionUrl: body.actionUrl,
      sourceTable: body.sourceTable,
      sourceSP: body.sourceSP,
    },
  });

  return NextResponse.json({ success: true, form });
}

async function getForms(body: { projectId: string; sourceTable?: string }) {
  const forms = await db.form.findMany({
    where: {
      projectId: body.projectId,
      ...(body.sourceTable && { sourceTable: body.sourceTable }),
    },
    include: {
      fields: {
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    forms: forms.map(f => ({
      ...f,
      fields: f.fields.map(field => ({
        ...field,
        validationRules: JSON.parse(field.validationRules),
      })),
    })),
  });
}

async function getForm(body: { formId: string }) {
  const form = await db.form.findUnique({
    where: { id: body.formId },
    include: {
      fields: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return NextResponse.json({
    success: true,
    form: form ? {
      ...form,
      fields: form.fields.map(f => ({
        ...f,
        validationRules: JSON.parse(f.validationRules),
      })),
    } : null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM FIELDS
// ═══════════════════════════════════════════════════════════════════════════

async function createField(body: {
  formId: string;
  fieldName: string;
  fieldType?: string;
  uiComponent?: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  validationRules?: Record<string, unknown>[];
  isRequired?: boolean;
  isReadOnly?: boolean;
  defaultValue?: string;
  position?: number;
  section?: string;
  linkedColumn?: string;
  semanticType?: string;
  sensitivity?: string;
}) {
  const fieldKey = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const field = await db.formField.create({
    data: {
      formId: body.formId,
      fieldName: body.fieldName,
      fieldKey,
      fieldType: body.fieldType || 'text_input',
      uiComponent: body.uiComponent,
      label: body.label,
      placeholder: body.placeholder,
      helpText: body.helpText,
      validationRules: JSON.stringify(body.validationRules || []),
      isRequired: body.isRequired || false,
      isReadOnly: body.isReadOnly || false,
      defaultValue: body.defaultValue,
      position: body.position || 0,
      section: body.section,
      linkedColumn: body.linkedColumn,
      semanticType: body.semanticType,
      sensitivity: body.sensitivity || 'public',
    },
  });

  return NextResponse.json({ success: true, field });
}

async function getFields(body: { formId: string }) {
  const fields = await db.formField.findMany({
    where: { formId: body.formId },
    orderBy: { position: 'asc' },
  });

  return NextResponse.json({
    success: true,
    fields: fields.map(f => ({
      ...f,
      validationRules: JSON.parse(f.validationRules),
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

async function createController(body: {
  projectId: string;
  moduleId?: string;
  name: string;
  filePath?: string;
  sourceType?: string;
}) {
  const controllerKey = `ctrl-${body.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  const controller = await db.controller.create({
    data: {
      projectId: body.projectId,
      moduleId: body.moduleId,
      name: body.name,
      controllerKey,
      filePath: body.filePath,
      sourceType: body.sourceType || 'mvc',
    },
  });

  return NextResponse.json({ success: true, controller });
}

async function getControllers(body: { projectId: string }) {
  const controllers = await db.controller.findMany({
    where: { projectId: body.projectId },
    include: {
      endpoints: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ success: true, controllers });
}

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

async function createEndpoint(body: {
  controllerId: string;
  methodName: string;
  httpMethod?: string;
  route: string;
  routePrefix?: string;
  parameters?: Record<string, unknown>[];
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  responseType?: string;
  sourceSP?: string;
  sourceTable?: string;
  requiresAuth?: boolean;
  requiredRoles?: string[];
  summary?: string;
  description?: string;
}) {
  const endpointKey = `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const endpoint = await db.aPIEndpoint.create({
    data: {
      controllerId: body.controllerId,
      endpointKey,
      methodName: body.methodName,
      httpMethod: body.httpMethod || 'GET',
      route: body.route,
      routePrefix: body.routePrefix,
      parameters: JSON.stringify(body.parameters || []),
      requestBody: body.requestBody ? JSON.stringify(body.requestBody) : null,
      responseBody: body.responseBody ? JSON.stringify(body.responseBody) : null,
      responseType: body.responseType,
      sourceSP: body.sourceSP,
      sourceTable: body.sourceTable,
      requiresAuth: body.requiresAuth ?? true,
      requiredRoles: JSON.stringify(body.requiredRoles || []),
      summary: body.summary,
      description: body.description,
    },
  });

  return NextResponse.json({ success: true, endpoint });
}

async function getEndpoints(body: { controllerId?: string; projectId?: string }) {
  const where: Record<string, unknown> = {};

  if (body.controllerId) {
    where.controllerId = body.controllerId;
  }

  const endpoints = await db.aPIEndpoint.findMany({
    where,
    include: {
      controller: true,
    },
    orderBy: { route: 'asc' },
  });

  return NextResponse.json({
    success: true,
    endpoints: endpoints.map(e => ({
      ...e,
      parameters: JSON.parse(e.parameters),
      requestBody: e.requestBody ? JSON.parse(e.requestBody) : null,
      responseBody: e.responseBody ? JSON.parse(e.responseBody) : null,
      requiredRoles: JSON.parse(e.requiredRoles),
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════

async function createWorkflow(body: {
  projectId: string;
  moduleId?: string;
  name: string;
  description?: string;
  businessContext?: string;
  isSequential?: boolean;
  allowParallel?: boolean;
}) {
  const workflowKey = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const workflow = await db.workflow.create({
    data: {
      projectId: body.projectId,
      moduleId: body.moduleId,
      workflowKey,
      name: body.name,
      description: body.description,
      businessContext: body.businessContext,
      isSequential: body.isSequential ?? true,
      allowParallel: body.allowParallel ?? false,
    },
  });

  return NextResponse.json({ success: true, workflow });
}

async function getWorkflows(body: { projectId: string }) {
  const workflows = await db.workflow.findMany({
    where: { projectId: body.projectId },
    include: {
      states: {
        orderBy: { order: 'asc' },
      },
      transitions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, workflows });
}

async function getWorkflow(body: { workflowId: string }) {
  const workflow = await db.workflow.findUnique({
    where: { id: body.workflowId },
    include: {
      states: {
        orderBy: { order: 'asc' },
      },
      transitions: {
        include: {
          fromState: true,
          toState: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, workflow });
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW STATES
// ═══════════════════════════════════════════════════════════════════════════

async function createState(body: {
  workflowId: string;
  stateKey: string;
  stateName: string;
  isInitial?: boolean;
  isFinal?: boolean;
  isError?: boolean;
  description?: string;
  order?: number;
  onEnter?: Record<string, unknown>;
  onExit?: Record<string, unknown>;
}) {
  const state = await db.workflowState.create({
    data: {
      workflowId: body.workflowId,
      stateKey: body.stateKey,
      stateName: body.stateName,
      isInitial: body.isInitial || false,
      isFinal: body.isFinal || false,
      isError: body.isError || false,
      description: body.description,
      order: body.order || 0,
      onEnter: body.onEnter ? JSON.stringify(body.onEnter) : null,
      onExit: body.onExit ? JSON.stringify(body.onExit) : null,
    },
  });

  return NextResponse.json({ success: true, state });
}

async function getStates(body: { workflowId: string }) {
  const states = await db.workflowState.findMany({
    where: { workflowId: body.workflowId },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({
    success: true,
    states: states.map(s => ({
      ...s,
      onEnter: s.onEnter ? JSON.parse(s.onEnter) : null,
      onExit: s.onExit ? JSON.parse(s.onExit) : null,
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

async function createTransition(body: {
  workflowId: string;
  transitionKey: string;
  transitionName: string;
  fromStateId: string;
  toStateId: string;
  trigger?: string;
  triggerType?: string;
  conditions?: Record<string, unknown>[];
  actions?: Record<string, unknown>[];
}) {
  const transition = await db.workflowTransition.create({
    data: {
      workflowId: body.workflowId,
      transitionKey: body.transitionKey,
      transitionName: body.transitionName,
      fromStateId: body.fromStateId,
      toStateId: body.toStateId,
      trigger: body.trigger,
      triggerType: body.triggerType || 'manual',
      conditions: JSON.stringify(body.conditions || []),
      actions: JSON.stringify(body.actions || []),
    },
  });

  return NextResponse.json({ success: true, transition });
}

async function getTransitions(body: { workflowId: string }) {
  const transitions = await db.workflowTransition.findMany({
    where: { workflowId: body.workflowId },
    include: {
      fromState: true,
      toState: true,
    },
  });

  return NextResponse.json({
    success: true,
    transitions: transitions.map(t => ({
      ...t,
      conditions: JSON.parse(t.conditions),
      actions: JSON.parse(t.actions),
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════

async function createReport(body: {
  projectId: string;
  moduleId?: string;
  name: string;
  description?: string;
  businessPurpose?: string;
  sourceView?: string;
  sourceTable?: string;
  sourceSP?: string;
  reportType?: string;
  columns?: Record<string, unknown>[];
  groupBy?: string[];
  orderBy?: Record<string, unknown>[];
  exportFormats?: string[];
}) {
  const reportKey = `rpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const report = await db.report.create({
    data: {
      projectId: body.projectId,
      moduleId: body.moduleId,
      reportKey,
      name: body.name,
      description: body.description,
      businessPurpose: body.businessPurpose,
      sourceView: body.sourceView,
      sourceTable: body.sourceTable,
      sourceSP: body.sourceSP,
      reportType: body.reportType || 'tabular',
      columns: JSON.stringify(body.columns || []),
      groupBy: JSON.stringify(body.groupBy || []),
      orderBy: JSON.stringify(body.orderBy || []),
      exportFormats: JSON.stringify(body.exportFormats || ['pdf', 'excel', 'csv']),
    },
  });

  return NextResponse.json({ success: true, report });
}

async function getReports(body: { projectId: string }) {
  const reports = await db.report.findMany({
    where: { projectId: body.projectId },
    include: {
      filters: {
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    reports: reports.map(r => ({
      ...r,
      columns: JSON.parse(r.columns),
      groupBy: JSON.parse(r.groupBy),
      orderBy: JSON.parse(r.orderBy),
      exportFormats: JSON.parse(r.exportFormats),
    })),
  });
}

async function getReport(body: { reportId: string }) {
  const report = await db.report.findUnique({
    where: { id: body.reportId },
    include: {
      filters: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return NextResponse.json({
    success: true,
    report: report ? {
      ...report,
      columns: JSON.parse(report.columns),
      groupBy: JSON.parse(report.groupBy),
      orderBy: JSON.parse(report.orderBy),
      exportFormats: JSON.parse(report.exportFormats),
    } : null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════

async function createTestCase(body: {
  projectId: string;
  moduleId?: string;
  title: string;
  description?: string;
  preconditions?: string[];
  testCaseType?: string;
  priority?: string;
  expectedResult?: string;
  sourceWorkflow?: string;
  sourceTable?: string;
  steps?: Array<{ stepNumber: number; instruction: string; expectedResult?: string; testData?: Record<string, unknown> }>;
}) {
  const testCaseKey = `tc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const testCase = await db.testCase.create({
    data: {
      projectId: body.projectId,
      moduleId: body.moduleId,
      testCaseKey,
      title: body.title,
      description: body.description,
      preconditions: JSON.stringify(body.preconditions || []),
      testCaseType: body.testCaseType || 'functional',
      priority: body.priority || 'medium',
      expectedResult: body.expectedResult,
      sourceWorkflow: body.sourceWorkflow,
      sourceTable: body.sourceTable,
    },
  });

  // Create steps if provided
  if (body.steps && body.steps.length > 0) {
    await db.testStep.createMany({
      data: body.steps.map(step => ({
        testCaseId: testCase.id,
        stepNumber: step.stepNumber,
        instruction: step.instruction,
        expectedResult: step.expectedResult,
        testData: JSON.stringify(step.testData || {}),
      })),
    });
  }

  return NextResponse.json({ success: true, testCase });
}

async function getTestCases(body: { projectId: string; moduleId?: string }) {
  const testCases = await db.testCase.findMany({
    where: {
      projectId: body.projectId,
      ...(body.moduleId && { moduleId: body.moduleId }),
    },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    testCases: testCases.map(tc => ({
      ...tc,
      preconditions: JSON.parse(tc.preconditions),
      steps: tc.steps.map(s => ({
        ...s,
        testData: JSON.parse(s.testData),
      })),
    })),
  });
}

async function getTestCase(body: { testCaseId: string }) {
  const testCase = await db.testCase.findUnique({
    where: { id: body.testCaseId },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  return NextResponse.json({
    success: true,
    testCase: testCase ? {
      ...testCase,
      preconditions: JSON.parse(testCase.preconditions),
      steps: testCase.steps.map(s => ({
        ...s,
        testData: JSON.parse(s.testData),
      })),
    } : null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT RUNS
// ═══════════════════════════════════════════════════════════════════════════

async function createAgentRun(body: {
  projectId: string;
  agentName: string;
  agentVersion?: string;
  inputConfig?: Record<string, unknown>;
}) {
  const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const run = await db.agentRun.create({
    data: {
      projectId: body.projectId,
      runId,
      agentName: body.agentName,
      agentVersion: body.agentVersion || '1.0.0',
      inputConfig: JSON.stringify(body.inputConfig || {}),
    },
  });

  return NextResponse.json({ success: true, run });
}

async function getAgentRuns(body: { projectId: string; agentName?: string }) {
  const runs = await db.agentRun.findMany({
    where: {
      projectId: body.projectId,
      ...(body.agentName && { agentName: body.agentName }),
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    runs: runs.map(r => ({
      ...r,
      inputConfig: JSON.parse(r.inputConfig),
      outputData: JSON.parse(r.outputData),
    })),
  });
}

async function completeAgentRun(body: {
  runId: string;
  status: string;
  outputData?: Record<string, unknown>;
  itemsProcessed?: number;
  itemsProduced?: number;
  error?: string;
  errorStack?: string;
}) {
  const run = await db.agentRun.update({
    where: { runId: body.runId },
    data: {
      status: body.status,
      completedAt: new Date(),
      outputData: JSON.stringify(body.outputData || {}),
      itemsProcessed: body.itemsProcessed || 0,
      itemsProduced: body.itemsProduced || 0,
      error: body.error,
      errorStack: body.errorStack,
    },
  });

  // Calculate duration
  const duration = run.completedAt!.getTime() - run.startedAt.getTime();
  await db.agentRun.update({
    where: { runId: body.runId },
    data: { duration },
  });

  return NextResponse.json({ success: true, run });
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

async function logAgentMessage(body: {
  runId: string;
  messageType: string;
  message: string;
  payload?: Record<string, unknown>;
}) {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const msg = await db.agentMessage.create({
    data: {
      runId: body.runId,
      messageId,
      messageType: body.messageType,
      message: body.message,
      payload: JSON.stringify(body.payload || {}),
    },
  });

  return NextResponse.json({ success: true, message: msg });
}

async function getAgentMessages(body: { runId: string }) {
  const messages = await db.agentMessage.findMany({
    where: { runId: body.runId },
    orderBy: { timestamp: 'asc' },
  });

  return NextResponse.json({
    success: true,
    messages: messages.map(m => ({
      ...m,
      payload: JSON.parse(m.payload),
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function bulkCreatePages(body: {
  projectId: string;
  pages: Array<{
    name: string;
    urlSlug: string;
    title?: string;
    pageType?: string;
    sourceFile?: string;
    sourceTable?: string;
  }>;
}) {
  const results = await db.page.createMany({
    data: body.pages.map(p => ({
      projectId: body.projectId,
      name: p.name,
      urlSlug: p.urlSlug,
      title: p.title,
      pageType: p.pageType || 'form',
      sourceFile: p.sourceFile,
      sourceTable: p.sourceTable,
    })),
  });

  return NextResponse.json({ success: true, count: results.count });
}

async function bulkCreateForms(body: {
  projectId: string;
  forms: Array<{
    name: string;
    sourceTable?: string;
    fields: Array<{
      fieldName: string;
      label: string;
      fieldType?: string;
      isRequired?: boolean;
    }>;
  }>;
}) {
  let count = 0;

  for (const formData of body.forms) {
    const formKey = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const form = await db.form.create({
      data: {
        projectId: body.projectId,
        name: formData.name,
        formKey,
        sourceTable: formData.sourceTable,
      },
    });

    // Create fields
    await db.formField.createMany({
      data: formData.fields.map((f, i) => ({
        formId: form.id,
        fieldName: f.fieldName,
        fieldKey: `field-${form.id}-${i}`,
        label: f.label,
        fieldType: f.fieldType || 'text_input',
        isRequired: f.isRequired || false,
        position: i,
      })),
    });

    count++;
  }

  return NextResponse.json({ success: true, count });
}

async function bulkCreateEndpoints(body: {
  projectId: string;
  controllerName: string;
  endpoints: Array<{
    methodName: string;
    httpMethod: string;
    route: string;
    sourceSP?: string;
    sourceTable?: string;
  }>;
}) {
  // Find or create controller
  const controllerKey = `ctrl-${body.controllerName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  let controller = await db.controller.findFirst({
    where: {
      projectId: body.projectId,
      controllerKey,
    },
  });

  if (!controller) {
    controller = await db.controller.create({
      data: {
        projectId: body.projectId,
        name: body.controllerName,
        controllerKey,
      },
    });
  }

  // Create endpoints
  const results = await db.aPIEndpoint.createMany({
    data: body.endpoints.map(ep => ({
      controllerId: controller!.id,
      endpointKey: `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      methodName: ep.methodName,
      httpMethod: ep.httpMethod,
      route: ep.route,
      sourceSP: ep.sourceSP,
      sourceTable: ep.sourceTable,
    })),
  });

  return NextResponse.json({ success: true, count: results.count });
}

async function bulkCreateWorkflows(body: {
  projectId: string;
  workflows: Array<{
    name: string;
    description?: string;
    states: Array<{
      stateKey: string;
      stateName: string;
      isInitial?: boolean;
      isFinal?: boolean;
    }>;
    transitions: Array<{
      transitionKey: string;
      transitionName: string;
      fromStateKey: string;
      toStateKey: string;
    }>;
  }>;
}) {
  let count = 0;

  for (const wfData of body.workflows) {
    const workflowKey = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const workflow = await db.workflow.create({
      data: {
        projectId: body.projectId,
        workflowKey,
        name: wfData.name,
        description: wfData.description,
      },
    });

    // Create states
    const stateMap = new Map<string, string>();
    for (const stateData of wfData.states) {
      const state = await db.workflowState.create({
        data: {
          workflowId: workflow.id,
          stateKey: stateData.stateKey,
          stateName: stateData.stateName,
          isInitial: stateData.isInitial || false,
          isFinal: stateData.isFinal || false,
        },
      });
      stateMap.set(stateData.stateKey, state.id);
    }

    // Create transitions
    for (const transData of wfData.transitions) {
      await db.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          transitionKey: transData.transitionKey,
          transitionName: transData.transitionName,
          fromStateId: stateMap.get(transData.fromStateKey)!,
          toStateId: stateMap.get(transData.toStateKey)!,
        },
      });
    }

    count++;
  }

  return NextResponse.json({ success: true, count });
}

async function bulkCreateTestCases(body: {
  projectId: string;
  testCases: Array<{
    title: string;
    description?: string;
    preconditions?: string[];
    priority?: string;
    sourceTable?: string;
    steps: Array<{
      stepNumber: number;
      instruction: string;
      expectedResult?: string;
    }>;
  }>;
}) {
  let count = 0;

  for (const tcData of body.testCases) {
    const testCaseKey = `tc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const testCase = await db.testCase.create({
      data: {
        projectId: body.projectId,
        testCaseKey,
        title: tcData.title,
        description: tcData.description,
        preconditions: JSON.stringify(tcData.preconditions || []),
        priority: tcData.priority || 'medium',
        sourceTable: tcData.sourceTable,
      },
    });

    // Create steps
    await db.testStep.createMany({
      data: tcData.steps.map(step => ({
        testCaseId: testCase.id,
        stepNumber: step.stepNumber,
        instruction: step.instruction,
        expectedResult: step.expectedResult,
      })),
    });

    count++;
  }

  return NextResponse.json({ success: true, count });
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

async function getSchemaStats(body: { projectId: string }) {
  const [
    pages,
    forms,
    controllers,
    workflows,
    reports,
    testCases,
    agentRuns,
  ] = await Promise.all([
    db.page.count({ where: { projectId: body.projectId } }),
    db.form.count({ where: { projectId: body.projectId } }),
    db.controller.count({ where: { projectId: body.projectId } }),
    db.workflow.count({ where: { projectId: body.projectId } }),
    db.report.count({ where: { projectId: body.projectId } }),
    db.testCase.count({ where: { projectId: body.projectId } }),
    db.agentRun.count({ where: { projectId: body.projectId } }),
  ]);

  const endpoints = await db.aPIEndpoint.count({
    where: {
      controller: {
        projectId: body.projectId,
      },
    },
  });

  return NextResponse.json({
    success: true,
    stats: {
      pages,
      forms,
      controllers,
      endpoints,
      workflows,
      reports,
      testCases,
      agentRuns,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'list-models':
      return NextResponse.json({
        success: true,
        models: [
          { name: 'Page', description: 'UI page/screen definitions' },
          { name: 'PageComponent', description: 'UI components within pages' },
          { name: 'Form', description: 'Form definitions' },
          { name: 'FormField', description: 'Form field definitions' },
          { name: 'Controller', description: 'API controller definitions' },
          { name: 'APIEndpoint', description: 'API endpoint definitions' },
          { name: 'Workflow', description: 'Business workflow definitions' },
          { name: 'WorkflowState', description: 'Workflow states' },
          { name: 'WorkflowTransition', description: 'Workflow transitions' },
          { name: 'Report', description: 'Report definitions' },
          { name: 'ReportFilter', description: 'Report filters' },
          { name: 'TestCase', description: 'Test case definitions' },
          { name: 'TestStep', description: 'Test steps' },
          { name: 'AgentRun', description: 'Agent execution runs' },
          { name: 'AgentMessage', description: 'Agent log messages' },
        ],
      });

    default:
      return NextResponse.json({
        success: true,
        message: 'Phase 5 Schema API is ready',
        actions: {
          POST: [
            'create-page', 'update-page', 'get-pages', 'get-page', 'delete-page',
            'create-component', 'get-components',
            'create-form', 'get-forms', 'get-form',
            'create-field', 'get-fields',
            'create-controller', 'get-controllers',
            'create-endpoint', 'get-endpoints',
            'create-workflow', 'get-workflows', 'get-workflow',
            'create-state', 'get-states',
            'create-transition', 'get-transitions',
            'create-report', 'get-reports', 'get-report',
            'create-test-case', 'get-test-cases', 'get-test-case',
            'create-agent-run', 'get-agent-runs', 'complete-agent-run',
            'log-agent-message', 'get-agent-messages',
            'bulk-create-pages', 'bulk-create-forms', 'bulk-create-endpoints',
            'bulk-create-workflows', 'bulk-create-test-cases',
            'get-schema-stats',
          ],
          GET: ['list-models'],
        },
      });
  }
}
