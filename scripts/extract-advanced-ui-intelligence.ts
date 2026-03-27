// =============================================================================
// Advanced UI Intelligence Extraction Script
// Extracts: Dynamic Fields, Complex Validations, Conditional Permissions,
//           Multi-Form Views, AJAX Forms, Partial Views
// =============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

// Dynamic Field Patterns
const DYNAMIC_FIELD_PATTERNS = {
  // Pattern: $("#container").append("<input ...>")
  append: /\$\(["']#(\w+)["']\)\.(?:append|prepend|html)\s*\(\s*["']([^"']+)["']\)/gi,
  // Pattern: $(this).clone().appendTo(...)
  clone: /\$\([^)]+\)\.clone\(\)\.(?:appendTo|insertAfter|insertBefore)\s*\(\s*["']([^"']+)["']\)/gi,
  // Pattern: document.createElement or $("<element>")
  create: /(?:document\.createElement\s*\(\s*["'](\w+)["']\s*\)|\$\s*\(\s*["']<(\w+)[^>]*>["']\s*\))/gi,
  // Pattern: Dynamic field name like name="field[${index}]"
  indexed: /name\s*=\s*["']([^"']+)\s*\$\{[^}]+\}[^"']*["']/gi,
  // Pattern: Adding row/item on button click
  addRow: /\$\(["']#(\w+)["']\)\.on?\s*\(\s*["']click["']\s*,\s*[^)]+\)\s*,?\s*(?:function\s*)?\([^)]*\)\s*\{[^}]*append[^}]*\}/gi,
};

// Complex Validation Patterns
const COMPLEX_VALIDATION_PATTERNS = {
  // Conditional validation: if ($("#Field").val() === "X") { validate Y }
  conditional: /if\s*\(\s*\$\(["']#(\w+)["']\)\.(?:val|prop|is)\s*\([^)]+\)\s*(?:===|==|!==|!=)\s*["']([^"']+)["']\s*\)\s*\{[^}]*validat\w*/gi,
  // Cross-field validation: compare two fields
  crossField: /\$\(["']#(\w+)["']\)\.val\(\)\s*(?:===|==|!==|!=|>|<|>=|<=)\s*\$\(["']#(\w+)["']\)\.val\(\)/gi,
  // Remote/async validation
  async: /\$\s*\(\s*["']#(\w+)["']\s*\)\.(?:blur|change|on)\s*\([^)]*\)\s*(?:function\s*)?\([^)]*\)\s*\{[^}]*\.(?:ajax|post|get)\s*\([^)]*validat/gi,
  // Custom validator function
  custom: /\$\.(?:validator\.addMethod|validator\.addMethod)\s*\(\s*["'](\w+)["']\s*,\s*function\s*\([^)]*\)\s*\{([^}]+)\}/gi,
  // Remote validation rule
  remote: /remote\s*:\s*\{[^}]*url\s*:\s*["']([^"']+)["'][^}]*\}/gi,
};

// Conditional Permission Patterns
const CONDITIONAL_PERMISSION_PATTERNS = {
  // Show/hide based on role in JS
  roleBased: /if\s*\(\s*(?:hasRole|isInRole|checkRole)\s*\(\s*["']([^"']+)["']\s*\)\s*\)\s*\{[^}]*\$\(["']#(\w+)["']\)\.(show|hide|toggle|prop)\s*\(/gi,
  // Show/hide based on field value
  fieldBased: /\$\(["']#(\w+)["']\)\.(?:change|on)\s*\([^)]*\)\s*(?:function\s*)?\([^)]*\)\s*\{[^}]*if\s*\([^)]*\)\s*\{[^}]*\$\(["']#(\w+)["']\)\.(show|hide|toggle)/gi,
  // Enable/disable based on condition
  enableDisable: /\$\(["']#(\w+)["']\)\.prop\s*\(\s*["'](disabled|readonly)["']\s*,\s*([^;]+)\)/gi,
  // User claims check
  claimBased: /if\s*\(\s*(?:hasClaim|User\.HasClaim)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)\s*\)\s*\{([^}]+)\}/gi,
};

// AJAX Form Patterns
const AJAX_FORM_PATTERNS = {
  // $.ajax with form data
  ajaxForm: /\$\.(?:ajax|post|get)\s*\(\s*\{[^}]*url\s*:\s*["']([^"']+)["'][^}]*data\s*:\s*(?:\$\(["']#(\w+)["']\)\.serialize\(\)|\{[^}]+\})[^}]*success\s*:/gi,
  // fetch API
  fetch: /fetch\s*\(\s*["']([^"']+)["']\s*,\s*\{[^}]*method\s*:\s*["'](\w+)["'][^}]*body\s*:/gi,
  // XMLHttpRequest
  xmlhttp: /(?:new\s+)?XMLHttpRequest\s*\([^)]*\)\s*;[^;]*\.open\s*\(\s*["'](\w+)["']\s*,\s*["']([^"']+)["']/gi,
  // Form submit with AJAX
  submitAjax: /\$\(["']#(\w+)["']\)\.submit\s*\(\s*function\s*\([^)]*\)\s*\{[^}]*\.(?:ajax|post|get)\s*\(/gi,
  // preventDefault + ajax
  preventDefault: /(?:event|e)\.preventDefault\s*\([^)]*\)\s*;[^;]*\.(?:ajax|post|get)\s*\(/gi,
};

// Partial View Patterns
const PARTIAL_VIEW_PATTERNS = {
  // @Html.Partial("_PartialName")
  partial: /@Html\.Partial\s*\(\s*["']([^"']+)["']\s*(?:,\s*([^)]+))?\)/gi,
  // @Html.RenderPartial("_PartialName")
  renderPartial: /@{\s*@?Html\.RenderPartial\s*\(\s*["']([^"']+)["']\s*(?:,\s*([^)]+))?\s*\)\s*;?\s*}/gi,
  // @Html.PartialAsync
  partialAsync: /@Html\.PartialAsync\s*\(\s*["']([^"']+)["']\s*(?:,\s*([^)]+))?\)/gi,
  // @await Html.PartialAsync
  awaitPartial: /@await\s+Html\.PartialAsync\s*\(\s*["']([^"']+)["']\s*(?:,\s*([^)]+))?\)/gi,
  // @Html.Action (child action)
  action: /@Html\.Action\s*\(\s*["'](\w+)["']\s*(?:,\s*["'](\w+)["']\s*)?(?:,\s*([^)]+))?\)/gi,
};

// Multi-Form Patterns
const MULTI_FORM_PATTERNS = {
  // Multiple <form> tags
  forms: /<form[^>]*(?:id|name)\s*=\s*["']([^"']+)["'][^>]*>/gi,
  // Form tabs
  formTabs: /<div[^>]*class\s*=\s*["'][^"']*(?:tab|nav-tabs)[^"']*["'][^>]*>[\s\S]*?<form/gi,
  // Toggle between forms
  toggleForm: /\$\(["']#(\w+)["']\)\.(?:click|on)\s*\([^)]*\)\s*(?:function\s*)?\([^)]*\)\s*\{[^}]*\$\(["']#(\w+)["']\)\.(?:show|hide|toggle)/gi,
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function extractDynamicFields(content: string, viewName: string): any[] {
  const fields: any[] = [];
  const lines = content.split('\n');

  // Pattern 1: Append/Prepend dynamic fields
  let match;
  while ((match = DYNAMIC_FIELD_PATTERNS.append.exec(content)) !== null) {
    const containerId = match[1];
    const htmlContent = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Extract field name from the HTML
    const nameMatch = htmlContent.match(/name\s*=\s*["']([^"']+)["']/);
    const typeMatch = htmlContent.match(/type\s*=\s*["']([^"']+)["']/);
    
    if (nameMatch) {
      fields.push({
        viewName,
        fieldName: nameMatch[1],
        creationType: match[0].includes('append') ? 'append' : 'prepend',
        parentContainer: containerId,
        fieldType: typeMatch ? typeMatch[1] : 'text',
        fieldTemplate: htmlContent,
        confidence: 0.85,
        sourceCode: match[0].substring(0, 200),
        sourceLine: lineNum,
      });
    }
  }

  // Pattern 2: Clone operations
  DYNAMIC_FIELD_PATTERNS.clone.lastIndex = 0;
  while ((match = DYNAMIC_FIELD_PATTERNS.clone.exec(content)) !== null) {
    const targetSelector = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Find the source element being cloned
    const cloneSourceMatch = match[0].match(/\$\(["']#(\w+)["']\)/);
    
    fields.push({
      viewName,
      fieldName: `cloned_from_${cloneSourceMatch ? cloneSourceMatch[1] : 'unknown'}`,
      creationType: 'clone',
      triggerSelector: targetSelector,
      parentContainer: targetSelector,
      isRepeatable: true,
      confidence: 0.75,
      sourceCode: match[0].substring(0, 200),
      sourceLine: lineNum,
    });
  }

  // Pattern 3: Indexed/named dynamic fields (field[0], field[${i}])
  DYNAMIC_FIELD_PATTERNS.indexed.lastIndex = 0;
  while ((match = DYNAMIC_FIELD_PATTERNS.indexed.exec(content)) !== null) {
    const fieldName = match[1].replace(/[\[\]$]/g, '');
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    fields.push({
      viewName,
      fieldName: `${fieldName}_dynamic`,
      creationType: 'indexed',
      fieldTemplate: match[0],
      isRepeatable: true,
      confidence: 0.8,
      sourceCode: match[0],
      sourceLine: lineNum,
    });
  }

  // Pattern 4: Add row/item button handlers
  DYNAMIC_FIELD_PATTERNS.addRow.lastIndex = 0;
  while ((match = DYNAMIC_FIELD_PATTERNS.addRow.exec(content)) !== null) {
    const buttonId = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Extract field being added from the append content
    const appendMatch = match[0].match(/append\s*\(\s*["']([^"']+)["']\)/);
    
    fields.push({
      viewName,
      fieldName: `dynamic_field_${buttonId}`,
      creationType: 'append',
      triggerEvent: 'click',
      triggerSelector: `#${buttonId}`,
      isRepeatable: true,
      confidence: 0.7,
      sourceCode: match[0].substring(0, 300),
      sourceLine: lineNum,
    });
  }

  return fields;
}

function extractComplexValidations(content: string, viewName: string): any[] {
  const validations: any[] = [];
  const lines = content.split('\n');

  // Pattern 1: Conditional validations
  let match;
  while ((match = COMPLEX_VALIDATION_PATTERNS.conditional.exec(content)) !== null) {
    const triggerField = match[1];
    const triggerValue = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    validations.push({
      viewName,
      validationName: `conditional_${triggerField}_${triggerValue}`,
      validationType: 'conditional',
      primaryField: triggerField,
      condition: `$("#${triggerField}").val() === "${triggerValue}"`,
      conditionType: 'js',
      triggerOn: 'change',
      confidence: 0.8,
      sourceCode: match[0].substring(0, 300),
      sourceLine: lineNum,
    });
  }

  // Pattern 2: Cross-field validations
  COMPLEX_VALIDATION_PATTERNS.crossField.lastIndex = 0;
  while ((match = COMPLEX_VALIDATION_PATTERNS.crossField.exec(content)) !== null) {
    const field1 = match[1];
    const field2 = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    validations.push({
      viewName,
      validationName: `cross_field_${field1}_${field2}`,
      validationType: 'cross_field',
      primaryField: field1,
      relatedFields: [field2],
      condition: match[0],
      conditionType: 'js',
      triggerOn: 'blur',
      confidence: 0.85,
      sourceCode: match[0],
      sourceLine: lineNum,
    });
  }

  // Pattern 3: Async validations
  COMPLEX_VALIDATION_PATTERNS.async.lastIndex = 0;
  while ((match = COMPLEX_VALIDATION_PATTERNS.async.exec(content)) !== null) {
    const fieldName = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Try to find the endpoint
    const endpointMatch = content.substring(Math.max(0, match.index - 500), match.index + 500).match(/url\s*:\s*["']([^"']+)["']/);
    
    validations.push({
      viewName,
      validationName: `async_validation_${fieldName}`,
      validationType: 'async',
      primaryField: fieldName,
      isAsync: true,
      asyncEndpoint: endpointMatch ? endpointMatch[1] : undefined,
      triggerOn: 'blur',
      confidence: 0.75,
      sourceCode: match[0].substring(0, 300),
      sourceLine: lineNum,
    });
  }

  // Pattern 4: Custom validators
  COMPLEX_VALIDATION_PATTERNS.custom.lastIndex = 0;
  while ((match = COMPLEX_VALIDATION_PATTERNS.custom.exec(content)) !== null) {
    const validatorName = match[1];
    const validatorLogic = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    validations.push({
      viewName,
      validationName: `custom_${validatorName}`,
      validationType: 'custom',
      primaryField: '*',
      ruleExpression: validatorLogic.substring(0, 500),
      conditionType: 'js',
      confidence: 0.9,
      sourceCode: match[0].substring(0, 500),
      sourceLine: lineNum,
    });
  }

  // Pattern 5: Remote validation rules
  COMPLEX_VALIDATION_PATTERNS.remote.lastIndex = 0;
  while ((match = COMPLEX_VALIDATION_PATTERNS.remote.exec(content)) !== null) {
    const endpoint = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Find the field this applies to
    const contextStart = Math.max(0, match.index - 200);
    const contextContent = content.substring(contextStart, match.index);
    const fieldMatch = contextContent.match(/(\w+)\s*:\s*\{/);
    
    validations.push({
      viewName,
      validationName: `remote_validation_${fieldMatch ? fieldMatch[1] : 'unknown'}`,
      validationType: 'remote',
      primaryField: fieldMatch ? fieldMatch[1] : 'unknown',
      isAsync: true,
      asyncEndpoint: endpoint,
      triggerOn: 'blur',
      confidence: 0.9,
      sourceCode: match[0],
      sourceLine: lineNum,
    });
  }

  return validations;
}

function extractConditionalPermissions(content: string, viewName: string): any[] {
  const permissions: any[] = [];
  const lines = content.split('\n');

  // Pattern 1: Role-based show/hide
  let match;
  while ((match = CONDITIONAL_PERMISSION_PATTERNS.roleBased.exec(content)) !== null) {
    const roleName = match[1];
    const targetElement = match[2];
    const action = match[3];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    permissions.push({
      viewName,
      permissionName: `role_${roleName}_${targetElement}`,
      targetElement,
      action: action === 'hide' ? 'hide' : 'show',
      conditionType: 'role',
      basePermission: roleName,
      condition: `hasRole("${roleName}")`,
      confidence: 0.85,
      sourceCode: match[0].substring(0, 200),
      sourceLine: lineNum,
    });
  }

  // Pattern 2: Field-based show/hide
  CONDITIONAL_PERMISSION_PATTERNS.fieldBased.lastIndex = 0;
  while ((match = CONDITIONAL_PERMISSION_PATTERNS.fieldBased.exec(content)) !== null) {
    const triggerField = match[1];
    const targetElement = match[2];
    const action = match[3];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Try to extract the condition value
    const conditionMatch = content.substring(match.index, match.index + 500).match(/if\s*\(\s*\$\(["']#\w+["']\)\.val\(\)\s*(?:===|==)\s*["']([^"']+)["']\s*\)/);
    
    permissions.push({
      viewName,
      permissionName: `field_${triggerField}_${targetElement}`,
      targetElement,
      action: action === 'hide' ? 'hide' : 'show',
      conditionType: 'field_value',
      dependsOnFields: [triggerField],
      dependsOnValues: conditionMatch ? { [triggerField]: conditionMatch[1] } : {},
      condition: `$("#${triggerField}").val() === "${conditionMatch ? conditionMatch[1] : '*'}"`,
      confidence: 0.8,
      sourceCode: match[0].substring(0, 300),
      sourceLine: lineNum,
    });
  }

  // Pattern 3: Enable/disable based on condition
  CONDITIONAL_PERMISSION_PATTERNS.enableDisable.lastIndex = 0;
  while ((match = CONDITIONAL_PERMISSION_PATTERNS.enableDisable.exec(content)) !== null) {
    const targetElement = match[1];
    const property = match[2];
    const condition = match[3];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    permissions.push({
      viewName,
      permissionName: `enable_${targetElement}`,
      targetElement,
      action: property === 'disabled' ? 'disable' : 'enable',
      conditionType: 'expression',
      condition,
      confidence: 0.75,
      sourceCode: match[0],
      sourceLine: lineNum,
    });
  }

  // Pattern 4: Claim-based permissions
  CONDITIONAL_PERMISSION_PATTERNS.claimBased.lastIndex = 0;
  while ((match = CONDITIONAL_PERMISSION_PATTERNS.claimBased.exec(content)) !== null) {
    const claimType = match[1];
    const claimValue = match[2];
    const body = match[3];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Try to find target element in body
    const targetMatch = body.match(/\$\(["']#(\w+)["']\)/);
    
    permissions.push({
      viewName,
      permissionName: `claim_${claimType}_${claimValue}`,
      targetElement: targetMatch ? targetMatch[1] : 'unknown',
      action: body.includes('.show') ? 'show' : body.includes('.hide') ? 'hide' : 'toggle',
      conditionType: 'claim',
      basePermission: `${claimType}=${claimValue}`,
      condition: `hasClaim("${claimType}", "${claimValue}")`,
      confidence: 0.85,
      sourceCode: match[0].substring(0, 300),
      sourceLine: lineNum,
    });
  }

  return permissions;
}

function extractAJAXForms(content: string, viewName: string): any[] {
  const forms: any[] = [];
  const lines = content.split('\n');

  // Pattern 1: $.ajax with form data
  let match;
  while ((match = AJAX_FORM_PATTERNS.ajaxForm.exec(content)) !== null) {
    const endpoint = match[1];
    const formId = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Extract more details from the ajax call
    const contextStart = Math.max(0, match.index - 50);
    const contextEnd = Math.min(content.length, match.index + 1000);
    const ajaxContent = content.substring(contextStart, contextEnd);
    
    const methodMatch = ajaxContent.match(/type\s*:\s*["'](\w+)["']/);
    const successMatch = ajaxContent.match(/success\s*:\s*(?:function\s*)?\([^)]*\)\s*\{([^}]+)\}/);
    const errorMatch = ajaxContent.match(/error\s*:\s*(?:function\s*)?\([^)]*\)\s*\{([^}]+)\}/);
    const redirectMatch = ajaxContent.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
    
    forms.push({
      viewName,
      formName: formId,
      submitType: 'ajax',
      endpoint,
      httpMethod: methodMatch ? methodMatch[1] : 'POST',
      successCallback: successMatch ? successMatch[1].substring(0, 100) : undefined,
      errorCallback: errorMatch ? errorMatch[1].substring(0, 100) : undefined,
      redirectOnSuccess: redirectMatch ? redirectMatch[1] : undefined,
      confidence: 0.9,
      sourceCode: match[0].substring(0, 300),
      sourceLine: lineNum,
    });
  }

  // Pattern 2: Fetch API
  AJAX_FORM_PATTERNS.fetch.lastIndex = 0;
  while ((match = AJAX_FORM_PATTERNS.fetch.exec(content)) !== null) {
    const endpoint = match[1];
    const method = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    forms.push({
      viewName,
      submitType: 'fetch',
      endpoint,
      httpMethod: method,
      contentType: 'application/json',
      confidence: 0.85,
      sourceCode: match[0],
      sourceLine: lineNum,
    });
  }

  // Pattern 3: Form submit with AJAX
  AJAX_FORM_PATTERNS.submitAjax.lastIndex = 0;
  while ((match = AJAX_FORM_PATTERNS.submitAjax.exec(content)) !== null) {
    const formId = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Extract endpoint from the ajax call
    const contextEnd = Math.min(content.length, match.index + 500);
    const ajaxContent = content.substring(match.index, contextEnd);
    const endpointMatch = ajaxContent.match(/url\s*:\s*["']([^"']+)["']/);
    
    forms.push({
      viewName,
      formName: formId,
      submitType: 'ajax',
      endpoint: endpointMatch ? endpointMatch[1] : undefined,
      httpMethod: 'POST',
      validationBeforeSend: true,
      confidence: 0.9,
      sourceCode: match[0].substring(0, 200),
      sourceLine: lineNum,
    });
  }

  // Pattern 4: preventDefault + ajax
  AJAX_FORM_PATTERNS.preventDefault.lastIndex = 0;
  while ((match = AJAX_FORM_PATTERNS.preventDefault.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Find form being submitted
    const contextStart = Math.max(0, match.index - 300);
    const contextContent = content.substring(contextStart, match.index);
    const formMatch = contextContent.match(/\$\(["']#(\w+)["']\)\.submit/) || 
                      contextContent.match(/\$\(["']form["']\)/);
    
    // Find endpoint
    const contextEnd = Math.min(content.length, match.index + 500);
    const ajaxContent = content.substring(match.index, contextEnd);
    const endpointMatch = ajaxContent.match(/url\s*:\s*["']([^"']+)["']/);
    
    forms.push({
      viewName,
      formName: formMatch ? formMatch[1] : undefined,
      submitType: 'ajax',
      endpoint: endpointMatch ? endpointMatch[1] : undefined,
      httpMethod: 'POST',
      validationBeforeSend: true,
      confidence: 0.85,
      sourceCode: match[0].substring(0, 200),
      sourceLine: lineNum,
    });
  }

  return forms;
}

function extractPartialViews(content: string, viewName: string): any[] {
  const partials: any[] = [];
  const lines = content.split('\n');

  // Pattern 1: @Html.Partial
  let match;
  while ((match = PARTIAL_VIEW_PATTERNS.partial.exec(content)) !== null) {
    const partialName = match[1];
    const modelParam = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    partials.push({
      parentView: viewName,
      partialViewName: partialName,
      renderMethod: 'Partial',
      modelType: modelParam ? modelParam.trim() : undefined,
      isStronglyTyped: !!modelParam,
      confidence: 0.95,
      sourceLine: lineNum,
    });
  }

  // Pattern 2: @Html.RenderPartial
  PARTIAL_VIEW_PATTERNS.renderPartial.lastIndex = 0;
  while ((match = PARTIAL_VIEW_PATTERNS.renderPartial.exec(content)) !== null) {
    const partialName = match[1];
    const modelParam = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    partials.push({
      parentView: viewName,
      partialViewName: partialName,
      renderMethod: 'RenderPartial',
      modelType: modelParam ? modelParam.trim() : undefined,
      isStronglyTyped: !!modelParam,
      confidence: 0.95,
      sourceLine: lineNum,
    });
  }

  // Pattern 3: @await Html.PartialAsync
  PARTIAL_VIEW_PATTERNS.awaitPartial.lastIndex = 0;
  while ((match = PARTIAL_VIEW_PATTERNS.awaitPartial.exec(content)) !== null) {
    const partialName = match[1];
    const modelParam = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    partials.push({
      parentView: viewName,
      partialViewName: partialName,
      renderMethod: 'PartialAsync',
      modelType: modelParam ? modelParam.trim() : undefined,
      isStronglyTyped: !!modelParam,
      confidence: 0.95,
      sourceLine: lineNum,
    });
  }

  // Pattern 4: @Html.Action (child actions)
  PARTIAL_VIEW_PATTERNS.action.lastIndex = 0;
  while ((match = PARTIAL_VIEW_PATTERNS.action.exec(content)) !== null) {
    const actionName = match[1];
    const controllerName = match[2];
    const parameters = match[3];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    partials.push({
      parentView: viewName,
      partialViewName: `${controllerName || 'Current'}/${actionName}`,
      renderMethod: 'Action',
      childActions: [actionName],
      parameters: parameters ? [{ raw: parameters.trim() }] : [],
      confidence: 0.9,
      sourceLine: lineNum,
    });
  }

  return partials;
}

function extractMultiFormViews(content: string, viewName: string): any[] {
  const views: any[] = [];
  const forms: any[] = [];
  
  // Find all forms
  let match;
  MULTI_FORM_PATTERNS.forms.lastIndex = 0;
  while ((match = MULTI_FORM_PATTERNS.forms.exec(content)) !== null) {
    forms.push({
      name: match[1],
      index: match.index,
    });
  }

  if (forms.length > 1) {
    // Extract form details
    const formDetails = forms.map(f => {
      const formStart = f.index;
      const formEnd = content.indexOf('</form>', formStart);
      const formContent = content.substring(formStart, formEnd > 0 ? formEnd : formStart + 2000);
      
      // Extract fields from form
      const fieldMatches = formContent.matchAll(/name\s*=\s*["']([^"']+)["']/g);
      const fields = Array.from(fieldMatches).map(m => m[1]);
      
      // Extract action URL
      const actionMatch = formContent.match(/action\s*=\s*["']([^"']+)["']/);
      
      return {
        name: f.name,
        fields,
        action: actionMatch ? actionMatch[1] : undefined,
      };
    });

    // Find shared fields
    const allFields = formDetails.flatMap(f => f.fields);
    const fieldCounts = allFields.reduce((acc, field) => {
      acc[field] = (acc[field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const sharedFields = Object.keys(fieldCounts).filter(f => fieldCounts[f] > 1);

    // Find conflicts (same field name, different types/validations)
    const conflicts: any[] = [];

    views.push({
      viewName,
      formCount: forms.length,
      forms: formDetails,
      sharedFields,
      conflicts,
      formSwitching: content.includes('tab') || content.includes('toggle'),
      confidence: 0.95,
    });
  }

  return views;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function extractAdvancedIntelligence(projectId: string, viewName?: string) {
  console.log('=== Extracting Advanced UI Intelligence ===\n');
  
  // Get CSHTML files from cache
  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;
  
  const cshtmlFiles = await prisma.cSHTMLAnalysisCache.findMany({
    where,
    orderBy: { viewName: 'asc' }
  });

  console.log(`Found ${cshtmlFiles.length} CSHTML views to analyze\n`);

  const allAdvancedIntelligence = {
    dynamicFields: [] as any[],
    complexValidations: [] as any[],
    conditionalPermissions: [] as any[],
    multiFormViews: [] as any[],
    ajaxForms: [] as any[],
    partialViews: [] as any[],
  };

  for (const file of cshtmlFiles) {
    const content = file.rawContent || '';
    const viewName = file.viewName;

    console.log(`Processing: ${viewName}`);

    // Extract all advanced patterns
    const dynamicFields = extractDynamicFields(content, viewName);
    const complexValidations = extractComplexValidations(content, viewName);
    const conditionalPermissions = extractConditionalPermissions(content, viewName);
    const multiFormViews = extractMultiFormViews(content, viewName);
    const ajaxForms = extractAJAXForms(content, viewName);
    const partialViews = extractPartialViews(content, viewName);

    console.log(`  - Dynamic Fields: ${dynamicFields.length}`);
    console.log(`  - Complex Validations: ${complexValidations.length}`);
    console.log(`  - Conditional Permissions: ${conditionalPermissions.length}`);
    console.log(`  - Multi-Form Views: ${multiFormViews.length}`);
    console.log(`  - AJAX Forms: ${ajaxForms.length}`);
    console.log(`  - Partial Views: ${partialViews.length}`);

    allAdvancedIntelligence.dynamicFields.push(...dynamicFields);
    allAdvancedIntelligence.complexValidations.push(...complexValidations);
    allAdvancedIntelligence.conditionalPermissions.push(...conditionalPermissions);
    allAdvancedIntelligence.multiFormViews.push(...multiFormViews);
    allAdvancedIntelligence.ajaxForms.push(...ajaxForms);
    allAdvancedIntelligence.partialViews.push(...partialViews);
  }

  console.log('\n=== Total Extraction Results ===');
  console.log(`Dynamic Fields: ${allAdvancedIntelligence.dynamicFields.length}`);
  console.log(`Complex Validations: ${allAdvancedIntelligence.complexValidations.length}`);
  console.log(`Conditional Permissions: ${allAdvancedIntelligence.conditionalPermissions.length}`);
  console.log(`Multi-Form Views: ${allAdvancedIntelligence.multiFormViews.length}`);
  console.log(`AJAX Forms: ${allAdvancedIntelligence.ajaxForms.length}`);
  console.log(`Partial Views: ${allAdvancedIntelligence.partialViews.length}`);

  return allAdvancedIntelligence;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE TO DATABASE
// ═══════════════════════════════════════════════════════════════════════════

async function storeAdvancedIntelligence(projectId: string, intelligence: typeof extractAdvancedIntelligence extends (...args: any) => infer R ? R : never) {
  console.log('\n=== Storing Advanced Intelligence ===\n');

  // Store via API
  const response = await fetch('http://localhost:3000/api/ui-intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'store-all-advanced-intelligence',
      projectId,
      ...intelligence,
    }),
  });

  const result = await response.json();
  console.log('Store result:', result);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const projectId = 'cmmqlzpgf0000q5ge896s0k29'; // HIS Production
  
  // Extract advanced intelligence
  const intelligence = await extractAdvancedIntelligence(projectId);
  
  // Store to database
  await storeAdvancedIntelligence(projectId, intelligence);
  
  // Get summary
  const summaryResponse = await fetch('http://localhost:3000/api/ui-intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get-advanced-summary',
      projectId,
    }),
  });

  const summary = await summaryResponse.json();
  console.log('\n=== Final Advanced Summary ===');
  console.log(JSON.stringify(summary.summary, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
