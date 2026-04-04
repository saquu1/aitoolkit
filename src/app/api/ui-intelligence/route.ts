// =============================================================================
// UI Intelligence API
// Handles: Workflows, Permissions, Validations, Cascading Dropdowns, Page Transitions
// Plus Advanced: Dynamic Fields, Complex Validations, Conditional Permissions,
//                Multi-Form Views, AJAX Forms, Partial Views
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

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Basic UI Intelligence Actions
    switch (action) {
      case 'store-workflow':
        return await storeWorkflow(body);
      
      case 'store-permission':
        return await storePermission(body);
      
      case 'store-validation':
        return await storeValidation(body);
      
      case 'store-cascading-dropdown':
        return await storeCascadingDropdown(body);
      
      case 'store-page-transition':
        return await storePageTransition(body);
      
      case 'store-all-intelligence':
        return await storeAllIntelligence(body);
      
      case 'get-workflows':
        return await getWorkflows(projectId, body.viewName);
      
      case 'get-permissions':
        return await getPermissions(projectId, body.viewName);
      
      case 'get-validations':
        return await getValidations(projectId, body.viewName, body.formName);
      
      case 'get-cascading-dropdowns':
        return await getCascadingDropdowns(projectId, body.viewName);
      
      case 'get-page-transitions':
        return await getPageTransitions(projectId, body.viewName);
      
      case 'get-intelligence-summary':
        return await getIntelligenceSummary(projectId);
      
      // Advanced UI Intelligence Actions
      case 'store-dynamic-field':
        return await storeDynamicField(body);
      
      case 'store-complex-validation':
        return await storeComplexValidation(body);
      
      case 'store-conditional-permission':
        return await storeConditionalPermission(body);
      
      case 'store-multi-form-view':
        return await storeMultiFormView(body);
      
      case 'store-ajax-form':
        return await storeAJAXForm(body);
      
      case 'store-partial-view':
        return await storePartialView(body);
      
      case 'store-all-advanced-intelligence':
        return await storeAllAdvancedIntelligence(body);
      
      case 'get-dynamic-fields':
        return await getDynamicFields(projectId, body.viewName);
      
      case 'get-complex-validations':
        return await getComplexValidations(projectId, body.viewName);
      
      case 'get-conditional-permissions':
        return await getConditionalPermissions(projectId, body.viewName);
      
      case 'get-multi-form-views':
        return await getMultiFormViews(projectId, body.viewName);
      
      case 'get-ajax-forms':
        return await getAJAXForms(projectId, body.viewName);
      
      case 'get-partial-views':
        return await getPartialViews(projectId, body.viewName);
      
      case 'get-advanced-summary':
        return await getAdvancedSummary(projectId);
      
      case 'get-complete-intelligence':
        return await getCompleteIntelligence(projectId, body.viewName);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('UI Intelligence API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeWorkflow(body: {
  projectId: string;
  workflowName: string;
  sourceView: string;
  description?: string;
  workflowType?: string;
  triggerType?: string;
  steps?: any[];
  transitions?: any[];
  endpoints?: string[];
  confidence?: number;
}) {
  const workflow = await db.uIWorkflow.upsert({
    where: {
      projectId_workflowName: {
        projectId: body.projectId,
        workflowName: body.workflowName,
      }
    },
    create: {
      projectId: body.projectId,
      workflowName: body.workflowName,
      sourceView: body.sourceView,
      description: body.description,
      workflowType: body.workflowType || 'form',
      triggerType: body.triggerType || 'submit',
      steps: JSON.stringify(body.steps || []),
      transitions: JSON.stringify(body.transitions || []),
      endpoints: JSON.stringify(body.endpoints || []),
      confidence: body.confidence || 1.0,
    },
    update: {
      description: body.description,
      workflowType: body.workflowType || 'form',
      triggerType: body.triggerType || 'submit',
      steps: JSON.stringify(body.steps || []),
      transitions: JSON.stringify(body.transitions || []),
      endpoints: JSON.stringify(body.endpoints || []),
      confidence: body.confidence || 1.0,
    }
  });

  return NextResponse.json({ success: true, workflow });
}

