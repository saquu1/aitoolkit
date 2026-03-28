// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK API
// =============================================================================
// API routes for Intelligence Bank operations
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runEnrichmentPipeline } from '@/lib/intelligence-bank/enrichment-pipeline';
import { createSOPEngine, DEFAULT_SOP_RULES, SOPEngine } from '@/lib/intelligence-bank/sop-engine';
import { createConsistencyEngine } from '@/lib/intelligence-bank/consistency-engine';

// =============================================================================
// GET /api/intelligence-bank - Get Intelligence Bank Status
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'summary':
        return await getSummary(projectId);
      
      case 'fields':
        return await getFields(projectId, searchParams);
      
      case 'field':
        return await getField(searchParams.get('fieldId') || '');
      
      case 'tables':
        return await getTables(projectId);
      
      case 'sop-rules':
        return await getSOPRules(projectId);
      
      case 'sop-summary':
        return await getSOPSummary(projectId);
      
      case 'sop-violations':
        return await getSOPViolations(projectId);
      
      case 'consistency-checks':
        return await getConsistencyChecks(projectId);
      
      case 'enrichment-sessions':
        return await getEnrichmentSessions(projectId);
      
      default:
        return await getSummary(projectId);
    }
  } catch (error) {
    console.error('Intelligence Bank API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/intelligence-bank - Run Enrichment Pipeline
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, data, rule, rules, ruleId, violationId, sopId } = body;

    if (!projectId && action !== 'initialize-default-sop-rules') {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'run-enrichment':
        return await runEnrichment(projectId);
      
      case 'parse-sop-document':
        return await parseSOPDocument(projectId, data);
      
      case 'apply-sop-autofix':
      case 'run-sop-autofix':
        return await applySOPAutoFix(projectId, { fieldId: violationId, sopId });
      
      case 'run-all-sop-autofixes':
        return await runAllSOPAutoFixes(projectId);
      
      case 'resolve-consistency':
        return await resolveConsistencyCheck(projectId, data);
      
      case 'create-sop-rule':
        return await createSOPRule(projectId, rule);
      
      case 'update-sop-rule':
        return await updateSOPRule(projectId, rule);
      
      case 'delete-sop-rule':
        return await deleteSOPRule(ruleId);
      
      case 'get-sop-rules':
        return await getSOPRules(projectId);
      
      case 'get-sop-violations':
        return await getSOPViolations(projectId);
      
      case 'initialize-default-sop-rules':
        return await initializeDefaultSOPRules();
      
      case 'import-sop-rules':
        return await importSOPRules(projectId, rules);
      
      case 'get-completeness':
        return await getCompleteness(projectId);
      
      case 'get-certification':
        return await getCertification(projectId);
      
      case 'run-consistency-checks':
        return await runConsistencyChecks(projectId);
      
      case 'auto-resolve-consistency':
        return await autoResolveConsistency(projectId);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Intelligence Bank API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getSummary(projectId: string) {
  // Get field counts
  const fields = await db.unifiedField.findMany({
    where: { projectId },
    select: {
      id: true,
      metaOverallConfidence: true,
      metaNeedsReview: true,
      metaEnrichmentComplete: true,
      compIsPII: true,
      compIsPHI: true,
      fkIsForeignKey: true,
    },
  });

  // Get table counts
  const tables = await db.unifiedTable.findMany({
    where: { projectId },
  });

  // Get consistency checks
  const checks = await db.unifiedConsistencyCheck.findMany({
    where: { projectId },
    select: { severity: true, isResolved: true },
  });

  // Get SOP summary
  const sopEngine = createSOPEngine(projectId);
  const sopSummary = await sopEngine.getComplianceSummary();

  // Calculate metrics
  const totalFields = fields.length;
  const avgConfidence = fields.reduce((sum, f) => sum + (f.metaOverallConfidence || 0), 0) / (totalFields || 1);
  const fieldsNeedingReview = fields.filter(f => f.metaNeedsReview).length;
  const avgEnrichment = fields.reduce((sum, f) => sum + (f.metaEnrichmentComplete || 0), 0) / (totalFields || 1);
  const piiFields = fields.filter(f => f.compIsPII).length;
  const phiFields = fields.filter(f => f.compIsPHI).length;
  const fkFields = fields.filter(f => f.fkIsForeignKey).length;

  const errors = checks.filter(c => c.severity === 'error' && !c.isResolved).length;
  const warnings = checks.filter(c => c.severity === 'warning' && !c.isResolved).length;

  return NextResponse.json({
    success: true,
    summary: {
      totalFields,
      totalTables: tables.length,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      enrichmentCompleteness: Math.round(avgEnrichment * 100) / 100,
      fieldsNeedingReview,
      piiFields,
      phiFields,
      fkFields,
      compliance: {
        errors,
        warnings,
        resolved: checks.filter(c => c.isResolved).length,
      },
      sop: sopSummary,
    },
  });
}

async function getFields(projectId: string, searchParams: URLSearchParams) {
  const tableName = searchParams.get('tableName');
  const needsReview = searchParams.get('needsReview') === 'true';
  const isPII = searchParams.get('isPII') === 'true';
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Record<string, unknown> = { projectId };
  if (tableName) where.tableName = tableName;
  if (needsReview) where.metaNeedsReview = true;
  if (isPII) where.compIsPII = true;

  const fields = await db.unifiedField.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { qualifiedName: 'asc' },
  });

  const total = await db.unifiedField.count({ where });

  return NextResponse.json({
    success: true,
    fields,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

async function getField(fieldId: string) {
  if (!fieldId) {
    return NextResponse.json(
      { error: 'fieldId is required' },
      { status: 400 }
    );
  }

  const field = await db.unifiedField.findUnique({
    where: { id: fieldId },
    include: {
      validationRules: true,
      testCasesRel: true,
      sopComplianceRecords: true,
      cshtmlEvidenceRecords: true,
      spEvidenceRecords: true,
      documentationRecords: true,
    },
  });

  if (!field) {
    return NextResponse.json(
      { error: 'Field not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    field,
  });
}

async function getTables(projectId: string) {
  const tables = await db.unifiedTable.findMany({
    where: { projectId },
    orderBy: { tableName: 'asc' },
  });

  return NextResponse.json({
    success: true,
    tables,
  });
}

async function getSOPRules(projectId: string) {
  const rules = await db.unifiedSOPRule.findMany({
    where: {
      OR: [
        { projectId },
        { projectId: null, isSystemDefault: true },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { category: 'asc' },
    ],
  });

  return NextResponse.json({
    success: true,
    rules: rules.map(r => ({
      ...r,
      condition: typeof r.condition === 'string' ? JSON.parse(r.condition) : r.condition,
      autoFixAction: r.autoFixAction ? (typeof r.autoFixAction === 'string' ? JSON.parse(r.autoFixAction) : r.autoFixAction) : null,
    })),
  });
}

async function getSOPSummary(projectId: string) {
  const sopEngine = createSOPEngine(projectId);
  const summary = await sopEngine.getComplianceSummary();

  return NextResponse.json({
    success: true,
    summary,
  });
}

async function getSOPViolations(projectId: string) {
  // Get all SOP compliance records that are not compliant
  const violations = await db.unifiedFieldSOPCompliance.findMany({
    where: {
      field: { projectId },
      isCompliant: false,
    },
    include: {
      field: {
        select: {
          id: true,
          fieldName: true,
          tableName: true,
          qualifiedName: true,
        },
      },
    },
    orderBy: [
      { priority: 'desc' },
    ],
  });

  return NextResponse.json({
    success: true,
    violations: violations.map(v => ({
      fieldId: v.fieldId,
      fieldName: v.field.fieldName,
      tableName: v.field.tableName,
      sopId: v.sopId,
      sopName: v.sopName,
      category: v.sopCategory,
      priority: v.priority,
      complianceNote: v.complianceNote,
      autoFixAvailable: v.autoFixAvailable,
    })),
  });
}

async function getConsistencyChecks(projectId: string) {
  const checks = await db.unifiedConsistencyCheck.findMany({
    where: { projectId },
    orderBy: [
      { severity: 'asc' }, // error first
      { createdAt: 'desc' },
    ],
  });

  return NextResponse.json({
    success: true,
    checks,
  });
}

async function getEnrichmentSessions(projectId: string) {
  const sessions = await db.unifiedEnrichmentSession.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    success: true,
    sessions,
  });
}

async function runEnrichment(projectId: string) {
  // Create initial session record
  const session = await db.unifiedEnrichmentSession.create({
    data: {
      id: `session-${Date.now()}`,
      projectId,
      status: 'pending',
      currentStep: 0,
      totalSteps: 12,
      totalFields: 0,
      fieldsEnriched: 0,
      fieldsWithIssues: 0,
      averageConfidence: 0,
      errors: '[]',
      warnings: '[]',
    },
  });

  // Run enrichment pipeline asynchronously
  const result = await runEnrichmentPipeline(projectId);

  return NextResponse.json({
    success: true,
    sessionId: session.id,
    result,
  });
}

async function parseSOPDocument(projectId: string, data: { content: string; fileName: string; fileType: 'pdf' | 'docx' | 'md' | 'txt' } | null) {
  if (!data?.content || !data?.fileName) {
    return NextResponse.json(
      { error: 'content and fileName are required' },
      { status: 400 }
    );
  }

  const sopEngine = createSOPEngine(projectId);
  const parsedRules = await sopEngine.parseSOPFromDocument(
    data.content,
    data.fileName,
    data.fileType
  );

  const savedCount = await sopEngine.saveSOPRules(parsedRules);

  return NextResponse.json({
    success: true,
    parsedCount: parsedRules.length,
    savedCount,
    rules: parsedRules,
  });
}

async function applySOPAutoFix(projectId: string, data: { fieldId?: string; sopId?: string } | null) {
  if (!data?.fieldId || !data?.sopId) {
    return NextResponse.json(
      { error: 'fieldId and sopId are required' },
      { status: 400 }
    );
  }

  const rule = await db.unifiedSOPRule.findUnique({
    where: { sopId: data.sopId },
  });

  if (!rule || !rule.autoFixAction) {
    return NextResponse.json(
      { error: 'SOP rule not found or no auto-fix available' },
      { status: 404 }
    );
  }

  // Get field
  const field = await db.unifiedField.findUnique({
    where: { id: data.fieldId },
  });

  if (!field) {
    return NextResponse.json(
      { error: 'Field not found' },
      { status: 404 }
    );
  }

  // Parse auto-fix action
  const autoFixAction = typeof rule.autoFixAction === 'string' 
    ? JSON.parse(rule.autoFixAction) 
    : rule.autoFixAction;

  // Apply auto-fix changes to field
  const updates: Record<string, unknown> = {};
  const appliedChanges: string[] = [];

  for (const [key, value] of Object.entries(autoFixAction)) {
    switch (key) {
      case 'setProperty':
        // Set nested properties on JSON fields
        for (const [propPath, propValue] of Object.entries(value as Record<string, unknown>)) {
          if (propPath.startsWith('dropdownConfig.')) {
            const config = field.uiDropdownConfig ? JSON.parse(field.uiDropdownConfig) : {};
            config[propPath.replace('dropdownConfig.', '')] = propValue;
            updates.uiDropdownConfig = JSON.stringify(config);
            appliedChanges.push(`Set ${propPath} = ${JSON.stringify(propValue)}`);
          } else if (propPath.startsWith('dateConfig.')) {
            const config = field.uiDateConfig ? JSON.parse(field.uiDateConfig) : {};
            config[propPath.replace('dateConfig.', '')] = propValue;
            updates.uiDateConfig = JSON.stringify(config);
            appliedChanges.push(`Set ${propPath} = ${JSON.stringify(propValue)}`);
          }
        }
        break;

      case 'addValidation':
        // Add validation rule
        const clientRules = field.validationClientRules ? JSON.parse(field.validationClientRules) : [];
        clientRules.push({
          ruleType: (value as Record<string, unknown>).type,
          ruleValue: null,
          errorMessage: (value as Record<string, unknown>).message,
          source: 'sop_rule',
        });
        updates.validationClientRules = JSON.stringify(clientRules);
        appliedChanges.push(`Added ${(value as Record<string, unknown>).type} validation`);
        break;

      case 'setInputType':
        updates.uiHtmlInputType = value as string;
        appliedChanges.push(`Set input type to ${value}`);
        break;

      case 'addClass':
        // Track SOP rule applied
        const appliedRules = field.uiSopRulesApplied ? JSON.parse(field.uiSopRulesApplied) : [];
        appliedRules.push(rule.sopId);
        updates.uiSopRulesApplied = JSON.stringify(appliedRules);
        appliedChanges.push(`Added class: ${value}`);
        break;
    }
  }

  // Update field
  await db.unifiedField.update({
    where: { id: data.fieldId },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });

  // Update SOP compliance record
  await db.unifiedFieldSOPCompliance.updateMany({
    where: {
      fieldId: data.fieldId,
      sopId: data.sopId,
    },
    data: {
      isCompliant: true,
      fixedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    results: [{
      sopId: data.sopId,
      fieldId: data.fieldId,
      success: true,
      message: `Auto-fix applied successfully`,
      appliedChanges,
    }],
  });
}

async function runAllSOPAutoFixes(projectId: string) {
  // Get all non-compliant SOP records with auto-fix available
  const violations = await db.unifiedFieldSOPCompliance.findMany({
    where: {
      field: { projectId },
      isCompliant: false,
      autoFixAvailable: true,
    },
    include: {
      field: true,
    },
  });

  const results: Array<{
    sopId: string;
    fieldId: string;
    success: boolean;
    message: string;
    appliedChanges: string[];
  }> = [];

  for (const violation of violations) {
    try {
      const rule = await db.unifiedSOPRule.findUnique({
        where: { sopId: violation.sopId },
      });

      if (!rule?.autoFixAction) continue;

      const autoFixAction = typeof rule.autoFixAction === 'string' 
        ? JSON.parse(rule.autoFixAction) 
        : rule.autoFixAction;

      const field = violation.field;
      const updates: Record<string, unknown> = {};
      const appliedChanges: string[] = [];

      for (const [key, value] of Object.entries(autoFixAction)) {
        switch (key) {
          case 'setProperty':
            for (const [propPath, propValue] of Object.entries(value as Record<string, unknown>)) {
              if (propPath.startsWith('dropdownConfig.')) {
                const config = field.uiDropdownConfig ? JSON.parse(field.uiDropdownConfig) : {};
                config[propPath.replace('dropdownConfig.', '')] = propValue;
                updates.uiDropdownConfig = JSON.stringify(config);
                appliedChanges.push(`Set ${propPath}`);
              } else if (propPath.startsWith('dateConfig.')) {
                const config = field.uiDateConfig ? JSON.parse(field.uiDateConfig) : {};
                config[propPath.replace('dateConfig.', '')] = propValue;
                updates.uiDateConfig = JSON.stringify(config);
                appliedChanges.push(`Set ${propPath}`);
              }
            }
            break;

          case 'addValidation':
            const clientRules = field.validationClientRules ? JSON.parse(field.validationClientRules) : [];
            clientRules.push({
              ruleType: (value as Record<string, unknown>).type,
              ruleValue: null,
              errorMessage: (value as Record<string, unknown>).message,
              source: 'sop_rule',
            });
            updates.validationClientRules = JSON.stringify(clientRules);
            appliedChanges.push(`Added ${(value as Record<string, unknown>).type} validation`);
            break;

          case 'setInputType':
            updates.uiHtmlInputType = value as string;
            appliedChanges.push(`Set input type to ${value}`);
            break;
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.unifiedField.update({
          where: { id: field.id },
          data: { ...updates, updatedAt: new Date() },
        });

        await db.unifiedFieldSOPCompliance.update({
          where: { id: violation.id },
          data: { isCompliant: true, fixedAt: new Date() },
        });

        results.push({
          sopId: violation.sopId,
          fieldId: field.id,
          success: true,
          message: 'Auto-fix applied',
          appliedChanges,
        });
      }
    } catch (error) {
      results.push({
        sopId: violation.sopId,
        fieldId: violation.fieldId,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        appliedChanges: [],
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    fixedCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
  });
}

async function resolveConsistencyCheck(projectId: string, data: { checkId: string; resolutionNote: string } | null) {
  if (!data?.checkId) {
    return NextResponse.json(
      { error: 'checkId is required' },
      { status: 400 }
    );
  }

  const check = await db.unifiedConsistencyCheck.update({
    where: { id: data.checkId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolutionNote: data.resolutionNote || null,
    },
  });

  return NextResponse.json({
    success: true,
    check,
  });
}

async function createSOPRule(projectId: string, data: Record<string, unknown> | null) {
  if (!data) {
    return NextResponse.json(
      { error: 'data is required' },
      { status: 400 }
    );
  }

  const rule = await db.unifiedSOPRule.create({
    data: {
      projectId,
      sopId: data.sopId as string,
      name: data.name as string,
      description: (data.description as string) || '',
      category: (data.category as string) || 'forms',
      priority: (data.priority as number) || 50,
      isActive: (data.isActive as boolean) ?? true,
      appliesTo: (data.appliesTo as string) || 'all_fields',
      condition: JSON.stringify(data.condition || {}),
      expectedValue: data.expectedValue as string | null,
      autoFixAction: data.autoFixAction ? JSON.stringify(data.autoFixAction) : null,
      isSystemDefault: false,
      isCustom: true,
    },
  });

  return NextResponse.json({
    success: true,
    rule,
  });
}

async function updateSOPRule(projectId: string, data: Record<string, unknown> | null) {
  if (!data?.id && !data?.sopId) {
    return NextResponse.json(
      { error: 'id or sopId is required' },
      { status: 400 }
    );
  }

  const whereClause = data.id 
    ? { id: data.id as string }
    : { sopId: data.sopId as string };

  const rule = await db.unifiedSOPRule.update({
    where: whereClause,
    data: {
      name: data.name as string,
      description: (data.description as string) || '',
      category: (data.category as string) || 'forms',
      priority: (data.priority as number) || 50,
      isActive: (data.isActive as boolean) ?? true,
      appliesTo: (data.appliesTo as string) || 'all_fields',
      condition: JSON.stringify(data.condition || {}),
      expectedValue: data.expectedValue as string | null,
      autoFixAction: data.autoFixAction ? JSON.stringify(data.autoFixAction) : null,
    },
  });

  return NextResponse.json({
    success: true,
    rule,
  });
}

async function deleteSOPRule(ruleId: string | undefined) {
  if (!ruleId) {
    return NextResponse.json(
      { error: 'ruleId is required' },
      { status: 400 }
    );
  }

  await db.unifiedSOPRule.delete({
    where: { id: ruleId },
  });

  return NextResponse.json({
    success: true,
    message: 'Rule deleted',
  });
}

async function initializeDefaultSOPRules() {
  let initialized = 0;

  for (const rule of DEFAULT_SOP_RULES) {
    const existing = await db.unifiedSOPRule.findUnique({
      where: { sopId: rule.sopId! },
    });

    if (!existing) {
      await db.unifiedSOPRule.create({
        data: {
          projectId: null,
          sopId: rule.sopId!,
          name: rule.name!,
          description: rule.description!,
          category: rule.category!,
          priority: rule.priority!,
          isActive: true,
          appliesTo: rule.appliesTo!,
          condition: JSON.stringify(rule.condition || {}),
          expectedValue: rule.expectedValue || null,
          autoFixAction: rule.autoFixAction ? JSON.stringify(rule.autoFixAction) : null,
          sourceDocument: null,
          sourceVersion: null,
          isSystemDefault: true,
          isCustom: false,
        },
      });
      initialized++;
    }
  }

  return NextResponse.json({
    success: true,
    initialized,
    message: `Initialized ${initialized} default SOP rules`,
  });
}

async function importSOPRules(projectId: string, rules: Array<Record<string, unknown>> | undefined) {
  if (!rules || !Array.isArray(rules)) {
    return NextResponse.json(
      { error: 'rules array is required' },
      { status: 400 }
    );
  }

  let imported = 0;

  for (const rule of rules) {
    try {
      const sopId = rule.sopId as string || `SOP-IMPORT-${Date.now()}-${imported}`;
      
      const existing = await db.unifiedSOPRule.findUnique({
        where: { sopId },
      });

      if (!existing) {
        await db.unifiedSOPRule.create({
          data: {
            projectId,
            sopId,
            name: (rule.name as string) || 'Imported Rule',
            description: (rule.description as string) || '',
            category: (rule.category as string) || 'forms',
            priority: (rule.priority as number) || 50,
            isActive: (rule.isActive as boolean) ?? true,
            appliesTo: (rule.appliesTo as string) || 'all_fields',
            condition: JSON.stringify(rule.condition || {}),
            expectedValue: (rule.expectedValue as string) || null,
            autoFixAction: rule.autoFixAction ? JSON.stringify(rule.autoFixAction) : null,
            isSystemDefault: false,
            isCustom: true,
          },
        });
        imported++;
      }
    } catch (error) {
      console.error('Failed to import rule:', error);
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    message: `Imported ${imported} SOP rules`,
  });
}

// =============================================================================
// COMPLETENESS & CERTIFICATION ENDPOINTS
// =============================================================================

async function getCompleteness(projectId: string) {
  const consistencyEngine = createConsistencyEngine(projectId);
  const completeness = await consistencyEngine.calculateCompleteness();
  
  return NextResponse.json({
    success: true,
    completeness,
  });
}

async function getCertification(projectId: string) {
  const consistencyEngine = createConsistencyEngine(projectId);
  const certification = await consistencyEngine.getCertificationStatus();
  
  return NextResponse.json({
    success: true,
    certification,
  });
}

async function runConsistencyChecks(projectId: string) {
  const consistencyEngine = createConsistencyEngine(projectId);
  const result = await consistencyEngine.runConsistencyChecks();
  
  return NextResponse.json({
    success: true,
    ...result,
  });
}

async function autoResolveConsistency(projectId: string) {
  const consistencyEngine = createConsistencyEngine(projectId);
  const result = await consistencyEngine.autoResolveAll();
  
  return NextResponse.json({
    success: true,
    ...result,
  });
}
