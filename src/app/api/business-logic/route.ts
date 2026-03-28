// =============================================================================
// Business Logic Intelligence API - Complete Implementation
// Handles: IF/THEN Rules, JS Validations, State Machines, Policies,
//          Rule Execution, Decision Tables, Testing, Versioning, Analytics
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

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // IF/THEN Rules Extraction (Core)
      // ─────────────────────────────────────────────────────────────────────
      case 'extract-if-then-rules':
        return await extractIfThenRules(projectId);
      
      case 'get-business-rules':
        return await getBusinessRules(projectId, body.filters);
      
      case 'store-business-rule':
        return await storeBusinessRule(projectId, body.rule);
      
      case 'update-business-rule':
        return await updateBusinessRule(projectId, body.ruleId, body.updates);
      
      case 'delete-business-rule':
        return await deleteBusinessRule(projectId, body.ruleId);
      
      // ─────────────────────────────────────────────────────────────────────
      // JS Validation to Business Rules (Core)
      // ─────────────────────────────────────────────────────────────────────
      case 'extract-js-validations':
        return await extractJSValidations(projectId, body.viewName);
      
      case 'convert-validation-to-rule':
        return await convertValidationToRule(projectId, body.validation);
      
      case 'get-validation-rules':
        return await getValidationRules(projectId, body.viewName);
      
      // ─────────────────────────────────────────────────────────────────────
      // State Machine Detection (Core)
      // ─────────────────────────────────────────────────────────────────────
      case 'detect-state-machines':
        return await detectStateMachines(projectId);
      
      case 'get-state-transitions':
        return await getStateTransitions(projectId, body.tableName);
      
      case 'store-state-machine':
        return await storeStateMachine(projectId, body.stateMachine);
      
      case 'get-state-machine':
        return await getStateMachine(projectId, body.tableName);
      
      case 'validate-state-transition':
        return await validateStateTransition(projectId, body.tableName, body.fromState, body.toState);
      
      // ─────────────────────────────────────────────────────────────────────
      // Policy Rule Repository (Core)
      // ─────────────────────────────────────────────────────────────────────
      case 'create-policy':
        return await createPolicy(projectId, body.policy);
      
      case 'update-policy':
        return await updatePolicy(projectId, body.policyId, body.updates);
      
      case 'get-policies':
        return await getPolicies(projectId, body.filters);
      
      case 'evaluate-policy':
        return await evaluatePolicy(projectId, body.policyId, body.context);
      
      case 'delete-policy':
        return await deletePolicy(projectId, body.policyId);
      
      // ─────────────────────────────────────────────────────────────────────
      // Rule Execution Engine (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'execute-rule':
        return await executeRule(projectId, body.ruleId, body.data);
      
      case 'execute-rules-batch':
        return await executeRulesBatch(projectId, body.ruleIds, body.data);
      
      case 'execute-all-rules':
        return await executeAllRules(projectId, body.data, body.options);
      
      case 'get-execution-history':
        return await getExecutionHistory(projectId, body.filters);
      
      case 'get-rule-performance':
        return await getRulePerformance(projectId, body.ruleId);
      
      // ─────────────────────────────────────────────────────────────────────
      // Decision Tables (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'create-decision-table':
        return await createDecisionTable(projectId, body.decisionTable);
      
      case 'update-decision-table':
        return await updateDecisionTable(projectId, body.tableId, body.updates);
      
      case 'get-decision-tables':
        return await getDecisionTables(projectId);
      
      case 'evaluate-decision-table':
        return await evaluateDecisionTable(projectId, body.tableId, body.input);
      
      case 'convert-rules-to-decision-table':
        return await convertRulesToDecisionTable(projectId, body.ruleIds);
      
      // ─────────────────────────────────────────────────────────────────────
      // Rule Testing Framework (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'create-test-case':
        return await createTestCase(projectId, body.testCase);
      
      case 'run-test-case':
        return await runTestCase(projectId, body.testCaseId);
      
      case 'run-all-tests':
        return await runAllTests(projectId);
      
      case 'get-test-results':
        return await getTestResults(projectId, body.filters);
      
      case 'create-test-from-rule':
        return await createTestFromRule(projectId, body.ruleId);
      
      // ─────────────────────────────────────────────────────────────────────
      // Rule Dependencies & Conflicts (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'detect-rule-conflicts':
        return await detectRuleConflicts(projectId);
      
      case 'analyze-rule-dependencies':
        return await analyzeRuleDependencies(projectId);
      
      case 'resolve-conflict':
        return await resolveConflict(projectId, body.conflictId, body.resolution);
      
      case 'get-rule-impact':
        return await getRuleImpact(projectId, body.ruleId);
      
      // ─────────────────────────────────────────────────────────────────────
      // Rule Versioning & History (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'get-rule-history':
        return await getRuleHistory(projectId, body.ruleId);
      
      case 'rollback-rule':
        return await rollbackRule(projectId, body.ruleId, body.version);
      
      case 'compare-rule-versions':
        return await compareRuleVersions(projectId, body.ruleId, body.version1, body.version2);
      
      // ─────────────────────────────────────────────────────────────────────
      // Rule Templates & Library (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'create-rule-template':
        return await createRuleTemplate(projectId, body.template);
      
      case 'get-rule-templates':
        return await getRuleTemplates(projectId, body.category);
      
      case 'instantiate-template':
        return await instantiateTemplate(projectId, body.templateId, body.params);
      
      case 'get-builtin-templates':
        return await getBuiltinTemplates();
      
      // ─────────────────────────────────────────────────────────────────────
      // Business Process Mapping (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'create-business-process':
        return await createBusinessProcess(projectId, body.process);
      
      case 'get-business-processes':
        return await getBusinessProcesses(projectId);
      
      case 'map-rules-to-process':
        return await mapRulesToProcess(projectId, body.processId, body.ruleMappings);
      
      case 'get-process-rules':
        return await getProcessRules(projectId, body.processId);
      
      // ─────────────────────────────────────────────────────────────────────
      // Export/Import (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'export-rules':
        return await exportRules(projectId, body.format, body.filters);
      
      case 'import-rules':
        return await importRules(projectId, body.rules, body.options);
      
      case 'export-policies':
        return await exportPolicies(projectId, body.format);
      
      case 'import-policies':
        return await importPolicies(projectId, body.policies);
      
      // ─────────────────────────────────────────────────────────────────────
      // Analytics & Reporting (Advanced - NEW)
      // ─────────────────────────────────────────────────────────────────────
      case 'get-rule-analytics':
        return await getRuleAnalytics(projectId);
      
      case 'get-coverage-report':
        return await getCoverageReport(projectId);
      
      case 'get-complexity-report':
        return await getComplexityReport(projectId);
      
      // ─────────────────────────────────────────────────────────────────────
      // Complete Analysis
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze-business-logic':
        return await analyzeBusinessLogic(projectId);
      
      case 'get-business-logic-summary':
        return await getBusinessLogicSummary(projectId);
      
      case 'get-business-logic-health':
        return await getBusinessLogicHealth(projectId);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Business Logic API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IF/THEN RULES EXTRACTION (CORE)
// ═══════════════════════════════════════════════════════════════════════════