async function getWorkflows(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.sourceView = viewName;

  const workflows = await db.uIWorkflow.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    workflows: workflows.map(w => ({
      ...w,
      steps: JSON.parse(w.steps || '[]'),
      transitions: JSON.parse(w.transitions || '[]'),
      endpoints: JSON.parse(w.endpoints || '[]'),
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storePermission(body: {
  projectId: string;
  viewName: string;
  permissionType: string;
  permissionValue: string;
  action?: string;
  targetElement?: string;
  condition?: string;
  sourceLine?: number;
  confidence?: number;
}) {
  const permission = await db.uIPermission.upsert({
    where: {
      projectId_viewName_permissionType_permissionValue: {
        projectId: body.projectId,
        viewName: body.viewName,
        permissionType: body.permissionType,
        permissionValue: body.permissionValue,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      permissionType: body.permissionType,
      permissionValue: body.permissionValue,
      action: body.action || 'show',
      targetElement: body.targetElement,
      condition: body.condition,
      sourceLine: body.sourceLine,
      confidence: body.confidence || 1.0,
    },
    update: {
      action: body.action || 'show',
      targetElement: body.targetElement,
      condition: body.condition,
      sourceLine: body.sourceLine,
      confidence: body.confidence || 1.0,
    }
  });

  return NextResponse.json({ success: true, permission });
}

async function getPermissions(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const permissions = await db.uIPermission.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ success: true, permissions });
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeValidation(body: {
  projectId: string;
  viewName: string;
  formName?: string;
  fieldName: string;
  validationType: string;
  value?: string;
  message?: string;
  isAsync?: boolean;
  source?: string;
  confidence?: number;
}) {
  const validation = await db.uIValidation.upsert({
    where: {
      projectId_viewName_fieldName_validationType: {
        projectId: body.projectId,
        viewName: body.viewName,
        fieldName: body.fieldName,
        validationType: body.validationType,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      formName: body.formName,
      fieldName: body.fieldName,
      validationType: body.validationType,
      value: body.value,
      message: body.message,
      isAsync: body.isAsync || false,
      source: body.source || 'html',
      confidence: body.confidence || 1.0,
    },
    update: {
      formName: body.formName,
      value: body.value,
      message: body.message,
      isAsync: body.isAsync || false,
      source: body.source || 'html',
      confidence: body.confidence || 1.0,
    }
  });

  return NextResponse.json({ success: true, validation });
}

async function getValidations(projectId: string, viewName?: string, formName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;
  if (formName) where.formName = formName;

  const validations = await db.uIValidation.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ success: true, validations });
}

// ═══════════════════════════════════════════════════════════════════════════
// CASCADING DROPDOWN OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeCascadingDropdown(body: {
  projectId: string;
  viewName: string;
  parentField: string;
  childField: string;
  endpoint?: string;
  sourceParam?: string;
  textField?: string;
  valueField?: string;
  defaultOption?: string;
  isLoading?: boolean;
  cacheResults?: boolean;
  confidence?: number;
}) {
  const cascade = await db.uICascadingDropdown.upsert({
    where: {
      projectId_viewName_parentField_childField: {
        projectId: body.projectId,
        viewName: body.viewName,
        parentField: body.parentField,
        childField: body.childField,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      parentField: body.parentField,
      childField: body.childField,
      endpoint: body.endpoint,
      sourceParam: body.sourceParam,
      textField: body.textField || 'Name',
      valueField: body.valueField || 'Id',
      defaultOption: body.defaultOption,
      isLoading: body.isLoading || false,
      cacheResults: body.cacheResults !== false,
      confidence: body.confidence || 1.0,
    },
    update: {
      endpoint: body.endpoint,
      sourceParam: body.sourceParam,
      textField: body.textField || 'Name',
      valueField: body.valueField || 'Id',
      defaultOption: body.defaultOption,
      isLoading: body.isLoading || false,
      cacheResults: body.cacheResults !== false,
      confidence: body.confidence || 1.0,
    }
  });

  return NextResponse.json({ success: true, cascade });
}

async function getCascadingDropdowns(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const cascades = await db.uICascadingDropdown.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ success: true, cascadingDropdowns: cascades });
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE TRANSITION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storePageTransition(body: {
  projectId: string;
  sourceView: string;
  targetView?: string;
  transitionType?: string;
  trigger?: string;
  parameters?: any[];
  condition?: string;
  confidence?: number;
}) {
  const transition = await db.uIPageTransition.create({
    data: {
      projectId: body.projectId,
      sourceView: body.sourceView,
      targetView: body.targetView,
      transitionType: body.transitionType || 'link',
      trigger: body.trigger,
      parameters: JSON.stringify(body.parameters || []),
      condition: body.condition,
      confidence: body.confidence || 1.0,
    }
  });

  return NextResponse.json({ success: true, transition });
}

async function getPageTransitions(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.sourceView = viewName;

  const transitions = await db.uIPageTransition.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    transitions: transitions.map(t => ({
      ...t,
      parameters: JSON.parse(t.parameters || '[]'),
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: DYNAMIC FIELD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeDynamicField(body: {
  projectId: string;
  viewName: string;
  fieldName: string;
  creationType: string;
  triggerEvent?: string;
  triggerSelector?: string;
  parentContainer?: string;
  fieldType?: string;
  fieldTemplate?: string;
  defaultValue?: string;
  validationRules?: any[];
  isRepeatable?: boolean;
  maxInstances?: number;
  linkedToModel?: string;
  extractionPattern?: string;
  confidence?: number;
  sourceCode?: string;
  sourceLine?: number;
}) {
  const field = await db.uIDynamicField.upsert({
    where: {
      projectId_viewName_fieldName: {
        projectId: body.projectId,
        viewName: body.viewName,
        fieldName: body.fieldName,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      fieldName: body.fieldName,
      creationType: body.creationType,
      triggerEvent: body.triggerEvent,
      triggerSelector: body.triggerSelector,
      parentContainer: body.parentContainer,
      fieldType: body.fieldType || 'text',
      fieldTemplate: body.fieldTemplate,
      defaultValue: body.defaultValue,
      validationRules: JSON.stringify(body.validationRules || []),
      isRepeatable: body.isRepeatable || false,
      maxInstances: body.maxInstances,
      linkedToModel: body.linkedToModel,
      extractionPattern: body.extractionPattern,
      confidence: body.confidence || 0.8,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    },
    update: {
      creationType: body.creationType,
      triggerEvent: body.triggerEvent,
      triggerSelector: body.triggerSelector,
      parentContainer: body.parentContainer,
      fieldType: body.fieldType || 'text',
      fieldTemplate: body.fieldTemplate,
      defaultValue: body.defaultValue,
      validationRules: JSON.stringify(body.validationRules || []),
      isRepeatable: body.isRepeatable || false,
      maxInstances: body.maxInstances,
      linkedToModel: body.linkedToModel,
      extractionPattern: body.extractionPattern,
      confidence: body.confidence || 0.8,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    }
  });

  return NextResponse.json({ success: true, field });
}

async function getDynamicFields(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const fields = await db.uIDynamicField.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    dynamicFields: fields.map(f => ({
      ...f,
      validationRules: JSON.parse(f.validationRules || '[]'),
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: COMPLEX VALIDATION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeComplexValidation(body: {
  projectId: string;
  viewName: string;
  formName?: string;
  validationName: string;
  validationType: string;
  primaryField: string;
  relatedFields?: any[];
  condition?: string;
  conditionType?: string;
  ruleExpression?: string;
  errorMessage?: string;
  errorPlacement?: string;
  triggerOn?: string;
  isAsync?: boolean;
  asyncEndpoint?: string;
  asyncMethod?: string;
  priority?: number;
  confidence?: number;
  sourceCode?: string;
  sourceLine?: number;
}) {
  const validation = await db.uIComplexValidation.upsert({
    where: {
      projectId_viewName_validationName: {
        projectId: body.projectId,
        viewName: body.viewName,
        validationName: body.validationName,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      formName: body.formName,
      validationName: body.validationName,
      validationType: body.validationType,
      primaryField: body.primaryField,
      relatedFields: JSON.stringify(body.relatedFields || []),
      condition: body.condition,
      conditionType: body.conditionType || 'js',
      ruleExpression: body.ruleExpression,
      errorMessage: body.errorMessage,
      errorPlacement: body.errorPlacement,
      triggerOn: body.triggerOn || 'blur',
      isAsync: body.isAsync || false,
      asyncEndpoint: body.asyncEndpoint,
      asyncMethod: body.asyncMethod || 'POST',
      priority: body.priority || 0,
      confidence: body.confidence || 0.8,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    },
    update: {
      formName: body.formName,
      validationType: body.validationType,
      primaryField: body.primaryField,
      relatedFields: JSON.stringify(body.relatedFields || []),
      condition: body.condition,
      conditionType: body.conditionType || 'js',
      ruleExpression: body.ruleExpression,
      errorMessage: body.errorMessage,
      errorPlacement: body.errorPlacement,
      triggerOn: body.triggerOn || 'blur',
      isAsync: body.isAsync || false,
      asyncEndpoint: body.asyncEndpoint,
      asyncMethod: body.asyncMethod || 'POST',
      priority: body.priority || 0,
      confidence: body.confidence || 0.8,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    }
  });

  return NextResponse.json({ success: true, validation });
}

async function getComplexValidations(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const validations = await db.uIComplexValidation.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
  });

  return NextResponse.json({
    success: true,
    complexValidations: validations.map(v => ({
      ...v,
      relatedFields: JSON.parse(v.relatedFields || '[]'),
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: CONDITIONAL PERMISSION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeConditionalPermission(body: {
  projectId: string;
  viewName: string;
  permissionName: string;
  targetElement: string;
  action?: string;
  conditionType: string;
  condition?: string;
  dependsOnFields?: any[];
  dependsOnValues?: Record<string, unknown>;
  basePermission?: string;
  isNegated?: boolean;
  priority?: number;
  confidence?: number;
  sourceCode?: string;
  sourceLine?: number;
}) {
  const permission = await db.uIConditionalPermission.upsert({
    where: {
      projectId_viewName_permissionName: {
        projectId: body.projectId,
        viewName: body.viewName,
        permissionName: body.permissionName,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      permissionName: body.permissionName,
      targetElement: body.targetElement,
      action: body.action || 'show',
      conditionType: body.conditionType,
      condition: body.condition,
      dependsOnFields: JSON.stringify(body.dependsOnFields || []),
      dependsOnValues: JSON.stringify(body.dependsOnValues || {}),
      basePermission: body.basePermission,
      isNegated: body.isNegated || false,
      priority: body.priority || 0,
      confidence: body.confidence || 0.8,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    },
    update: {
      targetElement: body.targetElement,
      action: body.action || 'show',
      conditionType: body.conditionType,
      condition: body.condition,
      dependsOnFields: JSON.stringify(body.dependsOnFields || []),
      dependsOnValues: JSON.stringify(body.dependsOnValues || {}),
      basePermission: body.basePermission,
      isNegated: body.isNegated || false,
      priority: body.priority || 0,
      confidence: body.confidence || 0.8,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    }
  });

  return NextResponse.json({ success: true, permission });
}

async function getConditionalPermissions(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const permissions = await db.uIConditionalPermission.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
  });

  return NextResponse.json({
    success: true,
    conditionalPermissions: permissions.map(p => ({
      ...p,
      dependsOnFields: JSON.parse(p.dependsOnFields || '[]'),
      dependsOnValues: JSON.parse(p.dependsOnValues || '{}'),
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: MULTI-FORM VIEW OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeMultiFormView(body: {
  projectId: string;
  viewName: string;
  formCount?: number;
  forms?: any[];
  defaultForm?: string;
  formSwitching?: boolean;
  switchTrigger?: string;
  sharedFields?: any[];
  submitBehavior?: string;
  validationMode?: string;
  conflicts?: any[];
  confidence?: number;
  sourceContent?: string;
}) {
  const view = await db.uIMultiFormView.upsert({
    where: {
      projectId_viewName: {
        projectId: body.projectId,
        viewName: body.viewName,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      formCount: body.formCount || 0,
      forms: JSON.stringify(body.forms || []),
      defaultForm: body.defaultForm,
      formSwitching: body.formSwitching || false,
      switchTrigger: body.switchTrigger,
      sharedFields: JSON.stringify(body.sharedFields || []),
      submitBehavior: body.submitBehavior || 'individual',
      validationMode: body.validationMode || 'per_form',
      conflicts: JSON.stringify(body.conflicts || []),
      confidence: body.confidence || 0.9,
      sourceContent: body.sourceContent,
    },
    update: {
      formCount: body.formCount || 0,
      forms: JSON.stringify(body.forms || []),
      defaultForm: body.defaultForm,
      formSwitching: body.formSwitching || false,
      switchTrigger: body.switchTrigger,
      sharedFields: JSON.stringify(body.sharedFields || []),
      submitBehavior: body.submitBehavior || 'individual',
      validationMode: body.validationMode || 'per_form',
      conflicts: JSON.stringify(body.conflicts || []),
      confidence: body.confidence || 0.9,
      sourceContent: body.sourceContent,
    }
  });

  return NextResponse.json({ success: true, view });
}

async function getMultiFormViews(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const views = await db.uIMultiFormView.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    multiFormViews: views.map(v => ({
      ...v,
      forms: JSON.parse(v.forms || '[]'),
      sharedFields: JSON.parse(v.sharedFields || '[]'),
      conflicts: JSON.parse(v.conflicts || '[]'),
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: AJAX FORM OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storeAJAXForm(body: {
  projectId: string;
  viewName: string;
  formName?: string;
  submitType?: string;
  endpoint?: string;
  httpMethod?: string;
  contentType?: string;
  dataSerializer?: string;
  beforeSendCallback?: string;
  successCallback?: string;
  errorCallback?: string;
  completeCallback?: string;
  loadingIndicator?: string;
  disableOnSubmit?: boolean;
  csrfToken?: boolean;
  csrfHeader?: string;
  fileUpload?: boolean;
  progressCallback?: string;
  timeout?: number;
  retryCount?: number;
  validationBeforeSend?: boolean;
  confirmDialog?: string;
  redirectOnSuccess?: string;
  reloadOnSuccess?: boolean;
  confidence?: number;
  sourceCode?: string;
  sourceLine?: number;
}) {
  const form = await db.uIAJAXForm.upsert({
    where: {
      projectId_viewName_formName: {
        projectId: body.projectId,
        viewName: body.viewName,
        formName: body.formName || null,
      }
    },
    create: {
      projectId: body.projectId,
      viewName: body.viewName,
      formName: body.formName,
      submitType: body.submitType || 'ajax',
      endpoint: body.endpoint,
      httpMethod: body.httpMethod || 'POST',
      contentType: body.contentType || 'application/json',
      dataSerializer: body.dataSerializer || 'json',
      beforeSendCallback: body.beforeSendCallback,
      successCallback: body.successCallback,
      errorCallback: body.errorCallback,
      completeCallback: body.completeCallback,
      loadingIndicator: body.loadingIndicator,
      disableOnSubmit: body.disableOnSubmit !== false,
      csrfToken: body.csrfToken || false,
      csrfHeader: body.csrfHeader,
      fileUpload: body.fileUpload || false,
      progressCallback: body.progressCallback,
      timeout: body.timeout,
      retryCount: body.retryCount || 0,
      validationBeforeSend: body.validationBeforeSend !== false,
      confirmDialog: body.confirmDialog,
      redirectOnSuccess: body.redirectOnSuccess,
      reloadOnSuccess: body.reloadOnSuccess || false,
      confidence: body.confidence || 0.9,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    },
    update: {
      submitType: body.submitType || 'ajax',
      endpoint: body.endpoint,
      httpMethod: body.httpMethod || 'POST',
      contentType: body.contentType || 'application/json',
      dataSerializer: body.dataSerializer || 'json',
      beforeSendCallback: body.beforeSendCallback,
      successCallback: body.successCallback,
      errorCallback: body.errorCallback,
      completeCallback: body.completeCallback,
      loadingIndicator: body.loadingIndicator,
      disableOnSubmit: body.disableOnSubmit !== false,
      csrfToken: body.csrfToken || false,
      csrfHeader: body.csrfHeader,
      fileUpload: body.fileUpload || false,
      progressCallback: body.progressCallback,
      timeout: body.timeout,
      retryCount: body.retryCount || 0,
      validationBeforeSend: body.validationBeforeSend !== false,
      confirmDialog: body.confirmDialog,
      redirectOnSuccess: body.redirectOnSuccess,
      reloadOnSuccess: body.reloadOnSuccess || false,
      confidence: body.confidence || 0.9,
      sourceCode: body.sourceCode,
      sourceLine: body.sourceLine,
    }
  });

  return NextResponse.json({ success: true, form });
}

async function getAJAXForms(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const forms = await db.uIAJAXForm.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ success: true, ajaxForms: forms });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: PARTIAL VIEW OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function storePartialView(body: {
  projectId: string;
  parentView: string;
  partialViewName: string;
  renderMethod: string;
  viewPath?: string;
  parameters?: any[];
  modelType?: string;
  isStronglyTyped?: boolean;
  section?: string;
  renderPosition?: number;
  cached?: boolean;
  cacheDuration?: number;
  childActions?: any[];
  scriptsIncluded?: any[];
  stylesIncluded?: any[];
  linkedTable?: string;
  linkedSP?: string;
  extractionNote?: string;
  confidence?: number;
  sourceLine?: number;
}) {
  const partial = await db.uIPartialView.upsert({
    where: {
      projectId_parentView_partialViewName: {
        projectId: body.projectId,
        parentView: body.parentView,
        partialViewName: body.partialViewName,
      }
    },
    create: {
      projectId: body.projectId,
      parentView: body.parentView,
      partialViewName: body.partialViewName,
      renderMethod: body.renderMethod,
      viewPath: body.viewPath,
      parameters: JSON.stringify(body.parameters || []),
      modelType: body.modelType,
      isStronglyTyped: body.isStronglyTyped || false,
      section: body.section,
      renderPosition: body.renderPosition || 0,
      cached: body.cached || false,
      cacheDuration: body.cacheDuration,
      childActions: JSON.stringify(body.childActions || []),
      scriptsIncluded: JSON.stringify(body.scriptsIncluded || []),
      stylesIncluded: JSON.stringify(body.stylesIncluded || []),
      linkedTable: body.linkedTable,
      linkedSP: body.linkedSP,
      extractionNote: body.extractionNote,
      confidence: body.confidence || 0.9,
      sourceLine: body.sourceLine,
    },
    update: {
      renderMethod: body.renderMethod,
      viewPath: body.viewPath,
      parameters: JSON.stringify(body.parameters || []),
      modelType: body.modelType,
      isStronglyTyped: body.isStronglyTyped || false,
      section: body.section,
      renderPosition: body.renderPosition || 0,
      cached: body.cached || false,
      cacheDuration: body.cacheDuration,
      childActions: JSON.stringify(body.childActions || []),
      scriptsIncluded: JSON.stringify(body.scriptsIncluded || []),
      stylesIncluded: JSON.stringify(body.stylesIncluded || []),
      linkedTable: body.linkedTable,
      linkedSP: body.linkedSP,
      extractionNote: body.extractionNote,
      confidence: body.confidence || 0.9,
      sourceLine: body.sourceLine,
    }
  });

  return NextResponse.json({ success: true, partial });
}

async function getPartialViews(projectId: string, viewName?: string) {
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.parentView = viewName;

  const partials = await db.uIPartialView.findMany({
    where,
    orderBy: [{ renderPosition: 'asc' }, { createdAt: 'desc' }]
  });

  return NextResponse.json({
    success: true,
    partialViews: partials.map(p => ({
      ...p,
      parameters: JSON.parse(p.parameters || '[]'),
      childActions: JSON.parse(p.childActions || '[]'),
      scriptsIncluded: JSON.parse(p.scriptsIncluded || '[]'),
      stylesIncluded: JSON.parse(p.stylesIncluded || '[]'),
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE ALL INTELLIGENCE FROM PARSED CSHTML
// ═══════════════════════════════════════════════════════════════════════════

async function storeAllIntelligence(body: {
  projectId: string;
  viewName: string;
  permissions: any[];
  validations: any[];
  cascadingDropdowns: any[];
  workflows: any[];
  pageTransitions: any[];
}) {
  const results = {
    permissions: 0,
    validations: 0,
    cascadingDropdowns: 0,
    workflows: 0,
    pageTransitions: 0,
  };

  // Store permissions
  for (const perm of body.permissions) {
    try {
      await db.uIPermission.upsert({
        where: {
          projectId_viewName_permissionType_permissionValue: {
            projectId: body.projectId,
            viewName: body.viewName,
            permissionType: perm.type,
            permissionValue: perm.value,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          permissionType: perm.type,
          permissionValue: perm.value,
          action: perm.action || 'show',
          targetElement: perm.targetElement,
          condition: perm.condition,
          sourceLine: perm.sourceLine,
          confidence: perm.confidence || 1.0,
        },
        update: {
          action: perm.action || 'show',
          targetElement: perm.targetElement,
          condition: perm.condition,
          sourceLine: perm.sourceLine,
          confidence: perm.confidence || 1.0,
        }
      });
      results.permissions++;
    } catch (e) {
      console.error('Failed to store permission:', e);
    }
  }

  // Store validations
  for (const val of body.validations) {
    try {
      await db.uIValidation.upsert({
        where: {
          projectId_viewName_fieldName_validationType: {
            projectId: body.projectId,
            viewName: body.viewName,
            fieldName: val.fieldName,
            validationType: val.type,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          formName: val.formName,
          fieldName: val.fieldName,
          validationType: val.type,
          value: val.value,
          message: val.message,
          isAsync: val.isAsync || false,
          source: val.source || 'html',
          confidence: val.confidence || 1.0,
        },
        update: {
          formName: val.formName,
          value: val.value,
          message: val.message,
          isAsync: val.isAsync || false,
          source: val.source || 'html',
          confidence: val.confidence || 1.0,
        }
      });
      results.validations++;
    } catch (e) {
      console.error('Failed to store validation:', e);
    }
  }

  // Store cascading dropdowns
  for (const cascade of body.cascadingDropdowns) {
    try {
      await db.uICascadingDropdown.upsert({
        where: {
          projectId_viewName_parentField_childField: {
            projectId: body.projectId,
            viewName: body.viewName,
            parentField: cascade.parentField,
            childField: cascade.childField,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          parentField: cascade.parentField,
          childField: cascade.childField,
          endpoint: cascade.endpoint,
          sourceParam: cascade.sourceParam,
          textField: cascade.textField || 'Name',
          valueField: cascade.valueField || 'Id',
          defaultOption: cascade.defaultOption,
          confidence: cascade.confidence || 1.0,
        },
        update: {
          endpoint: cascade.endpoint,
          sourceParam: cascade.sourceParam,
          textField: cascade.textField || 'Name',
          valueField: cascade.valueField || 'Id',
          defaultOption: cascade.defaultOption,
          confidence: cascade.confidence || 1.0,
        }
      });
      results.cascadingDropdowns++;
    } catch (e) {
      console.error('Failed to store cascading dropdown:', e);
    }
  }

  // Store workflows
  for (const wf of body.workflows) {
    try {
      await db.uIWorkflow.upsert({
        where: {
          projectId_workflowName: {
            projectId: body.projectId,
            workflowName: wf.name,
          }
        },
        create: {
          projectId: body.projectId,
          workflowName: wf.name,
          sourceView: body.viewName,
          description: wf.description,
          workflowType: wf.type || 'form',
          triggerType: wf.triggerType || 'submit',
          steps: JSON.stringify(wf.steps || []),
          transitions: JSON.stringify(wf.transitions || []),
          endpoints: JSON.stringify(wf.endpoints || []),
          confidence: wf.confidence || 1.0,
        },
        update: {
          description: wf.description,
          workflowType: wf.type || 'form',
          triggerType: wf.triggerType || 'submit',
          steps: JSON.stringify(wf.steps || []),
          transitions: JSON.stringify(wf.transitions || []),
          endpoints: JSON.stringify(wf.endpoints || []),
          confidence: wf.confidence || 1.0,
        }
      });
      results.workflows++;
    } catch (e) {
      console.error('Failed to store workflow:', e);
    }
  }

  // Store page transitions
  for (const pt of body.pageTransitions) {
    try {
      await db.uIPageTransition.create({
        data: {
          projectId: body.projectId,
          sourceView: body.viewName,
          targetView: pt.targetView,
          transitionType: pt.type || 'link',
          trigger: pt.trigger,
          parameters: JSON.stringify(pt.parameters || []),
          condition: pt.condition,
          confidence: pt.confidence || 1.0,
        }
      });
      results.pageTransitions++;
    } catch (e) {
      console.error('Failed to store page transition:', e);
    }
  }

  return NextResponse.json({
    success: true,
    stored: results,
    message: `Stored ${results.permissions + results.validations + results.cascadingDropdowns + results.workflows + results.pageTransitions} intelligence items`
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE ALL ADVANCED INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════

async function storeAllAdvancedIntelligence(body: {
  projectId: string;
  viewName: string;
  dynamicFields?: any[];
  complexValidations?: any[];
  conditionalPermissions?: any[];
  multiFormViews?: any[];
  ajaxForms?: any[];
  partialViews?: any[];
}) {
  const results = {
    dynamicFields: 0,
    complexValidations: 0,
    conditionalPermissions: 0,
    multiFormViews: 0,
    ajaxForms: 0,
    partialViews: 0,
  };

  // Store dynamic fields
  for (const field of body.dynamicFields || []) {
    try {
      await db.uIDynamicField.upsert({
        where: {
          projectId_viewName_fieldName: {
            projectId: body.projectId,
            viewName: body.viewName,
            fieldName: field.fieldName,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          fieldName: field.fieldName,
          creationType: field.creationType,
          triggerEvent: field.triggerEvent,
          triggerSelector: field.triggerSelector,
          parentContainer: field.parentContainer,
          fieldType: field.fieldType || 'text',
          fieldTemplate: field.fieldTemplate,
          defaultValue: field.defaultValue,
          validationRules: JSON.stringify(field.validationRules || []),
          isRepeatable: field.isRepeatable || false,
          maxInstances: field.maxInstances,
          linkedToModel: field.linkedToModel,
          confidence: field.confidence || 0.8,
          sourceCode: field.sourceCode,
          sourceLine: field.sourceLine,
        },
        update: {
          creationType: field.creationType,
          triggerEvent: field.triggerEvent,
          triggerSelector: field.triggerSelector,
          parentContainer: field.parentContainer,
          fieldType: field.fieldType || 'text',
          fieldTemplate: field.fieldTemplate,
          defaultValue: field.defaultValue,
          validationRules: JSON.stringify(field.validationRules || []),
          isRepeatable: field.isRepeatable || false,
          maxInstances: field.maxInstances,
          linkedToModel: field.linkedToModel,
          confidence: field.confidence || 0.8,
          sourceCode: field.sourceCode,
          sourceLine: field.sourceLine,
        }
      });
      results.dynamicFields++;
    } catch (e) {
      console.error('Failed to store dynamic field:', e);
    }
  }

  // Store complex validations
  for (const val of body.complexValidations || []) {
    try {
      await db.uIComplexValidation.upsert({
        where: {
          projectId_viewName_validationName: {
            projectId: body.projectId,
            viewName: body.viewName,
            validationName: val.validationName,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          formName: val.formName,
          validationName: val.validationName,
          validationType: val.validationType,
          primaryField: val.primaryField,
          relatedFields: JSON.stringify(val.relatedFields || []),
          condition: val.condition,
          conditionType: val.conditionType || 'js',
          ruleExpression: val.ruleExpression,
          errorMessage: val.errorMessage,
          errorPlacement: val.errorPlacement,
          triggerOn: val.triggerOn || 'blur',
          isAsync: val.isAsync || false,
          asyncEndpoint: val.asyncEndpoint,
          asyncMethod: val.asyncMethod || 'POST',
          priority: val.priority || 0,
          confidence: val.confidence || 0.8,
          sourceCode: val.sourceCode,
          sourceLine: val.sourceLine,
        },
        update: {
          formName: val.formName,
          validationType: val.validationType,
          primaryField: val.primaryField,
          relatedFields: JSON.stringify(val.relatedFields || []),
          condition: val.condition,
          conditionType: val.conditionType || 'js',
          ruleExpression: val.ruleExpression,
          errorMessage: val.errorMessage,
          errorPlacement: val.errorPlacement,
          triggerOn: val.triggerOn || 'blur',
          isAsync: val.isAsync || false,
          asyncEndpoint: val.asyncEndpoint,
          asyncMethod: val.asyncMethod || 'POST',
          priority: val.priority || 0,
          confidence: val.confidence || 0.8,
          sourceCode: val.sourceCode,
          sourceLine: val.sourceLine,
        }
      });
      results.complexValidations++;
    } catch (e) {
      console.error('Failed to store complex validation:', e);
    }
  }

  // Store conditional permissions
  for (const perm of body.conditionalPermissions || []) {
    try {
      await db.uIConditionalPermission.upsert({
        where: {
          projectId_viewName_permissionName: {
            projectId: body.projectId,
            viewName: body.viewName,
            permissionName: perm.permissionName,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          permissionName: perm.permissionName,
          targetElement: perm.targetElement,
          action: perm.action || 'show',
          conditionType: perm.conditionType,
          condition: perm.condition,
          dependsOnFields: JSON.stringify(perm.dependsOnFields || []),
          dependsOnValues: JSON.stringify(perm.dependsOnValues || {}),
          basePermission: perm.basePermission,
          isNegated: perm.isNegated || false,
          priority: perm.priority || 0,
          confidence: perm.confidence || 0.8,
          sourceCode: perm.sourceCode,
          sourceLine: perm.sourceLine,
        },
        update: {
          targetElement: perm.targetElement,
          action: perm.action || 'show',
          conditionType: perm.conditionType,
          condition: perm.condition,
          dependsOnFields: JSON.stringify(perm.dependsOnFields || []),
          dependsOnValues: JSON.stringify(perm.dependsOnValues || {}),
          basePermission: perm.basePermission,
          isNegated: perm.isNegated || false,
          priority: perm.priority || 0,
          confidence: perm.confidence || 0.8,
          sourceCode: perm.sourceCode,
          sourceLine: perm.sourceLine,
        }
      });
      results.conditionalPermissions++;
    } catch (e) {
      console.error('Failed to store conditional permission:', e);
    }
  }

  // Store multi-form views
  for (const view of body.multiFormViews || []) {
    try {
      await db.uIMultiFormView.upsert({
        where: {
          projectId_viewName: {
            projectId: body.projectId,
            viewName: body.viewName,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          formCount: view.formCount || 0,
          forms: JSON.stringify(view.forms || []),
          defaultForm: view.defaultForm,
          formSwitching: view.formSwitching || false,
          switchTrigger: view.switchTrigger,
          sharedFields: JSON.stringify(view.sharedFields || []),
          submitBehavior: view.submitBehavior || 'individual',
          validationMode: view.validationMode || 'per_form',
          conflicts: JSON.stringify(view.conflicts || []),
          confidence: view.confidence || 0.9,
          sourceContent: view.sourceContent,
        },
        update: {
          formCount: view.formCount || 0,
          forms: JSON.stringify(view.forms || []),
          defaultForm: view.defaultForm,
          formSwitching: view.formSwitching || false,
          switchTrigger: view.switchTrigger,
          sharedFields: JSON.stringify(view.sharedFields || []),
          submitBehavior: view.submitBehavior || 'individual',
          validationMode: view.validationMode || 'per_form',
          conflicts: JSON.stringify(view.conflicts || []),
          confidence: view.confidence || 0.9,
          sourceContent: view.sourceContent,
        }
      });
      results.multiFormViews++;
    } catch (e) {
      console.error('Failed to store multi-form view:', e);
    }
  }

  // Store AJAX forms
  for (const form of body.ajaxForms || []) {
    try {
      await db.uIAJAXForm.upsert({
        where: {
          projectId_viewName_formName: {
            projectId: body.projectId,
            viewName: body.viewName,
            formName: form.formName || null,
          }
        },
        create: {
          projectId: body.projectId,
          viewName: body.viewName,
          formName: form.formName,
          submitType: form.submitType || 'ajax',
          endpoint: form.endpoint,
          httpMethod: form.httpMethod || 'POST',
          contentType: form.contentType || 'application/json',
          dataSerializer: form.dataSerializer || 'json',
          beforeSendCallback: form.beforeSendCallback,
          successCallback: form.successCallback,
          errorCallback: form.errorCallback,
          completeCallback: form.completeCallback,
          loadingIndicator: form.loadingIndicator,
          disableOnSubmit: form.disableOnSubmit !== false,
          csrfToken: form.csrfToken || false,
          csrfHeader: form.csrfHeader,
          fileUpload: form.fileUpload || false,
          progressCallback: form.progressCallback,
          timeout: form.timeout,
          retryCount: form.retryCount || 0,
          validationBeforeSend: form.validationBeforeSend !== false,
          confirmDialog: form.confirmDialog,
          redirectOnSuccess: form.redirectOnSuccess,
          reloadOnSuccess: form.reloadOnSuccess || false,
          confidence: form.confidence || 0.9,
          sourceCode: form.sourceCode,
          sourceLine: form.sourceLine,
        },
        update: {
          submitType: form.submitType || 'ajax',
          endpoint: form.endpoint,
          httpMethod: form.httpMethod || 'POST',
          contentType: form.contentType || 'application/json',
          dataSerializer: form.dataSerializer || 'json',
          beforeSendCallback: form.beforeSendCallback,
          successCallback: form.successCallback,
          errorCallback: form.errorCallback,
          completeCallback: form.completeCallback,
          loadingIndicator: form.loadingIndicator,
          disableOnSubmit: form.disableOnSubmit !== false,
          csrfToken: form.csrfToken || false,
          csrfHeader: form.csrfHeader,
          fileUpload: form.fileUpload || false,
          progressCallback: form.progressCallback,
          timeout: form.timeout,
          retryCount: form.retryCount || 0,
          validationBeforeSend: form.validationBeforeSend !== false,
          confirmDialog: form.confirmDialog,
          redirectOnSuccess: form.redirectOnSuccess,
          reloadOnSuccess: form.reloadOnSuccess || false,
          confidence: form.confidence || 0.9,
          sourceCode: form.sourceCode,
          sourceLine: form.sourceLine,
        }
      });
      results.ajaxForms++;
    } catch (e) {
      console.error('Failed to store AJAX form:', e);
    }
  }

  // Store partial views
  for (const partial of body.partialViews || []) {
    try {
      await db.uIPartialView.upsert({
        where: {
          projectId_parentView_partialViewName: {
            projectId: body.projectId,
            parentView: body.viewName,
            partialViewName: partial.partialViewName,
          }
        },
        create: {
          projectId: body.projectId,
          parentView: body.viewName,
          partialViewName: partial.partialViewName,
          renderMethod: partial.renderMethod,
          viewPath: partial.viewPath,
          parameters: JSON.stringify(partial.parameters || []),
          modelType: partial.modelType,
          isStronglyTyped: partial.isStronglyTyped || false,
          section: partial.section,
          renderPosition: partial.renderPosition || 0,
          cached: partial.cached || false,
          cacheDuration: partial.cacheDuration,
          childActions: JSON.stringify(partial.childActions || []),
          scriptsIncluded: JSON.stringify(partial.scriptsIncluded || []),
          stylesIncluded: JSON.stringify(partial.stylesIncluded || []),
          linkedTable: partial.linkedTable,
          linkedSP: partial.linkedSP,
          extractionNote: partial.extractionNote,
          confidence: partial.confidence || 0.9,
          sourceLine: partial.sourceLine,
        },
        update: {
          renderMethod: partial.renderMethod,
          viewPath: partial.viewPath,
          parameters: JSON.stringify(partial.parameters || []),
          modelType: partial.modelType,
          isStronglyTyped: partial.isStronglyTyped || false,
          section: partial.section,
          renderPosition: partial.renderPosition || 0,
          cached: partial.cached || false,
          cacheDuration: partial.cacheDuration,
          childActions: JSON.stringify(partial.childActions || []),
          scriptsIncluded: JSON.stringify(partial.scriptsIncluded || []),
          stylesIncluded: JSON.stringify(partial.stylesIncluded || []),
          linkedTable: partial.linkedTable,
          linkedSP: partial.linkedSP,
          extractionNote: partial.extractionNote,
          confidence: partial.confidence || 0.9,
          sourceLine: partial.sourceLine,
        }
      });
      results.partialViews++;
    } catch (e) {
      console.error('Failed to store partial view:', e);
    }
  }

  return NextResponse.json({
    success: true,
    stored: results,
    message: `Stored ${results.dynamicFields + results.complexValidations + results.conditionalPermissions + results.multiFormViews + results.ajaxForms + results.partialViews} advanced intelligence items`
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET INTELLIGENCE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

async function getIntelligenceSummary(projectId: string) {
  const [
    workflowCount,
    permissionCount,
    validationCount,
    cascadingCount,
    transitionCount,
  ] = await Promise.all([
    db.uIWorkflow.count({ where: { projectId } }),
    db.uIPermission.count({ where: { projectId } }),
    db.uIValidation.count({ where: { projectId } }),
    db.uICascadingDropdown.count({ where: { projectId } }),
    db.uIPageTransition.count({ where: { projectId } }),
  ]);

  // Get permissions by type
  const permissionsByType = await db.uIPermission.groupBy({
    by: ['permissionType'],
    where: { projectId },
    _count: true,
  });

  // Get validations by type
  const validationsByType = await db.uIValidation.groupBy({
    by: ['validationType'],
    where: { projectId },
    _count: true,
  });

  // Get workflows by type
  const workflowsByType = await db.uIWorkflow.groupBy({
    by: ['workflowType'],
    where: { projectId },
    _count: true,
  });

  return NextResponse.json({
    success: true,
    summary: {
      total: workflowCount + permissionCount + validationCount + cascadingCount + transitionCount,
      workflows: workflowCount,
      permissions: permissionCount,
      validations: validationCount,
      cascadingDropdowns: cascadingCount,
      pageTransitions: transitionCount,
      breakdown: {
        permissionsByType: permissionsByType.map(p => ({ type: p.permissionType, count: p._count })),
        validationsByType: validationsByType.map(v => ({ type: v.validationType, count: v._count })),
        workflowsByType: workflowsByType.map(w => ({ type: w.workflowType, count: w._count })),
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ADVANCED SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

async function getAdvancedSummary(projectId: string) {
  const [
    dynamicFieldCount,
    complexValidationCount,
    conditionalPermissionCount,
    multiFormViewCount,
    ajaxFormCount,
    partialViewCount,
  ] = await Promise.all([
    db.uIDynamicField.count({ where: { projectId } }),
    db.uIComplexValidation.count({ where: { projectId } }),
    db.uIConditionalPermission.count({ where: { projectId } }),
    db.uIMultiFormView.count({ where: { projectId } }),
    db.uIAJAXForm.count({ where: { projectId } }),
    db.uIPartialView.count({ where: { projectId } }),
  ]);

  // Get dynamic fields by type
  const dynamicFieldsByType = await db.uIDynamicField.groupBy({
    by: ['creationType'],
    where: { projectId },
    _count: true,
  });

  // Get complex validations by type
  const complexValidationsByType = await db.uIComplexValidation.groupBy({
    by: ['validationType'],
    where: { projectId },
    _count: true,
  });

  // Get AJAX forms by type
  const ajaxFormsByType = await db.uIAJAXForm.groupBy({
    by: ['submitType'],
    where: { projectId },
    _count: true,
  });

  return NextResponse.json({
    success: true,
    summary: {
      total: dynamicFieldCount + complexValidationCount + conditionalPermissionCount + multiFormViewCount + ajaxFormCount + partialViewCount,
      dynamicFields: dynamicFieldCount,
      complexValidations: complexValidationCount,
      conditionalPermissions: conditionalPermissionCount,
      multiFormViews: multiFormViewCount,
      ajaxForms: ajaxFormCount,
      partialViews: partialViewCount,
      breakdown: {
        dynamicFieldsByType: dynamicFieldsByType.map(d => ({ type: d.creationType, count: d._count })),
        complexValidationsByType: complexValidationsByType.map(v => ({ type: v.validationType, count: v._count })),
        ajaxFormsByType: ajaxFormsByType.map(a => ({ type: a.submitType, count: a._count })),
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET COMPLETE INTELLIGENCE (All types for a view)
// ═══════════════════════════════════════════════════════════════════════════

async function getCompleteIntelligence(projectId: string, viewName?: string) {
  // Get basic intelligence
  const [
    workflows,
    permissions,
    validations,
    cascadingDropdowns,
    pageTransitions,
  ] = await Promise.all([
    viewName ? db.uIWorkflow.findMany({ where: { projectId, sourceView: viewName } }) : db.uIWorkflow.findMany({ where: { projectId } }),
    viewName ? db.uIPermission.findMany({ where: { projectId, viewName } }) : db.uIPermission.findMany({ where: { projectId } }),
    viewName ? db.uIValidation.findMany({ where: { projectId, viewName } }) : db.uIValidation.findMany({ where: { projectId } }),
    viewName ? db.uICascadingDropdown.findMany({ where: { projectId, viewName } }) : db.uICascadingDropdown.findMany({ where: { projectId } }),
    viewName ? db.uIPageTransition.findMany({ where: { projectId, sourceView: viewName } }) : db.uIPageTransition.findMany({ where: { projectId } }),
  ]);

  // Get advanced intelligence
  const [
    dynamicFields,
    complexValidations,
    conditionalPermissions,
    multiFormViews,
    ajaxForms,
    partialViews,
  ] = await Promise.all([
    viewName ? db.uIDynamicField.findMany({ where: { projectId, viewName } }) : db.uIDynamicField.findMany({ where: { projectId } }),
    viewName ? db.uIComplexValidation.findMany({ where: { projectId, viewName } }) : db.uIComplexValidation.findMany({ where: { projectId } }),
    viewName ? db.uIConditionalPermission.findMany({ where: { projectId, viewName } }) : db.uIConditionalPermission.findMany({ where: { projectId } }),
    viewName ? db.uIMultiFormView.findMany({ where: { projectId, viewName } }) : db.uIMultiFormView.findMany({ where: { projectId } }),
    viewName ? db.uIAJAXForm.findMany({ where: { projectId, viewName } }) : db.uIAJAXForm.findMany({ where: { projectId } }),
    viewName ? db.uIPartialView.findMany({ where: { projectId, parentView: viewName } }) : db.uIPartialView.findMany({ where: { projectId } }),
  ]);

  return NextResponse.json({
    success: true,
    intelligence: {
      // Basic
      workflows: workflows.map(w => ({
        ...w,
        steps: JSON.parse(w.steps || '[]'),
        transitions: JSON.parse(w.transitions || '[]'),
        endpoints: JSON.parse(w.endpoints || '[]'),
      })),
      permissions,
      validations,
      cascadingDropdowns,
      pageTransitions: pageTransitions.map(t => ({
        ...t,
        parameters: JSON.parse(t.parameters || '[]'),
      })),
      // Advanced
      dynamicFields: dynamicFields.map(f => ({
        ...f,
        validationRules: JSON.parse(f.validationRules || '[]'),
      })),
      complexValidations: complexValidations.map(v => ({
        ...v,
        relatedFields: JSON.parse(v.relatedFields || '[]'),
      })),
      conditionalPermissions: conditionalPermissions.map(p => ({
        ...p,
        dependsOnFields: JSON.parse(p.dependsOnFields || '[]'),
        dependsOnValues: JSON.parse(p.dependsOnValues || '{}'),
      })),
      multiFormViews: multiFormViews.map(v => ({
        ...v,
        forms: JSON.parse(v.forms || '[]'),
        sharedFields: JSON.parse(v.sharedFields || '[]'),
        conflicts: JSON.parse(v.conflicts || '[]'),
      })),
      ajaxForms,
      partialViews: partialViews.map(p => ({
        ...p,
        parameters: JSON.parse(p.parameters || '[]'),
        childActions: JSON.parse(p.childActions || '[]'),
        scriptsIncluded: JSON.parse(p.scriptsIncluded || '[]'),
        stylesIncluded: JSON.parse(p.stylesIncluded || '[]'),
      })),
      counts: {
        workflows: workflows.length,
        permissions: permissions.length,
        validations: validations.length,
        cascadingDropdowns: cascadingDropdowns.length,
        pageTransitions: pageTransitions.length,
        dynamicFields: dynamicFields.length,
        complexValidations: complexValidations.length,
        conditionalPermissions: conditionalPermissions.length,
        multiFormViews: multiFormViews.length,
        ajaxForms: ajaxForms.length,
        partialViews: partialViews.length,
        total: workflows.length + permissions.length + validations.length + 
               cascadingDropdowns.length + pageTransitions.length +
               dynamicFields.length + complexValidations.length + 
               conditionalPermissions.length + multiFormViews.length + 
               ajaxForms.length + partialViews.length,
      }
    }
  });
}