async function extractIfThenRules(projectId: string) {
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { id: true, procedureName: true, body: true },
  });

  const extractedRules: any[] = [];

  for (const sp of procedures) {
    const body = sp.body || '';
    const rules = extractRulesFromSPBody(sp.procedureName, body);
    extractedRules.push(...rules.map((r: any) => ({ ...r, procedureId: sp.id })));
  }

  // Store extracted rules with versioning
  for (const rule of extractedRules) {
    try {
      const existing = await db.businessRule.findFirst({
        where: { projectId, ruleName: rule.name }
      });

      if (existing) {
        // Create new version
        await db.businessRuleVersion.create({
          data: {
            businessRuleId: existing.id,
            version: (await db.businessRuleVersion.count({ where: { businessRuleId: existing.id } })) + 1,
            condition: rule.condition,
            action: rule.action,
            metadata: JSON.stringify(rule.metadata || {}),
          }
        });
        
        // Update current version
        await db.businessRule.update({
          where: { id: existing.id },
          data: {
            condition: rule.condition,
            action: rule.action,
            severity: rule.severity,
            metadata: JSON.stringify(rule.metadata || {}),
          }
        });
      } else {
        await db.businessRule.create({
          data: {
            projectId,
            ruleName: rule.name,
            ruleType: rule.type,
            sourceType: 'stored_procedure',
            sourceId: rule.procedureId,
            condition: rule.condition,
            action: rule.action,
            severity: rule.severity,
            version: 1,
            metadata: JSON.stringify(rule.metadata || {}),
          }
        });
      }
    } catch (e) {
      console.error('Failed to store rule:', rule.name, e);
    }
  }

  return NextResponse.json({
    success: true,
    rulesExtracted: extractedRules.length,
    rules: extractedRules,
    stats: {
      byType: extractedRules.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: extractedRules.reduce((acc, r) => {
        acc[r.severity] = (acc[r.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    }
  });
}

function extractRulesFromSPBody(procedureName: string, body: string): any[] {
  const rules: any[] = [];
  
  // Pattern 1: IF...THEN style
  const ifThenPattern = /IF\s*\(([^)]+)\)\s*(?:BEGIN\s*)?([\s\S]*?)(?:END|(?=IF|ELSE|RETURN|--))/gi;
  let match;
  while ((match = ifThenPattern.exec(body)) !== null) {
    const condition = match[1].trim();
    const action = match[2].trim();
    
    if (condition && action) {
      rules.push({
        name: `${procedureName}_IF_${rules.length + 1}`,
        type: 'conditional',
        condition: normalizeCondition(condition),
        action: normalizeAction(action),
        severity: determineSeverity(action),
        metadata: {
          source: 'if_statement',
          procedureName,
          rawCondition: condition,
          rawAction: action.substring(0, 500),
        }
      });
    }
  }

  // Pattern 2: CASE WHEN style
  const casePattern = /CASE\s+WHEN\s+([^THEN]+)\s+THEN\s+([^ELSEWHEN]+)/gi;
  while ((match = casePattern.exec(body)) !== null) {
    const condition = match[1].trim();
    const action = match[2].trim();
    
    rules.push({
      name: `${procedureName}_CASE_${rules.length + 1}`,
      type: 'case_when',
      condition: normalizeCondition(condition),
      action: normalizeAction(action),
      severity: 'medium',
      metadata: { source: 'case_statement', procedureName }
    });
  }

  // Pattern 3: EXISTS checks
  const existsPattern = /IF\s+EXISTS\s*\(([^)]+)\)\s*([\s\S]*?)(?=ELSE|IF|$)/gi;
  while ((match = existsPattern.exec(body)) !== null) {
    const subquery = match[1].trim();
    const action = match[2].trim();
    
    rules.push({
      name: `${procedureName}_EXISTS_${rules.length + 1}`,
      type: 'existence_check',
      condition: `EXISTS(${subquery})`,
      action: normalizeAction(action),
      severity: 'high',
      metadata: { source: 'exists_check', procedureName, checkType: 'existence' }
    });
  }

  // Pattern 4: @@ROWCOUNT checks
  const rowcountPattern = /@@ROWCOUNT\s*(=|>|<|>=|<=)\s*(\d+)/gi;
  while ((match = rowcountPattern.exec(body)) !== null) {
    const operator = match[1];
    const value = match[2];
    
    rules.push({
      name: `${procedureName}_ROWCOUNT_${rules.length + 1}`,
      type: 'rowcount_check',
      condition: `@@ROWCOUNT ${operator} ${value}`,
      action: 'validate_rows_affected',
      severity: 'medium',
      metadata: { source: 'rowcount_check', procedureName, expectedRows: `${operator} ${value}` }
    });
  }

  // Pattern 5: RAISERROR/THROW error handling
  const errorPattern = /(RAISERROR|THROW)\s*\(([^)]+)\)/gi;
  while ((match = errorPattern.exec(body)) !== null) {
    const errorType = match[1];
    const errorMsg = match[2];
    
    rules.push({
      name: `${procedureName}_ERROR_${rules.length + 1}`,
      type: 'error_handling',
      condition: 'on_error',
      action: `${errorType}(${errorMsg})`,
      severity: 'critical',
      metadata: { source: 'error_handling', procedureName, errorType, errorMessage: errorMsg.substring(0, 200) }
    });
  }

  // Pattern 6: Validation checks
  const validationPattern = /IF\s+(?:@(\w+)\s+IS\s+NULL|LEN\(@(\w+)\)\s*=\s*0|@(\w+)\s*=\s*''|NOT\s+EXISTS\s*\([^)]+@(\w+))/gi;
  while ((match = validationPattern.exec(body)) !== null) {
    const paramName = match[1] || match[2] || match[3] || match[4];
    
    rules.push({
      name: `${procedureName}_VALIDATE_${paramName}_${rules.length + 1}`,
      type: 'validation',
      condition: `@${paramName} is invalid`,
      action: 'validation_failed',
      severity: 'high',
      metadata: { source: 'validation_check', procedureName, parameter: paramName }
    });
  }

  // Pattern 7: WHILE loops (business logic patterns)
  const whilePattern = /WHILE\s*\(([^)]+)\)\s*(?:BEGIN\s*)?([\s\S]*?)(?:END|$)/gi;
  while ((match = whilePattern.exec(body)) !== null) {
    const condition = match[1].trim();
    
    rules.push({
      name: `${procedureName}_WHILE_${rules.length + 1}`,
      type: 'iteration',
      condition: normalizeCondition(condition),
      action: 'iterate',
      severity: 'medium',
      metadata: { source: 'while_loop', procedureName }
    });
  }

  // Pattern 8: TRY/CATCH error handling
  const tryCatchPattern = /BEGIN\s+TRY([\s\S]*?)END\s+TRY\s+BEGIN\s+CATCH([\s\S]*?)END\s+CATCH/gi;
  while ((match = tryCatchPattern.exec(body)) !== null) {
    rules.push({
      name: `${procedureName}_TRYCATCH_${rules.length + 1}`,
      type: 'error_handling',
      condition: 'exception_occurred',
      action: 'handle_error',
      severity: 'high',
      metadata: { source: 'try_catch', procedureName, catchBlock: match[2].substring(0, 200) }
    });
  }

  return rules;
}

function normalizeCondition(condition: string): string {
  return condition
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

function normalizeAction(action: string): string {
  const actions: string[] = [];
  if (/SELECT/i.test(action)) actions.push('SELECT');
  if (/INSERT/i.test(action)) actions.push('INSERT');
  if (/UPDATE/i.test(action)) actions.push('UPDATE');
  if (/DELETE/i.test(action)) actions.push('DELETE');
  if (/RETURN/i.test(action)) actions.push('RETURN');
  if (/RAISERROR/i.test(action)) actions.push('RAISERROR');
  if (/THROW/i.test(action)) actions.push('THROW');
  if (/SET\s+@/i.test(action)) actions.push('SET_VARIABLE');
  return actions.length > 0 ? actions.join(', ') : 'unknown';
}

function determineSeverity(action: string): 'critical' | 'high' | 'medium' | 'low' {
  const upperAction = action.toUpperCase();
  if (upperAction.includes('DELETE') || upperAction.includes('DROP')) return 'critical';
  if (upperAction.includes('UPDATE') || upperAction.includes('INSERT')) return 'high';
  if (upperAction.includes('RAISERROR') || upperAction.includes('THROW')) return 'high';
  if (upperAction.includes('SELECT')) return 'low';
  return 'medium';
}

async function getBusinessRules(projectId: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.type) where.ruleType = filters.type;
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.sourceType) where.sourceType = filters.sourceType;

  const rules = await db.businessRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 100,
    include: {
      _count: { select: { versions: true } }
    }
  });

  return NextResponse.json({
    success: true,
    rules: rules.map(r => ({
      ...r,
      metadata: JSON.parse(r.metadata || '{}'),
      versionCount: r._count?.versions || 0,
    })),
    total: rules.length,
  });
}

async function storeBusinessRule(projectId: string, rule: any) {
  const created = await db.businessRule.create({
    data: {
      projectId,
      ruleName: rule.name,
      ruleType: rule.type || 'custom',
      sourceType: rule.sourceType || 'manual',
      sourceId: rule.sourceId,
      condition: rule.condition,
      action: rule.action,
      severity: rule.severity || 'medium',
      version: 1,
      category: rule.category,
      tags: JSON.stringify(rule.tags || []),
      metadata: JSON.stringify(rule.metadata || {}),
    }
  });

  // Create initial version
  await db.businessRuleVersion.create({
    data: {
      businessRuleId: created.id,
      version: 1,
      condition: rule.condition,
      action: rule.action,
      metadata: JSON.stringify(rule.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, rule: created });
}

async function updateBusinessRule(projectId: string, ruleId: string, updates: any) {
  const existing = await db.businessRule.findUnique({
    where: { id: ruleId, projectId }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  // Create new version
  const versionCount = await db.businessRuleVersion.count({
    where: { businessRuleId: ruleId }
  });

  await db.businessRuleVersion.create({
    data: {
      businessRuleId: ruleId,
      version: versionCount + 1,
      condition: updates.condition || existing.condition,
      action: updates.action || existing.action,
      metadata: JSON.stringify(updates.metadata || JSON.parse(existing.metadata || '{}')),
    }
  });

  // Update rule
  const updated = await db.businessRule.update({
    where: { id: ruleId, projectId },
    data: {
      ...updates,
      version: versionCount + 1,
      metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
      tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
    }
  });

  return NextResponse.json({ success: true, rule: updated });
}

async function deleteBusinessRule(projectId: string, ruleId: string) {
  await db.businessRule.delete({ where: { id: ruleId, projectId } });
  return NextResponse.json({ success: true, message: 'Rule deleted' });
}

// ═══════════════════════════════════════════════════════════════════════════
// JS VALIDATION TO BUSINESS RULES (CORE)
// ═══════════════════════════════════════════════════════════════════════════

async function extractJSValidations(projectId: string, viewName?: string) {
  const where: any = { projectId };
  if (viewName) where.viewName = viewName;

  const cshtmlViews = await db.cSHTMLAnalysisCache.findMany({
    where,
    select: { viewName: true, rawContent: true, fields: true },
  });

  const validations: any[] = [];

  for (const view of cshtmlViews) {
    const content = view.rawContent || '';
    const viewValidations = extractValidationsFromCSHTML(view.viewName, content);
    validations.push(...viewValidations);
  }

  return NextResponse.json({
    success: true,
    validations,
    stats: {
      total: validations.length,
      byType: validations.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    }
  });
}

function extractValidationsFromCSHTML(viewName: string, content: string): any[] {
  const validations: any[] = [];

  // Pattern 1: jQuery validation rules
  const jqueryRulesPattern = /rules:\s*\{([^}]+)\}/gi;
  let match;
  while ((match = jqueryRulesPattern.exec(content)) !== null) {
    const rulesBlock = match[1];
    const fieldRules = parseJQueryRules(rulesBlock);
    validations.push(...fieldRules.map((r: any) => ({
      viewName, type: 'jquery_validation', fieldName: r.field, ruleType: r.rule, value: r.value
    })));
  }

  // Pattern 2: Data annotations
  const dataAnnotationPattern = /data-val-(\w+)(?:-([^=]+))?="([^"]*)"/gi;
  while ((match = dataAnnotationPattern.exec(content)) !== null) {
    validations.push({
      viewName, type: 'data_annotation', ruleType: match[1], modifier: match[2] || '', value: match[3]
    });
  }

  // Pattern 3: Required attributes
  const requiredPattern = /(?:required|data-required)\s*(?:=\s*["']?true["']?)?/gi;
  while ((match = requiredPattern.exec(content)) !== null) {
    const beforeText = content.substring(Math.max(0, match.index - 200), match.index);
    const nameMatch = beforeText.match(/name=["']([^"']+)["']/i);
    if (nameMatch) {
      validations.push({ viewName, type: 'required_field', fieldName: nameMatch[1], ruleType: 'required' });
    }
  }

  // Pattern 4: Range validation
  const rangePattern = /(?:range|data-val-range)\s*=\s*["']?([^"'\s]+)["']?/gi;
  while ((match = rangePattern.exec(content)) !== null) {
    validations.push({ viewName, type: 'range_validation', value: match[1] });
  }

  // Pattern 5: Regex validation
  const regexPattern = /(?:pattern|data-val-regex)\s*=\s*["']([^"']+)["']/gi;
  while ((match = regexPattern.exec(content)) !== null) {
    validations.push({ viewName, type: 'regex_validation', pattern: match[1] });
  }

  // Pattern 6: Conditional visibility rules
  const conditionalPattern = /\$\(['"]#([^'"]+)['"]\)\.(?:show|hide|toggle|prop)\([^)]*(['"]disabled['"])/gi;
  while ((match = conditionalPattern.exec(content)) !== null) {
    const action = match[0].includes('show') ? 'show' : match[0].includes('hide') ? 'hide' : 'toggle';
    validations.push({ viewName, type: 'conditional_visibility', targetElement: match[1], action });
  }

  // Pattern 7: AJAX form validations
  const ajaxValidationPattern = /\.validate\s*\(\s*\{([^}]+)\}/gi;
  while ((match = ajaxValidationPattern.exec(content)) !== null) {
    validations.push({ viewName, type: 'ajax_validation', config: match[1] });
  }

  return validations;
}

function parseJQueryRules(rulesBlock: string): any[] {
  const rules: any[] = [];
  const fieldPattern = /(\w+):\s*\{([^}]+)\}/g;
  let match;
  while ((match = fieldPattern.exec(rulesBlock)) !== null) {
    const fieldName = match[1];
    const fieldRules = match[2];
    const rulePattern = /(\w+):\s*(?:true|false|["']([^"']+)["']|(\d+))/g;
    let ruleMatch;
    while ((ruleMatch = rulePattern.exec(fieldRules)) !== null) {
      rules.push({
        field: fieldName,
        rule: ruleMatch[1],
        value: ruleMatch[2] || ruleMatch[3] || ruleMatch[0].includes('true'),
      });
    }
  }
  return rules;
}

async function convertValidationToRule(projectId: string, validation: any) {
  const ruleName = `${validation.viewName}_${validation.fieldName}_${validation.ruleType}`;
  const condition = buildConditionFromValidation(validation);

  const rule = await db.businessRule.create({
    data: {
      projectId,
      ruleName,
      ruleType: 'validation',
      sourceType: 'cshtml_validation',
      condition,
      action: 'validation_check',
      severity: validation.type === 'required_field' ? 'high' : 'medium',
      metadata: JSON.stringify(validation),
    }
  });

  return NextResponse.json({ success: true, rule });
}

function buildConditionFromValidation(validation: any): string {
  switch (validation.ruleType) {
    case 'required': return `${validation.fieldName} IS NOT NULL AND ${validation.fieldName} != ''`;
    case 'email': return `${validation.fieldName} MATCHES EMAIL_PATTERN`;
    case 'minlength': return `LENGTH(${validation.fieldName}) >= ${validation.value}`;
    case 'maxlength': return `LENGTH(${validation.fieldName}) <= ${validation.value}`;
    case 'range': return `${validation.fieldName} BETWEEN ${validation.value}`;
    case 'regex': return `${validation.fieldName} MATCHES PATTERN ${validation.pattern}`;
    default: return `${validation.fieldName} VALID`;
  }
}

async function getValidationRules(projectId: string, viewName?: string) {
  const where: any = { projectId, ruleType: 'validation' };
  const rules = await db.businessRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({
    success: true,
    rules: rules.map(r => ({ ...r, metadata: JSON.parse(r.metadata || '{}') })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MACHINE DETECTION (CORE)
// ═══════════════════════════════════════════════════════════════════════════

async function detectStateMachines(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { id: true, tableName: true, columns: true },
  });

  const stateMachines: any[] = [];

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const statusColumns = columns.filter((c: { name: string }) => 
      c.name.toLowerCase().includes('status') ||
      c.name.toLowerCase().includes('state') ||
      c.name.toLowerCase().includes('workflowstate') ||
      c.name.toLowerCase().includes('approvalstatus')
    );

    for (const statusCol of statusColumns) {
      const transitions = await detectStateTransitionsForTable(projectId, table.tableName, statusCol.name);
      if (transitions.length > 0) {
        stateMachines.push({
          tableName: table.tableName,
          statusColumn: statusCol.name,
          states: extractUniqueStates(transitions),
          transitions,
          detectedFrom: 'sp_analysis',
        });
      }
    }
  }

  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, body: true },
  });

  for (const sp of procedures) {
    const spTransitions = detectStatusTransitionsInSP(sp.procedureName, sp.body || '');
    stateMachines.push(...spTransitions);
  }

  return NextResponse.json({
    success: true,
    stateMachines,
    stats: {
      total: stateMachines.length,
      tables: [...new Set(stateMachines.map(sm => sm.tableName))].length,
    }
  });
}

function extractUniqueStates(transitions: any[]): string[] {
  const states = new Set<string>();
  for (const t of transitions) {
    if (t.fromState && t.fromState !== 'any') states.add(t.fromState);
    if (t.toState) states.add(t.toState);
  }
  return [...states];
}

async function detectStateTransitionsForTable(projectId: string, tableName: string, statusColumn: string) {
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId, body: { contains: tableName } },
    select: { procedureName: true, body: true },
  });

  const transitions: any[] = [];

  for (const sp of procedures) {
    const body = sp.body || '';
    const updatePattern = new RegExp(
      `UPDATE\\s+${tableName}[^;]*SET[^;]*${statusColumn}\\s*=\\s*['"]?(\\w+)['"]?`,
      'gi'
    );
    
    let match;
    while ((match = updatePattern.exec(body)) !== null) {
      const newState = match[1];
      const whereMatch = body.substring(match.index, match.index + 500).match(
        new RegExp(`${statusColumn}\\s*=\\s*['"]?(\\w+)['"]?`, 'i')
      );
      transitions.push({
        procedureName: sp.procedureName,
        tableName,
        statusColumn,
        fromState: whereMatch ? whereMatch[1] : 'any',
        toState: newState,
      });
    }
  }

  return transitions;
}

function detectStatusTransitionsInSP(procedureName: string, body: string): any[] {
  const transitions: any[] = [];
  const statusPatterns = [
    /SET\s+Status\s*=\s*['"]Submitted['"]/gi,
    /SET\s+Status\s*=\s*['"]Approved['"]/gi,
    /SET\s+Status\s*=\s*['"]Rejected['"]/gi,
    /SET\s+Status\s*=\s*['"]Completed['"]/gi,
    /SET\s+Status\s*=\s*['"]Cancelled['"]/gi,
    /SET\s+(?:Status|IsActive)\s*=\s*['"]?Active['"]?/gi,
    /SET\s+(?:Status|IsActive)\s*=\s*['"]?Inactive['"]?/gi,
  ];

  for (const pattern of statusPatterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      transitions.push({ procedureName, rawTransition: match[0], type: 'status_update' });
    }
  }

  return transitions;
}

async function getStateTransitions(projectId: string, tableName: string) {
  const stateMachine = await db.stateMachine.findFirst({
    where: { projectId, tableName },
  });

  return NextResponse.json({
    success: true,
    stateMachine: stateMachine ? {
      ...stateMachine,
      states: JSON.parse(stateMachine.states || '[]'),
      transitions: JSON.parse(stateMachine.transitions || '[]'),
    } : null,
  });
}

async function storeStateMachine(projectId: string, stateMachine: any) {
  const created = await db.stateMachine.create({
    data: {
      projectId,
      tableName: stateMachine.tableName,
      statusColumn: stateMachine.statusColumn,
      states: JSON.stringify(stateMachine.states),
      transitions: JSON.stringify(stateMachine.transitions),
      metadata: JSON.stringify(stateMachine.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, stateMachine: created });
}

async function getStateMachine(projectId: string, tableName: string) {
  const stateMachine = await db.stateMachine.findFirst({
    where: { projectId, tableName },
  });

  if (!stateMachine) {
    return NextResponse.json({ error: 'State machine not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    stateMachine: {
      ...stateMachine,
      states: JSON.parse(stateMachine.states || '[]'),
      transitions: JSON.parse(stateMachine.transitions || '[]'),
      metadata: JSON.parse(stateMachine.metadata || '{}'),
    }
  });
}

async function validateStateTransition(projectId: string, tableName: string, fromState: string, toState: string) {
  const stateMachine = await db.stateMachine.findFirst({
    where: { projectId, tableName },
  });

  if (!stateMachine) {
    return NextResponse.json({ valid: false, reason: 'No state machine defined for this table' });
  }

  const transitions = JSON.parse(stateMachine.transitions || '[]');
  const validTransition = transitions.some((t: any) => 
    (t.fromState === fromState || t.fromState === 'any') && t.toState === toState
  );

  return NextResponse.json({
    valid: validTransition,
    reason: validTransition ? 'Transition allowed' : `Transition from '${fromState}' to '${toState}' is not allowed`,
    allowedTransitions: transitions.filter((t: any) => t.fromState === fromState || t.fromState === 'any'),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// POLICY RULE REPOSITORY (CORE)
// ═══════════════════════════════════════════════════════════════════════════

async function createPolicy(projectId: string, policy: any) {
  const created = await db.policy.create({
    data: {
      projectId,
      policyName: policy.name,
      policyType: policy.type,
      description: policy.description,
      rules: JSON.stringify(policy.rules),
      version: 1,
      isActive: true,
      metadata: JSON.stringify(policy.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, policy: created });
}

async function updatePolicy(projectId: string, policyId: string, updates: any) {
  const current = await db.policy.findUnique({ where: { id: policyId, projectId } });
  if (!current) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  const updated = await db.policy.update({
    where: { id: policyId, projectId },
    data: {
      ...updates,
      rules: updates.rules ? JSON.stringify(updates.rules) : undefined,
      metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
      version: current.version + 1,
      updatedAt: new Date(),
    }
  });

  return NextResponse.json({ success: true, policy: updated });
}

async function getPolicies(projectId: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.type) where.policyType = filters.type;
  if (filters?.active !== undefined) where.isActive = filters.active;

  const policies = await db.policy.findMany({ where, orderBy: { createdAt: 'desc' } });

  return NextResponse.json({
    success: true,
    policies: policies.map(p => ({
      ...p,
      rules: JSON.parse(p.rules || '[]'),
      metadata: JSON.parse(p.metadata || '{}'),
    })),
  });
}

async function evaluatePolicy(projectId: string, policyId: string, context: any) {
  const policy = await db.policy.findUnique({ where: { id: policyId, projectId } });
  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  const rules = JSON.parse(policy.rules || '[]');
  const results: any[] = [];
  let overallResult = true;

  for (const rule of rules) {
    const result = evaluateRule(rule, context);
    results.push({
      ruleName: rule.name,
      passed: result,
      message: result ? 'Rule passed' : rule.message || 'Rule failed',
      condition: rule.condition,
    });
    
    if (!result && rule.severity === 'critical') {
      overallResult = false;
    }
  }

  // Log execution
  await db.ruleExecutionLog.create({
    data: {
      projectId,
      entityType: 'policy',
      entityId: policyId,
      input: JSON.stringify(context),
      output: JSON.stringify({ overallResult, results }),
      success: overallResult,
    }
  });

  return NextResponse.json({
    success: true,
    policyId,
    policyName: policy.policyName,
    overallResult,
    results,
    evaluatedAt: new Date().toISOString(),
  });
}

async function deletePolicy(projectId: string, policyId: string) {
  await db.policy.delete({ where: { id: policyId, projectId } });
  return NextResponse.json({ success: true, message: 'Policy deleted' });
}

function evaluateRule(rule: any, context: any): boolean {
  const { field, operator, value } = rule;
  if (!field || context[field] === undefined) return false;

  const contextValue = context[field];

  switch (operator) {
    case 'equals':
    case '==': return contextValue === value;
    case 'not_equals':
    case '!=': return contextValue !== value;
    case 'greater_than':
    case '>': return contextValue > value;
    case 'less_than':
    case '<': return contextValue < value;
    case 'greater_than_or_equal':
    case '>=': return contextValue >= value;
    case 'less_than_or_equal':
    case '<=': return contextValue <= value;
    case 'contains': return String(contextValue).includes(value);
    case 'not_contains': return !String(contextValue).includes(value);
    case 'in': return Array.isArray(value) && value.includes(contextValue);
    case 'not_in': return Array.isArray(value) && !value.includes(contextValue);
    case 'regex': return new RegExp(value).test(String(contextValue));
    case 'is_null': return contextValue === null || contextValue === undefined;
    case 'is_not_null': return contextValue !== null && contextValue !== undefined;
    case 'is_empty': return contextValue === '' || contextValue === null || contextValue === undefined;
    case 'is_not_empty': return contextValue !== '' && contextValue !== null && contextValue !== undefined;
    default: return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE EXECUTION ENGINE (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function executeRule(projectId: string, ruleId: string, data: any) {
  const rule = await db.businessRule.findUnique({ where: { id: ruleId, projectId } });
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  const startTime = Date.now();
  let result: any = { passed: false, message: '' };

  try {
    // Parse condition and evaluate
    const conditionResult = evaluateSQLCondition(rule.condition, data);
    result = {
      passed: conditionResult,
      message: conditionResult ? 'Condition met' : 'Condition not met',
      action: rule.action,
    };
  } catch (error) {
    result = { passed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const executionTime = Date.now() - startTime;

  // Log execution
  await db.ruleExecutionLog.create({
    data: {
      projectId,
      ruleId,
      entityType: 'rule',
      entityId: ruleId,
      input: JSON.stringify(data),
      output: JSON.stringify(result),
      success: result.passed,
      executionTime,
    }
  });

  return NextResponse.json({
    success: true,
    ruleId,
    ruleName: rule.ruleName,
    result,
    executionTime,
    executedAt: new Date().toISOString(),
  });
}

function evaluateSQLCondition(condition: string, data: any): boolean {
  // Simple condition evaluation for demo
  // In production, this would use a proper expression evaluator
  
  // Check for NULL conditions
  if (condition.includes('IS NULL') || condition.includes('IS NOT NULL')) {
    const fieldMatch = condition.match(/@?(\w+)\s+(IS NULL|IS NOT NULL)/i);
    if (fieldMatch) {
      const field = fieldMatch[1];
      const isNull = data[field] === null || data[field] === undefined;
      return condition.toUpperCase().includes('IS NOT NULL') ? !isNull : isNull;
    }
  }

  // Check for equality conditions
  const eqMatch = condition.match(/@?(\w+)\s*=\s*['"]?(\w+)['"]?/i);
  if (eqMatch) {
    const field = eqMatch[1];
    const value = eqMatch[2];
    return String(data[field]) === value;
  }

  // Check for comparison conditions
  const compMatch = condition.match(/@?(\w+)\s*(>|<|>=|<=)\s*(\d+)/);
  if (compMatch) {
    const field = compMatch[1];
    const op = compMatch[2];
    const value = parseFloat(compMatch[3]);
    const fieldValue = parseFloat(data[field]);
    
    switch (op) {
      case '>': return fieldValue > value;
      case '<': return fieldValue < value;
      case '>=': return fieldValue >= value;
      case '<=': return fieldValue <= value;
    }
  }

  // Default: condition format parsing
  return true;
}

async function executeRulesBatch(projectId: string, ruleIds: string[], data: any) {
  const results: any[] = [];
  
  for (const ruleId of ruleIds) {
    const result = await executeRule(projectId, ruleId, data);
    results.push(await result.json());
  }

  return NextResponse.json({
    success: true,
    totalExecuted: results.length,
    passed: results.filter(r => r.result?.passed).length,
    failed: results.filter(r => !r.result?.passed).length,
    results,
  });
}

async function executeAllRules(projectId: string, data: any, options?: any) {
  const rules = await db.businessRule.findMany({
    where: { projectId, isActive: true },
    select: { id: true },
  });

  const results: any[] = [];
  
  for (const rule of rules) {
    const result = await executeRule(projectId, rule.id, data);
    results.push(await result.json());
  }

  return NextResponse.json({
    success: true,
    totalExecuted: results.length,
    passed: results.filter(r => r.result?.passed).length,
    failed: results.filter(r => !r.result?.passed).length,
    results: options?.detailed ? results : results.map(r => ({ ruleId: r.ruleId, passed: r.result?.passed })),
  });
}

async function getExecutionHistory(projectId: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.ruleId) where.ruleId = filters.ruleId;
  if (filters?.success !== undefined) where.success = filters.success;
  if (filters?.startDate) where.createdAt = { gte: new Date(filters.startDate) };
  if (filters?.endDate) where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };

  const logs = await db.ruleExecutionLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 100,
  });

  return NextResponse.json({
    success: true,
    logs: logs.map(l => ({
      ...l,
      input: JSON.parse(l.input || '{}'),
      output: JSON.parse(l.output || '{}'),
    })),
    total: logs.length,
  });
}

async function getRulePerformance(projectId: string, ruleId: string) {
  const logs = await db.ruleExecutionLog.findMany({
    where: { projectId, ruleId },
    select: { executionTime: true, success: true, createdAt: true },
  });

  const totalExecutions = logs.length;
  const successfulExecutions = logs.filter(l => l.success).length;
  const avgExecutionTime = totalExecutions > 0 
    ? logs.reduce((sum, l) => sum + (l.executionTime || 0), 0) / totalExecutions 
    : 0;

  return NextResponse.json({
    success: true,
    ruleId,
    performance: {
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(2) + '%' : 'N/A',
      avgExecutionTime: avgExecutionTime.toFixed(2) + 'ms',
      minExecutionTime: logs.length > 0 ? Math.min(...logs.map(l => l.executionTime || 0)) + 'ms' : 'N/A',
      maxExecutionTime: logs.length > 0 ? Math.max(...logs.map(l => l.executionTime || 0)) + 'ms' : 'N/A',
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DECISION TABLES (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function createDecisionTable(projectId: string, decisionTable: any) {
  const created = await db.decisionTable.create({
    data: {
      projectId,
      tableName: decisionTable.name,
      description: decisionTable.description,
      inputColumns: JSON.stringify(decisionTable.inputColumns || []),
      outputColumns: JSON.stringify(decisionTable.outputColumns || []),
      rules: JSON.stringify(decisionTable.rules || []),
      hitPolicy: decisionTable.hitPolicy || 'first',
      metadata: JSON.stringify(decisionTable.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, decisionTable: created });
}

async function updateDecisionTable(projectId: string, tableId: string, updates: any) {
  const updated = await db.decisionTable.update({
    where: { id: tableId, projectId },
    data: {
      ...updates,
      inputColumns: updates.inputColumns ? JSON.stringify(updates.inputColumns) : undefined,
      outputColumns: updates.outputColumns ? JSON.stringify(updates.outputColumns) : undefined,
      rules: updates.rules ? JSON.stringify(updates.rules) : undefined,
      metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
    }
  });

  return NextResponse.json({ success: true, decisionTable: updated });
}

async function getDecisionTables(projectId: string) {
  const tables = await db.decisionTable.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    tables: tables.map(t => ({
      ...t,
      inputColumns: JSON.parse(t.inputColumns || '[]'),
      outputColumns: JSON.parse(t.outputColumns || '[]'),
      rules: JSON.parse(t.rules || '[]'),
      metadata: JSON.parse(t.metadata || '{}'),
    })),
  });
}

async function evaluateDecisionTable(projectId: string, tableId: string, input: any) {
  const table = await db.decisionTable.findUnique({
    where: { id: tableId, projectId },
  });

  if (!table) {
    return NextResponse.json({ error: 'Decision table not found' }, { status: 404 });
  }

  const rules = JSON.parse(table.rules || '[]');
  const inputColumns = JSON.parse(table.inputColumns || '[]');
  const outputColumns = JSON.parse(table.outputColumns || '[]');
  const hitPolicy = table.hitPolicy || 'first';

  const matchedRules: any[] = [];

  for (const rule of rules) {
    let matches = true;
    
    for (let i = 0; i < inputColumns.length; i++) {
      const col = inputColumns[i];
      const inputValue = input[col.name];
      const ruleValue = rule.inputs[i];
      
      if (ruleValue !== '*' && ruleValue !== inputValue) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      matchedRules.push({
        ruleId: rule.id,
        outputs: rule.outputs,
      });
      
      if (hitPolicy === 'first') break;
    }
  }

  const result = hitPolicy === 'collect' 
    ? matchedRules.flatMap(r => r.outputs)
    : matchedRules[0]?.outputs || null;

  // Build output object
  const outputObj: any = {};
  if (result) {
    outputColumns.forEach((col: any, i: number) => {
      outputObj[col.name] = Array.isArray(result) ? result[i] : result;
    });
  }

  return NextResponse.json({
    success: true,
    matched: matchedRules.length > 0,
    matchedRules,
    output: outputObj,
    hitPolicy,
  });
}

async function convertRulesToDecisionTable(projectId: string, ruleIds: string[]) {
  const rules = await db.businessRule.findMany({
    where: { id: { in: ruleIds }, projectId },
  });

  const inputColumns: any[] = [];
  const outputColumns: any[] = [{ name: 'action', type: 'string' }];
  const tableRules: any[] = [];

  for (const rule of rules) {
    // Extract conditions as input columns
    const conditions = parseConditions(rule.condition);
    conditions.forEach((c: any) => {
      if (!inputColumns.find(ic => ic.name === c.field)) {
        inputColumns.push({ name: c.field, type: 'string' });
      }
    });

    tableRules.push({
      id: rule.id,
      inputs: conditions.map((c: any) => c.value),
      outputs: [rule.action],
    });
  }

  const decisionTable = await db.decisionTable.create({
    data: {
      projectId,
      tableName: `Converted_${Date.now()}`,
      description: 'Auto-converted from business rules',
      inputColumns: JSON.stringify(inputColumns),
      outputColumns: JSON.stringify(outputColumns),
      rules: JSON.stringify(tableRules),
      hitPolicy: 'first',
      metadata: JSON.stringify({ sourceRuleIds: ruleIds }),
    }
  });

  return NextResponse.json({
    success: true,
    decisionTable: {
      ...decisionTable,
      inputColumns,
      outputColumns,
      rules: tableRules,
    }
  });
}

function parseConditions(condition: string): any[] {
  const conditions: any[] = [];
  
  // Simple parsing for demo
  const patterns = [
    /@?(\w+)\s*=\s*['"]?([^'"]+)['"]?/g,
    /@?(\w+)\s*(>|<|>=|<=)\s*(\d+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(condition)) !== null) {
      conditions.push({
        field: match[1],
        operator: match[2] || '=',
        value: match[2] ? match[3] : match[2],
      });
    }
  }

  return conditions;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE TESTING FRAMEWORK (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function createTestCase(projectId: string, testCase: any) {
  const created = await db.ruleTestCase.create({
    data: {
      projectId,
      name: testCase.name,
      description: testCase.description,
      ruleId: testCase.ruleId,
      input: JSON.stringify(testCase.input || {}),
      expectedOutput: JSON.stringify(testCase.expectedOutput),
      metadata: JSON.stringify(testCase.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, testCase: created });
}

async function runTestCase(projectId: string, testCaseId: string) {
  const testCase = await db.ruleTestCase.findUnique({
    where: { id: testCaseId, projectId },
  });

  if (!testCase) {
    return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
  }

  const input = JSON.parse(testCase.input || '{}');
  const expected = JSON.parse(testCase.expectedOutput || '{}');

  // Execute rule
  const result = await executeRule(projectId, testCase.ruleId, input);
  const resultData = await result.json();

  // Compare results
  const passed = JSON.stringify(resultData.result) === JSON.stringify(expected);

  // Store test result
  await db.ruleTestResult.create({
    data: {
      projectId,
      testCaseId,
      passed,
      actualOutput: JSON.stringify(resultData.result),
      expectedOutput: testCase.expectedOutput,
      executionTime: resultData.executionTime,
    }
  });

  return NextResponse.json({
    success: true,
    testCaseId,
    testCaseName: testCase.name,
    passed,
    expected,
    actual: resultData.result,
    executionTime: resultData.executionTime,
    executedAt: new Date().toISOString(),
  });
}

async function runAllTests(projectId: string) {
  const testCases = await db.ruleTestCase.findMany({
    where: { projectId },
    select: { id: true, name: true },
  });

  const results: any[] = [];

  for (const tc of testCases) {
    const result = await runTestCase(projectId, tc.id);
    results.push(await result.json());
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results,
    executedAt: new Date().toISOString(),
  });
}

async function getTestResults(projectId: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.testCaseId) where.testCaseId = filters.testCaseId;
  if (filters?.passed !== undefined) where.passed = filters.passed;

  const results = await db.ruleTestResult.findMany({
    where,
    orderBy: { executedAt: 'desc' },
    take: filters?.limit || 100,
    include: { testCase: { select: { name: true } } },
  });

  return NextResponse.json({
    success: true,
    results: results.map(r => ({
      ...r,
      actualOutput: JSON.parse(r.actualOutput || '{}'),
      expectedOutput: JSON.parse(r.expectedOutput || '{}'),
    })),
  });
}

async function createTestFromRule(projectId: string, ruleId: string) {
  const rule = await db.businessRule.findUnique({
    where: { id: ruleId, projectId },
  });

  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  // Generate sample test case
  const testCase = await db.ruleTestCase.create({
    data: {
      projectId,
      name: `Auto_Test_${rule.ruleName}`,
      description: `Auto-generated test for rule: ${rule.ruleName}`,
      ruleId,
      input: JSON.stringify({}),
      expectedOutput: JSON.stringify({ passed: true, message: 'Condition met' }),
      metadata: JSON.stringify({ autoGenerated: true }),
    }
  });

  return NextResponse.json({ success: true, testCase });
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE DEPENDENCIES & CONFLICTS (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function detectRuleConflicts(projectId: string) {
  const rules = await db.businessRule.findMany({
    where: { projectId },
    select: { id: true, ruleName: true, condition: true, action: true },
  });

  const conflicts: any[] = [];

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const rule1 = rules[i];
      const rule2 = rules[j];

      // Check for potential conflicts
      const conflict = analyzeConflict(rule1, rule2);
      if (conflict) {
        conflicts.push({
          rule1: { id: rule1.id, name: rule1.ruleName },
          rule2: { id: rule2.id, name: rule2.ruleName },
          type: conflict.type,
          description: conflict.description,
          severity: conflict.severity,
        });
      }
    }
  }

  // Store conflicts
  for (const conflict of conflicts) {
    await db.ruleConflict.create({
      data: {
        projectId,
        rule1Id: conflict.rule1.id,
        rule2Id: conflict.rule2.id,
        conflictType: conflict.type,
        description: conflict.description,
        severity: conflict.severity,
        status: 'open',
      }
    });
  }

  return NextResponse.json({
    success: true,
    conflicts,
    stats: {
      total: conflicts.length,
      critical: conflicts.filter(c => c.severity === 'critical').length,
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
    }
  });
}

function analyzeConflict(rule1: any, rule2: any): any {
  // Check for contradictory actions
  const action1 = rule1.action.toLowerCase();
  const action2 = rule2.action.toLowerCase();

  // Same condition, different actions
  if (rule1.condition === rule2.condition && action1 !== action2) {
    return {
      type: 'contradictory_action',
      description: 'Same condition but different actions',
      severity: 'high',
    };
  }

  // Overlapping conditions with conflicting actions
  if ((action1.includes('delete') && action2.includes('insert')) ||
      (action1.includes('insert') && action2.includes('delete'))) {
    return {
      type: 'opposing_actions',
      description: 'Opposing actions (delete vs insert)',
      severity: 'critical',
    };
  }

  // Check for condition overlap
  const commonFields = extractFieldsFromCondition(rule1.condition)
    .filter((f: string) => extractFieldsFromCondition(rule2.condition).includes(f));

  if (commonFields.length > 0 && action1 !== action2) {
    return {
      type: 'potential_conflict',
      description: `Overlapping conditions on fields: ${commonFields.join(', ')}`,
      severity: 'medium',
    };
  }

  return null;
}

function extractFieldsFromCondition(condition: string): string[] {
  const fields: string[] = [];
  const pattern = /@?(\w+)/g;
  let match;
  while ((match = pattern.exec(condition)) !== null) {
    if (!['IF', 'THEN', 'AND', 'OR', 'NOT', 'NULL', 'EXISTS', 'IN', 'LIKE'].includes(match[1].toUpperCase())) {
      fields.push(match[1]);
    }
  }
  return [...new Set(fields)];
}

async function analyzeRuleDependencies(projectId: string) {
  const rules = await db.businessRule.findMany({
    where: { projectId },
    select: { id: true, ruleName: true, condition: true, action: true },
  });

  const dependencies: any[] = [];

  for (const rule of rules) {
    // Find tables/columns this rule depends on
    const dependsOn = extractDependencies(rule.condition, rule.action);
    
    // Find rules that might affect this rule
    const affectedBy = rules.filter(r => 
      r.id !== rule.id && 
      affectsOther(r, rule)
    );

    dependencies.push({
      ruleId: rule.id,
      ruleName: rule.ruleName,
      dependsOn,
      affectedBy: affectedBy.map(r => ({ id: r.id, name: r.ruleName })),
    });
  }

  return NextResponse.json({
    success: true,
    dependencies,
    graph: buildDependencyGraph(dependencies),
  });
}

function extractDependencies(condition: string, action: string): any[] {
  const deps: any[] = [];
  
  // Extract table references
  const tablePattern = /(?:FROM|JOIN|INTO|UPDATE)\s+\[?(\w+)\]?/gi;
  let match;
  const combined = `${condition} ${action}`;
  
  while ((match = tablePattern.exec(combined)) !== null) {
    deps.push({ type: 'table', name: match[1] });
  }

  // Extract column references
  const columnPattern = /@?(\w+)/g;
  while ((match = columnPattern.exec(combined)) !== null) {
    deps.push({ type: 'column', name: match[1] });
  }

  return deps;
}

function affectsOther(rule1: any, rule2: any): boolean {
  // Check if rule1 modifies something that rule2 depends on
  const action1 = rule1.action.toLowerCase();
  return action1.includes('update') || action1.includes('insert') || action1.includes('delete');
}

function buildDependencyGraph(dependencies: any[]): any {
  const nodes = dependencies.map(d => ({ id: d.ruleId, name: d.ruleName }));
  const edges: any[] = [];

  for (const dep of dependencies) {
    for (const aff of dep.affectedBy) {
      edges.push({ source: aff.id, target: dep.ruleId });
    }
  }

  return { nodes, edges };
}

async function resolveConflict(projectId: string, conflictId: string, resolution: any) {
  const updated = await db.ruleConflict.update({
    where: { id: conflictId, projectId },
    data: {
      status: 'resolved',
      resolution: resolution.resolution,
      resolvedAt: new Date(),
    }
  });

  return NextResponse.json({ success: true, conflict: updated });
}

async function getRuleImpact(projectId: string, ruleId: string) {
  const rule = await db.businessRule.findUnique({
    where: { id: ruleId, projectId },
  });

  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  // Find related rules
  const allRules = await db.businessRule.findMany({
    where: { projectId, id: { not: ruleId } },
  });

  const impactedRules = allRules.filter(r => 
    sharesFields(rule, r) || sharesAction(r, rule)
  );

  // Find related processes
  const processes = await db.businessProcess.findMany({
    where: { projectId },
  });

  const relatedProcesses = processes.filter(p => {
    const rules = JSON.parse(p.rules || '[]');
    return rules.includes(ruleId);
  });

  return NextResponse.json({
    success: true,
    impact: {
      ruleId,
      ruleName: rule.ruleName,
      directImpacts: impactedRules.length,
      impactedRules: impactedRules.map(r => ({ id: r.id, name: r.ruleName })),
      relatedProcesses: relatedProcesses.length,
      processes: relatedProcesses.map(p => ({ id: p.id, name: p.processName })),
    }
  });
}

function sharesFields(rule1: any, rule2: any): boolean {
  const fields1 = extractFieldsFromCondition(rule1.condition);
  const fields2 = extractFieldsFromCondition(rule2.condition);
  return fields1.some(f => fields2.includes(f));
}

function sharesAction(rule1: any, rule2: any): boolean {
  return rule1.action === rule2.action;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE VERSIONING & HISTORY (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function getRuleHistory(projectId: string, ruleId: string) {
  const versions = await db.businessRuleVersion.findMany({
    where: { businessRuleId: ruleId },
    orderBy: { version: 'desc' },
  });

  return NextResponse.json({
    success: true,
    versions: versions.map(v => ({
      ...v,
      metadata: JSON.parse(v.metadata || '{}'),
    })),
  });
}

async function rollbackRule(projectId: string, ruleId: string, version: number) {
  const targetVersion = await db.businessRuleVersion.findFirst({
    where: { businessRuleId: ruleId, version },
  });

  if (!targetVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const updated = await db.businessRule.update({
    where: { id: ruleId, projectId },
    data: {
      condition: targetVersion.condition,
      action: targetVersion.action,
      metadata: targetVersion.metadata,
    }
  });

  return NextResponse.json({
    success: true,
    rule: updated,
    rolledBackTo: version,
  });
}

async function compareRuleVersions(projectId: string, ruleId: string, version1: number, version2: number) {
  const v1 = await db.businessRuleVersion.findFirst({
    where: { businessRuleId: ruleId, version: version1 },
  });

  const v2 = await db.businessRuleVersion.findFirst({
    where: { businessRuleId: ruleId, version: version2 },
  });

  if (!v1 || !v2) {
    return NextResponse.json({ error: 'One or both versions not found' }, { status: 404 });
  }

  const diff = {
    condition: {
      version1: v1.condition,
      version2: v2.condition,
      changed: v1.condition !== v2.condition,
    },
    action: {
      version1: v1.action,
      version2: v2.action,
      changed: v1.action !== v2.action,
    },
  };

  return NextResponse.json({
    success: true,
    version1,
    version2,
    diff,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE TEMPLATES & LIBRARY (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function createRuleTemplate(projectId: string, template: any) {
  const created = await db.ruleTemplate.create({
    data: {
      projectId,
      name: template.name,
      description: template.description,
      category: template.category,
      conditionTemplate: template.conditionTemplate,
      actionTemplate: template.actionTemplate,
      parameters: JSON.stringify(template.parameters || []),
      metadata: JSON.stringify(template.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, template: created });
}

async function getRuleTemplates(projectId: string, category?: string) {
  const where: any = { OR: [{ projectId }, { isBuiltin: true }] };
  if (category) where.category = category;

  const templates = await db.ruleTemplate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    templates: templates.map(t => ({
      ...t,
      parameters: JSON.parse(t.parameters || '[]'),
      metadata: JSON.parse(t.metadata || '{}'),
    })),
  });
}

async function instantiateTemplate(projectId: string, templateId: string, params: any) {
  const template = await db.ruleTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Replace parameters in templates
  let condition = template.conditionTemplate || '';
  let action = template.actionTemplate || '';

  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    condition = condition.replace(regex, String(value));
    action = action.replace(regex, String(value));
  }

  const rule = await db.businessRule.create({
    data: {
      projectId,
      ruleName: params.name || `From_${template.name}`,
      ruleType: 'template_based',
      sourceType: 'template',
      sourceId: templateId,
      condition,
      action,
      severity: params.severity || 'medium',
      metadata: JSON.stringify({ templateId, params }),
    }
  });

  return NextResponse.json({ success: true, rule });
}

async function getBuiltinTemplates() {
  const builtins = [
    {
      name: 'Required Field Validation',
      category: 'validation',
      description: 'Validates that a field is not null or empty',
      conditionTemplate: '{{field}} IS NULL OR {{field}} = \'\'',
      actionTemplate: 'RAISERROR(\'{{field}} is required\', 16, 1)',
      parameters: [
        { name: 'field', type: 'string', description: 'Field name to validate' }
      ]
    },
    {
      name: 'Range Check',
      category: 'validation',
      description: 'Validates a field is within a range',
      conditionTemplate: '{{field}} < {{min}} OR {{field}} > {{max}}',
      actionTemplate: 'RAISERROR(\'{{field}} must be between {{min}} and {{max}}\', 16, 1)',
      parameters: [
        { name: 'field', type: 'string', description: 'Field name' },
        { name: 'min', type: 'number', description: 'Minimum value' },
        { name: 'max', type: 'number', description: 'Maximum value' }
      ]
    },
    {
      name: 'Status Transition',
      category: 'workflow',
      description: 'Controls valid status transitions',
      conditionTemplate: '{{statusField}} = \'{{fromStatus}}\' AND @newStatus = \'{{toStatus}}\'',
      actionTemplate: 'UPDATE {{table}} SET {{statusField}} = @newStatus WHERE Id = @id',
      parameters: [
        { name: 'table', type: 'string', description: 'Table name' },
        { name: 'statusField', type: 'string', description: 'Status column name' },
        { name: 'fromStatus', type: 'string', description: 'Current status' },
        { name: 'toStatus', type: 'string', description: 'Target status' }
      ]
    },
    {
      name: 'Audit Trail',
      category: 'audit',
      description: 'Logs changes to a record',
      conditionTemplate: 'UPDATE OR INSERT ON {{table}}',
      actionTemplate: 'INSERT INTO AuditLog (TableName, RecordId, Action, ChangedBy, ChangedAt) VALUES (\'{{table}}\', @id, @action, @userId, GETDATE())',
      parameters: [
        { name: 'table', type: 'string', description: 'Table to audit' }
      ]
    },
    {
      name: 'Soft Delete',
      category: 'data_management',
      description: 'Marks records as deleted instead of removing',
      conditionTemplate: 'DELETE ON {{table}}',
      actionTemplate: 'UPDATE {{table}} SET IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @userId WHERE Id = @id',
      parameters: [
        { name: 'table', type: 'string', description: 'Table name' }
      ]
    },
    {
      name: 'Email Validation',
      category: 'validation',
      description: 'Validates email format',
      conditionTemplate: '{{field}} NOT LIKE \'%_@_%._%\'',
      actionTemplate: 'RAISERROR(\'Invalid email format for {{field}}\', 16, 1)',
      parameters: [
        { name: 'field', type: 'string', description: 'Email field name' }
      ]
    },
    {
      name: 'Unique Check',
      category: 'validation',
      description: 'Ensures field value is unique',
      conditionTemplate: 'EXISTS (SELECT 1 FROM {{table}} WHERE {{field}} = @{{field}} AND Id <> @id)',
      actionTemplate: 'RAISERROR(\'{{field}} must be unique\', 16, 1)',
      parameters: [
        { name: 'table', type: 'string', description: 'Table name' },
        { name: 'field', type: 'string', description: 'Field to check' }
      ]
    },
    {
      name: 'Cascade Update',
      category: 'data_management',
      description: 'Updates related records when parent changes',
      conditionTemplate: 'UPDATE ON {{parentTable}} SET {{parentField}} = @newValue',
      actionTemplate: 'UPDATE {{childTable}} SET {{childField}} = @newValue WHERE {{foreignKey}} = @id',
      parameters: [
        { name: 'parentTable', type: 'string', description: 'Parent table' },
        { name: 'childTable', type: 'string', description: 'Child table' },
        { name: 'parentField', type: 'string', description: 'Parent field' },
        { name: 'childField', type: 'string', description: 'Child field to update' },
        { name: 'foreignKey', type: 'string', description: 'Foreign key column' }
      ]
    }
  ];

  return NextResponse.json({ success: true, templates: builtins });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS PROCESS MAPPING (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function createBusinessProcess(projectId: string, process: any) {
  const created = await db.businessProcess.create({
    data: {
      projectId,
      processName: process.name,
      description: process.description,
      steps: JSON.stringify(process.steps || []),
      rules: JSON.stringify(process.rules || []),
      metadata: JSON.stringify(process.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, process: created });
}

async function getBusinessProcesses(projectId: string) {
  const processes = await db.businessProcess.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    processes: processes.map(p => ({
      ...p,
      steps: JSON.parse(p.steps || '[]'),
      rules: JSON.parse(p.rules || '[]'),
      metadata: JSON.parse(p.metadata || '{}'),
    })),
  });
}

async function mapRulesToProcess(projectId: string, processId: string, ruleMappings: any) {
  const process = await db.businessProcess.findUnique({
    where: { id: processId, projectId },
  });

  if (!process) {
    return NextResponse.json({ error: 'Process not found' }, { status: 404 });
  }

  const updated = await db.businessProcess.update({
    where: { id: processId },
    data: {
      rules: JSON.stringify(ruleMappings),
    }
  });

  return NextResponse.json({ success: true, process: updated });
}

async function getProcessRules(projectId: string, processId: string) {
  const process = await db.businessProcess.findUnique({
    where: { id: processId, projectId },
  });

  if (!process) {
    return NextResponse.json({ error: 'Process not found' }, { status: 404 });
  }

  const ruleIds = JSON.parse(process.rules || '[]');
  const rules = await db.businessRule.findMany({
    where: { id: { in: ruleIds } },
  });

  return NextResponse.json({
    success: true,
    processId,
    processName: process.processName,
    rules: rules.map(r => ({
      ...r,
      metadata: JSON.parse(r.metadata || '{}'),
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT/IMPORT (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function exportRules(projectId: string, format: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.type) where.ruleType = filters.type;
  if (filters?.severity) where.severity = filters.severity;

  const rules = await db.businessRule.findMany({ where });

  const exportData = rules.map(r => ({
    name: r.ruleName,
    type: r.ruleType,
    condition: r.condition,
    action: r.action,
    severity: r.severity,
    metadata: JSON.parse(r.metadata || '{}'),
  }));

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      format: 'json',
      exportedAt: new Date().toISOString(),
      count: exportData.length,
      data: exportData,
    });
  }

  if (format === 'csv') {
    const headers = ['name', 'type', 'condition', 'action', 'severity'];
    const rows = exportData.map(r => headers.map(h => `"${(r as any)[h] || ''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    return NextResponse.json({
      success: true,
      format: 'csv',
      exportedAt: new Date().toISOString(),
      count: exportData.length,
      data: csv,
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}

async function importRules(projectId: string, rules: any[], options?: any) {
  const imported: any[] = [];
  const skipped: any[] = [];

  for (const rule of rules) {
    try {
      const existing = await db.businessRule.findFirst({
        where: { projectId, ruleName: rule.name }
      });

      if (existing && !options?.overwrite) {
        skipped.push({ name: rule.name, reason: 'Already exists' });
        continue;
      }

      if (existing && options?.overwrite) {
        await db.businessRule.update({
          where: { id: existing.id },
          data: {
            condition: rule.condition,
            action: rule.action,
            severity: rule.severity,
            ruleType: rule.type,
            metadata: JSON.stringify(rule.metadata || {}),
          }
        });
      } else {
        await db.businessRule.create({
          data: {
            projectId,
            ruleName: rule.name,
            ruleType: rule.type || 'custom',
            sourceType: 'import',
            condition: rule.condition,
            action: rule.action,
            severity: rule.severity || 'medium',
            metadata: JSON.stringify(rule.metadata || {}),
          }
        });
      }

      imported.push(rule);
    } catch (e) {
      skipped.push({ name: rule.name, reason: 'Import error' });
    }
  }

  return NextResponse.json({
    success: true,
    imported: imported.length,
    skipped: skipped.length,
    details: { imported, skipped },
  });
}

async function exportPolicies(projectId: string, format: string) {
  const policies = await db.policy.findMany({ where: { projectId } });

  const exportData = policies.map(p => ({
    name: p.policyName,
    type: p.policyType,
    description: p.description,
    rules: JSON.parse(p.rules || '[]'),
    metadata: JSON.parse(p.metadata || '{}'),
  }));

  return NextResponse.json({
    success: true,
    format,
    exportedAt: new Date().toISOString(),
    count: exportData.length,
    data: exportData,
  });
}

async function importPolicies(projectId: string, policies: any[]) {
  const imported: any[] = [];

  for (const policy of policies) {
    const created = await db.policy.create({
      data: {
        projectId,
        policyName: policy.name,
        policyType: policy.type,
        description: policy.description,
        rules: JSON.stringify(policy.rules || []),
        version: 1,
        isActive: true,
        metadata: JSON.stringify(policy.metadata || {}),
      }
    });
    imported.push(created);
  }

  return NextResponse.json({
    success: true,
    imported: imported.length,
    policies: imported,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS & REPORTING (ADVANCED - NEW)
// ═══════════════════════════════════════════════════════════════════════════

async function getRuleAnalytics(projectId: string) {
  const [rules, executions, tests] = await Promise.all([
    db.businessRule.findMany({ where: { projectId }, select: { ruleType: true, severity: true } }),
    db.ruleExecutionLog.findMany({ where: { projectId }, select: { success: true, executionTime: true } }),
    db.ruleTestResult.findMany({ where: { projectId }, select: { passed: true } }),
  ]);

  const analytics = {
    rules: {
      total: rules.length,
      byType: rules.reduce((acc, r) => { acc[r.ruleType] = (acc[r.ruleType] || 0) + 1; return acc; }, {} as Record<string, number>),
      bySeverity: rules.reduce((acc, r) => { acc[r.severity] = (acc[r.severity] || 0) + 1; return acc; }, {} as Record<string, number>),
    },
    executions: {
      total: executions.length,
      successful: executions.filter(e => e.success).length,
      failed: executions.filter(e => !e.success).length,
      avgExecutionTime: executions.length > 0 
        ? executions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / executions.length 
        : 0,
    },
    tests: {
      total: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      passRate: tests.length > 0 ? (tests.filter(t => t.passed).length / tests.length * 100).toFixed(2) + '%' : 'N/A',
    },
  };

  return NextResponse.json({ success: true, analytics });
}

async function getCoverageReport(projectId: string) {
  const [rules, procedures, cshtmlViews] = await Promise.all([
    db.businessRule.findMany({ where: { projectId } }),
    db.toolkitProcedure.findMany({ where: { projectId }, select: { procedureName: true, body: true } }),
    db.cSHTMLAnalysisCache.findMany({ where: { projectId }, select: { viewName: true, rawContent: true } }),
  ]);

  // Calculate coverage
  const spWithRules = procedures.filter(p => 
    rules.some(r => r.sourceType === 'stored_procedure' && r.sourceId)
  ).length;

  const viewsWithValidations = cshtmlViews.filter(v => 
    rules.some(r => r.sourceType === 'cshtml_validation')
  ).length;

  const coverage = {
    storedProcedures: {
      total: procedures.length,
      withRules: spWithRules,
      coverage: procedures.length > 0 ? ((spWithRules / procedures.length) * 100).toFixed(2) + '%' : 'N/A',
    },
    cshtmlViews: {
      total: cshtmlViews.length,
      withValidations: viewsWithValidations,
      coverage: cshtmlViews.length > 0 ? ((viewsWithValidations / cshtmlViews.length) * 100).toFixed(2) + '%' : 'N/A',
    },
    overall: {
      rulesExtracted: rules.length,
      estimatedCoverage: 'Calculating...',
    }
  };

  return NextResponse.json({ success: true, coverage });
}

async function getComplexityReport(projectId: string) {
  const rules = await db.businessRule.findMany({
    where: { projectId },
    select: { ruleName: true, condition: true, action: true },
  });

  const complexityReport = rules.map(r => {
    const conditionComplexity = calculateConditionComplexity(r.condition);
    const actionComplexity = calculateActionComplexity(r.action);
    
    return {
      ruleName: r.ruleName,
      conditionComplexity,
      actionComplexity,
      totalComplexity: conditionComplexity + actionComplexity,
      rating: getComplexityRating(conditionComplexity + actionComplexity),
    };
  });

  const summary = {
    totalRules: rules.length,
    avgComplexity: complexityReport.reduce((sum, r) => sum + r.totalComplexity, 0) / (rules.length || 1),
    simple: complexityReport.filter(r => r.rating === 'simple').length,
    moderate: complexityReport.filter(r => r.rating === 'moderate').length,
    complex: complexityReport.filter(r => r.rating === 'complex').length,
    veryComplex: complexityReport.filter(r => r.rating === 'very_complex').length,
  };

  return NextResponse.json({ success: true, report: complexityReport, summary });
}

function calculateConditionComplexity(condition: string): number {
  let complexity = 0;
  complexity += (condition.match(/AND/gi) || []).length * 2;
  complexity += (condition.match(/OR/gi) || []).length * 2;
  complexity += (condition.match(/NOT/gi) || []).length;
  complexity += (condition.match(/\(/g) || []).length;
  complexity += (condition.match(/EXISTS/gi) || []).length * 3;
  complexity += (condition.match(/IN\s*\(/gi) || []).length * 2;
  complexity += (condition.match(/LIKE/gi) || []).length;
  return complexity;
}

function calculateActionComplexity(action: string): number {
  let complexity = 0;
  complexity += (action.match(/SELECT/gi) || []).length;
  complexity += (action.match(/INSERT/gi) || []).length * 2;
  complexity += (action.match(/UPDATE/gi) || []).length * 2;
  complexity += (action.match(/DELETE/gi) || []).length * 3;
  complexity += (action.match(/RAISERROR/gi) || []).length;
  complexity += (action.match(/THROW/gi) || []).length;
  return complexity;
}

function getComplexityRating(score: number): string {
  if (score <= 3) return 'simple';
  if (score <= 7) return 'moderate';
  if (score <= 12) return 'complex';
  return 'very_complex';
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeBusinessLogic(projectId: string) {
  const [rulesResult, validationsResult, stateMachinesResult, conflictsResult] = await Promise.all([
    extractIfThenRules(projectId),
    extractJSValidations(projectId),
    detectStateMachines(projectId),
    detectRuleConflicts(projectId),
  ]);

  const rulesData = await rulesResult.json();
  const validationsData = await validationsResult.json();
  const stateMachinesData = await stateMachinesResult.json();
  const conflictsData = await conflictsResult.json();

  return NextResponse.json({
    success: true,
    analysis: {
      rules: rulesData,
      validations: validationsData,
      stateMachines: stateMachinesData,
      conflicts: conflictsData,
    },
    summary: {
      totalRules: rulesData.rulesExtracted || 0,
      totalValidations: validationsData.validations?.length || 0,
      totalStateMachines: stateMachinesData.stateMachines?.length || 0,
      totalConflicts: conflictsData.conflicts?.length || 0,
    }
  });
}

async function getBusinessLogicSummary(projectId: string) {
  const [rulesCount, validationsCount, stateMachinesCount, policiesCount, processesCount, decisionTablesCount] = await Promise.all([
    db.businessRule.count({ where: { projectId } }),
    db.businessRule.count({ where: { projectId, ruleType: 'validation' } }),
    db.stateMachine.count({ where: { projectId } }),
    db.policy.count({ where: { projectId } }),
    db.businessProcess.count({ where: { projectId } }),
    db.decisionTable.count({ where: { projectId } }),
  ]);

  const healthScore = Math.min(100, 
    (rulesCount > 0 ? 20 : 0) +
    (validationsCount > 0 ? 15 : 0) +
    (stateMachinesCount > 0 ? 15 : 0) +
    (policiesCount > 0 ? 15 : 0) +
    (processesCount > 0 ? 15 : 0) +
    (decisionTablesCount > 0 ? 10 : 0) +
    10 // base score for having the system
  );

  return NextResponse.json({
    success: true,
    summary: {
      rules: rulesCount,
      validations: validationsCount,
      stateMachines: stateMachinesCount,
      policies: policiesCount,
      processes: processesCount,
      decisionTables: decisionTablesCount,
      healthScore,
      status: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'moderate' : 'needs_attention',
    }
  });
}

async function getBusinessLogicHealth(projectId: string) {
  const summaryResult = await getBusinessLogicSummary(projectId);
  const summaryData = await summaryResult.json();

  // Get additional health metrics
  const conflicts = await db.ruleConflict.count({ where: { projectId, status: 'open' } });
  const failedTests = await db.ruleTestResult.count({ where: { projectId, passed: false } });
  const recentExecutions = await db.ruleExecutionLog.count({
    where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  });

  const health = {
    score: summaryData.summary.healthScore,
    status: summaryData.summary.status,
    metrics: {
      rules: summaryData.summary.rules,
      coverage: 'Calculating...',
      conflicts,
      failedTests,
      recentActivity: recentExecutions,
    },
    recommendations: [] as string[],
    issues: [] as string[],
  };

  // Add recommendations
  if (summaryData.summary.rules === 0) {
    health.recommendations.push('Extract business rules from stored procedures');
  }
  if (summaryData.summary.stateMachines === 0) {
    health.recommendations.push('Detect state machines for workflow tables');
  }
  if (summaryData.summary.policies === 0) {
    health.recommendations.push('Create policies for business rules grouping');
  }

  // Add issues
  if (conflicts > 0) {
    health.issues.push(`${conflicts} rule conflicts detected`);
  }
  if (failedTests > 0) {
    health.issues.push(`${failedTests} test failures`);
  }

  return NextResponse.json({ success: true, health });
}
